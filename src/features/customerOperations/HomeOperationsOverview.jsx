import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CircleCheck,
  Eye,
  FilePenLine,
  Hammer,
  Link2,
  MessageSquareText,
  Wrench,
} from "lucide-react";
import { fetchHomeCustomerOperations } from "./api";
import { CUSTOMER_OPERATIONS_PAGES } from "./constants";
import { StatusText } from "./components";

const EMPTY_DATA = {
  summary: {
    openRequests: 0,
    linksCreatedToday: 0,
    estimateViewsToday: 0,
    revisionRequests: 0,
    approvalsToday: 0,
  },
  attention: [],
  inProgress: [],
  recentActivity: [],
};

const INTERNAL_ACTIVITY_TYPES = new Set([
  "note",
]);

const ACTIONABLE_SERVICE_STATUSES = new Set([
  "received",
  "contacted",
  "visit_scheduled",
  "in_progress",
]);

function formatHomeDate() {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) return "방금 전";

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}시간 전`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}일 전`;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

function getCompanyDisplayName() {
  if (typeof window === "undefined") return "운영자";
  const name = window.localStorage.getItem("formate.selectedCompanyName")?.trim();
  return name?.replace(/\s*님$/, "") || "운영자";
}

function getAttentionPriority(item) {
  if (item.type === "request" && item.requestType === "estimate_revision") return 0;
  if (item.type === "request" && item.requestType === "inquiry") return 1;
  if (item.type === "request" && item.rawStatus === "reviewing") return 2;
  if (item.type === "service") return 3;
  if (item.type === "request") return 4;
  return 5;
}

function isActionableItem(item) {
  if (item.type === "service") {
    return ACTIONABLE_SERVICE_STATUSES.has(item.rawStatus);
  }
  if (item.type !== "request") return false;
  if (item.rawStatus === "reviewing") return true;
  if (item.rawStatus !== "received") return false;
  return [
    "estimate_revision",
    "inquiry",
    "approval",
    "change_request",
    "aftercare",
    "service",
    "other",
  ].includes(item.requestType);
}

function getAttentionType(item) {
  if (item.type === "service") {
    return { label: "A/S 요청", icon: Wrench };
  }
  if (item.requestType === "estimate_revision") {
    return { label: "수정 요청", icon: FilePenLine };
  }
  if (item.requestType === "change_request") {
    return { label: "변경 요청", icon: FilePenLine };
  }
  if (item.requestType === "approval") {
    return { label: "견적 확정 요청", icon: CircleCheck };
  }
  return { label: "일반 문의", icon: MessageSquareText };
}

function getAttentionSignal(item) {
  if (item.rawStatus === "reviewing" || item.rawStatus === "in_progress") return "progress";
  if (item.requestType === "estimate_revision" || item.requestType === "change_request") return "warning";
  if (item.rawStatus === "received") return "info";
  return "muted";
}

function getProgressSignal(item) {
  if (item.rawStatus === "in_progress" || item.rawStatus === "active") return "progress";
  if (item.rawStatus === "revision_requested" || item.rawStatus === "reviewing") return "warning";
  if (item.rawStatus === "scheduled" || item.rawStatus === "sent" || item.rawStatus === "viewed") return "info";
  return "muted";
}

function normalizeActivityType(item) {
  const eventType = `${item.eventType || ""}`.trim().toLowerCase();
  const signal = `${eventType} ${item.title || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim();

  if (eventType === "customer_created") return "customer_created";
  if (eventType === "project_created") return "project_created";
  if (eventType === "estimate_viewed") return "estimate_viewed";
  if (["estimate_sent", "link_created", "estimate_link_created"].includes(eventType)) {
    return "estimate_link_created";
  }
  if (["estimate_approved", "estimate_approval"].includes(eventType)) {
    return "estimate_approved";
  }
  if (eventType === "request_received") return "request_received";
  if (eventType === "request_updated") return "request_updated";
  if (eventType === "message_created") return "message_created";
  if (eventType === "construction_updated") return "construction_updated";
  if (eventType === "link_copy") return "link_shared";
  if (eventType === "manual") return "manual";

  if (/estimate.*(approv|confirm)|customer.*approv/.test(signal)) return "estimate_approved";
  if (/estimate.*(view|open)|customer.*view/.test(signal)) return "estimate_viewed";
  if (/(estimate.*link.*creat|link.*creat|estimate.*sent)/.test(signal)) {
    return "estimate_link_created";
  }
  if (/customer.*creat/.test(signal)) return "customer_created";
  if (/project.*creat/.test(signal)) return "project_created";
  if (/request.*updat/.test(signal)) return "request_updated";
  if (/message.*creat/.test(signal)) return "message_created";
  if (/link.*copy/.test(signal)) return "link_shared";
  if (/\bmanual\b/.test(signal)) return "manual";
  return eventType || "unknown";
}

function getActivityPresentation(item) {
  const type = normalizeActivityType(item);

  if (type === "customer_created") {
    return { type, title: "고객을 등록했습니다", icon: Activity, signal: "muted", priority: 2 };
  }
  if (type === "project_created") {
    return { type, title: "현장을 등록했습니다", icon: Activity, signal: "muted", priority: 2 };
  }
  if (type === "estimate_link_created") {
    return { type, title: "견적 링크를 생성했습니다", icon: Link2, signal: "info", priority: 0 };
  }
  if (type === "estimate_viewed") {
    return { type, title: "고객이 견적을 확인했습니다", icon: Eye, signal: "info", priority: 0 };
  }
  if (type === "estimate_approved") {
    return { type, title: "고객이 견적을 확정했습니다", icon: CircleCheck, signal: "success", priority: 0 };
  }
  if (type === "request_received") {
    return { type, title: "고객 요청이 접수되었습니다", icon: MessageSquareText, signal: "warning", priority: 1 };
  }
  if (type === "request_updated") {
    return { type, title: "고객 요청 처리 상태가 변경되었습니다", icon: CircleCheck, signal: "progress", priority: 0 };
  }
  if (type === "message_created") {
    return { type, title: "고객 메시지가 등록되었습니다", icon: MessageSquareText, signal: "info", priority: 1 };
  }
  if (type === "construction_updated") {
    return { type, title: "현장 공사 상태가 변경되었습니다", icon: Hammer, signal: "progress", priority: 0 };
  }
  if (type === "link_shared") {
    return { type, title: "견적 링크를 공유했습니다", icon: Link2, signal: "info", priority: 1 };
  }
  if (type === "manual") {
    return { type, title: "고객 활동을 기록했습니다", icon: Activity, signal: "muted", priority: 2 };
  }
  if (/[가-힣]/.test(item.title || "")) {
    return { type, title: item.title, icon: Activity, signal: "muted", priority: 2 };
  }
  return { type: "unknown", title: "", icon: Activity, signal: "muted", priority: 3 };
}

function getActivityDedupKey(item, activityType) {
  if (item.relatedId) {
    return `${activityType}|${item.relatedType || "related"}|${item.relatedId}`;
  }

  const timestamp = new Date(item.createdAt).getTime();
  const minuteBucket = Number.isFinite(timestamp) ? Math.floor(timestamp / 60000) : 0;
  const relationKey = item.projectId
    || item.customerId
    || item.projectName
    || item.customerName
    || "";
  return `${activityType}|${relationKey}|${minuteBucket}`;
}

function isCrossSourceDuplicate(left, right) {
  if (left.sourceType === right.sourceType) return false;
  if (left.presentation.type !== right.presentation.type) return false;
  if (left.relatedId && right.relatedId) return left.relatedId === right.relatedId;

  const leftTime = new Date(left.createdAt).getTime();
  const rightTime = new Date(right.createdAt).getTime();
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return false;
  if (Math.abs(leftTime - rightTime) > 120000) return false;

  if (left.projectId && right.projectId) return left.projectId === right.projectId;
  return true;
}

function getSafeActivityMeta(item) {
  const customerName = item.customerName && item.customerName !== "고객명 미입력"
    ? item.customerName
    : "";
  const projectName = item.projectName && item.projectName !== "현장 미입력"
    ? item.projectName
    : "";
  const relationMeta = [customerName, projectName].filter(Boolean).join(" · ");

  if (relationMeta) return relationMeta;

  const description = `${item.description || ""}`.trim();
  if (
    !description
    || !/[가-힣]/.test(description)
    || /https?:\/\/|\/c\/|[A-Za-z0-9_-]{40,}/.test(description)
  ) {
    return "";
  }
  return description;
}

function OverviewState({ loading, error, emptyText }) {
  if (loading) {
    return <div className="customer-operations-home-priority__state" role="status">불러오는 중</div>;
  }
  if (error) {
    return (
      <div className="customer-operations-home-priority__state is-error" role="alert">
        고객 운영 데이터를 불러오지 못했습니다.
      </div>
    );
  }
  return <div className="customer-operations-home-priority__state">{emptyText}</div>;
}

function AttentionRow({ item, onClick }) {
  const typeView = getAttentionType(item);
  const TypeIcon = typeView.icon;
  const signal = getAttentionSignal(item);

  return (
    <button
      type="button"
      className={`customer-operations-home-priority__attention-row is-signal-${signal}`}
      onClick={onClick}
    >
      <span className="customer-operations-home-priority__row-top">
        <span>
          <TypeIcon size={16} strokeWidth={1.5} aria-hidden="true" />
          {typeView.label}
        </span>
        <time>{formatRelativeTime(item.createdAt)}</time>
      </span>
      <span className="customer-operations-home-priority__row-title">
        <strong>{item.title}</strong>
        <StatusText status={item.status} />
      </span>
      <span className="customer-operations-home-priority__row-meta">{item.meta}</span>
    </button>
  );
}

function ProgressRow({ item, onClick }) {
  const projectTitle = item.projectName && item.projectName !== "현장 미입력"
    ? item.projectName
    : "현장";
  const customerLabel = item.customerName && item.customerName !== "고객명 미입력"
    ? `${item.customerName} 고객`
    : "고객 정보 없음";
  const projectAddress = item.projectAddress && item.projectAddress !== projectTitle
    ? item.projectAddress
    : "";
  const signal = getProgressSignal(item);

  return (
    <button
      type="button"
      className={`customer-operations-home-priority__progress-row is-signal-${signal}`}
      onClick={onClick}
    >
      <span className="customer-operations-home-priority__progress-title">
        <strong>{projectTitle}</strong>
        <StatusText status={item.status} />
      </span>
      <span>{[customerLabel, projectAddress].filter(Boolean).join(" · ")}</span>
      <time>최근 활동 {formatRelativeTime(item.createdAt)}</time>
    </button>
  );
}

export default function HomeOperationsOverview({
  companyId,
  onNavigate,
  headerAction = null,
  recentEstimates = null,
}) {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const nextData = await fetchHomeCustomerOperations(companyId);
        if (!active) return;
        setData(nextData);
      } catch (loadError) {
        if (!active) return;
        setData(EMPTY_DATA);
        setError(loadError?.message || "고객 운영 데이터를 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [companyId]);

  const actionableItems = useMemo(() => [...data.attention]
    .filter(isActionableItem)
    .sort((left, right) => {
      const priorityDifference = getAttentionPriority(left) - getAttentionPriority(right);
      if (priorityDifference !== 0) return priorityDifference;

      const leftTime = new Date(left.createdAt || 0).getTime() || 0;
      const rightTime = new Date(right.createdAt || 0).getTime() || 0;
      if (getAttentionPriority(left) === 2) return leftTime - rightTime;
      return rightTime - leftTime;
    }), [data.attention]);

  const attentionItems = actionableItems.slice(0, 5);
  const actionableCount = actionableItems.length;
  const actionableRevisionCount = actionableItems.filter(
    (item) => item.type === "request" && item.requestType === "estimate_revision"
  ).length;

  const progressItems = useMemo(() => {
    const typePriority = { project: 0, estimate: 1, aftercare: 2 };
    const seenProjects = new Set();

    return [...data.inProgress]
      .sort((left, right) => {
        const typeDifference = (typePriority[left.type] ?? 3) - (typePriority[right.type] ?? 3);
        if (typeDifference !== 0) return typeDifference;
        return (new Date(right.createdAt).getTime() || 0) - (new Date(left.createdAt).getTime() || 0);
      })
      .filter((item) => {
        const projectKey = item.projectId || `${item.type}-${item.sourceId || item.id}`;
        if (seenProjects.has(projectKey)) return false;
        seenProjects.add(projectKey);
        return true;
      })
      .slice(0, 4);
  }, [data.inProgress]);

  const activityItems = useMemo(() => {
    const seen = new Set();
    const uniqueItems = [];

    data.recentActivity.forEach((sourceItem) => {
      const item = {
        ...sourceItem,
        presentation: getActivityPresentation(sourceItem),
      };
      if (INTERNAL_ACTIVITY_TYPES.has(item.eventType)) return;
      if (item.presentation.type === "request_received") return;
      if (item.presentation.type === "unknown" || item.presentation.type === "manual") return;

      const key = getActivityDedupKey(item, item.presentation.type);
      if (seen.has(key)) return;
      if (uniqueItems.some((existing) => isCrossSourceDuplicate(existing, item))) return;

      seen.add(key);
      uniqueItems.push(item);
    });

    return uniqueItems
      .sort((left, right) => {
        const priorityDifference = left.presentation.priority - right.presentation.priority;
        if (priorityDifference !== 0) return priorityDifference;
        return (new Date(right.createdAt).getTime() || 0) - (new Date(left.createdAt).getTime() || 0);
      })
      .slice(0, 5);
  }, [data.recentActivity]);

  const summaryUnavailable = loading || !!error;
  const displayName = getCompanyDisplayName();

  return (
    <section className="customer-operations-home-priority" aria-label="오늘의 고객 운영 업무">
      <header className="customer-operations-home-priority__intro">
        <div className="customer-operations-home-priority__intro-main">
          <div>
            <h1>안녕하세요, {displayName}님</h1>
            <p>{formatHomeDate()}</p>
          </div>
          {headerAction ? (
            <div className="customer-operations-home-priority__intro-action">{headerAction}</div>
          ) : null}
        </div>
        <div className="customer-operations-home-priority__summary" aria-label="고객 운영 요약">
          <button className="is-info" type="button" onClick={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.REQUESTS)}>
            <i aria-hidden="true" />
            처리할 요청 <strong>{summaryUnavailable ? "-" : `${actionableCount}건`}</strong>
          </button>
          <span aria-hidden="true">·</span>
          <button className="is-warning" type="button" onClick={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.REQUESTS)}>
            <i aria-hidden="true" />
            수정 요청 <strong>{summaryUnavailable ? "-" : `${actionableRevisionCount}건`}</strong>
          </button>
          <span aria-hidden="true">·</span>
          <button className="is-success" type="button" onClick={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS)}>
            <i aria-hidden="true" />
            오늘 견적 확정 <strong>{summaryUnavailable ? "-" : `${data.summary.approvalsToday}건`}</strong>
          </button>
        </div>
      </header>

      <section className="customer-operations-home-priority__work-surface" aria-label="오늘의 우선 업무">
        <section className="customer-operations-home-priority__attention" aria-labelledby="home-attention-title">
          <header>
            <h3 id="home-attention-title">오늘 처리할 일</h3>
            {!summaryUnavailable ? <span>{actionableCount}건</span> : null}
          </header>
          {loading || error || attentionItems.length === 0 ? (
            <OverviewState
              loading={loading}
              error={error}
              emptyText="오늘 처리할 요청이 없습니다"
            />
          ) : (
            <div className="customer-operations-home-priority__attention-list">
              {attentionItems.map((item) => (
                <AttentionRow
                  item={item}
                  key={item.id}
                  onClick={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.REQUESTS)}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            className="customer-operations-home-priority__view-all"
            onClick={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.REQUESTS)}
          >
            받은 요청 전체 보기
            <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </section>

        <section className="customer-operations-home-priority__progress" aria-labelledby="home-progress-title">
          <header>
            <h3 id="home-progress-title">진행 중 현장</h3>
            {!summaryUnavailable ? <span>{progressItems.length}건</span> : null}
          </header>
          {loading || error || progressItems.length === 0 ? (
            <OverviewState
              loading={loading}
              error={error}
              emptyText="진행 중인 현장이 없습니다"
            />
          ) : (
            <div className="customer-operations-home-priority__progress-list">
              {progressItems.map((item) => (
                <ProgressRow
                  item={item}
                  key={item.id}
                  onClick={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS)}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            className="customer-operations-home-priority__view-all"
            onClick={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS)}
          >
            현장 전체 보기
            <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </section>
      </section>

      <section className="customer-operations-home-priority__secondary-workspace" aria-label="최근 업무 기록">
        <section className="customer-operations-home-priority__activity" aria-labelledby="home-activity-title">
          <header>
            <h3 id="home-activity-title">최근 활동</h3>
          </header>
          {loading || error || activityItems.length === 0 ? (
            <OverviewState
              loading={loading}
              error={error}
              emptyText="아직 기록된 활동이 없습니다"
            />
          ) : (
            <div className="customer-operations-home-priority__activity-list">
              {activityItems.map((item) => {
                const presentation = item.presentation;
                const ActivityIcon = presentation.icon;
                const meta = getSafeActivityMeta(item);

                return (
                  <div
                    className={`customer-operations-home-priority__activity-row is-signal-${presentation.signal}`}
                    key={item.id}
                  >
                    <ActivityIcon size={16} strokeWidth={1.5} aria-hidden="true" />
                    <span>
                      <strong>{presentation.title}</strong>
                      {meta ? <small>{meta}</small> : null}
                    </span>
                    <time>{formatRelativeTime(item.createdAt)}</time>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="customer-operations-home-priority__recent-estimates" aria-labelledby="home-recent-estimates-title">
          {recentEstimates}
        </section>
      </section>
    </section>
  );
}
