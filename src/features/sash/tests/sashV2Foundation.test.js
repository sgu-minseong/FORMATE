import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSource = readFileSync(
  new URL("../../../../supabase/sash_v2_foundation.sql", import.meta.url),
  "utf8"
);

describe("Sash v2 foundation migration contract", () => {
  it("allows canonical sparse catalog rows without fake field defaults", () => {
    ["brand", "product_type", "width_mm", "height_mm", "unit_price", "cost_price"]
      .forEach((column) => {
        expect(migrationSource).toContain(`alter column ${column} drop not null`);
      });

    expect(migrationSource).toContain("alter column unit_price drop default");
    expect(migrationSource).toContain("alter column cost_price drop default");
    expect(migrationSource).toContain("check (width_mm is null or width_mm > 0)");
    expect(migrationSource).toContain("check (height_mm is null or height_mm > 0)");
    expect(migrationSource).toContain("unit_price::text not in ('NaN', 'Infinity', '-Infinity')");
    expect(migrationSource).toContain("drop constraint if exists sash_catalog_entries_area_pricing_spec_complete_check");
    expect(migrationSource.match(/sash_catalog_entries_area_pricing_spec_complete_check/g)).toHaveLength(1);
    expect(migrationSource).toContain("add column if not exists glass_thickness text");
    expect(migrationSource).toContain("add column if not exists handle_type text");
    expect(migrationSource).toContain("add column if not exists window_count text");
    expect(migrationSource).toContain("add column if not exists window_type_option_id uuid");
    expect(migrationSource).not.toMatch(/'미정'|"미정"/);
  });

  it("stores independent company-scoped conditions and one mapping per subitem", () => {
    expect(migrationSource).toContain("create table if not exists public.sash_conditions");
    expect(migrationSource).toContain("create table if not exists public.sash_condition_entries");
    expect(migrationSource).toContain("sash_condition_entries_scope_key unique");
    expect(migrationSource).toContain("formate_validate_sash_condition_entry_scope");
    expect(migrationSource).toContain("catalog_subitem_id is distinct from new.construction_subitem_id");
    expect(migrationSource).not.toMatch(/insert\s+into\s+public\.sash_condition_entries/i);
    expect(migrationSource).not.toMatch(/\bpyeong\b|\bbuild_type\b|\bhas_extension\b|\bcondition_variant\b|\boccupancy\b/i);
  });

  it("keeps option labels reusable while window types retain explicit semantics", () => {
    expect(migrationSource).toContain("create table if not exists public.sash_option_values");
    [
      "screen",
      "glass_type",
      "gas",
      "glass_thickness",
      "handle_type",
      "window_count",
      "window_type",
    ].forEach((optionKind) => expect(migrationSource).toContain(`'${optionKind}'`));
    expect(migrationSource).toContain("semantic_value is not null");
    expect(migrationSource).toContain("semantic_value in ('single', 'double')");
    expect(migrationSource).toContain("semantic_value is null");
    expect(migrationSource).toContain("'window_type', U&'\\B2E8\\CC3D', 'single'");
    expect(migrationSource).toContain("'window_type', U&'2\\C911\\CC3D', 'double'");
    expect(migrationSource).toContain("sash_catalog_entries_window_type_option_fkey");
    expect(migrationSource).toContain("option_company_id is distinct from new.company_id");
    expect(migrationSource).toContain("option_kind_value is distinct from 'window_type'");
    expect(migrationSource).toContain("option_semantic_value is distinct from new.window_type");
    expect(migrationSource).not.toMatch(/semantic_value\s*::\s*numeric|\*\s*semantic_value/i);
  });

  it("seeds only defaults, enables tenant RLS, and does not introduce Gate 5 pricing", () => {
    expect(migrationSource).toContain("formate_seed_sash_v2_defaults");
    expect(migrationSource).toContain("after insert on public.companies");
    expect(migrationSource).toContain("sash_conditions_active_company_name_uidx");
    expect(migrationSource).toContain("sash_option_values_active_company_kind_label_uidx");
    expect(migrationSource).toContain("on conflict (company_id, name) where archived_at is null do nothing");
    expect(migrationSource).toContain("on conflict (company_id, option_kind, label) where archived_at is null do nothing");
    expect(migrationSource.match(/enable row level security/g)).toHaveLength(3);
    expect(migrationSource.match(/company_member\.user_id = auth\.uid\(\)/g)).toHaveLength(6);
    expect(migrationSource).not.toMatch(/select\s+distinct/i);
    expect(migrationSource).not.toMatch(/sash_prices|sash_price_id/i);
  });
});
