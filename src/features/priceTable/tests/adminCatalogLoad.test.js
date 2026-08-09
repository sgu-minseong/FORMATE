import { describe, expect, it, vi } from "vitest";
import {
  countVerifiedImportRows,
  loadAdminCatalogSnapshot,
} from "../priceTableModel";

describe("admin catalog loading", () => {
  it("keeps an existing 18-item catalog and never bootstraps it", async () => {
    const snapshot = {
      itemRows: Array.from({ length: 18 }, (_, index) => ({ id: `item-${index}` })),
      subitemRows: Array.from({ length: 202 }, (_, index) => ({ id: `subitem-${index}` })),
      variantGroupRows: [{ id: "stable-product" }],
      canonicalCatalog: { items: [{ id: "item-0" }], products: [] },
    };
    const readCatalog = vi.fn().mockResolvedValue(snapshot);
    const bootstrapCatalog = vi.fn();

    const result = await loadAdminCatalogSnapshot({
      companyId: "company-current",
      readCatalog,
      bootstrapCatalog,
      allowBootstrap: true,
    });

    expect(result.itemRows).toHaveLength(18);
    expect(result.variantGroupRows).toEqual([{ id: "stable-product" }]);
    expect(result.canonicalCatalog).toBe(snapshot.canonicalCatalog);
    expect(readCatalog).toHaveBeenCalledTimes(1);
    expect(bootstrapCatalog).not.toHaveBeenCalled();
  });

  it("does not bootstrap or replace state when the read fails", async () => {
    const readCatalog = vi.fn().mockRejectedValue(new Error("PGRST failure"));
    const bootstrapCatalog = vi.fn();

    await expect(loadAdminCatalogSnapshot({
      companyId: "company-current",
      readCatalog,
      bootstrapCatalog,
      allowBootstrap: true,
    })).rejects.toThrow("PGRST failure");
    expect(bootstrapCatalog).not.toHaveBeenCalled();
  });

  it("bootstraps an actual successful zero-row result once and rereads once", async () => {
    const readCatalog = vi.fn()
      .mockResolvedValueOnce({ itemRows: [], subitemRows: [] })
      .mockResolvedValueOnce({ itemRows: [{ id: "default-item" }], subitemRows: [] });
    const bootstrapCatalog = vi.fn().mockResolvedValue(true);
    const markBootstrapAttempted = vi.fn();

    const result = await loadAdminCatalogSnapshot({
      companyId: "company-current",
      readCatalog,
      bootstrapCatalog,
      allowBootstrap: true,
      markBootstrapAttempted,
    });

    expect(result.itemRows).toHaveLength(1);
    expect(readCatalog).toHaveBeenCalledTimes(2);
    expect(bootstrapCatalog).toHaveBeenCalledTimes(1);
    expect(markBootstrapAttempted).toHaveBeenCalledWith("company-current");
  });

  it("does not bootstrap a stale company-transition request", async () => {
    const readCatalog = vi.fn().mockResolvedValue({ itemRows: [], subitemRows: [] });
    const bootstrapCatalog = vi.fn();

    const result = await loadAdminCatalogSnapshot({
      companyId: "company-previous",
      readCatalog,
      bootstrapCatalog,
      allowBootstrap: true,
      canBootstrap: () => false,
    });

    expect(result.itemRows).toEqual([]);
    expect(readCatalog).toHaveBeenCalledTimes(1);
    expect(bootstrapCatalog).not.toHaveBeenCalled();
  });

  it("verifies only rows that are actually present after import", () => {
    const results = [
      { target: { matchedSubitemId: "updated" }, payload: { unit_price: 22000 } },
      { subitem: { id: "created" } },
      { subitem: { id: "missing" } },
    ];
    expect(countVerifiedImportRows(results, {
      subitemRows: [
        { id: "updated", unit_price: 22000 },
        { id: "created", unit_price: 10000 },
      ],
    })).toBe(2);
  });
});
