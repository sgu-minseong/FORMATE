create extension if not exists "pgcrypto";

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  admin_password_hash text,
  created_at timestamptz not null default now()
);

create table if not exists construction_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  item_type text not null default 'itemized',
  is_favorite boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_items_item_type_check check (item_type in ('itemized', 'flat'))
);

create table if not exists construction_subitems (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references construction_items(id) on delete cascade,
  name text not null,
  unit text,
  unit_price numeric not null default 0,
  labor_rate numeric not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subitem_pyeong_values (
  id uuid primary key default gen_random_uuid(),
  subitem_id uuid not null references construction_subitems(id) on delete cascade,
  pyeong integer not null check (pyeong between 1 and 90),
  quantity numeric,
  labor_count numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subitem_id, pyeong)
);

create table if not exists detail_cost_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  subitem_id uuid not null references construction_subitems(id) on delete cascade,
  name text not null,
  cost numeric not null default 0,
  category_type text not null default 'basic',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_conditions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  pyeong integer not null,
  build_type text not null check (build_type in ('신축', '구축')),
  powder_room boolean,
  dress_room boolean,
  has_extension boolean,
  extension_areas text[],
  occupancy_type text not null check (occupancy_type in ('빈집', '살림집')),
  saved_items_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  address text,
  construction_date date,
  condition_id uuid references price_conditions(id) on delete set null,
  condition_snapshot jsonb not null default '{}'::jsonb,
  items_data jsonb not null default '[]'::jsonb,
  total_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Normalize existing databases to the final column names used by App.jsx.
alter table construction_items
  add column if not exists item_type text not null default 'itemized';

alter table construction_items
  drop constraint if exists construction_items_item_type_check;

alter table construction_items
  add constraint construction_items_item_type_check
  check (item_type in ('itemized', 'flat'));

alter table construction_subitems
  add column if not exists labor_rate numeric not null default 0;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'construction_items'
      and column_name = 'labor_cost'
  ) then
    execute '
      update construction_subitems cs
      set labor_rate = ci.labor_cost
      from construction_items ci
      where cs.item_id = ci.id
        and coalesce(cs.labor_rate, 0) = 0
        and ci.labor_cost is not null
    ';
  end if;
end $$;

alter table construction_items
  drop column if exists labor_cost;

alter table subitem_pyeong_values
  add column if not exists created_at timestamptz not null default now();

alter table subitem_pyeong_values
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subitem_pyeong_values'
      and column_name = 'people'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subitem_pyeong_values'
      and column_name = 'labor_count'
  ) then
    execute 'alter table subitem_pyeong_values rename column people to labor_count';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subitem_pyeong_values'
      and column_name = 'worker_count'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subitem_pyeong_values'
      and column_name = 'labor_count'
  ) then
    execute 'alter table subitem_pyeong_values rename column worker_count to labor_count';
  end if;
end $$;

alter table subitem_pyeong_values
  add column if not exists labor_count numeric;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subitem_pyeong_values'
      and column_name = 'people'
  ) then
    execute '
      update subitem_pyeong_values
      set labor_count = coalesce(labor_count, people)
      where labor_count is null
        and people is not null
    ';
    execute 'alter table subitem_pyeong_values drop column people';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subitem_pyeong_values'
      and column_name = 'worker_count'
  ) then
    execute '
      update subitem_pyeong_values
      set labor_count = coalesce(labor_count, worker_count)
      where labor_count is null
        and worker_count is not null
    ';
    execute 'alter table subitem_pyeong_values drop column worker_count';
  end if;
end $$;

alter table estimates
  add column if not exists condition_snapshot jsonb not null default '{}'::jsonb;

alter table detail_cost_categories
  add column if not exists created_at timestamptz not null default now();

alter table detail_cost_categories
  add column if not exists updated_at timestamptz not null default now();

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_construction_items_updated_at on construction_items;
create trigger set_construction_items_updated_at
before update on construction_items
for each row execute function set_updated_at();

drop trigger if exists set_construction_subitems_updated_at on construction_subitems;
create trigger set_construction_subitems_updated_at
before update on construction_subitems
for each row execute function set_updated_at();

drop trigger if exists set_subitem_pyeong_values_updated_at on subitem_pyeong_values;
create trigger set_subitem_pyeong_values_updated_at
before update on subitem_pyeong_values
for each row execute function set_updated_at();

drop trigger if exists set_detail_cost_categories_updated_at on detail_cost_categories;
create trigger set_detail_cost_categories_updated_at
before update on detail_cost_categories
for each row execute function set_updated_at();

drop trigger if exists set_price_conditions_updated_at on price_conditions;
create trigger set_price_conditions_updated_at
before update on price_conditions
for each row execute function set_updated_at();

create index if not exists construction_items_company_id_idx
  on construction_items(company_id);

create index if not exists construction_subitems_item_id_idx
  on construction_subitems(item_id);

create index if not exists subitem_pyeong_values_subitem_id_idx
  on subitem_pyeong_values(subitem_id);

create index if not exists subitem_pyeong_values_pyeong_idx
  on subitem_pyeong_values(pyeong);

create index if not exists detail_cost_categories_company_id_idx
  on detail_cost_categories(company_id);

create index if not exists detail_cost_categories_subitem_id_idx
  on detail_cost_categories(subitem_id);

create index if not exists price_conditions_company_id_idx
  on price_conditions(company_id);

create index if not exists estimates_company_id_idx
  on estimates(company_id);

create index if not exists estimates_condition_id_idx
  on estimates(condition_id);

insert into companies (id, name, admin_password_hash)
values (
  '00000000-0000-4000-8000-000000000001',
  'FORMATE Demo Company',
  'demo'
)
on conflict (id) do update
set
  name = excluded.name,
  admin_password_hash = excluded.admin_password_hash;

alter table companies disable row level security;
alter table construction_items disable row level security;
alter table construction_subitems disable row level security;
alter table subitem_pyeong_values disable row level security;
alter table detail_cost_categories disable row level security;
alter table price_conditions disable row level security;
alter table estimates disable row level security;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on companies to anon, authenticated;
grant select, insert, update, delete on construction_items to anon, authenticated;
grant select, insert, update, delete on construction_subitems to anon, authenticated;
grant select, insert, update, delete on subitem_pyeong_values to anon, authenticated;
grant select, insert, update, delete on detail_cost_categories to anon, authenticated;
grant select, insert, update, delete on price_conditions to anon, authenticated;
grant select, insert, update, delete on estimates to anon, authenticated;

notify pgrst, 'reload schema';
