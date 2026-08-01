export const PHOTO_STORAGE_BUCKET = "formate-photos";
export const PHOTO_SIGNED_URL_EXPIRES_IN_SECONDS = 7200;
export const PHOTO_TYPES = {
  FULL_PROJECT: "full_project",
  PARTIAL_PROJECT: "partial_project",
  SUBITEM: "subitem",
};
export const PHOTO_TYPE_KINDS = {
  WHOLE: "whole",
  PARTIAL: "partial",
  DETAIL: "detail",
  CUSTOM: "custom",
};
export const PHOTO_TAB_OPTIONS = [
  { key: PHOTO_TYPES.FULL_PROJECT, label: "올공사" },
  { key: PHOTO_TYPES.PARTIAL_PROJECT, label: "부분공사" },
  { key: PHOTO_TYPES.SUBITEM, label: "세부항목" },
];
export const PHOTO_COLLECTION_DEFAULT_NAMES = ["1000만원대", "2000만원대", "3000만원대"];
export const MAX_SUBITEM_PHOTO_COUNT = 10;
export const MAX_PHOTO_UPLOAD_BYTES = 10 * 1024 * 1024;

export function sortPhotoTypes(rows = []) {
  return [...rows].sort((a, b) => {
    const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    return orderDiff !== 0
      ? orderDiff
      : `${a.created_at ?? ""}`.localeCompare(`${b.created_at ?? ""}`);
  });
}

export function isDetailPhotoType(photoType) {
  return photoType?.stable_kind === PHOTO_TYPE_KINDS.DETAIL;
}

export function isGeneralPhotoType(photoType) {
  return Boolean(photoType) && !isDetailPhotoType(photoType);
}

export function buildCustomPhotoType({ companyId, id, displayName, sortOrder }) {
  return {
    id,
    company_id: companyId,
    storage_key: `custom_${id}`,
    stable_kind: PHOTO_TYPE_KINDS.CUSTOM,
    display_name: `${displayName ?? ""}`.trim(),
    sort_order: sortOrder,
    is_system: false,
    archived_at: null,
  };
}

export function getPhotoFileExtension(fileName = "") {
  const extension = `${fileName}`.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "webp", "gif"].includes(extension) ? extension : "jpg";
}

export function getPhotoTargetId(photo) {
  return photo?.target_id ?? photo?.collection_id ?? "";
}

export function sortPhotos(photoRows = []) {
  return [...photoRows].sort((a, b) => {
    const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    return orderDiff !== 0
      ? orderDiff
      : `${a.created_at ?? ""}`.localeCompare(`${b.created_at ?? ""}`);
  });
}

export function getPrimaryPhoto(photoRows = []) {
  const sorted = sortPhotos(photoRows);
  return sorted.find((photo) => photo.is_primary) ?? sorted[0] ?? null;
}

export function sortPhotosWithPrimaryFirst(photoRows = []) {
  const sorted = sortPhotos(photoRows);
  const primary = sorted.find((photo) => photo.is_primary);
  return primary ? [primary, ...sorted.filter((photo) => photo.id !== primary.id)] : sorted;
}

export function getPhotosForTarget(photos, targetType, targetId) {
  return sortPhotos((photos ?? []).filter((photo) => (
    (photo.target_type ?? photo.photo_type) === targetType
    && getPhotoTargetId(photo) === targetId
  )));
}

export function getPhotoImageUrl(photo) {
  return photo?.signed_url || photo?.signedUrl || "";
}

export function reorderRowsById(rows = [], draggedId, dropId) {
  const current = [...rows];
  const fromIndex = current.findIndex((row) => row.id === draggedId);
  const toIndex = current.findIndex((row) => row.id === dropId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
  const [dragged] = current.splice(fromIndex, 1);
  current.splice(toIndex, 0, dragged);
  return current;
}

export function buildPhotoPlacementUpdates({ photos = [], photoId, targetType, targetId, targetIndex }) {
  const movedPhoto = photos.find((photo) => photo.id === photoId);
  if (!movedPhoto || !targetType || !targetId) return [];

  const sourceType = movedPhoto.target_type ?? movedPhoto.photo_type;
  const sourceId = getPhotoTargetId(movedPhoto);
  const sameTarget = sourceType === targetType && sourceId === targetId;
  const sourceRows = getPhotosForTarget(photos, sourceType, sourceId)
    .filter((photo) => photo.id !== photoId);
  const destinationRows = sameTarget
    ? sourceRows
    : getPhotosForTarget(photos, targetType, targetId).filter((photo) => photo.id !== photoId);
  const insertIndex = Math.max(0, Math.min(Number.isInteger(targetIndex) ? targetIndex : destinationRows.length, destinationRows.length));
  const nextDestination = [...destinationRows];
  nextDestination.splice(insertIndex, 0, movedPhoto);

  if (sameTarget) {
    return nextDestination.map((photo, sortOrder) => ({
      id: photo.id,
      target_type: targetType,
      target_id: targetId,
      photo_type: targetType,
      collection_id: targetType === PHOTO_TYPES.SUBITEM ? null : targetId,
      sort_order: sortOrder,
      is_primary: Boolean(photo.is_primary),
    }));
  }

  const destinationHasPrimary = destinationRows.some((photo) => photo.is_primary);
  const movedBecomesPrimary = !destinationHasPrimary;
  const sourceHasPrimary = sourceRows.some((photo) => photo.is_primary);
  const promoteSourceId = movedPhoto.is_primary && !sourceHasPrimary ? sourceRows[0]?.id : "";
  const sourceUpdates = sourceRows.map((photo, sortOrder) => ({
    id: photo.id,
    target_type: sourceType,
    target_id: sourceId,
    photo_type: sourceType,
    collection_id: sourceType === PHOTO_TYPES.SUBITEM ? null : sourceId,
    sort_order: sortOrder,
    is_primary: photo.id === promoteSourceId || Boolean(photo.is_primary),
  }));
  const destinationUpdates = nextDestination.map((photo, sortOrder) => ({
    id: photo.id,
    target_type: targetType,
    target_id: targetId,
    photo_type: targetType,
    collection_id: targetType === PHOTO_TYPES.SUBITEM ? null : targetId,
    sort_order: sortOrder,
    is_primary: photo.id === photoId ? movedBecomesPrimary : Boolean(photo.is_primary),
  }));

  return [...sourceUpdates, ...destinationUpdates];
}

export function validatePhotoFile(file) {
  if (!file) return "업로드할 사진을 선택해 주세요.";
  if (!file.type.startsWith("image/")) return "이미지 파일만 업로드할 수 있습니다.";
  if (file.size > MAX_PHOTO_UPLOAD_BYTES) return "사진은 10MB 이하 파일만 업로드해 주세요.";
  return "";
}

export function buildPhotoStoragePath({ companyId, targetType, targetId, photoId, fileName }) {
  return `${companyId}/${targetType}/${targetId}/${photoId}.${getPhotoFileExtension(fileName)}`;
}

export function buildPhotoInsertPayload({
  companyId,
  targetType,
  targetId,
  photoId,
  storagePath,
  file,
  existingCount,
}) {
  return {
    id: photoId,
    company_id: companyId,
    photo_type: targetType,
    collection_id: targetType === PHOTO_TYPES.SUBITEM ? null : targetId,
    target_type: targetType,
    target_id: targetId,
    storage_bucket: PHOTO_STORAGE_BUCKET,
    storage_path: storagePath,
    original_filename: file.name,
    content_type: file.type,
    file_size: file.size,
    is_primary: existingCount === 0,
    sort_order: existingCount,
  };
}
