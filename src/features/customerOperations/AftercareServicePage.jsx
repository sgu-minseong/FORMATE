import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Pause,
  Play,
  Plus,
  Search,
  Wrench,
} from "lucide-react";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import AftercareRecordDialog from "./AftercareRecordDialog";
import {
  addServiceRequestNote,
  createAftercareSchedule,
  createServiceRequest,
  fetchAftercareAndService,
  updateAftercareSchedule,
  updateServiceRequest,
  updateServiceRequestStatus,
} from "./api";
import { StatusText } from "./components";
import { CUSTOMER_OPERATIONS_PAGES } from "./constants";
import {
  formatOperationDate,
  formatOperationDateTime,
  getAftercareScheduleTitle,
  getCustomerName,
  getProjectName,
  isAftercareScheduleOverdue,
  isServiceRequestInWorkspaceView,
  operationStatusViews,
} from "./utils";

const WORKSPACE_VIEWS = [
  { key: "schedule", label: "예정 관리" },
  { key: "service-intake", label: "A/S 접수" },
  { key: "service-progress", label: "처리 중" },
  { key: "service-completed", label: "완료" },
];

const EMPTY_MESSAGES = {
  schedule: "등록된 사후관리 일정이 없습니다.",
  "service-intake": "새로 접수된 A/S 요청이 없습니다.",
  "service-progress": "현재 처리 중인 A/S 요청이 없습니다.",
  "service-completed": "완료된 A/S 내역이 없습니다.",
};

function normalizeSearchText(value) {
  return `${value ?? ""}`.trim().toLocaleLowerCase();
}

function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return "방금 전";
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}시간 전`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}일 전`;
  return formatOperationDate(value);
}

function getServiceTitle(request) {
  return request?.problem_space
    || request?.related_item_label
    || `${request?.description ?? ""}`.trim().split(/\r?\n/)[0]
    || "A/S 요청";
}

function getScheduleAction(status) {
  if (status === "scheduled") {
    return { status: "active", label: "점검 시작", Icon: Play };
  }
  if (status === "active") {
    return { status: "completed", label: "점검 완료", Icon: Check };
  }
  if (status === "paused") {
    return { status: "active", label: "점검 다시 시작", Icon: Play };
  }
  return null;
}

function getServicePrimaryAction(status) {
  if (status === "received") return { status: "contacted", label: "연락 완료" };
  if (status === "contacted") return { status: "in_progress", label: "처리 시작" };
  if (status === "visit_scheduled") return { status: "in_progress", label: "처리 시작" };
  if (status === "in_progress") return { status: "resolved", label: "처리 완료" };
  if (status === "resolved") return { status: "closed", label: "종료" };
  return null;
}

export default function AftercareServicePage({ companyId, onNavigate }) {
  const [activeView, setActiveView] = useState("schedule");
  const [aftercareSchedules, setAftercareSchedules] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [note, setNote] = useState("");
  const [dialog, setDialog] = useState(null);
  const [dialogError, setDialogError] = useState("");
  const detailScrollRef = useRef(null);

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
        setProjectOptions(result.projectOptions);
      } catch {
        if (!active) return;
        setError("사후관리·A/S 데이터를 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [companyId, reloadKey]);

  const counts = useMemo(() => ({
    schedule: aftercareSchedules.length,
    "service-intake": serviceRequests.filter((request) => (
      isServiceRequestInWorkspaceView(request.status, "service-intake")
    )).length,
    "service-progress": serviceRequests.filter((request) => (
      isServiceRequestInWorkspaceView(request.status, "service-progress")
    )).length,
    "service-completed": serviceRequests.filter((request) => (
      isServiceRequestInWorkspaceView(request.status, "service-completed")
    )).length,
  }), [aftercareSchedules, serviceRequests]);

  const visibleRecords = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);
    const source = activeView === "schedule"
      ? aftercareSchedules
      : serviceRequests.filter((request) => (
        isServiceRequestInWorkspaceView(request.status, activeView)
      ));

    if (!normalizedQuery) return source;
    return source.filter((record) => {
      const searchable = activeView === "schedule"
        ? [
          getAftercareScheduleTitle(record),
          getCustomerName(record),
          getProjectName(record),
          record.next_send_date,
          operationStatusViews.aftercare(record.status).label,
        ]
        : [
          getServiceTitle(record),
          record.description,
          record.related_item_label,
          getCustomerName(record),
          getProjectName(record),
          operationStatusViews.service(record.status).label,
        ];
      return searchable.map(normalizeSearchText).join(" ").includes(normalizedQuery);
    });
  }, [activeView, aftercareSchedules, searchQuery, serviceRequests]);

  useEffect(() => {
    if (visibleRecords.some((record) => record.id === selectedId)) return;
    setSelectedId(visibleRecords[0]?.id || "");
  }, [selectedId, visibleRecords]);

  useEffect(() => {
    if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0;
    setActionError("");
    setNote("");
  }, [activeView, selectedId]);

  const selectedRecord = visibleRecords.find((record) => record.id === selectedId) ?? null;
  const hasLoadedRecords = aftercareSchedules.length > 0 || serviceRequests.length > 0;
  const selectedIsSchedule = activeView === "schedule";
  const selectedStatus = selectedRecord
    ? selectedIsSchedule
      ? operationStatusViews.aftercare(selectedRecord.status)
      : operationStatusViews.service(selectedRecord.status)
    : null;

  const replaceSchedule = (schedule) => {
    setAftercareSchedules((current) => (
      current.some((item) => item.id === schedule.id)
        ? current.map((item) => item.id === schedule.id ? schedule : item)
        : [schedule, ...current]
    ));
  };

  const replaceServiceRequest = (request) => {
    setServiceRequests((current) => (
      current.some((item) => item.id === request.id)
        ? current.map((item) => (
          item.id === request.id
            ? { ...request, updates: request.updates ?? item.updates ?? [] }
            : item
        ))
        : [request, ...current]
    ));
  };

  const openCreateDialog = () => {
    setDialogError("");
    setDialog({
      kind: activeView === "schedule" ? "schedule" : "service",
      record: null,
      purpose: "default",
    });
  };

  const handleDialogSubmit = async (values) => {
    if (!dialog || processing) return;
    setProcessing(true);
    setDialogError("");
    try {
      if (dialog.kind === "schedule") {
        const schedule = dialog.record
          ? await updateAftercareSchedule({
            companyId,
            scheduleId: dialog.record.id,
            customerId: values.customerId,
            projectId: values.projectId,
            changes: values,
          })
          : await createAftercareSchedule({ companyId, ...values });
        replaceSchedule(schedule);
        setActiveView("schedule");
        setSelectedId(schedule.id);
        setNotice(dialog.record ? "사후관리 일정을 수정했습니다." : "사후관리 일정을 등록했습니다.");
      } else if (dialog.record) {
        const currentUpdates = dialog.record.updates ?? [];
        let request;
        if (
          dialog.purpose === "visit"
          && ["received", "contacted"].includes(dialog.record.status)
        ) {
          request = await updateServiceRequestStatus({
            companyId,
            requestId: dialog.record.id,
            customerId: values.customerId,
            projectId: values.projectId,
            status: "visit_scheduled",
            visitScheduledAt: values.visitScheduledAt,
          });
          request.updates = request.statusUpdate
            ? [request.statusUpdate, ...currentUpdates]
            : currentUpdates;
        } else {
          request = await updateServiceRequest({
            companyId,
            requestId: dialog.record.id,
            customerId: values.customerId,
            projectId: values.projectId,
            changes: values,
          });
          request.updates = currentUpdates;
        }
        replaceServiceRequest(request);
        setSelectedId(request.id);
        setNotice(dialog.purpose === "visit" ? "방문 일정을 저장했습니다." : "A/S 정보를 수정했습니다.");
      } else {
        const request = await createServiceRequest({ companyId, ...values });
        replaceServiceRequest(request);
        const nextView = isServiceRequestInWorkspaceView(request.status, "service-progress")
          ? "service-progress"
          : "service-intake";
        setActiveView(nextView);
        setSelectedId(request.id);
        setNotice("A/S 요청을 등록했습니다.");
      }
      setDialog(null);
    } catch {
      setDialogError("저장하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setProcessing(false);
    }
  };

  const handleScheduleStatus = async (status) => {
    if (!selectedRecord || processing) return;
    setProcessing(true);
    setActionError("");
    setNotice("");
    try {
      const schedule = await updateAftercareSchedule({
        companyId,
        scheduleId: selectedRecord.id,
        customerId: selectedRecord.customer_id,
        projectId: selectedRecord.project_id,
        changes: {
          status,
          ...(status === "active" ? { pausedReason: "" } : {}),
        },
      });
      replaceSchedule(schedule);
      setNotice(status === "completed" ? "점검 일정을 완료했습니다." : "점검 상태를 변경했습니다.");
    } catch {
      setActionError("사후관리 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setProcessing(false);
    }
  };

  const handleServiceStatus = async (status) => {
    if (!selectedRecord || processing) return;
    setProcessing(true);
    setActionError("");
    setNotice("");
    try {
      const request = await updateServiceRequestStatus({
        companyId,
        requestId: selectedRecord.id,
        customerId: selectedRecord.customer_id,
        projectId: selectedRecord.project_id,
        status,
      });
      request.updates = request.statusUpdate
        ? [request.statusUpdate, ...(selectedRecord.updates ?? [])]
        : selectedRecord.updates ?? [];
      replaceServiceRequest(request);
      setNotice(status === "resolved" ? "A/S 처리를 완료했습니다." : "A/S 상태를 변경했습니다.");
    } catch {
      setActionError("A/S 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedRecord || !note.trim() || processing) return;
    setProcessing(true);
    setActionError("");
    try {
      const update = await addServiceRequestNote({
        companyId,
        requestId: selectedRecord.id,
        customerId: selectedRecord.customer_id,
        projectId: selectedRecord.project_id,
        body: note,
      });
      replaceServiceRequest({
        ...selectedRecord,
        updates: [update, ...(selectedRecord.updates ?? [])],
      });
      setNote("");
      setNotice("처리 메모를 저장했습니다.");
    } catch {
      setActionError("처리 메모를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setProcessing(false);
    }
  };

  const renderScheduleDetail = () => {
    const scheduleAction = getScheduleAction(selectedRecord.status);
    const overdue = isAftercareScheduleOverdue(selectedRecord);
    return (
      <>
        <header className="aftercare-workspace__detail-header">
          <div className="aftercare-workspace__detail-meta">
            <span>예정 관리 · {formatOperationDate(selectedRecord.next_send_date)}</span>
            <StatusText status={selectedStatus} />
          </div>
          <h2>{getAftercareScheduleTitle(selectedRecord)}</h2>
          {overdue ? <span className="aftercare-workspace__overdue">기한 경과</span> : null}
        </header>
        <div className="aftercare-workspace__detail-scroll" ref={detailScrollRef}>
          <section className="aftercare-workspace__relation-row">
            <div>
              <span>고객·현장</span>
              <strong>{getCustomerName(selectedRecord)} · {getProjectName(selectedRecord)}</strong>
            </div>
            <button type="button" onClick={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS)}>
              현장 보기 <ArrowRight size={15} aria-hidden="true" />
            </button>
          </section>
          <section className="aftercare-workspace__field-list">
            <div><span>기준일</span><strong>{formatOperationDate(selectedRecord.base_date)}</strong></div>
            <div><span>첫 점검일</span><strong>{formatOperationDate(selectedRecord.first_send_date)}</strong></div>
            <div><span>다음 점검일</span><strong>{formatOperationDate(selectedRecord.next_send_date)}</strong></div>
            <div>
              <span>반복 주기</span>
              <strong>
                {selectedRecord.repeat_interval_months > 0
                  ? `${selectedRecord.repeat_interval_months}개월`
                  : "반복 없음"}
              </strong>
            </div>
            <div><span>종료일</span><strong>{formatOperationDate(selectedRecord.end_date)}</strong></div>
            {selectedRecord.paused_reason ? (
              <div><span>중지 사유</span><strong>{selectedRecord.paused_reason}</strong></div>
            ) : null}
          </section>
        </div>
        <footer className="aftercare-workspace__action-bar">
          <Button
            variant="secondary"
            size="sm"
            disabled={processing}
            onClick={() => {
              setDialogError("");
              setDialog({ kind: "schedule", record: selectedRecord, purpose: "default" });
            }}
          >
            일정 수정
          </Button>
          <div>
            {selectedRecord.status === "active" ? (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Pause />}
                disabled={processing}
                onClick={() => handleScheduleStatus("paused")}
              >
                일시 중지
              </Button>
            ) : null}
            {scheduleAction ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<scheduleAction.Icon />}
                disabled={processing}
                onClick={() => handleScheduleStatus(scheduleAction.status)}
              >
                {processing ? "처리 중..." : scheduleAction.label}
              </Button>
            ) : null}
          </div>
        </footer>
      </>
    );
  };

  const renderServiceDetail = () => {
    const primaryAction = getServicePrimaryAction(selectedRecord.status);
    const updates = selectedRecord.updates ?? [];
    return (
      <>
        <header className="aftercare-workspace__detail-header">
          <div className="aftercare-workspace__detail-meta">
            <span>A/S · {formatRelativeTime(selectedRecord.created_at)}</span>
            <StatusText status={selectedStatus} />
          </div>
          <h2>{getServiceTitle(selectedRecord)}</h2>
        </header>
        <div className="aftercare-workspace__detail-scroll" ref={detailScrollRef}>
          <section className="aftercare-workspace__description">
            <span>문제 내용</span>
            <p>{selectedRecord.description || "상세 내용이 입력되지 않았습니다."}</p>
            {selectedRecord.related_item_label ? (
              <small>관련 시공 항목: {selectedRecord.related_item_label}</small>
            ) : null}
          </section>
          <section className="aftercare-workspace__relation-row">
            <div>
              <span>고객·현장</span>
              <strong>{getCustomerName(selectedRecord)} · {getProjectName(selectedRecord)}</strong>
            </div>
            <button type="button" onClick={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS)}>
              현장 보기 <ArrowRight size={15} aria-hidden="true" />
            </button>
          </section>
          <section className="aftercare-workspace__field-list">
            <div>
              <span>긴급도</span>
              <strong>{operationStatusViews.urgency(selectedRecord.urgency).label}</strong>
            </div>
            <div><span>방문 예정</span><strong>{formatOperationDateTime(selectedRecord.visit_scheduled_at)}</strong></div>
            <div><span>담당자</span><strong>{selectedRecord.assigned_to || "-"}</strong></div>
            <div><span>연락 희망 시간</span><strong>{selectedRecord.preferred_contact_time || "-"}</strong></div>
            {selectedRecord.resolved_at ? (
              <div><span>처리 완료</span><strong>{formatOperationDateTime(selectedRecord.resolved_at)}</strong></div>
            ) : null}
          </section>
          {!["resolved", "closed"].includes(selectedRecord.status) ? (
            <section className="aftercare-workspace__note">
              <label htmlFor="aftercare-service-note">처리 메모</label>
              <textarea
                id="aftercare-service-note"
                value={note}
                maxLength={2000}
                placeholder="연락 내용이나 현장 확인 사항을 기록합니다."
                onChange={(event) => setNote(event.target.value)}
              />
              <div>
                <span>고객에게 노출되지 않는 내부 기록입니다.</span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={processing || !note.trim()}
                  onClick={handleSaveNote}
                >
                  메모 저장
                </Button>
              </div>
            </section>
          ) : null}
          {updates.length > 0 ? (
            <section className="aftercare-workspace__history">
              <h3>업데이트 이력</h3>
              <div>
                {updates.map((update) => (
                  <article key={update.id}>
                    <span>{update.body || "A/S 기록"}</span>
                    <time>{formatOperationDateTime(update.created_at)}</time>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <footer className="aftercare-workspace__action-bar">
          <Button
            variant="secondary"
            size="sm"
            disabled={processing}
            onClick={() => {
              setDialogError("");
              setDialog({ kind: "service", record: selectedRecord, purpose: "default" });
            }}
          >
            정보 수정
          </Button>
          <div>
            {["received", "contacted", "visit_scheduled"].includes(selectedRecord.status) ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={processing}
                onClick={() => {
                  setDialogError("");
                  setDialog({ kind: "service", record: selectedRecord, purpose: "visit" });
                }}
              >
                {selectedRecord.visit_scheduled_at ? "방문 일정 변경" : "방문 일정 등록"}
              </Button>
            ) : null}
            {primaryAction ? (
              <Button
                variant="primary"
                size="sm"
                disabled={processing}
                onClick={() => handleServiceStatus(primaryAction.status)}
              >
                {processing ? "처리 중..." : primaryAction.label}
              </Button>
            ) : null}
          </div>
        </footer>
      </>
    );
  };

  return (
    <main className="customer-operations-page aftercare-workspace">
      <PageHeader
        title="사후관리·A/S"
        description="공사 완료 후 예정된 점검과 접수된 A/S 요청을 관리합니다."
        actions={projectOptions.length > 0 ? (
          <Button variant="primary" size="sm" leftIcon={<Plus />} onClick={openCreateDialog}>
            {activeView === "schedule" ? "일정 등록" : "A/S 등록"}
          </Button>
        ) : null}
      />

      <section className="aftercare-workspace__toolbar">
        <div className="aftercare-workspace__tabs" role="tablist" aria-label="사후관리 업무 상태">
          {WORKSPACE_VIEWS.map((view) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeView === view.key}
              className={activeView === view.key ? "is-active" : ""}
              key={view.key}
              onClick={() => {
                setActiveView(view.key);
                setSelectedId("");
                setNotice("");
              }}
            >
              {view.label}
              <span>{counts[view.key]}</span>
            </button>
          ))}
        </div>
        <label className="aftercare-workspace__search">
          <span className="aftercare-workspace__visually-hidden">사후관리 업무 검색</span>
          <Search size={16} strokeWidth={1.5} aria-hidden="true" />
          <input
            value={searchQuery}
            placeholder="일정, A/S, 고객, 현장 검색"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
      </section>

      {notice ? <p className="aftercare-workspace__notice" role="status">{notice}</p> : null}
      {actionError ? <p className="aftercare-workspace__error" role="alert">{actionError}</p> : null}

      <section className="aftercare-workspace__surface" aria-label="사후관리 업무함">
        <aside className="aftercare-workspace__list-pane">
          <header>
            <strong>{WORKSPACE_VIEWS.find((view) => view.key === activeView)?.label}</strong>
          </header>
          <div className="aftercare-workspace__list-scroll" aria-busy={loading}>
            {error && hasLoadedRecords ? (
              <div className="aftercare-workspace__list-error" role="alert">
                <span>새로고침하지 못해 이전 목록을 표시합니다.</span>
                <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
                  다시 불러오기
                </button>
              </div>
            ) : null}
            {error && !hasLoadedRecords ? (
              <div className="aftercare-workspace__state is-error">
                <span>{error}</span>
                <Button variant="secondary" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
                  다시 불러오기
                </Button>
              </div>
            ) : loading && visibleRecords.length === 0 ? (
              <div className="aftercare-workspace__state" role="status">불러오는 중</div>
            ) : visibleRecords.length === 0 ? (
              <div className="aftercare-workspace__state">
                {searchQuery.trim() ? "검색 조건에 맞는 항목이 없습니다." : EMPTY_MESSAGES[activeView]}
              </div>
            ) : visibleRecords.map((record) => {
              const isSchedule = activeView === "schedule";
              const status = isSchedule
                ? operationStatusViews.aftercare(record.status)
                : operationStatusViews.service(record.status);
              const title = isSchedule ? getAftercareScheduleTitle(record) : getServiceTitle(record);
              const timeLabel = isSchedule
                ? formatOperationDate(record.next_send_date)
                : record.visit_scheduled_at
                  ? formatOperationDateTime(record.visit_scheduled_at)
                  : formatRelativeTime(record.created_at);
              return (
                <button
                  type="button"
                  className={`aftercare-workspace__row ${record.id === selectedId ? "is-selected" : ""}`.trim()}
                  aria-current={record.id === selectedId ? "true" : undefined}
                  key={record.id}
                  onClick={() => {
                    setSelectedId(record.id);
                    setNotice("");
                  }}
                >
                  <span className="aftercare-workspace__row-top">
                    <span>{isSchedule ? "예정 점검" : "A/S"}</span>
                    <time>{timeLabel}</time>
                  </span>
                  <strong title={title}>{title}</strong>
                  <span className="aftercare-workspace__row-project" title={getProjectName(record)}>
                    {getProjectName(record)}
                  </span>
                  <span className="aftercare-workspace__row-meta">
                    <span>{getCustomerName(record)}</span>
                    <StatusText status={status} />
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <article className="aftercare-workspace__detail-pane">
          {selectedRecord ? (
            selectedIsSchedule ? renderScheduleDetail() : renderServiceDetail()
          ) : (
            <div className="aftercare-workspace__detail-empty">
              {activeView === "schedule"
                ? <CalendarDays size={22} strokeWidth={1.5} aria-hidden="true" />
                : <Wrench size={22} strokeWidth={1.5} aria-hidden="true" />}
              <span>목록에서 항목을 선택하면 상세 내용을 확인할 수 있습니다.</span>
            </div>
          )}
        </article>
      </section>

      <AftercareRecordDialog
        open={Boolean(dialog)}
        kind={dialog?.kind}
        record={dialog?.record}
        purpose={dialog?.purpose}
        projectOptions={projectOptions}
        submitting={processing}
        error={dialogError}
        onClose={() => {
          if (!processing) setDialog(null);
        }}
        onSubmit={handleDialogSubmit}
      />
    </main>
  );
}
