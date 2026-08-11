import { describe, expect, it, vi } from "vitest";
import {
  PHOTO_AUTOSAVE_DELAY_MS,
  createPhotoAutosave,
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
});
