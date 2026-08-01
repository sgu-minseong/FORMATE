-- FORMATE sales lifecycle foundation
--
-- Purpose:
-- - Add independent consultation, estimate, contract, and construction lifecycle foundations.
-- - Preserve existing project lifecycle columns as compatibility projections.
-- - Keep existing estimates, estimate versions, tokens, soft-delete data, and legacy contract
--   statuses intact.
--
-- Deployment order:
-- 1. Run the approved SELECT-only preflight and review its results.
-- 2. Apply this file in the Supabase SQL Editor as one transaction.
-- 3. Do not remove or reinterpret legacy projects.contract_status values.
-- 4. Deploy the follow-up application/RPC changes before enforcing consultation_id as NOT NULL.
--
-- This file intentionally does not:
-- - create contracts from legacy projects.contract_status values;
-- - change existing project estimate/contract/construction statuses;
-- - create electronic-signature evidence tables;
-- - revoke or reactivate existing customer portal tokens.

begin;

create extension if not exists "pgcrypto";

do $$
declare
  v_created_at_exists boolean;
  v_updated_at_function_exists boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'estimates'
      and column_name = 'created_at'
  )
  into v_created_at_exists;

  select exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
      and p.pronargs = 0
      and p.prorettype = 'pg_catalog.trigger'::regtype
  )
  into v_updated_at_function_exists;

  if not v_created_at_exists then
    raise exception
      'sales_lifecycle_foundation requires public.estimates.created_at before lifecycle metadata can be backfilled.'
      using errcode = 'undefined_column';
  end if;

  if not v_updated_at_function_exists then
    raise exception
      'sales_lifecycle_foundation requires public.set_updated_at() returning trigger before lifecycle updated_at triggers can be created.'
      using errcode = 'undefined_function';
  end if;
end
$$;

-- Consultations are the CRM aggregate above estimates. The intake fields are only a
-- temporary home for information that cannot yet be linked to customers/projects.
create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  status text not null default 'active',
  close_reason text,
  closed_at timestamptz,
  closed_by uuid,
  intake_contact_name text,
  intake_contact_phone text,
  intake_contact_email text,
  intake_site_name text,
  intake_site_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.consultations
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists status text,
  add column if not exists close_reason text,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid,
  add column if not exists intake_contact_name text,
  add column if not exists intake_contact_phone text,
  add column if not exists intake_contact_email text,
  add column if not exists intake_site_name text,
  add column if not exists intake_site_address text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.consultations
  alter column status set default 'active',
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.consultations
set
  status = coalesce(status, 'active'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where status is null
   or created_at is null
   or updated_at is null;

alter table public.consultations
  alter column status set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'consultations_status_check'
      and conrelid = 'public.consultations'::regclass
  ) then
    alter table public.consultations
      add constraint consultations_status_check
      check (status in ('active', 'closed'));
  end if;
end
$$;

-- Estimates become the aggregate for the editable draft and the current customer-facing
-- version. consultation_id remains nullable during the application cutover so the current
-- saved-estimate insert flow is not broken between database and application deployments.
alter table public.estimates
  add column if not exists consultation_id uuid references public.consultations(id) on delete set null,
  add column if not exists status text,
  add column if not exists current_estimate_version_id uuid references public.estimate_versions(id) on delete set null,
  add column if not exists draft_revision integer,
  add column if not exists has_unpublished_changes boolean,
  add column if not exists client_draft_key uuid,
  add column if not exists updated_at timestamptz;

alter table public.estimates
  alter column status set default 'draft',
  alter column draft_revision set default 1,
  alter column has_unpublished_changes set default false,
  alter column updated_at set default now();

-- These values are newly introduced columns. Existing non-null values are left intact.
update public.estimates
set
  status = coalesce(status, 'draft'),
  draft_revision = coalesce(draft_revision, 1),
  updated_at = coalesce(updated_at, created_at, now())
where status is null
   or draft_revision is null
   or updated_at is null;

-- Existing version snapshots are customer-facing normalized projections, not a
-- lossless copy of estimates.items_data. For legacy estimates with a version,
-- NULL intentionally means the unpublished-change state is unknown rather than
-- incorrectly hiding an edit made after a send. Versionless legacy drafts are
-- safe to initialize as having no unpublished changes.
update public.estimates e
set has_unpublished_changes = false
where e.has_unpublished_changes is null
  and e.status = 'draft'
  and not exists (
    select 1
    from public.estimate_versions ev
    where ev.estimate_id = e.id
      and ev.company_id = e.company_id
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimates_sales_status_check'
      and conrelid = 'public.estimates'::regclass
  ) then
    alter table public.estimates
      add constraint estimates_sales_status_check
      check (
        status in (
          'draft',
          'sent',
          'viewed',
          'revision_requested',
          'approved',
          'rejected',
          'expired',
          'cancelled'
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimates_draft_revision_check'
      and conrelid = 'public.estimates'::regclass
  ) then
    alter table public.estimates
      add constraint estimates_draft_revision_check
      check (draft_revision is null or draft_revision >= 1) not valid;
  end if;
end
$$;

-- A sent version remains an immutable content snapshot. The added fields support the new
-- lifecycle without changing any legacy version content.
alter table public.estimate_versions
  add column if not exists source_draft_revision integer,
  add column if not exists valid_until timestamptz,
  add column if not exists rejected_at timestamptz;

do $$
declare
  v_constraint record;
begin
  -- Do not depend on a historical constraint name. Only replace CHECK
  -- constraints whose sole constrained column is estimate_versions.status and
  -- whose definition is a status value-set restriction.
  for v_constraint in
    select c.conname
    from pg_constraint c
    join lateral unnest(c.conkey) as key(attnum) on true
    join pg_attribute a
      on a.attrelid = c.conrelid
      and a.attnum = key.attnum
      and not a.attisdropped
    where c.conrelid = 'public.estimate_versions'::regclass
      and c.contype = 'c'
    group by c.oid, c.conname
    having array_agg(a.attname order by a.attname) = array['status']::name[]
       and lower(pg_get_constraintdef(c.oid)) ~ 'status[[:space:]]*(in|=)'
  loop
    execute format(
      'alter table public.estimate_versions drop constraint %I',
      v_constraint.conname
    );
  end loop;

  alter table public.estimate_versions
    add constraint estimate_versions_lifecycle_status_check
    check (
      status in (
        'draft',
        'sent',
        'viewed',
        'revision_requested',
        'approved',
        'rejected',
        'expired',
        'cancelled'
      )
    );
end
$$;

-- prepared is deliberately an internal token state for provider-based delivery only.
-- Existing active/revoked/expired rows remain valid and are not downgraded.
alter table public.customer_access_tokens
  add column if not exists activated_at timestamptz,
  add column if not exists activation_source text,
  add column if not exists prepared_draft_revision integer;

do $$
declare
  v_constraint record;
begin
  -- As with estimate_versions, retain unrelated CHECK constraints even if a
  -- deployment gave the historical status constraint a different name.
  for v_constraint in
    select c.conname
    from pg_constraint c
    join lateral unnest(c.conkey) as key(attnum) on true
    join pg_attribute a
      on a.attrelid = c.conrelid
      and a.attnum = key.attnum
      and not a.attisdropped
    where c.conrelid = 'public.customer_access_tokens'::regclass
      and c.contype = 'c'
    group by c.oid, c.conname
    having array_agg(a.attname order by a.attname) = array['status']::name[]
       and lower(pg_get_constraintdef(c.oid)) ~ 'status[[:space:]]*(in|=)'
  loop
    execute format(
      'alter table public.customer_access_tokens drop constraint %I',
      v_constraint.conname
    );
  end loop;

  alter table public.customer_access_tokens
    add constraint customer_access_tokens_lifecycle_status_check
    check (status in ('prepared', 'active', 'revoked', 'expired'));

  if not exists (
    select 1
    from pg_constraint
    where conname = 'customer_access_tokens_activation_source_check'
      and conrelid = 'public.customer_access_tokens'::regclass
  ) then
    alter table public.customer_access_tokens
      add constraint customer_access_tokens_activation_source_check
      check (
        activation_source is null
        or activation_source in (
          'provider_accepted',
          'manual_confirmed',
          'legacy_active'
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'customer_access_tokens_prepared_revision_check'
      and conrelid = 'public.customer_access_tokens'::regclass
  ) then
    alter table public.customer_access_tokens
      add constraint customer_access_tokens_prepared_revision_check
      check (
        prepared_draft_revision is null
        or prepared_draft_revision >= 1
      ) not valid;
  end if;
end
$$;

-- Backfill only the newly added token metadata. It does not alter token status or URLs.
update public.customer_access_tokens cat
set
  activated_at = coalesce(
    cat.activated_at,
    (
      select ev.sent_at
      from public.estimate_versions ev
      where ev.id = cat.estimate_version_id
        and ev.company_id = cat.company_id
    ),
    cat.created_at
  ),
  activation_source = coalesce(cat.activation_source, 'legacy_active')
where cat.status = 'active'
  and (
    cat.activated_at is null
    or cat.activation_source is null
  );

-- Contract lifecycle foundation only. There is intentionally no contract backfill:
-- projects.contract_status='reviewing' remains a legacy projection requiring human review.
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  consultation_id uuid not null references public.consultations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  estimate_id uuid not null references public.estimates(id) on delete restrict,
  estimate_version_id uuid not null references public.estimate_versions(id) on delete restrict,
  status text not null default 'draft',
  customer_signed_at timestamptz,
  completed_at timestamptz,
  completed_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contracts
  add column if not exists consultation_id uuid references public.consultations(id) on delete restrict,
  add column if not exists project_id uuid references public.projects(id) on delete restrict,
  add column if not exists estimate_id uuid references public.estimates(id) on delete restrict,
  add column if not exists estimate_version_id uuid references public.estimate_versions(id) on delete restrict,
  add column if not exists status text,
  add column if not exists customer_signed_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid,
  add column if not exists cancel_reason text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.contracts
  alter column status set default 'draft',
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contracts_status_check'
      and conrelid = 'public.contracts'::regclass
  ) then
    alter table public.contracts
      add constraint contracts_status_check
      check (
        status in (
          'draft',
          'customer_reviewing',
          'revision_requested',
          'customer_signed',
          'completed',
          'cancelled'
        )
      );
  end if;
end
$$;

-- Backfill one consultation per legacy estimate. Estimates that have a single consistent
-- customer/project version link receive that link; ambiguous links stay NULL for review.
with version_links as (
  select
    ev.company_id,
    ev.estimate_id,
    count(distinct ev.customer_id) as customer_count,
    count(distinct ev.project_id) as project_count,
    (array_agg(distinct ev.customer_id)
      filter (where ev.customer_id is not null))[1] as customer_id,
    (array_agg(distinct ev.project_id)
      filter (where ev.project_id is not null))[1] as project_id
  from public.estimate_versions ev
  where ev.estimate_id is not null
  group by ev.company_id, ev.estimate_id
),
resolved_links as (
  select
    e.id as estimate_id,
    e.company_id,
    e.created_at,
    e.items_data,
    e.address,
    case
      when vl.customer_count = 1
       and c.id is not null
       and c.company_id = e.company_id
        then c.id
      else null
    end as customer_id,
    case
      when vl.customer_count = 1
       and vl.project_count = 1
       and p.id is not null
       and p.company_id = e.company_id
       and p.customer_id = vl.customer_id
        then p.id
      else null
    end as project_id
  from public.estimates e
  left join version_links vl
    on vl.company_id = e.company_id
   and vl.estimate_id = e.id
  left join public.customers c
    on c.id = vl.customer_id
  left join public.projects p
    on p.id = vl.project_id
  where e.consultation_id is null
),
pending_consultations as (
  select
    gen_random_uuid() as consultation_id,
    estimate_id,
    company_id,
    customer_id,
    project_id,
    case
      when customer_id is null
        then nullif(btrim(items_data #>> '{estimateMeta,customerName}'), '')
      else null
    end as intake_contact_name,
    case
      when customer_id is null
        then nullif(btrim(items_data #>> '{estimateMeta,customerPhone}'), '')
      else null
    end as intake_contact_phone,
    case
      when project_id is null
        then nullif(btrim(address), '')
      else null
    end as intake_site_address,
    coalesce(created_at, now()) as created_at
  from resolved_links
),
inserted_consultations as (
  insert into public.consultations (
    id,
    company_id,
    customer_id,
    project_id,
    status,
    intake_contact_name,
    intake_contact_phone,
    intake_site_address,
    created_at,
    updated_at
  )
  select
    consultation_id,
    company_id,
    customer_id,
    project_id,
    'active',
    intake_contact_name,
    intake_contact_phone,
    intake_site_address,
    created_at,
    now()
  from pending_consultations
  returning id
)
update public.estimates e
set consultation_id = pc.consultation_id
from pending_consultations pc
join inserted_consultations ic
  on ic.id = pc.consultation_id
where e.id = pc.estimate_id
  and e.company_id = pc.company_id
  and e.consultation_id is null;

-- Backfill the current estimate projection only when the newly added projection has not
-- already been populated. Existing source data and all version snapshots are preserved.
with latest_versions as (
  select distinct on (ev.estimate_id)
    ev.estimate_id,
    ev.id as estimate_version_id,
    ev.status
  from public.estimate_versions ev
  where ev.estimate_id is not null
  order by
    ev.estimate_id,
    ev.version_no desc,
    ev.created_at desc nulls last,
    ev.id desc
)
update public.estimates e
set
  current_estimate_version_id = lv.estimate_version_id,
  status = lv.status
from latest_versions lv
where e.id = lv.estimate_id
  and e.current_estimate_version_id is null
  and e.status = 'draft';

-- The preflight found no unexpected status values. Validate the constraints only
-- after every migration backfill that can populate their referenced columns.
alter table public.estimates
  validate constraint estimates_sales_status_check;

alter table public.estimates
  validate constraint estimates_draft_revision_check;

alter table public.customer_access_tokens
  validate constraint customer_access_tokens_activation_source_check;

alter table public.customer_access_tokens
  validate constraint customer_access_tokens_prepared_revision_check;

create index if not exists consultations_company_status_idx
  on public.consultations(company_id, status, updated_at desc);

create index if not exists consultations_customer_id_idx
  on public.consultations(customer_id)
  where customer_id is not null;

create index if not exists consultations_project_id_idx
  on public.consultations(project_id)
  where project_id is not null;

create index if not exists estimates_consultation_id_idx
  on public.estimates(consultation_id)
  where consultation_id is not null;

create unique index if not exists estimates_company_client_draft_key_uidx
  on public.estimates(company_id, client_draft_key)
  where client_draft_key is not null;

create unique index if not exists estimate_versions_estimate_draft_revision_uidx
  on public.estimate_versions(estimate_id, source_draft_revision)
  where estimate_id is not null
    and source_draft_revision is not null;

create index if not exists customer_access_tokens_company_estimate_status_idx
  on public.customer_access_tokens(company_id, estimate_id, status);

create index if not exists contracts_company_status_idx
  on public.contracts(company_id, status, updated_at desc);

create index if not exists contracts_consultation_id_idx
  on public.contracts(consultation_id);

create index if not exists contracts_project_id_idx
  on public.contracts(project_id);

create index if not exists contracts_estimate_version_id_idx
  on public.contracts(estimate_version_id);

drop trigger if exists set_consultations_updated_at on public.consultations;
create trigger set_consultations_updated_at
before update on public.consultations
for each row execute function public.set_updated_at();

drop trigger if exists set_estimates_updated_at on public.estimates;
create trigger set_estimates_updated_at
before update on public.estimates
for each row execute function public.set_updated_at();

drop trigger if exists set_contracts_updated_at on public.contracts;
create trigger set_contracts_updated_at
before update on public.contracts
for each row execute function public.set_updated_at();

grant usage on schema public to authenticated;

revoke all on table public.consultations from anon;
revoke all on table public.contracts from anon;
grant select on table public.consultations to authenticated;
grant select on table public.contracts to authenticated;

alter table public.consultations enable row level security;
alter table public.contracts enable row level security;

drop policy if exists "members can read own consultations" on public.consultations;
create policy "members can read own consultations"
on public.consultations
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = consultations.company_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can read own contracts" on public.contracts;
create policy "members can read own contracts"
on public.contracts
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = contracts.company_id
      and cm.user_id = auth.uid()
  )
);

comment on table public.consultations is
  'CRM consultation aggregate. customer_id and project_id are nullable until identity is sufficient.';

comment on column public.estimates.consultation_id is
  'Consultation parent. Nullable only during the application migration window.';

comment on column public.estimates.current_estimate_version_id is
  'Current customer-facing immutable estimate version, if one has been sent.';

comment on column public.customer_access_tokens.status is
  'prepared is provider-delivery internal only; active is the customer-accessible state.';

comment on table public.contracts is
  'Contract lifecycle foundation only. Document versions and electronic-signature evidence are future work.';

notify pgrst, 'reload schema';

commit;
