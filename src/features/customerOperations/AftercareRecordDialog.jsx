import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import Button from "../../components/ui/Button";
import { getRelationRow } from "./utils";

function todayDateInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function toDateInput(value) {
  return value ? `${value}`.slice(0, 10) : "";
}

function toDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function getProjectOptionLabel(project) {
  const customer = getRelationRow(project?.customer);
  const projectName = project?.name || project?.address || "현장명 미입력";
  return [projectName, customer?.name].filter(Boolean).join(" · ");
}

export default function AftercareRecordDialog({
  open,
  kind,
  record = null,
  projectOptions = [],
  lockedProject = null,
  purpose = "default",
  submitting = false,
  error = "",
  onClose,
  onSubmit,
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const submittingRef = useRef(submitting);
  const [projectId, setProjectId] = useState("");
  const [baseDate, setBaseDate] = useState("");
  const [nextSendDate, setNextSendDate] = useState("");
  const [repeatIntervalMonths, setRepeatIntervalMonths] = useState("0");
  const [endDate, setEndDate] = useState("");
  const [problemSpace, setProblemSpace] = useState("");
  const [relatedItemLabel, setRelatedItemLabel] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [preferredContactTime, setPreferredContactTime] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [visitScheduledAt, setVisitScheduledAt] = useState("");
  onCloseRef.current = onClose;
  submittingRef.current = submitting;

  const availableProjects = useMemo(
    () => (lockedProject ? [lockedProject] : projectOptions),
    [lockedProject, projectOptions]
  );
  const selectedProject = availableProjects.find((project) => project.id === projectId) ?? null;
  const selectedCustomer = getRelationRow(selectedProject?.customer);

  useEffect(() => {
    if (!open) return;

    const initialProject = lockedProject
      ?? availableProjects.find((project) => project.id === record?.project_id)
      ?? availableProjects[0]
      ?? null;
    const projectCompletedDate = toDateInput(
      initialProject?.completed_at || initialProject?.construction_completed_date
    );
    const fallbackDate = projectCompletedDate || todayDateInput();

    setProjectId(initialProject?.id || "");
    setBaseDate(toDateInput(record?.base_date) || fallbackDate);
    setNextSendDate(
      toDateInput(record?.next_send_date)
      || toDateInput(record?.first_send_date)
      || fallbackDate
    );
    setRepeatIntervalMonths(`${record?.repeat_interval_months ?? 0}`);
    setEndDate(toDateInput(record?.end_date));
    setProblemSpace(record?.problem_space || "");
    setRelatedItemLabel(record?.related_item_label || "");
    setDescription(record?.description || "");
    setUrgency(record?.urgency || "normal");
    setPreferredContactTime(record?.preferred_contact_time || "");
    setAssignedTo(record?.assigned_to || "");
    setVisitScheduledAt(toDateTimeInput(record?.visit_scheduled_at));

  }, [availableProjects, lockedProject, open, record]);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const focusFrame = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector("input, select, textarea, button")?.focus();
    });
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submittingRef.current) onCloseRef.current?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      window.requestAnimationFrame(() => previousFocusRef.current?.focus?.());
    };
  }, [open]);

  if (!open) return null;

  const isSchedule = kind === "schedule";
  const isEditing = Boolean(record);
  const title = isSchedule
    ? isEditing ? "사후관리 일정 수정" : "사후관리 일정 등록"
    : purpose === "visit"
      ? record?.visit_scheduled_at ? "방문 일정 변경" : "방문 일정 등록"
      : isEditing ? "A/S 정보 수정" : "A/S 등록";

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selectedProject || !selectedCustomer?.id) return;

    if (isSchedule) {
      onSubmit?.({
        projectId: selectedProject.id,
        customerId: selectedCustomer.id,
        baseDate,
        firstSendDate: isEditing
          ? toDateInput(record?.first_send_date) || nextSendDate
          : nextSendDate,
        repeatIntervalMonths,
        endDate,
        nextSendDate,
      });
      return;
    }

    onSubmit?.({
      projectId: selectedProject.id,
      customerId: selectedCustomer.id,
      problemSpace,
      relatedItemLabel,
      description,
      urgency,
      preferredContactTime,
      assignedTo,
      visitScheduledAt: toIsoDateTime(visitScheduledAt),
    });
  };

  return (
    <div
      className="aftercare-record-dialog__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose?.();
      }}
    >
      <section
        ref={dialogRef}
        className="aftercare-record-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aftercare-record-dialog-title"
      >
        <header>
          <div>
            <h2 id="aftercare-record-dialog-title">{title}</h2>
            <p>공사가 완료된 현장과 실제 후속 업무 정보를 연결합니다.</p>
          </div>
          <button type="button" aria-label="닫기" disabled={submitting} onClick={onClose}>
            <X size={18} strokeWidth={1.6} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <label className="aftercare-record-dialog__field aftercare-record-dialog__field--wide">
            <span>고객·현장</span>
            <select
              value={projectId}
              required
              disabled={Boolean(lockedProject) || submitting}
              onChange={(event) => setProjectId(event.target.value)}
            >
              {availableProjects.map((project) => (
                <option value={project.id} key={project.id}>
                  {getProjectOptionLabel(project)}
                </option>
              ))}
            </select>
          </label>

          {isSchedule ? (
            <>
              <label className="aftercare-record-dialog__field">
                <span>기준일</span>
                <input
                  type="date"
                  value={baseDate}
                  required
                  disabled={submitting}
                  onChange={(event) => setBaseDate(event.target.value)}
                />
              </label>
              <label className="aftercare-record-dialog__field">
                <span>다음 점검 예정일</span>
                <input
                  type="date"
                  value={nextSendDate}
                  required
                  disabled={submitting}
                  onChange={(event) => setNextSendDate(event.target.value)}
                />
              </label>
              <label className="aftercare-record-dialog__field">
                <span>반복 주기</span>
                <select
                  value={repeatIntervalMonths}
                  disabled={submitting}
                  onChange={(event) => setRepeatIntervalMonths(event.target.value)}
                >
                  <option value="0">반복 없음</option>
                  <option value="1">매월</option>
                  <option value="3">3개월마다</option>
                  <option value="6">6개월마다</option>
                  <option value="12">12개월마다</option>
                </select>
              </label>
              <label className="aftercare-record-dialog__field">
                <span>종료일 선택</span>
                <input
                  type="date"
                  value={endDate}
                  disabled={submitting}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
            </>
          ) : purpose === "visit" ? (
            <label className="aftercare-record-dialog__field aftercare-record-dialog__field--wide">
              <span>방문 예정일</span>
              <input
                type="datetime-local"
                value={visitScheduledAt}
                required
                disabled={submitting}
                onChange={(event) => setVisitScheduledAt(event.target.value)}
              />
            </label>
          ) : (
            <>
              <label className="aftercare-record-dialog__field">
                <span>문제 공간</span>
                <input
                  value={problemSpace}
                  required
                  maxLength={120}
                  disabled={submitting}
                  placeholder="예: 거실 도배"
                  onChange={(event) => setProblemSpace(event.target.value)}
                />
              </label>
              <label className="aftercare-record-dialog__field">
                <span>관련 시공 항목</span>
                <input
                  value={relatedItemLabel}
                  maxLength={160}
                  disabled={submitting}
                  placeholder="실제 관련 항목이 있을 때 입력"
                  onChange={(event) => setRelatedItemLabel(event.target.value)}
                />
              </label>
              <label className="aftercare-record-dialog__field aftercare-record-dialog__field--wide">
                <span>상세 내용</span>
                <textarea
                  value={description}
                  required
                  maxLength={2000}
                  disabled={submitting}
                  placeholder="확인해야 할 문제와 고객이 전달한 내용을 기록합니다."
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <label className="aftercare-record-dialog__field">
                <span>긴급도</span>
                <select
                  value={urgency}
                  disabled={submitting}
                  onChange={(event) => setUrgency(event.target.value)}
                >
                  <option value="low">낮음</option>
                  <option value="normal">보통</option>
                  <option value="high">높음</option>
                  <option value="urgent">긴급</option>
                </select>
              </label>
              <label className="aftercare-record-dialog__field">
                <span>담당자</span>
                <input
                  value={assignedTo}
                  maxLength={120}
                  disabled={submitting}
                  placeholder="담당자가 정해졌을 때 입력"
                  onChange={(event) => setAssignedTo(event.target.value)}
                />
              </label>
              <label className="aftercare-record-dialog__field">
                <span>연락 희망 시간</span>
                <input
                  value={preferredContactTime}
                  maxLength={160}
                  disabled={submitting}
                  placeholder="예: 평일 오후"
                  onChange={(event) => setPreferredContactTime(event.target.value)}
                />
              </label>
              {!isEditing ? (
                <label className="aftercare-record-dialog__field">
                  <span>방문 예정일</span>
                  <input
                    type="datetime-local"
                    value={visitScheduledAt}
                    disabled={submitting}
                    onChange={(event) => setVisitScheduledAt(event.target.value)}
                  />
                </label>
              ) : null}
            </>
          )}

          {error ? <p className="aftercare-record-dialog__error" role="alert">{error}</p> : null}

          <footer>
            <Button type="button" variant="secondary" disabled={submitting} onClick={onClose}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || !selectedProject}>
              {submitting ? "저장 중..." : "저장"}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}
