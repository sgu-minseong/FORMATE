import { describe, expect, it } from "vitest";
import {
  buildCanonicalConstructionCatalog,
  buildConstructionVariantGroupWritePayload,
  buildConstructionVariantSubitemInsertPayload,
} from "../constructionCatalogModel";
import {
  buildAdminTemplateValueAtomicWrites,
  buildConstructionSubitemSavePayload,
  normalizeAdminItems,
  patchSubitemPriceById,
  reconcileAdminProductSelections,
  resolveAdminProductSubitem,
} from "../../priceTable/priceTableModel";
import {
  applyEstimateRowPatch,
  buildEstimateItemsFromTemplate,
  getEstimateRowSpecPatchFromChoice,
} from "../../estimates/estimateItemModel";
import {
  buildEstimateItemsData,
  buildEstimateInsertPayload,
  restoreEstimateDraft,
} from "../../estimates/snapshot";
import {
  buildSelectedEstimateRows,
  calculateEstimateRow,
} from "../../estimates/calculation";
import { buildPyeongSubitemPhotoScope } from "../../photoManagement/photoModel";

const itemRows = [
  { id: "item-number", company_id: "company-a", name: "숫자 규격", item_type: "itemized", sort_order: 0 },
  { id: "item-text", company_id: "company-a", name: "문자 규격", item_type: "itemized", sort_order: 1 },
  { id: "item-standard", company_id: "company-a", name: "일반 항목", item_type: "itemized", sort_order: 2 },
];
const variantGroupRows = [
  {
    id: "product-number", construction_item_id: "item-number", display_name: "사용자 숫자 제품",
    variant_kind: "규격", variant_value_type: "number", sort_order: 0, archived_at: null,
  },
  {
    id: "product-text", construction_item_id: "item-text", display_name: "사용자 문자 제품",
    variant_kind: "색상", variant_value_type: "text", sort_order: 0, archived_at: null,
  },
];
const subitemRows = [
  {
    id: "number-a", item_id: "item-number", name: "변경 가능한 표시명 A", unit: "㎡",
    unit_price: 100, labor_rate_empty: 10, labor_rate_occupied: 15,
    variant_group_id: "product-number", variant_value: 10, variant_value_text: null,
    variant_unit: "mm", sort_order: 0, archived_at: null,
  },
  {
    id: "number-b", item_id: "item-number", name: "변경 가능한 표시명 B", unit: "㎡",
    unit_price: 200, labor_rate_empty: 20, labor_rate_occupied: 25,
    variant_group_id: "product-number", variant_value: 20, variant_value_text: null,
    variant_unit: "mm", sort_order: 1, archived_at: null,
  },
  {
    id: "text-blue", item_id: "item-text", name: "표시명과 무관 1", unit: "개",
    unit_price: 300, labor_rate_empty: 30,
    variant_group_id: "product-text", variant_value: null, variant_value_text: "Ocean Blue",
    variant_unit: null, sort_order: 1, archived_at: null,
  },
  {
    id: "text-red", item_id: "item-text", name: "표시명과 무관 2", unit: "개",
    unit_price: 250, labor_rate_empty: 25,
    variant_group_id: "product-text", variant_value: null, variant_value_text: "Red",
    variant_unit: null, sort_order: 0, archived_at: null,
  },
  {
    id: "ordinary", item_id: "item-standard", name: "일반 세부항목", unit: "개",
    unit_price: 400, labor_rate_empty: 40,
    variant_group_id: null, variant_value: null, variant_value_text: null,
    variant_unit: null, sort_order: 0, archived_at: null,
  },
];

function canonicalCatalog(rows = subitemRows, groups = variantGroupRows) {
  return buildCanonicalConstructionCatalog({ itemRows, subitemRows: rows, variantGroupRows: groups });
}

function adminItems(templateValues = [], rows = subitemRows, groups = variantGroupRows) {
  return normalizeAdminItems(itemRows, rows, templateValues, canonicalCatalog(rows, groups));
}

describe("production-like canonical cross-feature flow", () => {
  it("keeps one construction_subitem UUID through PriceTable, Template, Estimate, Photo, and reload", () => {
    let items = adminItems([
      { id: "value-a", template_id: "template", item_id: "item-number", subitem_id: "number-a", option_value: "", quantity: 2, labor_count: 1 },
      { id: "value-b", template_id: "template", item_id: "item-number", subitem_id: "number-b", option_value: "", quantity: 3, labor_count: 2 },
      { id: "value-blue", template_id: "template", item_id: "item-text", subitem_id: "text-blue", option_value: "", quantity: 1, labor_count: 1 },
      { id: "value-ordinary", template_id: "template", item_id: "item-standard", subitem_id: "ordinary", option_value: "", quantity: 1, labor_count: 0 },
    ]);

    items = patchSubitemPriceById(items, "number-a", { unit_price: "111", labor_rate_empty: "11" });
    items = patchSubitemPriceById(items, "number-b", { unit_price: "222", labor_rate_empty: "22" });
    expect(buildConstructionSubitemSavePayload(
      items[0].subitems.find((row) => row.id === "number-a"),
      { includePrices: true }
    )).toMatchObject({ unit_price: 111, labor_rate_empty: 11 });
    expect(buildConstructionSubitemSavePayload(
      items[0].subitems.find((row) => row.id === "number-b"),
      { includePrices: true }
    )).toMatchObject({ unit_price: 222, labor_rate_empty: 22 });

    items = patchSubitemPriceById(items, "number-a", { quantity: "4", labor_count: "2", construction_days: "1" });
    items = patchSubitemPriceById(items, "number-b", { quantity: "8", labor_count: "3", construction_days: "2" });
    const numberItem = items.find((item) => item.id === "item-number");
    const numberProduct = numberItem.products.find((product) => product.productId === "product-number");
    let selection = reconcileAdminProductSelections(items, { "product-number": "number-a" });
    const firstA = resolveAdminProductSubitem(numberItem, numberProduct, selection);
    selection = { ...selection, "product-number": "number-b" };
    expect(resolveAdminProductSubitem(numberItem, numberProduct, selection)).toMatchObject({
      id: "number-b", quantity: "8", labor_count: "3", construction_days: "2",
    });
    selection = { ...selection, "product-number": "number-a" };
    expect(resolveAdminProductSubitem(numberItem, numberProduct, selection)).toMatchObject({
      id: firstA.id, quantity: "4", labor_count: "2", construction_days: "1",
    });

    const writes = buildAdminTemplateValueAtomicWrites({ items });
    const persistedTemplateValues = writes.map((write, index) => ({
      id: `persisted-${index}`,
      template_id: "template",
      item_id: write.item_id,
      subitem_id: write.subitem_ref,
      option_value: "",
      quantity: write.quantity,
      labor_count: write.labor_count,
      construction_days: write.construction_days,
    }));
    const reloadedItems = adminItems(persistedTemplateValues, items.flatMap((item) => item.subitems));
    const estimateDraft = buildEstimateItemsFromTemplate(reloadedItems, 24, "empty");
    const numberEstimateRow = estimateDraft["item-number"][0];
    const selectedB = calculateEstimateRow(applyEstimateRowPatch(
      numberEstimateRow,
      getEstimateRowSpecPatchFromChoice("variant:number-b")
    ));
    expect(selectedB.subitemId).toBe("number-b");
    const estimateBackToA = applyEstimateRowPatch(
      selectedB,
      getEstimateRowSpecPatchFromChoice("variant:number-a")
    );
    expect(estimateBackToA).toMatchObject({
      subitemId: "number-a",
      quantity: 4,
      laborCount: 2,
    });
    expect(applyEstimateRowPatch(
      estimateBackToA,
      getEstimateRowSpecPatchFromChoice("variant:number-b")
    )).toMatchObject({
      subitemId: "number-b",
      quantity: 8,
      laborCount: 3,
    });

    const estimatePhotoScope = buildPyeongSubitemPhotoScope({
      pyeong: 24,
      constructionSubitemId: selectedB.subitemId,
    });

    const selectedRows = buildSelectedEstimateRows({
      items: { "item-number": [{ ...selectedB, selected: true }] },
      estimateCatalog: reloadedItems,
      fallbackCategories: [],
      conditionPyeong: 24,
      estimatePyeong: 24,
    });
    const finalTotal = selectedRows[0].totalAmount;
    const itemsData = buildEstimateItemsData({
      items: selectedRows,
      adjustments: [],
      siteMemo: "",
      estimateMeta: {},
      selectedItemsTotal: finalTotal,
      constructionDaysTotal: selectedRows[0].construction_days,
      adjustmentTotal: 0,
      finalTotal,
    });
    const saved = buildEstimateInsertPayload({
      companyId: "company-a",
      address: "",
      workDate: null,
      conditionSnapshot: { company_id: "company-a", pyeong: 24, condition_pyeong: 24 },
      itemsData,
      total: finalTotal,
    });
    const restored = restoreEstimateDraft(saved);
    const restoredRow = restored.items["item-number"][0];
    const reloadedPhotoScope = buildPyeongSubitemPhotoScope({
      pyeong: 24,
      constructionSubitemId: restoredRow.subitemId,
    });

    expect({
      priceTableId: resolveAdminProductSubitem(numberItem, numberProduct, { "product-number": "number-b" }).id,
      templateId: writes.find((write) => write.subitem_ref === "number-b").subitem_ref,
      estimateId: selectedRows[0].subitemId,
      photoId: estimatePhotoScope.construction_subitem_id,
      reloadedId: restoredRow.subitemId,
      reloadedPhotoId: reloadedPhotoScope.construction_subitem_id,
    }).toEqual({
      priceTableId: "number-b",
      templateId: "number-b",
      estimateId: "number-b",
      photoId: "number-b",
      reloadedId: "number-b",
      reloadedPhotoId: "number-b",
    });

    expect(estimateDraft["item-text"][0].estimateOptions.map((option) => option.subitemId))
      .toEqual(["text-red", "text-blue"]);
    expect(estimateDraft["item-standard"][0]).toMatchObject({ subitemId: "ordinary" });
    expect(estimateDraft["item-standard"][0]).not.toHaveProperty("variantGroupId");
  });

  it("supports arbitrary new number/text variants and removes archived variants only from active selection", () => {
    const numberGroupPayload = buildConstructionVariantGroupWritePayload({
      constructionItemId: "item-number",
      displayName: "새 숫자 제품",
      variantKind: "길이",
      variantValueType: "number",
      sortOrder: 3,
    });
    const textGroupPayload = buildConstructionVariantGroupWritePayload({
      constructionItemId: "item-text",
      displayName: "새 문자 제품",
      variantKind: "마감",
      variantValueType: "text",
      sortOrder: 3,
    });
    const newNumber = {
      id: "new-number",
      ...buildConstructionVariantSubitemInsertPayload({
        constructionItemId: "item-number",
        variantGroupId: "new-number-group",
        displayName: numberGroupPayload.display_name,
        variantValueType: "number",
        value: 37.5,
        unit: "cm",
      }),
    };
    const newText = {
      id: "new-text",
      ...buildConstructionVariantSubitemInsertPayload({
        constructionItemId: "item-text",
        variantGroupId: "new-text-group",
        displayName: textGroupPayload.display_name,
        variantValueType: "text",
        value: "사용자 자유 값",
        unit: "등급",
      }),
    };
    const groups = [
      ...variantGroupRows,
      { id: "new-number-group", ...numberGroupPayload },
      { id: "new-text-group", ...textGroupPayload },
    ];
    const created = canonicalCatalog([...subitemRows, newNumber, newText], groups);
    expect(created.products.flatMap((product) => product.selectableSubitemIds)).toEqual(expect.arrayContaining([
      "new-number",
      "new-text",
      "ordinary",
    ]));

    const archived = canonicalCatalog(
      [...subitemRows, { ...newNumber, archived_at: "2026-08-10T00:00:00.000Z" }, newText],
      groups
    );
    expect(archived.products.flatMap((product) => product.selectableSubitemIds)).not.toContain("new-number");
    expect(archived.items.find((item) => item.id === "item-number")
      .unselectableVariantGroups.map((group) => group.variantGroupId)).toContain("new-number-group");
  });
});
