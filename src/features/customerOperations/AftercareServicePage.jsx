import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Table from "../../components/ui/Table";
import ToggleButton from "../../components/ui/ToggleButton";
import { fetchAftercareAndService } from "./api";
import { OperationsListHeader, OperationsLoadState, StatusText } from "./components";
import {
  formatOperationDate,
  formatOperationDateTime,
  getCustomerName,
  getProjectName,
  operationStatusViews,
} from "./utils";

export default function AftercareServicePage({ companyId }) {
  const [activeView, setActiveView] = useState("aftercare");
  const [aftercareSchedules, setAftercareSchedules] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await fetchAftercareAndService(companyId);
        if (!active) return;
        setAftercareSchedules(result.aftercareSchedules);
        setServiceRequests(result.serviceRequests);
      } catch (loadError) {
        if (!active) return;
        setAftercareSchedules([]);
        setServiceRequests([]);
        setError(loadError?.message || "사후관리·A/S 데이터를 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [companyId, reloadKey]);

  const rows = activeView === "aftercare" ? aftercareSchedules : serviceRequests;
  const showState = loading || !!error || rows.length === 0;

  return (
    <main className="customer-operations-page">
      <PageHeader
        title="사후관리·A/S"
        description="공사 완료 후 안내 일정과 접수된 A/S 요청을 분리해 확인합니다."
        actions={
          <div className="customer-operations__segmented" aria-label="사후관리·A/S 보기">
            <ToggleButton
              size="sm"
              pressed={activeView === "aftercare"}
              onClick={() => setActiveView("aftercare")}
            >
              사후관리
              <span className="customer-operations__segment-count">{aftercareSchedules.length}</span>
            </ToggleButton>
            <ToggleButton
              size="sm"
              pressed={activeView === "service"}
              onClick={() => setActiveView("service")}
            >
              A/S 요청
              <span className="customer-operations__segment-count">{serviceRequests.length}</span>
            </ToggleButton>
          </div>
        }
      />

      {showState ? (
        <OperationsLoadState
          loading={loading}
          error={error}
          empty={!loading && !error && rows.length === 0}
          emptyTitle={activeView === "aftercare" ? "사후관리 일정이 없습니다" : "접수된 A/S 요청이 없습니다"}
          emptyDescription={
            activeView === "aftercare"
              ? "공사 완료 후 사후관리 일정이 등록되면 이 목록에 표시됩니다."
              : "고객의 A/S 요청이 접수되면 이 목록에 표시됩니다."
          }
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      ) : activeView === "aftercare" ? (
        <section className="customer-operations__list-section" aria-label="사후관리 일정 목록">
          <OperationsListHeader
            label="사후관리 일정"
            count={aftercareSchedules.length}
            hint="다음 안내 예정일을 기준으로 후속 업무를 확인합니다."
          />
          <Table
            zebra={false}
            className="customer-operations__table"
            columns={[
              { key: "customerName", label: "고객명", width: "18%" },
              { key: "projectName", label: "현장명", width: "27%" },
              { key: "status", label: "상태", width: "17%" },
              { key: "nextSendDate", label: "다음 발송 예정일", width: "22%" },
              { key: "interval", label: "반복 주기", align: "right", width: "16%" },
            ]}
            rows={aftercareSchedules.map((schedule) => ({
              id: schedule.id,
              customerName: getCustomerName(schedule),
              projectName: getProjectName(schedule),
              status: operationStatusViews.aftercare(schedule.status),
              nextSendDate: formatOperationDate(schedule.next_send_date),
              interval: schedule.repeat_interval_months > 0 ? `${schedule.repeat_interval_months}개월` : "-",
            }))}
            renderCell={({ column, value }) => {
              if (column.key === "status") return <StatusText status={value} />;
              if (["nextSendDate", "interval"].includes(column.key)) {
                return <span className="customer-operations__date-cell">{value}</span>;
              }
              return value;
            }}
          />
        </section>
      ) : (
        <section className="customer-operations__list-section" aria-label="A/S 요청 목록">
          <OperationsListHeader
            label="A/S 요청"
            count={serviceRequests.length}
            hint="긴급도와 방문 예정일을 함께 확인합니다."
          />
          <Table
            zebra={false}
            className="customer-operations__table"
            columns={[
              { key: "customerName", label: "고객명", width: "17%" },
              { key: "projectName", label: "현장명", width: "22%" },
              { key: "problemSpace", label: "문제 공간", width: "18%" },
              { key: "urgency", label: "긴급도", width: "13%" },
              { key: "status", label: "상태", width: "14%" },
              { key: "visitAt", label: "방문 예정일", width: "16%" },
            ]}
            rows={serviceRequests.map((request) => ({
              id: request.id,
              customerName: getCustomerName(request),
              projectName: getProjectName(request),
              problemSpace: request.problem_space || "-",
              urgency: operationStatusViews.urgency(request.urgency),
              status: operationStatusViews.service(request.status),
              visitAt: formatOperationDateTime(request.visit_scheduled_at),
            }))}
            renderCell={({ column, value }) => {
              if (["urgency", "status"].includes(column.key)) {
                return <StatusText status={value} />;
              }
              if (column.key === "visitAt") {
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
