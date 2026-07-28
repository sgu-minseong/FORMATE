import { supabase } from "../../lib/supabaseClient";
import { fetchConstructionCatalogRows } from "../priceTable/priceTableApi";
import { normalizeAdminItems } from "../priceTable/priceTableModel";
import {
  PHOTO_COLLECTION_DEFAULT_NAMES,
  PHOTO_SIGNED_URL_EXPIRES_IN_SECONDS,
  PHOTO_STORAGE_BUCKET,
  PHOTO_TYPES,
  buildPhotoInsertPayload,
  buildPhotoStoragePath,
} from "./photoModel";

async function attachSignedPhotoUrls(photoRows = []) {
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
    .in("photo_type", [PHOTO_TYPES.FULL_PROJECT, PHOTO_TYPES.PARTIAL_PROJECT])
    .order("photo_type", { ascending: true })
    .order("sort_order", { ascending: true });
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function fetchPhotoManagementData(companyId) {
  let collections = await fetchCollections(companyId);
  if (!collections.length) {
    const payloads = [PHOTO_TYPES.FULL_PROJECT, PHOTO_TYPES.PARTIAL_PROJECT].flatMap((photoType) =>
      PHOTO_COLLECTION_DEFAULT_NAMES.map((name, sortOrder) => ({
        company_id: companyId,
        photo_type: photoType,
        name,
        sort_order: sortOrder,
      }))
    );
    const { error } = await supabase.from("photo_collections").insert(payloads);
    if (error) throw error;
    collections = await fetchCollections(companyId);
  }
  const { data: photoRows, error: photoError } = await supabase
    .from("photos")
    .select("*")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (photoError) throw photoError;
  const photos = await attachSignedPhotoUrls(photoRows ?? []);
  const { itemRows, subitemRows } = await fetchConstructionCatalogRows(companyId);
  return {
    collections,
    photos,
    catalog: normalizeAdminItems(itemRows, subitemRows, []),
  };
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

export async function removePhotoCollection({ companyId, collection, photos }) {
  const paths = photos.map((photo) => photo.storage_path).filter(Boolean);
  if (paths.length) await supabase.storage.from(PHOTO_STORAGE_BUCKET).remove(paths);
  const { error } = await supabase.from("photo_collections").delete()
    .eq("id", collection.id).eq("company_id", companyId);
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
