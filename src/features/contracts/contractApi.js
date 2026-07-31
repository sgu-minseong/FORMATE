import { supabase } from "../../lib/supabaseClient";
import { assertCustomerOperationsQuery } from "../customerOperations/apiShared";

export function buildCreateContractDraftArgs({ companyId, projectId, estimateVersionId = null }) {
  return {
    p_company_id: companyId,
    p_project_id: projectId,
    p_estimate_version_id: estimateVersionId || null,
  };
}
export function buildSaveContractDocumentArgs({ companyId, contractId, documentData }) {
  return {
    p_company_id: companyId,
    p_contract_id: contractId,
    p_document_data: documentData,
  };
}

export function buildContractActionArgs({ companyId, contractId }) {
  return {
    p_company_id: companyId,
    p_contract_id: contractId,
  };
}

function getContractErrorMessage(code, fallback) {
  const messages = {
    approved_current_estimate_required: "승인된 현재 견적이 있어야 계약서를 작성할 수 있습니다.",
    consultation_link_required: "견적의 고객·현장 연결 정보를 확인해주세요.",
    contract_not_found: "계약서를 찾을 수 없습니다.",
    contract_not_editable: "현재 상태에서는 계약서를 수정할 수 없습니다.",
    invalid_document_data: "계약서 입력 내용을 확인해주세요.",
    invalid_contract_transition: "현재 계약 상태에서는 이 작업을 진행할 수 없습니다.",
    contract_document_required: "저장된 계약서 내용이 필요합니다.",
  };
  return messages[code] || fallback;
}

function assertRpcResult(data, fallback) {
  if (data?.ok) return data;
  const error = new Error(getContractErrorMessage(data?.code, fallback));
  error.code = data?.code || "contract_action_failed";
  throw error;
}

export async function fetchContractDocument({ companyId, contractId }) {
  assertCustomerOperationsQuery(companyId);
  if (!contractId) throw new Error("계약서를 확인할 수 없습니다.");

  const contractResult = await supabase
    .from("contracts")
    .select(`
      id,
      company_id,
      consultation_id,
      project_id,
      estimate_id,
      estimate_version_id,
      contract_number,
      document_data,
      current_version_id,
      status,
      customer_signed_at,
      completed_at,
      cancelled_at,
      cancel_reason,
      created_at,
      updated_at
    `)
    .eq("company_id", companyId)
    .eq("id", contractId)
    .single();
  if (contractResult.error) throw contractResult.error;

  const versionsResult = await supabase
    .from("contract_versions")
    .select("id, company_id, contract_id, version_no, document_snapshot, source_estimate_version_id, created_by, created_at")
    .eq("company_id", companyId)
    .eq("contract_id", contractId)
    .order("version_no", { ascending: false });
  if (versionsResult.error) throw versionsResult.error;

  const versions = versionsResult.data ?? [];
  return {
    ...contractResult.data,
    versions,
    currentVersion: versions.find((version) => version.id === contractResult.data.current_version_id) ?? null,
  };
}

export async function createContractDraft({ companyId, projectId, estimateVersionId = null }) {
  assertCustomerOperationsQuery(companyId);
  if (!projectId) throw new Error("계약서를 작성할 현장을 확인할 수 없습니다.");

  const { data, error } = await supabase.rpc(
    "create_contract_draft",
    buildCreateContractDraftArgs({ companyId, projectId, estimateVersionId })
  );
  if (error) throw error;
  return assertRpcResult(data, "계약서 초안을 만들지 못했습니다.");
}

export async function saveContractDocument({ companyId, contractId, documentData }) {
  assertCustomerOperationsQuery(companyId);
  const { data, error } = await supabase.rpc(
    "save_contract_document",
    buildSaveContractDocumentArgs({ companyId, contractId, documentData })
  );
  if (error) throw error;
  return assertRpcResult(data, "계약서를 저장하지 못했습니다.");
}

export async function requestContractReview({ companyId, contractId }) {
  assertCustomerOperationsQuery(companyId);
  const { data, error } = await supabase.rpc(
    "request_contract_review",
    buildContractActionArgs({ companyId, contractId })
  );
  if (error) throw error;
  return assertRpcResult(data, "고객 검토 요청을 처리하지 못했습니다.");
}
