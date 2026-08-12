-- FORMATE exact consolidation for one audited company/item.
--
-- IMPORTANT:
--   * This file is intentionally mutation-capable. Do not use it as a preflight.
--   * Run the read-only preflight derived from the section ending at
--     "READ-ONLY PREFLIGHT COMPLETE" immediately before applying this file.
--   * Mutation identity is exact UUID only. Display names, labels, option text,
--     and thickness suffixes are never used to select a row.
--
-- Approved effects, all in one fail-closed transaction:
--   1. Guarantee six exact canonical survivor commercial values. The audited
--      state requires two row updates; four already match and remain untouched.
--   2. DELETE exactly 336 exact duplicate Template value UUIDs after proving
--      that each has an existing canonical counterpart with identical complete
--      business payload and no inbound FK.
--   3. Archive exactly 171 exact legacy standalone subitem UUIDs under the
--      non-destructive archived_at contract. Their UUIDs and commercial data
--      remain intact. Six non-duplicate Template rows attached to the three
--      survivor-less archive targets are preserved unchanged.
--
-- No estimate, estimate version, price-condition, photo, pyeong, detail-cost,
-- sash, group, item, or history row is updated or deleted.

begin;

set transaction isolation level serializable;
set local lock_timeout = '5s';
set local statement_timeout = '120s';

create temporary table formate_sampung_legacy_target_seed (
  cluster_key text not null,
  survivor_id uuid,
  construction_subitem_id uuid primary key
) on commit drop;

-- BEGIN EXACT LEGACY SUBITEM SEED (171 UUIDs)
insert into formate_sampung_legacy_target_seed (
  cluster_key,
  survivor_id,
  construction_subitem_id
) values
  ('c01', '6ede4b59-4886-44ee-952a-9a6b8130aa6e'::uuid, '0e75a8e0-d28d-4795-b6cf-32d2f58c3ffe'::uuid),
  ('c01', '6ede4b59-4886-44ee-952a-9a6b8130aa6e'::uuid, '61da2f52-a602-424f-9212-55462ed3460b'::uuid),
  ('c01', '6ede4b59-4886-44ee-952a-9a6b8130aa6e'::uuid, '88136ae2-ac2e-4e4d-9cb0-06503c4a92b9'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '019f2517-3b2e-4b63-9e99-dd9c5af15bd3'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '0b1ed4f3-d354-48e4-927a-37b7d8cfbaf2'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '0db54291-217e-4eed-a1c7-1a57b724c179'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '2b7db0b9-5fd2-457d-ada7-ed9265e32a39'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '2da1638e-a961-490c-ae64-774a307f7536'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '376a6c55-ce2e-45d6-824a-6edabf8716ed'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '3cb77ee9-b5f5-42c8-94bd-55cc9ad9468b'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '44255896-dd5b-430a-b031-ea6c6df28be1'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '4437ed26-6458-427d-ad66-0a00114a8b20'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '4a76b2d7-585f-498e-8325-80431078928e'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '4cc6fb94-feca-48f8-b277-d9a68897b5b3'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '5cc9efef-fbdf-45fd-9b96-ba8e07baa100'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '5d83d805-802b-4a12-a7e5-776784d5a3ea'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '64115e0f-4274-4419-84ab-1604c2b48eb9'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '714ca89d-a2a4-42ba-993a-287bfe42c2ac'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '7493c47c-06a5-4cfc-9510-438e52ca9653'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '7c28dfbb-1e6e-4ed7-aea3-17df75ef596c'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '8e3db550-758f-4858-a2eb-98f495762898'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '8f861957-3079-42d6-9996-1e1565379534'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '91e20440-4d45-4f30-8fa1-0943ba370a5d'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '974318f3-9f58-44a0-90e7-55e5c57497cb'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'a180691a-7eb0-4c3c-be9e-2b0a9a610199'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'a26e7599-c35c-4995-92b2-c5407950484c'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'af943bf0-1f30-4b4f-9265-f819612da631'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'b33f1173-dd26-4597-b5d3-babbb79347de'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'c52e914c-c6b7-4ab4-8087-42f5732b77ad'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'c655a676-9339-49d1-8a1c-229ef5e6c292'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'd245dc3f-1e34-492a-8153-3411d9545148'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'd6193f9b-6fb4-470b-9760-2d131776e97e'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'dc55bf27-f00a-4716-a4a7-3b60d9b7ab4a'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'dcf2159f-ac94-45cb-a07e-4ff90471ed45'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'e3959b29-9f1f-4d94-8aec-cdb7759335c6'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'e99079c3-c1a7-4d98-a9ad-d108a8e063c0'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'eae2f590-aa04-42b6-99a9-1f55d38924ea'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'eecc60c8-3a62-4a6a-ac68-081daecf456d'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'fda846b2-a258-429c-ab80-625f6a4458c9'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '2418f008-b984-4b7f-bbdc-90cb99a4578f'::uuid),
  ('c02', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, 'b79eb488-c391-488a-baa0-4c77fb102351'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '082e1284-758d-42bc-8d18-4bfee7231ded'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '08a15f70-2834-4554-8fd4-f6a71dc48033'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '0a8bf4a1-53bb-4ddf-9b8f-f01a03bb66fb'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '17495ebb-5a2d-4a80-9f64-667ad7ef3865'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '18ece6e2-4243-455a-8478-07df880cf36b'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '1c1fb832-1cce-4521-8009-fe86cac20205'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '251a6381-023e-4135-a582-b28b580f9050'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '29d031f0-dabc-4054-b7c2-3f05dd7c60f0'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '41628b54-b29c-4360-ab4c-a9890e39746f'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '4a2eb685-1b7b-497a-8b42-b4c73d3d21ea'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '5229d99f-5b9b-4d05-bd74-a035ab69215a'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '593f0b5d-16ec-491b-9f9f-29bfef742780'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '5c5a4a4a-265c-4c20-b362-5620a57d9401'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '5fcc5ca6-2b42-4a70-86c8-c362f2a690c6'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '6b0d32b8-6f1d-49fd-9ad2-4ded1947f241'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '720a281f-48cf-4037-8e42-0fe734ff75dc'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '728e160a-d804-48a5-856d-0c0daa9e60d1'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '8344bba9-1601-4bf7-8ffa-cbecb15e3e4e'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '839f4bf3-dc56-4f0b-a0a2-9cb6d06854db'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '93205907-2c7d-467c-91c3-9d3dcd2293b4'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, 'a3294271-4152-48f6-89dd-d2711a7a8e4d'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, 'add0517f-f8dc-4ee6-a491-abd41336e532'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, 'b780e380-86f9-4bb8-bf85-a2da27a9aea2'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, 'bbd79758-8b32-4a2f-8555-cc6237ede9ba'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, 'c1c45f28-d611-47f5-9174-0a9c7492a590'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, 'c5519473-0eb8-4f01-a444-0ebfd15e23ce'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, 'e7d278c6-2c82-40a8-bc38-bd1834c528f0'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '19ce7f2c-367f-4630-8043-f2e3494eb577'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '37c1dee1-3bbf-41c0-813e-b4a2f328b643'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '43cdec19-2601-4989-a4a8-8d2352270f66'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, '48de0414-2165-4dfd-adb1-b946739ffcdb'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, 'b386e903-c3ed-4145-98bb-dd883054bfd6'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, 'c0fe3925-6703-4161-a5cf-0b5c573a1d5d'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, 'ca80e4ea-f16a-4856-b89e-f4232aea6da8'::uuid),
  ('c03', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, 'ed00475f-d938-4cb4-9394-41e68db87fbc'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '00f75e8e-f2b7-409d-bc4f-a142281fe79b'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '0f44417f-419a-4493-99f1-36380be6ebca'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '163ceff1-eebf-4458-b9ba-bd3dabee09ea'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '20dec6ba-5360-4dcf-9cbb-3af490b8db7c'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '35270599-8a23-4f06-885b-0bf652159f1e'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '3a120ead-8d95-4d0f-b5bb-557736673da6'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '3b4fb850-511c-44c0-b9f4-f90e587b2a46'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '48783e8b-79cc-4717-afa8-3121043a6cc5'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '4b5262a1-d42f-419c-97b2-a1b04e8d26d2'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '62b33f8f-3658-4d4a-9e9b-78d4b24676bb'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '633179e6-ce5d-4fdf-b484-1019059cdbb8'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '68d994e5-6bd4-4c0a-ae2b-4b3758effd5c'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '72b12973-27fc-4c0c-a504-7c07b5fdc0c8'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '75e7c17d-390f-43f2-9b58-0c780f345891'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '88bcbded-67bc-4151-81c5-a58a99f1cd6c'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '9aad477e-9997-4a2d-8f54-5c8f5f427003'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '9d0da639-135f-4635-9f74-f751ddac464b'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, 'b728bda9-3754-46b8-8c24-7c855608039c'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, 'c4150e3d-baf6-485c-9abc-fb20ca1027d5'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, 'c8b79391-2f47-44bb-843f-92b5a5acaa3e'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, 'e9b9e018-bef5-41a7-b35e-b7142ba29290'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, 'fd92c35b-477e-4a9f-9716-2762211aa400'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '0e6be835-ce3a-41f8-a0b2-c1b20a6bb965'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '10338d17-bb92-4cd9-a961-f70ef59f068f'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '263917a7-fee0-4019-866d-ae024bce4435'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '32839853-2eee-46ef-93de-d631a31ab1fc'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '3bb742d3-9a8a-4298-b5c8-9534f3ceca9d'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '7f0e5e09-55a5-4c64-896c-14f1e16e8d09'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, '9ee37000-2ae9-4d71-92e8-dcbf7033570e'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, 'e84dd45f-18c0-430d-83f9-e1c0267b7403'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, 'ef07827a-8391-4c7d-a121-c3dfd9d0d868'::uuid),
  ('c04', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, 'f2ff45c5-213d-43bd-b064-ab0fc8580a35'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '1a79c263-cf95-4d85-9c00-02c64ffe8e64'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '6034c85c-64b4-4e4b-a5ab-b028fec4c4c2'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '64ef46bc-b9c3-4575-8e2e-c2be9228265b'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '73c0db8f-a7bb-4efe-a9a7-fe531407b946'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '7476e934-2e37-4544-aeeb-eddff74eb082'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '7eef6bbf-df66-40d0-9a84-f9d3ac7ca93d'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '81517ef4-878e-42c6-b44a-0583f0aea66e'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, 'a00049b0-860d-4812-afd4-d73a3045c2d1'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, 'bff3515e-b700-4d7c-ac16-1905a83e765b'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, 'e176ffdb-163b-4d27-9295-809bf26f80a9'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, 'f0676187-49e6-4828-ba41-8d30e62a6435'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '10d0a7f8-5ae6-460e-8917-ad22f3127e88'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '170c805f-de0c-4868-8932-4e71e162f5f3'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '1ab82853-6a68-4e9f-b1de-d34e9e15b989'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '41573baa-6385-472e-a291-f785915648b0'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '4d38c090-a075-4f18-96ef-f0ee09570964'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '626e539d-743b-43e9-9c95-4ed6c9e21009'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '762076b2-4372-478f-a49e-fe49e834c3a6'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '89d2529d-0faf-4de9-a84c-a82be40b007d'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '8ede6285-4781-4170-a89d-4799d27deeba'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '97bb5b19-6338-4bc0-89d8-c01987b811e2'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, 'ab688091-5c19-48db-8bdf-4fd9af47a354'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, 'acce424d-2b2a-4fc3-acee-200c6981bee1'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, 'ce89fccd-8092-4898-9d4a-221d8c18d5e5'::uuid),
  ('c05', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, 'f6598ba0-cef4-4b07-bb41-136865d047b6'::uuid),
  ('c06', '4d921b1b-11bb-49dc-9c07-6cf227c3d722'::uuid, '06a2f53b-1eed-4f7d-9bd8-8641a8b999d2'::uuid),
  ('c06', '4d921b1b-11bb-49dc-9c07-6cf227c3d722'::uuid, 'b2681c76-72b1-423c-9483-5d85d927374e'::uuid),
  ('c06', '4d921b1b-11bb-49dc-9c07-6cf227c3d722'::uuid, '1b5e81fd-7d75-459b-92bc-125028be1387'::uuid),
  ('c06', '4d921b1b-11bb-49dc-9c07-6cf227c3d722'::uuid, '3123df24-8027-4558-8dee-7babe4ae4373'::uuid),
  ('c06', '4d921b1b-11bb-49dc-9c07-6cf227c3d722'::uuid, '7072d7c0-3916-4a76-a77f-811401e4cbe9'::uuid),
  ('c06', '4d921b1b-11bb-49dc-9c07-6cf227c3d722'::uuid, 'b8ba0d7e-94b2-427a-a576-c40245925936'::uuid),
  ('c06', '4d921b1b-11bb-49dc-9c07-6cf227c3d722'::uuid, 'c6b99fbe-5628-42ab-8721-500ac3c9e760'::uuid),
  ('c06', '4d921b1b-11bb-49dc-9c07-6cf227c3d722'::uuid, 'd35c80e3-0c8e-4e26-8f7e-133a6bb71a60'::uuid),
  ('c06', '4d921b1b-11bb-49dc-9c07-6cf227c3d722'::uuid, 'd569363e-4ca2-462c-aa13-345bcf01feb9'::uuid),
  ('c06', '4d921b1b-11bb-49dc-9c07-6cf227c3d722'::uuid, 'd939b4fa-ffc2-4e59-9aa9-1d18e9c70dc9'::uuid),
  ('c06', '4d921b1b-11bb-49dc-9c07-6cf227c3d722'::uuid, 'db244eea-b994-4b25-87cc-fbbb68c78649'::uuid),
  ('c06', '4d921b1b-11bb-49dc-9c07-6cf227c3d722'::uuid, 'fbeaa1dc-06f4-461a-9da2-9a3d90eb7ebb'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, '0438811e-f5c4-4198-8493-c38128ca2b1f'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, '20d373d8-a42f-4349-a1bb-f86c780c6650'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, '2a2df288-8b62-40af-acdf-a7b2cbb5f9a7'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, '2c9f2315-f284-4fd1-b7ee-7b9ca37ab604'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, '30bfa909-be78-4275-8720-8b998ce0d1a4'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, '69dcee5f-07cf-4d4a-983a-6e3b948e479f'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, '763ceb5a-7068-428f-a07f-c37e5f84c1de'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, '88c9410d-1f3f-4de5-9fe6-324c46283963'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, 'ac24e808-ddcd-4a85-9777-e1eed4e9a99f'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, 'b03b7083-ba74-430e-9300-17d7fcc3c186'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, 'b9d9cc72-f3bb-4ae5-8e9d-ee0d97182951'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, 'c268628c-ae2b-4685-88de-e90d8ba4b7da'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, 'd9a92b96-d943-470a-bb06-3ef87a61168a'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, 'ddbeb460-68f9-4625-a821-41af91903151'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, 'e7eac635-6f24-4ffa-9275-44d97a69f02f'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, 'ea783a2f-951d-4a45-9ceb-f10c2e017cef'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, '2418c1b9-9198-464d-b543-67da1cc9420b'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, '34d25559-9094-4d1e-b2ed-8f57664c1560'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, '583f65e7-e9b0-455a-bd8d-76b110ecc27d'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, '632ac344-8866-4a5f-851f-0966c4e5dd38'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, 'b6225891-f834-4222-875c-063afb870885'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, 'c2a52655-254f-4514-9499-6f2a5cbd3d1e'::uuid),
  ('c07', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, 'e813c4ba-df02-46df-89cf-b03ae030775d'::uuid),
  ('c08', null::uuid, '5b0c3b80-a8f5-41db-bb0a-0a883e7bf507'::uuid),
  ('c09', null::uuid, '1ff109ed-99f2-4617-b361-e4c98e31c341'::uuid),
  ('c10', null::uuid, '50c27b5c-e1d7-47da-a428-4f1e0d2cda8c'::uuid);
-- END EXACT LEGACY SUBITEM SEED

create temporary table formate_sampung_expected_cluster (
  cluster_key text primary key,
  candidate_count integer not null,
  uuid_set_md5 text not null,
  rows_md5 text not null,
  commercial_md5 text not null,
  template_references_md5 text not null,
  template_reference_count integer not null,
  pyeong_reference_count integer not null,
  detail_reference_count integer not null,
  photo_reference_count integer not null,
  sash_reference_count integer not null,
  base_group_reference_count integer not null,
  estimate_reference_count integer not null,
  estimate_version_reference_count integer not null,
  price_condition_reference_count integer not null
) on commit drop;

insert into formate_sampung_expected_cluster values
  ('c01', 3,  '94b604c49781e888948f06f9dbece3ea', '41336293f9a6612ff9665d844ed021a4', '873b90f531493bc9d3ee12702fdc5ee2', 'ddb14a05792cb91f8c02ebaaaeb64572', 6,  0, 0, 0, 0, 0, 0, 0, 0),
  ('c02', 38, 'e860fb838af98e1be6116fbfa7cc0a44', '56c8cca91b909483102af5b5cfaaf3df', '88523a78606ff405b457cfd9a8a406f0', '82e375c9e9ecfc4527cf1a0ac2f8b8cd', 76, 0, 0, 0, 0, 0, 0, 0, 0),
  ('c03', 35, 'e6df73ef49a3c366c7a0f0a90c1c6f0f', '2d55836c35e77db6e21b0cd5c5f3be31', '0ced9332899e76c8f996b1bb7fcd9514', 'de104a596b5d5c4d8b63bff5dbcac8c5', 70, 0, 0, 0, 0, 0, 0, 0, 0),
  ('c04', 32, '99e383805070a3ed901f8b220cf42db2', '2257abff2bcfe785746fc1212962fee5', '5670b1f61b26d10ca1ffa4138f16b08f', 'c851a8a67de34fa1931e4e37ad36c895', 64, 0, 0, 0, 0, 0, 0, 0, 0),
  ('c05', 25, 'cab4b2f0ea30124b8e842acf96e0ba91', '40050057fb9e0939aac50493fb94328b', '46f6dc9a091028cef3f955f820e9b200', '40a3a0d28accca328897572c26f42d54', 50, 0, 0, 0, 0, 0, 0, 0, 0),
  ('c06', 12, 'ef9de0422e0e3b290c0c177015db7c3e', '8ede9e694cda3c052845dfd2da94d2d9', 'bb7da952415861876b0a0ea0a0ea70b8', 'd3f5a909480ba3e7d4af6e9611f2cedc', 24, 0, 0, 0, 0, 0, 0, 0, 0),
  ('c07', 23, '1de76b92e6e0397d9f91febb901b412b', '27a9106ba02af2c6da78899c3ff8e511', '32c6d567ff0073382b0e1b6b12c89706', 'e9ce45ac39e084e30ae9711d7825888e', 46, 0, 0, 0, 0, 0, 0, 0, 0),
  ('c08', 1,  '2ada825c899626573002b9c15b51d174', '259e76ea4e16bd3246ac058fc07317e6', 'cba372ad9164bb56901b340cdf090e8e', 'a97cae19186dce316f8fe81f57f4ed0e', 2,  0, 0, 0, 0, 0, 0, 0, 0),
  ('c09', 1,  '0ddd6d65b3214863c85185862d7a4e37', '4b668609ec2e5c56dd3fe3175fc8e67a', 'cba372ad9164bb56901b340cdf090e8e', '920551f451b01f9841d5a02ac6e570b9', 2,  0, 0, 0, 0, 0, 0, 0, 0),
  ('c10', 1,  '904f91a2d5d39a70a0b0df5af7982d26', '59816c58ea748b8828afe91c3e00e2c2', 'cba372ad9164bb56901b340cdf090e8e', '3f787c7ecc777388c75329218b5701ca', 2,  0, 0, 0, 0, 0, 0, 0, 0);

create temporary table formate_sampung_canonical_expected (
  entity_type text not null,
  id uuid not null,
  row_md5 text not null,
  primary key (entity_type, id)
) on commit drop;

insert into formate_sampung_canonical_expected values
  ('group',    '7d6c5536-8307-420e-8ee4-3068a9b7e2d2'::uuid, '893651f88f9a45cd2da33ab2dd2a0691'),
  ('group',    'f41d14e7-c091-4bab-9b9c-50b95d6245af'::uuid, '2deafb115d8b88f60c3b989307e83929'),
  ('survivor', '4d921b1b-11bb-49dc-9c07-6cf227c3d722'::uuid, '20732caa97e3252f337bf59370cc28b7'),
  ('survivor', '6ede4b59-4886-44ee-952a-9a6b8130aa6e'::uuid, '0302f745a4a41c27b22a8450a65ab300'),
  ('survivor', '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, '296a56063bd7ad838c6b9afe974b572a'),
  ('survivor', '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '81c5df36d0c04d44c7d606f966b8ff45'),
  ('survivor', '8b516481-6e63-4b24-993a-971f46fe377c'::uuid, 'bb163431d58a782f3d93a5d3490d3d9c'),
  ('survivor', 'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '72d69f80569f8ea3dfebc90a016acfd2'),
  ('survivor', 'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, 'b8c78620c917dc688a699e6fe9bc9bbf');

create temporary table formate_sampung_official_survivor_seed (
  construction_subitem_id uuid primary key,
  expected_pre_row_md5 text not null,
  official_unit_price numeric not null,
  official_labor_rate numeric not null,
  expected_requires_update boolean not null
) on commit drop;

insert into formate_sampung_official_survivor_seed values
  ('6ede4b59-4886-44ee-952a-9a6b8130aa6e'::uuid, '0302f745a4a41c27b22a8450a65ab300',  47000, 11000, true),
  ('805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid, '81c5df36d0c04d44c7d606f966b8ff45', 80000, 13000, false),
  ('8b516481-6e63-4b24-993a-971f46fe377c'::uuid, 'bb163431d58a782f3d93a5d3490d3d9c', 90000, 16000, false),
  ('dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid, 'b8c78620c917dc688a699e6fe9bc9bbf',  47000, 11000, true),
  ('bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid, '72d69f80569f8ea3dfebc90a016acfd2', 90000, 13000, false),
  ('798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid, '296a56063bd7ad838c6b9afe974b572a', 100000, 16000, false);

create temporary table formate_sampung_template_delete_seed (
  template_value_id uuid primary key
) on commit drop;

-- BEGIN EXACT TEMPLATE DELETE SEED (336 UUIDs)
insert into formate_sampung_template_delete_seed (template_value_id) values
  ('00cdf7d5-6a55-4e2e-b7c2-5a7604a41d1f'::uuid),
  ('0280a876-12ac-490b-ac06-67fc46426cec'::uuid),
  ('02cb1517-31f4-4ea8-9b7e-8af10b90cadc'::uuid),
  ('03e56a71-5a0f-4baf-9537-1ca30f185ab2'::uuid),
  ('05b88bb8-97ff-47c0-98cf-c1d6390e36dc'::uuid),
  ('05d72f89-abaf-48bb-9d3b-7d0e3c1ba634'::uuid),
  ('07d5f719-969d-460d-9759-b70e5e3b0f00'::uuid),
  ('0818ab9c-a87f-4f64-a0c0-fcf42e4959a6'::uuid),
  ('0877ba2a-bbde-4864-9a50-efb3930d042a'::uuid),
  ('09c8225b-ada8-48d3-b4eb-c960e1077ca3'::uuid),
  ('0a8c3107-5965-4bb4-8c1e-8c9d91cdb885'::uuid),
  ('0b3ef5cc-8a3e-4024-aa88-3a2e6a29976a'::uuid),
  ('0b4fa613-36fa-41c9-9922-ef54fcdf3f6e'::uuid),
  ('0bcb6806-e0da-46b1-98f2-3085c9c62426'::uuid),
  ('0cfc8251-d688-40b8-b3eb-546cf8e97628'::uuid),
  ('0dc049fe-252a-4b46-99fb-5bcf7041ad8a'::uuid),
  ('0e137c9a-65f5-491e-8ee3-532dbfff1275'::uuid),
  ('0e5adbb8-23b5-4bc9-a2aa-ee82c6645924'::uuid),
  ('1039ef2e-cb0b-4dea-9bd0-325e89142b14'::uuid),
  ('1078ea62-cb49-4f08-a4ea-435a03d7fb73'::uuid),
  ('10aa3463-f577-42e0-9652-c9db5a868184'::uuid),
  ('110a6460-28bb-4dc3-ab06-08581c6e9f43'::uuid),
  ('112014e0-1ca5-4ba1-b475-e5328c939504'::uuid),
  ('11c7c564-7148-4518-bf23-343861d8ea24'::uuid),
  ('120b1c03-1e09-4380-bc22-c65a3ded21fc'::uuid),
  ('125d27af-40f6-4eed-9243-e0abde55130a'::uuid),
  ('12656619-4c8f-49f1-86da-9d5fbf3c519a'::uuid),
  ('1313122d-eb7b-4e34-806f-21c9231363a1'::uuid),
  ('13ca6c73-7519-47bd-8363-d11628d97e0f'::uuid),
  ('1656fbce-c94b-4ab1-88bb-73339bf9b17f'::uuid),
  ('166d5639-8ca0-4af9-ba81-af223e28dd0e'::uuid),
  ('16b82551-137f-461f-8d6f-5bb59b1cdd48'::uuid),
  ('16e467b6-2201-4422-9595-f402388b99b6'::uuid),
  ('1756d61e-0e7a-4a22-b955-3b26566faa83'::uuid),
  ('17b0dbe1-d823-4a5e-9be6-020342b949de'::uuid),
  ('17cb2cbb-8a18-46e5-89de-d7de43065f60'::uuid),
  ('17f5d652-b68f-4880-8145-4bfb077c26f9'::uuid),
  ('1a62e72f-0cfb-4a26-8100-b999fef3a130'::uuid),
  ('1acd7771-8b0d-48e8-baf4-0e586d0e0c79'::uuid),
  ('1af9e427-3912-4f1c-8a5c-db2d920cbd8a'::uuid),
  ('1bba3011-c779-46f7-98a8-847644c5b975'::uuid),
  ('1bf8cebb-3750-42cf-befa-d5905b6972c4'::uuid),
  ('1c2ea30d-0b67-4576-b770-1b7bb4bfe13f'::uuid),
  ('1d54d5ef-ea6b-49d9-b9eb-b3c2b36b9710'::uuid),
  ('1d6eee71-8628-491c-a958-05becfb6039e'::uuid),
  ('1e5f8728-e41d-44f9-8c5f-c2ada394771f'::uuid),
  ('1eb974a0-7d43-4bab-b0b6-b3ad6015d216'::uuid),
  ('1f1bf26c-7bbe-43a8-b986-6863aae67052'::uuid),
  ('1fb4680d-cd67-4fac-8538-e70f92c558e8'::uuid),
  ('1fc6b492-7420-4155-8937-359537afc0b6'::uuid),
  ('202816f2-9409-44d2-a1d2-df5b77ad0bef'::uuid),
  ('202fdda9-05c2-4487-8bc4-07f300399d81'::uuid),
  ('2145857e-944e-448a-a438-81ce23feb548'::uuid),
  ('23c4ee7a-506c-43e5-ae81-ff18d5626ff5'::uuid),
  ('242dbd7e-e02f-454f-b7e6-e61553c6e84c'::uuid),
  ('24fd059b-db26-4bc2-af3e-a17d7abdfce7'::uuid),
  ('25a47c42-4f41-4421-9ff1-3203d5b6e4e3'::uuid),
  ('266bd9e4-fad1-4925-b11a-5340c5d58712'::uuid),
  ('26f550f8-b94b-47ec-b720-eab50b4d3146'::uuid),
  ('27ce89f2-630c-4c5c-9fe5-a3670bbc5505'::uuid),
  ('288956b6-6200-4974-855d-0916c619c55e'::uuid),
  ('2965d2f4-9e8a-4c9c-af40-b7f4c294499a'::uuid),
  ('2a9326d2-4151-402d-9218-bb91ea589fc6'::uuid),
  ('2abfed6e-1016-4f34-8bfa-5fa303ed5097'::uuid),
  ('2b0500d7-7193-4194-af9c-0cbc472fc193'::uuid),
  ('2cbb6631-c492-4a83-a50c-98e1df5b4654'::uuid),
  ('2d1c0e60-3206-4356-980c-3603c09e7433'::uuid),
  ('2e5ba25c-e282-4bd6-a828-597c3340e7b6'::uuid),
  ('2ef75d57-d737-4427-a7be-d221c5145f8e'::uuid),
  ('2f55d339-73bd-4f9d-8824-540a7583fd4e'::uuid),
  ('2f66815d-c359-4244-be05-b1b7a2a5893d'::uuid),
  ('2fd8d12a-5d3e-4d7c-91aa-c5e110f84537'::uuid),
  ('307f60e0-35b3-4ba7-9bfe-ec1cb3f11b8f'::uuid),
  ('31302fc3-5de8-4361-8cea-505479466917'::uuid),
  ('3285de02-5535-4b46-a6c1-e0cc167c15ed'::uuid),
  ('32d3296f-0fe4-4f62-9105-ddbcf03d98a4'::uuid),
  ('333870a6-4501-4168-9dcd-efa0fa0af901'::uuid),
  ('349b88d2-2959-4b6e-924b-b54577f2c3ee'::uuid),
  ('34f962e6-5083-44bf-9e7d-c055a8043ee3'::uuid),
  ('371afabb-c0a6-4592-9e16-a9ed7c2a50b2'::uuid),
  ('3751c091-1c01-4da5-b502-67b5f780d03d'::uuid),
  ('393097f9-cee6-4cba-baca-0f8d92e375b6'::uuid),
  ('3941c079-579a-4936-a1ca-52b6473503b2'::uuid),
  ('39f551d7-e019-4281-8e8b-25603d24ccd0'::uuid),
  ('3a370dc4-3654-46b9-8f83-a8d4adafd787'::uuid),
  ('3ab6f1df-ef2a-4df1-a462-6d7e11ab28da'::uuid),
  ('3ac29c36-4950-4499-867b-b8bea514f6ca'::uuid),
  ('3d7e9ffd-6a58-4cbb-97e0-c328b65be929'::uuid),
  ('3d92934a-6144-42a6-a05f-6a3a1e1994f7'::uuid),
  ('3db49e7d-5a2a-48a6-a756-379abac5849c'::uuid),
  ('3e25a8d7-3cae-4778-9bf0-867de3c6088f'::uuid),
  ('3fb8ab9c-a4a8-4de7-8071-055f4b126dd3'::uuid),
  ('401e1fac-1dca-45f4-b770-f6b6ca3dd472'::uuid),
  ('40432cac-6173-47b6-b303-4894c49478ac'::uuid),
  ('40567f60-3cda-4718-a9e1-f437a51d5d57'::uuid),
  ('42695418-6026-4d60-b8dd-c9f617d6496d'::uuid),
  ('42ebbd8c-3be0-4688-b43b-63100404f2d0'::uuid),
  ('43852205-cfd0-4afa-bc26-33d722122b16'::uuid),
  ('44178a6b-a3d4-447f-b77e-820f3a55be80'::uuid),
  ('448c9e2f-40a5-4b77-86ce-a46e503a19a3'::uuid),
  ('45009624-819e-4283-914c-e4ab103af0ac'::uuid),
  ('4525a184-4a91-4aec-bb75-6448deb169d7'::uuid),
  ('457c6796-b18b-4dc8-8fa5-04d692ca6211'::uuid),
  ('464010be-3607-4a55-9dca-b3daf6f92ae8'::uuid),
  ('46735f57-1be6-4f05-87f5-cbc7c9f51892'::uuid),
  ('47f72c16-5f66-4cc0-8530-2c47d7141430'::uuid),
  ('4a5278d3-4f1d-4543-a538-2db38cacb681'::uuid),
  ('4c1a2c25-ed58-4b09-93e3-f722a9aa75f0'::uuid),
  ('4c92d461-c320-406e-aca5-db7d6f79bfaf'::uuid),
  ('4cc378ff-4d78-4e73-b54b-6a5fb25dad7b'::uuid),
  ('4d01aa45-e47c-41dd-a2f7-093eae3d0bfc'::uuid),
  ('4eb080bd-2937-4161-80b5-8c5924203601'::uuid),
  ('4eb83a23-07b8-4572-b5d7-9569e7c7a207'::uuid),
  ('4f06b4ce-ace6-4502-ac99-253895057850'::uuid),
  ('4f85db99-10a5-4afa-9251-df562a67eb42'::uuid),
  ('4f872031-0d4c-475a-9eed-37dd5f72e9cf'::uuid),
  ('52756ff8-24fc-478f-a22b-ee75ff6b8c96'::uuid),
  ('52c01440-6267-48c2-b3fa-b76db3588e28'::uuid),
  ('5405b081-e522-4059-bdc5-2892f19b33fc'::uuid),
  ('5441dd64-f3de-4945-b981-c55d47cf5a0d'::uuid),
  ('5506e274-2d7d-480f-932e-f48d7dae9cd3'::uuid),
  ('55568223-acbe-4bfd-b1e7-8297c3eb9253'::uuid),
  ('57b49f62-9cbf-4089-9abe-ac584859c9ea'::uuid),
  ('586f81c3-b8e0-4361-b03a-a0f2695ec420'::uuid),
  ('5a35cca7-2e8d-4b09-b55d-55100120ff6f'::uuid),
  ('5aa8141c-6c31-47b4-940c-c3c68d913106'::uuid),
  ('5aabdd8c-3294-469a-b772-d89276252356'::uuid),
  ('5bec80ba-4831-4fdb-a942-5bdac1e0e246'::uuid),
  ('5c62dba1-21bc-4559-83ec-05fbc582911f'::uuid),
  ('5d2564da-8bb3-4715-b7e7-de0271ad44de'::uuid),
  ('5e837e13-18cb-406f-ab8a-8928a5df727c'::uuid),
  ('5f4ecc0f-1359-4759-89ad-e2970bd53e22'::uuid),
  ('5f5277fb-511e-4360-b1fc-9279ef501cba'::uuid),
  ('5f6efb3a-dedb-4b6d-ba7b-11a7ff91606e'::uuid),
  ('60641cf6-bfe5-4266-bc54-964772fd8a6b'::uuid),
  ('61016f16-dbe3-4bd2-96d4-1432fd632b03'::uuid),
  ('641b22d7-f287-4308-91fc-556e2f92bd44'::uuid),
  ('6452eb5a-5a04-476e-a3d7-5314f9a31e8c'::uuid),
  ('64acd9a6-c636-4966-9a1d-04727c791516'::uuid),
  ('65447737-43ba-4bf3-aaa9-9b8c3c3d7452'::uuid),
  ('65882dc5-c11d-4e0b-bb7e-de64b5e2fcd4'::uuid),
  ('68564497-a4fe-465f-b121-03b0191cf80f'::uuid),
  ('68a1c2a8-8d16-408a-b08e-4b44f0f6b46f'::uuid),
  ('68a23243-cd5c-449e-854d-c9bbf9d71e5e'::uuid),
  ('694e0ba2-8212-4e55-9fd7-8f048071afed'::uuid),
  ('6964248a-0cbb-4bfd-af83-8ce2303558ef'::uuid),
  ('6968b5fd-cbad-4d1c-87f0-3370d23bfa01'::uuid),
  ('6c627cc4-1cd6-4c9a-9d0b-593a09d343d2'::uuid),
  ('6c9f14e7-0499-4dd5-8f15-cddbbb226e18'::uuid),
  ('6d7996bc-c399-4159-a926-e807d0ed50aa'::uuid),
  ('6ddc2bc5-43ab-4905-b635-3d8efd03dddc'::uuid),
  ('6e6591a3-24e9-49ab-8a6e-62aeb06f829e'::uuid),
  ('6eb43fa0-f02a-4e62-bb0a-9b87306c3904'::uuid),
  ('6fadd3f2-3f1b-449d-8289-4a69c8a2ffa4'::uuid),
  ('709967e9-c175-48c2-9941-44085284bf06'::uuid),
  ('716e22fa-da6f-4a7e-b490-1a8f835035fc'::uuid),
  ('7184a435-be9b-466c-9138-79a3c5130b89'::uuid),
  ('73390106-6996-41ff-aa0d-62522083d253'::uuid),
  ('73baeeb6-d76b-4491-9ce4-4bd86f9caea7'::uuid),
  ('76ea49b6-d5de-4932-894d-55529f64b92f'::uuid),
  ('7729312c-d1f3-4cbd-8669-16dd014c1de5'::uuid),
  ('781c8474-cb5f-4a41-bc4b-742ab1407bad'::uuid),
  ('782e7f30-472b-4b8d-a777-11fba6310518'::uuid),
  ('7894d124-b03f-403c-b877-950e81707998'::uuid),
  ('7b446737-b6ff-4971-ab5d-632e4ff1e321'::uuid),
  ('7c805afd-e7f1-4c30-a3d6-b717013df462'::uuid),
  ('7c843f7e-2da3-47e5-b241-7528ec5df60b'::uuid),
  ('7d40aff2-2744-4e42-9e93-199148360519'::uuid),
  ('7d6b3dac-16fe-4b26-b044-d7f6dd45f03c'::uuid),
  ('7e583542-865d-439e-9253-12f1acfafc17'::uuid),
  ('7f3b20e2-dc0d-4e10-998a-24d20e568711'::uuid),
  ('7f768d71-9606-42fc-a82e-1fcd28f1e3ed'::uuid),
  ('82ef14ec-d0b3-4b26-930e-abe1b3b72bce'::uuid),
  ('83b14222-00ff-43d0-8a8c-d055ede7e479'::uuid),
  ('858c4ff4-e2ee-45b3-8cb9-fa68f944b273'::uuid),
  ('85f721d9-e738-4d07-a76b-74d909275221'::uuid),
  ('8600698c-b6dd-4657-bc4a-8a5796b6ddb0'::uuid),
  ('8690c1a3-cf74-4aa1-a502-83eedc6323d2'::uuid),
  ('869d96e8-6ec8-4a3e-a2e2-987b340bd740'::uuid),
  ('878d7ac7-e76b-49a3-8fbd-34e3f7712232'::uuid),
  ('885038e8-5d74-4d4a-99e1-98acc66ace20'::uuid),
  ('88574664-7d6a-4403-aec6-3259d020281d'::uuid),
  ('88c63c53-d23e-4435-8f10-3d8c31de281e'::uuid),
  ('88e5951f-b837-436a-90b2-28889883a261'::uuid),
  ('8a2b169d-7791-493d-875c-fc8be59923ff'::uuid),
  ('8baf1e71-4e3c-440a-a920-e8a95bd44c72'::uuid),
  ('8c66ae21-cb85-4443-a861-28af7d22e1c3'::uuid),
  ('8d280c58-d205-4f70-825d-3bdb4a4a67f8'::uuid),
  ('8d3460a6-0203-4a74-95c4-1099c5d51030'::uuid),
  ('8ec842f5-39e0-4c9b-b992-7155a66f7bb6'::uuid),
  ('8ee8d84b-93a6-4a43-9b50-0507b59676f4'::uuid),
  ('8f9926aa-1d27-4a76-a1bd-76a311caf24d'::uuid),
  ('903871e3-c5f5-4ae3-95a8-7d6ed505e36f'::uuid),
  ('91cef780-f14a-44f8-b243-fbbe47591555'::uuid),
  ('933903c6-e969-4403-bd9d-bdd885fb4a53'::uuid),
  ('937a6347-d352-41c6-ac59-9345d120ac33'::uuid),
  ('937b4823-f76d-43be-ab62-2887fa11ddeb'::uuid),
  ('958cf178-052e-4230-9650-aab65ff7ff26'::uuid),
  ('95dfaa78-5f5a-4ea4-af2f-6bac3a9c28d8'::uuid),
  ('9603ab0d-a8f6-4339-8e70-18a3e507340b'::uuid),
  ('9632cc43-043c-470c-89ac-a7a2272d50d2'::uuid),
  ('96b5fbdf-2f35-4c78-a9a3-f5b1062ebf61'::uuid),
  ('96ca1326-2656-4589-aa84-e7c535d739db'::uuid),
  ('986a39ad-e0b1-4187-a351-18bfe35d3f26'::uuid),
  ('9a7d6acc-fdf1-43b2-b43a-205365c86159'::uuid),
  ('9a999632-3623-4184-af14-864291699c20'::uuid),
  ('9b29708b-d98a-4c97-959e-3ed4b4174eca'::uuid),
  ('9b35e984-abd0-400f-baf0-a4261fd82085'::uuid),
  ('9bb73b93-25cb-47ad-84de-267e13035a2f'::uuid),
  ('9c6605b0-5f99-4390-9f0f-8fa855201d76'::uuid),
  ('9e14a7fc-211b-43cd-ad68-746c70d7c5b1'::uuid),
  ('9f077232-8855-4e71-93eb-ac430e8bf7cb'::uuid),
  ('9f2af635-bd4b-40d6-84fc-89232d5671b1'::uuid),
  ('9ff1f865-3274-4c6f-b0e0-dae433f23619'::uuid),
  ('a02525c3-7f5e-4a1d-ad56-7e940808fa5b'::uuid),
  ('a0f86e13-5872-4c77-9a60-ca2ef36ede82'::uuid),
  ('a291673f-5ec9-4c9e-a944-4b93a5378b03'::uuid),
  ('a30365a6-1ce1-44f6-945e-d76a244c8576'::uuid),
  ('a5469a23-beba-4d5a-afed-3d3f7bc887b6'::uuid),
  ('a68adb11-7013-445a-a4f5-6d1cc1a0f548'::uuid),
  ('a70d4d94-a5c6-43ca-bb8e-420f04606a31'::uuid),
  ('a7bbc105-007e-43e2-bfde-f7fc7bf12055'::uuid),
  ('a944c179-6b2a-49ef-be94-b93b0f295893'::uuid),
  ('a97f7dfa-690c-423f-915b-31d2a903346b'::uuid),
  ('aa936011-9588-4283-92d4-3d3128e0c59b'::uuid),
  ('aad3ae1e-069c-40b5-a5cd-84038decf700'::uuid),
  ('ac53de9a-cc70-47df-b84d-f2aabae81c72'::uuid),
  ('ac99200b-6957-410f-a426-f310c4df4852'::uuid),
  ('ae41d0d3-0548-4784-9767-eb89949ef8c8'::uuid),
  ('af8f7fdb-ceac-4b0e-b111-6de82fd57da8'::uuid),
  ('b0ac298d-bfd0-4153-9944-ac84378fc3f2'::uuid),
  ('b12ae6b4-cf0d-41a8-a132-550bd8d78588'::uuid),
  ('b1d66706-f9ff-4aeb-9206-09b9f813b211'::uuid),
  ('b2760638-9edc-4583-b84a-f3e6a70a6c01'::uuid),
  ('b280d15f-7a5f-4f89-89a8-834b9dd3c60a'::uuid),
  ('b293e9be-065d-4d91-9b08-7bf8a9ebc20b'::uuid),
  ('b29c7c0b-d0f9-4eb0-85f1-0faef933ca9a'::uuid),
  ('b308e729-02b1-4cf3-9033-50e1993839bf'::uuid),
  ('b31df7a2-15fa-4d82-8e24-86e4dcbc3ba5'::uuid),
  ('b39aed9a-9d55-4524-baa6-e66ca7b2c0b4'::uuid),
  ('b562b890-90fb-480c-b445-3f2feb5139e5'::uuid),
  ('b5db1623-b295-4e7e-9a87-a70d087e3786'::uuid),
  ('b6e5d6e7-f038-4d84-9dc4-62e68b96f626'::uuid),
  ('b831cd7e-627a-4b9c-8a6d-5eee616f923e'::uuid),
  ('b8f3e6e4-dfeb-4730-90f3-5b8248f8bc0b'::uuid),
  ('b9d53898-240f-434b-ac6e-599a1176e7a9'::uuid),
  ('ba29814e-b2ae-440b-9350-fb8ef18112d7'::uuid),
  ('bac6accd-e557-49be-a3a9-c0177a5c06c0'::uuid),
  ('bb9888f5-1077-4a9e-8daf-dc5e94040bd4'::uuid),
  ('bc77021e-2647-45af-986d-9955ce2b4c86'::uuid),
  ('bcd3a3f0-e586-4c39-a628-07f158f65d9f'::uuid),
  ('bd898bfe-60b7-40ef-aacb-174b56807631'::uuid),
  ('bd9c11e1-ee84-40f2-940d-ed37f128d5b8'::uuid),
  ('bdc3c3eb-854e-4d24-abd1-2bce5074bae7'::uuid),
  ('bdea9dc6-8683-4163-8a29-b25e32537a33'::uuid),
  ('be8fbf4e-3c42-4e94-aa87-04f4d54a4ddc'::uuid),
  ('bf756794-833d-4e82-81b4-828c3963a535'::uuid),
  ('bf7b91fa-f934-48a0-835c-e6ab948bee12'::uuid),
  ('bfb77852-d08d-40a7-8c48-c1f4ee88c423'::uuid),
  ('c1db73c0-a584-4ca5-ae81-39eb93682f5f'::uuid),
  ('c2f09b8f-26e7-47c0-be0d-2882cbce9b50'::uuid),
  ('c4450a1a-ccda-4434-8f4b-0b60ef29dd6f'::uuid),
  ('c55cd5b7-229c-4c63-b67d-b0e0d5b8b371'::uuid),
  ('c62134e4-41bf-4ae8-b032-47dbf2d59933'::uuid),
  ('c625c55d-9fce-4a99-8509-172b1eb4da73'::uuid),
  ('c62d86d2-0ad1-4c58-8fd0-59237c43197b'::uuid),
  ('c8e4c924-96a1-40ee-b9ad-050c45bd0246'::uuid),
  ('c9845a85-5d26-4c6d-8592-ea53685e79fb'::uuid),
  ('c99377c3-1fd4-4d67-a6d9-9edf579c7ecd'::uuid),
  ('c9eaec92-569f-42a6-a115-20fadb3d8f12'::uuid),
  ('cc64fddf-b0cb-4413-ad6b-6561bb9f7cc5'::uuid),
  ('cd5a6b37-a1d7-4a8b-beda-fc7cbae0bf6d'::uuid),
  ('cdf635de-e6e9-411b-8816-8cf76e03b51c'::uuid),
  ('ce2d2343-26e6-49e1-968d-e4e4c349e21c'::uuid),
  ('cea3cadc-832c-46b8-89a8-94507ba9d777'::uuid),
  ('cf209b7a-2880-4552-99b9-2ec3afb0a5e3'::uuid),
  ('cf40555d-c33f-4f72-a032-0d117064e5d3'::uuid),
  ('d0197b3e-e025-4ad6-be52-181816943136'::uuid),
  ('d24c4c7e-6da2-497f-890b-2cddadee20f2'::uuid),
  ('d265e479-7e0f-4840-b92e-52e2e1850b16'::uuid),
  ('d27e7667-d0fa-4fca-92bd-227d9c736076'::uuid),
  ('d2c46ca8-cd06-4099-b0be-ac5de5f57c0e'::uuid),
  ('d364d1f3-a1fd-451e-997c-b10b0f66f436'::uuid),
  ('d41c021e-b9d0-4307-9813-47ffbbd0d7f6'::uuid),
  ('d5b8136b-39da-4a92-b038-da5933a8bbcc'::uuid),
  ('d682b1b9-80c0-43cd-8752-70493812dea5'::uuid),
  ('d6b93b56-35cb-4acc-9de6-c7099cfceccf'::uuid),
  ('d71bce94-cc8b-46bd-b1ad-52adf2433ed4'::uuid),
  ('d87059fd-676e-4a33-bc5e-1f659fc79319'::uuid),
  ('dbccd8ba-a4bd-4339-9ce4-d6edc69bfb97'::uuid),
  ('dc0932d0-8195-4020-9a75-6aaffbf74bc6'::uuid),
  ('dc6aabfc-889a-418a-a30e-7a2cf9704be3'::uuid),
  ('dce4c495-42a8-4d21-918a-2b5fcfe267ab'::uuid),
  ('defc7b24-bd77-408f-841d-ea021125424e'::uuid),
  ('dfb7e37d-c514-4006-b327-c62f477403c6'::uuid),
  ('e0f16a99-0345-4044-b1d7-1bc21681c2bd'::uuid),
  ('e15f02ec-e585-41bb-bd57-c006c04e938e'::uuid),
  ('e1949b09-65b7-413d-a47d-155226b5e30c'::uuid),
  ('e1967948-8fa0-4518-88eb-e24b16206610'::uuid),
  ('e21e809c-c6f3-4eb3-b43d-373919c42774'::uuid),
  ('e2c6dbc3-2bab-4d47-86f4-fb7d3bb62973'::uuid),
  ('e2d5d03d-68e5-4f72-8bb7-b18369f8d9ef'::uuid),
  ('e3302cf0-a728-4b80-a435-ea76dae28768'::uuid),
  ('e3e49eb7-a435-4e6b-8f3c-801cd601e17f'::uuid),
  ('e4138d65-d387-476a-a75a-06e5fff1d410'::uuid),
  ('e72abb11-10ec-4522-9ca7-953cfb9d6920'::uuid),
  ('e83e75ab-137f-4f62-9131-af9ac15178fd'::uuid),
  ('e8a59643-3b9b-48bd-8bd8-48ecb703ec80'::uuid),
  ('eb40bbaa-3099-4e37-9970-4ce232ccef03'::uuid),
  ('ebe5006d-3a44-408e-8d29-0fbd1c9b4e2f'::uuid),
  ('ec4407cc-2892-45ba-8960-04d155ae8f48'::uuid),
  ('ed2d144a-6262-4596-93df-b4c241fa959a'::uuid),
  ('eeaba8a0-dc1e-4376-8112-48a18ebed694'::uuid),
  ('ef3a0fd0-1fa5-4d88-aeb0-35da4ce85fd7'::uuid),
  ('f09b96a1-3ec9-4c61-b9a9-a273befd31f1'::uuid),
  ('f0c2705c-791e-403d-a352-7d739d231ba3'::uuid),
  ('f1326954-2aea-406f-b738-fc6af0d467f6'::uuid),
  ('f277ac06-aa48-41b4-8bea-acd020504020'::uuid),
  ('f28773cf-5dd6-42d7-ac37-66c1a94ec645'::uuid),
  ('f3a79833-9648-48c6-8808-8ddef3d9c562'::uuid),
  ('f48c7057-59eb-4655-a1e3-38f5ddd6c187'::uuid),
  ('f594658e-c8db-4bed-9ea7-241921c9518b'::uuid),
  ('f719bfa2-d484-41b0-a472-3e8defb8be34'::uuid),
  ('f7e26700-506a-4c94-b37f-e96a0a45efda'::uuid),
  ('f8006a39-6b01-4619-883f-66bba7b1156f'::uuid),
  ('f8973d80-31d2-4da7-824e-a9581604bcbc'::uuid),
  ('f957de31-ed07-47e0-8629-f290ce8e783f'::uuid),
  ('f9c041e5-cb5e-4365-9f52-75b0f4cef1a5'::uuid),
  ('fa2b51a2-73c5-4e6c-abbe-6159debc20ca'::uuid),
  ('fa3c0326-de34-4e6a-a07d-f610dfd34cbf'::uuid),
  ('fb9c1eff-dee9-4e85-bad6-1db2e17fbff6'::uuid),
  ('fb9ec27a-9974-4645-913b-2c4d70a025bf'::uuid),
  ('fc5f79d5-4863-449d-8ad4-d8ac8301af71'::uuid),
  ('fcecbd52-521e-4a53-9949-42091b6abdb7'::uuid),
  ('fd8537ac-9b5e-47b5-bf69-20208ecd5746'::uuid),
  ('ffeaaa13-cf62-4dc9-a157-889abc0ebf4b'::uuid);
-- END EXACT TEMPLATE DELETE SEED

-- BEGIN PUBLIC LOCKS
select pg_advisory_xact_lock(hashtextextended(
  'formate:b3e072d8-4656-47a5-b8e6-3ceb093c4113:e76e94b0-e459-4005-9072-045d72f2ca8f',
  0
));

lock table
  public.construction_subitems,
  public.admin_condition_template_values
in share row exclusive mode;

lock table
  public.construction_items,
  public.construction_subitem_variant_groups,
  public.admin_condition_templates,
  public.subitem_pyeong_values,
  public.detail_cost_categories,
  public.photos,
  public.sash_catalog_entries,
  public.estimates,
  public.estimate_versions,
  public.price_conditions
in share mode;
-- END PUBLIC LOCKS

do $$
declare
  actual_template_columns text;
  actual_subitem_fk_count integer;
  actual_subitem_fk_names text;
  actual_template_inbound_fk_count integer;
begin
  if (select count(*) from formate_sampung_legacy_target_seed) <> 171
     or (select count(distinct construction_subitem_id) from formate_sampung_legacy_target_seed) <> 171
     or (select count(*) from formate_sampung_legacy_target_seed where survivor_id is not null) <> 168
     or (select count(*) from formate_sampung_legacy_target_seed where survivor_id is null) <> 3
     or (select count(*) from formate_sampung_expected_cluster) <> 10 then
    raise exception 'STOP: exact legacy seed cardinality changed';
  end if;

  if exists (
    select 1
    from formate_sampung_expected_cluster expected
    full join (
      select cluster_key, count(*)::integer as candidate_count
      from formate_sampung_legacy_target_seed
      group by cluster_key
    ) actual using (cluster_key)
    where expected.cluster_key is null
       or actual.cluster_key is null
       or expected.candidate_count <> actual.candidate_count
  ) then
    raise exception 'STOP: exact legacy seed cluster cardinality changed';
  end if;

  if (select count(*) from formate_sampung_template_delete_seed) <> 336
     or (
       select md5(string_agg(template_value_id::text, ',' order by template_value_id))
       from formate_sampung_template_delete_seed
     ) <> '0b00fd9fd1a278859ac5f01dc8fc13d3' then
    raise exception 'STOP: exact Template DELETE UUID seed changed';
  end if;

  if (select count(*) from formate_sampung_official_survivor_seed) <> 6
     or (select count(*) from formate_sampung_official_survivor_seed where expected_requires_update) <> 2 then
    raise exception 'STOP: official survivor seed changed';
  end if;

  select string_agg(column_name, ',' order by ordinal_position)
  into actual_template_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'admin_condition_template_values';

  if actual_template_columns <>
    'id,template_id,item_id,subitem_id,option_value,quantity,labor_count,unit_price,labor_rate,created_at,updated_at,construction_days' then
    raise exception 'STOP: Template payload schema changed';
  end if;

  select count(*)::integer,
         string_agg(constraint_row.conname, ',' order by constraint_row.conname)
  into actual_subitem_fk_count, actual_subitem_fk_names
  from pg_constraint as constraint_row
  where constraint_row.contype = 'f'
    and constraint_row.confrelid = 'public.construction_subitems'::regclass;

  if actual_subitem_fk_count <> 6
     or actual_subitem_fk_names <> concat_ws(',',
       'admin_condition_template_values_subitem_id_fkey',
       'construction_subitem_variant_groups_base_subitem_item_fkey',
       'detail_cost_categories_subitem_id_fkey',
       'photos_construction_subitem_fkey',
       'sash_catalog_entries_construction_subitem_id_fkey',
       'subitem_pyeong_values_subitem_id_fkey'
     ) then
    raise exception 'STOP: construction_subitems FK graph changed';
  end if;

  select count(*)::integer
  into actual_template_inbound_fk_count
  from pg_constraint as constraint_row
  where constraint_row.contype = 'f'
    and constraint_row.confrelid = 'public.admin_condition_template_values'::regclass;

  if actual_template_inbound_fk_count <> 0 then
    raise exception 'STOP: an inbound FK now references Template value rows';
  end if;

  if not exists (
    select 1
    from pg_index
    where indexrelid = 'public.admin_condition_template_values_template_subitem_uidx'::regclass
      and indisvalid
      and indisunique
  ) then
    raise exception 'STOP: canonical Template uniqueness contract is unavailable';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from formate_sampung_legacy_target_seed target
    left join public.construction_subitems subitem
      on subitem.id = target.construction_subitem_id
    left join public.construction_items item
      on item.id = subitem.item_id
    where subitem.id is null
       or item.company_id <> 'b3e072d8-4656-47a5-b8e6-3ceb093c4113'::uuid
       or subitem.item_id <> 'e76e94b0-e459-4005-9072-045d72f2ca8f'::uuid
       or subitem.archived_at is not null
       or subitem.variant_group_id is not null
       or subitem.variant_value is not null
       or subitem.variant_value_text is not null
       or subitem.variant_unit is not null
  ) then
    raise exception 'STOP: a legacy target scope, active state, or standalone metadata changed';
  end if;

  if (select count(*) from public.construction_subitems
      where item_id = 'e76e94b0-e459-4005-9072-045d72f2ca8f'::uuid) <> 213
     or (select count(*) from public.construction_subitems
         where item_id = 'e76e94b0-e459-4005-9072-045d72f2ca8f'::uuid
           and archived_at is null and variant_group_id is null) <> 188
     or (select count(*) from public.construction_subitems subitem
         where subitem.item_id = 'e76e94b0-e459-4005-9072-045d72f2ca8f'::uuid
           and subitem.archived_at is null
           and subitem.variant_group_id is null
           and not exists (
             select 1
             from public.construction_subitem_variant_groups variant_group
             where variant_group.base_subitem_id = subitem.id
               and variant_group.archived_at is null
           )) <> 185
     or (select count(distinct variant_group_id) from public.construction_subitems
         where item_id = 'e76e94b0-e459-4005-9072-045d72f2ca8f'::uuid
           and archived_at is null and variant_group_id is not null) <> 6 then
    raise exception 'STOP: current flooring catalog cardinality changed';
  end if;
end
$$;

create temporary table formate_sampung_actual_cluster on commit drop as
with
actual_subitem as (
  select
    target.cluster_key,
    count(*)::integer as candidate_count,
    md5(string_agg(target.construction_subitem_id::text, ',' order by target.construction_subitem_id)) as uuid_set_md5,
    md5(jsonb_agg(to_jsonb(subitem) order by target.construction_subitem_id)::text) as rows_md5,
    md5(jsonb_agg(jsonb_build_object(
      'unit', subitem.unit,
      'unit_price', subitem.unit_price,
      'cost_price', subitem.cost_price,
      'cost_unit', subitem.cost_unit,
      'labor_rate', subitem.labor_rate,
      'labor_rate_empty', subitem.labor_rate_empty,
      'labor_rate_occupied', subitem.labor_rate_occupied,
      'spec_options', subitem.spec_options
    ) order by target.construction_subitem_id)::text) as commercial_md5
  from formate_sampung_legacy_target_seed target
  join public.construction_subitems subitem
    on subitem.id = target.construction_subitem_id
  group by target.cluster_key
),
actual_template as (
  select
    target.cluster_key,
    count(template_value.id)::integer as template_reference_count,
    md5(jsonb_agg(to_jsonb(template_value)
      order by target.construction_subitem_id, template_value.id)::text) as template_references_md5
  from formate_sampung_legacy_target_seed target
  join public.admin_condition_template_values template_value
    on template_value.subitem_id = target.construction_subitem_id
  group by target.cluster_key
),
actual_reference as (
  select
    expected.cluster_key,
    (select count(*) from public.subitem_pyeong_values value
      join formate_sampung_legacy_target_seed target on target.construction_subitem_id = value.subitem_id
      where target.cluster_key = expected.cluster_key)::integer as pyeong_reference_count,
    (select count(*) from public.detail_cost_categories value
      join formate_sampung_legacy_target_seed target on target.construction_subitem_id = value.subitem_id
      where target.cluster_key = expected.cluster_key)::integer as detail_reference_count,
    (select count(distinct photo.id) from public.photos photo
      join formate_sampung_legacy_target_seed target
        on photo.construction_subitem_id = target.construction_subitem_id
          or (photo.target_type = 'subitem' and photo.target_id = target.construction_subitem_id)
      where target.cluster_key = expected.cluster_key)::integer as photo_reference_count,
    (select count(*) from public.sash_catalog_entries value
      join formate_sampung_legacy_target_seed target
        on target.construction_subitem_id = value.construction_subitem_id
      where target.cluster_key = expected.cluster_key)::integer as sash_reference_count,
    (select count(*) from public.construction_subitem_variant_groups value
      join formate_sampung_legacy_target_seed target
        on target.construction_subitem_id = value.base_subitem_id
      where target.cluster_key = expected.cluster_key)::integer as base_group_reference_count,
    (select count(distinct estimate.id) from public.estimates estimate
      where exists (
        select 1 from formate_sampung_legacy_target_seed target
        where target.cluster_key = expected.cluster_key
          and (
            position(target.construction_subitem_id::text in estimate.items_data::text) > 0
            or position(target.construction_subitem_id::text in estimate.condition_snapshot::text) > 0
          )
      ))::integer as estimate_reference_count,
    (select count(distinct estimate_version.id) from public.estimate_versions estimate_version
      where exists (
        select 1 from formate_sampung_legacy_target_seed target
        where target.cluster_key = expected.cluster_key
          and (
            position(target.construction_subitem_id::text in estimate_version.items_snapshot::text) > 0
            or position(target.construction_subitem_id::text in estimate_version.condition_snapshot::text) > 0
          )
      ))::integer as estimate_version_reference_count,
    (select count(distinct price_condition.id) from public.price_conditions price_condition
      where exists (
        select 1 from formate_sampung_legacy_target_seed target
        where target.cluster_key = expected.cluster_key
          and position(target.construction_subitem_id::text in price_condition.saved_items_snapshot::text) > 0
      ))::integer as price_condition_reference_count
  from formate_sampung_expected_cluster expected
)
select
  subitem.*,
  template.template_references_md5,
  template.template_reference_count,
  reference.pyeong_reference_count,
  reference.detail_reference_count,
  reference.photo_reference_count,
  reference.sash_reference_count,
  reference.base_group_reference_count,
  reference.estimate_reference_count,
  reference.estimate_version_reference_count,
  reference.price_condition_reference_count
from actual_subitem subitem
join actual_template template using (cluster_key)
join actual_reference reference using (cluster_key);

do $$
begin
  if exists (
    select 1
    from formate_sampung_expected_cluster expected
    full join formate_sampung_actual_cluster actual using (cluster_key)
    where expected.cluster_key is null
       or actual.cluster_key is null
       or actual.candidate_count is distinct from expected.candidate_count
       or actual.uuid_set_md5 is distinct from expected.uuid_set_md5
       or actual.rows_md5 is distinct from expected.rows_md5
       or actual.commercial_md5 is distinct from expected.commercial_md5
       or actual.template_references_md5 is distinct from expected.template_references_md5
       or actual.template_reference_count is distinct from expected.template_reference_count
       or actual.pyeong_reference_count is distinct from expected.pyeong_reference_count
       or actual.detail_reference_count is distinct from expected.detail_reference_count
       or actual.photo_reference_count is distinct from expected.photo_reference_count
       or actual.sash_reference_count is distinct from expected.sash_reference_count
       or actual.base_group_reference_count is distinct from expected.base_group_reference_count
       or actual.estimate_reference_count is distinct from expected.estimate_reference_count
       or actual.estimate_version_reference_count is distinct from expected.estimate_version_reference_count
       or actual.price_condition_reference_count is distinct from expected.price_condition_reference_count
  ) then
    raise exception 'STOP: a legacy row/value/reference fingerprint changed';
  end if;
end
$$;

create temporary table formate_sampung_canonical_actual on commit drop as
select
  'group'::text as entity_type,
  variant_group.id,
  md5(to_jsonb(variant_group)::text) as row_md5
from public.construction_subitem_variant_groups variant_group
where variant_group.id in (
  '7d6c5536-8307-420e-8ee4-3068a9b7e2d2'::uuid,
  'f41d14e7-c091-4bab-9b9c-50b95d6245af'::uuid
)
union all
select
  'survivor',
  subitem.id,
  md5(to_jsonb(subitem)::text)
from public.construction_subitems subitem
where subitem.id in (
  '4d921b1b-11bb-49dc-9c07-6cf227c3d722'::uuid,
  '6ede4b59-4886-44ee-952a-9a6b8130aa6e'::uuid,
  '798437e8-54e5-41e1-a68b-bfed3f37c44e'::uuid,
  '805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb'::uuid,
  '8b516481-6e63-4b24-993a-971f46fe377c'::uuid,
  'bb3eb27f-321c-4cd6-8403-90c52707964e'::uuid,
  'dfee6e98-d20e-4ce5-82f3-9949091e5fb4'::uuid
);

do $$
begin
  if exists (
    select 1
    from formate_sampung_canonical_expected expected
    full join formate_sampung_canonical_actual actual using (entity_type, id)
    where expected.id is null
       or actual.id is null
       or expected.row_md5 is distinct from actual.row_md5
  ) then
    raise exception 'STOP: a canonical group or survivor fingerprint changed';
  end if;

  if exists (
    select 1
    from formate_sampung_official_survivor_seed official
    join public.construction_subitems subitem
      on subitem.id = official.construction_subitem_id
    where md5(to_jsonb(subitem)::text) <> official.expected_pre_row_md5
       or subitem.item_id <> 'e76e94b0-e459-4005-9072-045d72f2ca8f'::uuid
       or subitem.archived_at is not null
       or (
         official.expected_requires_update <>
         (
           row(subitem.unit_price, subitem.labor_rate, subitem.labor_rate_empty, subitem.labor_rate_occupied)
           is distinct from
           row(official.official_unit_price, official.official_labor_rate,
               official.official_labor_rate, official.official_labor_rate)
         )
       )
  ) then
    raise exception 'STOP: official survivor pre-update contract changed';
  end if;
end
$$;

create temporary table formate_sampung_template_collision_actual on commit drop as
select
  delete_seed.template_value_id,
  target.construction_subitem_id as legacy_subitem_id,
  target.survivor_id,
  legacy_value.template_id,
  legacy_value.item_id as legacy_item_id,
  canonical_value.id as canonical_template_value_id,
  canonical_value.subitem_id as canonical_subitem_id,
  canonical_value.item_id as canonical_item_id,
  template.company_id as template_company_id,
  (
    to_jsonb(legacy_value) - array['id', 'subitem_id', 'created_at', 'updated_at']
  ) = (
    to_jsonb(canonical_value) - array['id', 'subitem_id', 'created_at', 'updated_at']
  ) as complete_business_payload_equal
from formate_sampung_template_delete_seed delete_seed
left join public.admin_condition_template_values legacy_value
  on legacy_value.id = delete_seed.template_value_id
left join formate_sampung_legacy_target_seed target
  on target.construction_subitem_id = legacy_value.subitem_id
left join public.admin_condition_template_values canonical_value
  on canonical_value.template_id = legacy_value.template_id
 and canonical_value.subitem_id = target.survivor_id
left join public.admin_condition_templates template
  on template.id = legacy_value.template_id;

do $$
begin
  if (select count(*) from formate_sampung_template_collision_actual) <> 336
     or exists (
       select 1
       from formate_sampung_template_collision_actual collision
       where collision.legacy_subitem_id is null
          or collision.survivor_id is null
          or collision.template_id is null
          or collision.canonical_template_value_id is null
          or collision.canonical_subitem_id <> collision.survivor_id
          or collision.legacy_item_id <> 'e76e94b0-e459-4005-9072-045d72f2ca8f'::uuid
          or collision.canonical_item_id <> 'e76e94b0-e459-4005-9072-045d72f2ca8f'::uuid
          or collision.template_company_id <> 'b3e072d8-4656-47a5-b8e6-3ceb093c4113'::uuid
          or not collision.complete_business_payload_equal
          or exists (
            select 1
            from formate_sampung_template_delete_seed canonical_delete
            where canonical_delete.template_value_id = collision.canonical_template_value_id
          )
     ) then
    raise exception 'STOP: an exact Template duplicate/canonical payload relation changed';
  end if;

  if (select count(*)
      from public.admin_condition_template_values value
      join formate_sampung_legacy_target_seed target
        on target.construction_subitem_id = value.subitem_id
      where target.survivor_id is not null) <> 336
     or exists (
       select 1
       from public.admin_condition_template_values value
       join formate_sampung_legacy_target_seed target
         on target.construction_subitem_id = value.subitem_id
       left join formate_sampung_template_delete_seed delete_seed
         on delete_seed.template_value_id = value.id
       where target.survivor_id is not null
         and delete_seed.template_value_id is null
     ) then
    raise exception 'STOP: mapped legacy Template coverage is no longer exactly 336';
  end if;

  if (select count(*)
      from public.admin_condition_template_values value
      join formate_sampung_legacy_target_seed target
        on target.construction_subitem_id = value.subitem_id
      where target.survivor_id is null) <> 6
     or exists (
       select 1
       from public.admin_condition_template_values value
       join formate_sampung_legacy_target_seed target
         on target.construction_subitem_id = value.subitem_id
       join formate_sampung_template_delete_seed delete_seed
         on delete_seed.template_value_id = value.id
       where target.survivor_id is null
     ) then
    raise exception 'STOP: six non-duplicate Template rows must remain preserved';
  end if;

  if (select count(*)
      from public.admin_condition_template_values value
      join formate_sampung_legacy_target_seed target
        on target.construction_subitem_id = value.subitem_id) <> 342 then
    raise exception 'STOP: total target Template reference count changed';
  end if;
end
$$;

-- READ-ONLY PREFLIGHT COMPLETE
-- Everything above this marker is safe to run in a transaction declared READ ONLY
-- after removing only the marked PUBLIC LOCKS block. A passing run reaches here
-- with 171 exact subitems, 336 exact deletable duplicates, six preserved Template
-- references, six official survivors, and zero non-Template/history references.

create temporary table formate_sampung_before_guard (
  guard_key text primary key,
  row_count bigint not null,
  fingerprint text not null
) on commit drop;

insert into formate_sampung_before_guard
select
  'target_subitems_immutable',
  count(*),
  md5(coalesce(string_agg(
    md5((to_jsonb(subitem) - array['archived_at', 'updated_at'])::text),
    ',' order by subitem.id
  ), ''))
from public.construction_subitems subitem
join formate_sampung_legacy_target_seed target
  on target.construction_subitem_id = subitem.id
union all
select
  'official_survivors_immutable',
  count(*),
  md5(coalesce(string_agg(
    md5((to_jsonb(subitem) - array[
      'unit_price', 'labor_rate', 'labor_rate_empty', 'labor_rate_occupied', 'updated_at'
    ])::text),
    ',' order by subitem.id
  ), ''))
from public.construction_subitems subitem
join formate_sampung_official_survivor_seed official
  on official.construction_subitem_id = subitem.id
union all
select
  'subitems_outside_exact_mutation',
  count(*),
  md5(coalesce(string_agg(md5(to_jsonb(subitem)::text), ',' order by subitem.id), ''))
from public.construction_subitems subitem
where not exists (
    select 1 from formate_sampung_legacy_target_seed target
    where target.construction_subitem_id = subitem.id
  )
  and not exists (
    select 1 from formate_sampung_official_survivor_seed official
    where official.construction_subitem_id = subitem.id
  )
union all
select
  'templates_outside_exact_delete',
  count(*),
  md5(coalesce(string_agg(md5(to_jsonb(template_value)::text), ',' order by template_value.id), ''))
from public.admin_condition_template_values template_value
where not exists (
  select 1 from formate_sampung_template_delete_seed delete_seed
  where delete_seed.template_value_id = template_value.id
);

-- BEGIN MUTATION
do $$
declare
  affected_count integer;
  archive_timestamp timestamptz := clock_timestamp();
begin
  update public.construction_subitems subitem
  set
    unit_price = official.official_unit_price,
    labor_rate = official.official_labor_rate,
    labor_rate_empty = official.official_labor_rate,
    labor_rate_occupied = official.official_labor_rate
  from formate_sampung_official_survivor_seed official
  where subitem.id = official.construction_subitem_id
    and row(subitem.unit_price, subitem.labor_rate, subitem.labor_rate_empty, subitem.labor_rate_occupied)
      is distinct from
      row(official.official_unit_price, official.official_labor_rate,
          official.official_labor_rate, official.official_labor_rate);

  get diagnostics affected_count = row_count;
  if affected_count <> 2 then
    raise exception 'STOP: expected exactly two canonical commercial updates, got %', affected_count;
  end if;

  delete from public.admin_condition_template_values duplicate_value
  using formate_sampung_template_delete_seed delete_seed
  where duplicate_value.id = delete_seed.template_value_id;

  get diagnostics affected_count = row_count;
  if affected_count <> 336 then
    raise exception 'STOP: expected exactly 336 Template duplicate deletes, got %', affected_count;
  end if;

  update public.construction_subitems subitem
  set archived_at = archive_timestamp
  from formate_sampung_legacy_target_seed target
  where subitem.id = target.construction_subitem_id
    and subitem.archived_at is null;

  get diagnostics affected_count = row_count;
  if affected_count <> 171 then
    raise exception 'STOP: expected exactly 171 legacy archives, got %', affected_count;
  end if;
end
$$;
-- END MUTATION

do $$
declare
  before_count bigint;
  before_fingerprint text;
  after_count bigint;
  after_fingerprint text;
begin
  select row_count, fingerprint
  into before_count, before_fingerprint
  from formate_sampung_before_guard
  where guard_key = 'target_subitems_immutable';

  select
    count(*),
    md5(coalesce(string_agg(
      md5((to_jsonb(subitem) - array['archived_at', 'updated_at'])::text),
      ',' order by subitem.id
    ), ''))
  into after_count, after_fingerprint
  from public.construction_subitems subitem
  join formate_sampung_legacy_target_seed target
    on target.construction_subitem_id = subitem.id;

  if after_count <> before_count
     or after_fingerprint <> before_fingerprint
     or after_count <> 171
     or exists (
       select 1
       from public.construction_subitems subitem
       join formate_sampung_legacy_target_seed target
         on target.construction_subitem_id = subitem.id
       where subitem.archived_at is null
     ) then
    raise exception 'STOP: archived legacy UUID/commercial data preservation failed';
  end if;

  select row_count, fingerprint
  into before_count, before_fingerprint
  from formate_sampung_before_guard
  where guard_key = 'official_survivors_immutable';

  select
    count(*),
    md5(coalesce(string_agg(
      md5((to_jsonb(subitem) - array[
        'unit_price', 'labor_rate', 'labor_rate_empty', 'labor_rate_occupied', 'updated_at'
      ])::text),
      ',' order by subitem.id
    ), ''))
  into after_count, after_fingerprint
  from public.construction_subitems subitem
  join formate_sampung_official_survivor_seed official
    on official.construction_subitem_id = subitem.id;

  if after_count <> before_count
     or after_fingerprint <> before_fingerprint
     or after_count <> 6
     or exists (
       select 1
       from public.construction_subitems subitem
       join formate_sampung_official_survivor_seed official
         on official.construction_subitem_id = subitem.id
       where subitem.unit_price is distinct from official.official_unit_price
          or subitem.labor_rate is distinct from official.official_labor_rate
          or subitem.labor_rate_empty is distinct from official.official_labor_rate
          or subitem.labor_rate_occupied is distinct from official.official_labor_rate
          or subitem.archived_at is not null
     ) then
    raise exception 'STOP: official canonical value or immutable payload verification failed';
  end if;

  select row_count, fingerprint
  into before_count, before_fingerprint
  from formate_sampung_before_guard
  where guard_key = 'subitems_outside_exact_mutation';

  select
    count(*),
    md5(coalesce(string_agg(md5(to_jsonb(subitem)::text), ',' order by subitem.id), ''))
  into after_count, after_fingerprint
  from public.construction_subitems subitem
  where not exists (
      select 1 from formate_sampung_legacy_target_seed target
      where target.construction_subitem_id = subitem.id
    )
    and not exists (
      select 1 from formate_sampung_official_survivor_seed official
      where official.construction_subitem_id = subitem.id
    );

  if after_count <> before_count or after_fingerprint <> before_fingerprint then
    raise exception 'STOP: a construction_subitems row outside the exact mutation set changed';
  end if;

  select row_count, fingerprint
  into before_count, before_fingerprint
  from formate_sampung_before_guard
  where guard_key = 'templates_outside_exact_delete';

  select
    count(*),
    md5(coalesce(string_agg(md5(to_jsonb(template_value)::text), ',' order by template_value.id), ''))
  into after_count, after_fingerprint
  from public.admin_condition_template_values template_value
  where not exists (
    select 1 from formate_sampung_template_delete_seed delete_seed
    where delete_seed.template_value_id = template_value.id
  );

  if after_count <> before_count or after_fingerprint <> before_fingerprint then
    raise exception 'STOP: a Template row outside the exact DELETE set changed';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from public.admin_condition_template_values template_value
    join formate_sampung_template_delete_seed delete_seed
      on delete_seed.template_value_id = template_value.id
  ) then
    raise exception 'STOP: an exact Template duplicate UUID survived';
  end if;

  if (select count(*)
      from public.admin_condition_template_values template_value
      join formate_sampung_legacy_target_seed target
        on target.construction_subitem_id = template_value.subitem_id
      where target.survivor_id is not null) <> 0
     or (select count(*)
         from public.admin_condition_template_values template_value
         join formate_sampung_legacy_target_seed target
           on target.construction_subitem_id = template_value.subitem_id
         where target.survivor_id is null) <> 6 then
    raise exception 'STOP: post-migration Template preservation cardinality failed';
  end if;

  if (select count(*) from public.construction_subitems
      where item_id = 'e76e94b0-e459-4005-9072-045d72f2ca8f'::uuid) <> 213
     or (select count(*) from public.construction_subitems
         where item_id = 'e76e94b0-e459-4005-9072-045d72f2ca8f'::uuid
           and archived_at is null and variant_group_id is null) <> 17
     or (select count(*) from public.construction_subitems subitem
         where subitem.item_id = 'e76e94b0-e459-4005-9072-045d72f2ca8f'::uuid
           and subitem.archived_at is null
           and subitem.variant_group_id is null
           and not exists (
             select 1
             from public.construction_subitem_variant_groups variant_group
             where variant_group.base_subitem_id = subitem.id
               and variant_group.archived_at is null
           )) <> 14
     or (select count(distinct variant_group_id) from public.construction_subitems
         where item_id = 'e76e94b0-e459-4005-9072-045d72f2ca8f'::uuid
           and archived_at is null and variant_group_id is not null) <> 6 then
    raise exception 'STOP: post-migration flooring projection cardinality failed';
  end if;

  if exists (
    select 1
    from formate_sampung_legacy_target_seed target
    where exists (select 1 from public.subitem_pyeong_values where subitem_id = target.construction_subitem_id)
       or exists (select 1 from public.detail_cost_categories where subitem_id = target.construction_subitem_id)
       or exists (
         select 1 from public.photos
         where construction_subitem_id = target.construction_subitem_id
            or (target_type = 'subitem' and target_id = target.construction_subitem_id)
       )
       or exists (select 1 from public.sash_catalog_entries where construction_subitem_id = target.construction_subitem_id)
       or exists (select 1 from public.construction_subitem_variant_groups where base_subitem_id = target.construction_subitem_id)
       or exists (
         select 1 from public.estimates
         where position(target.construction_subitem_id::text in items_data::text) > 0
            or position(target.construction_subitem_id::text in condition_snapshot::text) > 0
       )
       or exists (
         select 1 from public.estimate_versions
         where position(target.construction_subitem_id::text in items_snapshot::text) > 0
            or position(target.construction_subitem_id::text in condition_snapshot::text) > 0
       )
       or exists (
         select 1 from public.price_conditions
         where position(target.construction_subitem_id::text in saved_items_snapshot::text) > 0
       )
  ) then
    raise exception 'STOP: a protected reference/history relation appeared during migration';
  end if;
end
$$;

select
  6::integer as official_survivor_count,
  2::integer as canonical_rows_updated,
  336::integer as exact_template_rows_deleted,
  6::integer as nonduplicate_template_rows_preserved,
  171::integer as legacy_subitems_archived,
  213::integer as raw_subitems_preserved,
  20::integer as expected_active_photo_products;

commit;
