-- FORMATE fail-closed migration template for audited legacy standalone rows.
--
-- DO NOT run this file as shipped: it intentionally aborts. First run
-- canonical_variant_legacy_standalone_audit.sql against live, review each exact
-- UUID/reference graph, paste the exported exact row JSON into the seed tables,
-- and set all three expected counts. Names/suffixes are never parsed here.
--
-- Allowed mutations:
--   1. Attach an exact existing construction_subitem UUID to an explicitly
--      approved numeric canonical group/value/unit.
--   2. Non-destructively archive an explicitly approved, unreferenced, empty
--      legacy standard row.
-- No reference, price, template, photo, estimate, history, or snapshot is
-- rewritten. No row is deleted.

begin;

set transaction isolation level serializable;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

select pg_advisory_xact_lock(
  hashtextextended('formate:canonical-legacy-standalone-targeted-migration', 0)
);

create temporary table formate_legacy_group_seed (
  variant_group_id uuid primary key,
  company_id uuid not null,
  construction_item_id uuid not null,
  display_name text not null,
  variant_kind text not null,
  variant_value_type text not null check (variant_value_type in ('number', 'text')),
  base_subitem_id uuid,
  sort_order integer not null,
  must_exist boolean not null,
  expected_existing_row jsonb
) on commit drop;

create temporary table formate_legacy_attach_seed (
  construction_subitem_id uuid primary key,
  company_id uuid not null,
  construction_item_id uuid not null,
  variant_group_id uuid not null references formate_legacy_group_seed(variant_group_id),
  variant_value numeric(12, 4) not null,
  variant_unit text not null,
  expected_subitem_row jsonb not null
) on commit drop;

create temporary table formate_legacy_archive_seed (
  construction_subitem_id uuid primary key,
  company_id uuid not null,
  construction_item_id uuid not null,
  expected_subitem_row jsonb not null
) on commit drop;

create temporary table formate_legacy_expected_counts (
  group_count integer,
  attach_count integer,
  archive_count integer
) on commit drop;

-- Paste only audited exact rows above this marker. Set zero explicitly when no
-- archive rows are approved. Null values below make the unedited file abort.
insert into formate_legacy_expected_counts (
  group_count,
  attach_count,
  archive_count
) values (null, null, null);

do $$
declare
  expected_group_count integer;
  expected_attach_count integer;
  expected_archive_count integer;
begin
  if (select count(*) from formate_legacy_expected_counts) <> 1 then
    raise exception 'Exactly one expected-count row is required.';
  end if;

  select group_count, attach_count, archive_count
  into expected_group_count, expected_attach_count, expected_archive_count
  from formate_legacy_expected_counts;

  if expected_group_count is null
    or expected_attach_count is null
    or expected_archive_count is null
    or expected_group_count < 0
    or expected_attach_count < 0
    or expected_archive_count < 0 then
    raise exception 'Live-audited expected counts must be supplied before execution.';
  end if;

  if (select count(*) from formate_legacy_group_seed) <> expected_group_count
    or (select count(*) from formate_legacy_attach_seed) <> expected_attach_count
    or (select count(*) from formate_legacy_archive_seed) <> expected_archive_count then
    raise exception 'Seed cardinality differs from the live-audited expected counts.';
  end if;

  if (expected_attach_count > 0 and expected_group_count = 0)
    or expected_attach_count + expected_archive_count = 0 then
    raise exception 'The targeted migration has no approved work.';
  end if;

  if exists (
    select 1
    from formate_legacy_group_seed as group_seed
    where not exists (
      select 1
      from formate_legacy_attach_seed as attach_seed
      where attach_seed.variant_group_id = group_seed.variant_group_id
    )
  ) then
    raise exception 'Every group seed must be used by at least one attach target.';
  end if;
end
$$;

lock table public.construction_items in share mode;
lock table public.construction_subitem_variant_groups in share row exclusive mode;
lock table public.construction_subitems in share row exclusive mode;
lock table public.admin_condition_template_values in share mode;
lock table public.subitem_pyeong_values in share mode;
lock table public.detail_cost_categories in share mode;
lock table public.photos in share mode;
lock table public.sash_catalog_entries in share mode;
lock table public.estimates in share mode;
lock table public.estimate_versions in share mode;
lock table public.price_conditions in share mode;

do $$
declare
  foreign_key_count integer;
begin
  if to_regclass('public.construction_subitem_variant_groups') is null
    or to_regclass('public.construction_subitems') is null then
    raise exception 'Canonical variant persistence prerequisites are missing.';
  end if;

  select count(*)::integer
  into foreign_key_count
  from pg_constraint
  where contype = 'f'
    and confrelid = 'public.construction_subitems'::regclass;

  if foreign_key_count <> 6
    or exists (
      select 1
      from pg_constraint
      where contype = 'f'
        and confrelid = 'public.construction_subitems'::regclass
        and conname not in (
          'admin_condition_template_values_subitem_id_fkey',
          'construction_subitem_variant_groups_base_subitem_item_fkey',
          'detail_cost_categories_subitem_id_fkey',
          'photos_construction_subitem_fkey',
          'sash_catalog_entries_construction_subitem_id_fkey',
          'subitem_pyeong_values_subitem_id_fkey'
        )
    ) then
    raise exception 'The construction_subitems reference graph changed after audit.';
  end if;

  if exists (
    select 1
    from formate_legacy_attach_seed as attach
    join formate_legacy_archive_seed as archive
      on archive.construction_subitem_id = attach.construction_subitem_id
  ) then
    raise exception 'One UUID cannot be both attached and archived.';
  end if;

  if exists (
    select 1
    from formate_legacy_attach_seed
    group by variant_group_id, variant_value, lower(btrim(variant_unit))
    having count(*) > 1
  ) then
    raise exception 'More than one UUID was assigned to the same canonical identity.';
  end if;

  if exists (
    select 1
    from formate_legacy_group_seed as seed
    left join public.construction_items as item
      on item.id = seed.construction_item_id
    where item.company_id is distinct from seed.company_id
      or length(btrim(seed.display_name)) = 0
      or length(btrim(seed.variant_kind)) = 0
      or seed.variant_value_type <> 'number'
      or (not seed.must_exist and seed.base_subitem_id is not null)
      or (seed.must_exist and seed.expected_existing_row is null)
      or (not seed.must_exist and seed.expected_existing_row is not null)
  ) then
    raise exception 'A group seed is missing exact scope or numeric canonical metadata.';
  end if;

  if exists (
    select 1
    from formate_legacy_group_seed as seed
    left join public.construction_subitem_variant_groups as variant_group
      on variant_group.id = seed.variant_group_id
    where seed.must_exist
      and (
        variant_group.id is null
        or to_jsonb(variant_group) is distinct from seed.expected_existing_row
      )
  ) then
    raise exception 'An existing target group changed after the live audit.';
  end if;

  if exists (
    select 1
    from formate_legacy_group_seed as seed
    join public.construction_subitem_variant_groups as variant_group
      on variant_group.id = seed.variant_group_id
    where not seed.must_exist
      and (
        variant_group.construction_item_id is distinct from seed.construction_item_id
        or variant_group.display_name is distinct from seed.display_name
        or variant_group.variant_kind is distinct from seed.variant_kind
        or variant_group.variant_value_type is distinct from seed.variant_value_type
        or variant_group.base_subitem_id is distinct from seed.base_subitem_id
        or variant_group.sort_order is distinct from seed.sort_order
        or variant_group.archived_at is not null
      )
  ) then
    raise exception 'A proposed new group UUID already belongs to incompatible metadata.';
  end if;

  if exists (
    select 1
    from formate_legacy_attach_seed as seed
    join formate_legacy_group_seed as group_seed
      on group_seed.variant_group_id = seed.variant_group_id
    left join public.construction_subitems as subitem
      on subitem.id = seed.construction_subitem_id
    left join public.construction_items as item
      on item.id = subitem.item_id
    where seed.company_id is distinct from group_seed.company_id
      or seed.construction_item_id is distinct from group_seed.construction_item_id
      or item.company_id is distinct from seed.company_id
      or subitem.item_id is distinct from seed.construction_item_id
      or seed.variant_value <= 0
      or length(btrim(seed.variant_unit)) = 0
      or (
        to_jsonb(subitem) is distinct from seed.expected_subitem_row
        and not (
          subitem.variant_group_id = seed.variant_group_id
          and subitem.variant_value = seed.variant_value
          and subitem.variant_value_text is null
          and lower(btrim(subitem.variant_unit)) = lower(btrim(seed.variant_unit))
          and subitem.archived_at is null
          and (
            to_jsonb(subitem)
              - array['variant_group_id', 'variant_value', 'variant_value_text', 'variant_unit', 'updated_at']
          ) = (
            seed.expected_subitem_row
              - array['variant_group_id', 'variant_value', 'variant_value_text', 'variant_unit', 'updated_at']
          )
        )
      )
      or not (
        (
          subitem.variant_group_id is null
          and subitem.variant_value is null
          and subitem.variant_value_text is null
          and subitem.variant_unit is null
          and subitem.archived_at is null
        )
        or (
          subitem.variant_group_id = seed.variant_group_id
          and subitem.variant_value = seed.variant_value
          and subitem.variant_value_text is null
          and lower(btrim(subitem.variant_unit)) = lower(btrim(seed.variant_unit))
          and subitem.archived_at is null
        )
      )
  ) then
    raise exception 'An attach target is missing, out of scope, changed, or ambiguous.';
  end if;

  if exists (
    select 1
    from formate_legacy_attach_seed as seed
    join public.construction_subitems as existing_variant
      on existing_variant.variant_group_id = seed.variant_group_id
      and existing_variant.variant_value = seed.variant_value
      and existing_variant.variant_value_text is null
      and lower(btrim(existing_variant.variant_unit)) = lower(btrim(seed.variant_unit))
      and existing_variant.archived_at is null
      and existing_variant.id <> seed.construction_subitem_id
  ) then
    raise exception 'An active canonical UUID already owns a requested target identity.';
  end if;

  if exists (
    select 1
    from formate_legacy_attach_seed as seed
    join public.construction_subitem_variant_groups as variant_group
      on variant_group.base_subitem_id = seed.construction_subitem_id
  ) then
    raise exception 'A standard base UUID cannot be converted into a selectable variant.';
  end if;

  if exists (
    select 1
    from formate_legacy_archive_seed as seed
    left join public.construction_subitems as subitem
      on subitem.id = seed.construction_subitem_id
    left join public.construction_items as item
      on item.id = subitem.item_id
    where item.company_id is distinct from seed.company_id
      or subitem.item_id is distinct from seed.construction_item_id
      or (
        to_jsonb(subitem) is distinct from seed.expected_subitem_row
        and not (
          subitem.archived_at is not null
          and (
            to_jsonb(subitem) - array['archived_at', 'updated_at']
          ) = (
            seed.expected_subitem_row - array['archived_at', 'updated_at']
          )
        )
      )
      or subitem.variant_group_id is not null
      or subitem.variant_value is not null
      or subitem.variant_value_text is not null
      or subitem.variant_unit is not null
      or coalesce(subitem.cost_price, 0) <> 0
      or coalesce(subitem.unit_price, 0) <> 0
      or coalesce(subitem.labor_rate, 0) <> 0
      or coalesce(subitem.labor_rate_empty, 0) <> 0
      or coalesce(subitem.labor_rate_occupied, 0) <> 0
  ) then
    raise exception 'An archive target is changed, canonical, or contains commercial values.';
  end if;

  if exists (
    select 1
    from formate_legacy_archive_seed as seed
    where exists (
      select 1 from public.admin_condition_template_values where subitem_id = seed.construction_subitem_id
    ) or exists (
      select 1 from public.subitem_pyeong_values where subitem_id = seed.construction_subitem_id
    ) or exists (
      select 1 from public.detail_cost_categories where subitem_id = seed.construction_subitem_id
    ) or exists (
      select 1 from public.photos
      where construction_subitem_id = seed.construction_subitem_id
        or (target_type = 'subitem' and target_id = seed.construction_subitem_id)
    ) or exists (
      select 1 from public.sash_catalog_entries where construction_subitem_id = seed.construction_subitem_id
    ) or exists (
      select 1 from public.construction_subitem_variant_groups where base_subitem_id = seed.construction_subitem_id
    ) or exists (
      select 1 from public.estimates
      where position(seed.construction_subitem_id::text in items_data::text) > 0
        or position(seed.construction_subitem_id::text in condition_snapshot::text) > 0
    ) or exists (
      select 1 from public.estimate_versions
      where position(seed.construction_subitem_id::text in items_snapshot::text) > 0
        or position(seed.construction_subitem_id::text in condition_snapshot::text) > 0
    ) or exists (
      select 1 from public.price_conditions
      where position(seed.construction_subitem_id::text in saved_items_snapshot::text) > 0
    )
  ) then
    raise exception 'An archive target still has a direct or historical reference.';
  end if;
end
$$;

create temporary table formate_before_attach on commit drop as
select
  subitem.id,
  to_jsonb(subitem)
    - array['variant_group_id', 'variant_value', 'variant_value_text', 'variant_unit', 'updated_at']
    as immutable_business_data
from public.construction_subitems as subitem
join formate_legacy_attach_seed as seed
  on seed.construction_subitem_id = subitem.id;

create temporary table formate_before_archive on commit drop as
select
  subitem.id,
  to_jsonb(subitem) - array['archived_at', 'updated_at'] as immutable_business_data
from public.construction_subitems as subitem
join formate_legacy_archive_seed as seed
  on seed.construction_subitem_id = subitem.id;

create temporary table formate_preserved_references on commit drop as
select 'admin_condition_template_values'::text as table_name, value.id::text as row_id, to_jsonb(value) as row_data
from public.admin_condition_template_values as value
join formate_legacy_attach_seed as seed on seed.construction_subitem_id = value.subitem_id
union all
select 'subitem_pyeong_values', value.id::text, to_jsonb(value)
from public.subitem_pyeong_values as value
join formate_legacy_attach_seed as seed on seed.construction_subitem_id = value.subitem_id
union all
select 'detail_cost_categories', detail_cost.id::text, to_jsonb(detail_cost)
from public.detail_cost_categories as detail_cost
join formate_legacy_attach_seed as seed on seed.construction_subitem_id = detail_cost.subitem_id
union all
select 'photos', photo.id::text, to_jsonb(photo)
from public.photos as photo
join formate_legacy_attach_seed as seed
  on photo.construction_subitem_id = seed.construction_subitem_id
    or (photo.target_type = 'subitem' and photo.target_id = seed.construction_subitem_id)
union all
select 'sash_catalog_entries', sash.id::text, to_jsonb(sash)
from public.sash_catalog_entries as sash
join formate_legacy_attach_seed as seed on seed.construction_subitem_id = sash.construction_subitem_id
union all
select 'estimates', estimate.id::text, to_jsonb(estimate)
from public.estimates as estimate
where exists (
  select 1 from formate_legacy_attach_seed as seed
  where position(seed.construction_subitem_id::text in estimate.items_data::text) > 0
    or position(seed.construction_subitem_id::text in estimate.condition_snapshot::text) > 0
)
union all
select 'estimate_versions', estimate_version.id::text, to_jsonb(estimate_version)
from public.estimate_versions as estimate_version
where exists (
  select 1 from formate_legacy_attach_seed as seed
  where position(seed.construction_subitem_id::text in estimate_version.items_snapshot::text) > 0
    or position(seed.construction_subitem_id::text in estimate_version.condition_snapshot::text) > 0
)
union all
select 'price_conditions', price_condition.id::text, to_jsonb(price_condition)
from public.price_conditions as price_condition
where exists (
  select 1 from formate_legacy_attach_seed as seed
  where position(seed.construction_subitem_id::text in price_condition.saved_items_snapshot::text) > 0
);

insert into public.construction_subitem_variant_groups (
  id,
  construction_item_id,
  display_name,
  variant_kind,
  variant_value_type,
  base_subitem_id,
  sort_order,
  archived_at
)
select
  seed.variant_group_id,
  seed.construction_item_id,
  seed.display_name,
  seed.variant_kind,
  seed.variant_value_type,
  seed.base_subitem_id,
  seed.sort_order,
  null
from formate_legacy_group_seed as seed
where not seed.must_exist
on conflict (id) do nothing;

update public.construction_subitems as subitem
set archived_at = coalesce(subitem.archived_at, now())
from formate_legacy_archive_seed as seed
where subitem.id = seed.construction_subitem_id
  and subitem.archived_at is null;

update public.construction_subitems as subitem
set
  variant_group_id = seed.variant_group_id,
  variant_value = seed.variant_value,
  variant_value_text = null,
  variant_unit = btrim(seed.variant_unit),
  archived_at = null
from formate_legacy_attach_seed as seed
where subitem.id = seed.construction_subitem_id
  and subitem.variant_group_id is null
  and subitem.variant_value is null
  and subitem.variant_value_text is null
  and subitem.variant_unit is null
  and subitem.archived_at is null;

create temporary table formate_after_preserved_references on commit drop as
select 'admin_condition_template_values'::text as table_name, value.id::text as row_id, to_jsonb(value) as row_data
from public.admin_condition_template_values as value
join formate_legacy_attach_seed as seed on seed.construction_subitem_id = value.subitem_id
union all
select 'subitem_pyeong_values', value.id::text, to_jsonb(value)
from public.subitem_pyeong_values as value
join formate_legacy_attach_seed as seed on seed.construction_subitem_id = value.subitem_id
union all
select 'detail_cost_categories', detail_cost.id::text, to_jsonb(detail_cost)
from public.detail_cost_categories as detail_cost
join formate_legacy_attach_seed as seed on seed.construction_subitem_id = detail_cost.subitem_id
union all
select 'photos', photo.id::text, to_jsonb(photo)
from public.photos as photo
join formate_legacy_attach_seed as seed
  on photo.construction_subitem_id = seed.construction_subitem_id
    or (photo.target_type = 'subitem' and photo.target_id = seed.construction_subitem_id)
union all
select 'sash_catalog_entries', sash.id::text, to_jsonb(sash)
from public.sash_catalog_entries as sash
join formate_legacy_attach_seed as seed on seed.construction_subitem_id = sash.construction_subitem_id
union all
select 'estimates', estimate.id::text, to_jsonb(estimate)
from public.estimates as estimate
where exists (
  select 1 from formate_legacy_attach_seed as seed
  where position(seed.construction_subitem_id::text in estimate.items_data::text) > 0
    or position(seed.construction_subitem_id::text in estimate.condition_snapshot::text) > 0
)
union all
select 'estimate_versions', estimate_version.id::text, to_jsonb(estimate_version)
from public.estimate_versions as estimate_version
where exists (
  select 1 from formate_legacy_attach_seed as seed
  where position(seed.construction_subitem_id::text in estimate_version.items_snapshot::text) > 0
    or position(seed.construction_subitem_id::text in estimate_version.condition_snapshot::text) > 0
)
union all
select 'price_conditions', price_condition.id::text, to_jsonb(price_condition)
from public.price_conditions as price_condition
where exists (
  select 1 from formate_legacy_attach_seed as seed
  where position(seed.construction_subitem_id::text in price_condition.saved_items_snapshot::text) > 0
);

do $$
begin
  if exists (
    select 1
    from formate_legacy_group_seed as seed
    left join public.construction_subitem_variant_groups as variant_group
      on variant_group.id = seed.variant_group_id
    left join public.construction_items as item
      on item.id = variant_group.construction_item_id
    where item.company_id is distinct from seed.company_id
      or variant_group.construction_item_id is distinct from seed.construction_item_id
      or variant_group.display_name is distinct from seed.display_name
      or variant_group.variant_kind is distinct from seed.variant_kind
      or variant_group.variant_value_type is distinct from seed.variant_value_type
      or variant_group.base_subitem_id is distinct from seed.base_subitem_id
      or variant_group.sort_order is distinct from seed.sort_order
      or variant_group.archived_at is not null
  ) then
    raise exception 'Canonical group verification failed.';
  end if;

  if exists (
    select 1
    from formate_legacy_attach_seed as seed
    left join public.construction_subitems as subitem
      on subitem.id = seed.construction_subitem_id
    left join formate_before_attach as snapshot
      on snapshot.id = subitem.id
    where subitem.variant_group_id is distinct from seed.variant_group_id
      or subitem.variant_value is distinct from seed.variant_value
      or subitem.variant_value_text is not null
      or lower(btrim(subitem.variant_unit)) is distinct from lower(btrim(seed.variant_unit))
      or subitem.archived_at is not null
      or (
        to_jsonb(subitem)
          - array['variant_group_id', 'variant_value', 'variant_value_text', 'variant_unit', 'updated_at']
      ) is distinct from snapshot.immutable_business_data
  ) then
    raise exception 'Attach verification or business-data preservation failed.';
  end if;

  if exists (
    select 1
    from formate_legacy_archive_seed as seed
    left join public.construction_subitems as subitem
      on subitem.id = seed.construction_subitem_id
    left join formate_before_archive as snapshot
      on snapshot.id = subitem.id
    where subitem.archived_at is null
      or (to_jsonb(subitem) - array['archived_at', 'updated_at'])
        is distinct from snapshot.immutable_business_data
  ) then
    raise exception 'Archive verification or business-data preservation failed.';
  end if;

  if exists (
    select variant_group_id, variant_value, lower(btrim(variant_unit))
    from public.construction_subitems
    where archived_at is null
      and variant_group_id in (select variant_group_id from formate_legacy_group_seed)
    group by variant_group_id, variant_value, lower(btrim(variant_unit))
    having count(*) > 1
  ) then
    raise exception 'The migration created a duplicate active canonical identity.';
  end if;

  if exists (
    select table_name, row_id, row_data
    from formate_preserved_references
    except
    select table_name, row_id, row_data
    from formate_after_preserved_references
  ) or exists (
    select table_name, row_id, row_data
    from formate_after_preserved_references
    except
    select table_name, row_id, row_data
    from formate_preserved_references
  ) then
    raise exception 'A preserved reference or historical snapshot changed.';
  end if;
end
$$;

select
  (select count(*)::integer from formate_legacy_group_seed) as verified_group_count,
  (select count(*)::integer from formate_legacy_attach_seed) as attached_subitem_count,
  (select count(*)::integer from formate_legacy_archive_seed) as archived_subitem_count;

commit;
