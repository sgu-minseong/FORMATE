import { useEffect, useRef, useState } from "react";
import { Archive, Plus } from "lucide-react";
import Table from "../../components/ui/Table";
import useDebouncedAutosave from "../../shared/hooks/useDebouncedAutosave";
import useMutationSaveStatus from "../../shared/hooks/useMutationSaveStatus";
import { formatDisplayDate } from "../../shared/utils/dates";
import {
  formatMoneyInputValue,
  stripNumberInputFormatting,
} from "../../shared/utils/numbers";
import {
  archiveSashSpecialItem,
  fetchActiveSashSpecialItems,
  insertSashSpecialItem,
  saveSashSpecialItemOrder,
  updateSashSpecialItem,
} from "./sashSpecialItemApi";
import {
  createLocalSashSpecialItem,
  getSashSpecialItemArea,
  getSashSpecialItemValidationError,
  isLocalSashSpecialItem,
  normalizeSashSpecialItem,
} from "./sashSpecialItemModel";
import { formatSashArea } from "./sashCatalogModel";

function getFriendlySpecialItemError(error, fallback) {
  return error?.message || fallback;
}

function moveItem(items, sourceIndex, targetIndex) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);
  return nextItems.map((item, index) => ({ ...item, sort_order: index }));
}

export default function SashSpecialItemsManager({
  companyId,
  categoryNavigation,
  onDirtyChange,
  onSaveStateChange,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [dirtyItemIds, setDirtyItemIds] = useState(() => new Set());
  const firstDraftInputRef = useRef(null);
  const itemsRef = useRef(items);
  const dirtyItemIdsRef = useRef(dirtyItemIds);
  const itemRevisionsRef = useRef(new Map());
  itemsRef.current = items;
  dirtyItemIdsRef.current = dirtyItemIds;
  const autosave = useDebouncedAutosave({ save: persistDirtyItems });
  const mutationStatus = useMutationSaveStatus({ autosave, onChange: onSaveStateChange });
  const persistedItemCount = items.filter((item) => !isLocalSashSpecialItem(item)).length;

  useEffect(() => {
    onDirtyChange?.(items.some(isLocalSashSpecialItem));
  }, [items, onDirtyChange]);

  useEffect(() => {
    let cancelled = false;
    if (!companyId) {
      setItems([]);
      setLoaded(false);
      setDirtyItemIds(new Set());
      return undefined;
    }

    setLoading(true);
    setLoaded(false);
    setError("");
    setDirtyItemIds(new Set());
    fetchActiveSashSpecialItems(companyId)
      .then((rows) => {
        if (!cancelled) {
          setItems(rows.map(normalizeSashSpecialItem));
          setLoaded(true);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setItems([]);
          setError(getFriendlySpecialItemError(
            nextError,
            "추가 작업을 불러오지 못했습니다. 다시 시도해주세요."
          ));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, reloadToken]);

  function patchItem(itemId, patch) {
    const nextItems = itemsRef.current.map((item) => (
      item.id === itemId ? { ...item, ...patch } : item
    ));
    const nextDirtyIds = new Set(dirtyItemIdsRef.current).add(itemId);
    itemRevisionsRef.current.set(itemId, (itemRevisionsRef.current.get(itemId) ?? 0) + 1);
    itemsRef.current = nextItems;
    dirtyItemIdsRef.current = nextDirtyIds;
    setItems(nextItems);
    setDirtyItemIds(nextDirtyIds);
    autosave.markDirty();
  }

  function addItem() {
    const nextItem = createLocalSashSpecialItem({ sortOrder: items.length });
    const nextItems = [...itemsRef.current, nextItem];
    itemsRef.current = nextItems;
    setItems(nextItems);
    setError("");
    window.requestAnimationFrame(() => firstDraftInputRef.current?.focus());
  }

  async function persistDirtyItems() {
    const dirtyIds = [...dirtyItemIdsRef.current];
    let hasIncompleteDraft = false;
    for (const itemId of dirtyIds) {
      const item = itemsRef.current.find((candidate) => candidate.id === itemId);
      if (!item) continue;
      const validationError = getSashSpecialItemValidationError(item);
      if (validationError) {
        if (isLocalSashSpecialItem(item)) {
          hasIncompleteDraft = true;
          continue;
        }
        throw new Error(validationError);
      }
      await saveItem(item, { autosave: true });
    }
    return !hasIncompleteDraft;
  }

  async function saveItem(item, { autosave: isAutosave = false } = {}) {
    const validationError = getSashSpecialItemValidationError(item);
    if (validationError) {
      if (!isAutosave || !isLocalSashSpecialItem(item)) setError(validationError);
      return false;
    }

    const revisionAtSave = itemRevisionsRef.current.get(item.id) ?? 0;
    setSavingId(item.id);
    setError("");
    try {
      const savedItem = isLocalSashSpecialItem(item)
        ? await insertSashSpecialItem(item, companyId)
        : await updateSashSpecialItem(item, companyId);
      const normalizedSavedItem = normalizeSashSpecialItem(savedItem);
      const currentRevision = itemRevisionsRef.current.get(item.id) ?? 0;
      const latestItem = itemsRef.current.find((candidate) => candidate.id === item.id);
      const replacementItem = currentRevision === revisionAtSave || !latestItem
        ? normalizedSavedItem
        : { ...normalizedSavedItem, ...latestItem, id: normalizedSavedItem.id };
      const nextItems = itemsRef.current.map((currentItem) => (
        currentItem.id === item.id ? replacementItem : currentItem
      ));
      const nextDirtyIds = new Set(dirtyItemIdsRef.current);
      nextDirtyIds.delete(item.id);
      if (currentRevision !== revisionAtSave) nextDirtyIds.add(normalizedSavedItem.id);
      itemsRef.current = nextItems;
      dirtyItemIdsRef.current = nextDirtyIds;
      setItems(nextItems);
      setDirtyItemIds(nextDirtyIds);
      if (currentRevision !== revisionAtSave) {
        itemRevisionsRef.current.set(normalizedSavedItem.id, currentRevision);
      }
      return true;
    } catch (nextError) {
      const message = getFriendlySpecialItemError(
        nextError,
        "추가 작업을 저장하지 못했습니다. 입력값과 권한을 확인해주세요."
      );
      setError(message);
      throw new Error(message);
    } finally {
      setSavingId("");
    }
  }

  async function archiveItem(item) {
    if (isLocalSashSpecialItem(item)) {
      const nextItems = itemsRef.current.filter((currentItem) => currentItem.id !== item.id);
      const nextDirtyIds = new Set(dirtyItemIdsRef.current);
      nextDirtyIds.delete(item.id);
      itemsRef.current = nextItems;
      dirtyItemIdsRef.current = nextDirtyIds;
      setItems(nextItems);
      setDirtyItemIds(nextDirtyIds);
      return;
    }
    if (!window.confirm(`“${item.description}” 추가 작업을 보관할까요?`)) return;

    setSavingId(item.id);
    setError("");
    try {
      await mutationStatus.run(
        () => archiveSashSpecialItem(item.id, companyId),
        () => archiveItem(item)
      );
      const nextItems = itemsRef.current.filter((currentItem) => currentItem.id !== item.id);
      const nextDirtyIds = new Set(dirtyItemIdsRef.current);
      nextDirtyIds.delete(item.id);
      itemsRef.current = nextItems;
      dirtyItemIdsRef.current = nextDirtyIds;
      setItems(nextItems);
      setDirtyItemIds(nextDirtyIds);
    } catch (nextError) {
      setError(getFriendlySpecialItemError(nextError, "추가 작업을 보관하지 못했습니다."));
    } finally {
      setSavingId("");
    }
  }

  async function reorderItems(sourceIndex, targetIndex) {
    if (itemsRef.current.some(isLocalSashSpecialItem)) return;
    const previousItems = itemsRef.current;
    const nextItems = moveItem(previousItems, sourceIndex, targetIndex);
    itemsRef.current = nextItems;
    setItems(nextItems);
    setError("");
    try {
      await mutationStatus.run(
        () => saveSashSpecialItemOrder(nextItems, companyId),
        () => reorderItems(sourceIndex, targetIndex)
      );
    } catch (nextError) {
      itemsRef.current = previousItems;
      setItems(previousItems);
      setError(getFriendlySpecialItemError(
        nextError,
        "추가작업 순서를 저장하지 못했습니다. 기존 순서로 되돌렸습니다."
      ));
    }
  }

  const columns = [
    { key: "description", label: "설명", width: "220px" },
    { key: "width_mm", label: "가로", align: "right", width: "96px" },
    { key: "height_mm", label: "세로", align: "right", width: "96px" },
    { key: "area_sqm", label: "면적", align: "right", width: "88px" },
    { key: "amount", label: "금액", align: "right", width: "120px" },
    { key: "updated_at", label: "저장일", width: "84px" },
    { key: "actions", label: "", width: "40px" },
  ];

  function renderCell({ row, column }) {
    const isSaving = savingId === row.id;
    if (column.key === "description") {
      return (
        <input
          ref={isLocalSashSpecialItem(row) ? firstDraftInputRef : undefined}
          className="ui-table__input"
          value={row.description}
          aria-label="추가 작업 설명"
          onChange={(event) => patchItem(row.id, { description: event.target.value })}
          onBlur={autosave.run}
        />
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
            aria-label={column.key === "width_mm" ? "추가 작업 기본 가로 mm" : "추가 작업 기본 세로 mm"}
            onChange={(event) => patchItem(row.id, {
              [column.key]: event.target.value.replace(/[^\d]/g, ""),
            })}
            onBlur={autosave.run}
          />
          <span>mm</span>
        </div>
      );
    }
    if (column.key === "area_sqm") {
      return (
        <span className="sash-catalog-grid__readonly" aria-readonly="true">
          {formatSashArea(getSashSpecialItemArea(row))}
        </span>
      );
    }
    if (column.key === "amount") {
      return (
        <div className="sash-catalog-grid__number-input">
          <input
            className="ui-table__input"
            type="text"
            inputMode="numeric"
            value={formatMoneyInputValue(row.amount)}
            aria-label="추가 작업 직접입력 금액"
            onChange={(event) => patchItem(row.id, {
              amount: stripNumberInputFormatting(event.target.value),
            })}
            onBlur={autosave.run}
          />
          <span>원</span>
        </div>
      );
    }
    if (column.key === "updated_at") {
      return (
        <span className="sash-catalog-grid__readonly" aria-readonly="true">
          {row.updated_at ? formatDisplayDate(row.updated_at.slice(0, 10)) : "-"}
        </span>
      );
    }
    if (column.key === "actions") {
      return (
        <div className="sash-catalog-grid__actions">
          <button
            type="button"
            className="items-v2-icon-button"
            disabled={isSaving}
            aria-label="추가 작업 보관"
            title="보관"
            onClick={() => archiveItem(row)}
          >
            <Archive size={16} strokeWidth={1.5} />
          </button>
        </div>
      );
    }
    return "";
  }

  return (
    <section className="sash-special-items" aria-label="추가 작업 관리">
      <div className="sash-catalog-grid__toolbar">
        {categoryNavigation}
        <div className="sash-catalog-grid__pin-context">
          <span className="sash-special-items__count">{loaded ? `${persistedItemCount}개` : ""}</span>
        </div>
      </div>

      {error && items.length > 0 && <div className="error-box sash-catalog-grid__message">{error}</div>}

      {loading ? (
        <div className="admin-items-v2-loading-table sash-catalog-grid__loading" aria-label="추가 작업 불러오는 중">
          <div className="admin-items-v2-loading-row" />
          <div className="admin-items-v2-loading-row" />
        </div>
      ) : error && !items.length ? (
        <div className="sash-catalog-grid__empty">
          <span>추가 작업을 불러오지 못했습니다.</span>
          <button type="button" onClick={() => setReloadToken((current) => current + 1)}>다시 시도</button>
        </div>
      ) : items.length ? (
        <Table
          columns={columns}
          rows={items}
          renderCell={renderCell}
          rowHeight={40}
          stickyHeader
          scrollCue
          draggable={!items.some(isLocalSashSpecialItem)}
          onReorder={reorderItems}
          className="sash-special-items__table"
        />
      ) : (
        <div className="sash-catalog-grid__empty">
          <span>등록된 추가 작업이 없습니다.</span>
          <button type="button" onClick={addItem}>
            <Plus size={16} strokeWidth={1.5} />추가
          </button>
        </div>
      )}

      {items.length > 0 && (
        <button
          type="button"
          className="sash-catalog-grid__add"
          disabled={loading}
          onClick={addItem}
        >
          <Plus size={16} strokeWidth={1.5} />
          추가
        </button>
      )}
    </section>
  );
}
