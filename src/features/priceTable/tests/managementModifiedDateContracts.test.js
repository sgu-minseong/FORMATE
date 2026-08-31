import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  formatDisplayTimestampDate,
  getLatestTimestamp,
} from "../../../shared/utils/dates";
import { normalizeAdminItems } from "../priceTableModel";

const adminAppSource = readFileSync(new URL("../../../app/AdminApp.jsx", import.meta.url), "utf8");
const pricePageSource = readFileSync(new URL("../PriceTablePage.jsx", import.meta.url), "utf8");
const detailCostsSource = readFileSync(new URL("../../detailCosts/DetailCostsPage.jsx", import.meta.url), "utf8");
const detailControllerSource = readFileSync(new URL("../../detailCosts/useDetailCosts.js", import.meta.url), "utf8");
const sashCatalogSource = readFileSync(new URL("../../sash/SashCatalogGrid.jsx", import.meta.url), "utf8");
const sashSpecialSource = readFileSync(new URL("../../sash/SashSpecialItemsManager.jsx", import.meta.url), "utf8");
const photoControllerSource = readFileSync(new URL("../../photoManagement/usePyeongPhotoManagement.js", import.meta.url), "utf8");
const tableWidthSource = readFileSync(new URL("../../../components/ui/tableWidths.js", import.meta.url), "utf8");
const photoPageSource = readFileSync(new URL("../../photoManagement/PyeongPhotoManagement.jsx", import.meta.url), "utf8");
const photoManagementSource = readFileSync(new URL("../../photoManagement/PhotoManagementPage.jsx", import.meta.url), "utf8");
const photoModelSource = readFileSync(new URL("../../photoManagement/photoModel.js", import.meta.url), "utf8");
const estimateDocumentSource = readFileSync(new URL("../../estimates/EstimateDocument.jsx", import.meta.url), "utf8");
const estimatePreviewSource = readFileSync(new URL("../../estimates/EstimatePreviewPage.jsx", import.meta.url), "utf8");
const catalogSaveSource = adminAppSource.slice(
  adminAppSource.indexOf("async function saveAdminPrices"),
  adminAppSource.indexOf("async function saveEstimateToSupabase"),
);
const estimateItemsSource = adminAppSource.slice(
  adminAppSource.indexOf("function renderItemsScreenV2"),
  adminAppSource.indexOf("if (companySession.checking)"),
);

describe("management modified date contracts", () => {
  it("wires each screen to a company-scoped, versioned table identity", () => {
    expect(pricePageSource).toContain('tableId: "admin-price-standard"');
    expect(adminAppSource).toContain('tableId: "admin-template-standard"');
    expect(adminAppSource).toContain('tableId: "estimate-items"');
    expect(sashCatalogSource).toContain('tableId: "sash-catalog"');
    expect(sashSpecialSource).toContain('tableId: "sash-special-items"');
    expect(detailCostsSource).toContain('tableId: "detail-costs"');
    expect(tableWidthSource).toContain("encodeURIComponent(companyId)");
    expect(tableWidthSource).toContain("encodeURIComponent(tableId)");
    expect(tableWidthSource).toContain("TABLE_WIDTH_PREFERENCE_VERSION = 1");
  });

  it("keeps construction and template-value DB timestamps as separate canonical fields", () => {
    const [item] = normalizeAdminItems(
      [{ id: "item-a", name: "도배", sort_order: 0 }],
      [{ id: "subitem-a", item_id: "item-a", name: "실크", updated_at: "2026-08-31T01:02:03Z" }],
      [{ id: "value-a", subitem_id: "subitem-a", updated_at: "2026-08-31T02:03:04Z" }],
      {
        items: [{
          constructionItemId: "item-a",
          products: [{ productId: "product-a", selectableSubitemIds: ["subitem-a"] }],
          variantGroups: [],
          archivedVariantGroups: [],
        }],
        products: [{ productId: "product-a", selectableSubitemIds: ["subitem-a"] }],
      },
    );

    expect(item.subitems[0]).toMatchObject({
      updated_at: "2026-08-31T01:02:03Z",
      template_value_updated_at: "2026-08-31T02:03:04Z",
    });
  });

  it("formats DB timestamps in the user's local calendar date", () => {
    const timestamp = "2026-08-31T23:30:00Z";

    expect(formatDisplayTimestampDate(timestamp)).toBe(
      new Date(timestamp).toLocaleDateString("ko-KR"),
    );
    expect(formatDisplayTimestampDate("not-a-timestamp")).toBe("-");
    expect(getLatestTimestamp("2026-08-31T02:00:00Z", "2026-08-31T01:00:00Z"))
      .toBe("2026-08-31T02:00:00Z");
    expect(getLatestTimestamp("2026-08-31T01:00:00Z", "2026-08-31T02:00:00Z"))
      .toBe("2026-08-31T02:00:00Z");
  });

  it("refreshes timestamps from DB only after the atomic save succeeds", () => {
    expect(catalogSaveSource.indexOf("await saveAdminCatalogAtomic")).toBeLessThan(
      catalogSaveSource.indexOf("await fetchConstructionSubitemUpdatedAtRows"),
    );
    expect(catalogSaveSource).toContain("fetchAdminTemplateUpdatedAtRow");
    expect(catalogSaveSource).toContain("fetchAdminTemplateValueUpdatedAtRows");
    expect(catalogSaveSource).toContain("template_value_updated_at:");
    expect(catalogSaveSource).not.toContain("new Date(");
    expect(catalogSaveSource).not.toContain("Date.now(");
  });

  it("never fabricates management timestamps in Sash, Detail Costs, or Photo failure paths", () => {
    const persistenceSources = [
      sashCatalogSource,
      sashSpecialSource,
      detailControllerSource,
      photoControllerSource,
    ].join("\n");

    expect(persistenceSources).not.toContain("new Date(");
    expect(persistenceSources).not.toContain("Date.now(");
    expect(sashCatalogSource).toContain("getLatestTimestamp(latestEntry?.updated_at, normalizedSavedEntry.updated_at)");
    expect(sashSpecialSource).toContain("getLatestTimestamp(latestItem?.updated_at, normalizedSavedItem.updated_at)");
    expect(sashCatalogSource).not.toContain("entriesRef.current = previousEntries");
    expect(sashSpecialSource).not.toContain("itemsRef.current = previousItems");
    expect(detailControllerSource.indexOf("await action();")).toBeLessThan(
      detailControllerSource.indexOf("await loadCosts();"),
    );
    expect(photoControllerSource).toContain("getLatestTimestamp(photo.updatedAt, updatedAtById.get(photo.id))");
    expect(photoControllerSource).toContain("getLatestTimestamp(snippet.updatedAt, updatedAtById.get(snippet.id))");
    expect(photoControllerSource).toContain("hasNewPendingCaption");
    expect(photoControllerSource).toContain("if (!pendingCaptionsRef.current.has(photoId))");
    expect(photoControllerSource).not.toContain("setSnippets(snippets)");
  });

  it("uses each management owner's DB updated_at field and the label 수정일", () => {
    expect(pricePageSource).toContain('key: "updated_at", label: "수정일"');
    expect(adminAppSource).toContain('key: "updated_at", label: "수정일"');
    expect(sashCatalogSource).toContain('key: "updated_at", label: "수정일"');
    expect(sashSpecialSource).toContain('key: "updated_at", label: "수정일"');
    expect(detailCostsSource).toContain('key: "updated_at", label: "수정일"');
    expect(detailControllerSource).toContain("await loadCosts();");
    expect(photoPageSource).toContain("photo.updatedAt");
    expect(photoPageSource).toContain("snippet.updatedAt");
    expect(photoModelSource).toContain("updatedAt: folder.updated_at ?? null");
    expect(photoManagementSource).toContain("PhotoLibraryPlaceholder");
    expect([pricePageSource, adminAppSource, sashCatalogSource, sashSpecialSource, detailCostsSource].join("\n"))
      .not.toContain('label: "저장일"');
  });

  it("does not add management modified dates to estimate authoring or customer documents", () => {
    expect(estimateItemsSource).not.toContain('label: "수정일"');
    expect(estimateItemsSource).not.toContain('key: "updated_at"');
    expect(estimateDocumentSource).not.toContain("수정일");
    expect(estimatePreviewSource).not.toContain("수정일");
  });
});
