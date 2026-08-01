export const PRICE_TABLE_AUTOSAVE_DELAY_MS = 1200;

function createInitialSnapshot() {
  return {
    status: "idle",
    target: "",
    savedAt: "",
    error: "",
    running: false,
    queued: false,
  };
}

export function createPriceTableAutosave({
  save,
  schedule = (callback, delay) => globalThis.setTimeout(callback, delay),
  cancel = (timerId) => globalThis.clearTimeout(timerId),
  now = () => new Date().toISOString(),
  delay = PRICE_TABLE_AUTOSAVE_DELAY_MS,
  onChange = () => {},
}) {
  let timerId = null;
  let snapshot = createInitialSnapshot();

  const emit = (patch) => {
    snapshot = { ...snapshot, ...patch };
    onChange({ ...snapshot });
  };

  const clearTimer = () => {
    if (timerId === null) return;
    cancel(timerId);
    timerId = null;
  };

  const markDirty = (target) => {
    if (!target) return;
    clearTimer();
    emit({ status: "dirty", target, error: "" });
    timerId = schedule(() => {
      timerId = null;
      void run(target);
    }, delay);
  };

  const run = async (target = snapshot.target) => {
    if (!target) return false;
    clearTimer();
    if (snapshot.running) {
      emit({ queued: true, target });
      return false;
    }

    emit({
      status: "saving",
      target,
      error: "",
      running: true,
    });

    try {
      const saved = await save(target);
      if (saved) {
        emit({
          status: "saved",
          savedAt: now(),
          error: "",
        });
      }
      return Boolean(saved);
    } catch (error) {
      emit({
        status: "error",
        error: error?.message || "자동 저장에 실패했습니다.",
      });
      return false;
    } finally {
      const shouldQueue = snapshot.queued;
      emit({ running: false, queued: false });
      if (shouldQueue) markDirty(target);
    }
  };

  const markSaved = (target = snapshot.target) => {
    clearTimer();
    emit({
      status: "saved",
      target,
      savedAt: now(),
      error: "",
      queued: false,
    });
  };

  const markSaving = (target = snapshot.target) => {
    clearTimer();
    emit({
      status: "saving",
      target,
      error: "",
    });
  };

  const markError = (error, target = snapshot.target) => {
    clearTimer();
    emit({
      status: "error",
      target,
      error: error?.message || `${error ?? ""}` || "자동 저장에 실패했습니다.",
    });
  };

  const reset = () => {
    clearTimer();
    snapshot = createInitialSnapshot();
    onChange({ ...snapshot });
  };

  return {
    clearTimer,
    getSnapshot: () => ({ ...snapshot }),
    markDirty,
    markError,
    markSaved,
    markSaving,
    reset,
    run,
  };
}
