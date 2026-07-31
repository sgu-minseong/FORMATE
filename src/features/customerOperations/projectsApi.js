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
import {
  buildProjectRpcArgs,
  buildProjectStatusRpcArgs,
  PROJECT_STATUS_VALUES,
} from "./lifecycleContracts";

export async function updateProjectStatus({
  companyId,
  projectId,
  status,
}) {
  assertCustomerOperationsQuery(companyId);

  if (!projectId) {
    throw new Error("처리할 현장을 확인할 수 없습니다.");
  }

  if (!PROJECT_STATUS_VALUES.includes(status)) {
    throw new Error("변경할 수 없는 현장 상태입니다.");
  }

  const { data, error } = await supabase.rpc(
    "update_project_status",
    buildProjectStatusRpcArgs({ companyId, projectId, status })
  );

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

  const { data, error } = await supabase.rpc(
    "get_project_trash_impact",
    buildProjectRpcArgs({ companyId, projectId })
  );

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

  const { data, error } = await supabase.rpc(
    "move_project_to_trash",
    buildProjectRpcArgs({ companyId, projectId })
  );

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

  const { data, error } = await supabase.rpc(
    "restore_project_from_trash",
    buildProjectRpcArgs({ companyId, projectId })
  );

  if (error) throw error;
  if (!data?.ok || !["restored", "already_restored"].includes(data?.result)) {
    throw new Error("현장을 복원할 수 없습니다.");
  }

  return data;
}

export async function fetchCustomersProjects(companyId) {
  assertCustomerOperationsQuery(companyId);

  const [
    projectsResult,
    versionsResult,
    requestsResult,
    timelineResult,
    consultationsResult,
    contractsResult,
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
      .order("updated_at", { ascending: false }),
    supabase
      .from("estimate_versions")
      .select("id, project_id, estimate_id, version_no, label, status, estimate:estimates!estimate_versions_estimate_id_fkey(id, deleted_at, current_estimate_version_id)")
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
    supabase
      .from("consultations")
      .select("id, project_id, customer_id, status, close_reason, closed_at, updated_at")
      .eq("company_id", companyId)
      .not("project_id", "is", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, project_id, estimate_id, estimate_version_id, contract_number, current_version_id, status, customer_signed_at, completed_at, updated_at")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false }),
  ]);

  return buildCustomerProjectRows({
    projects: unwrap(projectsResult),
    estimateVersions: unwrap(versionsResult).filter(
      (version) => !isDeletedEstimate(version.estimate)
    ),
    consultations: unwrap(consultationsResult),
    contracts: unwrap(contractsResult),
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
    consultationsResult,
    contractsResult,
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
        estimate:estimates!estimate_versions_estimate_id_fkey(id, deleted_at, current_estimate_version_id)
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
    supabase
      .from("consultations")
      .select("id, project_id, customer_id, status, close_reason, closed_at, closed_by, created_at, updated_at")
      .eq("company_id", companyId)
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, project_id, estimate_id, estimate_version_id, contract_number, current_version_id, status, customer_signed_at, completed_at, completed_by, cancelled_at, cancel_reason, created_at, updated_at")
      .eq("company_id", companyId)
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
  ]);

  const estimateVersions = unwrap(versionsResult).filter(
    (version) => !isDeletedEstimate(version.estimate)
  );

  return {
    project: {
      ...unwrapSingle(projectResult),
      consultation: unwrap(consultationsResult)[0] ?? null,
      contract: unwrap(contractsResult)[0] ?? null,
    },
    estimateVersions,
    requests: unwrap(requestsResult),
    messages: unwrap(messagesResult),
    timelineEvents: unwrap(timelineResult),
    changeOrders: unwrap(changeOrdersResult),
    aftercareSchedules: unwrap(aftercareSchedulesResult),
    serviceRequests: unwrap(serviceRequestsResult),
    consultations: unwrap(consultationsResult),
    contracts: unwrap(contractsResult),
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
