insert into companies (id, name, admin_password_hash)
values ('00000000-0000-4000-8000-000000000001', 'FORMATE Demo Company', 'demo')
on conflict (id) do update
set name = excluded.name;

insert into estimates (
  id,
  company_id,
  address,
  construction_date,
  condition_id,
  items_data,
  total_amount,
  created_at
) values
(
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '한강리버뷰아파트 101동 203호',
  current_date + interval '7 days',
  null,
  '[
    {"categoryName":"도배","material":"실크","price":1850000},
    {"categoryName":"장판","material":"4.5T","price":1460000},
    {"categoryName":"목공","material":"몰딩","price":760000}
  ]'::jsonb,
  4070000,
  now() - interval '1 day'
),
(
  '10000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '서초그린빌라 2층',
  current_date + interval '10 days',
  null,
  '[
    {"categoryName":"도배","material":"광폭","price":1320000},
    {"categoryName":"욕실","material":"기본형","price":2400000}
  ]'::jsonb,
  3720000,
  now() - interval '2 days'
),
(
  '10000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000001',
  '마포센트럴오피스텔 A동 908호',
  current_date + interval '14 days',
  null,
  '[
    {"categoryName":"장판","material":"2.2T","price":980000},
    {"categoryName":"목공","material":"걸레받이","price":520000}
  ]'::jsonb,
  1500000,
  now() - interval '3 days'
),
(
  '10000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000001',
  '분당파크타운 305동 1201호',
  current_date + interval '21 days',
  null,
  '[
    {"categoryName":"도배","material":"디아방","price":2100000},
    {"categoryName":"장판","material":"강마루","price":3300000},
    {"categoryName":"욕실","material":"고급형","price":4200000}
  ]'::jsonb,
  9600000,
  now() - interval '4 days'
),
(
  '10000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000001',
  '송파레이크팰리스 12동 704호',
  current_date + interval '28 days',
  null,
  '[
    {"categoryName":"도배","material":"실크","price":1950000},
    {"categoryName":"목공","material":"문틀 보수","price":880000}
  ]'::jsonb,
  2830000,
  now() - interval '5 days'
),
(
  '10000000-0000-4000-8000-000000000006',
  '00000000-0000-4000-8000-000000000001',
  '성수하이츠맨션 5층',
  current_date + interval '35 days',
  null,
  '[
    {"categoryName":"장판","material":"4.5T","price":1510000},
    {"categoryName":"욕실","material":"타일 교체","price":3100000}
  ]'::jsonb,
  4610000,
  now() - interval '6 days'
),
(
  '10000000-0000-4000-8000-000000000007',
  '00000000-0000-4000-8000-000000000001',
  '연희동 단독주택 1층',
  current_date + interval '42 days',
  null,
  '[
    {"categoryName":"도배","material":"광폭","price":1580000},
    {"categoryName":"목공","material":"몰딩","price":990000},
    {"categoryName":"욕실","material":"기본형","price":2600000}
  ]'::jsonb,
  5170000,
  now() - interval '7 days'
),
(
  '10000000-0000-4000-8000-000000000008',
  '00000000-0000-4000-8000-000000000001',
  '광교포레나아파트 208동 1502호',
  current_date + interval '49 days',
  null,
  '[
    {"categoryName":"도배","material":"실크","price":2050000},
    {"categoryName":"장판","material":"강마루","price":3600000},
    {"categoryName":"목공","material":"걸레받이","price":640000}
  ]'::jsonb,
  6290000,
  now() - interval '8 days'
)
on conflict (id) do nothing;
