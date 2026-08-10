import { describe, expect, it } from "vitest";
import {
  buildConstructionItemSavePayload,
  buildConstructionSubitemInsertPayload,
  buildConstructionSubitemSavePayload,
  buildSubitemPricePayload,
  patchSubitemPriceById,
  reconcileInsertedSubitems,
} from "../priceTableModel";

const variants = [
  {
    id: "variant-number-id",
    item_id: "item-id",
    name: "제품 표시명",
    unit: "평",
    unit_price: 12000,
    labor_rate_empty: 11000,
    labor_rate_occupied: 13000,
    variant_group_id: "group-number-id",
    variant_value: 1.8,
    variant_value_text: null,
    variant_unit: "T",
  },
  {
    id: "variant-text-id",
    item_id: "item-id",
    name: "제품 표시명",
    unit: "평",
    unit_price: 22000,
    labor_rate_empty: 21000,
    labor_rate_occupied: 23000,
    variant_group_id: "group-text-id",
    variant_value: null,
    variant_value_text: "무광",
    variant_unit: null,
  },
];

describe("price persistence by construction_subitem ID", () => {
  it("changes only the selected UUID even when display names are identical", () => {
    const items = [{ id: "item-id", subitems: variants }];
    const next = patchSubitemPriceById(items, "variant-text-id", {
      unit_price: 99000,
      labor_rate_empty: 88000,
    });

    expect(next[0].subitems[0]).toBe(variants[0]);
    expect(next[0].subitems[1]).toMatchObject({
      id: "variant-text-id",
      unit_price: 99000,
      labor_rate_empty: 88000,
      labor_rate_occupied: 23000,
    });
  });

  it("writes the selected row's own price and labor values", () => {
    expect(buildSubitemPricePayload(variants[0])).toEqual({
      unit_price: 12000,
      labor_rate_empty: 11000,
      labor_rate_occupied: 13000,
      labor_rate: 11000,
    });
  });

  it("does not persist legacy spec_options through the canonical writer", () => {
    const payload = buildConstructionSubitemSavePayload({
      ...variants[0],
      cost_price: "7000",
      cost_unit: "평",
      spec_options: ["1.8T", "2.2T"],
      selected_spec_option: "2.2T",
      sort_order: 2,
    }, { includePrices: true });

    expect(payload).not.toHaveProperty("spec_options");
    expect(payload).not.toHaveProperty("selected_spec_option");
    expect(payload).toEqual({
      name: "제품 표시명",
      unit: "평",
      sort_order: 2,
      cost_price: 7000,
      cost_unit: "평",
      unit_price: 12000,
      labor_rate_empty: 11000,
      labor_rate_occupied: 13000,
      labor_rate: 11000,
    });
  });

  it("preserves a merged category's persisted source name", () => {
    expect(buildConstructionItemSavePayload({
      name: "도장/페인트",
      _sourceName: "도장",
      item_type: "itemized",
      is_favorite: true,
      sort_order: 3,
    })).toEqual({
      name: "도장",
      item_type: "itemized",
      is_favorite: true,
      sort_order: 3,
    });
  });

  it("keeps a normal non-variant subitem on the standard insert contract", () => {
    expect(buildConstructionSubitemInsertPayload({
      id: "local-subitem-standard",
      item_id: "item-id",
      name: "일반 소재",
      unit: "개",
      sort_order: 3,
      unit_price: 5000,
      labor_rate: 2000,
    })).toMatchObject({
      item_id: "item-id",
      name: "일반 소재",
      unit: "개",
      unit_price: 5000,
      labor_rate: 2000,
      labor_rate_empty: 2000,
      labor_rate_occupied: 2000,
      variant_group_id: null,
      variant_value: null,
      variant_value_text: null,
      variant_unit: null,
      archived_at: null,
    });
  });

  it("reconciles an inserted draft only by its local ID", () => {
    const localRows = [{ id: "local-subitem-a", name: "일반 소재" }];
    expect(reconcileInsertedSubitems(localRows, [{
      localId: "local-subitem-a",
      persistedSubitem: { id: "persisted-subitem-a" },
    }])).toEqual([{ id: "persisted-subitem-a", name: "일반 소재" }]);
  });
});
