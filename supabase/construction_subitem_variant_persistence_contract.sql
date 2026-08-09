-- FORMATE generic Product/Variant persistence contract.
-- Review and run manually in the Supabase SQL Editor after
-- construction_subitem_variant_foundation.sql and
-- construction_subitem_variant_base_foundation.sql.
--
-- This migration is additive with respect to business data: it does not infer,
-- rename, convert, archive, or delete any existing row. Existing numeric
-- thickness variants continue to use variant_value + variant_unit unchanged.

begin;

set local client_encoding = 'UTF8';

do $$
begin
  if to_regclass('public.construction_subitem_variant_groups') is null
    or to_regclass('public.construction_subitems') is null then
    raise exception 'Apply the construction subitem variant foundations before this contract.';
  end if;
end
$$;

alter table public.construction_subitem_variant_groups
  add column if not exists variant_value_type text not null default 'number';

alter table public.construction_subitem_variant_groups
  alter column variant_value_type set default 'number',
  alter column variant_value_type set not null;

alter table public.construction_subitems
  add column if not exists variant_value_text text,
  add column if not exists archived_at timestamptz;

-- Stop before changing constraints if the deployed database does not match the
-- audited legacy numeric contract. The surrounding transaction rolls back all
-- preceding DDL on any failure.
do $$
begin
  if exists (
    select 1
    from public.construction_subitem_variant_groups
    where length(btrim(variant_kind)) = 0
  ) then
    raise exception 'Variant group kind must be non-blank before generalization.';
  end if;

  if exists (
    select 1
    from public.construction_subitems
    where not (
      (
        variant_group_id is null
        and variant_value is null
        and variant_value_text is null
        and variant_unit is null
      )
      or
      (
        variant_group_id is not null
        and (
          (
            variant_value is not null
            and variant_value::text not in ('NaN', 'Infinity', '-Infinity')
            and variant_value_text is null
            and variant_unit is not null
            and length(btrim(variant_unit)) > 0
          )
          or
          (
            variant_value is null
            and variant_value_text is not null
            and length(btrim(variant_value_text)) > 0
            and (variant_unit is null or length(btrim(variant_unit)) > 0)
          )
        )
      )
    )
  ) then
    raise exception 'Construction subitem variant metadata is incomplete or ambiguous.';
  end if;

  if exists (
    select 1
    from public.construction_subitems as subitem
    join public.construction_subitem_variant_groups as variant_group
      on variant_group.id = subitem.variant_group_id
      and variant_group.construction_item_id = subitem.item_id
    where
      (
        variant_group.variant_value_type = 'number'
        and (subitem.variant_value is null or subitem.variant_value_text is not null)
      )
      or
      (
        variant_group.variant_value_type = 'text'
        and (subitem.variant_value is not null or subitem.variant_value_text is null)
      )
  ) then
    raise exception 'Variant group value type conflicts with an existing variant row.';
  end if;

  if exists (
    select 1
    from public.construction_subitem_variant_groups
    where base_subitem_id is not null
    group by base_subitem_id
    having count(*) > 1
  ) then
    raise exception 'A base subitem is assigned to more than one variant group.';
  end if;
end
$$;

alter table public.construction_subitem_variant_groups
  alter column variant_kind drop default;

alter table public.construction_subitem_variant_groups
  drop constraint if exists construction_subitem_variant_groups_kind_check;

alter table public.construction_subitem_variant_groups
  add constraint construction_subitem_variant_groups_kind_check
  check (length(btrim(variant_kind)) > 0);

alter table public.construction_subitem_variant_groups
  drop constraint if exists construction_subitem_variant_groups_value_type_check;

alter table public.construction_subitem_variant_groups
  add constraint construction_subitem_variant_groups_value_type_check
  check (variant_value_type in ('number', 'text'));

alter table public.construction_subitems
  drop constraint if exists construction_subitems_variant_metadata_complete_check;

alter table public.construction_subitems
  add constraint construction_subitems_variant_metadata_complete_check
  check (
    (
      variant_group_id is null
      and variant_value is null
      and variant_value_text is null
      and variant_unit is null
    )
    or
    (
      variant_group_id is not null
      and (
        (
          variant_value is not null
          and variant_value::text not in ('NaN', 'Infinity', '-Infinity')
          and variant_value_text is null
          and variant_unit is not null
          and length(btrim(variant_unit)) > 0
        )
        or
        (
          variant_value is null
          and variant_value_text is not null
          and length(btrim(variant_value_text)) > 0
          and (variant_unit is null or length(btrim(variant_unit)) > 0)
        )
      )
    )
  );

create or replace function public.formate_validate_construction_subitem_variant_persistence()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  group_value_type text;
begin
  if new.variant_group_id is null then
    return new;
  end if;

  select variant_group.variant_value_type
  into group_value_type
  from public.construction_subitem_variant_groups as variant_group
  where variant_group.id = new.variant_group_id
    and variant_group.construction_item_id = new.item_id;

  if not found then
    raise exception 'Variant group must belong to the same construction item.'
      using errcode = '23503';
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
  variant_unit
on public.construction_subitems
for each row execute function public.formate_validate_construction_subitem_variant_persistence();

create or replace function public.formate_prevent_variant_group_value_type_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.variant_value_type is distinct from old.variant_value_type
    and exists (
      select 1
      from public.construction_subitems as subitem
      where subitem.variant_group_id = old.id
    ) then
    raise exception 'Variant group value type cannot change while variant rows exist.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_variant_group_value_type_change
  on public.construction_subitem_variant_groups;
create trigger prevent_variant_group_value_type_change
before update of variant_value_type
on public.construction_subitem_variant_groups
for each row execute function public.formate_prevent_variant_group_value_type_change();

-- Active uniqueness permits an archived variant to retain all historical FKs
-- while a replacement construction_subitem receives the same product value.
create unique index if not exists construction_subitems_active_numeric_variant_identity_uidx
  on public.construction_subitems (
    variant_group_id,
    variant_value,
    lower(btrim(variant_unit))
  )
  where variant_group_id is not null
    and variant_value is not null
    and archived_at is null;

create unique index if not exists construction_subitems_active_text_variant_identity_uidx
  on public.construction_subitems (
    variant_group_id,
    lower(btrim(variant_value_text)),
    lower(btrim(coalesce(variant_unit, '')))
  )
  where variant_group_id is not null
    and variant_value_text is not null
    and archived_at is null;

create unique index if not exists construction_subitem_variant_groups_base_subitem_uidx
  on public.construction_subitem_variant_groups (base_subitem_id)
  where base_subitem_id is not null;

create unique index if not exists construction_subitems_active_item_name_uidx
  on public.construction_subitems (item_id, name)
  where archived_at is null;

drop index if exists public.construction_subitems_variant_identity_uidx;
drop index if exists public.construction_subitems_item_name_uidx;

create index if not exists construction_subitems_active_variant_group_order_idx
  on public.construction_subitems (variant_group_id, sort_order, id)
  where variant_group_id is not null
    and archived_at is null;

comment on column public.construction_subitem_variant_groups.variant_kind is
  'User-defined non-blank variant dimension, such as thickness, color, finish, or another company-defined kind. It is not an identity key.';

comment on column public.construction_subitem_variant_groups.variant_value_type is
  'Persistence representation shared by all variants in the group: number preserves the legacy variant_value path; text uses variant_value_text.';

comment on column public.construction_subitems.variant_value is
  'Backward-compatible numeric variant value. Used only when the owning group variant_value_type is number.';

comment on column public.construction_subitems.variant_value_text is
  'Arbitrary user-defined variant value. Used only when the owning group variant_value_type is text.';

comment on column public.construction_subitems.variant_unit is
  'Required for numeric variants and optional for text variants. It is presentation metadata, not entity identity.';

comment on column public.construction_subitems.archived_at is
  'Non-destructive variant or standard-subitem archive timestamp. Existing foreign-key references remain valid.';

notify pgrst, 'reload schema';

commit;
