import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createSashSpecSnapshot,
  getSashBillableArea,
  getSashCatalogEntryAmount,
  normalizeSashCatalogEntry,
} from "../sashCatalogModel";
import {
  buildSharedPriceExpectedGroups,
  buildSharedPriceExpectedRows,
  classifySashPriceCandidate,
  compareSashPriceSpec,
  hasSashPriceCandidateAnchor,
  SASH_PRICE_COMPARISON,
  SASH_PRICE_MATCH,
} from "../sharedSashPriceModel";

const migrationSource = readFileSync(
  new URL("../../../../supabase/migrations/202609081000_gate5_shared_sash_price.sql", import.meta.url),
  "utf8"
);
const preflightSource = readFileSync(
  new URL("../../../../supabase/preflight/202609080900_gate5_shared_sash_price.sql", import.meta.url),
  "utf8"
);
const apiSource = readFileSync(new URL("../sharedSashPriceApi.js", import.meta.url), "utf8");
const catalogApiSource = readFileSync(new URL("../sashCatalogApi.js", import.meta.url), "utf8");
const conditionApiSource = readFileSync(new URL("../sashConditionApi.js", import.meta.url), "utf8");
const gridSource = readFileSync(new URL("../SashCatalogGrid.jsx", import.meta.url), "utf8");
const dialogSource = readFileSync(new URL("../SashPriceImpactDialog.jsx", import.meta.url), "utf8");

const source = {
  id: "source",
  company_id: "company-a",
  construction_subitem_id: "living-room",
  brand: " KCC ",
  frame_spec: "140mm",
  pair_spec: "24mm",
  glass_spec: "로이",
  glass_thickness: "24mm",
  gas_spec: "아르곤",
  screen_spec: "미세망",
  width_mm: 4000,
  height_mm: 2400,
  window_type: "double",
  pricing_basis: "area",
  unit_price: 120000,
  updated_at: "2026-09-08T00:00:00Z",
};

describe("Gate 5 shared Sash price domain", () => {
  it("requires the physical W/H/window-type anchor and ignores context fields", () => {
    expect(hasSashPriceCandidateAnchor(source)).toBe(true);
    expect(hasSashPriceCandidateAnchor({ ...source, width_mm: null })).toBe(false);
    expect(hasSashPriceCandidateAnchor({ ...source, height_mm: "" })).toBe(false);
    expect(hasSashPriceCandidateAnchor({ ...source, window_type: "unspecified" })).toBe(false);

    expect(classifySashPriceCandidate(source, {
      ...source,
      id: "candidate",
      pyeong: 54,
      build_type: "구축",
      condition_variant: "구축확장",
      sash_category: "balcony",
      measurement_kind: "measured",
      handle_type: "매립형",
      window_count: "4짝",
      is_pinned: true,
      usage_count: 99,
    })?.classification).toBe(SASH_PRICE_MATCH.HIGH);
  });

  it("uses conservative trimmed text equality without fuzzy normalization", () => {
    expect(classifySashPriceCandidate(source, {
      ...source,
      id: "trimmed",
      brand: "KCC",
    })?.classification).toBe(SASH_PRICE_MATCH.HIGH);
    expect(classifySashPriceCandidate(source, {
      ...source,
      id: "internal-space",
      brand: "K C C",
    })?.classification).toBe(SASH_PRICE_MATCH.SPEC_DIFFERENCE);
  });

  it("classifies one-sided optional blanks as partial without making a decision", () => {
    const candidate = { ...source, id: "partial", screen_spec: "" };
    const result = classifySashPriceCandidate(source, candidate);
    expect(result.classification).toBe(SASH_PRICE_MATCH.PARTIAL);
    expect(result.comparisons.find(({ key }) => key === "screen_spec")?.status)
      .toBe(SASH_PRICE_COMPARISON.CANDIDATE_MISSING);
    expect(compareSashPriceSpec(
      { ...source, screen_spec: "" },
      { ...source, screen_spec: "미세망" }
    ).find(({ key }) => key === "screen_spec")?.status)
      .toBe(SASH_PRICE_COMPARISON.SOURCE_MISSING);
    expect(candidate).not.toHaveProperty("sash_price_id");
  });

  it("classifies populated conflicts as spec differences and retains original values", () => {
    const result = classifySashPriceCandidate(source, {
      ...source,
      id: "different",
      glass_thickness: "22mm",
    });
    expect(result.classification).toBe(SASH_PRICE_MATCH.SPEC_DIFFERENCE);
    expect(result.comparisons.find(({ key }) => key === "glass_thickness"))
      .toMatchObject({
        candidateValue: "22mm",
        sourceValue: "24mm",
        status: SASH_PRICE_COMPARISON.DIFFERENT,
      });
    expect(compareSashPriceSpec(
      { ...source, gas_spec: "" },
      { ...source, gas_spec: "" }
    ).find(({ key }) => key === "gas_spec")?.status).toBe(SASH_PRICE_COMPARISON.BOTH_MISSING);
    expect(classifySashPriceCandidate(
      { ...source, gas_spec: "" },
      { ...source, id: "both-missing", gas_spec: "" }
    )?.classification).toBe(SASH_PRICE_MATCH.PARTIAL);
  });

  it("reads only a linked shared price while preserving an unlinked legacy price", () => {
    const linked = normalizeSashCatalogEntry({
      ...source,
      sash_price_id: "price-a",
      unit_price: 70000,
      sash_price: {
        id: "price-a",
        unit_price: 135000,
        updated_at: "2026-09-08T01:00:00Z",
      },
    });
    const unlinked = normalizeSashCatalogEntry({ ...source, unit_price: 70000 });
    expect(linked.unit_price).toBe(135000);
    expect(unlinked.unit_price).toBe(70000);
    expect(getSashCatalogEntryAmount(linked)).toBe(getSashBillableArea(linked) * 135000);
  });

  it("keeps numeric estimate snapshots and optional shared-price provenance", () => {
    const snapshot = createSashSpecSnapshot(normalizeSashCatalogEntry({
      ...source,
      sash_price_id: "price-a",
      unit_price: 70000,
      sash_price: { id: "price-a", unit_price: 135000 },
    }));
    expect(snapshot).toMatchObject({
      sash_catalog_entry_id: "source",
      sash_price_id: "price-a",
      unit_price: 135000,
      calculated_amount: getSashBillableArea(source) * 135000,
    });
  });

  it("builds exact stale-write snapshots for every displayed row", () => {
    expect(buildSharedPriceExpectedRows([
      source,
      source,
      { ...source, id: "candidate", sash_price_id: "price-b" },
    ])).toEqual([
      { id: "source", sash_price_id: null, updated_at: source.updated_at },
      { id: "candidate", sash_price_id: "price-b", updated_at: source.updated_at },
    ]);
  });

  it("snapshots every selected existing price group, including a move source", () => {
    expect(buildSharedPriceExpectedGroups([
      {
        ...source,
        sash_price_id: "price-a",
        sash_price: { id: "price-a", updated_at: "2026-09-08T01:00:00Z" },
      },
      {
        ...source,
        id: "same-group-member",
        sash_price_id: "price-a",
        sash_price: { id: "price-a", updated_at: "2026-09-08T01:00:00Z" },
      },
      {
        ...source,
        id: "move-candidate",
        sash_price_id: "price-b",
        sash_price: { id: "price-b", updated_at: "2026-09-08T02:00:00Z" },
      },
    ])).toEqual([
      { id: "price-a", updated_at: "2026-09-08T01:00:00Z" },
      { id: "price-b", updated_at: "2026-09-08T02:00:00Z" },
    ]);
  });

  it("changes the confirmation snapshot when only a candidate group's price changes", () => {
    const candidate = {
      ...source,
      id: "move-candidate",
      sash_price_id: "price-b",
      sash_price: { id: "price-b", updated_at: "2026-09-08T02:00:00Z" },
    };
    expect(buildSharedPriceExpectedGroups([candidate])).toEqual([
      { id: "price-b", updated_at: "2026-09-08T02:00:00Z" },
    ]);
    expect(buildSharedPriceExpectedGroups([{
      ...candidate,
      sash_price: { ...candidate.sash_price, updated_at: "2026-09-08T03:00:00Z" },
    }])).toEqual([
      { id: "price-b", updated_at: "2026-09-08T03:00:00Z" },
    ]);
  });
});

describe("Gate 5 shared Sash price persistence contract", () => {
  it("adds one canonical price owner and nullable one-to-many membership without backfill", () => {
    expect(migrationSource).toContain("create table if not exists public.sash_prices");
    expect(migrationSource).toContain("add column if not exists sash_price_id uuid");
    expect(migrationSource).toContain("foreign key (company_id, sash_price_id)");
    expect(migrationSource).toContain("references public.sash_prices(company_id, id)");
    expect(migrationSource).not.toMatch(/insert\s+into\s+public\.sash_catalog_entries/i);
    expect(migrationSource).not.toMatch(/update\s+public\.estimates|delete\s+from\s+public\.estimates/i);
  });

  it("keeps price and membership changes atomic, explicit, scoped, and stale-safe", () => {
    expect(migrationSource).toContain("create or replace function public.apply_shared_sash_price");
    expect(migrationSource).toContain("security definer");
    expect(migrationSource).toContain("company_member.user_id = auth.uid()");
    expect(migrationSource).toContain("p_confirm_group_moves");
    expect(migrationSource).toContain("requires confirmation");
    expect(migrationSource).toContain("p_expected_price_groups jsonb");
    expect(migrationSource).toContain("p_expected_rows");
    expect(migrationSource).toContain("errcode = '40001'");
    expect(migrationSource).toContain("set unit_price = previous_unit_price");
    expect(migrationSource).toContain("sash_price_id = null");
    expect(migrationSource).not.toMatch(
      /update\s+public\.sash_catalog_entries[\s\S]{0,160}set\s+unit_price\s*=\s*p_unit_price/i
    );
  });

  it("rejects incomplete sources and every cross-anchor selected membership in the RPC", () => {
    expect(migrationSource).toContain("source_entry.width_mm is null");
    expect(migrationSource).toContain("source_entry.width_mm <= 0");
    expect(migrationSource).toContain("source_entry.height_mm is null");
    expect(migrationSource).toContain("source_entry.height_mm <= 0");
    expect(migrationSource).toContain("source_entry.window_type is null");
    expect(migrationSource).toContain("source_entry.window_type not in ('single', 'double')");
    expect(migrationSource).toContain(
      "catalog_entry.width_mm is distinct from source_entry.width_mm"
    );
    expect(migrationSource).toContain(
      "catalog_entry.height_mm is distinct from source_entry.height_mm"
    );
    expect(migrationSource).toContain(
      "catalog_entry.window_type is distinct from source_entry.window_type"
    );
  });

  it("does not reject user-confirmed optional specification differences", () => {
    for (const field of [
      "brand",
      "frame_spec",
      "pair_spec",
      "glass_spec",
      "glass_thickness",
      "gas_spec",
      "screen_spec",
    ]) {
      expect(migrationSource).not.toContain(
        `catalog_entry.${field} is distinct from source_entry.${field}`
      );
    }
  });

  it("locks and stale-checks source and selected candidate price groups", () => {
    expect(migrationSource).toContain("price.id = source_entry.sash_price_id");
    expect(migrationSource).toContain("catalog_entry.id = any(p_selected_entry_ids)");
    expect(migrationSource).toContain("order by price.id");
    expect(migrationSource).toContain("for update;");
    expect(migrationSource).toContain("full join expected_groups using (id)");
    expect(migrationSource).toContain(
      "price.updated_at is distinct from expected_groups.updated_at"
    );
    expect(migrationSource).toContain("actual_groups.id is null");
    expect(migrationSource).toContain("expected_groups.id is null");
  });

  it("denies browser price mutation and direct cross-company membership", () => {
    expect(migrationSource).toContain("revoke all on table public.sash_prices from authenticated");
    expect(migrationSource).toContain("grant select on table public.sash_prices to authenticated");
    expect(migrationSource).toContain("revoke all on table public.sash_prices from anon");
    expect(migrationSource).toContain("formate_validate_sash_price_membership");
    expect(migrationSource).toContain("price_company_id is distinct from new.company_id");
    expect(migrationSource).toContain("Linked catalog unit_price is not the canonical shared price");
  });

  it("rejects linked hard-anchor drift but leaves optional specification edits alone", () => {
    expect(migrationSource).toContain("new.width_mm is distinct from old.width_mm");
    expect(migrationSource).toContain("new.height_mm is distinct from old.height_mm");
    expect(migrationSource).toContain("new.window_type is distinct from old.window_type");
    expect(migrationSource).toContain(
      "Detach the shared Sash price before changing width, height, or window type."
    );
    expect(migrationSource).toMatch(
      /update of\s+company_id,\s+sash_price_id,\s+unit_price,\s+width_mm,\s+height_mm,\s+window_type/
    );
    expect(migrationSource).not.toContain("new.brand is distinct from old.brand");
    expect(migrationSource).not.toContain("new.glass_spec is distinct from old.glass_spec");
  });

  it("detaches explicitly and preserves the current shared numeric price locally", () => {
    expect(migrationSource).toContain(
      "create or replace function public.detach_shared_sash_price_member"
    );
    expect(migrationSource).toContain("set unit_price = price_group.unit_price");
    expect(migrationSource).toContain("sash_price_id = null");
    expect(migrationSource).toContain("catalog_entry.updated_at is distinct from p_expected_entry_updated_at");
    expect(migrationSource).toContain("price_group.updated_at is distinct from p_expected_price_updated_at");
  });

  it("ships a SELECT-only preflight for Gate 4, prices, tenant scope, and history", () => {
    expect(preflightSource).toContain("to_regclass('public.sash_prices')");
    expect(preflightSource).toContain("active_catalog_rows");
    expect(preflightSource).toContain("catalog_unit_price_baseline");
    expect(preflightSource).toContain("cross_company_subitem_scope");
    expect(preflightSource).toContain("window_option_string_drift");
    expect(preflightSource).toContain("historical_sash_estimates");
    expect(preflightSource).not.toMatch(/\binsert\b|\bupdate\b|\bdelete\b|\balter\b|\bcreate\b/i);
  });
});

describe("Gate 5 shared Sash price HITL contract", () => {
  it("anchors server candidate reads and never auto-links a candidate", () => {
    expect(apiSource).toContain('.eq("width_mm", source.width_mm)');
    expect(apiSource).toContain('.eq("height_mm", source.height_mm)');
    expect(apiSource).toContain('.eq("window_type", source.window_type)');
    expect(apiSource).toContain("hasSashPriceCandidateAnchor(source)");
    expect(apiSource).not.toContain('.update({ sash_price_id');
  });

  it("shows DB-backed condition references and separates facts from recommendations", () => {
    expect(apiSource).toContain('sash_condition:sash_conditions!inner(name, archived_at)');
    expect(dialogSource).toContain("현재 같은 가격을 공유 중");
    expect(dialogSource).toContain("관련 가능성이 있는 샷시");
    expect(dialogSource).toContain("MATCH_LABELS");
    expect(dialogSource).toContain('type="checkbox"');
    expect(dialogSource).toContain("다른 공유 단가");
    expect(dialogSource).toContain("선택한 샷시에 적용");
  });

  it("keeps cancel mutation-free and confirms only selected IDs through the RPC", () => {
    expect(dialogSource).toContain("onClick={onClose}");
    expect(dialogSource).toMatch(/onConfirm\(\s*\[\.\.\.selectedIds\]/);
    expect(gridSource).toContain("applySharedSashPrice({");
    expect(gridSource).toContain("selectedEntryIds,");
    expect(apiSource).toContain('supabase.rpc("apply_shared_sash_price"');
    expect(dialogSource).toContain("buildSharedPriceExpectedGroups");
    expect(apiSource).toContain("p_expected_price_groups: expectedPriceGroups");
    expect(apiSource.match(
      /export async function applySharedSashPrice[\s\S]*?(?=export async function)/
    )?.[0]).not.toContain("p_expected_price_updated_at");
  });

  it("requires explicit detach before hard-anchor editing and can register again afterward", () => {
    expect(gridSource).toContain("detachSharedSashPriceMember({");
    expect(gridSource).toContain("disabled={Boolean(row.sash_price_id)}");
    expect(dialogSource).toContain("현재 규격 공유 해제");
    expect(apiSource).toContain('supabase.rpc("detach_shared_sash_price_member"');
    expect(apiSource).toContain('supabase.rpc("apply_shared_sash_price"');
  });

  it("routes every current read through the shared price and never dual-writes it", () => {
    expect(catalogApiSource).toContain("sash_price:sash_prices!sash_catalog_entries_company_sash_price_fkey");
    expect(conditionApiSource).toContain("sash_price:sash_prices!sash_catalog_entries_company_sash_price_fkey");
    expect(gridSource).toContain("stageUnitPrice");
    expect(gridSource).not.toContain("patchEntry(row.id, {\n                unit_price:");
  });
});
