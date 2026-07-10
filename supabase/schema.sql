create extension if not exists "pgcrypto";

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_code text,
  admin_password_hash text,
  created_at timestamptz not null default now()
);

create table if not exists company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  unique (company_id, user_id),
  unique (user_id)
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
  build_type text not null check (
    build_type in (
      '신축', '구축', '확장형', '구형',
      '확장형1', '확장형2', '확장형3', '확장형4', '확장형5',
      '구형0', '구형1', '구형2', '구형3', '구형4', '구형5'
    )
  ),
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

create table if not exists admin_condition_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  pyeong integer not null check (pyeong between 1 and 90),
  build_type text not null check (
    build_type in (
      '신축', '구축', '확장형', '구형',
      '확장형1', '확장형2', '확장형3', '확장형4', '확장형5',
      '구형0', '구형1', '구형2', '구형3', '구형4', '구형5'
    )
  ),
  has_extension boolean not null default false,
  condition_variant text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_condition_template_values (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references admin_condition_templates(id) on delete cascade,
  item_id uuid not null references construction_items(id) on delete cascade,
  subitem_id uuid not null references construction_subitems(id) on delete cascade,
  option_value text not null default '',
  quantity numeric,
  labor_count numeric,
  unit_price numeric not null default 0,
  labor_rate numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists condition_variant_labels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  variant_key text not null check (
    variant_key in (
      '확장형1', '확장형2', '확장형3', '확장형4', '확장형5',
      '구형0', '구형1', '구형2', '구형3', '구형4', '구형5'
    )
  ),
  label text not null default '',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Normalize existing databases to the final column names used by App.jsx.
alter table companies
  add column if not exists company_code text;

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

alter table price_conditions
  drop constraint if exists price_conditions_build_type_check;

alter table price_conditions
  add constraint price_conditions_build_type_check
  check (
    build_type in (
      '신축', '구축', '확장형', '구형',
      '확장형1', '확장형2', '확장형3', '확장형4', '확장형5',
      '구형0', '구형1', '구형2', '구형3', '구형4', '구형5'
    )
  );

alter table admin_condition_templates
  add column if not exists company_id uuid;

alter table admin_condition_templates
  add column if not exists pyeong integer;

alter table admin_condition_templates
  add column if not exists build_type text;

alter table admin_condition_templates
  add column if not exists has_extension boolean not null default false;

alter table admin_condition_templates
  add column if not exists condition_variant text not null default '';

alter table admin_condition_templates
  alter column condition_variant set default '';

update admin_condition_templates
set condition_variant = ''
where condition_variant is null;

alter table admin_condition_templates
  alter column condition_variant set not null;

alter table admin_condition_templates
  add column if not exists created_at timestamptz not null default now();

alter table admin_condition_templates
  add column if not exists updated_at timestamptz not null default now();

alter table admin_condition_template_values
  add column if not exists template_id uuid;

alter table admin_condition_template_values
  add column if not exists item_id uuid;

alter table admin_condition_template_values
  add column if not exists subitem_id uuid;

alter table admin_condition_template_values
  add column if not exists option_value text not null default '';

alter table admin_condition_template_values
  add column if not exists quantity numeric;

alter table admin_condition_template_values
  add column if not exists labor_count numeric;

alter table admin_condition_template_values
  add column if not exists unit_price numeric not null default 0;

alter table admin_condition_template_values
  add column if not exists labor_rate numeric not null default 0;

alter table admin_condition_template_values
  add column if not exists created_at timestamptz not null default now();

alter table admin_condition_template_values
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_condition_templates_company_id_fkey'
      and conrelid = 'admin_condition_templates'::regclass
  ) then
    alter table admin_condition_templates
      add constraint admin_condition_templates_company_id_fkey
      foreign key (company_id) references companies(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_condition_templates_pyeong_check'
      and conrelid = 'admin_condition_templates'::regclass
  ) then
    alter table admin_condition_templates
      add constraint admin_condition_templates_pyeong_check
      check (pyeong between 1 and 90);
  end if;

  alter table admin_condition_templates
    drop constraint if exists admin_condition_templates_build_type_check;

  alter table admin_condition_templates
    add constraint admin_condition_templates_build_type_check
    check (
      build_type in (
        '신축', '구축', '확장형', '구형',
        '확장형1', '확장형2', '확장형3', '확장형4', '확장형5',
        '구형0', '구형1', '구형2', '구형3', '구형4', '구형5'
      )
    );

  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_condition_template_values_template_id_fkey'
      and conrelid = 'admin_condition_template_values'::regclass
  ) then
    alter table admin_condition_template_values
      add constraint admin_condition_template_values_template_id_fkey
      foreign key (template_id) references admin_condition_templates(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_condition_template_values_item_id_fkey'
      and conrelid = 'admin_condition_template_values'::regclass
  ) then
    alter table admin_condition_template_values
      add constraint admin_condition_template_values_item_id_fkey
      foreign key (item_id) references construction_items(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_condition_template_values_subitem_id_fkey'
      and conrelid = 'admin_condition_template_values'::regclass
  ) then
    alter table admin_condition_template_values
      add constraint admin_condition_template_values_subitem_id_fkey
      foreign key (subitem_id) references construction_subitems(id) on delete cascade;
  end if;
end $$;

create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

drop trigger if exists set_admin_condition_templates_updated_at on admin_condition_templates;
create trigger set_admin_condition_templates_updated_at
before update on admin_condition_templates
for each row execute function set_updated_at();

drop trigger if exists set_admin_condition_template_values_updated_at on admin_condition_template_values;
create trigger set_admin_condition_template_values_updated_at
before update on admin_condition_template_values
for each row execute function set_updated_at();

drop trigger if exists set_condition_variant_labels_updated_at on condition_variant_labels;
create trigger set_condition_variant_labels_updated_at
before update on condition_variant_labels
for each row execute function set_updated_at();

create unique index if not exists companies_company_code_uidx
  on companies(company_code);

create index if not exists company_members_company_id_idx
  on company_members(company_id);

create index if not exists company_members_user_id_idx
  on company_members(user_id);

create index if not exists construction_items_company_id_idx
  on construction_items(company_id);

create unique index if not exists construction_items_company_name_uidx
  on construction_items(company_id, name);

create index if not exists construction_subitems_item_id_idx
  on construction_subitems(item_id);

create unique index if not exists construction_subitems_item_name_uidx
  on construction_subitems(item_id, name);

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

create index if not exists admin_condition_templates_company_id_idx
  on admin_condition_templates(company_id);

alter table admin_condition_templates
  drop constraint if exists admin_condition_templates_company_id_pyeong_build_type_has_extension_key;

drop index if exists admin_condition_templates_condition_uidx;

drop index if exists admin_condition_templates_company_id_pyeong_build_type_has_extension_key;

create unique index if not exists admin_condition_templates_condition_variant_uidx
  on admin_condition_templates(company_id, pyeong, build_type, has_extension, condition_variant);

create index if not exists admin_condition_template_values_template_id_idx
  on admin_condition_template_values(template_id);

create index if not exists admin_condition_template_values_item_id_idx
  on admin_condition_template_values(item_id);

create index if not exists admin_condition_template_values_subitem_id_idx
  on admin_condition_template_values(subitem_id);

create unique index if not exists admin_condition_template_values_template_subitem_option_uidx
  on admin_condition_template_values(template_id, subitem_id, option_value);

create index if not exists condition_variant_labels_company_id_idx
  on condition_variant_labels(company_id);

create unique index if not exists condition_variant_labels_company_variant_uidx
  on condition_variant_labels(company_id, variant_key);

insert into companies (id, name, company_code, admin_password_hash)
values (
  '00000000-0000-4000-8000-000000000001',
  'FORMATE Demo Company',
  'demo',
  'demo'
)
on conflict (id) do update
set
  name = excluded.name,
  company_code = excluded.company_code,
  admin_password_hash = excluded.admin_password_hash;

grant usage on schema public to authenticated;

revoke all on company_members from anon;
revoke all on companies from anon;
revoke all on construction_items from anon;
revoke all on construction_subitems from anon;
revoke all on subitem_pyeong_values from anon;
revoke all on detail_cost_categories from anon;
revoke all on price_conditions from anon;
revoke all on estimates from anon;
revoke all on admin_condition_templates from anon;
revoke all on admin_condition_template_values from anon;
revoke all on condition_variant_labels from anon;

grant select on company_members to authenticated;
grant select on companies to authenticated;
grant select, insert, update, delete on construction_items to authenticated;
grant select, insert, update, delete on construction_subitems to authenticated;
grant select, insert, update, delete on subitem_pyeong_values to authenticated;
grant select, insert, update, delete on detail_cost_categories to authenticated;
grant select, insert, update, delete on price_conditions to authenticated;
grant select, insert, update, delete on estimates to authenticated;
grant select, insert, update, delete on admin_condition_templates to authenticated;
grant select, insert, update, delete on admin_condition_template_values to authenticated;
grant select, insert, update, delete on condition_variant_labels to authenticated;

drop policy if exists "members can read own membership" on company_members;
create policy "members can read own membership"
on company_members
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "members can read own company" on companies;
create policy "members can read own company"
on companies
for select
to authenticated
using (
  exists (
    select 1
    from company_members cm
    where cm.company_id = companies.id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can manage own construction items" on construction_items;
create policy "members can manage own construction items"
on construction_items
for all
to authenticated
using (
  exists (
    select 1
    from company_members cm
    where cm.company_id = construction_items.company_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from company_members cm
    where cm.company_id = construction_items.company_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can manage own construction subitems" on construction_subitems;
create policy "members can manage own construction subitems"
on construction_subitems
for all
to authenticated
using (
  exists (
    select 1
    from construction_items ci
    join company_members cm on cm.company_id = ci.company_id
    where ci.id = construction_subitems.item_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from construction_items ci
    join company_members cm on cm.company_id = ci.company_id
    where ci.id = construction_subitems.item_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can manage own condition templates" on admin_condition_templates;
create policy "members can manage own condition templates"
on admin_condition_templates
for all
to authenticated
using (
  exists (
    select 1
    from company_members cm
    where cm.company_id = admin_condition_templates.company_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from company_members cm
    where cm.company_id = admin_condition_templates.company_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can manage own template values" on admin_condition_template_values;
create policy "members can manage own template values"
on admin_condition_template_values
for all
to authenticated
using (
  exists (
    select 1
    from admin_condition_templates t
    join construction_items i on i.id = admin_condition_template_values.item_id
    join construction_subitems s on s.id = admin_condition_template_values.subitem_id
    join company_members cm on cm.company_id = t.company_id
    where t.id = admin_condition_template_values.template_id
      and s.item_id = i.id
      and i.company_id = t.company_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from admin_condition_templates t
    join construction_items i on i.id = admin_condition_template_values.item_id
    join construction_subitems s on s.id = admin_condition_template_values.subitem_id
    join company_members cm on cm.company_id = t.company_id
    where t.id = admin_condition_template_values.template_id
      and s.item_id = i.id
      and i.company_id = t.company_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can manage own condition labels" on condition_variant_labels;
create policy "members can manage own condition labels"
on condition_variant_labels
for all
to authenticated
using (
  exists (
    select 1
    from company_members cm
    where cm.company_id = condition_variant_labels.company_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from company_members cm
    where cm.company_id = condition_variant_labels.company_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can manage own detail costs" on detail_cost_categories;
create policy "members can manage own detail costs"
on detail_cost_categories
for all
to authenticated
using (
  exists (
    select 1
    from company_members cm
    where cm.company_id = detail_cost_categories.company_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from company_members cm
    where cm.company_id = detail_cost_categories.company_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can manage own estimates" on estimates;
create policy "members can manage own estimates"
on estimates
for all
to authenticated
using (
  exists (
    select 1
    from company_members cm
    where cm.company_id = estimates.company_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from company_members cm
    where cm.company_id = estimates.company_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can manage own price conditions" on price_conditions;
create policy "members can manage own price conditions"
on price_conditions
for all
to authenticated
using (
  exists (
    select 1
    from company_members cm
    where cm.company_id = price_conditions.company_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from company_members cm
    where cm.company_id = price_conditions.company_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "members can manage own legacy pyeong values" on subitem_pyeong_values;
create policy "members can manage own legacy pyeong values"
on subitem_pyeong_values
for all
to authenticated
using (
  exists (
    select 1
    from construction_subitems cs
    join construction_items ci on ci.id = cs.item_id
    join company_members cm on cm.company_id = ci.company_id
    where cs.id = subitem_pyeong_values.subitem_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from construction_subitems cs
    join construction_items ci on ci.id = cs.item_id
    join company_members cm on cm.company_id = ci.company_id
    where cs.id = subitem_pyeong_values.subitem_id
      and cm.user_id = auth.uid()
  )
);

alter table company_members enable row level security;
alter table companies enable row level security;
alter table construction_items enable row level security;
alter table construction_subitems enable row level security;
alter table subitem_pyeong_values enable row level security;
alter table detail_cost_categories enable row level security;
alter table price_conditions enable row level security;
alter table estimates enable row level security;
alter table admin_condition_templates enable row level security;
alter table admin_condition_template_values enable row level security;
alter table condition_variant_labels enable row level security;

notify pgrst, 'reload schema';
