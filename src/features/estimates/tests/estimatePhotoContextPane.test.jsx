import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import EstimatePhotoContextPane from "../EstimatePhotoContextPane";

const read = (relativePath) => fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("estimate photo context pane", () => {
  it("renders only the selected row photos and descriptions", () => {
    const markup = renderToStaticMarkup(
      <EstimatePhotoContextPane
        open
        title="거실 샷시"
        photos={[
          { id: "a", signedUrl: "https://example.com/a.jpg", description: "창틀 철거 전 상태" },
          { id: "b", signedUrl: "https://example.com/b.jpg", caption: "외창 좌측 하단" },
        ]}
        onClose={vi.fn()}
        onOpenPhoto={vi.fn()}
      />
    );

    expect(markup).toContain("거실 샷시 사진");
    expect(markup).toContain("2장");
    expect(markup).toContain("창틀 철거 전 상태");
    expect(markup).toContain("외창 좌측 하단");
    expect(markup).toContain('aria-label="사진 패널 닫기"');
    expect(markup).not.toMatch(/업로드|삭제|대표사진|순서 변경|설명 편집/);
  });

  it("keeps loading, empty, and closed states compact", () => {
    const emptyMarkup = renderToStaticMarkup(
      <EstimatePhotoContextPane open title="도배" photos={[]} onClose={vi.fn()} />
    );
    const closedMarkup = renderToStaticMarkup(
      <EstimatePhotoContextPane open={false} title="도배" photos={[]} onClose={vi.fn()} />
    );

    expect(emptyMarkup).toContain("등록된 사진이 없습니다.");
    expect(closedMarkup).toContain('aria-hidden="true"');
    expect(closedMarkup).not.toContain("도배 사진");
  });

  it("uses the existing estimate data flow, viewer, and docked layout contract", () => {
    const adminSource = read("src/app/AdminApp.jsx");
    const styleSource = read("src/styles/appStyles.js");

    expect(adminSource).toContain('import EstimatePhotoContextPane from "../features/estimates/EstimatePhotoContextPane"');
    expect(adminSource).toContain("onOpenPhoto={setEstimatePhotoViewerIndex}");
    expect(adminSource).toContain("<PhotoViewer");
    expect(adminSource).not.toContain("const photoPanel = renderEstimateItemPhotoPanel(row)");
    expect(styleSource).toContain("--estimate-photo-pane-width: clamp(320px, 24vw, 400px)");
    expect(styleSource).toMatch(/\.items-v2-page--photo-pane-open\s*\{[^}]*grid-template-columns:[^}]*var\(--estimate-photo-pane-width\)/s);
    expect(styleSource).toMatch(/\.estimate-photo-context-pane\.is-open\s*\{[^}]*border-left:\s*1px solid var\(--color-border\)/s);
    expect(styleSource).toMatch(/\.estimate-photo-context-pane__body\s*\{[^}]*overflow-y:\s*auto/s);
    expect(styleSource).toContain("transition: grid-template-columns 200ms ease-out");
    expect(styleSource).toMatch(/\.items-v2-page--photo-pane-open \.items-v2-table\s*\{[^}]*min-width:\s*760px/s);
    expect(styleSource).toMatch(/\.items-v2-page--photo-pane-open \.items-v2-table th,[\s\S]*?padding-left:\s*var\(--space-1\)/s);
    expect(adminSource).toContain('selectedPhotoSubitemId === row.subitemId ? "items-v2-row--photo-context"');
    expect(styleSource).toMatch(/\.items-v2-row--photo-context\s*\{[^}]*outline:\s*1px solid var\(--color-primary\)/s);
    expect(styleSource).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.estimate-photo-context-pane[\s\S]*?transition: none !important/s);
  });
});
