import { describe, expect, it, vi } from "vitest";
import {
  PHOTO_AUTOSAVE_DELAY_MS,
  createPhotoAutosave,
  runQueuedPhotoChanges,
} from "../photoAutosave";

describe("photo management autosave", () => {
  it("debounces changes for 1.2 seconds and lets manual save flush immediately", async () => {
    const scheduled = [];
    const save = vi.fn(async () => true);
    const autosave = createPhotoAutosave({
      save,
      schedule: (callback, delay) => {
        scheduled.push({ callback, delay });
        return scheduled.length;
      },
      cancel: vi.fn(),
    });

    autosave.markDirty("photo-management");
    expect(scheduled[0].delay).toBe(PHOTO_AUTOSAVE_DELAY_MS);
    expect(PHOTO_AUTOSAVE_DELAY_MS).toBe(1200);
    expect(save).not.toHaveBeenCalled();

    await autosave.run("photo-management");
    expect(save).toHaveBeenCalledTimes(1);
    expect(autosave.getSnapshot().status).toBe("saved");
  });

  it("runs the recovery callback and reports failure instead of claiming success", async () => {
    const restore = vi.fn(async () => {});
    const successfulChange = vi.fn(async () => {});
    const failedChange = vi.fn(async () => { throw new Error("save failed"); });

    await expect(runQueuedPhotoChanges([
      { execute: failedChange },
      { execute: successfulChange },
    ], restore)).rejects.toThrow("save failed");

    expect(successfulChange).toHaveBeenCalledTimes(1);
    expect(restore).toHaveBeenCalledTimes(1);
  });
});
