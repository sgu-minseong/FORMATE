import React from "react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import ContractDocument from "../ContractDocument";
import {
  buildContractActionArgs,
  buildCreateContractDraftArgs,
  buildSaveContractDocumentArgs,
} from "../contractApi";
import {
  getContractDisplayDocument,
  isApprovedCurrentEstimateVersion,
  normalizeContractDocument,
} from "../contractModel";
import { buildContractPdfFileName, exportContractPdf } from "../exportContractPdf";

const contractSql = readFileSync(
  new URL("../../../../supabase/contract_documents.sql", import.meta.url),
  "utf8"
);
const contractEditorSource = readFileSync(
  new URL("../ContractEditorPage.jsx", import.meta.url),
  "utf8"
);
const estimatePdfSource = readFileSync(
  new URL("../../estimates/exportEstimatePdf.js", import.meta.url),
  "utf8"
);
const estimateCalculationSource = readFileSync(
  new URL("../../estimates/calculation.js", import.meta.url),
  "utf8"
);

function getFunctionBody(name) {
  const start = contractSql.indexOf(`create or replace function public.${name}`);
  if (start < 0) return "";
  const next = contractSql.indexOf("create or replace function public.", start + 1);
  return contractSql.slice(start, next < 0 ? contractSql.length : next);
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

function createDocumentData() {
  return {
    title: "인테리어 공사 계약서",
    contractNumber: "CT-20260731-001",
    customerSnapshot: { name: "김고객", phone: "010-1234-5678", email: "customer@example.com" },
    companySnapshot: { name: "포메이트 인테리어", companyCode: "FORMATE" },
    projectSnapshot: { name: "서초 현장", address: "서울시 서초구", detailAddress: "101동" },
    estimateSnapshot: {
      estimateNumber: "FM-20260731-001",
      totalAmount: 33000000,
      scopeItems: [{ categoryName: "바닥", material: "강마루" }],
    },
    construction: { startDate: "2026-08-10", endDate: "2026-09-01", periodDescription: "공휴일 제외" },
    paymentTerms: [{ id: "deposit", label: "계약금", calculationType: "percentage", percentage: 10, dueDescription: "계약 시" }],
    scopeSupplement: "철거 후 현장 상태를 확인합니다.",
    exclusions: "가전 별도",
    materialChangePolicy: "변경 전 협의",
    changeOrderPolicy: "추가 견적 승인 후 진행",
    delayCancellationPolicy: "일정 변경 시 상호 협의",
    warranty: "완료일 기준 협의 기간",
    specialTerms: "현장 관리 규칙 준수",
    internalMemo: "고객에게 보이지 않는 메모",
  };
}

describe("contract document database contracts", () => {
  it("creates a draft only from the approved current estimate and snapshots canonical parties and amount", () => {
    const body = getFunctionBody("create_contract_draft");
    expect(body).toContain("ev.status = 'approved'");
    expect(body).toContain("e.current_estimate_version_id = ev.id");
    expect(body).toContain("'customerSnapshot', jsonb_build_object(");
    expect(body).toContain("'projectSnapshot', jsonb_build_object(");
    expect(body).toContain("'totalAmount', greatest(coalesce(v_version.total_amount, 0), 0)");
    expect(body).toContain("'scopeItems', coalesce(v_version.items_snapshot -> 'items'");
    expect(body).toContain("'draft'");
  });

  it("saves only the contract working document without changing estimate lifecycle state", () => {
    const body = getFunctionBody("save_contract_document");
    expect(body).toContain("set document_data = v_next_document");
    expect(body).toContain("v_existing || jsonb_build_object(");
    expect(body).not.toContain("update public.estimates");
    expect(body).not.toContain("update public.estimate_versions");
    expect(body).not.toContain("construction_status");
  });

  it("creates a new immutable review version and never updates an existing version", () => {
    const body = getFunctionBody("request_contract_review");
    expect(body).toContain("coalesce(max(cv.version_no), 0) + 1");
    expect(body).toContain("insert into public.contract_versions");
    expect(body).toContain("v_contract.document_data - 'internalMemo'");
    expect(body).not.toContain("update public.contract_versions");
    expect(contractSql).toContain("before update or delete on public.contract_versions");
  });

  it("keeps customer signature separate from vendor completion", () => {
    const body = getFunctionBody("update_contract_status");
    expect(body).toContain("when 'customer_reviewing' then v_next_status in ('revision_requested', 'customer_signed', 'cancelled')");
    expect(body).toContain("when 'customer_signed' then v_next_status in ('completed', 'cancelled')");
    expect(body).toContain("completed_by = case when v_next_status = 'completed' then auth.uid()");
    expect(body).not.toContain("update public.estimates");
  });

  it("scopes contract versions to company members through RLS and company API arguments", () => {
    expect(contractSql).toContain("alter table public.contract_versions enable row level security");
    expect(contractSql).toContain("cm.company_id = contract_versions.company_id");
    expect(contractSql).toContain("cm.user_id = auth.uid()");
    expect(buildCreateContractDraftArgs({ companyId: "company-1", projectId: "project-1", estimateVersionId: "version-1" })).toEqual({
      p_company_id: "company-1",
      p_project_id: "project-1",
      p_estimate_version_id: "version-1",
    });
    expect(buildSaveContractDocumentArgs({ companyId: "company-1", contractId: "contract-1", documentData: { title: "계약" } })).toEqual({
      p_company_id: "company-1",
      p_contract_id: "contract-1",
      p_document_data: { title: "계약" },
    });
    expect(buildContractActionArgs({ companyId: "company-1", contractId: "contract-1" })).toEqual({
      p_company_id: "company-1",
      p_contract_id: "contract-1",
    });
  });
});

describe("contract document UI contracts", () => {
  it("restores saved draft fields and uses immutable snapshots outside editable states", () => {
    const draft = normalizeContractDocument(createDocumentData());
    expect(draft.customerSnapshot.name).toBe("김고객");
    expect(draft.paymentTerms[0].percentage).toBe(10);

    const immutable = getContractDisplayDocument({
      status: "customer_reviewing",
      document_data: { ...createDocumentData(), exclusions: "작업본" },
      currentVersion: { document_snapshot: { ...createDocumentData(), exclusions: "검토본" } },
    });
    expect(immutable.exclusions).toBe("검토본");
  });

  it("recognizes only the approved current estimate version as a contract source", () => {
    expect(isApprovedCurrentEstimateVersion({
      id: "version-1",
      status: "approved",
      estimate: { current_estimate_version_id: "version-1" },
    })).toBe(true);
    expect(isApprovedCurrentEstimateVersion({
      id: "version-old",
      status: "approved",
      estimate: { current_estimate_version_id: "version-new" },
    })).toBe(false);
  });

  it("renders snapshots and omits the internal vendor memo from the contract document", () => {
    const document = ContractDocument({
      outputMode: "screen",
      documentData: createDocumentData(),
      contractStatus: "draft",
    });
    const text = collectText(document).join(" ");
    expect(text).toContain("김고객");
    expect(text).toContain("서초 현장");
    expect(text).toContain("33,000,000원");
    expect(text).toContain("바닥 · 강마루");
    expect(text).not.toContain("고객에게 보이지 않는 메모");
  });

  it("exports only a dedicated PDF ContractDocument node", async () => {
    const capture = vi.fn().mockResolvedValue({
      width: 1000,
      height: 1400,
      toDataURL: () => "data:image/png;base64,pdf",
    });
    const pdf = {
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
      addImage: vi.fn(),
      addPage: vi.fn(),
      save: vi.fn(),
    };
    const result = await exportContractPdf({
      documentNode: { dataset: { contractDocument: "pdf" } },
      contractNumber: "CT/001",
      customerName: "김 고객",
      projectName: "서초 현장",
      issuedAt: "2026-07-31",
      backgroundColor: "#fff",
      capture,
      createPdf: () => pdf,
    });
    expect(result).toBe(true);
    expect(capture).toHaveBeenCalledOnce();
    expect(pdf.save).toHaveBeenCalledWith("계약서_CT_001_김_고객_2026-07-31.pdf");
    expect(contractEditorSource).toContain('className="contract-pdf-export-host"');
    expect(contractEditorSource).toContain('outputMode="pdf"');
    expect(contractEditorSource).toContain("documentRef={printableDocumentRef}");
  });

  it("leaves the existing estimate calculation and PDF export contracts intact", () => {
    expect(estimateCalculationSource).toContain("export function buildEstimateSummary");
    expect(estimatePdfSource).toContain('dataset?.estimateDocument !== "pdf"');
    expect(buildContractPdfFileName({
      contractNumber: "CT-1",
      customerName: "김고객",
      projectName: "",
      issuedAt: "2026-07-31",
    })).toBe("계약서_CT-1_김고객_2026-07-31.pdf");
  });
});
