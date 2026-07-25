import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Table from "../../components/ui/Table";
import { fetchCustomerRequests } from "./api";
import { DetailField, OperationsLoadState, StatusText } from "./components";
import {
  formatOperationDateTime,
  getCustomerName,
  getEstimateReference,
  getProjectName,
  operationStatusViews,
} from "./utils";

export default function CustomerRequestsPage({ companyId }) {
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const rows = await fetchCustomerRequests(companyId);
        if (!active) return;
        setRequests(rows);
        setSelectedRequestId((current) => (
          rows.some((row) => row.id === current) ? current : ""
        ));
      } catch (loadError) {
        if (!active) return;
        setRequests([]);
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

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  const showState = loading || !!error || requests.length === 0;

  return (
    <main className="customer-operations-page">
      <PageHeader
        title="받은 요청"
        description="고객 문의와 수정 요청을 현장 단위로 확인합니다."
      />

      {showState ? (
        <OperationsLoadState
          loading={loading}
          error={error}
          empty={!loading && !error && requests.length === 0}
          emptyTitle="접수된 요청이 없습니다"
          emptyDescription="고객 문의와 수정 요청이 접수되면 이 목록에 표시됩니다."
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      ) : (
        <>
          <Table
            columns={[
              { key: "requestType", label: "요청 유형", width: "15%" },
              { key: "customerName", label: "고객명", width: "14%" },
              { key: "projectName", label: "현장명", width: "20%" },
              { key: "status", label: "상태", width: "15%" },
              { key: "createdAt", label: "접수일", width: "18%" },
              { key: "estimate", label: "관련 견적", width: "18%" },
            ]}
            rows={requests.map((request) => ({
              id: request.id,
              request,
              selected: request.id === selectedRequestId,
              requestType: operationStatusViews.requestType(request.request_type),
              customerName: getCustomerName(request),
              projectName: getProjectName(request),
              status: operationStatusViews.request(request.status),
              createdAt: formatOperationDateTime(request.created_at),
              estimate: getEstimateReference(request),
            }))}
            renderCell={({ row, column, value }) => {
              if (column.key === "requestType") {
                return (
                  <button
                    type="button"
                    className="customer-operations__row-link"
                    onClick={() => setSelectedRequestId(row.id)}
                  >
                    {value.label}
                  </button>
                );
              }
              if (column.key === "status") return <StatusText status={value} />;
              return value;
            }}
          />

          <section className="customer-operations__detail-panel" aria-label="요청 상세">
            {selectedRequest ? (
              <>
                <header className="customer-operations__detail-header">
                  <div>
                    <span>요청 상세</span>
                    <h2>{selectedRequest.title || operationStatusViews.requestType(selectedRequest.request_type).label}</h2>
                  </div>
                  <StatusText status={operationStatusViews.request(selectedRequest.status)} />
                </header>
                <div className="customer-operations__detail-grid">
                  <DetailField label="고객">{getCustomerName(selectedRequest)}</DetailField>
                  <DetailField label="현장">{getProjectName(selectedRequest)}</DetailField>
                  <DetailField label="관련 견적">{getEstimateReference(selectedRequest)}</DetailField>
                  <DetailField label="관련 항목">{selectedRequest.related_item_label}</DetailField>
                </div>
                <p className="customer-operations__detail-body">
                  {selectedRequest.body || "요청 내용이 입력되지 않았습니다."}
                </p>
              </>
            ) : (
              <p className="customer-operations__detail-guide">목록에서 요청 유형을 선택하면 상세 내용을 확인할 수 있습니다.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
