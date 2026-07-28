import { ChevronDown, ChevronRight, Image, Plus, RefreshCcw, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import {
  MAX_SUBITEM_PHOTO_COUNT,
  PHOTO_STORAGE_BUCKET,
  PHOTO_TAB_OPTIONS,
  PHOTO_TYPES,
  getPhotoImageUrl,
  getPrimaryPhoto,
} from "./photoModel";

export default function PhotoManagementPage({ controller }) {
  const {
    photoTab, setPhotoTab, photoCollections, photoCollectionDrafts, setPhotoCollectionDrafts,
    photoCatalog, expandedPhotoCategoryIds, setExpandedPhotoCategoryIds,
    photoAutoSaveStatus, photoAutoSaveMessage, photoLoading, photoSaving,
    photoError, setPhotoError, photoNotice, setPhotoNotice, getPhotosForTarget,
    refresh, addCollection, saveCollectionName, deleteCollection, upload, setPrimary, remove, move,
  } = controller;

  const renderUpload = (targetType, targetId, disabled = false) => (
    <label className={`photo-upload-button ${disabled ? "disabled" : ""}`.trim()}>
      <Plus size={18} strokeWidth={1.5} />
      <span>사진 추가</span>
      <input
        type="file"
        accept="image/*"
        disabled={disabled || photoSaving}
        onChange={(event) => {
          upload(targetType, targetId, event.target.files);
          event.target.value = "";
        }}
      />
    </label>
  );

  const renderPhotos = (targetType, targetId) => {
    const targetPhotos = getPhotosForTarget(targetType, targetId);
    const primary = getPrimaryPhoto(targetPhotos);
    if (!targetPhotos.length) {
      return <EmptyState className="photo-empty-state" icon={<Image size={24} strokeWidth={1.5} />} title="등록된 사진 없음" description="이 분류에 사용할 사진을 추가해 주세요." />;
    }
    return (
      <div className="photo-thumb-grid">
        {targetPhotos.map((photo, index) => {
          const imageUrl = getPhotoImageUrl(photo);
          const isPrimary = photo.id === primary?.id;
          return (
            <article className={`photo-thumb-card ${isPrimary ? "primary" : ""}`.trim()} key={photo.id}>
              <div className="photo-thumb-image">
                {imageUrl ? <img src={imageUrl} alt={photo.original_filename || "등록 사진"} /> : <Image size={24} strokeWidth={1.5} />}
                {isPrimary && <span>대표</span>}
              </div>
              <div className="photo-thumb-meta">
                <p title={photo.original_filename || ""}>{photo.original_filename || "사진"}</p>
                <div className="photo-thumb-actions">
                  <button type="button" onClick={() => setPrimary(photo)} disabled={photoSaving || isPrimary}>대표</button>
                  <button type="button" onClick={() => move(photo, -1)} disabled={photoSaving || index === 0}>위</button>
                  <button type="button" onClick={() => move(photo, 1)} disabled={photoSaving || index === targetPhotos.length - 1}>아래</button>
                  <button type="button" className="danger" onClick={() => remove(photo)} disabled={photoSaving}>삭제</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  const renderProjectTab = (photoType) => {
    const collections = photoCollections.filter((collection) => collection.photo_type === photoType);
    const tabLabel = PHOTO_TAB_OPTIONS.find((tab) => tab.key === photoType)?.label ?? "사진";
    return (
      <div className="photo-tab-panel">
        <div className="photo-section-header">
          <div><h3>{tabLabel} 분류</h3><p className="muted">금액대 같은 분류명은 자유롭게 바꿀 수 있습니다.</p></div>
          <Button variant="primary" leftIcon={<Plus />} onClick={() => addCollection(photoType)} disabled={photoSaving}>분류 추가</Button>
        </div>
        {collections.length === 0 ? (
          <EmptyState className="compact-empty" icon={<Image size={24} strokeWidth={1.5} />} title="분류가 없습니다" description="분류를 추가한 뒤 사진을 업로드하세요." />
        ) : (
          <div className="photo-collection-list">
            {collections.map((collection) => (
              <section className="photo-collection-card" key={collection.id}>
                <div className="photo-collection-title-row">
                  <input
                    value={photoCollectionDrafts[collection.id] ?? collection.name ?? ""}
                    onChange={(event) => setPhotoCollectionDrafts((current) => ({ ...current, [collection.id]: event.target.value }))}
                    aria-label="사진 분류명"
                  />
                  <Button variant="secondary" size="sm" onClick={() => saveCollectionName(collection.id)} disabled={photoSaving}>저장</Button>
                  <button type="button" className="photo-collection-delete-button" onClick={() => deleteCollection(collection)} disabled={photoSaving} aria-label="분류 삭제" title="분류 삭제">
                    <Trash2 size={18} strokeWidth={1.5} />
                  </button>
                  {renderUpload(photoType, collection.id)}
                </div>
                {renderPhotos(photoType, collection.id)}
              </section>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSubitemTab = () => (
    <div className="photo-tab-panel">
      <div className="photo-section-header">
        <div>
          <h3>세부항목 사진</h3>
          <p className="muted">단가표의 대분류/세부항목 구조를 읽어와 사진만 별도로 관리합니다. 세부항목당 최대 {MAX_SUBITEM_PHOTO_COUNT}장까지 등록할 수 있습니다.</p>
        </div>
      </div>
      {photoCatalog.length === 0 ? (
        <EmptyState className="compact-empty" icon={<Image size={24} strokeWidth={1.5} />} title="세부항목이 없습니다" description="현재 업체의 단가표 세부항목을 먼저 준비해 주세요." />
      ) : (
        <div className="photo-subitem-groups">
          {photoCatalog.map((item) => {
            const expanded = expandedPhotoCategoryIds.includes(item.id);
            return (
              <section className={`photo-subitem-group ${expanded ? "expanded" : ""}`.trim()} key={item.id}>
                <button
                  type="button"
                  className="photo-subitem-group-toggle"
                  onClick={() => setExpandedPhotoCategoryIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}
                  aria-expanded={expanded}
                >
                  <span><strong>{item.name}</strong><em>{(item.subitems ?? []).length}개 세부항목</em></span>
                  {expanded ? <ChevronDown size={18} strokeWidth={1.5} /> : <ChevronRight size={18} strokeWidth={1.5} />}
                </button>
                {expanded && (
                  <div className="photo-subitem-table">
                    <div className="photo-subitem-header"><span>소재명</span><span>사진 관리</span><span>사진 추가</span></div>
                    {(item.subitems ?? []).map((subitem) => {
                      const subitemPhotos = getPhotosForTarget(PHOTO_TYPES.SUBITEM, subitem.id);
                      const primary = getPrimaryPhoto(subitemPhotos);
                      const limitReached = subitemPhotos.length >= MAX_SUBITEM_PHOTO_COUNT;
                      return (
                        <div className="photo-subitem-row" key={subitem.id}>
                          <div className="photo-subitem-name"><strong>{subitem.name}</strong><span>{subitem.unit || ""}</span></div>
                          <div className="photo-subitem-manage">
                            <div className="photo-count-line"><span>{subitemPhotos.length}/{MAX_SUBITEM_PHOTO_COUNT}장</span><span>{primary ? "대표사진 지정됨" : "대표사진 없음"}</span></div>
                            {renderPhotos(PHOTO_TYPES.SUBITEM, subitem.id)}
                          </div>
                          <div className="photo-subitem-upload">
                            {renderUpload(PHOTO_TYPES.SUBITEM, subitem.id, limitReached)}
                            {limitReached && <p>최대 {MAX_SUBITEM_PHOTO_COUNT}장까지 등록됩니다.</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <main className="panel-page photo-management-page">
      <section className="photo-management-panel">
        <PageHeader eyebrow="사진 관리/확인" title="업체 사진 자료실" description="올공사, 부분공사, 세부항목 사진을 현재 업체 기준으로 관리합니다." actions={<Button variant="secondary" leftIcon={<RefreshCcw />} onClick={refresh} disabled={photoLoading || photoSaving}>새로고침</Button>} />
        <div className="photo-storage-note"><Image size={18} /><span>Storage bucket: {PHOTO_STORAGE_BUCKET}</span><span>업로드 제한: 이미지 파일, 10MB 이하</span></div>
        {photoAutoSaveStatus !== "idle" && <div className={`photo-autosave-status ${photoAutoSaveStatus}`.trim()}><span>{photoAutoSaveStatus === "saving" ? "저장 중..." : photoAutoSaveStatus === "error" ? "저장 실패" : "저장됨"}</span><strong>{photoAutoSaveMessage}</strong></div>}
        <div className="photo-tabs" role="tablist" aria-label="사진 관리 탭">
          {PHOTO_TAB_OPTIONS.map((tab) => <button type="button" key={tab.key} className={photoTab === tab.key ? "active" : ""} onClick={() => { setPhotoTab(tab.key); setPhotoError(""); setPhotoNotice(""); }}>{tab.label}</button>)}
        </div>
        {photoLoading && <div className="info-box">사진 데이터를 불러오는 중입니다.</div>}
        {photoSaving && <div className="info-box">사진 정보를 저장하는 중입니다.</div>}
        {photoNotice && <div className="success-box">{photoNotice}</div>}
        {photoError && <div className="error-box">{photoError}</div>}
        {!photoLoading && <>
          {photoTab === PHOTO_TYPES.FULL_PROJECT && renderProjectTab(PHOTO_TYPES.FULL_PROJECT)}
          {photoTab === PHOTO_TYPES.PARTIAL_PROJECT && renderProjectTab(PHOTO_TYPES.PARTIAL_PROJECT)}
          {photoTab === PHOTO_TYPES.SUBITEM && renderSubitemTab()}
        </>}
      </section>
    </main>
  );
}
