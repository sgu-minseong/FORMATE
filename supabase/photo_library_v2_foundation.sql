-- FORMATE Photo System v2 foundation.
-- Review and run manually in the Supabase SQL Editor after photo_management.sql,
-- photo_types_foundation.sql, and sash_catalog_foundation.sql.
-- This migration is additive. It does not delete or relocate existing photo rows,
-- legacy price collections, or Storage objects.

begin;

set local client_encoding = 'UTF8';

-- Reuse the applied photo_types system for an internal, stable Photo Library type.
-- Current UI deliberately excludes stable_kind = library until the v2 UI is built.
alter table public.photo_types
  drop constraint if exists photo_types_storage_key_shape_check;

alter table public.photo_types
  add constraint photo_types_storage_key_shape_check
  check (
    (stable_kind = 'whole' and storage_key = 'full_project' and is_system)
    or (stable_kind = 'partial' and storage_key = 'partial_project' and is_system)
    or (stable_kind = 'detail' and storage_key = 'subitem' and is_system)
    or (stable_kind = 'progress' and storage_key = 'estimate_progress' and is_system)
    or (stable_kind = 'library' and storage_key = 'photo_library' and is_system)
    or (
      stable_kind = 'custom'
      and not is_system
      and storage_key ~ '^custom_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    )
  );

alter table public.photo_types
  drop constraint if exists photo_types_stable_kind_check;

alter table public.photo_types
  add constraint photo_types_stable_kind_check
  check (stable_kind in ('whole', 'partial', 'detail', 'progress', 'library', 'custom'));

insert into public.photo_types (
  company_id,
  storage_key,
  stable_kind,
  display_name,
  sort_order,
  is_system
)
select
  company.id,
  'photo_library',
  'library',
  U&'\C0AC\C9C4 \B77C\C774\BE0C\B7EC\B9AC',
  80,
  true
from public.companies as company
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
    (new.id, 'full_project', 'whole', U&'\C62C\ACF5\C0AC', 0, true),
    (new.id, 'partial_project', 'partial', U&'\BD80\BD84\ACF5\C0AC', 1, true),
    (new.id, 'subitem', 'detail', U&'\C138\BD80\D56D\BAA9', 2, true),
    (new.id, 'photo_library', 'library', U&'\C0AC\C9C4 \B77C\C774\BE0C\B7EC\B9AC', 80, true),
    (new.id, 'estimate_progress', 'progress', U&'\ACAC\C801 \C9C4\D589 \C0AC\C9C4', 90, true)
  on conflict (company_id, storage_key) do nothing;

  return new;
end;
$$;

alter table public.photos
  drop constraint if exists photos_photo_type_supported_check;

alter table public.photos
  add constraint photos_photo_type_supported_check
  check (
    photo_type in ('full_project', 'partial_project', 'subitem', 'estimate_progress', 'photo_library')
    or photo_type ~ '^custom_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

alter table public.photos
  drop constraint if exists photos_target_type_supported_check;

alter table public.photos
  add constraint photos_target_type_supported_check
  check (
    target_type in ('full_project', 'partial_project', 'subitem', 'estimate_progress', 'photo_library')
    or target_type ~ '^custom_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

-- Free-form company library folders. A root folder has parent_folder_id = null.
-- Archive contract: archiving a folder does not cascade to descendants or photos.
-- Future library, recent, and search APIs must exclude resources in an archived
-- folder or under any archived ancestor.
create table if not exists public.photo_library_folders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_folder_id uuid,
  name text not null check (length(btrim(name)) > 0),
  sort_order integer not null default 0,
  cover_photo_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photo_library_folders_parent_folder_fkey
    foreign key (parent_folder_id)
    references public.photo_library_folders(id)
    on delete set null,
  constraint photo_library_folders_cover_photo_fkey
    foreign key (cover_photo_id)
    references public.photos(id)
    on delete set null
);

-- Existing and new photos retain the applied photo_type/target_type/target_id contract.
-- Library rows use the internal photo_library stable type and target their Folder id.
alter table public.photos
  add column if not exists archived_at timestamptz,
  add column if not exists pyeong integer,
  add column if not exists construction_subitem_id uuid,
  add column if not exists sash_catalog_entry_id uuid,
  add column if not exists photo_library_folder_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photos'::regclass
      and conname = 'photos_pyeong_range_check'
  ) then
    alter table public.photos
      add constraint photos_pyeong_range_check
      check (pyeong is null or pyeong > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photos'::regclass
      and conname = 'photos_library_folder_target_check'
  ) then
    alter table public.photos
      add constraint photos_library_folder_target_check
      check (
        (
          photo_library_folder_id is null
        )
        or (
          photo_library_folder_id is not null
          and photo_type = 'photo_library'
          and target_type = 'photo_library'
          and target_id = photo_library_folder_id
          and collection_id is null
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photos'::regclass
      and conname = 'photos_subitem_scope_check'
  ) then
    alter table public.photos
      add constraint photos_subitem_scope_check
      check (
        construction_subitem_id is null
        or (
          photo_library_folder_id is null
          and target_type = 'subitem'
          and target_id = construction_subitem_id
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photos'::regclass
      and conname = 'photos_pyeong_requires_subitem_check'
  ) then
    alter table public.photos
      add constraint photos_pyeong_requires_subitem_check
      check (pyeong is null or construction_subitem_id is not null);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photos'::regclass
      and conname = 'photos_construction_subitem_fkey'
  ) then
    alter table public.photos
      add constraint photos_construction_subitem_fkey
      foreign key (construction_subitem_id)
      references public.construction_subitems(id)
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photos'::regclass
      and conname = 'photos_sash_catalog_entry_fkey'
  ) then
    alter table public.photos
      add constraint photos_sash_catalog_entry_fkey
      foreign key (sash_catalog_entry_id)
      references public.sash_catalog_entries(id)
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.photos'::regclass
      and conname = 'photos_photo_library_folder_fkey'
  ) then
    alter table public.photos
      add constraint photos_photo_library_folder_fkey
      foreign key (photo_library_folder_id)
      references public.photo_library_folders(id)
      on delete set null;
  end if;
end
$$;

-- caption already exists on photos and is the single nullable Photo v2 description.
comment on column public.photos.caption is
  'Photo v2 description/caption. Shared by photo management, explorer, estimate drawer, and viewer.';
comment on column public.photos.pyeong is
  'Optional pyeong scope for subitem photos. Null means not pyeong-specific.';
comment on column public.photos.construction_subitem_id is
  'Stable subitem scope for Photo v2. Flooring variants use their own stable construction_subitems id.';
comment on column public.photos.sash_catalog_entry_id is
  'Optional stable sash specification reference for future sash photo selection.';
comment on column public.photos.photo_library_folder_id is
  'Free-form Photo Library folder. Library rows use the stable photo_library type and target this folder id.';

-- Company-scoped reusable description snippets.
create table if not exists public.photo_caption_snippets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  content text not null check (length(btrim(content)) > 0),
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Folder tree, recent photos, and pyeong/subitem photo reads.
create index if not exists photo_library_folders_company_parent_order_idx
  on public.photo_library_folders (company_id, parent_folder_id, sort_order, created_at)
  where archived_at is null;

create unique index if not exists photo_library_folders_company_root_name_active_uidx
  on public.photo_library_folders (company_id, lower(btrim(name)))
  where archived_at is null and parent_folder_id is null;

create unique index if not exists photo_library_folders_company_child_name_active_uidx
  on public.photo_library_folders (company_id, parent_folder_id, lower(btrim(name)))
  where archived_at is null and parent_folder_id is not null;

create index if not exists photos_company_library_folder_order_idx
  on public.photos (company_id, photo_library_folder_id, sort_order, created_at)
  where archived_at is null and photo_library_folder_id is not null;

create index if not exists photos_company_pyeong_subitem_order_idx
  on public.photos (company_id, pyeong, construction_subitem_id, sash_catalog_entry_id, sort_order, created_at)
  where archived_at is null and construction_subitem_id is not null;

create index if not exists photos_company_recent_created_at_idx
  on public.photos (company_id, created_at desc)
  where archived_at is null;

create index if not exists photo_caption_snippets_company_order_idx
  on public.photo_caption_snippets (company_id, sort_order, created_at)
  where archived_at is null;

create unique index if not exists photo_caption_snippets_company_content_active_uidx
  on public.photo_caption_snippets (company_id, lower(btrim(content)))
  where archived_at is null;

-- Folder parent, cover, subitem, sash, and library-photo references must remain
-- in the same company. The recursive check blocks moving a folder into itself or
-- any descendant without requiring a separate root row.
create or replace function public.formate_validate_photo_library_folder_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  parent_company_id uuid;
  cover_company_id uuid;
  cover_folder_id uuid;
begin
  if new.parent_folder_id is not null then
    select folder.company_id
    into parent_company_id
    from public.photo_library_folders as folder
    where folder.id = new.parent_folder_id;

    if not found or parent_company_id is distinct from new.company_id then
      raise exception 'Photo Library parent folder must belong to the same company.'
        using errcode = '23514';
    end if;

    if new.parent_folder_id = new.id then
      raise exception 'A Photo Library folder cannot be its own parent.'
        using errcode = '23514';
    end if;

    if exists (
      with recursive ancestors(id, parent_folder_id) as (
        select folder.id, folder.parent_folder_id
        from public.photo_library_folders as folder
        where folder.id = new.parent_folder_id
        union
        select folder.id, folder.parent_folder_id
        from public.photo_library_folders as folder
        join ancestors on folder.id = ancestors.parent_folder_id
      )
      select 1 from ancestors where id = new.id
    ) then
      raise exception 'A Photo Library folder cannot be moved into its descendant.'
        using errcode = '23514';
    end if;
  end if;

  if new.cover_photo_id is not null then
    select photo.company_id, photo.photo_library_folder_id
    into cover_company_id, cover_folder_id
    from public.photos as photo
    where photo.id = new.cover_photo_id;

    if not found
      or cover_company_id is distinct from new.company_id
      or cover_folder_id is distinct from new.id then
      raise exception 'Photo Library cover must be an image in the same folder and company.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

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

  if new.photo_library_folder_id is not null then
    select folder.company_id
    into folder_company_id
    from public.photo_library_folders as folder
    where folder.id = new.photo_library_folder_id;

    if not found or folder_company_id is distinct from new.company_id then
      raise exception 'Photo Library image must belong to the same company as its folder.'
        using errcode = '23514';
    end if;
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

-- Archived photos cannot remain an explicit Folder cover. The Folder then uses
-- its future UI/API fallback (first or latest active photo) without touching Storage.
create or replace function public.formate_clear_archived_photo_library_covers()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.archived_at is null and new.archived_at is not null then
    update public.photo_library_folders
    set cover_photo_id = null
    where company_id = new.company_id
      and cover_photo_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_photo_library_folder_scope on public.photo_library_folders;
create trigger validate_photo_library_folder_scope
before insert or update on public.photo_library_folders
for each row
execute function public.formate_validate_photo_library_folder_scope();

drop trigger if exists validate_photo_v2_scope on public.photos;
create trigger validate_photo_v2_scope
before insert or update on public.photos
for each row
execute function public.formate_validate_photo_v2_scope();

drop trigger if exists clear_archived_photo_library_covers on public.photos;
create trigger clear_archived_photo_library_covers
after update of archived_at on public.photos
for each row
execute function public.formate_clear_archived_photo_library_covers();

drop trigger if exists set_photo_library_folders_updated_at on public.photo_library_folders;
create trigger set_photo_library_folders_updated_at
before update on public.photo_library_folders
for each row
execute function public.set_updated_at();

drop trigger if exists set_photo_caption_snippets_updated_at on public.photo_caption_snippets;
create trigger set_photo_caption_snippets_updated_at
before update on public.photo_caption_snippets
for each row
execute function public.set_updated_at();

revoke all on public.photo_library_folders from anon;
revoke all on public.photo_caption_snippets from anon;
grant select, insert, update on public.photo_library_folders to authenticated;
grant select, insert, update on public.photo_caption_snippets to authenticated;
revoke delete on public.photo_library_folders from authenticated;
revoke delete on public.photo_caption_snippets from authenticated;

alter table public.photo_library_folders enable row level security;
alter table public.photo_caption_snippets enable row level security;

drop policy if exists "members can manage own photo library folders" on public.photo_library_folders;
create policy "members can manage own photo library folders"
on public.photo_library_folders
for all
to authenticated
using (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = photo_library_folders.company_id
      and company_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = photo_library_folders.company_id
      and company_member.user_id = auth.uid()
  )
);

drop policy if exists "members can manage own photo caption snippets" on public.photo_caption_snippets;
create policy "members can manage own photo caption snippets"
on public.photo_caption_snippets
for all
to authenticated
using (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = photo_caption_snippets.company_id
      and company_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = photo_caption_snippets.company_id
      and company_member.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';

commit;
