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

  it("renders navigation, thumbnails, and close action for multiple photos", () => {
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

  it("hides unnecessary navigation and preserves the current description", () => {
    const markup = renderToStaticMarkup(
      <PhotoViewer
        photos={[{
          id: "a",
          signedUrl: "https://example.com/a.jpg",
          description: "시공 완료 사진",
        }]}
        onClose={vi.fn()}
      />
    );

    expect(markup).toContain("1 / 1");
    expect(markup).toContain("시공 완료 사진");
    expect(markup).not.toContain('aria-label="이전 사진"');
    expect(markup).not.toContain('aria-label="다음 사진"');
    expect(markup).not.toContain('aria-label="사진 목록"');
  });

  it("supports keyboard, backdrop, and portal dismissal", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/PhotoViewer.jsx"),
      "utf8"
    );

    expect(source).toContain('event.key === "ArrowLeft"');
    expect(source).toContain('event.key === "ArrowRight"');
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("event.target === event.currentTarget");
    expect(source).toContain('createPortal(viewer, document.body)');
  });

  it("routes mouse and keyboard arrows through the same immediate navigation owners", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/PhotoViewer.jsx"),
      "utf8"
    );
    const styles = fs.readFileSync(
      path.resolve(process.cwd(), "src/styles/appStyles.js"),
      "utf8"
    );

    expect(source).toContain("onClick={showPrevious}");
    expect(source).toContain("onClick={showNext}");
    expect(source.match(/showPrevious\(\);/g)).toHaveLength(1);
    expect(source.match(/showNext\(\);/g)).toHaveLength(1);
    expect(styles).toMatch(/\.photo-viewer-nav:active:not\(:disabled\)\s*\{[^}]*transform:\s*translateY\(-50%\)/s);
    expect(styles).toMatch(/\.photo-viewer-nav\s*\{[^}]*transition:\s*border-color 100ms ease, background-color 100ms ease/s);
  });
});

describe("canonical photo surfaces", () => {
  it("offers only the two current photo modes", () => {
    const markup = renderToStaticMarkup(<PhotoManagementPage controller={{}} />);

    expect(markup).toContain("평형별 사진 관리");
    expect(markup).toContain("평수 무관 사진 관리");
    expect(markup).not.toContain("공사 가격별 사진 관리");
    expect(markup.match(/class="photo-management-mode-card"/g)).toHaveLength(2);
  });

  it("keeps the shared viewer on both pyeong management and Estimate", () => {
    const pyeongSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/photoManagement/PyeongPhotoManagement.jsx"),
      "utf8"
    );
    const adminAppSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/AdminApp.jsx"),
      "utf8"
    );

    expect(pyeongSource).toContain('import PhotoViewer, { shouldSuppressPhotoClick }');
    expect(adminAppSource).toContain('import PhotoViewer from "../components/PhotoViewer.jsx"');
    expect(adminAppSource).toContain("listPyeongSubitemPhotos");
    expect(adminAppSource).not.toContain("fetchPhotosForTarget");
  });
});
