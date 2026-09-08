-- FORMATE Gate 5: explicit shared Sash price membership.
-- Apply manually after the Gate 4 Sash v2 foundation and the matching preflight.
-- Existing catalog prices and historical estimate snapshots are not changed.

begin;

set local client_encoding = 'UTF8';

create table if not exists public.sash_prices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  unit_price numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sash_prices_unit_price_check check (
    unit_price >= 0
    and unit_price::text not in ('NaN', 'Infinity', '-Infinity')
  ),
  constraint sash_prices_company_id_id_key unique (company_id, id)
);

comment on table public.sash_prices is
  'Canonical current price for catalog entries explicitly grouped by a user.';

alter table public.sash_catalog_entries
  add column if not exists sash_price_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sash_catalog_entries'::regclass
      and conname = 'sash_catalog_entries_company_sash_price_fkey'
  ) then
    alter table public.sash_catalog_entries
      add constraint sash_catalog_entries_company_sash_price_fkey
      foreign key (company_id, sash_price_id)
      references public.sash_prices(company_id, id)
      on delete restrict;
  end if;
end;
$$;

create index if not exists sash_catalog_entries_sash_price_idx
  on public.sash_catalog_entries (company_id, sash_price_id)
  where sash_price_id is not null;

drop trigger if exists set_sash_prices_updated_at on public.sash_prices;
create trigger set_sash_prices_updated_at
before update on public.sash_prices
for each row execute function public.set_updated_at();

create or replace function public.formate_validate_sash_price_membership()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  price_company_id uuid;
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.sash_price_id is not null then
      raise exception 'Sash price membership must be changed through the shared-price RPC.'
        using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.sash_price_id is distinct from old.sash_price_id then
      raise exception 'Sash price membership must be changed through the shared-price RPC.'
        using errcode = '42501';
    end if;
  end if;

  if new.sash_price_id is not null then
    select price.company_id
    into price_company_id
    from public.sash_prices as price
    where price.id = new.sash_price_id;

    if not found or price_company_id is distinct from new.company_id then
      raise exception 'Sash price membership requires a price in the same company.'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'UPDATE'
    and old.sash_price_id is not null
    and new.sash_price_id is not null
    and (
      new.width_mm is distinct from old.width_mm
      or new.height_mm is distinct from old.height_mm
      or new.window_type is distinct from old.window_type
    )
  then
    raise exception 'Detach the shared Sash price before changing width, height, or window type.'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE'
    and old.sash_price_id is not null
    and new.sash_price_id is not null
    and new.unit_price is distinct from old.unit_price
  then
    raise exception 'Linked catalog unit_price is not the canonical shared price.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_sash_price_membership on public.sash_catalog_entries;
create trigger validate_sash_price_membership
before insert or update of
  company_id,
  sash_price_id,
  unit_price,
  width_mm,
  height_mm,
  window_type
on public.sash_catalog_entries
for each row execute function public.formate_validate_sash_price_membership();

alter table public.sash_prices enable row level security;

revoke all on table public.sash_prices from anon;
revoke all on table public.sash_prices from authenticated;
grant select on table public.sash_prices to authenticated;

drop policy if exists "members can read own sash prices" on public.sash_prices;
create policy "members can read own sash prices"
on public.sash_prices
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = sash_prices.company_id
      and company_member.user_id = auth.uid()
  )
);

drop function if exists public.apply_shared_sash_price(
  uuid,
  uuid,
  numeric,
  uuid[],
  timestamptz,
  jsonb,
  boolean
);

create or replace function public.detach_shared_sash_price_member(
  p_company_id uuid,
  p_entry_id uuid,
  p_expected_entry_updated_at timestamptz,
  p_expected_price_updated_at timestamptz
)
returns table (
  entry_id uuid,
  preserved_unit_price numeric
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  catalog_entry public.sash_catalog_entries%rowtype;
  price_group public.sash_prices%rowtype;
begin
  if not exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = p_company_id
      and company_member.user_id = auth.uid()
  ) then
    raise exception 'Not authorized for this company.' using errcode = '42501';
  end if;

  select entry.*
  into catalog_entry
  from public.sash_catalog_entries as entry
  where entry.id = p_entry_id
    and entry.company_id = p_company_id
    and entry.archived_at is null
  for update;

  if not found or catalog_entry.sash_price_id is null then
    raise exception 'Current shared Sash price membership not found.'
      using errcode = '40001';
  end if;

  select price.*
  into price_group
  from public.sash_prices as price
  where price.id = catalog_entry.sash_price_id
    and price.company_id = p_company_id
  for update;

  if not found
    or p_expected_entry_updated_at is null
    or catalog_entry.updated_at is distinct from p_expected_entry_updated_at
    or p_expected_price_updated_at is null
    or price_group.updated_at is distinct from p_expected_price_updated_at
  then
    raise exception 'Shared Sash price data changed after confirmation opened.'
      using errcode = '40001';
  end if;

  update public.sash_catalog_entries as entry
  set unit_price = price_group.unit_price,
      sash_price_id = null
  where entry.id = p_entry_id
    and entry.company_id = p_company_id;

  delete from public.sash_prices as price
  where price.id = price_group.id
    and price.company_id = p_company_id
    and not exists (
      select 1
      from public.sash_catalog_entries as entry
      where entry.company_id = p_company_id
        and entry.sash_price_id = price.id
    );

  return query select p_entry_id, price_group.unit_price;
end;
$$;

create or replace function public.apply_shared_sash_price(
  p_company_id uuid,
  p_source_entry_id uuid,
  p_unit_price numeric,
  p_selected_entry_ids uuid[],
  p_expected_price_groups jsonb,
  p_expected_rows jsonb,
  p_confirm_group_moves boolean default false
)
returns table (
  price_id uuid,
  applied_unit_price numeric,
  price_updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  source_entry public.sash_catalog_entries%rowtype;
  source_group public.sash_prices%rowtype;
  target_price_id uuid;
  previous_unit_price numeric;
  moved_from_price_ids uuid[];
begin
  if not exists (
    select 1
    from public.company_members as company_member
    where company_member.company_id = p_company_id
      and company_member.user_id = auth.uid()
  ) then
    raise exception 'Not authorized for this company.' using errcode = '42501';
  end if;

  if p_unit_price is null
    or p_unit_price < 0
    or p_unit_price::text in ('NaN', 'Infinity', '-Infinity')
  then
    raise exception 'Shared Sash price must be a finite non-negative number.'
      using errcode = '22023';
  end if;

  if coalesce(cardinality(p_selected_entry_ids), 0) = 0
    or not (p_source_entry_id = any(p_selected_entry_ids))
    or cardinality(p_selected_entry_ids) <> (
      select count(distinct selected.selected_id)
      from unnest(p_selected_entry_ids) as selected(selected_id)
    )
  then
    raise exception 'The source entry must be selected exactly once.'
      using errcode = '22023';
  end if;

  select catalog_entry.*
  into source_entry
  from public.sash_catalog_entries as catalog_entry
  where catalog_entry.id = p_source_entry_id
    and catalog_entry.company_id = p_company_id
    and catalog_entry.archived_at is null;

  if not found then
    raise exception 'Active source Sash catalog entry not found.'
      using errcode = 'P0002';
  end if;

  perform 1
  from public.sash_catalog_entries as catalog_entry
  where catalog_entry.company_id = p_company_id
    and (
      catalog_entry.id = any(p_selected_entry_ids)
      or (
        source_entry.sash_price_id is not null
        and catalog_entry.sash_price_id = source_entry.sash_price_id
        and catalog_entry.archived_at is null
      )
    )
  order by catalog_entry.id
  for update;

  select catalog_entry.*
  into source_entry
  from public.sash_catalog_entries as catalog_entry
  where catalog_entry.id = p_source_entry_id
    and catalog_entry.company_id = p_company_id
    and catalog_entry.archived_at is null
  for update;

  if source_entry.width_mm is null
    or source_entry.width_mm <= 0
    or source_entry.width_mm::text in ('NaN', 'Infinity', '-Infinity')
    or source_entry.height_mm is null
    or source_entry.height_mm <= 0
    or source_entry.height_mm::text in ('NaN', 'Infinity', '-Infinity')
    or source_entry.window_type is null
    or source_entry.window_type not in ('single', 'double')
  then
    raise exception 'Shared Sash price requires source width, height, and window type.'
      using errcode = '23514';
  end if;

  if (
    select count(*)
    from public.sash_catalog_entries as catalog_entry
    where catalog_entry.company_id = p_company_id
      and catalog_entry.archived_at is null
      and catalog_entry.id = any(p_selected_entry_ids)
  ) <> cardinality(p_selected_entry_ids) then
    raise exception 'Every selected Sash entry must be active and belong to the company.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.sash_catalog_entries as catalog_entry
    where catalog_entry.company_id = p_company_id
      and catalog_entry.archived_at is null
      and catalog_entry.id = any(p_selected_entry_ids)
      and (
        catalog_entry.width_mm is distinct from source_entry.width_mm
        or catalog_entry.height_mm is distinct from source_entry.height_mm
        or catalog_entry.window_type is distinct from source_entry.window_type
      )
  ) then
    raise exception 'Every selected Sash entry must match the source width, height, and window type.'
      using errcode = '23514';
  end if;

  if jsonb_typeof(p_expected_rows) is distinct from 'array' then
    raise exception 'Expected Sash row snapshot is required.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.sash_catalog_entries as catalog_entry
    where catalog_entry.company_id = p_company_id
      and catalog_entry.archived_at is null
      and (
        catalog_entry.id = any(p_selected_entry_ids)
        or (
          source_entry.sash_price_id is not null
          and catalog_entry.sash_price_id = source_entry.sash_price_id
        )
      )
      and not exists (
        select 1
        from jsonb_array_elements(p_expected_rows) as expected(row_snapshot)
        where expected.row_snapshot ->> 'id' = catalog_entry.id::text
          and nullif(expected.row_snapshot ->> 'sash_price_id', '')::uuid
            is not distinct from catalog_entry.sash_price_id
          and (expected.row_snapshot ->> 'updated_at')::timestamptz
            is not distinct from catalog_entry.updated_at
      )
  ) then
    raise exception 'Shared Sash price data changed after confirmation opened.'
      using errcode = '40001';
  end if;

  perform 1
  from public.sash_prices as price
  where price.company_id = p_company_id
    and (
      price.id = source_entry.sash_price_id
      or price.id in (
        select catalog_entry.sash_price_id
        from public.sash_catalog_entries as catalog_entry
        where catalog_entry.company_id = p_company_id
          and catalog_entry.id = any(p_selected_entry_ids)
          and catalog_entry.sash_price_id is not null
      )
    )
  order by price.id
  for update;

  if jsonb_typeof(p_expected_price_groups) is distinct from 'array' then
    raise exception 'Expected shared Sash price-group snapshot is required.'
      using errcode = '22023';
  end if;

  if exists (
      select 1
      from jsonb_array_elements(p_expected_price_groups) as expected(group_snapshot)
      where nullif(expected.group_snapshot ->> 'id', '') is null
        or nullif(expected.group_snapshot ->> 'updated_at', '') is null
    )
    or jsonb_array_length(p_expected_price_groups) <> (
      select count(distinct (expected.group_snapshot ->> 'id')::uuid)
      from jsonb_array_elements(p_expected_price_groups) as expected(group_snapshot)
    )
  then
    raise exception 'Expected shared Sash price-group snapshot is required.'
      using errcode = '22023';
  end if;

  if exists (
    with actual_groups as (
      select distinct catalog_entry.sash_price_id as id
      from public.sash_catalog_entries as catalog_entry
      where catalog_entry.company_id = p_company_id
        and catalog_entry.archived_at is null
        and catalog_entry.id = any(p_selected_entry_ids)
        and catalog_entry.sash_price_id is not null
    ), expected_groups as (
      select
        (expected.group_snapshot ->> 'id')::uuid as id,
        (expected.group_snapshot ->> 'updated_at')::timestamptz as updated_at
      from jsonb_array_elements(p_expected_price_groups) as expected(group_snapshot)
    )
    select 1
    from actual_groups
    full join expected_groups using (id)
    left join public.sash_prices as price
      on price.id = coalesce(actual_groups.id, expected_groups.id)
      and price.company_id = p_company_id
    where actual_groups.id is null
      or expected_groups.id is null
      or price.id is null
      or price.updated_at is distinct from expected_groups.updated_at
  ) then
    raise exception 'Shared Sash price group changed after confirmation opened.'
      using errcode = '40001';
  end if;

  if source_entry.sash_price_id is not null then
    select price.*
    into source_group
    from public.sash_prices as price
    where price.id = source_entry.sash_price_id
      and price.company_id = p_company_id;

    if not found then
      raise exception 'Current shared Sash price group not found.' using errcode = '40001';
    end if;
  end if;

  if not p_confirm_group_moves and exists (
    select 1
    from public.sash_catalog_entries as catalog_entry
    where catalog_entry.company_id = p_company_id
      and catalog_entry.id = any(p_selected_entry_ids)
      and catalog_entry.sash_price_id is not null
      and catalog_entry.sash_price_id is distinct from source_entry.sash_price_id
  ) then
    raise exception 'Moving an entry from another shared price group requires confirmation.'
      using errcode = 'P0001';
  end if;

  select array_agg(distinct catalog_entry.sash_price_id)
  into moved_from_price_ids
  from public.sash_catalog_entries as catalog_entry
  where catalog_entry.company_id = p_company_id
    and catalog_entry.id = any(p_selected_entry_ids)
    and catalog_entry.sash_price_id is not null
    and catalog_entry.sash_price_id is distinct from source_entry.sash_price_id;

  if source_entry.sash_price_id is null then
    insert into public.sash_prices (company_id, unit_price)
    values (p_company_id, p_unit_price)
    returning id into target_price_id;
  else
    target_price_id := source_entry.sash_price_id;
    previous_unit_price := source_group.unit_price;

    update public.sash_prices as price
    set unit_price = p_unit_price,
        updated_at = now()
    where price.id = target_price_id
      and price.company_id = p_company_id;

    update public.sash_catalog_entries as catalog_entry
    set unit_price = previous_unit_price,
        sash_price_id = null
    where catalog_entry.company_id = p_company_id
      and catalog_entry.sash_price_id = target_price_id
      and catalog_entry.archived_at is null
      and not (catalog_entry.id = any(p_selected_entry_ids));
  end if;

  update public.sash_catalog_entries as catalog_entry
  set sash_price_id = target_price_id
  where catalog_entry.company_id = p_company_id
    and catalog_entry.archived_at is null
    and catalog_entry.id = any(p_selected_entry_ids);

  if moved_from_price_ids is not null then
    update public.sash_prices as price
    set updated_at = now()
    where price.company_id = p_company_id
      and price.id = any(moved_from_price_ids)
      and exists (
        select 1
        from public.sash_catalog_entries as catalog_entry
        where catalog_entry.company_id = p_company_id
          and catalog_entry.sash_price_id = price.id
      );

    delete from public.sash_prices as price
    where price.company_id = p_company_id
      and price.id = any(moved_from_price_ids)
      and not exists (
        select 1
        from public.sash_catalog_entries as catalog_entry
        where catalog_entry.company_id = p_company_id
          and catalog_entry.sash_price_id = price.id
      );
  end if;

  return query
  select price.id, price.unit_price, price.updated_at
  from public.sash_prices as price
  where price.id = target_price_id
    and price.company_id = p_company_id;
end;
$$;

revoke all on function public.apply_shared_sash_price(
  uuid,
  uuid,
  numeric,
  uuid[],
  jsonb,
  jsonb,
  boolean
) from public;
grant execute on function public.apply_shared_sash_price(
  uuid,
  uuid,
  numeric,
  uuid[],
  jsonb,
  jsonb,
  boolean
) to authenticated;

revoke all on function public.detach_shared_sash_price_member(
  uuid,
  uuid,
  timestamptz,
  timestamptz
) from public;
grant execute on function public.detach_shared_sash_price_member(
  uuid,
  uuid,
  timestamptz,
  timestamptz
) to authenticated;

notify pgrst, 'reload schema';

commit;
