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
  buildCustomerRequestStatusRpcArgs,
  REQUEST_STATUS_VALUES,
} from "./lifecycleContracts";

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
        estimate:estimates!estimate_versions_estimate_id_fkey(id, deleted_at)
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

  if (!REQUEST_STATUS_VALUES.includes(status)) {
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
    buildCustomerRequestStatusRpcArgs({
      companyId,
      requestId,
      status,
      internalMemo: nextMemo,
    })
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
        estimate:estimates!estimate_versions_estimate_id_fkey(id, deleted_at)
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
