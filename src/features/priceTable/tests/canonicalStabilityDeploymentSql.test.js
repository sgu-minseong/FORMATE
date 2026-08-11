import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSql = (fileName) => readFileSync(
  new URL(`../../../../supabase/${fileName}`, import.meta.url),
  "utf8"
).replace(/\r\n/g, "\n");

const fullSql = readSql("canonical_variant_stability_guards.sql");
const bootstrapSql = readSql("canonical_variant_stability_rpc_bootstrap.sql");
const cleanupSql = readSql("canonical_variant_legacy_template_option_cleanup.sql");

const atomicRpcNames = [
  "save_admin_template_atomic",
  "save_estimate_draft_with_template",
  "save_admin_catalog_atomic",
  "create_canonical_variant_product_atomic",
  "initialize_default_construction_catalog_atomic",
  "create_standard_catalog_entries_atomic",
  "bulk_update_detail_costs_atomic",
  "reorder_admin_catalog_atomic",
  "reorder_photo_entities_atomic",
  "reorder_sash_catalog_entries_atomic",
  "update_photo_captions_atomic",
  "compensate_photo_upload_batch_atomic",
  "move_photo_library_photo_atomic",
];

const bootstrapFunctionNames = [
  "formate_apply_admin_template_values",
  ...atomicRpcNames,
];

function extractFunction(sql, functionName) {
  const startMarker = `create or replace function public.${functionName}(`;
  const start = sql.indexOf(startMarker);
  const end = sql.indexOf("\n$$;", start);
  if (start < 0 || end < 0) return "";
  return sql.slice(start, end + "\n$$;".length).trim();
}

function declaredPublicFunctions(sql) {
  return [...sql.matchAll(/create or replace function public\.([a-z0-9_]+)\(/g)]
    .map((match) => match[1]);
}

function extractDelimitedBlock(sql, startMarker, endMarker) {
  const start = sql.indexOf(startMarker);
  const end = sql.indexOf(endMarker, start);
  if (start < 0 || end < 0) return "";
  return sql.slice(start, end + endMarker.length).trim();
}

describe("canonical stability compatibility bootstrap SQL", () => {
  it("copies the helper and exactly the 13 frontend atomic RPC definitions", () => {
    expect(declaredPublicFunctions(bootstrapSql)).toEqual(bootstrapFunctionNames);
    for (const functionName of bootstrapFunctionNames) {
      expect(extractFunction(bootstrapSql, functionName)).not.toBe("");
      expect(extractFunction(bootstrapSql, functionName)).toBe(
        extractFunction(fullSql, functionName)
      );
    }
  });

  it("copies the full prerequisite preflight and RPC permission block verbatim", () => {
    const preflightStart = "do $$\nbegin";
    const preflightEnd = "\n$$;";
    const rpcStart = "-- Internal helper used only by the two atomic Template writers below.";
    const rpcEnd = "notify pgrst, 'reload schema';";

    expect(extractDelimitedBlock(bootstrapSql, preflightStart, preflightEnd)).toBe(
      extractDelimitedBlock(fullSql, preflightStart, preflightEnd)
    );
    expect(extractDelimitedBlock(bootstrapSql, rpcStart, rpcEnd)).toBe(
      extractDelimitedBlock(fullSql, rpcStart, rpcEnd)
    );
  });

  it("is additive and keeps the old frontend write contract during cutover", () => {
    expect(bootstrapSql).toContain(
      "create unique index if not exists admin_condition_template_values_template_subitem_uidx"
    );
    expect(bootstrapSql).not.toMatch(
      /drop index[^;]*admin_condition_template_values_template_subitem_option_uidx/i
    );
    expect(bootstrapSql).not.toContain(
      "admin_condition_template_values_canonical_option_check"
    );
    expect(bootstrapSql).not.toMatch(/\bcreate trigger\b/i);
    expect(bootstrapSql).not.toContain("formate_validate_admin_template_value_scope");
    expect(bootstrapSql).not.toContain("formate_validate_photo_v2_scope");
    expect(bootstrapSql).not.toContain("formate_validate_estimate_snapshot_total");
  });

  it("can be rerun and followed by the full stability SQL without definition conflicts", () => {
    expect(bootstrapSql).toContain("begin;");
    expect(bootstrapSql.trimEnd()).toMatch(/commit;$/i);
    expect(bootstrapSql).toContain("notify pgrst, 'reload schema';");

    for (const functionName of bootstrapFunctionNames) {
      expect(bootstrapSql).toContain(`create or replace function public.${functionName}`);
      expect(fullSql).toContain(`create or replace function public.${functionName}`);
    }

    expect(fullSql).toContain(
      "create unique index if not exists admin_condition_template_values_template_subitem_uidx"
    );
    expect(fullSql).toContain(
      "drop index if exists public.admin_condition_template_values_template_subitem_option_uidx"
    );

    for (const rpcName of atomicRpcNames) {
      expect(bootstrapSql).toMatch(
        new RegExp(`revoke all on function public\\.${rpcName}\\(`)
      );
      expect(bootstrapSql).toMatch(
        new RegExp(`grant execute on function public\\.${rpcName}\\(`)
      );
    }
  });
});

describe("targeted legacy Template option cleanup SQL", () => {
  it("fails closed until an exact expected count and UUID set are supplied", () => {
    expect(cleanupSql).toContain("expected_count bigint := null;");
    expect(cleanupSql).toContain("target_ids uuid[] := array[]::uuid[];");
    expect(cleanupSql).toContain("cardinality(target_ids) <> expected_count");
    expect(cleanupSql).toContain("live_nonempty_count <> expected_count");
    expect(cleanupSql).toContain("matched_nonempty_count <> expected_count");
  });

  it("changes only targeted option_value rows and preserves every other column", () => {
    const businessUpdate = cleanupSql.match(
      /update public\.admin_condition_template_values as value\s+set option_value = ''[\s\S]*?where value\.id = target\.id[\s\S]*?;/i
    );

    expect(businessUpdate).toHaveLength(1);
    expect(cleanupSql).not.toMatch(/\bdelete\s+from\b/i);
    expect(cleanupSql).toContain(
      "to_jsonb(value) - 'option_value' - 'updated_at' as immutable_business_data"
    );
    expect(cleanupSql).toContain(
      "value.updated_at is distinct from snapshot.updated_at"
    );
    expect(cleanupSql).toContain(
      "is distinct from snapshot.immutable_business_data"
    );
  });

  it("uses a race-free timestamp-trigger window and validates final enforcement", () => {
    expect(cleanupSql).toContain(
      "lock table public.admin_condition_template_values in access exclusive mode nowait;"
    );
    expect(cleanupSql).toContain(
      "disable trigger set_admin_condition_template_values_updated_at"
    );
    expect(cleanupSql.match(
      /enable trigger set_admin_condition_template_values_updated_at/g
    )).toHaveLength(2);
    expect(cleanupSql).toContain(
      "validate constraint admin_condition_template_values_canonical_option_check"
    );
    expect(cleanupSql.trimStart()).toMatch(/^--[\s\S]*?\bbegin;/i);
    expect(cleanupSql.trimEnd()).toMatch(/commit;$/i);
  });
});
