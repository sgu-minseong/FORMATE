import { supabase } from "../../lib/supabaseClient";
import { isOperationalEstimate } from "../customerOperations/utils";
import {
  moveSavedEstimateToTrash,
  restoreSavedEstimate,
  SAVED_ESTIMATE_RESTORE_RESULT,
  SAVED_ESTIMATE_TRASH_RESULT,
} from "./api";

const ESTIMATE_SELECT = `
  *,
  consultation:consultations(
    id,
    status,
    customer:customers(id, name, phone, email),
    project:projects(id, name, address, detail_address, deleted_at)
  ),
  estimate_versions(
    id,
    project_id,
    project:projects(id, deleted_at)
  )
`;

export async function fetchSavedEstimateLists(companyId) {
  const [activeResult, trashResult] = await Promise.all([
    supabase
      .from("estimates")
      .select(ESTIMATE_SELECT)
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("estimates")
      .select(ESTIMATE_SELECT)
      .eq("company_id", companyId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
  ]);
  if (activeResult.error) throw activeResult.error;
  if (trashResult.error) throw trashResult.error;
  return {
    active: (activeResult.data ?? []).filter(isOperationalEstimate),
    trash: trashResult.data ?? [],
  };
}

export async function saveEstimateDraft({
  estimate,
  estimateId = null,
  clientDraftKey,
  customerName = "",
  customerPhone = "",
  customerEmail = "",
  projectName = "",
  projectDetailAddress = "",
}) {
  const { data, error } = await supabase.rpc("save_estimate_draft", {
    p_company_id: estimate.company_id,
    p_client_draft_key: clientDraftKey,
    p_estimate_id: estimateId,
    p_address: estimate.address || "",
    p_construction_date: estimate.construction_date,
    p_condition_id: estimate.condition_id,
    p_condition_snapshot: estimate.condition_snapshot,
    p_items_data: estimate.items_data,
    p_total_amount: estimate.total_amount,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_customer_email: customerEmail,
    p_project_name: projectName,
    p_project_detail_address: projectDetailAddress,
  });
  if (error) throw error;
  if (!data?.ok) {
    const lifecycleError = new Error(data?.message || "견적 작업본을 저장하지 못했습니다.");
    lifecycleError.code = data?.code || "estimate_save_failed";
    throw lifecycleError;
  }
  return data;
}

export {
  moveSavedEstimateToTrash,
  restoreSavedEstimate,
  SAVED_ESTIMATE_RESTORE_RESULT,
  SAVED_ESTIMATE_TRASH_RESULT,
};
