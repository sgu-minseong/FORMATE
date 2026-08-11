-- FORMATE read-only audit for legacy standalone rows that may represent numeric
-- variants. A trailing value/unit in name is discovery evidence only. It is
-- never written and must not be used by production runtime as identity.
--
-- Run in the live Supabase SQL editor before preparing
-- canonical_variant_legacy_standalone_targeted_migration.sql. Export every
-- result set and review exact UUIDs, current rows, group metadata, and references.

begin;

set transaction read only;
set local statement_timeout = '60s';

do $$
begin
  if to_regclass('public.construction_items') is null
    or to_regclass('public.construction_subitems') is null
    or to_regclass('public.construction_subitem_variant_groups') is null
    or to_regclass('public.admin_condition_template_values') is null
    or to_regclass('public.subitem_pyeong_values') is null
    or to_regclass('public.detail_cost_categories') is null
    or to_regclass('public.photos') is null
    or to_regclass('public.sash_catalog_entries') is null
    or to_regclass('public.estimates') is null
    or to_regclass('public.estimate_versions') is null
    or to_regclass('public.price_conditions') is null then
    raise exception 'Canonical standalone audit prerequisites do not match the expected schema.';
  end if;
end
$$;

with suffix_candidates as (
  select
    company.id as company_id,
    company.name as company_name,
    item.id as construction_item_id,
    item.name as construction_item_name,
    subitem.id as construction_subitem_id,
    subitem.name as construction_subitem_name,
    btrim(matched.parts[1]) as product_name_evidence,
    (matched.parts[2])::numeric(12, 4) as numeric_value_evidence,
    'T'::text as unit_evidence,
    to_jsonb(subitem) as exact_subitem_row
  from public.construction_subitems as subitem
  join public.construction_items as item
    on item.id = subitem.item_id
  join public.companies as company
    on company.id = item.company_id
  cross join lateral (
    select regexp_match(
      btrim(subitem.name),
      '^(.+[^[:space:]])[[:space:]]+([0-9]+([.][0-9]+)?)[[:space:]]*[Tt]$'
    ) as parts
  ) as matched
  where subitem.archived_at is null
    and subitem.variant_group_id is null
    and subitem.variant_value is null
    and subitem.variant_value_text is null
    and subitem.variant_unit is null
    and matched.parts is not null
), reference_counts as (
  select
    candidate.construction_subitem_id,
    (
      select count(*)::integer
      from public.admin_condition_template_values as value
      where value.subitem_id = candidate.construction_subitem_id
    ) as template_value_reference_count,
    (
      select count(*)::integer
      from public.subitem_pyeong_values as value
      where value.subitem_id = candidate.construction_subitem_id
    ) as pyeong_value_reference_count,
    (
      select count(*)::integer
      from public.detail_cost_categories as detail_cost
      where detail_cost.subitem_id = candidate.construction_subitem_id
    ) as detail_cost_reference_count,
    (
      select count(*)::integer
      from public.photos as photo
      where photo.construction_subitem_id = candidate.construction_subitem_id
        or (
          photo.target_type = 'subitem'
          and photo.target_id = candidate.construction_subitem_id
        )
    ) as photo_reference_count,
    (
      select count(*)::integer
      from public.sash_catalog_entries as sash
      where sash.construction_subitem_id = candidate.construction_subitem_id
    ) as sash_reference_count,
    (
      select count(*)::integer
      from public.construction_subitem_variant_groups as variant_group
      where variant_group.base_subitem_id = candidate.construction_subitem_id
    ) as base_group_reference_count,
    (
      select count(*)::integer
      from public.estimates as estimate
      where position(candidate.construction_subitem_id::text in estimate.items_data::text) > 0
        or position(candidate.construction_subitem_id::text in estimate.condition_snapshot::text) > 0
    ) as estimate_snapshot_reference_count,
    (
      select count(*)::integer
      from public.estimate_versions as estimate_version
      where position(candidate.construction_subitem_id::text in estimate_version.items_snapshot::text) > 0
        or position(candidate.construction_subitem_id::text in estimate_version.condition_snapshot::text) > 0
    ) as estimate_history_reference_count,
    (
      select count(*)::integer
      from public.price_conditions as price_condition
      where position(candidate.construction_subitem_id::text in price_condition.saved_items_snapshot::text) > 0
    ) as price_snapshot_reference_count
  from suffix_candidates as candidate
)
select
  candidate.*,
  count(*) over (
    partition by
      candidate.company_id,
      candidate.construction_item_id,
      lower(candidate.product_name_evidence),
      candidate.numeric_value_evidence,
      lower(candidate.unit_evidence)
  )::integer as duplicate_suffix_evidence_count,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', variant_group.id,
        'displayName', variant_group.display_name,
        'variantKind', variant_group.variant_kind,
        'variantValueType', variant_group.variant_value_type,
        'baseSubitemId', variant_group.base_subitem_id,
        'sortOrder', variant_group.sort_order,
        'archivedAt', variant_group.archived_at,
        'displayNameMatchesEvidence',
          lower(btrim(variant_group.display_name)) = lower(candidate.product_name_evidence),
        'activeSameValueVariantIds', coalesce((
          select jsonb_agg(variant.id order by variant.id)
          from public.construction_subitems as variant
          where variant.variant_group_id = variant_group.id
            and variant.archived_at is null
            and variant.variant_value = candidate.numeric_value_evidence
            and variant.variant_value_text is null
            and lower(btrim(variant.variant_unit)) = lower(candidate.unit_evidence)
        ), '[]'::jsonb),
        'exactGroupRow', to_jsonb(variant_group)
      )
      order by variant_group.sort_order, variant_group.created_at, variant_group.id
    )
    from public.construction_subitem_variant_groups as variant_group
    where variant_group.construction_item_id = candidate.construction_item_id
      and variant_group.archived_at is null
  ), '[]'::jsonb) as same_item_active_groups,
  (
    select count(*)::integer
    from public.construction_subitem_variant_groups as variant_group
    where variant_group.construction_item_id = candidate.construction_item_id
      and variant_group.archived_at is null
      and lower(btrim(variant_group.display_name)) = lower(candidate.product_name_evidence)
  ) as display_evidence_matching_group_count,
  reference.template_value_reference_count,
  reference.pyeong_value_reference_count,
  reference.detail_cost_reference_count,
  reference.photo_reference_count,
  reference.sash_reference_count,
  reference.base_group_reference_count,
  reference.estimate_snapshot_reference_count,
  reference.estimate_history_reference_count,
  reference.price_snapshot_reference_count,
  (
    reference.template_value_reference_count
    + reference.pyeong_value_reference_count
    + reference.detail_cost_reference_count
    + reference.photo_reference_count
    + reference.sash_reference_count
    + reference.base_group_reference_count
    + reference.estimate_snapshot_reference_count
    + reference.estimate_history_reference_count
    + reference.price_snapshot_reference_count
  )::integer as total_reference_count,
  (
    coalesce((candidate.exact_subitem_row ->> 'cost_price')::numeric, 0) <> 0
    or coalesce((candidate.exact_subitem_row ->> 'unit_price')::numeric, 0) <> 0
    or coalesce((candidate.exact_subitem_row ->> 'labor_rate')::numeric, 0) <> 0
    or coalesce((candidate.exact_subitem_row ->> 'labor_rate_empty')::numeric, 0) <> 0
    or coalesce((candidate.exact_subitem_row ->> 'labor_rate_occupied')::numeric, 0) <> 0
  ) as has_commercial_values,
  (
    reference.template_value_reference_count
    + reference.pyeong_value_reference_count
    + reference.detail_cost_reference_count
    + reference.photo_reference_count
    + reference.sash_reference_count
    + reference.base_group_reference_count
    + reference.estimate_snapshot_reference_count
    + reference.estimate_history_reference_count
    + reference.price_snapshot_reference_count = 0
    and coalesce((candidate.exact_subitem_row ->> 'cost_price')::numeric, 0) = 0
    and coalesce((candidate.exact_subitem_row ->> 'unit_price')::numeric, 0) = 0
    and coalesce((candidate.exact_subitem_row ->> 'labor_rate')::numeric, 0) = 0
    and coalesce((candidate.exact_subitem_row ->> 'labor_rate_empty')::numeric, 0) = 0
    and coalesce((candidate.exact_subitem_row ->> 'labor_rate_occupied')::numeric, 0) = 0
  ) as archive_preflight_candidate
from suffix_candidates as candidate
join reference_counts as reference
  on reference.construction_subitem_id = candidate.construction_subitem_id
order by
  candidate.company_name,
  candidate.construction_item_name,
  candidate.product_name_evidence,
  candidate.numeric_value_evidence,
  candidate.construction_subitem_id;

-- The targeted migration assumes this exact direct-reference graph. Any extra
-- FK must be audited and added to its preservation checks before execution.
select
  constraint_row.conname as foreign_key_name,
  constraint_row.conrelid::regclass::text as referencing_table,
  pg_get_constraintdef(constraint_row.oid) as definition
from pg_constraint as constraint_row
where constraint_row.contype = 'f'
  and constraint_row.confrelid = 'public.construction_subitems'::regclass
order by constraint_row.conname;

commit;
