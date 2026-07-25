import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Table from "../../components/ui/Table";
import { fetchCustomerMessages } from "./api";
import { OperationsLoadState, StatusText } from "./components";
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
        <Table
          columns={[
            { key: "messageType", label: "메시지 유형", width: "17%" },
            { key: "channel", label: "채널", width: "12%" },
            { key: "customerName", label: "고객명", width: "15%" },
            { key: "projectName", label: "현장명", width: "22%" },
            { key: "status", label: "상태", width: "14%" },
            { key: "createdAt", label: "발송/생성 시각", width: "20%" },
          ]}
          rows={messages.map((message) => ({
            id: message.id,
            messageType: operationStatusViews.messageType(message.message_type),
            channel: operationStatusViews.messageChannel(message.channel),
            customerName: getCustomerName(message),
            projectName: getProjectName(message),
            status: operationStatusViews.message(message.status),
            createdAt: formatOperationDateTime(message.sent_at || message.created_at),
          }))}
          renderCell={({ column, value }) => {
            if (["messageType", "channel", "status"].includes(column.key)) {
              return <StatusText status={value} />;
            }
            return value;
          }}
        />
      )}
    </main>
  );
}
