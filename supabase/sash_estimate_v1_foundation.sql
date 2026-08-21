-- FORMATE sash estimate v1 foundation.
-- Apply manually after sash_catalog_foundation.sql.
-- This migration only adds nullable/defaulted metadata, generated values, and guards.
-- It does not classify existing rows, reinterpret prices, or modify estimate snapshots.

begin;

set local client_encoding = 'UTF8';

-- Stable location behavior for balcony-only reusable special items.
-- Existing subitems remain null (unclassified); never infer this from their names.
alter table public.construction_subitems
  add column if not exists sash_location_kind text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.construction_subitems'::regclass
      and conname = 'construction_subitems_sash_location_kind_check'
  ) then
    alter table public.construction_subitems
      add constraint construction_subitems_sash_location_kind_check
      check (sash_location_kind is null or sash_location_kind in ('standard', 'balcony'));
  end if;
end
$$;

comment on column public.construction_subitems.sash_location_kind is
  'Stable sash location behavior. Only balcony rows may select sash special items; null means unclassified.';

create or replace function public.formate_validate_sash_location_kind()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  parent_item_kind text;
begin
  if new.sash_location_kind is null then
    return new;
  end if;

  select construction_item.item_kind
  into parent_item_kind
  from public.construction_items as construction_item
  where construction_item.id = new.item_id;

  if not found or parent_item_kind <> 'sash' then
    raise exception 'Sash location metadata requires a construction item with item_kind = sash.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_sash_location_kind on public.construction_subitems;
create trigger validate_sash_location_kind
before insert or update of sash_location_kind on public.construction_subitems
for each row execute function public.formate_validate_sash_location_kind();

-- Legacy rows deliberately keep fixed/unspecified defaults. New v1 UI writes the
-- explicit area, window, and measurement values after this migration is deployed.
alter table public.sash_catalog_entries
  add column if not exists frame_spec text,
  add column if not exists pair_spec text,
  add column if not exists glass_spec text,
  add column if not exists gas_spec text,
  add column if not exists screen_spec text,
  add column if not exists window_type text not null default 'unspecified',
  add column if not exists measurement_kind text not null default 'unspecified',
  add column if not exists pricing_basis text not null default 'fixed';

alter table public.sash_catalog_entries
  add column if not exists billable_area_sqm numeric(12, 4) generated always as (
    round(
      (width_mm::numeric / 1000)
      * (height_mm::numeric / 1000)
      * (case when window_type = 'double' then 2 else 1 end),
      4
    )
  ) stored,
  add column if not exists calculated_amount numeric generated always as (
    case
      when pricing_basis = 'area' then
        round(
          (width_mm::numeric / 1000)
          * (height_mm::numeric / 1000)
          * (case when window_type = 'double' then 2 else 1 end),
          4
        ) * unit_price
      else unit_price
    end
  ) stored;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sash_catalog_entries'::regclass
      and conname = 'sash_catalog_entries_window_type_check'
  ) then
    alter table public.sash_catalog_entries
      add constraint sash_catalog_entries_window_type_check
      check (window_type in ('unspecified', 'single', 'double'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sash_catalog_entries'::regclass
      and conname = 'sash_catalog_entries_measurement_kind_check'
  ) then
    alter table public.sash_catalog_entries
      add constraint sash_catalog_entries_measurement_kind_check
      check (measurement_kind in ('unspecified', 'estimate', 'measured'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sash_catalog_entries'::regclass
      and conname = 'sash_catalog_entries_pricing_basis_check'
  ) then
    alter table public.sash_catalog_entries
      add constraint sash_catalog_entries_pricing_basis_check
      check (pricing_basis in ('fixed', 'area'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sash_catalog_entries'::regclass
      and conname = 'sash_catalog_entries_area_pricing_spec_complete_check'
  ) then
    alter table public.sash_catalog_entries
      add constraint sash_catalog_entries_area_pricing_spec_complete_check check (
        pricing_basis <> 'area'
        or (
          length(btrim(coalesce(frame_spec, ''))) > 0
          and length(btrim(coalesce(pair_spec, ''))) > 0
          and length(btrim(coalesce(glass_spec, ''))) > 0
          and length(btrim(coalesce(gas_spec, ''))) > 0
          and length(btrim(coalesce(screen_spec, ''))) > 0
          and window_type in ('single', 'double')
          and measurement_kind in ('estimate', 'measured')
        )
      );
  end if;
end
$$;

comment on column public.sash_catalog_entries.frame_spec is
  'Canonical v1 frame specification. product_type is retained as a legacy display field.';
comment on column public.sash_catalog_entries.pair_spec is
  'User-entered pair specification; no inferred formula.';
comment on column public.sash_catalog_entries.glass_spec is
  'User-entered glass specification; no inferred formula.';
comment on column public.sash_catalog_entries.gas_spec is
  'User-entered gas specification; no inferred formula.';
comment on column public.sash_catalog_entries.screen_spec is
  'User-entered screen specification; no inferred formula.';
comment on column public.sash_catalog_entries.window_type is
  'Window multiplier metadata: single = 1, double = 2, unspecified = legacy.';
comment on column public.sash_catalog_entries.measurement_kind is
  'Dimension provenance: unspecified legacy value, estimate, or measured.';
comment on column public.sash_catalog_entries.pricing_basis is
  'fixed preserves legacy behavior; area enables user unit_price x billable hebe.';
comment on column public.sash_catalog_entries.billable_area_sqm is
  'Billable hebe: width(m) x height(m), doubled only for window_type = double.';
comment on column public.sash_catalog_entries.calculated_amount is
  'Area pricing uses billable hebe x user-entered unit_price; fixed pricing returns unit_price.';

-- Reusable balcony-only add-on products. They stay separate from sash specs
-- because they have direct amounts and no manufacturer/window pricing contract.
create table if not exists public.sash_special_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  description text not null,
  width_mm integer not null,
  height_mm integer not null,
  area_sqm numeric(12, 4) generated always as (
    round((width_mm::numeric / 1000) * (height_mm::numeric / 1000), 4)
  ) stored,
  amount numeric not null default 0,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sash_special_items_description_not_blank_check
    check (length(btrim(description)) > 0),
  constraint sash_special_items_width_mm_check check (width_mm > 0),
  constraint sash_special_items_height_mm_check check (height_mm > 0),
  constraint sash_special_items_amount_check check (amount >= 0)
);

comment on table public.sash_special_items is
  'Company-wide reusable balcony sash add-on products. Estimate selections preserve an immutable JSON snapshot.';
comment on column public.sash_special_items.area_sqm is
  'Generated display area from default dimensions; amount remains a direct user-entered value.';

create index if not exists sash_special_items_company_order_idx
  on public.sash_special_items (company_id, sort_order, created_at)
  where archived_at is null;

drop trigger if exists set_sash_special_items_updated_at on public.sash_special_items;
create trigger set_sash_special_items_updated_at
before update on public.sash_special_items
for each row execute function public.set_updated_at();

revoke all on table public.sash_special_items from anon;
grant select, insert, update on table public.sash_special_items to authenticated;
revoke delete on table public.sash_special_items from authenticated;

alter table public.sash_special_items enable row level security;

drop policy if exists "members can manage own sash special items" on public.sash_special_items;
create policy "members can manage own sash special items"
on public.sash_special_items
for all
to authenticated
using (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = sash_special_items.company_id
      and company_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = sash_special_items.company_id
      and company_member.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';

commit;
