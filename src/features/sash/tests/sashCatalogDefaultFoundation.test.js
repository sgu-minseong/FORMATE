import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const foundationSource = readFileSync(
  new URL("../../../../supabase/sash_catalog_defaults_foundation.sql", import.meta.url),
  "utf8"
);
const categoryMigrationSource = readFileSync(
  new URL("../../../../supabase/sash_catalog_category_pins.sql", import.meta.url),
  "utf8"
);
const pinApiSource = readFileSync(new URL("../sashCatalogDefaultApi.js", import.meta.url), "utf8");
const gridSource = readFileSync(new URL("../SashCatalogGrid.jsx", import.meta.url), "utf8");

const scopeColumns = foundationSource
  .match(/constraint sash_catalog_defaults_scope_key unique\s*\(([^)]+)\)/i)?.[1]
  .split(",")
  .map((column) => column.trim()) ?? [];

function buildScopeKey(row) {
  return JSON.stringify(scopeColumns.map((column) => row[column]));
}

describe("sash catalog category pin foundation", () => {
  it("adds category only to catalog products and preserves the original single-pin scope", () => {
    expect(foundationSource).toContain("create table if not exists public.sash_catalog_defaults");
    expect(categoryMigrationSource).toContain("add column if not exists sash_category text not null default 'unspecified'");
    expect(categoryMigrationSource).not.toContain("alter table public.sash_catalog_defaults\n  add column");
    expect(categoryMigrationSource).not.toContain("sash_catalog_defaults_category_scope_key");
    expect(foundationSource).toContain("constraint sash_catalog_defaults_scope_key unique");
    expect(categoryMigrationSource).not.toMatch(/build_type|condition_variant|occupancy|extension/i);
  });

  it("keeps existing rows unspecified and never infers category from a name", () => {
    expect(categoryMigrationSource).toContain("Existing catalog rows remain explicitly unspecified");
    expect(categoryMigrationSource).toContain("No row is classified from a name");
    expect(categoryMigrationSource).not.toMatch(/lower\s*\(|ilike|construction_subitem\.name|catalog_entry\.brand|product_type\s*=/i);
    expect(categoryMigrationSource).not.toMatch(/delete\s+from|truncate\s+/i);
  });

  it("clears an archived pin without changing category or deleting a row", () => {
    expect(categoryMigrationSource).toContain("formate_clear_archived_sash_catalog_pin");
    expect(categoryMigrationSource).toContain("after update of archived_at");
    expect(categoryMigrationSource).toContain("set sash_catalog_entry_id = null");
    expect(categoryMigrationSource).not.toContain("after update of archived_at, sash_category");
  });

  it("replaces or clears the one subitem pin without deleting rows", () => {
    expect(pinApiSource).toContain("sash_catalog_entry_id: sashCatalogEntryId || null");
    expect(pinApiSource).toContain('onConflict: "company_id,pyeong,construction_subitem_id"');
    expect(pinApiSource).not.toContain("sash_category");
    expect(pinApiSource).not.toContain(".delete(");
  });

  it("keeps 24-pyeong and 35-pyeong living-room pins independent", () => {
    expect(scopeColumns).toEqual(["company_id", "pyeong", "construction_subitem_id"]);
    expect(buildScopeKey({ company_id: "company-a", pyeong: 24, construction_subitem_id: "living" }))
      .not.toBe(buildScopeKey({ company_id: "company-a", pyeong: 35, construction_subitem_id: "living" }));
    expect(pinApiSource).toContain('.eq("pyeong", Number(pyeong))');
    expect(gridSource).toContain("pyeong: pinPyeong");
  });

  it("keeps living-room and bedroom pins independent at the same pyeong", () => {
    expect(buildScopeKey({ company_id: "company-a", pyeong: 24, construction_subitem_id: "living" }))
      .not.toBe(buildScopeKey({ company_id: "company-a", pyeong: 24, construction_subitem_id: "bedroom" }));
    expect(pinApiSource).toContain('.eq("construction_subitem_id", constructionSubitemId)');
    expect(gridSource).toContain("constructionSubitemId: selectedSubitemId");
  });

  it("allows only one pin across standard and balcony in the same pyeong and subitem", () => {
    const standardScope = buildScopeKey({
      company_id: "company-a",
      pyeong: 24,
      construction_subitem_id: "living",
      sash_category: "standard",
    });
    const balconyScope = buildScopeKey({
      company_id: "company-a",
      pyeong: 24,
      construction_subitem_id: "living",
      sash_category: "balcony",
    });
    expect(standardScope).toBe(balconyScope);
    expect(pinApiSource).toContain('onConflict: "company_id,pyeong,construction_subitem_id"');
    expect(pinApiSource).not.toContain("sash_category");
  });
});
