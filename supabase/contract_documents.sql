-- FORMATE contract document drafts and immutable review versions
-- Apply after supabase/sales_lifecycle_foundation.sql and
-- supabase/sales_lifecycle_rpcs.sql.

begin;

alter table public.contracts
  add column if not exists contract_number text,
  add column if not exists document_data jsonb not null default '{}'::jsonb,
  add column if not exists current_version_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contracts_document_data_object_check'
      and conrelid = 'public.contracts'::regclass
  ) then
    alter table public.contracts
      add constraint contracts_document_data_object_check
      check (jsonb_typeof(document_data) = 'object') not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'contracts_contract_number_check'
      and conrelid = 'public.contracts'::regclass
  ) then
    alter table public.contracts
      add constraint contracts_contract_number_check
      check (contract_number is null or btrim(contract_number) <> '') not valid;
  end if;
end;
$$;

create table if not exists public.contract_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete restrict,
  version_no integer not null,
  document_snapshot jsonb not null,
  source_estimate_version_id uuid not null references public.estimate_versions(id) on delete restrict,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  constraint contract_versions_version_no_check check (version_no > 0),
  constraint contract_versions_document_snapshot_object_check
    check (jsonb_typeof(document_snapshot) = 'object'),
  unique (contract_id, version_no)
);

alter table public.contract_versions
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists contract_id uuid references public.contracts(id) on delete restrict,
  add column if not exists version_no integer,
  add column if not exists document_snapshot jsonb,
  add column if not exists source_estimate_version_id uuid references public.estimate_versions(id) on delete restrict,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz default now();

create unique index if not exists contracts_company_contract_number_uidx
  on public.contracts(company_id, contract_number)
  where contract_number is not null;

create unique index if not exists contract_versions_id_contract_uidx
  on public.contract_versions(id, contract_id);

create index if not exists contract_versions_company_contract_version_idx
  on public.contract_versions(company_id, contract_id, version_no desc);

create index if not exists contract_versions_source_estimate_version_idx
  on public.contract_versions(source_estimate_version_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contracts_current_version_contract_fkey'
      and conrelid = 'public.contracts'::regclass
  ) then
    alter table public.contracts
      add constraint contracts_current_version_contract_fkey
      foreign key (current_version_id, id)
      references public.contract_versions(id, contract_id)
      on delete restrict
      deferrable initially deferred;
  end if;
end;
$$;

create or replace function public.prevent_contract_version_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Contract versions are immutable.' using errcode = '55000';
end;
$$;

drop trigger if exists prevent_contract_version_update_delete on public.contract_versions;
create trigger prevent_contract_version_update_delete
before update or delete on public.contract_versions
for each row execute function public.prevent_contract_version_mutation();

create or replace function public.create_contract_draft(
  p_company_id uuid,
  p_project_id uuid,
  p_estimate_version_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_project public.projects%rowtype;
  v_customer public.customers%rowtype;
  v_company public.companies%rowtype;
  v_estimate public.estimates%rowtype;
  v_version public.estimate_versions%rowtype;
  v_consultation public.consultations%rowtype;
  v_contract public.contracts%rowtype;
  v_contract_id uuid := extensions.gen_random_uuid();
  v_contract_number text;
  v_document_data jsonb;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'You do not have permission to create contracts for this company.'
      using errcode = '42501';
  end if;

  select p.*
  into v_project
  from public.projects p
  where p.id = p_project_id
    and p.company_id = p_company_id
    and p.deleted_at is null
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'project_not_found');
  end if;

  select c.*
  into v_contract
  from public.contracts c
  where c.company_id = p_company_id
    and c.project_id = p_project_id
  order by c.created_at desc
  limit 1
  for update;
  if found then
    return jsonb_build_object(
      'ok', true,
      'result', 'already_exists',
      'contractId', v_contract.id,
      'contractNumber', v_contract.contract_number,
      'status', v_contract.status,
      'documentData', v_contract.document_data,
      'estimateVersionId', v_contract.estimate_version_id,
      'currentVersionId', v_contract.current_version_id
    );
  end if;

  select ev.*
  into v_version
  from public.estimate_versions ev
  join public.estimates e
    on e.id = ev.estimate_id
   and e.company_id = ev.company_id
  where ev.company_id = p_company_id
    and ev.project_id = p_project_id
    and ev.status = 'approved'
    and e.deleted_at is null
    and e.current_estimate_version_id = ev.id
    and (p_estimate_version_id is null or ev.id = p_estimate_version_id)
  order by ev.approved_at desc nulls last, ev.version_no desc
  limit 1
  for update of ev, e;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'approved_current_estimate_required');
  end if;

  select e.*
  into v_estimate
  from public.estimates e
  where e.id = v_version.estimate_id
    and e.company_id = p_company_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'estimate_not_found');
  end if;

  select c.*
  into v_customer
  from public.customers c
  where c.id = v_project.customer_id
    and c.company_id = p_company_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'customer_not_found');
  end if;

  select c.*
  into v_company
  from public.companies c
  where c.id = p_company_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'company_not_found');
  end if;

  select c.*
  into v_consultation
  from public.consultations c
  where c.id = v_estimate.consultation_id
    and c.company_id = p_company_id
    and c.project_id = v_project.id
    and c.customer_id = v_customer.id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'consultation_link_required');
  end if;

  v_contract_number := 'CT-' || to_char(now(), 'YYYYMMDD') || '-'
    || upper(substr(replace(v_contract_id::text, '-', ''), 1, 8));

  v_document_data := jsonb_build_object(
    'schemaVersion', 1,
    'title', U&'\C778\D14C\B9AC\C5B4 \ACE0\C0AC \ACC4\C57D\C11C',
    'contractNumber', v_contract_number,
    'customerSnapshot', jsonb_build_object(
      'id', v_customer.id,
      'name', coalesce(v_customer.name, ''),
      'phone', coalesce(v_customer.phone, ''),
      'email', coalesce(v_customer.email, '')
    ),
    'companySnapshot', jsonb_build_object(
      'id', v_company.id,
      'name', coalesce(v_company.name, ''),
      'companyCode', coalesce(v_company.company_code, '')
    ),
    'projectSnapshot', jsonb_build_object(
      'id', v_project.id,
      'name', coalesce(v_project.name, ''),
      'address', coalesce(v_project.address, ''),
      'detailAddress', coalesce(v_project.detail_address, '')
    ),
    'estimateSnapshot', jsonb_build_object(
      'estimateId', v_estimate.id,
      'estimateVersionId', v_version.id,
      'versionNo', v_version.version_no,
      'label', coalesce(v_version.label, ''),
      'estimateNumber', coalesce(v_version.items_snapshot #>> '{estimateMeta,estimateNumber}', ''),
      'totalAmount', greatest(coalesce(v_version.total_amount, 0), 0),
      'estimatedConstructionDays', greatest(coalesce(v_version.estimated_construction_days, 0), 0),
      'scopeItems', coalesce(v_version.items_snapshot -> 'items', '[]'::jsonb)
    ),
    'construction', jsonb_build_object(
      'startDate', coalesce(v_project.construction_start_date::text, ''),
      'endDate', coalesce(v_project.construction_completed_date::text, ''),
      'periodDescription', case
        when coalesce(v_version.estimated_construction_days, 0) > 0
          then v_version.estimated_construction_days::text || U&'\C77C \C608\C815'
        else ''
      end
    ),
    'paymentTerms', jsonb_build_array(
      jsonb_build_object(
        'id', 'deposit',
        'label', U&'\ACC4\C57D\AE08',
        'calculationType', 'percentage',
        'percentage', null,
        'amount', null,
        'dueDescription', ''
      ),
      jsonb_build_object(
        'id', 'interim',
        'label', U&'\C911\B3C4\AE08',
        'calculationType', 'percentage',
        'percentage', null,
        'amount', null,
        'dueDescription', ''
      ),
      jsonb_build_object(
        'id', 'balance',
        'label', U&'\C794\AE08',
        'calculationType', 'percentage',
        'percentage', null,
        'amount', null,
        'dueDescription', ''
      )
    ),
    'scopeSupplement', '',
    'exclusions', '',
    'materialChangePolicy', '',
    'changeOrderPolicy', '',
    'delayCancellationPolicy', '',
    'warranty', '',
    'specialTerms', '',
    'internalMemo', ''
  );

  insert into public.contracts (
    id,
    company_id,
    consultation_id,
    project_id,
    estimate_id,
    estimate_version_id,
    status,
    contract_number,
    document_data
  )
  values (
    v_contract_id,
    p_company_id,
    v_consultation.id,
    v_project.id,
    v_estimate.id,
    v_version.id,
    'draft',
    v_contract_number,
    v_document_data
  )
  returning * into v_contract;

  return jsonb_build_object(
    'ok', true,
    'result', 'created',
    'contractId', v_contract.id,
    'contractNumber', v_contract.contract_number,
    'status', v_contract.status,
    'documentData', v_contract.document_data,
    'estimateVersionId', v_contract.estimate_version_id,
    'currentVersionId', v_contract.current_version_id
  );
end;
$$;

create or replace function public.save_contract_document(
  p_company_id uuid,
  p_contract_id uuid,
  p_document_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_contract public.contracts%rowtype;
  v_existing jsonb;
  v_input_construction jsonb;
  v_existing_construction jsonb;
  v_payment_terms jsonb;
  v_next_document jsonb;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'You do not have permission to update contracts for this company.'
      using errcode = '42501';
  end if;
  if jsonb_typeof(p_document_data) <> 'object'
     or octet_length(p_document_data::text) > 262144 then
    return jsonb_build_object('ok', false, 'code', 'invalid_document_data');
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
  if v_contract.status not in ('draft', 'revision_requested') then
    return jsonb_build_object('ok', false, 'code', 'contract_not_editable');
  end if;

  v_existing := coalesce(v_contract.document_data, '{}'::jsonb);
  v_input_construction := case
    when jsonb_typeof(p_document_data -> 'construction') = 'object'
      then p_document_data -> 'construction'
    else '{}'::jsonb
  end;
  v_existing_construction := case
    when jsonb_typeof(v_existing -> 'construction') = 'object'
      then v_existing -> 'construction'
    else '{}'::jsonb
  end;
  v_payment_terms := case
    when jsonb_typeof(p_document_data -> 'paymentTerms') = 'array'
      and jsonb_array_length(p_document_data -> 'paymentTerms') <= 20
      then p_document_data -> 'paymentTerms'
    else coalesce(v_existing -> 'paymentTerms', '[]'::jsonb)
  end;

  v_next_document := v_existing || jsonb_build_object(
    'construction', jsonb_build_object(
      'startDate', left(coalesce(
        v_input_construction ->> 'startDate',
        v_existing_construction ->> 'startDate',
        ''
      ), 10),
      'endDate', left(coalesce(
        v_input_construction ->> 'endDate',
        v_existing_construction ->> 'endDate',
        ''
      ), 10),
      'periodDescription', left(coalesce(
        v_input_construction ->> 'periodDescription',
        v_existing_construction ->> 'periodDescription',
        ''
      ), 1000)
    ),
    'paymentTerms', v_payment_terms,
    'scopeSupplement', left(coalesce(p_document_data ->> 'scopeSupplement', v_existing ->> 'scopeSupplement', ''), 10000),
    'exclusions', left(coalesce(p_document_data ->> 'exclusions', v_existing ->> 'exclusions', ''), 10000),
    'materialChangePolicy', left(coalesce(p_document_data ->> 'materialChangePolicy', v_existing ->> 'materialChangePolicy', ''), 10000),
    'changeOrderPolicy', left(coalesce(p_document_data ->> 'changeOrderPolicy', v_existing ->> 'changeOrderPolicy', ''), 10000),
    'delayCancellationPolicy', left(coalesce(p_document_data ->> 'delayCancellationPolicy', v_existing ->> 'delayCancellationPolicy', ''), 10000),
    'warranty', left(coalesce(p_document_data ->> 'warranty', v_existing ->> 'warranty', ''), 10000),
    'specialTerms', left(coalesce(p_document_data ->> 'specialTerms', v_existing ->> 'specialTerms', ''), 20000),
    'internalMemo', left(coalesce(p_document_data ->> 'internalMemo', v_existing ->> 'internalMemo', ''), 20000)
  );

  update public.contracts
  set document_data = v_next_document
  where id = v_contract.id
    and company_id = p_company_id
  returning * into v_contract;

  return jsonb_build_object(
    'ok', true,
    'result', 'saved',
    'contractId', v_contract.id,
    'contractNumber', v_contract.contract_number,
    'status', v_contract.status,
    'documentData', v_contract.document_data,
    'currentVersionId', v_contract.current_version_id
  );
end;
$$;

create or replace function public.request_contract_review(
  p_company_id uuid,
  p_contract_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_contract public.contracts%rowtype;
  v_version public.contract_versions%rowtype;
  v_version_no integer;
  v_snapshot jsonb;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'You do not have permission to submit contracts for this company.'
      using errcode = '42501';
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
  if v_contract.status = 'customer_reviewing' and v_contract.current_version_id is not null then
    return jsonb_build_object(
      'ok', true,
      'result', 'already_reviewing',
      'contractId', v_contract.id,
      'contractVersionId', v_contract.current_version_id,
      'status', v_contract.status
    );
  end if;
  if v_contract.status not in ('draft', 'revision_requested') then
    return jsonb_build_object('ok', false, 'code', 'invalid_contract_transition');
  end if;
  if jsonb_typeof(v_contract.document_data) <> 'object'
     or v_contract.document_data = '{}'::jsonb then
    return jsonb_build_object('ok', false, 'code', 'contract_document_required');
  end if;

  select coalesce(max(cv.version_no), 0) + 1
  into v_version_no
  from public.contract_versions cv
  where cv.contract_id = v_contract.id;

  v_snapshot := v_contract.document_data - 'internalMemo';

  insert into public.contract_versions (
    company_id,
    contract_id,
    version_no,
    document_snapshot,
    source_estimate_version_id,
    created_by
  )
  values (
    p_company_id,
    v_contract.id,
    v_version_no,
    v_snapshot,
    v_contract.estimate_version_id,
    auth.uid()
  )
  returning * into v_version;

  update public.contracts
  set
    current_version_id = v_version.id,
    status = 'customer_reviewing'
  where id = v_contract.id
    and company_id = p_company_id
  returning * into v_contract;

  return jsonb_build_object(
    'ok', true,
    'result', 'review_requested',
    'contractId', v_contract.id,
    'contractVersionId', v_version.id,
    'versionNo', v_version.version_no,
    'status', v_contract.status,
    'createdAt', v_version.created_at
  );
end;
$$;

-- Generic status changes may not bypass the immutable review snapshot RPC.
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
    when 'draft' then v_next_status in ('cancelled')
    when 'customer_reviewing' then v_next_status in ('revision_requested', 'customer_signed', 'cancelled')
    when 'revision_requested' then v_next_status in ('draft', 'cancelled')
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
    and company_id = p_company_id
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

revoke all on table public.contract_versions from anon;
revoke insert, update, delete on table public.contract_versions from authenticated;
grant select on table public.contract_versions to authenticated;
grant select on table public.contracts to authenticated;

alter table public.contract_versions enable row level security;

drop policy if exists "members can read own contract versions" on public.contract_versions;
create policy "members can read own contract versions"
on public.contract_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = contract_versions.company_id
      and cm.user_id = auth.uid()
  )
);

revoke all on function public.prevent_contract_version_mutation() from public, anon, authenticated;

revoke all on function public.create_contract_draft(uuid, uuid, uuid) from public, anon;
grant execute on function public.create_contract_draft(uuid, uuid, uuid) to authenticated;

revoke all on function public.save_contract_document(uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_contract_document(uuid, uuid, jsonb) to authenticated;

revoke all on function public.request_contract_review(uuid, uuid) from public, anon;
grant execute on function public.request_contract_review(uuid, uuid) to authenticated;

revoke all on function public.update_contract_status(uuid, uuid, text, text) from public, anon;
grant execute on function public.update_contract_status(uuid, uuid, text, text) to authenticated;

comment on column public.contracts.document_data is
  'Editable contract working document. Canonical identity snapshots are written only by create_contract_draft.';

comment on table public.contract_versions is
  'Immutable customer-review contract document snapshots. Future signature evidence should reference contract_versions.id.';

notify pgrst, 'reload schema';

commit;
