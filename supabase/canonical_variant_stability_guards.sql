-- FORMATE canonical variant recurrence-prevention guards and atomic writers.
--
-- Review and run manually in the Supabase SQL Editor only after:
--   1. supabase/construction_subitem_variant_persistence_contract.sql
--   2. supabase/construction_subitem_variant_base_foundation.sql
--   3. supabase/photo_library_v2_foundation.sql
--   4. supabase/sales_lifecycle_rpcs.sql
--
-- This migration never converts, deletes, archives, or backfills business data.
-- Its preflight stops the whole transaction when canonical uniqueness/scope is
-- already violated. Run `npm run check:data-integrity` against the target DB
-- before applying it and resolve reported rows explicitly.

begin;

set local client_encoding = 'UTF8';

do $$
begin
  if to_regclass('public.construction_subitem_variant_groups') is null
    or to_regclass('public.admin_condition_template_values') is null
    or to_regclass('public.detail_cost_categories') is null
    or to_regclass('public.price_conditions') is null
    or to_regclass('public.photos') is null
    or to_regclass('public.photo_collections') is null
    or to_regclass('public.sash_catalog_entries') is null
    or to_regclass('public.photo_library_folders') is null then
    raise exception 'Apply the canonical catalog and Photo v2 foundations before this migration.';
  end if;

  if to_regclass('public.construction_subitems_active_numeric_variant_identity_uidx') is null
    or to_regclass('public.construction_subitems_active_text_variant_identity_uidx') is null
    or to_regclass('public.construction_subitem_variant_groups_base_subitem_uidx') is null then
    raise exception 'Canonical variant uniqueness guards are missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.construction_subitem_variant_groups'::regclass
      and conname = 'construction_subitem_variant_groups_base_subitem_item_fkey'
  ) or not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photos'::regclass
      and conname = 'photos_subitem_scope_check'
  ) or not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photos'::regclass
      and conname = 'photos_pyeong_requires_subitem_check'
  ) then
    raise exception 'Canonical base-subitem or Photo scope guards are missing.';
  end if;

  if exists (
    select 1
    from public.admin_condition_template_values
    group by template_id, subitem_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate canonical Template values exist for one template/subitem UUID.';
  end if;

  if exists (
    select 1
    from public.admin_condition_template_values as value
    left join public.admin_condition_templates as template
      on template.id = value.template_id
    left join public.construction_subitems as subitem
      on subitem.id = value.subitem_id
    left join public.construction_items as item
      on item.id = value.item_id
    where template.id is null
      or subitem.id is null
      or item.id is null
      or subitem.item_id is distinct from item.id
      or item.company_id is distinct from template.company_id
  ) then
    raise exception 'Template/item/subitem scope mismatch exists.';
  end if;

  if exists (
    select 1
    from public.detail_cost_categories as detail_cost
    left join public.construction_subitems as subitem
      on subitem.id = detail_cost.subitem_id
    left join public.construction_items as item
      on item.id = subitem.item_id
    where item.id is null
      or item.company_id is distinct from detail_cost.company_id
  ) then
    raise exception 'Detail-cost/subitem company scope mismatch exists.';
  end if;
end
$$;

-- Canonical Template identity is exactly template_id + construction_subitem_id.
create unique index if not exists admin_condition_template_values_template_subitem_uidx
  on public.admin_condition_template_values (template_id, subitem_id);

drop index if exists public.admin_condition_template_values_template_subitem_option_uidx;

alter table public.admin_condition_template_values
  drop constraint if exists admin_condition_template_values_canonical_option_check;
alter table public.admin_condition_template_values
  add constraint admin_condition_template_values_canonical_option_check
  check (option_value = '') not valid;

alter table public.admin_condition_template_values
  drop constraint if exists admin_condition_template_values_nonnegative_check;
alter table public.admin_condition_template_values
  add constraint admin_condition_template_values_nonnegative_check
  check (
    (quantity is null or (
      quantity::text not in ('NaN', 'Infinity', '-Infinity') and quantity >= 0
    ))
    and (labor_count is null or (
      labor_count::text not in ('NaN', 'Infinity', '-Infinity') and labor_count >= 0
    ))
    and construction_days >= 0
  ) not valid;

create or replace function public.formate_validate_admin_template_value_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  template_company_id uuid;
  subitem_item_id uuid;
  item_company_id uuid;
begin
  select template.company_id
  into template_company_id
  from public.admin_condition_templates as template
  where template.id = new.template_id;

  select subitem.item_id
  into subitem_item_id
  from public.construction_subitems as subitem
  where subitem.id = new.subitem_id;

  select item.company_id
  into item_company_id
  from public.construction_items as item
  where item.id = new.item_id;

  if template_company_id is null
    or subitem_item_id is null
    or item_company_id is null
    or subitem_item_id is distinct from new.item_id
    or item_company_id is distinct from template_company_id then
    raise exception 'Template value must use an item and subitem from the Template company.'
      using errcode = '23514';
  end if;

  if new.option_value <> '' then
    raise exception 'Canonical Template values cannot use option_value as identity.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_admin_template_value_scope
  on public.admin_condition_template_values;
create trigger validate_admin_template_value_scope
before insert or update of template_id, item_id, subitem_id, option_value
on public.admin_condition_template_values
for each row execute function public.formate_validate_admin_template_value_scope();

-- Tenant ownership is stable identity. Moving a parent row by changing only
-- company_id would bypass child-row scope triggers and create cross-company
-- references. Any future tenant-transfer workflow must be an explicit,
-- separately audited migration rather than an ordinary product write.
create or replace function public.formate_prevent_company_scope_move()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'Stable company scope cannot be changed by an ordinary update.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_construction_item_company_scope_move on public.construction_items;
create trigger prevent_construction_item_company_scope_move
before update of company_id on public.construction_items
for each row execute function public.formate_prevent_company_scope_move();

drop trigger if exists prevent_admin_template_company_scope_move on public.admin_condition_templates;
create trigger prevent_admin_template_company_scope_move
before update of company_id on public.admin_condition_templates
for each row execute function public.formate_prevent_company_scope_move();

drop trigger if exists prevent_price_condition_company_scope_move on public.price_conditions;
create trigger prevent_price_condition_company_scope_move
before update of company_id on public.price_conditions
for each row execute function public.formate_prevent_company_scope_move();

drop trigger if exists prevent_detail_cost_company_scope_move on public.detail_cost_categories;
create trigger prevent_detail_cost_company_scope_move
before update of company_id on public.detail_cost_categories
for each row execute function public.formate_prevent_company_scope_move();

drop trigger if exists prevent_estimate_company_scope_move on public.estimates;
create trigger prevent_estimate_company_scope_move
before update of company_id on public.estimates
for each row execute function public.formate_prevent_company_scope_move();

drop trigger if exists prevent_photo_collection_company_scope_move on public.photo_collections;
create trigger prevent_photo_collection_company_scope_move
before update of company_id on public.photo_collections
for each row execute function public.formate_prevent_company_scope_move();

drop trigger if exists prevent_photo_folder_company_scope_move on public.photo_library_folders;
create trigger prevent_photo_folder_company_scope_move
before update of company_id on public.photo_library_folders
for each row execute function public.formate_prevent_company_scope_move();

drop trigger if exists prevent_photo_company_scope_move on public.photos;
create trigger prevent_photo_company_scope_move
before update of company_id on public.photos
for each row execute function public.formate_prevent_company_scope_move();

drop trigger if exists prevent_sash_entry_company_scope_move on public.sash_catalog_entries;
create trigger prevent_sash_entry_company_scope_move
before update of company_id on public.sash_catalog_entries
for each row execute function public.formate_prevent_company_scope_move();

-- These parent/child scope fields participate in stable identity but are not
-- covered by a composite FK. Changing only the parent would otherwise leave
-- valid UUID FKs with invalid canonical scope. Ordinary editors never move
-- these relations; a future migration must opt in explicitly after auditing
-- every dependent row.
create or replace function public.formate_prevent_stable_catalog_scope_move()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_table_name = 'construction_items'
    and (to_jsonb(new) -> 'item_kind') is distinct from (to_jsonb(old) -> 'item_kind') then
    raise exception 'Construction item_kind is stable runtime metadata.'
      using errcode = '23514';
  elsif tg_table_name = 'construction_subitems'
    and (to_jsonb(new) -> 'item_id') is distinct from (to_jsonb(old) -> 'item_id') then
    raise exception 'Construction subitem cannot move to another construction item.'
      using errcode = '23514';
  elsif tg_table_name = 'construction_subitem_variant_groups'
    and (to_jsonb(new) -> 'construction_item_id') is distinct from (to_jsonb(old) -> 'construction_item_id') then
    raise exception 'Variant group cannot move to another construction item.'
      using errcode = '23514';
  elsif tg_table_name = 'photo_collections'
    and (to_jsonb(new) -> 'photo_type') is distinct from (to_jsonb(old) -> 'photo_type') then
    raise exception 'Photo collection type is stable scope metadata.'
      using errcode = '23514';
  elsif tg_table_name = 'sash_catalog_entries'
    and (to_jsonb(new) -> 'construction_subitem_id') is distinct from (to_jsonb(old) -> 'construction_subitem_id') then
    raise exception 'Sash catalog entry cannot move to another construction subitem.'
      using errcode = '23514';
  elsif tg_table_name = 'detail_cost_categories'
    and (to_jsonb(new) -> 'subitem_id') is distinct from (to_jsonb(old) -> 'subitem_id') then
    raise exception 'Detail cost cannot move to another construction subitem.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_construction_item_kind_scope_move on public.construction_items;
create trigger prevent_construction_item_kind_scope_move
before update of item_kind on public.construction_items
for each row execute function public.formate_prevent_stable_catalog_scope_move();

drop trigger if exists prevent_construction_subitem_item_scope_move on public.construction_subitems;
create trigger prevent_construction_subitem_item_scope_move
before update of item_id on public.construction_subitems
for each row execute function public.formate_prevent_stable_catalog_scope_move();

drop trigger if exists prevent_variant_group_item_scope_move on public.construction_subitem_variant_groups;
create trigger prevent_variant_group_item_scope_move
before update of construction_item_id on public.construction_subitem_variant_groups
for each row execute function public.formate_prevent_stable_catalog_scope_move();

drop trigger if exists prevent_photo_collection_type_scope_move on public.photo_collections;
create trigger prevent_photo_collection_type_scope_move
before update of photo_type on public.photo_collections
for each row execute function public.formate_prevent_stable_catalog_scope_move();

drop trigger if exists prevent_sash_entry_subitem_scope_move on public.sash_catalog_entries;
create trigger prevent_sash_entry_subitem_scope_move
before update of construction_subitem_id on public.sash_catalog_entries
for each row execute function public.formate_prevent_stable_catalog_scope_move();

drop trigger if exists prevent_detail_cost_subitem_scope_move on public.detail_cost_categories;
create trigger prevent_detail_cost_subitem_scope_move
before update of subitem_id on public.detail_cost_categories
for each row execute function public.formate_prevent_stable_catalog_scope_move();

create or replace function public.formate_validate_detail_cost_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  subitem_company_id uuid;
begin
  select item.company_id
  into subitem_company_id
  from public.construction_subitems as subitem
  join public.construction_items as item on item.id = subitem.item_id
  where subitem.id = new.subitem_id;

  if not found or subitem_company_id is distinct from new.company_id then
    raise exception 'Detail cost must belong to the same company as its construction subitem.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_detail_cost_scope on public.detail_cost_categories;
create trigger validate_detail_cost_scope
before insert or update of company_id, subitem_id on public.detail_cost_categories
for each row execute function public.formate_validate_detail_cost_scope();

-- Tighten the existing generic variant trigger without changing stored rows.
-- A stale caller cannot attach a subitem to an archived group.
create or replace function public.formate_validate_construction_subitem_variant_persistence()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  group_value_type text;
  group_archived_at timestamptz;
begin
  if new.variant_group_id is null then
    return new;
  end if;

  select variant_group.variant_value_type, variant_group.archived_at
  into group_value_type, group_archived_at
  from public.construction_subitem_variant_groups as variant_group
  where variant_group.id = new.variant_group_id
    and variant_group.construction_item_id = new.item_id;

  if not found then
    raise exception 'Variant group must belong to the same construction item.'
      using errcode = '23503';
  end if;

  if group_archived_at is not null then
    if tg_op = 'INSERT' then
      raise exception 'New canonical variants cannot be attached to an archived group.'
        using errcode = '23514';
    elsif new.variant_group_id is distinct from old.variant_group_id
      or (old.archived_at is not null and new.archived_at is null) then
      raise exception 'A canonical variant cannot move into or reactivate inside an archived group.'
        using errcode = '23514';
    end if;
  end if;

  if group_value_type = 'number' then
    if new.variant_value is null
      or new.variant_value::text in ('NaN', 'Infinity', '-Infinity')
      or new.variant_value_text is not null
      or new.variant_unit is null
      or length(btrim(new.variant_unit)) = 0 then
      raise exception 'Numeric variant groups require variant_value and a non-blank variant_unit.'
        using errcode = '23514';
    end if;
  elsif group_value_type = 'text' then
    if new.variant_value is not null
      or new.variant_value_text is null
      or length(btrim(new.variant_value_text)) = 0
      or (new.variant_unit is not null and length(btrim(new.variant_unit)) = 0) then
      raise exception 'Text variant groups require a non-blank variant_value_text.'
        using errcode = '23514';
    end if;
  else
    raise exception 'Unsupported variant group value type.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_construction_subitem_variant_persistence
  on public.construction_subitems;
create trigger validate_construction_subitem_variant_persistence
before insert or update of
  item_id,
  variant_group_id,
  variant_value,
  variant_value_text,
  variant_unit,
  archived_at
on public.construction_subitems
for each row execute function public.formate_validate_construction_subitem_variant_persistence();

-- Current snapshots carry explicit totals. Historical arrays/objects without
-- these fields remain readable and are not rewritten or retroactively rejected.
create or replace function public.formate_estimate_snapshot_total_is_consistent(
  p_items_data jsonb,
  p_total_amount numeric
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  snapshot_total numeric;
  selected_total numeric;
  adjustment_total numeric;
begin
  if p_total_amount is null
    or p_total_amount::text in ('NaN', 'Infinity', '-Infinity')
    or p_total_amount < 0 then
    return false;
  end if;
  if jsonb_typeof(p_items_data) <> 'object' or not (p_items_data ? 'finalTotal') then
    return true;
  end if;

  snapshot_total := (p_items_data ->> 'finalTotal')::numeric;
  if snapshot_total is null
    or snapshot_total::text in ('NaN', 'Infinity', '-Infinity') then
    return false;
  end if;
  if abs(snapshot_total - p_total_amount) > 0.01 then
    return false;
  end if;

  if p_items_data ? 'selectedItemsTotal' and p_items_data ? 'adjustmentTotal' then
    selected_total := (p_items_data ->> 'selectedItemsTotal')::numeric;
    adjustment_total := (p_items_data ->> 'adjustmentTotal')::numeric;
    if selected_total is null
      or adjustment_total is null
      or selected_total::text in ('NaN', 'Infinity', '-Infinity')
      or adjustment_total::text in ('NaN', 'Infinity', '-Infinity') then
      return false;
    end if;
    if abs(greatest(0, selected_total + adjustment_total) - snapshot_total) > 0.01 then
      return false;
    end if;
  end if;

  return true;
exception when others then
  return false;
end;
$$;

create or replace function public.formate_validate_estimate_snapshot_total()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  condition_company_id uuid;
begin
  if new.condition_id is not null then
    select price_condition.company_id
    into condition_company_id
    from public.price_conditions as price_condition
    where price_condition.id = new.condition_id;

    if not found or condition_company_id is distinct from new.company_id then
      raise exception 'Estimate condition must belong to the same company.'
        using errcode = '23514';
    end if;
  end if;

  if not public.formate_estimate_snapshot_total_is_consistent(
    new.items_data,
    new.total_amount
  ) then
    raise exception 'Estimate total_amount conflicts with the current items_data snapshot.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_estimate_snapshot_total on public.estimates;
create trigger validate_estimate_snapshot_total
before insert or update of company_id, condition_id, items_data, total_amount on public.estimates
for each row execute function public.formate_validate_estimate_snapshot_total();

-- Extends the applied Photo v2 guard. Scope, company and Storage path are
-- validated from stable IDs; captions and display names are never identity.
create or replace function public.formate_validate_photo_v2_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  folder_company_id uuid;
  subitem_company_id uuid;
  sash_company_id uuid;
  sash_subitem_id uuid;
  collection_company_id uuid;
  collection_photo_type text;
  expected_path_prefix text;
begin
  if tg_op = 'UPDATE'
    and old.photo_library_folder_id is distinct from new.photo_library_folder_id
    and exists (
      select 1
      from public.photo_library_folders as folder
      where folder.cover_photo_id = new.id
        and folder.id is distinct from new.photo_library_folder_id
    ) then
    raise exception 'Clear or replace a Photo Library cover before moving its image.'
      using errcode = '23514';
  end if;

  if new.photo_type is distinct from new.target_type then
    raise exception 'Photo type and target type must share one stable scope.'
      using errcode = '23514';
  end if;

  if new.storage_bucket is distinct from 'formate-photos' then
    raise exception 'Photo metadata must use the FORMATE private Storage bucket.'
      using errcode = '23514';
  end if;
  -- Folder moves intentionally keep the immutable Storage object path. The
  -- company prefix is the durable Storage authorization boundary; current DB
  -- target UUIDs are enforced by the columns/triggers above.
  expected_path_prefix := new.company_id::text || '/';
  if new.storage_path is null or left(new.storage_path, length(expected_path_prefix)) <> expected_path_prefix then
    raise exception 'Photo Storage path must match company and stable target IDs.'
      using errcode = '23514';
  end if;

  if new.collection_id is not null then
    select collection.company_id, collection.photo_type
    into collection_company_id, collection_photo_type
    from public.photo_collections as collection
    where collection.id = new.collection_id;

    if not found
      or collection_company_id is distinct from new.company_id
      or collection_photo_type is distinct from new.photo_type then
      raise exception 'Photo collection must match the same company and stable Photo type.'
        using errcode = '23514';
    end if;
  end if;

  if new.photo_library_folder_id is not null then
    select folder.company_id
    into folder_company_id
    from public.photo_library_folders as folder
    where folder.id = new.photo_library_folder_id;

    if not found or folder_company_id is distinct from new.company_id then
      raise exception 'Photo Library image must belong to the same company as its folder.'
        using errcode = '23514';
    end if;
  elsif new.photo_type = 'photo_library' or new.target_type = 'photo_library' then
    raise exception 'Photo Library metadata requires one stable folder UUID.'
      using errcode = '23514';
  end if;

  if new.construction_subitem_id is not null then
    select item.company_id
    into subitem_company_id
    from public.construction_subitems as subitem
    join public.construction_items as item on item.id = subitem.item_id
    where subitem.id = new.construction_subitem_id;

    if not found or subitem_company_id is distinct from new.company_id then
      raise exception 'Photo subitem scope must belong to the same company.'
        using errcode = '23514';
    end if;
  end if;

  if new.sash_catalog_entry_id is not null then
    select sash.company_id, sash.construction_subitem_id
    into sash_company_id, sash_subitem_id
    from public.sash_catalog_entries as sash
    where sash.id = new.sash_catalog_entry_id;

    if not found
      or sash_company_id is distinct from new.company_id
      or new.construction_subitem_id is distinct from sash_subitem_id then
      raise exception 'Photo sash specification must match the same company and construction subitem.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_photo_v2_scope on public.photos;
create trigger validate_photo_v2_scope
before insert or update of
  company_id,
  photo_type,
  collection_id,
  target_type,
  target_id,
  storage_bucket,
  storage_path,
  construction_subitem_id,
  sash_catalog_entry_id,
  photo_library_folder_id
on public.photos
for each row execute function public.formate_validate_photo_v2_scope();

-- Internal helper used only by the two atomic Template writers below.
create or replace function public.formate_apply_admin_template_values(
  p_company_id uuid,
  p_template_id uuid,
  p_values jsonb,
  p_subitem_map jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  entry jsonb;
  subitem_ref text;
  subitem_id uuid;
  item_id uuid;
  owner_company_id uuid;
  value_id uuid;
  result jsonb := '[]'::jsonb;
  seen_refs jsonb := '{}'::jsonb;
begin
  if coalesce(jsonb_typeof(p_values), 'array') <> 'array' then
    raise exception 'Template values must be a JSON array.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.admin_condition_templates
    where id = p_template_id and company_id = p_company_id
  ) then
    raise exception 'Template does not belong to the requested company.' using errcode = '42501';
  end if;

  for entry in select value from jsonb_array_elements(coalesce(p_values, '[]'::jsonb)) loop
    subitem_ref := btrim(coalesce(entry ->> 'subitem_ref', entry ->> 'subitem_id', ''));
    if subitem_ref = '' or seen_refs ? subitem_ref then
      raise exception 'Template write contains a missing or duplicate subitem reference.' using errcode = '22023';
    end if;
    seen_refs := seen_refs || jsonb_build_object(subitem_ref, true);

    if p_subitem_map ? subitem_ref then
      subitem_id := (p_subitem_map ->> subitem_ref)::uuid;
    else
      subitem_id := subitem_ref::uuid;
    end if;
    item_id := (entry ->> 'item_id')::uuid;

    select item.company_id
    into owner_company_id
    from public.construction_subitems as subitem
    join public.construction_items as item on item.id = subitem.item_id
    where subitem.id = subitem_id
      and subitem.item_id = item_id;

    if not found or owner_company_id is distinct from p_company_id then
      raise exception 'Template value item/subitem does not belong to the requested company.'
        using errcode = '23514';
    end if;

    insert into public.admin_condition_template_values (
      template_id,
      item_id,
      subitem_id,
      option_value,
      quantity,
      labor_count,
      construction_days
    ) values (
      p_template_id,
      item_id,
      subitem_id,
      '',
      case when entry ? 'quantity' then (entry ->> 'quantity')::numeric else null end,
      case when entry ? 'labor_count' then (entry ->> 'labor_count')::numeric else null end,
      case when entry ? 'construction_days' then coalesce((entry ->> 'construction_days')::integer, 0) else 0 end
    )
    on conflict (template_id, subitem_id) do update
    set
      item_id = excluded.item_id,
      option_value = '',
      quantity = case
        when entry ? 'quantity' then excluded.quantity
        else admin_condition_template_values.quantity
      end,
      labor_count = case
        when entry ? 'labor_count' then excluded.labor_count
        else admin_condition_template_values.labor_count
      end,
      construction_days = case
        when entry ? 'construction_days' then excluded.construction_days
        else admin_condition_template_values.construction_days
      end
    returning id into value_id;

    result := result || jsonb_build_array(jsonb_build_object(
      'subitemId', subitem_id,
      'valueId', value_id
    ));
  end loop;

  return result;
end;
$$;

revoke all on function public.formate_apply_admin_template_values(uuid, uuid, jsonb, jsonb)
  from public, anon, authenticated;

create or replace function public.save_admin_template_atomic(
  p_company_id uuid,
  p_condition jsonb,
  p_values jsonb default '[]'::jsonb,
  p_mode text default 'upsert',
  p_template_id uuid default null,
  p_source_template_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  template_row public.admin_condition_templates%rowtype;
  created boolean := false;
  value_rows jsonb := '[]'::jsonb;
  source_values jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to save Templates for this company.'
      using errcode = '42501';
  end if;
  if p_mode not in ('upsert', 'create_if_absent', 'edit', 'duplicate') then
    raise exception 'Unsupported atomic Template write mode.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_condition) <> 'object' then
    raise exception 'Template condition is required.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('formate-template:' || p_company_id::text, 0));

  if p_mode = 'edit' then
    update public.admin_condition_templates
    set
      pyeong = (p_condition ->> 'pyeong')::integer,
      build_type = p_condition ->> 'build_type',
      has_extension = coalesce((p_condition ->> 'has_extension')::boolean, false),
      condition_variant = coalesce(p_condition ->> 'condition_variant', '')
    where id = p_template_id and company_id = p_company_id
    returning * into template_row;
    if not found then
      raise exception 'Template to edit was not found in the requested company.' using errcode = 'P0002';
    end if;
  else
    select * into template_row
    from public.admin_condition_templates
    where company_id = p_company_id
      and pyeong = (p_condition ->> 'pyeong')::integer
      and build_type = p_condition ->> 'build_type'
      and has_extension = coalesce((p_condition ->> 'has_extension')::boolean, false)
      and condition_variant = coalesce(p_condition ->> 'condition_variant', '')
    for update;

    if found and p_mode = 'duplicate' then
      raise exception 'Duplicate Template target condition already exists.' using errcode = '23505';
    end if;
    if not found then
      insert into public.admin_condition_templates (
        company_id, pyeong, build_type, has_extension, condition_variant
      ) values (
        p_company_id,
        (p_condition ->> 'pyeong')::integer,
        p_condition ->> 'build_type',
        coalesce((p_condition ->> 'has_extension')::boolean, false),
        coalesce(p_condition ->> 'condition_variant', '')
      ) returning * into template_row;
      created := true;
    elsif p_mode = 'create_if_absent' then
      return jsonb_build_object(
        'ok', true,
        'created', false,
        'template', to_jsonb(template_row),
        'templateValues', '[]'::jsonb
      );
    end if;
  end if;

  if p_mode = 'duplicate' then
    if p_source_template_id is null or not exists (
      select 1 from public.admin_condition_templates
      where id = p_source_template_id and company_id = p_company_id
    ) then
      raise exception 'Source Template was not found in the requested company.' using errcode = 'P0002';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object(
      'item_id', value.item_id,
      'subitem_ref', value.subitem_id,
      'quantity', value.quantity,
      'labor_count', value.labor_count,
      'construction_days', value.construction_days
    )), '[]'::jsonb)
    into source_values
    from public.admin_condition_template_values as value
    where value.template_id = p_source_template_id;
    value_rows := public.formate_apply_admin_template_values(
      p_company_id, template_row.id, source_values, '{}'::jsonb
    );
  else
    value_rows := public.formate_apply_admin_template_values(
      p_company_id, template_row.id, coalesce(p_values, '[]'::jsonb), '{}'::jsonb
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'created', created,
    'template', to_jsonb(template_row),
    'templateValues', value_rows
  );
end;
$$;

-- Blank-estimate Template creation is part of the same user save action. The
-- existing estimate aggregate RPC remains the source of truth; this wrapper
-- only adds the optional canonical Template write to the same transaction.
create or replace function public.save_estimate_draft_with_template(
  p_company_id uuid,
  p_client_draft_key uuid,
  p_estimate_id uuid,
  p_address text,
  p_construction_date date,
  p_condition_id uuid,
  p_condition_snapshot jsonb,
  p_items_data jsonb,
  p_total_amount numeric,
  p_customer_name text default '',
  p_customer_phone text default '',
  p_customer_email text default '',
  p_project_name text default '',
  p_project_detail_address text default '',
  p_template_condition jsonb default null,
  p_template_values jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  estimate_result jsonb;
  template_result jsonb := null;
begin
  estimate_result := public.save_estimate_draft(
    p_company_id,
    p_client_draft_key,
    p_estimate_id,
    p_address,
    p_construction_date,
    p_condition_id,
    p_condition_snapshot,
    p_items_data,
    p_total_amount,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_project_name,
    p_project_detail_address
  );

  if not coalesce((estimate_result ->> 'ok')::boolean, false) then
    return estimate_result;
  end if;

  if p_template_condition is not null then
    template_result := public.save_admin_template_atomic(
      p_company_id,
      p_template_condition,
      coalesce(p_template_values, '[]'::jsonb),
      'create_if_absent',
      null,
      null
    );
  elsif jsonb_array_length(coalesce(p_template_values, '[]'::jsonb)) > 0 then
    raise exception 'Template values require one explicit Template condition.'
      using errcode = '22023';
  end if;

  return estimate_result || jsonb_build_object(
    'templateCreated', coalesce((template_result ->> 'created')::boolean, false),
    'templateId', template_result #> '{template,id}'
  );
end;
$$;

create or replace function public.save_admin_catalog_atomic(
  p_company_id uuid,
  p_item_updates jsonb default '[]'::jsonb,
  p_subitem_updates jsonb default '[]'::jsonb,
  p_subitem_inserts jsonb default '[]'::jsonb,
  p_template_condition jsonb default null,
  p_template_values jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  entry jsonb;
  affected integer;
  inserted_subitem public.construction_subitems%rowtype;
  client_id text;
  subitem_map jsonb := '{}'::jsonb;
  inserted_rows jsonb := '[]'::jsonb;
  template_row public.admin_condition_templates%rowtype;
  template_created boolean := false;
  template_value_rows jsonb := '[]'::jsonb;
  seen_item_ids jsonb := '{}'::jsonb;
  seen_subitem_ids jsonb := '{}'::jsonb;
  stable_id text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to save the catalog for this company.'
      using errcode = '42501';
  end if;
  if coalesce(jsonb_typeof(p_item_updates), 'array') <> 'array'
    or coalesce(jsonb_typeof(p_subitem_updates), 'array') <> 'array'
    or coalesce(jsonb_typeof(p_subitem_inserts), 'array') <> 'array'
    or coalesce(jsonb_typeof(p_template_values), 'array') <> 'array' then
    raise exception 'Atomic catalog payload collections must be arrays.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('formate-catalog:' || p_company_id::text, 0));
  if p_template_condition is not null then
    perform pg_advisory_xact_lock(hashtextextended('formate-template:' || p_company_id::text, 0));
  end if;

  for entry in select value from jsonb_array_elements(coalesce(p_item_updates, '[]'::jsonb)) loop
    stable_id := btrim(coalesce(entry ->> 'id', ''));
    if stable_id = '' or seen_item_ids ? stable_id then
      raise exception 'Atomic catalog item updates require unique stable IDs.' using errcode = '22023';
    end if;
    seen_item_ids := seen_item_ids || jsonb_build_object(stable_id, true);
    update public.construction_items
    set
      name = case when entry ? 'name' then entry ->> 'name' else name end,
      item_type = case when entry ? 'item_type' then entry ->> 'item_type' else item_type end,
      is_favorite = case when entry ? 'is_favorite' then (entry ->> 'is_favorite')::boolean else is_favorite end,
      sort_order = case when entry ? 'sort_order' then (entry ->> 'sort_order')::integer else sort_order end
    where id = (entry ->> 'id')::uuid and company_id = p_company_id;
    get diagnostics affected = row_count;
    if affected <> 1 then
      raise exception 'Atomic catalog item update escaped company scope.' using errcode = '23514';
    end if;
  end loop;

  for entry in select value from jsonb_array_elements(coalesce(p_subitem_updates, '[]'::jsonb)) loop
    stable_id := btrim(coalesce(entry ->> 'id', ''));
    if stable_id = '' or seen_subitem_ids ? stable_id then
      raise exception 'Atomic catalog subitem updates require unique stable IDs.' using errcode = '22023';
    end if;
    seen_subitem_ids := seen_subitem_ids || jsonb_build_object(stable_id, true);
    update public.construction_subitems as subitem
    set
      name = case when entry ? 'name' then entry ->> 'name' else subitem.name end,
      unit = case when entry ? 'unit' then entry ->> 'unit' else subitem.unit end,
      sort_order = case when entry ? 'sort_order' then (entry ->> 'sort_order')::integer else subitem.sort_order end,
      cost_price = case when entry ? 'cost_price' then (entry ->> 'cost_price')::numeric else subitem.cost_price end,
      cost_unit = case when entry ? 'cost_unit' then entry ->> 'cost_unit' else subitem.cost_unit end,
      unit_price = case when entry ? 'unit_price' then (entry ->> 'unit_price')::numeric else subitem.unit_price end,
      labor_rate = case when entry ? 'labor_rate' then (entry ->> 'labor_rate')::numeric else subitem.labor_rate end,
      labor_rate_empty = case when entry ? 'labor_rate_empty' then (entry ->> 'labor_rate_empty')::numeric else subitem.labor_rate_empty end,
      labor_rate_occupied = case when entry ? 'labor_rate_occupied' then (entry ->> 'labor_rate_occupied')::numeric else subitem.labor_rate_occupied end
    from public.construction_items as item
    where subitem.id = (entry ->> 'id')::uuid
      and subitem.item_id = (entry ->> 'item_id')::uuid
      and item.id = subitem.item_id
      and item.company_id = p_company_id;
    get diagnostics affected = row_count;
    if affected <> 1 then
      raise exception 'Atomic catalog subitem update escaped item/company scope.' using errcode = '23514';
    end if;
  end loop;

  for entry in select value from jsonb_array_elements(coalesce(p_subitem_inserts, '[]'::jsonb)) loop
    client_id := btrim(coalesce(entry ->> 'client_id', ''));
    if client_id = '' or subitem_map ? client_id then
      raise exception 'Local subitem references must be present and unique.' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.construction_items
      where id = (entry ->> 'item_id')::uuid and company_id = p_company_id
    ) then
      raise exception 'New subitem does not belong to the requested company.' using errcode = '23514';
    end if;

    insert into public.construction_subitems (
      item_id, name, unit, cost_price, cost_unit, unit_price,
      labor_rate, labor_rate_empty, labor_rate_occupied, sort_order,
      variant_group_id, variant_value, variant_value_text, variant_unit, archived_at
    ) values (
      (entry ->> 'item_id')::uuid,
      entry ->> 'name',
      coalesce(nullif(btrim(entry ->> 'unit'), ''), '평'),
      coalesce((entry ->> 'cost_price')::numeric, 0),
      coalesce(entry ->> 'cost_unit', ''),
      coalesce((entry ->> 'unit_price')::numeric, 0),
      coalesce((entry ->> 'labor_rate')::numeric, 0),
      coalesce((entry ->> 'labor_rate_empty')::numeric, 0),
      coalesce((entry ->> 'labor_rate_occupied')::numeric, 0),
      coalesce((entry ->> 'sort_order')::integer, 0),
      null, null, null, null, null
    ) returning * into inserted_subitem;

    subitem_map := subitem_map || jsonb_build_object(client_id, inserted_subitem.id);
    inserted_rows := inserted_rows || jsonb_build_array(jsonb_build_object(
      'clientId', client_id,
      'subitem', to_jsonb(inserted_subitem)
    ));
  end loop;

  if p_template_condition is not null then
    if jsonb_typeof(p_template_condition) <> 'object' then
      raise exception 'Atomic Template condition must be an object.' using errcode = '22023';
    end if;
    select * into template_row
    from public.admin_condition_templates
    where company_id = p_company_id
      and pyeong = (p_template_condition ->> 'pyeong')::integer
      and build_type = p_template_condition ->> 'build_type'
      and has_extension = coalesce((p_template_condition ->> 'has_extension')::boolean, false)
      and condition_variant = coalesce(p_template_condition ->> 'condition_variant', '')
    for update;
    if not found then
      insert into public.admin_condition_templates (
        company_id, pyeong, build_type, has_extension, condition_variant
      ) values (
        p_company_id,
        (p_template_condition ->> 'pyeong')::integer,
        p_template_condition ->> 'build_type',
        coalesce((p_template_condition ->> 'has_extension')::boolean, false),
        coalesce(p_template_condition ->> 'condition_variant', '')
      ) returning * into template_row;
      template_created := true;
    end if;
    template_value_rows := public.formate_apply_admin_template_values(
      p_company_id,
      template_row.id,
      coalesce(p_template_values, '[]'::jsonb),
      subitem_map
    );
  elsif jsonb_array_length(coalesce(p_template_values, '[]'::jsonb)) > 0 then
    raise exception 'Template values require one explicit Template condition.' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'ok', true,
    'insertedSubitems', inserted_rows,
    'templateId', template_row.id,
    'templateCreated', template_created,
    'templateValues', template_value_rows
  );
end;
$$;

create or replace function public.create_canonical_variant_product_atomic(
  p_company_id uuid,
  p_construction_item_id uuid,
  p_source_subitem_id uuid,
  p_group jsonb,
  p_variant jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  source_subitem public.construction_subitems%rowtype;
  variant_group public.construction_subitem_variant_groups%rowtype;
  value_type text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to create variants for this company.'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('formate-catalog:' || p_company_id::text, 0));
  select subitem.* into source_subitem
  from public.construction_subitems as subitem
  join public.construction_items as item on item.id = subitem.item_id
  where subitem.id = p_source_subitem_id
    and subitem.item_id = p_construction_item_id
    and item.company_id = p_company_id
  for update of subitem;

  if not found or source_subitem.archived_at is not null then
    raise exception 'Active source subitem was not found in the requested company.' using errcode = 'P0002';
  end if;
  if source_subitem.variant_group_id is not null
    or source_subitem.variant_value is not null
    or source_subitem.variant_value_text is not null
    or source_subitem.variant_unit is not null then
    raise exception 'Only a standard subitem can become the first variant of a product.' using errcode = '23514';
  end if;

  value_type := lower(btrim(coalesce(p_group ->> 'variant_value_type', p_variant ->> 'variant_value_type', '')));
  insert into public.construction_subitem_variant_groups (
    construction_item_id, display_name, variant_kind, variant_value_type, sort_order, archived_at
  ) values (
    p_construction_item_id,
    p_group ->> 'display_name',
    p_group ->> 'variant_kind',
    value_type,
    coalesce((p_group ->> 'sort_order')::integer, 0),
    null
  ) returning * into variant_group;

  if value_type = 'number' then
    update public.construction_subitems
    set
      variant_group_id = variant_group.id,
      variant_value = (p_variant ->> 'value')::numeric,
      variant_value_text = null,
      variant_unit = p_variant ->> 'unit',
      archived_at = null
    where id = source_subitem.id
    returning * into source_subitem;
  elsif value_type = 'text' then
    update public.construction_subitems
    set
      variant_group_id = variant_group.id,
      variant_value = null,
      variant_value_text = p_variant ->> 'value',
      variant_unit = nullif(btrim(coalesce(p_variant ->> 'unit', '')), ''),
      archived_at = null
    where id = source_subitem.id
    returning * into source_subitem;
  else
    raise exception 'Canonical variant value type must be number or text.' using errcode = '23514';
  end if;

  return jsonb_build_object(
    'ok', true,
    'variantGroup', to_jsonb(variant_group),
    'subitem', to_jsonb(source_subitem)
  );
end;
$$;

create or replace function public.initialize_default_construction_catalog_atomic(
  p_company_id uuid,
  p_catalog jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  item_entry jsonb;
  subitem_entry jsonb;
  item_id uuid;
  item_count integer := 0;
  subitem_count integer := 0;
  subitem_sort_order integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to initialize this catalog.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_catalog) <> 'array' then
    raise exception 'Default catalog must be a JSON array.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('formate-catalog:' || p_company_id::text, 0));
  if exists (select 1 from public.construction_items where company_id = p_company_id) then
    return jsonb_build_object('ok', true, 'created', false, 'itemCount', 0, 'subitemCount', 0);
  end if;

  for item_entry in select value from jsonb_array_elements(p_catalog) loop
    if jsonb_typeof(item_entry -> 'subitems') <> 'array' then
      raise exception 'Each default catalog item requires a subitems array.' using errcode = '22023';
    end if;
    insert into public.construction_items (
      company_id, name, item_type, item_kind, is_favorite, sort_order
    ) values (
      p_company_id,
      item_entry ->> 'name',
      coalesce(item_entry ->> 'item_type', 'itemized'),
      coalesce(item_entry ->> 'item_kind', 'standard'),
      coalesce((item_entry ->> 'is_favorite')::boolean, false),
      coalesce((item_entry ->> 'sort_order')::integer, item_count)
    ) returning id into item_id;
    item_count := item_count + 1;
    subitem_sort_order := 0;

    for subitem_entry in select value from jsonb_array_elements(item_entry -> 'subitems') loop
      insert into public.construction_subitems (
        item_id, name, unit, cost_price, cost_unit, unit_price,
        labor_rate, labor_rate_empty, labor_rate_occupied, sort_order,
        variant_group_id, variant_value, variant_value_text, variant_unit, archived_at
      ) values (
        item_id,
        subitem_entry ->> 'name',
        coalesce(nullif(btrim(subitem_entry ->> 'unit'), ''), '평'),
        0, '', 0, 0, 0, 0,
        coalesce((subitem_entry ->> 'sort_order')::integer, subitem_sort_order),
        null, null, null, null, null
      );
      subitem_count := subitem_count + 1;
      subitem_sort_order := subitem_sort_order + 1;
    end loop;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'created', true,
    'itemCount', item_count,
    'subitemCount', subitem_count
  );
end;
$$;

create or replace function public.create_standard_catalog_entries_atomic(
  p_company_id uuid,
  p_entries jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  entry jsonb;
  category_payload jsonb;
  subitem_payload jsonb;
  client_id text;
  category_ref text;
  category_id uuid;
  category_created boolean;
  category_row public.construction_items%rowtype;
  subitem_row public.construction_subitems%rowtype;
  category_map jsonb := '{}'::jsonb;
  seen_clients jsonb := '{}'::jsonb;
  result jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to create catalog entries.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_entries) <> 'array' then
    raise exception 'Catalog create entries must be a JSON array.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('formate-catalog:' || p_company_id::text, 0));
  for entry in select value from jsonb_array_elements(p_entries) loop
    client_id := btrim(coalesce(entry ->> 'client_id', ''));
    category_ref := btrim(coalesce(entry ->> 'category_ref', entry ->> 'category_id', ''));
    category_payload := coalesce(entry -> 'category', '{}'::jsonb);
    subitem_payload := coalesce(entry -> 'subitem', '{}'::jsonb);
    if client_id = '' or seen_clients ? client_id or category_ref = '' then
      raise exception 'Catalog create entry has a missing or duplicate request identity.' using errcode = '22023';
    end if;
    seen_clients := seen_clients || jsonb_build_object(client_id, true);
    category_created := false;

    if entry ? 'category_id' and nullif(entry ->> 'category_id', '') is not null then
      category_id := (entry ->> 'category_id')::uuid;
      update public.construction_items
      set item_type = case
        when category_payload ? 'item_type' then category_payload ->> 'item_type'
        else item_type
      end
      where id = category_id and company_id = p_company_id
      returning * into category_row;
      if not found then
        raise exception 'Existing category escaped company scope.' using errcode = '23514';
      end if;
    elsif category_map ? category_ref then
      category_id := (category_map ->> category_ref)::uuid;
      update public.construction_items
      set item_type = case
        when category_payload ? 'item_type' then category_payload ->> 'item_type'
        else item_type
      end
      where id = category_id and company_id = p_company_id
      returning * into category_row;
      if not found then
        raise exception 'Created category escaped company scope.' using errcode = '23514';
      end if;
    else
      insert into public.construction_items (
        company_id, name, item_type, item_kind, is_favorite, sort_order
      ) values (
        p_company_id,
        category_payload ->> 'name',
        coalesce(category_payload ->> 'item_type', 'itemized'),
        coalesce(category_payload ->> 'item_kind', 'standard'),
        coalesce((category_payload ->> 'is_favorite')::boolean, false),
        coalesce((category_payload ->> 'sort_order')::integer, 0)
      ) returning * into category_row;
      category_id := category_row.id;
      category_map := category_map || jsonb_build_object(category_ref, category_id);
      category_created := true;
    end if;

    if subitem_payload = '{}'::jsonb then
      result := result || jsonb_build_array(jsonb_build_object(
        'clientId', client_id,
        'categoryRef', category_ref,
        'categoryCreated', category_created,
        'category', to_jsonb(category_row),
        'subitem', null
      ));
      continue;
    end if;

    insert into public.construction_subitems (
      item_id, name, unit, cost_price, cost_unit, unit_price,
      labor_rate, labor_rate_empty, labor_rate_occupied, sort_order,
      variant_group_id, variant_value, variant_value_text, variant_unit, archived_at
    ) values (
      category_id,
      subitem_payload ->> 'name',
      coalesce(nullif(btrim(subitem_payload ->> 'unit'), ''), '평'),
      coalesce((subitem_payload ->> 'cost_price')::numeric, 0),
      coalesce(subitem_payload ->> 'cost_unit', ''),
      coalesce((subitem_payload ->> 'unit_price')::numeric, 0),
      coalesce((subitem_payload ->> 'labor_rate')::numeric, 0),
      coalesce((subitem_payload ->> 'labor_rate_empty')::numeric, 0),
      coalesce((subitem_payload ->> 'labor_rate_occupied')::numeric, 0),
      coalesce((subitem_payload ->> 'sort_order')::integer, 0),
      null, null, null, null, null
    ) returning * into subitem_row;

    result := result || jsonb_build_array(jsonb_build_object(
      'clientId', client_id,
      'categoryRef', category_ref,
      'categoryCreated', category_created,
      'category', to_jsonb(category_row),
      'subitem', to_jsonb(subitem_row)
    ));
  end loop;

  return jsonb_build_object('ok', true, 'entries', result);
end;
$$;

create or replace function public.bulk_update_detail_costs_atomic(
  p_company_id uuid,
  p_cost_ids uuid[],
  p_cost numeric
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  expected_count integer := coalesce(cardinality(p_cost_ids), 0);
  affected integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to update detail costs.' using errcode = '42501';
  end if;
  if expected_count = 0 then
    return jsonb_build_object('ok', true, 'updatedCount', 0);
  end if;
  if expected_count <> (
    select count(distinct cost_id.id)
    from unnest(p_cost_ids) as cost_id(id)
  ) then
    raise exception 'Detail cost batch contains duplicate stable IDs.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('formate-detail-cost:' || p_company_id::text, 0));
  update public.detail_cost_categories
  set cost = p_cost
  where company_id = p_company_id
    and id = any(p_cost_ids);
  get diagnostics affected = row_count;
  if affected <> expected_count then
    raise exception 'Detail cost batch escaped company scope.' using errcode = '23514';
  end if;

  return jsonb_build_object('ok', true, 'updatedCount', affected);
end;
$$;

create or replace function public.reorder_admin_catalog_atomic(
  p_company_id uuid,
  p_entries jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  entry jsonb;
  entity_type text;
  affected integer;
  updated_count integer := 0;
  seen jsonb := '{}'::jsonb;
  identity text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to reorder this catalog.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_entries) <> 'array' then
    raise exception 'Catalog reorder entries must be an array.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('formate-catalog:' || p_company_id::text, 0));
  for entry in select value from jsonb_array_elements(p_entries) loop
    entity_type := entry ->> 'entity_type';
    identity := entity_type || ':' || coalesce(entry ->> 'id', '');
    if seen ? identity then
      raise exception 'Catalog reorder contains a duplicate stable ID.' using errcode = '22023';
    end if;
    seen := seen || jsonb_build_object(identity, true);

    if entity_type = 'item' then
      update public.construction_items
      set sort_order = (entry ->> 'sort_order')::integer
      where id = (entry ->> 'id')::uuid and company_id = p_company_id;
    elsif entity_type = 'subitem' then
      update public.construction_subitems as subitem
      set sort_order = (entry ->> 'sort_order')::integer
      from public.construction_items as item
      where subitem.id = (entry ->> 'id')::uuid
        and subitem.item_id = (entry ->> 'item_id')::uuid
        and item.id = subitem.item_id
        and item.company_id = p_company_id;
    elsif entity_type = 'variant_group' then
      update public.construction_subitem_variant_groups as variant_group
      set sort_order = (entry ->> 'sort_order')::integer
      from public.construction_items as item
      where variant_group.id = (entry ->> 'id')::uuid
        and variant_group.construction_item_id = (entry ->> 'item_id')::uuid
        and item.id = variant_group.construction_item_id
        and item.company_id = p_company_id;
    else
      raise exception 'Unsupported catalog reorder entity type.' using errcode = '22023';
    end if;
    get diagnostics affected = row_count;
    if affected <> 1 then
      raise exception 'Catalog reorder stable ID escaped company/item scope.' using errcode = '23514';
    end if;
    updated_count := updated_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'updatedCount', updated_count);
end;
$$;

create or replace function public.reorder_photo_entities_atomic(
  p_company_id uuid,
  p_entity_type text,
  p_ordered_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  expected_count integer := coalesce(cardinality(p_ordered_ids), 0);
  matched_count integer;
  scope_photo public.photos%rowtype;
  scope_folder public.photo_library_folders%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to reorder Photo data.' using errcode = '42501';
  end if;
  if expected_count = 0 then
    return jsonb_build_object('ok', true, 'updatedCount', 0);
  end if;
  if expected_count <> (
    select count(distinct ordered.id)
    from unnest(p_ordered_ids) as ordered(id)
  ) then
    raise exception 'Photo reorder contains duplicate stable IDs.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('formate-photo:' || p_company_id::text, 0));
  if p_entity_type = 'photo' then
    select * into scope_photo from public.photos
    where id = p_ordered_ids[1] and company_id = p_company_id and archived_at is null
    for update;
    if not found then raise exception 'Photo reorder scope was not found.' using errcode = 'P0002'; end if;
    select count(*) into matched_count
    from public.photos as photo
    where photo.id = any(p_ordered_ids)
      and photo.company_id = p_company_id
      and photo.archived_at is null
      and photo.target_type = scope_photo.target_type
      and photo.target_id = scope_photo.target_id
      and photo.pyeong is not distinct from scope_photo.pyeong
      and photo.construction_subitem_id is not distinct from scope_photo.construction_subitem_id
      and photo.sash_catalog_entry_id is not distinct from scope_photo.sash_catalog_entry_id
      and photo.photo_library_folder_id is not distinct from scope_photo.photo_library_folder_id;
    if matched_count <> expected_count then
      raise exception 'Photos from different stable scopes cannot share one reorder write.' using errcode = '23514';
    end if;
    update public.photos as photo
    set sort_order = ordered.ordinality - 1
    from unnest(p_ordered_ids) with ordinality as ordered(id, ordinality)
    where photo.id = ordered.id and photo.company_id = p_company_id;
  elsif p_entity_type = 'folder' then
    select * into scope_folder from public.photo_library_folders
    where id = p_ordered_ids[1] and company_id = p_company_id and archived_at is null
    for update;
    if not found then raise exception 'Folder reorder scope was not found.' using errcode = 'P0002'; end if;
    select count(*) into matched_count
    from public.photo_library_folders as folder
    where folder.id = any(p_ordered_ids)
      and folder.company_id = p_company_id
      and folder.archived_at is null
      and folder.parent_folder_id is not distinct from scope_folder.parent_folder_id;
    if matched_count <> expected_count then
      raise exception 'Folders from different parents cannot share one reorder write.' using errcode = '23514';
    end if;
    update public.photo_library_folders as folder
    set sort_order = ordered.ordinality - 1
    from unnest(p_ordered_ids) with ordinality as ordered(id, ordinality)
    where folder.id = ordered.id and folder.company_id = p_company_id;
  elsif p_entity_type = 'snippet' then
    select count(*) into matched_count
    from public.photo_caption_snippets
    where id = any(p_ordered_ids) and company_id = p_company_id and archived_at is null;
    if matched_count <> expected_count then
      raise exception 'Caption snippet reorder escaped company scope.' using errcode = '23514';
    end if;
    update public.photo_caption_snippets as snippet
    set sort_order = ordered.ordinality - 1
    from unnest(p_ordered_ids) with ordinality as ordered(id, ordinality)
    where snippet.id = ordered.id and snippet.company_id = p_company_id;
  else
    raise exception 'Unsupported Photo reorder entity type.' using errcode = '22023';
  end if;

  return jsonb_build_object('ok', true, 'updatedCount', expected_count);
end;
$$;

create or replace function public.reorder_sash_catalog_entries_atomic(
  p_company_id uuid,
  p_ordered_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  expected_count integer := coalesce(cardinality(p_ordered_ids), 0);
  matched_count integer;
  scope_subitem_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to reorder this sash catalog.' using errcode = '42501';
  end if;
  if expected_count = 0 then
    return jsonb_build_object('ok', true, 'updatedCount', 0);
  end if;
  if expected_count <> (
    select count(distinct ordered.id)
    from unnest(p_ordered_ids) as ordered(id)
  ) then
    raise exception 'Sash reorder contains duplicate stable IDs.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('formate-sash:' || p_company_id::text, 0));
  select sash.construction_subitem_id
  into scope_subitem_id
  from public.sash_catalog_entries as sash
  where sash.id = p_ordered_ids[1]
    and sash.company_id = p_company_id
    and sash.archived_at is null
  for update;
  if not found then
    raise exception 'Active sash reorder scope was not found.' using errcode = 'P0002';
  end if;

  select count(*)
  into matched_count
  from public.sash_catalog_entries as sash
  where sash.id = any(p_ordered_ids)
    and sash.company_id = p_company_id
    and sash.construction_subitem_id = scope_subitem_id
    and sash.archived_at is null;
  if matched_count <> expected_count then
    raise exception 'Sash entries from different stable subitems cannot share one reorder write.'
      using errcode = '23514';
  end if;

  update public.sash_catalog_entries as sash
  set sort_order = ordered.ordinality - 1
  from unnest(p_ordered_ids) with ordinality as ordered(id, ordinality)
  where sash.id = ordered.id
    and sash.company_id = p_company_id;

  return jsonb_build_object('ok', true, 'updatedCount', expected_count);
end;
$$;

create or replace function public.update_photo_captions_atomic(
  p_company_id uuid,
  p_updates jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  entry jsonb;
  photo_row public.photos%rowtype;
  result jsonb := '[]'::jsonb;
  seen jsonb := '{}'::jsonb;
  photo_ref text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to update Photo captions.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_updates) <> 'array' then
    raise exception 'Photo caption updates must be an array.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('formate-photo:' || p_company_id::text, 0));

  for entry in select value from jsonb_array_elements(p_updates) loop
    photo_ref := entry ->> 'photo_id';
    if seen ? photo_ref then
      raise exception 'Photo caption write contains duplicate stable IDs.' using errcode = '22023';
    end if;
    seen := seen || jsonb_build_object(photo_ref, true);
    update public.photos
    set caption = nullif(btrim(coalesce(entry ->> 'caption', '')), '')
    where id = photo_ref::uuid and company_id = p_company_id and archived_at is null
    returning * into photo_row;
    if not found then
      raise exception 'Active Photo caption target was not found in company scope.' using errcode = 'P0002';
    end if;
    result := result || jsonb_build_array(to_jsonb(photo_row));
  end loop;

  return jsonb_build_object('ok', true, 'photos', result);
end;
$$;

-- Storage upload and Postgres cannot share one transaction. The client sends
-- every attempted client-generated UUID here after a batch failure. Existing
-- metadata is archived in one transaction; IDs whose Storage upload failed
-- before metadata creation are intentionally ignored.
create or replace function public.compensate_photo_upload_batch_atomic(
  p_company_id uuid,
  p_photo_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to compensate Photo uploads.' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_photo_ids), 0) = 0 then
    return jsonb_build_object('ok', true, 'photos', '[]'::jsonb);
  end if;
  if cardinality(p_photo_ids) <> (
    select count(distinct photo_id.id)
    from unnest(p_photo_ids) as photo_id(id)
  ) then
    raise exception 'Photo upload compensation contains duplicate stable IDs.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('formate-photo:' || p_company_id::text, 0));
  with updated as (
    update public.photos
    set archived_at = now()
    where company_id = p_company_id
      and id = any(p_photo_ids)
      and archived_at is null
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(updated)), '[]'::jsonb)
  into result
  from updated;

  return jsonb_build_object('ok', true, 'photos', result);
end;
$$;

create or replace function public.move_photo_library_photo_atomic(
  p_company_id uuid,
  p_photo_id uuid,
  p_destination_folder_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  photo_row public.photos%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to move this Photo.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('formate-photo:' || p_company_id::text, 0));
  perform 1
  from public.photo_library_folders
  where id = p_destination_folder_id
    and company_id = p_company_id
    and archived_at is null
  for update;
  if not found then
    raise exception 'Active destination folder was not found in company scope.' using errcode = 'P0002';
  end if;

  update public.photo_library_folders
  set cover_photo_id = null
  where company_id = p_company_id and cover_photo_id = p_photo_id;

  update public.photos
  set
    photo_type = 'photo_library',
    target_type = 'photo_library',
    target_id = p_destination_folder_id,
    collection_id = null,
    pyeong = null,
    construction_subitem_id = null,
    sash_catalog_entry_id = null,
    photo_library_folder_id = p_destination_folder_id
  where id = p_photo_id
    and company_id = p_company_id
    and photo_type = 'photo_library'
    and archived_at is null
  returning * into photo_row;
  if not found then
    raise exception 'Active Photo Library row was not found in company scope.' using errcode = 'P0002';
  end if;

  return jsonb_build_object('ok', true, 'photo', to_jsonb(photo_row));
end;
$$;

revoke all on function public.save_admin_template_atomic(uuid, jsonb, jsonb, text, uuid, uuid) from public, anon;
revoke all on function public.save_estimate_draft_with_template(
  uuid, uuid, uuid, text, date, uuid, jsonb, jsonb, numeric,
  text, text, text, text, text, jsonb, jsonb
) from public, anon;
revoke all on function public.save_admin_catalog_atomic(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.create_canonical_variant_product_atomic(uuid, uuid, uuid, jsonb, jsonb) from public, anon;
revoke all on function public.initialize_default_construction_catalog_atomic(uuid, jsonb) from public, anon;
revoke all on function public.create_standard_catalog_entries_atomic(uuid, jsonb) from public, anon;
revoke all on function public.bulk_update_detail_costs_atomic(uuid, uuid[], numeric) from public, anon;
revoke all on function public.reorder_admin_catalog_atomic(uuid, jsonb) from public, anon;
revoke all on function public.reorder_photo_entities_atomic(uuid, text, uuid[]) from public, anon;
revoke all on function public.reorder_sash_catalog_entries_atomic(uuid, uuid[]) from public, anon;
revoke all on function public.update_photo_captions_atomic(uuid, jsonb) from public, anon;
revoke all on function public.compensate_photo_upload_batch_atomic(uuid, uuid[]) from public, anon;
revoke all on function public.move_photo_library_photo_atomic(uuid, uuid, uuid) from public, anon;

grant execute on function public.save_admin_template_atomic(uuid, jsonb, jsonb, text, uuid, uuid) to authenticated;
grant execute on function public.save_estimate_draft_with_template(
  uuid, uuid, uuid, text, date, uuid, jsonb, jsonb, numeric,
  text, text, text, text, text, jsonb, jsonb
) to authenticated;
grant execute on function public.save_admin_catalog_atomic(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.create_canonical_variant_product_atomic(uuid, uuid, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.initialize_default_construction_catalog_atomic(uuid, jsonb) to authenticated;
grant execute on function public.create_standard_catalog_entries_atomic(uuid, jsonb) to authenticated;
grant execute on function public.bulk_update_detail_costs_atomic(uuid, uuid[], numeric) to authenticated;
grant execute on function public.reorder_admin_catalog_atomic(uuid, jsonb) to authenticated;
grant execute on function public.reorder_photo_entities_atomic(uuid, text, uuid[]) to authenticated;
grant execute on function public.reorder_sash_catalog_entries_atomic(uuid, uuid[]) to authenticated;
grant execute on function public.update_photo_captions_atomic(uuid, jsonb) to authenticated;
grant execute on function public.compensate_photo_upload_batch_atomic(uuid, uuid[]) to authenticated;
grant execute on function public.move_photo_library_photo_atomic(uuid, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
