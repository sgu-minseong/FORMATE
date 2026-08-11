-- FORMATE targeted cleanup for obsolete Template option_value metadata.
--
-- DO NOT RUN THIS FILE UNCHANGED.
-- It is intentionally fail-closed until both required inputs in the
-- "DEPLOYMENT INPUT" block are populated from the same live read-only
-- preflight result:
--   1. expected_count: exact count of non-empty option_value rows
--   2. target_ids: every exact admin_condition_template_values.id UUID
--
-- Required deployment order:
--   compatibility bootstrap -> frontend deploy/smoke -> full stability guards
--   -> this targeted cleanup -> post-integrity checker
--
-- This transaction never changes Template/item/subitem identity or Template
-- quantities, labor counts, construction days, timestamps, or other business
-- columns. It does not delete rows. Any disagreement rolls back everything.

begin;

set local client_encoding = 'UTF8';
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create temporary table formate_template_option_cleanup_targets (
  id uuid primary key
) on commit drop;

-- DEPLOYMENT INPUT: replace only the two initial values below with the exact
-- output of the approved live read-only preflight. Empty/default input aborts.
do $deployment_input$
declare
  expected_count bigint := null;
  target_ids uuid[] := array[]::uuid[];
  unique_target_count bigint;
begin
  if expected_count is null or expected_count <= 0 then
    raise exception 'Cleanup expected_count is missing. Run and approve the live read-only preflight first.'
      using errcode = '22023';
  end if;

  if target_ids is null or cardinality(target_ids) = 0 then
    raise exception 'Cleanup target UUIDs are missing. Run and approve the live read-only preflight first.'
      using errcode = '22023';
  end if;

  if exists (select 1 from unnest(target_ids) as target(id) where target.id is null) then
    raise exception 'Cleanup target UUID list cannot contain null.' using errcode = '22023';
  end if;

  select count(distinct target.id)
  into unique_target_count
  from unnest(target_ids) as target(id);

  if cardinality(target_ids) <> expected_count
    or unique_target_count <> expected_count then
    raise exception 'Cleanup UUID count/uniqueness does not match expected_count.'
      using errcode = '22023';
  end if;

  insert into pg_temp.formate_template_option_cleanup_targets (id)
  select target.id
  from unnest(target_ids) as target(id);

  perform set_config(
    'formate.template_option_cleanup_expected_count',
    expected_count::text,
    true
  );
end
$deployment_input$;

do $schema_preflight$
declare
  canonical_index_is_valid boolean;
  canonical_constraint_count integer;
  canonical_guard_count integer;
  timestamp_trigger_count integer;
begin
  if to_regclass('public.admin_condition_template_values') is null then
    raise exception 'Required Template value table is missing.';
  end if;

  select index_row.indisunique and index_row.indisvalid
  into canonical_index_is_valid
  from pg_index as index_row
  where index_row.indexrelid =
    to_regclass('public.admin_condition_template_values_template_subitem_uidx');

  if canonical_index_is_valid is distinct from true then
    raise exception 'Canonical template_id/subitem_id unique index is missing or invalid. Apply full stability guards first.';
  end if;

  if to_regclass('public.admin_condition_template_values_template_subitem_option_uidx') is not null then
    raise exception 'Legacy option_value identity index still exists. Apply full stability guards first.';
  end if;

  select count(*)
  into canonical_constraint_count
  from pg_constraint
  where conrelid = 'public.admin_condition_template_values'::regclass
    and conname = 'admin_condition_template_values_canonical_option_check'
    and contype = 'c';

  if canonical_constraint_count <> 1 then
    raise exception 'Canonical option_value constraint is missing. Apply full stability guards first.';
  end if;

  select count(*)
  into canonical_guard_count
  from pg_trigger
  where tgrelid = 'public.admin_condition_template_values'::regclass
    and tgname = 'validate_admin_template_value_scope'
    and not tgisinternal
    and tgenabled = 'O';

  if canonical_guard_count <> 1 then
    raise exception 'Canonical Template scope trigger is missing or disabled. Apply full stability guards first.';
  end if;

  select count(*)
  into timestamp_trigger_count
  from pg_trigger
  where tgrelid = 'public.admin_condition_template_values'::regclass
    and tgname = 'set_admin_condition_template_values_updated_at'
    and not tgisinternal
    and tgenabled = 'O'
    and tgfoid = to_regprocedure('public.set_updated_at()');

  if timestamp_trigger_count <> 1 then
    raise exception 'Expected Template updated_at trigger is missing, changed, or disabled.';
  end if;
end
$schema_preflight$;

-- ACCESS EXCLUSIVE makes the trigger-disable window race-free. lock_timeout
-- makes a busy production table fail instead of waiting indefinitely.
lock table public.admin_condition_template_values in access exclusive mode nowait;

do $data_preflight$
declare
  expected_count bigint := current_setting(
    'formate.template_option_cleanup_expected_count',
    true
  )::bigint;
  requested_count bigint;
  live_nonempty_count bigint;
  matched_nonempty_count bigint;
begin
  select count(*)
  into requested_count
  from pg_temp.formate_template_option_cleanup_targets;

  select count(*)
  into live_nonempty_count
  from public.admin_condition_template_values
  where option_value <> '';

  select count(*)
  into matched_nonempty_count
  from public.admin_condition_template_values as value
  join pg_temp.formate_template_option_cleanup_targets as target
    on target.id = value.id
  where value.option_value <> '';

  if requested_count <> expected_count
    or live_nonempty_count <> expected_count
    or matched_nonempty_count <> expected_count then
    raise exception 'Live cleanup targets differ from the approved UUID set/expected count.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.admin_condition_template_values
    group by template_id, subitem_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate canonical Template identity exists. Cleanup is unsafe.'
      using errcode = '23514';
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
    raise exception 'Template/item/subitem scope mismatch exists. Cleanup is unsafe.'
      using errcode = '23514';
  end if;
end
$data_preflight$;

-- Snapshot every target column. The post-check compares all columns except the
-- one intentional change (option_value), while updated_at is compared exactly.
create temporary table formate_template_option_cleanup_snapshot
on commit drop
as
select
  value.id,
  value.option_value,
  value.updated_at,
  to_jsonb(value) - 'option_value' - 'updated_at' as immutable_business_data
from public.admin_condition_template_values as value
join pg_temp.formate_template_option_cleanup_targets as target
  on target.id = value.id;

do $targeted_cleanup$
declare
  expected_count bigint := current_setting(
    'formate.template_option_cleanup_expected_count',
    true
  )::bigint;
  affected_count bigint;
begin
  execute 'alter table public.admin_condition_template_values disable trigger set_admin_condition_template_values_updated_at';

  begin
    update public.admin_condition_template_values as value
    set option_value = ''
    from pg_temp.formate_template_option_cleanup_targets as target
    where value.id = target.id
      and value.option_value <> '';

    get diagnostics affected_count = row_count;
    if affected_count <> expected_count then
      raise exception 'Cleanup updated an unexpected number of rows.'
        using errcode = '23514';
    end if;
  exception when others then
    execute 'alter table public.admin_condition_template_values enable trigger set_admin_condition_template_values_updated_at';
    raise;
  end;

  execute 'alter table public.admin_condition_template_values enable trigger set_admin_condition_template_values_updated_at';
end
$targeted_cleanup$;

do $post_cleanup_verification$
declare
  expected_count bigint := current_setting(
    'formate.template_option_cleanup_expected_count',
    true
  )::bigint;
  timestamp_trigger_count integer;
begin
  if (select count(*) from pg_temp.formate_template_option_cleanup_snapshot) <> expected_count then
    raise exception 'Cleanup snapshot count changed unexpectedly.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from pg_temp.formate_template_option_cleanup_snapshot as snapshot
    left join public.admin_condition_template_values as value
      on value.id = snapshot.id
    where value.id is null
      or value.option_value <> ''
      or value.updated_at is distinct from snapshot.updated_at
      or (to_jsonb(value) - 'option_value' - 'updated_at')
        is distinct from snapshot.immutable_business_data
  ) then
    raise exception 'Cleanup changed identity, business values, timestamps, or row existence.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.admin_condition_template_values
    where option_value <> ''
  ) then
    raise exception 'Non-empty legacy option_value rows remain after cleanup.'
      using errcode = '23514';
  end if;

  select count(*)
  into timestamp_trigger_count
  from pg_trigger
  where tgrelid = 'public.admin_condition_template_values'::regclass
    and tgname = 'set_admin_condition_template_values_updated_at'
    and not tgisinternal
    and tgenabled = 'O'
    and tgfoid = to_regprocedure('public.set_updated_at()');

  if timestamp_trigger_count <> 1 then
    raise exception 'Template updated_at trigger was not restored.' using errcode = '23514';
  end if;
end
$post_cleanup_verification$;

alter table public.admin_condition_template_values
  validate constraint admin_condition_template_values_canonical_option_check;

do $constraint_verification$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.admin_condition_template_values'::regclass
      and conname = 'admin_condition_template_values_canonical_option_check'
      and contype = 'c'
      and convalidated
  ) then
    raise exception 'Canonical option_value constraint was not validated.'
      using errcode = '23514';
  end if;
end
$constraint_verification$;

commit;
