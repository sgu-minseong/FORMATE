-- Default brand-only subitems for wallpaper and flooring categories.
-- Review and run manually in Supabase. This file does not delete or reset data.

with brand_subitems(category_name, subitem_name, unit, sort_offset) as (
  values
    ('도배', 'LX벽지', '평', 1),
    ('도배', '신한벽지', '평', 2),
    ('도배', '개나리벽지', '평', 3),
    ('도배', '서울벽지', '평', 4),
    ('도배', '제일벽지', '평', 5),
    ('바닥', 'LX마루', '평', 1),
    ('바닥', 'KCC마루', '평', 2),
    ('바닥', '동화마루', '평', 3),
    ('바닥', '한솔마루', '평', 4),
    ('바닥', '구정마루', '평', 5),
    ('바닥', '올고다마루', '평', 6),
    ('바닥재', 'LX마루', '평', 1),
    ('바닥재', 'KCC마루', '평', 2),
    ('바닥재', '동화마루', '평', 3),
    ('바닥재', '한솔마루', '평', 4),
    ('바닥재', '구정마루', '평', 5),
    ('바닥재', '올고다마루', '평', 6),
    ('마루', 'LX마루', '평', 1),
    ('마루', 'KCC마루', '평', 2),
    ('마루', '동화마루', '평', 3),
    ('마루', '한솔마루', '평', 4),
    ('마루', '구정마루', '평', 5),
    ('마루', '올고다마루', '평', 6)
),
target_subitems as (
  select
    ci.id as item_id,
    brand_subitems.subitem_name,
    brand_subitems.unit,
    coalesce((
      select max(cs.sort_order)
      from construction_subitems cs
      where cs.item_id = ci.id
    ), 0) + brand_subitems.sort_offset as sort_order
  from construction_items ci
  join brand_subitems on brand_subitems.category_name = trim(ci.name)
)
insert into construction_subitems (
  item_id,
  name,
  unit,
  unit_price,
  labor_rate,
  sort_order
)
select
  target_subitems.item_id,
  target_subitems.subitem_name,
  target_subitems.unit,
  0,
  0,
  target_subitems.sort_order
from target_subitems
where not exists (
  select 1
  from construction_subitems cs
  where cs.item_id = target_subitems.item_id
    and trim(cs.name) = target_subitems.subitem_name
);
