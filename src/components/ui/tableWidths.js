import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const TABLE_WIDTH_PREFERENCE_VERSION = 1;
const TABLE_WIDTH_STORAGE_PREFIX = "formate.table-widths";

function toFiniteWidth(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim().endsWith("px")) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getColumnBounds(column) {
  const defaultWidth = toFiniteWidth(column.defaultWidth ?? column.width) ?? 80;
  const minWidth = toFiniteWidth(column.minWidth) ?? Math.min(defaultWidth, 40);
  const maxWidth = Math.max(
    minWidth,
    toFiniteWidth(column.maxWidth) ?? Number.POSITIVE_INFINITY,
  );
  return {
    defaultWidth: Math.min(Math.max(defaultWidth, minWidth), maxWidth),
    minWidth,
    maxWidth,
  };
}

function clampColumnWidth(column, value) {
  const { defaultWidth, minWidth, maxWidth } = getColumnBounds(column);
  if (typeof value !== "number" || !Number.isFinite(value)) return defaultWidth;
  return Math.min(Math.max(value, minWidth), maxWidth);
}

export function getTableWidthStorageKey(
  companyId,
  tableId,
  version = TABLE_WIDTH_PREFERENCE_VERSION,
) {
  if (!companyId || !tableId) return "";
  return `${TABLE_WIDTH_STORAGE_PREFIX}.${encodeURIComponent(companyId)}.${encodeURIComponent(tableId)}.v${version}`;
}

export function sanitizeTableWidths(columns, persistedWidths) {
  const persisted = persistedWidths
    && typeof persistedWidths === "object"
    && !Array.isArray(persistedWidths)
    ? persistedWidths
    : {};

  return Object.fromEntries((columns ?? []).map((column) => [
    column.key,
    clampColumnWidth(column, persisted[column.key]),
  ]));
}

export function resizeTableColumn(columns, currentWidths, columnKey, nextWidth) {
  const widths = sanitizeTableWidths(columns, currentWidths);
  const column = (columns ?? []).find((entry) => entry.key === columnKey);
  if (!column) return widths;
  return { ...widths, [columnKey]: clampColumnWidth(column, nextWidth) };
}

export function getTableTotalWidth(columns, widths) {
  const sanitized = sanitizeTableWidths(columns, widths);
  return (columns ?? []).reduce((total, column) => total + sanitized[column.key], 0);
}

export function loadTableWidths(storage, storageKey, columns) {
  if (!storage || !storageKey) return sanitizeTableWidths(columns, null);
  try {
    return sanitizeTableWidths(columns, JSON.parse(storage.getItem(storageKey) ?? "null"));
  } catch {
    return sanitizeTableWidths(columns, null);
  }
}

export function saveTableWidths(storage, storageKey, columns, widths) {
  const sanitized = sanitizeTableWidths(columns, widths);
  if (!storage || !storageKey) return sanitized;
  try {
    storage.setItem(storageKey, JSON.stringify(sanitized));
  } catch {
    // A blocked or full preference store must never block table rendering.
  }
  return sanitized;
}

export function resetTableWidths(storage, storageKey, columns) {
  if (storage && storageKey) {
    try {
      storage.removeItem(storageKey);
    } catch {
      // A blocked preference store still resets the current in-memory table.
    }
  }
  return sanitizeTableWidths(columns, null);
}

function getBrowserStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function usePersistentTableWidths({
  companyId,
  tableId,
  columns,
  storage,
  version = TABLE_WIDTH_PREFERENCE_VERSION,
}) {
  const resolvedStorage = storage === undefined ? getBrowserStorage() : storage;
  const storageKey = getTableWidthStorageKey(companyId, tableId, version);
  const columnSignature = (columns ?? []).map((column) => (
    `${column.key}:${column.defaultWidth ?? column.width}:${column.minWidth ?? ""}:${column.maxWidth ?? ""}`
  )).join("|");
  const preferenceIdentity = `${storageKey}|${columnSignature}`;
  const [widthState, setWidthState] = useState(() => ({
    identity: preferenceIdentity,
    widths: loadTableWidths(resolvedStorage, storageKey, columns),
  }));
  const widths = widthState.identity === preferenceIdentity
    ? widthState.widths
    : loadTableWidths(resolvedStorage, storageKey, columns);
  const widthsRef = useRef(widths);
  const resizeCleanupRef = useRef(null);
  widthsRef.current = widths;

  useEffect(() => {
    setWidthState({
      identity: preferenceIdentity,
      widths: loadTableWidths(resolvedStorage, storageKey, columns),
    });
  }, [columnSignature, preferenceIdentity, resolvedStorage, storageKey]);

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  const setColumnWidth = useCallback((columnKey, nextWidth) => {
    setWidthState((current) => {
      const currentWidths = current.identity === preferenceIdentity
        ? current.widths
        : loadTableWidths(resolvedStorage, storageKey, columns);
      const next = resizeTableColumn(columns, currentWidths, columnKey, nextWidth);
      widthsRef.current = next;
      saveTableWidths(resolvedStorage, storageKey, columns, next);
      return { identity: preferenceIdentity, widths: next };
    });
  }, [columns, preferenceIdentity, resolvedStorage, storageKey]);

  const resizeColumnBy = useCallback((columnKey, delta) => {
    setColumnWidth(columnKey, (widthsRef.current[columnKey] ?? 0) + delta);
  }, [setColumnWidth]);

  const startResize = useCallback((columnKey, event) => {
    if (!event || event.button !== 0) return;
    const startWidth = widthsRef.current[columnKey];
    if (!Number.isFinite(startWidth)) return;

    event.preventDefault();
    resizeCleanupRef.current?.();
    const startX = event.clientX;
    const pointerId = event.pointerId;
    const handle = event.currentTarget;
    const root = typeof document === "undefined" ? null : document.documentElement;
    root?.classList.add("formate-table-resizing");
    if (pointerId !== undefined && handle?.setPointerCapture) {
      try {
        handle.setPointerCapture(pointerId);
      } catch {
        // Window listeners still provide a safe fallback when capture is unavailable.
      }
    }

    const handlePointerMove = (moveEvent) => {
      if (pointerId !== undefined && moveEvent.pointerId !== pointerId) return;
      setColumnWidth(columnKey, startWidth + moveEvent.clientX - startX);
    };
    const finish = (finishEvent) => {
      if (pointerId !== undefined && finishEvent?.pointerId !== undefined && finishEvent.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("blur", finish);
      handle?.removeEventListener("lostpointercapture", finish);
      if (pointerId !== undefined && handle?.hasPointerCapture?.(pointerId)) {
        try {
          handle.releasePointerCapture(pointerId);
        } catch {
          // Capture may already have been released by the browser.
        }
      }
      root?.classList.remove("formate-table-resizing");
      resizeCleanupRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("blur", finish);
    handle?.addEventListener("lostpointercapture", finish);
    resizeCleanupRef.current = finish;
  }, [setColumnWidth]);

  const resetWidths = useCallback(() => {
    resizeCleanupRef.current?.();
    const next = resetTableWidths(resolvedStorage, storageKey, columns);
    widthsRef.current = next;
    setWidthState({ identity: preferenceIdentity, widths: next });
  }, [columns, preferenceIdentity, resolvedStorage, storageKey]);

  const resolvedColumns = useMemo(() => (columns ?? []).map((column) => ({
    ...column,
    width: widths[column.key],
  })), [columns, widths]);
  const totalWidth = useMemo(
    () => getTableTotalWidth(columns, widths),
    [columnSignature, columns, widths],
  );

  return {
    columns: resolvedColumns,
    gridTemplate: resolvedColumns.map((column) => `${column.width}px`).join(" "),
    resizeColumnBy,
    resetWidths,
    startResize,
    storageKey,
    totalWidth,
    widths,
  };
}
