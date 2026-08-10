import { describe, expect, it } from "vitest";
import {
  CONSTRUCTION_PRODUCT_KINDS,
  buildCanonicalConstructionCatalog,
  buildConstructionVariantGroupWritePayload,
  buildConstructionVariantMetadataWritePayload,
  buildConstructionVariantSubitemInsertPayload,
} from "../../constructionCatalog/constructionCatalogModel";
import {
  buildAdminTemplateValueClonePayloads,
  buildAdminTemplateValueSaveOperations,
  buildConstructionSubitemSavePayload,
  normalizeAdminItems,
  patchSubitemPriceById,
  reconcileAdminProductSelections,
  resolveAdminProductSubitem,
} from "../priceTableModel";

const itemRows = [
  {
    id: "floor-item",
    name: "바닥재",
    item_kind: "standard",
    item_type: "itemized",
    sort_order: 0,
  },
  {
    id: "finish-item",
    name: "마감재",
    item_kind: "standard",
    item_type: "itemized",
    sort_order: 1,
  },
];

const variantGroupRows = [
  {
    id: "floor-product",
    construction_item_id: "floor-item",
    display_name: "KCC장판",
    variant_kind: "두께",
    variant_value_type: "number",
    sort_order: 0,
    archived_at: null,
  },
  {
    id: "finish-product",
    construction_item_id: "finish-item",
    display_name: "사용자 브랜드 마감재",
    variant_kind: "색상",
    variant_value_type: "text",
    sort_order: 0,
    archived_at: null,
  },
];

const subitemRows = [
  {
    id: "floor-22",
    item_id: "floor-item",
    name: "표시명 B",
    unit: "평",
    unit_price: 22000,
    labor_rate_empty: 120000,
    labor_rate_occupied: 140000,
    variant_group_id: "floor-product",
    variant_value: 2.2,
    variant_value_text: null,
    variant_unit: "T",
    sort_order: 2,
  },
  {
    id: "floor-18",
    item_id: "floor-item",
    name: "표시명 A",
    unit: "평",
    unit_price: 18000,
    labor_rate_empty: 100000,
    labor_rate_occupied: 130000,
    variant_group_id: "floor-product",
    variant_value: 1.8,
    variant_value_text: null,
    variant_unit: "T",
    sort_order: 5,
  },
  {
    id: "ordinary",
    item_id: "floor-item",
    name: "강마루",
    unit: "평",
    unit_price: 43000,
    labor_rate_empty: 25000,
    labor_rate_occupied: 25000,
    variant_group_id: null,
    variant_value: null,
    variant_value_text: null,
    variant_unit: null,
    sort_order: 8,
  },
  {
    id: "finish-blue",
    item_id: "finish-item",
    name: "자유 표시명 2",
    unit: "개",
    unit_price: 42000,
    variant_group_id: "finish-product",
    variant_value: null,
    variant_value_text: "Ocean Blue",
    variant_unit: null,
    sort_order: 2,
  },
  {
    id: "finish-red",
    item_id: "finish-item",
    name: "자유 표시명 1",
    unit: "개",
    unit_price: 39000,
    variant_group_id: "finish-product",
    variant_value: null,
    variant_value_text: "빨강",
    variant_unit: null,
    sort_order: 1,
  },
];

function createCanonicalCatalog() {
  return buildCanonicalConstructionCatalog({
    itemRows,
    subitemRows,
    variantGroupRows,
  });
}

function createAdminItems(templateValueRows = []) {
  return normalizeAdminItems(
    itemRows,
    subitemRows,
    templateValueRows,
    createCanonicalCatalog()
  );
}

function getProduct(items, itemId, productId) {
  return items
    .find((item) => item.id === itemId)
    ?.products.find((product) => product.productId === productId);
}

describe("canonical PriceTable production model", () => {
  it("renders one product row and exposes only canonically ordered UUID variants", () => {
    const items = createAdminItems();
    const product = getProduct(items, "floor-item", "floor-product");

    expect(items.find((item) => item.id === "floor-item")?.products).toHaveLength(2);
    expect(product).toMatchObject({
      kind: CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP,
      displayName: "KCC장판",
      selectableSubitemIds: ["floor-18", "floor-22"],
    });
    expect(product.variants.map((variant) => ({
      value: variant.constructionSubitemId,
      label: variant.label,
    }))).toEqual([
      { value: "floor-18", label: "1.8T" },
      { value: "floor-22", label: "2.2T" },
    ]);
    expect(items.find((item) => item.id === "floor-item")?.subitems[0])
      .not.toHaveProperty("spec_options");
  });

  it("isolates price and both labor values by selected construction_subitem UUID", () => {
    let items = createAdminItems();
    const product = getProduct(items, "floor-item", "floor-product");
    let selections = reconcileAdminProductSelections(items, {
      "floor-product": "floor-18",
    });

    const variantA = resolveAdminProductSubitem(
      items.find((item) => item.id === "floor-item"),
      product,
      selections
    );
    items = patchSubitemPriceById(items, variantA.id, {
      unit_price: 18100,
      labor_rate_empty: 101000,
      labor_rate_occupied: 131000,
    });

    selections = { ...selections, "floor-product": "floor-22" };
    const variantB = resolveAdminProductSubitem(
      items.find((item) => item.id === "floor-item"),
      product,
      selections
    );
    items = patchSubitemPriceById(items, variantB.id, {
      unit_price: 22200,
      labor_rate_empty: 122000,
      labor_rate_occupied: 142000,
    });

    expect(items.find((item) => item.id === "floor-item")?.subitems.map((row) => [
      row.id,
      row.unit_price,
      row.labor_rate_empty,
      row.labor_rate_occupied,
    ])).toEqual([
      ["floor-22", 22200, 122000, 142000],
      ["floor-18", 18100, 101000, 131000],
      ["ordinary", 43000, 25000, 25000],
    ]);
  });

  it("restores each UUID's own prices and selected identity after a shuffled save and reload", () => {
    let items = createAdminItems();
    items = patchSubitemPriceById(items, "floor-18", {
      unit_price: 18100,
      labor_rate_empty: 101000,
      labor_rate_occupied: 131000,
    });
    items = patchSubitemPriceById(items, "floor-22", {
      unit_price: 22200,
      labor_rate_empty: 122000,
      labor_rate_occupied: 142000,
    });

    const savedRows = items
      .flatMap((item) => item.subitems)
      .map((subitem) => ({
        ...subitem,
        ...buildConstructionSubitemSavePayload(subitem, { includePrices: true }),
      }))
      .reverse();
    const reloaded = normalizeAdminItems(
      itemRows,
      savedRows,
      [],
      buildCanonicalConstructionCatalog({
        itemRows,
        subitemRows: savedRows,
        variantGroupRows,
      })
    );
    const product = getProduct(reloaded, "floor-item", "floor-product");
    const selections = reconcileAdminProductSelections(reloaded, {
      "floor-product": "floor-22",
    });
    const floorItem = reloaded.find((item) => item.id === "floor-item");

    expect(selections["floor-product"]).toBe("floor-22");
    expect(resolveAdminProductSubitem(floorItem, product, selections)).toMatchObject({
      id: "floor-22",
      unit_price: 22200,
      labor_rate_empty: 122000,
      labor_rate_occupied: 142000,
    });
    expect(resolveAdminProductSubitem(floorItem, product, {
      "floor-product": "floor-18",
    })).toMatchObject({
      id: "floor-18",
      unit_price: 18100,
      labor_rate_empty: 101000,
      labor_rate_occupied: 131000,
    });
  });

  it("keeps a non-variant subitem on the standard UUID path", () => {
    const items = createAdminItems();
    const item = items.find((entry) => entry.id === "floor-item");
    const product = getProduct(items, "floor-item", "ordinary");

    expect(product).toMatchObject({
      kind: CONSTRUCTION_PRODUCT_KINDS.SUBITEM,
      subitemId: "ordinary",
      selectableSubitemIds: ["ordinary"],
    });
    expect(resolveAdminProductSubitem(item, product, {})).toMatchObject({
      id: "ordinary",
      name: "강마루",
    });
  });
});

describe("canonical Template production model", () => {
  const initialTemplateValues = [
    {
      id: "template-value-18",
      template_id: "template-1",
      item_id: "floor-item",
      subitem_id: "floor-18",
      option_value: "legacy-presentational-value",
      quantity: 4,
      labor_count: 2,
      construction_days: 1,
    },
  ];

  it("isolates quantity, people, and duration through an A to B to A round-trip", () => {
    let items = createAdminItems(initialTemplateValues);
    const item = items.find((entry) => entry.id === "floor-item");
    const product = getProduct(items, "floor-item", "floor-product");
    let selections = reconcileAdminProductSelections(items, {
      "floor-product": "floor-18",
    });

    let active = resolveAdminProductSubitem(item, product, selections);
    expect(active).toMatchObject({
      id: "floor-18",
      quantity: 4,
      labor_count: 2,
      construction_days: 1,
    });
    items = patchSubitemPriceById(items, active.id, {
      quantity: "5",
      labor_count: "3",
      construction_days: "2",
    });

    selections = { ...selections, "floor-product": "floor-22" };
    active = resolveAdminProductSubitem(
      items.find((entry) => entry.id === "floor-item"),
      product,
      selections
    );
    expect(active).toMatchObject({
      id: "floor-22",
      quantity: "",
      labor_count: "",
      construction_days: "",
    });
    items = patchSubitemPriceById(items, active.id, {
      quantity: "8",
      labor_count: "4",
      construction_days: "3",
    });

    selections = { ...selections, "floor-product": "floor-18" };
    expect(resolveAdminProductSubitem(
      items.find((entry) => entry.id === "floor-item"),
      product,
      selections
    )).toMatchObject({
      id: "floor-18",
      quantity: "5",
      labor_count: "3",
      construction_days: "2",
    });
  });

  it("preserves the selected UUID and each variant value after save and reload", () => {
    let items = createAdminItems(initialTemplateValues);
    items = patchSubitemPriceById(items, "floor-18", {
      quantity: "5",
      labor_count: "3",
      construction_days: "2",
    });
    items = patchSubitemPriceById(items, "floor-22", {
      quantity: "8",
      labor_count: "4",
      construction_days: "3",
    });
    const selectionBeforeSave = { "floor-product": "floor-22" };
    const operations = buildAdminTemplateValueSaveOperations({
      templateId: "template-1",
      items,
    });

    expect(operations.find((operation) => operation.subitemId === "floor-18"))
      .toMatchObject({
        operation: "update",
        valueId: "template-value-18",
        payload: { quantity: 5, labor_count: 3, construction_days: 2 },
      });
    expect(operations.find((operation) => operation.subitemId === "floor-22"))
      .toMatchObject({
        operation: "insert",
        payload: {
          template_id: "template-1",
          subitem_id: "floor-22",
          option_value: "",
          quantity: 8,
          labor_count: 4,
          construction_days: 3,
        },
      });

    const reloadedTemplateValues = operations.map((operation, index) => ({
      id: operation.valueId ?? `inserted-${index}`,
      template_id: "template-1",
      item_id: operation.itemId,
      subitem_id: operation.subitemId,
      option_value: operation.operation === "update"
        ? initialTemplateValues[0].option_value
        : operation.payload.option_value,
      ...operation.payload,
    }));
    const reloaded = createAdminItems(reloadedTemplateValues);
    const selectionAfterReload = reconcileAdminProductSelections(
      reloaded,
      selectionBeforeSave
    );
    const product = getProduct(reloaded, "floor-item", "floor-product");
    const active = resolveAdminProductSubitem(
      reloaded.find((item) => item.id === "floor-item"),
      product,
      selectionAfterReload
    );

    expect(selectionAfterReload["floor-product"]).toBe("floor-22");
    expect(active).toMatchObject({
      id: "floor-22",
      quantity: 8,
      labor_count: 4,
      construction_days: 3,
    });
  });

  it("supports arbitrary text variants without using names or labels as identity", () => {
    const items = createAdminItems();
    const item = items.find((entry) => entry.id === "finish-item");
    const product = getProduct(items, "finish-item", "finish-product");
    const selections = reconcileAdminProductSelections(items, {
      "finish-product": "finish-blue",
    });

    expect(product.variants.map((variant) => [
      variant.constructionSubitemId,
      variant.label,
    ])).toEqual([
      ["finish-red", "빨강"],
      ["finish-blue", "Ocean Blue"],
    ]);
    expect(resolveAdminProductSubitem(item, product, selections)?.id)
      .toBe("finish-blue");
  });

  it("fails closed instead of guessing between duplicate legacy value rows", () => {
    expect(() => createAdminItems([
      ...initialTemplateValues,
      {
        ...initialTemplateValues[0],
        id: "template-value-18-duplicate",
        option_value: "another-legacy-value",
      },
    ])).toThrow(expect.objectContaining({
      code: "duplicate-template-subitem-id",
    }));
  });

  it("clones by exact subitem UUID and removes legacy option identity", () => {
    expect(buildAdminTemplateValueClonePayloads({
      templateId: "template-copy",
      values: initialTemplateValues,
    })).toEqual([{
      template_id: "template-copy",
      item_id: "floor-item",
      subitem_id: "floor-18",
      option_value: "",
      quantity: 4,
      labor_count: 2,
      construction_days: 1,
    }]);

    expect(() => buildAdminTemplateValueClonePayloads({
      templateId: "template-copy",
      values: [initialTemplateValues[0], { ...initialTemplateValues[0], id: "duplicate" }],
    })).toThrow(expect.objectContaining({
      code: "duplicate-template-subitem-id",
    }));
  });
});

describe("canonical catalog writer payloads", () => {
  it("creates explicit numeric and text metadata without flooring constants", () => {
    expect(buildConstructionVariantGroupWritePayload({
      constructionItemId: "custom-item",
      displayName: "사용자 제품",
      variantKind: "용량",
      variantValueType: "number",
      sortOrder: 4,
    })).toEqual({
      construction_item_id: "custom-item",
      display_name: "사용자 제품",
      variant_kind: "용량",
      variant_value_type: "number",
      sort_order: 4,
      archived_at: null,
    });
    expect(buildConstructionVariantMetadataWritePayload({
      variantGroupId: "custom-group",
      variantValueType: "number",
      value: "12.5",
      unit: "L",
    })).toEqual({
      variant_group_id: "custom-group",
      variant_value: 12.5,
      variant_value_text: null,
      variant_unit: "L",
      archived_at: null,
    });
    expect(buildConstructionVariantMetadataWritePayload({
      variantGroupId: "custom-group",
      variantValueType: "text",
      value: "Ocean Blue",
      unit: "",
    })).toEqual({
      variant_group_id: "custom-group",
      variant_value: null,
      variant_value_text: "Ocean Blue",
      variant_unit: null,
      archived_at: null,
    });
  });

  it("starts a newly added variant with isolated price and labor values", () => {
    expect(buildConstructionVariantSubitemInsertPayload({
      constructionItemId: "custom-item",
      variantGroupId: "custom-group",
      displayName: "사용자 제품",
      variantValueType: "text",
      value: "무광",
      unit: "",
      workUnit: "개",
      sortOrder: 3,
    })).toMatchObject({
      item_id: "custom-item",
      name: "사용자 제품 무광",
      unit: "개",
      unit_price: 0,
      labor_rate: 0,
      labor_rate_empty: 0,
      labor_rate_occupied: 0,
      variant_group_id: "custom-group",
      variant_value: null,
      variant_value_text: "무광",
      variant_unit: null,
      archived_at: null,
    });
  });
});
