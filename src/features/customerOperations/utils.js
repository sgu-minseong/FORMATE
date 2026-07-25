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

export function getRelationRow(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
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
  estimateVersions = [],
  aftercareSchedules = [],
  timelineEvents = [],
}) {
  const attention = [
    ...requests.map((request) => ({
      id: `request-${request.id}`,
      type: "request",
      title: request.title || getOperationLabel(REQUEST_TYPE, request.request_type, "고객 요청"),
      meta: `${getCustomerName(request)} · ${getProjectName(request)}`,
      status: createStatusView(REQUEST_STATUS, request.status),
      createdAt: request.created_at,
    })),
    ...serviceRequests.map((request) => ({
      id: `service-${request.id}`,
      type: "service",
      title: request.problem_space || "A/S 요청",
      meta: `${getCustomerName(request)} · ${getProjectName(request)}`,
      status: createStatusView(SERVICE_REQUEST_STATUS, request.status),
      createdAt: request.created_at,
    })),
    ...notifications.map((notification) => ({
      id: `notification-${notification.id}`,
      type: "notification",
      title: notification.title || "알림",
      meta: notification.body || "확인이 필요한 알림입니다.",
      status: { label: "읽지 않음", tone: "info" },
      createdAt: notification.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));

  const inProgress = [
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      type: "project",
      title: project.name || project.address || "현장",
      meta: getCustomerName(project),
      status: createStatusView(CONSTRUCTION_STATUS, project.construction_status),
      createdAt: project.updated_at ?? project.created_at,
    })),
    ...estimateVersions.map((version) => ({
      id: `estimate-version-${version.id}`,
      type: "estimate",
      title: version.label || `견적 v${version.version_no}`,
      meta: `${getCustomerName(version)} · ${getProjectName(version)}`,
      status: createStatusView(ESTIMATE_VERSION_STATUS, version.status),
      createdAt: version.created_at,
    })),
    ...aftercareSchedules.map((schedule) => ({
      id: `aftercare-${schedule.id}`,
      type: "aftercare",
      title: getProjectName(schedule),
      meta: `${getCustomerName(schedule)} · 다음 일정 ${formatOperationDate(schedule.next_send_date)}`,
      status: createStatusView(AFTERCARE_STATUS, schedule.status),
      createdAt: schedule.updated_at ?? schedule.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));

  const recentActivity = timelineEvents.map((event) => ({
    id: event.id,
    title: event.title || getOperationLabel(TIMELINE_EVENT_TYPE, event.event_type, "활동"),
    description: event.description || `${getCustomerName(event)} · ${getProjectName(event)}`,
    status: createStatusView(TIMELINE_EVENT_TYPE, event.event_type),
    createdAt: event.created_at,
  }));

  return {
    attention: attention.slice(0, 6),
    inProgress: inProgress.slice(0, 6),
    recentActivity: recentActivity.slice(0, 8),
  };
}
