import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { normalizeFavoritePyeongs } from "../../estimates/pyeongPreferences";
import { PHOTO_MANAGEMENT_MODES, PhotoManagementLanding } from "../PhotoManagementPage";

describe("Photo v2 management UI contracts", () => {
  it("offers only canonical photo management modes", () => {
    const onSelectMode = vi.fn();
    const markup = renderToStaticMarkup(<PhotoManagementLanding onSelectMode={onSelectMode} />);

    expect(PHOTO_MANAGEMENT_MODES.map((mode) => mode.id)).toEqual(["pyeong", "library"]);
    expect(PHOTO_MANAGEMENT_MODES.map((mode) => mode.title)).toEqual([
      "평형별 사진 관리",
      "평수 무관 사진 관리",
    ]);
    expect(markup.match(/class="photo-management-mode-card"/g)).toHaveLength(2);
  });

  it("normalizes the shared estimate/photo pyeong favorites", () => {
    expect(normalizeFavoritePyeongs([34, "24", 34, 0, 91, "invalid"])).toEqual([24, 34]);
  });

  it("shares estimate pyeong preferences while keeping a Drawer-safe photo presentation", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/features/photoManagement/PyeongPhotoManagement.jsx"), "utf8");
    const selectorSource = fs.readFileSync(path.resolve(process.cwd(), "src/components/PyeongSelector.jsx"), "utf8");
    const preferenceSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/estimates/pyeongPreferences.js"), "utf8");
    const estimateSource = fs.readFileSync(path.resolve(process.cwd(), "src/app/AdminApp.jsx"), "utf8");
    const styleSource = fs.readFileSync(path.resolve(process.cwd(), "src/styles/appStyles.js"), "utf8");

    expect(source).toContain('import AdminCategoryPanel from "../priceTable/AdminCategoryPanel"');
    expect(source).toContain('import PyeongSelector from "../../components/PyeongSelector"');
    expect(source).toContain('<AdminCategoryPanel');
    expect(source).toContain('<PhotoPyeongPicker');
    expect(source).toContain('<PyeongSelector');
    expect(source).toContain('menuPortal');
    expect(source).not.toContain('<select');
    expect(source).not.toContain('type="number"');
    expect(source).not.toContain("RefreshCcw");
    expect(selectorSource).toContain("useFavoritePyeongs");
    expect(selectorSource).toContain("export function PyeongOptionsList");
    expect(selectorSource).toContain("즐겨찾는 평수");
    expect(selectorSource).toContain("전체 평수");
    expect(selectorSource).toContain("favorite-pyeong-toggle");
    expect(selectorSource).toContain("createPortal");
    expect(styleSource).toMatch(/\.custom-select-menu--portal\s*\{[^}]*position:\s*fixed;[^}]*overflow-y:\s*auto;/s);
    expect(styleSource).toMatch(/\.pyeong-photo-drawer-body\s*\{[^}]*overflow:\s*hidden;/s);
    expect(preferenceSource).toContain('FAVORITE_PYEONG_STORAGE_KEY = "formate.favoritePyeong"');
    expect(estimateSource).toContain('<PyeongSelector');
    expect(source).not.toContain("주택 유형");
    expect(source).not.toContain("거주 상태");
    expect(source).not.toContain("확장 여부");
  });

  it("keeps draft, pending, and committed pyeong scopes distinct and guards scoped actions", () => {
    const pageSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/photoManagement/PyeongPhotoManagement.jsx"), "utf8");
    const controllerSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/photoManagement/usePyeongPhotoManagement.js"), "utf8");
    const queryIndex = controllerSource.indexOf("await listPyeongPhotoRows");
    const commitIndex = controllerSource.indexOf("setCommittedPyeong(normalizedPyeong)");

    expect(controllerSource).toContain("NO_PYEONG_SELECTED");
    expect(controllerSource).toContain("PYEONG_LOADING");
    expect(controllerSource).toContain("READY_EMPTY");
    expect(controllerSource).toContain("READY_WITH_DATA");
    expect(controllerSource).toContain("ERROR");
    expect(controllerSource).toContain("draftPyeong");
    expect(controllerSource).toContain("pendingPyeong");
    expect(controllerSource).toContain("committedPyeong");
    expect(queryIndex).toBeGreaterThan(-1);
    expect(commitIndex).toBeGreaterThan(queryIndex);
    expect(controllerSource).toContain("requestId !== loadRequestRef.current");
    expect(controllerSource).toContain("canMutateCommittedContext");
    expect(pageSource).toContain("!committedPyeong");
    expect(pageSource).toContain("disabled={!canEdit || saving}");
    expect(pageSource).toContain("평형을 선택해 주세요.");
  });

  it("separates catalog, photo rows, and signed URL loading ownership", () => {
    const managementSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/photoManagement/usePhotoManagement.js"), "utf8");
    const pyeongSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/photoManagement/usePyeongPhotoManagement.js"), "utf8");
    const pageSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/photoManagement/PyeongPhotoManagement.jsx"), "utf8");

    expect(managementSource).toContain("fetchPhotoCatalog");
    expect(managementSource).toContain("photoCatalogLoading");
    expect(managementSource).toContain("requestRef");
    expect(managementSource).not.toContain("fetchLegacyPhotoManagementData");
    expect(pyeongSource).toContain("photoRowsLoading");
    expect(pyeongSource).toContain("photoUrlLoading");
    expect(pyeongSource).toContain("setStatus(getReadyStatus(rows))");
    expect(pageSource).toContain("photoUrlLoading && photo.storagePath");
    expect(pageSource).not.toContain("pyeong-photo-loading-sections");
  });

  it("keeps an eight-photo preview and opens the full section in a floating gallery", () => {
    const pageSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/photoManagement/PyeongPhotoManagement.jsx"), "utf8");
    const controllerSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/photoManagement/usePyeongPhotoManagement.js"), "utf8");
    const styleSource = fs.readFileSync(path.resolve(process.cwd(), "src/styles/appStyles.js"), "utf8");

    expect(pageSource).toContain("export const PYEONG_GALLERY_INITIAL_LIMIT = 8");
    expect(pageSource).toContain('className="pyeong-photo-gallery-section"');
    expect(pageSource).toContain("scopedPhotos.slice(0, PYEONG_GALLERY_INITIAL_LIMIT)");
    expect(pageSource).toContain("hiddenPhotoCount");
    expect(pageSource).toContain("장 더보기");
    expect(pageSource).toContain("pyeong-photo-add-inline");
    expect(pageSource).toContain('title="사진 추가"');
    expect(pageSource).toContain("pyeong-photo-gallery-section__footer");
    expect(pageSource).toContain("pyeong-photo-gallery-modal-backdrop");
    expect(pageSource).toContain("pyeong-photo-gallery-modal__grid");
    expect(pageSource).toContain('event.key === "Escape"');
    expect(pageSource).not.toContain("expandedGalleryIds");
    expect(pageSource).not.toContain("expandedSubitemId");
    expect(pageSource).not.toContain("aria-expanded={expanded}");
    expect(pageSource).toContain("scrollIntoView");
    expect(pageSource).toContain("세부항목 바로가기");
    expect(pageSource).toContain("photos={photosBySubitem[viewerState.subitemId]}");
    expect(pageSource).toContain("CaptionSnippetPopover");
    expect(pageSource).toContain("pyeong-photo-caption-area");
    expect(pageSource).toContain("pyeong-photo-add-action");
    expect(pageSource).not.toContain("pyeong-photo-add-tile");
    expect(pageSource).toContain("selectedCategory?.products ?? []");
    expect(pageSource).not.toContain("buildCanonicalConstructionProductModel");
    expect(pageSource).toContain("section.activeVariant.label");
    expect(pageSource).not.toContain("formatConstructionSubitemVariantLabel");
    expect(pageSource).toContain("section.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP");
    expect(pageSource).toContain("activeSubitemId");
    expect(pageSource).toContain("resolvedGallerySections.map");
    expect(pageSource).not.toContain("등록된 사진이 없습니다.");
    expect(styleSource).toMatch(/\.pyeong-photo-card\s*\{[^}]*border-radius:\s*0;[^}]*box-shadow:\s*none;/s);
    expect(styleSource).toMatch(/\.pyeong-photo-thumbnail\s*\{[^}]*border-radius:\s*0;/s);
    expect(styleSource).toMatch(/\.pyeong-photo-gallery-modal\s*\{[^}]*max-height:\s*80dvh;/s);
    expect(styleSource).toMatch(/\.pyeong-photo-gallery-modal__body\s*\{[^}]*overflow:\s*auto;/s);
    expect(controllerSource).toContain("listPyeongPhotoRows");
    expect(controllerSource).toContain("resolvePyeongPhotoUrls");
    expect(controllerSource).toContain("pyeong: scopePyeong");
    expect(controllerSource).toContain("constructionSubitemId");
    expect(controllerSource).toContain("updatePhotoDescription");
    expect(controllerSource).toContain("archivePhotoV2");
    expect(controllerSource).not.toContain("storage.remove");
  });

  it("keeps photo and caption in one object card with archive and reorder contracts", () => {
    const pageSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/photoManagement/PyeongPhotoManagement.jsx"), "utf8");

    expect(pageSource).toContain("<article");
    expect(pageSource).toContain('className={`pyeong-photo-card');
    expect(pageSource).toContain("pyeong-photo-thumbnail");
    expect(pageSource).toContain("pyeong-photo-caption-area");
    expect(pageSource).toContain("onDragStart");
    expect(pageSource).toContain("await reorderPhotos");
    expect(pageSource).toContain("await archivePhoto(photo.id)");
    expect(pageSource).toContain("await flushCaption(photo.id)");
  });

  it("removes mouse focus rectangles while retaining restrained keyboard focus", () => {
    const styleSource = fs.readFileSync(path.resolve(process.cwd(), "src/styles/appStyles.js"), "utf8");
    const tokenSource = fs.readFileSync(path.resolve(process.cwd(), "src/styles/tokens.css"), "utf8");

    expect(tokenSource).toContain("--focus-ring-width: 1px");
    expect(tokenSource).not.toContain("calc(var(--focus-ring-offset) + var(--focus-ring-width))");
    expect(styleSource).toContain('input[type="checkbox"]:focus-visible');
    expect(styleSource).toContain("outline-offset: 1px");
    expect(styleSource).toContain('input:not([type="checkbox"]):not([type="radio"]):not([type="file"])');
    expect(styleSource).toMatch(/input\[type="checkbox"\],\s*input\[type="radio"\]\s*\{[^}]*min-height: 0/s);
    expect(styleSource).toMatch(/\.admin-price-v2-category-item:focus\s*\{[^}]*outline: none/s);
    expect(styleSource).toMatch(/\.admin-price-v2-category-item:focus-visible\s*\{[^}]*outline: 1px solid var\(--focus-ring-color\)/s);
    expect(styleSource).toContain(".items-v2-money-field:focus-within");
    expect(styleSource).toMatch(/\.items-v2-money-field:focus-within\s*\{[^}]*box-shadow: none/s);
    expect(styleSource).not.toContain("*:focus { outline: none");
  });

  it("does not expose the legacy price-photo surface and leaves Library as a placeholder", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/features/photoManagement/PhotoManagementPage.jsx"), "utf8");

    expect(source).not.toContain("LegacyPricePhotoManagement");
    expect(source).not.toContain('id: "price"');
    expect(source).toContain("평수 무관 사진 관리는 다음 단계에서 연결됩니다.");
    expect(source).not.toContain("breadcrumb");
    expect(source).not.toContain("context menu");
  });
});
