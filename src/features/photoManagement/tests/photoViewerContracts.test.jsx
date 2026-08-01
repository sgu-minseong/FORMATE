import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import PhotoViewer, {
  PHOTO_CLICK_SUPPRESS_MS,
  normalizePhotoViewerIndex,
  shouldSuppressPhotoClick,
} from "../../../components/PhotoViewer";
import PhotoManagementPage from "../PhotoManagementPage";
import { PHOTO_TYPES } from "../photoModel";

function createController(overrides = {}) {
  const collections = [
    { id: "budget-1000", company_id: "company", photo_type: PHOTO_TYPES.FULL_PROJECT, name: "1000만원대", sort_order: 0 },
    { id: "budget-2000", company_id: "company", photo_type: PHOTO_TYPES.FULL_PROJECT, name: "2000만원대", sort_order: 1 },
  ];
  const photos = [
    { id: "photo-a", company_id: "company", target_type: PHOTO_TYPES.FULL_PROJECT, target_id: "budget-1000", signed_url: "https://example.com/a.jpg", original_filename: "첫번째.jpg", is_primary: true, sort_order: 0 },
    { id: "photo-b", company_id: "company", target_type: PHOTO_TYPES.FULL_PROJECT, target_id: "budget-2000", signed_url: "https://example.com/b.jpg", original_filename: "다른분류.jpg", is_primary: true, sort_order: 0 },
  ];
  return {
    photoTab: PHOTO_TYPES.FULL_PROJECT,
    setPhotoTab: vi.fn(),
    photoCollections: collections,
    photoCollectionDrafts: Object.fromEntries(collections.map((entry) => [entry.id, entry.name])),
    setPhotoCollectionDrafts: vi.fn(),
    photos,
    photoCatalog: [],
    photoAutoSaveStatus: "idle",
    photoAutoSaveMessage: "",
    photoLoading: false,
    photoSaving: false,
    hasPendingPhotoChanges: false,
    photoError: "",
    setPhotoError: vi.fn(),
    photoNotice: "",
    setPhotoNotice: vi.fn(),
    getPhotosForTarget: (targetType, targetId) => photos.filter((photo) => photo.target_type === targetType && photo.target_id === targetId),
    refresh: vi.fn(),
    flushPendingChanges: vi.fn(),
    addCollection: vi.fn(),
    changeCollectionName: vi.fn(),
    cancelCollectionNameEdit: vi.fn(),
    deleteCollection: vi.fn(),
    reorderCollections: vi.fn(),
    upload: vi.fn(),
    setPrimary: vi.fn(),
    remove: vi.fn(),
    movePhoto: vi.fn(),
    reorderSubitems: vi.fn(),
    ...overrides,
  };
}

describe("common photo viewer contracts", () => {
  it("wraps previous and next navigation", () => {
    expect(normalizePhotoViewerIndex(-1, 5)).toBe(4);
    expect(normalizePhotoViewerIndex(5, 5)).toBe(0);
  });

  it("suppresses the click immediately after dragging", () => {
    const now = 10_000;
    expect(shouldSuppressPhotoClick(now - PHOTO_CLICK_SUPPRESS_MS + 1, now)).toBe(true);
    expect(shouldSuppressPhotoClick(now - PHOTO_CLICK_SUPPRESS_MS, now)).toBe(false);
  });

  it("renders count, navigation, thumbnails, and the close action for multiple photos", () => {
    const markup = renderToStaticMarkup(
      <PhotoViewer
        photos={[
          { id: "a", signed_url: "https://example.com/a.jpg", original_filename: "A" },
          { id: "b", signed_url: "https://example.com/b.jpg", original_filename: "B" },
        ]}
        initialIndex={1}
        onClose={vi.fn()}
      />
    );

    expect(markup).toContain("2 / 2");
    expect(markup).toContain('aria-label="이전 사진"');
    expect(markup).toContain('aria-label="다음 사진"');
    expect(markup).toContain('aria-label="사진 확대 보기 닫기"');
    expect(markup).toContain('aria-label="사진 목록"');
  });

  it("hides unnecessary navigation and thumbnails for one photo", () => {
    const markup = renderToStaticMarkup(
      <PhotoViewer photos={[{ id: "a", signed_url: "https://example.com/a.jpg" }]} onClose={vi.fn()} />
    );

    expect(markup).toContain("1 / 1");
    expect(markup).not.toContain('aria-label="이전 사진"');
    expect(markup).not.toContain('aria-label="다음 사진"');
    expect(markup).not.toContain('aria-label="사진 목록"');
  });

  it("supports keyboard and backdrop dismissal in the shared viewer", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/components/PhotoViewer.jsx"), "utf8");

    expect(source).toContain('event.key === "ArrowLeft"');
    expect(source).toContain('event.key === "ArrowRight"');
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("event.target === event.currentTarget");
    expect(source).toContain('aria-label="사진 확대 보기 닫기"');
    expect(source).toContain('createPortal(viewer, document.body)');
  });
});

describe("photo management rendering contracts", () => {
  it("shows only the selected classification photos and keeps the add tile last", () => {
    const markup = renderToStaticMarkup(<PhotoManagementPage controller={createController()} />);

    expect(markup).toContain("첫번째.jpg");
    expect(markup).not.toContain("다른분류.jpg");
    expect(markup).toContain('aria-label="1000만원대 사진 추가"');
    expect(markup.indexOf("첫번째.jpg")).toBeLessThan(markup.indexOf('aria-label="1000만원대 사진 추가"'));
    expect(markup.indexOf("2000만원대")).toBeLessThan(markup.indexOf('aria-label="사진 분류 추가"'));
  });

  it("shows the add tile even when the selected classification has no photos", () => {
    const controller = createController({ photos: [], getPhotosForTarget: () => [] });
    const markup = renderToStaticMarkup(<PhotoManagementPage controller={controller} />);

    expect(markup).toContain('aria-label="1000만원대 사진 추가"');
  });

  it("uses the common viewer in both photo surfaces and separates card controls", () => {
    const photoPageSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/photoManagement/PhotoManagementPage.jsx"), "utf8");
    const adminAppSource = fs.readFileSync(path.resolve(process.cwd(), "src/app/AdminApp.jsx"), "utf8");

    expect(photoPageSource).toContain('import PhotoViewer, { shouldSuppressPhotoClick }');
    expect(photoPageSource).toContain("onClick={() => openViewer(index)}");
    expect(photoPageSource).toMatch(/setPrimary\(photo\);/);
    expect(photoPageSource).toMatch(/event\.stopPropagation\(\);\s*if \(window\.confirm\("이 사진을 삭제할까요\?"\)\)/);
    expect(adminAppSource).toContain('import PhotoViewer from "../components/PhotoViewer.jsx"');
    expect(adminAppSource).toContain("onClick={() => setEstimatePhotoViewerIndex(index)}");
  });

  it("keeps fetch read-only and scopes photo writes to the current company", () => {
    const apiSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/photoManagement/photoApi.js"), "utf8");
    const fetchBlock = apiSource.slice(
      apiSource.indexOf("export async function fetchPhotoManagementData"),
      apiSource.indexOf("export async function fetchPhotosForTarget")
    );

    expect(fetchBlock).not.toContain(".insert(");
    expect(apiSource).toMatch(/persistPhotoPlacement[\s\S]*?\.eq\("company_id", companyId\)/);
    expect(apiSource).toMatch(/updatePhotoCollectionOrder[\s\S]*?\.eq\("company_id", companyId\)/);
    expect(apiSource).toMatch(/updatePhotoSubitemOrder[\s\S]*?\.eq\("company_id", companyId\)/);
  });

  it("keeps the add controls, removes per-name save, and exposes one page save action", () => {
    const markup = renderToStaticMarkup(<PhotoManagementPage controller={createController({ hasPendingPhotoChanges: true })} />);

    expect(markup).toContain("저장</button>");
    expect(markup).not.toContain("이름 저장");
    expect(markup).toContain('aria-label="사진 분류 추가"');
    expect(markup).toContain('aria-label="1000만원대 사진 추가"');
  });

  it("uses the full-width fluid shell and viewport viewer layout contracts", () => {
    const styles = fs.readFileSync(path.resolve(process.cwd(), "src/styles/appStyles.js"), "utf8");

    expect(styles).toMatch(/\.photo-management-page\s*\{[\s\S]*?max-width:\s*none\s*!important/);
    expect(styles).toMatch(/\.photo-management-workspace\s*\{[\s\S]*?grid-template-columns:[^;]*minmax\(0, 1fr\)/);
    expect(styles).toMatch(/\.photo-viewer-backdrop\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;[\s\S]*?width:\s*100vw;[\s\S]*?height:\s*100dvh/);
    expect(styles).toMatch(/\.photo-viewer-image-wrap > img\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?max-height:\s*100%;[\s\S]*?object-fit:\s*contain/);
    expect(styles).toMatch(/\.photo-sidebar-item-label\s*\{[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap/);
  });

  it("does not leak a previously selected subitem label into project headers", () => {
    const controller = createController({
      photoCatalog: [{ id: "demolition", name: "철거", subitems: [{ id: "wall", name: "벽 철거" }] }],
    });
    const markup = renderToStaticMarkup(<PhotoManagementPage controller={controller} />);

    expect(markup).toContain("1000만원대");
    expect(markup).not.toContain("<small>철거</small>");
  });
});
