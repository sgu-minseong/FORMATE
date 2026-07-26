import { supabase } from "../../lib/supabaseClient";

export const SAVED_ESTIMATE_TRASH_RESULT = {
  MOVED_TO_TRASH: "moved_to_trash",
  ALREADY_IN_TRASH: "already_in_trash",
};

export const SAVED_ESTIMATE_RESTORE_RESULT = {
  RESTORED: "restored",
  ALREADY_RESTORED: "already_restored",
};

export async function moveSavedEstimateToTrash({ estimateId, companyId }) {
  const { data, error } = await supabase.rpc("move_saved_estimate_to_trash", {
    p_company_id: companyId,
    p_estimate_id: estimateId,
  });

  if (error) throw error;
  return data;
}

export async function restoreSavedEstimate({ estimateId, companyId }) {
  const { data, error } = await supabase.rpc("restore_saved_estimate_from_trash", {
    p_company_id: companyId,
    p_estimate_id: estimateId,
  });

  if (error) throw error;
  return data;
}
