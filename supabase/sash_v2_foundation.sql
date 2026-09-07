-- FORMATE Sash v2 condition, option metadata, and sparse-row foundation.
-- Apply manually after sash_catalog_category_pins.sql.
-- This forward migration preserves existing catalog rows and estimate snapshots.

begin;

set local client_encoding = 'UTF8';

-- A catalog row is canonical as soon as its company and construction subitem are known.
-- Blank editable values are stored as null; present values remain validated.
alter table public.sash_catalog_entries
  alter column brand drop not null,
  alter column product_type drop not null,
  alter column width_mm drop not null,
  alter column height_mm drop not null,
  alter column unit_price drop not null,
  alter column unit_price drop default,
  alter column cost_price drop not null,
  alter column cost_price drop default,
  add column if not exists glass_thickness text,
  add column if not exists handle_type text,
  add column if not exists window_count text,
  add column if not exists window_type_option_id uuid;

alter table public.sash_catalog_entries
  drop constraint if exists sash_catalog_entries_brand_not_blank_check,
  drop constraint if exists sash_catalog_entries_product_type_not_blank_check,
  drop constraint if exists sash_catalog_entries_width_mm_check,
  drop constraint if exists sash_catalog_entries_height_mm_check,
  drop constraint if exists sash_catalog_entries_unit_price_check,
  drop constraint if exists sash_catalog_entries_cost_price_check,
  drop constraint if exists sash_catalog_entries_area_pricing_spec_complete_check;

alter table public.sash_catalog_entries
  add constraint sash_catalog_entries_brand_not_blank_check
    check (brand is null or length(btrim(brand)) > 0),
  add constraint sash_catalog_entries_product_type_not_blank_check
    check (product_type is null or length(btrim(product_type)) > 0),
  add constraint sash_catalog_entries_width_mm_check
    check (width_mm is null or width_mm > 0),
  add constraint sash_catalog_entries_height_mm_check
    check (height_mm is null or height_mm > 0),
  add constraint sash_catalog_entries_unit_price_check check (
    unit_price is null
    or (
      unit_price >= 0
      and unit_price::text not in ('NaN', 'Infinity', '-Infinity')
    )
  ),
  add constraint sash_catalog_entries_cost_price_check check (
    cost_price is null
    or (
      cost_price >= 0
      and cost_price::text not in ('NaN', 'Infinity', '-Infinity')
    )
  );

comment on column public.sash_catalog_entries.glass_thickness is
  'Optional company-authored glass thickness label.';
comment on column public.sash_catalog_entries.handle_type is
  'Optional company-authored handle type label.';
comment on column public.sash_catalog_entries.window_count is
  'Optional company-authored window count label.';

create table if not exists public.sash_conditions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sash_conditions_name_not_blank_check
    check (length(btrim(name)) > 0)
);

comment on table public.sash_conditions is
  'Company-defined sash configurations independent from whole-estimate conditions.';

create table if not exists public.sash_condition_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sash_condition_id uuid not null references public.sash_conditions(id) on delete restrict,
  construction_subitem_id uuid not null references public.construction_subitems(id) on delete restrict,
  sash_catalog_entry_id uuid not null references public.sash_catalog_entries(id) on delete restrict,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sash_condition_entries_scope_key unique (
    sash_condition_id,
    construction_subitem_id
  )
);

comment on table public.sash_condition_entries is
  'One selected catalog entry per sash condition and construction subitem.';

create table if not exists public.sash_option_values (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  option_kind text not null,
  label text not null,
  semantic_value text,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sash_option_values_kind_check check (
    option_kind in (
      'screen',
      'glass_type',
      'gas',
      'glass_thickness',
      'handle_type',
      'window_count',
      'window_type'
    )
  ),
  constraint sash_option_values_label_not_blank_check
    check (length(btrim(label)) > 0),
  constraint sash_option_values_window_semantic_check check (
    (
      option_kind = 'window_type'
      and semantic_value is not null
      and semantic_value in ('single', 'double')
    )
    or (
      option_kind <> 'window_type'
      and semantic_value is null
    )
  )
);

comment on table public.sash_option_values is
  'Company-scoped reusable Sash dropdown labels; only window_type carries calculation semantics.';

create index if not exists sash_conditions_company_order_idx
  on public.sash_conditions (company_id, sort_order, created_at)
  where archived_at is null;

create unique index if not exists sash_conditions_active_company_name_uidx
  on public.sash_conditions (company_id, name)
  where archived_at is null;

create index if not exists sash_condition_entries_condition_order_idx
  on public.sash_condition_entries (company_id, sash_condition_id, sort_order, created_at)
  where archived_at is null;

create index if not exists sash_condition_entries_catalog_entry_idx
  on public.sash_condition_entries (sash_catalog_entry_id);

create index if not exists sash_option_values_company_kind_order_idx
  on public.sash_option_values (company_id, option_kind, sort_order, created_at)
  where archived_at is null;

create unique index if not exists sash_option_values_active_company_kind_label_uidx
  on public.sash_option_values (company_id, option_kind, label)
  where archived_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sash_catalog_entries'::regclass
      and conname = 'sash_catalog_entries_window_type_option_fkey'
  ) then
    alter table public.sash_catalog_entries
      add constraint sash_catalog_entries_window_type_option_fkey
      foreign key (window_type_option_id)
      references public.sash_option_values(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists sash_catalog_entries_window_type_option_idx
  on public.sash_catalog_entries (window_type_option_id)
  where window_type_option_id is not null;

create or replace function public.formate_validate_sash_catalog_entry_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  parent_company_id uuid;
  parent_item_kind text;
  option_company_id uuid;
  option_kind_value text;
  option_semantic_value text;
  option_archived_at timestamptz;
begin
  select construction_item.company_id, construction_item.item_kind
  into parent_company_id, parent_item_kind
  from public.construction_subitems as construction_subitem
  join public.construction_items as construction_item
    on construction_item.id = construction_subitem.item_id
  where construction_subitem.id = new.construction_subitem_id;

  if not found or parent_company_id is distinct from new.company_id then
    raise exception 'Sash catalog entry must belong to the same company as its construction subitem.'
      using errcode = '23514';
  end if;

  if parent_item_kind is distinct from 'sash' then
    raise exception 'Sash catalog entries require a construction item with item_kind = sash.'
      using errcode = '23514';
  end if;

  if new.window_type_option_id is null then
    return new;
  end if;

  select option_value.company_id,
         option_value.option_kind,
         option_value.semantic_value,
         option_value.archived_at
  into option_company_id,
       option_kind_value,
       option_semantic_value,
       option_archived_at
  from public.sash_option_values as option_value
  where option_value.id = new.window_type_option_id;

  if not found
    or option_company_id is distinct from new.company_id
    or option_kind_value is distinct from 'window_type'
    or option_semantic_value is distinct from new.window_type
    or option_archived_at is not null
  then
    raise exception 'Window type option must be an active same-company label for the selected single/double semantic.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_sash_catalog_entry_scope on public.sash_catalog_entries;
create trigger validate_sash_catalog_entry_scope
before insert or update of company_id, construction_subitem_id, window_type, window_type_option_id
on public.sash_catalog_entries
for each row execute function public.formate_validate_sash_catalog_entry_scope();

create or replace function public.formate_validate_sash_condition_entry_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  condition_company_id uuid;
  condition_archived_at timestamptz;
  subitem_company_id uuid;
  parent_item_kind text;
  catalog_company_id uuid;
  catalog_subitem_id uuid;
  catalog_archived_at timestamptz;
begin
  select sash_condition.company_id, sash_condition.archived_at
  into condition_company_id, condition_archived_at
  from public.sash_conditions as sash_condition
  where sash_condition.id = new.sash_condition_id;

  if not found
    or condition_company_id is distinct from new.company_id
    or condition_archived_at is not null
  then
    raise exception 'Sash condition mapping requires an active condition in the same company.'
      using errcode = '23514';
  end if;

  select construction_item.company_id, construction_item.item_kind
  into subitem_company_id, parent_item_kind
  from public.construction_subitems as construction_subitem
  join public.construction_items as construction_item
    on construction_item.id = construction_subitem.item_id
  where construction_subitem.id = new.construction_subitem_id;

  if not found
    or subitem_company_id is distinct from new.company_id
    or parent_item_kind is distinct from 'sash'
  then
    raise exception 'Sash condition mapping requires a sash subitem in the same company.'
      using errcode = '23514';
  end if;

  select catalog_entry.company_id,
         catalog_entry.construction_subitem_id,
         catalog_entry.archived_at
  into catalog_company_id,
       catalog_subitem_id,
       catalog_archived_at
  from public.sash_catalog_entries as catalog_entry
  where catalog_entry.id = new.sash_catalog_entry_id;

  if not found
    or catalog_company_id is distinct from new.company_id
    or catalog_subitem_id is distinct from new.construction_subitem_id
    or catalog_archived_at is not null
  then
    raise exception 'Sash condition mapping requires an active catalog entry in the same subitem scope.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_sash_condition_entry_scope on public.sash_condition_entries;
create trigger validate_sash_condition_entry_scope
before insert or update of company_id, sash_condition_id, construction_subitem_id, sash_catalog_entry_id
on public.sash_condition_entries
for each row execute function public.formate_validate_sash_condition_entry_scope();

drop trigger if exists set_sash_conditions_updated_at on public.sash_conditions;
create trigger set_sash_conditions_updated_at
before update on public.sash_conditions
for each row execute function public.set_updated_at();

drop trigger if exists set_sash_condition_entries_updated_at on public.sash_condition_entries;
create trigger set_sash_condition_entries_updated_at
before update on public.sash_condition_entries
for each row execute function public.set_updated_at();

drop trigger if exists set_sash_option_values_updated_at on public.sash_option_values;
create trigger set_sash_option_values_updated_at
before update on public.sash_option_values
for each row execute function public.set_updated_at();

create or replace function public.formate_seed_sash_v2_defaults(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.sash_conditions (company_id, name, sort_order)
  values (p_company_id, U&'\AE30\BCF8', 0)
  on conflict (company_id, name) where archived_at is null do nothing;

  insert into public.sash_option_values (
    company_id,
    option_kind,
    label,
    semantic_value,
    sort_order
  )
  values
    (p_company_id, 'screen', U&'\C54C\B8E8\BBF8\B284', null, 0),
    (p_company_id, 'screen', U&'\C2A4\D150', null, 1),
    (p_company_id, 'screen', U&'\BBF8\C138 \BC29\CDA9\B9DD', null, 2),
    (p_company_id, 'glass_type', U&'\C77C\BC18', null, 0),
    (p_company_id, 'glass_type', U&'\B85C\C774', null, 1),
    (p_company_id, 'gas', U&'\C5C6\C74C', null, 0),
    (p_company_id, 'gas', U&'\C544\B974\ACE4', null, 1),
    (p_company_id, 'glass_thickness', '5mm', null, 0),
    (p_company_id, 'glass_thickness', '12mm', null, 1),
    (p_company_id, 'glass_thickness', '16mm', null, 2),
    (p_company_id, 'glass_thickness', '22mm', null, 3),
    (p_company_id, 'glass_thickness', '24mm', null, 4),
    (p_company_id, 'glass_thickness', '26mm', null, 5),
    (p_company_id, 'handle_type', U&'\B808\BC84\D615', null, 0),
    (p_company_id, 'handle_type', U&'\B9E4\C785\D615', null, 1),
    (p_company_id, 'handle_type', U&'\C5C6\C74C(\C77C\BC18)', null, 2),
    (p_company_id, 'window_count', U&'2\CABD', null, 0),
    (p_company_id, 'window_count', U&'3\CABD', null, 1),
    (p_company_id, 'window_count', U&'4\CABD', null, 2),
    (p_company_id, 'window_type', U&'\B2E8\CC3D', 'single', 0),
    (p_company_id, 'window_type', U&'2\C911\CC3D', 'double', 1)
  on conflict (company_id, option_kind, label) where archived_at is null do nothing;
end;
$$;

revoke all on function public.formate_seed_sash_v2_defaults(uuid) from public;

do $$
begin
  perform public.formate_seed_sash_v2_defaults(company.id)
  from public.companies as company;
end;
$$;

create or replace function public.formate_seed_company_sash_v2_defaults()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.formate_seed_sash_v2_defaults(new.id);
  return new;
end;
$$;

revoke all on function public.formate_seed_company_sash_v2_defaults() from public;

drop trigger if exists seed_company_sash_v2_defaults on public.companies;
create trigger seed_company_sash_v2_defaults
after insert on public.companies
for each row execute function public.formate_seed_company_sash_v2_defaults();

revoke all on table public.sash_conditions from anon;
revoke all on table public.sash_condition_entries from anon;
revoke all on table public.sash_option_values from anon;

grant select, insert, update on table public.sash_conditions to authenticated;
grant select, insert, update on table public.sash_condition_entries to authenticated;
grant select, insert, update on table public.sash_option_values to authenticated;

revoke delete on table public.sash_conditions from authenticated;
revoke delete on table public.sash_condition_entries from authenticated;
revoke delete on table public.sash_option_values from authenticated;

alter table public.sash_conditions enable row level security;
alter table public.sash_condition_entries enable row level security;
alter table public.sash_option_values enable row level security;

drop policy if exists "members can manage own sash conditions" on public.sash_conditions;
create policy "members can manage own sash conditions"
on public.sash_conditions
for all
to authenticated
using (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = sash_conditions.company_id
      and company_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = sash_conditions.company_id
      and company_member.user_id = auth.uid()
  )
);

drop policy if exists "members can manage own sash condition entries" on public.sash_condition_entries;
create policy "members can manage own sash condition entries"
on public.sash_condition_entries
for all
to authenticated
using (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = sash_condition_entries.company_id
      and company_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = sash_condition_entries.company_id
      and company_member.user_id = auth.uid()
  )
);

drop policy if exists "members can manage own sash option values" on public.sash_option_values;
create policy "members can manage own sash option values"
on public.sash_option_values
for all
to authenticated
using (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = sash_option_values.company_id
      and company_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = sash_option_values.company_id
      and company_member.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';

commit;
