import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import {
  buildCustomerProjectRows,
  buildHomeOperationsData,
  isActiveProject,
  isDeletedEstimate,
  isHomeNotificationVisible,
  isHomeTimelineEventVisible,
  isOpenCustomerRequest,
  isOperationalEstimate,
  isProjectLinkedRowVisible,
} from "./utils";

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

const AFTERCARE_SCHEDULE_SELECT = `
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
  project:projects!inner(
    id,
    customer_id,
    name,
    address,
    detail_address,
    construction_status,
    construction_completed_date,
    completed_at,
    deleted_at
  )
`;

const SERVICE_REQUEST_SELECT = `
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
  project:projects!inner(
    id,
    customer_id,
    name,
    address,
    detail_address,
    construction_status,
    construction_completed_date,
    completed_at,
    deleted_at
  )
`;

const AFTERCARE_PROJECT_SELECT = `
  id,
  company_id,
  customer_id,
  name,
  address,
  detail_address,
  construction_status,
  construction_completed_date,
  completed_at,
  deleted_at,
  updated_at,
  customer:customers(id, name, phone)
`;

async function assertWritableAftercareProject({
  companyId,
  projectId,
  customerId,
}) {
  if (!projectId || !customerId) {
    throw new Error("사후관리 대상 고객·현장을 확인할 수 없습니다.");
  }

  const project = unwrapSingle(await supabase
    .from("projects")
    .select("id, company_id, customer_id, construction_status, deleted_at")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .eq("id", projectId)
    .is("deleted_at", null)
    .single());

  if (!project || project.construction_status !== "completed") {
    throw new Error("공사가 완료된 정상 현장에서만 사후관리 업무를 등록할 수 있습니다.");
  }

  return project;
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
      completed_at,
      created_at,
      updated_at,
      customer:customers(id, name, phone),
      project:projects!inner(id, name, address, detail_address, deleted_at),
      estimate:estimates(id, deleted_at),
      estimate_version:estimate_versions(
        id,
        estimate_id,
        version_no,
        label,
        status,
        total_amount,
        estimate:estimates(id, deleted_at)
      ),
      request_events:timeline_events(
        id,
        event_type,
        metadata,
        created_at
      )
    `)
    .eq("company_id", companyId)
    .is("project.deleted_at", null)
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
      completed_at,
      created_at,
      updated_at,
      customer:customers(id, name, phone),
      project:projects!inner(id, name, address, detail_address, construction_status, deleted_at),
      estimate:estimates(id, deleted_at),
      estimate_version:estimate_versions(
        id,
        estimate_id,
        version_no,
        label,
        status,
        total_amount,
        estimate:estimates(id, deleted_at)
      ),
      request_events:timeline_events(
        id,
        event_type,
        metadata,
        created_at
      )
    `)
    .eq("company_id", companyId)
    .eq("id", requestId)
    .is("project.deleted_at", null)
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
      .select("id, project_id, estimate_id, version_no, label, estimate:estimates(id, deleted_at)")
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
    estimateVersions: unwrap(versionsResult).filter(
      (version) => !isDeletedEstimate(version.estimate)
    ),
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
    changeOrdersResult,
    aftercareSchedulesResult,
    serviceRequestsResult,
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
        created_at,
        estimate:estimates(id, deleted_at)
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
      .from("change_orders")
      .select(`
        id,
        estimate_id,
        estimate_version_id,
        customer_request_id,
        status,
        title,
        description,
        total_delta_amount,
        estimated_construction_days_delta,
        created_at,
        updated_at
      `)
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("aftercare_schedules")
      .select(`
        id,
        status,
        base_date,
        first_send_date,
        repeat_interval_months,
        end_date,
        next_send_date,
        paused_reason,
        created_at,
        updated_at
      `)
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .eq("project_id", projectId)
      .order("next_send_date", { ascending: true }),
    supabase
      .from("service_requests")
      .select(`
        id,
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
        updated_at
      `)
      .eq("company_id", companyId)
      .eq("customer_id", customerId)
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
  ]);

  const estimateVersions = unwrap(versionsResult).filter(
    (version) => !isDeletedEstimate(version.estimate)
  );

  return {
    project: unwrapSingle(projectResult),
    estimateVersions,
    requests: unwrap(requestsResult),
    messages: unwrap(messagesResult),
    timelineEvents: unwrap(timelineResult),
    changeOrders: unwrap(changeOrdersResult),
    aftercareSchedules: unwrap(aftercareSchedulesResult),
    serviceRequests: unwrap(serviceRequestsResult),
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
      project:projects!inner(id, name, address, deleted_at),
      estimate_version:estimate_versions(id, version_no, label, status)
    `)
    .eq("company_id", companyId)
    .is("project.deleted_at", null)
    .order("created_at", { ascending: false }));
}

export async function fetchAftercareAndService(companyId) {
  assertCustomerOperationsQuery(companyId);

  const [
    aftercareResult,
    serviceResult,
    serviceUpdatesResult,
    projectOptionsResult,
  ] = await Promise.all([
    supabase
      .from("aftercare_schedules")
      .select(AFTERCARE_SCHEDULE_SELECT)
      .eq("company_id", companyId)
      .is("project.deleted_at", null)
      .order("next_send_date", { ascending: true }),
    supabase
      .from("service_requests")
      .select(SERVICE_REQUEST_SELECT)
      .eq("company_id", companyId)
      .is("project.deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("service_request_updates")
      .select(`
        id,
        company_id,
        service_request_id,
        update_type,
        body,
        cost_amount,
        customer_visible,
        created_at
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select(AFTERCARE_PROJECT_SELECT)
      .eq("company_id", companyId)
      .eq("construction_status", "completed")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
  ]);

  const updatesByRequestId = unwrap(serviceUpdatesResult).reduce((map, update) => {
    const current = map.get(update.service_request_id) ?? [];
    current.push(update);
    map.set(update.service_request_id, current);
    return map;
  }, new Map());

  return {
    aftercareSchedules: unwrap(aftercareResult),
    serviceRequests: unwrap(serviceResult).map((request) => ({
      ...request,
      updates: updatesByRequestId.get(request.id) ?? [],
    })),
    projectOptions: unwrap(projectOptionsResult),
  };
}

export async function createAftercareSchedule({
  companyId,
  customerId,
  projectId,
  baseDate,
  firstSendDate = null,
  repeatIntervalMonths = 0,
  endDate = null,
  nextSendDate,
}) {
  assertCustomerOperationsQuery(companyId);
  await assertWritableAftercareProject({ companyId, projectId, customerId });

  if (!baseDate || !nextSendDate) {
    throw new Error("기준일과 첫 점검 예정일을 입력해주세요.");
  }

  const interval = Math.max(0, Number.parseInt(repeatIntervalMonths, 10) || 0);
  return unwrapSingle(await supabase
    .from("aftercare_schedules")
    .insert({
      company_id: companyId,
      customer_id: customerId,
      project_id: projectId,
      status: "scheduled",
      base_date: baseDate,
      first_send_date: firstSendDate || nextSendDate,
      repeat_interval_months: interval,
      end_date: endDate || null,
      next_send_date: nextSendDate,
    })
    .select(AFTERCARE_SCHEDULE_SELECT)
    .single());
}

export async function updateAftercareSchedule({
  companyId,
  scheduleId,
  customerId,
  projectId,
  changes,
}) {
  assertCustomerOperationsQuery(companyId);
  await assertWritableAftercareProject({ companyId, projectId, customerId });

  if (!scheduleId) {
    throw new Error("수정할 사후관리 일정을 확인할 수 없습니다.");
  }

  const allowedStatuses = ["scheduled", "active", "paused", "completed", "cancelled"];
  const patch = {};
  if (changes.baseDate) patch.base_date = changes.baseDate;
  if (Object.hasOwn(changes, "firstSendDate")) {
    patch.first_send_date = changes.firstSendDate || null;
  }
  if (Object.hasOwn(changes, "repeatIntervalMonths")) {
    patch.repeat_interval_months = Math.max(
      0,
      Number.parseInt(changes.repeatIntervalMonths, 10) || 0
    );
  }
  if (Object.hasOwn(changes, "endDate")) patch.end_date = changes.endDate || null;
  if (Object.hasOwn(changes, "nextSendDate")) {
    if (!changes.nextSendDate) throw new Error("다음 점검 예정일을 입력해주세요.");
    patch.next_send_date = changes.nextSendDate;
  }
  if (changes.status) {
    if (!allowedStatuses.includes(changes.status)) {
      throw new Error("변경할 수 없는 사후관리 상태입니다.");
    }
    patch.status = changes.status;
  }
  if (Object.hasOwn(changes, "pausedReason")) {
    patch.paused_reason = `${changes.pausedReason ?? ""}`.trim();
  }

  return unwrapSingle(await supabase
    .from("aftercare_schedules")
    .update(patch)
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .eq("project_id", projectId)
    .eq("id", scheduleId)
    .select(AFTERCARE_SCHEDULE_SELECT)
    .single());
}

export async function createServiceRequest({
  companyId,
  customerId,
  projectId,
  problemSpace,
  relatedItemLabel = "",
  description,
  urgency = "normal",
  preferredContactTime = "",
  assignedTo = "",
  visitScheduledAt = null,
}) {
  assertCustomerOperationsQuery(companyId);
  await assertWritableAftercareProject({ companyId, projectId, customerId });

  if (!`${problemSpace ?? ""}`.trim() || !`${description ?? ""}`.trim()) {
    throw new Error("문제 공간과 상세 내용을 입력해주세요.");
  }

  const allowedUrgencies = ["low", "normal", "high", "urgent"];
  if (!allowedUrgencies.includes(urgency)) {
    throw new Error("A/S 긴급도를 확인해주세요.");
  }

  const status = visitScheduledAt ? "visit_scheduled" : "received";
  const created = unwrapSingle(await supabase
    .from("service_requests")
    .insert({
      company_id: companyId,
      customer_id: customerId,
      project_id: projectId,
      status,
      urgency,
      problem_space: `${problemSpace}`.trim(),
      related_item_label: `${relatedItemLabel ?? ""}`.trim(),
      description: `${description}`.trim(),
      preferred_contact_time: `${preferredContactTime ?? ""}`.trim(),
      assigned_to: `${assignedTo ?? ""}`.trim(),
      visit_scheduled_at: visitScheduledAt || null,
    })
    .select(SERVICE_REQUEST_SELECT)
    .single());

  return { ...created, updates: [] };
}

export async function updateServiceRequest({
  companyId,
  requestId,
  customerId,
  projectId,
  changes,
}) {
  assertCustomerOperationsQuery(companyId);
  await assertWritableAftercareProject({ companyId, projectId, customerId });

  if (!requestId) throw new Error("수정할 A/S 요청을 확인할 수 없습니다.");

  const patch = {};
  if (Object.hasOwn(changes, "problemSpace")) {
    const value = `${changes.problemSpace ?? ""}`.trim();
    if (!value) throw new Error("문제 공간을 입력해주세요.");
    patch.problem_space = value;
  }
  if (Object.hasOwn(changes, "relatedItemLabel")) {
    patch.related_item_label = `${changes.relatedItemLabel ?? ""}`.trim();
  }
  if (Object.hasOwn(changes, "description")) {
    const value = `${changes.description ?? ""}`.trim();
    if (!value) throw new Error("A/S 상세 내용을 입력해주세요.");
    patch.description = value;
  }
  if (Object.hasOwn(changes, "urgency")) {
    if (!["low", "normal", "high", "urgent"].includes(changes.urgency)) {
      throw new Error("A/S 긴급도를 확인해주세요.");
    }
    patch.urgency = changes.urgency;
  }
  if (Object.hasOwn(changes, "preferredContactTime")) {
    patch.preferred_contact_time = `${changes.preferredContactTime ?? ""}`.trim();
  }
  if (Object.hasOwn(changes, "assignedTo")) {
    patch.assigned_to = `${changes.assignedTo ?? ""}`.trim();
  }
  if (Object.hasOwn(changes, "visitScheduledAt")) {
    patch.visit_scheduled_at = changes.visitScheduledAt || null;
  }
  if (changes.status) {
    if (!["received", "contacted", "visit_scheduled", "in_progress", "resolved", "closed"].includes(changes.status)) {
      throw new Error("변경할 수 없는 A/S 상태입니다.");
    }
    patch.status = changes.status;
  }
  if (Object.hasOwn(changes, "resolvedAt")) {
    patch.resolved_at = changes.resolvedAt || null;
  }

  const updated = unwrapSingle(await supabase
    .from("service_requests")
    .update(patch)
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .eq("project_id", projectId)
    .eq("id", requestId)
    .select(SERVICE_REQUEST_SELECT)
    .single());

  return updated;
}

const SERVICE_STATUS_TRANSITIONS = {
  received: ["contacted", "visit_scheduled"],
  contacted: ["visit_scheduled", "in_progress"],
  visit_scheduled: ["in_progress"],
  in_progress: ["resolved"],
  resolved: ["closed"],
  closed: [],
};

const SERVICE_STATUS_UPDATE_LABELS = {
  contacted: "연락 완료",
  visit_scheduled: "방문 예정",
  in_progress: "처리 중",
  resolved: "처리 완료",
  closed: "종료",
};

export async function updateServiceRequestStatus({
  companyId,
  requestId,
  customerId,
  projectId,
  status,
  visitScheduledAt,
}) {
  assertCustomerOperationsQuery(companyId);
  await assertWritableAftercareProject({ companyId, projectId, customerId });

  const current = unwrapSingle(await supabase
    .from("service_requests")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .eq("project_id", projectId)
    .eq("id", requestId)
    .single());

  if (!SERVICE_STATUS_TRANSITIONS[current.status]?.includes(status)) {
    throw new Error("현재 A/S 상태에서 요청한 상태로 변경할 수 없습니다.");
  }

  const updated = await updateServiceRequest({
    companyId,
    requestId,
    customerId,
    projectId,
    changes: {
      status,
      ...(status === "resolved" ? { resolvedAt: new Date().toISOString() } : {}),
      ...(visitScheduledAt !== undefined ? { visitScheduledAt } : {}),
    },
  });

  const updateResult = await supabase
    .from("service_request_updates")
    .insert({
      company_id: companyId,
      service_request_id: requestId,
      update_type: status === "resolved" ? "resolution" : "status_change",
      body: `A/S 상태를 '${SERVICE_STATUS_UPDATE_LABELS[status] || status}'로 변경했습니다.`,
      customer_visible: false,
    })
    .select("id, company_id, service_request_id, update_type, body, cost_amount, customer_visible, created_at")
    .single();

  return {
    ...updated,
    status,
    statusUpdate: updateResult.error ? null : updateResult.data,
  };
}

export async function addServiceRequestNote({
  companyId,
  requestId,
  customerId,
  projectId,
  body,
}) {
  assertCustomerOperationsQuery(companyId);
  await assertWritableAftercareProject({ companyId, projectId, customerId });
  if (!requestId || !`${body ?? ""}`.trim()) {
    throw new Error("저장할 처리 메모를 입력해주세요.");
  }

  unwrapSingle(await supabase
    .from("service_requests")
    .select("id")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .eq("project_id", projectId)
    .eq("id", requestId)
    .single());

  return unwrapSingle(await supabase
    .from("service_request_updates")
    .insert({
      company_id: companyId,
      service_request_id: requestId,
      update_type: "note",
      body: `${body}`.trim(),
      customer_visible: false,
    })
    .select("id, company_id, service_request_id, update_type, body, cost_amount, customer_visible, created_at")
    .single());
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
    estimatesResult,
    timelineResult,
    linkMessagesResult,
  ] = await Promise.all([
    supabase
      .from("customer_requests")
      .select(`
        id, project_id, estimate_id, estimate_version_id,
        request_type, status, title, created_at,
        customer:customers(id, name),
        project:projects(id, name, address, deleted_at)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("service_requests")
      .select(`
        id, status, problem_space, created_at,
        customer:customers(id, name),
        project:projects(id, name, address, deleted_at)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("id, title, body, event_type, related_type, related_id, created_at")
      .eq("company_id", companyId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("projects")
      .select(`
        id, name, address, construction_status, deleted_at, created_at, updated_at,
        customer:customers(id, name)
      `)
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("estimate_versions")
      .select(`
        id, estimate_id, project_id, status,
        estimate:estimates(id, deleted_at),
        project:projects(id, deleted_at)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("estimates")
      .select(`
        id, deleted_at,
        estimate_versions(id, project:projects(id, deleted_at))
      `)
      .eq("company_id", companyId),
    supabase
      .from("timeline_events")
      .select(`
        id, project_id, estimate_id, estimate_version_id, customer_request_id,
        event_type, title, description, created_at,
        customer:customers(id, name),
        project:projects(id, name, address, deleted_at),
        estimate:estimates(id, deleted_at),
        estimate_version:estimate_versions(
          id,
          estimate:estimates(id, deleted_at),
          project:projects(id, deleted_at)
        )
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_messages")
      .select(`
        id,
        project:projects(id, deleted_at),
        estimate:estimates(id, deleted_at)
      `)
      .eq("company_id", companyId)
      .eq("message_type", "estimate_link")
      .gte("created_at", todayIso),
  ]);

  const requests = unwrap(requestsResult);
  const serviceRequests = unwrap(servicesResult).filter(isProjectLinkedRowVisible);
  const projects = unwrap(projectsResult);
  const estimateVersions = unwrap(versionsResult);
  const estimates = unwrap(estimatesResult);
  const timelineEvents = unwrap(timelineResult).filter(isHomeTimelineEventVisible);
  const visibleRequests = requests.filter(isProjectLinkedRowVisible);
  const attentionRequests = visibleRequests.filter((request) => (
    isOpenCustomerRequest(request.status)
  ));
  const activeProjects = projects.filter(isActiveProject);
  const visibleLinkMessages = unwrap(linkMessagesResult).filter((message) => (
    isProjectLinkedRowVisible(message) && !isDeletedEstimate(message.estimate)
  ));
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const estimatesById = new Map(estimates.map((estimate) => [estimate.id, estimate]));
  const requestsById = new Map(requests.map((request) => [request.id, request]));
  const estimateVersionsById = new Map(
    estimateVersions.map((version) => [version.id, version])
  );
  const notifications = unwrap(notificationsResult).filter((notification) => (
    isHomeNotificationVisible(notification, {
      projectsById,
      estimatesById,
      requestsById,
      estimateVersionsById,
    })
  ));
  const isToday = (value) => (
    Boolean(value) && new Date(value).getTime() >= new Date(todayIso).getTime()
  );

  return buildHomeOperationsData({
    requests: attentionRequests,
    serviceRequests,
    notifications,
    projects: activeProjects,
    timelineEvents,
    summary: {
      openRequests: attentionRequests.length,
      linksCreatedToday: visibleLinkMessages.length,
      estimateViewsToday: timelineEvents.filter((event) => (
        event.event_type === "estimate_viewed" && isToday(event.created_at)
      )).length,
      revisionRequests: attentionRequests.filter((request) => (
        request.request_type === "estimate_revision"
      )).length,
      approvalsToday: visibleRequests.filter((request) => (
        request.request_type === "approval"
        && request.status === "approved"
        && isToday(request.created_at)
      )).length,
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

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select(`
      id,
      deleted_at,
      estimate_versions(
        id,
        project:projects(id, deleted_at)
      )
    `)
    .eq("company_id", companyId)
    .eq("id", estimateId)
    .maybeSingle();

  if (estimateError || !estimate || !isOperationalEstimate(estimate)) {
    throw new Error("휴지통의 견적 또는 휴지통 현장에 연결된 견적은 공유할 수 없습니다.");
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
