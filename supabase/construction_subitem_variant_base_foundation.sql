-- FORMATE stable base-subitem relation for construction subitem variant groups.
-- Review and run manually in the Supabase SQL Editor after the variant foundation
-- and completed explicit thickness backfill. This migration is additive.

begin;

set local client_encoding = 'UTF8';

alter table public.construction_subitem_variant_groups
  add column if not exists base_subitem_id uuid;

create unique index if not exists construction_subitems_id_item_id_uidx
  on public.construction_subitems (id, item_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.construction_subitem_variant_groups'::regclass
      and conname = 'construction_subitem_variant_groups_base_subitem_item_fkey'
  ) then
    alter table public.construction_subitem_variant_groups
      add constraint construction_subitem_variant_groups_base_subitem_item_fkey
      foreign key (base_subitem_id, construction_item_id)
      references public.construction_subitems (id, item_id)
      on delete restrict;
  end if;
end
$$;

comment on column public.construction_subitem_variant_groups.base_subitem_id is
  'Optional standard subitem represented by this variant group. It stays separate from the group variants.';

create or replace function public.formate_validate_construction_subitem_variant_group_base()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  base_item_id uuid;
  base_variant_group_id uuid;
  base_variant_value numeric;
  base_variant_unit text;
begin
  if new.base_subitem_id is null then
    return new;
  end if;

  select
    subitem.item_id,
    subitem.variant_group_id,
    subitem.variant_value,
    subitem.variant_unit
  into
    base_item_id,
    base_variant_group_id,
    base_variant_value,
    base_variant_unit
  from public.construction_subitems as subitem
  where subitem.id = new.base_subitem_id;

  if not found or base_item_id is distinct from new.construction_item_id then
    raise exception 'Variant group base subitem must belong to the same construction item.'
      using errcode = '23514';
  end if;

  if base_variant_group_id is not null
    or base_variant_value is not null
    or base_variant_unit is not null then
    raise exception 'Variant group base subitem must remain a standard subitem with null variant metadata.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_construction_subitem_variant_group_base
  on public.construction_subitem_variant_groups;
create trigger validate_construction_subitem_variant_group_base
before insert or update of base_subitem_id, construction_item_id
on public.construction_subitem_variant_groups
for each row execute function public.formate_validate_construction_subitem_variant_group_base();

create or replace function public.formate_prevent_variant_metadata_on_group_base_subitem()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.variant_group_id is null
    and new.variant_value is null
    and new.variant_unit is null then
    return new;
  end if;

  if exists (
    select 1
    from public.construction_subitem_variant_groups as variant_group
    where variant_group.base_subitem_id = new.id
  ) then
    raise exception 'A variant group base subitem cannot receive variant metadata.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_variant_metadata_on_group_base_subitem
  on public.construction_subitems;
create trigger prevent_variant_metadata_on_group_base_subitem
before update of variant_group_id, variant_value, variant_unit
on public.construction_subitems
for each row execute function public.formate_prevent_variant_metadata_on_group_base_subitem();

create temporary table formate_variant_group_base_seed (
  group_id uuid primary key,
  company_id uuid not null,
  base_subitem_id uuid not null
) on commit drop;

insert into formate_variant_group_base_seed (
  group_id,
  company_id,
  base_subitem_id
)
values
  ('f41d14e7-c091-4bab-9b9c-50b95d6245af', 'b3e072d8-4656-47a5-b8e6-3ceb093c4113', '215eea80-2769-478e-b8b9-e0beac943969'),
  ('e6373d17-abf0-4a24-b349-f8d2517b3565', 'b3e072d8-4656-47a5-b8e6-3ceb093c4113', '4e7a077c-48f4-4d85-8da4-794de69b74d7'),
  ('b9ca4776-74f2-4e5f-99af-8462aac6c237', 'b3e072d8-4656-47a5-b8e6-3ceb093c4113', 'ee09a802-fb12-4bd8-8c10-3f26345b6f96');

do $$
begin
  if exists (
    select 1
    from formate_variant_group_base_seed as seed
    left join public.construction_subitem_variant_groups as variant_group
      on variant_group.id = seed.group_id
    left join public.construction_items as group_item
      on group_item.id = variant_group.construction_item_id
    left join public.construction_subitems as base_subitem
      on base_subitem.id = seed.base_subitem_id
    left join public.construction_items as base_item
      on base_item.id = base_subitem.item_id
    where group_item.company_id is distinct from seed.company_id
      or base_item.company_id is distinct from seed.company_id
      or base_subitem.item_id is distinct from variant_group.construction_item_id
      or base_subitem.variant_group_id is not null
      or base_subitem.variant_value is not null
      or base_subitem.variant_unit is not null
      or (
        variant_group.base_subitem_id is not null
        and variant_group.base_subitem_id is distinct from seed.base_subitem_id
      )
  ) then
    raise exception 'A requested variant group base mapping is missing or incompatible.';
  end if;
end
$$;

update public.construction_subitem_variant_groups as variant_group
set base_subitem_id = seed.base_subitem_id
from formate_variant_group_base_seed as seed,
  public.construction_items as item
where variant_group.id = seed.group_id
  and item.id = variant_group.construction_item_id
  and item.company_id = seed.company_id
  and variant_group.base_subitem_id is distinct from seed.base_subitem_id;

select
  item.company_id,
  variant_group.id as variant_group_id,
  variant_group.base_subitem_id
from formate_variant_group_base_seed as seed
join public.construction_subitem_variant_groups as variant_group
  on variant_group.id = seed.group_id
join public.construction_items as item
  on item.id = variant_group.construction_item_id
order by variant_group.sort_order;

notify pgrst, 'reload schema';

commit;
