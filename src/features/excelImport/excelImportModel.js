import {
  CONSTRUCTION_PRODUCT_KINDS,
  CONSTRUCTION_VARIANT_VALUE_TYPES,
  formatConstructionSubitemVariantLabel,
  getConstructionSubitemVariantMetadata,
} from "../constructionCatalog/constructionCatalogModel";

export const EXCEL_IMPORT_TARGETS = Object.freeze({
  PRICES: "prices",
  TEMPLATES: "templates",
});

export const EXCEL_IMPORT_MODES = Object.freeze({
  ROUND_TRIP: "round_trip",
  COPY: "copy",
});

export const CROSS_COMPANY_IMPORT_NOTICE =
  "다른 업체에서 내보낸 파일입니다. 현재 업체의 항목과 다시 연결한 뒤 저장할 수 있습니다.";

export const LUMP_SUM_CATEGORY_NAME = "1식 공사";
export const LUMP_SUM_ITEM_TYPE = "flat";
export const LUMP_SUM_CALCULATION_BASIS = "parent_total";

const PORTABLE_VARIANT_FIELDS = Object.freeze({
  PRODUCT_KIND: "formate_product_kind",
  VARIANT_KIND: "formate_variant_kind",
  VALUE_TYPE: "formate_variant_value_type",
  NUMBER_VALUE: "formate_variant_value_number",
  TEXT_VALUE: "formate_variant_value_text",
  UNIT: "formate_variant_unit",
});

function normalizePortableText(value) {
  return `${value ?? ""}`.trim();
}

function normalizePortableIdentityText(value) {
  return normalizePortableText(value).toLowerCase();
}

function findCanonicalProductForSubitem(item, subitemId) {
  return (item?.canonicalAllProducts ?? item?.canonicalProducts ?? []).find((product) => (
    product.subitemId === subitemId
    || (product.allVariants ?? product.variants ?? []).some(
      (variant) => variant.constructionSubitemId === subitemId
    )
  )) ?? null;
}

function getCanonicalExcelDescriptor(item, subitem) {
  const variantMetadata = getConstructionSubitemVariantMetadata(subitem);
  if (!variantMetadata) {
    return {
      productKind: CONSTRUCTION_PRODUCT_KINDS.SUBITEM,
      variantKind: "",
      valueType: "",
      numericValue: null,
      textValue: null,
      unit: "",
    };
  }

  const product = findCanonicalProductForSubitem(item, subitem.id);
  if (
    !product
    || product.kind !== CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP
    || product.variantGroupId !== variantMetadata.groupId
    || product.variantValueType !== variantMetadata.valueType
  ) {
    throw new Error(
      "Excel variant export requires the shared canonical constructionCatalog product model."
    );
  }

  return {
    productKind: CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP,
    variantKind: product.variantKind,
    valueType: variantMetadata.valueType,
    numericValue: variantMetadata.numericValue,
    textValue: variantMetadata.textValue,
    unit: variantMetadata.unit ?? "",
  };
}

function buildCanonicalExcelColumns(item, subitem) {
  if (!subitem) {
    return {
      FORMATE_PRODUCT_KIND: "",
      FORMATE_VARIANT_KIND: "",
      FORMATE_VARIANT_VALUE_TYPE: "",
      FORMATE_VARIANT_VALUE_NUMBER: "",
      FORMATE_VARIANT_VALUE_TEXT: "",
      FORMATE_VARIANT_UNIT: "",
    };
  }
  const descriptor = getCanonicalExcelDescriptor(item, subitem);
  return {
    FORMATE_PRODUCT_KIND: descriptor.productKind,
    FORMATE_VARIANT_KIND: descriptor.variantKind,
    FORMATE_VARIANT_VALUE_TYPE: descriptor.valueType,
    FORMATE_VARIANT_VALUE_NUMBER:
      descriptor.valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER
        ? descriptor.numericValue
        : "",
    FORMATE_VARIANT_VALUE_TEXT:
      descriptor.valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.TEXT
        ? descriptor.textValue
        : "",
    FORMATE_VARIANT_UNIT: descriptor.unit,
  };
}

function formatCanonicalExcelSpec(item, subitem) {
  if (!subitem) return "";
  const descriptor = getCanonicalExcelDescriptor(item, subitem);
  if (descriptor.productKind !== CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP) return "";
  return formatConstructionSubitemVariantLabel(
    descriptor.valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER
      ? descriptor.numericValue
      : descriptor.textValue,
    descriptor.unit
  );
}

function parsePortableExcelDescriptor(row = {}) {
  const productKind = normalizePortableText(row[PORTABLE_VARIANT_FIELDS.PRODUCT_KIND]);
  const hasPortableFields = Object.values(PORTABLE_VARIANT_FIELDS).some((field) =>
    normalizePortableText(row[field]) !== ""
  );
  if (!hasPortableFields) return { present: false, valid: false, descriptor: null };

  if (productKind === CONSTRUCTION_PRODUCT_KINDS.SUBITEM) {
    return {
      present: true,
      valid: true,
      descriptor: {
        productKind,
        variantKind: "",
        valueType: "",
        numericValue: null,
        textValue: null,
        unit: "",
      },
    };
  }

  const variantKind = normalizePortableText(row[PORTABLE_VARIANT_FIELDS.VARIANT_KIND]);
  const valueType = normalizePortableText(row[PORTABLE_VARIANT_FIELDS.VALUE_TYPE]);
  const unit = normalizePortableText(row[PORTABLE_VARIANT_FIELDS.UNIT]);
  if (
    productKind !== CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP
    || !variantKind
    || !Object.values(CONSTRUCTION_VARIANT_VALUE_TYPES).includes(valueType)
  ) {
    return { present: true, valid: false, descriptor: null };
  }

  if (valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER) {
    const rawValue = normalizePortableText(row[PORTABLE_VARIANT_FIELDS.NUMBER_VALUE]);
    const numericValue = rawValue === "" ? NaN : Number(rawValue);
    if (!Number.isFinite(numericValue) || !unit) {
      return { present: true, valid: false, descriptor: null };
    }
    return {
      present: true,
      valid: true,
      descriptor: {
        productKind,
        variantKind,
        valueType,
        numericValue,
        textValue: null,
        unit,
      },
    };
  }

  const textValue = normalizePortableText(row[PORTABLE_VARIANT_FIELDS.TEXT_VALUE]);
  if (!textValue) return { present: true, valid: false, descriptor: null };
  return {
    present: true,
    valid: true,
    descriptor: {
      productKind,
      variantKind,
      valueType,
      numericValue: null,
      textValue,
      unit,
    },
  };
}

function canonicalExcelDescriptorsEqual(source, target) {
  if (!source || !target || source.productKind !== target.productKind) return false;
  if (source.productKind === CONSTRUCTION_PRODUCT_KINDS.SUBITEM) return true;
  if (
    source.variantKind !== target.variantKind
    || source.valueType !== target.valueType
    || normalizePortableIdentityText(source.unit) !== normalizePortableIdentityText(target.unit)
  ) return false;
  if (source.valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER) {
    return Number(source.numericValue) === Number(target.numericValue);
  }
  return normalizePortableIdentityText(source.textValue)
    === normalizePortableIdentityText(target.textValue);
}

export function buildCanonicalExcelCatalogItems(canonicalCatalog = {}) {
  return (canonicalCatalog.items ?? []).map((canonicalItem) => {
    const canonicalProducts = canonicalItem.products ?? [];
    const canonicalAllProducts = [
      ...(canonicalItem.variantProducts ?? []),
      ...(canonicalItem.archivedVariantProducts ?? []),
      ...(canonicalItem.unselectableVariantGroups ?? []),
      ...(canonicalItem.standardProducts ?? []),
      ...(canonicalItem.archivedStandardProducts ?? []),
    ];
    const flattenProducts = (products) => products.flatMap((product) => (
      product.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP
        ? (product.allVariants ?? product.variants ?? []).map((variant) => variant.subitem)
        : product.subitem
          ? [product.subitem]
          : []
    ));
    return {
      ...canonicalItem.item,
      canonicalProducts,
      canonicalAllProducts,
      subitems: flattenProducts(canonicalProducts).filter((subitem) => !subitem.archived_at),
      allSubitems: flattenProducts(canonicalAllProducts),
    };
  });
}

export function normalizeExcelStableKey(value) {
  return `${value ?? ""}`
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\([^)]*\)|（[^）]*）/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function isLumpSumImportRow(row = {}) {
  const unit = normalizeExcelStableKey(row.unit);
  const text = normalizeExcelStableKey([
    row.category,
    row.item_name,
    row.memo,
  ].filter(Boolean).join(" "));
  return unit === "식" || unit === "1식" || /(?:^|[^0-9])1식/.test(`${row.unit ?? ""}`) || text.includes("일식공사") || text.includes("묶음공사");
}

export function getLumpSumSourceTotal(row = {}) {
  const originalAmount = `${row.original_amount ?? ""}`.trim();
  return originalAmount || `${row.unit_price ?? ""}`.trim();
}

export function buildImportSubitemName(itemName, spec) {
  const name = `${itemName ?? ""}`.trim();
  const option = `${spec ?? ""}`.trim();
  if (!option || normalizeExcelStableKey(name).endsWith(normalizeExcelStableKey(option))) return name;
  return `${name} (${option})`;
}

export function findCatalogMatchByStableIds(catalogItems = [], row = {}) {
  const itemId = `${row.formate_item_id ?? ""}`.trim();
  const subitemId = `${row.formate_subitem_id ?? ""}`.trim();
  if (!itemId && !subitemId) return null;

  const item = catalogItems.find((candidate) =>
    candidate.id === itemId || (candidate.subitems ?? []).some((subitem) => subitem.id === subitemId)
  );
  if (!item) return null;
  const subitem = (item.subitems ?? []).find((candidate) => candidate.id === subitemId) ?? null;
  return { item, subitem };
}

function normalizeCopyMatchValue(value) {
  return `${value ?? ""}`
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[()（）]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function getCopyMatchValues(value, aliases = []) {
  return [value, ...(Array.isArray(aliases) ? aliases : [])]
    .map(normalizeCopyMatchValue)
    .filter(Boolean);
}

function getCopyMatchScore(sourceValues, targetValues) {
  let bestScore = 0;
  sourceValues.forEach((source) => {
    targetValues.forEach((target) => {
      if (source === target) bestScore = Math.max(bestScore, 1);
      else if (source.includes(target) || target.includes(source)) bestScore = Math.max(bestScore, 0.78);
    });
  });
  return bestScore;
}

export function findCatalogCopyMatch(catalogItems = [], row = {}) {
  const portable = parsePortableExcelDescriptor(row);
  const sourceCategoryValues = getCopyMatchValues(row.category, row.category_aliases);
  const sourceItemName = `${row.item_name ?? ""}`.trim();
  const sourceSpec = `${row.spec ?? ""}`.trim();
  const sourceItemValues = getCopyMatchValues(
    sourceItemName,
    [
      ...(!portable.present ? [buildImportSubitemName(sourceItemName, sourceSpec)] : []),
      ...(Array.isArray(row.item_aliases) ? row.item_aliases : []),
    ]
  );
  const sourceItemType = `${row.formate_item_type ?? ""}`.trim();
  const sourceUnit = normalizeCopyMatchValue(row.unit);

  const categoryCandidates = (catalogItems ?? []).map((item) => {
    if (sourceItemType && item.item_type && sourceItemType !== item.item_type) return null;
    const score = getCopyMatchScore(
      sourceCategoryValues,
      getCopyMatchValues(item.name, item.aliases)
    );
    return score >= 0.78 ? { item, score } : null;
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  const categoryCandidate = categoryCandidates[0] ?? null;
  const subitemPool = categoryCandidate
    ? (categoryCandidate.item.subitems ?? []).map((subitem) => ({ item: categoryCandidate.item, subitem }))
    : (catalogItems ?? []).flatMap((item) =>
      (item.subitems ?? []).map((subitem) => ({ item, subitem }))
    );
  const canonicalCandidatePool = portable.present
    ? portable.valid
      ? subitemPool.filter(({ item, subitem }) => (
          canonicalExcelDescriptorsEqual(
            portable.descriptor,
            getCanonicalExcelDescriptor(item, subitem)
          )
        ))
      : []
    : subitemPool;
  const subitemCandidates = canonicalCandidatePool.map(({ item, subitem }) => {
    let score = getCopyMatchScore(
      sourceItemValues,
      getCopyMatchValues(subitem.name, subitem.aliases)
    );
    if (score < 0.78) return null;
    const targetUnit = normalizeCopyMatchValue(subitem.unit);
    if (sourceUnit && targetUnit) score += sourceUnit === targetUnit ? 0.02 : -0.04;
    if (categoryCandidate?.item.id === item.id) score += 0.02;
    return { item, subitem, score: Math.min(1, score) };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  const subitemCandidate = subitemCandidates[0] ?? null;
  const hasAmbiguousSubitem = Boolean(
    subitemCandidate
    && subitemCandidates[1]
    && subitemCandidates[1].score === subitemCandidate.score
  );

  return {
    item: subitemCandidate?.item ?? categoryCandidate?.item ?? null,
    subitem: hasAmbiguousSubitem ? null : subitemCandidate?.subitem ?? null,
    categoryConfidence: categoryCandidate?.score ?? 0,
    subitemConfidence: hasAmbiguousSubitem ? 0 : subitemCandidate?.score ?? 0,
    matchMethod: portable.present ? "canonical_portable_copy" : "legacy_copy_heuristic",
  };
}

export function getCopyImportDefaultAction(copyMatch) {
  return copyMatch?.subitem ? "link" : "new";
}

export function createScopedExcelImportContext(currentCompanyId, metadata = {}) {
  if (!currentCompanyId) throw new Error("현재 업체 범위가 필요합니다.");
  const sourceCompanyId = `${metadata.COMPANY_ID ?? ""}`.trim();
  const isCrossCompany = Boolean(sourceCompanyId && sourceCompanyId !== currentCompanyId);
  return {
    companyId: currentCompanyId,
    sourceCompanyId,
    mode: isCrossCompany ? EXCEL_IMPORT_MODES.COPY : EXCEL_IMPORT_MODES.ROUND_TRIP,
    notice: isCrossCompany ? CROSS_COMPANY_IMPORT_NOTICE : "",
  };
}

export function prepareExcelImportRowsForCompany(rows = [], context = {}) {
  if (context?.mode !== EXCEL_IMPORT_MODES.COPY) return rows;
  return rows.map((row) => {
    const nextRow = { ...row, __formateImportMode: EXCEL_IMPORT_MODES.COPY };
    delete nextRow.formate_item_id;
    delete nextRow.formate_subitem_id;
    delete nextRow.formate_template_id;
    return nextRow;
  });
}

export function getImportReviewStatus({ row, stableMatch, categoryMatch, subitemMatch, hasConflict = false } = {}) {
  if (hasConflict) return "conflict";
  if (stableMatch?.subitem || (categoryMatch?.categoryConfidence >= 0.82 && subitemMatch?.subitemConfidence >= 0.82)) {
    return "automatic";
  }
  if (row?.category || row?.item_name) return "needs_review";
  return "unmapped";
}

export function shouldApplyExcelConflict(decision) {
  return decision === "excel";
}

export function hasExcelImportWriteTargets(rows = []) {
  return Array.isArray(rows) && rows.length > 0;
}

export function buildLumpSumExclusionPatches(rows = [], targetRow, activatesRow) {
  if (!activatesRow || !targetRow) return {};
  if (targetRow.isSplitChild) {
    return {
      [targetRow.sourceParentRowNumber]: { rowType: "ignored", action: "ignore", source: "manual" },
    };
  }
  if (targetRow.isSplitParent) {
    return Object.fromEntries(rows
      .filter((row) => row.isSplitChild && `${row.sourceParentRowNumber}` === `${targetRow.sourceRowNumber}`)
      .map((row) => [row.sourceRowNumber, { rowType: "ignored", action: "ignore", source: "manual" }]));
  }
  return {};
}

export function createScopedExcelExportRequest(companyId, target) {
  if (!companyId) throw new Error("업체 범위가 필요합니다.");
  if (!Object.values(EXCEL_IMPORT_TARGETS).includes(target)) throw new Error("내보내기 대상이 올바르지 않습니다.");
  return { companyId, target };
}

export function dedupeImportRows(rows = []) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = [
      row.formate_subitem_id,
      normalizeExcelStableKey(row.category),
      normalizeExcelStableKey(row.item_name),
      normalizeExcelStableKey(row.spec),
    ].filter(Boolean).join("|");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveLegacyExcelImportRoute(page) {
  return page === "admin-ai-setup" ? "admin-prices" : page;
}

export function readFormateWorkbookMetadata(sheets = []) {
  const sheet = sheets.find((candidate) => candidate.name === "FORMATE_META");
  if (!sheet) return {};
  return Object.fromEntries((sheet.rows ?? [])
    .filter((row) => row?.[0])
    .map((row) => [`${row[0]}`.trim(), `${row[1] ?? ""}`.trim()]));
}

export function buildPriceExportRows(catalogItems = []) {
  return catalogItems.flatMap((item) =>
    (item.subitems ?? []).map((subitem) => {
      return {
        대분류: item.name,
        세부항목: subitem.name,
        "규격 또는 옵션": formatCanonicalExcelSpec(item, subitem),
        단위: subitem.unit ?? "",
        "자재 단가": subitem.unit_price ?? 0,
        "인건비(빈집)": subitem.labor_rate_empty ?? subitem.labor_rate ?? 0,
        "인건비(살림집)": subitem.labor_rate_occupied ?? subitem.labor_rate ?? 0,
        비고: "",
        "묶음 여부": item.item_type === LUMP_SUM_ITEM_TYPE ? "1식" : "일반",
        "계산 기준": item.item_type === LUMP_SUM_ITEM_TYPE ? LUMP_SUM_CALCULATION_BASIS : "line_items",
        FORMATE_ITEM_ID: item.id,
        FORMATE_SUBITEM_ID: subitem.id,
        FORMATE_ITEM_TYPE: item.item_type ?? "itemized",
        ...buildCanonicalExcelColumns(item, subitem),
      };
    })
  );
}

export function buildTemplateExportRows(templates = [], valuesByTemplateId = {}, catalogItems = []) {
  const itemById = new Map(catalogItems.map((item) => [item.id, item]));
  const subitemById = new Map(catalogItems.flatMap((item) =>
    (item.allSubitems ?? item.subitems ?? []).map((subitem) => [subitem.id, subitem])
  ));
  return templates.flatMap((template) =>
    (valuesByTemplateId[template.id] ?? []).map((value) => {
      const item = itemById.get(value.item_id);
      const subitem = subitemById.get(value.subitem_id);
      return {
        평수: template.pyeong,
        "주택 유형": template.build_type,
        "확장 여부": template.has_extension ? "확장" : "확장 없음",
        "세부 유형": template.condition_variant ?? "",
        대분류: item?.name ?? "",
        세부항목: subitem?.name ?? "",
        규격: formatCanonicalExcelSpec(item, subitem),
        단위: subitem?.unit ?? "",
        수량: value.quantity ?? "",
        인원: value.labor_count ?? "",
        공사기간: value.construction_days ?? 0,
        FORMATE_TEMPLATE_ID: template.id,
        FORMATE_ITEM_ID: value.item_id,
        FORMATE_SUBITEM_ID: value.subitem_id,
        ...buildCanonicalExcelColumns(item, subitem),
      };
    })
  );
}

export function makeExcelExportFileName(companyName, target, date = new Date()) {
  const safeCompany = `${companyName || "FORMATE"}`
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");
  const kind = target === EXCEL_IMPORT_TARGETS.TEMPLATES ? "기본견적설정" : "단가표";
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `${safeCompany || "FORMATE"}_${kind}_${datePart}.xlsx`;
}
