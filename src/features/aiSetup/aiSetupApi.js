import { getCurrentAccessToken } from "../../app/authApi";

export function buildAiRecommendationRequest({
  catalogItems,
  matchRows,
  overrides,
  mappings,
  condition,
  conditionLabel,
}) {
  const existingCategories = catalogItems.map((item) => ({ id: item.id, name: item.name }));
  const existingSubitems = catalogItems.flatMap((item) =>
    (item.subitems ?? []).map((subitem) => ({
      id: subitem.id,
      item_id: subitem.item_id,
      categoryId: item.id,
      categoryName: item.name,
      name: subitem.name,
      unit: subitem.unit,
    }))
  );
  const rows = matchRows.filter((row) => !row.isSplitChild).slice(0, 50).map((row) => {
    const override = overrides[row.sourceRowNumber] ?? {};
    return {
      rowIndex: row.sourceRowNumber,
      category: row.category ?? row.sourceCategory ?? "",
      item_name: row.item_name ?? row.sourceItemName ?? "",
      spec: row.spec ?? "",
      unit: row.unit ?? "",
      quantity: row.quantity ?? "",
      unit_price: row.unit_price ?? "",
      labor_rate: row.labor_rate ?? "",
      labor_count: row.labor_count ?? "",
      original_amount: row.original_amount ?? "",
      memo: row.memo ?? "",
      rowType: override.rowType ?? row.rowType,
      action: override.action ?? row.action,
      matchedCategoryId: row.selectedCategoryId,
      matchedCategoryName: row.selectedCategoryName,
      matchedSubitemId: row.selectedSubitemId,
      matchedSubitemName: row.selectedSubitemName,
    };
  });
  return {
    rows,
    currentMappings: mappings,
    existingCategories,
    existingSubitems,
    condition: { ...condition, label: conditionLabel },
  };
}

export async function requestAiRecommendations(payload) {
  const accessToken = await getCurrentAccessToken();
  if (!accessToken) throw new Error("AI 분석을 사용하려면 다시 로그인해 주세요.");
  const response = await fetch("/api/analyze-excel-import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || "AI 매칭 추천에 실패했습니다.");
  return result;
}
