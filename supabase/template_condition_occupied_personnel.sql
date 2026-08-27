-- FORMATE template personnel: existing labor_count remains vacant personnel.
-- Apply manually after canonical_variant_stability_rpc_bootstrap.sql.

begin;

alter table public.admin_condition_template_values
  add column if not exists labor_count_occupied numeric;

comment on column public.admin_condition_template_values.labor_count is
  'Vacant-home personnel. Existing values retain this meaning.';
comment on column public.admin_condition_template_values.labor_count_occupied is
  'Occupied-home personnel. Null means this template has no occupied personnel value.';

create or replace function public.formate_apply_admin_template_values(
  p_company_id uuid,
  p_template_id uuid,
  p_values jsonb,
  p_subitem_map jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  entry jsonb;
  subitem_ref text;
  resolved_subitem_id uuid;
  resolved_item_id uuid;
  owner_company_id uuid;
  value_id uuid;
  result jsonb := '[]'::jsonb;
  seen_refs jsonb := '{}'::jsonb;
begin
  if coalesce(jsonb_typeof(p_values), 'array') <> 'array' then
    raise exception 'Template values must be a JSON array.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.admin_condition_templates
    where id = p_template_id and company_id = p_company_id
  ) then
    raise exception 'Template does not belong to the requested company.' using errcode = '42501';
  end if;

  for entry in select value from jsonb_array_elements(coalesce(p_values, '[]'::jsonb)) loop
    subitem_ref := btrim(coalesce(entry ->> 'subitem_ref', entry ->> 'subitem_id', ''));
    if subitem_ref = '' or seen_refs ? subitem_ref then
      raise exception 'Template write contains a missing or duplicate subitem reference.' using errcode = '22023';
    end if;
    seen_refs := seen_refs || jsonb_build_object(subitem_ref, true);

    if p_subitem_map ? subitem_ref then
      resolved_subitem_id := (p_subitem_map ->> subitem_ref)::uuid;
    else
      resolved_subitem_id := subitem_ref::uuid;
    end if;
    resolved_item_id := (entry ->> 'item_id')::uuid;

    select item.company_id
    into owner_company_id
    from public.construction_subitems as subitem
    join public.construction_items as item on item.id = subitem.item_id
    where subitem.id = resolved_subitem_id
      and subitem.item_id = resolved_item_id;

    if not found or owner_company_id is distinct from p_company_id then
      raise exception 'Template value item/subitem does not belong to the requested company.'
        using errcode = '23514';
    end if;

    insert into public.admin_condition_template_values (
      template_id,
      item_id,
      subitem_id,
      option_value,
      quantity,
      labor_count,
      labor_count_occupied,
      construction_days
    ) values (
      p_template_id,
      resolved_item_id,
      resolved_subitem_id,
      '',
      case when entry ? 'quantity' then (entry ->> 'quantity')::numeric else null end,
      case when entry ? 'labor_count' then (entry ->> 'labor_count')::numeric else null end,
      case when entry ? 'labor_count_occupied' then (entry ->> 'labor_count_occupied')::numeric else null end,
      case when entry ? 'construction_days' then coalesce((entry ->> 'construction_days')::integer, 0) else 0 end
    )
    on conflict (template_id, subitem_id) do update
    set
      item_id = excluded.item_id,
      option_value = '',
      quantity = case
        when entry ? 'quantity' then excluded.quantity
        else admin_condition_template_values.quantity
      end,
      labor_count = case
        when entry ? 'labor_count' then excluded.labor_count
        else admin_condition_template_values.labor_count
      end,
      labor_count_occupied = case
        when entry ? 'labor_count_occupied' then excluded.labor_count_occupied
        else admin_condition_template_values.labor_count_occupied
      end,
      construction_days = case
        when entry ? 'construction_days' then excluded.construction_days
        else admin_condition_template_values.construction_days
      end
    returning id into value_id;

    result := result || jsonb_build_array(jsonb_build_object(
      'subitemId', resolved_subitem_id,
      'valueId', value_id
    ));
  end loop;

  return result;
end;
$$;

revoke all on function public.formate_apply_admin_template_values(uuid, uuid, jsonb, jsonb)
  from public, anon, authenticated;

create or replace function public.save_admin_template_atomic(
  p_company_id uuid,
  p_condition jsonb,
  p_values jsonb default '[]'::jsonb,
  p_mode text default 'upsert',
  p_template_id uuid default null,
  p_source_template_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  template_row public.admin_condition_templates%rowtype;
  created boolean := false;
  value_rows jsonb := '[]'::jsonb;
  source_values jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to save Templates for this company.'
      using errcode = '42501';
  end if;
  if p_mode not in ('upsert', 'create_if_absent', 'edit', 'duplicate') then
    raise exception 'Unsupported atomic Template write mode.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_condition) <> 'object' then
    raise exception 'Template condition is required.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('formate-template:' || p_company_id::text, 0));

  if p_mode = 'edit' then
    update public.admin_condition_templates
    set
      pyeong = (p_condition ->> 'pyeong')::integer,
      build_type = p_condition ->> 'build_type',
      has_extension = coalesce((p_condition ->> 'has_extension')::boolean, false),
      condition_variant = coalesce(p_condition ->> 'condition_variant', '')
    where id = p_template_id and company_id = p_company_id
    returning * into template_row;
    if not found then
      raise exception 'Template to edit was not found in the requested company.' using errcode = 'P0002';
    end if;
  else
    select * into template_row
    from public.admin_condition_templates
    where company_id = p_company_id
      and pyeong = (p_condition ->> 'pyeong')::integer
      and build_type = p_condition ->> 'build_type'
      and has_extension = coalesce((p_condition ->> 'has_extension')::boolean, false)
      and condition_variant = coalesce(p_condition ->> 'condition_variant', '')
    for update;

    if found and p_mode = 'duplicate' then
      raise exception 'Duplicate Template target condition already exists.' using errcode = '23505';
    end if;
    if not found then
      insert into public.admin_condition_templates (
        company_id, pyeong, build_type, has_extension, condition_variant
      ) values (
        p_company_id,
        (p_condition ->> 'pyeong')::integer,
        p_condition ->> 'build_type',
        coalesce((p_condition ->> 'has_extension')::boolean, false),
        coalesce(p_condition ->> 'condition_variant', '')
      ) returning * into template_row;
      created := true;
    elsif p_mode = 'create_if_absent' then
      return jsonb_build_object(
        'ok', true,
        'created', false,
        'template', to_jsonb(template_row),
        'templateValues', '[]'::jsonb
      );
    end if;
  end if;

  if p_mode = 'duplicate' then
    if p_source_template_id is null or not exists (
      select 1 from public.admin_condition_templates
      where id = p_source_template_id and company_id = p_company_id
    ) then
      raise exception 'Source Template was not found in the requested company.' using errcode = 'P0002';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object(
      'item_id', value.item_id,
      'subitem_ref', value.subitem_id,
      'quantity', value.quantity,
      'labor_count', value.labor_count,
      'labor_count_occupied', value.labor_count_occupied,
      'construction_days', value.construction_days
    )), '[]'::jsonb)
    into source_values
    from public.admin_condition_template_values as value
    where value.template_id = p_source_template_id;
    value_rows := public.formate_apply_admin_template_values(
      p_company_id, template_row.id, source_values, '{}'::jsonb
    );
  else
    value_rows := public.formate_apply_admin_template_values(
      p_company_id, template_row.id, coalesce(p_values, '[]'::jsonb), '{}'::jsonb
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'created', created,
    'template', to_jsonb(template_row),
    'templateValues', value_rows
  );
end;
$$;

commit;
