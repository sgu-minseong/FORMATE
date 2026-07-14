import { AI_ROW_TYPE_OPTIONS } from "./constants";

export function getAiRowTypeLabel(rowType) {
  return AI_ROW_TYPE_OPTIONS.find((option) => option.value === rowType)?.label ?? "검토 필요";
}

export function getAiDisplayMatchStatus(row) {
  if (row?.rowType === "work_item") {
    if (row?.action === "new") return "new_candidate";
    return row.matchStatus;
  }
  if (["cost_item", "margin_item", "tax_item", "subtotal_row", "total_row", "ignored", "needs_review"].includes(row?.rowType)) {
    return row.rowType;
  }
  return "needs_review";
}

export function getAiRowTypeGuidance(rowType) {
  const labels = {
    cost_item: "단가표 항목이 아니라 별도 비용 후보입니다.",
    margin_item: "업체 마진/이윤 성격의 후보입니다.",
    tax_item: "세금/부가세 성격의 후보입니다.",
    subtotal_row: "저장용 항목이 아니라 원본 금액 검산용입니다.",
    total_row: "저장용 항목이 아니라 원본 금액 검산용입니다.",
    needs_review: "공사항목 여부 또는 매칭 대상을 확인해야 합니다.",
    ignored: "이번 변환에서 사용하지 않는 행입니다.",
  };
  return labels[rowType] ?? "";
}

export function getAiMatchStatusLabel(status) {
  const labels = {
    matched: "기존 항목 매칭",
    category_matched: "대분류만 매칭",
    subitem_candidate: "세부항목 후보",
    new_candidate: "새 항목 후보",
    needs_review: "검토 필요",
    ignored: "무시",
  };
  return labels[status] ?? "검토 필요";
}

export function getAiDisplayMatchStatusLabel(row) {
  const displayStatus = getAiDisplayMatchStatus(row);
  const labels = {
    cost_item: "비용 후보",
    margin_item: "마진 후보",
    tax_item: "세금 후보",
    subtotal_row: "소계/검산",
    total_row: "총계/검산",
    ignored: "무시",
    needs_review: "검토 필요",
  };
  return labels[displayStatus] ?? getAiMatchStatusLabel(displayStatus);
}

export function isAiWorkItemRow(row) {
  return `${row?.rowType ?? ""}`.trim() === "work_item";
}

export function getAiCatalogMappingUnavailableMessage(rowType) {
  const labels = {
    cost_item: "공사항목이 아니므로 단가표 항목 연결 대상이 아닙니다.",
    margin_item: "마진/관리비 성격이라 단가표 항목 연결 대상이 아닙니다.",
    tax_item: "세금 항목은 단가표 세부항목으로 연결하지 않습니다.",
    subtotal_row: "검산용 행이라 단가표 항목 연결 대상이 아닙니다.",
    total_row: "검산용 행이라 단가표 항목 연결 대상이 아닙니다.",
    needs_review: "공사항목 여부를 먼저 확인해주세요.",
    ignored: "이번 변환에서 사용하지 않는 행입니다.",
  };
  return labels[rowType] ?? "공사항목으로 바꾸면 단가표 항목에 연결할 수 있습니다.";
}

export function getAiActionOptionsForRowType(rowType) {
  if (rowType === "work_item") {
    return [
      { value: "link", label: "기존 항목에 연결" },
      { value: "new", label: "새 항목으로 추가" },
      { value: "review", label: "검토 필요" },
      { value: "ignore", label: "무시" },
    ];
  }
  if (rowType === "cost_item") {
    return [{ value: "cost", label: "비용 후보" }];
  }
  if (rowType === "margin_item") {
    return [{ value: "cost", label: "비용/마진 후보" }];
  }
  if (rowType === "tax_item") {
    return [{ value: "cost", label: "세금 후보" }];
  }
  if (["subtotal_row", "total_row"].includes(rowType)) {
    return [{ value: "validate", label: "검산용" }];
  }
  if (rowType === "ignored") {
    return [{ value: "ignore", label: "무시" }];
  }
  return [{ value: "review", label: "검토 필요" }];
}

export function getAiActionSelectValue(row) {
  const options = getAiActionOptionsForRowType(row?.rowType);
  return options.some((option) => option.value === row?.action)
    ? row.action
    : options[0]?.value ?? "review";
}

export function getAiActionLabel(action) {
  const labels = {
    link: "기존 항목에 연결",
    new: "새 항목으로 추가",
    cost: "비용 후보",
    tax: "세금 후보",
    validate: "검산용",
    ignore: "무시",
    review: "검토 필요",
  };
  return labels[action] ?? "검토 필요";
}

export function getAiRecommendationActionLabel(action) {
  const labels = {
    link_existing: "기존 항목에 연결",
    add_new_item: "새 항목으로 추가",
    cost_candidate: "비용 후보",
    validation_only: "검산용",
    ignore: "무시",
    needs_review: "검토 필요",
  };
  return labels[action] ?? "검토 필요";
}
