import { describe, expect, it } from "vitest";
import { buildCanonicalConstructionCatalog } from "../../constructionCatalog/constructionCatalogModel";
import { normalizeAdminItems } from "../../priceTable/priceTableModel";
import { buildEstimateItemsFromTemplate } from "../estimateItemModel";
import { buildEstimateItemsData } from "../snapshot";

const itemRows = [{ id: "item-a", name: "Item", item_type: "itemized", sort_order: 0 }];
const subitemRows = [{
  id: "subitem-a",
  item_id: "item-a",
  name: "Product",
  unit: "ea",
  unit_price: 1000,
  labor_rate_empty: 100,
  labor_rate_occupied: 200,
  sort_order: 0,
}];

function buildCatalog(laborCountOccupied) {
  return normalizeAdminItems(
    itemRows,
    subitemRows,
    [{
      id: "value-a",
      subitem_id: "subitem-a",
      quantity: 2,
      labor_count: 3,
      labor_count_occupied: laborCountOccupied,
      construction_days: 1,
    }],
    buildCanonicalConstructionCatalog({ itemRows, subitemRows, variantGroupRows: [] })
  );
}

describe("estimate personnel source contracts", () => {
  it("uses vacant personnel for empty estimates and occupied personnel for occupied estimates", () => {
    const catalog = buildCatalog(5);
    const vacantRow = buildEstimateItemsFromTemplate(catalog, 24, "empty")["item-a"][0];
    const occupiedRow = buildEstimateItemsFromTemplate(catalog, 24, "occupied")["item-a"][0];
    expect(vacantRow.laborCount).toBe(3);
    expect(occupiedRow.laborCount).toBe(5);
    expect(buildEstimateItemsData({
      items: [occupiedRow], adjustments: [], siteMemo: "", estimateMeta: {},
      selectedItemsTotal: 0, constructionDaysTotal: 0, adjustmentTotal: 0, finalTotal: 0,
    }).items[0].laborCount).toBe(5);
  });

  it("does not fall back to vacant personnel when occupied personnel is absent", () => {
    const row = buildEstimateItemsFromTemplate(buildCatalog(null), 24, "occupied")["item-a"][0];
    expect(row.laborCount).toBe("");
    expect(row.baseLaborCount).toBe("");
  });
});
