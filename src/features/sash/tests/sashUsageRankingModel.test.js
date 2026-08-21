import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSelectedEstimateRows, calculateEstimateRow } from "../../estimates/calculation";
import { reconcileEstimateDraftItems } from "../../estimates/estimateDraftReconciliation";
import { buildEstimateItemsFromTemplate } from "../../estimates/estimateItemModel";
import {
  buildSashEstimateSelectionPatch,
  SASH_MEASUREMENT_KINDS,
  SASH_PRICING_BASES,
  SASH_WINDOW_TYPES,
} from "../sashCatalogModel";
import {
  buildSashUsageRankings,
  getSashUsageRanking,
} from "../sashUsageRankingModel";

const rankingApiSource = readFileSync(
  new URL("../sashUsageRankingApi.js", import.meta.url),
  "utf8"
);
const rankingModelSource = readFileSync(
  new URL("../sashUsageRankingModel.js", import.meta.url),
  "utf8"
);
const sashCatalogApiSource = readFileSync(
  new URL("../sashCatalogApi.js", import.meta.url),
  "utf8"
);

const sashCatalog = [{
  id: "sash-item",
  name: "샷시",
  item_type: "itemized",
  item_kind: "sash",
  subitems: [{
    id: "living-room-subitem",
    name: "거실 샷시",
    sash_location_kind: "standard",
  }],
}];

function createEntry(id, windowType = SASH_WINDOW_TYPES.SINGLE) {
  return {
    id,
    construction_subitem_id: "living-room-subitem",
    brand: id === "entry-a" ? "A 제조사" : "B 제조사",
    frame_spec: "140mm 틀",
    pair_spec: "24mm 페어",
    glass_spec: "로이유리",
    gas_spec: "아르곤",
    screen_spec: "미세방충망",
    window_type: windowType,
    measurement_kind: SASH_MEASUREMENT_KINDS.ESTIMATE,
    pricing_basis: SASH_PRICING_BASES.AREA,
    width_mm: 4000,
    height_mm: 2000,
    unit_price: 100000,
    sort_order: 0,
  };
}

function savedSashRow(entryId, pyeong = 35, patch = {}) {
  return {
    itemKind: "sash",
    subitemId: "living-room-subitem",
    sashCatalogEntryId: entryId,
    estimatePyeong: pyeong,
    ...patch,
  };
}

describe("saved estimate sash usage ranking", () => {
  it("loads active company-scoped history and canonical products without extra conditions", () => {
    expect(rankingApiSource).toContain("const ESTIMATE_PAGE_SIZE = 500");
    expect(rankingApiSource).toContain('.eq("company_id", companyId)');
    expect(rankingApiSource).toContain('.is("deleted_at", null)');
    expect(rankingApiSource).toContain(".range(from, from + ESTIMATE_PAGE_SIZE - 1)");
    expect(rankingApiSource).toContain("fetchActiveCompanySashCatalogEntries(companyId)");
    expect(sashCatalogApiSource).toContain("export async function fetchActiveCompanySashCatalogEntries");
    expect(sashCatalogApiSource).toContain('.from("sash_catalog_entries")');
    expect(sashCatalogApiSource).toContain('.eq("company_id", companyId)');
    expect(sashCatalogApiSource).toContain('.is("archived_at", null)');
    expect(rankingModelSource).not.toMatch(/build_type|condition_variant|occupancy|extension/i);
  });

  it("counts only pyeong, stable location ID, and canonical entry ID", () => {
    const rankings = buildSashUsageRankings([
      {
        id: "estimate-1",
        created_at: "2026-08-20T00:00:00Z",
        condition_snapshot: { estimate_pyeong: 35, build_type: "new", occupancy: "empty" },
        items_data: { items: [
          savedSashRow("entry-a"),
          savedSashRow("entry-a"),
        ] },
      },
      {
        id: "estimate-2",
        created_at: "2026-08-19T00:00:00Z",
        condition_snapshot: { estimate_pyeong: 35, build_type: "old", occupancy: "occupied" },
        items_data: { items: [savedSashRow("entry-a")] },
      },
      {
        id: "estimate-3",
        created_at: "2026-08-18T00:00:00Z",
        items_data: { items: [
          savedSashRow("entry-b"),
          savedSashRow("entry-hidden", 35, { selected: false }),
          savedSashRow("entry-a", 24),
        ] },
      },
    ]);

    expect(getSashUsageRanking(rankings, 35, "living-room-subitem"))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ sashCatalogEntryId: "entry-a", usageCount: 2 }),
        expect.objectContaining({ sashCatalogEntryId: "entry-b", usageCount: 1 }),
      ]));
    expect(getSashUsageRanking(rankings, 35, "living-room-subitem")[0].sashCatalogEntryId)
      .toBe("entry-a");
    expect(getSashUsageRanking(rankings, 24, "living-room-subitem"))
      .toEqual([expect.objectContaining({ sashCatalogEntryId: "entry-a", usageCount: 1 })]);
  });

  it("applies the highest-ranked active product only to a new unchecked row", () => {
    const rankings = buildSashUsageRankings([
      { items_data: { items: [savedSashRow("entry-a")] } },
      { items_data: { items: [savedSashRow("entry-a")] } },
      { items_data: { items: [savedSashRow("entry-b")] } },
    ]);
    const items = buildEstimateItemsFromTemplate(sashCatalog, 35, "empty", {
      sashUsageRankings: rankings,
      sashCatalogEntries: [createEntry("entry-b"), createEntry("entry-a")],
    });
    const row = items["sash-item"][0];

    expect(row).toMatchObject({
      selected: false,
      sashCatalogEntryId: "entry-a",
      selectedSashCatalogEntryId: "entry-a",
      sashSelectionSource: "ranking",
      sashUsageCount: 2,
      quantity: 8,
      totalAmount: 800000,
    });
  });

  it("keeps a new row unselected when there is no ranking history", () => {
    const row = buildEstimateItemsFromTemplate(sashCatalog, 35, "empty", {
      sashUsageRankings: {},
      sashCatalogEntries: [createEntry("entry-a")],
    })["sash-item"][0];

    expect(row).toMatchObject({
      selected: false,
      sashCatalogEntryId: "",
      selectedSashCatalogEntryId: "",
      sashSpec: null,
    });
  });

  it("preserves an existing estimate snapshot instead of replacing it with the representative", () => {
    const rankings = buildSashUsageRankings([
      { items_data: { items: [savedSashRow("entry-a")] } },
      { items_data: { items: [savedSashRow("entry-a")] } },
    ]);
    const nextItems = buildEstimateItemsFromTemplate(sashCatalog, 35, "empty", {
      sashUsageRankings: rankings,
      sashCatalogEntries: [createEntry("entry-a"), createEntry("entry-b")],
    });
    const previousRow = calculateEstimateRow({
      ...nextItems["sash-item"][0],
      ...buildSashEstimateSelectionPatch(createEntry("entry-b")),
      selected: true,
      sashSelectionSource: undefined,
      sashUsageCount: undefined,
    });
    const reconciled = reconcileEstimateDraftItems({
      nextItems,
      previousItems: { "sash-item": [previousRow] },
      recalculateRow: calculateEstimateRow,
    });

    expect(reconciled.items["sash-item"][0]).toMatchObject({
      selected: true,
      sashCatalogEntryId: "entry-b",
      selectedSashCatalogEntryId: "entry-b",
      sashSelectionSource: "manual",
    });
  });

  it("does not send an unused unspecified area sash row to save or preview validation", () => {
    const unspecifiedEntry = createEntry("entry-a", SASH_WINDOW_TYPES.UNSPECIFIED);
    const unusedRow = calculateEstimateRow({
      itemId: "sash-item",
      itemName: "샷시",
      itemKind: "sash",
      subitemId: "living-room-subitem",
      selected: false,
      pyeong: 35,
      ...buildSashEstimateSelectionPatch(unspecifiedEntry),
    });
    const selectedRows = buildSelectedEstimateRows({
      items: { "sash-item": [unusedRow] },
      estimateCatalog: sashCatalog,
      conditionPyeong: 35,
      estimatePyeong: 35,
    });

    expect(selectedRows).toEqual([]);
  });
});
