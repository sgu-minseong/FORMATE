import { useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  Minus,
  Plus,
  Printer,
  Save,
  Send,
} from "lucide-react";
import { createPortal } from "react-dom";
import EstimateDocument from "./EstimateDocument";
import {
  calculateEstimatePageSlices,
  ESTIMATE_PDF_PAGE,
  getEstimatePagePair,
} from "./estimatePagination";

export const ESTIMATE_A4_PAGE = Object.freeze({ width: 794, height: 1123 });
export const ESTIMATE_PAGE_GAP = 32;
export const ESTIMATE_PREVIEW_ZOOM = Object.freeze({ min: 1, default: 1.1, max: 3, step: 0.1 });

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function clampEstimatePreviewZoom(zoom) {
  return clamp(zoom, ESTIMATE_PREVIEW_ZOOM.min, ESTIMATE_PREVIEW_ZOOM.max);
}

export function getEstimatePreviewDefaultView() {
  return { zoom: ESTIMATE_PREVIEW_ZOOM.default, pan: { x: 0, y: 0 } };
}

export function getEstimatePageFit(availableWidth, availableHeight, visiblePageCount = 1) {
  const pageCount = Math.max(1, Math.min(visiblePageCount, 2));
  const contentWidth = ESTIMATE_A4_PAGE.width * pageCount
    + ESTIMATE_PAGE_GAP * (pageCount - 1);
  const scale = Math.min(
    Math.max(availableWidth, 0) / contentWidth,
    Math.max(availableHeight, 0) / ESTIMATE_A4_PAGE.height,
    1
  );
  return {
    scale,
    contentWidth,
    width: contentWidth * scale,
    height: ESTIMATE_A4_PAGE.height * scale,
  };
}

function clampPanAxis(offset, base, contentSize, viewportStart, viewportSize) {
  if (contentSize <= viewportSize) {
    return clamp(
      offset,
      viewportStart - base,
      viewportStart + viewportSize - contentSize - base
    );
  }
  const visibleEdge = Math.min(64, contentSize / 2);
  return clamp(
    offset,
    viewportStart + visibleEdge - contentSize - base,
    viewportStart + viewportSize - visibleEdge - base
  );
}

export function clampEstimatePreviewPan({ pan, base, content, viewport }) {
  return {
    x: clampPanAxis(pan.x, base.x, content.width, viewport.x, viewport.width),
    y: clampPanAxis(pan.y, base.y, content.height, viewport.y, viewport.height),
  };
}

export function getCursorCenteredPan({
  pointer,
  base,
  pan,
  fitScale,
  zoom,
  nextZoom,
}) {
  const oldScale = fitScale * zoom;
  const nextScale = fitScale * nextZoom;
  return {
    x: pointer.x - base.x - ((pointer.x - base.x - pan.x) / oldScale) * nextScale,
    y: pointer.y - base.y - ((pointer.y - base.y - pan.y) / oldScale) * nextScale,
  };
}

function useEstimateDocumentSize(documentRef, previewType) {
  const [size, setSize] = useState(ESTIMATE_A4_PAGE);

  useLayoutEffect(() => {
    const node = documentRef?.current;
    if (!node) return undefined;

    const update = () => {
      const next = {
        width: node.offsetWidth || ESTIMATE_A4_PAGE.width,
        height: node.offsetHeight || ESTIMATE_A4_PAGE.height,
      };
      setSize((current) => (
        current.width === next.width && current.height === next.height ? current : next
      ));
    };
    update();

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(node);
    globalThis.addEventListener?.("resize", update);
    return () => {
      observer?.disconnect();
      globalThis.removeEventListener?.("resize", update);
    };
  }, [documentRef, previewType]);

  return size;
}

export function EstimatePageFit({
  documentProps,
  previewType,
  printableDocumentRef,
  resetKey,
}) {
  const sourceSize = useEstimateDocumentSize(printableDocumentRef, previewType);
  const hostRef = useRef(null);
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [pairIndex, setPairIndex] = useState(0);
  const [view, setView] = useState(getEstimatePreviewDefaultView);
  const slices = calculateEstimatePageSlices(sourceSize.width, sourceSize.height);
  const pair = getEstimatePagePair(slices.length, pairIndex);
  const [layout, setLayout] = useState(() => ({
    ...getEstimatePageFit(ESTIMATE_A4_PAGE.width, ESTIMATE_A4_PAGE.height, pair.pageIndexes.length),
    base: { x: 0, y: 0 },
    viewport: { x: 0, y: 0, width: ESTIMATE_A4_PAGE.width, height: ESTIMATE_A4_PAGE.height },
  }));
  const layoutRef = useRef(layout);
  const viewRef = useRef(view);
  layoutRef.current = layout;
  viewRef.current = view;

  const sourceScale = (ESTIMATE_A4_PAGE.width * (
    ESTIMATE_PDF_PAGE.width - ESTIMATE_PDF_PAGE.margin * 2
  ) / ESTIMATE_PDF_PAGE.width) / sourceSize.width;
  const pageContentHeight = slices[0].sourceHeight > 0
    ? (sourceSize.width * (
      ESTIMATE_PDF_PAGE.height - ESTIMATE_PDF_PAGE.margin * 2
    ) / (ESTIMATE_PDF_PAGE.width - ESTIMATE_PDF_PAGE.margin * 2)) * sourceScale
    : 0;
  const pageContentWidth = sourceSize.width * sourceScale;
  const pageMarginX = (ESTIMATE_A4_PAGE.width - pageContentWidth) / 2;
  const pageMarginY = (ESTIMATE_A4_PAGE.height - pageContentHeight) / 2;

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
      const next = getEstimatePageFit(availableWidth, availableHeight, pair.pageIndexes.length);
      setLayout({
        ...next,
        base: {
          x: Number.parseFloat(style.paddingLeft) + availableWidth - next.width,
          y: Number.parseFloat(style.paddingTop) + (availableHeight - next.height) / 2,
        },
        viewport: {
          x: Number.parseFloat(style.paddingLeft),
          y: Number.parseFloat(style.paddingTop),
          width: availableWidth,
          height: availableHeight,
        },
      });
    };
    update();

    if (typeof ResizeObserver === "undefined") {
      globalThis.addEventListener?.("resize", update);
      return () => globalThis.removeEventListener?.("resize", update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [pair.pageIndexes.length]);

  useLayoutEffect(() => {
    setPairIndex(0);
    setView(getEstimatePreviewDefaultView());
  }, [resetKey]);

  useLayoutEffect(() => {
    if (pairIndex >= pair.pairCount) setPairIndex(pair.pairCount - 1);
  }, [pair.pairCount, pairIndex]);

  const setZoomAtPoint = (nextZoomValue, pointer) => {
    const currentLayout = layoutRef.current;
    const currentView = viewRef.current;
    const nextZoom = clampEstimatePreviewZoom(nextZoomValue);
    if (nextZoom <= ESTIMATE_PREVIEW_ZOOM.min + 0.001) {
      setView({ zoom: 1, pan: { x: 0, y: 0 } });
      return;
    }

    const nextPan = getCursorCenteredPan({
      pointer,
      base: currentLayout.base,
      pan: currentView.pan,
      fitScale: currentLayout.scale,
      zoom: currentView.zoom,
      nextZoom,
    });
    setView({
      zoom: nextZoom,
      pan: clampEstimatePreviewPan({
        pan: nextPan,
        base: currentLayout.base,
        content: {
          width: currentLayout.contentWidth * currentLayout.scale * nextZoom,
          height: ESTIMATE_A4_PAGE.height * currentLayout.scale * nextZoom,
        },
        viewport: currentLayout.viewport,
      }),
    });
  };

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const onWheel = (event) => {
      event.preventDefault();
      const currentView = viewRef.current;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? host.clientHeight : 1);
      const nextZoom = clampEstimatePreviewZoom(currentView.zoom * Math.exp(-delta * 0.0015));
      if (Math.abs(nextZoom - currentView.zoom) < 0.001) return;

      const rect = host.getBoundingClientRect();
      const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      setZoomAtPoint(nextZoom, pointer);
    };

    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, []);

  const resetView = () => setView({ zoom: 1, pan: { x: 0, y: 0 } });
  const changeZoom = (delta) => {
    const currentLayout = layoutRef.current;
    const nextZoom = Math.round((viewRef.current.zoom + delta) * 10) / 10;
    setZoomAtPoint(nextZoom, {
      x: currentLayout.viewport.x + currentLayout.viewport.width / 2,
      y: currentLayout.viewport.y + currentLayout.viewport.height / 2,
    });
  };
  const changePair = (nextPairIndex) => {
    setPairIndex(nextPairIndex);
    setView(getEstimatePreviewDefaultView());
  };
  const onPointerDown = (event) => {
    if (view.zoom <= 1 || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pan: view.pan,
      started: false,
    };
    setDragging(true);
  };
  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.started && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 3) return;
    drag.started = true;
    const currentLayout = layoutRef.current;
    const currentView = viewRef.current;
    const nextPan = {
      x: drag.pan.x + event.clientX - drag.x,
      y: drag.pan.y + event.clientY - drag.y,
    };
    setView({
      ...currentView,
      pan: clampEstimatePreviewPan({
        pan: nextPan,
        base: currentLayout.base,
        content: {
          width: currentLayout.contentWidth * currentLayout.scale * currentView.zoom,
          height: ESTIMATE_A4_PAGE.height * currentLayout.scale * currentView.zoom,
        },
        viewport: currentLayout.viewport,
      }),
    });
  };
  const stopDragging = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  const firstPage = pair.pageIndexes[0] + 1;
  const lastPage = pair.pageIndexes.at(-1) + 1;
  const pairLabel = firstPage === lastPage
    ? `${firstPage} / ${slices.length}`
    : `${firstPage}–${lastPage} / ${slices.length}`;
  const renderedScale = layout.scale * view.zoom;

  return (
    <div
      className={`estimate-document-fit ${view.zoom > 1 ? "is-zoomed" : "is-fit"} ${dragging ? "is-dragging" : ""}`.trim()}
      data-estimate-preview-fit
      data-estimate-page-count={slices.length}
      data-estimate-page-pair={pairLabel}
      data-estimate-fit-scale={layout.scale}
      data-estimate-zoom={view.zoom}
      data-estimate-default-zoom={ESTIMATE_PREVIEW_ZOOM.default}
      data-estimate-rendered-scale={renderedScale}
      ref={hostRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
    >
      <div
        className="estimate-document-stage"
        style={{
          width: layout.contentWidth,
          height: ESTIMATE_A4_PAGE.height,
          transform: `translate(${layout.base.x + view.pan.x}px, ${layout.base.y + view.pan.y}px) scale(${renderedScale})`,
        }}
      >
        {pair.pageIndexes.map((pageIndex) => (
          <div
            className="estimate-preview-page-slice"
            data-estimate-preview-page={pageIndex + 1}
            key={pageIndex}
          >
            <div
              className="estimate-preview-page-content"
              style={{
                left: pageMarginX,
                top: pageMarginY,
                width: pageContentWidth,
                height: pageContentHeight,
              }}
            >
              <div
                className="estimate-preview-page-source"
                style={{
                  top: -slices[pageIndex].sourceOffset * sourceScale,
                  transform: `scale(${sourceScale})`,
                }}
              >
                <EstimateDocument
                  previewType={previewType}
                  outputMode="preview"
                  {...documentProps}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="estimate-preview-controls" onPointerDown={(event) => event.stopPropagation()}>
        <div className="estimate-preview-zoom" aria-label="미리보기 배율">
          <button
            type="button"
            aria-label="미리보기 축소"
            disabled={view.zoom <= ESTIMATE_PREVIEW_ZOOM.min}
            onClick={() => changeZoom(-ESTIMATE_PREVIEW_ZOOM.step)}
          >
            <Minus size={15} />
          </button>
          <span aria-live="polite">{Math.round(view.zoom * 100)}%</span>
          <button
            type="button"
            aria-label="미리보기 확대"
            disabled={view.zoom >= ESTIMATE_PREVIEW_ZOOM.max}
            onClick={() => changeZoom(ESTIMATE_PREVIEW_ZOOM.step)}
          >
            <Plus size={15} />
          </button>
          <button type="button" disabled={view.zoom <= 1} onClick={resetView}>맞춤</button>
        </div>
        {slices.length > 1 ? (
          <nav className="estimate-preview-pagination" aria-label="견적서 페이지">
            <button
              type="button"
              aria-label="이전 페이지 묶음"
              disabled={pair.pairIndex === 0}
              onClick={() => changePair(pair.pairIndex - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span aria-live="polite">{pairLabel}</span>
            <button
              type="button"
              aria-label="다음 페이지 묶음"
              disabled={pair.pairIndex >= pair.pairCount - 1}
              onClick={() => changePair(pair.pairIndex + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        ) : null}
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
            <EstimatePageFit
              documentProps={documentProps}
              previewType={previewType}
              printableDocumentRef={printableDocumentRef}
              resetKey={`${previewType}:${documentProps.estimateNumber || ""}`}
            />
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
