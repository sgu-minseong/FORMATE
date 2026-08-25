import { useCallback, useEffect, useRef, useState } from "react";

export default function useMutationSaveStatus({
  autosave,
  onChange,
}) {
  const pendingRef = useRef(0);
  const retryRef = useRef(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [directError, setDirectError] = useState("");
  const [savedRevision, setSavedRevision] = useState(0);
  const [retryRevision, setRetryRevision] = useState(0);

  const run = useCallback(async (operation, retryOperation = null) => {
    pendingRef.current += 1;
    setPendingCount(pendingRef.current);
    setDirectError("");
    retryRef.current = null;
    try {
      const result = await operation();
      setSavedRevision((current) => current + 1);
      return result;
    } catch (error) {
      setDirectError(error?.message || "저장에 실패했습니다.");
      retryRef.current = retryOperation || (() => run(operation));
      setRetryRevision((current) => current + 1);
      throw error;
    } finally {
      pendingRef.current = Math.max(0, pendingRef.current - 1);
      setPendingCount(pendingRef.current);
    }
  }, []);

  const error = autosave.error || directError;
  const status = error
    ? "error"
    : pendingCount > 0 || ["dirty", "saving"].includes(autosave.status)
      ? "saving"
      : autosave.status === "saved" || savedRevision > 0
        ? "saved"
        : "idle";
  const retry = autosave.error ? autosave.retry : retryRef.current;

  useEffect(() => {
    onChange?.({ error, retry, status });
  }, [error, onChange, retryRevision, status]);

  return { error, retry, run, status };
}
