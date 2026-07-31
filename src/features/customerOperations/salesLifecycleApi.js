import { supabase } from "../../lib/supabaseClient";
import { assertCustomerOperationsQuery } from "./apiShared";

export const CONSULTATION_STATUS_VALUES = ["active", "closed"];
export const CONTRACT_STATUS_VALUES = [
  "draft",
  "customer_reviewing",
  "revision_requested",
  "customer_signed",
  "completed",
  "cancelled",
];

export async function updateConsultationStatus({
  companyId,
  consultationId,
  status,
  closeReason = "",
}) {
  assertCustomerOperationsQuery(companyId);
  if (!consultationId || !CONSULTATION_STATUS_VALUES.includes(status)) {
    throw new Error("변경할 상담 상태를 확인할 수 없습니다.");
  }

  const { data, error } = await supabase.rpc("update_consultation_status", {
    p_company_id: companyId,
    p_consultation_id: consultationId,
    p_next_status: status,
    p_close_reason: status === "closed" ? closeReason.trim() || null : null,
  });
  if (error) throw error;
  if (!data?.ok) {
    throw new Error(data?.message || "상담 상태를 변경하지 못했습니다.");
  }
  return data;
}

export async function updateContractStatus({
  companyId,
  contractId,
  status,
  cancelReason = "",
}) {
  assertCustomerOperationsQuery(companyId);
  if (!contractId || !CONTRACT_STATUS_VALUES.includes(status)) {
    throw new Error("변경할 계약 상태를 확인할 수 없습니다.");
  }

  const { data, error } = await supabase.rpc("update_contract_status", {
    p_company_id: companyId,
    p_contract_id: contractId,
    p_next_status: status,
    p_cancel_reason: status === "cancelled" ? cancelReason.trim() || null : null,
  });
  if (error) throw error;
  if (!data?.ok) {
    throw new Error(data?.message || "계약 상태를 변경하지 못했습니다.");
  }
  return data;
}
