import { describe, expect, it } from "vitest";
import {
  getTableTotalWidth,
  getTableWidthStorageKey,
  loadTableWidths,
  resetTableWidths,
  resizeTableColumn,
  saveTableWidths,
  sanitizeTableWidths,
} from "../tableWidths";

const columns = [
  { key: "material", defaultWidth: 260, minWidth: 160, maxWidth: 420 },
  { key: "spec", defaultWidth: 120, minWidth: 80, maxWidth: 240 },
  { key: "quantity", defaultWidth: 72, minWidth: 56, maxWidth: 120 },
];

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe("table width preferences", () => {
  it("resizes only the requested column and shrinks the total by the same delta", () => {
    const defaults = sanitizeTableWidths(columns, null);
    const resized = resizeTableColumn(columns, defaults, "spec", 80);

    expect(resized).toEqual({ ...defaults, spec: 80 });
    expect(getTableTotalWidth(columns, resized)).toBe(getTableTotalWidth(columns, defaults) - 40);
  });

  it("isolates storage by company, table, and version and restores a saved layout", () => {
    const storage = createStorage();
    const priceKey = getTableWidthStorageKey("company-a", "price-table", 1);
    const estimateKey = getTableWidthStorageKey("company-a", "estimate-items", 1);
    const otherCompanyKey = getTableWidthStorageKey("company-b", "price-table", 1);
    const next = resizeTableColumn(columns, null, "spec", 88);

    saveTableWidths(storage, priceKey, columns, next);

    expect(loadTableWidths(storage, priceKey, columns).spec).toBe(88);
    expect(loadTableWidths(storage, estimateKey, columns).spec).toBe(120);
    expect(loadTableWidths(storage, otherCompanyKey, columns).spec).toBe(120);
    expect(getTableWidthStorageKey("company-a", "price-table", 2)).not.toBe(priceKey);
  });

  it("falls back safely for malformed, stale, missing, and non-numeric values", () => {
    const malformedKey = getTableWidthStorageKey("company-a", "malformed");
    const staleKey = getTableWidthStorageKey("company-a", "stale");
    const storage = createStorage({
      [malformedKey]: "{broken",
      [staleKey]: JSON.stringify({ spec: "90", stale_column: 999 }),
    });

    expect(loadTableWidths(storage, malformedKey, columns)).toEqual({ material: 260, spec: 120, quantity: 72 });
    expect(loadTableWidths(storage, staleKey, columns)).toEqual({ material: 260, spec: 120, quantity: 72 });
  });

  it("clamps finite persisted widths and rejects non-finite values", () => {
    expect(sanitizeTableWidths(columns, {
      material: Number.NaN,
      spec: -10,
      quantity: 999,
    })).toEqual({ material: 260, spec: 80, quantity: 120 });
    expect(sanitizeTableWidths(columns, { material: Number.POSITIVE_INFINITY }).material).toBe(260);
  });

  it("resets only the current table preference", () => {
    const storage = createStorage();
    const priceKey = getTableWidthStorageKey("company-a", "price-table");
    const sashKey = getTableWidthStorageKey("company-a", "sash-catalog");
    saveTableWidths(storage, priceKey, columns, { material: 200, spec: 90, quantity: 60 });
    saveTableWidths(storage, sashKey, columns, { material: 210, spec: 100, quantity: 64 });

    expect(resetTableWidths(storage, priceKey, columns)).toEqual({ material: 260, spec: 120, quantity: 72 });
    expect(loadTableWidths(storage, priceKey, columns)).toEqual({ material: 260, spec: 120, quantity: 72 });
    expect(loadTableWidths(storage, sashKey, columns)).toEqual({ material: 210, spec: 100, quantity: 64 });
  });
});
