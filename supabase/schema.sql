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
  labor_cost numeric not null default 0,
  is_favorite boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists construction_subitems (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references construction_items(id) on delete cascade,
  name text not null,
  unit text,
  unit_price numeric not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists detail_cost_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  subitem_id uuid not null references construction_subitems(id) on delete cascade,
  name text not null,
  cost numeric not null default 0,
  category_type text not null default 'basic',
  sort_order integer not null default 0
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
  items_data jsonb not null default '[]'::jsonb,
  total_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

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

drop trigger if exists set_price_conditions_updated_at on price_conditions;
create trigger set_price_conditions_updated_at
before update on price_conditions
for each row execute function set_updated_at();

create index if not exists construction_items_company_id_idx
  on construction_items(company_id);

create index if not exists construction_subitems_item_id_idx
  on construction_subitems(item_id);

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
