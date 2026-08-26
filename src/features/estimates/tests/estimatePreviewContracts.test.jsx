import React from "react";
import { describe, expect, it, vi } from "vitest";
import appStyles from "../../../styles/appStyles";
import EstimateDocument from "../EstimateDocument";
import EstimatePreviewPage, {
  ESTIMATE_A4_PAGE,
  ESTIMATE_PREVIEW_ZOOM,
  clampEstimatePreviewPan,
  clampEstimatePreviewZoom,
  EstimateDocumentInputPane,
  EstimatePageFit,
  getCursorCenteredPan,
  getEstimatePageFit,
  getEstimatePreviewDefaultView,
} from "../EstimatePreviewPage";
import {
  calculateEstimatePageSlices,
  getEstimatePagePair,
} from "../estimatePagination";

function visitElements(node, elements = []) {
  if (Array.isArray(node)) {
    node.forEach((child) => visitElements(child, elements));
    return elements;
  }
  if (!React.isValidElement(node)) return elements;

  elements.push(node);
  React.Children.forEach(node.props.children, (child) => visitElements(child, elements));
  return elements;
}

function collectText(node, text = []) {
  if (Array.isArray(node)) {
    node.forEach((child) => collectText(child, text));
    return text;
  }
  if (typeof node === "string" || typeof node === "number") {
    text.push(`${node}`);
    return text;
  }
  if (!React.isValidElement(node)) return text;

  React.Children.forEach(node.props.children, (child) => collectText(child, text));
  return text;
}

function createDocumentProps(overrides = {}) {
  return {
    companyName: "FORMATE",
    total: 660000,
    createdDate: "2026-07-29",
    validUntil: "2026-08-05",
    vatStatus: "부가세 별도",
    customerName: "홍길동",
    customerPhone: "010-0000-0000",
    address: "서울시 강남구",
    workDate: "2026-08-10",
    issuedAt: "2026-07-29",
    validUntilDate: "2026-08-05",
    onCustomerNameChange: vi.fn(),
    onCustomerPhoneChange: vi.fn(),
    onAddressChange: vi.fn(),
    onWorkDateChange: vi.fn(),
    onVatStatusChange: vi.fn(),
    onIssuedAtChange: vi.fn(),
    onValidUntilChange: vi.fn(),
    conditionSummary: "32평 · 구축 · 살림집",
    conditionPyeong: "32",
    estimatePyeong: "34",
    constructionDaysTotal: 0,
    constructionDayParts: [],
    renderGeneralTable: () => <div>일반 견적 항목</div>,
    renderDetailTable: () => <div>세부 견적 항목</div>,
    renderAdjustmentSummary: () => <div>추가금·할인 요약</div>,
    estimateNumber: "EST-20260729-001",
    ...overrides,
  };
}

describe("estimate preview rendering contracts", () => {
  it("fits the fixed A4 page by the tighter width or height constraint", () => {
    const heightLimited = getEstimatePageFit(1200, 800);
    const widthLimited = getEstimatePageFit(500, 1200);

    expect(ESTIMATE_A4_PAGE.width / ESTIMATE_A4_PAGE.height).toBeCloseTo(210 / 297, 3);
    expect(heightLimited.height).toBeCloseTo(800);
    expect(heightLimited.width).toBeLessThanOrEqual(1200);
    expect(widthLimited.width).toBeCloseTo(500);
    expect(widthLimited.height).toBeLessThanOrEqual(1200);
  });

  it("fits one page or a two-page pair inside the same viewport", () => {
    const single = getEstimatePageFit(1000, 900, 1);
    const pair = getEstimatePageFit(1000, 900, 2);

    expect(single.width).toBeLessThanOrEqual(1000);
    expect(single.height).toBeLessThanOrEqual(900);
    expect(pair.width).toBeLessThanOrEqual(1000);
    expect(pair.height).toBeLessThanOrEqual(900);
    expect(pair.scale).toBeLessThan(single.scale);
  });

  it("uses PDF slice math for pairs and an odd last page", () => {
    const sourcePageHeight = 794 * 277 / 190;
    const slices = calculateEstimatePageSlices(794, sourcePageHeight * 5 - 1);
    const firstPair = getEstimatePagePair(slices.length, 0);
    const lastPair = getEstimatePagePair(slices.length, 2);

    expect(slices).toHaveLength(5);
    expect(slices[1].sourceOffset).toBeCloseTo(sourcePageHeight);
    expect(firstPair.pageIndexes).toEqual([0, 1]);
    expect(lastPair.pageIndexes).toEqual([4]);
  });

  it("clamps zoom and pan while keeping cursor-centered document coordinates", () => {
    expect(clampEstimatePreviewZoom(0.5)).toBe(1);
    expect(clampEstimatePreviewZoom(4)).toBe(3);

    const nextPan = getCursorCenteredPan({
      pointer: { x: 400, y: 300 },
      base: { x: 100, y: 50 },
      pan: { x: 0, y: 0 },
      fitScale: 0.5,
      zoom: 1,
      nextZoom: 2,
    });
    expect(nextPan).toEqual({ x: -300, y: -250 });
    expect(clampEstimatePreviewPan({
      pan: { x: -5000, y: 5000 },
      base: { x: 100, y: 50 },
      content: { width: 1600, height: 1400 },
      viewport: { x: 0, y: 0, width: 800, height: 600 },
    })).toEqual({ x: -1636, y: 486 });
  });

  it("starts above Fit while preserving exact Fit as the minimum", () => {
    expect(getEstimatePreviewDefaultView()).toEqual({
      zoom: ESTIMATE_PREVIEW_ZOOM.default,
      pan: { x: 0, y: 0 },
    });
    expect(ESTIMATE_PREVIEW_ZOOM.default).toBe(1.1);
    expect(clampEstimatePreviewZoom(1 - ESTIMATE_PREVIEW_ZOOM.step)).toBe(1);
  });

  it("keeps the preview canvas fixed while only the input pane scrolls", () => {
    expect(appStyles).toMatch(/\.estimate-preview-canvas\s*\{[^}]*overflow:\s*hidden;/s);
    expect(appStyles).toMatch(/\.estimate-document--screen\s*\{[^}]*height:\s*1123px;[^}]*overflow:\s*hidden;/s);
    expect(appStyles).toMatch(/\.estimate-document-pane__body\s*\{[^}]*overflow-y:\s*auto;/s);
    expect(appStyles).not.toMatch(/\.estimate-document-stage\s*\{[^}]*will-change:\s*transform;/s);
    expect(appStyles).toMatch(/\.estimate-document-fit\.is-zoomed\s*\{[^}]*cursor:\s*grab;/s);
    expect(appStyles).toMatch(/\.estimate-document-fit\.is-dragging\s*\{[^}]*cursor:\s*grabbing;/s);
  });

  it("renders every long-estimate row and keeps the document content contract", () => {
    const itemLabels = Array.from({ length: 80 }, (_, index) => `견적 항목 ${index + 1}`);
    const document = EstimateDocument({
      previewType: "general",
      outputMode: "screen",
      ...createDocumentProps({
        renderGeneralTable: () => (
          <ol>
            {itemLabels.map((label) => <li key={label}>{label}</li>)}
          </ol>
        ),
      }),
    });
    const text = collectText(document).join(" ").replace(/\s+/g, " ").trim();

    itemLabels.forEach((label) => expect(text).toContain(label));
    expect(text).toContain("FORMATE 인테리어 견적서");
    expect(text).toContain("견적 조건");
    expect(text).toContain("제외 항목");
    expect(text).toContain("견적서 번호 EST-20260729-001");
  });

  it("keeps the canonical document read-only", () => {
    const document = EstimateDocument({
      previewType: "general",
      outputMode: "screen",
      ...createDocumentProps(),
    });
    const interactiveElements = visitElements(document).filter((element) => (
      ["input", "select", "textarea", "button"].includes(element.type)
    ));

    expect(interactiveElements).toEqual([]);
  });

  it("fits the screen document without a scroll host and reuses it for PDF", () => {
    const printableDocumentRef = { current: null };
    const documentProps = createDocumentProps();
    const preview = EstimatePreviewPage({
      previewType: "general",
      onPreviewTypeChange: vi.fn(),
      backLabel: "견적 재생성",
      onBack: vi.fn(),
      notice: "",
      error: "",
      saving: false,
      onSave: vi.fn(),
      onDownloadPdf: vi.fn(),
      printableDocumentRef,
      documentProps,
    });
    const elements = visitElements(preview);
    const viewport = elements.find((element) => element.props["data-estimate-preview-viewport"] !== undefined);
    const exportHost = elements.find((element) => element.props.className === "estimate-pdf-export-host");
    const documents = elements.filter((element) => element.type === EstimateDocument);
    const pdfDocument = documents.find((element) => element.props.outputMode === "pdf");
    const viewer = elements.find((element) => element.type === EstimatePageFit);

    expect(viewport).toBeDefined();
    expect(exportHost).toBeDefined();
    expect(pdfDocument.props.documentRef).toBe(printableDocumentRef);
    expect(viewport.props.className).toBe("estimate-preview-canvas");
    expect(viewport.props.children.type).toBe(EstimatePageFit);
    expect(exportHost.props.children).toBe(pdfDocument);
    expect(viewer.props.documentProps.total).toBe(pdfDocument.props.total);
    expect(viewer.props.documentProps.renderGeneralTable).toBe(pdfDocument.props.renderGeneralTable);
    expect(viewer.props.resetKey).toBe("general:EST-20260729-001");
  });

  it("routes document pane fields to live state handlers", () => {
    const documentProps = createDocumentProps();
    const pane = EstimateDocumentInputPane({
      documentProps,
      notice: "",
      error: "",
      saving: false,
      autoSaveStatus: "saved",
      autoSaveError: "",
      onRetryAutoSave: vi.fn(),
      onSave: vi.fn(),
    });
    const elements = visitElements(pane);
    const customerNameInput = elements.find((element) => element.props.id === "estimate-document-customer-name");
    const vatSelect = elements.find((element) => element.props.id === "estimate-document-vat-status");
    const validUntilInput = elements.find((element) => element.props.id === "estimate-document-valid-until");

    customerNameInput.props.onChange({ target: { value: "김고객" } });
    vatSelect.props.onChange({ target: { value: "부가세 포함" } });
    validUntilInput.props.onChange({ target: { value: "2026-08-31" } });

    expect(documentProps.onCustomerNameChange).toHaveBeenCalledWith({ target: { value: "김고객" } });
    expect(documentProps.onVatStatusChange).toHaveBeenCalledWith({ target: { value: "부가세 포함" } });
    expect(documentProps.onValidUntilChange).toHaveBeenCalledWith({ target: { value: "2026-08-31" } });
  });

  it("keeps save failure and retry inside the shared autosave status surface", () => {
    const onRetryAutoSave = vi.fn();
    const pane = EstimateDocumentInputPane({
      documentProps: createDocumentProps(),
      notice: "",
      error: "",
      saving: false,
      autoSaveStatus: "error",
      autoSaveError: "연결 실패",
      onRetryAutoSave,
      onSave: vi.fn(),
    });
    const retryButton = visitElements(pane).find((element) => (
      element.type === "button" && collectText(element).join("") === "재시도"
    ));

    expect(collectText(pane)).toContain("저장 실패");
    expect(collectText(pane)).toContain("연결 실패");
    retryButton.props.onClick();
    expect(onRetryAutoSave).toHaveBeenCalledOnce();
  });

  it("uses one zoom state for wheel, HUD controls, and Fit", () => {
    const source = EstimatePageFit.toString();

    expect(source).toContain("setZoomAtPoint(nextZoom, pointer)");
    expect(source).toContain("changeZoom(-ESTIMATE_PREVIEW_ZOOM.step)");
    expect(source).toContain("changeZoom(ESTIMATE_PREVIEW_ZOOM.step)");
    expect(source).toContain("onClick: resetView");
    expect(source).toContain("Math.hypot");
  });

  it("keeps screen and PDF output modes on the same document content", () => {
    const documentProps = createDocumentProps();
    const screenDocument = EstimateDocument({
      previewType: "detail",
      outputMode: "screen",
      ...documentProps,
    });
    const pdfDocument = EstimateDocument({
      previewType: "detail",
      outputMode: "pdf",
      ...documentProps,
    });
    const previewDocument = EstimateDocument({
      previewType: "detail",
      outputMode: "preview",
      ...documentProps,
    });

    expect(collectText(screenDocument)).toEqual(collectText(pdfDocument));
    expect(collectText(previewDocument)).toEqual(collectText(pdfDocument));
    expect(screenDocument.props["data-estimate-document"]).toBe("screen");
    expect(pdfDocument.props["data-estimate-document"]).toBe("pdf");
    expect(previewDocument.props["data-estimate-document"]).toBe("preview");
  });

  it("preserves one document state across general and detail tabs", () => {
    const documentProps = createDocumentProps();
    const general = EstimatePreviewPage({
      previewType: "general",
      onPreviewTypeChange: vi.fn(),
      backLabel: "견적 재생성",
      onBack: vi.fn(),
      saving: false,
      onSave: vi.fn(),
      onDownloadPdf: vi.fn(),
      printableDocumentRef: { current: null },
      documentProps,
    });
    const detail = EstimatePreviewPage({
      previewType: "detail",
      onPreviewTypeChange: vi.fn(),
      backLabel: "견적 재생성",
      onBack: vi.fn(),
      saving: false,
      onSave: vi.fn(),
      onDownloadPdf: vi.fn(),
      printableDocumentRef: { current: null },
      documentProps,
    });
    const generalViewer = visitElements(general).find((element) => element.type === EstimatePageFit);
    const detailViewer = visitElements(detail).find((element) => element.type === EstimatePageFit);

    expect(generalViewer.props.documentProps.customerName).toBe("홍길동");
    expect(detailViewer.props.documentProps.customerName).toBe("홍길동");
    expect(generalViewer.props.documentProps.validUntil).toBe(detailViewer.props.documentProps.validUntil);
    expect(generalViewer.props.documentProps.onCustomerNameChange).toBe(detailViewer.props.documentProps.onCustomerNameChange);
    expect(generalViewer.props.resetKey).not.toBe(detailViewer.props.resetKey);
  });

  it("keeps selection surfaces neutral while preserving semantic mint", () => {
    expect(appStyles).toMatch(/\.estimate-preview-tabs button\.active\s*\{[^}]*background:\s*transparent;/s);
    expect(appStyles).toMatch(/\.photo-type-row\.active\s*\{[^}]*background:\s*var\(--surface-selected\);/s);
    expect(appStyles).toMatch(/\.preview-type-button\.active\s*\{[^}]*background:\s*var\(--surface-selected\);/s);
    expect(appStyles).toMatch(/\.category-card\.selected\s*\{[^}]*background:\s*var\(--surface-selected\);/s);
    expect(appStyles).toMatch(/\.sash-catalog-grid__pin\.is-pinned\s*\{[^}]*background:\s*var\(--color-primary\);/s);
    expect(appStyles).toMatch(/\.pdf-capture-area \.general-estimate-table tfoot tr:last-child td\s*\{[^}]*background:\s*var\(--color-primary-soft\);/s);
  });

  it("shows the saved estimate share action in the preview header", () => {
    const onShare = vi.fn();
    const preview = EstimatePreviewPage({
      previewType: "general",
      onPreviewTypeChange: vi.fn(),
      backLabel: "저장 견적 보기",
      onBack: vi.fn(),
      notice: "",
      error: "",
      saving: false,
      onSave: vi.fn(),
      onDownloadPdf: vi.fn(),
      onShare,
      shareLabel: "링크 다시 복사",
      printableDocumentRef: { current: null },
      documentProps: createDocumentProps(),
    });
    const shareButton = visitElements(preview).find((element) => (
      element.type === "button"
      && collectText(element).join(" ").includes("링크 다시 복사")
    ));

    expect(shareButton).toBeDefined();
    shareButton.props.onClick();
    expect(onShare).toHaveBeenCalledOnce();
  });

  it("shows the contract entry point for an approved saved estimate", () => {
    const onCreateContract = vi.fn();
    const preview = EstimatePreviewPage({
      previewType: "general",
      onPreviewTypeChange: vi.fn(),
      backLabel: "저장 견적 보기",
      onBack: vi.fn(),
      notice: "",
      error: "",
      saving: false,
      onSave: vi.fn(),
      onDownloadPdf: vi.fn(),
      onCreateContract,
      printableDocumentRef: { current: null },
      documentProps: createDocumentProps(),
    });
    const contractButton = visitElements(preview).find((element) => (
      element.type === "button"
      && collectText(element).join(" ").includes("계약서 작성")
    ));

    expect(contractButton).toBeDefined();
    contractButton.props.onClick();
    expect(onCreateContract).toHaveBeenCalledOnce();
  });
});
