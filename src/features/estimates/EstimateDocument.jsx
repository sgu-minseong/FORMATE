import PriceText from "../../components/PriceText";

export default function EstimateDocument({
  documentRef,
  outputMode = "screen",
  previewType,
  companyName,
  total,
  createdDate,
  validUntil,
  vatStatus,
  customerName,
  customerPhone,
  address,
  workDate,
  conditionSummary,
  conditionPyeong,
  estimatePyeong,
  constructionDaysTotal,
  constructionDayParts,
  renderGeneralTable,
  renderDetailTable,
  renderAdjustmentSummary,
  estimateNumber,
}) {
  const outputModeClassName = outputMode === "pdf"
    ? "estimate-document--pdf"
    : "estimate-document--screen";

  return (
    <div
      className={`pdf-capture-area estimate-document ${outputModeClassName} ${previewType === "general" ? "general-estimate-document" : "detail-estimate-document"}`.trim()}
      data-estimate-document={outputMode}
      data-estimate-document-page="1"
      ref={documentRef}
    >
      <div className="pdf-title-row">
        <div>
          <p className="eyebrow dark">FORMATE 인테리어 견적서</p>
          <h3>{companyName} 견적서</h3>
        </div>
        <PriceText value={total} size="lg" />
      </div>

      <div className="estimate-meta-grid">
        <div>
          <span>사업자 번호</span>
          <strong>000-00-00000</strong>
          <em>임의표시</em>
        </div>
        <div>
          <span>업체명</span>
          <strong>{companyName}</strong>
        </div>
        <div>
          <span>작성일</span>
          <strong>{createdDate}</strong>
        </div>
        <div>
          <span>유효기간</span>
          <strong>{validUntil}까지</strong>
        </div>
        <div>
          <span>부가세</span>
          <strong>{vatStatus}</strong>
        </div>
      </div>

      <div className="estimate-customer-grid">
        <div>
          <span>고객명</span>
          <strong>{customerName || "-"}</strong>
        </div>
        <div>
          <span>연락처</span>
          <strong>{customerPhone || "-"}</strong>
        </div>
        <div>
          <span>현장 주소</span>
          <strong>{address || "-"}</strong>
        </div>
        <div>
          <span>시공 예정일</span>
          <strong>{workDate || "미정"}</strong>
        </div>
      </div>

      <div className="key-box compact-key">
        <span>견적 조건</span>
        <strong>{conditionSummary}</strong>
      </div>

      <div className="estimate-pyeong-preview">
        <div>
          <span>조건 평수</span>
          <PriceText value={conditionPyeong || 0} unit="평" size="sm" />
        </div>
        <div>
          <span>견적 기준 평수</span>
          <PriceText value={estimatePyeong || conditionPyeong || 0} unit="평" size="sm" />
        </div>
      </div>

      {constructionDaysTotal > 0 && (
        <div className="estimate-construction-schedule">
          <span>예상 공사일정</span>
          <strong>{constructionDaysTotal.toLocaleString("ko-KR")}일</strong>
          {constructionDayParts.length > 0 && <p>{constructionDayParts.join(" + ")}</p>}
        </div>
      )}

      {previewType === "detail" ? renderDetailTable() : renderGeneralTable()}
      <p className="tax-note">세액은 공급가의 10%로 임시 계산했습니다.</p>
      {renderAdjustmentSummary()}

      <div className="estimate-note-box">
        <strong>견적 조건</strong>
        <p>공사 기간: 협의 후 확정</p>
        <p>결제 조건: 계약금 / 중도금 / 잔금 협의</p>
        <p>변경 사항: 공사 중 추가 요청 또는 현장 상황 변경 시 추가 비용이 발생할 수 있습니다.</p>
        <p>보증 조건: 시공 후 하자 보수 기준은 별도 협의합니다.</p>
      </div>

      <div className="estimate-note-box">
        <strong>제외 항목</strong>
        <p>본 견적서에 명시되지 않은 항목은 별도 견적입니다.</p>
        <p>가전제품, 가구, 관리사무소 비용, 엘리베이터 사용료 등은 별도 협의가 필요할 수 있습니다.</p>
      </div>

      <div className="estimate-number-footer">견적서 번호 {estimateNumber}</div>
    </div>
  );
}
