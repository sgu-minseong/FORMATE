export const CONTRACT_EDITABLE_STATUSES = ["draft"];

export const CONTRACT_DOCUMENT_TEXT_FIELDS = [
  "scopeSupplement",
  "exclusions",
  "materialChangePolicy",
  "changeOrderPolicy",
  "delayCancellationPolicy",
  "warranty",
  "specialTerms",
  "internalMemo",
];

const CONTRACT_STATUS_LABELS = {
  draft: "작성 중",
  customer_reviewing: "고객 검토 중",
  revision_requested: "수정 요청",
  customer_signed: "고객 서명 완료 · 업체 최종 확인 대기",
  completed: "계약 완료",
  cancelled: "계약 취소",
};

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function createPaymentTermId(index = 0) {
  return `payment-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizePaymentTerm(term, index = 0) {
  const source = safeObject(term);
  const calculationType = source.calculationType === "amount" ? "amount" : "percentage";
  return {
    id: `${source.id || createPaymentTermId(index)}`,
    label: `${source.label || "지급 조건"}`,
    calculationType,
    percentage: source.percentage ?? "",
    amount: source.amount ?? "",
    dueDescription: `${source.dueDescription || ""}`,
  };
}

export function normalizeContractDocument(documentData) {
  const source = safeObject(documentData);
  const construction = safeObject(source.construction);
  const paymentTerms = safeArray(source.paymentTerms).map(normalizePaymentTerm);

  return {
    ...source,
    title: `${source.title || "인테리어 공사 계약서"}`,
    contractNumber: `${source.contractNumber || ""}`,
    customerSnapshot: safeObject(source.customerSnapshot),
    companySnapshot: safeObject(source.companySnapshot),
    projectSnapshot: safeObject(source.projectSnapshot),
    estimateSnapshot: {
      ...safeObject(source.estimateSnapshot),
      scopeItems: safeArray(safeObject(source.estimateSnapshot).scopeItems),
    },
    construction: {
      startDate: `${construction.startDate || ""}`,
      endDate: `${construction.endDate || ""}`,
      periodDescription: `${construction.periodDescription || ""}`,
    },
    paymentTerms,
    ...Object.fromEntries(CONTRACT_DOCUMENT_TEXT_FIELDS.map((key) => [
      key,
      `${source[key] || ""}`,
    ])),
  };
}

export function getContractStatusLabel(status) {
  return CONTRACT_STATUS_LABELS[status] || "계약 상태 확인 필요";
}

export function getContractDisplayDocument(contract) {
  if (!contract) return normalizeContractDocument({});
  const shouldUseImmutableVersion = !["draft", "revision_requested"].includes(contract.status);
  const snapshot = shouldUseImmutableVersion
    ? contract.currentVersion?.document_snapshot
    : null;
  return normalizeContractDocument(snapshot || contract.document_data);
}

export function getContractScopeItemLabel(item) {
  const source = safeObject(item);
  const category = `${source.categoryName || source.category || source.itemName || "공사 항목"}`.trim();
  const material = `${source.material || source.name || source.description || ""}`.trim();
  const spec = `${source.spec || ""}`.trim();
  return [category, material, spec].filter(Boolean).join(" · ");
}

export function formatContractAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${Math.max(0, amount).toLocaleString("ko-KR")}원` : "-";
}

export function formatPaymentTermValue(term) {
  if (term?.calculationType === "amount") {
    return formatContractAmount(term.amount);
  }
  const percentage = Number(term?.percentage);
  return Number.isFinite(percentage) && `${term?.percentage}`.trim() !== ""
    ? `${percentage.toLocaleString("ko-KR")}%`
    : "협의";
}

export function isApprovedCurrentEstimateVersion(version) {
  const estimate = Array.isArray(version?.estimate) ? version.estimate[0] : version?.estimate;
  return version?.status === "approved" && estimate?.current_estimate_version_id === version.id;
}
