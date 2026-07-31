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
import { buildEstimatePortalLinkRpcArgs } from "./lifecycleContracts";
import { saveEstimateDraft } from "../estimates/estimateApi";

const BLOCKED_SHARE_STATUSES = new Set(["approved", "rejected", "expired", "cancelled"]);

export async function fetchEstimateShareOptions(companyId) {
  assertCustomerOperationsQuery(companyId);
  const [customersResult, projectsResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, email, updated_at")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, customer_id, name, address, detail_address, updated_at")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
  ]);

  return {
    customers: unwrap(customersResult),
    projects: unwrap(projectsResult),
  };
}

export async function fetchActiveEstimatePortalLink({
  companyId,
  estimateId,
  estimateVersionId,
}) {
  assertCustomerOperationsQuery(companyId);
  if (!estimateId || !estimateVersionId) return null;

  const { data, error } = await supabase
    .from("customer_access_tokens")
    .select("token, status, expires_at, estimate_version_id, created_at")
    .eq("company_id", companyId)
    .eq("estimate_id", estimateId)
    .eq("estimate_version_id", estimateVersionId)
    .eq("status", "active")
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data || (data.expires_at && new Date(data.expires_at).getTime() <= Date.now())) return null;
  return { ...data, portalPath: `/c/${data.token}` };
}

export async function createEstimatePortalLink({
  companyId,
  estimateId,
  customerName,
  customerPhone = "",
  customerEmail = "",
  projectName = "",
  projectAddress = "",
  projectBaseAddress = "",
  projectDetailAddress = "",
  clientDraftKey = "",
  versionLabel = "",
  expiresAt = null,
  requiredContactConsent = false,
  aftercareConsent = false,
  marketingConsent = false,
}) {
  assertCustomerOperationsQuery(companyId);

  if (!estimateId) {
    throw new Error("공유할 견적서를 확인할 수 없습니다.");
  }

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select(`
      *,
      consultation:consultations(
        id,
        customer_id,
        project_id,
        customer:customers(id, name, phone, email),
        project:projects(id, name, address, detail_address, deleted_at)
      ),
      estimate_versions!estimate_versions_estimate_id_fkey(
        id,
        project:projects(id, deleted_at)
      )
    `)
    .eq("company_id", companyId)
    .eq("id", estimateId)
    .maybeSingle();

  if (estimateError || !estimate || !isOperationalEstimate(estimate)) {
    throw new Error("휴지통의 견적 또는 휴지통 현장에 연결된 견적은 공유할 수 없습니다.");
  }
  if (BLOCKED_SHARE_STATUSES.has(estimate.status)) {
    throw new Error("현재 견적 상태에서는 고객 링크를 발송할 수 없습니다.");
  }

  const consultation = Array.isArray(estimate.consultation)
    ? estimate.consultation[0]
    : estimate.consultation;
  const linkedCustomer = Array.isArray(consultation?.customer)
    ? consultation.customer[0]
    : consultation?.customer;
  const linkedProject = Array.isArray(consultation?.project)
    ? consultation.project[0]
    : consultation?.project;
  if (linkedProject?.deleted_at) {
    throw new Error("휴지통의 현장에 연결된 견적은 발송할 수 없습니다.");
  }
  if (!consultation?.customer_id || !consultation?.project_id || !linkedCustomer?.id || !linkedProject?.id) {
    const saveResult = await saveEstimateDraft({
      estimate: {
        ...estimate,
        address: projectBaseAddress.trim() || projectAddress.trim(),
      },
      estimateId,
      clientDraftKey,
      customerName,
      customerPhone,
      customerEmail,
      projectName,
      projectDetailAddress,
    });
    if (!saveResult?.customerId || !saveResult?.projectId) {
      throw new Error("고객과 현장을 연결하지 못해 발송을 중단했습니다.");
    }
  }

  const { data, error } = await supabase.rpc(
    "create_customer_portal_link",
    buildEstimatePortalLinkRpcArgs({
      companyId,
      estimateId,
      customerName,
      customerPhone,
      customerEmail,
      projectName,
      projectAddress,
      versionLabel,
      expiresAt,
      requiredContactConsent,
      aftercareConsent,
      marketingConsent,
    })
  );

  if (error) throw error;
  if (!data?.ok) {
    throw new Error(data?.message || "공유 링크를 생성하지 못했습니다.");
  }

  return data;
}
