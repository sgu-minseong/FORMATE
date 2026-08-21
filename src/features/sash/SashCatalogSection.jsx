import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { updateCanonicalConstructionSubitem } from "../constructionCatalog/constructionCatalogApi";
import { fetchActiveSashCatalogEntryCounts } from "./sashCatalogApi";
import {
  isBalconySashLocation,
  SASH_LOCATION_KINDS,
} from "./sashCatalogModel";
import SashCatalogGrid from "./SashCatalogGrid";
import SashSpecialItemsManager from "./SashSpecialItemsManager";

function confirmDiscardSashDraft() {
  return window.confirm("저장하지 않은 샷시 관리 변경이 있습니다. 변경 내용을 버리고 이동할까요?");
}

function isLocalSubitemId(subitemId) {
  return String(subitemId ?? "").startsWith("local-subitem-");
}

export default function SashCatalogSection({
  companyId,
  pyeong = "",
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
  onSubitemLocationKindChange,
}) {
  const [openSubitemId, setOpenSubitemId] = useState("");
  const [catalogDirty, setCatalogDirty] = useState(false);
  const [specialItemsDirty, setSpecialItemsDirty] = useState(false);
  const [entryCounts, setEntryCounts] = useState({});
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState(false);
  const [locationSavingId, setLocationSavingId] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locationOverrides, setLocationOverrides] = useState({});
  const subitemIds = useMemo(() => subitems.map((subitem) => subitem.id), [subitems]);
  const subitemIdKey = subitemIds.join("|");
  const editorDirty = catalogDirty || specialItemsDirty;

  useEffect(() => {
    setOpenSubitemId("");
    setCatalogDirty(false);
    setSpecialItemsDirty(false);
    setLocationOverrides({});
    setLocationError("");
  }, [item?.id]);

  useEffect(() => {
    if (openSubitemId && !subitemIds.includes(openSubitemId)) {
      setOpenSubitemId("");
      setCatalogDirty(false);
      setSpecialItemsDirty(false);
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
    setCatalogDirty(dirty);
  }, []);

  const handleSpecialItemsDirtyChange = useCallback((dirty) => {
    setSpecialItemsDirty(dirty);
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
      setCatalogDirty(false);
      setSpecialItemsDirty(false);
      return;
    }
    if (openSubitemId && !canLeaveOpenEditor()) return;
    setOpenSubitemId(subitemId);
    setCatalogDirty(false);
    setSpecialItemsDirty(false);
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

  async function changeLocationKind(subitem, nextLocationKind) {
    const currentLocationKind = locationOverrides[subitem.id]
      ?? subitem.sash_location_kind
      ?? "";
    if (!nextLocationKind || nextLocationKind === currentLocationKind) return;
    if (specialItemsDirty && isBalconySashLocation(currentLocationKind) && !confirmDiscardSashDraft()) {
      return;
    }
    if (isLocalSubitemId(subitem.id)) {
      setLocationError("샷시 구분은 세부항목을 먼저 저장한 뒤 지정할 수 있습니다.");
      return;
    }

    setLocationSavingId(subitem.id);
    setLocationError("");
    try {
      const savedSubitem = await updateCanonicalConstructionSubitem(
        subitem.id,
        item.id,
        { sash_location_kind: nextLocationKind }
      );
      const savedLocationKind = savedSubitem.sash_location_kind ?? nextLocationKind;
      setLocationOverrides((current) => ({
        ...current,
        [subitem.id]: savedLocationKind,
      }));
      onSubitemLocationKindChange?.(subitem.id, savedLocationKind);
      if (!isBalconySashLocation(savedLocationKind)) setSpecialItemsDirty(false);
    } catch (error) {
      setLocationError(error?.message || "샷시 구분을 저장하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setLocationSavingId("");
    }
  }

  return (
    <div className="sash-catalog-section">
      <div className="sash-catalog-section__header" aria-hidden="true">
        <span />
        <span>세부항목</span>
        <span>구분</span>
        <span>등록 규격</span>
        <span>관리</span>
      </div>

      {subitems.map((subitem) => {
        const expanded = openSubitemId === subitem.id;
        const locationKind = locationOverrides[subitem.id]
          ?? subitem.sash_location_kind
          ?? "";
        const locationSaving = locationSavingId === subitem.id;
        const locationDisabled = adminSaving || locationSaving || isLocalSubitemId(subitem.id);
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
              <label className="sash-catalog-section__location" onClick={(event) => event.stopPropagation()}>
                <span className="field-label">구분</span>
                <select
                  value={locationKind}
                  disabled={locationDisabled}
                  aria-label={`${subitem.name} 샷시 구분`}
                  title={isLocalSubitemId(subitem.id) ? "세부항목 저장 후 지정할 수 있습니다." : undefined}
                  onChange={(event) => changeLocationKind(subitem, event.target.value)}
                >
                  <option value="" disabled>지정 필요</option>
                  <option value={SASH_LOCATION_KINDS.STANDARD}>일반</option>
                  <option value={SASH_LOCATION_KINDS.BALCONY}>베란다</option>
                </select>
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
                  initialDefaultPyeong={pyeong}
                  title={`${subitem.name} 샷시 규격`}
                  onDirtyChange={handleEditorDirtyChange}
                  onPersistedCountChange={handlePersistedCountChange}
                />
                {isBalconySashLocation(locationKind) && (
                  <SashSpecialItemsManager
                    companyId={companyId}
                    onDirtyChange={handleSpecialItemsDirtyChange}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      {locationError && <div className="error-box sash-catalog-section__message">{locationError}</div>}

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
