import { describe, expect, it } from "vitest";
import {
  addRecentTemplateCondition,
  filterTemplateConditions,
  readTemplateConditionPreferences,
  toggleFavoriteTemplateCondition,
  writeLastSelectedTemplateCondition,
  writeTemplateConditionFavorites,
  writeTemplateConditionRecent,
} from "../templateConditionPreferences";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("template condition preferences", () => {
  it("persists favorites, recent conditions, and last selection per company", () => {
    const storage = createStorage();
    writeTemplateConditionFavorites(storage, "company-a", ["a", "b"]);
    writeTemplateConditionRecent(storage, "company-a", ["b", "a"]);
    writeLastSelectedTemplateCondition(storage, "company-a", "b");

    expect(readTemplateConditionPreferences(storage, "company-a")).toEqual({
      favorites: ["a", "b"],
      recent: ["b", "a"],
      lastSelectedId: "b",
    });
    expect(readTemplateConditionPreferences(storage, "company-b")).toEqual({
      favorites: [],
      recent: [],
      lastSelectedId: "",
    });
  });

  it("keeps the latest five unique conditions and toggles favorites", () => {
    const recent = ["5", "4", "3", "2", "1"];
    expect(addRecentTemplateCondition(recent, "3")).toEqual(["3", "5", "4", "2", "1"]);
    expect(addRecentTemplateCondition(recent, "6")).toEqual(["6", "5", "4", "3", "2"]);
    expect(toggleFavoriteTemplateCondition(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleFavoriteTemplateCondition(["a", "b"], "a")).toEqual(["b"]);
  });

  it("searches the composed condition label client-side", () => {
    const templates = [{ id: "24" }, { id: "34" }];
    const labels = { 24: "24평 · 구형 · 확장 없음", 34: "34평 · 확장형 · 살림집" };
    expect(filterTemplateConditions(templates, "34평 살림집", (row) => labels[row.id])).toEqual([{ id: "34" }]);
    expect(filterTemplateConditions(templates, "살림집", (row) => labels[row.id])).toEqual([{ id: "34" }]);
    expect(filterTemplateConditions(templates, "구형", (row) => labels[row.id])).toEqual([{ id: "24" }]);
  });
});
