import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CircleCheck,
  FileText,
  MessageSquare,
  PencilLine,
  RefreshCcw,
  X,
} from "lucide-react";
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
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalError, setApprovalError] = useState("");
  const requestDialogRef = useRef(null);
  const requestTriggerRef = useRef(null);
  const approvalDialogRef = useRef(null);
  const approvalTriggerRef = useRef(null);

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
  const conditionValues = conditionSummary.split(" · ").filter(Boolean);
  const estimateNumber = `${estimateMeta.estimateNumber ?? ""}`.trim();
  const estimateVersionLabel = `${
    estimateVersion.label || (estimateVersion.versionNo ? `견적 ${estimateVersion.versionNo}차` : "")
  }`.trim();
  const estimateCreatedDate = estimateMeta.createdDate || portalData?.estimate?.createdAt;
  const metadata = [
    estimateNumber ? { label: "견적번호", value: estimateNumber } : null,
    estimateVersionLabel && estimateVersionLabel !== estimateNumber
      ? { label: "견적 버전", value: estimateVersionLabel }
      : null,
    estimateCreatedDate
      ? { label: "작성일", value: formatPortalDate(estimateCreatedDate) }
      : null,
    estimateMeta.validUntil
      ? { label: "유효기간", value: formatPortalDate(estimateMeta.validUntil) }
      : null,
    Number(estimateVersion.estimatedConstructionDays) > 0
      ? { label: "예상 시공일", value: `${estimateVersion.estimatedConstructionDays}일` }
      : null,
    portalData?.estimate?.constructionDate
      ? { label: "시공 예정일", value: formatPortalDate(portalData.estimate.constructionDate) }
      : null,
  ].filter(Boolean);
  const projectName = portalData?.project?.name || projectAddress || "인테리어 견적서";
  const customerName = portalData?.customer?.name || "고객";

  useEffect(() => {
    if (!requestDialogOpen && !approvalOpen) return undefined;

    const focusFrame = window.requestAnimationFrame(() => {
      const dialog = requestDialogOpen ? requestDialogRef.current : approvalDialogRef.current;
      const focusTarget = requestDialogOpen
        ? dialog?.querySelector("input")
        : dialog?.querySelector("textarea");
      focusTarget?.focus();
    });
    const handleDialogKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (requestDialogOpen) setRequestDialogOpen(false);
      if (approvalOpen) setApprovalOpen(false);
    };

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDialogKeyDown);
      const trigger = requestDialogOpen ? requestTriggerRef.current : approvalTriggerRef.current;
      window.requestAnimationFrame(() => trigger?.focus());
    };
  }, [approvalOpen, requestDialogOpen]);

  const updateRequestField = (key, value) => {
    setRequestForm((current) => ({ ...current, [key]: value }));
  };

  const openRequestDialog = (type, trigger) => {
    requestTriggerRef.current = trigger;
    setRequestType(type);
    setRequestError("");
    setRequestNotice("");
    setRequestDialogOpen(true);
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
      setRequestDialogOpen(false);
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
        <div className="customer-portal__topbar-inner">
          <div className="customer-portal__brand">
            <strong>{portalData.company?.name || "견적 발신 업체"}</strong>
          </div>
          <span className="customer-portal__topbar-label">견적 확인</span>
        </div>
      </header>

      <main className="customer-portal__main">
        <article className="customer-portal__document">
          <header className="customer-portal__document-header">
            <div className="customer-portal__document-heading">
              <span>견적서</span>
              <h1>{projectName}</h1>
              <p>
                {customerName} 고객
                {projectAddress ? ` · ${projectAddress}` : ""}
              </p>
            </div>
            <div className="customer-portal__document-total">
              <span>총 견적금액</span>
              <strong>{formatPortalMoney(estimateVersion.totalAmount)}</strong>
              <div className={`customer-portal__status customer-portal__status--${status.tone}`}>
                {approved ? <CircleCheck aria-hidden="true" /> : <i aria-hidden="true" />}
                <span>{status.label}</span>
              </div>
              {status.description ? <small>{status.description}</small> : null}
            </div>
          </header>

          {metadata.length > 0 ? (
            <dl className="customer-portal__meta">
              {metadata.map((entry) => (
                <div key={entry.label}>
                  <dt>{entry.label}</dt>
                  <dd>{entry.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {conditionValues.length > 0 ? (
            <section className="customer-portal__section customer-portal__conditions">
              <div className="customer-portal__section-heading">
                <h2>주요 조건</h2>
              </div>
              <div className="customer-portal__condition-list">
                {conditionValues.map((value, index) => (
                  <span key={`${value}-${index}`}>{value}</span>
                ))}
              </div>
            </section>
          ) : null}

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
                      <td className="customer-portal__item-category">
                        {item.categoryName || item.category || "시공 항목"}
                      </td>
                      <td className="customer-portal__item-content">
                        {item.material || item.name || "내용 미입력"}
                      </td>
                      <td className="customer-portal__item-spec">{item.spec || ""}</td>
                      <td className="customer-portal__item-quantity">
                        <span className="customer-portal__mobile-label">수량</span>
                        {formatPortalQuantity(item.quantity, item.unit)}
                      </td>
                      <td className="customer-portal__item-amount">
                        {formatPortalMoney(getPortalItemAmount(item))}
                      </td>
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

          <section className="customer-portal__section customer-portal__guidance">
            <div className="customer-portal__section-heading">
              <h2>고객 안내·유의사항</h2>
            </div>
            <p>
              견적 내용에 궁금한 점이나 변경할 사항이 있으면 문의 또는 변경 요청을 이용해주세요.
            </p>
          </section>

          {requestNotice ? (
            <p className="customer-portal__notice" role="status">{requestNotice}</p>
          ) : null}
        </article>
      </main>

      <aside className="customer-portal__action-bar" aria-label="견적 작업">
        <div className="customer-portal__action-bar-inner">
          <div className="customer-portal__action-total">
            <span>총 견적금액</span>
            <strong>{formatPortalMoney(estimateVersion.totalAmount)}</strong>
          </div>
          <div className="customer-portal__action-controls">
            <Button
              variant="tertiary"
              leftIcon={<MessageSquare />}
              onClick={(event) => openRequestDialog("inquiry", event.currentTarget)}
            >
              문의하기
            </Button>
            {approved ? (
              <span className="customer-portal__approved-action">
                <CircleCheck aria-hidden="true" />
                <span>
                  이 견적으로 진행하기로 확정했습니다
                  {estimateVersion.approvedAt
                    ? <small>{formatPortalDate(estimateVersion.approvedAt)}</small>
                    : null}
                </span>
              </span>
            ) : (
              <>
                <Button
                  variant="secondary"
                  leftIcon={<PencilLine />}
                  onClick={(event) => openRequestDialog("estimate_revision", event.currentTarget)}
                >
                  변경 요청
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Check />}
                  disabled={approvalSubmitting}
                  onClick={(event) => {
                    approvalTriggerRef.current = event.currentTarget;
                    setApprovalError("");
                    setApprovalOpen(true);
                  }}
                >
                  이 견적으로 진행하기
                </Button>
              </>
            )}
          </div>
        </div>
      </aside>

      {requestDialogOpen ? (
        <div
          className="customer-portal__dialog-backdrop"
          onClick={() => {
            if (!requestSubmitting) setRequestDialogOpen(false);
          }}
        >
          <section
            ref={requestDialogRef}
            className="customer-portal__dialog customer-portal__request-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-portal-request-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="customer-portal__dialog-header">
              <div>
                <h2 id="customer-portal-request-title">
                  {requestType === "estimate_revision" ? "변경 요청" : "문의하기"}
                </h2>
                <p>
                  {requestType === "estimate_revision"
                    ? "변경이 필요한 항목과 내용을 업체에 전달합니다."
                    : "견적에 대해 궁금한 내용을 업체에 전달합니다."}
                </p>
              </div>
              <button
                type="button"
                className="customer-portal__dialog-close"
                aria-label="요청 창 닫기"
                disabled={requestSubmitting}
                onClick={() => setRequestDialogOpen(false)}
              >
                <X aria-hidden="true" />
              </button>
            </header>

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
                label={requestType === "estimate_revision" ? "변경할 내용" : "문의 내용"}
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
              {requestError ? <p className="customer-portal__form-error">{requestError}</p> : null}
              <footer>
                <Button
                  variant="secondary"
                  disabled={requestSubmitting}
                  onClick={() => setRequestDialogOpen(false)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={requestSubmitting}
                >
                  {requestSubmitting ? "전송 중" : "업체에 전달"}
                </Button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

      {approvalOpen ? (
        <div className="customer-portal__dialog-backdrop" onClick={() => setApprovalOpen(false)}>
          <section
            ref={approvalDialogRef}
            className="customer-portal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-portal-approval-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="customer-portal__dialog-header">
              <div>
                <h2 id="customer-portal-approval-title">이 견적으로 진행하시겠습니까?</h2>
                <p>{projectName} · {formatPortalMoney(estimateVersion.totalAmount)}</p>
              </div>
              <button
                type="button"
                className="customer-portal__dialog-close"
                aria-label="견적 확정 창 닫기"
                disabled={approvalSubmitting}
                onClick={() => setApprovalOpen(false)}
              >
                <X aria-hidden="true" />
              </button>
            </header>
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
