import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, FileDown, Plus, Save, Send, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import Button from "../../components/ui/Button";
import { StatusText } from "../customerOperations/components";
import { operationStatusViews } from "../customerOperations/utils";
import { updateContractStatus } from "../customerOperations/salesLifecycleApi";
import {
  createContractDraft,
  fetchContractDocument,
  requestContractReview,
  saveContractDocument,
} from "./contractApi";
import ContractDocument from "./ContractDocument";
import {
  createPaymentTermId,
  getContractDisplayDocument,
  normalizeContractDocument,
  normalizePaymentTerm,
} from "./contractModel";
import { exportContractPdf } from "./exportContractPdf";
import "./contracts.css";

const CLAUSE_FIELDS = [
  { key: "scopeSupplement", label: "공사 범위 보충 설명", placeholder: "견적 범위에 덧붙일 시공 내용" },
  { key: "exclusions", label: "제외 공사", placeholder: "계약금액에 포함되지 않는 공사와 비용" },
  { key: "materialChangePolicy", label: "자재·규격 변경 기준", placeholder: "자재 품절, 규격 변경 시 협의 기준" },
  { key: "changeOrderPolicy", label: "추가공사 및 변경공사 처리", placeholder: "추가 요청의 견적, 승인, 비용 반영 방식" },
  { key: "delayCancellationPolicy", label: "공사 지연·중단·계약 취소 조건", placeholder: "일정 변경과 계약 취소 시 처리 기준" },
  { key: "warranty", label: "하자보수 기간과 범위", placeholder: "하자보수 대상, 기간, 제외 조건" },
  { key: "specialTerms", label: "특약사항", placeholder: "현장별로 합의한 추가 조건" },
];

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function ContractLoading() {
  return (
    <main className="contract-editor-page" aria-busy="true">
      <div className="contract-editor-loading">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}

export default function ContractEditorPage({ companyId, target, onBack }) {
  const [contract, setContract] = useState(null);
  const [documentData, setDocumentData] = useState(() => normalizeContractDocument({}));
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileMode, setMobileMode] = useState("edit");
  const previewRef = useRef(null);
  const printableDocumentRef = useRef(null);

  async function loadContract(contractId) {
    const nextContract = await fetchContractDocument({ companyId, contractId });
    setContract(nextContract);
    setDocumentData(normalizeContractDocument(nextContract.document_data));
    return nextContract;
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      setLoading(true);
      setError("");
      setNotice("");
      try {
        let contractId = target?.contractId || "";
        if (!contractId) {
          const result = await createContractDraft({
            companyId,
            projectId: target?.projectId,
            estimateVersionId: target?.estimateVersionId || null,
          });
          contractId = result.contractId;
        }
        if (!active) return;
        await loadContract(contractId);
      } catch (loadError) {
        if (active) setError(getErrorMessage(loadError, "계약서를 불러오지 못했습니다."));
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();
    return () => {
      active = false;
    };
  }, [companyId, target?.contractId, target?.estimateVersionId, target?.projectId]);

  const isEditable = contract?.status === "draft";
  const displayDocument = useMemo(() => {
    if (!contract) return normalizeContractDocument(documentData);
    if (["draft", "revision_requested"].includes(contract.status)) {
      return normalizeContractDocument(documentData);
    }
    return getContractDisplayDocument(contract);
  }, [contract, documentData]);

  function updateConstruction(key, value) {
    setDocumentData((current) => ({
      ...current,
      construction: { ...current.construction, [key]: value },
    }));
  }

  function updatePaymentTerm(index, key, value) {
    setDocumentData((current) => ({
      ...current,
      paymentTerms: current.paymentTerms.map((term, termIndex) => (
        termIndex === index ? { ...term, [key]: value } : term
      )),
    }));
  }

  function addPaymentTerm() {
    setDocumentData((current) => ({
      ...current,
      paymentTerms: [
        ...current.paymentTerms,
        normalizePaymentTerm({ id: createPaymentTermId(current.paymentTerms.length), label: "추가 지급" }),
      ],
    }));
  }

  function removePaymentTerm(index) {
    setDocumentData((current) => ({
      ...current,
      paymentTerms: current.paymentTerms.filter((_, termIndex) => termIndex !== index),
    }));
  }

  async function handleSave({ silent = false } = {}) {
    if (!contract?.id || !isEditable || processing) return null;
    setProcessing(true);
    setError("");
    if (!silent) setNotice("");
    try {
      const result = await saveContractDocument({
        companyId,
        contractId: contract.id,
        documentData,
      });
      const nextDocument = normalizeContractDocument(result.documentData);
      setDocumentData(nextDocument);
      setContract((current) => ({
        ...current,
        document_data: nextDocument,
        updated_at: new Date().toISOString(),
      }));
      if (!silent) setNotice("계약서 작업본을 저장했습니다.");
      return nextDocument;
    } catch (saveError) {
      setError(getErrorMessage(saveError, "계약서를 저장하지 못했습니다."));
      return null;
    } finally {
      setProcessing(false);
    }
  }

  async function handleReviewRequest() {
    if (!contract?.id || !isEditable || processing) return;
    if (!window.confirm("현재 계약서 내용으로 고객 검토를 요청하시겠습니까?")) return;

    setProcessing(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveContractDocument({
        companyId,
        contractId: contract.id,
        documentData,
      });
      setDocumentData(normalizeContractDocument(saved.documentData));
      await requestContractReview({ companyId, contractId: contract.id });
      await loadContract(contract.id);
      setNotice("현재 계약서를 새 version으로 보존하고 고객 검토 중으로 변경했습니다.");
    } catch (reviewError) {
      setError(getErrorMessage(reviewError, "고객 검토 요청을 처리하지 못했습니다."));
    } finally {
      setProcessing(false);
    }
  }

  async function handleStatusTransition(status) {
    if (!contract?.id || processing) return;
    const confirmation = status === "completed"
      ? "계약 내용을 최종 확인하고 계약 완료로 변경하시겠습니까?"
      : "수정 요청을 반영할 작업본 편집을 시작하시겠습니까?";
    if (!window.confirm(confirmation)) return;

    setProcessing(true);
    setError("");
    setNotice("");
    try {
      await updateContractStatus({ companyId, contractId: contract.id, status });
      await loadContract(contract.id);
      setNotice(status === "completed" ? "계약을 최종 확정했습니다." : "계약서 수정을 시작합니다.");
    } catch (statusError) {
      setError(getErrorMessage(statusError, "계약 상태를 변경하지 못했습니다."));
    } finally {
      setProcessing(false);
    }
  }

  async function handleDownloadPdf() {
    if (!contract || !printableDocumentRef.current || processing) return;
    setProcessing(true);
    setError("");
    try {
      await exportContractPdf({
        documentNode: printableDocumentRef.current,
        contractNumber: displayDocument.contractNumber || contract.contract_number,
        customerName: displayDocument.customerSnapshot.name,
        projectName: displayDocument.projectSnapshot.name,
        issuedAt: `${contract.created_at || ""}`.slice(0, 10),
        backgroundColor: getComputedStyle(document.documentElement)
          .getPropertyValue("--color-surface")
          .trim(),
      });
    } catch (pdfError) {
      setError(getErrorMessage(pdfError, "PDF를 다운로드하지 못했습니다."));
    } finally {
      setProcessing(false);
    }
  }

  function showPreview() {
    setMobileMode("preview");
    window.setTimeout(() => previewRef.current?.scrollIntoView({ block: "start" }), 0);
  }

  if (loading) return <ContractLoading />;

  if (!contract) {
    return (
      <main className="contract-editor-page">
        <div className="contract-editor-empty">
          <h2>계약서를 열지 못했습니다.</h2>
          <p>{error || "계약서 연결 정보를 확인해주세요."}</p>
          <Button variant="tertiary" leftIcon={<ArrowLeft />} onClick={onBack}>이전 화면</Button>
        </div>
      </main>
    );
  }

  const pdfHost = (
    <div className="contract-pdf-export-host" aria-hidden="true" inert="">
      <ContractDocument
        outputMode="pdf"
        documentRef={printableDocumentRef}
        documentData={displayDocument}
        contractStatus={contract.status}
      />
    </div>
  );

  return (
    <main className="contract-editor-page">
      <header className="contract-editor-header">
        <div>
          <button type="button" className="contract-editor-back" onClick={onBack}>
            <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" /> 이전 화면
          </button>
          <h1>{contract.contract_number || "계약서"}</h1>
          <StatusText status={operationStatusViews.contract(contract.status)} />
        </div>
        <div className="contract-editor-header__actions">
          {contract.status === "revision_requested" ? (
            <Button
              variant="secondary"
              disabled={processing}
              onClick={() => handleStatusTransition("draft")}
            >
              수정 시작
            </Button>
          ) : null}
          {contract.status === "customer_signed" ? (
            <Button
              variant="primary"
              leftIcon={<CheckCircle2 />}
              disabled={processing}
              onClick={() => handleStatusTransition("completed")}
            >
              계약 최종 확정
            </Button>
          ) : null}
          <Button variant="tertiary" leftIcon={<Eye />} onClick={showPreview}>미리보기</Button>
          <Button variant="tertiary" leftIcon={<FileDown />} disabled={processing} onClick={handleDownloadPdf}>
            PDF 다운로드
          </Button>
          {isEditable ? (
            <Button variant="secondary" leftIcon={<Save />} disabled={processing} onClick={() => handleSave()}>
              임시 저장
            </Button>
          ) : null}
          {isEditable ? (
            <Button variant="primary" leftIcon={<Send />} disabled={processing} onClick={handleReviewRequest}>
              고객 검토 요청
            </Button>
          ) : null}
        </div>
      </header>

      {notice ? <div className="contract-editor-notice" role="status">{notice}</div> : null}
      {error ? <div className="contract-editor-error" role="alert">{error}</div> : null}
      {!isEditable ? (
        <div className="contract-editor-readonly">
          {contract.status === "revision_requested"
            ? "수정 시작을 누르면 작업본을 편집할 수 있습니다."
            : "현재 계약 상태에서는 보존된 문서 내용을 확인할 수 있습니다."}
        </div>
      ) : null}

      <div className="contract-editor-mobile-tabs" role="tablist" aria-label="계약서 화면 전환">
        <button
          type="button"
          role="tab"
          aria-selected={mobileMode === "edit"}
          className={mobileMode === "edit" ? "is-active" : ""}
          onClick={() => setMobileMode("edit")}
        >
          편집
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileMode === "preview"}
          className={mobileMode === "preview" ? "is-active" : ""}
          onClick={() => setMobileMode("preview")}
        >
          미리보기
        </button>
      </div>

      <div className="contract-editor-workspace">
        <section className={`contract-editor-form formate-scroll-light ${mobileMode === "preview" ? "is-mobile-hidden" : ""}`} aria-label="계약서 입력">
          <div className="contract-editor-form__canonical">
            <h2>기본 정보</h2>
            <dl>
              <div><dt>고객</dt><dd>{documentData.customerSnapshot.name || "-"}</dd></div>
              <div><dt>연락처</dt><dd>{documentData.customerSnapshot.phone || "-"}</dd></div>
              <div><dt>업체</dt><dd>{documentData.companySnapshot.name || "-"}</dd></div>
              <div><dt>현장</dt><dd>{documentData.projectSnapshot.name || documentData.projectSnapshot.address || "-"}</dd></div>
              <div><dt>견적번호</dt><dd>{documentData.estimateSnapshot.estimateNumber || "-"}</dd></div>
              <div><dt>계약금액</dt><dd>{Number(documentData.estimateSnapshot.totalAmount || 0).toLocaleString("ko-KR")}원</dd></div>
            </dl>
            <p>고객·업체·현장 정보는 연결된 기준 정보를 사용하며 이 화면에서 변경하지 않습니다.</p>
          </div>

          <fieldset disabled={!isEditable || processing}>
            <legend>공사 일정</legend>
            <div className="contract-editor-form__date-grid">
              <label>
                <span>공사 시작일</span>
                <input type="date" value={documentData.construction.startDate} onChange={(event) => updateConstruction("startDate", event.target.value)} />
              </label>
              <label>
                <span>공사 종료일</span>
                <input type="date" value={documentData.construction.endDate} onChange={(event) => updateConstruction("endDate", event.target.value)} />
              </label>
            </div>
            <label>
              <span>공사기간 설명</span>
              <input value={documentData.construction.periodDescription} onChange={(event) => updateConstruction("periodDescription", event.target.value)} placeholder="예: 착공일로부터 20일, 공휴일 제외" />
            </label>
          </fieldset>

          <fieldset disabled={!isEditable || processing}>
            <legend>지급 조건</legend>
            <button type="button" className="contract-editor-form__add-payment" onClick={addPaymentTerm}>
              <Plus size={16} aria-hidden="true" /> 행 추가
            </button>
            <div className="contract-payment-list">
              {documentData.paymentTerms.length > 0 ? documentData.paymentTerms.map((term, index) => (
                <div className="contract-payment-row" key={term.id}>
                  <label>
                    <span>구분</span>
                    <input value={term.label} onChange={(event) => updatePaymentTerm(index, "label", event.target.value)} />
                  </label>
                  <label>
                    <span>계산 방식</span>
                    <select value={term.calculationType} onChange={(event) => updatePaymentTerm(index, "calculationType", event.target.value)}>
                      <option value="percentage">비율</option>
                      <option value="amount">금액</option>
                    </select>
                  </label>
                  <label>
                    <span>{term.calculationType === "amount" ? "금액" : "비율"}</span>
                    <input
                      type="number"
                      min="0"
                      step={term.calculationType === "amount" ? "1000" : "0.1"}
                      value={term.calculationType === "amount" ? term.amount : term.percentage}
                      onChange={(event) => updatePaymentTerm(index, term.calculationType === "amount" ? "amount" : "percentage", event.target.value)}
                    />
                  </label>
                  <label className="contract-payment-row__due">
                    <span>지급 시점</span>
                    <input value={term.dueDescription} onChange={(event) => updatePaymentTerm(index, "dueDescription", event.target.value)} placeholder="예: 계약 체결 시" />
                  </label>
                  <button type="button" className="contract-payment-row__remove" aria-label={`${term.label || "지급 조건"} 삭제`} onClick={() => removePaymentTerm(index)}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              )) : <p className="contract-editor-form__empty">등록된 지급 조건이 없습니다.</p>}
            </div>
          </fieldset>

          <fieldset disabled={!isEditable || processing}>
            <legend>계약 조건</legend>
            {CLAUSE_FIELDS.map((field) => (
              <label key={field.key}>
                <span>{field.label}</span>
                <textarea
                  rows={field.key === "specialTerms" ? 5 : 3}
                  value={documentData[field.key]}
                  placeholder={field.placeholder}
                  onChange={(event) => setDocumentData((current) => ({ ...current, [field.key]: event.target.value }))}
                />
              </label>
            ))}
          </fieldset>

          <fieldset className="contract-editor-form__internal" disabled={!isEditable || processing}>
            <legend>업체 메모</legend>
            <label>
              <span>내부 메모</span>
              <textarea
                rows={4}
                value={documentData.internalMemo}
                placeholder="고객 검토 version과 출력 문서에 포함되지 않습니다."
                onChange={(event) => setDocumentData((current) => ({ ...current, internalMemo: event.target.value }))}
              />
            </label>
          </fieldset>
        </section>

        <section
          className={`contract-editor-preview formate-scroll-light ${mobileMode === "edit" ? "is-mobile-hidden" : ""}`}
          aria-label="계약서 미리보기"
          ref={previewRef}
        >
          <ContractDocument
            outputMode="screen"
            documentData={displayDocument}
            contractStatus={contract.status}
          />
        </section>
      </div>

      {typeof document === "undefined" ? pdfHost : createPortal(pdfHost, document.body)}
    </main>
  );
}
