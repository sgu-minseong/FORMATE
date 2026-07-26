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

function unwrapSingle(result) {
  if (result.error) throw result.error;
  return result.data ?? null;
}

function unwrapCount(result) {
  if (result.error) throw result.error;
  return result.count ?? 0;
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

export async function updateCustomerRequestStatus({
  companyId,
  requestId,
  status,
  internalMemo = "",
}) {
  assertCustomerOperationsQuery(companyId);

  if (!requestId) {
    throw new Error("처리할 요청을 확인할 수 없습니다.");
  }

  const allowedStatuses = [
    "received",
    "reviewing",
    "pricing",
    "awaiting_customer_approval",
    "rejected",
    "closed",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error("변경할 수 없는 요청 상태입니다.");
  }

  const currentRequest = unwrapSingle(await supabase
    .from("customer_requests")
    .select(`
      id,
      company_id,
      customer_id,
      project_id,
      estimate_id,
      estimate_version_id,
      status,
      internal_memo
    `)
    .eq("company_id", companyId)
    .eq("id", requestId)
    .single());

  if (!currentRequest) {
    throw new Error("요청을 찾을 수 없습니다.");
  }

  const nextMemo = `${internalMemo ?? ""}`.trim();
  const memoChanged = nextMemo !== `${currentRequest.internal_memo ?? ""}`.trim();

  if (memoChanged) {
    const memoResult = await supabase
      .from("customer_requests")
      .update({
        internal_memo: nextMemo,
      })
      .eq("company_id", companyId)
      .eq("id", requestId);
    if (memoResult.error) throw memoResult.error;
  }

  const { data: statusResult, error: statusError } = await supabase.rpc(
    "update_customer_request_status",
    {
      p_company_id: companyId,
      p_request_id: requestId,
      p_next_status: status,
      p_closed_reason: ["closed", "rejected"].includes(status) ? nextMemo || null : null,
    }
  );

  if (
    statusError
    || !statusResult?.ok
    || !["updated", "already_set"].includes(statusResult?.result)
  ) {
    if (memoChanged) {
      await supabase
        .from("customer_requests")
        .update({ internal_memo: currentRequest.internal_memo })
        .eq("company_id", companyId)
        .eq("id", requestId);
    }
    if (statusError) throw statusError;
    throw new Error("요청 상태를 변경할 수 없습니다.");
  }

  if (status !== "received") {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("company_id", companyId)
      .eq("related_type", "customer_request")
      .eq("related_id", requestId)
      .is("read_at", null);
  }

  return unwrapSingle(await supabase
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
      project:projects(id, name, address, detail_address, construction_status),
      estimate_version:estimate_versions(id, estimate_id, version_no, label, status)
    `)
    .eq("company_id", companyId)
    .eq("id", requestId)
    .single());
}

export async function updateProjectStatus({
  companyId,
  projectId,
  status,
}) {
  assertCustomerOperationsQuery(companyId);

  if (!projectId) {
    throw new Error("처리할 현장을 확인할 수 없습니다.");
  }

  if (!["in_progress", "completed", "cancelled"].includes(status)) {
    throw new Error("변경할 수 없는 현장 상태입니다.");
  }

  const { data, error } = await supabase.rpc("update_project_status", {
    p_company_id: companyId,
    p_project_id: projectId,
    p_next_status: status,
  });

  if (error) throw error;
  if (!data?.ok || !["updated", "already_set"].includes(data?.result)) {
    throw new Error("현장 상태를 변경할 수 없습니다.");
  }

  return data;
}

export async function getProjectTrashImpact({
  companyId,
  projectId,
}) {
  assertCustomerOperationsQuery(companyId);

  if (!projectId) {
    throw new Error("확인할 현장을 찾을 수 없습니다.");
  }

  const { data, error } = await supabase.rpc("get_project_trash_impact", {
    p_company_id: companyId,
    p_project_id: projectId,
  });

  if (error) throw error;
  if (!data?.ok || data?.result !== "impact") {
    throw new Error("현장 영향 범위를 확인할 수 없습니다.");
  }

  return data;
}

export async function moveProjectToTrash({
  companyId,
  projectId,
}) {
  assertCustomerOperationsQuery(companyId);

  if (!projectId) {
    throw new Error("처리할 현장을 확인할 수 없습니다.");
  }

  const { data, error } = await supabase.rpc("move_project_to_trash", {
    p_company_id: companyId,
    p_project_id: projectId,
  });

  if (error) throw error;
  if (!data?.ok || !["moved_to_trash", "already_in_trash"].includes(data?.result)) {
    throw new Error("현장을 휴지통으로 이동할 수 없습니다.");
  }

  return data;
}

export async function restoreProjectFromTrash({
  companyId,
  projectId,
}) {
  assertCustomerOperationsQuery(companyId);

  if (!projectId) {
    throw new Error("복원할 현장을 확인할 수 없습니다.");
  }

  const { data, error } = await supabase.rpc("restore_project_from_trash", {
    p_company_id: companyId,
    p_project_id: projectId,
  });

  if (error) throw error;
  if (!data?.ok || !["restored", "already_restored"].includes(data?.result)) {
    throw new Error("현장을 복원할 수 없습니다.");
  }

  return data;
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
        completed_at,
        completed_by,
        cancelled_at,
        cancelled_by,
        deleted_at,
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

export async function fetchCustomerProjectDetail({
  companyId,
  customerId,
  projectId,
}) {
  assertCustomerOperationsQuery(companyId);

  if (!customerId || !projectId) {
    throw new Error("고객·현장 정보를 확인할 수 없습니다.");
  }

  const [
    projectResult,
    versionsResult,
    requestsResult,
    messagesResult,
    timelineResult,
    accessTokensResult,
  ] = await Promise.all([
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
        completed_at,
        completed_by,
        cancelled_at,
        cancelled_by,
        deleted_at,
        memo,
        created_at,
        updated_at,
        customer:customers(id, name, phone, email, memo)
      `)
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .eq("id", projectId)
      .single(),
    supabase
      .from("estimate_versions")
      .select(`
        id,
        estimate_id,
        customer_id,
        project_id,
        version_no,
        label,
        status,
        total_amount,
        estimated_construction_days,
        approved_at,
        viewed_at,
        sent_at,
        created_at
      `)
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .eq("project_id", projectId)
      .order("version_no", { ascending: false }),
    supabase
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
        estimate_version:estimate_versions(id, estimate_id, version_no, label, status)
      `)
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_messages")
      .select(`
        id,
        customer_request_id,
        estimate_version_id,
        message_type,
        channel,
        body,
        status,
        sent_at,
        clicked_at,
        responded_at,
        failure_reason,
        created_at,
        estimate_version:estimate_versions(id, version_no, label, status)
      `)
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("timeline_events")
      .select(`
        id,
        estimate_id,
        estimate_version_id,
        customer_request_id,
        event_type,
        title,
        description,
        metadata,
        created_at
      `)
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_access_tokens")
      .select("id, estimate_version_id, status, expires_at, revoked_at, created_at")
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .eq("project_id", projectId),
  ]);

  return {
    project: unwrapSingle(projectResult),
    estimateVersions: unwrap(versionsResult),
    requests: unwrap(requestsResult),
    messages: unwrap(messagesResult),
    timelineEvents: unwrap(timelineResult),
    accessTokens: unwrap(accessTokensResult),
  };
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
      project:projects(id, name, address),
      estimate_version:estimate_versions(id, version_no, label, status)
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [
    requestsResult,
    servicesResult,
    notificationsResult,
    projectsResult,
    versionsResult,
    aftercareResult,
    timelineResult,
    openRequestsCountResult,
    linksCreatedCountResult,
    estimateViewsCountResult,
    revisionRequestsCountResult,
    approvalsCountResult,
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
    supabase
      .from("customer_requests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("status", HOME_ATTENTION_REQUEST_STATUSES),
    supabase
      .from("customer_messages")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("message_type", "estimate_link")
      .gte("created_at", todayIso),
    supabase
      .from("timeline_events")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("event_type", "estimate_viewed")
      .gte("created_at", todayIso),
    supabase
      .from("customer_requests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("request_type", "estimate_revision")
      .in("status", HOME_ATTENTION_REQUEST_STATUSES),
    supabase
      .from("customer_requests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("request_type", "approval")
      .eq("status", "approved")
      .gte("created_at", todayIso),
  ]);

  return buildHomeOperationsData({
    requests: unwrap(requestsResult),
    serviceRequests: unwrap(servicesResult),
    notifications: unwrap(notificationsResult),
    projects: unwrap(projectsResult),
    estimateVersions: unwrap(versionsResult),
    aftercareSchedules: unwrap(aftercareResult),
    timelineEvents: unwrap(timelineResult),
    summary: {
      openRequests: unwrapCount(openRequestsCountResult),
      linksCreatedToday: unwrapCount(linksCreatedCountResult),
      estimateViewsToday: unwrapCount(estimateViewsCountResult),
      revisionRequests: unwrapCount(revisionRequestsCountResult),
      approvalsToday: unwrapCount(approvalsCountResult),
    },
  });
}

export async function createEstimatePortalLink({
  companyId,
  estimateId,
  customerName,
  customerPhone = "",
  customerEmail = "",
  projectName = "",
  projectAddress = "",
  versionLabel = "",
  expiresAt = null,
  requiredContactConsent = false,
  aftercareConsent = false,
  marketingConsent = false,
}) {
  assertCustomerOperationsQuery(companyId);

  if (!estimateId) {
    throw new Error("공유할 견적서를 확인할 수 없습니다.");
  }

  const { data, error } = await supabase.rpc("create_customer_portal_link", {
    p_company_id: companyId,
    p_estimate_id: estimateId,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_customer_email: customerEmail,
    p_project_name: projectName,
    p_project_address: projectAddress,
    p_version_label: versionLabel,
    p_expires_at: expiresAt,
    p_required_contact_consent: requiredContactConsent,
    p_aftercare_consent: aftercareConsent,
    p_marketing_consent: marketingConsent,
  });

  if (error) throw error;
  if (!data?.ok) {
    throw new Error(data?.message || "공유 링크를 생성하지 못했습니다.");
  }

  return data;
}
