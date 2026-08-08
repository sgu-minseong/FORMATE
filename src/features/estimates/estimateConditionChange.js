export const ESTIMATE_PYEONG_CHANGE_DELAY_MS = 300;

export function normalizeEstimatePyeongInput(value, { min = 1, max = 90 } = {}) {
  const text = `${value ?? ""}`.trim();
  if (!text) return "";

  const numericValue = Number(text);
  if (!Number.isInteger(numericValue) || numericValue < min || numericValue > max) return "";
  return `${numericValue}`;
}

export async function applyEstimateConditionChange({
  nextCondition,
  preserveDraft = false,
  forceBlank = false,
  updateCondition,
  loadCatalog,
}) {
  const size = normalizeEstimatePyeongInput(nextCondition?.size);
  if (!size) return { applied: false, condition: nextCondition };

  const resolvedCondition = { ...nextCondition, size };
  updateCondition(resolvedCondition);
  const loaded = await loadCatalog(size, resolvedCondition, {
    preserveDraft,
    forceBlank,
  });

  return {
    applied: Boolean(loaded),
    condition: resolvedCondition,
  };
}

export function createEstimatePyeongChange({
  apply,
  invalidate = () => {},
  schedule = (callback, delay) => globalThis.setTimeout(callback, delay),
  cancel = (timerId) => globalThis.clearTimeout(timerId),
  delay = ESTIMATE_PYEONG_CHANGE_DELAY_MS,
}) {
  let timerId = null;
  let generation = 0;
  let lastAppliedValue = "";
  let activeValue = "";

  const clearTimer = () => {
    if (timerId === null) return;
    cancel(timerId);
    timerId = null;
  };

  const runApply = (pyeong) => {
    activeValue = pyeong;
    Promise.resolve(apply(pyeong))
      .then((applied) => {
        if (activeValue !== pyeong) return;
        activeValue = "";
        lastAppliedValue = applied === false ? "" : pyeong;
      })
      .catch(() => {
        if (activeValue !== pyeong) return;
        activeValue = "";
        lastAppliedValue = "";
      });
  };

  const queue = (value) => {
    clearTimer();
    generation += 1;
    invalidate();
    const pyeong = normalizeEstimatePyeongInput(value);
    if (!pyeong) return false;

    const queuedGeneration = generation;
    timerId = schedule(() => {
      timerId = null;
      if (queuedGeneration !== generation) return;
      runApply(pyeong);
    }, delay);
    return true;
  };

  const flush = (value) => {
    const pyeong = normalizeEstimatePyeongInput(value);
    if (timerId === null && pyeong && (pyeong === activeValue || pyeong === lastAppliedValue)) return true;

    clearTimer();
    generation += 1;
    invalidate();
    if (!pyeong) return false;
    runApply(pyeong);
    return true;
  };

  const reset = () => {
    clearTimer();
    generation += 1;
    lastAppliedValue = "";
    activeValue = "";
  };

  return {
    flush,
    queue,
    reset,
  };
}
