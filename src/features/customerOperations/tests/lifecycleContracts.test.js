import { describe, expect, it } from "vitest";
import {
  buildCustomerRequestStatusRpcArgs,
  buildEstimatePortalLinkRpcArgs,
  buildProjectRpcArgs,
  buildProjectStatusRpcArgs,
  replaceRequestInCollection,
} from "../lifecycleContracts";
import {
  getCustomerRequestLogicalStatus,
  isActiveProject,
  isOperationalEstimate,
  isProjectLinkedRowVisible,
} from "../utils";
import { getPortalErrorCopy } from "../../customerPortal/customerPortalUtils";

describe("customer operations lifecycle contracts", () => {
  it("keeps request status logical mapping", () => {
    expect(getCustomerRequestLogicalStatus("received")).toBe("received");
    expect(getCustomerRequestLogicalStatus("reviewing")).toBe("in_progress");
    expect(getCustomerRequestLogicalStatus("pricing")).toBe("in_progress");
    expect(getCustomerRequestLogicalStatus("awaiting_customer_approval")).toBe("in_progress");
    expect(getCustomerRequestLogicalStatus("approved")).toBe("completed");
    expect(getCustomerRequestLogicalStatus("closed")).toBe("completed");
    expect(getCustomerRequestLogicalStatus("rejected")).toBe("rejected");
  });

  it("replaces only the updated request in local state", () => {
    const current = [{ id: "a", status: "received" }, { id: "b", status: "reviewing" }];
    const updated = { id: "a", status: "closed" };
    expect(replaceRequestInCollection(current, updated)).toEqual([
      updated,
      current[1],
    ]);
  });

  it("keeps project and estimate soft-delete visibility invariants", () => {
    expect(isActiveProject({ construction_status: "in_progress", deleted_at: null })).toBe(true);
    expect(isActiveProject({ construction_status: "completed", deleted_at: null })).toBe(false);
    expect(isProjectLinkedRowVisible({ project: { deleted_at: "2026-07-28" } })).toBe(false);
    expect(isOperationalEstimate({ deleted_at: "2026-07-28" })).toBe(false);
    expect(isOperationalEstimate({
      deleted_at: null,
      estimate_versions: [{ project: { deleted_at: "2026-07-28" } }],
    })).toBe(false);
    expect(isOperationalEstimate({
      deleted_at: null,
      estimate_versions: [{ project: { deleted_at: null } }],
    })).toBe(true);
  });

  it("keeps lifecycle RPC namespaced arguments and company scope", () => {
    expect(buildCustomerRequestStatusRpcArgs({
      companyId: "company",
      requestId: "request",
      status: "rejected",
      internalMemo: "  사유  ",
    })).toEqual({
      p_company_id: "company",
      p_request_id: "request",
      p_next_status: "rejected",
      p_closed_reason: "사유",
    });
    expect(buildProjectStatusRpcArgs({
      companyId: "company",
      projectId: "project",
      status: "completed",
    })).toEqual({
      p_company_id: "company",
      p_project_id: "project",
      p_next_status: "completed",
    });
    expect(buildProjectRpcArgs({ companyId: "company", projectId: "project" })).toEqual({
      p_company_id: "company",
      p_project_id: "project",
    });
  });

  it("keeps estimate share RPC arguments and blocked portal copy", () => {
    expect(buildEstimatePortalLinkRpcArgs({
      companyId: "company",
      estimateId: "estimate",
      customerName: "고객",
      requiredContactConsent: true,
    })).toEqual({
      p_company_id: "company",
      p_estimate_id: "estimate",
      p_customer_name: "고객",
      p_customer_phone: "",
      p_customer_email: "",
      p_project_name: "",
      p_project_address: "",
      p_version_label: "",
      p_expires_at: null,
      p_required_contact_consent: true,
      p_aftercare_consent: false,
      p_marketing_consent: false,
    });
    expect(getPortalErrorCopy("inactive_token").title).toContain("사용할 수 없는");
  });
});
