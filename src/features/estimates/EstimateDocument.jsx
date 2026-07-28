import PriceText from "../../components/PriceText";

export default function EstimateDocument({
  documentRef,
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
  onCustomerNameChange,
  onCustomerPhoneChange,
  onAddressChange,
  onWorkDateChange,
  onVatStatusChange,
  conditionSummary,
  conditionPyeong,
  estimatePyeong,
  constructionDaysTotal,
  constructionDayParts,
  renderGeneralTable,
  renderDetailTable,
  renderAdjustmentEditor,
  renderAdjustmentSummary,
  siteMemo,
  onSiteMemoChange,
  estimateNumber,
}) {
  return (
    <div
      className={`pdf-capture-area ${previewType === "general" ? "general-estimate-document" : "detail-estimate-document"}`.trim()}
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

      <div className="form-grid">
        <label>
          고객명
          <input value={customerName} onChange={onCustomerNameChange} placeholder="예: 홍길동" />
        </label>
        <label>
          연락처
          <input value={customerPhone} onChange={onCustomerPhoneChange} placeholder="예: 010-0000-0000" />
        </label>
        <label>
          현장 주소
          <input value={address} onChange={onAddressChange} placeholder="예: 서울시 강남구 ..." />
        </label>
        <label>
          시공 예정일
          <input type="date" value={workDate} onChange={onWorkDateChange} />
        </label>
        <label>
          부가세 표시
          <select value={vatStatus} onChange={onVatStatusChange}>
            <option value="부가세 별도">부가세 별도</option>
            <option value="부가세 포함">부가세 포함</option>
            <option value="부가세 없음">부가세 없음</option>
          </select>
        </label>
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
      {previewType === "general" ? renderAdjustmentEditor() : renderAdjustmentSummary()}

      <div className="site-memo-panel preview-site-memo">
        <label>
          현장메모
          <textarea
            value={siteMemo}
            onChange={onSiteMemoChange}
            placeholder="고객에게 보여주지 않을 내부 메모를 적어주세요."
          />
        </label>
      </div>

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
