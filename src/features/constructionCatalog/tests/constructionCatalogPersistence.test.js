import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/construction_subitem_variant_persistence_contract.sql"
);

describe("generic construction Product/Variant persistence contract", () => {
  it("adds generic text values and non-destructive subitem archive metadata", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("add column if not exists variant_value_type text not null default 'number'");
    expect(sql).toContain("add column if not exists variant_value_text text");
    expect(sql).toContain("add column if not exists archived_at timestamptz");
    expect(sql).toContain("alter column variant_kind drop default");
    expect(sql).toContain("check (length(btrim(variant_kind)) > 0)");
    expect(sql).toContain("check (variant_value_type in ('number', 'text'))");
    expect(sql).toContain("variant_value is not null");
    expect(sql).toContain("variant_value_text is not null");
    expect(sql).not.toContain("variant_kind in ('thickness')");
  });

  it("protects stable variant identity and base ownership without using names as identity", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("formate_validate_construction_subitem_variant_persistence");
    expect(sql).toContain("formate_prevent_variant_group_value_type_change");
    expect(sql).toContain("construction_subitems_active_numeric_variant_identity_uidx");
    expect(sql).toContain("construction_subitems_active_text_variant_identity_uidx");
    expect(sql).toContain("construction_subitem_variant_groups_base_subitem_uidx");
    expect(sql).not.toMatch(/create\s+unique\s+index[^;]*construction_subitems_active_item_name_uidx/i);
    expect(sql).toContain("drop index if exists public.construction_subitems_active_item_name_uidx");
    expect(sql).toContain("drop index if exists public.construction_subitems_item_name_uidx");
    expect(sql).toContain("A subitem name is presentation data, not entity identity");
    expect(sql).toContain("where variant_group_id is not null");
    expect(sql).toContain("and archived_at is null");
  });

  it("preserves existing business rows and requires an explicit live deployment", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("Review and run manually in the Supabase SQL Editor");
    expect(sql).not.toMatch(/update\s+public\.(construction_subitems|construction_subitem_variant_groups)\s+set/i);
    expect(sql).not.toMatch(/delete\s+from\s+public\.(construction_subitems|construction_subitem_variant_groups)/i);
    expect(sql).not.toMatch(/\binsert\s+into\s+public\.(construction_subitems|construction_subitem_variant_groups)/i);
    expect(sql).not.toMatch(/spec_options|\.name\s*=|display_name\s*=/i);
  });
});
