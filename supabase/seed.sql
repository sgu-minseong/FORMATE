-- Deployment seed.
-- Keep company bootstrap data here. Construction catalog rows are prepared
-- per company by App.jsx without unit prices, labor rates, quantities, or labor counts.

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
