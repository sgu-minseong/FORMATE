import { describe, expect, it } from "vitest";
import { SASH_CATALOG_TABLE_COLUMNS } from "../SashCatalogGrid";

const columns = Object.fromEntries(SASH_CATALOG_TABLE_COLUMNS.map((column) => [column.key, column]));

describe("sash catalog column interaction floors", () => {
  it("lets pure text columns shrink to ellipsis widths", () => {
    for (const key of ["brand", "frame_spec", "pair_spec"]) {
      expect(columns[key].minWidth).toBe(44);
      expect(columns[key].minWidth).toBeLessThan(columns[key].defaultWidth);
    }
  });

  it("keeps select, numeric, and icon controls usable at their minimums", () => {
    for (const key of [
      "glass_spec",
      "glass_thickness",
      "gas_spec",
      "handle_type",
      "screen_spec",
      "window_count",
      "window_type",
    ]) expect(columns[key].minWidth).toBe(52);

    expect(columns.pin.minWidth).toBe(32);
    expect(columns.condition.minWidth).toBe(32);
    expect(columns.actions.minWidth).toBe(36);
    expect(columns.width_mm.minWidth).toBe(64);
    expect(columns.unit_price.minWidth).toBe(104);
  });

  it("leaves fitMinWidth unset so the shared table uses the same interaction floor", () => {
    expect(SASH_CATALOG_TABLE_COLUMNS.every((column) => column.fitMinWidth === undefined)).toBe(true);
  });
});
