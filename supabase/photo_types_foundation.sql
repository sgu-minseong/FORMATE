-- FORMATE photo type management foundation.
-- Run this file manually in the Supabase SQL Editor before deploying the matching UI.
-- Existing photo collections, photos, and Storage objects are preserved.

begin;

set local client_encoding = 'UTF8';

create extension if not exists pgcrypto;

create table if not exists public.photo_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  storage_key text not null,
  stable_kind text not null check (stable_kind in ('whole', 'partial', 'detail', 'progress', 'custom')),
  display_name text not null check (length(btrim(display_name)) > 0),
  sort_order integer not null default 0,
  is_system boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photo_types_company_storage_key_key unique (company_id, storage_key),
  constraint photo_types_storage_key_shape_check check (
    (stable_kind = 'whole' and storage_key = 'full_project' and is_system)
    or (stable_kind = 'partial' and storage_key = 'partial_project' and is_system)
    or (stable_kind = 'detail' and storage_key = 'subitem' and is_system)
    or (stable_kind = 'progress' and storage_key = 'estimate_progress' and is_system)
    or (
      stable_kind = 'custom'
      and not is_system
      and storage_key ~ '^custom_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )
  )
);

create unique index if not exists photo_types_company_system_kind_idx
  on public.photo_types (company_id, stable_kind)
  where is_system;

create index if not exists photo_types_company_order_idx
  on public.photo_types (company_id, sort_order, created_at)
  where archived_at is null;

insert into public.photo_types (
  company_id,
  storage_key,
  stable_kind,
  display_name,
  sort_order,
  is_system
)
select
  companies.id,
  defaults.storage_key,
  defaults.stable_kind,
  defaults.display_name,
  defaults.sort_order,
  true
from public.companies
cross join (
  values
    ('full_project', 'whole', U&'\C62C\ACF5\C0AC', 0), -- 올공사
    ('partial_project', 'partial', U&'\BD80\BD84\ACF5\C0AC', 1), -- 부분공사
    ('subitem', 'detail', U&'\C138\BD80\D56D\BAA9', 2), -- 세부항목
    ('estimate_progress', 'progress', U&'\ACAC\C801 \C9C4\D589 \C0AC\C9C4', 90) -- 견적 진행 사진
) as defaults(storage_key, stable_kind, display_name, sort_order)
on conflict (company_id, storage_key) do nothing;

create or replace function public.formate_seed_company_photo_types()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.photo_types (
    company_id,
    storage_key,
    stable_kind,
    display_name,
    sort_order,
    is_system
  )
  values
    (new.id, 'full_project', 'whole', U&'\C62C\ACF5\C0AC', 0, true), -- 올공사
    (new.id, 'partial_project', 'partial', U&'\BD80\BD84\ACF5\C0AC', 1, true), -- 부분공사
    (new.id, 'subitem', 'detail', U&'\C138\BD80\D56D\BAA9', 2, true), -- 세부항목
    (new.id, 'estimate_progress', 'progress', U&'\ACAC\C801 \C9C4\D589 \C0AC\C9C4', 90, true) -- 견적 진행 사진
  on conflict (company_id, storage_key) do nothing;

  return new;
end;
$$;

drop trigger if exists seed_company_photo_types on public.companies;
create trigger seed_company_photo_types
after insert on public.companies
for each row
execute function public.formate_seed_company_photo_types();

create or replace function public.formate_prevent_system_photo_type_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.is_system then
    raise exception 'System photo types must be archived instead of deleted.'
      using errcode = '23514';
  end if;

  return old;
end;
$$;

drop trigger if exists prevent_system_photo_type_delete on public.photo_types;
create trigger prevent_system_photo_type_delete
before delete on public.photo_types
for each row
execute function public.formate_prevent_system_photo_type_delete();

create or replace function public.formate_set_photo_type_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_photo_types_updated_at on public.photo_types;
create trigger set_photo_types_updated_at
before update on public.photo_types
for each row
execute function public.formate_set_photo_type_updated_at();

alter table public.photo_collections
  drop constraint if exists photo_collections_photo_type_check;

alter table public.photos
  drop constraint if exists photos_photo_type_check;

alter table public.photos
  drop constraint if exists photos_target_type_check;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photo_collections'::regclass
      and conname = 'photo_collections_photo_type_supported_check'
  ) then
    alter table public.photo_collections
      add constraint photo_collections_photo_type_supported_check
      check (
        photo_type in ('full_project', 'partial_project', 'subitem', 'estimate_progress')
        or photo_type ~ '^custom_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photos'::regclass
      and conname = 'photos_photo_type_supported_check'
  ) then
    alter table public.photos
      add constraint photos_photo_type_supported_check
      check (
        photo_type in ('full_project', 'partial_project', 'subitem', 'estimate_progress')
        or photo_type ~ '^custom_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photos'::regclass
      and conname = 'photos_target_type_supported_check'
  ) then
    alter table public.photos
      add constraint photos_target_type_supported_check
      check (
        target_type in ('full_project', 'partial_project', 'subitem', 'estimate_progress')
        or target_type ~ '^custom_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photo_collections'::regclass
      and conname = 'photo_collections_company_photo_type_fkey'
  ) then
    alter table public.photo_collections
      add constraint photo_collections_company_photo_type_fkey
      foreign key (company_id, photo_type)
      references public.photo_types(company_id, storage_key)
      on update cascade
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photos'::regclass
      and conname = 'photos_company_photo_type_fkey'
  ) then
    alter table public.photos
      add constraint photos_company_photo_type_fkey
      foreign key (company_id, photo_type)
      references public.photo_types(company_id, storage_key)
      on update cascade
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photos'::regclass
      and conname = 'photos_company_target_type_fkey'
  ) then
    alter table public.photos
      add constraint photos_company_target_type_fkey
      foreign key (company_id, target_type)
      references public.photo_types(company_id, storage_key)
      on update cascade
      on delete restrict;
  end if;
end $$;

revoke all on public.photo_types from anon;
grant select, insert, update, delete on public.photo_types to authenticated;

drop policy if exists "members can manage own photo types" on public.photo_types;
create policy "members can manage own photo types"
on public.photo_types
for all
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = photo_types.company_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = photo_types.company_id
      and cm.user_id = auth.uid()
  )
);

alter table public.photo_types enable row level security;

commit;
