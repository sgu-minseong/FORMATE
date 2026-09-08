import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSashConditionMappingPayload } from "../sashConditionApi";
import { buildSashOptionValuePayload, SASH_OPTION_KINDS } from "../sashOptionApi";
import { moveSashCondition } from "../SashConditionControl";
import { resolveSashOptionValue } from "../SashOptionSelect";

const conditionApiSource = readFileSync(new URL("../sashConditionApi.js", import.meta.url), "utf8");
const optionApiSource = readFileSync(new URL("../sashOptionApi.js", import.meta.url), "utf8");
const conditionControlSource = readFileSync(new URL("../SashConditionControl.jsx", import.meta.url), "utf8");
const optionSelectSource = readFileSync(new URL("../SashOptionSelect.jsx", import.meta.url), "utf8");
const catalogGridSource = readFileSync(new URL("../SashCatalogGrid.jsx", import.meta.url), "utf8");
const appStylesSource = readFileSync(new URL("../../../styles/appStyles.js", import.meta.url), "utf8");

describe("sash condition and option contracts", () => {
  it("keeps sash condition identity company-scoped and independent from estimate conditions", () => {
    expect(conditionApiSource).toContain('.from("sash_conditions")');
    expect(conditionApiSource).toContain('.from("sash_condition_entries")');
    expect(conditionApiSource).toContain('.eq("company_id"');
    expect(conditionApiSource).not.toMatch(/pyeong|build_type|has_extension|condition_variant|occupancy/i);
    expect(conditionApiSource).not.toContain(".delete(");
  });

  it("maps one construction subitem to one catalog UUID without fake values", () => {
    expect(buildSashConditionMappingPayload({
      companyId: "company-a",
      sashConditionId: "condition-a",
      constructionSubitemId: "living-room",
      sashCatalogEntryId: "catalog-a",
    })).toEqual({
      company_id: "company-a",
      sash_condition_id: "condition-a",
      construction_subitem_id: "living-room",
      sash_catalog_entry_id: "catalog-a",
      sort_order: 0,
      archived_at: null,
    });
    expect(conditionApiSource).toContain('onConflict: "sash_condition_id,construction_subitem_id"');
    expect(conditionApiSource).toContain('sash_catalog_entry:sash_catalog_entries(');
    expect(conditionApiSource).toContain('sash_price:sash_prices!sash_catalog_entries_company_sash_price_fkey(');
    expect(conditionApiSource).toContain('.update({ archived_at: new Date().toISOString() })');
  });

  it("reorders conditions without changing their stable IDs", () => {
    const reordered = moveSashCondition([
      { id: "a", name: "기본", sort_order: 0 },
      { id: "b", name: "전체창", sort_order: 1 },
    ], "b", "a");
    expect(reordered).toEqual([
      { id: "b", name: "전체창", sort_order: 0 },
      { id: "a", name: "기본", sort_order: 1 },
    ]);
  });

  it("uses a compact same-surface condition manager and accessible contextual help", () => {
    expect(conditionControlSource).toContain("샷시 조건");
    expect(conditionControlSource).toContain('role="tooltip"');
    expect(conditionControlSource).toContain("전체 견적 조건과는 별도로 적용됩니다.");
    expect(conditionControlSource).toContain('role="combobox"');
    expect(conditionControlSource).toContain('role="listbox"');
    expect(conditionControlSource).toContain("onCreate");
    expect(conditionControlSource).toContain("onRename");
    expect(conditionControlSource).toContain("onReorder");
    expect(conditionControlSource).toContain("onArchive");
    expect(conditionControlSource).toContain("draggable=");
    expect(conditionControlSource).not.toMatch(/drawer|modal/i);
  });

  it("keeps blank distinct from explicit none options", () => {
    const options = [{
      id: "gas-none",
      option_kind: SASH_OPTION_KINDS.GAS,
      label: "없음",
      semantic_value: null,
      archived_at: null,
    }];
    expect(resolveSashOptionValue(options, "")).toBeNull();
    expect(resolveSashOptionValue(options, "없음")).toBe(options[0]);
    expect(optionSelectSource).toContain("onChange?.(null)");
    expect(optionSelectSource).toContain('value === "unspecified" ? "" : value');
    expect(optionSelectSource).toContain("미지정");
  });

  it("keeps an archived referenced window label while excluding it from new choices", () => {
    const options = [
      {
        id: "custom-double",
        option_kind: SASH_OPTION_KINDS.WINDOW_TYPE,
        label: "이중 시스템창",
        semantic_value: "double",
        archived_at: "2026-09-01T00:00:00Z",
      },
      {
        id: "default-double",
        option_kind: SASH_OPTION_KINDS.WINDOW_TYPE,
        label: "2중창",
        semantic_value: "double",
        archived_at: null,
      },
    ];
    expect(resolveSashOptionValue(options, "double", "custom-double")).toBe(options[0]);
    expect(optionSelectSource).toContain("resolveSashOptionValue(scopedOptions, controlledValue, optionId)");
  });

  it("resolves reused labels only inside the current option kind", () => {
    const options = [
      { id: "screen", option_kind: "screen", label: "일반", archived_at: null },
      { id: "glass", option_kind: "glass_type", label: "일반", archived_at: null },
    ];
    const glassOptions = options.filter((option) => option.option_kind === "glass_type");

    expect(resolveSashOptionValue(glassOptions, "일반")).toBe(options[1]);
    expect(optionSelectSource).toContain("const scopedOptions = options.filter");
  });

  it("requires explicit single/double semantics for custom window labels", () => {
    const payload = buildSashOptionValuePayload({
      companyId: "company-a",
      optionKind: SASH_OPTION_KINDS.WINDOW_TYPE,
      label: "이중 시스템창",
      semanticValue: "double",
    });
    expect(payload).toMatchObject({
      option_kind: "window_type",
      label: "이중 시스템창",
      semantic_value: "double",
    });
    expect(() => buildSashOptionValuePayload({
      companyId: "company-a",
      optionKind: SASH_OPTION_KINDS.WINDOW_TYPE,
      label: "의미 없는 창",
    })).toThrow("단창 또는 2중창");
    expect(optionSelectSource).toContain('<option value="single">단창 ×1</option>');
    expect(optionSelectSource).toContain('<option value="double">2중창 ×2</option>');
  });

  it("keeps option data isolated by company and kind without legacy backfill", () => {
    expect(optionApiSource).toContain('.from("sash_option_values")');
    expect(optionApiSource).toContain('.eq("company_id"');
    expect(optionApiSource).toContain('.eq("option_kind"');
    expect(optionApiSource).not.toContain(".delete(");
    expect(optionApiSource).not.toMatch(/distinct|backfill|sash_catalog_entries/i);
    expect(optionSelectSource).toContain("onChange?.(option)");
    expect(optionSelectSource).toContain("옵션 추가");
    expect(optionApiSource).toContain("renameSashOptionValue");
    expect(optionApiSource).toContain("archiveSashOptionValue");
    expect(optionApiSource).toContain('.update({ label: requireText(label');
    expect(optionSelectSource).toContain("OptionManageRow");
    expect(optionSelectSource).toContain("onRename");
    expect(optionSelectSource).toContain("onArchive");
    expect(optionSelectSource).toContain("옵션 관리");
    expect(optionSelectSource).toContain('title="삭제"');
  });

  it("renders only the unique condition mapping as checked and explains the action", () => {
    expect(catalogGridSource).toContain('row.id === conditionEntryId');
    expect(catalogGridSource).toContain('{selected && <Check');
    expect(catalogGridSource).toContain('label: "조건 적용"');
    expect(catalogGridSource).toContain('ariaLabel: "현재 샷시 조건 적용 규격"');
  });

  it("ports the option menu out of table overflow without changing the table scroll owner", () => {
    expect(optionSelectSource).toContain('import { createPortal } from "react-dom"');
    expect(optionSelectSource).toContain("createPortal(popover, document.body)");
    expect(optionSelectSource).toContain("popoverRef.current?.contains(event.target)");
    expect(optionSelectSource).toContain('window.addEventListener("scroll", positionPopover, true)');
    expect(optionSelectSource).toContain('event.key === "Escape"');
    expect(optionSelectSource).toContain("onClick={() => selectOption(option)}");
    expect(optionSelectSource).toContain("옵션 추가");
    expect(optionSelectSource).toContain("취소");
    expect(appStylesSource).toContain(".sash-option-select__popover {");
    expect(appStylesSource).toMatch(/\.sash-option-select__popover \{[\s\S]*?position: fixed;/);
    expect(appStylesSource).not.toMatch(/\.ui-table-scroll\s*\{[^}]*overflow:\s*visible/);
  });

  it("routes every sash option kind through the same floating selector", () => {
    for (const kind of [
      "SCREEN",
      "GLASS_TYPE",
      "GAS",
      "GLASS_THICKNESS",
      "HANDLE_TYPE",
      "WINDOW_COUNT",
      "WINDOW_TYPE",
    ]) {
      expect(catalogGridSource).toContain(`SASH_OPTION_KINDS.${kind}`);
    }
    expect(catalogGridSource.match(/<SashOptionSelect/g)).toHaveLength(2);
  });
});
