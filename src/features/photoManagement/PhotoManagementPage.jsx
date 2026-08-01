import {
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Image,
  MoreVertical,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import PhotoViewer, { shouldSuppressPhotoClick } from "../../components/PhotoViewer";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import {
  MAX_SUBITEM_PHOTO_COUNT,
  getPhotoImageUrl,
  getPrimaryPhoto,
  isDetailPhotoType,
  isGeneralPhotoType,
} from "./photoModel";

export default function PhotoManagementPage({ controller }) {
  const {
    photoTab,
    setPhotoTab,
    photoTypes,
    photoTypeDrafts,
    photoCollections,
    photoCollectionDrafts,
    photos,
    photoCatalog,
    photoAutoSaveStatus,
    photoAutoSaveMessage,
    photoLoading,
    photoSaving,
    hasPendingPhotoChanges,
    photoError,
    setPhotoError,
    photoNotice,
    setPhotoNotice,
    getPhotosForTarget,
    refresh,
    flushPendingChanges,
    addPhotoType,
    changePhotoTypeName,
    cancelPhotoTypeNameEdit,
    reorderPhotoTypes,
    removePhotoType,
    addCollection,
    changeCollectionName,
    cancelCollectionNameEdit,
    deleteCollection,
    reorderCollections,
    upload,
    setPrimary,
    remove,
    movePhoto,
    reorderSubitems,
  } = controller;
  const [selectedCollections, setSelectedCollections] = useState({});
  const [selectedSubitemId, setSelectedSubitemId] = useState("");
  const [expandedDetailItemId, setExpandedDetailItemId] = useState("");
  const [newTypeOpen, setNewTypeOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState("");
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [viewerIndex, setViewerIndex] = useState(null);
  const [draggedPhotoId, setDraggedPhotoId] = useState("");
  const [draggedTypeId, setDraggedTypeId] = useState("");
  const [draggedCollectionId, setDraggedCollectionId] = useState("");
  const [draggedSubitem, setDraggedSubitem] = useState(null);
  const [dropTargetId, setDropTargetId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteDestinationId, setDeleteDestinationId] = useState("");
  const [deleteTypeTarget, setDeleteTypeTarget] = useState(null);
  const [deleteTypeDestinationKey, setDeleteTypeDestinationKey] = useState("");
  const dragEndedAtRef = useRef(0);
  const typeNameBeforeEditRef = useRef("");
  const collectionNameBeforeEditRef = useRef("");

  const selectedType = photoTypes.find((entry) => entry.storage_key === photoTab) ?? null;
  const detailMode = isDetailPhotoType(selectedType);
  const collectionsByType = useMemo(() => Object.fromEntries(photoTypes.map((photoType) => [
    photoType.storage_key,
    photoCollections.filter((collection) => collection.photo_type === photoType.storage_key),
  ])), [photoCollections, photoTypes]);
  const subitemEntries = useMemo(() => photoCatalog.flatMap((item) => (
    (item.subitems ?? []).map((subitem) => ({ ...subitem, parentId: item.id, parentName: item.name }))
  )), [photoCatalog]);

  useEffect(() => {
    if (!photoTypes.length || selectedType) return;
    setPhotoTab(photoTypes[0].storage_key);
  }, [photoTypes, selectedType, setPhotoTab]);

  useEffect(() => {
    setSelectedCollections((current) => {
      const next = { ...current };
      photoTypes.filter(isGeneralPhotoType).forEach((photoType) => {
        const typeCollections = collectionsByType[photoType.storage_key] ?? [];
        if (!typeCollections.some((entry) => entry.id === current[photoType.storage_key])) {
          next[photoType.storage_key] = typeCollections[0]?.id ?? "";
        }
      });
      return JSON.stringify(current) === JSON.stringify(next) ? current : next;
    });
  }, [collectionsByType, photoTypes]);

  useEffect(() => {
    if (subitemEntries.some((entry) => entry.id === selectedSubitemId)) return;
    setSelectedSubitemId(subitemEntries[0]?.id ?? "");
  }, [selectedSubitemId, subitemEntries]);

  const selectedSubitem = detailMode
    ? subitemEntries.find((entry) => entry.id === selectedSubitemId) ?? null
    : null;

  useEffect(() => {
    if (!detailMode || !selectedSubitem?.parentId) return;
    setExpandedDetailItemId(selectedSubitem.parentId);
  }, [detailMode, selectedSubitem?.parentId]);

  const selectedTargetId = detailMode
    ? selectedSubitemId
    : selectedCollections[photoTab] || collectionsByType[photoTab]?.[0]?.id || "";
  const selectedCollection = detailMode
    ? null
    : collectionsByType[photoTab]?.find((entry) => entry.id === selectedTargetId) ?? null;
  const selectedPhotos = selectedTargetId ? getPhotosForTarget(photoTab, selectedTargetId) : [];
  const primaryPhoto = getPrimaryPhoto(selectedPhotos);
  const selectedLabel = detailMode
    ? selectedSubitem?.name || "세부항목"
    : selectedCollection?.name || selectedType?.display_name || "사진";
  const collectionDeletePhotos = deleteTarget
    ? getPhotosForTarget(deleteTarget.photo_type, deleteTarget.id)
    : [];
  const deleteDestinations = deleteTarget
    ? (collectionsByType[deleteTarget.photo_type] ?? []).filter((entry) => entry.id !== deleteTarget.id)
    : [];
  const deleteTypeCollections = deleteTypeTarget
    ? photoCollections.filter((entry) => entry.photo_type === deleteTypeTarget.storage_key)
    : [];
  const deleteTypePhotos = deleteTypeTarget
    ? photos.filter((entry) => (entry.target_type ?? entry.photo_type) === deleteTypeTarget.storage_key)
    : [];
  const deleteTypeDestinations = deleteTypeTarget
    ? photoTypes.filter((entry) => entry.id !== deleteTypeTarget.id && isGeneralPhotoType(entry))
    : [];

  function clearDragState() {
    dragEndedAtRef.current = Date.now();
    setDraggedPhotoId("");
    setDraggedTypeId("");
    setDraggedCollectionId("");
    setDraggedSubitem(null);
    setDropTargetId("");
  }

  function selectType(nextType) {
    setPhotoTab(nextType);
    setNewTypeOpen(false);
    setNewCollectionOpen(false);
    setNewCollectionName("");
    setViewerIndex(null);
    setPhotoError("");
    setPhotoNotice("");
  }

  async function handleAddType() {
    const created = await addPhotoType(newTypeName);
    if (!created) return;
    setNewTypeOpen(false);
    setNewTypeName("");
    setPhotoTab(created.storage_key);
  }

  async function handleAddCollection() {
    const created = await addCollection(photoTab, newCollectionName);
    if (!created) return;
    setNewCollectionOpen(false);
    setNewCollectionName("");
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
        <div className="photo-sidebar-header"><span>사진 유형</span><strong>{photoTypes.length}개</strong></div>
        <div className="photo-sidebar-list photo-type-list formate-scroll-light">
          {photoTypes.map((photoType) => {
            const typePhotoCount = photos.filter((photo) => (
              (photo.target_type ?? photo.photo_type) === photoType.storage_key
            )).length;
            const editing = editingTypeId === photoType.id;
            return (
              <div
                className={`photo-type-row ${photoTab === photoType.storage_key ? "active" : ""} ${dropTargetId === photoType.id ? "drop-target" : ""}`.trim()}
                key={photoType.id}
                onDragOver={(event) => {
                  if (!draggedTypeId) return;
                  event.preventDefault();
                  setDropTargetId(photoType.id);
                }}
                onDrop={async (event) => {
                  event.preventDefault();
                  if (!draggedTypeId) return;
                  await reorderPhotoTypes(draggedTypeId, photoType.id);
                  clearDragState();
                }}
              >
                <span
                  className="photo-drag-handle"
                  draggable={!photoSaving}
                  onDragStart={(event) => {
                    event.stopPropagation();
                    setDraggedTypeId(photoType.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", photoType.id);
                  }}
                  onDragEnd={clearDragState}
                  aria-label={`${photoType.display_name} 유형 순서 변경`}
                >
                  <GripVertical size={16} strokeWidth={1.5} />
                </span>
                {editing ? (
                  <input
                    autoFocus
                    value={photoTypeDrafts[photoType.id] ?? photoType.display_name ?? ""}
                    onFocus={(event) => { typeNameBeforeEditRef.current = event.currentTarget.value; }}
                    onChange={(event) => changePhotoTypeName(photoType.id, event.target.value)}
                    onBlur={(event) => {
                      if (!event.currentTarget.value.trim()) {
                        cancelPhotoTypeNameEdit(photoType.id, typeNameBeforeEditRef.current || photoType.display_name);
                      }
                      setEditingTypeId("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelPhotoTypeNameEdit(photoType.id, typeNameBeforeEditRef.current || photoType.display_name);
                        setEditingTypeId("");
                      }
                    }}
                    aria-label="사진 유형명"
                  />
                ) : (
                  <button
                    type="button"
                    className="photo-type-select"
                    onClick={() => selectType(photoType.storage_key)}
                    onDoubleClick={() => setEditingTypeId(photoType.id)}
                    title={photoType.display_name}
                  >
                    <span className="photo-sidebar-item-label">{photoType.display_name}</span>
                    <em>{typePhotoCount}</em>
                  </button>
                )}
                <button
                  type="button"
                  className="photo-row-menu-button"
                  onClick={() => { setDeleteTypeTarget(photoType); setDeleteTypeDestinationKey(""); }}
                  disabled={photoSaving}
                  aria-label={`${photoType.display_name} 유형 관리`}
                  title="이름 변경 또는 유형 정리"
                >
                  <MoreVertical size={16} strokeWidth={1.5} />
                </button>
              </div>
            );
          })}
          {newTypeOpen ? (
            <div className="photo-category-add-form photo-type-add-form">
              <input
                autoFocus
                value={newTypeName}
                onChange={(event) => setNewTypeName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAddType();
                  if (event.key === "Escape") setNewTypeOpen(false);
                }}
                aria-label="새 사진 유형명"
              />
              <button type="button" onClick={handleAddType} disabled={photoSaving} aria-label="사진 유형 추가 저장"><Check size={16} /></button>
              <button type="button" onClick={() => setNewTypeOpen(false)} aria-label="사진 유형 추가 취소"><X size={16} /></button>
            </div>
          ) : (
            <button type="button" className="photo-category-add-row" onClick={() => setNewTypeOpen(true)} aria-label="사진 유형 추가">
              <Plus size={18} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </aside>
    );
  }

  function renderCollectionSidebar() {
    const collections = collectionsByType[photoTab] ?? [];
    return (
      <aside className="photo-category-sidebar" aria-label={`${selectedType?.display_name ?? "사진"} 분류`}>
        <div className="photo-sidebar-header"><span>분류</span><strong>{collections.length}개</strong></div>
        <div className="photo-sidebar-list formate-scroll-light">
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
                title={collection.name}
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
        <div className="photo-sidebar-header"><span>대분류와 세부항목</span><strong>{subitemEntries.length}개</strong></div>
        <div className="photo-subitem-sidebar-list formate-scroll-light">
          {photoCatalog.map((item) => {
            const expanded = expandedDetailItemId === item.id;
            const categoryCount = (item.subitems ?? []).reduce((sum, subitem) => (
              sum + getPhotosForTarget(selectedType.storage_key, subitem.id).length
            ), 0);
            return (
              <section className="photo-subitem-sidebar-group" key={item.id}>
                <button
                  type="button"
                  className="photo-subitem-group-toggle"
                  onClick={() => setExpandedDetailItemId((current) => current === item.id ? "" : item.id)}
                  aria-expanded={expanded}
                  title={item.name}
                >
                  {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="photo-sidebar-item-label">{item.name}</span>
                  <em>{categoryCount}</em>
                </button>
                {expanded && (
                  <div className="photo-subitem-group-children">
                    {(item.subitems ?? []).map((subitem) => {
                      const count = getPhotosForTarget(selectedType.storage_key, subitem.id).length;
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
                              await handlePhotoDrop(event, selectedType.storage_key, subitem.id, count);
                            } else if (draggedSubitem?.itemId === item.id) {
                              await reorderSubitems(item.id, draggedSubitem.id, subitem.id);
                              clearDragState();
                            }
                          }}
                          title={subitem.name}
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
                )}
              </section>
            );
          })}
        </div>
      </aside>
    );
  }

  function renderPhotoGrid() {
    if (!selectedTargetId) {
      return <EmptyState className="compact-empty" icon={<Image size={24} />} title="선택할 분류가 없습니다" description={detailMode ? "단가표에서 세부항목을 준비해 주세요." : "왼쪽의 + 버튼으로 분류를 추가해 주세요."} />;
    }
    const limitReached = detailMode && selectedPhotos.length >= MAX_SUBITEM_PHOTO_COUNT;
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
        <header className="photo-management-toolbar">
          <h1>사진 관리/확인</h1>
          <div className="photo-management-toolbar-actions">
            {photoAutoSaveStatus !== "idle" && (
              <div className={`photo-autosave-status ${photoAutoSaveStatus}`.trim()}>
                <span>{photoAutoSaveStatus === "dirty" ? "저장 대기" : photoAutoSaveStatus === "saving" ? "저장 중" : photoAutoSaveStatus === "error" ? "저장 실패" : "저장됨"}</span>
                <strong>{photoAutoSaveMessage}</strong>
              </div>
            )}
            <Button variant="secondary" leftIcon={<RefreshCcw />} onClick={handleRefresh} disabled={photoLoading || photoSaving}>새로고침</Button>
            <Button leftIcon={<Save />} onClick={flushPendingChanges} disabled={!hasPendingPhotoChanges || photoLoading || photoSaving}>저장</Button>
          </div>
        </header>

        {(photoLoading || photoNotice || photoError) && (
          <div className="photo-management-feedback">
            {photoLoading && <div className="info-box">사진 데이터를 불러오는 중입니다.</div>}
            {photoNotice && <div className="success-box">{photoNotice}</div>}
            {photoError && <div className="error-box">{photoError}</div>}
          </div>
        )}

        {!photoLoading && (
          <div className="photo-management-workspace">
            {renderTypeSidebar()}
            {detailMode ? renderSubitemSidebar() : renderCollectionSidebar()}
            <section className="photo-content-panel">
              <header className="photo-content-header">
                <div className="photo-content-path">
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
                  ) : detailMode && selectedSubitem ? (
                    <h2 title={`${selectedSubitem.parentName} > ${selectedSubitem.name}`}>
                      <span>{selectedSubitem.parentName}</span>
                      <ChevronRight size={16} aria-hidden="true" />
                      <strong>{selectedSubitem.name}</strong>
                    </h2>
                  ) : (
                    <h2>{selectedType?.display_name ?? "사진"}</h2>
                  )}
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
              <div className="photo-grid-scroll formate-scroll-light">{renderPhotoGrid()}</div>
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

      {deleteTypeTarget && (
        <div className="modal-backdrop photo-delete-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTypeTarget(null); }}>
          <section className="modal photo-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-type-delete-title">
            <h3 id="photo-type-delete-title">{deleteTypeTarget.display_name} 유형 관리</h3>
            <p>분류 {deleteTypeCollections.length}개, 사진 {deleteTypePhotos.length}장이 연결되어 있습니다.</p>
            <div className="photo-type-name-action">
              <Button variant="secondary" onClick={() => { setEditingTypeId(deleteTypeTarget.id); setDeleteTypeTarget(null); }}>이름 변경</Button>
            </div>
            {(deleteTypeCollections.length > 0 || deleteTypePhotos.length > 0) && !isDetailPhotoType(deleteTypeTarget) && deleteTypeDestinations.length > 0 && (
              <label>
                <span>분류와 사진을 이동할 유형</span>
                <select value={deleteTypeDestinationKey} onChange={(event) => setDeleteTypeDestinationKey(event.target.value)}>
                  <option value="">유형 선택</option>
                  {deleteTypeDestinations.map((entry) => <option value={entry.storage_key} key={entry.id}>{entry.display_name}</option>)}
                </select>
              </label>
            )}
            <div className="photo-delete-actions">
              {(deleteTypeCollections.length > 0 || deleteTypePhotos.length > 0) && !isDetailPhotoType(deleteTypeTarget) && deleteTypeDestinations.length > 0 && (
                <Button variant="secondary" onClick={async () => { if (await removePhotoType(deleteTypeTarget, { mode: "move", destinationStorageKey: deleteTypeDestinationKey })) setDeleteTypeTarget(null); }} disabled={!deleteTypeDestinationKey || photoSaving}>이동 후 유형 정리</Button>
              )}
              {!deleteTypeTarget.is_system && deleteTypeCollections.length === 0 && deleteTypePhotos.length === 0 && (
                <Button variant="tertiary" className="danger-text" onClick={async () => { if (await removePhotoType(deleteTypeTarget, { mode: "delete" })) setDeleteTypeTarget(null); }} disabled={photoSaving}>유형 삭제</Button>
              )}
              <Button variant="tertiary" onClick={async () => { if (await removePhotoType(deleteTypeTarget, { mode: "archive" })) setDeleteTypeTarget(null); }} disabled={photoSaving}>유형 보관</Button>
              <Button variant="tertiary" onClick={() => setDeleteTypeTarget(null)}>취소</Button>
            </div>
          </section>
        </div>
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
