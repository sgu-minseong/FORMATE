import { useEffect, useMemo, useState } from "react";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import Table from "../../components/ui/Table";
import ToggleButton from "../../components/ui/ToggleButton";
import PriceText from "../../components/PriceText";
import {
  fetchCustomerProjectDetail,
  fetchCustomersProjects,
  updateCustomerRequestStatus,
} from "./api";
import { CUSTOMER_DETAIL_TABS } from "./constants";
import {
  DetailField,
  OperationsListHeader,
  OperationsLoadState,
  RequestProcessingControls,
  StatusText,
} from "./components";
import {
  formatOperationDateTime,
  getCustomerOperationText,
  getEstimateReference,
  getEstimateVersionLabel,
  getProjectAddress,
  getProjectCurrentStage,
  getRelationRow,
  isOpenCustomerRequest,
  operationStatusViews,
} from "./utils";

const EMPTY_DETAIL = {
  project: null,
  estimateVersions: [],
  requests: [],
  messages: [],
  timelineEvents: [],
  accessTokens: [],
};

function DetailEmpty({ title = "아직 등록된 내용이 없습니다" }) {
  return (
    <EmptyState
      title={title}
      description="연결된 기록이 생기면 이곳에 시간순으로 표시됩니다."
      className="customer-operations__tab-empty"
    />
  );
}

function EstimateVersionsTab({ versions, accessTokens }) {
  if (versions.length === 0) return <DetailEmpty title="등록된 견적서가 없습니다" />;

  const linkedVersionIds = new Set(
    accessTokens.map((accessToken) => accessToken.estimate_version_id).filter(Boolean)
  );

  return (
    <div className="customer-operations__record-list" aria-label="견적서 버전 목록">
      <div className="customer-operations__record-list-header customer-operations__estimate-record">
        <span>버전</span>
        <span>상태</span>
        <span>금액</span>
        <span>전송/열람/확정</span>
        <span>고객 링크</span>
      </div>
      {versions.map((version) => (
        <div className="customer-operations__record-row customer-operations__estimate-record" key={version.id}>
          <span className="customer-operations__stacked-cell">
            <strong>{getEstimateVersionLabel(version)}</strong>
            <span>버전 {version.version_no}</span>
          </span>
          <StatusText status={operationStatusViews.estimate(version.status)} />
          <span className="customer-operations__number-cell">
            <PriceText value={version.total_amount || 0} size="sm" />
          </span>
          <span className="customer-operations__stacked-cell">
            <span>전송 {formatOperationDateTime(version.sent_at)}</span>
            <span>
              열람 {formatOperationDateTime(version.viewed_at)}
              {" · "}
              확정 {formatOperationDateTime(version.approved_at)}
            </span>
          </span>
          <span className="customer-operations__muted-label">
            {linkedVersionIds.has(version.id) ? "고객 링크 생성됨" : "-"}
          </span>
        </div>
      ))}
    </div>
  );
}

function MessagesTab({ messages }) {
  if (messages.length === 0) return <DetailEmpty title="메시지 이력이 없습니다" />;

  return (
    <div className="customer-operations__activity-list" aria-label="고객 메시지 이력">
      {messages.map((message) => (
        <div className="customer-operations__activity-row" key={message.id}>
          <span className="customer-operations__activity-cell">
            <strong>{operationStatusViews.messageType(message.message_type).label}</strong>
            <span>{getCustomerOperationText(message.body, "내용 미입력")}</span>
          </span>
          <span>{getEstimateVersionLabel(getRelationRow(message.estimate_version))}</span>
          <span className="customer-operations__channel-label">
            {operationStatusViews.messageChannel(message.channel).label}
          </span>
          <StatusText status={operationStatusViews.message(message.status)} />
          <time>{formatOperationDateTime(message.sent_at || message.created_at)}</time>
        </div>
      ))}
    </div>
  );
}

function TimelineTab({ timelineEvents }) {
  if (timelineEvents.length === 0) return <DetailEmpty title="타임라인 기록이 없습니다" />;

  return (
    <div className="customer-operations__timeline" aria-label="고객·현장 타임라인">
      {timelineEvents.map((event) => (
        <div className="customer-operations__timeline-row" key={event.id}>
          <StatusText status={operationStatusViews.timeline(event.event_type)} />
          <span className="customer-operations__activity-cell">
            <strong>
              {getCustomerOperationText(
                event.title,
                operationStatusViews.timeline(event.event_type).label
              )}
            </strong>
            <span>{getCustomerOperationText(event.description, "상세 내용 없음")}</span>
          </span>
          <time>{formatOperationDateTime(event.created_at)}</time>
        </div>
      ))}
    </div>
  );
}

export default function CustomersProjectsPage({ companyId }) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [detail, setDetail] = useState(EMPTY_DETAIL);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [requestMemo, setRequestMemo] = useState("");
  const [requestProcessing, setRequestProcessing] = useState(false);
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const rows = await fetchCustomersProjects(companyId);
        if (!active) return;
        setProjects(rows);
        setSelectedProjectId((current) => (
          rows.some((row) => row.id === current) ? current : rows[0]?.id || ""
        ));
      } catch (loadError) {
        if (!active) return;
        setProjects([]);
        setError(loadError?.message || "고객·현장 목록을 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [companyId, reloadKey]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      if (!selectedProject) {
        setDetail(EMPTY_DETAIL);
        return;
      }

      setDetailLoading(true);
      setDetailError("");
      setDetail(EMPTY_DETAIL);
      setSelectedRequestId("");
      try {
        const nextDetail = await fetchCustomerProjectDetail({
          companyId,
          customerId: selectedProject.customer_id,
          projectId: selectedProject.id,
        });
        if (!active) return;
        setDetail(nextDetail);
        setSelectedRequestId((current) => (
          nextDetail.requests.some((request) => request.id === current)
            ? current
            : nextDetail.requests[0]?.id || ""
        ));
      } catch (loadError) {
        if (!active) return;
        setDetail(EMPTY_DETAIL);
        setDetailError(loadError?.message || "고객·현장 상세를 불러오지 못했습니다.");
      } finally {
        if (active) setDetailLoading(false);
      }
    }

    loadDetail();
    return () => {
      active = false;
    };
  }, [companyId, selectedProject]);

  const detailProject = detail.project || selectedProject;
  const selectedCustomer = getRelationRow(detailProject?.customer);
  const activeTabLabel = CUSTOMER_DETAIL_TABS.find((tab) => tab.key === activeTab)?.label ?? "개요";
  const selectedRequest = useMemo(
    () => detail.requests.find((request) => request.id === selectedRequestId) ?? null,
    [detail.requests, selectedRequestId]
  );

  useEffect(() => {
    setRequestMemo(selectedRequest?.internal_memo || "");
    setRequestError("");
  }, [selectedRequestId, selectedRequest?.internal_memo]);

  const handleRequestStatusChange = async (status) => {
    if (!selectedRequest) return;

    setRequestProcessing(true);
    setRequestError("");
    try {
      const updatedRequest = await updateCustomerRequestStatus({
        companyId,
        requestId: selectedRequest.id,
        status,
        internalMemo: requestMemo,
      });
      setDetail((current) => ({
        ...current,
        requests: current.requests.map((request) => (
          request.id === updatedRequest.id ? updatedRequest : request
        )),
      }));
      setProjects((current) => current.map((project) => (
        project.id === selectedProjectId
          ? {
              ...project,
              openRequestCount: detail.requests.reduce((count, request) => (
                count + (
                  request.id === updatedRequest.id
                    ? Number(isOpenCustomerRequest(updatedRequest.status))
                    : Number(isOpenCustomerRequest(request.status))
                )
              ), 0),
            }
          : project
      )));
      setRequestMemo(updatedRequest.internal_memo || "");
    } catch (updateError) {
      setRequestError(updateError?.message || "요청 상태를 변경하지 못했습니다.");
    } finally {
      setRequestProcessing(false);
    }
  };

  const showState = loading || !!error || projects.length === 0;

  const renderDetailTab = () => {
    if (detailLoading) {
      return <div className="customer-operations__detail-loading" role="status">상세 기록을 불러오는 중</div>;
    }

    if (detailError) {
      return <p className="customer-operations__inline-error" role="alert">{detailError}</p>;
    }

    if (activeTab === "overview") {
      const recentEvent = detail.timelineEvents[0];
      return (
        <div className="customer-operations__detail-grid">
          <DetailField label="고객명">{selectedCustomer?.name}</DetailField>
          <DetailField label="연락처">{selectedCustomer?.phone}</DetailField>
          <DetailField label="이메일">{selectedCustomer?.email}</DetailField>
          <DetailField label="현장명">{detailProject?.name}</DetailField>
          <DetailField label="현장 주소">{getProjectAddress({ project: detailProject })}</DetailField>
          <DetailField label="견적 상태">
            <StatusText status={operationStatusViews.estimate(detailProject?.estimate_status)} />
          </DetailField>
          <DetailField label="계약 상태">
            <StatusText status={operationStatusViews.contract(detailProject?.contract_status)} />
          </DetailField>
          <DetailField label="공사 상태">
            <StatusText status={operationStatusViews.construction(detailProject?.construction_status)} />
          </DetailField>
          <DetailField label="미처리 요청">
            {detail.requests.filter((request) => isOpenCustomerRequest(request.status)).length}
          </DetailField>
          <DetailField label="최근 활동">
            {recentEvent
              ? `${getCustomerOperationText(recentEvent.title, "활동")} · ${formatOperationDateTime(recentEvent.created_at)}`
              : "-"}
          </DetailField>
        </div>
      );
    }

    if (activeTab === "estimates") {
      return (
        <EstimateVersionsTab
          versions={detail.estimateVersions}
          accessTokens={detail.accessTokens}
        />
      );
    }

    if (activeTab === "requests") {
      if (detail.requests.length === 0) {
        return <DetailEmpty title="접수된 문의·변경 요청이 없습니다" />;
      }

      return (
        <div className="customer-operations__request-workspace">
          <div className="customer-operations__request-list">
            {detail.requests.map((request) => (
              <button
                type="button"
                className={request.id === selectedRequestId ? "is-selected" : ""}
                key={request.id}
                onClick={() => setSelectedRequestId(request.id)}
              >
                <span>
                  <strong>
                    {getCustomerOperationText(
                      request.title,
                      operationStatusViews.requestType(request.request_type).label
                    )}
                  </strong>
                  <em>{getEstimateReference(request)}</em>
                </span>
                <StatusText status={operationStatusViews.request(request.status)} />
                <time>{formatOperationDateTime(request.created_at)}</time>
              </button>
            ))}
          </div>
          {selectedRequest ? (
            <div className="customer-operations__request-detail">
              <div className="customer-operations__detail-content">
                <strong>요청 내용</strong>
                <p className="customer-operations__detail-body">
                  {selectedRequest.body || "요청 내용이 입력되지 않았습니다."}
                </p>
                {selectedRequest.related_item_label ? (
                  <span className="customer-operations__related-item">
                    관련 항목 {selectedRequest.related_item_label}
                  </span>
                ) : null}
              </div>
              <RequestProcessingControls
                request={selectedRequest}
                memo={requestMemo}
                onMemoChange={setRequestMemo}
                onStatusChange={handleRequestStatusChange}
                processing={requestProcessing}
                error={requestError}
              />
            </div>
          ) : null}
        </div>
      );
    }

    if (activeTab === "messages") return <MessagesTab messages={detail.messages} />;
    if (activeTab === "timeline") return <TimelineTab timelineEvents={detail.timelineEvents} />;

    return <DetailEmpty title={`${activeTabLabel} 기록이 없습니다`} />;
  };

  return (
    <main className="customer-operations-page">
      <PageHeader
        title="고객·현장"
        description="고객 정보와 연결된 현장의 견적, 요청, 메시지와 활동을 확인합니다."
      />

      {showState ? (
        <OperationsLoadState
          loading={loading}
          error={error}
          empty={!loading && !error && projects.length === 0}
          emptyTitle="등록된 고객·현장이 없습니다"
          emptyDescription="견적 전송 흐름에서 고객과 현장을 연결하면 이 목록에 표시됩니다."
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      ) : (
        <>
          <section className="customer-operations__list-section" aria-label="고객·현장 목록">
            <OperationsListHeader
              label="전체 고객·현장"
              count={projects.length}
              hint="행을 선택하면 연결된 고객·현장 기록을 확인할 수 있습니다."
            />
            <Table
              zebra={false}
              className="customer-operations__table"
              columns={[
                { key: "customerName", label: "고객명", width: "14%" },
                { key: "phone", label: "연락처", width: "14%" },
                { key: "project", label: "현장명/주소", width: "25%" },
                { key: "stage", label: "현재 단계", width: "13%" },
                { key: "estimateCount", label: "견적 수", align: "right", width: "9%" },
                { key: "openRequestCount", label: "미처리 요청", align: "right", width: "10%" },
                { key: "recentActivity", label: "최근 활동", width: "15%" },
              ]}
              rows={projects.map((project) => {
                const customer = getRelationRow(project.customer);
                return {
                  id: project.id,
                  project,
                  selected: project.id === selectedProjectId,
                  customerName: customer?.name || "고객명 미입력",
                  phone: customer?.phone || "-",
                  projectName: project.name || "현장명 미입력",
                  projectAddress: getProjectAddress({ project }),
                  stage: getProjectCurrentStage(project),
                  estimateCount: project.estimateCount,
                  openRequestCount: project.openRequestCount,
                  recentActivity: formatOperationDateTime(project.recentActivityAt),
                };
              })}
              renderCell={({ row, column, value }) => {
                let content = value;
                if (column.key === "customerName") {
                  content = <strong>{value}</strong>;
                } else if (column.key === "project") {
                  content = (
                    <span className="customer-operations__stacked-cell">
                      <strong>{row.projectName}</strong>
                      <span>{row.projectAddress}</span>
                    </span>
                  );
                } else if (column.key === "stage") {
                  content = <StatusText status={value} />;
                } else if (column.key === "recentActivity") {
                  content = <span className="customer-operations__date-cell">{value}</span>;
                }

                return (
                  <button
                    type="button"
                    className={`customer-operations__table-cell-button ${column.align === "right" ? "is-right" : ""}`.trim()}
                    onClick={() => {
                      setSelectedProjectId(row.id);
                      setActiveTab("overview");
                    }}
                  >
                    {content}
                  </button>
                );
              }}
            />
          </section>

          <section className="customer-operations__detail-panel customer-operations__detail-panel--tabs" aria-label="고객·현장 상세">
            {detailProject ? (
              <>
                <header className="customer-operations__detail-header">
                  <div>
                    <span>{selectedCustomer?.name || "고객명 미입력"}</span>
                    <h2>{detailProject.name || detailProject.address || "현장명 미입력"}</h2>
                    <p className="customer-operations__detail-subtitle">
                      {getProjectAddress({ project: detailProject })}
                      {selectedCustomer?.phone ? ` · ${selectedCustomer.phone}` : ""}
                    </p>
                  </div>
                  <StatusText status={getProjectCurrentStage(detailProject)} />
                </header>
                <div className="customer-operations__tabs" role="tablist" aria-label="고객·현장 상세 메뉴">
                  {CUSTOMER_DETAIL_TABS.map((tab) => (
                    <ToggleButton
                      key={tab.key}
                      size="sm"
                      pressed={activeTab === tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      role="tab"
                      aria-selected={activeTab === tab.key}
                    >
                      {tab.label}
                    </ToggleButton>
                  ))}
                </div>
                <div className="customer-operations__tab-content">
                  {renderDetailTab()}
                </div>
              </>
            ) : (
              <p className="customer-operations__detail-guide">목록에서 고객·현장을 선택하면 상세를 확인할 수 있습니다.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
