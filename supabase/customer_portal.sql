-- FORMATE customer portal Phase C2
-- Apply after supabase/customer_operations.sql.

create extension if not exists "pgcrypto";

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
set search_path = public
as $$
declare
  v_estimate public.estimates%rowtype;
  v_customer_id uuid;
  v_project_id uuid;
  v_version_id uuid;
  v_version_no integer;
  v_token text;
  v_items_source jsonb;
  v_adjustments_source jsonb;
  v_safe_items jsonb := '[]'::jsonb;
  v_safe_adjustments jsonb := '[]'::jsonb;
  v_safe_meta jsonb := '{}'::jsonb;
  v_safe_condition jsonb := '{}'::jsonb;
  v_items_snapshot jsonb;
  v_construction_days integer := 0;
  v_customer_name text := btrim(coalesce(p_customer_name, ''));
  v_customer_phone text := btrim(coalesce(p_customer_phone, ''));
  v_customer_email text := btrim(coalesce(p_customer_email, ''));
  v_project_name text := btrim(coalesce(p_project_name, ''));
  v_project_address text := btrim(coalesce(p_project_address, ''));
  v_version_label text := btrim(coalesce(p_version_label, ''));
begin
  if auth.uid() is null or not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to create a share link for this company.'
      using errcode = '42501';
  end if;

  if v_customer_name = '' or char_length(v_customer_name) > 120 then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_customer_name',
      'message', 'Enter a customer name within 120 characters.'
    );
  end if;

  if char_length(v_customer_phone) > 40
     or char_length(v_customer_email) > 200
     or char_length(v_project_name) > 160
     or char_length(v_project_address) > 500
     or char_length(v_version_label) > 120 then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_input',
      'message', 'Check the input length.'
    );
  end if;

  if p_expires_at is not null and p_expires_at <= now() then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_expiry',
      'message', 'Set the link expiration to a future time.'
    );
  end if;

  select e.*
  into v_estimate
  from public.estimates e
  where e.id = p_estimate_id
    and e.company_id = p_company_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'estimate_not_found',
      'message', 'The estimate could not be found.'
    );
  end if;

  if v_customer_phone <> '' or v_customer_email <> '' then
    select c.id
    into v_customer_id
    from public.customers c
    where c.company_id = p_company_id
      and lower(btrim(c.name)) = lower(v_customer_name)
      and (
        (v_customer_phone <> '' and btrim(c.phone) = v_customer_phone)
        or
        (v_customer_email <> '' and lower(btrim(c.email)) = lower(v_customer_email))
      )
    order by c.updated_at desc
    limit 1;
  end if;

  if v_customer_id is null then
    insert into public.customers (
      company_id,
      name,
      phone,
      email,
      required_contact_consent,
      aftercare_consent,
      marketing_consent
    )
    values (
      p_company_id,
      v_customer_name,
      v_customer_phone,
      v_customer_email,
      coalesce(p_required_contact_consent, false),
      coalesce(p_aftercare_consent, false),
      coalesce(p_marketing_consent, false)
    )
    returning id into v_customer_id;

    insert into public.timeline_events (
      company_id,
      customer_id,
      event_type,
      title,
      description
    )
    values (
      p_company_id,
      v_customer_id,
      'customer_created',
      'Customer created',
      v_customer_name
    );
  else
    update public.customers
    set
      name = v_customer_name,
      phone = case when v_customer_phone <> '' then v_customer_phone else phone end,
      email = case when v_customer_email <> '' then v_customer_email else email end,
      required_contact_consent = required_contact_consent or coalesce(p_required_contact_consent, false),
      aftercare_consent = aftercare_consent or coalesce(p_aftercare_consent, false),
      marketing_consent = marketing_consent or coalesce(p_marketing_consent, false)
    where id = v_customer_id;
  end if;

  if v_project_address <> '' then
    select p.id
    into v_project_id
    from public.projects p
    where p.company_id = p_company_id
      and p.customer_id = v_customer_id
      and lower(btrim(p.address)) = lower(v_project_address)
    order by p.updated_at desc
    limit 1;
  elsif v_project_name <> '' then
    select p.id
    into v_project_id
    from public.projects p
    where p.company_id = p_company_id
      and p.customer_id = v_customer_id
      and lower(btrim(p.name)) = lower(v_project_name)
    order by p.updated_at desc
    limit 1;
  end if;

  if v_project_id is null then
    insert into public.projects (
      company_id,
      customer_id,
      name,
      address,
      estimate_status,
      construction_start_date
    )
    values (
      p_company_id,
      v_customer_id,
      coalesce(nullif(v_project_name, ''), nullif(v_project_address, ''), 'Project'),
      v_project_address,
      'sent',
      v_estimate.construction_date
    )
    returning id into v_project_id;

    insert into public.timeline_events (
      company_id,
      customer_id,
      project_id,
      event_type,
      title,
      description
    )
    values (
      p_company_id,
      v_customer_id,
      v_project_id,
      'project_created',
      'Project created',
      coalesce(nullif(v_project_name, ''), nullif(v_project_address, ''), 'Project')
    );
  else
    update public.projects
    set
      name = case when v_project_name <> '' then v_project_name else name end,
      address = case when v_project_address <> '' then v_project_address else address end,
      estimate_status = 'sent',
      construction_start_date = coalesce(v_estimate.construction_date, construction_start_date)
    where id = v_project_id;
  end if;

  if jsonb_typeof(v_estimate.items_data) = 'array' then
    v_items_source := v_estimate.items_data;
    v_adjustments_source := '[]'::jsonb;
  else
    v_items_source := coalesce(v_estimate.items_data -> 'items', '[]'::jsonb);
    v_adjustments_source := coalesce(v_estimate.items_data -> 'adjustments', '[]'::jsonb);
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

  if jsonb_typeof(v_estimate.items_data) = 'object' then
    v_safe_meta := jsonb_strip_nulls(
      jsonb_build_object(
        'estimateNumber', nullif(v_estimate.items_data #>> '{estimateMeta,estimateNumber}', ''),
        'createdDate', nullif(v_estimate.items_data #>> '{estimateMeta,createdDate}', ''),
        'validUntil', nullif(v_estimate.items_data #>> '{estimateMeta,validUntil}', ''),
        'vatStatus', nullif(v_estimate.items_data #>> '{estimateMeta,vatStatus}', '')
      )
    );
  end if;

  if jsonb_typeof(v_estimate.items_data) = 'object'
     and coalesce(v_estimate.items_data ->> 'constructionDaysTotal', '') ~ '^[0-9]+$' then
    v_construction_days := greatest((v_estimate.items_data ->> 'constructionDaysTotal')::integer, 0);
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

  v_items_snapshot := jsonb_build_object(
    'items', v_safe_items,
    'adjustments', v_safe_adjustments,
    'estimateMeta', v_safe_meta,
    'constructionDaysTotal', v_construction_days
  );

  v_safe_condition := jsonb_strip_nulls(
    jsonb_build_object(
      'summary', nullif(v_estimate.condition_snapshot ->> 'summary', ''),
      'pyeong', coalesce(
        v_estimate.condition_snapshot -> 'condition_pyeong',
        v_estimate.condition_snapshot -> 'pyeong'
      ),
      'estimatePyeong', v_estimate.condition_snapshot -> 'estimate_pyeong',
      'buildType', nullif(v_estimate.condition_snapshot ->> 'build_type', ''),
      'conditionVariant', nullif(v_estimate.condition_snapshot ->> 'condition_variant', ''),
      'conditionVariantLabel', coalesce(
        nullif(v_estimate.condition_snapshot ->> 'condition_variant_display_label', ''),
        nullif(v_estimate.condition_snapshot ->> 'condition_variant_label', '')
      ),
      'occupancyType', nullif(v_estimate.condition_snapshot ->> 'occupancy_type', ''),
      'hasExtension', v_estimate.condition_snapshot -> 'has_extension'
    )
  );

  select coalesce(max(ev.version_no), 0) + 1
  into v_version_no
  from public.estimate_versions ev
  where ev.estimate_id = p_estimate_id;

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
    sent_at
  )
  values (
    p_company_id,
    p_estimate_id,
    v_customer_id,
    v_project_id,
    v_version_no,
    coalesce(nullif(v_version_label, ''), 'Estimate v' || v_version_no),
    'sent',
    greatest(coalesce(v_estimate.total_amount, 0), 0),
    greatest(v_construction_days, 0),
    v_items_snapshot,
    v_safe_condition,
    now()
  )
  returning id into v_version_id;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.customer_access_tokens (
    company_id,
    customer_id,
    project_id,
    estimate_id,
    estimate_version_id,
    token,
    status,
    expires_at
  )
  values (
    p_company_id,
    v_customer_id,
    v_project_id,
    p_estimate_id,
    v_version_id,
    v_token,
    'active',
    p_expires_at
  );

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
    v_customer_id,
    v_project_id,
    p_estimate_id,
    v_version_id,
    'estimate_link',
    'link_copy',
    coalesce(nullif(v_customer_phone, ''), nullif(v_customer_email, ''), v_customer_name),
    'A customer estimate link was created.',
    'sent',
    now()
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
    v_customer_id,
    v_project_id,
    p_estimate_id,
    v_version_id,
    'estimate_sent',
    'Estimate link created',
    coalesce(nullif(v_version_label, ''), 'Estimate v' || v_version_no),
    jsonb_build_object('channel', 'link_copy', 'expiresAt', p_expires_at)
  );

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'portalPath', '/c/' || v_token,
    'expiresAt', p_expires_at,
    'customerId', v_customer_id,
    'projectId', v_project_id,
    'estimateVersionId', v_version_id,
    'versionNo', v_version_no
  );
end;
$$;

create or replace function public.get_customer_portal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access public.customer_access_tokens%rowtype;
  v_version public.estimate_versions%rowtype;
  v_customer public.customers%rowtype;
  v_project public.projects%rowtype;
  v_estimate public.estimates%rowtype;
  v_company_name text := '';
  v_first_view boolean := false;
  v_phone_digits text := '';
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

  select ev.*
  into v_version
  from public.estimate_versions ev
  where ev.id = v_access.estimate_version_id
    and ev.company_id = v_access.company_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'estimate_not_found', 'tokenStatus', 'active');
  end if;

  v_first_view := v_version.viewed_at is null;

  update public.customer_access_tokens
  set last_accessed_at = now()
  where id = v_access.id;

  update public.estimate_versions
  set
    viewed_at = coalesce(viewed_at, now()),
    status = case when status = 'sent' then 'viewed' else status end
  where id = v_version.id
  returning * into v_version;

  if v_version.status = 'viewed' then
    update public.projects
    set estimate_status = case when estimate_status = 'sent' then 'viewed' else estimate_status end
    where id = v_access.project_id;
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

  select c.* into v_customer
  from public.customers c
  where c.id = v_access.customer_id
    and c.company_id = v_access.company_id;

  select p.* into v_project
  from public.projects p
  where p.id = v_access.project_id
    and p.company_id = v_access.company_id;

  select e.* into v_estimate
  from public.estimates e
  where e.id = v_access.estimate_id
    and e.company_id = v_access.company_id;

  select c.name into v_company_name
  from public.companies c
  where c.id = v_access.company_id;

  v_phone_digits := regexp_replace(coalesce(v_customer.phone, ''), '[^0-9]', '', 'g');

  return jsonb_build_object(
    'ok', true,
    'tokenStatus', 'active',
    'company', jsonb_build_object(
      'name', coalesce(v_company_name, 'FORMATE')
    ),
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
      'estimateStatus', v_project.estimate_status,
      'constructionStatus', v_project.construction_status,
      'constructionStartDate', v_project.construction_start_date
    ),
    'estimate', jsonb_build_object(
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
set search_path = public
as $$
declare
  v_access public.customer_access_tokens%rowtype;
  v_request_id uuid;
  v_request_type text := lower(btrim(coalesce(p_request_type, '')));
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_related_item_label text := btrim(coalesce(p_related_item_label, ''));
begin
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
    update public.customer_access_tokens set status = 'expired' where id = v_access.id;
    return jsonb_build_object('ok', false, 'code', 'expired_token');
  end if;

  if v_access.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'inactive_token');
  end if;

  if v_request_type not in ('inquiry', 'estimate_revision') then
    return jsonb_build_object('ok', false, 'code', 'invalid_request_type');
  end if;

  if v_body = '' or char_length(v_body) > 4000 then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_body',
      'message', 'Enter request details between 1 and 4000 characters.'
    );
  end if;

  if char_length(v_title) > 120 or char_length(v_related_item_label) > 160 then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_input',
      'message', 'Check the title or related item length.'
    );
  end if;

  if exists (
    select 1
    from public.customer_requests cr
    where cr.customer_id = v_access.customer_id
      and cr.estimate_version_id = v_access.estimate_version_id
      and cr.request_type = v_request_type
      and cr.created_at > now() - interval '10 seconds'
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'rate_limited',
      'message', 'Please try again shortly.'
    );
  end if;

  if v_title = '' then
    v_title := case
      when v_request_type = 'estimate_revision' then 'Estimate revision request'
      else 'Estimate inquiry'
    end;
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
    v_request_type,
    'received',
    v_title,
    v_body,
    v_related_item_label,
    true
  )
  returning id into v_request_id;

  if v_request_type = 'estimate_revision' then
    update public.estimate_versions
    set status = 'revision_requested'
    where id = v_access.estimate_version_id
      and status in ('sent', 'viewed', 'revision_requested');

    update public.projects
    set estimate_status = 'revision_requested'
    where id = v_access.project_id
      and estimate_status in ('sent', 'viewed', 'revision_requested');
  end if;

  insert into public.timeline_events (
    company_id,
    customer_id,
    project_id,
    estimate_id,
    estimate_version_id,
    customer_request_id,
    event_type,
    title,
    description,
    metadata
  )
  values (
    v_access.company_id,
    v_access.customer_id,
    v_access.project_id,
    v_access.estimate_id,
    v_access.estimate_version_id,
    v_request_id,
    'request_received',
    v_title,
    left(v_body, 500),
    jsonb_build_object('requestType', v_request_type, 'source', 'customer_portal')
  );

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
    v_title,
    left(v_body, 500),
    'customer_request',
    v_request_id
  );

  insert into public.customer_messages (
    company_id,
    customer_id,
    project_id,
    estimate_id,
    estimate_version_id,
    customer_request_id,
    message_type,
    channel,
    body,
    status,
    responded_at
  )
  values (
    v_access.company_id,
    v_access.customer_id,
    v_access.project_id,
    v_access.estimate_id,
    v_access.estimate_version_id,
    v_request_id,
    'manual',
    'manual',
    left(v_body, 4000),
    'responded',
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'requestId', v_request_id,
    'status', 'received',
    'requestType', v_request_type
  );
end;
$$;

create or replace function public.approve_customer_estimate(
  p_token text,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access public.customer_access_tokens%rowtype;
  v_version public.estimate_versions%rowtype;
  v_request_id uuid;
  v_note text := btrim(coalesce(p_note, ''));
begin
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
    update public.customer_access_tokens set status = 'expired' where id = v_access.id;
    return jsonb_build_object('ok', false, 'code', 'expired_token');
  end if;

  if v_access.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'inactive_token');
  end if;

  if char_length(v_note) > 1000 then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_note',
      'message', 'Enter an approval note within 1000 characters.'
    );
  end if;

  select ev.*
  into v_version
  from public.estimate_versions ev
  where ev.id = v_access.estimate_version_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'estimate_not_found');
  end if;

  if v_version.status = 'approved' then
    return jsonb_build_object(
      'ok', true,
      'alreadyApproved', true,
      'status', 'approved',
      'approvedAt', v_version.approved_at
    );
  end if;

  if v_version.status in ('expired', 'cancelled') then
    return jsonb_build_object(
      'ok', false,
      'code', 'estimate_not_approvable',
      'message', 'The estimate cannot be approved in its current status.'
    );
  end if;

  update public.estimate_versions
  set
    status = 'approved',
    approved_at = now()
  where id = v_version.id
  returning * into v_version;

  update public.projects
  set
    estimate_status = 'approved',
    contract_status = case when contract_status = 'not_started' then 'reviewing' else contract_status end
  where id = v_access.project_id;

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
    'approval',
    'approved',
    'Estimate approved',
    v_note,
    true
  )
  returning id into v_request_id;

  insert into public.timeline_events (
    company_id,
    customer_id,
    project_id,
    estimate_id,
    estimate_version_id,
    customer_request_id,
    event_type,
    title,
    description,
    metadata
  )
  values (
    v_access.company_id,
    v_access.customer_id,
    v_access.project_id,
    v_access.estimate_id,
    v_access.estimate_version_id,
    v_request_id,
    'request_received',
    'Customer approved estimate',
    coalesce(nullif(v_note, ''), 'The customer approved the estimate.'),
    jsonb_build_object('requestType', 'approval', 'source', 'customer_portal')
  );

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
    'estimate_approved',
    'The customer approved the estimate',
    coalesce(nullif(v_note, ''), coalesce(nullif(v_version.label, ''), 'Estimate approved')),
    'estimate_version',
    v_version.id
  );

  insert into public.customer_messages (
    company_id,
    customer_id,
    project_id,
    estimate_id,
    estimate_version_id,
    customer_request_id,
    message_type,
    channel,
    body,
    status,
    responded_at
  )
  values (
    v_access.company_id,
    v_access.customer_id,
    v_access.project_id,
    v_access.estimate_id,
    v_access.estimate_version_id,
    v_request_id,
    'manual',
    'manual',
    coalesce(nullif(v_note, ''), 'Estimate approved'),
    'responded',
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'alreadyApproved', false,
    'requestId', v_request_id,
    'status', 'approved',
    'approvedAt', v_version.approved_at
  );
end;
$$;

grant usage on schema public to anon, authenticated;

revoke all on table public.customers from anon;
revoke all on table public.projects from anon;
revoke all on table public.estimate_versions from anon;
revoke all on table public.customer_access_tokens from anon;
revoke all on table public.customer_requests from anon;
revoke all on table public.customer_messages from anon;
revoke all on table public.timeline_events from anon;
revoke all on table public.notifications from anon;
revoke all on table public.estimates from anon;

revoke all on function public.create_customer_portal_link(
  uuid, uuid, text, text, text, text, text, text, timestamptz, boolean, boolean, boolean
) from public, anon;
grant execute on function public.create_customer_portal_link(
  uuid, uuid, text, text, text, text, text, text, timestamptz, boolean, boolean, boolean
) to authenticated;

revoke all on function public.get_customer_portal(text) from public;
grant execute on function public.get_customer_portal(text) to anon, authenticated;

revoke all on function public.submit_customer_request(text, text, text, text, text) from public;
grant execute on function public.submit_customer_request(text, text, text, text, text) to anon, authenticated;

revoke all on function public.approve_customer_estimate(text, text) from public;
grant execute on function public.approve_customer_estimate(text, text) to anon, authenticated;

notify pgrst, 'reload schema';

