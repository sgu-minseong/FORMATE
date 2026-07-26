-- FORMATE operations lifecycle foundation
-- Apply after:
--   1. supabase/schema.sql
--   2. supabase/customer_operations.sql
--   3. supabase/customer_portal.sql
--   4. supabase/estimate_archive_policy.sql
--
-- This migration intentionally preserves estimates, projects, requests,
-- messages, timeline events, change orders, customers, and historical tokens.

alter table public.estimates
  add column if not exists deleted_at timestamptz;

alter table public.estimates
  add column if not exists deleted_by uuid;

alter table public.estimates
  add column if not exists delete_reason text;

alter table public.projects
  add column if not exists deleted_at timestamptz;

alter table public.projects
  add column if not exists deleted_by uuid;

alter table public.projects
  add column if not exists completed_at timestamptz;

alter table public.projects
  add column if not exists completed_by uuid;

alter table public.projects
  add column if not exists cancelled_at timestamptz;

alter table public.projects
  add column if not exists cancelled_by uuid;

alter table public.customer_requests
  add column if not exists completed_at timestamptz;

alter table public.customer_requests
  add column if not exists completed_by uuid;

alter table public.customer_requests
  add column if not exists closed_reason text;

-- Preserve the legacy archive columns. Copy only into empty lifecycle fields.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'estimates'
      and column_name = 'archived_at'
  ) then
    execute $migration$
      update public.estimates
      set deleted_at = archived_at
      where deleted_at is null
        and archived_at is not null
    $migration$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'estimates'
      and column_name = 'archived_by'
  ) then
    execute $migration$
      update public.estimates
      set deleted_by = archived_by
      where deleted_by is null
        and archived_by is not null
    $migration$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'estimates'
      and column_name = 'archive_reason'
  ) then
    execute $migration$
      update public.estimates
      set delete_reason = archive_reason
      where delete_reason is null
        and archive_reason is not null
        and deleted_at is not null
    $migration$;
  end if;
end
$$;

-- Some deployed databases may already have projects.status even though the
-- checked-in customer_operations.sql currently uses construction_status.
-- Widen only an existing finite-value CHECK that directly depends on status;
-- retain the complete original expression and constraint name.
do $$
declare
  v_constraint record;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'status'
  ) then
    for v_constraint in
      select
        c.conname,
        pg_get_expr(c.conbin, c.conrelid) as check_expression
      from pg_constraint c
      join pg_attribute a
        on a.attrelid = c.conrelid
       and a.attname = 'status'
       and a.attnum = any(c.conkey)
      where c.conrelid = 'public.projects'::regclass
        and c.contype = 'c'
        and position(
          'ANY (ARRAY['
          in upper(pg_get_expr(c.conbin, c.conrelid))
        ) > 0
    loop
      if position('''completed''' in v_constraint.check_expression) = 0
         or position('''cancelled''' in v_constraint.check_expression) = 0 then
        execute format(
          'alter table public.projects drop constraint %I',
          v_constraint.conname
        );
        execute format(
          'alter table public.projects add constraint %I check ((%s) or status in (%L, %L))',
          v_constraint.conname,
          v_constraint.check_expression,
          'completed',
          'cancelled'
        );
      end if;
    end loop;
  end if;
end
$$;

create index if not exists estimates_company_deleted_at_idx
  on public.estimates(company_id, deleted_at);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'status'
  ) then
    execute $index$
      create index if not exists projects_company_deleted_status_idx
        on public.projects(company_id, deleted_at, status)
    $index$;
  else
    execute $index$
      create index if not exists projects_company_deleted_construction_status_idx
        on public.projects(company_id, deleted_at, construction_status)
    $index$;
  end if;
end
$$;

-- This name already exists in customer_operations.sql, so this is a no-op
-- where the equivalent index has already been applied.
create index if not exists customer_requests_company_status_idx
  on public.customer_requests(company_id, status);

create index if not exists customer_access_tokens_company_estimate_status_idx
  on public.customer_access_tokens(company_id, estimate_id, status);

create index if not exists customer_access_tokens_estimate_version_id_idx
  on public.customer_access_tokens(estimate_version_id);

create or replace function public.move_saved_estimate_to_trash(
  p_company_id uuid,
  p_estimate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_deleted_at timestamptz;
  v_revoked_token_count integer := 0;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to move estimates for this company.'
      using errcode = '42501';
  end if;

  select e.deleted_at
  into v_deleted_at
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

  if v_deleted_at is not null then
    return jsonb_build_object(
      'ok', true,
      'result', 'already_in_trash',
      'estimateId', p_estimate_id,
      'deletedAt', v_deleted_at
    );
  end if;

  update public.estimates e
  set
    deleted_at = now(),
    deleted_by = auth.uid(),
    delete_reason = 'user_deleted'
  where e.id = p_estimate_id
    and e.company_id = p_company_id;

  update public.customer_access_tokens cat
  set
    status = 'revoked',
    revoked_at = coalesce(cat.revoked_at, now())
  where cat.company_id = p_company_id
    and cat.status = 'active'
    and (
      cat.estimate_id = p_estimate_id
      or exists (
        select 1
        from public.estimate_versions ev
        where ev.id = cat.estimate_version_id
          and ev.company_id = p_company_id
          and ev.estimate_id = p_estimate_id
      )
    );

  get diagnostics v_revoked_token_count = row_count;

  return jsonb_build_object(
    'ok', true,
    'result', 'moved_to_trash',
    'estimateId', p_estimate_id,
    'revokedTokenCount', v_revoked_token_count
  );
end;
$$;

create or replace function public.restore_saved_estimate_from_trash(
  p_company_id uuid,
  p_estimate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_deleted_at timestamptz;
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

  select e.deleted_at
  into v_deleted_at
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

  if v_deleted_at is null then
    return jsonb_build_object(
      'ok', true,
      'result', 'already_restored',
      'estimateId', p_estimate_id
    );
  end if;

  update public.estimates e
  set
    deleted_at = null,
    deleted_by = null,
    delete_reason = null
  where e.id = p_estimate_id
    and e.company_id = p_company_id;

  return jsonb_build_object(
    'ok', true,
    'result', 'restored',
    'estimateId', p_estimate_id,
    'tokensReactivated', false
  );
end;
$$;

create or replace function public.update_customer_request_status(
  p_company_id uuid,
  p_request_id uuid,
  p_next_status text,
  p_closed_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request public.customer_requests%rowtype;
  v_requested_status text;
  v_next_status text;
  v_current_group text;
  v_next_group text;
  v_closed_reason text;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to update requests for this company.'
      using errcode = '42501';
  end if;

  select cr.*
  into v_request
  from public.customer_requests cr
  where cr.id = p_request_id
    and cr.company_id = p_company_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'result', 'not_found'
    );
  end if;

  v_requested_status := lower(btrim(coalesce(p_next_status, '')));
  v_next_status := case v_requested_status
    when 'in_progress' then 'reviewing'
    when 'completed' then 'closed'
    else v_requested_status
  end;

  if v_next_status not in (
    'received',
    'reviewing',
    'pricing',
    'awaiting_customer_approval',
    'rejected',
    'closed'
  ) then
    return jsonb_build_object(
      'ok', false,
      'result', 'invalid_next_status',
      'requestedStatus', v_requested_status
    );
  end if;

  v_current_group := case
    when v_request.status = 'received' then 'received'
    when v_request.status in ('reviewing', 'pricing', 'awaiting_customer_approval') then 'in_progress'
    when v_request.status in ('closed', 'approved') then 'completed'
    when v_request.status = 'rejected' then 'rejected'
    else null
  end;

  v_next_group := case
    when v_next_status = 'received' then 'received'
    when v_next_status in ('reviewing', 'pricing', 'awaiting_customer_approval') then 'in_progress'
    when v_next_status = 'closed' then 'completed'
    when v_next_status = 'rejected' then 'rejected'
    else null
  end;

  if v_current_group is null then
    return jsonb_build_object(
      'ok', false,
      'result', 'invalid_current_status',
      'status', v_request.status
    );
  end if;

  if v_request.status = v_next_status then
    return jsonb_build_object(
      'ok', true,
      'result', 'already_set',
      'requestId', p_request_id,
      'status', v_request.status,
      'logicalStatus', v_current_group
    );
  end if;

  if not (
    (v_current_group = 'received' and v_next_group in ('in_progress', 'rejected'))
    or (v_current_group = 'in_progress' and v_next_group in ('received', 'in_progress', 'completed'))
    or (v_current_group = 'completed' and v_next_group = 'in_progress')
    or (v_current_group = 'rejected' and v_next_group in ('received', 'in_progress'))
  ) then
    raise exception using
      errcode = '22023',
      message = format(
        'Invalid customer request status transition: %s -> %s',
        v_request.status,
        v_next_status
      );
  end if;

  v_closed_reason := case
    when v_next_group in ('completed', 'rejected')
      then nullif(btrim(coalesce(p_closed_reason, '')), '')
    else null
  end;

  update public.customer_requests cr
  set
    status = v_next_status,
    completed_at = case when v_next_group = 'completed' then now() else null end,
    completed_by = case when v_next_group = 'completed' then auth.uid() else null end,
    closed_reason = v_closed_reason
  where cr.id = p_request_id
    and cr.company_id = p_company_id;

  insert into public.timeline_events (
    company_id,
    customer_id,
    project_id,
    estimate_id,
    estimate_version_id,
    customer_request_id,
    event_type,
    title,
    description,
    metadata
  )
  values (
    p_company_id,
    v_request.customer_id,
    v_request.project_id,
    v_request.estimate_id,
    v_request.estimate_version_id,
    v_request.id,
    'request_updated',
    'Customer request status updated',
    coalesce(
      v_closed_reason,
      format('Customer request status changed: %s -> %s', v_request.status, v_next_status)
    ),
    jsonb_build_object(
      'previousStatus', v_request.status,
      'status', v_next_status,
      'logicalStatus', v_next_group,
      'source', 'admin_rpc'
    )
  );

  return jsonb_build_object(
    'ok', true,
    'result', 'updated',
    'requestId', p_request_id,
    'previousStatus', v_request.status,
    'status', v_next_status,
    'logicalStatus', v_next_group
  );
end;
$$;

create or replace function public.update_project_status(
  p_company_id uuid,
  p_project_id uuid,
  p_next_status text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_customer_id uuid;
  v_status_column text;
  v_current_status text;
  v_next_status text;
  v_now timestamptz := now();
begin
  if auth.uid() is null or not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to update projects for this company.'
      using errcode = '42501';
  end if;

  select p.customer_id
  into v_customer_id
  from public.projects p
  where p.id = p_project_id
    and p.company_id = p_company_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'result', 'not_found'
    );
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'status'
  ) then
    v_status_column := 'status';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'construction_status'
  ) then
    v_status_column := 'construction_status';
  else
    raise exception 'projects has no supported lifecycle status column.'
      using errcode = '55000';
  end if;

  execute format(
    'select %I::text from public.projects where id = $1 and company_id = $2',
    v_status_column
  )
  into v_current_status
  using p_project_id, p_company_id;

  v_next_status := lower(btrim(coalesce(p_next_status, '')));

  if v_status_column = 'construction_status' and v_next_status = 'active' then
    v_next_status := 'in_progress';
  end if;

  if v_next_status = v_current_status then
    return jsonb_build_object(
      'ok', true,
      'result', 'already_set',
      'projectId', p_project_id,
      'status', v_current_status,
      'statusColumn', v_status_column
    );
  end if;

  if v_current_status in ('completed', 'cancelled') then
    if (
      v_status_column = 'status'
      and v_next_status not in ('active', 'in_progress')
    ) or (
      v_status_column = 'construction_status'
      and v_next_status <> 'in_progress'
    ) then
      return jsonb_build_object(
        'ok', false,
        'result', 'invalid_transition',
        'previousStatus', v_current_status,
        'requestedStatus', p_next_status
      );
    end if;
  elsif v_next_status not in ('completed', 'cancelled') then
    return jsonb_build_object(
      'ok', false,
      'result', 'invalid_transition',
      'previousStatus', v_current_status,
      'requestedStatus', p_next_status
    );
  end if;

  execute format(
    'update public.projects
     set %I = $1,
         completed_at = $2,
         completed_by = $3,
         cancelled_at = $4,
         cancelled_by = $5
     where id = $6
       and company_id = $7',
    v_status_column
  )
  using
    v_next_status,
    case when v_next_status = 'completed' then v_now else null end,
    case when v_next_status = 'completed' then auth.uid() else null end,
    case when v_next_status = 'cancelled' then v_now else null end,
    case when v_next_status = 'cancelled' then auth.uid() else null end,
    p_project_id,
    p_company_id;

  insert into public.timeline_events (
    company_id,
    customer_id,
    project_id,
    event_type,
    title,
    description,
    metadata
  )
  values (
    p_company_id,
    v_customer_id,
    p_project_id,
    'construction_updated',
    'Project status updated',
    format('Project status changed: %s -> %s', v_current_status, v_next_status),
    jsonb_build_object(
      'previousStatus', v_current_status,
      'status', v_next_status,
      'statusColumn', v_status_column,
      'source', 'admin_rpc'
    )
  );

  return jsonb_build_object(
    'ok', true,
    'result', 'updated',
    'projectId', p_project_id,
    'previousStatus', v_current_status,
    'status', v_next_status,
    'statusColumn', v_status_column
  );
end;
$$;

create or replace function public.get_project_trash_impact(
  p_company_id uuid,
  p_project_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_project_id uuid;
  v_estimate_count bigint := 0;
  v_pending_request_count bigint := 0;
  v_total_request_count bigint := 0;
  v_message_count bigint := 0;
  v_activity_count bigint := 0;
  v_active_share_link_count bigint := 0;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to inspect projects for this company.'
      using errcode = '42501';
  end if;

  select p.id
  into v_project_id
  from public.projects p
  where p.id = p_project_id
    and p.company_id = p_company_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'result', 'not_found'
    );
  end if;

  select count(distinct e.id)
  into v_estimate_count
  from public.estimate_versions ev
  join public.estimates e
    on e.id = ev.estimate_id
   and e.company_id = ev.company_id
  where ev.company_id = p_company_id
    and ev.project_id = p_project_id;

  select
    count(*) filter (
      where cr.status not in ('approved', 'rejected', 'closed')
    ),
    count(*)
  into v_pending_request_count, v_total_request_count
  from public.customer_requests cr
  where cr.company_id = p_company_id
    and cr.project_id = p_project_id;

  select count(*)
  into v_message_count
  from public.customer_messages cm
  where cm.company_id = p_company_id
    and cm.project_id = p_project_id;

  select count(*)
  into v_activity_count
  from public.timeline_events te
  where te.company_id = p_company_id
    and te.project_id = p_project_id;

  select count(*)
  into v_active_share_link_count
  from public.customer_access_tokens cat
  where cat.company_id = p_company_id
    and cat.project_id = p_project_id
    and cat.status = 'active'
    and cat.revoked_at is null
    and (cat.expires_at is null or cat.expires_at > now());

  return jsonb_build_object(
    'ok', true,
    'result', 'impact',
    'projectId', p_project_id,
    'estimateCount', v_estimate_count,
    'pendingRequestCount', v_pending_request_count,
    'totalRequestCount', v_total_request_count,
    'messageCount', v_message_count,
    'activityCount', v_activity_count,
    'activeShareLinkCount', v_active_share_link_count
  );
end;
$$;

create or replace function public.move_project_to_trash(
  p_company_id uuid,
  p_project_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_deleted_at timestamptz;
  v_revoked_token_count integer := 0;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to move projects for this company.'
      using errcode = '42501';
  end if;

  select p.deleted_at
  into v_deleted_at
  from public.projects p
  where p.id = p_project_id
    and p.company_id = p_company_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'result', 'not_found'
    );
  end if;

  if v_deleted_at is not null then
    return jsonb_build_object(
      'ok', true,
      'result', 'already_in_trash',
      'projectId', p_project_id,
      'deletedAt', v_deleted_at
    );
  end if;

  update public.projects p
  set
    deleted_at = now(),
    deleted_by = auth.uid()
  where p.id = p_project_id
    and p.company_id = p_company_id;

  update public.customer_access_tokens cat
  set
    status = 'revoked',
    revoked_at = coalesce(cat.revoked_at, now())
  where cat.company_id = p_company_id
    and cat.project_id = p_project_id
    and cat.status = 'active';

  get diagnostics v_revoked_token_count = row_count;

  return jsonb_build_object(
    'ok', true,
    'result', 'moved_to_trash',
    'projectId', p_project_id,
    'revokedTokenCount', v_revoked_token_count
  );
end;
$$;

create or replace function public.restore_project_from_trash(
  p_company_id uuid,
  p_project_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_deleted_at timestamptz;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to restore projects for this company.'
      using errcode = '42501';
  end if;

  select p.deleted_at
  into v_deleted_at
  from public.projects p
  where p.id = p_project_id
    and p.company_id = p_company_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'result', 'not_found'
    );
  end if;

  if v_deleted_at is null then
    return jsonb_build_object(
      'ok', true,
      'result', 'already_restored',
      'projectId', p_project_id
    );
  end if;

  update public.projects p
  set
    deleted_at = null,
    deleted_by = null
  where p.id = p_project_id
    and p.company_id = p_company_id;

  return jsonb_build_object(
    'ok', true,
    'result', 'restored',
    'projectId', p_project_id,
    'childRowsChanged', false,
    'tokensReactivated', false
  );
end;
$$;

revoke all on function public.move_saved_estimate_to_trash(uuid, uuid) from public;
revoke all on function public.move_saved_estimate_to_trash(uuid, uuid) from anon;
grant execute on function public.move_saved_estimate_to_trash(uuid, uuid) to authenticated;

revoke all on function public.restore_saved_estimate_from_trash(uuid, uuid) from public;
revoke all on function public.restore_saved_estimate_from_trash(uuid, uuid) from anon;
grant execute on function public.restore_saved_estimate_from_trash(uuid, uuid) to authenticated;

revoke all on function public.update_customer_request_status(uuid, uuid, text, text) from public;
revoke all on function public.update_customer_request_status(uuid, uuid, text, text) from anon;
grant execute on function public.update_customer_request_status(uuid, uuid, text, text) to authenticated;

revoke all on function public.update_project_status(uuid, uuid, text) from public;
revoke all on function public.update_project_status(uuid, uuid, text) from anon;
grant execute on function public.update_project_status(uuid, uuid, text) to authenticated;

revoke all on function public.get_project_trash_impact(uuid, uuid) from public;
revoke all on function public.get_project_trash_impact(uuid, uuid) from anon;
grant execute on function public.get_project_trash_impact(uuid, uuid) to authenticated;

revoke all on function public.move_project_to_trash(uuid, uuid) from public;
revoke all on function public.move_project_to_trash(uuid, uuid) from anon;
grant execute on function public.move_project_to_trash(uuid, uuid) to authenticated;

revoke all on function public.restore_project_from_trash(uuid, uuid) from public;
revoke all on function public.restore_project_from_trash(uuid, uuid) from anon;
grant execute on function public.restore_project_from_trash(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
