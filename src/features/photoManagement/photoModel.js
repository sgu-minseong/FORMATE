export const PHOTO_STORAGE_BUCKET = "formate-photos";
export const PHOTO_SIGNED_URL_EXPIRES_IN_SECONDS = 7200;
export const PHOTO_TYPES = {
  FULL_PROJECT: "full_project",
  PARTIAL_PROJECT: "partial_project",
  SUBITEM: "subitem",
};
export const PHOTO_TAB_OPTIONS = [
  { key: PHOTO_TYPES.FULL_PROJECT, label: "올공사" },
  { key: PHOTO_TYPES.PARTIAL_PROJECT, label: "부분공사" },
  { key: PHOTO_TYPES.SUBITEM, label: "세부항목" },
];
export const PHOTO_COLLECTION_DEFAULT_NAMES = ["1000만원대", "2000만원대", "3000만원대"];
export const MAX_SUBITEM_PHOTO_COUNT = 10;
export const MAX_PHOTO_UPLOAD_BYTES = 10 * 1024 * 1024;

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
