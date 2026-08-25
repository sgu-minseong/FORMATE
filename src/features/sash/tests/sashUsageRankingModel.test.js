import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSelectedEstimateRows, calculateEstimateRow } from "../../estimates/calculation";
import { reconcileEstimateDraftItems } from "../../estimates/estimateDraftReconciliation";
import { buildEstimateItemsFromTemplate } from "../../estimates/estimateItemModel";
import {
  buildSashEstimateSelectionPatch,
  orderSashCatalogEntriesForDisplay,
  SASH_CATEGORIES,
  SASH_MEASUREMENT_KINDS,
  SASH_PRICING_BASES,
  SASH_WINDOW_TYPES,
} from "../sashCatalogModel";
import { buildSashUsageRankings, getSashUsageRanking } from "../sashUsageRankingModel";

const rankingApiSource = readFileSync(new URL("../sashUsageRankingApi.js", import.meta.url), "utf8");
const rankingModelSource = readFileSync(new URL("../sashUsageRankingModel.js", import.meta.url), "utf8");
const sashCatalogApiSource = readFileSync(new URL("../sashCatalogApi.js", import.meta.url), "utf8");
const sashCatalogPinApiSource = readFileSync(new URL("../sashCatalogDefaultApi.js", import.meta.url), "utf8");

const sashCatalog = [{
  id: "sash-item",
  name: "샷시",
  item_type: "itemized",
  item_kind: "sash",
  subitems: [{ id: "living-room-subitem", name: "거실 샷시" }],
}];

function createEntry(id, sashCategory = SASH_CATEGORIES.STANDARD, patch = {}) {
  return {
    id,
    construction_subitem_id: "living-room-subitem",
    sash_category: sashCategory,
    brand: id === "entry-a" ? "A 제조사" : "B 제조사",
    frame_spec: "140mm 틀",
    pair_spec: "24mm 페어",
    glass_spec: "로이유리",
    gas_spec: "아르곤",
    screen_spec: "미세방충망",
    window_type: SASH_WINDOW_TYPES.SINGLE,
    measurement_kind: SASH_MEASUREMENT_KINDS.ESTIMATE,
    pricing_basis: SASH_PRICING_BASES.AREA,
    width_mm: 4000,
    height_mm: 2000,
    unit_price: 100000,
    sort_order: 0,
    ...patch,
  };
}

function savedSashRow(entryId, sashCategory = SASH_CATEGORIES.STANDARD, pyeong = 35, patch = {}) {
  return {
    itemKind: "sash",
    selected: true,
    subitemId: "living-room-subitem",
    sashCategory,
    sashCatalogEntryId: entryId,
    estimatePyeong: pyeong,
    ...patch,
  };
}

describe("saved estimate sash usage ranking", () => {
  it("loads active company-scoped history, catalog products, and pins", () => {
    expect(rankingApiSource).toContain("const ESTIMATE_PAGE_SIZE = 500");
    expect(rankingApiSource).toContain('.eq("company_id", companyId)');
    expect(rankingApiSource).toContain('.is("deleted_at", null)');
    expect(rankingApiSource).toContain(".range(from, from + ESTIMATE_PAGE_SIZE - 1)");
    expect(rankingApiSource).toContain("fetchActiveCompanySashCatalogEntries(companyId)");
    expect(rankingApiSource).toContain("fetchCompanySashCatalogPins(companyId)");
    expect(sashCatalogApiSource).toContain('.is("archived_at", null)');
    expect(sashCatalogPinApiSource).toContain('.from("sash_catalog_defaults")');
    expect(sashCatalogPinApiSource).toContain('onConflict: "company_id,pyeong,construction_subitem_id"');
    expect(rankingModelSource).not.toMatch(/build_type|condition_variant|occupancy|extension/i);
  });

  it("deduplicates autosaves per estimate and ranks all categories in one subitem scope", () => {
    const rankings = buildSashUsageRankings([
      { items_data: { items: [savedSashRow("entry-a"), savedSashRow("entry-a")] } },
      { items_data: { items: [savedSashRow("entry-a")] } },
      { items_data: { items: [
        savedSashRow("entry-b", SASH_CATEGORIES.BALCONY),
        savedSashRow("hidden", SASH_CATEGORIES.STANDARD, 35, { selected: false }),
        savedSashRow("entry-a", SASH_CATEGORIES.STANDARD, 24),
      ] } },
    ]);

    expect(getSashUsageRanking(rankings, 35, "living-room-subitem"))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ sashCatalogEntryId: "entry-a", usageCount: 2 }),
        expect.objectContaining({ sashCatalogEntryId: "entry-b", usageCount: 1 }),
      ]));
    expect(getSashUsageRanking(rankings, 24, "living-room-subitem"))
      .toEqual([expect.objectContaining({ sashCatalogEntryId: "entry-a", usageCount: 1 })]);
  });

  it("uses an active pinned product before a higher-ranked product", () => {
    const rankings = buildSashUsageRankings([
      { items_data: { items: [savedSashRow("entry-a")] } },
      { items_data: { items: [savedSashRow("entry-a")] } },
    ]);
    const row = buildEstimateItemsFromTemplate(sashCatalog, 35, "empty", {
      sashUsageRankings: rankings,
      sashCatalogEntries: [createEntry("entry-a"), createEntry("entry-b")],
      sashCatalogPins: [{
        pyeong: 35,
        construction_subitem_id: "living-room-subitem",
        sash_catalog_entry_id: "entry-b",
      }],
    })["sash-item"][0];

    expect(row).toMatchObject({
      sashCatalogEntryId: "entry-b",
      sashPinnedCatalogEntryId: "entry-b",
      sashSelectionSource: "pinned",
      sashUsageCount: 0,
      quantity: 8,
      totalAmount: 800000,
    });
  });

  it("orders pinned first, then usage ranking, then canonical order", () => {
    const entries = [createEntry("entry-a"), createEntry("entry-b"), createEntry("entry-c")];
    expect(orderSashCatalogEntriesForDisplay(entries, {
      pinnedEntryId: "entry-c",
      usageRanking: [
        { sashCatalogEntryId: "entry-b", usageCount: 9 },
        { sashCatalogEntryId: "entry-a", usageCount: 3 },
      ],
    }).map((entry) => entry.id)).toEqual(["entry-c", "entry-b", "entry-a"]);
  });

  it("falls back to usage ranking when no pin exists", () => {
    const rankings = buildSashUsageRankings([
      { items_data: { items: [savedSashRow("entry-a")] } },
      { items_data: { items: [savedSashRow("entry-a")] } },
      { items_data: { items: [savedSashRow("entry-b")] } },
    ]);
    const row = buildEstimateItemsFromTemplate(sashCatalog, 35, "empty", {
      sashUsageRankings: rankings,
      sashCatalogEntries: [createEntry("entry-b"), createEntry("entry-a")],
    })["sash-item"][0];

    expect(row).toMatchObject({
      sashCatalogEntryId: "entry-a",
      sashSelectionSource: "ranking",
      sashUsageCount: 2,
    });
  });

  it("keeps the row unselected when neither pin nor ranking exists", () => {
    const row = buildEstimateItemsFromTemplate(sashCatalog, 35, "empty", {
      sashUsageRankings: {},
      sashCatalogEntries: [createEntry("entry-a")],
    })["sash-item"][0];
    expect(row).toMatchObject({ sashCatalogEntryId: "", sashSpec: null, selected: false });
  });

  it("keeps one estimate row while allowing a pin from either product category", () => {
    const rows = buildEstimateItemsFromTemplate(sashCatalog, 35, "empty", {
      sashUsageRankings: {},
      sashCatalogEntries: [
        createEntry("standard-entry", SASH_CATEGORIES.STANDARD),
        createEntry("balcony-entry", SASH_CATEGORIES.BALCONY),
      ],
      sashCatalogPins: [
        { pyeong: 35, construction_subitem_id: "living-room-subitem", sash_catalog_entry_id: "balcony-entry" },
      ],
    })["sash-item"];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      subitemId: "living-room-subitem",
      sashCategory: SASH_CATEGORIES.BALCONY,
      sashCatalogEntryId: "balcony-entry",
      sashSelectionSource: "pinned",
    });
  });

  it("does not apply a pin whose canonical product is archived", () => {
    const row = buildEstimateItemsFromTemplate(sashCatalog, 35, "empty", {
      sashUsageRankings: {},
      sashCatalogEntries: [createEntry("archived-entry", SASH_CATEGORIES.STANDARD, { archived_at: "2026-08-21T00:00:00Z" })],
      sashCatalogPins: [{ pyeong: 35, construction_subitem_id: "living-room-subitem", sash_catalog_entry_id: "archived-entry" }],
    })["sash-item"][0];
    expect(row).toMatchObject({ sashCatalogEntryId: "", sashSpec: null });
  });

  it("preserves an existing snapshot instead of replacing it with pin or ranking", () => {
    const rankings = buildSashUsageRankings([{ items_data: { items: [savedSashRow("entry-a")] } }]);
    const nextItems = buildEstimateItemsFromTemplate(sashCatalog, 35, "empty", {
      sashUsageRankings: rankings,
      sashCatalogEntries: [createEntry("entry-a"), createEntry("entry-b")],
      sashCatalogPins: [{ pyeong: 35, construction_subitem_id: "living-room-subitem", sash_catalog_entry_id: "entry-a" }],
    });
    const previousRow = calculateEstimateRow({
      ...nextItems["sash-item"][0],
      ...buildSashEstimateSelectionPatch(createEntry("entry-b")),
      selected: true,
      sashSelectionSource: undefined,
    });
    const reconciled = reconcileEstimateDraftItems({
      nextItems,
      previousItems: { "sash-item": [previousRow] },
      recalculateRow: calculateEstimateRow,
    });
    expect(reconciled.items["sash-item"][0]).toMatchObject({
      selected: true,
      sashCatalogEntryId: "entry-b",
      sashSelectionSource: "manual",
    });
  });

  it("does not count automatic exposure and excludes an unchecked unresolved row", () => {
    const rankings = buildSashUsageRankings([]);
    const row = buildEstimateItemsFromTemplate(sashCatalog, 35, "empty", {
      sashUsageRankings: rankings,
      sashCatalogEntries: [createEntry("entry-a", SASH_CATEGORIES.STANDARD, { window_type: SASH_WINDOW_TYPES.UNSPECIFIED })],
      sashCatalogPins: [{ pyeong: 35, construction_subitem_id: "living-room-subitem", sash_catalog_entry_id: "entry-a" }],
    })["sash-item"][0];
    expect(getSashUsageRanking(rankings, 35, "living-room-subitem")).toEqual([]);
    expect(buildSelectedEstimateRows({
      items: { "sash-item": [row] },
      estimateCatalog: sashCatalog,
      conditionPyeong: 35,
      estimatePyeong: 35,
    })).toEqual([]);
  });
});
