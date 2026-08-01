import { useEffect, useRef, useState } from "react";
import {
  archivePhotoType,
  deleteEmptyPhotoType,
  fetchPhotoManagementData as fetchPhotoData,
  insertPhotoCollection,
  insertPhotoType,
  moveCollectionPhotos,
  movePhotoTypeContents,
  persistPhotoPlacement,
  removePhoto,
  removePhotoCollection,
  updatePhotoCollectionOrder,
  updatePhotoCollectionName,
  updatePhotoTypeName,
  updatePhotoTypeOrder,
  updatePrimaryPhoto,
  updatePhotoSubitemOrder,
  uploadPhoto,
} from "./photoApi";
import { createPhotoAutosave, runQueuedPhotoChanges } from "./photoAutosave";
import {
  MAX_SUBITEM_PHOTO_COUNT,
  PHOTO_TYPES,
  buildCustomPhotoType,
  buildPhotoPlacementUpdates,
  getPhotoTargetId,
  getPhotosForTarget,
  reorderRowsById,
  sortPhotoTypes,
  validatePhotoFile,
} from "./photoModel";

const PHOTO_AUTOSAVE_TARGET = "photo-management";

export function usePhotoManagement({ companyId, createPhotoId, getFriendlyError }) {
  const [photoTab, setPhotoTab] = useState(PHOTO_TYPES.FULL_PROJECT);
  const [photoTypes, setPhotoTypes] = useState([]);
  const [photoTypeDrafts, setPhotoTypeDrafts] = useState({});
  const [photoCollections, setPhotoCollections] = useState([]);
  const [photoCollectionDrafts, setPhotoCollectionDrafts] = useState({});
  const [photos, setPhotos] = useState([]);
  const [photoCatalog, setPhotoCatalog] = useState([]);
  const [expandedPhotoCategoryIds, setExpandedPhotoCategoryIds] = useState([]);
  const [photoAutoSaveStatus, setPhotoAutoSaveStatus] = useState("idle");
  const [photoAutoSaveMessage, setPhotoAutoSaveMessage] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [mutationSaving, setMutationSaving] = useState(false);
  const [autoSaveRunning, setAutoSaveRunning] = useState(false);
  const [hasPendingPhotoChanges, setHasPendingPhotoChanges] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoNotice, setPhotoNotice] = useState("");
  const typesRef = useRef([]);
  const collectionsRef = useRef([]);
  const photosRef = useRef([]);
  const catalogRef = useRef([]);
  const pendingChangesRef = useRef([]);
  const mountedRef = useRef(true);
  const flushQueueRef = useRef(async () => true);
  const autosaveRef = useRef(null);

  const setTypesState = (nextValue) => {
    const next = typeof nextValue === "function" ? nextValue(typesRef.current) : nextValue;
    typesRef.current = sortPhotoTypes(next);
    setPhotoTypes(typesRef.current);
    return typesRef.current;
  };

  const setCollectionsState = (nextValue) => {
    const next = typeof nextValue === "function" ? nextValue(collectionsRef.current) : nextValue;
    collectionsRef.current = next;
    setPhotoCollections(next);
    return next;
  };
  const setPhotosState = (nextValue) => {
    const next = typeof nextValue === "function" ? nextValue(photosRef.current) : nextValue;
    photosRef.current = next;
    setPhotos(next);
    return next;
  };
  const setCatalogState = (nextValue) => {
    const next = typeof nextValue === "function" ? nextValue(catalogRef.current) : nextValue;
    catalogRef.current = next;
    setPhotoCatalog(next);
    return next;
  };

  if (!autosaveRef.current) {
    autosaveRef.current = createPhotoAutosave({
      save: () => flushQueueRef.current(),
      onChange: (snapshot) => {
        if (!mountedRef.current) return;
        setPhotoAutoSaveStatus(snapshot.status);
        setAutoSaveRunning(snapshot.running);
        if (snapshot.status === "dirty") setPhotoAutoSaveMessage("변경 사항을 자동 저장합니다.");
        if (snapshot.status === "saving") setPhotoAutoSaveMessage("변경 사항 저장 중...");
        if (snapshot.status === "saved") setPhotoAutoSaveMessage("변경 사항이 저장되었습니다.");
        if (snapshot.status === "error") setPhotoAutoSaveMessage(snapshot.error || "변경 사항을 저장하지 못했습니다.");
      },
    });
  }

  useEffect(() => () => {
    mountedRef.current = false;
    autosaveRef.current?.clearTimer();
  }, []);

  const photoSaving = mutationSaving || autoSaveRunning;
  const photosForTarget = (targetType, targetId) =>
    getPhotosForTarget(photosRef.current, targetType, targetId);

  async function refresh({ resetFeedback = true } = {}) {
    if (!companyId) return false;
    setPhotoLoading(true);
    setPhotoError("");
    if (resetFeedback) setPhotoNotice("");
    try {
      const data = await fetchPhotoData(companyId);
      setTypesState(data.photoTypes);
      setPhotoTypeDrafts(Object.fromEntries(
        data.photoTypes.map((photoType) => [photoType.id, photoType.display_name ?? ""])
      ));
      setCollectionsState(data.collections);
      setPhotoCollectionDrafts(Object.fromEntries(
        data.collections.map((collection) => [collection.id, collection.name ?? ""])
      ));
      setPhotosState(data.photos);
      setCatalogState(data.catalog);
      return true;
    } catch (error) {
      setPhotoError(getFriendlyError(error, "사진 관리 데이터를 불러오지 못했습니다. 사진 관리 SQL 적용 상태를 확인해 주세요."));
      return false;
    } finally {
      setPhotoLoading(false);
    }
  }

  flushQueueRef.current = async () => {
    const changes = pendingChangesRef.current;
    if (!changes.length) return true;
    pendingChangesRef.current = [];
    setHasPendingPhotoChanges(false);
    setPhotoError("");
    setPhotoNotice("");

    return runQueuedPhotoChanges(changes, async (failures) => {
      await refresh({ resetFeedback: false });
      const firstError = failures[0]?.error;
      setPhotoError(getFriendlyError(firstError, "사진 변경 사항을 저장하지 못해 마지막 저장 상태로 복원했습니다."));
    });
  };

  function queueChange(change) {
    const existingIndex = change.key
      ? pendingChangesRef.current.findIndex((entry) => entry.key === change.key)
      : -1;
    if (existingIndex >= 0) {
      pendingChangesRef.current[existingIndex] = change;
    } else {
      pendingChangesRef.current.push(change);
    }
    setHasPendingPhotoChanges(true);
    autosaveRef.current.markDirty(PHOTO_AUTOSAVE_TARGET);
  }

  function removeQueuedChange(key) {
    pendingChangesRef.current = pendingChangesRef.current.filter((entry) => entry.key !== key);
    setHasPendingPhotoChanges(pendingChangesRef.current.length > 0);
  }

  async function flushPendingChanges() {
    if (!pendingChangesRef.current.length && !autoSaveRunning) return true;
    return autosaveRef.current.run(PHOTO_AUTOSAVE_TARGET);
  }

  async function runMutation({ savingMessage, savedMessage, errorMessage, notice, fallback, action }) {
    if (pendingChangesRef.current.length && !(await flushPendingChanges())) return false;
    setMutationSaving(true);
    setPhotoAutoSaveStatus("saving");
    setPhotoAutoSaveMessage(savingMessage);
    setPhotoError("");
    setPhotoNotice("");
    try {
      await action();
      await refresh({ resetFeedback: false });
      setPhotoNotice(notice);
      setPhotoAutoSaveStatus("saved");
      setPhotoAutoSaveMessage(savedMessage);
      return true;
    } catch (error) {
      setPhotoError(getFriendlyError(error, fallback));
      setPhotoAutoSaveStatus("error");
      setPhotoAutoSaveMessage(errorMessage);
      return false;
    } finally {
      setMutationSaving(false);
    }
  }

  async function addPhotoType(requestedName) {
    const displayName = `${requestedName ?? ""}`.trim();
    if (!displayName) {
      setPhotoError("사진 유형명을 입력해 주세요.");
      return false;
    }
    const id = createPhotoId();
    const photoType = buildCustomPhotoType({
      companyId,
      id,
      displayName,
      sortOrder: typesRef.current.length,
    });
    setTypesState((current) => [...current, photoType]);
    setPhotoTypeDrafts((current) => ({ ...current, [photoType.id]: displayName }));
    queueChange({
      key: `photo-type-add:${photoType.id}`,
      execute: () => insertPhotoType(photoType),
    });
    return photoType;
  }

  function changePhotoTypeName(photoTypeId, value) {
    const draftValue = `${value ?? ""}`;
    setPhotoTypeDrafts((current) => ({ ...current, [photoTypeId]: draftValue }));
    const displayName = draftValue.trim();
    if (!displayName) {
      removeQueuedChange(`photo-type-name:${photoTypeId}`);
      return false;
    }
    setTypesState((current) => current.map((entry) => (
      entry.id === photoTypeId ? { ...entry, display_name: displayName } : entry
    )));
    queueChange({
      key: `photo-type-name:${photoTypeId}`,
      execute: () => updatePhotoTypeName({ companyId, photoTypeId, displayName }),
    });
    return true;
  }

  function cancelPhotoTypeNameEdit(photoTypeId, originalName) {
    const displayName = `${originalName ?? ""}`.trim();
    setPhotoTypeDrafts((current) => ({ ...current, [photoTypeId]: displayName }));
    setTypesState((current) => current.map((entry) => (
      entry.id === photoTypeId ? { ...entry, display_name: displayName } : entry
    )));
    if (!displayName) {
      removeQueuedChange(`photo-type-name:${photoTypeId}`);
      return;
    }
    queueChange({
      key: `photo-type-name:${photoTypeId}`,
      execute: () => updatePhotoTypeName({ companyId, photoTypeId, displayName }),
    });
  }

  async function reorderPhotoTypes(draggedId, dropId) {
    const reordered = reorderRowsById(typesRef.current, draggedId, dropId)
      .map((entry, sortOrder) => ({ ...entry, sort_order: sortOrder }));
    if (reordered.map((entry) => entry.id).join("|") === typesRef.current.map((entry) => entry.id).join("|")) return false;
    setTypesState(reordered);
    queueChange({
      key: "photo-type-order",
      execute: () => updatePhotoTypeOrder({ companyId, photoTypes: reordered }),
    });
    return true;
  }

  async function removePhotoType(photoType, { mode = "archive", destinationStorageKey = "" } = {}) {
    const currentCollections = collectionsRef.current;
    const currentPhotos = photosRef.current;
    const sourceCollections = currentCollections.filter((collection) => collection.photo_type === photoType.storage_key);
    const sourcePhotos = currentPhotos.filter((photo) => (photo.target_type ?? photo.photo_type) === photoType.storage_key);
    const hasContent = sourceCollections.length > 0 || sourcePhotos.length > 0;
    const destinationType = typesRef.current.find((entry) => entry.storage_key === destinationStorageKey);

    if (mode === "move" && (!destinationType || destinationType.id === photoType.id || destinationType.stable_kind === "detail")) {
      setPhotoError("사진과 분류를 이동할 일반 사진 유형을 선택해 주세요.");
      return false;
    }
    if (mode === "delete" && (photoType.is_system || hasContent)) {
      setPhotoError("기본 유형 또는 데이터가 있는 유형은 보관하거나 이동한 뒤 정리해 주세요.");
      return false;
    }

    setTypesState((current) => current.filter((entry) => entry.id !== photoType.id));
    if (mode === "move") {
      const destinationCount = currentCollections.filter((collection) => collection.photo_type === destinationType.storage_key).length;
      setCollectionsState((current) => {
        let movedIndex = 0;
        return current.map((collection) => collection.photo_type === photoType.storage_key
          ? { ...collection, photo_type: destinationType.storage_key, sort_order: destinationCount + movedIndex++ }
          : collection);
      });
      setPhotosState((current) => current.map((photo) => (
        (photo.target_type ?? photo.photo_type) === photoType.storage_key
          ? { ...photo, photo_type: destinationType.storage_key, target_type: destinationType.storage_key }
          : photo
      )));
    }

    queueChange({
      key: `photo-type-remove:${photoType.id}`,
      execute: () => {
        if (mode === "move") {
          return movePhotoTypeContents({
            companyId,
            sourceType: photoType,
            destinationType,
            collections: currentCollections,
          });
        }
        if (mode === "delete") return deleteEmptyPhotoType({ companyId, photoTypeId: photoType.id });
        return archivePhotoType({ companyId, photoTypeId: photoType.id });
      },
    });
    return true;
  }

  async function addCollection(photoType, requestedName) {
    const activeType = typesRef.current.find((entry) => entry.storage_key === photoType);
    if (!activeType || activeType.stable_kind === "detail") return false;
    const sameType = collectionsRef.current.filter((collection) => collection.photo_type === photoType);
    const name = `${requestedName ?? ""}`.trim();
    if (!name) {
      setPhotoError("분류명을 입력해 주세요.");
      return false;
    }
    const collection = {
      id: createPhotoId(),
      company_id: companyId,
      photo_type: photoType,
      name,
      sort_order: sameType.length,
    };
    setCollectionsState((current) => [...current, collection]);
    setPhotoCollectionDrafts((current) => ({ ...current, [collection.id]: name }));
    queueChange({
      key: `collection-add:${collection.id}`,
      execute: () => insertPhotoCollection(collection),
    });
    return true;
  }

  function changeCollectionName(collectionId, value) {
    const draftValue = `${value ?? ""}`;
    setPhotoCollectionDrafts((current) => ({ ...current, [collectionId]: draftValue }));
    const name = draftValue.trim();
    if (!name) {
      removeQueuedChange(`collection-name:${collectionId}`);
      return false;
    }
    setCollectionsState((current) => current.map((entry) => (
      entry.id === collectionId ? { ...entry, name } : entry
    )));
    queueChange({
      key: `collection-name:${collectionId}`,
      execute: () => updatePhotoCollectionName({ companyId, collectionId, name }),
    });
    return true;
  }

  function cancelCollectionNameEdit(collectionId, originalName) {
    const name = `${originalName ?? ""}`.trim();
    setPhotoCollectionDrafts((current) => ({ ...current, [collectionId]: name }));
    setCollectionsState((current) => current.map((entry) => (
      entry.id === collectionId ? { ...entry, name } : entry
    )));
    if (!name) {
      removeQueuedChange(`collection-name:${collectionId}`);
      return;
    }
    queueChange({
      key: `collection-name:${collectionId}`,
      execute: () => updatePhotoCollectionName({ companyId, collectionId, name }),
    });
  }

  async function deleteCollection(collection, { mode = "delete-photos", destinationId = "" } = {}) {
    const currentPhotos = photosRef.current;
    const targetPhotos = getPhotosForTarget(currentPhotos, collection.photo_type, collection.id);
    const destination = collectionsRef.current.find((entry) => (
      entry.id === destinationId
      && entry.company_id === companyId
      && entry.photo_type === collection.photo_type
    ));
    if (mode === "move" && !destination) {
      setPhotoError("사진을 이동할 분류를 선택해 주세요.");
      return false;
    }

    setCollectionsState((current) => current.filter((entry) => entry.id !== collection.id));
    if (mode === "move") {
      const destinationCount = getPhotosForTarget(currentPhotos, destination.photo_type, destination.id).length;
      setPhotosState((current) => current.map((photo) => {
        if ((photo.target_type ?? photo.photo_type) !== collection.photo_type || getPhotoTargetId(photo) !== collection.id) return photo;
        const index = targetPhotos.findIndex((entry) => entry.id === photo.id);
        return {
          ...photo,
          photo_type: destination.photo_type,
          target_type: destination.photo_type,
          target_id: destination.id,
          collection_id: destination.id,
          sort_order: destinationCount + index,
          is_primary: destinationCount === 0 && index === 0,
        };
      }));
    } else {
      const targetIds = new Set(targetPhotos.map((photo) => photo.id));
      setPhotosState((current) => current.filter((photo) => !targetIds.has(photo.id)));
    }
    queueChange({
      key: `collection-delete:${collection.id}`,
      execute: () => mode === "move"
        ? moveCollectionPhotos({ companyId, collection, destination, photos: currentPhotos })
        : removePhotoCollection({ companyId, collection, photos: targetPhotos }),
    });
    return true;
  }

  async function reorderCollections(photoType, draggedId, dropId) {
    const sameType = collectionsRef.current.filter((collection) => collection.photo_type === photoType);
    const reordered = reorderRowsById(sameType, draggedId, dropId).map((entry, sortOrder) => ({ ...entry, sort_order: sortOrder }));
    if (reordered.map((entry) => entry.id).join("|") === sameType.map((entry) => entry.id).join("|")) return false;
    setCollectionsState((current) => {
      let typeIndex = 0;
      return current.map((entry) => (
        entry.photo_type === photoType ? reordered[typeIndex++] : entry
      ));
    });
    queueChange({
      key: `collection-order:${photoType}`,
      execute: () => updatePhotoCollectionOrder({ companyId, collections: reordered }),
    });
    return true;
  }

  async function upload(targetType, targetId, fileList) {
    const file = fileList?.[0];
    const validationError = validatePhotoFile(file);
    if (validationError) {
      setPhotoError(validationError);
      setPhotoAutoSaveStatus("error");
      setPhotoAutoSaveMessage("사진 저장 실패");
      return false;
    }
    const existing = photosForTarget(targetType, targetId);
    if (targetType === PHOTO_TYPES.SUBITEM && existing.length >= MAX_SUBITEM_PHOTO_COUNT) {
      setPhotoError(`세부항목 사진은 최대 ${MAX_SUBITEM_PHOTO_COUNT}장까지 등록할 수 있습니다.`);
      setPhotoAutoSaveStatus("error");
      setPhotoAutoSaveMessage("사진 저장 실패");
      return false;
    }
    return runMutation({
      savingMessage: "사진 저장 중...", savedMessage: "사진이 저장되었습니다.",
      errorMessage: "사진 저장 실패", notice: "사진을 업로드했습니다.",
      fallback: "사진을 업로드하지 못했습니다.",
      action: () => uploadPhoto({
        companyId, targetType, targetId, photoId: createPhotoId(), file,
        existingCount: existing.length,
      }),
    });
  }

  async function setPrimary(photo) {
    const targetType = photo?.target_type ?? photo?.photo_type;
    const targetId = getPhotoTargetId(photo);
    setPhotosState((current) => current.map((entry) => (
      (entry.target_type ?? entry.photo_type) === targetType && getPhotoTargetId(entry) === targetId
        ? { ...entry, is_primary: entry.id === photo.id }
        : entry
    )));
    queueChange({
      key: `primary:${targetType}:${targetId}`,
      execute: () => updatePrimaryPhoto({ companyId, photo, targetType, targetId }),
    });
    return true;
  }

  async function remove(photo) {
    return runMutation({
      savingMessage: "사진 삭제 중...", savedMessage: "사진이 삭제되었습니다.",
      errorMessage: "사진 삭제 실패", notice: "사진을 삭제했습니다.",
      fallback: "사진을 삭제하지 못했습니다.",
      action: () => removePhoto({ companyId, photo }),
    });
  }

  async function movePhoto(photoId, targetType, targetId, targetIndex) {
    const currentPhotos = photosRef.current;
    const photo = currentPhotos.find((entry) => entry.id === photoId);
    if (!photo || !targetType || !targetId) return false;
    const updates = buildPhotoPlacementUpdates({ photos: currentPhotos, photoId, targetType, targetId, targetIndex });
    if (!updates.length) return false;
    const byId = new Map(updates.map((entry) => [entry.id, entry]));
    setPhotosState((current) => current.map((entry) => (
      byId.has(entry.id) ? { ...entry, ...byId.get(entry.id) } : entry
    )));
    queueChange({
      key: `photo-placement:${photoId}`,
      execute: () => persistPhotoPlacement({
        companyId, photos: currentPhotos, photoId, targetType, targetId, targetIndex,
      }),
    });
    return true;
  }

  async function reorderSubitems(itemId, draggedId, dropId) {
    const item = catalogRef.current.find((entry) => entry.id === itemId);
    const reordered = reorderRowsById(item?.subitems ?? [], draggedId, dropId).map((entry, sortOrder) => ({ ...entry, sort_order: sortOrder }));
    if (!item || reordered.map((entry) => entry.id).join("|") === (item.subitems ?? []).map((entry) => entry.id).join("|")) return false;
    setCatalogState((current) => current.map((entry) => (
      entry.id === itemId ? { ...entry, subitems: reordered } : entry
    )));
    queueChange({
      key: `subitem-order:${itemId}`,
      execute: () => updatePhotoSubitemOrder({ companyId, itemId, subitems: reordered }),
    });
    return true;
  }

  function reset() {
    autosaveRef.current?.reset();
    pendingChangesRef.current = [];
    setPhotoTab(PHOTO_TYPES.FULL_PROJECT);
    setTypesState([]);
    setPhotoTypeDrafts({});
    setCollectionsState([]);
    setPhotoCollectionDrafts({});
    setPhotosState([]);
    setCatalogState([]);
    setExpandedPhotoCategoryIds([]);
    setHasPendingPhotoChanges(false);
    setPhotoLoading(false);
    setMutationSaving(false);
    setAutoSaveRunning(false);
    setPhotoError("");
    setPhotoNotice("");
  }

  return {
    photoTab, setPhotoTab, photoTypes, photoTypeDrafts,
    photoCollections, photoCollectionDrafts,
    photos, photoCatalog, expandedPhotoCategoryIds, setExpandedPhotoCategoryIds,
    photoAutoSaveStatus, photoAutoSaveMessage, photoLoading, photoSaving,
    hasPendingPhotoChanges, photoError, setPhotoError, photoNotice, setPhotoNotice,
    getPhotosForTarget: photosForTarget,
    refresh, flushPendingChanges, addPhotoType, changePhotoTypeName,
    cancelPhotoTypeNameEdit, reorderPhotoTypes, removePhotoType,
    addCollection, changeCollectionName,
    cancelCollectionNameEdit, deleteCollection, reorderCollections,
    upload, setPrimary, remove, movePhoto, reorderSubitems, reset,
  };
}
