import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPriceTableAutosave,
  PRICE_TABLE_AUTOSAVE_DELAY_MS,
} from "../priceTableAutosave";

afterEach(() => {
  vi.useRealTimers();
});

describe("price table autosave controller contract", () => {
  it("schedules a dirty edit after the existing 1.2 second delay", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(true);
    const autosave = createPriceTableAutosave({
      save,
      now: () => "2026-07-28T00:00:00.000Z",
    });

    autosave.markDirty("prices");

    expect(autosave.getSnapshot()).toMatchObject({
      status: "dirty",
      target: "prices",
    });
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(PRICE_TABLE_AUTOSAVE_DELAY_MS);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("prices");
    expect(autosave.getSnapshot()).toMatchObject({
      status: "saved",
      savedAt: "2026-07-28T00:00:00.000Z",
    });
  });

  it("queues a second autosave when edits occur during an active save", async () => {
    vi.useFakeTimers();
    let resolveFirstSave;
    const save = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveFirstSave = resolve;
        })
      )
      .mockResolvedValueOnce(true);
    const autosave = createPriceTableAutosave({ save });

    const firstSave = autosave.run("prices");
    autosave.markDirty("prices");
    await vi.advanceTimersByTimeAsync(PRICE_TABLE_AUTOSAVE_DELAY_MS);

    expect(save).toHaveBeenCalledTimes(1);
    expect(autosave.getSnapshot().queued).toBe(true);

    resolveFirstSave(true);
    await firstSave;

    expect(autosave.getSnapshot()).toMatchObject({
      status: "dirty",
      queued: false,
      running: false,
    });

    await vi.advanceTimersByTimeAsync(PRICE_TABLE_AUTOSAVE_DELAY_MS);

    expect(save).toHaveBeenCalledTimes(2);
    expect(autosave.getSnapshot().status).toBe("saved");
  });

  it("reads the latest local input when the scheduled save begins", async () => {
    vi.useFakeTimers();
    let currentUnitPrice = "10000";
    const persistedValues = [];
    const autosave = createPriceTableAutosave({
      save: vi.fn(async () => {
        persistedValues.push(currentUnitPrice);
        return true;
      }),
    });

    autosave.markDirty("prices");
    currentUnitPrice = "20000";
    currentUnitPrice = "30000";

    await vi.advanceTimersByTimeAsync(PRICE_TABLE_AUTOSAVE_DELAY_MS);

    expect(persistedValues).toEqual(["30000"]);
  });
});
