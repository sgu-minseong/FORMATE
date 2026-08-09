import { supabase } from "../../lib/supabaseClient";
import { fetchCanonicalConstructionCatalogRows } from "../constructionCatalog/constructionCatalogApi";
import { normalizeConstructionSubitemVariantGroup } from "../constructionCatalog/constructionCatalogModel";
import { normalizeAdminItems } from "../priceTable/priceTableModel";
import {
  PHOTO_SIGNED_URL_EXPIRES_IN_SECONDS,
  PHOTO_STORAGE_BUCKET,
  PHOTO_TYPES,
  PHOTO_V2_ERROR_CODES,
  assertPhotoLibraryFolderMove,
  assertUniqueActiveSiblingFolderName,
  buildPhotoLibraryScope,
  buildPhotoPlacementUpdates,
  buildPyeongSubitemPhotoScope,
  buildPhotoInsertPayload,
  buildPhotoStoragePath,
  createPhotoV2Error,
  getActiveLibraryFolderTree,
  getVisiblePhotoLibraryFolders,
  normalizePhotoCaption,
  normalizePhotoCaptionSnippet,
  normalizePhotoLibraryFolder,
  normalizePhotoV2Error,
  normalizePhotoV2Photo,
  resolveVisibleFolderIds,
  sortPhotoLibraryFolders,
  validatePhotoFile,
} from "./photoModel";

async function fetchPhotoTypes(companyId) {
  const result = await supabase
    .from("photo_types")
    .select("*")
    .eq("company_id", companyId)
    .in("stable_kind", ["whole", "partial", "detail", "custom"])
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function attachSignedPhotoUrls(photoRows = []) {
  const rows = Array.isArray(photoRows) ? photoRows : [];
  const paths = Array.from(new Set(rows.map((photo) => photo.storage_path).filter(Boolean)));
  if (!paths.length) return rows;
  const { data, error } = await supabase.storage
    .from(PHOTO_STORAGE_BUCKET)
    .createSignedUrls(paths, PHOTO_SIGNED_URL_EXPIRES_IN_SECONDS);
  if (error) return rows.map((photo) => ({ ...photo, signed_url: "" }));
  const byPath = new Map((data ?? [])
    .filter((entry) => entry?.path && entry?.signedUrl)
    .map((entry) => [entry.path, entry.signedUrl]));
  return rows.map((photo) => ({ ...photo, signed_url: byPath.get(photo.storage_path) ?? "" }));
}

async function fetchCollections(companyId) {
  const result = await supabase
    .from("photo_collections")
    .select("*")
    .eq("company_id", companyId)
    .neq("photo_type", "estimate_progress")
    .order("photo_type", { ascending: true })
    .order("sort_order", { ascending: true });
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function fetchPhotoCatalog(companyId) {
  const {
    itemRows,
    subitemRows,
    variantGroupRows,
  } = await fetchCanonicalConstructionCatalogRows(companyId);
  const variantGroups = variantGroupRows.map(normalizeConstructionSubitemVariantGroup);
  return normalizeAdminItems(itemRows, subitemRows, []).map((item) => {
    return {
      ...item,
      variantGroups: variantGroups.filter(
        (group) => group.constructionItemId === item.id
      ),
    };
  });
}

export async function fetchLegacyPhotoManagementData(companyId) {
  const [photoTypes, collections] = await Promise.all([
    fetchPhotoTypes(companyId),
    fetchCollections(companyId),
  ]);
  const { data: photoRows, error: photoError } = await supabase
    .from("photos")
    .select("*")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (photoError) throw photoError;
  const photos = await attachSignedPhotoUrls(photoRows ?? []);
  return { photoTypes, collections, photos };
}

export async function fetchPhotoManagementData(companyId) {
  const [legacyData, catalog] = await Promise.all([
    fetchLegacyPhotoManagementData(companyId),
    fetchPhotoCatalog(companyId),
  ]);
  return {
    ...legacyData,
    catalog,
  };
}

export async function insertPhotoType(payload) {
  const { error } = await supabase.from("photo_types").insert(payload);
  if (error) throw error;
}

export async function updatePhotoTypeName({ companyId, photoTypeId, displayName }) {
  const { error } = await supabase.from("photo_types")
    .update({ display_name: displayName })
    .eq("id", photoTypeId)
    .eq("company_id", companyId);
  if (error) throw error;
}

export async function updatePhotoTypeOrder({ companyId, photoTypes }) {
  for (const [sortOrder, photoType] of photoTypes.entries()) {
    const { error } = await supabase.from("photo_types")
      .update({ sort_order: sortOrder })
      .eq("id", photoType.id)
      .eq("company_id", companyId);
    if (error) throw error;
  }
}

export async function archivePhotoType({ companyId, photoTypeId }) {
  const { error } = await supabase.from("photo_types")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", photoTypeId)
    .eq("company_id", companyId);
  if (error) throw error;
}

export async function deleteEmptyPhotoType({ companyId, photoTypeId }) {
  const { error } = await supabase.from("photo_types")
    .delete()
    .eq("id", photoTypeId)
    .eq("company_id", companyId)
    .eq("is_system", false);
  if (error) throw error;
}

export async function movePhotoTypeContents({
  companyId,
  sourceType,
  destinationType,
  collections,
}) {
  const sourceCollections = collections.filter((collection) => collection.photo_type === sourceType.storage_key);
  const destinationCount = collections.filter((collection) => collection.photo_type === destinationType.storage_key).length;

  for (const [index, collection] of sourceCollections.entries()) {
    const { error } = await supabase.from("photo_collections")
      .update({
        photo_type: destinationType.storage_key,
        sort_order: destinationCount + index,
      })
      .eq("id", collection.id)
      .eq("company_id", companyId)
      .eq("photo_type", sourceType.storage_key);
    if (error) throw error;
  }

  const { error: photoError } = await supabase.from("photos")
    .update({
      photo_type: destinationType.storage_key,
      target_type: destinationType.storage_key,
    })
    .eq("company_id", companyId)
    .eq("target_type", sourceType.storage_key);
  if (photoError) throw photoError;

  if (sourceType.is_system) {
    await archivePhotoType({ companyId, photoTypeId: sourceType.id });
  } else {
    await deleteEmptyPhotoType({ companyId, photoTypeId: sourceType.id });
  }
}

export async function fetchPhotosForTarget({ companyId, targetType, targetId }) {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("company_id", companyId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return attachSignedPhotoUrls(data ?? []);
}

export async function insertPhotoCollection(payload) {
  const { error } = await supabase.from("photo_collections").insert(payload);
  if (error) throw error;
}

export async function updatePhotoCollectionName({ companyId, collectionId, name }) {
  const { error } = await supabase.from("photo_collections").update({ name })
    .eq("id", collectionId).eq("company_id", companyId);
  if (error) throw error;
}

export async function updatePhotoCollectionOrder({ companyId, collections }) {
  for (const [sortOrder, collection] of collections.entries()) {
    const { error } = await supabase.from("photo_collections")
      .update({ sort_order: sortOrder })
      .eq("id", collection.id)
      .eq("company_id", companyId)
      .eq("photo_type", collection.photo_type);
    if (error) throw error;
  }
}

export async function removePhotoCollection({ companyId, collection, photos }) {
  const paths = photos.map((photo) => photo.storage_path).filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(PHOTO_STORAGE_BUCKET).remove(paths);
    if (storageError) throw storageError;
  }
  const { error } = await supabase.from("photo_collections").delete()
    .eq("id", collection.id).eq("company_id", companyId);
  if (error) throw error;
}

export async function moveCollectionPhotos({ companyId, collection, destination, photos }) {
  const sourcePhotos = photos.filter((photo) => (
    photo.company_id === companyId
    && (photo.target_type ?? photo.photo_type) === collection.photo_type
    && (photo.target_id ?? photo.collection_id) === collection.id
  ));
  const destinationPhotos = photos.filter((photo) => (
    photo.company_id === companyId
    && (photo.target_type ?? photo.photo_type) === destination.photo_type
    && (photo.target_id ?? photo.collection_id) === destination.id
  ));
  const destinationHasPrimary = destinationPhotos.some((photo) => photo.is_primary);

  for (const [index, photo] of sourcePhotos.entries()) {
    const { error } = await supabase.from("photos").update({
      photo_type: destination.photo_type,
      target_type: destination.photo_type,
      target_id: destination.id,
      collection_id: destination.id,
      sort_order: destinationPhotos.length + index,
      is_primary: !destinationHasPrimary && index === 0,
    }).eq("id", photo.id).eq("company_id", companyId);
    if (error) throw error;
  }

  const { error } = await supabase.from("photo_collections").delete()
    .eq("id", collection.id)
    .eq("company_id", companyId)
    .eq("photo_type", collection.photo_type);
  if (error) throw error;
}

export async function uploadPhoto({ companyId, targetType, targetId, photoId, file, existingCount }) {
  const storagePath = buildPhotoStoragePath({
    companyId, targetType, targetId, photoId, fileName: file.name,
  });
  const { error: uploadError } = await supabase.storage.from(PHOTO_STORAGE_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const payload = buildPhotoInsertPayload({
    companyId, targetType, targetId, photoId, storagePath, file, existingCount,
  });
  const { error } = await supabase.from("photos").insert(payload);
  if (error) throw error;
}

export async function updatePrimaryPhoto({ companyId, photo, targetType, targetId }) {
  const clear = await supabase.from("photos").update({ is_primary: false })
    .eq("company_id", companyId).eq("target_type", targetType).eq("target_id", targetId);
  if (clear.error) throw clear.error;
  const primary = await supabase.from("photos").update({ is_primary: true })
    .eq("id", photo.id).eq("company_id", companyId);
  if (primary.error) throw primary.error;
}

export async function removePhoto({ companyId, photo }) {
  if (photo.storage_path) await supabase.storage.from(PHOTO_STORAGE_BUCKET).remove([photo.storage_path]);
  const { error } = await supabase.from("photos").delete()
    .eq("id", photo.id).eq("company_id", companyId);
  if (error) throw error;
}

export async function swapPhotoOrder({ companyId, photo, sibling, currentIndex, nextIndex }) {
  const results = await Promise.all([
    supabase.from("photos").update({ sort_order: sibling.sort_order ?? nextIndex })
      .eq("id", photo.id).eq("company_id", companyId),
    supabase.from("photos").update({ sort_order: photo.sort_order ?? currentIndex })
      .eq("id", sibling.id).eq("company_id", companyId),
  ]);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

export async function persistPhotoPlacement({ companyId, photos, photoId, targetType, targetId, targetIndex }) {
  const updates = buildPhotoPlacementUpdates({ photos, photoId, targetType, targetId, targetIndex });
  if (!updates.length) throw new Error("이동할 사진을 찾지 못했습니다.");
  const movedUpdate = updates.find((update) => update.id === photoId);

  const { error: demoteError } = await supabase.from("photos")
    .update({ is_primary: false })
    .eq("id", photoId)
    .eq("company_id", companyId);
  if (demoteError) throw demoteError;

  const { is_primary: movedPrimary, ...movedPayload } = movedUpdate;
  const { error: movedError } = await supabase.from("photos")
    .update({ ...movedPayload, is_primary: false })
    .eq("id", photoId)
    .eq("company_id", companyId);
  if (movedError) throw movedError;

  for (const update of updates.filter((entry) => entry.id !== photoId)) {
    const { id, ...payload } = update;
    const { error } = await supabase.from("photos")
      .update(payload)
      .eq("id", id)
      .eq("company_id", companyId);
    if (error) throw error;
  }

  if (movedPrimary) {
    const { error } = await supabase.from("photos")
      .update({ is_primary: true })
      .eq("id", photoId)
      .eq("company_id", companyId);
    if (error) throw error;
  }
}

export async function updatePhotoSubitemOrder({ companyId, itemId, subitems }) {
  const { data: scopedItem, error: itemError } = await supabase
    .from("construction_items")
    .select("id")
    .eq("id", itemId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (itemError) throw itemError;
  if (!scopedItem?.id) throw new Error("현재 업체의 대분류를 찾지 못했습니다.");

  for (const [sortOrder, subitem] of subitems.entries()) {
    const { error } = await supabase.from("construction_subitems")
      .update({ sort_order: sortOrder })
      .eq("id", subitem.id)
      .eq("item_id", itemId);
    if (error) throw error;
  }
}

async function runPhotoV2(operation, fallback) {
  try {
    return await operation();
  } catch (error) {
    throw normalizePhotoV2Error(error, fallback);
  }
}

async function fetchPhotoLibraryFolderRows(companyId) {
  const { data, error } = await supabase
    .from("photo_library_folders")
    .select("*")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function getActiveLibraryContext(companyId) {
  const folderRows = await fetchPhotoLibraryFolderRows(companyId);
  return {
    folderRows,
    visibleFolderIds: resolveVisibleFolderIds(folderRows),
  };
}

async function assertActivePhotoLibraryFolder(companyId, folderId) {
  const context = await getActiveLibraryContext(companyId);
  if (!context.visibleFolderIds.has(folderId)) {
    throw new Error("사진을 저장할 활성 폴더를 찾지 못했습니다.");
  }
  return context;
}

async function fetchLibraryPhotos({ companyId, folderIds, folderId, query, limit, recent = false }) {
  const visibleIds = [...new Set(folderIds ?? [])];
  if (!visibleIds.length || (folderId && !visibleIds.includes(folderId))) return [];
  let request = supabase
    .from("photos")
    .select("*")
    .eq("company_id", companyId)
    .eq("photo_type", PHOTO_TYPES.LIBRARY)
    .eq("target_type", PHOTO_TYPES.LIBRARY)
    .is("archived_at", null)
    .in("photo_library_folder_id", folderId ? [folderId] : visibleIds);
  request = recent
    ? request.order("created_at", { ascending: false })
    : request.order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (query) request = request.ilike("caption", `%${query}%`);
  if (limit) request = request.limit(limit);
  const { data, error } = await request;
  if (error) throw error;
  const photos = await attachSignedPhotoUrls(data ?? []);
  return photos.map(normalizePhotoV2Photo);
}

async function uploadPhotoWithScope({ companyId, photoId, file, existingCount, scope, isPrimary }) {
  const validationError = validatePhotoFile(file);
  if (validationError) throw new Error(validationError);
  const storagePath = buildPhotoStoragePath({
    companyId,
    targetType: scope.target_type,
    targetId: scope.target_id,
    photoId,
    fileName: file.name,
  });
  const { error: uploadError } = await supabase.storage
    .from(PHOTO_STORAGE_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    throw createPhotoV2Error(
      PHOTO_V2_ERROR_CODES.STORAGE_UPLOAD_FAILED,
      "사진 파일을 Storage에 업로드하지 못했습니다.",
      uploadError
    );
  }

  const payload = {
    ...buildPhotoInsertPayload({
      companyId,
      targetType: scope.target_type,
      targetId: scope.target_id,
      photoId,
      storagePath,
      file,
      existingCount,
    }),
    ...scope,
  };
  if (typeof isPrimary === "boolean") payload.is_primary = isPrimary;
  const { data, error } = await supabase.from("photos").insert(payload).select().single();
  if (error) {
    const { error: cleanupError } = await supabase.storage
      .from(PHOTO_STORAGE_BUCKET)
      .remove([storagePath]);
    const metadataError = createPhotoV2Error(
      PHOTO_V2_ERROR_CODES.METADATA_INSERT_FAILED,
      "사진 파일은 업로드됐지만 사진 정보를 저장하지 못했습니다.",
      error
    );
    if (cleanupError) metadataError.cleanupError = cleanupError;
    throw metadataError;
  }
  const [photo] = await attachSignedPhotoUrls(data ? [data] : []);
  return normalizePhotoV2Photo(photo ?? data);
}

function normalizePhotoLimit(limit, fallback = 16) {
  const value = Number(limit);
  return Number.isInteger(value) && value > 0 ? Math.min(value, 100) : fallback;
}

export async function listPyeongSubitemPhotos({
  companyId,
  pyeong,
  constructionSubitemId,
  sashCatalogEntryId = null,
}) {
  return runPhotoV2(async () => {
    const scope = buildPyeongSubitemPhotoScope({ pyeong, constructionSubitemId, sashCatalogEntryId });
    let request = supabase
      .from("photos")
      .select("*")
      .eq("company_id", companyId)
      .eq("photo_type", scope.photo_type)
      .eq("target_type", scope.target_type)
      .eq("target_id", scope.target_id)
      .eq("pyeong", scope.pyeong)
      .eq("construction_subitem_id", scope.construction_subitem_id)
      .is("archived_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    request = scope.sash_catalog_entry_id
      ? request.eq("sash_catalog_entry_id", scope.sash_catalog_entry_id)
      : request.is("sash_catalog_entry_id", null);
    const { data, error } = await request;
    if (error) throw error;
    const photos = await attachSignedPhotoUrls(data ?? []);
    return photos.map(normalizePhotoV2Photo);
  }, "평형별 사진을 불러오지 못했습니다.");
}

export async function listPyeongPhotoRows({ companyId, pyeong }) {
  return runPhotoV2(async () => {
    const normalizedPyeong = Number(pyeong);
    if (!Number.isInteger(normalizedPyeong) || normalizedPyeong <= 0) {
      throw new Error("평수를 확인해 주세요.");
    }
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("company_id", companyId)
      .eq("photo_type", PHOTO_TYPES.SUBITEM)
      .eq("target_type", PHOTO_TYPES.SUBITEM)
      .eq("pyeong", normalizedPyeong)
      .is("sash_catalog_entry_id", null)
      .is("archived_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(normalizePhotoV2Photo);
  }, "평형별 사진을 불러오지 못했습니다.");
}

export async function resolvePyeongPhotoUrls(photoRows = []) {
  return runPhotoV2(async () => {
    const rawRows = (photoRows ?? []).map((photo) => ({
      id: photo.id,
      storage_path: photo.storagePath ?? photo.storage_path ?? "",
    }));
    const resolvedRows = await attachSignedPhotoUrls(rawRows);
    const signedUrlById = new Map(resolvedRows.map((photo) => [photo.id, photo.signed_url ?? ""]));
    return (photoRows ?? []).map((photo) => ({
      ...photo,
      signedUrl: signedUrlById.get(photo.id) ?? photo.signedUrl ?? "",
    }));
  }, "사진 미리보기를 불러오지 못했습니다.");
}

export async function listPyeongPhotos({ companyId, pyeong }) {
  const rows = await listPyeongPhotoRows({ companyId, pyeong });
  return resolvePyeongPhotoUrls(rows);
}

export async function uploadPyeongSubitemPhoto({
  companyId,
  photoId,
  file,
  pyeong,
  constructionSubitemId,
  sashCatalogEntryId = null,
  existingCount = 0,
}) {
  return runPhotoV2(() => uploadPhotoWithScope({
    companyId,
    photoId,
    file,
    existingCount,
    isPrimary: false,
    scope: buildPyeongSubitemPhotoScope({ pyeong, constructionSubitemId, sashCatalogEntryId }),
  }), "평형별 사진을 등록하지 못했습니다.");
}

export async function updatePhotoDescription({ companyId, photoId, description }) {
  return runPhotoV2(async () => {
    const { data, error } = await supabase.from("photos")
      .update({ caption: normalizePhotoCaption(description) })
      .eq("id", photoId)
      .eq("company_id", companyId)
      .select()
      .single();
    if (error) throw error;
    return normalizePhotoV2Photo(data);
  }, "사진 설명을 저장하지 못했습니다.");
}

export async function reorderPhotoV2Rows({ companyId, photos = [] }) {
  return runPhotoV2(async () => {
    for (const [sortOrder, photo] of photos.entries()) {
      const { error } = await supabase.from("photos")
        .update({ sort_order: sortOrder })
        .eq("id", photo.id)
        .eq("company_id", companyId);
      if (error) throw error;
    }
  }, "사진 순서를 저장하지 못했습니다.");
}

export async function archivePhotoV2({ companyId, photoId }) {
  return runPhotoV2(async () => {
    const { data, error } = await supabase.from("photos")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", photoId)
      .eq("company_id", companyId)
      .select()
      .single();
    if (error) throw error;
    return normalizePhotoV2Photo(data);
  }, "사진을 보관하지 못했습니다.");
}

export async function getActivePhotoLibraryFolderTree(companyId) {
  return runPhotoV2(async () => getActiveLibraryFolderTree(await fetchPhotoLibraryFolderRows(companyId)), "사진 폴더를 불러오지 못했습니다.");
}

export async function listPhotoLibraryFolders({ companyId, parentFolderId = null }) {
  return runPhotoV2(async () => (
    getVisiblePhotoLibraryFolders(await fetchPhotoLibraryFolderRows(companyId), parentFolderId)
  ), "사진 폴더를 불러오지 못했습니다.");
}

export async function createPhotoLibraryFolder({ companyId, folderId, parentFolderId = null, name, sortOrder = 0 }) {
  return runPhotoV2(async () => {
    const folderRows = await fetchPhotoLibraryFolderRows(companyId);
    if (parentFolderId) await assertActivePhotoLibraryFolder(companyId, parentFolderId);
    const normalizedName = assertUniqueActiveSiblingFolderName({ folderRows, companyId, parentFolderId, name });
    const { data, error } = await supabase.from("photo_library_folders").insert({
      id: folderId,
      company_id: companyId,
      parent_folder_id: parentFolderId,
      name: normalizedName,
      sort_order: sortOrder,
    }).select().single();
    if (error) throw error;
    return normalizePhotoLibraryFolder(data);
  }, "사진 폴더를 만들지 못했습니다.");
}

export async function renamePhotoLibraryFolder({ companyId, folderId, name }) {
  return runPhotoV2(async () => {
    const folderRows = await fetchPhotoLibraryFolderRows(companyId);
    const folder = folderRows.find((entry) => entry.id === folderId);
    if (!folder || folder.archived_at) throw new Error("수정할 활성 폴더를 찾지 못했습니다.");
    const normalizedName = assertUniqueActiveSiblingFolderName({
      folderRows,
      companyId,
      parentFolderId: folder.parent_folder_id,
      name,
      excludeFolderId: folderId,
    });
    const { data, error } = await supabase.from("photo_library_folders")
      .update({ name: normalizedName })
      .eq("id", folderId)
      .eq("company_id", companyId)
      .select().single();
    if (error) throw error;
    return normalizePhotoLibraryFolder(data);
  }, "사진 폴더 이름을 변경하지 못했습니다.");
}

export async function movePhotoLibraryFolder({ companyId, folderId, parentFolderId = null }) {
  return runPhotoV2(async () => {
    const folderRows = await fetchPhotoLibraryFolderRows(companyId);
    const folder = folderRows.find((entry) => entry.id === folderId);
    if (!folder || folder.archived_at) throw new Error("이동할 활성 폴더를 찾지 못했습니다.");
    assertPhotoLibraryFolderMove({ folderId, parentFolderId, folderRows });
    assertUniqueActiveSiblingFolderName({
      folderRows,
      companyId,
      parentFolderId,
      name: folder.name,
      excludeFolderId: folderId,
    });
    const { data, error } = await supabase.from("photo_library_folders")
      .update({ parent_folder_id: parentFolderId })
      .eq("id", folderId)
      .eq("company_id", companyId)
      .select().single();
    if (error) throw error;
    return normalizePhotoLibraryFolder(data);
  }, "사진 폴더를 이동하지 못했습니다.");
}

export async function reorderPhotoLibraryFolders({ companyId, folders = [] }) {
  return runPhotoV2(async () => {
    for (const [sortOrder, folder] of folders.entries()) {
      const { error } = await supabase.from("photo_library_folders")
        .update({ sort_order: sortOrder })
        .eq("id", folder.id)
        .eq("company_id", companyId)
        .is("archived_at", null);
      if (error) throw error;
    }
  }, "사진 폴더 순서를 저장하지 못했습니다.");
}

export async function archivePhotoLibraryFolder({ companyId, folderId }) {
  return runPhotoV2(async () => {
    const { data, error } = await supabase.from("photo_library_folders")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", folderId)
      .eq("company_id", companyId)
      .select().single();
    if (error) throw error;
    return normalizePhotoLibraryFolder(data);
  }, "사진 폴더를 보관하지 못했습니다.");
}

export async function setPhotoLibraryFolderCover({ companyId, folderId, photoId }) {
  return runPhotoV2(async () => {
    await assertActivePhotoLibraryFolder(companyId, folderId);
    const { data: photo, error: photoError } = await supabase.from("photos")
      .select("id")
      .eq("id", photoId)
      .eq("company_id", companyId)
      .eq("photo_type", PHOTO_TYPES.LIBRARY)
      .eq("photo_library_folder_id", folderId)
      .is("archived_at", null)
      .maybeSingle();
    if (photoError) throw photoError;
    if (!photo?.id) throw new Error("대표사진으로 지정할 활성 폴더 사진을 찾지 못했습니다.");
    const { data, error } = await supabase.from("photo_library_folders")
      .update({ cover_photo_id: photoId })
      .eq("id", folderId)
      .eq("company_id", companyId)
      .select().single();
    if (error) throw error;
    return normalizePhotoLibraryFolder(data);
  }, "대표사진을 지정하지 못했습니다.");
}

export async function clearPhotoLibraryFolderCover({ companyId, folderId }) {
  return runPhotoV2(async () => {
    const { data, error } = await supabase.from("photo_library_folders")
      .update({ cover_photo_id: null })
      .eq("id", folderId)
      .eq("company_id", companyId)
      .select().single();
    if (error) throw error;
    return normalizePhotoLibraryFolder(data);
  }, "대표사진을 해제하지 못했습니다.");
}

export async function listPhotoLibraryPhotos({ companyId, folderId }) {
  return runPhotoV2(async () => {
    const { visibleFolderIds } = await assertActivePhotoLibraryFolder(companyId, folderId);
    return fetchLibraryPhotos({ companyId, folderIds: visibleFolderIds, folderId });
  }, "폴더 사진을 불러오지 못했습니다.");
}

export async function uploadPhotoLibraryPhoto({ companyId, folderId, photoId, file, existingCount = 0 }) {
  return runPhotoV2(async () => {
    await assertActivePhotoLibraryFolder(companyId, folderId);
    return uploadPhotoWithScope({
      companyId,
      photoId,
      file,
      existingCount,
      scope: buildPhotoLibraryScope(folderId),
    });
  }, "폴더 사진을 등록하지 못했습니다.");
}

export async function movePhotoLibraryPhoto({ companyId, photoId, destinationFolderId }) {
  return runPhotoV2(async () => {
    await assertActivePhotoLibraryFolder(companyId, destinationFolderId);
    const { error: clearCoverError } = await supabase.from("photo_library_folders")
      .update({ cover_photo_id: null })
      .eq("company_id", companyId)
      .eq("cover_photo_id", photoId);
    if (clearCoverError) throw clearCoverError;
    const { data, error } = await supabase.from("photos")
      .update(buildPhotoLibraryScope(destinationFolderId))
      .eq("id", photoId)
      .eq("company_id", companyId)
      .eq("photo_type", PHOTO_TYPES.LIBRARY)
      .select().single();
    if (error) throw error;
    return normalizePhotoV2Photo(data);
  }, "사진을 다른 폴더로 이동하지 못했습니다.");
}

export async function listRecentPhotoLibraryPhotos({ companyId, limit = 16 }) {
  return runPhotoV2(async () => {
    const { visibleFolderIds } = await getActiveLibraryContext(companyId);
    return fetchLibraryPhotos({
      companyId,
      folderIds: visibleFolderIds,
      limit: normalizePhotoLimit(limit),
      recent: true,
    });
  }, "최근 사진을 불러오지 못했습니다.");
}

export async function searchPhotoLibrary({ companyId, query }) {
  return runPhotoV2(async () => {
    const normalizedQuery = `${query ?? ""}`.trim();
    if (!normalizedQuery) return { folders: [], photos: [] };
    const { folderRows, visibleFolderIds } = await getActiveLibraryContext(companyId);
    const visibleIds = [...visibleFolderIds];
    if (!visibleIds.length) return { folders: [], photos: [] };
    const { data: folderData, error: folderError } = await supabase
      .from("photo_library_folders")
      .select("*")
      .eq("company_id", companyId)
      .in("id", visibleIds)
      .ilike("name", `%${normalizedQuery}%`)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (folderError) throw folderError;
    return {
      folders: sortPhotoLibraryFolders(folderData ?? []).map(normalizePhotoLibraryFolder),
      photos: await fetchLibraryPhotos({ companyId, folderIds: visibleFolderIds, query: normalizedQuery }),
      tree: getActiveLibraryFolderTree(folderRows),
    };
  }, "사진 라이브러리를 검색하지 못했습니다.");
}

export async function listPhotoCaptionSnippets(companyId) {
  return runPhotoV2(async () => {
    const { data, error } = await supabase.from("photo_caption_snippets")
      .select("*")
      .eq("company_id", companyId)
      .is("archived_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(normalizePhotoCaptionSnippet);
  }, "자주 쓰는 설명을 불러오지 못했습니다.");
}

export async function createPhotoCaptionSnippet({ companyId, snippetId, content, sortOrder = 0 }) {
  return runPhotoV2(async () => {
    const normalizedContent = normalizePhotoCaption(content);
    if (!normalizedContent) throw new Error("설명 내용을 입력해 주세요.");
    const { data, error } = await supabase.from("photo_caption_snippets").insert({
      id: snippetId,
      company_id: companyId,
      content: normalizedContent,
      sort_order: sortOrder,
    }).select().single();
    if (error) throw error;
    return normalizePhotoCaptionSnippet(data);
  }, "자주 쓰는 설명을 추가하지 못했습니다.");
}

export async function updatePhotoCaptionSnippet({ companyId, snippetId, content }) {
  return runPhotoV2(async () => {
    const normalizedContent = normalizePhotoCaption(content);
    if (!normalizedContent) throw new Error("설명 내용을 입력해 주세요.");
    const { data, error } = await supabase.from("photo_caption_snippets")
      .update({ content: normalizedContent })
      .eq("id", snippetId)
      .eq("company_id", companyId)
      .is("archived_at", null)
      .select().single();
    if (error) throw error;
    return normalizePhotoCaptionSnippet(data);
  }, "자주 쓰는 설명을 수정하지 못했습니다.");
}

export async function reorderPhotoCaptionSnippets({ companyId, snippets = [] }) {
  return runPhotoV2(async () => {
    for (const [sortOrder, snippet] of snippets.entries()) {
      const { error } = await supabase.from("photo_caption_snippets")
        .update({ sort_order: sortOrder })
        .eq("id", snippet.id)
        .eq("company_id", companyId)
        .is("archived_at", null);
      if (error) throw error;
    }
  }, "자주 쓰는 설명 순서를 저장하지 못했습니다.");
}

export async function archivePhotoCaptionSnippet({ companyId, snippetId }) {
  return runPhotoV2(async () => {
    const { data, error } = await supabase.from("photo_caption_snippets")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", snippetId)
      .eq("company_id", companyId)
      .select().single();
    if (error) throw error;
    return normalizePhotoCaptionSnippet(data);
  }, "자주 쓰는 설명을 보관하지 못했습니다.");
}
