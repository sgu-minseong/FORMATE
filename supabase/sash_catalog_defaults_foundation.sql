-- FORMATE sash catalog explicit defaults foundation.
-- Apply manually after sash_estimate_v1_foundation.sql.
-- This migration is additive and does not update or delete existing data.

begin;

set local client_encoding = 'UTF8';

create table if not exists public.sash_catalog_defaults (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  pyeong integer not null,
  construction_subitem_id uuid not null references public.construction_subitems(id) on delete cascade,
  sash_catalog_entry_id uuid references public.sash_catalog_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sash_catalog_defaults_pyeong_check check (pyeong between 1 and 90),
  constraint sash_catalog_defaults_scope_key unique (
    company_id,
    pyeong,
    construction_subitem_id
  )
);

comment on table public.sash_catalog_defaults is
  'Administrator-selected fallback sash product by company, pyeong, and stable construction subitem ID.';
comment on column public.sash_catalog_defaults.sash_catalog_entry_id is
  'Canonical fallback product. Null explicitly means no configured fallback for this scope.';

create index if not exists sash_catalog_defaults_entry_idx
  on public.sash_catalog_defaults (sash_catalog_entry_id)
  where sash_catalog_entry_id is not null;

create or replace function public.formate_validate_sash_catalog_default()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  parent_company_id uuid;
  parent_item_kind text;
  catalog_entry_subitem_id uuid;
  catalog_entry_company_id uuid;
  catalog_entry_archived_at timestamptz;
begin
  select construction_item.company_id, construction_item.item_kind
  into parent_company_id, parent_item_kind
  from public.construction_subitems as construction_subitem
  join public.construction_items as construction_item
    on construction_item.id = construction_subitem.item_id
  where construction_subitem.id = new.construction_subitem_id;

  if not found
    or parent_company_id <> new.company_id
    or parent_item_kind <> 'sash'
  then
    raise exception 'Sash default scope must belong to a sash subitem in the same company.'
      using errcode = '23514';
  end if;

  if new.sash_catalog_entry_id is null then
    return new;
  end if;

  select catalog_entry.company_id,
         catalog_entry.construction_subitem_id,
         catalog_entry.archived_at
  into catalog_entry_company_id,
       catalog_entry_subitem_id,
       catalog_entry_archived_at
  from public.sash_catalog_entries as catalog_entry
  where catalog_entry.id = new.sash_catalog_entry_id;

  if not found
    or catalog_entry_company_id <> new.company_id
    or catalog_entry_subitem_id <> new.construction_subitem_id
    or catalog_entry_archived_at is not null
  then
    raise exception 'Sash default product must be an active canonical product in the same scope.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_sash_catalog_default on public.sash_catalog_defaults;
create trigger validate_sash_catalog_default
before insert or update on public.sash_catalog_defaults
for each row execute function public.formate_validate_sash_catalog_default();

drop trigger if exists set_sash_catalog_defaults_updated_at on public.sash_catalog_defaults;
create trigger set_sash_catalog_defaults_updated_at
before update on public.sash_catalog_defaults
for each row execute function public.set_updated_at();

revoke all on table public.sash_catalog_defaults from anon;
grant select, insert, update on table public.sash_catalog_defaults to authenticated;
revoke delete on table public.sash_catalog_defaults from authenticated;

alter table public.sash_catalog_defaults enable row level security;

drop policy if exists "members can manage own sash catalog defaults" on public.sash_catalog_defaults;
create policy "members can manage own sash catalog defaults"
on public.sash_catalog_defaults
for all
to authenticated
using (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = sash_catalog_defaults.company_id
      and company_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = sash_catalog_defaults.company_id
      and company_member.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';

commit;
