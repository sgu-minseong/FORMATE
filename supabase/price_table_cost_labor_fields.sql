-- Price table structure extension for construction_subitems.
-- Do not run this automatically from the app. Review and execute manually in Supabase when ready.

alter table public.construction_subitems
  add column if not exists cost_price numeric default 0,
  add column if not exists cost_unit text,
  add column if not exists labor_rate_empty numeric,
  add column if not exists labor_rate_occupied numeric,
  add column if not exists spec_options jsonb not null default '[]'::jsonb;

update public.construction_subitems
set
  labor_rate_empty = coalesce(labor_rate_empty, labor_rate),
  labor_rate_occupied = coalesce(labor_rate_occupied, labor_rate)
where labor_rate is not null
  and (labor_rate_empty is null or labor_rate_occupied is null);

update public.construction_subitems
set cost_unit = coalesce(cost_unit, unit)
where cost_unit is null
  and unit is not null;
