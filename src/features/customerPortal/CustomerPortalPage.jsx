import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, FileText, MessageSquare, RefreshCcw } from "lucide-react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import {
  approveCustomerPortalEstimate,
  fetchCustomerPortal,
  submitCustomerPortalRequest,
} from "./customerPortalApi";
import {
  formatPortalDate,
  formatPortalMoney,
  formatPortalQuantity,
  getPortalAdjustmentAmount,
  getPortalAdjustments,
  getPortalConditionSummary,
  getPortalErrorCopy,
  getPortalEstimateMeta,
  getPortalItemAmount,
  getPortalItemLabel,
  getPortalItems,
  getPortalStatus,
} from "./customerPortalUtils";
import "./customerPortal.css";

const EMPTY_REQUEST_FORM = {
  title: "",
  body: "",
  relatedItemLabel: "",
};

export default function CustomerPortalPage({ token }) {
  const [portalData, setPortalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [requestType, setRequestType] = useState("inquiry");
  const [requestForm, setRequestForm] = useState(EMPTY_REQUEST_FORM);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestNotice, setRequestNotice] = useState("");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalError, setApprovalError] = useState("");

  const loadPortal = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setLoadError("");
    try {
      const result = await fetchCustomerPortal(token);
      setPortalData(result);
    } catch {
      setPortalData(null);
      setLoadError("견적 확인 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const estimateVersion = portalData?.estimateVersion ?? {};
  const items = useMemo(
    () => getPortalItems(estimateVersion.itemsSnapshot),
    [estimateVersion.itemsSnapshot],
  );
  const adjustments = useMemo(
    () => getPortalAdjustments(estimateVersion.itemsSnapshot),
    [estimateVersion.itemsSnapshot],
  );
  const estimateMeta = useMemo(
    () => getPortalEstimateMeta(estimateVersion.itemsSnapshot),
    [estimateVersion.itemsSnapshot],
  );
  const itemOptions = useMemo(() => {
    const labels = Array.from(new Set(items.map(getPortalItemLabel).filter(Boolean)));
    return [
      { value: "", label: "관련 항목 없음" },
      ...labels.map((label) => ({ value: label, label })),
    ];
  }, [items]);
  const status = getPortalStatus(estimateVersion.status);
  const approved = estimateVersion.status === "approved";
  const projectAddress = [
    portalData?.project?.address,
    portalData?.project?.detailAddress,
  ].filter(Boolean).join(" ");
  const conditionSummary = getPortalConditionSummary(estimateVersion.conditionSnapshot);

  const updateRequestField = (key, value) => {
    setRequestForm((current) => ({ ...current, [key]: value }));
  };

  const handleRequestSubmit = async (event) => {
    event.preventDefault();
    setRequestError("");
    setRequestNotice("");

    if (!requestForm.body.trim()) {
      setRequestError("요청 내용을 입력해주세요.");
      return;
    }

    setRequestSubmitting(true);
    try {
      await submitCustomerPortalRequest({
        token,
        requestType,
        title: requestForm.title.trim(),
        body: requestForm.body.trim(),
        relatedItemLabel: requestForm.relatedItemLabel,
      });
      setRequestForm(EMPTY_REQUEST_FORM);
      setRequestNotice(
        requestType === "estimate_revision"
          ? "수정 요청을 전달했습니다. 업체 확인 후 연락드릴 예정입니다."
          : "문의를 전달했습니다. 업체 확인 후 연락드릴 예정입니다.",
      );
      await loadPortal({ quiet: true });
    } catch (error) {
      setRequestError(error?.message || "요청을 전송하지 못했습니다.");
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setApprovalError("");
    setApprovalSubmitting(true);
    try {
      await approveCustomerPortalEstimate({
        token,
        note: approvalNote.trim(),
      });
      setApprovalOpen(false);
      setApprovalNote("");
      await loadPortal({ quiet: true });
    } catch (error) {
      setApprovalError(error?.message || "견적을 확정하지 못했습니다.");
    } finally {
      setApprovalSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="customer-portal">
        <main className="customer-portal__state" role="status">
          <span className="customer-portal__state-line" aria-hidden="true" />
          <p>견적서를 불러오는 중입니다.</p>
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="customer-portal">
        <main className="customer-portal__state">
          <FileText size={24} strokeWidth={1.5} aria-hidden="true" />
          <h1>견적서를 불러오지 못했습니다</h1>
          <p>{loadError}</p>
          <Button variant="secondary" leftIcon={<RefreshCcw />} onClick={() => loadPortal()}>
            다시 시도
          </Button>
        </main>
      </div>
    );
  }

  if (!portalData?.ok) {
    const errorCopy = getPortalErrorCopy(portalData?.code);
    return (
      <div className="customer-portal">
        <main className="customer-portal__state">
          <FileText size={24} strokeWidth={1.5} aria-hidden="true" />
          <h1>{errorCopy.title}</h1>
          <p>{errorCopy.description}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="customer-portal">
      <header className="customer-portal__topbar">
        <div className="customer-portal__brand">
          <span aria-hidden="true">F</span>
          <div>
            <strong>{portalData.company?.name || "FORMATE"}</strong>
            <small>견적 확인</small>
          </div>
        </div>
        <span className={`customer-portal__status customer-portal__status--${status.tone}`}>
          <span aria-hidden="true" />
          {status.label}
        </span>
      </header>

      <main className="customer-portal__main">
        <article className="customer-portal__document">
          <header className="customer-portal__document-header">
            <div className="customer-portal__document-heading">
              <span>견적서 확인</span>
              <h1>{portalData.project?.name || projectAddress || "인테리어 견적서"}</h1>
              <p>
                {portalData.customer?.name || "고객"} 고객님
                {projectAddress ? ` · ${projectAddress}` : ""}
              </p>
            </div>
            <div className="customer-portal__document-total">
              <span>총 견적금액</span>
              <strong>{formatPortalMoney(estimateVersion.totalAmount)}</strong>
            </div>
          </header>

          <dl className="customer-portal__meta">
            <div>
              <dt>견적 버전</dt>
              <dd>{estimateVersion.label || `견적 ${estimateVersion.versionNo || 1}차`}</dd>
            </div>
            <div>
              <dt>견적서 번호</dt>
              <dd>{estimateMeta.estimateNumber || "-"}</dd>
            </div>
            <div>
              <dt>작성일</dt>
              <dd>{formatPortalDate(estimateMeta.createdDate || portalData.estimate?.createdAt)}</dd>
            </div>
            <div>
              <dt>전송일</dt>
              <dd>{formatPortalDate(estimateVersion.sentAt)}</dd>
            </div>
          </dl>

          <section className="customer-portal__summary" aria-label="견적 요약">
            <div>
              <span>예상 시공일</span>
              <strong>
                {Number(estimateVersion.estimatedConstructionDays) > 0
                  ? `${estimateVersion.estimatedConstructionDays}일`
                  : "-"}
              </strong>
            </div>
            <div>
              <span>시공 예정일</span>
              <strong>{formatPortalDate(portalData.estimate?.constructionDate)}</strong>
            </div>
            <div>
              <span>견적 조건</span>
              <strong>{conditionSummary || "조건 정보 없음"}</strong>
            </div>
          </section>

          <section className="customer-portal__section">
            <div className="customer-portal__section-heading">
              <h2>견적 상세</h2>
              <span>{items.length}개 항목</span>
            </div>
            <div className="customer-portal__table-scroll">
              <table className="customer-portal__table">
                <thead>
                  <tr>
                    <th>시공 항목</th>
                    <th>내용</th>
                    <th>규격</th>
                    <th>수량</th>
                    <th>금액</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={`${getPortalItemLabel(item)}-${index}`}>
                      <td>{item.categoryName || item.category || "시공 항목"}</td>
                      <td>{item.material || item.name || "내용 미입력"}</td>
                      <td>{item.spec || "-"}</td>
                      <td>{formatPortalQuantity(item.quantity, item.unit)}</td>
                      <td>{formatPortalMoney(getPortalItemAmount(item))}</td>
                    </tr>
                  ))}
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="customer-portal__table-empty">
                        표시할 견적 항목이 없습니다.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {adjustments.length > 0 ? (
              <div className="customer-portal__adjustments">
                <h3>추가금·할인</h3>
                {adjustments.map((adjustment, index) => (
                  <div key={`${adjustment.label || "adjustment"}-${index}`}>
                    <span>{adjustment.label || "추가금·할인"}</span>
                    <strong>
                      {adjustment.type === "discount" ? "-" : "+"}
                      {formatPortalMoney(getPortalAdjustmentAmount(adjustment))}
                    </strong>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="customer-portal__section customer-portal__request-section">
            <div className="customer-portal__section-heading">
              <h2>문의 및 수정 요청</h2>
              <span>업체에 바로 전달됩니다</span>
            </div>

            <div className="customer-portal__request-tabs" role="tablist" aria-label="요청 유형">
              <button
                type="button"
                role="tab"
                aria-selected={requestType === "inquiry"}
                onClick={() => {
                  setRequestType("inquiry");
                  setRequestError("");
                  setRequestNotice("");
                }}
              >
                문의하기
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={requestType === "estimate_revision"}
                onClick={() => {
                  setRequestType("estimate_revision");
                  setRequestError("");
                  setRequestNotice("");
                }}
              >
                수정 요청
              </button>
            </div>

            <form className="customer-portal__request-form" onSubmit={handleRequestSubmit}>
              <Input
                label="제목"
                value={requestForm.title}
                maxLength={120}
                placeholder="선택 입력"
                onChange={(event) => updateRequestField("title", event.target.value)}
              />
              <Select
                label="관련 항목"
                value={requestForm.relatedItemLabel}
                options={itemOptions}
                onChange={(event) => updateRequestField("relatedItemLabel", event.target.value)}
              />
              <Input
                as="textarea"
                className="customer-portal__request-body"
                label={requestType === "estimate_revision" ? "수정할 내용" : "문의 내용"}
                value={requestForm.body}
                maxLength={4000}
                required
                placeholder={
                  requestType === "estimate_revision"
                    ? "변경이 필요한 항목과 내용을 입력해주세요."
                    : "견적에 대해 궁금한 내용을 입력해주세요."
                }
                onChange={(event) => updateRequestField("body", event.target.value)}
              />
              <div className="customer-portal__request-actions">
                <div aria-live="polite">
                  {requestError ? <p className="customer-portal__form-error">{requestError}</p> : null}
                  {requestNotice ? <p className="customer-portal__form-notice">{requestNotice}</p> : null}
                </div>
                <Button
                  variant={requestType === "estimate_revision" ? "secondary" : "primary"}
                  type="submit"
                  leftIcon={<MessageSquare />}
                  disabled={requestSubmitting}
                >
                  {requestSubmitting ? "전송 중" : requestType === "estimate_revision" ? "수정 요청 보내기" : "문의 보내기"}
                </Button>
              </div>
            </form>
          </section>

          <section className="customer-portal__approval">
            <div>
              <h2>{approved ? "견적이 확정되었습니다" : "이 견적으로 진행하시겠습니까?"}</h2>
              <p>
                {approved
                  ? `${formatPortalDate(estimateVersion.approvedAt)}에 고객 확정이 기록되었습니다.`
                  : "확정 후에도 위 문의 기능으로 추가 내용을 전달할 수 있습니다."}
              </p>
            </div>
            <Button
              variant="primary"
              leftIcon={<Check />}
              disabled={approved}
              onClick={() => setApprovalOpen(true)}
            >
              {approved ? "확정 완료" : "이 견적으로 진행하기"}
            </Button>
          </section>
        </article>
      </main>

      {approvalOpen ? (
        <div className="customer-portal__dialog-backdrop" onClick={() => setApprovalOpen(false)}>
          <section
            className="customer-portal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-portal-approval-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <h2 id="customer-portal-approval-title">견적을 확정하시겠습니까?</h2>
              <p>확정 내용은 업체에 즉시 기록됩니다.</p>
            </div>
            <Input
              as="textarea"
              label="업체에 남길 메모"
              value={approvalNote}
              maxLength={1000}
              placeholder="선택 입력"
              onChange={(event) => setApprovalNote(event.target.value)}
            />
            {approvalError ? <p className="customer-portal__form-error">{approvalError}</p> : null}
            <footer>
              <Button variant="secondary" onClick={() => setApprovalOpen(false)}>
                취소
              </Button>
              <Button variant="primary" disabled={approvalSubmitting} onClick={handleApprove}>
                {approvalSubmitting ? "확정 중" : "견적 확정"}
              </Button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
