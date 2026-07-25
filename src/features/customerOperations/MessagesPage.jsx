import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Table from "../../components/ui/Table";
import { fetchCustomerMessages } from "./api";
import { OperationsListHeader, OperationsLoadState, StatusText } from "./components";
import {
  formatOperationDateTime,
  getCustomerName,
  getProjectName,
  operationStatusViews,
} from "./utils";

export default function MessagesPage({ companyId }) {
  const [messages, setMessages] = useState([]);
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

  const showState = loading || !!error || messages.length === 0;

  return (
    <main className="customer-operations-page">
      <PageHeader
        title="메시지 이력"
        description="고객에게 전달한 안내와 수동 연락 기록을 시간순으로 확인합니다."
      />

      {showState ? (
        <OperationsLoadState
          loading={loading}
          error={error}
          empty={!loading && !error && messages.length === 0}
          emptyTitle="메시지 이력이 없습니다"
          emptyDescription="견적 링크 복사와 고객 안내 기록은 다음 단계에서 이 목록에 누적됩니다."
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      ) : (
        <section className="customer-operations__list-section" aria-label="메시지 이력 목록">
          <OperationsListHeader
            label="메시지 기록"
            count={messages.length}
            hint="최신 생성·발송 기록부터 표시합니다."
          />
          <Table
            zebra={false}
            className="customer-operations__table customer-operations__table--activity"
            columns={[
              { key: "messageType", label: "메시지 유형", width: "20%" },
              { key: "channel", label: "채널", width: "10%" },
              { key: "customerName", label: "고객명", width: "14%" },
              { key: "projectName", label: "현장명", width: "21%" },
              { key: "status", label: "상태", width: "14%" },
              { key: "createdAt", label: "발송/생성 시각", width: "21%" },
            ]}
            rows={messages.map((message) => ({
              id: message.id,
              messageType: operationStatusViews.messageType(message.message_type),
              messageBody: message.body || "",
              channel: operationStatusViews.messageChannel(message.channel),
              customerName: getCustomerName(message),
              projectName: getProjectName(message),
              status: operationStatusViews.message(message.status),
              createdAt: formatOperationDateTime(message.sent_at || message.created_at),
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
              if (column.key === "channel") {
                return <span className="customer-operations__channel-label">{value.label}</span>;
              }
              if (column.key === "status") return <StatusText status={value} />;
              if (column.key === "createdAt") {
                return <span className="customer-operations__date-cell">{value}</span>;
              }
              return value;
            }}
          />
        </section>
      )}
    </main>
  );
}
