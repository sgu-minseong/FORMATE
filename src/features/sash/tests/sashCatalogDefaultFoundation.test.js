import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSource = readFileSync(
  new URL("../../../../supabase/sash_catalog_defaults_foundation.sql", import.meta.url),
  "utf8"
);
const defaultApiSource = readFileSync(
  new URL("../sashCatalogDefaultApi.js", import.meta.url),
  "utf8"
);

describe("sash catalog explicit defaults foundation", () => {
  it("stores one canonical fallback by company, pyeong, and stable subitem ID", () => {
    expect(migrationSource).toContain("create table if not exists public.sash_catalog_defaults");
    expect(migrationSource).toContain("company_id uuid not null");
    expect(migrationSource).toContain("pyeong integer not null");
    expect(migrationSource).toContain("construction_subitem_id uuid not null");
    expect(migrationSource).toContain("sash_catalog_entry_id uuid");
    expect(migrationSource).toContain("constraint sash_catalog_defaults_scope_key unique");
    expect(migrationSource).not.toMatch(/build_type|condition_variant|occupancy|extension/i);
  });

  it("is additive, company-scoped, and rejects archived or cross-scope products", () => {
    expect(migrationSource).toContain("formate_validate_sash_catalog_default");
    expect(migrationSource).toContain("catalog_entry_archived_at is not null");
    expect(migrationSource).toContain("parent_item_kind <> 'sash'");
    expect(migrationSource).toContain("enable row level security");
    expect(migrationSource).toContain("company_member.user_id = auth.uid()");
    expect(migrationSource).not.toMatch(/update\s+public\./i);
    expect(migrationSource).not.toMatch(/delete\s+from/i);
    expect(migrationSource).not.toMatch(/truncate\s+/i);
  });

  it("clears a fallback with a null upsert instead of deleting a row", () => {
    expect(defaultApiSource).toContain("sash_catalog_entry_id: sashCatalogEntryId || null");
    expect(defaultApiSource).toContain('onConflict: "company_id,pyeong,construction_subitem_id"');
    expect(defaultApiSource).not.toContain(".delete(");
  });
});
