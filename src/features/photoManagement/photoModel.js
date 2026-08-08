export const PHOTO_STORAGE_BUCKET = "formate-photos";
export const PHOTO_SIGNED_URL_EXPIRES_IN_SECONDS = 7200;
export const PHOTO_TYPES = {
  FULL_PROJECT: "full_project",
  PARTIAL_PROJECT: "partial_project",
  SUBITEM: "subitem",
  LIBRARY: "photo_library",
};
export const PHOTO_TYPE_KINDS = {
  WHOLE: "whole",
  PARTIAL: "partial",
  DETAIL: "detail",
  LIBRARY: "library",
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

export const PHOTO_V2_ERROR_CODES = {
  DUPLICATE_FOLDER_NAME: "duplicate-folder-name",
  INVALID_FOLDER_MOVE: "invalid-folder-move",
  COMPANY_SCOPE: "company-scope",
  INVALID_COVER: "invalid-cover-photo",
  INVALID_SCOPE: "invalid-photo-scope",
  DUPLICATE_CAPTION_SNIPPET: "duplicate-caption-snippet",
  STORAGE_UPLOAD_FAILED: "photo-storage-upload-failed",
  METADATA_INSERT_FAILED: "photo-metadata-insert-failed",
  UPLOAD_FAILED: "photo-upload-failed",
};

export function createPhotoV2Error(code, message, cause = null) {
  const error = new Error(message);
  error.code = code;
  error.isPhotoV2DomainError = true;
  if (cause) error.cause = cause;
  return error;
}

export function normalizePhotoCaption(value) {
  const caption = `${value ?? ""}`.trim();
  return caption || null;
}

export function normalizePositivePyeong(value) {
  const pyeong = Number(value);
  return Number.isInteger(pyeong) && pyeong > 0 ? pyeong : null;
}

export function normalizePhotoV2Photo(photo = {}) {
  return {
    id: photo.id ?? "",
    companyId: photo.company_id ?? "",
    storageBucket: photo.storage_bucket ?? PHOTO_STORAGE_BUCKET,
    storagePath: photo.storage_path ?? "",
    signedUrl: photo.signed_url ?? photo.signedUrl ?? "",
    originalFilename: photo.original_filename ?? "",
    contentType: photo.content_type ?? "",
    fileSize: photo.file_size ?? null,
    caption: photo.caption ?? null,
    description: photo.caption ?? null,
    createdAt: photo.created_at ?? null,
    updatedAt: photo.updated_at ?? null,
    archivedAt: photo.archived_at ?? null,
    sortOrder: photo.sort_order ?? 0,
    photoType: photo.photo_type ?? "",
    pyeong: photo.pyeong ?? null,
    constructionSubitemId: photo.construction_subitem_id ?? null,
    sashCatalogEntryId: photo.sash_catalog_entry_id ?? null,
    folderId: photo.photo_library_folder_id ?? null,
  };
}

export function getPyeongPhotoCounts(photoRows = [], subitemRows = []) {
  const activeSubitemIds = new Set((subitemRows ?? []).map((subitem) => subitem.id).filter(Boolean));
  return (photoRows ?? []).reduce((counts, photo) => {
    const subitemId = photo.constructionSubitemId ?? photo.construction_subitem_id;
    const archivedAt = photo.archivedAt ?? photo.archived_at;
    if (!subitemId || archivedAt || !activeSubitemIds.has(subitemId)) return counts;
    counts[subitemId] = (counts[subitemId] ?? 0) + 1;
    return counts;
  }, Object.fromEntries([...activeSubitemIds].map((subitemId) => [subitemId, 0])));
}

export function normalizePhotoLibraryFolder(folder = {}) {
  return {
    id: folder.id ?? "",
    companyId: folder.company_id ?? "",
    parentFolderId: folder.parent_folder_id ?? null,
    name: folder.name ?? "",
    sortOrder: folder.sort_order ?? 0,
    coverPhotoId: folder.cover_photo_id ?? null,
    archivedAt: folder.archived_at ?? null,
    createdAt: folder.created_at ?? null,
    updatedAt: folder.updated_at ?? null,
  };
}

export function normalizePhotoCaptionSnippet(snippet = {}) {
  return {
    id: snippet.id ?? "",
    companyId: snippet.company_id ?? "",
    content: snippet.content ?? "",
    sortOrder: snippet.sort_order ?? 0,
    archivedAt: snippet.archived_at ?? null,
    createdAt: snippet.created_at ?? null,
    updatedAt: snippet.updated_at ?? null,
  };
}

export function sortPhotoLibraryFolders(folderRows = []) {
  return [...folderRows].sort((a, b) => {
    const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    return orderDiff !== 0
      ? orderDiff
      : `${a.created_at ?? ""}`.localeCompare(`${b.created_at ?? ""}`);
  });
}

export function resolveVisibleFolderIds(folderRows = []) {
  const foldersById = new Map((folderRows ?? []).filter((folder) => folder?.id).map((folder) => [folder.id, folder]));
  const visibilityById = new Map();
  const visiting = new Set();

  function isVisible(folderId) {
    if (visibilityById.has(folderId)) return visibilityById.get(folderId);
    const folder = foldersById.get(folderId);
    if (!folder || folder.archived_at || visiting.has(folderId)) {
      visibilityById.set(folderId, false);
      return false;
    }
    visiting.add(folderId);
    const visible = !folder.parent_folder_id || isVisible(folder.parent_folder_id);
    visiting.delete(folderId);
    visibilityById.set(folderId, visible);
    return visible;
  }

  return new Set([...foldersById.keys()].filter(isVisible));
}

export function getActiveLibraryFolderTree(folderRows = []) {
  const visibleIds = resolveVisibleFolderIds(folderRows);
  const folders = sortPhotoLibraryFolders((folderRows ?? []).filter((folder) => visibleIds.has(folder.id)));
  const nodesById = new Map(folders.map((folder) => [folder.id, { ...normalizePhotoLibraryFolder(folder), children: [] }]));
  const roots = [];

  for (const folder of folders) {
    const node = nodesById.get(folder.id);
    const parent = folder.parent_folder_id ? nodesById.get(folder.parent_folder_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

export function getVisiblePhotoLibraryFolders(folderRows = [], parentFolderId = null) {
  const visibleIds = resolveVisibleFolderIds(folderRows);
  return sortPhotoLibraryFolders((folderRows ?? []).filter((folder) => (
    visibleIds.has(folder.id) && (folder.parent_folder_id ?? null) === (parentFolderId ?? null)
  ))).map(normalizePhotoLibraryFolder);
}

export function assertPhotoLibraryFolderMove({ folderId, parentFolderId, folderRows = [] }) {
  if (folderId === parentFolderId) {
    throw createPhotoV2Error(PHOTO_V2_ERROR_CODES.INVALID_FOLDER_MOVE, "폴더를 자기 자신 아래로 이동할 수 없습니다.");
  }

  const foldersById = new Map((folderRows ?? []).filter((folder) => folder?.id).map((folder) => [folder.id, folder]));
  const folder = foldersById.get(folderId);
  const parent = parentFolderId ? foldersById.get(parentFolderId) : null;
  if (!folder || (parentFolderId && !parent)) {
    throw createPhotoV2Error(PHOTO_V2_ERROR_CODES.INVALID_FOLDER_MOVE, "이동할 폴더 위치를 찾지 못했습니다.");
  }
  if (parentFolderId && parent.archived_at) {
    throw createPhotoV2Error(PHOTO_V2_ERROR_CODES.INVALID_FOLDER_MOVE, "보관된 폴더 아래로 이동할 수 없습니다.");
  }

  let cursor = parent;
  const visited = new Set();
  while (cursor) {
    if (cursor.id === folderId || visited.has(cursor.id)) {
      throw createPhotoV2Error(PHOTO_V2_ERROR_CODES.INVALID_FOLDER_MOVE, "폴더를 자신의 하위 폴더로 이동할 수 없습니다.");
    }
    visited.add(cursor.id);
    cursor = cursor.parent_folder_id ? foldersById.get(cursor.parent_folder_id) : null;
  }
}

export function assertUniqueActiveSiblingFolderName({ folderRows = [], companyId, parentFolderId = null, name, excludeFolderId = "" }) {
  const normalizedName = `${name ?? ""}`.trim();
  if (!normalizedName) {
    throw createPhotoV2Error(PHOTO_V2_ERROR_CODES.INVALID_FOLDER_MOVE, "폴더 이름을 입력해 주세요.");
  }
  const duplicate = (folderRows ?? []).some((folder) => (
    folder.id !== excludeFolderId
    && folder.company_id === companyId
    && !folder.archived_at
    && (folder.parent_folder_id ?? null) === (parentFolderId ?? null)
    && `${folder.name ?? ""}`.trim().toLocaleLowerCase() === normalizedName.toLocaleLowerCase()
  ));
  if (duplicate) {
    throw createPhotoV2Error(PHOTO_V2_ERROR_CODES.DUPLICATE_FOLDER_NAME, "같은 위치에 같은 이름의 폴더가 이미 있습니다.");
  }
  return normalizedName;
}

export function buildPyeongSubitemPhotoScope({ pyeong, constructionSubitemId, sashCatalogEntryId = null }) {
  const normalizedPyeong = normalizePositivePyeong(pyeong);
  if (!normalizedPyeong || !constructionSubitemId) {
    throw createPhotoV2Error(PHOTO_V2_ERROR_CODES.INVALID_SCOPE, "평수와 세부항목을 확인해 주세요.");
  }
  return {
    photo_type: PHOTO_TYPES.SUBITEM,
    target_type: PHOTO_TYPES.SUBITEM,
    target_id: constructionSubitemId,
    collection_id: null,
    pyeong: normalizedPyeong,
    construction_subitem_id: constructionSubitemId,
    sash_catalog_entry_id: sashCatalogEntryId || null,
    photo_library_folder_id: null,
  };
}

export function buildPhotoLibraryScope(folderId) {
  if (!folderId) {
    throw createPhotoV2Error(PHOTO_V2_ERROR_CODES.INVALID_SCOPE, "사진을 저장할 폴더를 선택해 주세요.");
  }
  return {
    photo_type: PHOTO_TYPES.LIBRARY,
    target_type: PHOTO_TYPES.LIBRARY,
    target_id: folderId,
    collection_id: null,
    pyeong: null,
    construction_subitem_id: null,
    sash_catalog_entry_id: null,
    photo_library_folder_id: folderId,
  };
}

export function normalizePhotoV2Error(error, fallback = "사진 정보를 저장하지 못했습니다.") {
  if (error?.isPhotoV2DomainError) return error;
  const code = error?.code ?? "";
  const message = [error?.message, error?.details, error?.hint, error?.constraint]
    .filter(Boolean)
    .join(" ");
  if (code === "23505" && message.includes("photo_library_folders_company_")) {
    return createPhotoV2Error(PHOTO_V2_ERROR_CODES.DUPLICATE_FOLDER_NAME, "같은 위치에 같은 이름의 폴더가 이미 있습니다.");
  }
  if (code === "23505" && message.includes("photo_caption_snippets_company_content_active_uidx")) {
    return createPhotoV2Error(PHOTO_V2_ERROR_CODES.DUPLICATE_CAPTION_SNIPPET, "같은 자주 쓰는 설명이 이미 있습니다.");
  }
  if (message.includes("cannot be its own parent") || message.includes("descendant")) {
    return createPhotoV2Error(PHOTO_V2_ERROR_CODES.INVALID_FOLDER_MOVE, "폴더를 자신의 하위 폴더로 이동할 수 없습니다.");
  }
  if (message.includes("cover")) {
    return createPhotoV2Error(PHOTO_V2_ERROR_CODES.INVALID_COVER, "같은 폴더 안의 사진만 대표사진으로 지정할 수 있습니다.");
  }
  if (code === "42501" || code === "PGRST116" || message.includes("same company")) {
    return createPhotoV2Error(PHOTO_V2_ERROR_CODES.COMPANY_SCOPE, "현재 업체 범위에서 사진 정보를 변경할 수 없습니다.");
  }
  if (message.includes("Photo subitem scope") || message.includes("sash specification") || message.includes("Photo Library image")) {
    return createPhotoV2Error(PHOTO_V2_ERROR_CODES.INVALID_SCOPE, "사진의 평수·세부항목·샷시 규격 범위를 확인해 주세요.");
  }
  return createPhotoV2Error(PHOTO_V2_ERROR_CODES.UPLOAD_FAILED, fallback);
}
