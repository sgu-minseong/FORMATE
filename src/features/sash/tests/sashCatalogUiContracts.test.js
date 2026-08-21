import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pricePageSource = readFileSync(
  new URL("../../priceTable/PriceTablePage.jsx", import.meta.url),
  "utf8"
);
const adminAppSource = readFileSync(
  new URL("../../../app/AdminApp.jsx", import.meta.url),
  "utf8"
);
const sashApiSource = readFileSync(new URL("../sashCatalogApi.js", import.meta.url), "utf8");
const sashGridSource = readFileSync(new URL("../SashCatalogGrid.jsx", import.meta.url), "utf8");
const sashSectionSource = readFileSync(new URL("../SashCatalogSection.jsx", import.meta.url), "utf8");
const sashSelectorSource = readFileSync(new URL("../SashCatalogSelector.jsx", import.meta.url), "utf8");
const sashDefaultApiSource = readFileSync(new URL("../sashCatalogDefaultApi.js", import.meta.url), "utf8");
const sashEstimateEditorSource = readFileSync(
  new URL("../SashEstimateEditor.jsx", import.meta.url),
  "utf8"
);
const sashSpecialItemsSource = readFileSync(
  new URL("../SashSpecialItemsManager.jsx", import.meta.url),
  "utf8"
);
const designSkillSource = readFileSync(
  new URL("../../../../.codex/skills/formate-design-system.md", import.meta.url),
  "utf8"
);

const priceRowsSource = pricePageSource.slice(
  pricePageSource.indexOf("function renderRows"),
  pricePageSource.indexOf("const item = selectedAdminPriceItem")
);
const templateRowsSource = adminAppSource.slice(
  adminAppSource.indexOf("function renderAdminItemsRows"),
  adminAppSource.indexOf("function renderAdminTemplateConditionDrawer")
);
const templateWorkbenchSource = adminAppSource.slice(
  adminAppSource.indexOf("function renderAdminItemsWorkbench"),
  adminAppSource.indexOf("async function saveAdminPrices")
);

describe("specialized sash editor UI contracts", () => {
  it("uses the same sash section and editor in price table and template management", () => {
    expect(priceRowsSource).toContain("<SashCatalogSection");
    expect(templateRowsSource).toContain("<SashCatalogSection");
    expect(priceRowsSource).not.toContain("<SashCatalogGrid");
    expect(templateRowsSource).not.toContain("<SashCatalogGrid");
    expect(priceRowsSource).not.toContain("onSubitemLocationKindChange");
    expect(templateRowsSource).not.toContain("onSubitemLocationKindChange");
    expect(sashSectionSource).toContain("<SashCatalogGrid");
    expect(sashSectionSource).not.toContain('mode="priceTable"');
    expect(sashSectionSource).not.toContain('mode="template"');
  });

  it("keeps canonical products condition-independent while managing a pyeong-only pin", () => {
    expect(templateWorkbenchSource).toContain("<TemplateConditionSwitcher");
    expect(sashSectionSource).toContain("initialDefaultPyeong={pyeong}");
    expect(sashGridSource).toContain("PYEONG_OPTIONS");
    expect(sashGridSource).toContain("fetchSashCatalogPin");
    expect(sashGridSource).toContain("upsertSashCatalogPin");
    expect(sashGridSource).toContain("togglePinnedEntry");
    expect(sashGridSource).not.toContain("기본제품");
    expect(sashDefaultApiSource).toContain("company_id,pyeong,construction_subitem_id");
    expect(sashDefaultApiSource).not.toContain("sash_category");
    expect(sashDefaultApiSource).not.toMatch(/build_type|condition_variant|occupancy|extension/i);
  });

  it("shows category tabs inside the expanded editor with active catalog counts", () => {
    expect(sashSectionSource).toContain("<span>세부 항목</span>");
    expect(sashSectionSource).toContain("<span>등록 규격</span>");
    expect(sashSectionSource).toContain("<span>관리</span>");
    expect(sashSectionSource).not.toContain("sash_location_kind");
    expect(sashSectionSource).not.toContain("updateCanonicalConstructionSubitem");
    expect(sashSectionSource).toContain('role="tablist"');
    expect(sashSectionSource).toContain('role="tab"');
    expect(sashSectionSource).toContain("SASH_CATEGORIES.STANDARD");
    expect(sashSectionSource).toContain("SASH_CATEGORIES.BALCONY");
    expect(sashSectionSource).toContain("SASH_CATEGORIES.UNSPECIFIED");
    expect(sashSectionSource).not.toMatch(/name.*includes.*balcony|name.*includes.*베란다/i);
    expect(sashSectionSource).toContain('return count > 0 ? `${count}개` : "규격 없음"');
    expect(sashApiSource).toContain('.is("archived_at", null)');
    expect(sashSectionSource).not.toContain("규격별 관리");
    expect(sashSectionSource).not.toContain("열어서 편집");
    expect(sashSectionSource).not.toContain("최근 저장");
  });

  it("uses one open subitem id and mounts the grid only for that expanded row", () => {
    expect(sashSectionSource).toContain('useState("")');
    expect(sashSectionSource).toContain("const expanded = openSubitemId === subitem.id");
    expect(sashSectionSource).toContain("setOpenSubitemId(subitemId)");
    expect(sashSectionSource).toContain("{expanded && (");
    expect(sashSectionSource).toContain("onDirtyChange={handleEditorDirtyChange}");
    expect(sashSectionSource).toContain("confirmDiscardSashDraft");
  });

  it("keeps the catalog editor compact, CRUD-capable, and updated_at read-only", () => {
    expect(sashGridSource).toContain("insertSashCatalogEntry");
    expect(sashGridSource).toContain("updateSashCatalogEntry");
    expect(sashGridSource).toContain("archiveSashCatalogEntry");
    expect(sashGridSource).toContain("saveSashCatalogEntryOrder");
    expect(sashGridSource).toContain('key: "updated_at"');
    expect(sashGridSource).toContain('aria-readonly="true"');
    expect(sashGridSource).not.toContain('type="date"');
    expect(sashGridSource).toContain("등록된 샷시 규격이 없습니다.");
    expect(sashGridSource).toContain("샷시 규격 추가");
  });

  it("creates new area rows without assuming a window type and defers calculations", () => {
    expect(sashGridSource).toContain("pricingBasis: SASH_PRICING_BASES.AREA");
    expect(sashGridSource).toContain("windowType: SASH_WINDOW_TYPES.UNSPECIFIED");
    expect(sashGridSource).toContain("measurementKind: SASH_MEASUREMENT_KINDS.ESTIMATE");
    expect(sashGridSource).toContain("getSashBillableArea(row)");
    expect(sashGridSource).toContain("getSashCatalogEntryAmount(row)");
    expect(sashGridSource).toContain("hasExplicitSashWindowType(row.window_type)");
    expect(sashGridSource).toContain("미확정");
    expect(sashGridSource).toContain("기존 고정");
    expect(sashGridSource).not.toContain("pricing_basis: SASH_PRICING_BASES.AREA");
  });

  it("mounts one company-wide special-item CRUD manager only for the balcony category", () => {
    expect(sashSectionSource).toContain("activeCategory === SASH_CATEGORIES.BALCONY");
    expect(sashSectionSource).toContain("<SashSpecialItemsManager");
    expect(sashSpecialItemsSource).toContain("fetchActiveSashSpecialItems");
    expect(sashSpecialItemsSource).toContain("insertSashSpecialItem");
    expect(sashSpecialItemsSource).toContain("updateSashSpecialItem");
    expect(sashSpecialItemsSource).toContain("archiveSashSpecialItem");
    expect(sashSpecialItemsSource).toContain("getSashSpecialItemArea(row)");
    expect(sashSpecialItemsSource).toContain("직접입력 금액");
    expect(sashSpecialItemsSource).not.toContain("condition");
    expect(sashSpecialItemsSource).not.toContain("pyeong");
  });

  it("connects canonical sash snapshots and balcony special items to the estimate row editor", () => {
    expect(adminAppSource).toContain("<SashEstimateEditor");
    expect(sashEstimateEditorSource).toContain("<SashCatalogSelector");
    expect(sashEstimateEditorSource).toContain("buildSashEstimateSelectionPatch");
    expect(sashEstimateEditorSource).toContain("buildSashEstimateSpecPatch");
    expect(sashEstimateEditorSource).toContain("fetchActiveSashSpecialItems");
    expect(sashEstimateEditorSource).toContain('type="checkbox"');
    expect(sashEstimateEditorSource).toContain("buildSashSpecialItemSelectionPatch");
    expect(sashEstimateEditorSource).toContain("isBalconySashCategory(row)");
    expect(sashEstimateEditorSource).not.toContain("sashCategory={row.sashCategory}");
    expect(sashSelectorSource).toContain('role="tablist"');
    expect(sashSelectorSource).toContain("getSashCategory(entry) === activeCategory");
    expect(sashEstimateEditorSource).toContain("pinnedEntryId={row.sashPinnedCatalogEntryId}");
    expect(sashEstimateEditorSource).toContain("usageRanking={row.sashUsageRanking}");
    expect(sashEstimateEditorSource).toContain('sashSelectionSource: "manual"');
  });

  it("records the approved specialized editor rule without implementation-specific values", () => {
    expect(designSkillSource).toContain("### Specialized Editor Rule");
    expect(designSkillSource).toContain("특수 데이터 타입은 해당 데이터의 Editor 영역만 특수화한다.");
    expect(designSkillSource).toContain("별도 Sidebar, Tab Navigation, Page Shell을 만들지 않는다.");
    expect(designSkillSource).toContain("의미 없는 placeholder, dash, 반복 설명을 만들지 않는다.");
    expect(designSkillSource).toContain("동일 Editor Component와 interaction을 재사용한다.");
  });
});
