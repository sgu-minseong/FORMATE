import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { fetchActiveSashCatalogEntryCounts } from "./sashCatalogApi";
import SashCatalogGrid from "./SashCatalogGrid";

function confirmDiscardSashDraft() {
  return window.confirm("저장하지 않은 샷시 규격 변경이 있습니다. 변경 내용을 버리고 이동할까요?");
}

export default function SashCatalogSection({
  companyId,
  item,
  subitems = [],
  adminSaving = false,
  canReorder = false,
  dragSubitem = null,
  dragOverSubitem = null,
  newlyAddedSubitemId = "",
  materialNamePlaceholder = "세부항목명",
  onAddSubitem,
  onDeleteSubitem,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onSubitemNameBlur,
  onSubitemNameChange,
  onSubitemNameInput,
}) {
  const [openSubitemId, setOpenSubitemId] = useState("");
  const [editorDirty, setEditorDirty] = useState(false);
  const [entryCounts, setEntryCounts] = useState({});
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState(false);
  const subitemIds = useMemo(() => subitems.map((subitem) => subitem.id), [subitems]);
  const subitemIdKey = subitemIds.join("|");

  useEffect(() => {
    setOpenSubitemId("");
    setEditorDirty(false);
  }, [item?.id]);

  useEffect(() => {
    if (openSubitemId && !subitemIds.includes(openSubitemId)) {
      setOpenSubitemId("");
      setEditorDirty(false);
    }
  }, [openSubitemId, subitemIdKey, subitemIds]);

  useEffect(() => {
    let cancelled = false;
    setCountsLoading(true);
    setCountsError(false);
    fetchActiveSashCatalogEntryCounts(companyId, subitemIds)
      .then((counts) => {
        if (!cancelled) setEntryCounts(counts);
      })
      .catch(() => {
        if (!cancelled) setCountsError(true);
      })
      .finally(() => {
        if (!cancelled) setCountsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, subitemIdKey]);

  const handleEditorDirtyChange = useCallback((dirty) => {
    setEditorDirty(dirty);
  }, []);

  const handlePersistedCountChange = useCallback((subitemId, count) => {
    setEntryCounts((current) => (
      current[subitemId] === count ? current : { ...current, [subitemId]: count }
    ));
  }, []);

  function canLeaveOpenEditor() {
    return !editorDirty || confirmDiscardSashDraft();
  }

  function toggleSubitem(subitemId) {
    if (openSubitemId === subitemId) {
      if (!canLeaveOpenEditor()) return;
      setOpenSubitemId("");
      setEditorDirty(false);
      return;
    }
    if (openSubitemId && !canLeaveOpenEditor()) return;
    setOpenSubitemId(subitemId);
    setEditorDirty(false);
  }

  function deleteSubitem(subitemId) {
    if (openSubitemId === subitemId && !canLeaveOpenEditor()) return;
    onDeleteSubitem?.(subitemId);
  }

  function renderCount(subitemId) {
    if (countsLoading && entryCounts[subitemId] === undefined) return "확인 중";
    if (countsError && entryCounts[subitemId] === undefined) return "확인 실패";
    const count = Number(entryCounts[subitemId] ?? 0);
    return count > 0 ? `${count}개` : "규격 없음";
  }

  return (
    <div className="sash-catalog-section">
      <div className="sash-catalog-section__header" aria-hidden="true">
        <span />
        <span>세부항목</span>
        <span>등록 규격</span>
        <span>관리</span>
      </div>

      {subitems.map((subitem) => {
        const expanded = openSubitemId === subitem.id;
        return (
          <div
            key={subitem.id}
            className={`sash-catalog-section__row ${expanded ? "expanded" : ""} ${newlyAddedSubitemId === subitem.id ? "newly-added" : ""} ${dragSubitem?.itemId === item.id && dragSubitem?.subitemId === subitem.id ? "dragging" : ""} ${dragOverSubitem?.itemId === item.id && dragOverSubitem?.subitemId === subitem.id ? "drop-target" : ""}`.trim()}
            data-subitem-id={subitem.id}
            onDragOver={(event) => onDragOver?.(event, item.id, subitem.id)}
            onDrop={() => onDrop?.(item.id, subitem.id)}
            onDragEnd={onDragEnd}
          >
            <div
              className="sash-catalog-section__summary"
              onClick={() => toggleSubitem(subitem.id)}
            >
              <span
                className={`drag-handle admin-price-v2-drag-handle ${canReorder ? "enabled" : ""}`.trim()}
                title="세부항목 순서 변경"
                draggable={canReorder && !adminSaving}
                onClick={(event) => event.stopPropagation()}
                onDragStart={(event) => onDragStart?.(event, item.id, subitem.id)}
                onDragEnd={onDragEnd}
              >
                ::
              </span>
              <label className="admin-material-name-field" onClick={(event) => event.stopPropagation()}>
                <span className="field-label">세부항목</span>
                <input
                  value={subitem.name}
                  placeholder={materialNamePlaceholder}
                  onChange={(event) => onSubitemNameChange?.(subitem.id, event.target.value)}
                  onInput={onSubitemNameInput}
                  onBlur={(event) => onSubitemNameBlur?.(subitem.id, event.target.value)}
                />
              </label>
              <span className={`sash-catalog-section__count ${entryCounts[subitem.id] ? "" : "muted"}`.trim()}>
                {renderCount(subitem.id)}
              </span>
              <div className="sash-catalog-section__actions" onClick={(event) => event.stopPropagation()}>
                <button
                  className="danger-button admin-price-v2-danger-button"
                  type="button"
                  disabled={adminSaving}
                  aria-label={`${subitem.name} 삭제`}
                  onClick={() => deleteSubitem(subitem.id)}
                >
                  <Trash2 size={18} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  className="items-v2-icon-button admin-price-v2-expand-button"
                  aria-expanded={expanded}
                  aria-label={expanded ? "샷시 규격 닫기" : "샷시 규격 열기"}
                  title={expanded ? "샷시 규격 닫기" : "샷시 규격 열기"}
                  onClick={() => toggleSubitem(subitem.id)}
                >
                  {expanded
                    ? <ChevronDown size={18} strokeWidth={1.5} />
                    : <ChevronRight size={18} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {expanded && (
              <div className="sash-catalog-section__editor">
                <SashCatalogGrid
                  companyId={companyId}
                  subitem={subitem}
                  title={`${subitem.name} 샷시 규격`}
                  onDirtyChange={handleEditorDirtyChange}
                  onPersistedCountChange={handlePersistedCountChange}
                />
              </div>
            )}
          </div>
        );
      })}

      {!subitems.length && (
        <p className="admin-price-v2-empty muted">등록된 세부항목이 없습니다.</p>
      )}
      <div className="admin-price-v2-add-action sash-catalog-section__add-subitem">
        <button
          className="secondary-button"
          type="button"
          disabled={adminSaving}
          onClick={() => onAddSubitem?.(item.id)}
        >
          <Plus size={18} /> 항목 추가
        </button>
      </div>
    </div>
  );
}
