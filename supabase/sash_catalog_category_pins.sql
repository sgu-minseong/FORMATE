-- FORMATE sash catalog product category and pinned-product compatibility.
-- Apply manually after sash_catalog_defaults_foundation.sql.
-- Existing catalog rows remain explicitly unspecified. No row is classified from a name.

begin;

set local client_encoding = 'UTF8';

alter table public.sash_catalog_entries
  add column if not exists sash_category text not null default 'unspecified';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.sash_catalog_entries'::regclass
      and conname = 'sash_catalog_entries_sash_category_check'
  ) then
    alter table public.sash_catalog_entries
      add constraint sash_catalog_entries_sash_category_check
      check (sash_category in ('unspecified', 'standard', 'balcony'));
  end if;
end
$$;

comment on column public.sash_catalog_entries.sash_category is
  'Stable product category used to filter candidates inside one construction-subitem estimate row.';
comment on table public.sash_catalog_defaults is
  'One administrator-pinned sash product by company, pyeong, and stable construction subitem ID.';
comment on column public.sash_catalog_defaults.sash_catalog_entry_id is
  'Canonical pinned product. Null explicitly means no pin for this scope.';
comment on column public.construction_subitems.sash_location_kind is
  'Deprecated compatibility metadata. New sash runtime behavior uses the selected catalog entry category.';

create index if not exists sash_catalog_entries_subitem_category_order_idx
  on public.sash_catalog_entries (
    company_id,
    construction_subitem_id,
    sash_category,
    sort_order,
    created_at
  )
  where archived_at is null;

-- The original three-column default scope remains unchanged. Archiving a pinned
-- product only clears its reference for future estimates; no row is deleted.
create or replace function public.formate_clear_archived_sash_catalog_pin()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.archived_at is null and new.archived_at is not null then
    update public.sash_catalog_defaults
    set sash_catalog_entry_id = null
    where sash_catalog_entry_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists clear_archived_sash_catalog_pin on public.sash_catalog_entries;
create trigger clear_archived_sash_catalog_pin
after update of archived_at on public.sash_catalog_entries
for each row execute function public.formate_clear_archived_sash_catalog_pin();

notify pgrst, 'reload schema';

commit;
