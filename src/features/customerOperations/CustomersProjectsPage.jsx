import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Copy,
  MoreHorizontal,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import PriceText from "../../components/PriceText";
import {
  fetchCustomerProjectDetail,
  fetchCustomersProjects,
  getProjectTrashImpact,
  moveProjectToTrash,
  restoreProjectFromTrash,
  updateCustomerRequestStatus,
  updateProjectStatus,
} from "./api";
import ProjectStatusConfirmDialog from "./ProjectStatusConfirmDialog";
import ProjectTrashDialog from "./ProjectTrashDialog";
import {
  RequestProcessingControls,
  StatusText,
} from "./components";
import {
  formatOperationDateTime,
  getCustomerRequestLogicalStatus,
  getCustomerOperationText,
  getEstimateReference,
  getEstimateVersionLabel,
  getRelationRow,
  isActiveProjectStatus,
  isDeletedProject,
  isOpenCustomerRequest,
  operationStatusViews,
} from "./utils";

const EMPTY_DETAIL = {
  project: null,
  estimateVersions: [],
  requests: [],
  messages: [],
  timelineEvents: [],
  accessTokens: [],
};

const PROJECT_TABS = [
  { key: "overview", label: "개요" },
  { key: "estimates-requests", label: "견적·요청" },
  { key: "construction", label: "공사" },
  { key: "settlement", label: "정산" },
  { key: "aftercare", label: "사후관리" },
];

const PROJECT_FILTERS = [
  { value: "all", label: "전체 현장" },
  { value: "active", label: "진행 중" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
  { value: "trash", label: "휴지통" },
];

function QuietEmpty({ children }) {
  return <p className="customer-projects-workspace__quiet-empty">{children}</p>;
}

function getProjectTitle(project) {
  return project?.name || project?.address || "현장";
}

function getProjectAddressText(project) {
  return [project?.address, project?.detail_address].filter(Boolean).join(" ");
}

function formatRelativeActivity(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) return "방금 전";

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}시간 전`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}일 전`;

  return formatOperationDateTime(value);
}

function matchesProjectStatus(project, filter) {
  if (filter === "trash") return isDeletedProject(project);
  if (isDeletedProject(project)) return false;
  if (filter === "active") {
    return isActiveProjectStatus(project.construction_status);
  }
  if (filter === "completed") return project.construction_status === "completed";
  if (filter === "cancelled") return project.construction_status === "cancelled";
  return true;
}

function getProjectLifecycleStatus(project) {
  if (isDeletedProject(project)) {
    return { label: "삭제됨", tone: "muted" };
  }
  if (project?.construction_status === "completed") {
    return { label: "완료", tone: "success" };
  }
  if (project?.construction_status === "cancelled") {
    return { label: "취소", tone: "danger" };
  }
  return { label: "진행 중", tone: "warning" };
}

function getProjectSortPriority(project) {
  if (Number(project.openRequestCount) > 0) return 0;
  if (project.construction_status === "in_progress") return 1;
  if (project.construction_status === "completed") return 3;
  return 2;
}

function getSafeActivityDescription(value, fallback = "") {
  const text = getCustomerOperationText(value, fallback);
  if (/https?:\/\/|\/c\/|[A-Za-z0-9_-]{40,}/.test(text)) return fallback;
  return text;
}

function EstimateVersionsList({ versions, accessTokens }) {
  if (versions.length === 0) {
    return <QuietEmpty>등록된 견적서가 없습니다.</QuietEmpty>;
  }

  const linkedVersionIds = new Set(
    accessTokens.map((accessToken) => accessToken.estimate_version_id).filter(Boolean)
  );

  return (
    <div className="customer-projects-workspace__estimate-list" aria-label="견적서 버전 목록">
      {versions.map((version) => (
        <div className="customer-projects-workspace__estimate-row" key={version.id}>
          <div>
            <strong>{getEstimateVersionLabel(version)}</strong>
            <span>버전 {version.version_no}</span>
          </div>
          <PriceText value={version.total_amount || 0} size="sm" />
          <div className="customer-projects-workspace__estimate-meta">
            <StatusText status={operationStatusViews.estimate(version.status)} />
            {version.sent_at ? <span>전송 {formatOperationDateTime(version.sent_at)}</span> : null}
            {version.viewed_at ? <span>열람 {formatOperationDateTime(version.viewed_at)}</span> : null}
            {version.approved_at ? <span>확정 {formatOperationDateTime(version.approved_at)}</span> : null}
          </div>
          {linkedVersionIds.has(version.id) ? (
            <span className="customer-projects-workspace__link-state">고객 링크 생성됨</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function CustomersProjectsPage({ companyId }) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [estimateRequestView, setEstimateRequestView] = useState("estimates");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState("all");
  const [copyNotice, setCopyNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [detail, setDetail] = useState(EMPTY_DETAIL);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [requestMemo, setRequestMemo] = useState("");
  const [requestProcessing, setRequestProcessing] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestNotice, setRequestNotice] = useState("");
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [projectStatusConfirm, setProjectStatusConfirm] = useState("");
  const [projectStatusProcessing, setProjectStatusProcessing] = useState(false);
  const [projectStatusError, setProjectStatusError] = useState("");
  const [projectStatusNotice, setProjectStatusNotice] = useState("");
  const [projectTrashImpacts, setProjectTrashImpacts] = useState({});
  const [projectTrashImpactLoadingId, setProjectTrashImpactLoadingId] = useState("");
  const [projectTrashDialog, setProjectTrashDialog] = useState(null);
  const [projectTrashProcessing, setProjectTrashProcessing] = useState(false);
  const [projectTrashError, setProjectTrashError] = useState("");
  const detailContentRef = useRef(null);
  const activityDrawerRef = useRef(null);
  const activityTriggerRef = useRef(null);
  const projectMenuRef = useRef(null);

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

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    const selectedVersionText = detail.estimateVersions
      .map((version) => `${version.label || ""} ${version.version_no || ""}`)
      .join(" ");

    return projects
      .filter((project) => {
        if (!matchesProjectStatus(project, statusFilter)) return false;
        if (!normalizedQuery) return true;

        const customer = getRelationRow(project.customer);
        const searchable = [
          project.name,
          project.address,
          project.detail_address,
          customer?.name,
          customer?.phone,
          customer?.email,
          project.id === selectedProjectId ? selectedVersionText : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase();

        return searchable.includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (statusFilter === "trash") {
          const leftDeletedAt = new Date(left.deleted_at || 0).getTime() || 0;
          const rightDeletedAt = new Date(right.deleted_at || 0).getTime() || 0;
          return rightDeletedAt - leftDeletedAt;
        }

        const priorityDifference = getProjectSortPriority(left) - getProjectSortPriority(right);
        if (priorityDifference !== 0) return priorityDifference;

        const leftTime = new Date(left.recentActivityAt || left.updated_at || left.created_at).getTime() || 0;
        const rightTime = new Date(right.recentActivityAt || right.updated_at || right.created_at).getTime() || 0;
        return rightTime - leftTime;
      });
  }, [
    detail.estimateVersions,
    projects,
    searchQuery,
    selectedProjectId,
    statusFilter,
  ]);
  const trashCount = useMemo(
    () => projects.filter(isDeletedProject).length,
    [projects]
  );

  useEffect(() => {
    if (filteredProjects.some((project) => project.id === selectedProjectId)) return;
    setSelectedProjectId(filteredProjects[0]?.id || "");
    setActiveTab("overview");
    setEstimateRequestView("estimates");
    setMobileDetailOpen(false);
  }, [filteredProjects, selectedProjectId]);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      if (!selectedProject) {
        setDetail(EMPTY_DETAIL);
        return;
      }

      setDetailLoading(true);
      setDetailError("");
      setDetail(EMPTY_DETAIL);
      setSelectedRequestId("");
      try {
        const nextDetail = await fetchCustomerProjectDetail({
          companyId,
          customerId: selectedProject.customer_id,
          projectId: selectedProject.id,
        });
        if (!active) return;
        setDetail(nextDetail);
        setSelectedRequestId((current) => (
          nextDetail.requests.some((request) => request.id === current)
            ? current
            : nextDetail.requests[0]?.id || ""
        ));
      } catch (loadError) {
        if (!active) return;
        setDetail(EMPTY_DETAIL);
        setDetailError(loadError?.message || "고객·현장 상세를 불러오지 못했습니다.");
      } finally {
        if (active) setDetailLoading(false);
      }
    }

    loadDetail();
    return () => {
      active = false;
    };
  }, [companyId, selectedProject]);

  const detailProject = detail.project || selectedProject;
  const isTrashProject = Boolean(detailProject?.deleted_at);
  const selectedTrashImpact = detailProject?.id
    ? projectTrashImpacts[detailProject.id] ?? null
    : null;
  const selectedCustomer = getRelationRow(detailProject?.customer);
  const selectedRequest = useMemo(
    () => detail.requests.find((request) => request.id === selectedRequestId) ?? null,
    [detail.requests, selectedRequestId]
  );
  const openRequests = useMemo(
    () => detail.requests.filter((request) => isOpenCustomerRequest(request.status)),
    [detail.requests]
  );
  const recentEstimate = detail.estimateVersions[0] ?? null;

  const activityItems = useMemo(() => {
    const messages = detail.messages.map((message) => {
      const versionLabel = getEstimateVersionLabel(getRelationRow(message.estimate_version));
      return {
        id: `message-${message.id}`,
        type: "message",
        title: operationStatusViews.messageType(message.message_type).label,
        description: versionLabel !== "-"
          ? versionLabel
          : operationStatusViews.messageChannel(message.channel).label,
        createdAt: message.sent_at || message.created_at,
      };
    });
    const timeline = detail.timelineEvents.map((event) => ({
      id: `timeline-${event.id}`,
      type: "timeline",
      title: getCustomerOperationText(
        event.title,
        operationStatusViews.timeline(event.event_type).label
      ),
      description: getSafeActivityDescription(
        event.description,
        operationStatusViews.timeline(event.event_type).label
      ),
      createdAt: event.created_at,
    }));

    return [...messages, ...timeline].sort((left, right) => (
      (new Date(right.createdAt).getTime() || 0) - (new Date(left.createdAt).getTime() || 0)
    ));
  }, [detail.messages, detail.timelineEvents]);

  const filteredActivityItems = useMemo(() => activityItems.filter((item) => {
    if (activityFilter === "messages") return item.type === "message";
    if (activityFilter === "status") return item.type === "timeline";
    return true;
  }), [activityFilter, activityItems]);

  useEffect(() => {
    setRequestMemo(selectedRequest?.internal_memo || "");
    setRequestError("");
    setRequestNotice("");
  }, [selectedRequestId, selectedRequest?.internal_memo]);

  useEffect(() => {
    if (detailContentRef.current) detailContentRef.current.scrollTop = 0;
    setActivityOpen(false);
    setProjectMenuOpen(false);
    setProjectStatusConfirm("");
    setProjectStatusError("");
    setProjectTrashDialog(null);
    setProjectTrashError("");
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProject?.deleted_at || projectTrashImpacts[selectedProject.id]) return;
    loadProjectTrashImpact(selectedProject);
  }, [companyId, projectTrashImpacts, selectedProject]);

  useEffect(() => {
    if (!projectMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!projectMenuRef.current?.contains(event.target)) setProjectMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setProjectMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [projectMenuOpen]);

  useEffect(() => {
    if (!activityOpen) return undefined;

    const focusFrame = window.requestAnimationFrame(() => {
      activityDrawerRef.current?.querySelector("button")?.focus();
    });
    const handleDrawerKeyDown = (event) => {
      if (event.key === "Escape") setActivityOpen(false);
    };
    document.addEventListener("keydown", handleDrawerKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDrawerKeyDown);
      window.requestAnimationFrame(() => activityTriggerRef.current?.focus());
    };
  }, [activityOpen]);

  const selectProject = (projectId) => {
    setSelectedProjectId(projectId);
    setActiveTab("overview");
    setEstimateRequestView("estimates");
    setCopyNotice("");
    setProjectTrashError("");
    setMobileDetailOpen(true);
  };

  const showEstimateRecords = () => {
    setActiveTab("estimates-requests");
    setEstimateRequestView("estimates");
  };

  const showRequestRecord = (requestId) => {
    setSelectedRequestId(requestId);
    setActiveTab("estimates-requests");
    setEstimateRequestView("requests");
  };

  const handleCopyContact = async () => {
    if (!selectedCustomer?.phone) return;
    try {
      await navigator.clipboard.writeText(selectedCustomer.phone);
      setCopyNotice("연락처를 복사했습니다.");
    } catch {
      setCopyNotice("연락처를 복사하지 못했습니다.");
    }
  };

  const handleRequestStatusChange = async (status) => {
    if (!selectedRequest) return;

    setRequestProcessing(true);
    setRequestError("");
    setRequestNotice("");
    try {
      const updatedRequest = await updateCustomerRequestStatus({
        companyId,
        requestId: selectedRequest.id,
        status,
        internalMemo: requestMemo,
      });
      setDetail((current) => ({
        ...current,
        requests: current.requests.map((request) => (
          request.id === updatedRequest.id ? updatedRequest : request
        )),
      }));
      setProjects((current) => current.map((project) => (
        project.id === selectedProjectId
          ? {
              ...project,
              openRequestCount: detail.requests.reduce((count, request) => (
                count + (
                  request.id === updatedRequest.id
                    ? Number(isOpenCustomerRequest(updatedRequest.status))
                    : Number(isOpenCustomerRequest(request.status))
                )
              ), 0),
            }
          : project
      )));
      setRequestMemo(updatedRequest.internal_memo || "");
      if (status === "closed") {
        setRequestNotice("요청을 완료했습니다.");
      } else if (
        ["completed", "rejected"].includes(
          getCustomerRequestLogicalStatus(selectedRequest.status)
        )
      ) {
        setRequestNotice("요청을 다시 열었습니다.");
      }
    } catch (updateError) {
      setRequestError("요청 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setRequestProcessing(false);
    }
  };

  const handleProjectStatusChange = async (status) => {
    if (!detailProject?.id || projectStatusProcessing) return;

    const projectId = detailProject.id;
    setProjectStatusProcessing(true);
    setProjectStatusError("");
    setProjectStatusNotice("");
    try {
      const result = await updateProjectStatus({
        companyId,
        projectId,
        status,
      });
      const nextStatus = result.status || status;
      const now = new Date().toISOString();
      const projectPatch = {
        construction_status: nextStatus,
        completed_at: nextStatus === "completed" ? now : null,
        cancelled_at: nextStatus === "cancelled" ? now : null,
        updated_at: now,
        recentActivityAt: now,
      };

      setProjects((current) => current.map((project) => (
        project.id === projectId ? { ...project, ...projectPatch } : project
      )));
      setDetail((current) => ({
        ...current,
        project: current.project?.id === projectId
          ? { ...current.project, ...projectPatch }
          : current.project,
      }));
      setProjectMenuOpen(false);
      setProjectStatusConfirm("");
      if (nextStatus === "completed") {
        setProjectStatusNotice("현장을 완료 처리했습니다.");
      } else if (nextStatus === "cancelled") {
        setProjectStatusNotice("현장을 취소 처리했습니다.");
      } else {
        setProjectStatusNotice("현장을 다시 진행 상태로 변경했습니다.");
      }
    } catch (statusError) {
      setProjectStatusError("현장 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setProjectStatusProcessing(false);
    }
  };

  async function loadProjectTrashImpact(project, { openDialog = false } = {}) {
    if (!project?.id || projectTrashImpactLoadingId) return null;

    const cachedImpact = projectTrashImpacts[project.id];
    if (cachedImpact) {
      if (openDialog) {
        setProjectTrashDialog({ mode: "trash", project });
        setProjectMenuOpen(false);
      }
      return cachedImpact;
    }

    setProjectTrashImpactLoadingId(project.id);
    setProjectTrashError("");
    try {
      const impact = await getProjectTrashImpact({
        companyId,
        projectId: project.id,
      });
      setProjectTrashImpacts((current) => ({
        ...current,
        [project.id]: impact,
      }));
      if (openDialog) {
        setProjectTrashDialog({ mode: "trash", project });
        setProjectMenuOpen(false);
      }
      return impact;
    } catch (impactError) {
      setProjectMenuOpen(false);
      setProjectTrashError("현장 영향 범위를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return null;
    } finally {
      setProjectTrashImpactLoadingId("");
    }
  }

  const handleMoveProjectToTrash = async () => {
    const project = projectTrashDialog?.project;
    if (!project?.id || projectTrashProcessing) return;

    setProjectTrashProcessing(true);
    setProjectTrashError("");
    setProjectStatusNotice("");
    try {
      const result = await moveProjectToTrash({
        companyId,
        projectId: project.id,
      });
      const deletedAt = result.deletedAt || new Date().toISOString();
      const projectPatch = {
        deleted_at: deletedAt,
        updated_at: deletedAt,
        recentActivityAt: deletedAt,
      };

      setProjects((current) => current.map((row) => (
        row.id === project.id ? { ...row, ...projectPatch } : row
      )));
      setDetail((current) => ({
        ...current,
        project: current.project?.id === project.id
          ? { ...current.project, ...projectPatch }
          : current.project,
      }));
      setProjectTrashDialog(null);
      setProjectMenuOpen(false);
      setProjectStatusNotice("현장을 휴지통으로 이동했습니다.");
    } catch (trashError) {
      setProjectTrashError(
        "현장을 휴지통으로 이동하지 못했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setProjectTrashProcessing(false);
    }
  };

  const handleRestoreProject = async () => {
    const project = projectTrashDialog?.project;
    if (!project?.id || projectTrashProcessing) return;

    setProjectTrashProcessing(true);
    setProjectTrashError("");
    setProjectStatusNotice("");
    try {
      await restoreProjectFromTrash({
        companyId,
        projectId: project.id,
      });
      const restoredAt = new Date().toISOString();
      const projectPatch = {
        deleted_at: null,
        deleted_by: null,
        updated_at: restoredAt,
        recentActivityAt: restoredAt,
      };

      setProjects((current) => current.map((row) => (
        row.id === project.id ? { ...row, ...projectPatch } : row
      )));
      setDetail((current) => ({
        ...current,
        project: current.project?.id === project.id
          ? { ...current.project, ...projectPatch }
          : current.project,
      }));
      setProjectTrashImpacts((current) => {
        const next = { ...current };
        delete next[project.id];
        return next;
      });
      setProjectTrashDialog(null);
      setProjectStatusNotice("현장을 복원했습니다.");
    } catch (restoreError) {
      setProjectTrashError("현장을 복원하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setProjectTrashProcessing(false);
    }
  };

  const renderOverview = () => {
    const recentActivity = activityItems[0];
    const summaryItems = [
      openRequests.length > 0 ? `미처리 요청 ${openRequests.length}` : "",
      recentEstimate ? `최근 견적 ${getEstimateVersionLabel(recentEstimate)}` : "",
      recentActivity ? `최근 활동 ${formatRelativeActivity(recentActivity.createdAt)}` : "",
    ].filter(Boolean);

    return (
      <div className="customer-projects-workspace__record-document">
        {isTrashProject ? (
          <section>
            <h3>연결 데이터</h3>
            {projectTrashImpactLoadingId === detailProject.id && !selectedTrashImpact ? (
              <p className="customer-projects-workspace__impact-loading" role="status">
                연결된 데이터 수량을 확인하는 중
              </p>
            ) : selectedTrashImpact ? (
              <dl className="customer-projects-workspace__impact-list">
                <div><dt>연결된 견적</dt><dd>{selectedTrashImpact.estimateCount || 0}건</dd></div>
                <div><dt>받은 요청</dt><dd>{selectedTrashImpact.totalRequestCount || 0}건</dd></div>
                <div><dt>처리되지 않은 요청</dt><dd>{selectedTrashImpact.pendingRequestCount || 0}건</dd></div>
                <div><dt>메시지</dt><dd>{selectedTrashImpact.messageCount || 0}건</dd></div>
                <div><dt>활동 기록</dt><dd>{selectedTrashImpact.activityCount || 0}건</dd></div>
                <div><dt>활성 공유 링크</dt><dd>{selectedTrashImpact.activeShareLinkCount || 0}건</dd></div>
              </dl>
            ) : (
              <p className="customer-projects-workspace__impact-loading">
                연결된 데이터 수량을 표시하지 못했습니다.
              </p>
            )}
          </section>
        ) : null}

        <section>
          <h3>핵심 요약</h3>
          {summaryItems.length > 0 ? (
            <div className="customer-projects-workspace__summary-line">
              {summaryItems.map((item) => <span key={item}>{item}</span>)}
            </div>
          ) : (
            <QuietEmpty>요약할 현장 기록이 없습니다.</QuietEmpty>
          )}
        </section>

        <section>
          <h3>고객 정보</h3>
          <dl className="customer-projects-workspace__definition-list">
            {selectedCustomer?.name ? <div><dt>고객명</dt><dd>{selectedCustomer.name}</dd></div> : null}
            {selectedCustomer?.phone ? <div><dt>연락처</dt><dd>{selectedCustomer.phone}</dd></div> : null}
            {selectedCustomer?.email ? <div><dt>이메일</dt><dd>{selectedCustomer.email}</dd></div> : null}
          </dl>
        </section>

        <section>
          <h3>현장 정보</h3>
          <dl className="customer-projects-workspace__definition-list">
            <div><dt>현장명</dt><dd>{getProjectTitle(detailProject)}</dd></div>
            {getProjectAddressText(detailProject) ? (
              <div><dt>주소</dt><dd>{getProjectAddressText(detailProject)}</dd></div>
            ) : null}
          </dl>
        </section>

        <section>
          <h3>업무 상태</h3>
          <dl className="customer-projects-workspace__definition-list">
            <div>
              <dt>견적</dt>
              <dd><StatusText status={operationStatusViews.estimate(detailProject?.estimate_status)} /></dd>
            </div>
            <div>
              <dt>계약</dt>
              <dd><StatusText status={operationStatusViews.contract(detailProject?.contract_status)} /></dd>
            </div>
            <div>
              <dt>공사</dt>
              <dd><StatusText status={operationStatusViews.construction(detailProject?.construction_status)} /></dd>
            </div>
          </dl>
        </section>

        <section>
          <div className="customer-projects-workspace__section-heading">
            <h3>최근 견적</h3>
            {recentEstimate ? (
              <button type="button" onClick={showEstimateRecords}>견적 기록 보기</button>
            ) : null}
          </div>
          {recentEstimate ? (
            <div className="customer-projects-workspace__recent-estimate">
              <div>
                <strong>{getEstimateVersionLabel(recentEstimate)}</strong>
                <StatusText status={operationStatusViews.estimate(recentEstimate.status)} />
              </div>
              <PriceText value={recentEstimate.total_amount || 0} size="sm" />
            </div>
          ) : (
            <QuietEmpty>등록된 견적서가 없습니다.</QuietEmpty>
          )}
        </section>

        <section>
          <h3>미처리 요청</h3>
          {openRequests.length > 0 ? (
            <div className="customer-projects-workspace__compact-list">
              {openRequests.slice(0, 3).map((request) => (
                <button type="button" key={request.id} onClick={() => showRequestRecord(request.id)}>
                  <span>
                    <strong>
                      {getCustomerOperationText(
                        request.title,
                        operationStatusViews.requestType(request.request_type).label
                      )}
                    </strong>
                    <small>{operationStatusViews.requestType(request.request_type).label}</small>
                  </span>
                  <StatusText status={operationStatusViews.request(request.status)} />
                  <time>{formatOperationDateTime(request.created_at)}</time>
                </button>
              ))}
            </div>
          ) : (
            <QuietEmpty>처리가 필요한 고객 요청이 없습니다.</QuietEmpty>
          )}
        </section>

        <section>
          <h3>최근 활동</h3>
          {activityItems.length > 0 ? (
            <div className="customer-projects-workspace__compact-activity">
              {activityItems.slice(0, 3).map((item) => (
                <div key={item.id}>
                  <span>
                    <strong>{item.title}</strong>
                    {item.description ? <small>{item.description}</small> : null}
                  </span>
                  <time>{formatOperationDateTime(item.createdAt)}</time>
                </div>
              ))}
            </div>
          ) : (
            <QuietEmpty>최근 활동 기록이 없습니다.</QuietEmpty>
          )}
        </section>
      </div>
    );
  };

  const renderRequests = () => {
    if (detail.requests.length === 0) {
      return <QuietEmpty>접수된 문의·변경 요청이 없습니다.</QuietEmpty>;
    }

    return (
      <div className="customer-projects-workspace__request-workspace">
        <div className="customer-projects-workspace__request-list">
          {detail.requests.map((request) => (
            <button
              type="button"
              className={request.id === selectedRequestId ? "is-selected" : ""}
              key={request.id}
              onClick={() => setSelectedRequestId(request.id)}
            >
              <span>
                <strong>
                  {getCustomerOperationText(
                    request.title,
                    operationStatusViews.requestType(request.request_type).label
                  )}
                </strong>
                <small>
                  {[getEstimateReference(request), request.body]
                    .filter((value) => value && value !== "-")
                    .join(" · ") || "요청 내용이 입력되지 않았습니다."}
                </small>
              </span>
              <StatusText status={operationStatusViews.request(request.status)} />
              <time>{formatOperationDateTime(request.created_at)}</time>
            </button>
          ))}
        </div>

        {selectedRequest ? (
          <div className="customer-projects-workspace__request-detail">
            <section>
              <h3>요청 내용</h3>
              <p>{selectedRequest.body || "요청 내용이 입력되지 않았습니다."}</p>
              {selectedRequest.related_item_label ? (
                <small>관련 항목 {selectedRequest.related_item_label}</small>
              ) : null}
            </section>
            {!isTrashProject ? (
              <RequestProcessingControls
                request={selectedRequest}
                memo={requestMemo}
                onMemoChange={setRequestMemo}
                onStatusChange={handleRequestStatusChange}
                processing={requestProcessing}
                error={requestError}
                notice={requestNotice}
              />
            ) : (
              <p className="customer-projects-workspace__readonly-note">
                휴지통의 현장은 읽기 전용입니다.
              </p>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const renderEstimatesRequests = () => (
    <div className="customer-projects-workspace__combined-tab">
      <div className="customer-projects-workspace__subtabs" role="tablist" aria-label="견적과 요청">
        <button
          type="button"
          role="tab"
          aria-selected={estimateRequestView === "estimates"}
          onClick={() => setEstimateRequestView("estimates")}
        >
          견적서
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={estimateRequestView === "requests"}
          onClick={() => setEstimateRequestView("requests")}
        >
          문의·변경 요청
        </button>
      </div>
      {estimateRequestView === "estimates"
        ? <EstimateVersionsList versions={detail.estimateVersions} accessTokens={detail.accessTokens} />
        : renderRequests()}
    </div>
  );

  const renderConstruction = () => (
    <div className="customer-projects-workspace__record-document">
      <section>
        <h3>현재 공사 상태</h3>
        <dl className="customer-projects-workspace__definition-list">
          <div>
            <dt>상태</dt>
            <dd><StatusText status={operationStatusViews.construction(detailProject?.construction_status)} /></dd>
          </div>
          {detailProject?.construction_start_date ? (
            <div>
              <dt>착공일</dt>
              <dd>{formatOperationDateTime(detailProject.construction_start_date)}</dd>
            </div>
          ) : null}
          {detailProject?.construction_completed_date ? (
            <div>
              <dt>완료일</dt>
              <dd>{formatOperationDateTime(detailProject.construction_completed_date)}</dd>
            </div>
          ) : null}
        </dl>
      </section>
      <section>
        <h3>변경공사</h3>
        <QuietEmpty>등록된 변경공사가 없습니다.</QuietEmpty>
      </section>
      <section>
        <h3>현장 사진·메모</h3>
        {detailProject?.memo ? <p>{detailProject.memo}</p> : <QuietEmpty>등록된 사진·메모가 없습니다.</QuietEmpty>}
      </section>
    </div>
  );

  const renderAftercare = () => {
    const hasAftercare = detailProject?.aftercare_status
      && detailProject.aftercare_status !== "not_started";
    const hasService = detailProject?.service_status
      && detailProject.service_status !== "not_started";

    if (!hasAftercare && !hasService) {
      return <QuietEmpty>등록된 사후관리 또는 A/S 내역이 없습니다.</QuietEmpty>;
    }

    return (
      <div className="customer-projects-workspace__record-document">
        <section>
          <h3>사후관리·A/S 상태</h3>
          <dl className="customer-projects-workspace__definition-list">
            {hasAftercare ? (
              <div>
                <dt>사후관리</dt>
                <dd><StatusText status={operationStatusViews.aftercare(detailProject.aftercare_status)} /></dd>
              </div>
            ) : null}
            {hasService ? (
              <div>
                <dt>A/S</dt>
                <dd><StatusText status={operationStatusViews.service(detailProject.service_status)} /></dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>
    );
  };

  const renderDetailContent = () => {
    if (detailLoading) {
      return <div className="customer-projects-workspace__detail-state" role="status">상세 기록을 불러오는 중</div>;
    }
    if (detailError) {
      return <p className="customer-projects-workspace__detail-error" role="alert">{detailError}</p>;
    }
    if (activeTab === "overview") return renderOverview();
    if (activeTab === "estimates-requests") return renderEstimatesRequests();
    if (activeTab === "construction") return renderConstruction();
    if (activeTab === "settlement") return <QuietEmpty>등록된 정산 내역이 없습니다.</QuietEmpty>;
    if (activeTab === "aftercare") return renderAftercare();
    return null;
  };

  const lifecycleStatus = getProjectLifecycleStatus(detailProject);
  const projectAddress = getProjectAddressText(detailProject);

  return (
    <main className="customer-operations-page customer-projects-workspace-page">
      <PageHeader
        title="고객·현장"
        description="고객과 연결된 현장의 견적, 요청, 공사 기록을 확인합니다."
      />

      <section className="customer-projects-workspace__toolbar" aria-label="현장 검색과 필터">
        <label className="customer-projects-workspace__search">
          <span className="customer-projects-workspace__visually-hidden">현장 검색</span>
          <Search size={16} strokeWidth={1.5} aria-hidden="true" />
          <input
            value={searchQuery}
            placeholder="고객, 현장, 주소, 견적번호 검색"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        <label className="customer-projects-workspace__filter">
          <span className="customer-projects-workspace__visually-hidden">현장 상태 필터</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {PROJECT_FILTERS.map((filter) => (
              <option value={filter.value} key={filter.value}>
                {filter.value === "trash" ? `${filter.label} ${trashCount}` : filter.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {projectStatusNotice ? (
        <div className="customer-projects-workspace__status-notice" role="status">
          {projectStatusNotice}
        </div>
      ) : null}
      {projectStatusError && !projectStatusConfirm ? (
        <div className="customer-projects-workspace__status-notice is-error" role="alert">
          {projectStatusError}
        </div>
      ) : null}
      {projectTrashError && !projectTrashDialog ? (
        <div className="customer-projects-workspace__status-notice is-error" role="alert">
          {projectTrashError}
        </div>
      ) : null}

      <section
        className={`customer-projects-workspace__surface ${mobileDetailOpen ? "is-detail-open" : ""}`.trim()}
        aria-label="고객과 현장 기록"
      >
        <aside className="customer-projects-workspace__list-pane" aria-label="현장 목록">
          <header>
            <strong>현장 목록</strong>
            <span>{filteredProjects.length}건</span>
          </header>
          <div className="customer-projects-workspace__list-scroll">
            {loading ? (
              <div className="customer-projects-workspace__list-state" role="status">현장을 불러오는 중</div>
            ) : error ? (
              <div className="customer-projects-workspace__list-state is-error">
                <span>고객·현장 목록을 불러오지 못했습니다.</span>
                <Button variant="secondary" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
                  다시 불러오기
                </Button>
              </div>
            ) : projects.length === 0 ? (
              <div className="customer-projects-workspace__list-state">등록된 고객·현장이 없습니다</div>
            ) : filteredProjects.length === 0 ? (
              <div className="customer-projects-workspace__list-state">현재 조건에 맞는 현장이 없습니다</div>
            ) : (
              filteredProjects.map((project) => {
                const customer = getRelationRow(project.customer);
                const projectStage = getProjectLifecycleStatus(project);
                const selected = project.id === selectedProjectId;
                const address = getProjectAddressText(project);

                return (
                  <button
                    type="button"
                    className={[
                      "customer-projects-workspace__project-row",
                      selected ? "is-selected" : "",
                      project.deleted_at ? "is-trash" : "",
                    ].filter(Boolean).join(" ")}
                    aria-current={selected ? "true" : undefined}
                    key={project.id}
                    onClick={() => selectProject(project.id)}
                  >
                    <span className="customer-projects-workspace__project-line">
                      <strong>{getProjectTitle(project)}</strong>
                      {Number(project.openRequestCount) > 0 ? (
                        <small>요청 {project.openRequestCount}</small>
                      ) : null}
                    </span>
                    <span className="customer-projects-workspace__project-address">
                      {address || "주소 정보 없음"}
                    </span>
                    <span className="customer-projects-workspace__project-line customer-projects-workspace__project-line--meta">
                      <span>
                        {customer?.name ? `${customer.name} 고객` : "고객 정보 없음"}
                        {" · "}
                        <StatusText status={projectStage} />
                      </span>
                      <time>
                        {formatRelativeActivity(
                          project.deleted_at || project.recentActivityAt
                        )}
                      </time>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <article className="customer-projects-workspace__detail-pane" aria-label="현장 상세">
          {detailProject ? (
            <>
              <header className="customer-projects-workspace__detail-header">
                <button
                  type="button"
                  className="customer-projects-workspace__back"
                  onClick={() => setMobileDetailOpen(false)}
                >
                  <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" />
                  현장 목록
                </button>
                <div className="customer-projects-workspace__detail-heading">
                  <h2>{getProjectTitle(detailProject)}</h2>
                  <p>
                    {[projectAddress, selectedCustomer?.name ? `${selectedCustomer.name} 고객` : "", selectedCustomer?.phone]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <StatusText status={lifecycleStatus} />
                  {isTrashProject ? (
                    <time className="customer-projects-workspace__deleted-at">
                      삭제일 {formatOperationDateTime(detailProject.deleted_at)}
                    </time>
                  ) : null}
                </div>
                <div className="customer-projects-workspace__detail-actions">
                  {isTrashProject ? (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<RotateCcw />}
                      onClick={() => {
                        setProjectTrashError("");
                        setProjectTrashDialog({ mode: "restore", project: detailProject });
                      }}
                    >
                      복원
                    </Button>
                  ) : (
                    <>
                      {recentEstimate ? (
                        <Button variant="secondary" size="sm" onClick={showEstimateRecords}>
                          최근 견적 보기
                        </Button>
                      ) : null}
                      {selectedCustomer?.phone ? (
                        <Button variant="secondary" size="sm" leftIcon={<Copy />} onClick={handleCopyContact}>
                          연락처 복사
                        </Button>
                      ) : null}
                      <Button
                        variant="tertiary"
                        size="sm"
                        leftIcon={<Activity />}
                        onClick={(event) => {
                          activityTriggerRef.current = event.currentTarget;
                          setActivityOpen(true);
                        }}
                      >
                        활동
                      </Button>
                      <div className="customer-projects-workspace__project-menu" ref={projectMenuRef}>
                        <button
                          type="button"
                          className="customer-projects-workspace__project-menu-trigger"
                          aria-label="현장 상태 메뉴"
                          aria-haspopup="menu"
                          aria-expanded={projectMenuOpen}
                          onClick={() => setProjectMenuOpen((current) => !current)}
                        >
                          <MoreHorizontal size={18} strokeWidth={1.5} aria-hidden="true" />
                        </button>
                        {projectMenuOpen ? (
                          <div className="customer-projects-workspace__project-menu-popover" role="menu">
                            {["completed", "cancelled"].includes(detailProject.construction_status) ? (
                              <button
                                type="button"
                                role="menuitem"
                                disabled={projectStatusProcessing}
                                onClick={() => handleProjectStatusChange("in_progress")}
                              >
                                <RotateCcw size={16} strokeWidth={1.5} aria-hidden="true" />
                                다시 진행 처리
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={projectStatusProcessing}
                                  onClick={() => {
                                    setProjectStatusError("");
                                    setProjectStatusConfirm("completed");
                                    setProjectMenuOpen(false);
                                  }}
                                >
                                  현장 완료 처리
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="is-danger"
                                  disabled={projectStatusProcessing}
                                  onClick={() => {
                                    setProjectStatusError("");
                                    setProjectStatusConfirm("cancelled");
                                    setProjectMenuOpen(false);
                                  }}
                                >
                                  현장 취소
                                </button>
                              </>
                            )}
                            <span className="customer-projects-workspace__project-menu-separator" />
                            <button
                              type="button"
                              role="menuitem"
                              className="is-danger"
                              disabled={Boolean(projectTrashImpactLoadingId)}
                              onClick={() => loadProjectTrashImpact(detailProject, { openDialog: true })}
                            >
                              <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
                              {projectTrashImpactLoadingId === detailProject.id
                                ? "영향 확인 중..."
                                : "현장 휴지통으로 이동"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {copyNotice ? <span role="status">{copyNotice}</span> : null}
                    </>
                  )}
                </div>
              </header>

              <div className="customer-projects-workspace__tabs" role="tablist" aria-label="현장 상세 메뉴">
                {PROJECT_TABS.map((tab) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="customer-projects-workspace__detail-scroll" ref={detailContentRef}>
                {renderDetailContent()}
              </div>
            </>
          ) : (
            <div className="customer-projects-workspace__detail-state">
              현장을 선택하면 관련 기록을 확인할 수 있습니다
            </div>
          )}
        </article>
      </section>

      {activityOpen ? (
        <div className="customer-projects-workspace__drawer-backdrop" onClick={() => setActivityOpen(false)}>
          <aside
            ref={activityDrawerRef}
            className="customer-projects-workspace__drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-projects-activity-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2 id="customer-projects-activity-title">활동</h2>
              <button type="button" aria-label="활동 닫기" onClick={() => setActivityOpen(false)}>
                <X size={18} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </header>
            <div className="customer-projects-workspace__drawer-filters" role="tablist" aria-label="활동 필터">
              {[
                { value: "all", label: "전체" },
                { value: "messages", label: "메시지" },
                { value: "status", label: "상태 변경" },
              ].map((filter) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activityFilter === filter.value}
                  key={filter.value}
                  onClick={() => setActivityFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="customer-projects-workspace__drawer-list">
              {filteredActivityItems.length > 0 ? (
                filteredActivityItems.map((item) => (
                  <div key={item.id}>
                    <span className={`is-${item.type}`} aria-hidden="true" />
                    <p>
                      <strong>{item.title}</strong>
                      {item.description ? <span>{item.description}</span> : null}
                      <time>{formatRelativeActivity(item.createdAt)}</time>
                    </p>
                  </div>
                ))
              ) : (
                <QuietEmpty>표시할 활동 기록이 없습니다.</QuietEmpty>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {projectStatusConfirm ? (
        <ProjectStatusConfirmDialog
          status={projectStatusConfirm}
          projectName={getProjectTitle(detailProject)}
          processing={projectStatusProcessing}
          error={projectStatusError}
          onClose={() => {
            if (projectStatusProcessing) return;
            setProjectStatusConfirm("");
            setProjectStatusError("");
          }}
          onConfirm={() => handleProjectStatusChange(projectStatusConfirm)}
        />
      ) : null}

      {projectTrashDialog ? (
        <ProjectTrashDialog
          mode={projectTrashDialog.mode}
          projectName={getProjectTitle(projectTrashDialog.project)}
          impact={projectTrashImpacts[projectTrashDialog.project.id]}
          processing={projectTrashProcessing}
          error={projectTrashError}
          onClose={() => {
            if (projectTrashProcessing) return;
            setProjectTrashDialog(null);
            setProjectTrashError("");
          }}
          onConfirm={
            projectTrashDialog.mode === "restore"
              ? handleRestoreProject
              : handleMoveProjectToTrash
          }
        />
      ) : null}
    </main>
  );
}
