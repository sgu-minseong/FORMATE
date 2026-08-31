import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  calls: [],
  result: { data: [], error: null },
}));

function createQuery(table) {
  const query = {
    select(value) {
      mockState.calls.push({ table, method: "select", value });
      return query;
    },
    eq(column, value) {
      mockState.calls.push({ table, method: "eq", column, value });
      return query;
    },
    limit(value) {
      mockState.calls.push({ table, method: "limit", value });
      return query;
    },
    in(column, value) {
      mockState.calls.push({ table, method: "in", column, value });
      return query;
    },
    maybeSingle() {
      mockState.calls.push({ table, method: "maybeSingle" });
      return query;
    },
    then(resolve, reject) {
      return Promise.resolve(mockState.result).then(resolve, reject);
    },
  };
  return query;
}

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    from: (table) => createQuery(table),
  },
}));

import {
  fetchAdminTemplateUpdatedAtRow,
  fetchAdminTemplateValueCandidate,
  fetchAdminTemplateValueUpdatedAtRows,
  fetchAdminTemplateValues,
  fetchConstructionSubitemUpdatedAtRows,
} from "../priceTableApi";

describe("canonical template value reader", () => {
  beforeEach(() => {
    mockState.calls = [];
    mockState.result = { data: [], error: null };
  });

  it("looks up one value by template and construction_subitem UUID only", async () => {
    mockState.result = {
      data: [{ id: "value-a", quantity: 3, labor_count: 2, construction_days: 1 }],
      error: null,
    };

    await expect(fetchAdminTemplateValueCandidate("template-a", "variant-a"))
      .resolves.toMatchObject({ id: "value-a" });
    expect(mockState.calls).toContainEqual({
      table: "admin_condition_template_values",
      method: "eq",
      column: "template_id",
      value: "template-a",
    });
    expect(mockState.calls).toContainEqual({
      table: "admin_condition_template_values",
      method: "eq",
      column: "subitem_id",
      value: "variant-a",
    });
    expect(mockState.calls).not.toContainEqual(expect.objectContaining({
      method: "eq",
      column: "option_value",
    }));
  });

  it("does not read the legacy option_value column for template runtime", async () => {
    await fetchAdminTemplateValues("template-a");
    const selectCall = mockState.calls.find((call) => (
      call.table === "admin_condition_template_values" && call.method === "select"
    ));
    expect(selectCall?.value).toContain("subitem_id");
    expect(selectCall?.value).toContain("labor_count_occupied");
    expect(selectCall?.value).toContain("updated_at");
    expect(selectCall?.value).not.toContain("option_value");
  });

  it("narrowly reads DB updated_at rows after a successful catalog write", async () => {
    mockState.result = { data: [{ id: "subitem-a", updated_at: "2026-08-31T01:02:03Z" }], error: null };
    await expect(fetchConstructionSubitemUpdatedAtRows(["subitem-a"]))
      .resolves.toEqual(mockState.result.data);
    expect(mockState.calls).toContainEqual({
      table: "construction_subitems",
      method: "select",
      value: "id, updated_at",
    });
    expect(mockState.calls).toContainEqual({
      table: "construction_subitems",
      method: "in",
      column: "id",
      value: ["subitem-a"],
    });

    mockState.calls = [];
    mockState.result = { data: { id: "template-a", updated_at: "2026-08-31T01:02:04Z" }, error: null };
    await expect(fetchAdminTemplateUpdatedAtRow("company-a", "template-a"))
      .resolves.toEqual(mockState.result.data);
    expect(mockState.calls).toContainEqual({
      table: "admin_condition_templates",
      method: "select",
      value: "id, updated_at",
    });

    mockState.calls = [];
    mockState.result = { data: [{ id: "value-a", subitem_id: "subitem-a", updated_at: "2026-08-31T01:02:05Z" }], error: null };
    await expect(fetchAdminTemplateValueUpdatedAtRows("template-a", ["value-a"]))
      .resolves.toEqual(mockState.result.data);
    expect(mockState.calls).toContainEqual({
      table: "admin_condition_template_values",
      method: "in",
      column: "id",
      value: ["value-a"],
    });
  });

  it("fails closed when legacy rows make one UUID ambiguous", async () => {
    mockState.result = {
      data: [{ id: "value-a" }, { id: "value-b" }],
      error: null,
    };

    await expect(fetchAdminTemplateValueCandidate("template-a", "variant-a"))
      .rejects.toMatchObject({
        code: "duplicate-template-subitem-id",
        context: {
          templateId: "template-a",
          constructionSubitemId: "variant-a",
        },
      });
  });
});
