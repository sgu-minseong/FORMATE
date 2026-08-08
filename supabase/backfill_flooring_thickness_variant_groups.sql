-- FORMATE one-time explicit flooring thickness variant backfill.
-- Review and run manually in the Supabase SQL Editor after
-- supabase/construction_subitem_variant_foundation.sql.
-- This script uses only the listed construction_subitem IDs. It does not parse
-- or match display names, and it never changes existing subitem IDs or names.

begin;

set local client_encoding = 'UTF8';

create temporary table formate_variant_group_seed (
  group_id uuid primary key,
  company_id uuid not null,
  anchor_subitem_id uuid not null unique,
  display_name text not null,
  sort_order integer not null
) on commit drop;

insert into formate_variant_group_seed (
  group_id,
  company_id,
  anchor_subitem_id,
  display_name,
  sort_order
)
values
  -- 삼풍갤러리: company-scoped groups.
  ('f41d14e7-c091-4bab-9b9c-50b95d6245af', 'b3e072d8-4656-47a5-b8e6-3ceb093c4113', 'c0668dfe-0b35-4745-b8f5-bc1720718f99', 'KCC장판', 1),
  ('7d6c5536-8307-420e-8ee4-3068a9b7e2d2', 'b3e072d8-4656-47a5-b8e6-3ceb093c4113', '2a0ece16-93b4-47c2-bb12-fce8eb440d9e', 'LG장판', 2),
  ('e6373d17-abf0-4a24-b349-f8d2517b3565', 'b3e072d8-4656-47a5-b8e6-3ceb093c4113', '0a30a923-5953-4dda-96f3-a8208d0369c4', '장판', 3),
  ('6fa86f65-8d1f-47e6-a3f6-a333d5a8f3c5', 'b3e072d8-4656-47a5-b8e6-3ceb093c4113', 'c5213694-3729-4f9f-80a7-44cd4843edce', '비닐장판', 4),
  ('b9ca4776-74f2-4e5f-99af-8462aac6c237', 'b3e072d8-4656-47a5-b8e6-3ceb093c4113', 'e5c3d789-1e35-4dcb-985e-70db22d93019', '새 장판 5', 5),
  -- FORMATE Demo Company: distinct groups even when the display name is identical.
  ('3dd7dfe6-1a7c-4e32-95ae-4560e9158212', '00000000-0000-4000-8000-000000000001', '5a8b1863-fae7-4679-bc0c-1578088c1379', 'KCC장판', 1),
  ('4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', '00000000-0000-4000-8000-000000000001', 'd54695d8-3298-47b8-8c39-07e3deadefff', 'LG장판', 2);

create temporary table formate_variant_value_seed (
  construction_subitem_id uuid primary key,
  group_id uuid not null references formate_variant_group_seed(group_id),
  variant_value numeric(12, 4) not null,
  variant_unit text not null
) on commit drop;

insert into formate_variant_value_seed (
  construction_subitem_id,
  group_id,
  variant_value,
  variant_unit
)
values
  -- 삼풍갤러리 / KCC장판
  ('c0668dfe-0b35-4745-b8f5-bc1720718f99', 'f41d14e7-c091-4bab-9b9c-50b95d6245af', 1.8, 'T'),
  ('e353c148-835c-4ae7-a38c-4557677bdd46', 'f41d14e7-c091-4bab-9b9c-50b95d6245af', 1.9, 'T'),
  ('6ede4b59-4886-44ee-952a-9a6b8130aa6e', 'f41d14e7-c091-4bab-9b9c-50b95d6245af', 2.0, 'T'),
  ('865f1ce6-aa35-4d6f-9038-a313793f53e8', 'f41d14e7-c091-4bab-9b9c-50b95d6245af', 2.2, 'T'),
  ('20582614-38f0-4f71-94af-96c22d2f55a9', 'f41d14e7-c091-4bab-9b9c-50b95d6245af', 2.7, 'T'),
  ('805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb', 'f41d14e7-c091-4bab-9b9c-50b95d6245af', 3.2, 'T'),
  ('8b516481-6e63-4b24-993a-971f46fe377c', 'f41d14e7-c091-4bab-9b9c-50b95d6245af', 4.5, 'T'),
  -- 삼풍갤러리 / LG장판
  ('2a0ece16-93b4-47c2-bb12-fce8eb440d9e', '7d6c5536-8307-420e-8ee4-3068a9b7e2d2', 1.8, 'T'),
  ('dfee6e98-d20e-4ce5-82f3-9949091e5fb4', '7d6c5536-8307-420e-8ee4-3068a9b7e2d2', 2.0, 'T'),
  ('7b7aa532-b2a3-4358-8a11-de1dd7a07633', '7d6c5536-8307-420e-8ee4-3068a9b7e2d2', 2.2, 'T'),
  ('6b6486b5-d387-45e3-afd6-987513ffa57e', '7d6c5536-8307-420e-8ee4-3068a9b7e2d2', 2.7, 'T'),
  ('bb3eb27f-321c-4cd6-8403-90c52707964e', '7d6c5536-8307-420e-8ee4-3068a9b7e2d2', 3.2, 'T'),
  ('4d921b1b-11bb-49dc-9c07-6cf227c3d722', '7d6c5536-8307-420e-8ee4-3068a9b7e2d2', 3.7, 'T'),
  ('798437e8-54e5-41e1-a68b-bfed3f37c44e', '7d6c5536-8307-420e-8ee4-3068a9b7e2d2', 4.5, 'T'),
  -- 삼풍갤러리 / 장판
  ('0a30a923-5953-4dda-96f3-a8208d0369c4', 'e6373d17-abf0-4a24-b349-f8d2517b3565', 1.8, 'T'),
  ('5bd1edbd-ee14-44b8-a4a5-afa0a5b24340', 'e6373d17-abf0-4a24-b349-f8d2517b3565', 1.9, 'T'),
  ('efe9024f-0ae8-4160-abcc-e93b567e465b', 'e6373d17-abf0-4a24-b349-f8d2517b3565', 2.2, 'T'),
  ('a128b155-1cb7-48a9-85d0-759448c4487c', 'e6373d17-abf0-4a24-b349-f8d2517b3565', 2.7, 'T'),
  -- 삼풍갤러리 / 비닐장판
  ('c5213694-3729-4f9f-80a7-44cd4843edce', '6fa86f65-8d1f-47e6-a3f6-a333d5a8f3c5', 1.8, 'T'),
  ('558e8561-544c-433a-8954-04890427411a', '6fa86f65-8d1f-47e6-a3f6-a333d5a8f3c5', 2.2, 'T'),
  ('477ed879-05ab-4006-b00c-16503f9321cc', '6fa86f65-8d1f-47e6-a3f6-a333d5a8f3c5', 2.7, 'T'),
  -- 삼풍갤러리 / 새 장판 5
  ('e5c3d789-1e35-4dcb-985e-70db22d93019', 'b9ca4776-74f2-4e5f-99af-8462aac6c237', 1.8, 'T'),
  ('d13d8ee6-c837-41d6-8549-bfeaa25e6e5a', 'b9ca4776-74f2-4e5f-99af-8462aac6c237', 2.2, 'T'),
  ('8bc4eae5-7ded-4406-8fb8-c94760aa5a4c', 'b9ca4776-74f2-4e5f-99af-8462aac6c237', 2.7, 'T'),
  -- FORMATE Demo Company / KCC장판
  ('5a8b1863-fae7-4679-bc0c-1578088c1379', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 1.8, 'T'),
  ('f1729b39-a96f-4f23-a295-7f33f58de18c', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 1.9, 'T'),
  ('c1b08f47-36bb-46d1-83bd-779bfcd55b54', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 2.0, 'T'),
  ('20e46d00-eea0-49eb-b5a7-ab3382b10a2d', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 2.1, 'T'),
  ('8d935a6c-5f59-43f7-abd9-144aad6be5ad', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 2.2, 'T'),
  ('c77d1dca-7135-4350-b3e7-f3ccbe4f036e', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 2.3, 'T'),
  ('294a6863-6e86-421a-ab88-900803dd3e29', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 2.4, 'T'),
  ('c230c733-bae8-441f-a2f5-3c751515a4a7', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 2.5, 'T'),
  ('d36edba8-3099-4e73-bf56-df5e61f25efb', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 2.6, 'T'),
  ('5b66ffcb-a23b-4e1f-bd32-67b32f13be92', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 2.7, 'T'),
  ('bb2d05a7-be15-443c-9d2a-0456293b040a', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 2.8, 'T'),
  ('a5561463-f2ba-48fc-95a3-c3a583dba989', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 2.9, 'T'),
  ('48c6d047-67cf-44cc-853a-04d89c3c85e4', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 3.0, 'T'),
  ('373f3e32-1e29-4943-80d1-cf5eb8d3221e', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 3.1, 'T'),
  ('78124e2c-660d-43ad-bd53-31a5db292e14', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 3.2, 'T'),
  ('631ebfe3-b6e6-47c0-978c-1c016f47b878', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 3.3, 'T'),
  ('974d3481-6289-42ff-9fac-cba9d826f72d', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 3.4, 'T'),
  ('de3022b5-8e27-4c14-809a-2aab16a0de65', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 3.5, 'T'),
  ('69383099-de38-4dd1-806d-282a36beb408', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 3.6, 'T'),
  ('9eeb9057-f046-43cf-ac10-2d0bb2e6912c', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 3.7, 'T'),
  ('deec0fb7-6193-4aef-81a1-3caf05327b88', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 3.8, 'T'),
  ('ee4e1627-ef23-44a1-84a6-2907cb9b3dfa', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 3.9, 'T'),
  ('5095a5e7-b47f-42f8-9be9-5fd81f281f86', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 4.0, 'T'),
  ('2142ab07-bd5e-4e58-adbf-d6341de24a81', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 4.1, 'T'),
  ('bdae75cf-7dc7-45bc-a6d9-a9adae706d12', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 4.2, 'T'),
  ('b976870c-9590-4328-8492-88b4fdfa6cee', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 4.3, 'T'),
  ('549fc207-c6b2-4ea4-8993-4057ce93b482', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 4.4, 'T'),
  ('55f89357-17e2-4abf-b21b-fda8910b4bdd', '3dd7dfe6-1a7c-4e32-95ae-4560e9158212', 4.5, 'T'),
  -- FORMATE Demo Company / LG장판
  ('d54695d8-3298-47b8-8c39-07e3deadefff', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 1.8, 'T'),
  ('6aa66f09-e615-42b6-9a5d-25f061a4527e', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 1.9, 'T'),
  ('5f80c384-21e3-4377-ad94-f851241912ac', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 2.0, 'T'),
  ('f2ff414d-7108-45a2-9b9e-d2e96d55f65c', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 2.1, 'T'),
  ('22e46b1e-fc02-4dd3-93dc-13536f7a9dc9', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 2.2, 'T'),
  ('2b78ee8d-6013-41dd-b594-86be824b892d', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 2.3, 'T'),
  ('c23c3c43-72d3-418f-9df4-5f05ae1c77c1', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 2.4, 'T'),
  ('7adfabd5-09cd-463b-889a-0a14b2d75124', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 2.5, 'T'),
  ('48a85610-6dd1-41bc-b3b6-0803c88d09b0', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 2.6, 'T'),
  ('3b0d2326-fd38-46ef-8a49-8f820e59ec42', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 2.7, 'T'),
  ('6ea40e8b-0b15-4a5e-b063-534660202646', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 2.8, 'T'),
  ('2933994e-3372-44a3-a14d-6e434f5e0558', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 2.9, 'T'),
  ('295b8788-a4a6-4cce-9091-b5e9b3468265', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 3.0, 'T'),
  ('f37f844f-3297-4877-a3c1-eb8c3efab99f', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 3.1, 'T'),
  ('812454bc-a128-4c07-a856-8f2665c1e450', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 3.2, 'T'),
  ('9cfbab69-f994-4f07-b25c-923b628979f5', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 3.3, 'T'),
  ('1db99e03-a493-47c7-a012-e9c97ee8cc18', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 3.4, 'T'),
  ('64b3c92f-f505-4dcb-a66c-0d2ee7634ad7', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 3.5, 'T'),
  ('fdc5c903-e402-4a09-b442-7d52d1b5267c', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 3.6, 'T'),
  ('229288b6-1842-4480-8906-ff365c9aa34d', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 3.7, 'T'),
  ('a8576d85-2c40-4336-b5f6-9704f7b7b98d', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 3.8, 'T'),
  ('bd4f7fb3-7f0c-4437-aee7-3a1da36d2719', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 3.9, 'T'),
  ('c76ddee2-784f-4390-92b7-41ac2424a2cf', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 4.0, 'T'),
  ('658880c8-d6cb-477d-8787-7287fdd7308a', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 4.1, 'T'),
  ('576a947e-dbb1-41b9-a763-4bbd77daa455', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 4.2, 'T'),
  ('6ce4139d-7a7b-4c23-bbad-6095ec5370df', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 4.3, 'T'),
  ('f20ea795-bbe7-4b21-a8d1-a815fe2c46e5', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 4.4, 'T'),
  ('cf196843-c252-4675-a8a8-f80ddf13c6e2', '4bbf7be2-fad7-423d-9e17-a0a1e8b0607b', 4.5, 'T');

create temporary table formate_base_subitem_seed (
  company_id uuid not null,
  construction_subitem_id uuid primary key
) on commit drop;

insert into formate_base_subitem_seed (company_id, construction_subitem_id)
values
  ('b3e072d8-4656-47a5-b8e6-3ceb093c4113', '215eea80-2769-478e-b8b9-e0beac943969'),
  ('b3e072d8-4656-47a5-b8e6-3ceb093c4113', '4e7a077c-48f4-4d85-8da4-794de69b74d7'),
  ('b3e072d8-4656-47a5-b8e6-3ceb093c4113', 'ee09a802-fb12-4bd8-8c10-3f26345b6f96');

do $$
begin
  if exists (
    select 1
    from formate_variant_group_seed as seed
    left join public.construction_subitems as anchor_subitem
      on anchor_subitem.id = seed.anchor_subitem_id
    left join public.construction_items as item
      on item.id = anchor_subitem.item_id
    where item.company_id is distinct from seed.company_id
  ) then
    raise exception 'A variant group anchor does not belong to its explicit company.';
  end if;

  if exists (
    select 1
    from formate_variant_value_seed as seed
    join formate_variant_group_seed as group_seed
      on group_seed.group_id = seed.group_id
    left join public.construction_subitems as subitem
      on subitem.id = seed.construction_subitem_id
    left join public.construction_items as item
      on item.id = subitem.item_id
    where item.company_id is distinct from group_seed.company_id
  ) then
    raise exception 'A target thickness row does not belong to its explicit company.';
  end if;

  if exists (
    select 1
    from formate_base_subitem_seed as seed
    left join public.construction_subitems as subitem
      on subitem.id = seed.construction_subitem_id
    left join public.construction_items as item
      on item.id = subitem.item_id
    where item.company_id is distinct from seed.company_id
      or subitem.variant_group_id is not null
      or subitem.variant_value is not null
      or subitem.variant_unit is not null
  ) then
    raise exception 'Base rows must remain standard rows with all variant metadata null.';
  end if;
end
$$;

insert into public.construction_subitem_variant_groups (
  id,
  construction_item_id,
  display_name,
  variant_kind,
  sort_order
)
select
  seed.group_id,
  anchor_subitem.item_id,
  seed.display_name,
  'thickness',
  seed.sort_order
from formate_variant_group_seed as seed
join public.construction_subitems as anchor_subitem
  on anchor_subitem.id = seed.anchor_subitem_id
join public.construction_items as item
  on item.id = anchor_subitem.item_id
where item.company_id = seed.company_id
on conflict (id) do nothing;

do $$
begin
  if exists (
    select 1
    from formate_variant_group_seed as seed
    join public.construction_subitem_variant_groups as variant_group
      on variant_group.id = seed.group_id
    join public.construction_subitems as anchor_subitem
      on anchor_subitem.id = seed.anchor_subitem_id
    where variant_group.construction_item_id is distinct from anchor_subitem.item_id
      or variant_group.display_name is distinct from seed.display_name
      or variant_group.variant_kind is distinct from 'thickness'
  ) then
    raise exception 'A stable variant group ID already has incompatible metadata.';
  end if;

  if exists (
    select 1
    from formate_variant_value_seed as seed
    join formate_variant_group_seed as group_seed
      on group_seed.group_id = seed.group_id
    join public.construction_subitems as subitem
      on subitem.id = seed.construction_subitem_id
    join public.construction_items as item
      on item.id = subitem.item_id
    join public.construction_subitem_variant_groups as variant_group
      on variant_group.id = seed.group_id
    where item.company_id is distinct from group_seed.company_id
      or variant_group.construction_item_id is distinct from subitem.item_id
      or (
        (
          subitem.variant_group_id is not null
          or subitem.variant_value is not null
          or subitem.variant_unit is not null
        )
        and (
          subitem.variant_group_id is distinct from seed.group_id
          or subitem.variant_value is distinct from seed.variant_value
          or subitem.variant_unit is distinct from seed.variant_unit
        )
      )
  ) then
    raise exception 'One or more target rows have incompatible existing variant metadata.';
  end if;
end
$$;

update public.construction_subitems as subitem
set
  variant_group_id = seed.group_id,
  variant_value = seed.variant_value,
  variant_unit = seed.variant_unit
from formate_variant_value_seed as seed
join formate_variant_group_seed as group_seed
  on group_seed.group_id = seed.group_id
cross join public.construction_items as item
where subitem.id = seed.construction_subitem_id
  and item.id = subitem.item_id
  and item.company_id = group_seed.company_id
  and (
    subitem.variant_group_id is distinct from seed.group_id
    or subitem.variant_value is distinct from seed.variant_value
    or subitem.variant_unit is distinct from seed.variant_unit
  );

select
  item.company_id,
  variant_group.id as variant_group_id,
  variant_group.display_name as variant_group_name,
  subitem.id as construction_subitem_id,
  subitem.name as construction_subitem_name,
  subitem.variant_value,
  subitem.variant_unit
from formate_variant_value_seed as seed
join public.construction_subitems as subitem
  on subitem.id = seed.construction_subitem_id
join public.construction_items as item
  on item.id = subitem.item_id
join public.construction_subitem_variant_groups as variant_group
  on variant_group.id = subitem.variant_group_id
order by item.company_id, variant_group.sort_order, subitem.variant_value, subitem.sort_order;

commit;
