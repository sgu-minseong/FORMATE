import { useEffect, useRef, useState } from "react";
import { Archive, Plus, Save } from "lucide-react";
import Table from "../../components/ui/Table";
import { formatDisplayDate } from "../../shared/utils/dates";
import {
  formatMoneyInputValue,
  stripNumberInputFormatting,
} from "../../shared/utils/numbers";
import {
  archiveSashSpecialItem,
  fetchActiveSashSpecialItems,
  insertSashSpecialItem,
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

export default function SashSpecialItemsManager({ companyId, onDirtyChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [dirtyItemIds, setDirtyItemIds] = useState(() => new Set());
  const firstDraftInputRef = useRef(null);

  useEffect(() => {
    onDirtyChange?.(dirtyItemIds.size > 0);
  }, [dirtyItemIds, onDirtyChange]);

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
    setNotice("");
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
            "베란다 특이사항을 불러오지 못했습니다. 다시 시도해주세요."
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
    setItems((current) => current.map((item) => (
      item.id === itemId ? { ...item, ...patch } : item
    )));
    setDirtyItemIds((current) => new Set(current).add(itemId));
  }

  function addItem() {
    const nextItem = createLocalSashSpecialItem({ sortOrder: items.length });
    setItems((current) => [...current, nextItem]);
    setDirtyItemIds((current) => new Set(current).add(nextItem.id));
    setError("");
    setNotice("");
    window.requestAnimationFrame(() => firstDraftInputRef.current?.focus());
  }

  async function saveItem(item) {
    const validationError = getSashSpecialItemValidationError(item);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSavingId(item.id);
    setError("");
    setNotice("");
    try {
      const savedItem = isLocalSashSpecialItem(item)
        ? await insertSashSpecialItem(item, companyId)
        : await updateSashSpecialItem(item, companyId);
      setItems((current) => current.map((currentItem) => (
        currentItem.id === item.id
          ? normalizeSashSpecialItem(savedItem)
          : currentItem
      )));
      setDirtyItemIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      setNotice("베란다 특이사항을 저장했습니다.");
    } catch (nextError) {
      setError(getFriendlySpecialItemError(
        nextError,
        "베란다 특이사항을 저장하지 못했습니다. 입력값과 권한을 확인해주세요."
      ));
    } finally {
      setSavingId("");
    }
  }

  async function archiveItem(item) {
    if (isLocalSashSpecialItem(item)) {
      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      setDirtyItemIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      return;
    }
    if (!window.confirm(`“${item.description}” 특이사항을 보관할까요?`)) return;

    setSavingId(item.id);
    setError("");
    setNotice("");
    try {
      await archiveSashSpecialItem(item.id, companyId);
      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      setDirtyItemIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      setNotice("베란다 특이사항을 보관했습니다.");
    } catch (nextError) {
      setError(getFriendlySpecialItemError(nextError, "베란다 특이사항을 보관하지 못했습니다."));
    } finally {
      setSavingId("");
    }
  }

  const columns = [
    { key: "description", label: "설명", width: "260px" },
    { key: "width_mm", label: "기본 가로", align: "right", width: "112px" },
    { key: "height_mm", label: "기본 세로", align: "right", width: "112px" },
    { key: "area_sqm", label: "면적", align: "right", width: "96px" },
    { key: "amount", label: "직접입력 금액", align: "right", width: "144px" },
    { key: "updated_at", label: "최종 저장일", width: "104px" },
    { key: "actions", label: "", width: "64px" },
  ];

  function renderCell({ row, column }) {
    const isSaving = savingId === row.id;
    if (column.key === "description") {
      return (
        <input
          ref={isLocalSashSpecialItem(row) ? firstDraftInputRef : undefined}
          className="ui-table__input"
          value={row.description}
          aria-label="특이사항 설명"
          onChange={(event) => patchItem(row.id, { description: event.target.value })}
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
            aria-label={column.key === "width_mm" ? "특이사항 기본 가로 mm" : "특이사항 기본 세로 mm"}
            onChange={(event) => patchItem(row.id, {
              [column.key]: event.target.value.replace(/[^\d]/g, ""),
            })}
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
            aria-label="특이사항 직접입력 금액"
            onChange={(event) => patchItem(row.id, {
              amount: stripNumberInputFormatting(event.target.value),
            })}
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
            aria-label="베란다 특이사항 저장"
            title="저장"
            onClick={() => saveItem(row)}
          >
            <Save size={16} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="items-v2-icon-button"
            disabled={isSaving}
            aria-label="베란다 특이사항 보관"
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
    <section className="sash-special-items" aria-labelledby="sash-special-items-title">
      <div className="sash-special-items__header">
        <div>
          <h4 id="sash-special-items-title">베란다 특이사항</h4>
          <span>회사 공통 · 평수 무관</span>
        </div>
        {loaded && <span>{items.length}개</span>}
      </div>

      {error && items.length > 0 && <div className="error-box sash-catalog-grid__message">{error}</div>}
      {notice && <div className="status-box sash-catalog-grid__message" aria-live="polite">{notice}</div>}

      {loading ? (
        <div className="admin-items-v2-loading-table sash-catalog-grid__loading" aria-label="베란다 특이사항 불러오는 중">
          <div className="admin-items-v2-loading-row" />
          <div className="admin-items-v2-loading-row" />
        </div>
      ) : error && !items.length ? (
        <div className="sash-catalog-grid__empty">
          <span>베란다 특이사항을 불러오지 못했습니다.</span>
          <button type="button" onClick={() => setReloadToken((current) => current + 1)}>다시 시도</button>
        </div>
      ) : items.length ? (
        <Table
          columns={columns}
          rows={items}
          renderCell={renderCell}
          rowHeight={44}
          stickyHeader
          className="sash-special-items__table"
        />
      ) : (
        <div className="sash-catalog-grid__empty">
          <span>등록된 베란다 특이사항이 없습니다.</span>
          <button type="button" onClick={addItem}>
            <Plus size={16} strokeWidth={1.5} />특이사항 추가
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
          특이사항 추가
        </button>
      )}
    </section>
  );
}
