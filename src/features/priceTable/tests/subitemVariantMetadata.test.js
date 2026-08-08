import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONSTRUCTION_SUBITEM_VARIANT_KINDS,
  buildStableSubitemSections,
  buildStableSubitemVariantModel,
  formatConstructionSubitemVariantLabel,
  getConstructionSubitemVariantMetadata,
  resolveStableSubitemVariant,
} from "../subitemVariantModel";

const groups = [
  {
    id: "kcc-group",
    construction_item_id: "flooring-item",
    display_name: "KCC장판",
    base_subitem_id: "standard-subitem",
    variant_kind: CONSTRUCTION_SUBITEM_VARIANT_KINDS.THICKNESS,
    sort_order: 1,
  },
  {
    id: "lx-group",
    construction_item_id: "flooring-item",
    display_name: "LX장판",
    variant_kind: CONSTRUCTION_SUBITEM_VARIANT_KINDS.THICKNESS,
    sort_order: 2,
  },
];

const subitems = [
  {
    id: "kcc-22",
    item_id: "flooring-item",
    name: "표시명은 관계 판정에 사용하지 않음 A",
    variant_group_id: "kcc-group",
    variant_value: "2.2",
    variant_unit: "T",
    sort_order: 2,
  },
  {
    id: "kcc-18",
    item_id: "flooring-item",
    name: "표시명은 관계 판정에 사용하지 않음 B",
    variant_group_id: "kcc-group",
    variant_value: 1.8,
    variant_unit: "T",
    sort_order: 1,
  },
  {
    id: "lx-18",
    item_id: "flooring-item",
    name: "같은 두께의 다른 제품",
    variant_group_id: "lx-group",
    variant_value: 1.8,
    variant_unit: "T",
  },
  {
    id: "standard-subitem",
    item_id: "flooring-item",
    name: "일반 항목",
    variant_group_id: null,
    variant_value: null,
    variant_unit: null,
  },
];

describe("stable construction subitem variant metadata", () => {
  it("groups renamed subitems only by stable group metadata", () => {
    const result = buildStableSubitemVariantModel({ subitems, variantGroups: groups });

    expect(result.groups.map((group) => group.id)).toEqual(["kcc-group", "lx-group"]);
    expect(result.groups[0].variants.map((variant) => variant.subitemId)).toEqual(["kcc-18", "kcc-22"]);
    expect(result.groups[0].baseSubitemId).toBe("standard-subitem");
    expect(result.groups[1].variants.map((variant) => variant.subitemId)).toEqual(["lx-18"]);
    expect(result.ungroupedSubitems.map((subitem) => subitem.id)).toEqual(["standard-subitem"]);
  });

  it("keeps standard and incomplete metadata on the existing ungrouped path", () => {
    expect(getConstructionSubitemVariantMetadata(subitems[3])).toBeNull();
    expect(getConstructionSubitemVariantMetadata({
      variant_group_id: "kcc-group",
      variant_value: 1.8,
      variant_unit: null,
    })).toBeNull();
  });

  it("builds one stable section per group and suppresses only its explicit base subitem", () => {
    const sections = buildStableSubitemSections({ subitems, variantGroups: groups });

    expect(sections.map((section) => section.id)).toEqual([
      "variant-group:kcc-group",
      "variant-group:lx-group",
    ]);
    expect(sections[0]).toMatchObject({
      kind: "variant-group",
      label: groups[0].display_name,
      groupId: "kcc-group",
    });
    expect(sections[0].variants.map((variant) => variant.subitemId)).toEqual(["kcc-18", "kcc-22"]);
    expect(formatConstructionSubitemVariantLabel(2, "T")).toBe("2T");
    expect(formatConstructionSubitemVariantLabel(2.2, "T")).toBe("2.2T");
  });

  it("resolves equal thicknesses without mixing product groups", () => {
    expect(resolveStableSubitemVariant(subitems, {
      groupId: "kcc-group",
      value: "1.8",
      unit: "T",
    })?.id).toBe("kcc-18");
    expect(resolveStableSubitemVariant(subitems, {
      groupId: "lx-group",
      value: 1.8,
      unit: "T",
    })?.id).toBe("lx-18");
  });

  it("defines an additive SQL contract without legacy name backfill", () => {
    const sql = fs.readFileSync(path.resolve(
      process.cwd(),
      "supabase/construction_subitem_variant_foundation.sql"
    ), "utf8");

    expect(sql).toContain("create table if not exists public.construction_subitem_variant_groups");
    expect(sql).toContain("add column if not exists variant_group_id uuid");
    expect(sql).toContain("add column if not exists variant_value numeric(12, 4)");
    expect(sql).toContain("add column if not exists variant_unit text");
    expect(sql).toContain("foreign key (variant_group_id, item_id)");
    expect(sql).toContain("construction_subitems_variant_metadata_complete_check");
    expect(sql).toContain("construction_subitems_variant_identity_uidx");
    expect(sql).not.toMatch(/update\s+public\.construction_subitems/i);
    expect(sql).not.toMatch(/delete\s+from/i);
  });

  it("keeps the explicit flooring backfill scoped to supplied IDs and separate companies", () => {
    const sql = fs.readFileSync(path.resolve(
      process.cwd(),
      "supabase/backfill_flooring_thickness_variant_groups.sql"
    ), "utf8");

    expect(sql).toContain("b3e072d8-4656-47a5-b8e6-3ceb093c4113");
    expect(sql).toContain("00000000-0000-4000-8000-000000000001");
    expect(sql).toContain("c0668dfe-0b35-4745-b8f5-bc1720718f99");
    expect(sql).toContain("798437e8-54e5-41e1-a68b-bfed3f37c44e");
    expect(sql).toContain("8bc4eae5-7ded-4406-8fb8-c94760aa5a4c");
    expect(sql).toContain("5a8b1863-fae7-4679-bc0c-1578088c1379");
    expect(sql).toContain("cf196843-c252-4675-a8a8-f80ddf13c6e2");
    expect(sql).toContain("215eea80-2769-478e-b8b9-e0beac943969");
    expect(sql).toContain("Base rows must remain standard rows");
    expect(sql).not.toMatch(/where\s+[^\n]*\.name\s*=/i);
    expect(sql).not.toMatch(/update\s+public\.construction_subitems\s+as\s+subitem\s+set\s+name/i);
    expect(sql).not.toMatch(/delete\s+from/i);

    const groupSeed = sql.slice(
      sql.indexOf("insert into formate_variant_group_seed"),
      sql.indexOf("create temporary table formate_variant_value_seed")
    );
    const mappingSeed = sql.slice(
      sql.indexOf("insert into formate_variant_value_seed"),
      sql.indexOf("create temporary table formate_base_subitem_seed")
    );
    const groupIds = [...groupSeed.matchAll(/^\s*\('([0-9a-f-]{36})'/gim)].map((match) => match[1]);
    const mappingGroupIds = [...mappingSeed.matchAll(/^\s*\('[0-9a-f-]{36}',\s*'([0-9a-f-]{36})'/gim)]
      .map((match) => match[1]);

    expect(mappingGroupIds).toHaveLength(80);
    expect([...new Set(mappingGroupIds)].sort()).toEqual([...groupIds].sort());
  });

  it("defines explicit base-subitem mappings without display-name lookup", () => {
    const sql = fs.readFileSync(path.resolve(
      process.cwd(),
      "supabase/construction_subitem_variant_base_foundation.sql"
    ), "utf8");

    expect(sql).toContain("add column if not exists base_subitem_id uuid");
    expect(sql).toContain("foreign key (base_subitem_id, construction_item_id)");
    expect(sql).toContain("formate_validate_construction_subitem_variant_group_base");
    expect(sql).toContain("formate_prevent_variant_metadata_on_group_base_subitem");
    expect(sql).toContain("f41d14e7-c091-4bab-9b9c-50b95d6245af");
    expect(sql).toContain("215eea80-2769-478e-b8b9-e0beac943969");
    expect(sql).toContain("e6373d17-abf0-4a24-b349-f8d2517b3565");
    expect(sql).toContain("4e7a077c-48f4-4d85-8da4-794de69b74d7");
    expect(sql).toContain("b9ca4776-74f2-4e5f-99af-8462aac6c237");
    expect(sql).toContain("ee09a802-fb12-4bd8-8c10-3f26345b6f96");
    expect(sql).not.toMatch(/where\s+[^\n]*\.name\s*=/i);
    expect(sql).not.toMatch(/delete\s+from/i);
  });
});
