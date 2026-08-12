import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL(
    "../../../../supabase/canonical_variant_legacy_standalone_sampung_thickness_consolidation.sql",
    import.meta.url
  ),
  "utf8"
).replace(/\r\n/g, "\n");

const section = (start, end) => sql.slice(
  sql.indexOf(start) + start.length,
  sql.indexOf(end)
);

describe("Sampung flooring thickness exact consolidation SQL", () => {
  it("pins the tenant/item and exact legacy UUID seed", () => {
    const seed = section(
      "-- BEGIN EXACT LEGACY SUBITEM SEED (171 UUIDs)",
      "-- END EXACT LEGACY SUBITEM SEED"
    );
    const rows = [...seed.matchAll(
      /\('c\d{2}',\s+(?:'[0-9a-f-]{36}'::uuid|null::uuid),\s+'([0-9a-f-]{36})'::uuid\)/g
    )];
    const ids = rows.map((match) => match[1]);

    expect(ids).toHaveLength(171);
    expect(new Set(ids)).toHaveLength(171);
    expect(sql).toContain("'b3e072d8-4656-47a5-b8e6-3ceb093c4113'::uuid");
    expect(sql).toContain("'e76e94b0-e459-4005-9072-045d72f2ca8f'::uuid");
    expect(sql).toContain("<> 168");
    expect(sql).toContain("<> 3");
  });

  it("pins exactly 336 approved Template UUIDs and a set fingerprint", () => {
    const seed = section(
      "-- BEGIN EXACT TEMPLATE DELETE SEED (336 UUIDs)",
      "-- END EXACT TEMPLATE DELETE SEED"
    );
    const ids = [...seed.matchAll(/\('([0-9a-f-]{36})'::uuid\)/g)]
      .map((match) => match[1]);

    expect(ids).toHaveLength(336);
    expect(new Set(ids)).toHaveLength(336);
    expect(sql).toContain("0b00fd9fd1a278859ac5f01dc8fc13d3");
    expect(sql).toContain("expected exactly 336 Template duplicate deletes");
    expect(sql).toContain("complete_business_payload_equal");
    expect(sql).toContain("an inbound FK now references Template value rows");
    expect(sql).toContain("six non-duplicate Template rows must remain preserved");
  });

  it("uses only the two explicitly authorized public mutation shapes", () => {
    const publicUpdates = [...sql.matchAll(/update public\.([a-z0-9_]+)/gi)]
      .map((match) => match[1]);
    const publicDeletes = [...sql.matchAll(/delete from public\.([a-z0-9_]+)/gi)]
      .map((match) => match[1]);

    expect(new Set(publicUpdates)).toEqual(new Set(["construction_subitems"]));
    expect(publicUpdates).toHaveLength(2);
    expect(publicDeletes).toEqual(["admin_condition_template_values"]);
    expect(sql).not.toMatch(/delete from public\.construction_subitems/i);
    expect(sql).not.toMatch(/update public\.(estimates|estimate_versions|photos|price_conditions)/i);
    expect(sql).not.toMatch(/delete from public\.(estimates|estimate_versions|photos|price_conditions)/i);
    expect(sql).toContain("set archived_at = archive_timestamp");
  });

  it("guarantees the six official commercial values by survivor UUID", () => {
    const officialRows = [
      ["6ede4b59-4886-44ee-952a-9a6b8130aa6e", 47000, 11000],
      ["805d77ce-af5f-4e44-ab2e-1fd49ec4bdbb", 80000, 13000],
      ["8b516481-6e63-4b24-993a-971f46fe377c", 90000, 16000],
      ["dfee6e98-d20e-4ce5-82f3-9949091e5fb4", 47000, 11000],
      ["bb3eb27f-321c-4cd6-8403-90c52707964e", 90000, 13000],
      ["798437e8-54e5-41e1-a68b-bfed3f37c44e", 100000, 16000],
    ];

    for (const [id, unitPrice, laborRate] of officialRows) {
      expect(sql).toMatch(new RegExp(
        `'${id}'::uuid, '[0-9a-f]{32}',\\s+${unitPrice}, ${laborRate}`
      ));
    }
    expect(sql).toContain("expected exactly two canonical commercial updates");
    expect(sql).toContain("labor_rate_empty = official.official_labor_rate");
    expect(sql).toContain("labor_rate_occupied = official.official_labor_rate");
  });

  it("fails closed on row/value/reference drift and protects outside rows", () => {
    expect(sql).toContain("set transaction isolation level serializable;");
    expect(sql).toContain("a legacy row/value/reference fingerprint changed");
    expect(sql).toContain("a canonical group or survivor fingerprint changed");
    expect(sql).toContain("a Template row outside the exact DELETE set changed");
    expect(sql).toContain("a construction_subitems row outside the exact mutation set changed");
    expect(sql).toContain("a protected reference/history relation appeared during migration");
    expect(sql).toContain("variant_group_id is null) <> 188");
    expect(sql).toContain("variant_group_id is null) <> 17");
    expect(sql).toContain(")) <> 185");
    expect(sql).toContain(")) <> 14");
    expect(sql).toContain("expected_active_photo_products");
    expect(sql).toContain("20::integer as expected_active_photo_products");
    expect(sql.trimEnd().endsWith("commit;")).toBe(true);
  });

  it("does not use presentation strings as mutation identity", () => {
    expect(sql).not.toContain("regexp_match");
    expect(sql).not.toMatch(/\b(name|display_name)\s*(=|like|ilike)\b/i);
    expect(sql).not.toMatch(/\b(KCC|LG)\b/);
    expect(sql).not.toMatch(/\b[0-9]+(?:\.[0-9]+)?T\b/);
    expect(sql).toContain("Mutation identity is exact UUID only");
  });
});
