export const REQUEST_STATUS_VALUES = [
  "received",
  "reviewing",
  "pricing",
  "awaiting_customer_approval",
  "rejected",
  "closed",
];

export const PROJECT_STATUS_VALUES = ["in_progress", "completed", "cancelled"];

export function buildCustomerRequestStatusRpcArgs({
  companyId,
  requestId,
  status,
  internalMemo = "",
}) {
  return {
    p_company_id: companyId,
    p_request_id: requestId,
    p_next_status: status,
    p_closed_reason: ["closed", "rejected"].includes(status)
      ? `${internalMemo ?? ""}`.trim() || null
      : null,
  };
}

export function buildProjectStatusRpcArgs({ companyId, projectId, status }) {
  return {
    p_company_id: companyId,
    p_project_id: projectId,
    p_next_status: status,
  };
}

export function buildProjectRpcArgs({ companyId, projectId }) {
  return {
    p_company_id: companyId,
    p_project_id: projectId,
  };
}

export function buildEstimatePortalLinkRpcArgs({
  companyId,
  estimateId,
  customerName,
  customerPhone = "",
  customerEmail = "",
  projectName = "",
  projectAddress = "",
  versionLabel = "",
  expiresAt = null,
  requiredContactConsent = false,
  aftercareConsent = false,
  marketingConsent = false,
}) {
  return {
    p_company_id: companyId,
    p_estimate_id: estimateId,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_customer_email: customerEmail,
    p_project_name: projectName,
    p_project_address: projectAddress,
    p_version_label: versionLabel,
    p_expires_at: expiresAt,
    p_required_contact_consent: requiredContactConsent,
    p_aftercare_consent: aftercareConsent,
    p_marketing_consent: marketingConsent,
  };
}

export function replaceRequestInCollection(requests, updatedRequest) {
  return (requests ?? []).map((request) => (
    request.id === updatedRequest?.id ? updatedRequest : request
  ));
}
