-- FORMATE Gate 5 SELECT-only preflight.
-- Run in the Live Supabase SQL Editor before the Gate 5 migration.

select
  to_regclass('public.sash_catalog_entries') as sash_catalog_entries,
  to_regclass('public.sash_conditions') as sash_conditions,
  to_regclass('public.sash_condition_entries') as sash_condition_entries,
  to_regclass('public.sash_option_values') as sash_option_values,
  to_regclass('public.sash_prices') as existing_sash_prices;

select
  count(*) filter (where archived_at is null) as active_catalog_rows,
  count(*) filter (
    where archived_at is null
      and width_mm is not null
      and height_mm is not null
      and window_type in ('single', 'double')
      and nullif(btrim(brand), '') is not null
      and nullif(btrim(frame_spec), '') is not null
      and nullif(btrim(pair_spec), '') is not null
      and nullif(btrim(glass_spec), '') is not null
      and nullif(btrim(glass_thickness), '') is not null
      and nullif(btrim(gas_spec), '') is not null
      and nullif(btrim(screen_spec), '') is not null
  ) as complete_strict_identity_rows,
  count(*) filter (
    where archived_at is null
      and (
        width_mm is null
        or height_mm is null
        or window_type not in ('single', 'double')
        or nullif(btrim(brand), '') is null
        or nullif(btrim(frame_spec), '') is null
        or nullif(btrim(pair_spec), '') is null
        or nullif(btrim(glass_spec), '') is null
        or nullif(btrim(glass_thickness), '') is null
        or nullif(btrim(gas_spec), '') is null
        or nullif(btrim(screen_spec), '') is null
      )
  ) as sparse_or_incomplete_rows
from public.sash_catalog_entries;

select jsonb_agg(
  jsonb_build_object(
    'id', catalog_entry.id,
    'company_id', catalog_entry.company_id,
    'unit_price', catalog_entry.unit_price,
    'updated_at', catalog_entry.updated_at
  )
  order by catalog_entry.company_id, catalog_entry.id
) as catalog_unit_price_baseline
from public.sash_catalog_entries as catalog_entry
where catalog_entry.archived_at is null;

select
  count(*) filter (where catalog_entry.company_id is null) as missing_company_scope,
  count(*) filter (
    where construction_item.company_id is distinct from catalog_entry.company_id
  ) as cross_company_subitem_scope,
  count(*) filter (where construction_item.item_kind is distinct from 'sash') as non_sash_parent_scope
from public.sash_catalog_entries as catalog_entry
join public.construction_subitems as construction_subitem
  on construction_subitem.id = catalog_entry.construction_subitem_id
join public.construction_items as construction_item
  on construction_item.id = construction_subitem.item_id;

select count(*) as window_option_string_drift
from public.sash_catalog_entries as catalog_entry
left join public.sash_option_values as option_value
  on option_value.id = catalog_entry.window_type_option_id
where catalog_entry.archived_at is null
  and catalog_entry.window_type_option_id is not null
  and (
    option_value.id is null
    or option_value.company_id is distinct from catalog_entry.company_id
    or option_value.option_kind is distinct from 'window_type'
    or option_value.semantic_value is distinct from catalog_entry.window_type
  );

select
  count(*) as historical_sash_estimates,
  jsonb_agg(
    jsonb_build_object(
      'id', estimate.id,
      'total_amount', estimate.total_amount,
      'created_at', estimate.created_at
    )
    order by estimate.created_at, estimate.id
  ) as historical_estimate_baseline
from public.estimates as estimate
where estimate.items_data::text ~ '"itemKind"\s*:\s*"sash"';
