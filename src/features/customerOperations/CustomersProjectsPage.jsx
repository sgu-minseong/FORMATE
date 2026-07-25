import { useEffect, useMemo, useState } from "react";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import Table from "../../components/ui/Table";
import ToggleButton from "../../components/ui/ToggleButton";
import { fetchCustomersProjects } from "./api";
import { CUSTOMER_DETAIL_TABS } from "./constants";
import { DetailField, OperationsLoadState, StatusText } from "./components";
import {
  formatOperationDateTime,
  getProjectAddress,
  getProjectCurrentStage,
  getRelationRow,
} from "./utils";

export default function CustomersProjectsPage({ companyId }) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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
          rows.some((row) => row.id === current) ? current : ""
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
  const selectedCustomer = getRelationRow(selectedProject?.customer);
  const activeTabLabel = CUSTOMER_DETAIL_TABS.find((tab) => tab.key === activeTab)?.label ?? "개요";
  const showState = loading || !!error || projects.length === 0;

  return (
    <main className="customer-operations-page">
      <PageHeader
        title="고객·현장"
        description="고객 정보와 연결된 현장의 현재 단계를 함께 확인합니다."
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
          <Table
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
              if (column.key === "customerName") {
                return (
                  <button
                    type="button"
                    className="customer-operations__row-link"
                    onClick={() => {
                      setSelectedProjectId(row.id);
                      setActiveTab("overview");
                    }}
                  >
                    {value}
                  </button>
                );
              }
              if (column.key === "project") {
                return (
                  <span className="customer-operations__stacked-cell">
                    <strong>{row.projectName}</strong>
                    <span>{row.projectAddress}</span>
                  </span>
                );
              }
              if (column.key === "stage") return <StatusText status={value} />;
              return value;
            }}
          />

          <section className="customer-operations__detail-panel customer-operations__detail-panel--tabs" aria-label="고객·현장 상세">
            {selectedProject ? (
              <>
                <header className="customer-operations__detail-header">
                  <div>
                    <span>{selectedCustomer?.name || "고객명 미입력"}</span>
                    <h2>{selectedProject.name || selectedProject.address || "현장명 미입력"}</h2>
                  </div>
                  <StatusText status={getProjectCurrentStage(selectedProject)} />
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
                {activeTab === "overview" ? (
                  <div className="customer-operations__detail-grid">
                    <DetailField label="연락처">{selectedCustomer?.phone}</DetailField>
                    <DetailField label="이메일">{selectedCustomer?.email}</DetailField>
                    <DetailField label="현장 주소">{getProjectAddress({ project: selectedProject })}</DetailField>
                    <DetailField label="착공 예정">{selectedProject.construction_start_date || "-"}</DetailField>
                    <DetailField label="견적 수">{selectedProject.estimateCount}</DetailField>
                    <DetailField label="미처리 요청">{selectedProject.openRequestCount}</DetailField>
                  </div>
                ) : (
                  <EmptyState
                    title={`${activeTabLabel} 기록이 없습니다`}
                    description="연결된 데이터가 생성되면 이 탭에 누적됩니다."
                    className="customer-operations__tab-empty"
                  />
                )}
              </>
            ) : (
              <p className="customer-operations__detail-guide">목록에서 고객명을 선택하면 고객·현장 상세를 확인할 수 있습니다.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
