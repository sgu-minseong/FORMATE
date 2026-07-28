import { useState } from "react";
import {
  fetchPhotoManagementData as fetchPhotoData,
  insertPhotoCollection,
  removePhoto,
  removePhotoCollection,
  swapPhotoOrder,
  updatePhotoCollectionName,
  updatePrimaryPhoto,
  uploadPhoto,
} from "./photoApi";
import {
  MAX_SUBITEM_PHOTO_COUNT,
  PHOTO_TYPES,
  getPhotoTargetId,
  getPhotosForTarget,
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

  async function refresh() {
    if (!companyId) return;
    setPhotoLoading(true);
    setPhotoError("");
    setPhotoNotice("");
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
      setPhotoNotice(notice);
      setAutosave("saved", savedMessage);
      await refresh();
    } catch (error) {
      setPhotoError(getFriendlyError(error, fallback));
      setAutosave("error", errorMessage);
    } finally {
      setPhotoSaving(false);
    }
  }

  async function addCollection(photoType) {
    if (![PHOTO_TYPES.FULL_PROJECT, PHOTO_TYPES.PARTIAL_PROJECT].includes(photoType)) return;
    const sameType = photoCollections.filter((collection) => collection.photo_type === photoType);
    await runMutation({
      savingMessage: "분류 저장 중...", savedMessage: "분류가 저장되었습니다.",
      errorMessage: "분류 저장 실패",
      notice: "분류를 추가했습니다.", fallback: "사진 분류를 추가하지 못했습니다.",
      action: () => insertPhotoCollection({
        company_id: companyId, photo_type: photoType,
        name: `새 분류 ${sameType.length + 1}`, sort_order: sameType.length,
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

  async function deleteCollection(collection) {
    const targetPhotos = photosForTarget(collection.photo_type, collection.id);
    if (targetPhotos.length && !window.confirm("이 분류의 사진도 함께 삭제됩니다. 계속할까요?")) return;
    await runMutation({
      savingMessage: "분류 삭제 중...", savedMessage: "분류가 삭제되었습니다.",
      errorMessage: "분류 삭제 실패",
      notice: "분류를 삭제했습니다.", fallback: "사진 분류를 삭제하지 못했습니다.",
      action: () => removePhotoCollection({ companyId, collection, photos: targetPhotos }),
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
    await runMutation({
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
    await runMutation({
      savingMessage: "대표사진 저장 중...", savedMessage: "대표사진이 저장되었습니다.",
      errorMessage: "대표사진 저장 실패",
      notice: "대표사진을 변경했습니다.", fallback: "대표사진을 변경하지 못했습니다.",
      action: () => updatePrimaryPhoto({ companyId, photo, targetType, targetId }),
    });
  }

  async function remove(photo) {
    await runMutation({
      savingMessage: "사진 삭제 중...", savedMessage: "사진이 삭제되었습니다.",
      errorMessage: "사진 삭제 실패",
      notice: "사진을 삭제했습니다.", fallback: "사진을 삭제하지 못했습니다.",
      action: () => removePhoto({ companyId, photo }),
    });
  }

  async function move(photo, direction) {
    const targetType = photo?.target_type ?? photo?.photo_type;
    const targetId = getPhotoTargetId(photo);
    const targetPhotos = photosForTarget(targetType, targetId);
    const currentIndex = targetPhotos.findIndex((entry) => entry.id === photo.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= targetPhotos.length) return;
    await runMutation({
      savingMessage: "사진 순서 저장 중...", savedMessage: "사진 순서가 저장되었습니다.",
      errorMessage: "사진 순서 저장 실패",
      notice: "사진 순서를 변경했습니다.", fallback: "사진 순서를 변경하지 못했습니다.",
      action: () => swapPhotoOrder({
        companyId, photo, sibling: targetPhotos[nextIndex], currentIndex, nextIndex,
      }),
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
    refresh, addCollection, saveCollectionName, deleteCollection, upload, setPrimary, remove, move, reset,
  };
}
