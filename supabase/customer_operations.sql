-- FORMATE customer operations Phase C1
-- Apply after supabase/schema.sql.

create extension if not exists "pgcrypto";

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  phone text not null default '',
  email text not null default '',
  memo text not null default '',
  required_contact_consent boolean not null default false,
  aftercare_consent boolean not null default false,
  marketing_consent boolean not null default false,
  opted_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null default '',
  address text not null default '',
  detail_address text not null default '',
  estimate_status text not null default 'draft',
  contract_status text not null default 'not_started',
  construction_status text not null default 'not_started',
  aftercare_status text not null default 'not_started',
  service_status text not null default 'not_started',
  construction_start_date date,
  construction_completed_date date,
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_estimate_status_check check (
    estimate_status in ('draft', 'sent', 'viewed', 'revision_requested', 'approved', 'expired', 'cancelled')
  ),
  constraint projects_contract_status_check check (
    contract_status in ('not_started', 'reviewing', 'signed', 'cancelled')
  ),
  constraint projects_construction_status_check check (
    construction_status in ('not_started', 'scheduled', 'in_progress', 'paused', 'completed', 'cancelled')
  ),
  constraint projects_aftercare_status_check check (
    aftercare_status in ('not_started', 'scheduled', 'active', 'paused', 'completed', 'cancelled')
  ),
  constraint projects_service_status_check check (
    service_status in ('not_started', 'received', 'contacted', 'visit_scheduled', 'in_progress', 'resolved', 'closed')
  )
);

create table if not exists public.estimate_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  estimate_id uuid references public.estimates(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  version_no integer not null default 1,
  label text not null default '',
  status text not null default 'draft',
  total_amount numeric not null default 0,
  estimated_construction_days integer not null default 0,
  items_snapshot jsonb not null default '{}'::jsonb,
  condition_snapshot jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  viewed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint estimate_versions_version_no_check check (version_no > 0),
  constraint estimate_versions_total_amount_check check (total_amount >= 0),
  constraint estimate_versions_construction_days_check check (estimated_construction_days >= 0),
  constraint estimate_versions_status_check check (
    status in ('draft', 'sent', 'viewed', 'revision_requested', 'approved', 'expired', 'cancelled')
  ),
  unique (estimate_id, version_no)
);

create table if not exists public.customer_access_tokens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  estimate_id uuid references public.estimates(id) on delete set null,
  estimate_version_id uuid references public.estimate_versions(id) on delete set null,
  token text not null unique,
  status text not null default 'active',
  expires_at timestamptz,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint customer_access_tokens_status_check check (
    status in ('active', 'revoked', 'expired')
  )
);

create table if not exists public.customer_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  estimate_id uuid references public.estimates(id) on delete set null,
  estimate_version_id uuid references public.estimate_versions(id) on delete set null,
  request_type text not null default 'inquiry',
  status text not null default 'received',
  title text not null default '',
  body text not null default '',
  related_item_label text not null default '',
  customer_visible boolean not null default true,
  internal_memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_requests_type_check check (
    request_type in ('inquiry', 'estimate_revision', 'change_request', 'approval', 'aftercare', 'service', 'other')
  ),
  constraint customer_requests_status_check check (
    status in ('received', 'reviewing', 'pricing', 'awaiting_customer_approval', 'approved', 'rejected', 'closed')
  )
);

create table if not exists public.customer_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  estimate_id uuid references public.estimates(id) on delete set null,
  estimate_version_id uuid references public.estimate_versions(id) on delete set null,
  customer_request_id uuid references public.customer_requests(id) on delete set null,
  message_type text not null default 'manual',
  channel text not null default 'manual',
  recipient text not null default '',
  body text not null default '',
  status text not null default 'draft',
  sent_at timestamptz,
  clicked_at timestamptz,
  responded_at timestamptz,
  failure_reason text not null default '',
  created_at timestamptz not null default now(),
  constraint customer_messages_type_check check (
    message_type in ('estimate_link', 'request_reply', 'schedule_notice', 'aftercare', 'service_update', 'manual', 'other')
  ),
  constraint customer_messages_channel_check check (
    channel in ('sms', 'kakao', 'email', 'phone', 'manual', 'link_copy')
  ),
  constraint customer_messages_status_check check (
    status in ('draft', 'queued', 'sent', 'delivered', 'clicked', 'responded', 'failed', 'cancelled')
  )
);

create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  estimate_id uuid references public.estimates(id) on delete set null,
  estimate_version_id uuid references public.estimate_versions(id) on delete set null,
  customer_request_id uuid references public.customer_requests(id) on delete set null,
  event_type text not null,
  title text not null default '',
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint timeline_events_type_check check (
    event_type in (
      'customer_created', 'project_created', 'estimate_created', 'estimate_sent', 'estimate_viewed',
      'request_received', 'request_updated', 'change_order_created', 'change_order_approved',
      'construction_updated', 'message_created', 'aftercare_scheduled', 'service_requested',
      'service_updated', 'note'
    )
  )
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null,
  title text not null default '',
  body text not null default '',
  related_type text not null default '',
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.aftercare_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null default 'scheduled',
  base_date date not null,
  first_send_date date,
  repeat_interval_months integer not null default 0,
  end_date date,
  next_send_date date,
  paused_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aftercare_schedules_status_check check (
    status in ('scheduled', 'active', 'paused', 'completed', 'cancelled')
  ),
  constraint aftercare_schedules_interval_check check (repeat_interval_months >= 0)
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  aftercare_schedule_id uuid references public.aftercare_schedules(id) on delete set null,
  status text not null default 'received',
  urgency text not null default 'normal',
  problem_space text not null default '',
  related_item_label text not null default '',
  description text not null default '',
  preferred_contact_time text not null default '',
  assigned_to text not null default '',
  visit_scheduled_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_requests_status_check check (
    status in ('received', 'contacted', 'visit_scheduled', 'in_progress', 'resolved', 'closed')
  ),
  constraint service_requests_urgency_check check (
    urgency in ('low', 'normal', 'high', 'urgent')
  )
);

create table if not exists public.service_request_updates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  update_type text not null default 'note',
  body text not null default '',
  cost_amount numeric not null default 0,
  customer_visible boolean not null default false,
  created_at timestamptz not null default now(),
  constraint service_request_updates_type_check check (
    update_type in ('note', 'contact', 'visit', 'status_change', 'cost', 'resolution')
  ),
  constraint service_request_updates_cost_check check (cost_amount >= 0)
);

create table if not exists public.change_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  estimate_id uuid references public.estimates(id) on delete set null,
  estimate_version_id uuid references public.estimate_versions(id) on delete set null,
  customer_request_id uuid references public.customer_requests(id) on delete set null,
  status text not null default 'draft',
  title text not null default '',
  description text not null default '',
  total_delta_amount numeric not null default 0,
  estimated_construction_days_delta integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint change_orders_status_check check (
    status in ('draft', 'awaiting_approval', 'approved', 'rejected', 'completed', 'cancelled')
  )
);

create table if not exists public.change_order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  change_order_id uuid not null references public.change_orders(id) on delete cascade,
  item_label text not null default '',
  change_type text not null default 'update',
  before_snapshot jsonb not null default '{}'::jsonb,
  after_snapshot jsonb not null default '{}'::jsonb,
  delta_amount numeric not null default 0,
  construction_days_delta integer not null default 0,
  created_at timestamptz not null default now(),
  constraint change_order_items_type_check check (
    change_type in ('add', 'update', 'remove')
  )
);

create index if not exists customers_company_id_idx on public.customers(company_id);
create index if not exists customers_company_name_idx on public.customers(company_id, name);
create index if not exists projects_company_id_idx on public.projects(company_id);
create index if not exists projects_customer_id_idx on public.projects(customer_id);
create index if not exists projects_company_construction_status_idx on public.projects(company_id, construction_status);
create index if not exists estimate_versions_company_id_idx on public.estimate_versions(company_id);
create index if not exists estimate_versions_estimate_id_idx on public.estimate_versions(estimate_id);
create index if not exists estimate_versions_project_id_idx on public.estimate_versions(project_id);
create index if not exists estimate_versions_company_status_idx on public.estimate_versions(company_id, status);
create index if not exists customer_access_tokens_company_id_idx on public.customer_access_tokens(company_id);
create index if not exists customer_access_tokens_project_id_idx on public.customer_access_tokens(project_id);
create index if not exists customer_requests_company_id_idx on public.customer_requests(company_id);
create index if not exists customer_requests_project_id_idx on public.customer_requests(project_id);
create index if not exists customer_requests_company_status_idx on public.customer_requests(company_id, status);
create index if not exists customer_messages_company_id_idx on public.customer_messages(company_id);
create index if not exists customer_messages_project_id_idx on public.customer_messages(project_id);
create index if not exists customer_messages_company_created_at_idx on public.customer_messages(company_id, created_at desc);
create index if not exists timeline_events_company_id_idx on public.timeline_events(company_id);
create index if not exists timeline_events_project_id_idx on public.timeline_events(project_id);
create index if not exists timeline_events_company_created_at_idx on public.timeline_events(company_id, created_at desc);
create index if not exists notifications_company_id_idx on public.notifications(company_id);
create index if not exists notifications_company_read_at_idx on public.notifications(company_id, read_at);
create index if not exists aftercare_schedules_company_id_idx on public.aftercare_schedules(company_id);
create index if not exists aftercare_schedules_project_id_idx on public.aftercare_schedules(project_id);
create index if not exists aftercare_schedules_company_next_send_idx on public.aftercare_schedules(company_id, next_send_date);
create index if not exists service_requests_company_id_idx on public.service_requests(company_id);
create index if not exists service_requests_project_id_idx on public.service_requests(project_id);
create index if not exists service_requests_company_status_idx on public.service_requests(company_id, status);
create index if not exists service_request_updates_company_id_idx on public.service_request_updates(company_id);
create index if not exists service_request_updates_request_id_idx on public.service_request_updates(service_request_id);
create index if not exists change_orders_company_id_idx on public.change_orders(company_id);
create index if not exists change_orders_project_id_idx on public.change_orders(project_id);
create index if not exists change_order_items_company_id_idx on public.change_order_items(company_id);
create index if not exists change_order_items_order_id_idx on public.change_order_items(change_order_id);

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_customer_requests_updated_at on public.customer_requests;
create trigger set_customer_requests_updated_at
before update on public.customer_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_aftercare_schedules_updated_at on public.aftercare_schedules;
create trigger set_aftercare_schedules_updated_at
before update on public.aftercare_schedules
for each row execute function public.set_updated_at();

drop trigger if exists set_service_requests_updated_at on public.service_requests;
create trigger set_service_requests_updated_at
before update on public.service_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_change_orders_updated_at on public.change_orders;
create trigger set_change_orders_updated_at
before update on public.change_orders
for each row execute function public.set_updated_at();

grant usage on schema public to authenticated;

do $$
declare
  table_name text;
  customer_operation_tables constant text[] := array[
    'customers',
    'projects',
    'estimate_versions',
    'customer_access_tokens',
    'customer_requests',
    'customer_messages',
    'timeline_events',
    'notifications',
    'aftercare_schedules',
    'service_requests',
    'service_request_updates',
    'change_orders',
    'change_order_items'
  ];
begin
  foreach table_name in array customer_operation_tables loop
    execute format('revoke all on table public.%I from anon', table_name);
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      table_name
    );
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'drop policy if exists %I on public.%I',
      'members can manage own ' || table_name,
      table_name
    );
    execute format(
      'create policy %I on public.%I
       for all
       to authenticated
       using (
         exists (
           select 1
           from public.company_members cm
           where cm.company_id = %I.company_id
             and cm.user_id = auth.uid()
         )
       )
       with check (
         exists (
           select 1
           from public.company_members cm
           where cm.company_id = %I.company_id
             and cm.user_id = auth.uid()
         )
       )',
      'members can manage own ' || table_name,
      table_name,
      table_name,
      table_name
    );
  end loop;
end
$$;

notify pgrst, 'reload schema';
