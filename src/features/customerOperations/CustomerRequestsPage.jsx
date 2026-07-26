import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Pause,
  Play,
  RotateCcw,
  Search,
} from "lucide-react";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import { fetchCustomerRequests, updateCustomerRequestStatus } from "./api";
import { CUSTOMER_OPERATIONS_PAGES } from "./constants";
import {
  formatOperationDateTime,
  getCustomerRequestLogicalStatus,
  getCustomerOperationText,
  getCustomerName,
  getProjectName,
  getRelationRow,
  isDeletedEstimate,
  operationStatusViews,
} from "./utils";

const STATUS_FILTERS = [
  { key: "attention", label: "처리 필요" },
  { key: "reviewing", label: "처리 중" },
  { key: "completed", label: "완료" },
];

const TYPE_FILTERS = [
  { value: "all", label: "전체 유형" },
  { value: "inquiry", label: "일반 문의" },
  { value: "estimate_revision", label: "수정 요청" },
  { value: "approval", label: "견적 확정" },
];

const REQUEST_TYPE_META = {
  inquiry: { label: "일반 문의" },
  estimate_revision: { label: "수정 요청" },
  approval: { label: "견적 확정" },
};

const GENERATED_REQUEST_TITLES = new Set([
  "Estimate inquiry",
  "Estimate revision request",
  "Estimate approved",
]);

const REQUEST_STATUS_META = {
  received: { label: "접수", tone: "received" },
  reviewing: { label: "처리 중", tone: "reviewing" },
  pricing: { label: "금액 확인 중", tone: "reviewing" },
  awaiting_customer_approval: { label: "고객 승인 대기", tone: "reviewing" },
  closed: { label: "완료", tone: "closed" },
  rejected: { label: "반려·종료", tone: "rejected" },
  approved: { label: "확정", tone: "approved" },
};

function getRequestTypeMeta(requestType) {
  return REQUEST_TYPE_META[requestType] || {
    label: operationStatusViews.requestType(requestType).label,
  };
}

function getRequestStatusMeta(status) {
  return REQUEST_STATUS_META[status] || {
    label: operationStatusViews.request(status).label,
    tone: "muted",
  };
}

function isStatusFilterMatch(status, filter) {
  const logicalStatus = getCustomerRequestLogicalStatus(status);
  if (filter === "attention") return logicalStatus === "received";
  if (filter === "reviewing") return logicalStatus === "in_progress";
  if (filter === "completed") return ["completed", "rejected"].includes(logicalStatus);
  return true;
}

function normalizeSearchText(value) {
  return `${value ?? ""}`.trim().toLocaleLowerCase();
}

function normalizeComparableRequestText(value) {
  return `${value ?? ""}`
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function splitRequestBody(value) {
  const body = `${value ?? ""}`.trim();
  if (!body) return { headline: "", description: "" };

  const sentenceMatch = body.match(/^([\s\S]*?[.!?。！？])(?:\s+|$)([\s\S]*)$/);
  if (sentenceMatch?.[1]) {
    return {
      headline: sentenceMatch[1].trim(),
      description: sentenceMatch[2]?.trim() || "",
    };
  }

  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1) {
    return {
      headline: lines[0],
      description: lines.slice(1).join("\n"),
    };
  }

  if (body.length > 180) {
    const candidateBreak = body.lastIndexOf(" ", 180);
    const splitAt = candidateBreak >= 100 ? candidateBreak : 180;
    return {
      headline: `${body.slice(0, splitAt).trim()}…`,
      description: body.slice(splitAt).trim(),
    };
  }

  return { headline: body, description: "" };
}

function getRequestContent(request, fallbackTitle) {
  const rawTitle = `${request?.title ?? ""}`.trim();
  const translatedTitle = getCustomerOperationText(rawTitle, "").trim();
  const body = `${request?.body ?? ""}`.trim();
  const hasGeneratedTitle = GENERATED_REQUEST_TITLES.has(rawTitle);

  if (translatedTitle && !hasGeneratedTitle) {
    return {
      headline: translatedTitle,
      description: (
        body
        && normalizeComparableRequestText(body) !== normalizeComparableRequestText(translatedTitle)
      )
        ? body
        : "",
    };
  }

  const bodyContent = splitRequestBody(body);
  return {
    headline: bodyContent.headline || translatedTitle || fallbackTitle,
    description: bodyContent.description,
  };
}

function getRequestEstimateContext(request) {
  const version = getRelationRow(request?.estimate_version);
  const directEstimate = getRelationRow(request?.estimate);
  const versionEstimate = getRelationRow(version?.estimate);
  if (isDeletedEstimate(directEstimate) || isDeletedEstimate(versionEstimate)) return null;

  const label = `${version?.label ?? ""}`.trim()
    || (version?.version_no ? `견적 v${version.version_no}` : "");
  if (!label) return null;

  return {
    label,
    status: version?.status
      ? operationStatusViews.estimate(version.status).label
      : "",
  };
}

function isRequestMatch(request, {
  statusFilter,
  typeFilter,
  searchQuery,
}) {
  if (!isStatusFilterMatch(request.status, statusFilter)) return false;
  if (typeFilter !== "all" && request.request_type !== typeFilter) return false;

  const normalizedQuery = normalizeSearchText(searchQuery);
  if (!normalizedQuery) return true;

  const searchableText = [
    getCustomerOperationText(request.title, ""),
    request.body,
    getCustomerName(request),
    getProjectName(request),
    getRequestEstimateContext(request)?.label,
    request.related_item_label,
  ]
    .map(normalizeSearchText)
    .join(" ");

  return searchableText.includes(normalizedQuery);
}

function formatRelativeRequestTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "-";

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) return "방금 전";

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}시간 전`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}일 전`;

  return formatOperationDateTime(value);
}

export default function CustomerRequestsPage({ companyId, onNavigate }) {
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [statusFilter, setStatusFilter] = useState("attention");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [processingError, setProcessingError] = useState("");
  const [processingNotice, setProcessingNotice] = useState("");
  const [internalMemo, setInternalMemo] = useState("");
  const detailBodyRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const rows = await fetchCustomerRequests(companyId);
        if (!active) return;
        setRequests(rows);
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.message || "받은 요청을 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [companyId, reloadKey]);

  const statusCounts = useMemo(
    () => Object.fromEntries(STATUS_FILTERS.map((filter) => [
      filter.key,
      requests.filter((request) => isStatusFilterMatch(request.status, filter.key)).length,
    ])),
    [requests]
  );

  const filteredRequests = useMemo(() => requests
    .filter((request) => isRequestMatch(request, {
      statusFilter,
      typeFilter,
      searchQuery,
    }))
    .sort((left, right) => {
      const leftTime = new Date(left.created_at).getTime() || 0;
      const rightTime = new Date(right.created_at).getTime() || 0;
      return sortOrder === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    }), [requests, searchQuery, sortOrder, statusFilter, typeFilter]);

  const selectRequest = useCallback((requestId, { openDetail = false } = {}) => {
    setSelectedRequestId(requestId);
    if (openDetail) setMobileDetailOpen(true);
  }, []);

  useEffect(() => {
    setSelectedRequestId((current) => {
      if (filteredRequests.some((request) => request.id === current)) return current;
      return filteredRequests[0]?.id || "";
    });
    if (filteredRequests.length === 0) setMobileDetailOpen(false);
  }, [filteredRequests]);

  const selectedRequest = useMemo(
    () => filteredRequests.find((request) => request.id === selectedRequestId) ?? null,
    [filteredRequests, selectedRequestId]
  );

  useEffect(() => {
    setInternalMemo(selectedRequest?.internal_memo || "");
    setProcessingError("");
    if (detailBodyRef.current) detailBodyRef.current.scrollTop = 0;
  }, [selectedRequestId, selectedRequest?.internal_memo]);

  useEffect(() => {
    const handleRequestNavigation = (event) => {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      if (
        target?.isContentEditable
        || tagName === "input"
        || tagName === "textarea"
        || tagName === "select"
      ) {
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (filteredRequests.length === 0) return;

      event.preventDefault();
      const currentIndex = filteredRequests.findIndex((request) => request.id === selectedRequestId);
      const nextIndex = event.key === "ArrowDown"
        ? Math.min(filteredRequests.length - 1, Math.max(0, currentIndex + 1))
        : Math.max(0, currentIndex < 0 ? 0 : currentIndex - 1);
      selectRequest(filteredRequests[nextIndex].id);
    };

    window.addEventListener("keydown", handleRequestNavigation);
    return () => window.removeEventListener("keydown", handleRequestNavigation);
  }, [filteredRequests, selectRequest, selectedRequestId]);

  const handleStatusChange = async (status) => {
    if (!selectedRequest) return;

    const currentIndex = filteredRequests.findIndex((request) => request.id === selectedRequest.id);
    const nextRequest = filteredRequests[currentIndex + 1] || filteredRequests[currentIndex - 1] || null;

    setProcessing(true);
    setProcessingError("");
    setProcessingNotice("");
    try {
      const updatedRequest = await updateCustomerRequestStatus({
        companyId,
        requestId: selectedRequest.id,
        status,
        internalMemo,
      });
      setRequests((current) => current.map((request) => (
        request.id === updatedRequest.id ? updatedRequest : request
      )));
      setInternalMemo(updatedRequest.internal_memo || "");
      if (status === "closed") {
        setProcessingNotice("요청을 완료했습니다.");
      } else if (
        ["closed", "approved"].includes(selectedRequest.status)
        || selectedRequest.status === "rejected"
      ) {
        setProcessingNotice("요청을 다시 열었습니다.");
      } else if (status === "reviewing") {
        setProcessingNotice("요청 처리를 시작했습니다.");
      } else if (status === "received") {
        setProcessingNotice("요청 처리를 보류했습니다.");
      } else if (status === "rejected") {
        setProcessingNotice("요청을 반려·종료했습니다.");
      }

      if (!isRequestMatch(updatedRequest, { statusFilter, typeFilter, searchQuery })) {
        selectRequest(nextRequest?.id || "");
        if (!nextRequest) setMobileDetailOpen(false);
      }
    } catch (updateError) {
      setProcessingError("요청 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setProcessing(false);
    }
  };

  const selectedType = selectedRequest ? getRequestTypeMeta(selectedRequest.request_type) : null;
  const selectedStatus = selectedRequest ? getRequestStatusMeta(selectedRequest.status) : null;
  const selectedCustomer = getRelationRow(selectedRequest?.customer);
  const selectedProject = getRelationRow(selectedRequest?.project);
  const selectedContent = selectedRequest
    ? getRequestContent(selectedRequest, selectedType?.label || "고객 요청")
    : null;
  const selectedEstimateContext = getRequestEstimateContext(selectedRequest);
  const emptyMessage = {
    attention: "현재 처리할 새 요청이 없습니다.",
    reviewing: "현재 처리 중인 요청이 없습니다.",
    completed: "완료된 요청이 없습니다.",
  }[statusFilter];

  const renderDetailActions = () => {
    if (!selectedRequest || !selectedStatus) return null;
    const logicalStatus = getCustomerRequestLogicalStatus(selectedRequest.status);

    if (logicalStatus === "completed" || logicalStatus === "rejected") {
      return (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RotateCcw />}
          disabled={processing}
          onClick={() => handleStatusChange(logicalStatus === "completed" ? "reviewing" : "received")}
        >
          {processing
            ? "처리 중..."
            : logicalStatus === "completed"
              ? "처리 다시 열기"
              : "다시 열기"}
        </Button>
      );
    }

    if (logicalStatus === "in_progress") {
      return (
        <>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Pause />}
            disabled={processing}
            onClick={() => handleStatusChange("received")}
          >
            처리 보류
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Check />}
            disabled={processing}
            onClick={() => handleStatusChange("closed")}
          >
            {processing ? "처리 중..." : "처리 완료"}
          </Button>
        </>
      );
    }

    return (
      <>
        <Button
          variant="secondary"
          size="sm"
          className="customer-requests-inbox__reject-action"
          disabled={processing}
          onClick={() => handleStatusChange("rejected")}
        >
          반려·종료
        </Button>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Play />}
          disabled={processing}
          onClick={() => handleStatusChange("reviewing")}
        >
          {processing ? "처리 중..." : "처리 시작"}
        </Button>
      </>
    );
  };

  return (
    <main className="customer-operations-page customer-requests-inbox">
      <PageHeader
        title="받은 요청"
        description="고객 요청을 확인하고 처리 상태를 관리합니다."
      />

      <section className="customer-requests-inbox__toolbar" aria-label="요청 필터">
        <div className="customer-requests-inbox__status-filters" role="tablist" aria-label="처리 상태">
          {STATUS_FILTERS.map((filter) => (
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === filter.key}
              className={statusFilter === filter.key ? "is-active" : ""}
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
            >
              {filter.label}
              <span>{statusCounts[filter.key]}</span>
            </button>
          ))}
        </div>

        <div className="customer-requests-inbox__filter-controls">
          <label className="customer-requests-inbox__search">
            <span className="customer-requests-inbox__visually-hidden">요청 검색</span>
            <Search size={16} strokeWidth={1.5} aria-hidden="true" />
            <input
              value={searchQuery}
              placeholder="요청, 고객, 현장 검색"
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <label className="customer-requests-inbox__select customer-requests-inbox__select--type">
            <span className="customer-requests-inbox__visually-hidden">요청 유형</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              {TYPE_FILTERS.map((filter) => (
                <option value={filter.value} key={filter.value}>{filter.label}</option>
              ))}
            </select>
          </label>
          <label className="customer-requests-inbox__select customer-requests-inbox__select--sort">
            <span className="customer-requests-inbox__visually-hidden">정렬</span>
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
              <option value="latest">최신순</option>
              <option value="oldest">오래된 순</option>
            </select>
          </label>
        </div>
      </section>

      {processingNotice ? (
        <div className="customer-requests-inbox__notice" role="status">
          {processingNotice}
        </div>
      ) : null}

      <section
        className={`customer-requests-inbox__workspace ${mobileDetailOpen ? "is-detail-open" : ""}`.trim()}
        aria-label="고객 요청 검토"
      >
        <aside className="customer-requests-inbox__list-pane" aria-label="요청 목록">
          <header className="customer-requests-inbox__list-header">
            <strong>요청 목록</strong>
          </header>
          <div className="customer-requests-inbox__list-scroll" aria-busy={loading}>
            {error && requests.length > 0 ? (
              <div className="customer-requests-inbox__list-error" role="alert">
                <span>요청을 새로고침하지 못해 이전 목록을 표시합니다.</span>
                <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
                  다시 불러오기
                </button>
              </div>
            ) : null}
            {loading && requests.length === 0 ? (
              <div className="customer-requests-inbox__pane-state" role="status">요청을 불러오는 중</div>
            ) : error && requests.length === 0 ? (
              <div className="customer-requests-inbox__pane-state is-error">
                <span>요청을 불러오지 못했습니다.</span>
                <Button variant="secondary" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
                  다시 불러오기
                </Button>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="customer-requests-inbox__pane-state">
                {searchQuery.trim() || typeFilter !== "all"
                  ? "현재 검색 조건에 맞는 요청이 없습니다."
                  : emptyMessage}
              </div>
            ) : (
              filteredRequests.map((request) => {
                const typeMeta = getRequestTypeMeta(request.request_type);
                const statusMeta = getRequestStatusMeta(request.status);
                const content = getRequestContent(request, typeMeta.label);
                const selected = request.id === selectedRequestId;

                return (
                  <button
                    type="button"
                    className={[
                      "customer-requests-inbox__request-row",
                      selected ? "is-selected" : "",
                    ].filter(Boolean).join(" ")}
                    aria-current={selected ? "true" : undefined}
                    key={request.id}
                    onClick={() => selectRequest(request.id, { openDetail: true })}
                    >
                      <span className="customer-requests-inbox__request-line customer-requests-inbox__request-line--top">
                        <span className="customer-requests-inbox__request-type">{typeMeta.label}</span>
                      <time>{formatRelativeRequestTime(request.created_at)}</time>
                    </span>
                    <strong
                      className="customer-requests-inbox__request-title"
                      title={content.headline}
                    >
                      {content.headline}
                    </strong>
                    <span className="customer-requests-inbox__request-line customer-requests-inbox__request-line--meta">
                      <span>
                        {getCustomerName(request)}
                        {" · "}
                        {getProjectName(request)}
                      </span>
                      <span className={`customer-requests-inbox__status is-${statusMeta.tone}`}>
                        <i aria-hidden="true" />
                        {statusMeta.label}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <article className="customer-requests-inbox__detail-pane" aria-label="요청 상세">
          {selectedRequest ? (
            <>
              <header className="customer-requests-inbox__detail-header">
                <button
                  type="button"
                  className="customer-requests-inbox__back"
                  onClick={() => setMobileDetailOpen(false)}
                >
                  <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" />
                  요청 목록
                </button>
                <div className="customer-requests-inbox__detail-meta">
                  <span>
                    <span className="customer-requests-inbox__detail-type">{selectedType.label}</span>
                    <span aria-hidden="true">·</span>
                    <time>{formatRelativeRequestTime(selectedRequest.created_at)}</time>
                  </span>
                  <span className={`customer-requests-inbox__status is-${selectedStatus.tone}`}>
                    <i aria-hidden="true" />
                    {selectedStatus.label}
                  </span>
                </div>
                <h2>{selectedContent.headline}</h2>
              </header>

              <div className="customer-requests-inbox__detail-body" ref={detailBodyRef}>
                {selectedContent.description ? (
                  <section className="customer-requests-inbox__detail-section customer-requests-inbox__detail-section--description">
                    <p className="customer-requests-inbox__request-body">{selectedContent.description}</p>
                  </section>
                ) : null}

                {selectedRequest.related_item_label ? (
                  <section className="customer-requests-inbox__detail-section">
                    <h3>관련 항목</h3>
                    <p>{selectedRequest.related_item_label}</p>
                  </section>
                ) : null}

                <section className="customer-requests-inbox__detail-section customer-requests-inbox__context-row">
                  <div>
                    <h3>고객·현장</h3>
                    <p>
                      {selectedCustomer?.name || "고객명 미입력"}
                      {" · "}
                      {selectedProject?.name || selectedProject?.address || "현장 미입력"}
                    </p>
                  </div>
                  {selectedProject?.id && onNavigate ? (
                    <button
                      type="button"
                      onClick={() => onNavigate(CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS)}
                    >
                      고객·현장 보기
                      <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  ) : null}
                </section>

                {selectedEstimateContext ? (
                  <section className="customer-requests-inbox__detail-section customer-requests-inbox__context-row">
                    <div>
                      <h3>관련 견적</h3>
                      <p>
                        {selectedEstimateContext.label}
                        {selectedEstimateContext.status ? ` · ${selectedEstimateContext.status}` : ""}
                      </p>
                    </div>
                    {onNavigate ? (
                      <button type="button" onClick={() => onNavigate("admin-estimates")}>
                        저장 견적 보기
                        <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
                      </button>
                    ) : null}
                  </section>
                ) : null}

                <section className="customer-requests-inbox__detail-section customer-requests-inbox__memo-section">
                  <label htmlFor={`request-memo-${selectedRequest.id}`}>관리자 메모</label>
                  <textarea
                    id={`request-memo-${selectedRequest.id}`}
                    value={internalMemo}
                    maxLength={2000}
                    placeholder="처리 내용이나 확인 사항을 기록합니다."
                    onChange={(event) => setInternalMemo(event.target.value)}
                  />
                  <span>고객에게 노출되지 않는 내부 메모입니다.</span>
                  {processingError ? (
                    <p className="customer-requests-inbox__error" role="alert">{processingError}</p>
                  ) : null}
                </section>
              </div>

              <footer className="customer-requests-inbox__action-bar">
                <span>다음 행동</span>
                <div>{renderDetailActions()}</div>
              </footer>
            </>
          ) : (
            <div className="customer-requests-inbox__detail-empty">
              목록에서 요청을 선택하면 상세 내용을 확인할 수 있습니다.
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
