import {
  hasNumericInput,
  toNumberOrZero,
} from "../../shared/utils/numbers";

export const ESTIMATE_TEMPLATE_DERIVED_FIELDS = [
  { fieldKey: "quantity", baseKey: "baseQuantity" },
  { fieldKey: "laborCount", baseKey: "baseLaborCount" },
];

export const ESTIMATE_PRICE_SOURCE_FIELDS = [
  { fieldKey: "unitPrice", baseKey: "baseUnitPrice" },
  { fieldKey: "laborRate", baseKey: "baseLaborRate" },
];

export function getEstimateDraftRowKeys(row) {
  return [
    row?.subitemId ? `subitem:${row.subitemId}` : "",
    row?.itemId && row?.material ? `material:${row.itemId}:${row.material}` : "",
    row?.categoryId && row?.material ? `category:${row.categoryId}:${row.material}` : "",
  ].filter(Boolean);
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

        const canKeepThickness =
          previousRow.selectedThickness
          && (row.thicknessOptions ?? []).some((option) => option.thickness === previousRow.selectedThickness);
        const templateRow = canKeepThickness
          ? applyRowPatch(row, { selectedThickness: previousRow.selectedThickness })
          : row;
        const canKeepSpecOption =
          previousRow.selectedSpecOption
          && (templateRow.specOptions ?? []).includes(previousRow.selectedSpecOption);
        const mergedRow = {
          ...templateRow,
          selected: Boolean(previousRow.selected),
          expanded: Boolean(previousRow.expanded),
          contractor: previousRow.contractor ?? "",
          selectedSpecOption: canKeepSpecOption ? previousRow.selectedSpecOption : templateRow.selectedSpecOption,
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
