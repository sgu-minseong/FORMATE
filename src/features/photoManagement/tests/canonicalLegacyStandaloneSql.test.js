import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSql = (fileName) => readFileSync(
  new URL(`../../../../supabase/${fileName}`, import.meta.url),
  "utf8"
).replace(/\r\n/g, "\n");

const auditSql = readSql("canonical_variant_legacy_standalone_audit.sql");
const migrationSql = readSql("canonical_variant_legacy_standalone_targeted_migration.sql");

describe("legacy standalone canonical migration SQL", () => {
  it("keeps suffix parsing inside a read-only candidate audit", () => {
    expect(auditSql).toContain("set transaction read only;");
    expect(auditSql).toContain("regexp_match(");
    expect(auditSql).toContain("product_name_evidence");
    expect(auditSql).toContain("numeric_value_evidence");
    expect(auditSql).toContain("exact_subitem_row");
    expect(auditSql).toContain("same_item_active_groups");
    expect(auditSql).toContain("total_reference_count");
    expect(auditSql).not.toMatch(/\b(update|insert into|delete from)\s+public\./i);
  });

  it("fails closed until exact audited UUID rows and counts are supplied", () => {
    expect(migrationSql).toContain("values (null, null, null);");
    expect(migrationSql).toContain("expected_subitem_row jsonb not null");
    expect(migrationSql).toContain("expected_existing_row jsonb");
    expect(migrationSql).toContain("Live-audited expected counts must be supplied");
    expect(migrationSql).toContain("Seed cardinality differs from the live-audited expected counts");
    expect(migrationSql).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  });

  it("preserves UUID references and permits only metadata attachment or archive", () => {
    const publicUpdates = [...migrationSql.matchAll(/update public\.([a-z0-9_]+)/gi)]
      .map((match) => match[1]);

    expect(new Set(publicUpdates)).toEqual(new Set(["construction_subitems"]));
    expect(migrationSql).not.toMatch(/\bdelete\s+from\b/i);
    expect(migrationSql).toContain("variant_group_id = seed.variant_group_id");
    expect(migrationSql).toContain("variant_value = seed.variant_value");
    expect(migrationSql).toContain("variant_value_text = null");
    expect(migrationSql).toContain("set archived_at = coalesce(subitem.archived_at, now())");
    expect(migrationSql).toContain("immutable_business_data");
    expect(migrationSql).toContain("formate_preserved_references");
    expect(migrationSql).toContain("A preserved reference or historical snapshot changed");
    expect(migrationSql).toContain("An archive target still has a direct or historical reference");
  });

  it("does not encode product names as migration identity", () => {
    expect(migrationSql).not.toContain("regexp_match");
    expect(migrationSql).not.toMatch(/KCC|LG장판|새 장판/);
    expect(migrationSql).not.toContain("option_value");
    expect(migrationSql).not.toContain("spec_options");
    expect(migrationSql).toContain("construction_subitem_id uuid primary key");
    expect(migrationSql).toContain("variant_group_id uuid not null");
  });
});
