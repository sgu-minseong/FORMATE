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

export async function createEstimatePortalLink({
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
  assertCustomerOperationsQuery(companyId);

  if (!estimateId) {
    throw new Error("공유할 견적서를 확인할 수 없습니다.");
  }

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select(`
      id,
      deleted_at,
      consultation:consultations(
        id,
        customer_id,
        project_id,
        customer:customers(id),
        project:projects(id, deleted_at)
      ),
      estimate_versions(
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

  const consultation = Array.isArray(estimate.consultation)
    ? estimate.consultation[0]
    : estimate.consultation;
  const linkedCustomer = Array.isArray(consultation?.customer)
    ? consultation.customer[0]
    : consultation?.customer;
  const linkedProject = Array.isArray(consultation?.project)
    ? consultation.project[0]
    : consultation?.project;
  if (!consultation?.customer_id) {
    throw new Error("고객 연결이 완료된 견적만 발송할 수 있습니다. 견적을 다시 저장해주세요.");
  }
  if (!consultation?.project_id) {
    throw new Error("현장 연결이 완료된 견적만 발송할 수 있습니다. 현장 주소를 확인한 뒤 다시 저장해주세요.");
  }
  if (!linkedCustomer?.id) {
    throw new Error("연결된 고객을 찾을 수 없습니다.");
  }
  if (!linkedProject?.id) {
    throw new Error("연결된 현장을 찾을 수 없습니다.");
  }
  if (linkedProject.deleted_at) {
    throw new Error("휴지통의 현장에 연결된 견적은 발송할 수 없습니다.");
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
