import { ArrowLeft, FileSignature, Printer, Save, Send } from "lucide-react";
import { createPortal } from "react-dom";
import EstimateDocument from "./EstimateDocument";

export default function EstimatePreviewPage({
  previewType,
  onPreviewTypeChange,
  backLabel,
  onBack,
  notice,
  error,
  saving,
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
    <div
      className="estimate-pdf-export-host"
      aria-hidden="true"
      inert=""
    >
      <EstimateDocument
        previewType={previewType}
        outputMode="pdf"
        documentRef={printableDocumentRef}
        {...documentProps}
      />
    </div>
  );

  return (
    <main className={`panel-page ${previewType === "general" ? "general-preview-page" : "detail-preview-page"}`.trim()}>
      <section className={`panel wide ${previewType === "general" ? "general-preview-panel" : "detail-preview-panel"}`.trim()}>
        <div className="editor-header">
          <div>
            <h2>{previewType === "detail" ? "세부 견적서 확인" : "일반 견적서 확인"}</h2>
          </div>
          <div className="estimate-header-actions">
            {onCreateContract ? (
              <button type="button" className="secondary-button" onClick={onCreateContract}>
                <FileSignature size={18} /> {contractActionLabel}
              </button>
            ) : null}
            {onShare ? (
              <button type="button" className="primary-button" onClick={onShare}>
                <Send size={18} /> {shareLabel}
              </button>
            ) : null}
            <button
              type="button"
              className={`secondary-button preview-type-button ${previewType === "general" ? "active" : ""}`.trim()}
              onClick={() => onPreviewTypeChange("general")}
            >
              일반 견적서
            </button>
            <button
              type="button"
              className={`secondary-button preview-type-button ${previewType === "detail" ? "active" : ""}`.trim()}
              onClick={() => onPreviewTypeChange("detail")}
            >
              세부 견적서
            </button>
            <button className="secondary-button" onClick={onBack}>
              <ArrowLeft size={18} /> {backLabel}
            </button>
          </div>
        </div>

        {notice && <div className="status-box">{notice}</div>}
        {error && <div className="error-box">{error}</div>}
        {saving && <div className="status-box">저장 중...</div>}

        <div
          className="estimate-preview-viewport formate-scroll-light"
          data-estimate-preview-viewport
        >
          <EstimateDocument
            previewType={previewType}
            outputMode="screen"
            {...documentProps}
          />
        </div>

        <div className="actions">
          <button className="secondary-button" disabled={saving} onClick={onSave}>
            <Save size={18} /> 견적 저장
          </button>
          <button className="primary-button" onClick={onDownloadPdf}>
            <Printer size={18} /> PDF 받기
          </button>
        </div>

        {typeof document === "undefined"
          ? pdfExportHost
          : createPortal(pdfExportHost, document.body)}
      </section>
    </main>
  );
}
