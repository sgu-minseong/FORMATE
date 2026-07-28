import { supabase } from "../../lib/supabaseClient";
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
import { assertCustomerOperationsQuery, unwrap, unwrapSingle } from "./apiShared";

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
