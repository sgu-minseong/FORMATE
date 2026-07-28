import {
  hasNumericInput,
  toNonNegativeNumberOrZero,
  toNumberOrZero,
} from "../../shared/utils/numbers";

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
  const productAmount = quantity * unitPrice;
  const laborAmount = laborCount * laborRate;

  return {
    ...row,
    quantity,
    laborCount,
    unitPrice,
    laborRate,
    productAmount,
    laborAmount,
    totalAmount: productAmount + laborAmount,
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
