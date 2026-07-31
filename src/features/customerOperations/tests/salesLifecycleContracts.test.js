import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getContractLifecycleView,
  getEstimateShareAction,
  operationStatusViews,
} from "../utils";

const rpcSql = readFileSync(
  new URL("../../../../supabase/sales_lifecycle_rpcs.sql", import.meta.url),
  "utf8"
);
const apiSources = Object.fromEntries(
  [
    "customerRequestsApi.js",
    "estimateShareApi.js",
    "homeApi.js",
    "projectsApi.js",
  ].map((file) => [
    file,
    readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
  ])
);

function getFunctionBody(name) {
  const start = rpcSql.indexOf(`create or replace function public.${name}`);
  if (start < 0) return "";
  const next = rpcSql.indexOf("create or replace function public.", start + 1);
  return rpcSql.slice(start, next < 0 ? rpcSql.length : next);
}

describe("sales lifecycle database contracts", () => {
  it("saves a consultation and draft estimate idempotently without contract or construction mutation", () => {
    const body = getFunctionBody("save_estimate_draft");
    expect(body).toContain("p_client_draft_key");
    expect(body).toContain("'already_saved'");
    expect(body).toContain("insert into public.consultations");
    expect(body).toContain("'active'");
    expect(body).toContain("insert into public.estimates");
    expect(body).toContain("'draft'");
    expect(body).not.toContain("insert into public.contracts");
    expect(body).not.toContain("update public.projects\n  set construction_status");
    expect(body).not.toContain("customer_requests");
  });

  it("creates immutable versions and active manual tokens only in the confirmed share RPC", () => {
    const body = getFunctionBody("create_customer_portal_link");
    expect(body).toContain("source_draft_revision = v_estimate.draft_revision");
    expect(body).toContain("insert into public.estimate_versions");
    expect(body).toContain("insert into public.customer_access_tokens");
    expect(body).toContain("'active'");
    expect(body).toContain("'manual_confirmed'");
    expect(body).toContain("current_estimate_version_id = v_version.id");
    expect(body).not.toContain("'prepared'");
  });

  it("allows only documented customer estimate transitions on the current version", () => {
    const body = getFunctionBody("transition_customer_estimate");
    expect(body).toContain("current_estimate_version_id is distinct from");
    expect(body).toContain("'stale_estimate_version'");
    expect(body).toContain("v_action in ('revision_requested', 'approved')");
    expect(body).toContain("v_version.status not in ('sent', 'viewed')");
    expect(body).toContain("v_action = 'rejected'");
    expect(body).toContain("('sent', 'viewed', 'revision_requested')");
    expect(body).not.toContain("insert into public.contracts");
    expect(body).not.toContain("contract_status =");
  });

  it("keeps consultation close, contract cancellation, and construction independent", () => {
    const consultation = getFunctionBody("update_consultation_status");
    const contract = getFunctionBody("update_contract_status");
    expect(consultation).not.toContain("update public.estimates");
    expect(consultation).not.toContain("update public.contracts");
    expect(consultation).not.toContain("update public.projects");
    expect(contract).toContain("when 'customer_signed' then v_next_status in ('completed', 'cancelled')");
    expect(contract).toContain("completed_by = case when v_next_status = 'completed' then auth.uid()");
    expect(contract).not.toContain("construction_status");
  });
});

describe("sales lifecycle display contracts", () => {
  it("shows lifecycle aggregates independently and preserves legacy reviewing ambiguity", () => {
    expect(operationStatusViews.consultation("active").label).toBe("상담 진행 중");
    expect(operationStatusViews.estimate("rejected").label).toBe("거절");
    expect(getContractLifecycleView(null, "reviewing").label).toBe("기존 계약 상태 확인 필요");
    expect(getContractLifecycleView(null, "not_started").label).toBe("미작성");
    expect(getContractLifecycleView({ status: "customer_signed" }, "reviewing").label)
      .toBe("고객 서명 완료 · 업체 최종 확인 대기");
  });

  it("exposes send, link-copy, and terminal estimate actions without changing lifecycle states", () => {
    expect(getEstimateShareAction({ status: "draft" })).toEqual({
      mode: "send",
      label: "고객에게 보내기",
    });
    expect(getEstimateShareAction({ status: "viewed", has_unpublished_changes: false })).toEqual({
      mode: "copy",
      label: "링크 다시 복사",
    });
    expect(getEstimateShareAction({ status: "revision_requested", has_unpublished_changes: true }))
      .toEqual({ mode: "send", label: "고객에게 보내기" });
    ["approved", "rejected", "expired", "cancelled"].forEach((status) => {
      expect(getEstimateShareAction({ status })).toBeNull();
    });
  });
});

describe("sales lifecycle PostgREST embed contracts", () => {
  it("disambiguates estimate aggregate and immutable version relationships", () => {
    expect(apiSources["customerRequestsApi.js"].match(
      /estimate:estimates!estimate_versions_estimate_id_fkey\(/g
    )).toHaveLength(2);
    expect(apiSources["estimateShareApi.js"]).toContain(
      "estimate_versions!estimate_versions_estimate_id_fkey("
    );
    expect(apiSources["homeApi.js"].match(
      /estimate:estimates!estimate_versions_estimate_id_fkey\(/g
    )).toHaveLength(2);
    expect(apiSources["homeApi.js"]).toContain(
      "estimate_versions!estimate_versions_estimate_id_fkey("
    );
    expect(apiSources["projectsApi.js"].match(
      /estimate:estimates!estimate_versions_estimate_id_fkey\(/g
    )).toHaveLength(2);
  });

  it("links an unconnected draft before activating its customer portal link", () => {
    const source = apiSources["estimateShareApi.js"];
    const functionStart = source.indexOf("export async function createEstimatePortalLink");
    const saveCall = source.indexOf("await saveEstimateDraft({", functionStart);
    const shareCall = source.indexOf('"create_customer_portal_link"', functionStart);

    expect(saveCall).toBeGreaterThan(functionStart);
    expect(shareCall).toBeGreaterThan(saveCall);
  });
});
