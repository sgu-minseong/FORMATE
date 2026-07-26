import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

function assertCustomerPortalAvailable() {
  if (!isSupabaseConfigured) {
    throw new Error("견적 확인 서비스를 불러올 수 없습니다.");
  }
}

function getActionError(result, fallback) {
  const unavailableCodes = new Set([
    "revoked_token",
    "inactive_token",
    "deleted_estimate",
    "deleted_project",
    "estimate_not_found",
  ]);
  const message = unavailableCodes.has(result?.code)
    ? "삭제되었거나 더 이상 사용할 수 없는 견적 링크입니다."
    : result?.message || fallback;
  const error = new Error(message);
  error.code = result?.code || "portal_action_failed";
  return error;
}

export async function fetchCustomerPortal(token) {
  assertCustomerPortalAvailable();

  if (!token) {
    return {
      ok: false,
      code: "invalid_token",
      tokenStatus: "invalid",
    };
  }

  const { data, error } = await supabase.rpc("get_customer_portal", {
    p_token: token,
  });

  if (error) {
    throw new Error("견적 확인 서비스를 불러오지 못했습니다.");
  }

  if (data?.ok && data.tokenStatus !== "active") {
    return {
      ok: false,
      code: "inactive_token",
      tokenStatus: data.tokenStatus || "inactive",
    };
  }
  if (data?.ok && data.estimate?.deletedAt) {
    return {
      ok: false,
      code: "deleted_estimate",
      tokenStatus: data.tokenStatus,
    };
  }
  if (data?.ok && data.project?.deletedAt) {
    return {
      ok: false,
      code: "deleted_project",
      tokenStatus: data.tokenStatus,
    };
  }

  return data ?? {
    ok: false,
    code: "estimate_not_found",
    tokenStatus: "invalid",
  };
}

export async function submitCustomerPortalRequest({
  token,
  requestType,
  title = "",
  body,
  relatedItemLabel = "",
}) {
  assertCustomerPortalAvailable();

  const { data, error } = await supabase.rpc("submit_customer_request", {
    p_token: token,
    p_request_type: requestType,
    p_title: title,
    p_body: body,
    p_related_item_label: relatedItemLabel,
  });

  if (error) {
    throw new Error("요청을 전송하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
  if (!data?.ok) {
    throw getActionError(data, "요청을 전송하지 못했습니다.");
  }

  return data;
}

export async function approveCustomerPortalEstimate({
  token,
  note = "",
}) {
  assertCustomerPortalAvailable();

  const { data, error } = await supabase.rpc("approve_customer_estimate", {
    p_token: token,
    p_note: note,
  });

  if (error) {
    throw new Error("견적을 확정하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
  if (!data?.ok) {
    throw getActionError(data, "견적을 확정하지 못했습니다.");
  }

  return data;
}
