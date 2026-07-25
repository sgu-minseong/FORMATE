import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Table from "../../components/ui/Table";
import ToggleButton from "../../components/ui/ToggleButton";
import { fetchCustomerMessages } from "./api";
import { OperationsListHeader, OperationsLoadState, StatusText } from "./components";
import {
  formatOperationDateTime,
  getCustomerName,
  getCustomerOperationText,
  getEstimateVersionLabel,
  getProjectName,
  getRelationRow,
  operationStatusViews,
} from "./utils";

const MESSAGE_FILTERS = [
  { key: "all", label: "전체" },
  { key: "link", label: "링크" },
  { key: "request", label: "문의/응답" },
  { key: "viewed", label: "클릭/열람" },
];

function matchesFilter(message, filter) {
  if (filter === "link") {
    return message.message_type === "estimate_link" || message.channel === "link_copy";
  }
  if (filter === "request") {
    return !!message.customer_request_id || message.message_type === "request_reply";
  }
  if (filter === "viewed") {
    return !!message.clicked_at || message.status === "clicked";
  }
  return true;
}

export default function MessagesPage({ companyId }) {
  const [messages, setMessages] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const rows = await fetchCustomerMessages(companyId);
        if (!active) return;
        setMessages(rows);
      } catch (loadError) {
        if (!active) return;
        setMessages([]);
        setError(loadError?.message || "메시지 이력을 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [companyId, reloadKey]);

  const filteredMessages = useMemo(
    () => messages.filter((message) => matchesFilter(message, activeFilter)),
    [activeFilter, messages]
  );

  const filterCounts = useMemo(() => Object.fromEntries(
    MESSAGE_FILTERS.map((filter) => [
      filter.key,
      messages.filter((message) => matchesFilter(message, filter.key)).length,
    ])
  ), [messages]);

  const showState = loading || !!error || messages.length === 0;

  return (
    <main className="customer-operations-page">
      <PageHeader
        title="메시지 이력"
        description="견적 링크 생성, 고객 열람과 문의·응답 기록을 시간순으로 확인합니다."
      />

      {showState ? (
        <OperationsLoadState
          loading={loading}
          error={error}
          empty={!loading && !error && messages.length === 0}
          emptyTitle="메시지 이력이 없습니다"
          emptyDescription="견적 링크를 만들거나 고객이 응답하면 이 목록에 기록됩니다."
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      ) : (
        <>
          <div className="customer-operations__segmented" role="tablist" aria-label="메시지 이력 필터">
            {MESSAGE_FILTERS.map((filter) => (
              <ToggleButton
                key={filter.key}
                size="sm"
                pressed={activeFilter === filter.key}
                onClick={() => setActiveFilter(filter.key)}
                role="tab"
                aria-selected={activeFilter === filter.key}
              >
                {filter.label}
                <span className="customer-operations__segment-count">{filterCounts[filter.key]}</span>
              </ToggleButton>
            ))}
          </div>

          <section className="customer-operations__list-section" aria-label="메시지 이력 목록">
            <OperationsListHeader
              label="메시지 기록"
              count={filteredMessages.length}
              hint="고객에게 노출된 토큰 없이 활동 기록만 표시합니다."
            />
            {filteredMessages.length === 0 ? (
              <div className="customer-operations__filter-empty">
                선택한 조건에 해당하는 메시지 기록이 없습니다.
              </div>
            ) : (
              <Table
                zebra={false}
                rowHeight={52}
                className="customer-operations__table customer-operations__table--activity"
                columns={[
                  { key: "messageType", label: "메시지 유형", width: "20%" },
                  { key: "customerProject", label: "고객·현장", width: "20%" },
                  { key: "estimateVersion", label: "견적 버전", width: "13%" },
                  { key: "channel", label: "채널", width: "9%" },
                  { key: "status", label: "상태", width: "11%" },
                  { key: "activityAt", label: "생성/발송/응답 시각", width: "27%" },
                ]}
                rows={filteredMessages.map((message) => ({
                  id: message.id,
                  messageType: operationStatusViews.messageType(message.message_type),
                  messageBody: getCustomerOperationText(message.body, ""),
                  customerName: getCustomerName(message),
                  projectName: getProjectName(message),
                  estimateVersion: getEstimateVersionLabel(getRelationRow(message.estimate_version)),
                  channel: operationStatusViews.messageChannel(message.channel),
                  status: operationStatusViews.message(message.status),
                  createdAt: formatOperationDateTime(message.created_at),
                  sentAt: formatOperationDateTime(message.sent_at),
                  clickedAt: formatOperationDateTime(message.clicked_at),
                  respondedAt: formatOperationDateTime(message.responded_at),
                }))}
                renderCell={({ row, column, value }) => {
                  if (column.key === "messageType") {
                    return (
                      <span className="customer-operations__activity-cell">
                        <strong>{value.label}</strong>
                        {row.messageBody ? <span>{row.messageBody}</span> : null}
                      </span>
                    );
                  }
                  if (column.key === "customerProject") {
                    return (
                      <span className="customer-operations__stacked-cell">
                        <strong>{row.customerName}</strong>
                        <span>{row.projectName}</span>
                      </span>
                    );
                  }
                  if (column.key === "channel") {
                    return <span className="customer-operations__channel-label">{value.label}</span>;
                  }
                  if (column.key === "status") return <StatusText status={value} />;
                  if (column.key === "activityAt") {
                    return (
                      <span className="customer-operations__message-times">
                        <span>생성 {row.createdAt} · 발송 {row.sentAt}</span>
                        <span>열람 {row.clickedAt} · 응답 {row.respondedAt}</span>
                      </span>
                    );
                  }
                  return value;
                }}
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}
