import { useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, FileSignature, Printer, Save, Send } from "lucide-react";
import { createPortal } from "react-dom";
import EstimateDocument from "./EstimateDocument";

export const ESTIMATE_A4_PAGE = Object.freeze({ width: 794, height: 1123 });

export function getEstimatePageFit(availableWidth, availableHeight) {
  const scale = Math.min(
    Math.max(availableWidth, 0) / ESTIMATE_A4_PAGE.width,
    Math.max(availableHeight, 0) / ESTIMATE_A4_PAGE.height,
    1
  );
  return {
    scale,
    width: ESTIMATE_A4_PAGE.width * scale,
    height: ESTIMATE_A4_PAGE.height * scale,
  };
}

export function EstimatePageFit({ children }) {
  const hostRef = useRef(null);
  const [fit, setFit] = useState(() => getEstimatePageFit(
    ESTIMATE_A4_PAGE.width,
    ESTIMATE_A4_PAGE.height
  ));

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const update = () => {
      const style = getComputedStyle(host);
      const availableWidth = host.clientWidth
        - Number.parseFloat(style.paddingLeft)
        - Number.parseFloat(style.paddingRight)
        - 1;
      const availableHeight = host.clientHeight
        - Number.parseFloat(style.paddingTop)
        - Number.parseFloat(style.paddingBottom)
        - 1;
      const next = getEstimatePageFit(availableWidth, availableHeight);
      setFit((current) => (
        Math.abs(current.scale - next.scale) < 0.001 ? current : next
      ));
    };
    update();

    if (typeof ResizeObserver === "undefined") {
      globalThis.addEventListener?.("resize", update);
      return () => globalThis.removeEventListener?.("resize", update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="estimate-document-fit" data-estimate-preview-fit ref={hostRef}>
      <div
        className="estimate-document-stage"
        style={{ width: fit.width, height: fit.height }}
      >
        <div
          className="estimate-document-transform"
          style={{ transform: `scale(${fit.scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function getAutoSaveLabel(status, saving) {
  if (saving || status === "saving") return "저장 중...";
  if (status === "error") return "저장 실패";
  if (status === "saved") return "저장됨";
  if (status === "dirty") return "저장 대기";
  return "자동 저장";
}

export function EstimateDocumentInputPane({
  documentProps,
  notice,
  error,
  saving,
  autoSaveStatus,
  autoSaveError,
  onRetryAutoSave,
  onSave,
}) {
  const {
    companyName,
    estimateNumber,
    conditionSummary,
    customerName,
    customerPhone,
    address,
    workDate,
    vatStatus,
    issuedAt,
    validUntilDate,
    onCustomerNameChange,
    onCustomerPhoneChange,
    onAddressChange,
    onWorkDateChange,
    onVatStatusChange,
    onIssuedAtChange,
    onValidUntilChange,
  } = documentProps;

  return (
    <aside className="estimate-document-pane" aria-label="견적서 정보">
      <header className="estimate-document-pane__header">
        <div>
          <h2>견적서 정보</h2>
          <p>입력한 내용은 왼쪽 문서에 바로 반영됩니다.</p>
        </div>
        <span
          className={`autosave-pill ${autoSaveStatus || "idle"}`.trim()}
          title={autoSaveError || undefined}
        >
          {getAutoSaveLabel(autoSaveStatus, saving)}
        </span>
      </header>

      <div className="estimate-document-pane__body formate-scroll-light">
        {notice && <div className="status-box">{notice}</div>}
        {error && <div className="error-box">{error}</div>}
        {autoSaveError && (
          <div className="estimate-document-pane__save-error" role="alert">
            <span>{autoSaveError}</span>
            {onRetryAutoSave && (
              <button type="button" onClick={onRetryAutoSave}>재시도</button>
            )}
          </div>
        )}

        <section className="estimate-document-pane__section" aria-labelledby="estimate-customer-fields">
          <h3 id="estimate-customer-fields">고객·현장</h3>
          <label htmlFor="estimate-document-customer-name">
            <span>고객명</span>
            <input
              id="estimate-document-customer-name"
              value={customerName}
              onChange={onCustomerNameChange}
              placeholder="예: 홍길동"
            />
          </label>
          <label htmlFor="estimate-document-customer-phone">
            <span>연락처</span>
            <input
              id="estimate-document-customer-phone"
              value={customerPhone}
              onChange={onCustomerPhoneChange}
              placeholder="예: 010-0000-0000"
            />
          </label>
          <label htmlFor="estimate-document-address">
            <span>현장 주소</span>
            <input
              id="estimate-document-address"
              value={address}
              onChange={onAddressChange}
              placeholder="예: 서울시 강남구 ..."
            />
          </label>
        </section>

        <section className="estimate-document-pane__section" aria-labelledby="estimate-document-fields">
          <h3 id="estimate-document-fields">문서 설정</h3>
          <div className="estimate-document-pane__date-grid">
            <label htmlFor="estimate-document-issued-at">
              <span>작성일</span>
              <input
                id="estimate-document-issued-at"
                type="date"
                value={issuedAt}
                onChange={onIssuedAtChange}
              />
            </label>
            <label htmlFor="estimate-document-valid-until">
              <span>유효기간</span>
              <input
                id="estimate-document-valid-until"
                type="date"
                value={validUntilDate}
                onChange={onValidUntilChange}
              />
            </label>
          </div>
          <label htmlFor="estimate-document-work-date">
            <span>시공 예정일</span>
            <input
              id="estimate-document-work-date"
              type="date"
              value={workDate}
              onChange={onWorkDateChange}
            />
          </label>
          <label htmlFor="estimate-document-vat-status">
            <span>부가세 표시</span>
            <select
              id="estimate-document-vat-status"
              value={vatStatus}
              onChange={onVatStatusChange}
            >
              <option value="부가세 별도">부가세 별도</option>
              <option value="부가세 포함">부가세 포함</option>
              <option value="부가세 없음">부가세 없음</option>
            </select>
          </label>
        </section>

        <section className="estimate-document-pane__section estimate-document-pane__context" aria-labelledby="estimate-document-context">
          <h3 id="estimate-document-context">문서 기준</h3>
          <dl>
            <div><dt>업체명</dt><dd>{companyName || "-"}</dd></div>
            <div><dt>견적서 번호</dt><dd>{estimateNumber || "-"}</dd></div>
            <div><dt>견적 조건</dt><dd>{conditionSummary || "-"}</dd></div>
          </dl>
        </section>
      </div>

      <footer className="estimate-document-pane__footer">
        <button type="button" className="primary-button" disabled={saving} onClick={onSave}>
          <Save size={18} /> 견적 저장
        </button>
      </footer>
    </aside>
  );
}

export default function EstimatePreviewPage({
  previewType,
  onPreviewTypeChange,
  backLabel,
  onBack,
  notice,
  error,
  saving,
  autoSaveStatus,
  autoSaveError,
  onRetryAutoSave,
  onSave,
  onDownloadPdf,
  onShare,
  shareLabel = "고객에게 보내기",
  onCreateContract,
  contractActionLabel = "계약서 작성",
  printableDocumentRef,
  documentProps,
}) {
  const pdfExportHost = (
    <div className="estimate-pdf-export-host" aria-hidden="true" inert={true}>
      <EstimateDocument
        previewType={previewType}
        outputMode="pdf"
        documentRef={printableDocumentRef}
        {...documentProps}
      />
    </div>
  );

  return (
    <main className={`estimate-preview-page ${previewType === "general" ? "general-preview-page" : "detail-preview-page"}`.trim()}>
      <section className={`estimate-preview-panel ${previewType === "general" ? "general-preview-panel" : "detail-preview-panel"}`.trim()}>
        <header className="estimate-preview-header">
          <div className="estimate-preview-tabs" role="tablist" aria-label="견적서 유형">
            <button
              type="button"
              role="tab"
              aria-selected={previewType === "general"}
              className={previewType === "general" ? "active" : ""}
              onClick={() => onPreviewTypeChange("general")}
            >
              일반 견적서
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={previewType === "detail"}
              className={previewType === "detail" ? "active" : ""}
              onClick={() => onPreviewTypeChange("detail")}
            >
              세부 견적서
            </button>
          </div>

          <div className="estimate-preview-context" aria-label="현재 견적 조건">
            <span>견적 조건</span>
            <strong title={documentProps.conditionSummary}>{documentProps.conditionSummary || "-"}</strong>
          </div>

          <div className="estimate-preview-header__actions">
            {onCreateContract ? (
              <button type="button" className="secondary-button" onClick={onCreateContract}>
                <FileSignature size={18} /> {contractActionLabel}
              </button>
            ) : null}
            {onShare ? (
              <button type="button" className="secondary-button" onClick={onShare}>
                <Send size={18} /> {shareLabel}
              </button>
            ) : null}
            <button type="button" className="secondary-button" onClick={onBack}>
              <ArrowLeft size={18} /> {backLabel}
            </button>
            <button type="button" className="primary-button" onClick={onDownloadPdf}>
              <Printer size={18} /> PDF 받기
            </button>
          </div>
        </header>

        <div className="estimate-preview-workspace">
          <div
            className="estimate-preview-canvas"
            data-estimate-preview-viewport
            aria-label="견적서 미리보기"
          >
            <EstimatePageFit>
              <EstimateDocument
                previewType={previewType}
                outputMode="screen"
                {...documentProps}
              />
            </EstimatePageFit>
          </div>

          <EstimateDocumentInputPane
            documentProps={documentProps}
            notice={notice}
            error={error}
            saving={saving}
            autoSaveStatus={autoSaveStatus}
            autoSaveError={autoSaveError}
            onRetryAutoSave={onRetryAutoSave}
            onSave={onSave}
          />
        </div>

        {typeof document === "undefined"
          ? pdfExportHost
          : createPortal(pdfExportHost, document.body)}
      </section>
    </main>
  );
}
