import { Check, GripVertical, Image, MoreVertical, Plus, RefreshCcw, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import PhotoViewer, { shouldSuppressPhotoClick } from "../../components/PhotoViewer";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import {
  MAX_SUBITEM_PHOTO_COUNT,
  PHOTO_TAB_OPTIONS,
  PHOTO_TYPES,
  getPhotoImageUrl,
  getPrimaryPhoto,
} from "./photoModel";

function sameSelection(current, next) {
  return current.full_project === next.full_project
    && current.partial_project === next.partial_project;
}

export default function PhotoManagementPage({ controller }) {
  const {
    photoTab, setPhotoTab, photoCollections, photoCollectionDrafts,
    photoCatalog, photoAutoSaveStatus, photoAutoSaveMessage, photoLoading, photoSaving,
    hasPendingPhotoChanges, photoError, setPhotoError, photoNotice, setPhotoNotice, getPhotosForTarget,
    refresh, flushPendingChanges, addCollection, changeCollectionName, cancelCollectionNameEdit,
    deleteCollection, reorderCollections,
    upload, setPrimary, remove, movePhoto, reorderSubitems,
  } = controller;
  const [selectedCollections, setSelectedCollections] = useState({
    [PHOTO_TYPES.FULL_PROJECT]: "",
    [PHOTO_TYPES.PARTIAL_PROJECT]: "",
  });
  const [selectedSubitemId, setSelectedSubitemId] = useState("");
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [viewerIndex, setViewerIndex] = useState(null);
  const [draggedPhotoId, setDraggedPhotoId] = useState("");
  const [draggedCollectionId, setDraggedCollectionId] = useState("");
  const [draggedSubitem, setDraggedSubitem] = useState(null);
  const [dropTargetId, setDropTargetId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteDestinationId, setDeleteDestinationId] = useState("");
  const dragEndedAtRef = useRef(0);
  const collectionNameBeforeEditRef = useRef("");

  const collectionsByType = useMemo(() => ({
    [PHOTO_TYPES.FULL_PROJECT]: photoCollections.filter((entry) => entry.photo_type === PHOTO_TYPES.FULL_PROJECT),
    [PHOTO_TYPES.PARTIAL_PROJECT]: photoCollections.filter((entry) => entry.photo_type === PHOTO_TYPES.PARTIAL_PROJECT),
  }), [photoCollections]);
  const subitemEntries = useMemo(() => photoCatalog.flatMap((item) => (
    (item.subitems ?? []).map((subitem) => ({ ...subitem, parentId: item.id, parentName: item.name }))
  )), [photoCatalog]);

  useEffect(() => {
    const next = {
      [PHOTO_TYPES.FULL_PROJECT]: collectionsByType[PHOTO_TYPES.FULL_PROJECT]
        .some((entry) => entry.id === selectedCollections[PHOTO_TYPES.FULL_PROJECT])
        ? selectedCollections[PHOTO_TYPES.FULL_PROJECT]
        : collectionsByType[PHOTO_TYPES.FULL_PROJECT][0]?.id ?? "",
      [PHOTO_TYPES.PARTIAL_PROJECT]: collectionsByType[PHOTO_TYPES.PARTIAL_PROJECT]
        .some((entry) => entry.id === selectedCollections[PHOTO_TYPES.PARTIAL_PROJECT])
        ? selectedCollections[PHOTO_TYPES.PARTIAL_PROJECT]
        : collectionsByType[PHOTO_TYPES.PARTIAL_PROJECT][0]?.id ?? "",
    };
    if (!sameSelection(selectedCollections, next)) setSelectedCollections(next);
  }, [collectionsByType, selectedCollections]);

  useEffect(() => {
    if (subitemEntries.some((entry) => entry.id === selectedSubitemId)) return;
    setSelectedSubitemId(subitemEntries[0]?.id ?? "");
  }, [selectedSubitemId, subitemEntries]);

  const selectedTargetId = photoTab === PHOTO_TYPES.SUBITEM
    ? selectedSubitemId || subitemEntries[0]?.id || ""
    : selectedCollections[photoTab] || collectionsByType[photoTab]?.[0]?.id || "";
  const selectedCollection = photoTab === PHOTO_TYPES.SUBITEM
    ? null
    : collectionsByType[photoTab]?.find((entry) => entry.id === selectedTargetId) ?? null;
  const selectedSubitem = photoTab === PHOTO_TYPES.SUBITEM
    ? subitemEntries.find((entry) => entry.id === selectedSubitemId) ?? null
    : null;
  const selectedPhotos = selectedTargetId ? getPhotosForTarget(photoTab, selectedTargetId) : [];
  const primaryPhoto = getPrimaryPhoto(selectedPhotos);
  const selectedLabel = photoTab === PHOTO_TYPES.SUBITEM
    ? selectedSubitem?.name || "세부항목"
    : selectedCollection?.name || "사진";
  const collectionDeletePhotos = deleteTarget
    ? getPhotosForTarget(deleteTarget.photo_type, deleteTarget.id)
    : [];
  const deleteDestinations = deleteTarget
    ? collectionsByType[deleteTarget.photo_type].filter((entry) => entry.id !== deleteTarget.id)
    : [];

  function clearDragState() {
    dragEndedAtRef.current = Date.now();
    setDraggedPhotoId("");
    setDraggedCollectionId("");
    setDraggedSubitem(null);
    setDropTargetId("");
  }

  function selectType(nextType) {
    setPhotoTab(nextType);
    setNewCollectionOpen(false);
    setNewCollectionName("");
    setViewerIndex(null);
    setPhotoError("");
    setPhotoNotice("");
  }

  async function handleAddCollection() {
    const created = await addCollection(photoTab, newCollectionName);
    if (created) {
      setNewCollectionOpen(false);
      setNewCollectionName("");
    }
  }

  async function handleRefresh() {
    if (hasPendingPhotoChanges) {
      const shouldSave = window.confirm("저장 대기 중인 변경 사항을 먼저 저장하고 새로고침할까요?");
      if (!shouldSave || !(await flushPendingChanges())) return;
    }
    await refresh();
  }

  function handlePhotoDragStart(event, photoId) {
    setDraggedPhotoId(photoId);
    setDropTargetId("");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", photoId);
  }

  async function handlePhotoDrop(event, targetType, targetId, targetIndex) {
    event.preventDefault();
    event.stopPropagation();
    if (!draggedPhotoId) return;
    await movePhoto(draggedPhotoId, targetType, targetId, targetIndex);
    clearDragState();
  }

  function openViewer(index) {
    if (shouldSuppressPhotoClick(dragEndedAtRef.current)) return;
    setViewerIndex(index);
  }

  function renderTypeSidebar() {
    return (
      <aside className="photo-type-sidebar" aria-label="사진 유형">
        <div className="photo-sidebar-header">사진 유형</div>
        <div className="photo-sidebar-list">
          {PHOTO_TAB_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.key}
              className={photoTab === option.key ? "active" : ""}
              onClick={() => selectType(option.key)}
            >
              <span>{option.label}</span>
              <em>{option.key === PHOTO_TYPES.SUBITEM
                ? subitemEntries.length
                : collectionsByType[option.key].length}</em>
            </button>
          ))}
        </div>
      </aside>
    );
  }

  function renderCollectionSidebar() {
    const collections = collectionsByType[photoTab] ?? [];
    return (
      <aside className="photo-category-sidebar" aria-label={`${PHOTO_TAB_OPTIONS.find((entry) => entry.key === photoTab)?.label ?? "사진"} 분류`}>
        <div className="photo-sidebar-header"><span>분류</span><strong>{collections.length}개</strong></div>
        <div className="photo-sidebar-list">
          {collections.map((collection) => {
            const count = getPhotosForTarget(photoTab, collection.id).length;
            return (
              <button
                type="button"
                key={collection.id}
                className={`${selectedTargetId === collection.id ? "active" : ""} ${dropTargetId === collection.id ? "drop-target" : ""}`.trim()}
                onClick={() => setSelectedCollections((current) => ({ ...current, [photoTab]: collection.id }))}
                onDragOver={(event) => {
                  if (!draggedPhotoId && !draggedCollectionId) return;
                  event.preventDefault();
                  setDropTargetId(collection.id);
                }}
                onDrop={async (event) => {
                  event.preventDefault();
                  if (draggedPhotoId) {
                    await handlePhotoDrop(event, photoTab, collection.id, count);
                  } else if (draggedCollectionId) {
                    await reorderCollections(photoTab, draggedCollectionId, collection.id);
                    clearDragState();
                  }
                }}
              >
                <span
                  className="photo-drag-handle"
                  draggable={!photoSaving}
                  onDragStart={(event) => {
                    event.stopPropagation();
                    setDraggedCollectionId(collection.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", collection.id);
                  }}
                  onDragEnd={clearDragState}
                  aria-label={`${collection.name} 분류 순서 변경`}
                >
                  <GripVertical size={16} strokeWidth={1.5} />
                </span>
                <span className="photo-sidebar-item-label">{collection.name}</span>
                <em>{count}</em>
              </button>
            );
          })}
          {newCollectionOpen ? (
            <div className="photo-category-add-form">
              <input
                autoFocus
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAddCollection();
                  if (event.key === "Escape") setNewCollectionOpen(false);
                }}
                aria-label="새 사진 분류명"
              />
              <button type="button" onClick={handleAddCollection} disabled={photoSaving} aria-label="분류 추가 저장"><Check size={16} /></button>
              <button type="button" onClick={() => setNewCollectionOpen(false)} aria-label="분류 추가 취소"><X size={16} /></button>
            </div>
          ) : (
            <button type="button" className="photo-category-add-row" onClick={() => setNewCollectionOpen(true)} aria-label="사진 분류 추가">
              <Plus size={18} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </aside>
    );
  }

  function renderSubitemSidebar() {
    return (
      <aside className="photo-category-sidebar photo-subitem-sidebar" aria-label="세부항목 분류">
        <div className="photo-sidebar-header"><span>세부항목</span><strong>{subitemEntries.length}개</strong></div>
        <div className="photo-subitem-sidebar-list formate-scroll-light">
          {photoCatalog.map((item) => (
            <div className="photo-subitem-sidebar-group" key={item.id}>
              <strong>{item.name}</strong>
              {(item.subitems ?? []).map((subitem) => {
                const count = getPhotosForTarget(PHOTO_TYPES.SUBITEM, subitem.id).length;
                return (
                  <button
                    type="button"
                    key={subitem.id}
                    className={`${selectedSubitemId === subitem.id ? "active" : ""} ${dropTargetId === subitem.id ? "drop-target" : ""}`.trim()}
                    onClick={() => setSelectedSubitemId(subitem.id)}
                    onDragOver={(event) => {
                      if (!draggedPhotoId && !draggedSubitem) return;
                      event.preventDefault();
                      setDropTargetId(subitem.id);
                    }}
                    onDrop={async (event) => {
                      event.preventDefault();
                      if (draggedPhotoId) {
                        await handlePhotoDrop(event, PHOTO_TYPES.SUBITEM, subitem.id, count);
                      } else if (draggedSubitem?.itemId === item.id) {
                        await reorderSubitems(item.id, draggedSubitem.id, subitem.id);
                        clearDragState();
                      }
                    }}
                  >
                    <span
                      className="photo-drag-handle"
                      draggable={!photoSaving}
                      onDragStart={(event) => {
                        event.stopPropagation();
                        setDraggedSubitem({ itemId: item.id, id: subitem.id });
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", subitem.id);
                      }}
                      onDragEnd={clearDragState}
                      aria-label={`${subitem.name} 순서 변경`}
                    >
                      <GripVertical size={16} strokeWidth={1.5} />
                    </span>
                    <span className="photo-sidebar-item-label">{subitem.name}</span>
                    <em>{count}</em>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>
    );
  }

  function renderPhotoGrid() {
    if (!selectedTargetId) {
      return <EmptyState className="compact-empty" icon={<Image size={24} />} title="선택할 분류가 없습니다" description={photoTab === PHOTO_TYPES.SUBITEM ? "단가표에서 세부항목을 준비해 주세요." : "왼쪽의 + 버튼으로 분류를 추가해 주세요."} />;
    }
    const limitReached = photoTab === PHOTO_TYPES.SUBITEM && selectedPhotos.length >= MAX_SUBITEM_PHOTO_COUNT;
    return (
      <div className="photo-thumb-grid" data-photo-grid={selectedTargetId}>
        {selectedPhotos.map((photo, index) => {
          const imageUrl = getPhotoImageUrl(photo);
          const isPrimary = photo.id === primaryPhoto?.id;
          return (
            <article
              className={`photo-thumb-card ${isPrimary ? "primary" : ""} ${draggedPhotoId === photo.id ? "dragging" : ""} ${dropTargetId === photo.id ? "drop-target" : ""}`.trim()}
              key={photo.id}
              draggable={!photoSaving}
              onDragStart={(event) => handlePhotoDragStart(event, photo.id)}
              onDragEnd={clearDragState}
              onDragOver={(event) => {
                if (!draggedPhotoId) return;
                event.preventDefault();
                setDropTargetId(photo.id);
              }}
              onDrop={(event) => handlePhotoDrop(event, photoTab, selectedTargetId, index)}
            >
              <button type="button" className="photo-thumb-image" onClick={() => openViewer(index)} aria-label={`${selectedLabel} ${index + 1}번째 사진 확대 보기`}>
                {imageUrl ? <img src={imageUrl} alt={photo.original_filename || `${selectedLabel} 사진`} /> : <Image size={24} strokeWidth={1.5} />}
                {isPrimary && <span>대표</span>}
              </button>
              <button
                type="button"
                className="photo-thumb-delete-button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (window.confirm("이 사진을 삭제할까요?")) remove(photo);
                }}
                disabled={photoSaving}
                aria-label="사진 삭제"
                title="사진 삭제"
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
              <div className="photo-thumb-meta">
                <p title={photo.original_filename || ""}>{photo.original_filename || "사진"}</p>
                <button type="button" onClick={(event) => { event.stopPropagation(); setPrimary(photo); }} disabled={photoSaving || isPrimary}>
                  {isPrimary ? "대표 사진" : "대표로 지정"}
                </button>
              </div>
            </article>
          );
        })}
        <label className={`photo-add-tile ${limitReached || photoSaving ? "disabled" : ""}`.trim()} aria-label={`${selectedLabel} 사진 추가`}>
          <Plus size={26} strokeWidth={1.5} />
          <input
            type="file"
            accept="image/*"
            disabled={limitReached || photoSaving}
            onChange={(event) => {
              upload(photoTab, selectedTargetId, event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <main className="panel-page photo-management-page">
      <section className="photo-management-panel">
        <PageHeader
          eyebrow="사진 관리/확인"
          title="업체 사진 자료실"
          actions={(
            <>
              <Button variant="secondary" leftIcon={<RefreshCcw />} onClick={handleRefresh} disabled={photoLoading || photoSaving}>새로고침</Button>
              <Button leftIcon={<Save />} onClick={flushPendingChanges} disabled={!hasPendingPhotoChanges || photoLoading || photoSaving}>저장</Button>
            </>
          )}
        />
        {photoAutoSaveStatus !== "idle" && <div className={`photo-autosave-status ${photoAutoSaveStatus}`.trim()}><span>{photoAutoSaveStatus === "dirty" ? "저장 대기" : photoAutoSaveStatus === "saving" ? "저장 중..." : photoAutoSaveStatus === "error" ? "저장 실패" : "저장됨"}</span><strong>{photoAutoSaveMessage}</strong></div>}
        {photoLoading && <div className="info-box">사진 데이터를 불러오는 중입니다.</div>}
        {photoNotice && <div className="success-box">{photoNotice}</div>}
        {photoError && <div className="error-box">{photoError}</div>}

        {!photoLoading && (
          <div className="photo-management-workspace">
            {renderTypeSidebar()}
            {photoTab === PHOTO_TYPES.SUBITEM ? renderSubitemSidebar() : renderCollectionSidebar()}
            <section className="photo-content-panel">
              <header className="photo-content-header">
                <div>
                  <span>{PHOTO_TAB_OPTIONS.find((entry) => entry.key === photoTab)?.label}</span>
                  {selectedCollection ? (
                    <input
                      value={photoCollectionDrafts[selectedCollection.id] ?? selectedCollection.name ?? ""}
                      onFocus={(event) => { collectionNameBeforeEditRef.current = event.currentTarget.value; }}
                      onChange={(event) => changeCollectionName(selectedCollection.id, event.target.value)}
                      onBlur={(event) => {
                        if (!event.currentTarget.value.trim()) {
                          cancelCollectionNameEdit(selectedCollection.id, collectionNameBeforeEditRef.current || selectedCollection.name);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelCollectionNameEdit(selectedCollection.id, collectionNameBeforeEditRef.current || selectedCollection.name);
                          event.currentTarget.blur();
                        }
                      }}
                      disabled={photoSaving}
                      aria-label="사진 분류명"
                    />
                  ) : (
                    <h2>{selectedLabel}</h2>
                  )}
                  {photoTab === PHOTO_TYPES.SUBITEM && selectedSubitem?.parentName && <small>{selectedSubitem.parentName}</small>}
                </div>
                <div className="photo-content-actions">
                  <span>{selectedPhotos.length}장</span>
                  {selectedCollection && (
                    <button type="button" className="photo-content-menu-button" onClick={() => { setDeleteTarget(selectedCollection); setDeleteDestinationId(""); }} disabled={photoSaving} aria-label="분류 삭제" title="분류 삭제">
                      <MoreVertical size={18} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </header>
              {renderPhotoGrid()}
            </section>
          </div>
        )}
      </section>

      {viewerIndex !== null && (
        <PhotoViewer
          photos={selectedPhotos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          getPhotoUrl={getPhotoImageUrl}
          getPhotoAlt={(photo) => photo?.original_filename || `${selectedLabel} 사진`}
        />
      )}

      {deleteTarget && (
        <div className="modal-backdrop photo-delete-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null); }}>
          <section className="modal photo-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-delete-title">
            <h3 id="photo-delete-title">{deleteTarget.name} 분류 삭제</h3>
            {collectionDeletePhotos.length > 0 ? (
              <>
                <p>이 분류에는 사진 {collectionDeletePhotos.length}장이 있습니다.</p>
                {deleteDestinations.length > 0 && (
                  <label>
                    <span>사진을 이동할 분류</span>
                    <select value={deleteDestinationId} onChange={(event) => setDeleteDestinationId(event.target.value)}>
                      <option value="">분류 선택</option>
                      {deleteDestinations.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}
                    </select>
                  </label>
                )}
                <div className="photo-delete-actions">
                  {deleteDestinations.length > 0 && <Button variant="secondary" onClick={async () => { if (await deleteCollection(deleteTarget, { mode: "move", destinationId: deleteDestinationId })) setDeleteTarget(null); }} disabled={!deleteDestinationId || photoSaving}>사진 이동 후 삭제</Button>}
                  <Button variant="tertiary" className="danger-text" onClick={async () => { if (window.confirm(`사진 ${collectionDeletePhotos.length}장과 분류를 함께 삭제할까요?`)) { if (await deleteCollection(deleteTarget, { mode: "delete-photos" })) setDeleteTarget(null); } }} disabled={photoSaving}>사진도 함께 삭제</Button>
                  <Button variant="tertiary" onClick={() => setDeleteTarget(null)}>취소</Button>
                </div>
              </>
            ) : (
              <>
                <p>이 분류를 삭제할까요?</p>
                <div className="photo-delete-actions">
                  <Button variant="tertiary" className="danger-text" onClick={async () => { if (await deleteCollection(deleteTarget)) setDeleteTarget(null); }} disabled={photoSaving}>분류 삭제</Button>
                  <Button variant="tertiary" onClick={() => setDeleteTarget(null)}>취소</Button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
