import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_AUTOSAVE_DELAY_MS = 800;

export default function useDebouncedAutosave({
  save,
  delay = DEFAULT_AUTOSAVE_DELAY_MS,
}) {
  const saveRef = useRef(save);
  const timerRef = useRef(null);
  const runningRef = useRef(false);
  const queuedRef = useRef(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  saveRef.current = save;

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return;
    globalThis.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const run = useCallback(async () => {
    clearTimer();
    if (runningRef.current) {
      queuedRef.current = true;
      return false;
    }

    runningRef.current = true;
    setStatus("saving");
    setError("");
    try {
      const saved = await saveRef.current();
      setStatus(saved === false ? "dirty" : "saved");
      return saved !== false;
    } catch (nextError) {
      setStatus("error");
      setError(nextError?.message || "자동 저장에 실패했습니다.");
      return false;
    } finally {
      runningRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        timerRef.current = globalThis.setTimeout(() => {
          timerRef.current = null;
          void run();
        }, delay);
      }
    }
  }, [clearTimer, delay]);

  const markDirty = useCallback(({ immediate = false } = {}) => {
    clearTimer();
    setStatus((current) => (current === "saving" ? current : "dirty"));
    setError("");
    if (runningRef.current) {
      queuedRef.current = true;
      return;
    }
    timerRef.current = globalThis.setTimeout(() => {
      timerRef.current = null;
      void run();
    }, immediate ? 0 : delay);
  }, [clearTimer, delay, run]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    error,
    markDirty,
    retry: run,
    run,
    status,
  };
}
