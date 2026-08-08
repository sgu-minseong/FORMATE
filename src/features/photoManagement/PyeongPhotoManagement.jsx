import {
  ArrowLeft,
  ChevronDown,
  GripVertical,
  Image,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import PhotoViewer, { shouldSuppressPhotoClick } from "../../components/PhotoViewer";
import PyeongSelector from "../../components/PyeongSelector";
import Button from "../../components/ui/Button";
import AdminCategoryPanel from "../priceTable/AdminCategoryPanel";
import {
  buildStableSubitemSections,
  formatConstructionSubitemVariantLabel,
} from "../priceTable/subitemVariantModel";
import { PYEONG_PHOTO_STATUS, usePyeongPhotoManagement } from "./usePyeongPhotoManagement";

export const PYEONG_GALLERY_INITIAL_LIMIT = 8;

function CaptionSnippetPopover({
  snippets,
  onApply,
  onAdd,
  onEdit,
  onArchive,
  onReorder,
  onClose,
}) {
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [draggedId, setDraggedId] = useState("");

  async function addSnippet() {
    if (!(await onAdd(newContent))) return;
    setNewContent("");
  }

  return (
    <div className="pyeong-caption-snippet-popover" role="dialog" aria-label="자주 쓰는 설명">
      <header>
        <strong>자주 쓰는 설명</strong>
        <button type="button" onClick={onClose} aria-label="자주 쓰는 설명 닫기"><X size={16} /></button>
      </header>
      <div className="pyeong-caption-snippet-list formate-scroll-light">
        {snippets.length ? snippets.map((snippet) => (
          <div
            className="pyeong-caption-snippet-row"
            key={snippet.id}
            onDragOver={(event) => { if (draggedId) event.preventDefault(); }}
            onDrop={() => { if (draggedId) onReorder(draggedId, snippet.id); setDraggedId(""); }}
          >
            <span
              className="pyeong-caption-snippet-handle"
              draggable
              onDragStart={() => setDraggedId(snippet.id)}
              onDragEnd={() => setDraggedId("")}
              aria-label={`${snippet.content} 순서 변경`}
            >
              <GripVertical size={14} />
            </span>
            {editingId === snippet.id ? (
              <input
                autoFocus
                value={editingContent}
                onChange={(event) => setEditingContent(event.target.value)}
                onKeyDown={async (event) => {
                  if (event.key === "Enter" && await onEdit(snippet.id, editingContent)) setEditingId("");
                  if (event.key === "Escape") setEditingId("");
                }}
                onBlur={async () => { if (await onEdit(snippet.id, editingContent)) setEditingId(""); }}
                aria-label="자주 쓰는 설명 수정"
              />
            ) : (
              <button type="button" className="pyeong-caption-snippet-apply" onMouseDown={(event) => event.preventDefault()} onClick={() => onApply(snippet.content)}>
                {snippet.content}
              </button>
            )}
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { setEditingId(snippet.id); setEditingContent(snippet.content); }}
              aria-label={`${snippet.content} 수정`}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className="danger-text"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onArchive(snippet.id)}
              aria-label={`${snippet.content} 보관`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )) : <p>등록된 문구가 없습니다.</p>}
      </div>
      <div className="pyeong-caption-snippet-add">
        <input
          value={newContent}
          onChange={(event) => setNewContent(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") addSnippet(); }}
          placeholder="새 문구"
          aria-label="새 자주 쓰는 설명"
        />
        <button type="button" onClick={addSnippet} disabled={!newContent.trim()} aria-label="자주 쓰는 설명 추가">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function PhotoPyeongPicker({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);

  return (
    <PyeongSelector
      className="photo-pyeong-picker"
      value={value}
      open={open}
      onOpenChange={setOpen}
      onChange={onChange}
      ariaLabel="사진을 관리할 평수"
      disabled={disabled}
      menuPortal
    />
  );
}

function PyeongSelectionDrawer({ draft, onDraftChange, onApply, onClose, hasSelection, pending, error }) {
  return (
    <div className="modal-backdrop pyeong-photo-drawer-backdrop" onMouseDown={(event) => { if (!pending && event.target === event.currentTarget) onClose(); }}>
      <aside className="pyeong-photo-drawer" role="dialog" aria-modal="true" aria-labelledby="pyeong-photo-drawer-title">
        <header>
          <div>
            <h2 id="pyeong-photo-drawer-title">평형 선택</h2>
            {hasSelection && <span>현재 선택된 평형을 변경할 수 있습니다.</span>}
          </div>
          <button type="button" onClick={onClose} disabled={pending} aria-label="평형 선택 닫기"><X size={18} /></button>
        </header>
        <div className="pyeong-photo-drawer-body">
          <div className="pyeong-photo-drawer-field">
            <span>평수</span>
            <PhotoPyeongPicker
              value={draft}
              onChange={onDraftChange}
              disabled={pending}
            />
          </div>
          {error && <div className="pyeong-photo-drawer-error" role="alert">{error}</div>}
          <Button onClick={onApply} disabled={pending || !Number.isInteger(Number(draft)) || Number(draft) <= 0}>
            {pending ? "사진 불러오는 중..." : "이 평형 사진 보기"}
          </Button>
        </div>
      </aside>
    </div>
  );
}

export default function PyeongPhotoManagement({ controller, onBack }) {
  const pyeongController = usePyeongPhotoManagement({
    companyId: controller.companyId,
    createPhotoId: controller.createPhotoId,
    getFriendlyError: controller.getFriendlyError,
  });
  const {
    draftPyeong,
    setDraftPyeong,
    pendingPyeong,
    committedPyeong,
    pyeongDrawerOpen,
    setPyeongDrawerOpen,
    photos,
    snippets,
    status,
    photoRowsLoading,
    photoUrlLoading,
    canEdit,
    saving,
    error,
    previewError,
    notice,
    captionSaveStatus,
    captionSaveMessage,
    selectPyeong,
    openPyeongDrawer,
    uploadPhotos,
    changeCaption,
    flushCaption,
    reorderPhotos,
    archivePhoto,
    addSnippet,
    editSnippet,
    archiveSnippet,
    reorderSnippets,
  } = pyeongController;
  const catalog = controller.photoCatalog ?? [];
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [activeVariantByGroupId, setActiveVariantByGroupId] = useState({});
  const [variantMenuGroupId, setVariantMenuGroupId] = useState("");
  const [jumpMenuOpen, setJumpMenuOpen] = useState(false);
  const [galleryModalState, setGalleryModalState] = useState(null);
  const [viewerState, setViewerState] = useState(null);
  const [editingCaptionState, setEditingCaptionState] = useState(null);
  const [snippetCardKey, setSnippetCardKey] = useState("");
  const [photoMenuKey, setPhotoMenuKey] = useState("");
  const [draggedPhotoId, setDraggedPhotoId] = useState("");
  const [dropPhotoId, setDropPhotoId] = useState("");
  const dragEndedAtRef = useRef(0);
  const sectionRefs = useRef(new Map());

  useEffect(() => {
    if (catalog.some((item) => item.id === selectedCategoryId)) return;
    setSelectedCategoryId(catalog[0]?.id ?? "");
  }, [catalog, selectedCategoryId]);

  useEffect(() => {
    setVariantMenuGroupId("");
    setJumpMenuOpen(false);
    setGalleryModalState(null);
    setPhotoMenuKey("");
    setViewerState(null);
  }, [selectedCategoryId, committedPyeong]);

  const selectedCategory = catalog.find((item) => item.id === selectedCategoryId) ?? null;
  const subitems = selectedCategory?.subitems ?? [];
  const gallerySections = useMemo(() => buildStableSubitemSections({
    subitems,
    variantGroups: selectedCategory?.variantGroups ?? [],
  }), [selectedCategory, subitems]);
  const resolvedGallerySections = useMemo(() => gallerySections.map((section) => {
    if (section.kind !== "variant-group") return {
      ...section,
      activeSubitemId: section.subitemId,
    };
    const selectedSubitemId = activeVariantByGroupId[section.groupId];
    const activeVariant = section.variants.find((variant) => variant.subitemId === selectedSubitemId)
      ?? section.variants[0];
    return {
      ...section,
      activeSubitemId: activeVariant?.subitemId ?? "",
      activeVariant,
    };
  }), [activeVariantByGroupId, gallerySections]);
  const photosBySubitem = useMemo(() => Object.fromEntries(subitems.map((subitem) => [
    subitem.id,
    photos.filter((photo) => photo.constructionSubitemId === subitem.id),
  ])), [photos, subitems]);

  useEffect(() => {
    setActiveVariantByGroupId((current) => {
      const next = Object.fromEntries(gallerySections
        .filter((section) => section.kind === "variant-group")
        .map((section) => {
          const currentSubitemId = current[section.groupId];
          const activeSubitemId = section.variants.some((variant) => variant.subitemId === currentSubitemId)
            ? currentSubitemId
            : section.variants[0]?.subitemId ?? "";
          return [section.groupId, activeSubitemId];
        }));
      const currentEntries = Object.entries(current);
      const nextEntries = Object.entries(next);
      const unchanged = currentEntries.length === nextEntries.length
        && nextEntries.every(([groupId, subitemId]) => current[groupId] === subitemId);
      return unchanged ? current : next;
    });
  }, [gallerySections]);

  useEffect(() => {
    if (!galleryModalState || viewerState) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setGalleryModalState(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [galleryModalState, viewerState]);

  function openViewer(subitemId, index) {
    if (shouldSuppressPhotoClick(dragEndedAtRef.current)) return;
    setViewerState({ subitemId, index });
  }

  function closePyeongDrawer() {
    if (!committedPyeong) onBack();
    else setPyeongDrawerOpen(false);
  }

  function jumpToSection(sectionId) {
    const section = sectionRefs.current.get(sectionId);
    if (!section) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    setJumpMenuOpen(false);
  }

  async function selectVariant(groupId, subitemId) {
    if (editingCaptionState?.photoId) await flushCaption(editingCaptionState.photoId);
    setActiveVariantByGroupId((current) => ({ ...current, [groupId]: subitemId }));
    setVariantMenuGroupId("");
    setPhotoMenuKey("");
    setEditingCaptionState(null);
    setSnippetCardKey("");
    setGalleryModalState(null);
    setViewerState(null);
  }

  function renderPhotoCard(photo, index, { subitemId, sectionLabel, surface }) {
    const cardKey = `${surface}:${photo.id}`;
    const editing = editingCaptionState?.cardKey === cardKey;
    const menuOpen = photoMenuKey === cardKey;
    return (
      <article
        className={`pyeong-photo-card ${draggedPhotoId === photo.id ? "dragging" : ""} ${dropPhotoId === photo.id ? "drop-target" : ""}`.trim()}
        key={cardKey}
        draggable={canEdit && !editingCaptionState && !saving && !menuOpen}
        onDragStart={(event) => { setDraggedPhotoId(photo.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", photo.id); }}
        onDragOver={(event) => { if (draggedPhotoId) { event.preventDefault(); setDropPhotoId(photo.id); } }}
        onDrop={async (event) => { event.preventDefault(); await reorderPhotos(subitemId, draggedPhotoId, photo.id); dragEndedAtRef.current = Date.now(); setDraggedPhotoId(""); setDropPhotoId(""); }}
        onDragEnd={() => { dragEndedAtRef.current = Date.now(); setDraggedPhotoId(""); setDropPhotoId(""); }}
      >
        <div className="pyeong-photo-card-menu">
          <button type="button" className="pyeong-photo-card-menu__trigger" onClick={() => setPhotoMenuKey((current) => current === cardKey ? "" : cardKey)} aria-label="사진 메뉴" aria-expanded={menuOpen}>
            <MoreHorizontal size={17} />
          </button>
          {menuOpen && (
            <div className="pyeong-photo-card-menu__popover" role="menu">
              <button
                type="button"
                className="danger-text"
                onClick={async () => {
                  setPhotoMenuKey("");
                  if (window.confirm("이 사진을 보관할까요? Storage 파일은 삭제되지 않습니다.")) await archivePhoto(photo.id);
                }}
                disabled={!canEdit || saving}
                role="menuitem"
              ><Trash2 size={15} /> 사진 보관</button>
            </div>
          )}
        </div>
        <button type="button" className="pyeong-photo-thumbnail" onClick={() => openViewer(subitemId, index)} aria-label={`${sectionLabel} ${index + 1}번째 사진 확대 보기`}>
          {photo.signedUrl ? (
            <img src={photo.signedUrl} alt={photo.originalFilename || `${sectionLabel} 사진`} />
          ) : photoUrlLoading && photo.storagePath ? (
            <span className="pyeong-photo-thumbnail-loading" aria-label="사진 미리보기 불러오는 중" />
          ) : (
            <span><Image size={24} /><em>사진을 표시할 수 없습니다.</em></span>
          )}
        </button>
        <div className="pyeong-photo-caption-area">
          {editing ? (
            <div className="pyeong-photo-caption-editor">
              <textarea
                autoFocus
                rows="2"
                value={photo.description ?? ""}
                onChange={(event) => changeCaption(photo.id, event.target.value)}
                onBlur={async () => { await flushCaption(photo.id); setEditingCaptionState(null); setSnippetCardKey(""); }}
                onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.blur(); setEditingCaptionState(null); setSnippetCardKey(""); } }}
                aria-label="사진 설명"
              />
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setSnippetCardKey((current) => current === cardKey ? "" : cardKey)}>
                <MessageSquareText size={15} /> 자주 쓰는 설명
              </button>
              {snippetCardKey === cardKey && (
                <CaptionSnippetPopover
                  snippets={snippets}
                  onApply={(content) => { changeCaption(photo.id, content); setSnippetCardKey(""); }}
                  onAdd={addSnippet}
                  onEdit={editSnippet}
                  onArchive={archiveSnippet}
                  onReorder={reorderSnippets}
                  onClose={() => setSnippetCardKey("")}
                />
              )}
            </div>
          ) : (
            <button type="button" className={`pyeong-photo-caption-display ${photo.description ? "has-caption" : ""}`.trim()} onClick={() => setEditingCaptionState({ cardKey, photoId: photo.id })} disabled={!canEdit}>
              {photo.description || <><Plus size={14} /> 설명 추가</>}
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <main className="photo-management-page pyeong-photo-page">
      <AdminCategoryPanel
        ariaLabel="평형별 사진 대분류"
        items={catalog}
        selectedItemId={selectedCategoryId}
        loading={controller.photoCatalogLoading && !catalog.length}
        onSelect={setSelectedCategoryId}
      />
      <section className="pyeong-photo-workspace">
        <header className="pyeong-photo-header">
          <div className="pyeong-photo-titleline">
            <button type="button" className="pyeong-photo-back" onClick={onBack} aria-label="사진 관리 모드 선택으로 돌아가기"><ArrowLeft size={18} /></button>
            <div>
              <h1>
                평형별 사진 관리
                <span aria-hidden="true">·</span>
                <em>{selectedCategory?.name || "대분류를 선택하세요."}</em>
              </h1>
            </div>
          </div>
          <div className="pyeong-photo-header-actions">
            {captionSaveStatus !== "idle" && <span className={`autosave-pill ${captionSaveStatus}`.trim()} title={captionSaveMessage}>{captionSaveStatus === "saving" ? "저장 중" : captionSaveStatus === "error" ? "저장 실패" : captionSaveStatus === "dirty" ? "저장 대기" : "저장됨"}</span>}
            {committedPyeong && resolvedGallerySections.length > 0 && (
              <div className="pyeong-photo-jump">
                <button type="button" className="pyeong-photo-jump-trigger" onClick={() => setJumpMenuOpen((current) => !current)} aria-expanded={jumpMenuOpen}>
                  <span>세부항목 바로가기</span><ChevronDown size={16} />
                </button>
                {jumpMenuOpen && (
                  <div className="pyeong-photo-jump-menu formate-scroll-light" role="menu">
                    {resolvedGallerySections.map((section) => (
                      <button type="button" key={section.id} onClick={() => jumpToSection(section.id)} role="menuitem">
                        <span>{section.label}</span>
                        <em>{(photosBySubitem[section.activeSubitemId] ?? []).length}장</em>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {committedPyeong && (
              <button type="button" className="pyeong-photo-context-trigger" onClick={openPyeongDrawer}>
                <span>{committedPyeong}평</span><ChevronDown size={16} />
              </button>
            )}
          </div>
        </header>

        {(controller.photoCatalogError || (!pyeongDrawerOpen && error) || previewError || notice) && (
          <div className="pyeong-photo-feedback">
            {controller.photoCatalogError && <div className="error-box">{controller.photoCatalogError}</div>}
            {!pyeongDrawerOpen && error && <div className="error-box">{error}</div>}
            {previewError && <div className="error-box">{previewError}</div>}
            {notice && <div className="success-box">{notice}</div>}
          </div>
        )}

        <section className="pyeong-photo-gallery-workspace formate-scroll-light">
          <div className="pyeong-photo-gallery-list">
            {!committedPyeong ? (
              <div className="pyeong-photo-context-required">
                <strong>평형을 선택해 주세요.</strong>
                <span>평형이 확정되면 해당 평형의 사진을 조회하고 편집할 수 있습니다.</span>
              </div>
            ) : resolvedGallerySections.length ? resolvedGallerySections.map((section) => {
              const activeSubitemId = section.activeSubitemId;
              const scopedPhotos = photosBySubitem[activeSubitemId] ?? [];
              const visiblePhotos = scopedPhotos.slice(0, PYEONG_GALLERY_INITIAL_LIMIT);
              const hiddenPhotoCount = scopedPhotos.length - visiblePhotos.length;
              return (
                <section
                  className="pyeong-photo-gallery-section"
                  key={section.id}
                  ref={(node) => {
                    if (node) sectionRefs.current.set(section.id, node);
                    else sectionRefs.current.delete(section.id);
                  }}
                >
                  <header className="pyeong-photo-gallery-section__header">
                    <div className="pyeong-photo-gallery-section__title">
                      <h2>{section.label}</h2>
                      {section.kind === "variant-group" && section.activeVariant && (
                        <div className="pyeong-photo-variant-select">
                          <button
                            type="button"
                            className="pyeong-photo-variant-trigger"
                            onClick={() => setVariantMenuGroupId((current) => current === section.groupId ? "" : section.groupId)}
                            aria-label={`${section.label} 두께 선택`}
                            aria-expanded={variantMenuGroupId === section.groupId}
                          >
                            <span>{formatConstructionSubitemVariantLabel(section.activeVariant.value, section.activeVariant.unit)}</span>
                            <ChevronDown size={14} />
                          </button>
                          {variantMenuGroupId === section.groupId && (
                            <div className="pyeong-photo-variant-menu formate-scroll-light" role="menu">
                              {section.variants.map((variant) => (
                                <button
                                  type="button"
                                  key={variant.subitemId}
                                  className={variant.subitemId === activeSubitemId ? "active" : ""}
                                  onClick={() => selectVariant(section.groupId, variant.subitemId)}
                                  role="menuitemradio"
                                  aria-checked={variant.subitemId === activeSubitemId}
                                >
                                  {formatConstructionSubitemVariantLabel(variant.value, variant.unit)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="pyeong-photo-gallery-section__actions">
                      <span>{scopedPhotos.length ? `${scopedPhotos.length}장` : "사진 없음"}</span>
                      {!scopedPhotos.length && (
                        <label className={`pyeong-photo-add-action ${!canEdit || saving ? "disabled" : ""}`.trim()}>
                          <Plus size={15} /><span>사진 추가</span>
                          <input type="file" accept="image/*" multiple disabled={!canEdit || saving} onChange={(event) => { uploadPhotos({ constructionSubitemId: activeSubitemId, files: event.target.files }); event.target.value = ""; }} />
                        </label>
                      )}
                    </div>
                  </header>
                  {scopedPhotos.length > 0 && <>
                    <div className="pyeong-photo-grid">
                      {visiblePhotos.map((photo, index) => renderPhotoCard(photo, index, {
                        subitemId: activeSubitemId,
                        sectionLabel: section.label,
                        surface: "preview",
                      }))}
                      <label
                        className={`pyeong-photo-add-inline ${!canEdit || saving ? "disabled" : ""}`.trim()}
                        title="사진 추가"
                        aria-label="사진 추가"
                      >
                        <Plus size={20} />
                        <input type="file" accept="image/*" multiple disabled={!canEdit || saving} onChange={(event) => { uploadPhotos({ constructionSubitemId: activeSubitemId, files: event.target.files }); event.target.value = ""; }} />
                      </label>
                    </div>
                    {hiddenPhotoCount > 0 && (
                      <footer className="pyeong-photo-gallery-section__footer">
                        <button
                          type="button"
                          className="pyeong-photo-more-button"
                          onClick={() => setGalleryModalState({
                            sectionId: section.id,
                            subitemId: activeSubitemId,
                            label: section.label,
                          })}
                        >
                          ··· {hiddenPhotoCount}장 더보기
                        </button>
                      </footer>
                    )}
                  </>}
                </section>
              );
            }) : <div className="pyeong-photo-empty pyeong-photo-empty--workspace">등록된 세부항목이 없습니다.</div>}
          </div>
        </section>
      </section>

      {pyeongDrawerOpen && (
        <PyeongSelectionDrawer
          draft={draftPyeong}
          onDraftChange={setDraftPyeong}
          onApply={() => selectPyeong(draftPyeong)}
          onClose={closePyeongDrawer}
          hasSelection={Boolean(committedPyeong)}
          pending={status === PYEONG_PHOTO_STATUS.PYEONG_LOADING || photoRowsLoading || Boolean(pendingPyeong)}
          error={status === PYEONG_PHOTO_STATUS.ERROR ? error : ""}
        />
      )}

      {galleryModalState && (
        <div
          className="modal-backdrop pyeong-photo-gallery-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setGalleryModalState(null);
          }}
        >
          <section
            className="pyeong-photo-gallery-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pyeong-photo-gallery-modal-title"
          >
            <header>
              <div>
                <h2 id="pyeong-photo-gallery-modal-title">{galleryModalState.label}</h2>
                <span>{(photosBySubitem[galleryModalState.subitemId] ?? []).length}장</span>
              </div>
              <button type="button" onClick={() => setGalleryModalState(null)} aria-label="전체 사진 닫기">
                <X size={18} />
              </button>
            </header>
            <div className="pyeong-photo-gallery-modal__body formate-scroll-light">
              <div className="pyeong-photo-gallery-modal__grid">
                {(photosBySubitem[galleryModalState.subitemId] ?? []).map((photo, index) => renderPhotoCard(photo, index, {
                  subitemId: galleryModalState.subitemId,
                  sectionLabel: galleryModalState.label,
                  surface: "modal",
                }))}
              </div>
            </div>
          </section>
        </div>
      )}

      {viewerState && (photosBySubitem[viewerState.subitemId] ?? []).length > 0 && (
        <PhotoViewer
          photos={photosBySubitem[viewerState.subitemId]}
          initialIndex={viewerState.index}
          onClose={() => setViewerState(null)}
          getPhotoUrl={(photo) => photo?.signedUrl || ""}
          getPhotoAlt={(photo) => photo?.originalFilename || "평형별 시공 사진"}
          getPhotoCaption={(photo) => photo?.description || ""}
        />
      )}
    </main>
  );
}
