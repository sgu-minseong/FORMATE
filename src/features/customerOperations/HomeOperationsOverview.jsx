import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { fetchHomeCustomerOperations } from "./api";
import { CUSTOMER_OPERATIONS_PAGES } from "./constants";
import { StatusText } from "./components";
import { formatOperationDateTime } from "./utils";

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

function HomeOperationsWidget({
  title,
  items,
  loading,
  error,
  emptyText,
  onViewAll,
  onItemClick,
}) {
  return (
    <section className="home-placeholder-widget customer-operations-home-widget" aria-label={title}>
      <div className="home-section-head">
        <h2>{title}</h2>
        {onViewAll && (
          <button type="button" className="home-text-link" onClick={onViewAll}>
            전체 보기
          </button>
        )}
      </div>
      {loading ? (
        <div className="home-placeholder-empty" role="status">불러오는 중</div>
      ) : error ? (
        <div className="home-placeholder-empty customer-operations-home-widget__message">{error}</div>
      ) : items.length === 0 ? (
        <div className="home-placeholder-empty">
          <FileText size={18} strokeWidth={1.5} aria-hidden="true" />
          <span>{emptyText}</span>
        </div>
      ) : (
        <div className="customer-operations-home-list">
          {items.map((item) => (
            <button
              type="button"
              className="customer-operations-home-list__row"
              key={item.id}
              onClick={() => onItemClick?.(item)}
            >
              <span className="customer-operations-home-list__content">
                <strong>{item.title}</strong>
                <span>{item.meta}</span>
              </span>
              <StatusText status={item.status} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default function HomeOperationsOverview({ companyId, onNavigate }) {
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

  const summaryItems = [
    {
      key: "openRequests",
      label: "처리 필요 요청",
      value: data.summary.openRequests,
      page: CUSTOMER_OPERATIONS_PAGES.REQUESTS,
    },
    {
      key: "linksCreatedToday",
      label: "오늘 링크 생성",
      value: data.summary.linksCreatedToday,
      page: CUSTOMER_OPERATIONS_PAGES.MESSAGES,
    },
    {
      key: "estimateViewsToday",
      label: "오늘 고객 열람",
      value: data.summary.estimateViewsToday,
      page: CUSTOMER_OPERATIONS_PAGES.MESSAGES,
    },
    {
      key: "revisionRequests",
      label: "수정 요청",
      value: data.summary.revisionRequests,
      page: CUSTOMER_OPERATIONS_PAGES.REQUESTS,
    },
    {
      key: "approvalsToday",
      label: "오늘 견적 확정",
      value: data.summary.approvalsToday,
      page: CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS,
    },
  ];

  return (
    <>
      <section className="customer-operations-home-summary" aria-label="고객 운영 요약">
        {summaryItems.map((item) => (
          <button
            type="button"
            key={item.key}
            onClick={() => onNavigate?.(item.page)}
          >
            <span>{item.label}</span>
            <strong>{loading || error ? "-" : item.value}</strong>
          </button>
        ))}
      </section>
      <div className="home-placeholder-grid">
        <HomeOperationsWidget
          title="처리 필요"
          items={data.attention}
          loading={loading}
          error={error}
          emptyText="처리할 고객 요청이 없습니다"
          onViewAll={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.REQUESTS)}
          onItemClick={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.REQUESTS)}
        />
        <HomeOperationsWidget
          title="진행 중"
          items={data.inProgress}
          loading={loading}
          error={error}
          emptyText="진행 중인 고객 업무가 없습니다"
          onViewAll={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS)}
          onItemClick={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS)}
        />
      </div>
      <section className="home-recent-estimates customer-operations-home-activity" aria-label="최근 활동">
        <div className="home-section-head">
          <h2>최근 활동</h2>
        </div>
        {loading ? (
          <div className="home-placeholder-empty" role="status">불러오는 중</div>
        ) : error ? (
          <div className="home-placeholder-empty customer-operations-home-widget__message">{error}</div>
        ) : data.recentActivity.length === 0 ? (
          <div className="home-placeholder-empty">
            <FileText size={18} strokeWidth={1.5} aria-hidden="true" />
            <span>아직 기록된 활동이 없습니다</span>
          </div>
        ) : (
          <div className="customer-operations-home-activity__list">
            {data.recentActivity.map((item) => (
              <div className="customer-operations-home-activity__row" key={item.id}>
                <StatusText status={item.status} />
                <span className="customer-operations-home-activity__content">
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </span>
                <time>{formatOperationDateTime(item.createdAt)}</time>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
