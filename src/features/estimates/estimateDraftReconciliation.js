import {
  hasNumericInput,
  toNumberOrZero,
} from "../../shared/utils/numbers";
import { isEstimateHistoryCompatibilityRow } from "./estimateHistoryCompatibility";
import {
  getLegacyCompatibleSashCategory,
  getSashCategory,
} from "../sash/sashCatalogModel";

export const ESTIMATE_TEMPLATE_DERIVED_FIELDS = [
  { fieldKey: "quantity", baseKey: "baseQuantity" },
  { fieldKey: "laborCount", baseKey: "baseLaborCount" },
];

export const ESTIMATE_PRICE_SOURCE_FIELDS = [
  { fieldKey: "unitPrice", baseKey: "baseUnitPrice" },
  { fieldKey: "laborRate", baseKey: "baseLaborRate" },
];

export function getEstimateDraftRowKeys(row) {
  if (row?.itemKind === "sash" && row?.subitemId) {
    return [`sash:${row.subitemId}`];
  }
  const stableKeys = [
    row?.variantGroupId ? `variant-group:${row.variantGroupId}` : "",
    ...(row?.estimateOptions ?? []).map((option) => (
      option?.subitemId ? `subitem:${option.subitemId}` : ""
    )),
    row?.subitemId ? `subitem:${row.subitemId}` : "",
  ].filter(Boolean);
  if (!isEstimateHistoryCompatibilityRow(row)) {
    return [...new Set(stableKeys)];
  }
  return [...new Set([
    ...stableKeys,
    row?.itemId && row?.material ? `material:${row.itemId}:${row.material}` : "",
    row?.categoryId && row?.material ? `category:${row.categoryId}:${row.material}` : "",
  ].filter(Boolean))];
}

export function isEstimateDraftFieldEdited(row, fieldKey, baseKey) {
  const currentValue = row?.[fieldKey];
  const baseValue = row?.[baseKey];
  const currentText = `${currentValue ?? ""}`.trim();
  const baseText = `${baseValue ?? ""}`.trim();

  if (currentText === "" && baseText === "") return false;
  if (hasNumericInput(currentText) || hasNumericInput(baseText)) {
    return toNumberOrZero(currentText) !== toNumberOrZero(baseText);
  }
  return currentText !== baseText;
}

export function getTemplateOverrideConflictFields(previousRow, nextTemplateRow) {
  return ESTIMATE_TEMPLATE_DERIVED_FIELDS
    .filter(({ fieldKey, baseKey }) => (
      isEstimateDraftFieldEdited(previousRow, fieldKey, baseKey)
      && toNumberOrZero(previousRow?.[baseKey]) !== toNumberOrZero(nextTemplateRow?.[baseKey])
    ))
    .map(({ fieldKey }) => fieldKey);
}

export function reconcileEstimateDraftItems({
  nextItems,
  previousItems,
  applyRowPatch = (row, patch) => ({ ...row, ...patch }),
  recalculateRow = (row) => row,
}) {
  const previousRowsByKey = new Map();
  const conflicts = [];
  Object.entries(previousItems ?? {}).forEach(([categoryId, rows]) => {
    (rows ?? []).forEach((row) => {
      getEstimateDraftRowKeys({ ...row, categoryId }).forEach((key) => {
        if (!previousRowsByKey.has(key)) previousRowsByKey.set(key, row);
      });
    });
  });

  const items = Object.fromEntries(
    Object.entries(nextItems ?? {}).map(([categoryId, rows]) => [
      categoryId,
      (rows ?? []).map((row) => {
        const previousRow = getEstimateDraftRowKeys({ ...row, categoryId })
          .map((key) => previousRowsByKey.get(key))
          .find(Boolean);
        if (!previousRow) return row;

        const previousOptionId = previousRow.selectedEstimateOptionId;
        const exactOption = (row.estimateOptions ?? []).find((option) => (
          (previousOptionId && option.id === previousOptionId)
          || (previousRow.subitemId && option.subitemId === previousRow.subitemId)
        ));
        const templateRow = exactOption
          ? applyRowPatch(row, { selectedEstimateOptionId: exactOption.id })
          : row;
        if (templateRow.itemKind === "sash" || previousRow.itemKind === "sash") {
          const hasSelectedSashSpec = Boolean(previousRow.sashSpec);
          return recalculateRow({
            ...templateRow,
            selected: Boolean(previousRow.selected),
            expanded: Boolean(previousRow.expanded),
            contractor: previousRow.contractor ?? "",
            sashCatalogEntryId: hasSelectedSashSpec
              ? previousRow.sashCatalogEntryId ?? ""
              : templateRow.sashCatalogEntryId ?? "",
            selectedSashCatalogEntryId: hasSelectedSashSpec
              ? previousRow.selectedSashCatalogEntryId ?? ""
              : templateRow.selectedSashCatalogEntryId ?? "",
            sashSpec: hasSelectedSashSpec ? previousRow.sashSpec : templateRow.sashSpec ?? null,
            sashUsageRanking: templateRow.sashUsageRanking ?? previousRow.sashUsageRanking ?? [],
            sashPinnedCatalogEntryId: templateRow.sashPinnedCatalogEntryId ?? "",
            sashSelectionSource: hasSelectedSashSpec
              ? previousRow.sashSelectionSource ?? "manual"
              : templateRow.sashSelectionSource,
            sashUsageCount: hasSelectedSashSpec
              ? previousRow.sashUsageCount ?? 0
              : templateRow.sashUsageCount ?? 0,
            sashLocationKind: previousRow.sashLocationKind ?? templateRow.sashLocationKind ?? null,
            sashCategory: hasSelectedSashSpec
              ? getLegacyCompatibleSashCategory(previousRow)
              : getSashCategory(templateRow),
            sashSpecialItemSelections: previousRow.sashSpecialItemSelections ?? [],
            quantity: hasSelectedSashSpec ? previousRow.quantity : templateRow.quantity,
            baseQuantity: hasSelectedSashSpec ? previousRow.baseQuantity : templateRow.baseQuantity,
            laborCount: hasSelectedSashSpec ? previousRow.laborCount : templateRow.laborCount,
            baseLaborCount: hasSelectedSashSpec ? previousRow.baseLaborCount : templateRow.baseLaborCount,
            laborRate: hasSelectedSashSpec ? previousRow.laborRate : templateRow.laborRate,
            baseLaborRate: hasSelectedSashSpec ? previousRow.baseLaborRate : templateRow.baseLaborRate,
            unitPrice: hasSelectedSashSpec ? previousRow.unitPrice : templateRow.unitPrice,
            baseUnitPrice: hasSelectedSashSpec ? previousRow.baseUnitPrice : templateRow.baseUnitPrice,
            unit: hasSelectedSashSpec ? previousRow.unit : templateRow.unit,
            hasTemplateValue: hasSelectedSashSpec,
          });
        }
        const mergedRow = {
          ...templateRow,
          selected: Boolean(previousRow.selected),
          expanded: Boolean(previousRow.expanded),
          contractor: previousRow.contractor ?? "",
          selectedSpecOption: templateRow.selectedSpecOption,
        };

        [...ESTIMATE_TEMPLATE_DERIVED_FIELDS, ...ESTIMATE_PRICE_SOURCE_FIELDS].forEach(({ fieldKey, baseKey }) => {
          if (isEstimateDraftFieldEdited(previousRow, fieldKey, baseKey)) {
            mergedRow[fieldKey] = previousRow[fieldKey];
          }
        });

        const conflictFields = getTemplateOverrideConflictFields(previousRow, templateRow);
        if (conflictFields.length) {
          conflicts.push({
            categoryId,
            rowKey: getEstimateDraftRowKeys({ ...templateRow, categoryId })[0],
            label: templateRow.displayMaterial || templateRow.material || templateRow.itemName || "시공 항목",
            fields: conflictFields,
          });
        }

        return recalculateRow(mergedRow);
      }),
    ])
  );

  return { items, conflicts };
}
