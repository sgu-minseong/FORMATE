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
const adminCategoryPanelSource = readFileSync(
  new URL("../../priceTable/AdminCategoryPanel.jsx", import.meta.url),
  "utf8"
);
const sashSpecialItemsSource = readFileSync(
  new URL("../SashSpecialItemsManager.jsx", import.meta.url),
  "utf8"
);
const tableSource = readFileSync(
  new URL("../../../components/ui/Table.jsx", import.meta.url),
  "utf8"
);
const selectSource = readFileSync(
  new URL("../../../components/ui/Select.jsx", import.meta.url),
  "utf8"
);
const mutationStatusSource = readFileSync(
  new URL("../../../shared/hooks/useMutationSaveStatus.js", import.meta.url),
  "utf8"
);
const sashSpecialItemApiSource = readFileSync(
  new URL("../sashSpecialItemApi.js", import.meta.url),
  "utf8"
);
const appStylesSource = readFileSync(
  new URL("../../../styles/appStyles.js", import.meta.url),
  "utf8"
);
const tokensSource = readFileSync(
  new URL("../../../styles/tokens.css", import.meta.url),
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

  it("separates standard, balcony, and reusable additional-work navigation", () => {
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
    expect(sashSectionSource).toContain('const SASH_SPECIAL_ITEMS_VIEW = "special-items"');
    expect(sashSectionSource).toContain('? "추가작업" : getSashCategoryLabel(view)');
    expect(sashSectionSource).not.toContain("미분류");
    expect(sashGridSource).not.toContain('<option value={SASH_CATEGORIES.UNSPECIFIED}>미분류</option>');
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
    expect(sashGridSource).toContain("규격 추가");
    expect(sashGridSource).toContain("useDebouncedAutosave");
    expect(sashGridSource).toContain("autosave.markDirty");
    expect(sashGridSource).not.toContain("<Save");
    expect(sashSpecialItemsSource).not.toContain("<Save");
    expect(sashGridSource).toContain('<Pin size={15}');
    expect(sashGridSource).toContain('{ key: "sash_category", label: "분류"');
  });

  it("creates new area rows without assuming a window type and defers calculations", () => {
    expect(sashGridSource).toContain("pricingBasis: SASH_PRICING_BASES.AREA");
    expect(sashGridSource).toContain("windowType: SASH_WINDOW_TYPES.UNSPECIFIED");
    expect(sashGridSource).toContain("measurementKind: SASH_MEASUREMENT_KINDS.ESTIMATE");
    expect(sashGridSource).toContain("getSashBillableArea(row)");
    expect(sashGridSource).toContain("getSashCatalogEntryAmount(row)");
    expect(sashGridSource).toContain("hasExplicitSashWindowType(row.window_type)");
    expect(sashGridSource).toContain("미확정");
    expect(sashGridSource).toContain("총액 직접입력");
    expect(sashGridSource).not.toContain("pricing_basis: SASH_PRICING_BASES.AREA");
  });

  it("mounts one company-wide special-item CRUD manager only in its own view", () => {
    expect(sashSectionSource).toContain("activeView === SASH_SPECIAL_ITEMS_VIEW");
    expect(sashSectionSource).not.toContain("activeCategory === SASH_CATEGORIES.BALCONY");
    expect(sashSectionSource).toContain("<SashSpecialItemsManager");
    expect(sashSpecialItemsSource).toContain("fetchActiveSashSpecialItems");
    expect(sashSpecialItemsSource).toContain("insertSashSpecialItem");
    expect(sashSpecialItemsSource).toContain("updateSashSpecialItem");
    expect(sashSpecialItemsSource).toContain("archiveSashSpecialItem");
    expect(sashSpecialItemsSource).toContain("getSashSpecialItemArea(row)");
    expect(sashSpecialItemsSource).toContain("직접입력 금액");
    expect(sashSpecialItemsSource).toContain("persistedItemCount");
    expect(sashSpecialItemsSource).toContain("useDebouncedAutosave");
    expect(sashSpecialItemsSource).toContain("          추가");
    expect(sashSpecialItemsSource).not.toContain("condition");
    expect(sashSpecialItemsSource).not.toContain("pyeong");
  });

  it("connects canonical sash snapshots and category-independent special items to the estimate row editor", () => {
    expect(adminAppSource).toContain("<SashEstimateEditor");
    expect(sashEstimateEditorSource).toContain("<SashCatalogSelector");
    expect(sashEstimateEditorSource).toContain("buildSashEstimateSelectionPatch");
    expect(sashEstimateEditorSource).toContain("buildSashEstimateSpecPatch");
    expect(sashEstimateEditorSource).toContain("fetchActiveSashSpecialItems");
    expect(sashEstimateEditorSource).toContain('type="checkbox"');
    expect(sashEstimateEditorSource).not.toContain("buildSashSpecialItemSelectionPatch");
    expect(sashEstimateEditorSource).not.toContain("isBalconySashCategory");
    expect(sashEstimateEditorSource).not.toContain("sashSpecialItemSelections: []");
    expect(sashEstimateEditorSource).not.toContain("sashCategory={row.sashCategory}");
    expect(sashEstimateEditorSource).toContain('role="tablist"');
    expect(sashEstimateEditorSource).toContain('tab === SPECIAL_ITEMS_TAB ? "추가작업"');
    expect(sashSelectorSource).toContain("getSashCategory(entry) === activeCategory");
    expect(sashSelectorSource).not.toContain("visibleCategories");
    expect(sashEstimateEditorSource).toContain("pinnedEntryId={row.sashPinnedCatalogEntryId}");
    expect(sashEstimateEditorSource).toContain("usageRanking={row.sashUsageRanking}");
    expect(sashEstimateEditorSource).toContain('sashSelectionSource: "manual"');
    expect(adminAppSource).not.toContain("견적에 포함한 뒤 실제 현장에 맞는 샷시 규격을 선택하세요.");
    expect(adminAppSource).toContain("included={Boolean(row.selected)}");
    expect(adminAppSource).toContain("row.itemKind !== \"sash\" && !row.hasTemplateValue");
    expect(adminAppSource).toContain("items-v2-sash-summary");
  });

  it("keeps the pin context compact and preserves product identity during horizontal scroll", () => {
    expect(sashSectionSource).toContain("categoryNavigation={categoryNavigation}");
    expect(sashGridSource).toContain('className="sash-catalog-grid__toolbar"');
    expect(sashGridSource).not.toContain('<span className="field-label">평수</span>');
    expect(sashGridSource).toContain('{ key: "pin", label: "", ariaLabel: "대표제품", defaultWidth: 36');
    expect(sashGridSource).toContain('{ key: "brand", label: "제조사", defaultWidth: 84');
    expect(sashGridSource).toContain('sticky: true, stickyEnd: true');
    expect(tableSource).toContain('column.sticky && "ui-table__cell--sticky"');
    expect(tableSource).toContain('"--ui-table-sticky-left"');
  });

  it("keeps canonical product pins clickable regardless of optional sash specs", () => {
    expect(sashGridSource).toContain("disabled={isLocalSashCatalogEntry(row)}");
    expect(sashGridSource).not.toContain("disabled={isLocalSashCatalogEntry(row) || !pinPyeong}");
    expect(sashGridSource).toContain('setPinRequirement("평수를 먼저 선택하세요")');
    expect(sashGridSource).toContain("pinPyeongSelectRef.current?.click()");
    expect(sashGridSource).not.toMatch(/disabled=\{[^}]*pair_spec|disabled=\{[^}]*glass_spec|disabled=\{[^}]*gas_spec|disabled=\{[^}]*screen_spec/);
    expect(sashGridSource).toContain("pinSaveQueueRef.current");
    expect(sashGridSource).toContain("upsertSashCatalogPin({");
  });

  it("reports sash mutations through the page autosave owner", () => {
    expect(sashGridSource).toContain("useMutationSaveStatus");
    expect(sashSpecialItemsSource).toContain("useMutationSaveStatus");
    expect(sashSectionSource).toContain("onSaveStateChange={onSaveStateChange}");
    expect(pricePageSource).toContain("onSaveStateChange={handleSashSaveStateChange}");
    expect(pricePageSource).toContain('className={`autosave-pill ${autoSaveStatus}`.trim()}');
    expect(adminAppSource).toContain("onSaveStateChange={handleSashSaveStateChange}");
    expect(mutationStatusSource).toContain("pendingRef.current += 1");
    expect(mutationStatusSource).toContain('pendingCount > 0 || ["dirty", "saving"].includes(autosave.status)');
  });

  it("persists product and special-item reorder without touching usage ranking", () => {
    expect(sashGridSource).toContain("saveSashCatalogEntryOrder(nextEntries, companyId)");
    expect(sashSpecialItemsSource).toContain("saveSashSpecialItemOrder(nextItems, companyId)");
    expect(sashSpecialItemsSource).toContain("onReorder={reorderItems}");
    expect(sashSpecialItemApiSource).toContain(".update({ sort_order: item.sort_order })");
    expect(sashSpecialItemApiSource).not.toMatch(/usage|ranking/i);
  });

  it("uses the shared non-native select and shared table scrollbar", () => {
    expect(sashGridSource).not.toContain("<select");
    expect(sashEstimateEditorSource).not.toContain("<select");
    expect(sashGridSource).toContain("<Select");
    expect(sashEstimateEditorSource).toContain("<Select");
    expect(selectSource).toContain('role="combobox"');
    expect(selectSource).toContain("createPortal");
    expect(tableSource).toContain('className="ui-table-scroll formate-scroll-light"');
  });

  it("keeps expanded sash ownership structural and uses pin icons for major categories", () => {
    expect(sashSectionSource).toContain('className={`sash-catalog-section__row ${expanded ? "expanded" : ""}');
    expect(sashSectionSource).toContain('<div className="sash-catalog-section__editor">');
    expect(appStylesSource).toContain(".sash-catalog-section__row.expanded {");
    expect(appStylesSource).toContain("margin-bottom: var(--space-2);");
    expect(tableSource).toContain('expandedRow && "ui-table__row--owns-expanded"');
    expect(appStylesSource).toContain("padding: 0 0 var(--space-1);");
    expect(appStylesSource).toContain("border-bottom: 1px solid var(--color-border);");
    expect(adminAppSource).toContain("items-v2-expanded-stack--sash");
    expect(adminCategoryPanelSource).toContain('import { Pin } from "lucide-react";');
    expect(adminCategoryPanelSource).toContain('aria-pressed={pinned}');
    expect(adminCategoryPanelSource).toContain('fill={pinned ? "currentColor" : "none"}');
    expect(adminAppSource).not.toContain('<Star size={14} fill="currentColor" />');
  });

  it("reuses favorite persistence for interactive category pin toggles", () => {
    expect(adminCategoryPanelSource).toContain("export function AdminCategoryPinButton");
    expect(adminCategoryPanelSource).toContain("onToggle?.(item)");
    expect(adminCategoryPanelSource).not.toContain("disabled=");
    expect(pricePageSource).toContain("onToggleFavorite={toggleAdminFavorite}");
    expect(pricePageSource).toContain("고정 항목만 보기");
    expect(adminAppSource).toContain("{ is_favorite: !item.is_favorite }");
    expect(adminAppSource).toContain("onToggleFavorite={toggleAdminFavorite}");
  });

  it("uses concise editable and estimate states without duplicating sash guidance", () => {
    expect(sashGridSource).toContain('placeholder="—"');
    expect(sashSelectorSource).toContain("등록된 제품이 없습니다.");
    expect(sashSelectorSource).not.toContain("현재 선택:");
    expect(sashSelectorSource).not.toContain("단가표 관리에서 샷시 규격을 먼저 등록하세요.");
    expect(adminAppSource).toContain('<h1>견적 템플릿 만들기</h1>');
    expect(adminAppSource).toContain('{ key: "material", label: "소재명", defaultWidth: 260');
    expect(adminAppSource).toContain('{ key: "spec", label: "규격", defaultWidth: 120');
    expect(adminAppSource).not.toContain("평형과 무관한 샷시 규격을 선택합니다.");
    expect(sashSectionSource).toContain("categoryNavigation={categoryNavigation}");
    expect(appStylesSource).toContain(".sash-special-items__count");
    expect(appStylesSource).toContain("width: 100%;");
  });

  it("uses bright green-slate neutral surfaces and border-based light selection", () => {
    expect(tokensSource).toContain("--color-bg: #F9FBFA;");
    expect(tokensSource).toContain("--color-surface-subtle: #F3F7F5;");
    expect(tokensSource).toContain("--color-header-bg: #EFF5F2;");
    expect(tokensSource).toContain("--color-border: #DCE6E2;");
    expect(tokensSource).toContain("--surface-selected: var(--color-surface);");
    expect(tokensSource).toContain("--border-selected: var(--color-primary);");
    expect(tokensSource).toContain(".ui-category-sidebar__item--active {");
    expect(tokensSource).toContain("border-color: var(--border-selected);");
    expect(appStylesSource).toContain("--color-bg: #F9FBFA;");
    expect(appStylesSource).toContain("--color-surface-subtle: #F3F7F5;");
    expect(appStylesSource).toContain("border-color: var(--border-selected);");
    expect(appStylesSource).toContain("box-shadow: inset 0 0 0 1px var(--border-selected);");
  });

  it("keeps the estimate sash flow compact and separates product and special-item tabs", () => {
    expect(sashEstimateEditorSource).toContain("activeTab === SPECIAL_ITEMS_TAB");
    expect(sashEstimateEditorSource).toContain("spec && selectedCategory === activeTab");
    expect(sashEstimateEditorSource).toContain('className="sash-estimate-spec__grid"');
    expect(sashEstimateEditorSource).not.toContain("현장값");
    expect(sashEstimateEditorSource).toContain("측정 구분");
    expect(sashEstimateEditorSource).toContain('aria-label="선택한 샷시 제품 정보"');
    expect(sashEstimateEditorSource).toContain('className="sash-estimate-special__dimensions"');
    expect(sashEstimateEditorSource).toContain('className="sash-estimate-special__area"');
    expect(sashEstimateEditorSource).not.toContain('className="sash-estimate-special__selected"');
    expect(sashSelectorSource).toContain('const details = [');
    expect(appStylesSource).toContain("grid-template-columns: repeat(7, minmax(0, 1fr));");
    expect(appStylesSource).toContain("background: var(--color-header-bg);");
    expect(sashEstimateEditorSource).toContain("행 금액");
    expect(sashEstimateEditorSource).not.toContain("<span>샷시 <strong>");
  });

  it("records the approved specialized editor rule without implementation-specific values", () => {
    expect(designSkillSource).toContain("### Specialized Editor Rule");
    expect(designSkillSource).toContain("특수 데이터 타입은 해당 데이터의 Editor 영역만 특수화한다.");
    expect(designSkillSource).toContain("별도 Sidebar, Tab Navigation, Page Shell을 만들지 않는다.");
    expect(designSkillSource).toContain("의미 없는 placeholder, dash, 반복 설명을 만들지 않는다.");
    expect(designSkillSource).toContain("동일 Editor Component와 interaction을 재사용한다.");
  });
});
