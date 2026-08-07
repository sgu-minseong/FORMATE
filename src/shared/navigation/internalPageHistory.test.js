import { describe, expect, it } from "vitest";
import {
  canMoveInternalPageHistory,
  createInternalPageHistory,
  getCurrentInternalPage,
  moveInternalPageHistory,
  pushInternalPage,
} from "./internalPageHistory";

describe("internal page history", () => {
  it("disables unavailable directions and moves between internal pages", () => {
    const initial = createInternalPageHistory("landing");
    expect(canMoveInternalPageHistory(initial, "back")).toBe(false);
    expect(canMoveInternalPageHistory(initial, "forward")).toBe(false);

    const items = pushInternalPage(pushInternalPage(initial, "condition"), "items");
    expect(getCurrentInternalPage(items)).toBe("items");
    expect(canMoveInternalPageHistory(items, "back")).toBe(true);
    expect(canMoveInternalPageHistory(items, "forward")).toBe(false);

    const condition = moveInternalPageHistory(items, "back");
    expect(getCurrentInternalPage(condition)).toBe("condition");
    expect(canMoveInternalPageHistory(condition, "forward")).toBe(true);
  });

  it("drops stale forward entries after a normal navigation", () => {
    const items = pushInternalPage(
      pushInternalPage(createInternalPageHistory("landing"), "condition"),
      "items"
    );
    const condition = moveInternalPageHistory(items, "back");
    const nextItems = pushInternalPage(condition, "items");

    expect(nextItems.entries).toEqual(["landing", "condition", "items"]);
    expect(nextItems.index).toBe(2);
    expect(canMoveInternalPageHistory(nextItems, "forward")).toBe(false);
  });
});
