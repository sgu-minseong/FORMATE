import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import Table from "../../components/ui/Table";
import { fetchCustomerRequests, updateCustomerRequestStatus } from "./api";
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
  getCustomerName,
  getEstimateReference,
  getProjectName,
  operationStatusViews,
} from "./utils";

export default function CustomerRequestsPage({ companyId, onNavigate }) {
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [processingError, setProcessingError] = useState("");
  const [internalMemo, setInternalMemo] = useState("");

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
          rows.some((row) => row.id === current) ? current : rows[0]?.id || ""
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

  useEffect(() => {
    setInternalMemo(selectedRequest?.internal_memo || "");
    setProcessingError("");
  }, [selectedRequestId, selectedRequest?.internal_memo]);

  const handleStatusChange = async (status) => {
    if (!selectedRequest) return;

    setProcessing(true);
    setProcessingError("");
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
    } catch (updateError) {
      setProcessingError(updateError?.message || "요청 상태를 변경하지 못했습니다.");
    } finally {
      setProcessing(false);
    }
  };

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
          <section className="customer-operations__list-section" aria-label="받은 요청 목록">
            <OperationsListHeader
              label="전체 요청"
              count={requests.length}
              hint="행을 선택하면 요청 내용과 처리 액션을 확인할 수 있습니다."
            />
            <Table
              zebra={false}
              className="customer-operations__table"
              columns={[
                { key: "requestType", label: "요청 유형", width: "12%" },
                { key: "title", label: "제목", width: "18%" },
                { key: "customerName", label: "고객명", width: "12%" },
                { key: "projectName", label: "현장명", width: "16%" },
                { key: "estimate", label: "견적 버전", width: "14%" },
                { key: "status", label: "상태", width: "12%" },
                { key: "createdAt", label: "접수 시각", width: "16%" },
              ]}
              rows={requests.map((request) => ({
                id: request.id,
                request,
                selected: request.id === selectedRequestId,
                requestType: operationStatusViews.requestType(request.request_type),
                title: getCustomerOperationText(
                  request.title,
                  operationStatusViews.requestType(request.request_type).label
                ),
                customerName: getCustomerName(request),
                projectName: getProjectName(request),
                status: operationStatusViews.request(request.status),
                createdAt: formatOperationDateTime(request.created_at),
                estimate: getEstimateReference(request),
              }))}
              renderCell={({ row, column, value }) => {
                let content = value;
                if (column.key === "requestType") {
                  content = <strong>{value.label}</strong>;
                } else if (column.key === "status") {
                  content = <StatusText status={value} />;
                } else if (column.key === "createdAt") {
                  content = <span className="customer-operations__date-cell">{value}</span>;
                }

                return (
                  <button
                    type="button"
                    className="customer-operations__table-cell-button"
                    onClick={() => setSelectedRequestId(row.id)}
                  >
                    {content}
                  </button>
                );
              }}
            />
          </section>

          <section className="customer-operations__detail-panel" aria-label="요청 상세">
            {selectedRequest ? (
              <>
                <header className="customer-operations__detail-header">
                  <div>
                    <span>요청 상세</span>
                    <h2>
                      {getCustomerOperationText(
                        selectedRequest.title,
                        operationStatusViews.requestType(selectedRequest.request_type).label
                      )}
                    </h2>
                  </div>
                  <div className="customer-operations__detail-actions">
                    <StatusText status={operationStatusViews.request(selectedRequest.status)} />
                    {selectedRequest.estimate_id && onNavigate ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<FileText />}
                        onClick={() => onNavigate("admin-estimates")}
                      >
                        저장 견적 보기
                      </Button>
                    ) : null}
                  </div>
                </header>
                <div className="customer-operations__detail-grid">
                  <DetailField label="요청 유형">
                    {operationStatusViews.requestType(selectedRequest.request_type).label}
                  </DetailField>
                  <DetailField label="고객">{getCustomerName(selectedRequest)}</DetailField>
                  <DetailField label="현장">{getProjectName(selectedRequest)}</DetailField>
                  <DetailField label="관련 견적">{getEstimateReference(selectedRequest)}</DetailField>
                  <DetailField label="관련 항목">{selectedRequest.related_item_label}</DetailField>
                  <DetailField label="접수 시각">
                    {formatOperationDateTime(selectedRequest.created_at)}
                  </DetailField>
                </div>
                <div className="customer-operations__detail-content">
                  <strong>요청 내용</strong>
                  <p className="customer-operations__detail-body">
                    {selectedRequest.body || "요청 내용이 입력되지 않았습니다."}
                  </p>
                </div>
                <RequestProcessingControls
                  request={selectedRequest}
                  memo={internalMemo}
                  onMemoChange={setInternalMemo}
                  onStatusChange={handleStatusChange}
                  processing={processing}
                  error={processingError}
                />
              </>
            ) : (
              <p className="customer-operations__detail-guide">목록에서 요청을 선택하면 상세 내용을 확인할 수 있습니다.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
