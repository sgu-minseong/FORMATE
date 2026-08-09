-- FORMATE operator-company flooring data stabilization, phase 1.
--
-- Scope:
--   1. Detach and delete one user-approved KCC flooring import artifact.
--   2. Backfill the stable construction_subitem_id on three audited legacy photos.
--
-- This migration is UUID-targeted and idempotent. It intentionally does not modify
-- spec_options, template values, estimates, estimate versions, price snapshots,
-- storage objects, or any other construction_subitem.

begin;

set transaction isolation level serializable;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

select pg_advisory_xact_lock(
  hashtextextended('formate:operator-flooring-data-stabilization:phase-1', 0)
);

create temporary table formate_flooring_photo_target (
  photo_id uuid primary key,
  construction_subitem_id uuid not null unique
) on commit drop;

insert into formate_flooring_photo_target (
  photo_id,
  construction_subitem_id
)
values
  (
    'cbb6cb64-f081-4c32-93d0-b4be01d77071',
    'c8de162d-5ceb-49ed-b11e-92297ec64065'
  ),
  (
    'cfe47519-7d11-43f6-adfa-8e5ea459ebf6',
    '2bb31439-1375-44b4-bf9c-ae2d425c6e40'
  ),
  (
    '39df3a65-f070-43fb-b44e-6732112dcd08',
    'f3dfcc51-d57d-4d44-afb8-5b464c4a8b71'
  );

create temporary table formate_kcc_variant_target (
  construction_subitem_id uuid primary key,
  variant_value numeric(12, 4) not null,
  variant_unit text not null
) on commit drop;

insert into formate_kcc_variant_target (
  construction_subitem_id,
  variant_value,
  variant_unit
)
values
  ('f3dfcc51-d57d-4d44-afb8-5b464c4a8b71', 1.8, 'T'),
  ('82932863-f963-44e4-baa7-00cbbda28976', 2.2, 'T'),
  ('1aecdfe4-c170-4244-a97e-623384b6efe9', 2.7, 'T');

create temporary table formate_flooring_stabilization_state on commit drop as
select exists (
  select 1
  from public.construction_subitems
  where id = '03106ba0-31ab-4484-b59a-fbd1db86876b'
) as artifact_existed;

-- Preserve exact before-images for every table that must remain unchanged.
create temporary table formate_before_flooring_subitems on commit drop as
select
  subitem.id,
  to_jsonb(subitem) as row_data
from public.construction_subitems as subitem
where subitem.item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
  and subitem.id <> '03106ba0-31ab-4484-b59a-fbd1db86876b';

create temporary table formate_before_template_values on commit drop as
select
  value.id,
  to_jsonb(value) as row_data
from public.admin_condition_template_values as value
join public.admin_condition_templates as template
  on template.id = value.template_id
where template.company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9';

create temporary table formate_before_estimates on commit drop as
select
  estimate.id,
  to_jsonb(estimate) as row_data
from public.estimates as estimate
where estimate.company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9';

create temporary table formate_before_estimate_versions on commit drop as
select
  estimate_version.id,
  to_jsonb(estimate_version) as row_data
from public.estimate_versions as estimate_version
where estimate_version.company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9';

create temporary table formate_before_price_conditions on commit drop as
select
  price_condition.id,
  to_jsonb(price_condition) as row_data
from public.price_conditions as price_condition
where price_condition.company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9';

create temporary table formate_before_untouched_photos on commit drop as
select
  photo.id,
  to_jsonb(photo) as row_data
from public.photos as photo
where photo.company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9'
  and not exists (
    select 1
    from formate_flooring_photo_target as target
    where target.photo_id = photo.id
  );

create temporary table formate_before_target_photos on commit drop as
select
  photo.id,
  to_jsonb(photo) - 'construction_subitem_id' - 'updated_at' as immutable_data
from public.photos as photo
join formate_flooring_photo_target as target
  on target.photo_id = photo.id;

create temporary table formate_before_untouched_variant_groups on commit drop as
select
  variant_group.id,
  to_jsonb(variant_group) as row_data
from public.construction_subitem_variant_groups as variant_group
where variant_group.construction_item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
  and variant_group.id <> 'bf01288f-3f06-40c6-a07f-37f4c58505bb';

create temporary table formate_before_kcc_group on commit drop as
select
  variant_group.id,
  to_jsonb(variant_group) - 'base_subitem_id' - 'updated_at' as immutable_data
from public.construction_subitem_variant_groups as variant_group
where variant_group.id = 'bf01288f-3f06-40c6-a07f-37f4c58505bb';

do $$
declare
  artifact_exists boolean;
  expected_flooring_subitem_count integer;
  foreign_key_count integer;
begin
  select artifact_existed
  into artifact_exists
  from formate_flooring_stabilization_state;

  expected_flooring_subitem_count := case when artifact_exists then 32 else 31 end;

  if not exists (
    select 1
    from public.construction_items
    where id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
      and company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9'
      and name = '바닥'
  ) then
    raise exception 'The audited flooring item/company identity no longer matches.';
  end if;

  select count(*)
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
    raise exception 'The construction_subitems reference graph changed after the audit.';
  end if;

  if artifact_exists and not exists (
    select 1
    from public.construction_subitems
    where id = '03106ba0-31ab-4484-b59a-fbd1db86876b'
      and item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
      and name = 'KCC장판 (1.8, 2.0, 2.2, 2.7, 3.2, 4.5, 7, 9, 12)'
      and unit = '평'
      and unit_price = 3005000
      and labor_rate = 10000
      and labor_rate_empty = 10000
      and labor_rate_occupied = 15000
      and cost_price = 0
      and variant_group_id is null
      and variant_value is null
      and variant_unit is null
  ) then
    raise exception 'The approved KCC artifact changed after the audit.';
  end if;

  if not exists (
    select 1
    from public.construction_subitem_variant_groups as variant_group
    join public.construction_items as item
      on item.id = variant_group.construction_item_id
    where variant_group.id = 'bf01288f-3f06-40c6-a07f-37f4c58505bb'
      and variant_group.construction_item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
      and item.company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9'
      and variant_group.display_name = 'KCC장판'
      and variant_group.variant_kind = 'thickness'
      and variant_group.archived_at is null
      and (
        (
          artifact_exists
          and variant_group.base_subitem_id = '03106ba0-31ab-4484-b59a-fbd1db86876b'
        )
        or (
          not artifact_exists
          and variant_group.base_subitem_id is null
        )
      )
  ) then
    raise exception 'The KCC variant group/base relationship no longer matches.';
  end if;

  if artifact_exists and (
    (select count(*) from public.construction_subitem_variant_groups where base_subitem_id = '03106ba0-31ab-4484-b59a-fbd1db86876b') <> 1
    or exists (select 1 from public.admin_condition_template_values where subitem_id = '03106ba0-31ab-4484-b59a-fbd1db86876b')
    or exists (select 1 from public.subitem_pyeong_values where subitem_id = '03106ba0-31ab-4484-b59a-fbd1db86876b')
    or exists (select 1 from public.detail_cost_categories where subitem_id = '03106ba0-31ab-4484-b59a-fbd1db86876b')
    or exists (select 1 from public.photos where construction_subitem_id = '03106ba0-31ab-4484-b59a-fbd1db86876b')
    or exists (select 1 from public.photos where target_type = 'subitem' and target_id = '03106ba0-31ab-4484-b59a-fbd1db86876b')
    or exists (select 1 from public.sash_catalog_entries where construction_subitem_id = '03106ba0-31ab-4484-b59a-fbd1db86876b')
    or exists (select 1 from public.estimates where position('03106ba0-31ab-4484-b59a-fbd1db86876b' in items_data::text) > 0)
    or exists (select 1 from public.estimate_versions where position('03106ba0-31ab-4484-b59a-fbd1db86876b' in items_snapshot::text) > 0)
    or exists (select 1 from public.price_conditions where position('03106ba0-31ab-4484-b59a-fbd1db86876b' in saved_items_snapshot::text) > 0)
  ) then
    raise exception 'The approved KCC artifact gained an unexpected reference.';
  end if;

  if (
    select count(*)
    from public.construction_subitems
    where variant_group_id = 'bf01288f-3f06-40c6-a07f-37f4c58505bb'
  ) <> 3
    or exists (
      select 1
      from formate_kcc_variant_target as target
      left join public.construction_subitems as subitem
        on subitem.id = target.construction_subitem_id
      where subitem.id is null
        or subitem.item_id <> '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
        or subitem.variant_group_id <> 'bf01288f-3f06-40c6-a07f-37f4c58505bb'
        or subitem.variant_value <> target.variant_value
        or lower(trim(subitem.variant_unit)) <> lower(trim(target.variant_unit))
    )
  then
    raise exception 'The canonical KCC variant membership changed after the audit.';
  end if;

  if (
    select count(*)
    from public.construction_subitems
    where item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
  ) <> expected_flooring_subitem_count
    or (
      select count(*)
      from public.construction_subitem_variant_groups
      where construction_item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
        and archived_at is null
    ) <> 6
    or (
      select count(*)
      from public.construction_subitems
      where item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
        and variant_group_id is not null
    ) <> 16
    or exists (
      select 1
      from public.construction_subitems
      where item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
        and num_nonnulls(variant_group_id, variant_value, variant_unit) not in (0, 3)
    )
    or exists (
      select 1
      from public.construction_subitems
      where item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
        and variant_group_id is not null
      group by variant_group_id, variant_value, lower(trim(variant_unit))
      having count(*) > 1
    )
  then
    raise exception 'The flooring variant integrity baseline changed after the audit.';
  end if;

  if (
    select count(*)
    from formate_flooring_photo_target as target
    join public.photos as photo
      on photo.id = target.photo_id
    join public.construction_subitems as subitem
      on subitem.id = target.construction_subitem_id
    join public.construction_items as item
      on item.id = subitem.item_id
    where photo.company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9'
      and photo.photo_type = 'subitem'
      and photo.target_type = 'subitem'
      and photo.target_id = target.construction_subitem_id
      and photo.archived_at is null
      and (
        photo.construction_subitem_id is null
        or photo.construction_subitem_id = target.construction_subitem_id
      )
      and photo.storage_path like concat(
        'd2f1dd95-2226-4b7a-9068-921c002f90f9/subitem/',
        target.construction_subitem_id::text,
        '/',
        target.photo_id::text,
        '.%'
      )
      and subitem.item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
      and item.company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9'
  ) <> 3 then
    raise exception 'A targeted legacy photo no longer matches its audited subitem scope.';
  end if;
end
$$;

update public.construction_subitem_variant_groups
set base_subitem_id = null
where id = 'bf01288f-3f06-40c6-a07f-37f4c58505bb'
  and base_subitem_id = '03106ba0-31ab-4484-b59a-fbd1db86876b';

update public.photos as photo
set construction_subitem_id = target.construction_subitem_id
from formate_flooring_photo_target as target
where photo.id = target.photo_id
  and photo.construction_subitem_id is null;

delete from public.construction_subitems
where id = '03106ba0-31ab-4484-b59a-fbd1db86876b';

do $$
begin
  if exists (
    select 1
    from public.construction_subitems
    where id = '03106ba0-31ab-4484-b59a-fbd1db86876b'
  ) then
    raise exception 'The approved KCC artifact was not removed.';
  end if;

  if not exists (
    select 1
    from public.construction_subitem_variant_groups
    where id = 'bf01288f-3f06-40c6-a07f-37f4c58505bb'
      and base_subitem_id is null
      and construction_item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
      and display_name = 'KCC장판'
      and variant_kind = 'thickness'
      and archived_at is null
  ) then
    raise exception 'The KCC group was not safely detached from the artifact.';
  end if;

  if (
    select count(*)
    from formate_flooring_photo_target as target
    join public.photos as photo
      on photo.id = target.photo_id
     and photo.construction_subitem_id = target.construction_subitem_id
     and photo.target_type = 'subitem'
     and photo.target_id = target.construction_subitem_id
     and photo.company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9'
  ) <> 3 then
    raise exception 'The three legacy photos were not backfilled exactly.';
  end if;

  if (
    select count(*)
    from public.construction_subitems
    where item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
  ) <> 31
    or (
      select count(*)
      from public.construction_subitem_variant_groups
      where construction_item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
        and archived_at is null
    ) <> 6
    or (
      select count(*)
      from public.construction_subitems
      where item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
        and variant_group_id is not null
    ) <> 16
    or exists (
      select 1
      from public.construction_subitems
      where item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
        and num_nonnulls(variant_group_id, variant_value, variant_unit) not in (0, 3)
    )
    or exists (
      select 1
      from public.construction_subitems
      where item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
        and variant_group_id is not null
      group by variant_group_id, variant_value, lower(trim(variant_unit))
      having count(*) > 1
    )
  then
    raise exception 'Post-migration flooring variant integrity verification failed.';
  end if;

  if exists (
    select 1
    from formate_before_flooring_subitems as before_row
    full join (
      select subitem.id, to_jsonb(subitem) as row_data
      from public.construction_subitems as subitem
      where subitem.item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
        and subitem.id <> '03106ba0-31ab-4484-b59a-fbd1db86876b'
    ) as after_row using (id)
    where before_row.id is null
      or after_row.id is null
      or before_row.row_data is distinct from after_row.row_data
  ) then
    raise exception 'A non-target flooring subitem changed.';
  end if;

  if exists (
    select 1
    from formate_before_template_values as before_row
    full join (
      select value.id, to_jsonb(value) as row_data
      from public.admin_condition_template_values as value
      join public.admin_condition_templates as template
        on template.id = value.template_id
      where template.company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9'
    ) as after_row using (id)
    where before_row.id is null
      or after_row.id is null
      or before_row.row_data is distinct from after_row.row_data
  ) then
    raise exception 'An operator template value changed.';
  end if;

  if exists (
    select 1
    from formate_before_estimates as before_row
    full join (
      select estimate.id, to_jsonb(estimate) as row_data
      from public.estimates as estimate
      where estimate.company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9'
    ) as after_row using (id)
    where before_row.id is null
      or after_row.id is null
      or before_row.row_data is distinct from after_row.row_data
  ) then
    raise exception 'A saved estimate changed.';
  end if;

  if exists (
    select 1
    from formate_before_estimate_versions as before_row
    full join (
      select estimate_version.id, to_jsonb(estimate_version) as row_data
      from public.estimate_versions as estimate_version
      where estimate_version.company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9'
    ) as after_row using (id)
    where before_row.id is null
      or after_row.id is null
      or before_row.row_data is distinct from after_row.row_data
  ) then
    raise exception 'An estimate version snapshot changed.';
  end if;

  if exists (
    select 1
    from formate_before_price_conditions as before_row
    full join (
      select price_condition.id, to_jsonb(price_condition) as row_data
      from public.price_conditions as price_condition
      where price_condition.company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9'
    ) as after_row using (id)
    where before_row.id is null
      or after_row.id is null
      or before_row.row_data is distinct from after_row.row_data
  ) then
    raise exception 'A price condition snapshot changed.';
  end if;

  if exists (
    select 1
    from formate_before_untouched_photos as before_row
    full join (
      select photo.id, to_jsonb(photo) as row_data
      from public.photos as photo
      where photo.company_id = 'd2f1dd95-2226-4b7a-9068-921c002f90f9'
        and not exists (
          select 1
          from formate_flooring_photo_target as target
          where target.photo_id = photo.id
        )
    ) as after_row using (id)
    where before_row.id is null
      or after_row.id is null
      or before_row.row_data is distinct from after_row.row_data
  ) then
    raise exception 'A non-target photo changed.';
  end if;

  if exists (
    select 1
    from formate_before_target_photos as before_row
    full join (
      select
        photo.id,
        to_jsonb(photo) - 'construction_subitem_id' - 'updated_at' as immutable_data
      from public.photos as photo
      join formate_flooring_photo_target as target
        on target.photo_id = photo.id
    ) as after_row using (id)
    where before_row.id is null
      or after_row.id is null
      or before_row.immutable_data is distinct from after_row.immutable_data
  ) then
    raise exception 'A targeted photo field outside the direct FK changed.';
  end if;

  if exists (
    select 1
    from formate_before_untouched_variant_groups as before_row
    full join (
      select variant_group.id, to_jsonb(variant_group) as row_data
      from public.construction_subitem_variant_groups as variant_group
      where variant_group.construction_item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
        and variant_group.id <> 'bf01288f-3f06-40c6-a07f-37f4c58505bb'
    ) as after_row using (id)
    where before_row.id is null
      or after_row.id is null
      or before_row.row_data is distinct from after_row.row_data
  ) then
    raise exception 'A non-target variant group changed.';
  end if;

  if exists (
    select 1
    from formate_before_kcc_group as before_row
    full join (
      select
        variant_group.id,
        to_jsonb(variant_group) - 'base_subitem_id' - 'updated_at' as immutable_data
      from public.construction_subitem_variant_groups as variant_group
      where variant_group.id = 'bf01288f-3f06-40c6-a07f-37f4c58505bb'
    ) as after_row using (id)
    where before_row.id is null
      or after_row.id is null
      or before_row.immutable_data is distinct from after_row.immutable_data
  ) then
    raise exception 'A KCC group field outside the approved base relationship changed.';
  end if;
end
$$;

select
  (select artifact_existed from formate_flooring_stabilization_state) as artifact_existed_before,
  not exists (
    select 1
    from public.construction_subitems
    where id = '03106ba0-31ab-4484-b59a-fbd1db86876b'
  ) as artifact_absent_after,
  (
    select base_subitem_id is null
    from public.construction_subitem_variant_groups
    where id = 'bf01288f-3f06-40c6-a07f-37f4c58505bb'
  ) as kcc_base_detached,
  (
    select count(*)
    from formate_flooring_photo_target as target
    join public.photos as photo
      on photo.id = target.photo_id
     and photo.construction_subitem_id = target.construction_subitem_id
  ) as photos_backfilled,
  (
    select count(*)
    from public.construction_subitems
    where item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
  ) as flooring_subitem_count_after,
  (
    select count(*)
    from public.construction_subitems
    where item_id = '7c4b32ab-dba7-4f27-ad23-23f4d0f0bed2'
      and variant_group_id is not null
  ) as flooring_variant_count_after;

commit;
