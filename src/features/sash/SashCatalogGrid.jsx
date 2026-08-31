import { useEffect, useMemo, useRef, useState } from "react";
import { Pin, Plus, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import { usePersistentTableWidths } from "../../components/ui/tableWidths";
import useDebouncedAutosave from "../../shared/hooks/useDebouncedAutosave";
import useMutationSaveStatus from "../../shared/hooks/useMutationSaveStatus";
import {
  formatMoneyInputValue,
  stripNumberInputFormatting,
} from "../../shared/utils/numbers";
import { formatDisplayTimestampDate, getLatestTimestamp } from "../../shared/utils/dates";
import { PYEONG_OPTIONS } from "../../shared/constants/estimateOptions";
import {
  archiveSashCatalogEntry,
  fetchActiveSashCatalogEntries,
  insertSashCatalogEntry,
  saveSashCatalogEntryOrder,
  updateSashCatalogEntry,
} from "./sashCatalogApi";
import {
  fetchSashCatalogPin,
  upsertSashCatalogPin,
} from "./sashCatalogDefaultApi";
import {
  createLocalSashCatalogEntry,
  formatSashArea,
  getSashBillableArea,
  getSashCatalogEntryAmount,
  getSashCatalogEntryValidationError,
  getSashEntryArea,
  hasExplicitSashWindowType,
  isLocalSashCatalogEntry,
  normalizeSashCatalogEntry,
  orderSashCatalogEntriesForDisplay,
  SASH_CATEGORIES,
  SASH_MEASUREMENT_KINDS,
  SASH_PRICING_BASES,
  SASH_WINDOW_TYPES,
} from "./sashCatalogModel";

function getFriendlySashError(error, fallback) {
  return error?.message || fallback;
}

function moveEntry(entries, sourceIndex, targetIndex) {
  const nextEntries = [...entries];
  const [movedEntry] = nextEntries.splice(sourceIndex, 1);
  nextEntries.splice(targetIndex, 0, movedEntry);
  return nextEntries.map((entry, index) => ({
    ...entry,
    sort_order: index,
  }));
}

function formatSashHebe(value) {
  const formattedArea = formatSashArea(value);
  return formattedArea === "-" ? formattedArea : formattedArea.replace("㎡", " 헤베");
}

function normalizeDefaultPyeong(value) {
  const numericValue = Number(value);
  return PYEONG_OPTIONS.includes(numericValue) ? String(numericValue) : "";
}

export const SASH_CATALOG_TABLE_COLUMNS = [
  { key: "pin", label: "", ariaLabel: "대표제품", defaultWidth: 36, minWidth: 32, maxWidth: 48, sticky: true },
  { key: "sash_category", label: "분류", defaultWidth: 72, minWidth: 64, maxWidth: 112 },
  { key: "brand", label: "제조사", defaultWidth: 84, minWidth: 72, maxWidth: 180, sticky: true },
  { key: "frame_spec", label: "틀", defaultWidth: 90, minWidth: 72, maxWidth: 180, sticky: true, stickyEnd: true },
  { key: "pair_spec", label: "페어", defaultWidth: 78, minWidth: 64, maxWidth: 160 },
  { key: "glass_spec", label: "유리", defaultWidth: 82, minWidth: 64, maxWidth: 160 },
  { key: "gas_spec", label: "가스", defaultWidth: 70, minWidth: 60, maxWidth: 140 },
  { key: "screen_spec", label: "망", defaultWidth: 72, minWidth: 60, maxWidth: 140 },
  { key: "window_type", label: "창", defaultWidth: 76, minWidth: 64, maxWidth: 120 },
  { key: "measurement_kind", label: "치수", defaultWidth: 76, minWidth: 64, maxWidth: 120 },
  { key: "width_mm", label: "가로", align: "right", defaultWidth: 82, minWidth: 68, maxWidth: 140 },
  { key: "height_mm", label: "세로", align: "right", defaultWidth: 82, minWidth: 68, maxWidth: 140 },
  { key: "area_sqm", label: "헤베", align: "right", defaultWidth: 84, minWidth: 68, maxWidth: 140 },
  { key: "unit_price", label: "단가", align: "right", defaultWidth: 100, minWidth: 80, maxWidth: 180 },
  { key: "amount", label: "금액", align: "right", defaultWidth: 104, minWidth: 84, maxWidth: 190 },
  { key: "cost_price", label: "원가", align: "right", defaultWidth: 96, minWidth: 80, maxWidth: 180 },
  { key: "updated_at", label: "수정일", defaultWidth: 92, minWidth: 76, maxWidth: 140 },
  { key: "actions", label: "", ariaLabel: "삭제", defaultWidth: 40, minWidth: 36, maxWidth: 56 },
];

export default function SashCatalogGrid({
  companyId,
  subitem = null,
  sashCategory = SASH_CATEGORIES.STANDARD,
  title = "샷시 규격",
  initialDefaultPyeong = "",
  categoryNavigation = null,
  onDirtyChange,
  onEntryCategoryMove,
  onPersistedCountChange,
  onSaveStateChange,
}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [dirtyEntryIds, setDirtyEntryIds] = useState(() => new Set());
  const [pinPyeong, setPinPyeong] = useState(() => (
    normalizeDefaultPyeong(initialDefaultPyeong)
  ));
  const [pinnedEntryId, setPinnedEntryId] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinRequirement, setPinRequirement] = useState("");
  const firstDraftInputRef = useRef(null);
  const pinPyeongSelectRef = useRef(null);
  const entriesRef = useRef(entries);
  const dirtyEntryIdsRef = useRef(dirtyEntryIds);
  const entryRevisionsRef = useRef(new Map());
  const pinRequestRevisionRef = useRef(0);
  const pinSaveQueueRef = useRef(Promise.resolve());
  const tableLayout = usePersistentTableWidths({
    companyId,
    tableId: "sash-catalog",
    columns: SASH_CATALOG_TABLE_COLUMNS,
  });

  const selectedSubitemId = subitem?.id ?? "";
  const hasLocalEntry = entries.some(isLocalSashCatalogEntry);
  const persistedEntryCount = entries.filter((entry) => !isLocalSashCatalogEntry(entry)).length;
  const usesTemplatePyeong = Boolean(normalizeDefaultPyeong(initialDefaultPyeong));
  const displayEntries = useMemo(() => orderSashCatalogEntriesForDisplay(entries, {
    pinnedEntryId,
  }), [entries, pinnedEntryId]);
  entriesRef.current = entries;
  dirtyEntryIdsRef.current = dirtyEntryIds;

  const autosave = useDebouncedAutosave({ save: persistDirtyEntries });
  const mutationStatus = useMutationSaveStatus({ autosave, onChange: onSaveStateChange });

  useEffect(() => {
    const nextPyeong = normalizeDefaultPyeong(initialDefaultPyeong);
    if (nextPyeong) setPinPyeong(nextPyeong);
  }, [initialDefaultPyeong]);

  useEffect(() => {
    let cancelled = false;
    const requestRevision = ++pinRequestRevisionRef.current;
    if (!companyId || !selectedSubitemId || !pinPyeong) {
      setPinnedEntryId("");
      return undefined;
    }

    fetchSashCatalogPin(companyId, pinPyeong, selectedSubitemId)
      .then((row) => {
        if (!cancelled && pinRequestRevisionRef.current === requestRevision) {
          setPinnedEntryId(row?.sash_catalog_entry_id ?? "");
        }
      })
      .catch((nextError) => {
        if (!cancelled && pinRequestRevisionRef.current === requestRevision) {
          setPinnedEntryId("");
          setError(getFriendlySashError(nextError, "고정 샷시 제품을 불러오지 못했습니다."));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, pinPyeong, selectedSubitemId]);

  useEffect(() => {
    onDirtyChange?.(entries.some(isLocalSashCatalogEntry));
  }, [entries, onDirtyChange]);

  useEffect(() => {
    if (loaded) onPersistedCountChange?.(selectedSubitemId, sashCategory, persistedEntryCount);
  }, [loaded, onPersistedCountChange, persistedEntryCount, sashCategory, selectedSubitemId]);

  useEffect(() => {
    let cancelled = false;
    if (!companyId || !selectedSubitemId) {
      setEntries([]);
      setLoaded(false);
      setDirtyEntryIds(new Set());
      return undefined;
    }

    setLoading(true);
    setLoaded(false);
    setDirtyEntryIds(new Set());
    setError("");
    fetchActiveSashCatalogEntries(companyId, selectedSubitemId, sashCategory)
      .then((rows) => {
        if (!cancelled) {
          setEntries(rows.map(normalizeSashCatalogEntry));
          setLoaded(true);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setEntries([]);
          setError(getFriendlySashError(nextError, "샷시 규격을 불러오지 못했습니다. 다시 시도해주세요."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, reloadToken, sashCategory, selectedSubitemId]);

  function patchEntry(entryId, patch, { immediate = false } = {}) {
    const nextEntries = entriesRef.current.map((entry) => (
      entry.id === entryId ? { ...entry, ...patch } : entry
    ));
    const nextDirtyIds = new Set(dirtyEntryIdsRef.current).add(entryId);
    entryRevisionsRef.current.set(entryId, (entryRevisionsRef.current.get(entryId) ?? 0) + 1);
    entriesRef.current = nextEntries;
    dirtyEntryIdsRef.current = nextDirtyIds;
    setEntries(nextEntries);
    setDirtyEntryIds(nextDirtyIds);
    autosave.markDirty({ immediate });
  }

  function addEntry() {
    if (!subitem || sashCategory === SASH_CATEGORIES.UNSPECIFIED) return;
    const nextEntry = createLocalSashCatalogEntry({
      constructionSubitemId: subitem.id,
      sortOrder: entries.length,
      pricingBasis: SASH_PRICING_BASES.AREA,
      windowType: SASH_WINDOW_TYPES.UNSPECIFIED,
      measurementKind: SASH_MEASUREMENT_KINDS.ESTIMATE,
      sashCategory,
    });
    setError("");
    const nextEntries = [...entriesRef.current, nextEntry];
    entriesRef.current = nextEntries;
    setEntries(nextEntries);
    window.requestAnimationFrame(() => firstDraftInputRef.current?.focus());
  }

  async function persistDirtyEntries() {
    const dirtyIds = [...dirtyEntryIdsRef.current];
    let hasIncompleteDraft = false;
    for (const entryId of dirtyIds) {
      const entry = entriesRef.current.find((candidate) => candidate.id === entryId);
      if (!entry) continue;
      const validationError = getSashCatalogEntryValidationError(entry);
      if (validationError) {
        if (isLocalSashCatalogEntry(entry)) {
          hasIncompleteDraft = true;
          continue;
        }
        throw new Error(validationError);
      }
      await saveEntry(entry, { autosave: true });
    }
    return !hasIncompleteDraft;
  }

  async function saveEntry(entry, { autosave: isAutosave = false } = {}) {
    const validationError = getSashCatalogEntryValidationError(entry);
    if (validationError) {
      if (!isAutosave || !isLocalSashCatalogEntry(entry)) setError(validationError);
      return false;
    }

    const revisionAtSave = entryRevisionsRef.current.get(entry.id) ?? 0;
    setSavingId(entry.id);
    setError("");
    try {
      const context = {
        companyId,
        constructionSubitemId: selectedSubitemId,
      };
      const savedEntry = isLocalSashCatalogEntry(entry)
        ? await insertSashCatalogEntry(entry, context)
        : await updateSashCatalogEntry(entry, context);
      const normalizedSavedEntry = normalizeSashCatalogEntry(savedEntry);
      const currentEntries = entriesRef.current;
      const currentRevision = entryRevisionsRef.current.get(entry.id) ?? 0;
      const latestEntry = currentEntries.find((currentEntry) => currentEntry.id === entry.id);
      const replacementEntry = currentRevision === revisionAtSave || !latestEntry
        ? {
            ...normalizedSavedEntry,
            updated_at: getLatestTimestamp(latestEntry?.updated_at, normalizedSavedEntry.updated_at),
          }
        : {
            ...normalizedSavedEntry,
            ...latestEntry,
            id: normalizedSavedEntry.id,
            updated_at: getLatestTimestamp(latestEntry.updated_at, normalizedSavedEntry.updated_at),
          };
      const resolvedEntries = normalizedSavedEntry.sash_category === sashCategory
        ? currentEntries.map((currentEntry) => (
            currentEntry.id === entry.id ? replacementEntry : currentEntry
          ))
        : currentEntries.filter((currentEntry) => currentEntry.id !== entry.id);
      entriesRef.current = resolvedEntries;
      setEntries(resolvedEntries);
      if (currentRevision === revisionAtSave) {
        const nextDirtyIds = new Set(dirtyEntryIdsRef.current);
        nextDirtyIds.delete(entry.id);
        dirtyEntryIdsRef.current = nextDirtyIds;
        setDirtyEntryIds(nextDirtyIds);
      } else if (normalizedSavedEntry.id !== entry.id) {
        const nextDirtyIds = new Set(dirtyEntryIdsRef.current);
        nextDirtyIds.delete(entry.id);
        nextDirtyIds.add(normalizedSavedEntry.id);
        dirtyEntryIdsRef.current = nextDirtyIds;
        entryRevisionsRef.current.set(normalizedSavedEntry.id, currentRevision);
        setDirtyEntryIds(nextDirtyIds);
      }
      if (
        !isLocalSashCatalogEntry(entry)
        && normalizedSavedEntry.sash_category !== sashCategory
      ) {
        onEntryCategoryMove?.(selectedSubitemId, sashCategory, normalizedSavedEntry.sash_category);
      }
      return true;
    } catch (nextError) {
      const message = getFriendlySashError(nextError, "샷시 규격을 저장하지 못했습니다. 입력값과 권한을 확인해주세요.");
      setError(message);
      throw new Error(message);
    } finally {
      setSavingId("");
    }
  }

  async function archiveEntry(entry) {
    if (isLocalSashCatalogEntry(entry)) {
      const nextEntries = entriesRef.current.filter((currentEntry) => currentEntry.id !== entry.id);
      const nextDirtyIds = new Set(dirtyEntryIdsRef.current);
      nextDirtyIds.delete(entry.id);
      entriesRef.current = nextEntries;
      dirtyEntryIdsRef.current = nextDirtyIds;
      setEntries(nextEntries);
      setDirtyEntryIds(nextDirtyIds);
      return;
    }

    setSavingId(entry.id);
    setError("");
    try {
      await mutationStatus.run(
        () => archiveSashCatalogEntry(entry.id, companyId),
        () => archiveEntry(entry)
      );
      const nextEntries = entriesRef.current.filter((currentEntry) => currentEntry.id !== entry.id);
      const nextDirtyIds = new Set(dirtyEntryIdsRef.current);
      nextDirtyIds.delete(entry.id);
      entriesRef.current = nextEntries;
      dirtyEntryIdsRef.current = nextDirtyIds;
      setEntries(nextEntries);
      setDirtyEntryIds(nextDirtyIds);
      if (entry.id === pinnedEntryId) setPinnedEntryId("");
    } catch (nextError) {
      setError(getFriendlySashError(nextError, "샷시 규격을 삭제하지 못했습니다."));
    } finally {
      setSavingId("");
    }
  }

  async function reorderEntries(sourceIndex, targetIndex) {
    if (hasLocalEntry) return;
    const sourceEntry = displayEntries[sourceIndex];
    const targetEntry = displayEntries[targetIndex];
    if (!sourceEntry || !targetEntry || sourceEntry.id === pinnedEntryId || targetEntry.id === pinnedEntryId) {
      return;
    }
    const previousEntries = entries;
    const nonPinnedEntries = displayEntries.filter((entry) => entry.id !== pinnedEntryId);
    const movedNonPinnedEntries = moveEntry(
      nonPinnedEntries,
      nonPinnedEntries.findIndex((entry) => entry.id === sourceEntry.id),
      nonPinnedEntries.findIndex((entry) => entry.id === targetEntry.id)
    );
    let nonPinnedIndex = 0;
    const nextEntries = entries.map((entry) => (
      entry.id === pinnedEntryId ? entry : movedNonPinnedEntries[nonPinnedIndex++]
    )).map((entry, index) => ({ ...entry, sort_order: index }));
    setEntries(nextEntries);
    setError("");
    try {
      entriesRef.current = nextEntries;
      await mutationStatus.run(
        () => saveSashCatalogEntryOrder(nextEntries, companyId),
        () => reorderEntries(sourceIndex, targetIndex)
      );
      try {
        const refreshedEntries = (
          await fetchActiveSashCatalogEntries(companyId, selectedSubitemId, sashCategory)
        ).map(normalizeSashCatalogEntry);
        const updatedAtById = new Map(
          refreshedEntries.map((entry) => [entry.id, entry.updated_at]),
        );
        const mergedEntries = entriesRef.current.map((entry) => ({
          ...entry,
          updated_at: getLatestTimestamp(entry.updated_at, updatedAtById.get(entry.id)),
        }));
        entriesRef.current = mergedEntries;
        setEntries(mergedEntries);
      } catch {
        // The order write is committed; a later load restores canonical DB timestamps.
      }
    } catch (nextError) {
      const previousOrder = new Map(
        previousEntries.map((entry, index) => [entry.id, { index, sortOrder: entry.sort_order }]),
      );
      const restoredEntries = [...entriesRef.current]
        .sort((left, right) => (
          (previousOrder.get(left.id)?.index ?? Number.MAX_SAFE_INTEGER)
          - (previousOrder.get(right.id)?.index ?? Number.MAX_SAFE_INTEGER)
        ))
        .map((entry, index) => ({
          ...entry,
          sort_order: previousOrder.get(entry.id)?.sortOrder ?? entry.sort_order ?? index,
        }));
      entriesRef.current = restoredEntries;
      setEntries(restoredEntries);
      setError(getFriendlySashError(nextError, "순서를 저장하지 못했습니다. 기존 순서로 되돌렸습니다."));
    }
  }

  async function togglePinnedEntry(entryId) {
    if (!companyId || !selectedSubitemId) return;
    if (!pinPyeong) {
      setPinRequirement("평수를 먼저 선택하세요");
      window.requestAnimationFrame(() => {
        pinPyeongSelectRef.current?.focus();
        pinPyeongSelectRef.current?.click();
      });
      return;
    }
    setPinRequirement("");
    const requestRevision = ++pinRequestRevisionRef.current;
    const previousEntryId = pinnedEntryId;
    const nextEntryId = entryId === pinnedEntryId ? "" : entryId;
    setPinnedEntryId(nextEntryId);
    setPinSaving(true);
    setError("");
    const previousSaveRequest = pinSaveQueueRef.current;
    const saveRequest = mutationStatus.run(
      () => previousSaveRequest
        .catch(() => undefined)
        .then(() => upsertSashCatalogPin({
          companyId,
          pyeong: pinPyeong,
          constructionSubitemId: selectedSubitemId,
          sashCatalogEntryId: nextEntryId,
        })),
      () => togglePinnedEntry(entryId)
    );
    pinSaveQueueRef.current = saveRequest;
    try {
      await saveRequest;
    } catch (nextError) {
      if (pinRequestRevisionRef.current === requestRevision) {
        setPinnedEntryId(previousEntryId);
        setError(getFriendlySashError(nextError, "고정 샷시 제품을 저장하지 못했습니다."));
      }
    } finally {
      if (pinRequestRevisionRef.current === requestRevision) setPinSaving(false);
    }
  }

  function renderCell({ row, column }) {
    const isSaving = savingId === row.id;
    const usesAreaPricing = row.pricing_basis === SASH_PRICING_BASES.AREA;
    const hasExplicitWindowType = hasExplicitSashWindowType(row.window_type);
    if (column.key === "pin") {
      const pinned = row.id === pinnedEntryId;
      return (
        <button
          type="button"
          className={`sash-catalog-grid__pin ${pinned ? "is-pinned" : ""}`.trim()}
          disabled={isLocalSashCatalogEntry(row)}
          aria-pressed={pinned}
          aria-label={!pinPyeong ? "대표제품 고정 평수 선택" : pinned ? `${pinPyeong}평 대표제품 고정 해제` : `${pinPyeong}평 대표제품으로 고정`}
          title={!pinPyeong ? "평수를 선택한 뒤 대표제품으로 고정" : pinned ? `${pinPyeong}평 대표제품 고정 해제` : `${pinPyeong}평 대표제품으로 고정`}
          onClick={() => togglePinnedEntry(row.id)}
        >
          <Pin size={15} strokeWidth={1.5} fill={pinned ? "currentColor" : "none"} />
        </button>
      );
    }
    if (column.key === "sash_category") {
      return (
        <Select
          selectClassName="items-v2-inline-select"
          value={row.sash_category}
          aria-label="샷시 분류"
          onChange={(event) => patchEntry(row.id, { sash_category: event.target.value }, { immediate: true })}
        >
          <option value={SASH_CATEGORIES.STANDARD}>일반</option>
          <option value={SASH_CATEGORIES.BALCONY}>베란다</option>
        </Select>
      );
    }
    if ([
      "brand",
      "frame_spec",
      "pair_spec",
      "glass_spec",
      "gas_spec",
      "screen_spec",
    ].includes(column.key)) {
      const isLegacyFrame = column.key === "frame_spec" && !usesAreaPricing;
      const fieldKey = isLegacyFrame ? "product_type" : column.key;
      return (
        <input
          ref={isLocalSashCatalogEntry(row) && column.key === "brand" ? firstDraftInputRef : undefined}
          className="ui-table__input"
          value={row[fieldKey]}
          placeholder="—"
          aria-label={{
            brand: "제조사",
            frame_spec: isLegacyFrame ? "기존 제품 구분" : "틀",
            pair_spec: "페어",
            glass_spec: "유리",
            gas_spec: "가스",
            screen_spec: "망",
          }[column.key]}
          onChange={(event) => patchEntry(row.id, { [fieldKey]: event.target.value })}
          onBlur={autosave.run}
        />
      );
    }
    if (column.key === "window_type") {
      return (
        <Select
          selectClassName="items-v2-inline-select"
          value={row.window_type}
          aria-label="단창 또는 2중창"
          onChange={(event) => patchEntry(row.id, { window_type: event.target.value }, { immediate: true })}
        >
          <option
            value={SASH_WINDOW_TYPES.UNSPECIFIED}
            disabled={usesAreaPricing}
          >
            {usesAreaPricing ? "선택 필요" : "미지정"}
          </option>
          <option value={SASH_WINDOW_TYPES.SINGLE}>단창</option>
          <option value={SASH_WINDOW_TYPES.DOUBLE}>2중창</option>
        </Select>
      );
    }
    if (column.key === "measurement_kind") {
      return (
        <Select
          selectClassName="items-v2-inline-select"
          value={row.measurement_kind}
          aria-label="치수 기준"
          onChange={(event) => patchEntry(row.id, { measurement_kind: event.target.value }, { immediate: true })}
        >
          {!usesAreaPricing && <option value={SASH_MEASUREMENT_KINDS.UNSPECIFIED}>미지정</option>}
          <option value={SASH_MEASUREMENT_KINDS.ESTIMATE}>가견적</option>
          <option value={SASH_MEASUREMENT_KINDS.MEASURED}>실측</option>
        </Select>
      );
    }
    if (column.key === "width_mm" || column.key === "height_mm") {
      return (
        <div className="sash-catalog-grid__number-input">
          <input
            className="ui-table__input"
            type="text"
            inputMode="numeric"
            value={row[column.key]}
            aria-label={column.key === "width_mm" ? "가로 mm" : "세로 mm"}
            onChange={(event) => patchEntry(row.id, {
              [column.key]: event.target.value.replace(/[^\d]/g, ""),
            })}
            onBlur={autosave.run}
          />
          <span>mm</span>
        </div>
      );
    }
    if (column.key === "area_sqm") {
      if (usesAreaPricing && !hasExplicitWindowType) {
        return <span className="sash-catalog-grid__readonly" aria-readonly="true">미확정</span>;
      }
      const area = usesAreaPricing ? getSashBillableArea(row) : getSashEntryArea(row);
      return <span className="sash-catalog-grid__readonly" aria-readonly="true">{formatSashHebe(area)}</span>;
    }
    if (column.key === "unit_price" && !usesAreaPricing) {
      return <span className="sash-catalog-grid__legacy-label">총액 직접입력</span>;
    }
    if (column.key === "amount" && usesAreaPricing) {
      if (!hasExplicitWindowType) {
        return <span className="sash-catalog-grid__readonly" aria-readonly="true">미확정</span>;
      }
      return (
        <span className="sash-catalog-grid__readonly" aria-readonly="true">
          {formatMoneyInputValue(getSashCatalogEntryAmount(row))}원
        </span>
      );
    }
    if (column.key === "unit_price" || column.key === "cost_price" || column.key === "amount") {
      const fieldKey = column.key === "amount" ? "unit_price" : column.key;
      return (
        <div className="sash-catalog-grid__number-input">
          <input
            className="ui-table__input"
            type="text"
            inputMode="numeric"
            value={formatMoneyInputValue(row[fieldKey])}
            aria-label={column.key === "unit_price" ? "단가" : column.key === "amount" ? "기존 고정 금액" : "원가"}
            onChange={(event) => patchEntry(row.id, {
              [fieldKey]: stripNumberInputFormatting(event.target.value),
            })}
            onBlur={autosave.run}
          />
          <span>원</span>
        </div>
      );
    }
    if (column.key === "updated_at") {
      return <span className="sash-catalog-grid__readonly" aria-readonly="true">{formatDisplayTimestampDate(row.updated_at)}</span>;
    }
    if (column.key === "actions") {
      return (
        <div className="sash-catalog-grid__actions">
          <button
            type="button"
            className="items-v2-icon-button sash-catalog-grid__delete"
            disabled={isSaving}
            aria-label="샷시 규격 삭제"
            title="삭제"
            onClick={() => archiveEntry(row)}
          >
            <Trash2 size={16} strokeWidth={1.5} />
          </button>
        </div>
      );
    }
    return "";
  }

  return (
    <section className="sash-catalog-grid" aria-label={title}>
      {error && entries.length > 0 && <div className="error-box sash-catalog-grid__message">{error}</div>}

      {subitem && !loading && (
        <div className="sash-catalog-grid__toolbar">
          {categoryNavigation}
          <div className="sash-catalog-grid__pin-context">
          {!usesTemplatePyeong && (
              <Select
                ref={pinPyeongSelectRef}
                selectClassName="items-v2-inline-select"
                value={pinPyeong}
                disabled={pinSaving}
                aria-label={`${subitem.name} 고정 제품 평수`}
                onChange={(event) => {
                  setPinPyeong(event.target.value);
                  setPinRequirement("");
                }}
              >
                <option value="">평수 선택</option>
                {PYEONG_OPTIONS.map((pyeong) => (
                  <option key={pyeong} value={pyeong}>{pyeong}평</option>
                ))}
              </Select>
          )}
          {pinRequirement && <span className="sash-catalog-grid__pin-requirement" role="status">{pinRequirement}</span>}
          <Button variant="tertiary" size="sm" className="table-layout-reset" onClick={tableLayout.resetWidths}>
            열 너비 초기화
          </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="admin-items-v2-loading-table sash-catalog-grid__loading" aria-label="샷시 규격 불러오는 중">
          <div className="admin-items-v2-loading-row" />
          <div className="admin-items-v2-loading-row" />
          <div className="admin-items-v2-loading-row" />
        </div>
      ) : error && !entries.length ? (
        <div className="sash-catalog-grid__empty">
          <span>샷시 규격을 불러오지 못했습니다.</span>
          <button type="button" onClick={() => setReloadToken((current) => current + 1)}>다시 시도</button>
        </div>
      ) : entries.length ? (
        <Table
          columns={tableLayout.columns}
          rows={displayEntries}
          renderCell={renderCell}
          rowHeight={40}
          stickyHeader
          scrollCue
          draggable={!hasLocalEntry}
          onReorder={reorderEntries}
          resizable
          onColumnResizeStart={tableLayout.startResize}
          onColumnResizeBy={tableLayout.resizeColumnBy}
          className="sash-catalog-grid__table"
        />
      ) : (
        <div className="sash-catalog-grid__empty">
          <span>등록된 샷시 규격이 없습니다.</span>
          {sashCategory === SASH_CATEGORIES.UNSPECIFIED
            ? <span>분류를 지정하면 일반 또는 베란다 목록으로 이동합니다.</span>
            : <button type="button" onClick={addEntry}><Plus size={16} strokeWidth={1.5} />규격 추가</button>}
        </div>
      )}

      {subitem && entries.length > 0 && sashCategory !== SASH_CATEGORIES.UNSPECIFIED && (
        <button
          type="button"
          className="sash-catalog-grid__add"
          disabled={loading}
          onClick={addEntry}
        >
          <Plus size={16} strokeWidth={1.5} />
          규격 추가
        </button>
      )}
    </section>
  );
}
