-- FORMATE sales lifecycle application RPCs
--
-- Apply after supabase/sales_lifecycle_foundation.sql.
-- This file replaces the legacy portal lifecycle functions without deleting
-- legacy data or reinterpreting projects.contract_status.

begin;

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.company_members cm
      where cm.company_id = p_company_id
        and cm.user_id = auth.uid()
    );
$$;

create or replace function public.save_estimate_draft(
  p_company_id uuid,
  p_client_draft_key uuid,
  p_estimate_id uuid,
  p_address text,
  p_construction_date date,
  p_condition_id uuid,
  p_condition_snapshot jsonb,
  p_items_data jsonb,
  p_total_amount numeric,
  p_customer_name text default '',
  p_customer_phone text default '',
  p_customer_email text default '',
  p_project_name text default '',
  p_project_detail_address text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_estimate public.estimates%rowtype;
  v_consultation_id uuid;
  v_customer_id uuid;
  v_project_id uuid;
  v_customer_name text := btrim(coalesce(p_customer_name, ''));
  v_customer_phone text := btrim(coalesce(p_customer_phone, ''));
  v_customer_email text := lower(btrim(coalesce(p_customer_email, '')));
  v_address text := btrim(coalesce(p_address, ''));
  v_project_name text := btrim(coalesce(p_project_name, ''));
  v_detail_address text := btrim(coalesce(p_project_detail_address, ''));
  v_phone_key text;
  v_has_customer_identity boolean;
  v_has_project_identity boolean;
  v_target_estimate_id uuid := p_estimate_id;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'You do not have permission to save estimates for this company.'
      using errcode = '42501';
  end if;

  if p_client_draft_key is null then
    return jsonb_build_object('ok', false, 'code', 'client_draft_key_required');
  end if;

  if p_total_amount is null or p_total_amount < 0 then
    return jsonb_build_object('ok', false, 'code', 'invalid_total_amount');
  end if;

  if char_length(v_customer_name) > 120
     or char_length(v_customer_phone) > 40
     or char_length(v_customer_email) > 200
     or char_length(v_project_name) > 160
     or char_length(v_address) > 500
     or char_length(v_detail_address) > 500 then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  -- A repeated network request with the same key always returns the original
  -- aggregate and never creates another consultation, customer, or project.
  select e.*
  into v_estimate
  from public.estimates e
  where e.company_id = p_company_id
    and e.client_draft_key = p_client_draft_key
  for update;

  if found then
    if p_estimate_id is not null and p_estimate_id <> v_estimate.id then
      return jsonb_build_object('ok', false, 'code', 'client_draft_key_conflict');
    end if;
    if v_estimate.address is not distinct from nullif(v_address, '')
       and v_estimate.construction_date is not distinct from p_construction_date
       and v_estimate.condition_id is not distinct from p_condition_id
       and v_estimate.condition_snapshot is not distinct from coalesce(p_condition_snapshot, '{}'::jsonb)
       and v_estimate.items_data is not distinct from coalesce(p_items_data, '{}'::jsonb)
       and v_estimate.total_amount is not distinct from p_total_amount then
      return jsonb_build_object(
        'ok', true,
        'result', 'already_saved',
        'estimateId', v_estimate.id,
        'consultationId', v_estimate.consultation_id,
        'status', v_estimate.status,
        'draftRevision', v_estimate.draft_revision
      );
    end if;
    v_target_estimate_id := v_estimate.id;
  elsif p_estimate_id is null then
    v_target_estimate_id := null;
  end if;

  v_phone_key := regexp_replace(v_customer_phone, '[^0-9]', '', 'g');
  v_has_customer_identity := v_customer_name <> ''
    and (char_length(v_phone_key) >= 7 or v_customer_email <> '');
  v_has_project_identity := v_has_customer_identity and v_address <> '';

  -- Serialize matching/creation per company and normalized identity. This
  -- complements request idempotency where no natural unique constraint exists.
  perform pg_advisory_xact_lock(
    hashtextextended(
      p_company_id::text || ':' || coalesce(nullif(v_phone_key, ''), v_customer_email, v_customer_name),
      0
    )
  );

  if v_target_estimate_id is null then
    select e.*
    into v_estimate
    from public.estimates e
    where e.company_id = p_company_id
      and e.client_draft_key = p_client_draft_key
    for update;
    if found then
      return jsonb_build_object(
        'ok', true,
        'result', 'already_saved',
        'estimateId', v_estimate.id,
        'consultationId', v_estimate.consultation_id,
        'status', v_estimate.status,
        'draftRevision', v_estimate.draft_revision
      );
    end if;
  end if;

  if v_has_customer_identity then
    select c.id
    into v_customer_id
    from public.customers c
    where c.company_id = p_company_id
      and (
        (char_length(v_phone_key) >= 7
          and regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g') = v_phone_key)
        or
        (v_customer_email <> '' and lower(btrim(coalesce(c.email, ''))) = v_customer_email)
      )
    order by c.updated_at desc, c.id
    limit 1
    for update;

    if v_customer_id is null then
      insert into public.customers (
        company_id,
        name,
        phone,
        email
      )
      values (
        p_company_id,
        v_customer_name,
        v_customer_phone,
        v_customer_email
      )
      returning id into v_customer_id;
    else
      update public.customers
      set
        name = case when v_customer_name <> '' then v_customer_name else name end,
        phone = case when v_customer_phone <> '' then v_customer_phone else phone end,
        email = case when v_customer_email <> '' then v_customer_email else email end
      where id = v_customer_id
        and company_id = p_company_id;
    end if;
  end if;

  if v_has_project_identity then
    select p.id
    into v_project_id
    from public.projects p
    where p.company_id = p_company_id
      and p.customer_id = v_customer_id
      and lower(btrim(p.address)) = lower(v_address)
      and lower(btrim(coalesce(p.detail_address, ''))) = lower(v_detail_address)
    order by p.updated_at desc, p.id
    limit 1
    for update;

    if v_project_id is null then
      insert into public.projects (
        company_id,
        customer_id,
        name,
        address,
        detail_address,
        estimate_status,
        construction_status,
        construction_start_date
      )
      values (
        p_company_id,
        v_customer_id,
        coalesce(nullif(v_project_name, ''), v_address),
        v_address,
        v_detail_address,
        'draft',
        'not_started',
        p_construction_date
      )
      returning id into v_project_id;
    end if;
  end if;

  if v_target_estimate_id is not null then
    select e.*
    into v_estimate
    from public.estimates e
    where e.id = v_target_estimate_id
      and e.company_id = p_company_id
      and e.deleted_at is null
    for update;

    if not found then
      return jsonb_build_object('ok', false, 'code', 'estimate_not_found');
    end if;

    v_consultation_id := v_estimate.consultation_id;
    if v_consultation_id is null then
      insert into public.consultations (
        company_id,
        customer_id,
        project_id,
        status,
        intake_contact_name,
        intake_contact_phone,
        intake_contact_email,
        intake_site_name,
        intake_site_address
      )
      values (
        p_company_id,
        v_customer_id,
        v_project_id,
        'active',
        case when v_customer_id is null then nullif(v_customer_name, '') end,
        case when v_customer_id is null then nullif(v_customer_phone, '') end,
        case when v_customer_id is null then nullif(v_customer_email, '') end,
        case when v_project_id is null then nullif(v_project_name, '') end,
        case when v_project_id is null then nullif(v_address, '') end
      )
      returning id into v_consultation_id;
    else
      update public.consultations
      set
        customer_id = coalesce(customer_id, v_customer_id),
        project_id = coalesce(project_id, v_project_id)
      where id = v_consultation_id
        and company_id = p_company_id;
    end if;

    update public.estimates
    set
      consultation_id = v_consultation_id,
      address = nullif(v_address, ''),
      construction_date = p_construction_date,
      condition_id = p_condition_id,
      condition_snapshot = coalesce(p_condition_snapshot, '{}'::jsonb),
      items_data = coalesce(p_items_data, '{}'::jsonb),
      total_amount = p_total_amount,
      draft_revision = coalesce(draft_revision, 0) + 1,
      has_unpublished_changes = current_estimate_version_id is not null,
      client_draft_key = p_client_draft_key
    where id = v_target_estimate_id
      and company_id = p_company_id
    returning * into v_estimate;
  else
    insert into public.consultations (
      company_id,
      customer_id,
      project_id,
      status,
      intake_contact_name,
      intake_contact_phone,
      intake_contact_email,
      intake_site_name,
      intake_site_address
    )
    values (
      p_company_id,
      v_customer_id,
      v_project_id,
      'active',
      case when v_customer_id is null then nullif(v_customer_name, '') end,
      case when v_customer_id is null then nullif(v_customer_phone, '') end,
      case when v_customer_id is null then nullif(v_customer_email, '') end,
      case when v_project_id is null then nullif(v_project_name, '') end,
      case when v_project_id is null then nullif(v_address, '') end
    )
    returning id into v_consultation_id;

    insert into public.estimates (
      company_id,
      consultation_id,
      address,
      construction_date,
      condition_id,
      condition_snapshot,
      items_data,
      total_amount,
      status,
      draft_revision,
      has_unpublished_changes,
      client_draft_key
    )
    values (
      p_company_id,
      v_consultation_id,
      nullif(v_address, ''),
      p_construction_date,
      p_condition_id,
      coalesce(p_condition_snapshot, '{}'::jsonb),
      coalesce(p_items_data, '{}'::jsonb),
      p_total_amount,
      'draft',
      1,
      false,
      p_client_draft_key
    )
    returning * into v_estimate;
  end if;

  return jsonb_build_object(
    'ok', true,
    'result', case when v_target_estimate_id is null then 'created' else 'updated' end,
    'estimateId', v_estimate.id,
    'consultationId', v_consultation_id,
    'customerId', v_customer_id,
    'projectId', v_project_id,
    'status', v_estimate.status,
    'draftRevision', v_estimate.draft_revision
  );
end;
$$;

create or replace function public.build_customer_estimate_snapshot(
  p_items_data jsonb,
  p_condition_snapshot jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_items_source jsonb;
  v_adjustments_source jsonb;
  v_safe_items jsonb := '[]'::jsonb;
  v_safe_adjustments jsonb := '[]'::jsonb;
  v_safe_meta jsonb := '{}'::jsonb;
  v_safe_condition jsonb := '{}'::jsonb;
  v_construction_days integer := 0;
begin
  if jsonb_typeof(p_items_data) = 'array' then
    v_items_source := p_items_data;
    v_adjustments_source := '[]'::jsonb;
  else
    v_items_source := coalesce(p_items_data -> 'items', '[]'::jsonb);
    v_adjustments_source := coalesce(p_items_data -> 'adjustments', '[]'::jsonb);
  end if;

  if jsonb_typeof(v_items_source) <> 'array' then
    v_items_source := '[]'::jsonb;
  end if;
  if jsonb_typeof(v_adjustments_source) <> 'array' then
    v_adjustments_source := '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          'categoryName', coalesce(
            nullif(item ->> 'categoryName', ''),
            nullif(item ->> 'category', ''),
            nullif(item ->> 'itemName', ''),
            'Construction item'
          ),
          'material', coalesce(
            nullif(item ->> 'material', ''),
            nullif(item ->> 'name', ''),
            nullif(item ->> 'description', ''),
            'No details'
          ),
          'spec', nullif(item ->> 'spec', ''),
          'quantity', item -> 'quantity',
          'unit', nullif(item ->> 'unit', ''),
          'totalAmount', coalesce(item -> 'totalAmount', item -> 'price', item -> 'amount', '0'::jsonb),
          'constructionDays', coalesce(item -> 'construction_days', item -> 'constructionDays', '0'::jsonb)
        )
      )
      order by item_order
    ),
    '[]'::jsonb
  )
  into v_safe_items
  from jsonb_array_elements(v_items_source) with ordinality as source(item, item_order);

  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          'label', coalesce(nullif(adjustment ->> 'label', ''), 'Adjustment'),
          'type', case when adjustment ->> 'type' = 'discount' then 'discount' else 'charge' end,
          'amount', coalesce(adjustment -> 'amount', '0'::jsonb)
        )
      )
      order by adjustment_order
    ),
    '[]'::jsonb
  )
  into v_safe_adjustments
  from jsonb_array_elements(v_adjustments_source) with ordinality as source(adjustment, adjustment_order)
  where lower(coalesce(adjustment ->> 'visibleToCustomer', 'false')) in ('true', '1', 'yes');

  if jsonb_typeof(p_items_data) = 'object' then
    v_safe_meta := jsonb_strip_nulls(
      jsonb_build_object(
        'estimateNumber', nullif(p_items_data #>> '{estimateMeta,estimateNumber}', ''),
        'createdDate', nullif(p_items_data #>> '{estimateMeta,createdDate}', ''),
        'validUntil', nullif(p_items_data #>> '{estimateMeta,validUntil}', ''),
        'vatStatus', nullif(p_items_data #>> '{estimateMeta,vatStatus}', '')
      )
    );
  end if;

  if jsonb_typeof(p_items_data) = 'object'
     and coalesce(p_items_data ->> 'constructionDaysTotal', '') ~ '^[0-9]+$' then
    v_construction_days := greatest((p_items_data ->> 'constructionDaysTotal')::integer, 0);
  else
    select coalesce(
      sum(
        case
          when coalesce(item ->> 'construction_days', item ->> 'constructionDays', '') ~ '^[0-9]+$'
            then coalesce(item ->> 'construction_days', item ->> 'constructionDays')::integer
          else 0
        end
      ),
      0
    )
    into v_construction_days
    from jsonb_array_elements(v_items_source) as source(item);
  end if;

  v_safe_condition := jsonb_strip_nulls(
    jsonb_build_object(
      'summary', nullif(p_condition_snapshot ->> 'summary', ''),
      'pyeong', coalesce(
        p_condition_snapshot -> 'condition_pyeong',
        p_condition_snapshot -> 'pyeong'
      ),
      'estimatePyeong', p_condition_snapshot -> 'estimate_pyeong',
      'buildType', nullif(p_condition_snapshot ->> 'build_type', ''),
      'conditionVariant', nullif(p_condition_snapshot ->> 'condition_variant', ''),
      'conditionVariantLabel', coalesce(
        nullif(p_condition_snapshot ->> 'condition_variant_display_label', ''),
        nullif(p_condition_snapshot ->> 'condition_variant_label', '')
      ),
      'occupancyType', nullif(p_condition_snapshot ->> 'occupancy_type', ''),
      'hasExtension', p_condition_snapshot -> 'has_extension'
    )
  );

  return jsonb_build_object(
    'itemsSnapshot', jsonb_build_object(
      'items', v_safe_items,
      'adjustments', v_safe_adjustments,
      'estimateMeta', v_safe_meta,
      'constructionDaysTotal', v_construction_days
    ),
    'conditionSnapshot', v_safe_condition,
    'estimatedConstructionDays', v_construction_days
  );
end;
$$;

create or replace function public.create_customer_portal_link(
  p_company_id uuid,
  p_estimate_id uuid,
  p_customer_name text,
  p_customer_phone text default '',
  p_customer_email text default '',
  p_project_name text default '',
  p_project_address text default '',
  p_version_label text default '',
  p_expires_at timestamptz default null,
  p_required_contact_consent boolean default false,
  p_aftercare_consent boolean default false,
  p_marketing_consent boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_estimate public.estimates%rowtype;
  v_consultation public.consultations%rowtype;
  v_customer public.customers%rowtype;
  v_project public.projects%rowtype;
  v_version public.estimate_versions%rowtype;
  v_snapshot jsonb;
  v_token public.customer_access_tokens%rowtype;
  v_version_no integer;
  v_now timestamptz := now();
  v_token_created boolean := false;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'You do not have permission to share estimates for this company.'
      using errcode = '42501';
  end if;

  if p_expires_at is not null and p_expires_at <= v_now then
    return jsonb_build_object('ok', false, 'code', 'invalid_expiry');
  end if;

  select e.*
  into v_estimate
  from public.estimates e
  where e.id = p_estimate_id
    and e.company_id = p_company_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'estimate_not_found');
  end if;
  if v_estimate.deleted_at is not null then
    return jsonb_build_object('ok', false, 'code', 'deleted_estimate');
  end if;
  if v_estimate.consultation_id is null then
    return jsonb_build_object('ok', false, 'code', 'consultation_link_required');
  end if;

  select c.*
  into v_consultation
  from public.consultations c
  where c.id = v_estimate.consultation_id
    and c.company_id = p_company_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'consultation_not_found');
  end if;
  if v_consultation.customer_id is null then
    return jsonb_build_object('ok', false, 'code', 'customer_link_required');
  end if;
  if v_consultation.project_id is null then
    return jsonb_build_object('ok', false, 'code', 'project_link_required');
  end if;

  select c.*
  into v_customer
  from public.customers c
  where c.id = v_consultation.customer_id
    and c.company_id = p_company_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'customer_not_found');
  end if;

  select p.*
  into v_project
  from public.projects p
  where p.id = v_consultation.project_id
    and p.company_id = p_company_id
    and p.customer_id = v_customer.id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'project_not_found');
  end if;
  if v_project.deleted_at is not null then
    return jsonb_build_object('ok', false, 'code', 'deleted_project');
  end if;

  select ev.*
  into v_version
  from public.estimate_versions ev
  where ev.estimate_id = v_estimate.id
    and ev.company_id = p_company_id
    and ev.source_draft_revision = v_estimate.draft_revision
  limit 1
  for update;

  if not found then
    v_snapshot := public.build_customer_estimate_snapshot(
      v_estimate.items_data,
      v_estimate.condition_snapshot
    );

    select coalesce(max(ev.version_no), 0) + 1
    into v_version_no
    from public.estimate_versions ev
    where ev.estimate_id = v_estimate.id;

    insert into public.estimate_versions (
      company_id,
      estimate_id,
      customer_id,
      project_id,
      version_no,
      label,
      status,
      total_amount,
      estimated_construction_days,
      items_snapshot,
      condition_snapshot,
      sent_at,
      source_draft_revision,
      valid_until
    )
    values (
      p_company_id,
      v_estimate.id,
      v_customer.id,
      v_project.id,
      v_version_no,
      coalesce(nullif(btrim(p_version_label), ''), 'Estimate v' || v_version_no),
      'sent',
      greatest(coalesce(v_estimate.total_amount, 0), 0),
      greatest(coalesce((v_snapshot ->> 'estimatedConstructionDays')::integer, 0), 0),
      v_snapshot -> 'itemsSnapshot',
      v_snapshot -> 'conditionSnapshot',
      v_now,
      v_estimate.draft_revision,
      p_expires_at
    )
    returning * into v_version;
  end if;

  select cat.*
  into v_token
  from public.customer_access_tokens cat
  where cat.company_id = p_company_id
    and cat.estimate_id = v_estimate.id
    and cat.estimate_version_id = v_version.id
    and cat.status = 'active'
    and cat.revoked_at is null
    and (cat.expires_at is null or cat.expires_at > v_now)
  order by cat.created_at desc
  limit 1
  for update;

  if not found then
    insert into public.customer_access_tokens (
      company_id,
      customer_id,
      project_id,
      estimate_id,
      estimate_version_id,
      token,
      status,
      expires_at,
      activated_at,
      activation_source
    )
    values (
      p_company_id,
      v_customer.id,
      v_project.id,
      v_estimate.id,
      v_version.id,
      encode(extensions.gen_random_bytes(32), 'hex'),
      'active',
      p_expires_at,
      v_now,
      'manual_confirmed'
    )
    returning * into v_token;
    v_token_created := true;
  end if;

  update public.estimates
  set
    current_estimate_version_id = v_version.id,
    status = v_version.status,
    has_unpublished_changes = false
  where id = v_estimate.id
    and company_id = p_company_id
  returning * into v_estimate;

  update public.projects
  set estimate_status = case
    when v_version.status = 'rejected' then estimate_status
    else v_version.status
  end
  where id = v_project.id
    and company_id = p_company_id;

  update public.customers
  set
    required_contact_consent = required_contact_consent or coalesce(p_required_contact_consent, false),
    aftercare_consent = aftercare_consent or coalesce(p_aftercare_consent, false),
    marketing_consent = marketing_consent or coalesce(p_marketing_consent, false)
  where id = v_customer.id
    and company_id = p_company_id;

  if v_token_created then
    insert into public.customer_messages (
      company_id,
      customer_id,
      project_id,
      estimate_id,
      estimate_version_id,
      message_type,
      channel,
      recipient,
      body,
      status,
      sent_at
    )
    values (
      p_company_id,
      v_customer.id,
      v_project.id,
      v_estimate.id,
      v_version.id,
      'estimate_link',
      'link_copy',
      coalesce(nullif(v_customer.phone, ''), nullif(v_customer.email, ''), v_customer.name),
      'A customer estimate link was created.',
      'sent',
      v_now
    );

    insert into public.timeline_events (
      company_id,
      customer_id,
      project_id,
      estimate_id,
      estimate_version_id,
      event_type,
      title,
      description,
      metadata
    )
    values (
      p_company_id,
      v_customer.id,
      v_project.id,
      v_estimate.id,
      v_version.id,
      'estimate_sent',
      'Estimate sent',
      coalesce(nullif(v_version.label, ''), 'Estimate v' || v_version.version_no),
      jsonb_build_object(
        'channel', 'link_copy',
        'activationSource', 'manual_confirmed',
        'expiresAt', p_expires_at
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'token', v_token.token,
    'portalPath', '/c/' || v_token.token,
    'expiresAt', v_token.expires_at,
    'customerId', v_customer.id,
    'projectId', v_project.id,
    'estimateVersionId', v_version.id,
    'versionNo', v_version.version_no,
    'status', v_version.status,
    'activationSource', 'manual_confirmed'
  );
end;
$$;

create or replace function public.get_customer_portal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_access public.customer_access_tokens%rowtype;
  v_version public.estimate_versions%rowtype;
  v_customer public.customers%rowtype;
  v_project public.projects%rowtype;
  v_estimate public.estimates%rowtype;
  v_company_name text := '';
  v_phone_digits text := '';
  v_is_current boolean := false;
  v_first_view boolean := false;
begin
  if btrim(coalesce(p_token, '')) = '' or char_length(btrim(p_token)) > 256 then
    return jsonb_build_object('ok', false, 'code', 'invalid_token', 'tokenStatus', 'invalid');
  end if;

  select cat.*
  into v_access
  from public.customer_access_tokens cat
  where cat.token = btrim(p_token)
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_token', 'tokenStatus', 'invalid');
  end if;
  if v_access.revoked_at is not null or v_access.status = 'revoked' then
    return jsonb_build_object('ok', false, 'code', 'revoked_token', 'tokenStatus', 'revoked');
  end if;
  if v_access.status = 'expired'
     or (v_access.expires_at is not null and v_access.expires_at <= now()) then
    update public.customer_access_tokens
    set status = 'expired'
    where id = v_access.id
      and status <> 'expired';
    return jsonb_build_object('ok', false, 'code', 'expired_token', 'tokenStatus', 'expired');
  end if;
  if v_access.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'inactive_token', 'tokenStatus', v_access.status);
  end if;

  select e.*
  into v_estimate
  from public.estimates e
  where e.id = v_access.estimate_id
    and e.company_id = v_access.company_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'estimate_not_found', 'tokenStatus', 'active');
  end if;
  if v_estimate.deleted_at is not null then
    return jsonb_build_object('ok', false, 'code', 'deleted_estimate', 'tokenStatus', 'active');
  end if;

  select p.*
  into v_project
  from public.projects p
  where p.id = v_access.project_id
    and p.company_id = v_access.company_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'project_not_found', 'tokenStatus', 'active');
  end if;
  if v_project.deleted_at is not null then
    return jsonb_build_object('ok', false, 'code', 'deleted_project', 'tokenStatus', 'active');
  end if;

  select ev.*
  into v_version
  from public.estimate_versions ev
  where ev.id = v_access.estimate_version_id
    and ev.company_id = v_access.company_id
    and ev.estimate_id = v_estimate.id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'estimate_not_found', 'tokenStatus', 'active');
  end if;

  v_is_current := v_estimate.current_estimate_version_id = v_version.id;
  v_first_view := v_is_current and v_version.viewed_at is null;

  update public.customer_access_tokens
  set last_accessed_at = now()
  where id = v_access.id;

  if v_is_current and v_version.status = 'sent' then
    update public.estimate_versions
    set
      viewed_at = coalesce(viewed_at, now()),
      status = 'viewed'
    where id = v_version.id
    returning * into v_version;

    update public.estimates
    set status = 'viewed'
    where id = v_estimate.id
      and status = 'sent'
    returning * into v_estimate;

    update public.projects
    set estimate_status = 'viewed'
    where id = v_project.id
      and estimate_status = 'sent';
  end if;

  update public.customer_messages
  set
    clicked_at = coalesce(clicked_at, now()),
    status = case when status in ('sent', 'delivered') then 'clicked' else status end
  where estimate_version_id = v_version.id
    and message_type = 'estimate_link'
    and clicked_at is null;

  if v_first_view then
    insert into public.timeline_events (
      company_id,
      customer_id,
      project_id,
      estimate_id,
      estimate_version_id,
      event_type,
      title,
      description
    )
    values (
      v_access.company_id,
      v_access.customer_id,
      v_access.project_id,
      v_access.estimate_id,
      v_access.estimate_version_id,
      'estimate_viewed',
      'Estimate viewed',
      coalesce(nullif(v_version.label, ''), 'Estimate v' || v_version.version_no)
    );
  end if;

  select c.*
  into v_customer
  from public.customers c
  where c.id = v_access.customer_id
    and c.company_id = v_access.company_id;

  select c.name
  into v_company_name
  from public.companies c
  where c.id = v_access.company_id;

  v_phone_digits := regexp_replace(coalesce(v_customer.phone, ''), '[^0-9]', '', 'g');

  return jsonb_build_object(
    'ok', true,
    'tokenStatus', 'active',
    'isCurrentVersion', v_is_current,
    'company', jsonb_build_object('name', coalesce(v_company_name, 'FORMATE')),
    'customer', jsonb_build_object(
      'name', coalesce(v_customer.name, ''),
      'phoneMasked', case
        when char_length(v_phone_digits) > 4
          then repeat('*', char_length(v_phone_digits) - 4) || right(v_phone_digits, 4)
        else ''
      end
    ),
    'project', jsonb_build_object(
      'name', v_project.name,
      'address', v_project.address,
      'detailAddress', v_project.detail_address,
      'estimateStatus', v_estimate.status,
      'constructionStatus', v_project.construction_status,
      'constructionStartDate', v_project.construction_start_date
    ),
    'estimate', jsonb_build_object(
      'id', v_estimate.id,
      'status', v_estimate.status,
      'createdAt', v_estimate.created_at,
      'constructionDate', v_estimate.construction_date
    ),
    'estimateVersion', jsonb_build_object(
      'id', v_version.id,
      'versionNo', v_version.version_no,
      'label', v_version.label,
      'status', v_version.status,
      'totalAmount', v_version.total_amount,
      'estimatedConstructionDays', v_version.estimated_construction_days,
      'itemsSnapshot', v_version.items_snapshot,
      'conditionSnapshot', v_version.condition_snapshot,
      'approvedAt', v_version.approved_at,
      'viewedAt', v_version.viewed_at,
      'sentAt', v_version.sent_at,
      'createdAt', v_version.created_at
    )
  );
end;
$$;

create or replace function public.transition_customer_estimate(
  p_token text,
  p_action text,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_access public.customer_access_tokens%rowtype;
  v_estimate public.estimates%rowtype;
  v_version public.estimate_versions%rowtype;
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_note text := btrim(coalesce(p_note, ''));
  v_next_status text;
  v_request_type text;
  v_request_status text;
  v_request_id uuid;
  v_now timestamptz := now();
begin
  if v_action not in ('revision_requested', 'approved', 'rejected') then
    return jsonb_build_object('ok', false, 'code', 'invalid_action');
  end if;
  if char_length(v_note) > 4000 then
    return jsonb_build_object('ok', false, 'code', 'invalid_note');
  end if;

  select cat.*
  into v_access
  from public.customer_access_tokens cat
  where cat.token = btrim(coalesce(p_token, ''))
  limit 1
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_token');
  end if;
  if v_access.revoked_at is not null or v_access.status = 'revoked' then
    return jsonb_build_object('ok', false, 'code', 'revoked_token');
  end if;
  if v_access.status = 'expired'
     or (v_access.expires_at is not null and v_access.expires_at <= v_now) then
    update public.customer_access_tokens
    set status = 'expired'
    where id = v_access.id;
    return jsonb_build_object('ok', false, 'code', 'expired_token');
  end if;
  if v_access.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'inactive_token');
  end if;

  select e.*
  into v_estimate
  from public.estimates e
  where e.id = v_access.estimate_id
    and e.company_id = v_access.company_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'estimate_not_found');
  end if;
  if v_estimate.deleted_at is not null then
    return jsonb_build_object('ok', false, 'code', 'deleted_estimate');
  end if;
  if v_estimate.current_estimate_version_id is distinct from v_access.estimate_version_id then
    return jsonb_build_object('ok', false, 'code', 'stale_estimate_version');
  end if;

  select ev.*
  into v_version
  from public.estimate_versions ev
  where ev.id = v_access.estimate_version_id
    and ev.estimate_id = v_estimate.id
    and ev.company_id = v_access.company_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'estimate_not_found');
  end if;

  if v_action = 'approved' and v_version.status = 'approved' then
    return jsonb_build_object(
      'ok', true,
      'alreadyApproved', true,
      'status', 'approved',
      'approvedAt', v_version.approved_at,
      'contractStatus', 'not_started'
    );
  end if;

  if v_action in ('revision_requested', 'approved')
     and v_version.status not in ('sent', 'viewed') then
    return jsonb_build_object('ok', false, 'code', 'invalid_estimate_transition');
  end if;
  if v_action = 'rejected'
     and v_version.status not in ('sent', 'viewed', 'revision_requested') then
    return jsonb_build_object('ok', false, 'code', 'invalid_estimate_transition');
  end if;

  v_next_status := v_action;
  v_request_type := case
    when v_action = 'revision_requested' then 'estimate_revision'
    when v_action = 'approved' then 'approval'
    else 'other'
  end;
  v_request_status := case when v_action = 'approved' then 'approved' else 'received' end;

  update public.estimate_versions
  set
    status = v_next_status,
    approved_at = case when v_next_status = 'approved' then v_now else approved_at end,
    rejected_at = case when v_next_status = 'rejected' then v_now else rejected_at end
  where id = v_version.id
  returning * into v_version;

  update public.estimates
  set status = v_next_status
  where id = v_estimate.id
    and current_estimate_version_id = v_version.id;

  -- Compatibility projection only. There is intentionally no contract update.
  update public.projects
  set estimate_status = case
    when v_next_status = 'rejected' then estimate_status
    else v_next_status
  end
  where id = v_access.project_id
    and company_id = v_access.company_id;

  insert into public.customer_requests (
    company_id,
    customer_id,
    project_id,
    estimate_id,
    estimate_version_id,
    request_type,
    status,
    title,
    body,
    customer_visible
  )
  values (
    v_access.company_id,
    v_access.customer_id,
    v_access.project_id,
    v_access.estimate_id,
    v_access.estimate_version_id,
    v_request_type,
    v_request_status,
    case
      when v_action = 'revision_requested' then 'Estimate revision request'
      when v_action = 'approved' then 'Estimate approved'
      else 'Estimate rejected'
    end,
    v_note,
    true
  )
  returning id into v_request_id;

  insert into public.notifications (
    company_id,
    event_type,
    title,
    body,
    related_type,
    related_id
  )
  values (
    v_access.company_id,
    'estimate_' || v_action,
    case
      when v_action = 'revision_requested' then 'Customer requested an estimate revision'
      when v_action = 'approved' then 'Customer approved the estimate'
      else 'Customer rejected the estimate'
    end,
    left(v_note, 500),
    'estimate_version',
    v_version.id
  );

  return jsonb_build_object(
    'ok', true,
    'alreadyApproved', false,
    'requestId', v_request_id,
    'status', v_next_status,
    'approvedAt', v_version.approved_at,
    'contractStatus', 'not_started'
  );
end;
$$;

create or replace function public.approve_customer_estimate(
  p_token text,
  p_note text default ''
)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  select public.transition_customer_estimate(p_token, 'approved', p_note);
$$;

create or replace function public.reject_customer_estimate(
  p_token text,
  p_note text default ''
)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  select public.transition_customer_estimate(p_token, 'rejected', p_note);
$$;

create or replace function public.submit_customer_request(
  p_token text,
  p_request_type text,
  p_title text,
  p_body text,
  p_related_item_label text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_access public.customer_access_tokens%rowtype;
  v_request_id uuid;
  v_request_type text := lower(btrim(coalesce(p_request_type, '')));
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_related_item_label text := btrim(coalesce(p_related_item_label, ''));
  v_transition jsonb;
begin
  if v_request_type not in ('inquiry', 'estimate_revision') then
    return jsonb_build_object('ok', false, 'code', 'invalid_request_type');
  end if;
  if v_body = '' or char_length(v_body) > 4000 then
    return jsonb_build_object('ok', false, 'code', 'invalid_body');
  end if;
  if char_length(v_title) > 120 or char_length(v_related_item_label) > 160 then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  if v_request_type = 'estimate_revision' then
    v_transition := public.transition_customer_estimate(
      p_token,
      'revision_requested',
      v_body
    );
    if not coalesce((v_transition ->> 'ok')::boolean, false) then
      return v_transition;
    end if;
    return v_transition || jsonb_build_object('requestType', 'estimate_revision');
  end if;

  select cat.*
  into v_access
  from public.customer_access_tokens cat
  where cat.token = btrim(coalesce(p_token, ''))
  limit 1
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_token');
  end if;
  if v_access.revoked_at is not null or v_access.status = 'revoked' then
    return jsonb_build_object('ok', false, 'code', 'revoked_token');
  end if;
  if v_access.status = 'expired'
     or (v_access.expires_at is not null and v_access.expires_at <= now()) then
    update public.customer_access_tokens
    set status = 'expired'
    where id = v_access.id;
    return jsonb_build_object('ok', false, 'code', 'expired_token');
  end if;
  if v_access.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'inactive_token');
  end if;

  if exists (
    select 1
    from public.customer_requests cr
    where cr.customer_id = v_access.customer_id
      and cr.estimate_version_id = v_access.estimate_version_id
      and cr.request_type = 'inquiry'
      and cr.created_at > now() - interval '10 seconds'
  ) then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
  end if;

  insert into public.customer_requests (
    company_id,
    customer_id,
    project_id,
    estimate_id,
    estimate_version_id,
    request_type,
    status,
    title,
    body,
    related_item_label,
    customer_visible
  )
  values (
    v_access.company_id,
    v_access.customer_id,
    v_access.project_id,
    v_access.estimate_id,
    v_access.estimate_version_id,
    'inquiry',
    'received',
    coalesce(nullif(v_title, ''), 'Estimate inquiry'),
    v_body,
    v_related_item_label,
    true
  )
  returning id into v_request_id;

  insert into public.notifications (
    company_id,
    event_type,
    title,
    body,
    related_type,
    related_id
  )
  values (
    v_access.company_id,
    'customer_request_received',
    coalesce(nullif(v_title, ''), 'Estimate inquiry'),
    left(v_body, 500),
    'customer_request',
    v_request_id
  );

  return jsonb_build_object(
    'ok', true,
    'requestId', v_request_id,
    'status', 'received',
    'requestType', 'inquiry'
  );
end;
$$;

create or replace function public.update_consultation_status(
  p_company_id uuid,
  p_consultation_id uuid,
  p_next_status text,
  p_close_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_consultation public.consultations%rowtype;
  v_next_status text := lower(btrim(coalesce(p_next_status, '')));
  v_reason text := nullif(btrim(coalesce(p_close_reason, '')), '');
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'You do not have permission to update consultations for this company.'
      using errcode = '42501';
  end if;
  if v_next_status not in ('active', 'closed') then
    return jsonb_build_object('ok', false, 'code', 'invalid_consultation_status');
  end if;

  select c.*
  into v_consultation
  from public.consultations c
  where c.id = p_consultation_id
    and c.company_id = p_company_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'consultation_not_found');
  end if;

  if v_consultation.status = v_next_status then
    return jsonb_build_object(
      'ok', true,
      'result', 'already_set',
      'consultationId', v_consultation.id,
      'status', v_consultation.status
    );
  end if;

  update public.consultations
  set
    status = v_next_status,
    close_reason = case when v_next_status = 'closed' then v_reason else null end,
    closed_at = case when v_next_status = 'closed' then now() else null end,
    closed_by = case when v_next_status = 'closed' then auth.uid() else null end
  where id = v_consultation.id
  returning * into v_consultation;

  return jsonb_build_object(
    'ok', true,
    'result', 'updated',
    'consultationId', v_consultation.id,
    'status', v_consultation.status,
    'closedAt', v_consultation.closed_at
  );
end;
$$;

create or replace function public.update_contract_status(
  p_company_id uuid,
  p_contract_id uuid,
  p_next_status text,
  p_cancel_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_contract public.contracts%rowtype;
  v_next_status text := lower(btrim(coalesce(p_next_status, '')));
  v_reason text := nullif(btrim(coalesce(p_cancel_reason, '')), '');
  v_allowed boolean := false;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'You do not have permission to update contracts for this company.'
      using errcode = '42501';
  end if;
  if v_next_status not in (
    'draft',
    'customer_reviewing',
    'revision_requested',
    'customer_signed',
    'completed',
    'cancelled'
  ) then
    return jsonb_build_object('ok', false, 'code', 'invalid_contract_status');
  end if;

  select c.*
  into v_contract
  from public.contracts c
  where c.id = p_contract_id
    and c.company_id = p_company_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'contract_not_found');
  end if;
  if v_contract.status = v_next_status then
    return jsonb_build_object(
      'ok', true,
      'result', 'already_set',
      'contractId', v_contract.id,
      'status', v_contract.status
    );
  end if;

  v_allowed := case v_contract.status
    when 'draft' then v_next_status in ('customer_reviewing', 'cancelled')
    when 'customer_reviewing' then v_next_status in ('revision_requested', 'customer_signed', 'cancelled')
    when 'revision_requested' then v_next_status in ('draft', 'customer_reviewing', 'cancelled')
    when 'customer_signed' then v_next_status in ('completed', 'cancelled')
    else false
  end;
  if not v_allowed then
    return jsonb_build_object('ok', false, 'code', 'invalid_contract_transition');
  end if;

  update public.contracts
  set
    status = v_next_status,
    customer_signed_at = case
      when v_next_status = 'customer_signed' then coalesce(customer_signed_at, now())
      else customer_signed_at
    end,
    completed_at = case when v_next_status = 'completed' then now() else null end,
    completed_by = case when v_next_status = 'completed' then auth.uid() else null end,
    cancelled_at = case when v_next_status = 'cancelled' then now() else null end,
    cancelled_by = case when v_next_status = 'cancelled' then auth.uid() else null end,
    cancel_reason = case when v_next_status = 'cancelled' then v_reason else null end
  where id = v_contract.id
  returning * into v_contract;

  return jsonb_build_object(
    'ok', true,
    'result', 'updated',
    'contractId', v_contract.id,
    'status', v_contract.status,
    'customerSignedAt', v_contract.customer_signed_at,
    'completedAt', v_contract.completed_at
  );
end;
$$;

revoke all on function public.is_company_member(uuid) from public, anon;
grant execute on function public.is_company_member(uuid) to authenticated;

revoke all on function public.save_estimate_draft(
  uuid, uuid, uuid, text, date, uuid, jsonb, jsonb, numeric,
  text, text, text, text, text
) from public, anon;
grant execute on function public.save_estimate_draft(
  uuid, uuid, uuid, text, date, uuid, jsonb, jsonb, numeric,
  text, text, text, text, text
) to authenticated;

revoke all on function public.build_customer_estimate_snapshot(jsonb, jsonb) from public, anon;
grant execute on function public.build_customer_estimate_snapshot(jsonb, jsonb) to authenticated;

revoke all on function public.create_customer_portal_link(
  uuid, uuid, text, text, text, text, text, text, timestamptz, boolean, boolean, boolean
) from public, anon;
grant execute on function public.create_customer_portal_link(
  uuid, uuid, text, text, text, text, text, text, timestamptz, boolean, boolean, boolean
) to authenticated;

revoke all on function public.get_customer_portal(text) from public;
grant execute on function public.get_customer_portal(text) to anon, authenticated;

revoke all on function public.transition_customer_estimate(text, text, text) from public;
grant execute on function public.transition_customer_estimate(text, text, text) to anon, authenticated;

revoke all on function public.approve_customer_estimate(text, text) from public;
grant execute on function public.approve_customer_estimate(text, text) to anon, authenticated;

revoke all on function public.reject_customer_estimate(text, text) from public;
grant execute on function public.reject_customer_estimate(text, text) to anon, authenticated;

revoke all on function public.submit_customer_request(text, text, text, text, text) from public;
grant execute on function public.submit_customer_request(text, text, text, text, text) to anon, authenticated;

revoke all on function public.update_consultation_status(uuid, uuid, text, text) from public, anon;
grant execute on function public.update_consultation_status(uuid, uuid, text, text) to authenticated;

revoke all on function public.update_contract_status(uuid, uuid, text, text) from public, anon;
grant execute on function public.update_contract_status(uuid, uuid, text, text) to authenticated;

notify pgrst, 'reload schema';

commit;
