-- FORMATE sash catalog foundation.
-- Review and run manually in the Supabase SQL Editor after supabase/schema.sql.
-- This migration is additive: it does not delete catalog, template, or estimate data.

begin;

set local client_encoding = 'UTF8';

-- Stable behavior metadata. Existing catalog rows remain standard unless they are
-- one of the two legacy sash display names classified below.
alter table public.construction_items
  add column if not exists item_kind text;

update public.construction_items
set item_kind = 'standard'
where item_kind is null;

alter table public.construction_items
  alter column item_kind set default 'standard';

alter table public.construction_items
  alter column item_kind set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.construction_items'::regclass
      and conname = 'construction_items_item_kind_check'
  ) then
    alter table public.construction_items
      add constraint construction_items_item_kind_check
      check (item_kind in ('standard', 'sash'));
  end if;
end
$$;

comment on column public.construction_items.item_kind is
  'Stable runtime behavior kind. Use sash instead of comparing display names.';

-- One-time legacy data classification only. Runtime behavior must use item_kind.
update public.construction_items
set item_kind = 'sash'
where item_kind = 'standard'
  and name in (U&'\C0F7\C2DC', U&'\CC3D\D638/\C0F7\C2DC');

-- Preserve the existing category ID and children when no same-company "sash" row
-- already exists. Companies with both names are intentionally left untouched.
update public.construction_items as legacy_item
set name = U&'\C0F7\C2DC'
where legacy_item.name = U&'\CC3D\D638/\C0F7\C2DC'
  and not exists (
    select 1
    from public.construction_items as current_item
    where current_item.company_id = legacy_item.company_id
      and current_item.name = U&'\C0F7\C2DC'
  );

create table if not exists public.sash_catalog_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  construction_subitem_id uuid not null references public.construction_subitems(id) on delete restrict,
  brand text not null,
  product_type text not null,
  width_mm integer not null,
  height_mm integer not null,
  area_sqm numeric(12, 4) generated always as (
    round((width_mm::numeric / 1000) * (height_mm::numeric / 1000), 4)
  ) stored,
  unit_price numeric not null default 0,
  cost_price numeric not null default 0,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sash_catalog_entries_brand_not_blank_check check (length(btrim(brand)) > 0),
  constraint sash_catalog_entries_product_type_not_blank_check check (length(btrim(product_type)) > 0),
  constraint sash_catalog_entries_width_mm_check check (width_mm > 0),
  constraint sash_catalog_entries_height_mm_check check (height_mm > 0),
  constraint sash_catalog_entries_unit_price_check check (unit_price >= 0),
  constraint sash_catalog_entries_cost_price_check check (cost_price >= 0)
);

comment on table public.sash_catalog_entries is
  'Company-scoped sash specification catalog. Archived rows are retained for estimate history.';

comment on column public.sash_catalog_entries.area_sqm is
  'Stored generated area from width_mm and height_mm; do not write independently.';

create index if not exists sash_catalog_entries_company_subitem_order_idx
  on public.sash_catalog_entries (company_id, construction_subitem_id, sort_order, created_at)
  where archived_at is null;

create index if not exists sash_catalog_entries_subitem_id_idx
  on public.sash_catalog_entries (construction_subitem_id);

create or replace function public.formate_validate_sash_catalog_entry_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  parent_company_id uuid;
  parent_item_kind text;
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

  if parent_item_kind <> 'sash' then
    raise exception 'Sash catalog entries require a construction item with item_kind = sash.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_sash_catalog_entry_scope on public.sash_catalog_entries;
create trigger validate_sash_catalog_entry_scope
before insert or update on public.sash_catalog_entries
for each row execute function public.formate_validate_sash_catalog_entry_scope();

drop trigger if exists set_sash_catalog_entries_updated_at on public.sash_catalog_entries;
create trigger set_sash_catalog_entries_updated_at
before update on public.sash_catalog_entries
for each row execute function public.set_updated_at();

revoke all on table public.sash_catalog_entries from anon;
grant select, insert, update on table public.sash_catalog_entries to authenticated;
revoke delete on table public.sash_catalog_entries from authenticated;

alter table public.sash_catalog_entries enable row level security;

drop policy if exists "members can manage own sash catalog entries" on public.sash_catalog_entries;
create policy "members can manage own sash catalog entries"
on public.sash_catalog_entries
for all
to authenticated
using (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = sash_catalog_entries.company_id
      and company_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = sash_catalog_entries.company_id
      and company_member.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';

commit;

-- Audit only: rows returned here have both legacy and new sash categories and
-- were intentionally not merged or deleted by this migration.
select
  company_id,
  count(*) filter (where name = U&'\CC3D\D638/\C0F7\C2DC') as legacy_window_sash_count,
  count(*) filter (where name = U&'\C0F7\C2DC') as sash_count
from public.construction_items
where name in (U&'\CC3D\D638/\C0F7\C2DC', U&'\C0F7\C2DC')
group by company_id
having count(*) filter (where name = U&'\CC3D\D638/\C0F7\C2DC') > 0
   and count(*) filter (where name = U&'\C0F7\C2DC') > 0;
