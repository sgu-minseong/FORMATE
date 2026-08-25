import { Image, X } from "lucide-react";
import { getPhotoImageUrl } from "../photoManagement/photoModel";

export default function EstimatePhotoContextPane({
  open,
  title,
  photos = [],
  loading = false,
  error = "",
  onClose,
  onOpenPhoto,
}) {
  return (
    <aside
      className={`estimate-photo-context-pane ${open ? "is-open" : ""}`.trim()}
      aria-label={open ? `${title || "세부항목"} 사진` : undefined}
      aria-hidden={!open}
    >
      {open && (
        <>
          <header className="estimate-photo-context-pane__header">
            <div>
              <h2>{title || "세부항목"} 사진</h2>
              <span>{loading ? "불러오는 중…" : `${photos.length}장`}</span>
            </div>
            <button
              type="button"
              className="items-v2-icon-button"
              onClick={onClose}
              aria-label="사진 패널 닫기"
              title="사진 패널 닫기"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </header>

          <div className="estimate-photo-context-pane__body formate-scroll-light">
            {loading ? (
              <p className="estimate-photo-context-pane__state">사진을 불러오는 중입니다.</p>
            ) : error ? (
              <p className="estimate-photo-context-pane__state estimate-photo-context-pane__state--error" role="alert">
                {error}
              </p>
            ) : photos.length === 0 ? (
              <p className="estimate-photo-context-pane__state">등록된 사진이 없습니다.</p>
            ) : (
              <div className="estimate-photo-context-pane__list">
                {photos.map((photo, index) => {
                  const imageUrl = getPhotoImageUrl(photo);
                  const description = `${photo?.description ?? photo?.caption ?? ""}`.trim();
                  const alt = photo?.originalFilename || photo?.original_filename || `${title || "세부항목"} 사진`;

                  return (
                    <figure key={photo?.id || `${imageUrl}-${index}`}>
                      <button
                        type="button"
                        onClick={() => onOpenPhoto?.(index)}
                        aria-label={`${title || "세부항목"} ${index + 1}번째 사진 확대 보기`}
                      >
                        {imageUrl ? <img src={imageUrl} alt={alt} /> : <Image size={24} strokeWidth={1.5} />}
                      </button>
                      {description && <figcaption>{description}</figcaption>}
                    </figure>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
