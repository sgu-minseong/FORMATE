-- FORMATE construction subitem variant metadata foundation.
-- Review and run manually in the Supabase SQL Editor after supabase/schema.sql.
-- This migration is additive and intentionally does not infer metadata from display names.

begin;

set local client_encoding = 'UTF8';

create table if not exists public.construction_subitem_variant_groups (
  id uuid primary key default gen_random_uuid(),
  construction_item_id uuid not null references public.construction_items(id) on delete cascade,
  display_name text not null,
  variant_kind text not null default 'thickness',
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_subitem_variant_groups_item_identity_unique
    unique (id, construction_item_id),
  constraint construction_subitem_variant_groups_display_name_not_blank_check
    check (length(btrim(display_name)) > 0),
  constraint construction_subitem_variant_groups_kind_check
    check (variant_kind in ('thickness'))
);

comment on table public.construction_subitem_variant_groups is
  'Stable product-level grouping for construction subitem variants. Runtime grouping uses id, never display_name parsing.';

comment on column public.construction_subitem_variant_groups.display_name is
  'Presentation label for the grouped product. It is not a runtime identity key.';

comment on column public.construction_subitem_variant_groups.variant_kind is
  'Stable semantic kind for the variant selector. Initial supported kind: thickness.';

alter table public.construction_subitems
  add column if not exists variant_group_id uuid,
  add column if not exists variant_value numeric(12, 4),
  add column if not exists variant_unit text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.construction_subitems'::regclass
      and conname = 'construction_subitems_variant_metadata_complete_check'
  ) then
    alter table public.construction_subitems
      add constraint construction_subitems_variant_metadata_complete_check
      check (
        (
          variant_group_id is null
          and variant_value is null
          and variant_unit is null
        )
        or
        (
          variant_group_id is not null
          and variant_value is not null
          and variant_value > 0
          and variant_unit is not null
          and length(btrim(variant_unit)) > 0
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.construction_subitems'::regclass
      and conname = 'construction_subitems_variant_group_item_fkey'
  ) then
    alter table public.construction_subitems
      add constraint construction_subitems_variant_group_item_fkey
      foreign key (variant_group_id, item_id)
      references public.construction_subitem_variant_groups (id, construction_item_id)
      on delete restrict;
  end if;
end
$$;

comment on column public.construction_subitems.variant_group_id is
  'Stable product group identity for variants. Null keeps the standard subitem path.';

comment on column public.construction_subitems.variant_value is
  'Numeric variant value within variant_group_id, such as 1.8 or 2.2.';

comment on column public.construction_subitems.variant_unit is
  'Explicit variant unit, such as T. Null for standard subitems.';

create index if not exists construction_subitem_variant_groups_item_order_idx
  on public.construction_subitem_variant_groups (
    construction_item_id,
    sort_order,
    created_at
  )
  where archived_at is null;

create index if not exists construction_subitems_variant_group_idx
  on public.construction_subitems (variant_group_id, sort_order)
  where variant_group_id is not null;

create unique index if not exists construction_subitems_variant_identity_uidx
  on public.construction_subitems (
    variant_group_id,
    variant_value,
    lower(btrim(variant_unit))
  )
  where variant_group_id is not null;

drop trigger if exists set_construction_subitem_variant_groups_updated_at
  on public.construction_subitem_variant_groups;
create trigger set_construction_subitem_variant_groups_updated_at
before update on public.construction_subitem_variant_groups
for each row execute function public.set_updated_at();

revoke all on table public.construction_subitem_variant_groups from anon;
grant select, insert, update on table public.construction_subitem_variant_groups to authenticated;
revoke delete on table public.construction_subitem_variant_groups from authenticated;

alter table public.construction_subitem_variant_groups enable row level security;

drop policy if exists "members can manage own construction subitem variant groups"
  on public.construction_subitem_variant_groups;
create policy "members can manage own construction subitem variant groups"
on public.construction_subitem_variant_groups
for all
to authenticated
using (
  exists (
    select 1
    from public.construction_items as construction_item
    join public.company_members as company_member
      on company_member.company_id = construction_item.company_id
    where construction_item.id = construction_subitem_variant_groups.construction_item_id
      and company_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.construction_items as construction_item
    join public.company_members as company_member
      on company_member.company_id = construction_item.company_id
    where construction_item.id = construction_subitem_variant_groups.construction_item_id
      and company_member.user_id = auth.uid()
  )
);

-- Existing rows intentionally remain null. Names and spec_options cannot prove
-- that separate construction_subitems belong to the same physical product.

notify pgrst, 'reload schema';

commit;
