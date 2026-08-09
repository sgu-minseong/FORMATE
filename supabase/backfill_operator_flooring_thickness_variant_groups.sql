-- One-time, company-scoped flooring thickness variant backfill for 운영자.
-- Source rows were inspected in Supabase on 2026-08-09.
-- This script targets only explicit UUIDs and never parses or changes names.

begin;

set local client_encoding = 'UTF8';

create temporary table formate_operator_variant_group_seed (
  group_id uuid primary key,
  company_id uuid not null,
  construction_item_id uuid not null,
  display_name text not null,
  base_subitem_id uuid,
  sort_order integer not null
) on commit drop;

insert into formate_operator_variant_group_seed (
  group_id,
  company_id,
  construction_item_id,
  display_name,
  base_subitem_id,
  sort_order
)
values
  ('8fec3cdc-b483-4ddb-be81-8e7b1aceb763', 'd2f1dd95-2226-4b7a-9068-921c002f90f9', '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2', '장판', 'c8de162d-5ceb-49ed-b11e-92297ec64065', 1),
  ('91cee951-baad-48b0-9ce3-02446b25e2de', 'd2f1dd95-2226-4b7a-9068-921c002f90f9', '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2', '데코타일', '8551fcb9-f301-423e-8b41-6e391f94f3e9', 2),
  ('bf01288f-3f06-40c6-a07f-37f4c58505bb', 'd2f1dd95-2226-4b7a-9068-921c002f90f9', '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2', 'KCC장판', '03106ba0-31ab-4484-b59a-fbd1db86876b', 3),
  ('e73e84ae-750a-4d31-9093-dd4f1cb332a1', 'd2f1dd95-2226-4b7a-9068-921c002f90f9', '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2', 'LG장판', null, 4),
  ('b6058769-12a0-4704-bea0-53bf5b8230c9', 'd2f1dd95-2226-4b7a-9068-921c002f90f9', '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2', '강마루', 'eab4ab2c-b44e-46bf-a1c1-f00ef410eed4', 5),
  ('3da40ab6-a8bd-4813-acfd-d3da08aee9b8', 'd2f1dd95-2226-4b7a-9068-921c002f90f9', '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2', '비닐장판', null, 6);

create temporary table formate_operator_variant_value_seed (
  construction_subitem_id uuid primary key,
  group_id uuid not null references formate_operator_variant_group_seed(group_id),
  variant_value numeric(12, 4) not null,
  variant_unit text not null
) on commit drop;

insert into formate_operator_variant_value_seed (
  construction_subitem_id,
  group_id,
  variant_value,
  variant_unit
)
values
  -- 장판
  ('2bb31439-1375-44b4-bf9c-ae2d425c6e40', '8fec3cdc-b483-4ddb-be81-8e7b1aceb763', 1.8, 'T'),
  ('97d65842-2365-44d1-b41f-7a125a00e6f5', '8fec3cdc-b483-4ddb-be81-8e7b1aceb763', 2.2, 'T'),
  ('2817538f-2892-44d4-8fea-f7c6c055aee5', '8fec3cdc-b483-4ddb-be81-8e7b1aceb763', 2.7, 'T'),
  -- 데코타일
  ('f343f38f-660f-4ba9-8639-fcc78d8ba216', '91cee951-baad-48b0-9ce3-02446b25e2de', 2.2, 'T'),
  ('d8a86e64-3589-43e7-9cb7-5148d22ff093', '91cee951-baad-48b0-9ce3-02446b25e2de', 2.7, 'T'),
  ('1a4d4b59-a4fb-4a0f-9b75-6cdf548ea512', '91cee951-baad-48b0-9ce3-02446b25e2de', 3.5, 'T'),
  -- KCC장판
  ('f3dfcc51-d57d-4d44-afb8-5b464c4a8b71', 'bf01288f-3f06-40c6-a07f-37f4c58505bb', 1.8, 'T'),
  ('82932863-f963-44e4-baa7-00cbbda28976', 'bf01288f-3f06-40c6-a07f-37f4c58505bb', 2.2, 'T'),
  ('1aecdfe4-c170-4244-a97e-623384b6efe9', 'bf01288f-3f06-40c6-a07f-37f4c58505bb', 2.7, 'T'),
  -- LG장판
  ('8cc2a25a-401e-46df-852c-41d960f315ea', 'e73e84ae-750a-4d31-9093-dd4f1cb332a1', 1.8, 'T'),
  ('f01efea6-7cca-423e-a930-cacd02df8f7d', 'e73e84ae-750a-4d31-9093-dd4f1cb332a1', 2.2, 'T'),
  ('ac378366-33ce-48ed-969a-8cb66dcab94e', 'e73e84ae-750a-4d31-9093-dd4f1cb332a1', 2.7, 'T'),
  -- 강마루
  ('6aeef39d-81dc-482b-9e1f-9abae85e7720', 'b6058769-12a0-4704-bea0-53bf5b8230c9', 2.2, 'T'),
  -- 비닐장판
  ('7acf5df0-cd57-40dc-90f7-e367450b624a', '3da40ab6-a8bd-4813-acfd-d3da08aee9b8', 1.8, 'T'),
  ('425421d5-3012-41e3-8c48-935ac6a14617', '3da40ab6-a8bd-4813-acfd-d3da08aee9b8', 2.2, 'T'),
  ('7ea7bc0c-4308-452f-9490-0f222c276ff2', '3da40ab6-a8bd-4813-acfd-d3da08aee9b8', 2.7, 'T');

do $$
begin
  if (select count(*) from formate_operator_variant_group_seed) <> 6
    or (select count(*) from formate_operator_variant_value_seed) <> 16 then
    raise exception 'Unexpected seed cardinality.';
  end if;

  if exists (
    select 1
    from formate_operator_variant_group_seed as seed
    left join public.construction_items as item
      on item.id = seed.construction_item_id
    where item.company_id is distinct from seed.company_id
  ) then
    raise exception 'The flooring item does not belong to the target company.';
  end if;

  if exists (
    select 1
    from formate_operator_variant_value_seed as seed
    join formate_operator_variant_group_seed as group_seed
      on group_seed.group_id = seed.group_id
    left join public.construction_subitems as subitem
      on subitem.id = seed.construction_subitem_id
    left join public.construction_items as item
      on item.id = subitem.item_id
    where subitem.item_id is distinct from group_seed.construction_item_id
      or item.company_id is distinct from group_seed.company_id
      or not (
        (
          subitem.variant_group_id is null
          and subitem.variant_value is null
          and subitem.variant_unit is null
        )
        or (
          subitem.variant_group_id = seed.group_id
          and subitem.variant_value = seed.variant_value
          and subitem.variant_unit = seed.variant_unit
        )
      )
  ) then
    raise exception 'A target row is missing, out of scope, or already has incompatible metadata.';
  end if;

  if exists (
    select 1
    from formate_operator_variant_group_seed as seed
    left join public.construction_subitems as base_subitem
      on base_subitem.id = seed.base_subitem_id
    left join public.construction_items as item
      on item.id = base_subitem.item_id
    where seed.base_subitem_id is not null
      and (
        base_subitem.item_id is distinct from seed.construction_item_id
        or item.company_id is distinct from seed.company_id
        or base_subitem.variant_group_id is not null
        or base_subitem.variant_value is not null
        or base_subitem.variant_unit is not null
      )
  ) then
    raise exception 'A base row is missing, out of scope, or has variant metadata.';
  end if;

  if exists (
    select 1
    from formate_operator_variant_group_seed as seed
    join public.construction_subitem_variant_groups as variant_group
      on variant_group.id = seed.group_id
    where variant_group.construction_item_id is distinct from seed.construction_item_id
      or variant_group.display_name is distinct from seed.display_name
      or variant_group.variant_kind is distinct from 'thickness'
      or variant_group.base_subitem_id is distinct from seed.base_subitem_id
  ) then
    raise exception 'A stable group ID already has incompatible metadata.';
  end if;
end
$$;

insert into public.construction_subitem_variant_groups (
  id,
  construction_item_id,
  display_name,
  variant_kind,
  base_subitem_id,
  sort_order
)
select
  seed.group_id,
  seed.construction_item_id,
  seed.display_name,
  'thickness',
  seed.base_subitem_id,
  seed.sort_order
from formate_operator_variant_group_seed as seed
on conflict (id) do nothing;

update public.construction_subitems as subitem
set
  variant_group_id = seed.group_id,
  variant_value = seed.variant_value,
  variant_unit = seed.variant_unit
from formate_operator_variant_value_seed as seed
where subitem.id = seed.construction_subitem_id
  and subitem.variant_group_id is null
  and subitem.variant_value is null
  and subitem.variant_unit is null;

do $$
begin
  if exists (
    select 1
    from formate_operator_variant_value_seed as seed
    join formate_operator_variant_group_seed as group_seed
      on group_seed.group_id = seed.group_id
    left join public.construction_subitems as subitem
      on subitem.id = seed.construction_subitem_id
    where subitem.item_id is distinct from group_seed.construction_item_id
      or subitem.variant_group_id is distinct from seed.group_id
      or subitem.variant_value is distinct from seed.variant_value
      or subitem.variant_unit is distinct from seed.variant_unit
  ) then
    raise exception 'Variant metadata verification failed.';
  end if;

  if exists (
    select 1
    from formate_operator_variant_group_seed as seed
    join public.construction_subitem_variant_groups as variant_group
      on variant_group.id = seed.group_id
    left join public.construction_subitems as base_subitem
      on base_subitem.id = variant_group.base_subitem_id
    where variant_group.construction_item_id is distinct from seed.construction_item_id
      or variant_group.display_name is distinct from seed.display_name
      or variant_group.variant_kind is distinct from 'thickness'
      or variant_group.base_subitem_id is distinct from seed.base_subitem_id
      or (
        seed.base_subitem_id is not null
        and (
          base_subitem.variant_group_id is not null
          or base_subitem.variant_value is not null
          or base_subitem.variant_unit is not null
        )
      )
  ) then
    raise exception 'Variant group or base metadata verification failed.';
  end if;
end
$$;

select
  variant_group.id as variant_group_id,
  variant_group.display_name,
  variant_group.base_subitem_id,
  count(subitem.id)::integer as variant_count,
  array_agg(
    concat(trim(trailing '.0' from subitem.variant_value::text), subitem.variant_unit)
    order by subitem.variant_value, subitem.sort_order
  ) as variants
from formate_operator_variant_group_seed as seed
join public.construction_subitem_variant_groups as variant_group
  on variant_group.id = seed.group_id
join public.construction_subitems as subitem
  on subitem.variant_group_id = variant_group.id
group by
  variant_group.sort_order,
  variant_group.id,
  variant_group.display_name,
  variant_group.base_subitem_id
order by variant_group.sort_order;

commit;
