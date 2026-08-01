import { supabase } from "../../lib/supabaseClient";
import {
  buildCustomerProjectRows,
  buildHomeOperationsData,
  isActiveProject,
  isDeletedEstimate,
  isHomeNotificationVisible,
  isHomeTimelineEventVisible,
  isOpenCustomerRequest,
  isOperationalEstimate,
  isProjectLinkedRowVisible,
} from "./utils";
import { assertCustomerOperationsQuery, unwrap, unwrapSingle } from "./apiShared";

export async function fetchHomeCustomerOperations(companyId) {
  assertCustomerOperationsQuery(companyId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [
    requestsResult,
    servicesResult,
    notificationsResult,
    projectsResult,
    versionsResult,
    estimatesResult,
    timelineResult,
    linkMessagesResult,
  ] = await Promise.all([
    supabase
      .from("customer_requests")
      .select(`
        id, project_id, estimate_id, estimate_version_id,
        request_type, status, title, created_at,
        customer:customers(id, name),
        project:projects(id, name, address, deleted_at)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("service_requests")
      .select(`
        id, status, problem_space, created_at,
        customer:customers(id, name),
        project:projects(id, name, address, deleted_at)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("notifications")
      .select("id, title, body, event_type, related_type, related_id, created_at")
      .eq("company_id", companyId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("projects")
      .select(`
        id, name, address, construction_status, deleted_at, created_at, updated_at,
        customer:customers(id, name)
      `)
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("estimate_versions")
      .select(`
        id, estimate_id, project_id, status,
        estimate:estimates!estimate_versions_estimate_id_fkey(id, deleted_at),
        project:projects(id, deleted_at)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("estimates")
      .select(`
        id, deleted_at,
        estimate_versions!estimate_versions_estimate_id_fkey(
          id,
          project:projects(id, deleted_at)
        )
      `)
      .eq("company_id", companyId),
    supabase
      .from("timeline_events")
      .select(`
        id, project_id, estimate_id, estimate_version_id, customer_request_id,
        event_type, title, description, created_at,
        customer:customers(id, name),
        project:projects(id, name, address, deleted_at),
        estimate:estimates(id, deleted_at),
        estimate_version:estimate_versions(
          id,
          estimate:estimates!estimate_versions_estimate_id_fkey(id, deleted_at),
          project:projects(id, deleted_at)
        )
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_messages")
      .select(`
        id,
        project:projects(id, deleted_at),
        estimate:estimates(id, deleted_at)
      `)
      .eq("company_id", companyId)
      .eq("message_type", "estimate_link")
      .gte("created_at", todayIso),
  ]);

  const requests = unwrap(requestsResult);
  const serviceRequests = unwrap(servicesResult).filter(isProjectLinkedRowVisible);
  const projects = unwrap(projectsResult);
  const estimateVersions = unwrap(versionsResult);
  const estimates = unwrap(estimatesResult);
  const timelineEvents = unwrap(timelineResult).filter(isHomeTimelineEventVisible);
  const visibleRequests = requests.filter(isProjectLinkedRowVisible);
  const attentionRequests = visibleRequests.filter((request) => (
    isOpenCustomerRequest(request.status)
  ));
  const activeProjects = projects.filter(isActiveProject);
  const visibleLinkMessages = unwrap(linkMessagesResult).filter((message) => (
    isProjectLinkedRowVisible(message) && !isDeletedEstimate(message.estimate)
  ));
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const estimatesById = new Map(estimates.map((estimate) => [estimate.id, estimate]));
  const requestsById = new Map(requests.map((request) => [request.id, request]));
  const estimateVersionsById = new Map(
    estimateVersions.map((version) => [version.id, version])
  );
  const notifications = unwrap(notificationsResult).filter((notification) => (
    isHomeNotificationVisible(notification, {
      projectsById,
      estimatesById,
      requestsById,
      estimateVersionsById,
    })
  ));
  const isToday = (value) => (
    Boolean(value) && new Date(value).getTime() >= new Date(todayIso).getTime()
  );

  return buildHomeOperationsData({
    requests: attentionRequests,
    serviceRequests,
    notifications,
    projects: activeProjects,
    timelineEvents,
    summary: {
      openRequests: attentionRequests.length,
      linksCreatedToday: visibleLinkMessages.length,
      estimateViewsToday: timelineEvents.filter((event) => (
        event.event_type === "estimate_viewed" && isToday(event.created_at)
      )).length,
      revisionRequests: attentionRequests.filter((request) => (
        request.request_type === "estimate_revision"
      )).length,
      approvalsToday: visibleRequests.filter((request) => (
        request.request_type === "approval"
        && request.status === "approved"
        && isToday(request.created_at)
      )).length,
    },
  });
}
