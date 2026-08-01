import {
  formatContractAmount,
  formatPaymentTermValue,
  getContractScopeItemLabel,
  normalizeContractDocument,
} from "./contractModel";

function getDisplayValue(value, fallback = "-") {
  return `${value ?? ""}`.trim() || fallback;
}
function DocumentSection({ title, value, fallback = "협의 후 확정" }) {
  return (
    <section className="contract-document__section">
      <h4>{title}</h4>
      <p>{getDisplayValue(value, fallback)}</p>
    </section>
  );
}

export default function ContractDocument({
  documentRef,
  outputMode = "screen",
  documentData,
  contractStatus = "draft",
}) {
  const document = normalizeContractDocument(documentData);
  const customer = document.customerSnapshot;
  const company = document.companySnapshot;
  const project = document.projectSnapshot;
  const estimate = document.estimateSnapshot;
  const construction = document.construction;

  return (
    <article
      className={`contract-document contract-document--${outputMode}`}
      data-contract-document={outputMode}
      ref={documentRef}
    >
      <header className="contract-document__title">
        <p>FORMATE 계약 문서</p>
        <h2>{document.title}</h2>
        <span>계약번호 {getDisplayValue(document.contractNumber)}</span>
      </header>

      <section className="contract-document__parties" aria-label="계약 당사자와 현장 정보">
        <div>
          <h3>고객</h3>
          <dl>
            <div><dt>성명</dt><dd>{getDisplayValue(customer.name)}</dd></div>
            <div><dt>연락처</dt><dd>{getDisplayValue(customer.phone)}</dd></div>
            <div><dt>이메일</dt><dd>{getDisplayValue(customer.email)}</dd></div>
          </dl>
        </div>
        <div>
          <h3>업체</h3>
          <dl>
            <div><dt>업체명</dt><dd>{getDisplayValue(company.name)}</dd></div>
            <div><dt>업체 코드</dt><dd>{getDisplayValue(company.companyCode)}</dd></div>
          </dl>
        </div>
        <div>
          <h3>현장</h3>
          <dl>
            <div><dt>현장명</dt><dd>{getDisplayValue(project.name)}</dd></div>
            <div>
              <dt>주소</dt>
              <dd>{getDisplayValue([project.address, project.detailAddress].filter(Boolean).join(" "))}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="contract-document__estimate" aria-label="연결 견적 정보">
        <div><span>연결 견적</span><strong>{getDisplayValue(estimate.estimateNumber)}</strong></div>
        <div><span>계약금액</span><strong>{formatContractAmount(estimate.totalAmount)}</strong></div>
        <div>
          <span>공사기간</span>
          <strong>
            {[construction.startDate, construction.endDate].filter(Boolean).join(" ~ ") || "협의 후 확정"}
          </strong>
          {construction.periodDescription ? <small>{construction.periodDescription}</small> : null}
        </div>
      </section>

      <section className="contract-document__section">
        <h4>주요 공사 범위</h4>
        {estimate.scopeItems.length > 0 ? (
          <ol className="contract-document__scope-list">
            {estimate.scopeItems.map((item, index) => (
              <li key={`${getContractScopeItemLabel(item)}-${index}`}>
                {getContractScopeItemLabel(item)}
              </li>
            ))}
          </ol>
        ) : (
          <p>연결 견적의 공사 항목을 확인해주세요.</p>
        )}
        {document.scopeSupplement ? (
          <div className="contract-document__supplement">
            <strong>보충 설명</strong>
            <p>{document.scopeSupplement}</p>
          </div>
        ) : null}
      </section>

      <section className="contract-document__section">
        <h4>지급 조건</h4>
        {document.paymentTerms.length > 0 ? (
          <table className="contract-document__payments">
            <thead>
              <tr><th>구분</th><th>비율 또는 금액</th><th>지급 시점</th></tr>
            </thead>
            <tbody>
              {document.paymentTerms.map((term) => (
                <tr key={term.id}>
                  <td>{term.label || "지급 조건"}</td>
                  <td>{formatPaymentTermValue(term)}</td>
                  <td>{term.dueDescription || "협의"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>지급 조건은 협의 후 확정합니다.</p>
        )}
      </section>

      <div className="contract-document__clauses">
        <DocumentSection title="제외 공사" value={document.exclusions} />
        <DocumentSection title="자재·규격 변경 기준" value={document.materialChangePolicy} />
        <DocumentSection title="추가공사 및 변경공사" value={document.changeOrderPolicy} />
        <DocumentSection title="지연·중단·계약 취소" value={document.delayCancellationPolicy} />
        <DocumentSection title="하자보수" value={document.warranty} />
        <DocumentSection title="특약사항" value={document.specialTerms} fallback="별도 특약 없음" />
      </div>

      <footer className="contract-document__confirmation">
        <p>계약 당사자는 최종 계약 내용과 현장 조건을 직접 확인합니다.</p>
        <div>
          <span>고객 확인</span>
          <strong>{["customer_signed", "completed"].includes(contractStatus) ? "확인 기록 있음" : "확인 전"}</strong>
        </div>
        <div>
          <span>업체 최종 확정</span>
          <strong>{contractStatus === "completed" ? "최종 확정" : "확정 전"}</strong>
        </div>
      </footer>
    </article>
  );
}
