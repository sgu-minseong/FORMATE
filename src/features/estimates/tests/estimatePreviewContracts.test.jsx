import React from "react";
import { describe, expect, it, vi } from "vitest";
import EstimateDocument from "../EstimateDocument";
import EstimatePreviewPage from "../EstimatePreviewPage";

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
    onCustomerNameChange: vi.fn(),
    onCustomerPhoneChange: vi.fn(),
    onAddressChange: vi.fn(),
    onWorkDateChange: vi.fn(),
    onVatStatusChange: vi.fn(),
    conditionSummary: "32평 · 구축 · 살림집",
    conditionPyeong: "32",
    estimatePyeong: "34",
    constructionDaysTotal: 0,
    constructionDayParts: [],
    renderGeneralTable: () => <div>일반 견적 항목</div>,
    renderDetailTable: () => <div>세부 견적 항목</div>,
    renderAdjustmentEditor: () => <div>추가금·할인</div>,
    renderAdjustmentSummary: () => <div>추가금·할인 요약</div>,
    siteMemo: "내부 메모",
    onSiteMemoChange: vi.fn(),
    estimateNumber: "EST-20260729-001",
    ...overrides,
  };
}

describe("estimate preview rendering contracts", () => {
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

  it("separates the screen scroll host from the PDF document node", () => {
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
    expect(viewport.props.children).toBe(screenDocument);
    expect(exportHost.props.children).toBe(pdfDocument);
    expect(screenDocument.props.total).toBe(pdfDocument.props.total);
    expect(screenDocument.props.renderGeneralTable).toBe(pdfDocument.props.renderGeneralTable);
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
});
