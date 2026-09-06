import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import EstimateContextPane from "../EstimateContextPane";
import EstimateLiveSummary from "../EstimateLiveSummary";
import EstimatePhotoContextPane from "../EstimatePhotoContextPane";

const read = (relativePath) => fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

function visitElements(node, result = []) {
  if (!React.isValidElement(node)) return result;
  result.push(node);
  React.Children.forEach(node.props.children, (child) => visitElements(child, result));
  return result;
}

function createSummaryProps(overrides = {}) {
  return {
    conditionSummary: "32평 · 구축 · 빈집",
    onEditCondition: vi.fn(),
    onOutput: vi.fn(),
    rowsByCategory: {
      바닥재: [
        { categoryId: "floor", subitemId: "kcc", material: "KCC장판", spec: "1.8T", quantity: 20, unit: "평", totalAmount: 700000 },
        { categoryId: "floor", subitemId: "lg", material: "LG장판", spec: "1.8T", quantity: 20, unit: "평", totalAmount: 800000 },
      ],
    },
    selectedCount: 2,
    selectedItemsTotal: 1500000,
    adjustmentTotal: 0,
    finalTotal: 1500000,
    ...overrides,
  };
}

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

  it("switches estimate, photo, and condition inside one canonical shell", () => {
    const onModeChange = vi.fn();
    const estimateSummaryProps = createSummaryProps();
    const estimatePane = EstimateContextPane({ estimateSummaryProps, onModeChange });
    const estimateElements = visitElements(estimatePane);
    const tabs = estimateElements.filter((element) => element.props.role === "tab");
    const summary = estimateElements.find((element) => element.type === EstimateLiveSummary);

    expect(summary.props.selectedItemsTotal).toBe(estimateSummaryProps.selectedItemsTotal);
    expect(tabs.map((tab) => tab.props["aria-selected"])).toEqual([true, false]);
    tabs[1].props.onClick();
    expect(onModeChange).toHaveBeenCalledWith("photo");

    const photoPane = EstimateContextPane({
      activeMode: "photo",
      estimateSummaryProps,
      onModeChange,
      photoTitle: "도배",
      photos: [],
    });
    const photoElements = visitElements(photoPane);
    const photoTabs = photoElements.filter((element) => element.props.role === "tab");
    expect(photoElements.some((element) => element.type === EstimatePhotoContextPane)).toBe(true);
    expect(photoElements.some((element) => element.type === EstimateLiveSummary)).toBe(false);
    expect(photoTabs.map((tab) => tab.props["aria-selected"])).toEqual([false, true]);
    photoTabs[0].props.onClick();
    expect(onModeChange).toHaveBeenLastCalledWith("estimate");

    const conditionPane = EstimateContextPane({
      activeMode: "condition",
      estimateSummaryProps,
      onModeChange,
      conditionContent: <div>견적 조건 설정</div>,
    });
    const conditionElements = visitElements(conditionPane);
    expect(conditionElements.filter((element) => element.props.className === "estimate-context-pane")).toHaveLength(1);
    expect(conditionElements.some((element) => element.type === EstimateLiveSummary)).toBe(false);
    expect(conditionElements.some((element) => element.type === EstimatePhotoContextPane)).toBe(false);
    expect(conditionElements.filter((element) => element.props.role === "tab")).toHaveLength(0);
    expect(renderToStaticMarkup(conditionPane)).toContain("견적 조건 설정");
  });

  it("renders only supplied selected rows and updates from canonical live totals", () => {
    const props = createSummaryProps();
    const initial = renderToStaticMarkup(<EstimateLiveSummary {...props} />);
    const updated = renderToStaticMarkup(
      <EstimateLiveSummary
        {...props}
        rowsByCategory={{ 바닥재: [props.rowsByCategory.바닥재[1]] }}
        selectedCount={1}
        selectedItemsTotal={800000}
        adjustmentTotal={-100000}
        finalTotal={700000}
      />
    );
    const empty = renderToStaticMarkup(
      <EstimateLiveSummary {...props} rowsByCategory={{}} selectedCount={0} selectedItemsTotal={0} finalTotal={0} />
    );
    const editButton = visitElements(EstimateLiveSummary(props))
      .find((element) => element.type === "button");
    const outputButton = visitElements(EstimateLiveSummary(props))
      .find((element) => element.props.children === "견적서 출력하기");

    expect(initial).toContain("KCC장판");
    expect(initial).toContain("LG장판");
    expect(initial).toContain("20평");
    expect(initial).toContain("1,500,000");
    expect(initial).not.toMatch(/사업자|업체명|작성일|유효기간|고객 정보|부가세/);
    expect(updated).not.toContain("KCC장판");
    expect(updated).toContain("LG장판");
    expect(updated).toContain("-100,000");
    expect(updated).toContain("700,000");
    expect(empty).toContain("담은 견적 항목이 없습니다.");
    editButton.props.onClick();
    expect(props.onEditCondition).toHaveBeenCalledOnce();
    outputButton.props.onClick();
    expect(props.onOutput).toHaveBeenCalledOnce();
  });

  it("uses the existing estimate data flow, viewer, and docked layout contract", () => {
    const adminSource = read("src/app/AdminApp.jsx");
    const contextPaneSource = read("src/features/estimates/EstimateContextPane.jsx");
    const summarySource = read("src/features/estimates/EstimateLiveSummary.jsx");
    const styleSource = read("src/styles/appStyles.js");

    expect(adminSource).toContain('import EstimateContextPane from "../features/estimates/EstimateContextPane"');
    expect(contextPaneSource).toContain('import EstimateLiveSummary from "./EstimateLiveSummary"');
    expect(contextPaneSource).not.toContain("EstimateDocument");
    expect(contextPaneSource).not.toContain("EstimatePreviewPage");
    expect(summarySource).not.toMatch(/calculateEstimate|buildEstimateSummary|calculation/);
    expect(adminSource).toContain("onOpenPhoto={setEstimatePhotoViewerIndex}");
    expect(adminSource).toContain("<PhotoViewer");
    expect(adminSource).not.toContain("const photoPanel = renderEstimateItemPhotoPanel(row)");
    expect(adminSource).toContain('const [estimateContextMode, setEstimateContextMode] = useState("estimate")');
    expect(adminSource).toMatch(/async function handleOpenItemPhotos\(row\)[\s\S]*?setEstimateContextMode\("photo"\)/);
    expect(adminSource).toContain("estimateSummaryProps={{");
    expect(adminSource).toContain("rowsByCategory: selectedRowsByCategory");
    expect(adminSource).toContain("selectedItemsTotal,");
    expect(adminSource).toContain("adjustmentTotal,");
    expect(adminSource).toContain("finalTotal: total");
    expect(adminSource).toContain('onOutput: () => openEstimatePreview("general")');
    expect(adminSource).not.toContain('<div className="items-v2-toolbar">');
    expect(adminSource).not.toContain('id="items-v2-estimate-pyeong"');
    expect(adminSource).not.toContain("<StickyTotalBar");
    expect(adminSource).not.toContain('import StickyTotalBar from "../components/ui/StickyTotalBar.jsx"');
    expect(adminSource).toMatch(/<section className={\`items-v2-workspace[\s\S]*?\{!estimateConditionDrawerOpen && \([\s\S]*?<section className="items-v2-table-section">[\s\S]*?renderEstimateAdjustmentEditor\(\)[\s\S]*?<details className="items-v2-site-memo">/);
    expect(adminSource).toContain('activeMode={estimateConditionDrawerOpen ? "condition" : estimateContextMode}');
    expect(adminSource).toContain("conditionContent={renderEstimateConditionContent()}");
    expect(adminSource).not.toContain("{renderEstimateConditionDrawer()}");
    expect(adminSource).toMatch(/function openEstimateConditionQuickEdit\(\)[\s\S]*?setEstimateConditionDrawerOpen\(true\)/);
    expect(adminSource).toMatch(/function closeEstimateConditionStage\(\)[\s\S]*?setEstimateConditionDrawerOpen\(false\)/);
    expect(styleSource).toContain("--estimate-context-pane-width: clamp(320px, 25vw, 460px)");
    expect(styleSource).toMatch(/\.items-v2-page\s*\{[^}]*grid-template-columns:[^}]*var\(--estimate-context-pane-width\)/s);
    expect(styleSource).toMatch(/\.estimate-context-pane\s*\{[^}]*border-left:\s*1px solid var\(--color-border\)/s);
    expect(styleSource).toMatch(/\.estimate-context-pane__body--estimate\s*\{[^}]*overflow:\s*hidden/s);
    expect(summarySource).toMatch(/estimate-live-summary__condition[\s\S]*?estimate-live-summary__content[\s\S]*?estimate-live-summary__footer/);
    expect(summarySource).toContain('className="items-v2-icon-button estimate-live-summary__edit"');
    expect(summarySource).toContain("<Pencil");
    expect(styleSource).toMatch(/\.estimate-live-summary\s*\{[^}]*display:\s*flex;[^}]*overflow:\s*hidden/s);
    expect(styleSource).toMatch(/\.estimate-live-summary__content\s*\{[^}]*flex:\s*1 1 auto;[^}]*overflow-y:\s*auto/s);
    expect(styleSource).toMatch(/\.estimate-live-summary__condition\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/s);
    expect(styleSource).toMatch(/\.estimate-live-summary__footer\s*\{[^}]*flex:\s*0 0 auto;[^}]*border-top:\s*1px solid var\(--color-border-strong\)/s);
    expect(styleSource).toMatch(/\.estimate-live-summary__final \.number-text\s*\{[^}]*font-weight:\s*var\(--font-weight-bold\)/s);
    expect(styleSource).toMatch(/\.estimate-context-pane__body--condition\s*\{[^}]*display:\s*flex;[^}]*overflow:\s*hidden/s);
    expect(styleSource).not.toMatch(/\.estimate-condition-content\s*\{[^}]*position:\s*fixed/s);
    expect(styleSource).toMatch(/\.items-v2-workspace\s*\{[^}]*padding:\s*0;/s);
    expect(styleSource).toMatch(/\.items-v2-workspace--condition\s*\{[^}]*gap:\s*0;[^}]*background:\s*var\(--color-surface\)/s);
    expect(styleSource).not.toContain(".items-v2-total-bar");
    expect(styleSource).not.toContain(".estimate-document--context");
    expect(styleSource).toMatch(/\.estimate-photo-context-pane__body\s*\{[^}]*overflow-y:\s*auto/s);
    expect(adminSource).toContain("fitToContainer");
    expect(styleSource).toMatch(/\.items-v2-page \.items-v2-table\s*\{[^}]*min-width:\s*0/s);
    expect(styleSource).toMatch(/\.items-v2-page \.items-v2-table th,[\s\S]*?padding-left:\s*var\(--space-1\)/s);
    expect(adminSource).toContain('selectedPhotoSubitemId === row.subitemId ? "items-v2-row--photo-context"');
    expect(styleSource).toMatch(/\.items-v2-row--photo-context\s*\{[^}]*outline:\s*1px solid var\(--color-primary\)/s);
    expect(styleSource).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.estimate-photo-context-pane[\s\S]*?transition: none !important/s);
  });
});
