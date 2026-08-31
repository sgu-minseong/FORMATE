import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CONSTRUCTION_ITEM_RENDERER_KINDS,
  getConstructionItemRendererKind,
} from "../priceTableModel";

const pageSource = readFileSync(
  new URL("../PriceTablePage.jsx", import.meta.url),
  "utf8"
);
const appStyles = readFileSync(
  new URL("../../../styles/appStyles.js", import.meta.url),
  "utf8"
);
const canonicalSelectSource = readFileSync(
  new URL("../../constructionCatalog/CanonicalVariantSelect.jsx", import.meta.url),
  "utf8"
);
const canonicalManagerSource = readFileSync(
  new URL("../../constructionCatalog/CanonicalVariantManager.jsx", import.meta.url),
  "utf8"
);
const adminAppSource = readFileSync(
  new URL("../../../app/AdminApp.jsx", import.meta.url),
  "utf8"
);
const skeletonSource = readFileSync(
  new URL("../AdminCatalogTableSkeleton.jsx", import.meta.url),
  "utf8"
);

describe("price table add action layout contracts", () => {
  it("replaces the full-width material add rows with centered item actions", () => {
    expect(pageSource).not.toContain("admin-add-subitem-row admin-price-v2-add-row");
    expect(pageSource.match(/admin-price-v2-add-action/g)).toHaveLength(1);
    expect(pageSource.match(/항목 추가/g)).toHaveLength(1);
    expect(pageSource).not.toContain("소재 추가");
  });

  it("centers the action without recreating the bordered row", () => {
    expect(appStyles).toMatch(
      /\.admin-price-v2-add-action\s*\{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*center;[\s\S]*?padding:\s*var\(--space-2\) 0;/
    );
  });
});

describe("admin table geometry ownership contracts", () => {
  it("keeps one Price geometry owner for header, editable rows, and skeleton rows", () => {
    expect(pageSource).toContain('"--price-table-columns": tableLayout.gridTemplate');
    expect(pageSource).toContain('"--price-table-width": `${tableLayout.totalWidth}px`');
    expect(appStyles).toMatch(
      /\.admin-price-v2-grid-list \.admin-price-table-header\.admin-price-v2-grid,[\s\S]*?\.admin-value-row\.common-price-row\.admin-price-v2-grid,[\s\S]*?\.admin-catalog-skeleton-row\s*\{[\s\S]*?grid-template-columns:\s*var\(--price-table-columns\);/
    );
    expect(pageSource).toContain('<AdminCatalogTableSkeleton variant="price" style={tableLayoutStyle} />');
    expect(skeletonSource).toContain('listClassName: "admin-price-v2-grid-list price-table-list"');
    expect(skeletonSource).toContain("columnCount: 10");
  });

  it("keeps one Template geometry owner for header, editable rows, and skeleton rows", () => {
    expect(adminAppSource).toContain('"--quantity-table-columns": adminTemplateTableLayout.gridTemplate');
    expect(adminAppSource).toContain('"--quantity-table-width": `${adminTemplateTableLayout.totalWidth}px`');
    expect(appStyles).toMatch(
      /\.admin-items-v2-grid-list \.admin-quantity-table-header,[\s\S]*?\.admin-value-row\.condition-quantity-row,[\s\S]*?\.admin-catalog-skeleton-row\s*\{[\s\S]*?grid-template-columns:\s*var\(--quantity-table-columns\);/
    );
    expect(skeletonSource).toContain('listClassName: "admin-items-v2-grid-list quantity-table-list"');
    expect(skeletonSource).toContain('headerClassName: "admin-quantity-table-header"');
    expect(skeletonSource).toContain("columnCount: 9");
  });

  it("removes legacy competing geometry and uses one horizontal data viewport", () => {
    expect(appStyles).not.toContain(":last-of-type");
    expect(appStyles).not.toContain(".price-table-grid");
    expect(appStyles).toContain(
      ".admin-price-v2-grid-list .admin-value-row.common-price-row > .admin-price-v2-expand-button"
    );
    expect(appStyles).toContain(
      ".admin-items-v2-grid-list .admin-value-row.condition-quantity-row > .admin-price-v2-danger-button"
    );
    expect(appStyles).not.toContain("admin-flat-list");
    expect(appStyles).toMatch(
      /\.admin-price-v2-table-scroll\s*\{[\s\S]*?overflow-x:\s*auto;/
    );
    expect(appStyles).toMatch(
      /\.admin-items-v2-table-section \.admin-price-v2-table-scroll\s*\{[\s\S]*?overflow-x:\s*auto;/
    );
    expect(appStyles).toMatch(/\.admin-price-v2-grid-list\s*\{[\s\S]*?width:\s*var\(--price-table-width\);[\s\S]*?min-width:\s*var\(--price-table-width\);/);
    expect(appStyles).toMatch(/\.admin-items-v2-grid-list\s*\{[\s\S]*?width:\s*var\(--quantity-table-width\);[\s\S]*?min-width:\s*var\(--quantity-table-width\);/);
    expect(appStyles).not.toMatch(/\.admin-price-v2-grid-list\s*\{[\s\S]*?min-width:\s*820px;/);
    expect(appStyles).not.toMatch(/\.admin-items-v2-grid-list\s*\{[\s\S]*?min-width:\s*740px;/);
  });
});

describe("construction item renderer contracts", () => {
  it("uses stable item_kind and ignores item_type and display names", () => {
    expect(getConstructionItemRendererKind({ item_kind: "standard", item_type: "flat", name: "도배" }))
      .toBe(CONSTRUCTION_ITEM_RENDERER_KINDS.STANDARD);
    expect(getConstructionItemRendererKind({ item_kind: "standard", name: "샷시" }))
      .toBe(CONSTRUCTION_ITEM_RENDERER_KINDS.STANDARD);
    expect(getConstructionItemRendererKind({ item_kind: "standard", name: "바닥재" }))
      .toBe(CONSTRUCTION_ITEM_RENDERER_KINDS.STANDARD);
    expect(getConstructionItemRendererKind({ item_kind: "sash", name: "표시명 변경" }))
      .toBe(CONSTRUCTION_ITEM_RENDERER_KINDS.SASH);
  });

  it("keeps the price table standard path independent from flat and flooring name checks", () => {
    expect(pageSource).toContain("getConstructionItemRendererKind(item)");
    expect(pageSource).not.toContain("isFlooringThicknessItem(item)");
    expect(pageSource).not.toContain('item.item_type === "flat"');
  });

  it("renders canonical product rows and UUID-valued variant options only", () => {
    expect(pageSource).toContain("getVisibleAdminProducts(item)");
    expect(pageSource).toContain("<CanonicalVariantSelect");
    expect(canonicalSelectSource).toContain("value={variant.constructionSubitemId}");
    expect(canonicalSelectSource).toContain("key={variant.constructionSubitemId}");
    expect(canonicalSelectSource).toContain("onChange?.(variant.constructionSubitemId)");
    expect(pageSource).not.toContain("spec_options");
    expect(pageSource).not.toContain("selected_spec_option");
    expect(pageSource).not.toContain("normalizeSpecOptions");
  });

  it("shares one dropdown surface between variant selection and management", () => {
    expect(pageSource).toContain("management={{");
    expect(pageSource).not.toContain("<CanonicalVariantManager");
    expect(pageSource).not.toContain("onManage=");
    expect(canonicalSelectSource).toContain('mode === "manage"');
    expect(canonicalSelectSource).toContain("<CanonicalVariantManager");
    expect(canonicalSelectSource).toContain('onClose={() => setMode("select")}');
    expect(canonicalSelectSource).toContain("canonical-variant-dropdown__manage-action");
    expect(canonicalSelectSource).not.toContain("spec-options-manage-button");
    expect(canonicalManagerSource).toContain('<div className="canonical-variant-manager">');
    expect(canonicalManagerSource).not.toContain("spec-options-popover canonical-variant-manager");
  });

  it("routes variant create and archive actions through the canonical writers", () => {
    expect(pageSource).toContain("onAdd: (draft) => createAdminProductVariant(item, product, draft)");
    expect(pageSource).toContain("onArchive: (variant) => archiveAdminProductVariant(item, product, variant)");
    expect(canonicalManagerSource).toContain("await onAdd?.({");
    expect(canonicalManagerSource).toContain("onClick={() => onArchive?.(variant)}");
    expect(adminAppSource).toContain("await insertCanonicalVariantSubitem(");
    expect(adminAppSource).toContain("await archiveCanonicalConstructionSubitem(");
    expect(adminAppSource).toContain("await archiveCanonicalVariantGroup(");
  });
});
