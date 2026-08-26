import React from "react";
import { describe, expect, it, vi } from "vitest";
import appStyles from "../../../styles/appStyles";
import EstimateDocument from "../EstimateDocument";
import EstimatePreviewPage, {
  ESTIMATE_A4_PAGE,
  EstimateDocumentInputPane,
  EstimatePageFit,
  getEstimatePageFit,
} from "../EstimatePreviewPage";

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

  it("keeps the preview canvas fixed while only the input pane scrolls", () => {
    expect(appStyles).toMatch(/\.estimate-preview-canvas\s*\{[^}]*overflow:\s*hidden;/s);
    expect(appStyles).toMatch(/\.estimate-document--screen\s*\{[^}]*height:\s*1123px;[^}]*overflow:\s*hidden;/s);
    expect(appStyles).toMatch(/\.estimate-document-pane__body\s*\{[^}]*overflow-y:\s*auto;/s);
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
    const screenDocument = documents.find((element) => element.props.outputMode === "screen");
    const pdfDocument = documents.find((element) => element.props.outputMode === "pdf");

    expect(viewport).toBeDefined();
    expect(exportHost).toBeDefined();
    expect(screenDocument.props.documentRef).toBeUndefined();
    expect(pdfDocument.props.documentRef).toBe(printableDocumentRef);
    expect(viewport.props.className).toBe("estimate-preview-canvas");
    expect(viewport.props.children.type).toBe(EstimatePageFit);
    expect(viewport.props.children.props.children).toBe(screenDocument);
    expect(exportHost.props.children).toBe(pdfDocument);
    expect(screenDocument.props.total).toBe(pdfDocument.props.total);
    expect(screenDocument.props.renderGeneralTable).toBe(pdfDocument.props.renderGeneralTable);
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

    expect(collectText(screenDocument)).toEqual(collectText(pdfDocument));
    expect(screenDocument.props["data-estimate-document"]).toBe("screen");
    expect(pdfDocument.props["data-estimate-document"]).toBe("pdf");
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
    const generalScreen = visitElements(general).find((element) => element.type === EstimateDocument && element.props.outputMode === "screen");
    const detailScreen = visitElements(detail).find((element) => element.type === EstimateDocument && element.props.outputMode === "screen");

    expect(generalScreen.props.customerName).toBe("홍길동");
    expect(detailScreen.props.customerName).toBe("홍길동");
    expect(generalScreen.props.validUntil).toBe(detailScreen.props.validUntil);
    expect(generalScreen.props.onCustomerNameChange).toBe(detailScreen.props.onCustomerNameChange);
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
