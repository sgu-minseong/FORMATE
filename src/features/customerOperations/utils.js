import { formatDisplayDate, formatDisplayDateTime } from "../../shared/utils/dates";
import {
  AFTERCARE_STATUS,
  CONSTRUCTION_STATUS,
  CONTRACT_STATUS,
  ESTIMATE_VERSION_STATUS,
  MESSAGE_CHANNEL,
  MESSAGE_STATUS,
  MESSAGE_TYPE,
  REQUEST_STATUS,
  REQUEST_TYPE,
  SERVICE_REQUEST_STATUS,
  SERVICE_URGENCY,
  TIMELINE_EVENT_TYPE,
} from "./constants";

const CUSTOMER_OPERATION_TEXT = {
  "Customer created": "고객 등록",
  "Project created": "현장 등록",
  "Estimate link created": "견적 링크 생성",
  "Estimate viewed": "견적 열람",
  "Estimate inquiry": "견적 문의",
  "Estimate revision request": "견적 수정 요청",
  "Estimate approved": "견적 확정",
  "Customer approved estimate": "고객 견적 확정",
  "The customer approved the estimate": "고객이 견적을 확정했습니다",
  "The customer approved the estimate.": "고객이 견적을 확정했습니다.",
  "A customer estimate link was created.": "고객 견적 확인 링크를 생성했습니다.",
};

export function getRelationRow(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function getRelationRows(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

export function isDeletedProject(project) {
  return Boolean(getRelationRow(project)?.deleted_at);
}

export function isDeletedEstimate(estimate) {
  return Boolean(getRelationRow(estimate)?.deleted_at);
}

export function isActiveProjectStatus(status) {
  return Boolean(status) && !["completed", "cancelled"].includes(status);
}

export function isActiveProject(project) {
  return !isDeletedProject(project) && isActiveProjectStatus(project?.construction_status);
}

export function isProjectLinkedRowVisible(row) {
  return !isDeletedProject(row?.project);
}

export function getEstimateLinkedProjects(estimate) {
  const directProjects = getRelationRows(estimate?.project);
  const versionProjects = getRelationRows(estimate?.estimate_versions)
    .flatMap((version) => getRelationRows(version?.project));
  return [...directProjects, ...versionProjects];
}

export function isOperationalEstimate(estimate) {
  if (isDeletedEstimate(estimate)) return false;
  return getEstimateLinkedProjects(estimate).every((project) => !isDeletedProject(project));
}

export function getOperationLabel(map, value, fallback = "미입력") {
  return map[value]?.label ?? fallback;
}

export function getOperationTone(map, value) {
  return map[value]?.tone ?? "muted";
}

export function formatOperationDate(value) {
  return value ? formatDisplayDate(value) : "-";
}

export function formatOperationDateTime(value) {
  return value ? formatDisplayDateTime(value) : "-";
}

export function getCustomerName(row) {
  return getRelationRow(row?.customer)?.name || "고객명 미입력";
}

export function getProjectName(row) {
  const project = getRelationRow(row?.project);
  return project?.name || project?.address || "현장 미입력";
}

export function getProjectAddress(row) {
  const project = getRelationRow(row?.project);
  return [project?.address, project?.detail_address].filter(Boolean).join(" ") || "주소 미입력";
}

export function getEstimateReference(row) {
  const version = getRelationRow(row?.estimate_version);
  if (version?.label) return version.label;
  if (version?.version_no) return `견적 v${version.version_no}`;

  const estimateId = row?.estimate_id || version?.estimate_id;
  return estimateId ? `견적 ${String(estimateId).slice(0, 8)}` : "-";
}

export function getEstimateVersionLabel(version) {
  if (!version) return "-";
  return version.label || (version.version_no ? `견적 v${version.version_no}` : "-");
}

export function getCustomerOperationText(value, fallback = "") {
  if (!value) return fallback;
  return CUSTOMER_OPERATION_TEXT[value] || value;
}

export function isOpenCustomerRequest(status) {
  return ["received", "in_progress"].includes(getCustomerRequestLogicalStatus(status));
}

export function getCustomerRequestLogicalStatus(status) {
  if (status === "received") return "received";
  if (["reviewing", "pricing", "awaiting_customer_approval"].includes(status)) {
    return "in_progress";
  }
  if (["closed", "approved"].includes(status)) return "completed";
  if (status === "rejected") return "rejected";
  return "unknown";
}

const ESTIMATE_SCOPED_ACTIVITY_TYPES = new Set([
  "estimate_created",
  "estimate_sent",
  "estimate_viewed",
]);

export function isHomeTimelineEventVisible(event) {
  const estimateVersion = getRelationRow(event?.estimate_version);
  if (
    isDeletedProject(event?.project)
    || isDeletedProject(estimateVersion?.project)
  ) {
    return false;
  }
  if (
    ESTIMATE_SCOPED_ACTIVITY_TYPES.has(event?.event_type)
    && (
      isDeletedEstimate(event?.estimate)
      || isDeletedEstimate(estimateVersion?.estimate)
    )
  ) {
    return false;
  }
  return true;
}

export function isHomeNotificationVisible(notification, {
  projectsById = new Map(),
  estimatesById = new Map(),
  requestsById = new Map(),
  estimateVersionsById = new Map(),
} = {}) {
  if (!notification?.related_id) return true;

  if (notification.related_type === "project") {
    const project = projectsById.get(notification.related_id);
    return project ? !isDeletedProject(project) : true;
  }

  if (notification.related_type === "estimate") {
    const estimate = estimatesById.get(notification.related_id);
    return estimate ? isOperationalEstimate(estimate) : true;
  }

  if (notification.related_type === "customer_request") {
    const request = requestsById.get(notification.related_id);
    return request ? isProjectLinkedRowVisible(request) : true;
  }

  if (notification.related_type === "estimate_version") {
    const version = estimateVersionsById.get(notification.related_id);
    if (!version) return true;
    return isProjectLinkedRowVisible(version) && !isDeletedEstimate(version.estimate);
  }

  return true;
}

export function createStatusView(map, value) {
  return {
    label: getOperationLabel(map, value),
    tone: getOperationTone(map, value),
  };
}

export const operationStatusViews = {
  requestType: (value) => createStatusView(REQUEST_TYPE, value),
  request: (value) => createStatusView(REQUEST_STATUS, value),
  estimate: (value) => createStatusView(ESTIMATE_VERSION_STATUS, value),
  contract: (value) => createStatusView(CONTRACT_STATUS, value),
  construction: (value) => createStatusView(CONSTRUCTION_STATUS, value),
  aftercare: (value) => createStatusView(AFTERCARE_STATUS, value),
  service: (value) => createStatusView(SERVICE_REQUEST_STATUS, value),
  urgency: (value) => createStatusView(SERVICE_URGENCY, value),
  messageType: (value) => createStatusView(MESSAGE_TYPE, value),
  messageChannel: (value) => createStatusView(MESSAGE_CHANNEL, value),
  message: (value) => createStatusView(MESSAGE_STATUS, value),
  timeline: (value) => createStatusView(TIMELINE_EVENT_TYPE, value),
};

export function getEstimateShareDefaults(estimate) {
  const itemsData = estimate?.items_data;
  const estimateMeta = (
    itemsData
    && !Array.isArray(itemsData)
    && typeof itemsData.estimateMeta === "object"
  )
    ? itemsData.estimateMeta
    : {};
  const savedCustomerName = `${estimateMeta.customerName ?? ""}`.trim();

  return {
    customerName: savedCustomerName === "고객명 미입력" ? "" : savedCustomerName,
    customerPhone: `${estimateMeta.customerPhone ?? ""}`.trim(),
    customerEmail: "",
    projectName: "",
    projectAddress: `${estimate?.address ?? ""}`.trim(),
    versionLabel: `${estimateMeta.estimateNumber ?? ""}`.trim(),
  };
}

export function getProjectCurrentStage(project) {
  if (project?.construction_status && project.construction_status !== "not_started") {
    return operationStatusViews.construction(project.construction_status);
  }
  if (project?.contract_status && project.contract_status !== "not_started") {
    return operationStatusViews.contract(project.contract_status);
  }
  return operationStatusViews.estimate(project?.estimate_status);
}

export function buildCustomerProjectRows({
  projects = [],
  estimateVersions = [],
  requests = [],
  timelineEvents = [],
}) {
  const estimateCounts = new Map();
  const openRequestCounts = new Map();
  const recentActivityByProject = new Map();

  estimateVersions.forEach((version) => {
    if (!version.project_id) return;
    estimateCounts.set(version.project_id, (estimateCounts.get(version.project_id) ?? 0) + 1);
  });

  requests.forEach((request) => {
    if (!request.project_id || ["approved", "rejected", "closed"].includes(request.status)) return;
    openRequestCounts.set(request.project_id, (openRequestCounts.get(request.project_id) ?? 0) + 1);
  });

  timelineEvents.forEach((event) => {
    if (!event.project_id || recentActivityByProject.has(event.project_id)) return;
    recentActivityByProject.set(event.project_id, event.created_at);
  });

  return projects.map((project) => ({
    ...project,
    estimateCount: estimateCounts.get(project.id) ?? 0,
    openRequestCount: openRequestCounts.get(project.id) ?? 0,
    recentActivityAt: recentActivityByProject.get(project.id) ?? project.updated_at ?? project.created_at,
  }));
}

export function buildHomeOperationsData({
  requests = [],
  serviceRequests = [],
  notifications = [],
  projects = [],
  timelineEvents = [],
  summary = {},
}) {
  const attention = [
    ...requests.map((request) => ({
      id: `request-${request.id}`,
      sourceId: request.id,
      type: "request",
      requestType: request.request_type,
      rawStatus: request.status,
      title: getCustomerOperationText(
        request.title,
        getOperationLabel(REQUEST_TYPE, request.request_type, "고객 요청")
      ),
      meta: `${getCustomerName(request)} · ${getProjectName(request)}`,
      customerName: getCustomerName(request),
      projectName: getProjectName(request),
      status: createStatusView(REQUEST_STATUS, request.status),
      createdAt: request.created_at,
    })),
    ...serviceRequests.map((request) => ({
      id: `service-${request.id}`,
      sourceId: request.id,
      type: "service",
      rawStatus: request.status,
      title: request.problem_space || "A/S 요청",
      meta: `${getCustomerName(request)} · ${getProjectName(request)}`,
      customerName: getCustomerName(request),
      projectName: getProjectName(request),
      status: createStatusView(SERVICE_REQUEST_STATUS, request.status),
      createdAt: request.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));

  const inProgress = projects.map((project) => ({
      id: `project-${project.id}`,
      sourceId: project.id,
      projectId: project.id,
      type: "project",
      title: project.name || project.address || "현장",
      meta: getCustomerName(project),
      customerName: getCustomerName(project),
      projectName: project.name || project.address || "현장",
      projectAddress: project.address || "",
      rawStatus: project.construction_status,
      status: createStatusView(CONSTRUCTION_STATUS, project.construction_status),
      createdAt: project.updated_at ?? project.created_at,
    }))
    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));

  const recentActivity = [
    ...timelineEvents.map((event) => ({
      id: `timeline-${event.id}`,
      sourceId: event.id,
      sourceType: "timeline",
      eventType: event.event_type,
      projectId: getRelationRow(event.project)?.id || "",
      customerId: getRelationRow(event.customer)?.id || "",
      title: getCustomerOperationText(
        event.title,
        getOperationLabel(TIMELINE_EVENT_TYPE, event.event_type, "활동")
      ),
      description: getCustomerOperationText(
        event.description,
        `${getCustomerName(event)} · ${getProjectName(event)}`
      ),
      customerName: getCustomerName(event),
      projectName: getProjectName(event),
      status: createStatusView(TIMELINE_EVENT_TYPE, event.event_type),
      createdAt: event.created_at,
    })),
    ...notifications.map((notification) => ({
      id: `notification-${notification.id}`,
      sourceId: notification.id,
      sourceType: "notification",
      eventType: notification.event_type,
      relatedType: notification.related_type,
      relatedId: notification.related_id,
      title: getCustomerOperationText(notification.title, "활동 알림"),
      description: getCustomerOperationText(notification.body, ""),
      customerName: "",
      projectName: "",
      status: createStatusView(TIMELINE_EVENT_TYPE, notification.event_type),
      createdAt: notification.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));

  return {
    summary: {
      openRequests: summary.openRequests ?? 0,
      linksCreatedToday: summary.linksCreatedToday ?? 0,
      estimateViewsToday: summary.estimateViewsToday ?? 0,
      revisionRequests: summary.revisionRequests ?? 0,
      approvalsToday: summary.approvalsToday ?? 0,
    },
    attention,
    inProgress,
    recentActivity,
  };
}
