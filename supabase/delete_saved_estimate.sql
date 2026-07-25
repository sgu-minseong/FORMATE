-- FORMATE saved estimate deletion
-- Apply after supabase/schema.sql and supabase/customer_operations.sql.

create or replace function public.delete_saved_estimate(
  p_company_id uuid,
  p_estimate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estimate_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to delete estimates for this company.'
      using errcode = '42501';
  end if;

  select e.id
  into v_estimate_id
  from public.estimates e
  where e.id = p_estimate_id
    and e.company_id = p_company_id
  for update;

  if v_estimate_id is null then
    return jsonb_build_object(
      'ok', false,
      'result', 'not_found'
    );
  end if;

  if exists (
    select 1
    from public.estimate_versions ev
    where ev.company_id = p_company_id
      and ev.estimate_id = p_estimate_id
  ) or exists (
    select 1
    from public.customer_access_tokens cat
    where cat.company_id = p_company_id
      and cat.estimate_id = p_estimate_id
  ) or exists (
    select 1
    from public.customer_requests cr
    where cr.company_id = p_company_id
      and cr.estimate_id = p_estimate_id
  ) or exists (
    select 1
    from public.customer_messages cm
    where cm.company_id = p_company_id
      and cm.estimate_id = p_estimate_id
  ) or exists (
    select 1
    from public.timeline_events te
    where te.company_id = p_company_id
      and te.estimate_id = p_estimate_id
  ) or exists (
    select 1
    from public.change_orders co
    where co.company_id = p_company_id
      and co.estimate_id = p_estimate_id
  ) or exists (
    select 1
    from public.notifications n
    where n.company_id = p_company_id
      and n.related_type = 'estimate'
      and n.related_id = p_estimate_id
  ) then
    return jsonb_build_object(
      'ok', false,
      'result', 'linked'
    );
  end if;

  delete from public.estimates e
  where e.id = p_estimate_id
    and e.company_id = p_company_id;

  return jsonb_build_object(
    'ok', true,
    'result', 'deleted',
    'estimateId', p_estimate_id
  );
end;
$$;

revoke all on function public.delete_saved_estimate(uuid, uuid) from public;
revoke all on function public.delete_saved_estimate(uuid, uuid) from anon;
grant execute on function public.delete_saved_estimate(uuid, uuid) to authenticated;
revoke delete on table public.estimates from authenticated;

notify pgrst, 'reload schema';
