import { describe, expect, it } from "vitest";
import {
  CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES,
  CONSTRUCTION_PRODUCT_KINDS,
  CONSTRUCTION_VARIANT_VALUE_TYPES,
  buildCanonicalConstructionProductModel,
  resolveCanonicalConstructionVariant,
} from "../constructionCatalogModel";

const variantGroups = [
  {
    id: "product-alpha",
    construction_item_id: "finish-item",
    display_name: "사용자 정의 제품 Alpha",
    base_subitem_id: "legacy-base",
    variant_kind: "thickness",
    sort_order: 4,
    archived_at: null,
  },
  {
    id: "product-beta",
    construction_item_id: "finish-item",
    display_name: "사용자 정의 제품 Beta",
    base_subitem_id: null,
    variant_kind: "capacity",
    sort_order: 5,
    archived_at: null,
  },
];

const subitems = [
  {
    id: "alpha-27",
    item_id: "finish-item",
    name: "표시명은 identity가 아님 C",
    variant_group_id: "product-alpha",
    variant_value: 2.7,
    variant_unit: "T",
    unit_price: 73000,
    labor_rate_empty: 180000,
    sort_order: 3,
  },
  {
    id: "legacy-base",
    item_id: "finish-item",
    name: "오염된 과거 base",
    spec_options: ["5.0T", "2.8T", "2.2T", "2.7T"],
    variant_group_id: null,
    variant_value: null,
    variant_unit: null,
    unit_price: 3005000,
    sort_order: 0,
  },
  {
    id: "alpha-18",
    item_id: "finish-item",
    name: "자유 입력 이름",
    variant_group_id: "product-alpha",
    variant_value: 1.8,
    variant_unit: "T",
    unit_price: 61000,
    labor_rate_empty: 160000,
    sort_order: 2,
  },
  {
    id: "ordinary",
    item_id: "finish-item",
    name: "독립 일반 제품",
    variant_group_id: null,
    variant_value: null,
    variant_unit: null,
    unit_price: 8000,
    sort_order: 8,
  },
  {
    id: "beta-18",
    item_id: "finish-item",
    name: "Alpha와 같은 표시값을 가진 다른 제품",
    variant_group_id: "product-beta",
    variant_value: 1.8,
    variant_unit: "T",
    unit_price: 99000,
    sort_order: 7,
  },
  {
    id: "alpha-22",
    item_id: "finish-item",
    name: "표시명은 identity가 아님 B",
    variant_group_id: "product-alpha",
    variant_value: 2.2,
    variant_unit: "T",
    unit_price: 67000,
    labor_rate_empty: 170000,
    sort_order: 6,
  },
];

describe("canonical construction Product/Variant contract", () => {
  it("projects one logical product per stable group and keeps only canonical selectable variants", () => {
    const model = buildCanonicalConstructionProductModel({ subitems, variantGroups });
    const alpha = model.products.find((product) => product.productId === "product-alpha");

    expect(model.products.map((product) => product.productId)).toEqual([
      "product-alpha",
      "product-beta",
      "ordinary",
    ]);
    expect(alpha).toMatchObject({
      id: "product-alpha",
      kind: CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP,
      variantGroupId: "product-alpha",
      baseSubitemId: "legacy-base",
      displayName: "사용자 정의 제품 Alpha",
    });
    expect(alpha.variants.map((variant) => ({
      id: variant.constructionSubitemId,
      label: variant.label,
      kind: variant.metadata.kind,
      price: variant.subitem.unit_price,
    }))).toEqual([
      { id: "alpha-18", label: "1.8T", kind: "thickness", price: 61000 },
      { id: "alpha-22", label: "2.2T", kind: "thickness", price: 67000 },
      { id: "alpha-27", label: "2.7T", kind: "thickness", price: 73000 },
    ]);
    expect(alpha.selectableSubitemIds).toEqual(["alpha-18", "alpha-22", "alpha-27"]);
    expect(model.products.some((product) => product.id === "legacy-base")).toBe(false);
    expect(model.products.find((product) => product.id === "ordinary")).toMatchObject({
      kind: CONSTRUCTION_PRODUCT_KINDS.SUBITEM,
      subitemId: "ordinary",
      selectableSubitemIds: ["ordinary"],
    });
  });

  it("resolves selection only by variant group ID and construction subitem ID", () => {
    const model = buildCanonicalConstructionProductModel({ subitems, variantGroups });

    expect(resolveCanonicalConstructionVariant(model.products, {
      variantGroupId: "product-alpha",
      constructionSubitemId: "alpha-18",
    })?.subitem.unit_price).toBe(61000);
    expect(resolveCanonicalConstructionVariant(model.products, {
      variantGroupId: "product-alpha",
      constructionSubitemId: "beta-18",
    })).toBeNull();
    expect(resolveCanonicalConstructionVariant(model.products, {
      variantGroupId: "product-beta",
      constructionSubitemId: "beta-18",
    })?.subitem.unit_price).toBe(99000);
  });

  it("supports arbitrary variant kinds and user-defined text values without name identity", () => {
    const model = buildCanonicalConstructionProductModel({
      variantGroups: [{
        id: "color-product",
        construction_item_id: "finish-item",
        display_name: "사용자 브랜드 마감재",
        variant_kind: "사용자 정의 색상",
        variant_value_type: "text",
        archived_at: null,
      }],
      subitems: [
        {
          id: "color-blue",
          item_id: "finish-item",
          name: "이 이름은 자유롭게 변경 가능 B",
          variant_group_id: "color-product",
          variant_value: null,
          variant_value_text: "Ocean Blue",
          variant_unit: null,
          unit_price: 33000,
          sort_order: 2,
        },
        {
          id: "color-red",
          item_id: "finish-item",
          name: "이 이름은 자유롭게 변경 가능 A",
          variant_group_id: "color-product",
          variant_value: null,
          variant_value_text: "빨강",
          variant_unit: null,
          unit_price: 31000,
          sort_order: 1,
        },
      ],
    });
    const product = model.products[0];

    expect(product).toMatchObject({
      productId: "color-product",
      variantKind: "사용자 정의 색상",
      variantValueType: CONSTRUCTION_VARIANT_VALUE_TYPES.TEXT,
      selectableSubitemIds: ["color-red", "color-blue"],
    });
    expect(product.variants.map((variant) => ({
      id: variant.constructionSubitemId,
      value: variant.value,
      valueType: variant.valueType,
      label: variant.label,
      price: variant.subitem.unit_price,
    }))).toEqual([
      {
        id: "color-red",
        value: "빨강",
        valueType: CONSTRUCTION_VARIANT_VALUE_TYPES.TEXT,
        label: "빨강",
        price: 31000,
      },
      {
        id: "color-blue",
        value: "Ocean Blue",
        valueType: CONSTRUCTION_VARIANT_VALUE_TYPES.TEXT,
        label: "Ocean Blue",
        price: 33000,
      },
    ]);
    expect(resolveCanonicalConstructionVariant(model.products, {
      variantGroupId: "color-product",
      constructionSubitemId: "color-blue",
    })?.subitem.unit_price).toBe(33000);
  });

  it("keeps the legacy numeric representation and accepts generic finite numeric values", () => {
    const model = buildCanonicalConstructionProductModel({
      variantGroups: [{
        id: "number-product",
        construction_item_id: "finish-item",
        display_name: "수치형 사용자 제품",
        variant_kind: "사용자 수치",
      }],
      subitems: [
        {
          id: "positive",
          item_id: "finish-item",
          variant_group_id: "number-product",
          variant_value: 1,
          variant_unit: "단계",
          sort_order: 0,
        },
        {
          id: "zero",
          item_id: "finish-item",
          variant_group_id: "number-product",
          variant_value: 0,
          variant_unit: "단계",
          sort_order: 2,
        },
        {
          id: "negative",
          item_id: "finish-item",
          variant_group_id: "number-product",
          variant_value: -1,
          variant_unit: "단계",
          sort_order: 1,
        },
      ],
    });

    expect(model.products[0].variantValueType).toBe(CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER);
    expect(model.products[0].variants.map((variant) => variant.value)).toEqual([-1, 0, 1]);
  });

  it("does not change identity or ordering when display names and source row order change", () => {
    const renamed = [...subitems]
      .reverse()
      .map((subitem) => ({ ...subitem, name: `renamed:${subitem.id}` }));
    const model = buildCanonicalConstructionProductModel({
      subitems: renamed,
      variantGroups: variantGroups.map((group) => ({
        ...group,
        display_name: `renamed:${group.id}`,
      })),
    });
    const alpha = model.variantProducts.find((product) => product.productId === "product-alpha");

    expect(model.products.map((product) => product.productId)).toEqual([
      "product-alpha",
      "product-beta",
      "ordinary",
    ]);
    expect(alpha.variants.map((variant) => variant.constructionSubitemId)).toEqual([
      "alpha-18",
      "alpha-22",
      "alpha-27",
    ]);
  });

  it("represents an empty active group without inventing a selectable variant", () => {
    const model = buildCanonicalConstructionProductModel({
      subitems: [
        subitems.find((subitem) => subitem.id === "ordinary"),
        {
          id: "new-product-base",
          item_id: "finish-item",
          name: "선택 불가능한 legacy base",
          variant_group_id: null,
          variant_value: null,
          variant_unit: null,
        },
      ],
      variantGroups: [{
        id: "new-product",
        construction_item_id: "finish-item",
        display_name: "아직 규격이 없는 새 제품",
        base_subitem_id: "new-product-base",
        variant_kind: "custom-kind",
        archived_at: null,
      }],
    });

    expect(model.unselectableVariantGroups).toEqual([
      expect.objectContaining({ id: "new-product", variantKind: "custom-kind" }),
    ]);
    expect(model.products.map((product) => product.productId)).toEqual(["ordinary"]);
    expect(model.products.some((product) => product.productId === "new-product-base")).toBe(false);
  });

  it("excludes an explicitly archived variant without changing surviving IDs", () => {
    const archived = subitems.map((subitem) => (
      subitem.id === "alpha-18"
        ? { ...subitem, archived_at: "2026-08-09T00:00:00.000Z" }
        : subitem
    ));
    const model = buildCanonicalConstructionProductModel({
      subitems: archived,
      variantGroups,
    });
    const alpha = model.variantProducts.find((product) => product.productId === "product-alpha");

    expect(alpha.selectableSubitemIds).toEqual(["alpha-22", "alpha-27"]);
    expect(alpha.archivedVariants.map((variant) => variant.constructionSubitemId)).toEqual([
      "alpha-18",
    ]);
  });

  it("does not revive a base row when its owning product group is archived", () => {
    const model = buildCanonicalConstructionProductModel({
      subitems: [
        {
          id: "archived-base",
          item_id: "finish-item",
          name: "과거 표시용 base",
          variant_group_id: null,
          variant_value: null,
          variant_unit: null,
        },
        {
          id: "archived-group-variant",
          item_id: "finish-item",
          name: "과거 선택 variant",
          variant_group_id: "archived-group",
          variant_value: 1,
          variant_unit: "U",
        },
      ],
      variantGroups: [{
        id: "archived-group",
        construction_item_id: "finish-item",
        display_name: "보관된 제품",
        base_subitem_id: "archived-base",
        variant_kind: "임의 규격",
        archived_at: "2026-08-09T00:00:00.000Z",
      }],
    });

    expect(model.products).toEqual([]);
    expect(model.archivedVariantProducts).toEqual([
      expect.objectContaining({
        productId: "archived-group",
        selectableSubitemIds: [],
      }),
    ]);
    expect(model.standardProducts.some((product) => product.id === "archived-base")).toBe(false);
  });

  it("fails closed instead of treating broken stable metadata as ordinary products", () => {
    expect(() => buildCanonicalConstructionProductModel({
      subitems: [{
        id: "missing-group-variant",
        item_id: "finish-item",
        variant_group_id: "missing-group",
        variant_value: 1.8,
        variant_unit: "T",
      }],
      variantGroups: [],
    })).toThrow(expect.objectContaining({
      code: CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.MISSING_VARIANT_GROUP,
    }));

    expect(() => buildCanonicalConstructionProductModel({
      subitems: [{
        id: "incomplete-variant",
        item_id: "finish-item",
        variant_group_id: "product-alpha",
        variant_value: 1.8,
        variant_unit: null,
      }],
      variantGroups,
    })).toThrow(expect.objectContaining({
      code: CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.INCOMPLETE_VARIANT_METADATA,
    }));
  });

  it("rejects duplicate value and normalized unit metadata within one product", () => {
    expect(() => buildCanonicalConstructionProductModel({
      subitems: [
        subitems.find((subitem) => subitem.id === "alpha-18"),
        {
          id: "alpha-18-duplicate",
          item_id: "finish-item",
          variant_group_id: "product-alpha",
          variant_value: "1.8",
          variant_unit: " t ",
        },
      ],
      variantGroups,
    })).toThrow(expect.objectContaining({
      code: CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.DUPLICATE_VARIANT_IDENTITY,
    }));
  });

  it("rejects case-insensitive duplicate text values and group representation mismatches", () => {
    const textGroup = [{
      id: "text-product",
      construction_item_id: "finish-item",
      display_name: "텍스트 제품",
      variant_kind: "마감",
      variant_value_type: "text",
    }];
    expect(() => buildCanonicalConstructionProductModel({
      variantGroups: textGroup,
      subitems: [
        {
          id: "matte-a",
          item_id: "finish-item",
          variant_group_id: "text-product",
          variant_value_text: "Matte",
        },
        {
          id: "matte-b",
          item_id: "finish-item",
          variant_group_id: "text-product",
          variant_value_text: " matte ",
        },
      ],
    })).toThrow(expect.objectContaining({
      code: CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.DUPLICATE_VARIANT_IDENTITY,
    }));

    expect(() => buildCanonicalConstructionProductModel({
      variantGroups: textGroup,
      subitems: [{
        id: "numeric-in-text-product",
        item_id: "finish-item",
        variant_group_id: "text-product",
        variant_value: 1,
        variant_unit: "T",
      }],
    })).toThrow(expect.objectContaining({
      code: CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.VARIANT_VALUE_TYPE_MISMATCH,
    }));
  });
});
