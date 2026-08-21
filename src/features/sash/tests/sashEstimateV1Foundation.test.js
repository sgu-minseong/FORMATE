import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildSashCatalogEntryPayload,
  buildSashEstimateSelectionPatch,
  getSashBillableArea,
  getSashCatalogEntryAmount,
  getSashCatalogEntryValidationError,
  SASH_LOCATION_KINDS,
  SASH_MEASUREMENT_KINDS,
  SASH_PRICING_BASES,
  SASH_WINDOW_TYPES,
} from "../sashCatalogModel";
import {
  buildSashSpecialItemPayload,
  buildSashSpecialItemSelection,
  buildSashSpecialItemSelectionsSnapshot,
  getSashSpecialItemSelectionsAmount,
} from "../sashSpecialItemModel";
import {
  buildSelectedEstimateRows,
  calculateEstimateRow,
} from "../../estimates/calculation";
import { restoreEstimateDraft } from "../../estimates/snapshot";

const migrationSource = readFileSync(
  new URL("../../../../supabase/sash_estimate_v1_foundation.sql", import.meta.url),
  "utf8"
);
const freshFoundationSource = readFileSync(
  new URL("../../../../supabase/sash_catalog_foundation.sql", import.meta.url),
  "utf8"
);
const specialItemApiSource = readFileSync(
  new URL("../sashSpecialItemApi.js", import.meta.url),
  "utf8"
);

const areaPricedEntry = {
  id: "sash-entry-v1",
  construction_subitem_id: "balcony-subitem",
  brand: "KCC",
  product_type: "legacy-frame-label",
  frame_spec: "140mm 틀",
  pair_spec: "24mm 페어",
  glass_spec: "로이유리",
  gas_spec: "아르곤",
  screen_spec: "미세방충망",
  window_type: SASH_WINDOW_TYPES.DOUBLE,
  measurement_kind: SASH_MEASUREMENT_KINDS.ESTIMATE,
  pricing_basis: SASH_PRICING_BASES.AREA,
  width_mm: 4000,
  height_mm: 2400,
  unit_price: 100000,
  cost_price: 0,
  sort_order: 0,
};

const canonicalSpecialItem = {
  id: "special-item-a",
  company_id: "company-a",
  description: "철거·폐기",
  width_mm: 2000,
  height_mm: 1000,
  area_sqm: 2,
  amount: 150000,
  sort_order: 0,
};

describe("sash estimate v1 migration contract", () => {
  it("is additive and leaves legacy rows unclassified with fixed pricing", () => {
    expect(migrationSource).toContain("add column if not exists sash_location_kind text");
    expect(migrationSource).toContain("add column if not exists frame_spec text");
    expect(migrationSource).toContain("add column if not exists billable_area_sqm");
    expect(migrationSource).toContain("add column if not exists calculated_amount");
    expect(migrationSource).toContain("pricing_basis text not null default 'fixed'");
    expect(migrationSource).toContain("window_type text not null default 'unspecified'");
    expect(migrationSource).toContain("measurement_kind text not null default 'unspecified'");
    expect(migrationSource).toContain("create table if not exists public.sash_special_items");
    expect(migrationSource).toContain("constraint sash_special_items_amount_check");
    expect(migrationSource).not.toContain("entry_kind");
    expect(migrationSource).not.toMatch(/update\s+public\./i);
    expect(migrationSource).not.toMatch(/delete\s+from/i);
    expect(migrationSource).not.toMatch(/truncate\s+/i);
  });

  it("keeps reusable special items in their own company-scoped CRUD path", () => {
    expect(specialItemApiSource).toContain('.from("sash_special_items")');
    expect(specialItemApiSource).toContain("fetchActiveSashSpecialItems");
    expect(specialItemApiSource).toContain("insertSashSpecialItem");
    expect(specialItemApiSource).toContain("updateSashSpecialItem");
    expect(specialItemApiSource).toContain("archiveSashSpecialItem");
    expect(specialItemApiSource).toContain('.eq("company_id", companyId)');
  });

  it("encodes only the confirmed single/double hebe and user-price formulas", () => {
    [migrationSource, freshFoundationSource].forEach((source) => {
      expect(source).toContain("case when window_type = 'double' then 2 else 1 end");
      expect(source).toContain("when pricing_basis = 'area' then");
      expect(source).toContain(") * unit_price");
      expect(source).not.toMatch(/bf|sf|bom|crew/i);
    });
  });
});

describe("sash estimate v1 domain contract", () => {
  it("uses one opening area for single windows and twice the area for double windows", () => {
    expect(getSashBillableArea({
      ...areaPricedEntry,
      window_type: SASH_WINDOW_TYPES.SINGLE,
    })).toBe(9.6);
    expect(getSashBillableArea(areaPricedEntry)).toBe(19.2);
    expect(getSashBillableArea({
      ...areaPricedEntry,
      width_mm: 1001,
      height_mm: 333,
    })).toBe(0.6667);
    expect(getSashCatalogEntryAmount(areaPricedEntry)).toBe(1920000);
  });

  it("keeps legacy fixed-price entries on the existing one-set calculation", () => {
    const patch = buildSashEstimateSelectionPatch({
      id: "legacy-sash-entry",
      brand: "LG",
      product_type: "기존 제품 구분",
      width_mm: 4000,
      height_mm: 2400,
      unit_price: 1200000,
    });

    expect(patch).toMatchObject({
      quantity: 1,
      unit: "식",
      unitPrice: 1200000,
      sashSpec: {
        sash_spec_version: 1,
        pricing_basis: SASH_PRICING_BASES.FIXED,
        window_type: SASH_WINDOW_TYPES.UNSPECIFIED,
        measurement_kind: SASH_MEASUREMENT_KINDS.UNSPECIFIED,
        calculated_amount: 1200000,
      },
    });
  });

  it("persists explicit v1 attributes but never writes generated values", () => {
    expect(getSashCatalogEntryValidationError(areaPricedEntry)).toBe("");
    const payload = buildSashCatalogEntryPayload(areaPricedEntry, { companyId: "company-a" });

    expect(payload).toMatchObject({
      company_id: "company-a",
      construction_subitem_id: "balcony-subitem",
      brand: "KCC",
      frame_spec: "140mm 틀",
      pair_spec: "24mm 페어",
      glass_spec: "로이유리",
      gas_spec: "아르곤",
      screen_spec: "미세방충망",
      window_type: SASH_WINDOW_TYPES.DOUBLE,
      measurement_kind: SASH_MEASUREMENT_KINDS.ESTIMATE,
      pricing_basis: SASH_PRICING_BASES.AREA,
      unit_price: 100000,
    });
    expect(payload).not.toHaveProperty("area_sqm");
    expect(payload).not.toHaveProperty("billable_area_sqm");
    expect(payload).not.toHaveProperty("calculated_amount");
  });

  it("persists reusable special-item input without writing its generated area", () => {
    const payload = buildSashSpecialItemPayload(canonicalSpecialItem, {
      companyId: "company-a",
    });
    expect(payload).toEqual({
      company_id: "company-a",
      description: "철거·폐기",
      width_mm: 2000,
      height_mm: 1000,
      amount: 150000,
      sort_order: 0,
    });
    expect(payload).not.toHaveProperty("area_sqm");
  });

  it("selects canonical special-item IDs and freezes direct amounts in balcony snapshots", () => {
    const selection = buildSashSpecialItemSelection(canonicalSpecialItem);
    const secondSelection = buildSashSpecialItemSelection({
      ...canonicalSpecialItem,
      id: "special-item-b",
      description: "보강 작업",
      amount: 50000,
    });
    const balconySelections = buildSashSpecialItemSelectionsSnapshot(
      [selection, secondSelection],
      SASH_LOCATION_KINDS.BALCONY
    );

    expect(balconySelections[0]).toEqual({
      sashSpecialItemId: "special-item-a",
      sashSpecialItemSnapshot: {
        sash_special_item_snapshot_version: 1,
        sash_special_item_id: "special-item-a",
        description: "철거·폐기",
        width_mm: 2000,
        height_mm: 1000,
        area_sqm: 2,
        amount: 150000,
      },
    });
    expect(balconySelections).toHaveLength(2);
    expect(getSashSpecialItemSelectionsAmount(
      balconySelections,
      SASH_LOCATION_KINDS.BALCONY
    )).toBe(200000);
    const editedCanonicalItem = {
      ...canonicalSpecialItem,
      description: "수정된 설명",
      amount: 990000,
    };
    expect(buildSashSpecialItemSelection(editedCanonicalItem)
      .sashSpecialItemSnapshot.amount).toBe(990000);
    expect(selection.sashSpecialItemSnapshot).toMatchObject({
      description: "철거·폐기",
      amount: 150000,
    });
    expect(getSashSpecialItemSelectionsAmount([{
      ...selection,
      sashSpecialItemSnapshot: {
        ...selection.sashSpecialItemSnapshot,
        width_mm: 9000,
        height_mm: 9000,
      },
    }], SASH_LOCATION_KINDS.BALCONY)).toBe(150000);
    expect(buildSashSpecialItemSelectionsSnapshot(
      [selection],
      SASH_LOCATION_KINDS.STANDARD
    )).toEqual([]);
    expect(() => buildSashSpecialItemSelectionsSnapshot([{
      sashSpecialItemId: "special-item-a",
      sashSpecialItemSnapshot: {
        ...selection.sashSpecialItemSnapshot,
        sash_special_item_id: "different-id",
      },
    }], SASH_LOCATION_KINDS.BALCONY)).toThrow("일치해야 합니다");
    expect(() => buildSashSpecialItemSelectionsSnapshot(
      [selection, selection],
      SASH_LOCATION_KINDS.BALCONY
    )).toThrow("중복 선택");
  });

  it("round-trips stable sash IDs, v1 spec, location metadata, and special items", () => {
    const selectedPatch = buildSashEstimateSelectionPatch(areaPricedEntry);
    const estimateRow = calculateEstimateRow({
      itemId: "sash-item",
      itemName: "샷시",
      itemKind: "sash",
      subitemId: "balcony-subitem",
      material: "베란다",
      displayMaterial: "베란다",
      selected: true,
      pyeong: 24,
      sashLocationKind: SASH_LOCATION_KINDS.BALCONY,
      sashSpecialItemSelections: [buildSashSpecialItemSelection(canonicalSpecialItem)],
      ...selectedPatch,
    });
    const savedRows = buildSelectedEstimateRows({
      items: { "sash-item": [estimateRow] },
      estimateCatalog: [{ id: "sash-item", name: "샷시", item_kind: "sash" }],
      conditionPyeong: 24,
      estimatePyeong: 24,
    });
    const restored = restoreEstimateDraft({
      condition_snapshot: {
        condition_pyeong: 24,
        estimate_pyeong: 24,
        build_type: "구형",
        condition_variant: "구형0",
        has_extension: false,
      },
      items_data: { items: savedRows },
    });
    const restoredRow = restored.items["sash-item"][0];

    expect(savedRows[0]).toMatchObject({
      subitemId: "balcony-subitem",
      sashCatalogEntryId: "sash-entry-v1",
      pyeong: 24,
      quantity: 19.2,
      unit: "헤베",
      productAmount: 2070000,
      sashLocationKind: SASH_LOCATION_KINDS.BALCONY,
      sashSpecialItemSelections: [{
        sashSpecialItemId: "special-item-a",
        sashSpecialItemSnapshot: {
          sash_special_item_id: "special-item-a",
          area_sqm: 2,
          amount: 150000,
        },
      }],
    });
    expect(restoredRow).toMatchObject({
      subitemId: "balcony-subitem",
      sashCatalogEntryId: "sash-entry-v1",
      sashLocationKind: SASH_LOCATION_KINDS.BALCONY,
      sashSpecialItemSelections: [{
        sashSpecialItemId: "special-item-a",
        sashSpecialItemSnapshot: {
          sash_special_item_id: "special-item-a",
          area_sqm: 2,
          amount: 150000,
        },
      }],
      quantity: 19.2,
      unitPrice: 100000,
      totalAmount: 2070000,
    });
  });
});
