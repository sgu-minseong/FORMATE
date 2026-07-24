-- FORMATE photo management foundation.
-- Run this manually in the Supabase SQL Editor.
-- This file creates photo metadata tables and the Supabase Storage bucket used by the app.

create extension if not exists pgcrypto;

create table if not exists public.photo_collections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  photo_type text not null check (photo_type in ('full_project', 'partial_project', 'subitem', 'estimate_progress')),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  photo_type text not null check (photo_type in ('full_project', 'partial_project', 'subitem', 'estimate_progress')),
  collection_id uuid references public.photo_collections(id) on delete cascade,
  target_type text not null check (target_type in ('full_project', 'partial_project', 'subitem', 'estimate_progress')),
  target_id uuid not null,
  storage_bucket text not null default 'formate-photos',
  storage_path text not null unique,
  original_filename text,
  content_type text,
  file_size bigint,
  caption text,
  memo text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists photo_collections_company_type_order_idx
  on public.photo_collections (company_id, photo_type, sort_order);

create index if not exists photos_company_target_order_idx
  on public.photos (company_id, target_type, target_id, sort_order);

create index if not exists photos_collection_order_idx
  on public.photos (collection_id, sort_order);

create unique index if not exists photos_one_primary_per_target_idx
  on public.photos (company_id, target_type, target_id)
  where is_primary;

create or replace function public.formate_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_photo_collections_updated_at on public.photo_collections;
create trigger set_photo_collections_updated_at
before update on public.photo_collections
for each row
execute function public.formate_set_updated_at();

drop trigger if exists set_photos_updated_at on public.photos;
create trigger set_photos_updated_at
before update on public.photos
for each row
execute function public.formate_set_updated_at();

revoke all on public.photo_collections from anon;
revoke all on public.photos from anon;

grant select, insert, update, delete on public.photo_collections to authenticated;
grant select, insert, update, delete on public.photos to authenticated;

drop policy if exists "members can manage own photo collections" on public.photo_collections;
create policy "members can manage own photo collections"
on public.photo_collections
for all
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = photo_collections.company_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = photo_collections.company_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can manage own photos" on public.photos;
create policy "members can manage own photos"
on public.photos
for all
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = photos.company_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id = photos.company_id
      and cm.user_id = auth.uid()
  )
);

alter table public.photo_collections enable row level security;
alter table public.photos enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'formate-photos',
  'formate-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists formate_photos_public_read on storage.objects;
drop policy if exists formate_photos_insert on storage.objects;
drop policy if exists formate_photos_update on storage.objects;
drop policy if exists formate_photos_delete on storage.objects;
drop policy if exists formate_photos_company_read on storage.objects;
drop policy if exists formate_photos_company_insert on storage.objects;
drop policy if exists formate_photos_company_update on storage.objects;
drop policy if exists formate_photos_company_delete on storage.objects;

-- Storage object paths must start with the company id:
-- {company_id}/{target_type}/{target_id}/{photo_id}.{extension}
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'formate_photos_company_read'
  ) then
    create policy formate_photos_company_read
      on storage.objects for select
      to authenticated
      using (
        bucket_id = 'formate-photos'
        and exists (
          select 1
          from public.company_members cm
          where cm.company_id::text = split_part(storage.objects.name, '/', 1)
            and cm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'formate_photos_company_insert'
  ) then
    create policy formate_photos_company_insert
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'formate-photos'
        and exists (
          select 1
          from public.company_members cm
          where cm.company_id::text = split_part(storage.objects.name, '/', 1)
            and cm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'formate_photos_company_update'
  ) then
    create policy formate_photos_company_update
      on storage.objects for update
      to authenticated
      using (
        bucket_id = 'formate-photos'
        and exists (
          select 1
          from public.company_members cm
          where cm.company_id::text = split_part(storage.objects.name, '/', 1)
            and cm.user_id = auth.uid()
        )
      )
      with check (
        bucket_id = 'formate-photos'
        and exists (
          select 1
          from public.company_members cm
          where cm.company_id::text = split_part(storage.objects.name, '/', 1)
            and cm.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'formate_photos_company_delete'
  ) then
    create policy formate_photos_company_delete
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'formate-photos'
        and exists (
          select 1
          from public.company_members cm
          where cm.company_id::text = split_part(storage.objects.name, '/', 1)
            and cm.user_id = auth.uid()
        )
      );
  end if;
end $$;
