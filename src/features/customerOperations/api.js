import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import {
  HOME_ACTIVE_AFTERCARE_STATUSES,
  HOME_ACTIVE_CONSTRUCTION_STATUSES,
  HOME_ACTIVE_ESTIMATE_STATUSES,
  HOME_ATTENTION_REQUEST_STATUSES,
  HOME_ATTENTION_SERVICE_STATUSES,
} from "./constants";
import { buildCustomerProjectRows, buildHomeOperationsData } from "./utils";

function assertCustomerOperationsQuery(companyId) {
  if (!isSupabaseConfigured) {
    throw new Error(".env에 Supabase 환경 변수를 설정해야 고객 운영 데이터를 불러올 수 있습니다.");
  }
  if (!companyId) {
    throw new Error("로그인된 업체 정보를 확인할 수 없습니다.");
  }
}

function unwrap(result) {
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function fetchCustomerRequests(companyId) {
  assertCustomerOperationsQuery(companyId);

  return unwrap(await supabase
    .from("customer_requests")
    .select(`
      id,
      company_id,
      customer_id,
      project_id,
      estimate_id,
      estimate_version_id,
      request_type,
      status,
      title,
      body,
      related_item_label,
      customer_visible,
      internal_memo,
      created_at,
      updated_at,
      customer:customers(id, name, phone),
      project:projects(id, name, address, detail_address),
      estimate_version:estimate_versions(id, estimate_id, version_no, label, status)
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false }));
}

export async function fetchCustomersProjects(companyId) {
  assertCustomerOperationsQuery(companyId);

  const [projectsResult, versionsResult, requestsResult, timelineResult] = await Promise.all([
    supabase
      .from("projects")
      .select(`
        id,
        company_id,
        customer_id,
        name,
        address,
        detail_address,
        estimate_status,
        contract_status,
        construction_status,
        aftercare_status,
        service_status,
        construction_start_date,
        construction_completed_date,
        memo,
        created_at,
        updated_at,
        customer:customers(id, name, phone, email, memo)
      `)
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("estimate_versions")
      .select("id, project_id")
      .eq("company_id", companyId),
    supabase
      .from("customer_requests")
      .select("id, project_id, status")
      .eq("company_id", companyId),
    supabase
      .from("timeline_events")
      .select("id, project_id, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
  ]);

  return buildCustomerProjectRows({
    projects: unwrap(projectsResult),
    estimateVersions: unwrap(versionsResult),
    requests: unwrap(requestsResult),
    timelineEvents: unwrap(timelineResult),
  });
}

export async function fetchCustomerMessages(companyId) {
  assertCustomerOperationsQuery(companyId);

  return unwrap(await supabase
    .from("customer_messages")
    .select(`
      id,
      company_id,
      customer_id,
      project_id,
      estimate_id,
      estimate_version_id,
      customer_request_id,
      message_type,
      channel,
      recipient,
      body,
      status,
      sent_at,
      clicked_at,
      responded_at,
      failure_reason,
      created_at,
      customer:customers(id, name, phone),
      project:projects(id, name, address)
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false }));
}

export async function fetchAftercareAndService(companyId) {
  assertCustomerOperationsQuery(companyId);

  const [aftercareResult, serviceResult] = await Promise.all([
    supabase
      .from("aftercare_schedules")
      .select(`
        id,
        company_id,
        customer_id,
        project_id,
        status,
        base_date,
        first_send_date,
        repeat_interval_months,
        end_date,
        next_send_date,
        paused_reason,
        created_at,
        updated_at,
        customer:customers(id, name, phone),
        project:projects(id, name, address)
      `)
      .eq("company_id", companyId)
      .order("next_send_date", { ascending: true }),
    supabase
      .from("service_requests")
      .select(`
        id,
        company_id,
        customer_id,
        project_id,
        aftercare_schedule_id,
        status,
        urgency,
        problem_space,
        related_item_label,
        description,
        preferred_contact_time,
        assigned_to,
        visit_scheduled_at,
        resolved_at,
        created_at,
        updated_at,
        customer:customers(id, name, phone),
        project:projects(id, name, address)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    aftercareSchedules: unwrap(aftercareResult),
    serviceRequests: unwrap(serviceResult),
  };
}

export async function fetchHomeCustomerOperations(companyId) {
  assertCustomerOperationsQuery(companyId);

  const [
    requestsResult,
    servicesResult,
    notificationsResult,
    projectsResult,
    versionsResult,
    aftercareResult,
    timelineResult,
  ] = await Promise.all([
    supabase
      .from("customer_requests")
      .select(`
        id, request_type, status, title, created_at,
        customer:customers(id, name),
        project:projects(id, name, address)
      `)
      .eq("company_id", companyId)
      .in("status", HOME_ATTENTION_REQUEST_STATUSES)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("service_requests")
      .select(`
        id, status, problem_space, created_at,
        customer:customers(id, name),
        project:projects(id, name, address)
      `)
      .eq("company_id", companyId)
      .in("status", HOME_ATTENTION_SERVICE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("notifications")
      .select("id, title, body, event_type, related_type, related_id, created_at")
      .eq("company_id", companyId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("projects")
      .select(`
        id, name, address, construction_status, created_at, updated_at,
        customer:customers(id, name)
      `)
      .eq("company_id", companyId)
      .in("construction_status", HOME_ACTIVE_CONSTRUCTION_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("estimate_versions")
      .select(`
        id, version_no, label, status, created_at,
        customer:customers(id, name),
        project:projects(id, name, address)
      `)
      .eq("company_id", companyId)
      .in("status", HOME_ACTIVE_ESTIMATE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("aftercare_schedules")
      .select(`
        id, status, next_send_date, created_at, updated_at,
        customer:customers(id, name),
        project:projects(id, name, address)
      `)
      .eq("company_id", companyId)
      .in("status", HOME_ACTIVE_AFTERCARE_STATUSES)
      .order("next_send_date", { ascending: true })
      .limit(8),
    supabase
      .from("timeline_events")
      .select(`
        id, event_type, title, description, created_at,
        customer:customers(id, name),
        project:projects(id, name, address)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return buildHomeOperationsData({
    requests: unwrap(requestsResult),
    serviceRequests: unwrap(servicesResult),
    notifications: unwrap(notificationsResult),
    projects: unwrap(projectsResult),
    estimateVersions: unwrap(versionsResult),
    aftercareSchedules: unwrap(aftercareResult),
    timelineEvents: unwrap(timelineResult),
  });
}
