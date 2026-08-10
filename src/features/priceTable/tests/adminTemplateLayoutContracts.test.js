import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../../../app/AdminApp.jsx", import.meta.url), "utf8");
const pricePageSource = readFileSync(new URL("../PriceTablePage.jsx", import.meta.url), "utf8");
const categoryPanelSource = readFileSync(new URL("../AdminCategoryPanel.jsx", import.meta.url), "utf8");
const switcherSource = readFileSync(new URL("../TemplateConditionSwitcher.jsx", import.meta.url), "utf8");
const sashSectionSource = readFileSync(new URL("../../sash/SashCatalogSection.jsx", import.meta.url), "utf8");
const appStyles = readFileSync(new URL("../../../styles/appStyles.js", import.meta.url), "utf8");
const workbenchSource = appSource.slice(
  appSource.indexOf("function renderAdminItemsWorkbench"),
  appSource.indexOf("async function saveAdminPrices")
);
const templateRendererSource = appSource.slice(
  appSource.indexOf("function renderAdminItemsRows"),
  appSource.indexOf("function renderAdminTemplateConditionDrawer")
);
const templateSaveSource = appSource.slice(
  appSource.indexOf("async function saveAdminPrices"),
  appSource.indexOf("async function saveEstimateToSupabase")
);
const estimateTemplateWriterSource = appSource.slice(
  appSource.indexOf("function getEstimateTemplateValuePayloads"),
  appSource.indexOf("async function saveBlankEstimateAsTemplate")
);

describe("admin template management layout contracts", () => {
  it("uses the exact same category panel component as price table management", () => {
    expect(pricePageSource).toContain("<AdminCategoryPanel");
    expect(workbenchSource).toContain("<AdminCategoryPanel");
    expect(categoryPanelSource).toContain("admin-price-v2-sidebar");
    expect(categoryPanelSource).toContain("admin-price-v2-category-item");
  });

  it("removes the fixed condition sidebar and keeps category plus workspace geometry", () => {
    expect(workbenchSource).not.toContain("renderAdminTemplateConditionSidebar");
    expect(workbenchSource).not.toContain("admin-template-condition-sidebar");
    expect(workbenchSource).toContain("<TemplateConditionSwitcher");
    expect(appStyles).toMatch(/\.admin-items-v2-page\s*\{[\s\S]*?grid-template-columns:\s*var\(--layout-local-sidebar\) minmax\(0, 1fr\);/);
  });

  it("keeps the final shell during loading and does not render an editor before context is ready", () => {
    expect(workbenchSource).toContain("const editorReady = adminConditionLoaded");
    expect(workbenchSource).toContain("initialLoading || (currentAdminTemplateId && !editorReady)");
    expect(workbenchSource).toContain('aria-label="견적 템플릿 로딩"');
    expect(workbenchSource).not.toContain("불러오는 중...</div>");
  });

  it("keeps standard and sash editors inside the shared workspace without sash tabs", () => {
    expect(appSource).toContain("isSashItem(item)");
    expect(appSource).toContain("<SashCatalogSection");
    expect(sashSectionSource).toContain("<SashCatalogGrid");
    expect(sashSectionSource).not.toContain("<select");
    expect(sashSectionSource).not.toContain('role="tablist"');
    expect(sashSectionSource).not.toContain('role="tab"');
  });

  it("uses the same standard renderer regardless of flat metadata or display name", () => {
    expect(templateRendererSource).toContain("getConstructionItemRendererKind(item)");
    expect(templateRendererSource).not.toContain("isFlooringThicknessItem(item)");
    expect(templateRendererSource).not.toContain('item.item_type === "flat"');
    expect(templateRendererSource).toContain("CONSTRUCTION_ITEM_RENDERER_KINDS.SASH");
  });

  it("uses one canonical product row with a construction_subitem UUID selector", () => {
    expect(templateRendererSource).toContain("getVisibleAdminProducts(item)");
    expect(templateRendererSource).toContain("resolveAdminProductSubitem");
    expect(templateRendererSource).toContain("<CanonicalVariantSelect");
    expect(templateRendererSource).toContain("constructionSubitemId");
    expect(templateRendererSource).not.toContain("spec_options");
    expect(templateRendererSource).not.toContain("getTemplateOptionValue");
  });

  it("saves template values by exact UUID without legacy option parsing", () => {
    expect(templateSaveSource).toContain("buildAdminTemplateValueSaveOperations");
    expect(templateSaveSource).toContain("updateAdminTemplateValue(operation.valueId");
    expect(templateSaveSource).toContain("insertAdminTemplateValue(operation.payload)");
    expect(templateSaveSource).not.toContain("getTemplateOptionValue");
    expect(templateSaveSource).not.toContain("spec_options");
    expect(estimateTemplateWriterSource).toContain('option_value: ""');
    expect(estimateTemplateWriterSource).not.toContain("getTemplateOptionValue");
  });
});

describe("condition context switcher contracts", () => {
  it("provides search, current selection, recent, favorites, and explicit CRUD actions", () => {
    expect(switcherSource).toContain('placeholder="조건 검색"');
    expect(switcherSource).toContain('renderSection("최근 사용"');
    expect(switcherSource).toContain('renderSection("즐겨찾기"');
    expect(switcherSource).toContain('renderSection("모든 조건"');
    expect(switcherSource).toContain("active={");
    expect(switcherSource).toContain("조건 수정");
    expect(switcherSource).toContain("복제");
    expect(switcherSource).toContain("삭제");
    expect(switcherSource).toContain("새 조건 만들기");
  });

  it("reuses the compact drawer and clones template values when duplicating", () => {
    expect(appSource).toContain('setAdminTemplateConditionDrawerMode("edit")');
    expect(appSource).toContain('setAdminTemplateConditionDrawerMode("duplicate")');
    expect(appSource).toContain("const sourceValues = await fetchAdminTemplateValues");
    expect(appSource).toContain("await upsertAdminTemplateValues(clonedValues)");
  });
});
