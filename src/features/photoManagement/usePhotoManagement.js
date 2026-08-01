import { useState } from "react";
import {
  fetchPhotoManagementData as fetchPhotoData,
  insertPhotoCollection,
  moveCollectionPhotos,
  persistPhotoPlacement,
  removePhoto,
  removePhotoCollection,
  updatePhotoCollectionOrder,
  updatePhotoCollectionName,
  updatePrimaryPhoto,
  updatePhotoSubitemOrder,
  uploadPhoto,
} from "./photoApi";
import {
  MAX_SUBITEM_PHOTO_COUNT,
  PHOTO_TYPES,
  getPhotoTargetId,
  getPhotosForTarget,
  reorderRowsById,
  validatePhotoFile,
} from "./photoModel";

export function usePhotoManagement({ companyId, createPhotoId, getFriendlyError }) {
  const [photoTab, setPhotoTab] = useState(PHOTO_TYPES.FULL_PROJECT);
  const [photoCollections, setPhotoCollections] = useState([]);
  const [photoCollectionDrafts, setPhotoCollectionDrafts] = useState({});
  const [photos, setPhotos] = useState([]);
  const [photoCatalog, setPhotoCatalog] = useState([]);
  const [expandedPhotoCategoryIds, setExpandedPhotoCategoryIds] = useState([]);
  const [photoAutoSaveStatus, setPhotoAutoSaveStatus] = useState("idle");
  const [photoAutoSaveMessage, setPhotoAutoSaveMessage] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoNotice, setPhotoNotice] = useState("");

  const setAutosave = (status, message) => {
    setPhotoAutoSaveStatus(status);
    setPhotoAutoSaveMessage(message);
  };
  const photosForTarget = (targetType, targetId) =>
    getPhotosForTarget(photos, targetType, targetId);

  async function refresh({ resetFeedback = true } = {}) {
    if (!companyId) return;
    setPhotoLoading(true);
    setPhotoError("");
    if (resetFeedback) setPhotoNotice("");
    try {
      const data = await fetchPhotoData(companyId);
      setPhotoCollections(data.collections);
      setPhotoCollectionDrafts(Object.fromEntries(
        data.collections.map((collection) => [collection.id, collection.name ?? ""])
      ));
      setPhotos(data.photos);
      setPhotoCatalog(data.catalog);
    } catch (error) {
      setPhotoError(getFriendlyError(error, "사진 관리 데이터를 불러오지 못했습니다. supabase/photo_management.sql 적용 여부를 확인해 주세요."));
    } finally {
      setPhotoLoading(false);
    }
  }

  async function runMutation({ savingMessage, savedMessage, errorMessage, notice, fallback, action }) {
    setPhotoSaving(true);
    setAutosave("saving", savingMessage);
    setPhotoError("");
    setPhotoNotice("");
    try {
      await action();
      await refresh({ resetFeedback: false });
      setPhotoNotice(notice);
      setAutosave("saved", savedMessage);
      return true;
    } catch (error) {
      setPhotoError(getFriendlyError(error, fallback));
      setAutosave("error", errorMessage);
      return false;
    } finally {
      setPhotoSaving(false);
    }
  }

  async function addCollection(photoType, requestedName) {
    if (![PHOTO_TYPES.FULL_PROJECT, PHOTO_TYPES.PARTIAL_PROJECT].includes(photoType)) return;
    const sameType = photoCollections.filter((collection) => collection.photo_type === photoType);
    const name = `${requestedName ?? ""}`.trim();
    if (!name) {
      setPhotoError("분류명을 입력해 주세요.");
      return false;
    }
    return runMutation({
      savingMessage: "분류 저장 중...", savedMessage: "분류가 저장되었습니다.",
      errorMessage: "분류 저장 실패",
      notice: "분류를 추가했습니다.", fallback: "사진 분류를 추가하지 못했습니다.",
      action: () => insertPhotoCollection({
        company_id: companyId, photo_type: photoType,
        name, sort_order: sameType.length,
      }),
    });
  }

  async function saveCollectionName(collectionId) {
    const name = `${photoCollectionDrafts[collectionId] ?? ""}`.trim();
    if (!name) return setPhotoError("분류명을 입력해 주세요.");
    await runMutation({
      savingMessage: "분류명 저장 중...", savedMessage: "분류명이 저장되었습니다.",
      errorMessage: "분류명 저장 실패",
      notice: "분류명을 저장했습니다.", fallback: "사진 분류명을 저장하지 못했습니다.",
      action: () => updatePhotoCollectionName({ companyId, collectionId, name }),
    });
  }

  async function deleteCollection(collection, { mode = "delete-photos", destinationId = "" } = {}) {
    const targetPhotos = photosForTarget(collection.photo_type, collection.id);
    const destination = photoCollections.find((entry) => (
      entry.id === destinationId
      && entry.company_id === companyId
      && entry.photo_type === collection.photo_type
    ));
    if (mode === "move" && !destination) {
      setPhotoError("사진을 이동할 분류를 선택해 주세요.");
      return false;
    }
    return runMutation({
      savingMessage: "분류 삭제 중...", savedMessage: "분류가 삭제되었습니다.",
      errorMessage: "분류 삭제 실패",
      notice: "분류를 삭제했습니다.", fallback: "사진 분류를 삭제하지 못했습니다.",
      action: () => mode === "move"
        ? moveCollectionPhotos({ companyId, collection, destination, photos })
        : removePhotoCollection({ companyId, collection, photos: targetPhotos }),
    });
  }

  async function reorderCollections(photoType, draggedId, dropId) {
    const sameType = photoCollections.filter((collection) => collection.photo_type === photoType);
    const reordered = reorderRowsById(sameType, draggedId, dropId);
    if (reordered.map((entry) => entry.id).join("|") === sameType.map((entry) => entry.id).join("|")) return false;
    return runMutation({
      savingMessage: "분류 순서 저장 중...", savedMessage: "분류 순서가 저장되었습니다.",
      errorMessage: "분류 순서 저장 실패",
      notice: "분류 순서를 변경했습니다.", fallback: "분류 순서를 저장하지 못했습니다.",
      action: () => updatePhotoCollectionOrder({ companyId, collections: reordered }),
    });
  }

  async function upload(targetType, targetId, fileList) {
    const file = fileList?.[0];
    const validationError = validatePhotoFile(file);
    if (validationError) {
      setPhotoError(validationError);
      setAutosave("error", "사진 저장 실패");
      return;
    }
    const existing = photosForTarget(targetType, targetId);
    if (targetType === PHOTO_TYPES.SUBITEM && existing.length >= MAX_SUBITEM_PHOTO_COUNT) {
      setPhotoError(`세부항목 사진은 최대 ${MAX_SUBITEM_PHOTO_COUNT}장까지 등록할 수 있습니다.`);
      setAutosave("error", "사진 저장 실패");
      return;
    }
    return runMutation({
      savingMessage: "사진 저장 중...", savedMessage: "사진이 저장되었습니다.",
      errorMessage: "사진 저장 실패",
      notice: "사진을 업로드했습니다.", fallback: "사진을 업로드하지 못했습니다.",
      action: () => uploadPhoto({
        companyId, targetType, targetId, photoId: createPhotoId(), file,
        existingCount: existing.length,
      }),
    });
  }

  async function setPrimary(photo) {
    const targetType = photo?.target_type ?? photo?.photo_type;
    const targetId = getPhotoTargetId(photo);
    return runMutation({
      savingMessage: "대표사진 저장 중...", savedMessage: "대표사진이 저장되었습니다.",
      errorMessage: "대표사진 저장 실패",
      notice: "대표사진을 변경했습니다.", fallback: "대표사진을 변경하지 못했습니다.",
      action: () => updatePrimaryPhoto({ companyId, photo, targetType, targetId }),
    });
  }

  async function remove(photo) {
    return runMutation({
      savingMessage: "사진 삭제 중...", savedMessage: "사진이 삭제되었습니다.",
      errorMessage: "사진 삭제 실패",
      notice: "사진을 삭제했습니다.", fallback: "사진을 삭제하지 못했습니다.",
      action: () => removePhoto({ companyId, photo }),
    });
  }

  async function movePhoto(photoId, targetType, targetId, targetIndex) {
    const photo = photos.find((entry) => entry.id === photoId);
    if (!photo || !targetType || !targetId) return false;
    return runMutation({
      savingMessage: "사진 순서 저장 중...", savedMessage: "사진 순서가 저장되었습니다.",
      errorMessage: "사진 순서 저장 실패",
      notice: getPhotoTargetId(photo) === targetId ? "사진 순서를 변경했습니다." : "사진을 다른 분류로 이동했습니다.",
      fallback: "사진 위치를 저장하지 못했습니다.",
      action: () => persistPhotoPlacement({
        companyId, photos, photoId, targetType, targetId, targetIndex,
      }),
    });
  }

  async function reorderSubitems(itemId, draggedId, dropId) {
    const item = photoCatalog.find((entry) => entry.id === itemId);
    const reordered = reorderRowsById(item?.subitems ?? [], draggedId, dropId);
    if (!item || reordered.map((entry) => entry.id).join("|") === (item.subitems ?? []).map((entry) => entry.id).join("|")) return false;
    return runMutation({
      savingMessage: "세부항목 순서 저장 중...", savedMessage: "세부항목 순서가 저장되었습니다.",
      errorMessage: "세부항목 순서 저장 실패",
      notice: "세부항목 순서를 변경했습니다.", fallback: "세부항목 순서를 저장하지 못했습니다.",
      action: () => updatePhotoSubitemOrder({ companyId, itemId, subitems: reordered }),
    });
  }

  function reset() {
    setPhotoTab(PHOTO_TYPES.FULL_PROJECT);
    setPhotoCollections([]);
    setPhotoCollectionDrafts({});
    setPhotos([]);
    setPhotoCatalog([]);
    setExpandedPhotoCategoryIds([]);
    setPhotoAutoSaveStatus("idle");
    setPhotoAutoSaveMessage("");
    setPhotoLoading(false);
    setPhotoSaving(false);
    setPhotoError("");
    setPhotoNotice("");
  }

  return {
    photoTab, setPhotoTab, photoCollections, photoCollectionDrafts, setPhotoCollectionDrafts,
    photos, photoCatalog, expandedPhotoCategoryIds, setExpandedPhotoCategoryIds,
    photoAutoSaveStatus, photoAutoSaveMessage, photoLoading, photoSaving,
    photoError, setPhotoError, photoNotice, setPhotoNotice,
    getPhotosForTarget: photosForTarget,
    refresh, addCollection, saveCollectionName, deleteCollection, reorderCollections,
    upload, setPrimary, remove, movePhoto, reorderSubitems, reset,
  };
}
