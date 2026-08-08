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
    expect(sashSectionSource).toContain("<SashCatalogGrid");
    expect(sashSectionSource).not.toContain('mode="priceTable"');
    expect(sashSectionSource).not.toContain('mode="template"');
  });

  it("keeps the condition switcher while the sash catalog stays condition-independent", () => {
    expect(templateWorkbenchSource).toContain("<TemplateConditionSwitcher");
    expect(sashSectionSource).not.toContain("condition");
    expect(sashSectionSource).not.toContain("pyeong");
    expect(sashGridSource).not.toContain("condition");
    expect(sashGridSource).not.toContain("pyeong");
  });

  it("shows only subitem, active catalog count, and management in collapsed rows", () => {
    expect(sashSectionSource).toContain("<span>세부항목</span>");
    expect(sashSectionSource).toContain("<span>등록 규격</span>");
    expect(sashSectionSource).toContain("<span>관리</span>");
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

  it("records the approved specialized editor rule without implementation-specific values", () => {
    expect(designSkillSource).toContain("### Specialized Editor Rule");
    expect(designSkillSource).toContain("특수 데이터 타입은 해당 데이터의 Editor 영역만 특수화한다.");
    expect(designSkillSource).toContain("별도 Sidebar, Tab Navigation, Page Shell을 만들지 않는다.");
    expect(designSkillSource).toContain("의미 없는 placeholder, dash, 반복 설명을 만들지 않는다.");
    expect(designSkillSource).toContain("동일 Editor Component와 interaction을 재사용한다.");
  });
});
