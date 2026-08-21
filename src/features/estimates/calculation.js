import {
  hasNumericInput,
  toNonNegativeNumberOrZero,
  toNumberOrZero,
} from "../../shared/utils/numbers";
import {
  buildSashSpecialItemSelectionsSnapshot,
  getSashSpecialItemSelectionsAmount,
} from "../sash/sashSpecialItemModel";
import { isSashEstimateSpecPricingConfirmed } from "../sash/sashCatalogModel";

export function getLaborRateForResidence(subitem, residenceStatus) {
  const isOccupied = residenceStatus === "occupied" || residenceStatus === "살림집";
  const preferredValue = isOccupied ? subitem?.labor_rate_occupied : subitem?.labor_rate_empty;
  if (hasNumericInput(preferredValue)) return toNonNegativeNumberOrZero(preferredValue);
  if (hasNumericInput(subitem?.labor_rate)) return toNonNegativeNumberOrZero(subitem.labor_rate);
  return 0;
}

export function toConstructionDays(value) {
  const numberValue = Number(`${value ?? ""}`.replaceAll(",", ""));
  return Number.isFinite(numberValue) && numberValue > 0 ? Math.trunc(numberValue) : 0;
}

export function calculateEstimateRow(row) {
  const quantity = toNumberOrZero(row?.quantity);
  const laborCount = toNumberOrZero(row?.laborCount ?? row?.labor_count);
  const unitPrice = toNonNegativeNumberOrZero(row?.unitPrice ?? row?.unit_price);
  const laborRate = toNonNegativeNumberOrZero(row?.laborRate ?? row?.labor_rate);
  const sashSpecialItemsAmount = row?.itemKind === "sash"
    ? getSashSpecialItemSelectionsAmount(
        row?.sashSpecialItemSelections,
        row?.sashLocationKind
      )
    : 0;
  const sashPricingConfirmed = row?.itemKind === "sash"
    ? isSashEstimateSpecPricingConfirmed(row?.sashSpec)
    : true;
  const sashBaseAmount = row?.itemKind === "sash" && !sashPricingConfirmed
    ? null
    : quantity * unitPrice;
  const productAmount = row?.itemKind === "sash" && !sashPricingConfirmed
    ? null
    : sashBaseAmount + sashSpecialItemsAmount;
  const laborAmount = laborCount * laborRate;

  return {
    ...row,
    ...(row?.itemKind === "sash" ? {
      sashSpecialItemsAmount,
      sashPricingConfirmed,
      sashBaseAmount,
    } : {}),
    productAmount,
    laborAmount,
    totalAmount: productAmount === null ? null : productAmount + laborAmount,
  };
}

export function getAdjustmentAmount(adjustment) {
  return toNumberOrZero(adjustment?.amount);
}

export function getAdjustmentSignedAmount(adjustment) {
  const amount = getAdjustmentAmount(adjustment);
  return adjustment?.type === "discount" ? -amount : amount;
}

export function cleanEstimateAdjustments(adjustments, createId = () => "") {
  return (adjustments ?? [])
    .filter((adjustment) =>
      `${adjustment?.label ?? ""}`.trim()
      || `${adjustment?.memo ?? ""}`.trim()
      || toNumberOrZero(adjustment?.amount) !== 0
    )
    .map((adjustment) => ({
      id: adjustment.id ?? createId(),
      label: `${adjustment.label ?? ""}`.trim(),
      type: adjustment.type === "discount" ? "discount" : "charge",
      amount: getAdjustmentAmount(adjustment),
      visibleToCustomer: Boolean(adjustment.visibleToCustomer),
      memo: `${adjustment.memo ?? ""}`.trim(),
    }));
}

export function calculateEstimateTotals(rows, adjustments = []) {
  const selectedItemsTotal = (rows ?? []).reduce(
    (sum, row) => sum + toNumberOrZero(row?.price ?? row?.totalAmount),
    0
  );
  const adjustmentTotal = (adjustments ?? []).reduce(
    (sum, adjustment) => sum + getAdjustmentSignedAmount(adjustment),
    0
  );
  return {
    selectedItemsTotal,
    adjustmentTotal,
    finalTotal: Math.max(0, selectedItemsTotal + adjustmentTotal),
  };
}

export function buildEstimateSummary(rows, adjustments = []) {
  const totals = calculateEstimateTotals(rows, adjustments);
  const constructionDaysTotal = (rows ?? []).reduce(
    (sum, row) => sum + toConstructionDays(row?.construction_days),
    0
  );
  const constructionDayParts = Object.entries(
    (rows ?? []).reduce((groups, row) => {
      const days = toConstructionDays(row?.construction_days);
      if (!days) return groups;
      const categoryName = row?.categoryName || "시공 항목";
      groups[categoryName] = (groups[categoryName] ?? 0) + days;
      return groups;
    }, {})
  ).map(([categoryName, days]) => `${categoryName} ${days}일`);
  const rowsByCategory = (rows ?? []).reduce((groups, row) => {
    const key = row?.categoryName || "시공 항목";
    groups[key] = groups[key] ?? [];
    groups[key].push(row);
    return groups;
  }, {});
  return {
    ...totals,
    constructionDaysTotal,
    constructionDayParts,
    rowsByCategory,
    customerVisibleAdjustments: (adjustments ?? []).filter(
      (adjustment) => adjustment.visibleToCustomer
    ),
  };
}

export function buildSelectedEstimateRows({
  items,
  estimateCatalog,
  fallbackCategories,
  conditionPyeong,
  estimatePyeong,
  getSpecLabel = () => "",
}) {
  return Object.entries(items ?? {}).flatMap(([categoryId, rows]) => {
    const catalogItem = (estimateCatalog ?? []).find((entry) => entry.id === categoryId);
    const fallbackCategory = (fallbackCategories ?? []).find((entry) => entry.id === categoryId);
    return (rows ?? [])
      .filter((row) => row.selected)
      .map((row) => {
        const calculated = calculateEstimateRow(row);
        const quantity = toNumberOrZero(row?.quantity);
        const laborCount = toNumberOrZero(row?.laborCount ?? row?.labor_count);
        const unitPrice = toNonNegativeNumberOrZero(row?.unitPrice ?? row?.unit_price);
        const laborRate = toNonNegativeNumberOrZero(row?.laborRate ?? row?.labor_rate);
        return {
          categoryId,
          itemId: row.itemId ?? categoryId,
          categoryName: row.itemName ?? catalogItem?.name ?? fallbackCategory?.name ?? categoryId,
          itemType: row.itemType ?? catalogItem?.item_type ?? "itemized",
          itemKind: row.itemKind ?? catalogItem?.item_kind ?? "standard",
          subitemId: row.subitemId,
          material: row.displayMaterial ?? row.material,
          sashCatalogEntryId: row.sashCatalogEntryId ?? "",
          sashSpec: row.sashSpec ?? null,
          ...((row.itemKind ?? catalogItem?.item_kind) === "sash" ? {
            sashLocationKind: row.sashLocationKind ?? null,
            sashSpecialItemSelections: buildSashSpecialItemSelectionsSnapshot(
              row.sashSpecialItemSelections,
              row.sashLocationKind
            ),
            sashSpecialItemsAmount: calculated.sashSpecialItemsAmount ?? 0,
          } : {}),
          selectedThickness: row.selectedThickness ?? null,
          selectedSpecOption: row.selectedSpecOption ?? "",
          spec: getSpecLabel(row),
          pyeong: toNumberOrZero(row.pyeong ?? conditionPyeong),
          conditionPyeong: toNumberOrZero(conditionPyeong),
          estimatePyeong: toNumberOrZero(estimatePyeong || conditionPyeong),
          quantity,
          laborCount,
          construction_days: toConstructionDays(row.constructionDays ?? row.construction_days),
          unit: row.unit ?? "평",
          unitPrice,
          laborRate,
          contractor: row.contractor ?? "",
          baseQuantity: toNumberOrZero(row.baseQuantity),
          baseUnitPrice: toNonNegativeNumberOrZero(row.baseUnitPrice),
          baseLaborCount: toNumberOrZero(row.baseLaborCount),
          baseLaborRate: toNonNegativeNumberOrZero(row.baseLaborRate),
          modified: isEstimateRowModified(row),
          productAmount: calculated.productAmount,
          laborAmount: calculated.laborAmount,
          totalAmount: calculated.totalAmount,
          price: calculated.totalAmount,
        };
      });
  });
}

export function getTemporaryTaxAmount(amount) {
  return Math.round(toNumberOrZero(amount) * 0.1);
}

export function getEstimateItemsDataItems(itemsData) {
  if (Array.isArray(itemsData)) return itemsData;
  if (Array.isArray(itemsData?.items)) return itemsData.items;
  return [];
}

export function getEstimateItemsDataAdjustments(itemsData) {
  return Array.isArray(itemsData?.adjustments) ? itemsData.adjustments : [];
}

export function getEstimateItemsDataSiteMemo(itemsData) {
  return `${itemsData?.siteMemo ?? ""}`;
}

export function getEstimateItemsDataMeta(itemsData) {
  return itemsData?.estimateMeta && typeof itemsData.estimateMeta === "object"
    ? itemsData.estimateMeta
    : {};
}

export function getEstimateItemsDataConstructionDaysTotal(itemsData) {
  if (itemsData && typeof itemsData === "object" && !Array.isArray(itemsData)) {
    if (Object.prototype.hasOwnProperty.call(itemsData, "constructionDaysTotal")) {
      return toConstructionDays(itemsData.constructionDaysTotal);
    }
    if (Object.prototype.hasOwnProperty.call(itemsData, "construction_days_total")) {
      return toConstructionDays(itemsData.construction_days_total);
    }
  }
  return getEstimateItemsDataItems(itemsData).reduce(
    (sum, item) => sum + toConstructionDays(item?.construction_days ?? item?.constructionDays),
    0
  );
}

export function isEstimateRowModified(row) {
  if (!row) return false;
  return (
    toNumberOrZero(row.baseQuantity) !== toNumberOrZero(row.quantity)
    || toNumberOrZero(row.baseUnitPrice) !== toNumberOrZero(row.unitPrice ?? row.unit_price)
    || toNumberOrZero(row.baseLaborCount) !== toNumberOrZero(row.laborCount)
    || toNumberOrZero(row.baseLaborRate) !== toNumberOrZero(row.laborRate)
  );
}
