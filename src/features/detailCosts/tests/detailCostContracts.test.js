import { describe, expect, it } from "vitest";
import {
  buildDetailSubitems,
  buildNewDetailCostPayload,
  normalizeDetailCostPatch,
  selectBulkDetailCosts,
} from "../detailCostModel";

describe("detail cost contracts", () => {
  it("keeps company/subitem read model and insert payload", () => {
    const subitems = buildDetailSubitems(
      [{ id: "item", name: "도배", sort_order: 2, is_favorite: true }],
      [{ id: "sub", item_id: "item", name: "실크" }]
    );
    expect(subitems[0]).toMatchObject({
      item_name: "도배", item_sort_order: 2, item_is_favorite: true,
    });
    expect(buildNewDetailCostPayload({
      companyId: "company", subitemId: "sub",
      draft: { name: " 풀 ", cost: "12,000", category_type: "basic" },
      costs: [{ sort_order: 3 }],
    })).toEqual({
      company_id: "company", subitem_id: "sub", name: "풀", cost: 12000,
      category_type: "basic", sort_order: 4,
    });
  });

  it("keeps update and bulk empty/overwrite behavior", () => {
    expect(normalizeDetailCostPatch({ name: " 부직포 ", cost: "9,000" })).toEqual({
      name: "부직포", cost: 9000,
    });
    const costs = [{ id: "zero", cost: 0 }, { id: "filled", cost: 100 }];
    expect(selectBulkDetailCosts(costs, "empty").map((row) => row.id)).toEqual(["zero"]);
    expect(selectBulkDetailCosts(costs, "overwrite")).toEqual(costs);
  });
});
