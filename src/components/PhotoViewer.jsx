import { ChevronLeft, ChevronRight, Image, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const PHOTO_CLICK_SUPPRESS_MS = 320;

export function normalizePhotoViewerIndex(index, length) {
  if (!length) return 0;
  return ((Number(index) || 0) % length + length) % length;
}

export function shouldSuppressPhotoClick(dragEndedAt, now = Date.now()) {
  return Boolean(dragEndedAt) && now - dragEndedAt < PHOTO_CLICK_SUPPRESS_MS;
}

export default function PhotoViewer({
  photos = [],
  initialIndex = 0,
  onClose,
  getPhotoUrl = (photo) => photo?.signed_url || photo?.signedUrl || "",
  getPhotoAlt = (photo) => photo?.original_filename || "사진",
  getPhotoCaption = (photo) => photo?.caption || photo?.description || "",
}) {
  const viewerPhotos = useMemo(() => (Array.isArray(photos) ? photos : []), [photos]);
  const [activeIndex, setActiveIndex] = useState(() => normalizePhotoViewerIndex(initialIndex, viewerPhotos.length));
  const closeButtonRef = useRef(null);
  const showPrevious = useCallback(() => {
    setActiveIndex((current) => normalizePhotoViewerIndex(current - 1, viewerPhotos.length));
  }, [viewerPhotos.length]);
  const showNext = useCallback(() => {
    setActiveIndex((current) => normalizePhotoViewerIndex(current + 1, viewerPhotos.length));
  }, [viewerPhotos.length]);

  useEffect(() => {
    setActiveIndex(normalizePhotoViewerIndex(initialIndex, viewerPhotos.length));
  }, [initialIndex, viewerPhotos.length]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (viewerPhotos.length <= 1) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevious();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, showNext, showPrevious, viewerPhotos.length]);

  if (!viewerPhotos.length) return null;

  const currentPhoto = viewerPhotos[activeIndex] ?? viewerPhotos[0];
  const currentUrl = getPhotoUrl(currentPhoto);
  const currentCaption = `${getPhotoCaption(currentPhoto) ?? ""}`.trim();
  const hasMultiple = viewerPhotos.length > 1;

  const viewer = (
    <div
      className="photo-viewer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        className="photo-viewer"
        role="dialog"
        aria-modal="true"
        aria-label="사진 확대 보기"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="photo-viewer-toolbar">
          <span>{activeIndex + 1} / {viewerPhotos.length}</span>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="사진 확대 보기 닫기">
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>

        <div
          className="photo-viewer-stage"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose?.();
          }}
        >
          {hasMultiple && (
            <button
              type="button"
              className="photo-viewer-nav previous"
              onClick={showPrevious}
              aria-label="이전 사진"
            >
              <ChevronLeft size={28} strokeWidth={1.5} />
            </button>
          )}

          <div
            className="photo-viewer-image-wrap"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) onClose?.();
            }}
          >
            {currentUrl ? (
              <img src={currentUrl} alt={getPhotoAlt(currentPhoto)} />
            ) : (
              <div className="photo-viewer-image-fallback">
                <Image size={32} strokeWidth={1.5} />
                <span>사진을 표시할 수 없습니다.</span>
              </div>
            )}
          </div>

          {hasMultiple && (
            <button
              type="button"
              className="photo-viewer-nav next"
              onClick={showNext}
              aria-label="다음 사진"
            >
              <ChevronRight size={28} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {(currentCaption || hasMultiple) && (
          <div className="photo-viewer-footer">
            {currentCaption && <p className="photo-viewer-caption">{currentCaption}</p>}
            {hasMultiple && (
              <div className="photo-viewer-thumbnails" aria-label="사진 목록">
                {viewerPhotos.map((photo, index) => {
                  const thumbnailUrl = getPhotoUrl(photo);
                  return (
                    <button
                      type="button"
                      key={photo.id ?? `${thumbnailUrl}-${index}`}
                      className={index === activeIndex ? "active" : ""}
                      onClick={() => setActiveIndex(index)}
                      aria-label={`${index + 1}번째 사진 보기`}
                      aria-current={index === activeIndex ? "true" : undefined}
                    >
                      {thumbnailUrl ? <img src={thumbnailUrl} alt="" /> : <Image size={18} strokeWidth={1.5} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );

  return typeof document === "undefined"
    ? viewer
    : createPortal(viewer, document.body);
}
