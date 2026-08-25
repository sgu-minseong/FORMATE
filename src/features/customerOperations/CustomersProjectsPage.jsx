import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Copy,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import PriceText from "../../components/PriceText";
import { isApprovedCurrentEstimateVersion } from "../contracts/contractModel";
import AftercareRecordDialog from "./AftercareRecordDialog";
import {
  createAftercareSchedule,
  createServiceRequest,
  fetchCustomerProjectDetail,
  fetchCustomersProjects,
  getProjectTrashImpact,
  moveProjectToTrash,
  restoreProjectFromTrash,
  updateConsultationStatus,
  updateContractStatus,
  updateProjectStatus,
} from "./api";
import ProjectStatusConfirmDialog from "./ProjectStatusConfirmDialog";
import ProjectTrashDialog from "./ProjectTrashDialog";
import { StatusText } from "./components";
import { CUSTOMER_OPERATIONS_PAGES } from "./constants";
import {
  formatOperationDate,
  formatOperationDateTime,
  getAftercareScheduleTitle,
  getCustomerOperationText,
  getContractLifecycleView,
  getEstimateReference,
  getEstimateVersionLabel,
  getRelationRow,
  isActiveProjectStatus,
  isDeletedProject,
  isOpenCustomerRequest,
  isServiceRequestInWorkspaceView,
  operationStatusViews,
} from "./utils";

const EMPTY_DETAIL = {
  project: null,
  estimateVersions: [],
  requests: [],
  messages: [],
  timelineEvents: [],
  changeOrders: [],
  aftercareSchedules: [],
  serviceRequests: [],
  consultations: [],
  contracts: [],
};

const PROJECT_TABS = [
  { key: "overview", label: "개요" },
  { key: "estimates", label: "견적" },
  { key: "requests", label: "요청" },
  { key: "construction", label: "공사" },
  { key: "settlement", label: "정산" },
  { key: "aftercare", label: "사후관리" },
];

const VISIBLE_TIMELINE_EVENT_TYPES = new Set([
  "estimate_created",
  "estimate_sent",
  "estimate_viewed",
  "request_received",
  "request_updated",
  "change_order_created",
  "change_order_approved",
  "construction_updated",
  "aftercare_scheduled",
  "service_requested",
  "service_updated",
  "note",
]);

const VISIBLE_MESSAGE_TYPES = new Set([
  "request_reply",
  "schedule_notice",
  "aftercare",
  "service_update",
  "manual",
  "other",
]);

const CHANGE_ORDER_STATUS_LABELS = {
  draft: "작성 중",
  awaiting_approval: "승인 대기",
  approved: "승인",
  rejected: "반려",
  completed: "완료",
  cancelled: "취소",
};

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

function normalizeComparableText(value) {
  return `${value || ""}`
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function shouldShowProjectAddress(project) {
  const address = getProjectAddressText(project);
  if (!address) return false;
  return normalizeComparableText(getProjectTitle(project)) !== normalizeComparableText(address);
}

function getProjectScheduleText(project) {
  if (!project) return "";
  if (project.construction_status === "cancelled" && project.cancelled_at) {
    return `취소일 ${formatOperationDate(project.cancelled_at)}`;
  }
  if (project.construction_status === "completed") {
    const completedAt = project.completed_at || project.construction_completed_date;
    return completedAt ? `완료일 ${formatOperationDate(completedAt)}` : "";
  }
  if (project.construction_start_date) {
    const prefix = project.construction_status === "in_progress" ? "착공" : "착공 예정";
    return `${prefix} ${formatOperationDate(project.construction_start_date)}`;
  }
  return "";
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

function EstimateVersionsList({ versions, onOpenEstimate }) {
  if (versions.length === 0) {
    return <QuietEmpty>이 현장에 연결된 견적이 없습니다.</QuietEmpty>;
  }

  return (
    <div className="customer-projects-workspace__estimate-list" aria-label="견적서 버전 목록">
      {versions.map((version) => (
        <div className="customer-projects-workspace__estimate-row" key={version.id}>
          <div>
            <strong>{getEstimateVersionLabel(version)}</strong>
            <span>{formatOperationDate(version.created_at)}</span>
          </div>
          <StatusText status={operationStatusViews.estimate(version.status)} />
          <PriceText value={version.total_amount || 0} size="sm" />
          {onOpenEstimate ? (
            <button type="button" onClick={() => onOpenEstimate(version)}>보기</button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function CustomersProjectsPage({ companyId, onNavigate, onOpenContract }) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState("all");
  const [copyNotice, setCopyNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [detail, setDetail] = useState(EMPTY_DETAIL);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [salesLifecycleProcessing, setSalesLifecycleProcessing] = useState(false);
  const [salesLifecycleNotice, setSalesLifecycleNotice] = useState("");
  const [salesLifecycleError, setSalesLifecycleError] = useState("");
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
  const [aftercareDialog, setAftercareDialog] = useState(null);
  const [aftercareSaving, setAftercareSaving] = useState(false);
  const [aftercareFormError, setAftercareFormError] = useState("");
  const [aftercareNotice, setAftercareNotice] = useState("");
  const detailContentRef = useRef(null);
  const activityDrawerRef = useRef(null);
  const activityTriggerRef = useRef(null);
  const infoDrawerRef = useRef(null);
  const infoTriggerRef = useRef(null);
  const projectMenuRef = useRef(null);
  const projectMenuTriggerRef = useRef(null);

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
          project.estimateSearchText,
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
    projects,
    searchQuery,
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
      try {
        const nextDetail = await fetchCustomerProjectDetail({
          companyId,
          customerId: selectedProject.customer_id,
          projectId: selectedProject.id,
        });
        if (!active) return;
        setDetail(nextDetail);
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
  const currentConsultation = detailProject?.consultation ?? detail.consultations?.[0] ?? null;
  const currentContract = detailProject?.contract ?? detail.contracts?.[0] ?? null;
  const currentContractView = getContractLifecycleView(
    currentContract,
    detailProject?.contract_status
  );
  const isTrashProject = Boolean(detailProject?.deleted_at);
  const selectedTrashImpact = detailProject?.id
    ? projectTrashImpacts[detailProject.id] ?? null
    : null;
  const selectedCustomer = getRelationRow(detailProject?.customer);
  const aftercareProjectContext = useMemo(() => (
    detailProject && selectedCustomer
      ? { ...detailProject, customer: selectedCustomer }
      : null
  ), [detailProject, selectedCustomer]);
  const openRequests = useMemo(
    () => detail.requests.filter((request) => isOpenCustomerRequest(request.status)),
    [detail.requests]
  );
  const recentEstimate = detail.estimateVersions[0] ?? null;
  const approvedCurrentEstimate = detail.estimateVersions.find(isApprovedCurrentEstimateVersion) ?? null;

  const activityItems = useMemo(() => {
    const messages = detail.messages
      .filter((message) => (
        VISIBLE_MESSAGE_TYPES.has(message.message_type)
        && message.channel !== "link_copy"
      ))
      .map((message) => {
      const versionLabel = getEstimateVersionLabel(getRelationRow(message.estimate_version));
      return {
        id: `message-${message.id}`,
        type: "message",
        eventType: message.message_type,
        title: operationStatusViews.messageType(message.message_type).label,
        description: versionLabel !== "-"
          ? versionLabel
          : operationStatusViews.messageChannel(message.channel).label,
        createdAt: message.sent_at || message.created_at,
      };
    });
    const timeline = detail.timelineEvents
      .filter((event) => VISIBLE_TIMELINE_EVENT_TYPES.has(event.event_type))
      .map((event) => ({
        id: `timeline-${event.id}`,
        type: "timeline",
        eventType: event.event_type,
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
    if (activityFilter === "customer") return item.type === "message"
      || ["estimate_viewed", "request_received", "service_requested"].includes(item.eventType);
    if (activityFilter === "status") return item.type === "timeline"
      && ["request_updated", "construction_updated", "service_updated"].includes(item.eventType);
    return true;
  }), [activityFilter, activityItems]);

  useEffect(() => {
    if (detailContentRef.current) detailContentRef.current.scrollTop = 0;
    setActivityOpen(false);
    setInfoOpen(false);
    setProjectMenuOpen(false);
    setProjectStatusConfirm("");
    setProjectStatusError("");
    setSalesLifecycleNotice("");
    setSalesLifecycleError("");
    setProjectTrashDialog(null);
    setProjectTrashError("");
    setAftercareDialog(null);
    setAftercareFormError("");
    setAftercareNotice("");
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

  useEffect(() => {
    if (!infoOpen) return undefined;

    const focusFrame = window.requestAnimationFrame(() => {
      infoDrawerRef.current?.querySelector("button")?.focus();
    });
    const handleDrawerKeyDown = (event) => {
      if (event.key === "Escape") setInfoOpen(false);
    };
    document.addEventListener("keydown", handleDrawerKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDrawerKeyDown);
      window.requestAnimationFrame(() => infoTriggerRef.current?.focus());
    };
  }, [infoOpen]);

  const selectProject = (projectId) => {
    setSelectedProjectId(projectId);
    setActiveTab("overview");
    setCopyNotice("");
    setProjectTrashError("");
    setMobileDetailOpen(true);
  };

  const showEstimateRecords = () => {
    setActiveTab("estimates");
  };

  const showRequestRecords = () => {
    setActiveTab("requests");
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

  const handleConsultationToggle = async () => {
    if (!currentConsultation?.id || salesLifecycleProcessing) return;
    const nextStatus = currentConsultation.status === "closed" ? "active" : "closed";
    const confirmMessage = nextStatus === "closed"
      ? "상담을 종료하시겠습니까? 견적·계약·공사 상태는 변경되지 않습니다."
      : "상담을 다시 여시겠습니까?";
    if (!window.confirm(confirmMessage)) return;

    setSalesLifecycleProcessing(true);
    setSalesLifecycleError("");
    setSalesLifecycleNotice("");
    try {
      const result = await updateConsultationStatus({
        companyId,
        consultationId: currentConsultation.id,
        status: nextStatus,
      });
      const patch = {
        ...currentConsultation,
        status: result.status,
        closed_at: result.closedAt ?? null,
      };
      setDetail((current) => ({
        ...current,
        consultations: [patch, ...(current.consultations ?? []).filter((row) => row.id !== patch.id)],
        project: current.project
          ? { ...current.project, consultation: patch }
          : current.project,
      }));
      setProjects((current) => current.map((project) => (
        project.id === detailProject?.id ? { ...project, consultation: patch } : project
      )));
      setSalesLifecycleNotice(nextStatus === "closed" ? "상담을 종료했습니다." : "상담을 다시 열었습니다.");
    } catch (statusError) {
      setSalesLifecycleError(statusError?.message || "상담 상태를 변경하지 못했습니다.");
    } finally {
      setSalesLifecycleProcessing(false);
    }
  };

  const handleContractTransition = async (nextStatus) => {
    if (!currentContract?.id || salesLifecycleProcessing) return;
    const message = nextStatus === "completed"
      ? "계약을 최종 확정하시겠습니까? 고객 서명만으로는 완료되지 않습니다."
      : "계약을 취소하시겠습니까? 상담과 공사 상태는 변경되지 않습니다.";
    if (!window.confirm(message)) return;

    setSalesLifecycleProcessing(true);
    setSalesLifecycleError("");
    setSalesLifecycleNotice("");
    try {
      const result = await updateContractStatus({
        companyId,
        contractId: currentContract.id,
        status: nextStatus,
      });
      const patch = { ...currentContract, status: result.status };
      setDetail((current) => ({
        ...current,
        contracts: [patch, ...(current.contracts ?? []).filter((row) => row.id !== patch.id)],
        project: current.project ? { ...current.project, contract: patch } : current.project,
      }));
      setProjects((current) => current.map((project) => (
        project.id === detailProject?.id ? { ...project, contract: patch } : project
      )));
      setSalesLifecycleNotice(nextStatus === "completed" ? "계약을 최종 확정했습니다." : "계약을 취소했습니다.");
    } catch (statusError) {
      setSalesLifecycleError(statusError?.message || "계약 상태를 변경하지 못했습니다.");
    } finally {
      setSalesLifecycleProcessing(false);
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

  const handleProjectAftercareSubmit = async (values) => {
    if (!aftercareDialog || aftercareSaving) return;
    setAftercareSaving(true);
    setAftercareFormError("");
    setAftercareNotice("");
    try {
      if (aftercareDialog.kind === "schedule") {
        const schedule = await createAftercareSchedule({
          companyId,
          ...values,
        });
        setDetail((current) => ({
          ...current,
          aftercareSchedules: [schedule, ...current.aftercareSchedules],
        }));
        setAftercareNotice("사후관리 일정을 등록했습니다.");
      } else {
        const request = await createServiceRequest({
          companyId,
          ...values,
        });
        setDetail((current) => ({
          ...current,
          serviceRequests: [request, ...current.serviceRequests],
        }));
        setAftercareNotice("A/S 요청을 등록했습니다.");
      }
      setAftercareDialog(null);
    } catch {
      setAftercareFormError("저장하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setAftercareSaving(false);
    }
  };

  const renderOverview = () => {
    const latestRequest = detail.requests[0] ?? null;
    const latestOpenRequest = openRequests[0] ?? null;
    const nextAftercare = detail.aftercareSchedules.find((schedule) => (
      schedule.next_send_date && !["completed", "cancelled"].includes(schedule.status)
    ))
      ?? null;
    const activeServiceCount = detail.serviceRequests.filter(
      (request) => (
        isServiceRequestInWorkspaceView(request.status, "service-intake")
        || isServiceRequestInWorkspaceView(request.status, "service-progress")
      )
    ).length;

    return (
      <div className="customer-projects-workspace__overview-list">
        {salesLifecycleNotice ? (
          <p className="customer-projects-workspace__aftercare-notice" role="status">
            {salesLifecycleNotice}
          </p>
        ) : null}
        {salesLifecycleError ? (
          <p className="customer-projects-workspace__form-error" role="alert">
            {salesLifecycleError}
          </p>
        ) : null}

        {isTrashProject ? (
          <div className="customer-projects-workspace__overview-row">
            <span className="customer-projects-workspace__overview-label">연결 데이터</span>
            <div className="customer-projects-workspace__overview-value">
              {projectTrashImpactLoadingId === detailProject.id && !selectedTrashImpact ? (
                <span role="status">연결된 데이터 수량을 확인하는 중</span>
              ) : selectedTrashImpact ? (
                <strong>
                  견적 {selectedTrashImpact.estimateCount || 0}건, 요청 {selectedTrashImpact.totalRequestCount || 0}건,
                  메시지 {selectedTrashImpact.messageCount || 0}건, 활동 {selectedTrashImpact.activityCount || 0}건
                </strong>
              ) : (
                <span>연결된 데이터 수량을 표시하지 못했습니다.</span>
              )}
            </div>
          </div>
        ) : null}

        <div className="customer-projects-workspace__overview-row">
          <span className="customer-projects-workspace__overview-label">상담</span>
          <div className="customer-projects-workspace__overview-value">
            <strong>
              {currentConsultation
                ? operationStatusViews.consultation(currentConsultation.status).label
                : "연결된 상담 없음"}
            </strong>
            <span>상담 상태는 견적·계약·공사 상태와 독립적으로 관리됩니다.</span>
          </div>
          {currentConsultation && !isTrashProject ? (
            <button
              type="button"
              disabled={salesLifecycleProcessing}
              onClick={handleConsultationToggle}
            >
              {currentConsultation.status === "closed" ? "상담 다시 열기" : "상담 종료"}
            </button>
          ) : null}
        </div>

        <div className="customer-projects-workspace__overview-row">
          <span className="customer-projects-workspace__overview-label">계약</span>
          <div className="customer-projects-workspace__overview-value">
            <strong>{currentContractView.label}</strong>
            <span>
              {currentContract
                ? "고객 서명과 업체 최종 확정은 별도 단계입니다."
                : "계약서가 작성되기 전에는 미작성으로 표시합니다."}
            </span>
          </div>
          <div className="customer-projects-workspace__overview-actions">
            {currentContract ? (
              <button
                type="button"
                onClick={() => onOpenContract?.({
                  contractId: currentContract.id,
                  projectId: detailProject?.id,
                  estimateVersionId: currentContract.estimate_version_id,
                  returnPage: CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS,
                })}
              >
                계약서 열기
              </button>
            ) : approvedCurrentEstimate && !isTrashProject ? (
              <button
                type="button"
                onClick={() => onOpenContract?.({
                  projectId: detailProject?.id,
                  estimateVersionId: approvedCurrentEstimate.id,
                  returnPage: CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS,
                })}
              >
                계약서 작성
              </button>
            ) : null}
            {currentContract?.status === "customer_signed" && !isTrashProject ? (
              <button
                type="button"
                disabled={salesLifecycleProcessing}
                onClick={() => handleContractTransition("completed")}
              >
                계약 최종 확정
              </button>
            ) : currentContract
              && !["completed", "cancelled"].includes(currentContract.status)
              && !isTrashProject ? (
                <button
                  type="button"
                  disabled={salesLifecycleProcessing}
                  onClick={() => handleContractTransition("cancelled")}
                >
                  계약 취소
                </button>
              ) : null}
          </div>
        </div>

        {latestOpenRequest ? (
          <div className="customer-projects-workspace__overview-row">
            <span className="customer-projects-workspace__overview-label">다음 행동</span>
            <div className="customer-projects-workspace__overview-value">
              <strong>
                {operationStatusViews.requestType(latestOpenRequest.request_type).label} {openRequests.length}건이 처리 대기 중입니다.
              </strong>
              <span>
                {getCustomerOperationText(
                  latestOpenRequest.title,
                  operationStatusViews.requestType(latestOpenRequest.request_type).label
                )}
              </span>
            </div>
            {!isTrashProject ? (
              <button type="button" onClick={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.REQUESTS)}>
                받은 요청에서 처리
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="customer-projects-workspace__overview-row">
          <span className="customer-projects-workspace__overview-label">공사 일정</span>
          <div className="customer-projects-workspace__overview-value">
            <strong>{operationStatusViews.construction(detailProject?.construction_status).label}</strong>
            <span>{getProjectScheduleText(detailProject) || "등록된 핵심 일정이 없습니다."}</span>
          </div>
          <button type="button" onClick={() => setActiveTab("construction")}>공사 보기</button>
        </div>

        <div className="customer-projects-workspace__overview-row">
          <span className="customer-projects-workspace__overview-label">최근 견적</span>
          <div className="customer-projects-workspace__overview-value">
            {recentEstimate ? (
              <>
                <strong>{getEstimateVersionLabel(recentEstimate)}</strong>
                <span>
                  {operationStatusViews.estimate(recentEstimate.status).label},
                  <PriceText value={recentEstimate.total_amount || 0} size="sm" />,
                  {formatOperationDate(recentEstimate.created_at)}
                </span>
              </>
            ) : (
              <span>이 현장에 연결된 견적이 없습니다.</span>
            )}
          </div>
          {recentEstimate ? <button type="button" onClick={showEstimateRecords}>보기</button> : null}
        </div>

        <div className="customer-projects-workspace__overview-row">
          <span className="customer-projects-workspace__overview-label">요청 이력</span>
          <div className="customer-projects-workspace__overview-value">
            {latestRequest ? (
              <>
                <strong>전체 {detail.requests.length}건</strong>
                <span>
                  {getCustomerOperationText(
                    latestRequest.title,
                    operationStatusViews.requestType(latestRequest.request_type).label
                  )}
                </span>
              </>
            ) : (
              <span>이 현장에 연결된 요청이 없습니다.</span>
            )}
          </div>
          {latestRequest ? <button type="button" onClick={showRequestRecords}>요청 보기</button> : null}
        </div>

        <div className="customer-projects-workspace__overview-row">
          <span className="customer-projects-workspace__overview-label">정산</span>
          <div className="customer-projects-workspace__overview-value">
            <strong>{currentContractView.label}</strong>
            <span>아직 등록된 정산 내역이 없습니다.</span>
          </div>
          <button type="button" onClick={() => setActiveTab("settlement")}>정산 보기</button>
        </div>

        <div className="customer-projects-workspace__overview-row">
          <span className="customer-projects-workspace__overview-label">사후관리</span>
          <div className="customer-projects-workspace__overview-value">
            {nextAftercare || activeServiceCount > 0 ? (
              <>
                <strong>
                  {activeServiceCount > 0 ? `A/S 처리 중 ${activeServiceCount}건` : "사후관리 예정"}
                </strong>
                <span>
                  {nextAftercare?.next_send_date
                    ? `다음 일정 ${formatOperationDate(nextAftercare.next_send_date)}`
                    : "등록된 다음 일정이 없습니다."}
                </span>
              </>
            ) : (
              <span>현장 완료 후 사후관리 일정을 등록할 수 있습니다.</span>
            )}
          </div>
          {(nextAftercare || activeServiceCount > 0) ? (
            <button type="button" onClick={() => setActiveTab("aftercare")}>사후관리 보기</button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderEstimates = () => (
    <EstimateVersionsList
      versions={detail.estimateVersions}
      onOpenEstimate={() => onNavigate?.("admin-estimates")}
    />
  );

  const renderRequests = () => {
    if (detail.requests.length === 0) {
      return <QuietEmpty>이 현장에 연결된 요청이 없습니다.</QuietEmpty>;
    }

    return (
      <div className="customer-projects-workspace__request-history" aria-label="현장 요청 이력">
        {detail.requests.map((request) => (
          <div className="customer-projects-workspace__request-history-row" key={request.id}>
            <span className="customer-projects-workspace__request-kind">
              {operationStatusViews.requestType(request.request_type).label}
            </span>
            <div>
              <strong>
                {getCustomerOperationText(
                  request.title,
                  operationStatusViews.requestType(request.request_type).label
                )}
              </strong>
              <small>
                {[getEstimateReference(request), formatOperationDateTime(request.updated_at || request.created_at)]
                  .filter((value) => value && value !== "-")
                  .join(" · ")}
              </small>
            </div>
            <StatusText status={operationStatusViews.request(request.status)} />
            {!isTrashProject ? (
              <button type="button" onClick={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.REQUESTS)}>
                받은 요청에서 처리
              </button>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const renderConstruction = () => {
    const latestChangeOrder = detail.changeOrders[0] ?? null;

    return (
      <div className="customer-projects-workspace__section-list">
        <section>
          <h3>현재 공사</h3>
          <dl className="customer-projects-workspace__definition-list">
            <div>
              <dt>상태</dt>
              <dd><StatusText status={operationStatusViews.construction(detailProject?.construction_status)} /></dd>
            </div>
            <div>
              <dt>핵심 일정</dt>
              <dd>{getProjectScheduleText(detailProject) || "등록된 일정이 없습니다."}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h3>변경공사</h3>
          {latestChangeOrder ? (
            <div className="customer-projects-workspace__single-record">
              <strong>{latestChangeOrder.title || "변경공사"}</strong>
              <span>
                전체 {detail.changeOrders.length}건
                {", "}
                {CHANGE_ORDER_STATUS_LABELS[latestChangeOrder.status] || "상태 미입력"}
                {", "}
                {formatOperationDate(latestChangeOrder.updated_at || latestChangeOrder.created_at)}
              </span>
            </div>
          ) : (
            <QuietEmpty>등록된 변경공사가 없습니다.</QuietEmpty>
          )}
        </section>
        <section>
          <h3>현장 사진·메모</h3>
          {detailProject?.memo ? (
            <p className="customer-projects-workspace__project-memo">{detailProject.memo}</p>
          ) : (
            <QuietEmpty>등록된 사진·메모가 없습니다.</QuietEmpty>
          )}
        </section>
      </div>
    );
  };

  const renderSettlement = () => (
    <div className="customer-projects-workspace__compact-empty">
      <strong>{currentContractView.label}</strong>
      <span>아직 등록된 정산 내역이 없습니다.</span>
    </div>
  );

  const renderAftercare = () => {
    const nextSchedule = detail.aftercareSchedules.find((schedule) => (
      schedule.next_send_date && !["completed", "cancelled"].includes(schedule.status)
    )) ?? null;
    const upcomingSchedules = detail.aftercareSchedules.filter((schedule) => (
      !["completed", "cancelled"].includes(schedule.status)
    ));
    const activeServices = detail.serviceRequests.filter((request) => (
      isServiceRequestInWorkspaceView(request.status, "service-intake")
      || isServiceRequestInWorkspaceView(request.status, "service-progress")
    ));
    const recentService = detail.serviceRequests[0] ?? null;
    const canCreate = !isTrashProject
      && detailProject?.construction_status === "completed"
      && Boolean(selectedCustomer?.id);

    return (
      <div className="customer-projects-workspace__aftercare">
        <header className="customer-projects-workspace__aftercare-header">
          <div>
            <h3>현장 사후관리</h3>
            <span>이 현장에 연결된 일정과 A/S 기록만 표시합니다.</span>
          </div>
          {canCreate ? (
            <div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Plus />}
                onClick={() => {
                  setAftercareFormError("");
                  setAftercareDialog({ kind: "schedule" });
                }}
              >
                일정 등록
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Plus />}
                onClick={() => {
                  setAftercareFormError("");
                  setAftercareDialog({ kind: "service" });
                }}
              >
                A/S 등록
              </Button>
            </div>
          ) : null}
        </header>

        {aftercareNotice ? (
          <p className="customer-projects-workspace__aftercare-notice" role="status">
            {aftercareNotice}
          </p>
        ) : null}

        <div className="customer-projects-workspace__aftercare-summary">
          <div>
            <span>다음 일정</span>
            <strong>
              {nextSchedule
                ? `${getAftercareScheduleTitle(nextSchedule)} · ${formatOperationDate(nextSchedule.next_send_date)}`
                : "예정된 점검이 없습니다."}
            </strong>
          </div>
          <div>
            <span>예정 일정</span>
            <strong>{upcomingSchedules.length}건</strong>
          </div>
          <div>
            <span>처리할 A/S</span>
            <strong>{activeServices.length}건</strong>
          </div>
          <div>
            <span>최근 A/S</span>
            <strong>
              {recentService
                ? recentService.problem_space || recentService.related_item_label || "A/S 요청"
                : "등록 내역 없음"}
            </strong>
          </div>
        </div>

        {detail.aftercareSchedules.length === 0 && detail.serviceRequests.length === 0 ? (
          <div className="customer-projects-workspace__compact-empty">
            <span>등록된 사후관리 일정 또는 A/S 내역이 없습니다.</span>
            {!canCreate && !isTrashProject ? (
              <span>현장을 완료 처리하면 사후관리 업무를 등록할 수 있습니다.</span>
            ) : null}
          </div>
        ) : (
          <div className="customer-projects-workspace__section-list">
            {detail.aftercareSchedules.length > 0 ? (
              <section>
                <h3>최근 일정</h3>
                {detail.aftercareSchedules.slice(0, 3).map((schedule) => (
                  <div className="customer-projects-workspace__single-record" key={schedule.id}>
                    <strong>
                      {getAftercareScheduleTitle(schedule)}
                      {schedule.next_send_date ? ` · ${formatOperationDate(schedule.next_send_date)}` : ""}
                    </strong>
                    <span>{operationStatusViews.aftercare(schedule.status).label}</span>
                  </div>
                ))}
              </section>
            ) : null}
            {detail.serviceRequests.length > 0 ? (
              <section>
                <h3>최근 A/S</h3>
                {detail.serviceRequests.slice(0, 3).map((request) => (
                  <div className="customer-projects-workspace__single-record" key={request.id}>
                    <strong>{request.problem_space || request.related_item_label || "A/S 요청"}</strong>
                    <span>
                      {operationStatusViews.service(request.status).label}
                      {" · "}
                      {formatOperationDate(request.updated_at || request.created_at)}
                    </span>
                  </div>
                ))}
              </section>
            ) : null}
          </div>
        )}

        <button
          type="button"
          className="customer-projects-workspace__section-link"
          onClick={() => onNavigate?.(CUSTOMER_OPERATIONS_PAGES.AFTERCARE_SERVICE)}
        >
          전체 사후관리·A/S 화면으로 이동
        </button>
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
    if (activeTab === "estimates") return renderEstimates();
    if (activeTab === "requests") return renderRequests();
    if (activeTab === "construction") return renderConstruction();
    if (activeTab === "settlement") return renderSettlement();
    if (activeTab === "aftercare") return renderAftercare();
    return null;
  };

  const lifecycleStatus = getProjectLifecycleStatus(detailProject);
  const projectAddress = getProjectAddressText(detailProject);
  const projectScheduleText = getProjectScheduleText(detailProject);

  return (
    <main className="customer-operations-page customer-projects-workspace-page">
      <PageHeader
        title="고객·현장"
        actions={(
          <div className="customer-projects-workspace__toolbar" aria-label="현장 검색과 필터">
            <label className="customer-projects-workspace__search">
              <span className="customer-projects-workspace__visually-hidden">현장 검색</span>
              <Search size={16} strokeWidth={1.5} aria-hidden="true" />
              <input
                value={searchQuery}
                placeholder="고객·현장·주소·견적번호 검색"
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
          </div>
        )}
      />

      <div className="customer-projects-workspace__status-stack">
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
      </div>

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
                const showAddress = shouldShowProjectAddress(project);
                const projectTitle = getProjectTitle(project);

                return (
                  <button
                    type="button"
                    className={[
                      "customer-projects-workspace__project-row",
                      selected ? "is-selected" : "",
                      project.deleted_at ? "is-trash" : "",
                    ].filter(Boolean).join(" ")}
                    aria-current={selected ? "true" : undefined}
                    title={[projectTitle, showAddress ? address : ""].filter(Boolean).join("\n")}
                    key={project.id}
                    onClick={() => selectProject(project.id)}
                  >
                    <span className="customer-projects-workspace__project-line">
                      <strong>{projectTitle}</strong>
                      {Number(project.openRequestCount) > 0 ? (
                        <small>요청 {project.openRequestCount}</small>
                      ) : null}
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
                    {showAddress ? (
                      <span className="customer-projects-workspace__project-address">{address}</span>
                    ) : null}
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
                  <h2 title={getProjectTitle(detailProject)}>{getProjectTitle(detailProject)}</h2>
                  <p className="customer-projects-workspace__detail-meta">
                    <span>{selectedCustomer?.name ? `${selectedCustomer.name} 고객` : "고객 정보 없음"}</span>
                    <StatusText status={lifecycleStatus} />
                    {projectScheduleText ? <span>{projectScheduleText}</span> : null}
                  </p>
                  <dl className="customer-projects-workspace__lifecycle-summary" aria-label="영업 진행 상태">
                    <div>
                      <dt>상담 상태</dt>
                      <dd><StatusText status={currentConsultation
                        ? operationStatusViews.consultation(currentConsultation.status)
                        : { label: "상담 없음", tone: "muted" }} /></dd>
                    </div>
                    <div>
                      <dt>견적 상태</dt>
                      <dd><StatusText status={operationStatusViews.estimate(
                        recentEstimate?.status || detailProject?.estimate_status || "draft"
                      )} /></dd>
                    </div>
                    <div>
                      <dt>계약 상태</dt>
                      <dd><StatusText status={currentContractView} /></dd>
                    </div>
                    <div>
                      <dt>공사 상태</dt>
                      <dd><StatusText status={operationStatusViews.construction(
                        detailProject?.construction_status || "not_started"
                      )} /></dd>
                    </div>
                  </dl>
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
                  ) : null}
                  {!isTrashProject && selectedCustomer?.phone ? (
                    <button
                      type="button"
                      className="customer-projects-workspace__contact-copy"
                      aria-label="고객 연락처 복사"
                      title="고객 연락처 복사"
                      onClick={handleCopyContact}
                    >
                      <Copy size={17} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  ) : null}
                  <div className="customer-projects-workspace__project-menu" ref={projectMenuRef}>
                        <button
                          ref={projectMenuTriggerRef}
                          type="button"
                          className="customer-projects-workspace__project-menu-trigger"
                          aria-label="현장 더보기"
                          aria-haspopup="menu"
                          aria-expanded={projectMenuOpen}
                          onClick={() => setProjectMenuOpen((current) => !current)}
                        >
                          <MoreHorizontal size={18} strokeWidth={1.5} aria-hidden="true" />
                        </button>
                        {projectMenuOpen ? (
                          <div className="customer-projects-workspace__project-menu-popover" role="menu">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                infoTriggerRef.current = projectMenuTriggerRef.current;
                                setInfoOpen(true);
                                setProjectMenuOpen(false);
                              }}
                            >
                              고객·현장 정보 보기
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                activityTriggerRef.current = projectMenuTriggerRef.current;
                                setActivityOpen(true);
                                setProjectMenuOpen(false);
                              }}
                            >
                              <Activity size={16} strokeWidth={1.5} aria-hidden="true" />
                              활동 기록 보기
                            </button>
                            {!isTrashProject ? (
                              <>
                                <span className="customer-projects-workspace__project-menu-separator" />
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
                              </>
                            ) : null}
                          </div>
                        ) : null}
                  </div>
                  {copyNotice ? <span role="status">{copyNotice}</span> : null}
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

      {infoOpen ? (
        <div className="customer-projects-workspace__drawer-backdrop" onClick={() => setInfoOpen(false)}>
          <aside
            ref={infoDrawerRef}
            className="customer-projects-workspace__drawer customer-projects-workspace__drawer--info"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-projects-info-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2 id="customer-projects-info-title">고객·현장 정보</h2>
              <button type="button" aria-label="고객·현장 정보 닫기" onClick={() => setInfoOpen(false)}>
                <X size={18} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </header>
            <div className="customer-projects-workspace__info-scroll">
              <section>
                <h3>고객</h3>
                <dl className="customer-projects-workspace__info-list">
                  <div><dt>고객명</dt><dd>{selectedCustomer?.name || "미입력"}</dd></div>
                  <div>
                    <dt>연락처</dt>
                    <dd>
                      <span>{selectedCustomer?.phone || "미입력"}</span>
                      {selectedCustomer?.phone ? (
                        <button
                          type="button"
                          aria-label="고객 연락처 복사"
                          title="고객 연락처 복사"
                          onClick={handleCopyContact}
                        >
                          <Copy size={15} strokeWidth={1.5} aria-hidden="true" />
                        </button>
                      ) : null}
                    </dd>
                  </div>
                </dl>
              </section>
              <section>
                <h3>현장</h3>
                <dl className="customer-projects-workspace__info-list">
                  <div><dt>현장명</dt><dd>{getProjectTitle(detailProject)}</dd></div>
                  <div><dt>전체 주소</dt><dd>{projectAddress || "미입력"}</dd></div>
                  <div><dt>현장 상태</dt><dd><StatusText status={lifecycleStatus} /></dd></div>
                  {detailProject?.construction_start_date ? (
                    <div><dt>착공 예정일</dt><dd>{formatOperationDate(detailProject.construction_start_date)}</dd></div>
                  ) : null}
                  {(detailProject?.completed_at || detailProject?.construction_completed_date) ? (
                    <div>
                      <dt>완료일</dt>
                      <dd>{formatOperationDate(detailProject.completed_at || detailProject.construction_completed_date)}</dd>
                    </div>
                  ) : null}
                  {detailProject?.cancelled_at ? (
                    <div><dt>취소일</dt><dd>{formatOperationDate(detailProject.cancelled_at)}</dd></div>
                  ) : null}
                  {detailProject?.deleted_at ? (
                    <div><dt>삭제일</dt><dd>{formatOperationDate(detailProject.deleted_at)}</dd></div>
                  ) : null}
                </dl>
              </section>
              {copyNotice ? <p className="customer-projects-workspace__drawer-notice" role="status">{copyNotice}</p> : null}
            </div>
          </aside>
        </div>
      ) : null}

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
              <h2 id="customer-projects-activity-title">활동 기록</h2>
              <button type="button" aria-label="활동 기록 닫기" onClick={() => setActivityOpen(false)}>
                <X size={18} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </header>
            <div className="customer-projects-workspace__drawer-filters" role="tablist" aria-label="활동 필터">
              {[
                { value: "all", label: "전체" },
                { value: "customer", label: "고객 접점" },
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

      <AftercareRecordDialog
        open={Boolean(aftercareDialog)}
        kind={aftercareDialog?.kind}
        lockedProject={aftercareProjectContext}
        submitting={aftercareSaving}
        error={aftercareFormError}
        onClose={() => {
          if (!aftercareSaving) setAftercareDialog(null);
        }}
        onSubmit={handleProjectAftercareSubmit}
      />
    </main>
  );
}
