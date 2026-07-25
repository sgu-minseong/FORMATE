-- FORMATE saved estimate hard-delete and archive policy
-- Apply after supabase/delete_saved_estimate.sql and supabase/customer_portal.sql.

alter table public.estimates
  add column if not exists archived_at timestamptz;

alter table public.estimates
  add column if not exists archived_by uuid;

alter table public.estimates
  add column if not exists archive_reason text;

create index if not exists estimates_company_archived_at_idx
  on public.estimates(company_id, archived_at);

create or replace function public.normalize_estimate_link_copy_message()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.message_type = 'estimate_link' and new.channel = 'link_copy' then
    new.sent_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_estimate_link_copy_message
  on public.customer_messages;

create trigger normalize_estimate_link_copy_message
before insert or update of message_type, channel, sent_at
on public.customer_messages
for each row
execute function public.normalize_estimate_link_copy_message();

create or replace function public.clear_link_copy_estimate_version_sent_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.message_type = 'estimate_link'
     and new.channel = 'link_copy'
     and new.estimate_version_id is not null then
    update public.estimate_versions ev
    set sent_at = null
    where ev.id = new.estimate_version_id
      and ev.status = 'sent'
      and ev.viewed_at is null
      and ev.approved_at is null
      and not exists (
        select 1
        from public.customer_messages delivered
        where delivered.estimate_version_id = ev.id
          and delivered.id <> new.id
          and delivered.message_type = 'estimate_link'
          and delivered.channel <> 'link_copy'
          and delivered.status in ('sent', 'delivered', 'clicked', 'responded')
          and (
            delivered.sent_at is not null
            or delivered.status in ('delivered', 'clicked', 'responded')
          )
      );
  end if;

  return new;
end;
$$;

drop trigger if exists clear_link_copy_estimate_version_sent_at
  on public.customer_messages;

create trigger clear_link_copy_estimate_version_sent_at
after insert
on public.customer_messages
for each row
execute function public.clear_link_copy_estimate_version_sent_at();

update public.customer_messages
set sent_at = null
where message_type = 'estimate_link'
  and channel = 'link_copy'
  and sent_at is not null;

update public.estimate_versions ev
set sent_at = null
where ev.status = 'sent'
  and ev.viewed_at is null
  and ev.approved_at is null
  and exists (
    select 1
    from public.customer_messages copied
    where copied.estimate_version_id = ev.id
      and copied.message_type = 'estimate_link'
      and copied.channel = 'link_copy'
  )
  and not exists (
    select 1
    from public.customer_messages delivered
    where delivered.estimate_version_id = ev.id
      and delivered.message_type = 'estimate_link'
      and delivered.channel <> 'link_copy'
      and delivered.status in ('sent', 'delivered', 'clicked', 'responded')
      and (
        delivered.sent_at is not null
        or delivered.status in ('delivered', 'clicked', 'responded')
      )
  );

create or replace function public.get_saved_estimate_removal_mode(
  p_company_id uuid,
  p_estimate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estimate public.estimates%rowtype;
  v_version_ids uuid[] := array[]::uuid[];
  v_reasons text[] := array[]::text[];
begin
  if auth.uid() is null or not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to inspect estimates for this company.'
      using errcode = '42501';
  end if;

  select e.*
  into v_estimate
  from public.estimates e
  where e.id = p_estimate_id
    and e.company_id = p_company_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'result', 'not_found'
    );
  end if;

  if v_estimate.archived_at is not null then
    return jsonb_build_object(
      'ok', true,
      'mode', 'archive',
      'reasons', jsonb_build_array('already_archived'),
      'archived', true
    );
  end if;

  select coalesce(array_agg(ev.id), array[]::uuid[])
  into v_version_ids
  from public.estimate_versions ev
  where ev.company_id = p_company_id
    and ev.estimate_id = p_estimate_id;

  -- Link creation currently writes sent_at and estimate_sent even for link_copy.
  -- Only a non-link_copy delivery record is treated as an actual customer send.
  if exists (
    select 1
    from public.customer_messages cm
    where cm.company_id = p_company_id
      and (
        cm.estimate_id = p_estimate_id
        or cm.estimate_version_id = any(v_version_ids)
      )
      and cm.message_type = 'estimate_link'
      and cm.channel <> 'link_copy'
      and cm.status in ('sent', 'delivered', 'clicked', 'responded')
      and (
        cm.sent_at is not null
        or cm.status in ('delivered', 'clicked', 'responded')
      )
  ) or exists (
    select 1
    from public.timeline_events te
    where te.company_id = p_company_id
      and (
        te.estimate_id = p_estimate_id
        or te.estimate_version_id = any(v_version_ids)
      )
      and te.event_type = 'estimate_sent'
      and coalesce(te.metadata ->> 'channel', '') in ('sms', 'kakao', 'email', 'phone', 'manual')
  ) then
    v_reasons := array_append(v_reasons, 'customer_sent');
  end if;

  if exists (
    select 1
    from public.estimate_versions ev
    where ev.company_id = p_company_id
      and ev.estimate_id = p_estimate_id
      and (
        ev.viewed_at is not null
        or ev.status in ('viewed', 'revision_requested', 'approved')
      )
  ) or exists (
    select 1
    from public.customer_access_tokens cat
    where cat.company_id = p_company_id
      and (
        cat.estimate_id = p_estimate_id
        or cat.estimate_version_id = any(v_version_ids)
      )
      and cat.last_accessed_at is not null
  ) or exists (
    select 1
    from public.timeline_events te
    where te.company_id = p_company_id
      and (
        te.estimate_id = p_estimate_id
        or te.estimate_version_id = any(v_version_ids)
      )
      and te.event_type = 'estimate_viewed'
  ) then
    v_reasons := array_append(v_reasons, 'customer_viewed');
  end if;

  if exists (
    select 1
    from public.estimate_versions ev
    where ev.company_id = p_company_id
      and ev.estimate_id = p_estimate_id
      and (
        ev.approved_at is not null
        or ev.status = 'approved'
      )
  ) or exists (
    select 1
    from public.customer_requests cr
    where cr.company_id = p_company_id
      and (
        cr.estimate_id = p_estimate_id
        or cr.estimate_version_id = any(v_version_ids)
      )
      and (
        cr.request_type = 'approval'
        or cr.status = 'approved'
      )
  ) or exists (
    select 1
    from public.timeline_events te
    where te.company_id = p_company_id
      and (
        te.estimate_id = p_estimate_id
        or te.estimate_version_id = any(v_version_ids)
      )
      and te.event_type = 'request_received'
      and coalesce(te.metadata ->> 'requestType', '') = 'approval'
  ) then
    v_reasons := array_append(v_reasons, 'customer_approved');
  end if;

  if exists (
    select 1
    from public.customer_requests cr
    where cr.company_id = p_company_id
      and (
        cr.estimate_id = p_estimate_id
        or cr.estimate_version_id = any(v_version_ids)
      )
  ) or exists (
    select 1
    from public.timeline_events te
    where te.company_id = p_company_id
      and (
        te.estimate_id = p_estimate_id
        or te.estimate_version_id = any(v_version_ids)
      )
      and te.event_type in ('request_received', 'request_updated')
  ) then
    v_reasons := array_append(v_reasons, 'customer_request');
  end if;

  if exists (
    select 1
    from public.customer_messages cm
    where cm.company_id = p_company_id
      and (
        cm.estimate_id = p_estimate_id
        or cm.estimate_version_id = any(v_version_ids)
      )
      and not (
        cm.message_type = 'estimate_link'
        and cm.channel = 'link_copy'
        and cm.customer_request_id is null
      )
  ) then
    v_reasons := array_append(v_reasons, 'customer_message');
  end if;

  if exists (
    select 1
    from public.change_orders co
    where co.company_id = p_company_id
      and (
        co.estimate_id = p_estimate_id
        or co.estimate_version_id = any(v_version_ids)
      )
  ) or exists (
    select 1
    from public.timeline_events te
    where te.company_id = p_company_id
      and (
        te.estimate_id = p_estimate_id
        or te.estimate_version_id = any(v_version_ids)
      )
      and te.event_type in ('change_order_created', 'change_order_approved')
  ) then
    v_reasons := array_append(v_reasons, 'change_order');
  end if;

  if exists (
    select 1
    from public.estimate_versions ev
    join public.projects p
      on p.id = ev.project_id
     and p.company_id = ev.company_id
    where ev.company_id = p_company_id
      and ev.estimate_id = p_estimate_id
      and (
        p.contract_status <> 'not_started'
        or p.construction_status <> 'not_started'
        or p.aftercare_status <> 'not_started'
        or p.service_status <> 'not_started'
        or p.estimate_status in ('viewed', 'revision_requested', 'approved')
      )
  ) then
    v_reasons := array_append(v_reasons, 'customer_operations_history');
  end if;

  if exists (
    select 1
    from public.timeline_events te
    where te.company_id = p_company_id
      and (
        te.estimate_id = p_estimate_id
        or te.estimate_version_id = any(v_version_ids)
      )
      and te.event_type not in (
        'estimate_created',
        'estimate_sent',
        'estimate_viewed',
        'request_received',
        'request_updated',
        'change_order_created',
        'change_order_approved'
      )
  ) then
    v_reasons := array_append(v_reasons, 'customer_operations_history');
  end if;

  return jsonb_build_object(
    'ok', true,
    'mode', case when cardinality(v_reasons) = 0 then 'hard_delete' else 'archive' end,
    'reasons', to_jsonb(v_reasons),
    'archived', false
  );
end;
$$;

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
  v_version_ids uuid[] := array[]::uuid[];
  v_mode_result jsonb;
  v_password_authenticated_at bigint;
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

  select max((amr_entry ->> 'timestamp')::bigint)
  into v_password_authenticated_at
  from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) amr_entry
  where amr_entry ->> 'method' = 'password'
    and coalesce(amr_entry ->> 'timestamp', '') ~ '^[0-9]+$';

  if v_password_authenticated_at is null
     or v_password_authenticated_at < extract(epoch from now() - interval '5 minutes')::bigint then
    return jsonb_build_object(
      'ok', false,
      'result', 'reauthentication_required'
    );
  end if;

  select e.id
  into v_estimate_id
  from public.estimates e
  where e.id = p_estimate_id
    and e.company_id = p_company_id
    and e.archived_at is null
  for update;

  if v_estimate_id is null then
    return jsonb_build_object(
      'ok', false,
      'result', 'not_found'
    );
  end if;

  v_mode_result := public.get_saved_estimate_removal_mode(
    p_company_id,
    p_estimate_id
  );

  if coalesce(v_mode_result ->> 'mode', '') <> 'hard_delete' then
    return jsonb_build_object(
      'ok', false,
      'result', 'removal_mode_changed_to_archive',
      'mode', 'archive',
      'reasons', coalesce(v_mode_result -> 'reasons', '[]'::jsonb)
    );
  end if;

  select coalesce(array_agg(ev.id), array[]::uuid[])
  into v_version_ids
  from public.estimate_versions ev
  where ev.company_id = p_company_id
    and ev.estimate_id = p_estimate_id;

  delete from public.customer_access_tokens cat
  where cat.company_id = p_company_id
    and (
      cat.estimate_id = p_estimate_id
      or cat.estimate_version_id = any(v_version_ids)
    );

  delete from public.timeline_events te
  where te.company_id = p_company_id
    and (
      te.estimate_id = p_estimate_id
      or te.estimate_version_id = any(v_version_ids)
    )
    and (
      (
        te.event_type = 'estimate_sent'
        and coalesce(te.metadata ->> 'channel', '') = 'link_copy'
      )
      or (
        te.event_type = 'estimate_created'
        and coalesce(te.metadata ->> 'source', '') = 'customer_portal_link'
      )
    );

  delete from public.notifications n
  where n.company_id = p_company_id
    and n.event_type in (
      'estimate_created',
      'estimate_sent',
      'link_created',
      'estimate_link_created'
    )
    and (
      (n.related_type = 'estimate' and n.related_id = p_estimate_id)
      or (
        n.related_type = 'estimate_version'
        and n.related_id = any(v_version_ids)
      )
    );

  delete from public.estimate_versions ev
  where ev.company_id = p_company_id
    and ev.estimate_id = p_estimate_id;

  delete from public.estimates e
  where e.id = p_estimate_id
    and e.company_id = p_company_id
    and e.archived_at is null;

  return jsonb_build_object(
    'ok', true,
    'result', 'deleted',
    'estimateId', p_estimate_id
  );
end;
$$;

create or replace function public.archive_saved_estimate(
  p_company_id uuid,
  p_estimate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estimate public.estimates%rowtype;
  v_mode_result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to archive estimates for this company.'
      using errcode = '42501';
  end if;

  select e.*
  into v_estimate
  from public.estimates e
  where e.id = p_estimate_id
    and e.company_id = p_company_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'result', 'not_found'
    );
  end if;

  if v_estimate.archived_at is not null then
    return jsonb_build_object(
      'ok', true,
      'result', 'already_archived',
      'estimateId', p_estimate_id
    );
  end if;

  v_mode_result := public.get_saved_estimate_removal_mode(
    p_company_id,
    p_estimate_id
  );

  if coalesce(v_mode_result ->> 'mode', '') <> 'archive' then
    return jsonb_build_object(
      'ok', false,
      'result', 'hard_delete_required'
    );
  end if;

  update public.estimates e
  set
    archived_at = now(),
    archived_by = auth.uid(),
    archive_reason = 'customer_history_preserved'
  where e.id = p_estimate_id
    and e.company_id = p_company_id;

  return jsonb_build_object(
    'ok', true,
    'result', 'archived',
    'estimateId', p_estimate_id,
    'reasons', coalesce(v_mode_result -> 'reasons', '[]'::jsonb)
  );
end;
$$;

create or replace function public.restore_saved_estimate(
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
    raise exception 'You do not have permission to restore estimates for this company.'
      using errcode = '42501';
  end if;

  select e.id
  into v_estimate_id
  from public.estimates e
  where e.id = p_estimate_id
    and e.company_id = p_company_id
    and e.archived_at is not null
  for update;

  if v_estimate_id is null then
    return jsonb_build_object(
      'ok', false,
      'result', 'not_found'
    );
  end if;

  update public.estimates e
  set
    archived_at = null,
    archived_by = null,
    archive_reason = null
  where e.id = p_estimate_id
    and e.company_id = p_company_id;

  return jsonb_build_object(
    'ok', true,
    'result', 'restored',
    'estimateId', p_estimate_id
  );
end;
$$;

revoke all on function public.get_saved_estimate_removal_mode(uuid, uuid) from public;
revoke all on function public.get_saved_estimate_removal_mode(uuid, uuid) from anon;
grant execute on function public.get_saved_estimate_removal_mode(uuid, uuid) to authenticated;

revoke all on function public.delete_saved_estimate(uuid, uuid) from public;
revoke all on function public.delete_saved_estimate(uuid, uuid) from anon;
grant execute on function public.delete_saved_estimate(uuid, uuid) to authenticated;

revoke all on function public.archive_saved_estimate(uuid, uuid) from public;
revoke all on function public.archive_saved_estimate(uuid, uuid) from anon;
grant execute on function public.archive_saved_estimate(uuid, uuid) to authenticated;

revoke all on function public.restore_saved_estimate(uuid, uuid) from public;
revoke all on function public.restore_saved_estimate(uuid, uuid) from anon;
grant execute on function public.restore_saved_estimate(uuid, uuid) to authenticated;

revoke delete on table public.estimates from authenticated;

notify pgrst, 'reload schema';
