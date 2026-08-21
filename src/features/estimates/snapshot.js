import {
  EXTENDED_VARIANTS,
  OLD_EXTENDED_VARIANTS,
  OLD_NO_EXTENSION_VARIANT,
} from "../../shared/constants/conditionVariants";
import {
  toNonNegativeNumberOrZero,
  toNumberOrZero,
} from "../../shared/utils/numbers";
import {
  getEstimateItemsDataAdjustments,
  getEstimateItemsDataItems,
  getEstimateItemsDataMeta,
  getEstimateItemsDataSiteMemo,
  toConstructionDays,
} from "./calculation";
import {
  ESTIMATE_HISTORY_COMPATIBILITY_KIND,
  normalizeLegacyEstimateSpecOptions,
} from "./estimateHistoryCompatibility";
import { buildSashSpecialItemSelectionsSnapshot } from "../sash/sashSpecialItemModel";
import { getLegacyCompatibleSashCategory } from "../sash/sashCatalogModel";

function isExtendedHouseType(value) {
  return value === "new"
    || value === "신축"
    || value === "확장형"
    || EXTENDED_VARIANTS.includes(value);
}

function normalizeConditionVariant(buildType, hasExtension, variant) {
  if (isExtendedHouseType(buildType)) {
    if (EXTENDED_VARIANTS.includes(variant)) return variant;
    if (EXTENDED_VARIANTS.includes(buildType)) return buildType;
    return "확장형1";
  }
  if (!hasExtension) return OLD_NO_EXTENSION_VARIANT;
  if (OLD_EXTENDED_VARIANTS.includes(variant)) return variant;
  if (OLD_EXTENDED_VARIANTS.includes(buildType)) return buildType;
  return "구형1";
}

export function getConditionVariant(condition) {
  return normalizeConditionVariant(
    condition?.buildType,
    Boolean(condition?.expanded),
    condition?.conditionVariant
  );
}

export function buildTemplateCondition({
  pyeong,
  buildType,
  hasExtension = false,
  conditionVariant = "",
}) {
  const extended = isExtendedHouseType(buildType);
  const expanded = extended ? false : Boolean(hasExtension);
  const variant = normalizeConditionVariant(buildType, expanded, conditionVariant);
  return {
    pyeong: Number(pyeong),
    build_type: extended ? "확장형" : "구형",
    has_extension: extended ? false : variant !== OLD_NO_EXTENSION_VARIANT,
    condition_variant: variant,
  };
}

export function toDbCondition(condition, companyId) {
  const isExtended = isExtendedHouseType(condition.buildType);
  const conditionVariant = getConditionVariant(condition);
  return {
    company_id: companyId,
    pyeong: toNumberOrZero(condition.size),
    build_type: isExtended ? "확장형" : "구형",
    condition_variant: conditionVariant,
    powder_room: null,
    dress_room: null,
    has_extension: isExtended ? false : conditionVariant !== OLD_NO_EXTENSION_VARIANT,
    extension_areas: null,
    occupancy_type: condition.occupancy === "empty" ? "빈집" : "살림집",
  };
}

export function buildConditionSnapshot({
  condition,
  companyId,
  summary,
  estimatePyeong,
  conditionVariantLabel,
  conditionVariantLabelOverrides,
}) {
  return {
    ...toDbCondition(condition, companyId),
    summary,
    condition_pyeong: toNumberOrZero(condition.size),
    estimate_pyeong: toNumberOrZero(estimatePyeong || condition.size),
    condition_variant_label: conditionVariantLabel,
    condition_variant_display_label: conditionVariantLabel,
    condition_variant_label_overrides: conditionVariantLabelOverrides,
  };
}

export function buildEstimateItemsData({
  items,
  adjustments,
  siteMemo,
  estimateMeta,
  selectedItemsTotal,
  constructionDaysTotal,
  adjustmentTotal,
  finalTotal,
}) {
  return {
    items,
    adjustments,
    siteMemo: `${siteMemo ?? ""}`.trim(),
    estimateMeta,
    selectedItemsTotal,
    constructionDaysTotal,
    adjustmentTotal,
    finalTotal,
  };
}

export function buildEstimateInsertPayload({
  companyId,
  address,
  workDate,
  conditionSnapshot,
  itemsData,
  total,
}) {
  return {
    company_id: companyId,
    address,
    construction_date: workDate || null,
    condition_id: null,
    condition_snapshot: conditionSnapshot,
    items_data: itemsData,
    total_amount: total,
  };
}

export function restoreEstimateDraft(estimate) {
  const savedItems = getEstimateItemsDataItems(estimate?.items_data);
  const snapshot = estimate?.condition_snapshot ?? {};
  const groupedItems = {};
  const catalogGroups = [];

  savedItems.forEach((item, index) => {
    const categoryName = item.categoryName ?? item.category ?? item.itemName ?? "시공 항목";
    const categoryId = item.categoryId ?? item.itemId ?? `saved-item-${index}`;
    if (!groupedItems[categoryId]) {
      groupedItems[categoryId] = [];
      catalogGroups.push({
        id: categoryId,
        name: categoryName,
        item_type: item.itemType ?? "itemized",
        item_kind: item.itemKind ?? "standard",
        subitems: [],
      });
    }
    groupedItems[categoryId].push({
      estimateHistoryCompatibility: ESTIMATE_HISTORY_COMPATIBILITY_KIND,
      itemId: item.itemId ?? categoryId,
      itemName: categoryName,
      itemType: item.itemType ?? "itemized",
      itemKind: item.itemKind ?? "standard",
      subitemId: item.subitemId ?? `${categoryId}-${index}`,
      material: item.material ?? item.name ?? item.description ?? "소재",
      sashCatalogEntryId: item.sashCatalogEntryId ?? "",
      selectedSashCatalogEntryId: item.sashCatalogEntryId ?? "",
      sashSpec: item.sashSpec ?? null,
      sashCategory: getLegacyCompatibleSashCategory(item),
      sashLocationKind: item.sashLocationKind ?? item.sash_location_kind ?? null,
      sashSpecialItemSelections: buildSashSpecialItemSelectionsSnapshot(
        item.sashSpecialItemSelections,
        item
      ),
      displayMaterial: item.material ?? item.name ?? item.description ?? "소재",
      selectedThickness: item.selectedThickness ?? null,
      selectedSpecOption: item.selectedSpecOption ?? "",
      spec: item.spec ?? "",
      specOptions: normalizeLegacyEstimateSpecOptions(item.specOptions),
      unit: item.unit ?? "평",
      pyeong: toNumberOrZero(item.pyeong ?? snapshot.estimate_pyeong ?? snapshot.condition_pyeong),
      baseQuantity: item.baseQuantity ?? item.quantity ?? "",
      baseUnitPrice: toNonNegativeNumberOrZero(item.baseUnitPrice ?? item.unitPrice ?? item.unit_price),
      baseLaborCount: item.baseLaborCount ?? item.laborCount ?? item.labor_count ?? "",
      baseLaborRate: toNonNegativeNumberOrZero(item.baseLaborRate ?? item.laborRate ?? item.labor_rate),
      quantity: item.quantity ?? "",
      laborCount: item.laborCount ?? item.labor_count ?? "",
      constructionDays: toConstructionDays(item.construction_days ?? item.constructionDays),
      unitPrice: toNonNegativeNumberOrZero(item.unitPrice ?? item.unit_price),
      laborRate: toNonNegativeNumberOrZero(item.laborRate ?? item.labor_rate),
      contractor: item.contractor ?? item.vendor ?? item.worker ?? "",
      productAmount: toNumberOrZero(item.productAmount),
      laborAmount: toNumberOrZero(item.laborAmount),
      totalAmount: toNumberOrZero(item.totalAmount ?? item.price ?? item.amount),
      hasTemplateValue: true,
      expanded: false,
      selected: true,
    });
  });

  const restoredTemplateCondition = buildTemplateCondition({
    pyeong: snapshot.condition_pyeong ?? snapshot.pyeong,
    buildType: snapshot.condition_variant || snapshot.build_type,
    hasExtension: snapshot.has_extension,
    conditionVariant: snapshot.condition_variant,
  });
  const restoredBuildType = restoredTemplateCondition.condition_variant.startsWith("확장형")
    ? "new"
    : "old";
  const meta = getEstimateItemsDataMeta(estimate?.items_data);

  return {
    condition: {
      size: `${snapshot.condition_pyeong ?? snapshot.pyeong ?? ""}`,
      buildType: restoredBuildType,
      powderRoom: false,
      dressRoom: false,
      expanded: restoredBuildType === "old" ? restoredTemplateCondition.has_extension : false,
      conditionVariant: restoredTemplateCondition.condition_variant,
      expansionSpaces: [],
      occupancy: snapshot.occupancy_type === "빈집"
        ? "empty"
        : snapshot.occupancy_type === "살림집"
          ? "occupied"
          : "",
    },
    items: groupedItems,
    catalog: catalogGroups,
    adjustments: getEstimateItemsDataAdjustments(estimate?.items_data),
    siteMemo: getEstimateItemsDataSiteMemo(estimate?.items_data),
    meta,
    estimatePyeong: `${snapshot.estimate_pyeong ?? snapshot.condition_pyeong ?? snapshot.pyeong ?? ""}`,
  };
}
