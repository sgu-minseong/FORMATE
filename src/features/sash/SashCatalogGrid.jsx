import { useEffect, useRef, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import Table from "../../components/ui/Table";
import {
  formatMoneyInputValue,
  stripNumberInputFormatting,
} from "../../shared/utils/numbers";
import { formatDisplayDate } from "../../shared/utils/dates";
import {
  archiveSashCatalogEntry,
  fetchActiveSashCatalogEntries,
  insertSashCatalogEntry,
  saveSashCatalogEntryOrder,
  updateSashCatalogEntry,
} from "./sashCatalogApi";
import {
  createLocalSashCatalogEntry,
  formatSashArea,
  getSashCatalogEntryValidationError,
  getSashEntryArea,
  isLocalSashCatalogEntry,
  normalizeSashCatalogEntry,
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

export default function SashCatalogGrid({
  companyId,
  subitem = null,
  title = "샷시 규격",
  onDirtyChange,
  onPersistedCountChange,
}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [dirtyEntryIds, setDirtyEntryIds] = useState(() => new Set());
  const firstDraftInputRef = useRef(null);

  const selectedSubitemId = subitem?.id ?? "";
  const hasLocalEntry = entries.some(isLocalSashCatalogEntry);
  const persistedEntryCount = entries.filter((entry) => !isLocalSashCatalogEntry(entry)).length;

  useEffect(() => {
    onDirtyChange?.(dirtyEntryIds.size > 0);
  }, [dirtyEntryIds, onDirtyChange]);

  useEffect(() => {
    if (loaded) onPersistedCountChange?.(selectedSubitemId, persistedEntryCount);
  }, [loaded, onPersistedCountChange, persistedEntryCount, selectedSubitemId]);

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
    setNotice("");
    fetchActiveSashCatalogEntries(companyId, selectedSubitemId)
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
  }, [companyId, reloadToken, selectedSubitemId]);

  function patchEntry(entryId, patch) {
    setEntries((current) => current.map((entry) => (
      entry.id === entryId ? { ...entry, ...patch } : entry
    )));
    setDirtyEntryIds((current) => new Set(current).add(entryId));
  }

  function addEntry() {
    if (!subitem) return;
    const nextEntry = createLocalSashCatalogEntry({
      constructionSubitemId: subitem.id,
      sortOrder: entries.length,
    });
    setError("");
    setNotice("");
    setEntries((current) => [...current, nextEntry]);
    setDirtyEntryIds((current) => new Set(current).add(nextEntry.id));
    window.requestAnimationFrame(() => firstDraftInputRef.current?.focus());
  }

  async function saveEntry(entry) {
    const validationError = getSashCatalogEntryValidationError(entry);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSavingId(entry.id);
    setError("");
    setNotice("");
    try {
      const context = {
        companyId,
        constructionSubitemId: selectedSubitemId,
      };
      const savedEntry = isLocalSashCatalogEntry(entry)
        ? await insertSashCatalogEntry(entry, context)
        : await updateSashCatalogEntry(entry, context);
      setEntries((current) => current.map((currentEntry) => (
        currentEntry.id === entry.id
          ? normalizeSashCatalogEntry(savedEntry)
          : currentEntry
      )));
      setDirtyEntryIds((current) => {
        const next = new Set(current);
        next.delete(entry.id);
        return next;
      });
      setNotice("저장했습니다.");
    } catch (nextError) {
      setError(getFriendlySashError(nextError, "샷시 규격을 저장하지 못했습니다. 입력값과 권한을 확인해주세요."));
    } finally {
      setSavingId("");
    }
  }

  async function archiveEntry(entry) {
    if (isLocalSashCatalogEntry(entry)) {
      setEntries((current) => current.filter((currentEntry) => currentEntry.id !== entry.id));
      setDirtyEntryIds((current) => {
        const next = new Set(current);
        next.delete(entry.id);
        return next;
      });
      return;
    }

    setSavingId(entry.id);
    setError("");
    setNotice("");
    try {
      await archiveSashCatalogEntry(entry.id, companyId);
      setEntries((current) => current.filter((currentEntry) => currentEntry.id !== entry.id));
      setDirtyEntryIds((current) => {
        const next = new Set(current);
        next.delete(entry.id);
        return next;
      });
      setNotice("샷시 규격을 삭제했습니다.");
    } catch (nextError) {
      setError(getFriendlySashError(nextError, "샷시 규격을 삭제하지 못했습니다."));
    } finally {
      setSavingId("");
    }
  }

  async function reorderEntries(sourceIndex, targetIndex) {
    if (hasLocalEntry) return;
    const previousEntries = entries;
    const nextEntries = moveEntry(entries, sourceIndex, targetIndex);
    setEntries(nextEntries);
    setError("");
    try {
      await saveSashCatalogEntryOrder(nextEntries, companyId);
      setNotice("순서를 저장했습니다.");
    } catch (nextError) {
      setEntries(previousEntries);
      setError(getFriendlySashError(nextError, "순서를 저장하지 못했습니다. 기존 순서로 되돌렸습니다."));
    }
  }

  const columns = [
    { key: "brand", label: "제조사", width: "116px" },
    { key: "product_type", label: "제품 구분", width: "116px" },
    { key: "width_mm", label: "가로", align: "right", width: "92px" },
    { key: "height_mm", label: "세로", align: "right", width: "92px" },
    { key: "area_sqm", label: "헤베", align: "right", width: "80px" },
    { key: "unit_price", label: "금액", align: "right", width: "120px" },
    { key: "cost_price", label: "원가", align: "right", width: "120px" },
    { key: "updated_at", label: "최종 저장일", width: "104px" },
    { key: "actions", label: "", width: "64px" },
  ];

  function renderCell({ row, column }) {
    const isSaving = savingId === row.id;
    if (column.key === "brand" || column.key === "product_type") {
      return (
        <input
          ref={isLocalSashCatalogEntry(row) && column.key === "brand" ? firstDraftInputRef : undefined}
          className="ui-table__input"
          value={row[column.key]}
          aria-label={column.key === "brand" ? "제조사" : "제품 구분"}
          onChange={(event) => patchEntry(row.id, { [column.key]: event.target.value })}
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
            aria-label={column.key === "width_mm" ? "가로 mm" : "세로 mm"}
            onChange={(event) => patchEntry(row.id, {
              [column.key]: event.target.value.replace(/[^\d]/g, ""),
            })}
          />
          <span>mm</span>
        </div>
      );
    }
    if (column.key === "area_sqm") {
      return <span className="sash-catalog-grid__readonly" aria-readonly="true">{formatSashArea(getSashEntryArea(row))}</span>;
    }
    if (column.key === "unit_price" || column.key === "cost_price") {
      return (
        <div className="sash-catalog-grid__number-input">
          <input
            className="ui-table__input"
            type="text"
            inputMode="numeric"
            value={formatMoneyInputValue(row[column.key])}
            aria-label={column.key === "unit_price" ? "금액" : "원가"}
            onChange={(event) => patchEntry(row.id, {
              [column.key]: stripNumberInputFormatting(event.target.value),
            })}
          />
          <span>원</span>
        </div>
      );
    }
    if (column.key === "updated_at") {
      return <span className="sash-catalog-grid__readonly" aria-readonly="true">{row.updated_at ? formatDisplayDate(row.updated_at.slice(0, 10)) : "-"}</span>;
    }
    if (column.key === "actions") {
      return (
        <div className="sash-catalog-grid__actions">
          <button
            type="button"
            className="items-v2-icon-button"
            disabled={isSaving}
            aria-label="샷시 규격 저장"
            title="저장"
            onClick={() => saveEntry(row)}
          >
            <Save size={16} strokeWidth={1.5} />
          </button>
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
      {notice && <div className="status-box sash-catalog-grid__message">{notice}</div>}

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
          columns={columns}
          rows={entries}
          renderCell={renderCell}
          rowHeight={40}
          stickyHeader
          draggable={!hasLocalEntry}
          onReorder={reorderEntries}
          className="sash-catalog-grid__table"
        />
      ) : (
        <div className="sash-catalog-grid__empty">
          <span>등록된 샷시 규격이 없습니다.</span>
          <button type="button" onClick={addEntry}><Plus size={16} strokeWidth={1.5} />샷시 규격 추가</button>
        </div>
      )}

      {subitem && entries.length > 0 && (
        <button
          type="button"
          className="sash-catalog-grid__add"
          disabled={loading}
          onClick={addEntry}
        >
          <Plus size={16} strokeWidth={1.5} />
          샷시 규격 추가
        </button>
      )}
    </section>
  );
}
