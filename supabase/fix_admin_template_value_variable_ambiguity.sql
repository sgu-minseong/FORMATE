-- Fix the production Template write failure without changing schema or data.
-- The previous helper declared item_id/subitem_id variables with the same names
-- as table columns, so PostgreSQL rejected the scope check as ambiguous.

begin;

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
      construction_days
    ) values (
      p_template_id,
      resolved_item_id,
      resolved_subitem_id,
      '',
      case when entry ? 'quantity' then (entry ->> 'quantity')::numeric else null end,
      case when entry ? 'labor_count' then (entry ->> 'labor_count')::numeric else null end,
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

commit;
