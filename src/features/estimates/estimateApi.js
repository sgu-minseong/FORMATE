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

export async function insertEstimate(payload) {
  const { error } = await supabase.from("estimates").insert(payload);
  if (error) throw error;
}

export {
  moveSavedEstimateToTrash,
  restoreSavedEstimate,
  SAVED_ESTIMATE_RESTORE_RESULT,
  SAVED_ESTIMATE_TRASH_RESULT,
};
