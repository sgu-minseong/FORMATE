import { supabase } from "../../lib/supabaseClient";

export const SAVED_ESTIMATE_DELETE_RESULT = {
  DELETED: "deleted",
  NOT_FOUND: "not_found",
  REAUTHENTICATION_REQUIRED: "reauthentication_required",
  REMOVAL_MODE_CHANGED_TO_ARCHIVE: "removal_mode_changed_to_archive",
};

export const SAVED_ESTIMATE_REMOVAL_MODE = {
  HARD_DELETE: "hard_delete",
  ARCHIVE: "archive",
};

export const SAVED_ESTIMATE_ARCHIVE_RESULT = {
  ARCHIVED: "archived",
  ALREADY_ARCHIVED: "already_archived",
};

export const SAVED_ESTIMATE_RESTORE_RESULT = {
  RESTORED: "restored",
};

export async function getSavedEstimateRemovalMode({ estimateId, companyId }) {
  const { data, error } = await supabase.rpc("get_saved_estimate_removal_mode", {
    p_company_id: companyId,
    p_estimate_id: estimateId,
  });

  if (error) throw error;
  return data;
}

export async function deleteSavedEstimate({ estimateId, companyId }) {
  const { data, error } = await supabase.rpc("delete_saved_estimate", {
    p_company_id: companyId,
    p_estimate_id: estimateId,
  });

  if (error) throw error;
  return data;
}

export async function archiveSavedEstimate({ estimateId, companyId }) {
  const { data, error } = await supabase.rpc("archive_saved_estimate", {
    p_company_id: companyId,
    p_estimate_id: estimateId,
  });

  if (error) throw error;
  return data;
}

export async function restoreSavedEstimate({ estimateId, companyId }) {
  const { data, error } = await supabase.rpc("restore_saved_estimate", {
    p_company_id: companyId,
    p_estimate_id: estimateId,
  });

  if (error) throw error;
  return data;
}

export async function reauthenticateSavedEstimateDeletion(password) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const currentUser = sessionData?.session?.user;
  if (!currentUser?.id || !currentUser.email) {
    return { ok: false, result: "session_missing" };
  }

  const providers = Array.isArray(currentUser.app_metadata?.providers)
    ? currentUser.app_metadata.providers
    : [];
  const primaryProvider = `${currentUser.app_metadata?.provider ?? ""}`.trim();
  const hasPasswordProvider = primaryProvider === "email" || providers.includes("email");

  if (!hasPasswordProvider) {
    return { ok: false, result: "password_provider_unavailable" };
  }

  const originalUserId = currentUser.id;
  const { data, error } = await supabase.auth.signInWithPassword({
    email: currentUser.email,
    password,
  });

  if (error) {
    return { ok: false, result: "invalid_password" };
  }

  const verifiedUserId = data?.user?.id ?? data?.session?.user?.id ?? "";
  if (!verifiedUserId || verifiedUserId !== originalUserId) {
    return { ok: false, result: "identity_changed" };
  }

  return { ok: true, result: "verified" };
}
