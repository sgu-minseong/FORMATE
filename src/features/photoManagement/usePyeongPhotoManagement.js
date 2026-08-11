import { useEffect, useRef, useState } from "react";
import {
  archivePhotoCaptionSnippet,
  archivePhotoV2,
  compensatePhotoUploadBatchAtomic,
  createPhotoCaptionSnippet,
  listPhotoCaptionSnippets,
  listPyeongPhotoRows,
  reorderPhotoCaptionSnippets,
  reorderPhotoV2Rows,
  resolvePyeongPhotoUrls,
  updatePhotoCaptionSnippet,
  updatePhotoDescriptionsAtomic,
  uploadPyeongSubitemPhoto,
} from "./photoApi";
import { createPhotoAutosave } from "./photoAutosave";
import { normalizePositivePyeong, reorderRowsById } from "./photoModel";

const PYEONG_CAPTION_AUTOSAVE_TARGET = "pyeong-photo-caption";

export const PYEONG_PHOTO_STATUS = Object.freeze({
  NO_PYEONG_SELECTED: "no-pyeong-selected",
  PYEONG_LOADING: "pyeong-loading",
  READY_EMPTY: "ready-empty",
  READY_WITH_DATA: "ready-with-data",
  ERROR: "error",
});

function getReadyStatus(photos) {
  return photos.length
    ? PYEONG_PHOTO_STATUS.READY_WITH_DATA
    : PYEONG_PHOTO_STATUS.READY_EMPTY;
}

export function usePyeongPhotoManagement({ companyId, createPhotoId, getFriendlyError }) {
  const [draftPyeong, setDraftPyeong] = useState("");
  const [pendingPyeong, setPendingPyeong] = useState(null);
  const [committedPyeong, setCommittedPyeong] = useState(null);
  const [pyeongDrawerOpen, setPyeongDrawerOpen] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [snippets, setSnippets] = useState([]);
  const [status, setStatus] = useState(PYEONG_PHOTO_STATUS.NO_PYEONG_SELECTED);
  const [photoRowsLoading, setPhotoRowsLoading] = useState(false);
  const [photoUrlLoading, setPhotoUrlLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [notice, setNotice] = useState("");
  const [captionSaveStatus, setCaptionSaveStatus] = useState("idle");
  const [captionSaveMessage, setCaptionSaveMessage] = useState("");
  const mountedRef = useRef(true);
  const companyIdRef = useRef(companyId);
  const committedPyeongRef = useRef(null);
  const pendingPyeongRef = useRef(null);
  const photosRef = useRef([]);
  const loadRequestRef = useRef(0);
  const urlRequestRef = useRef(0);
  const backgroundRequestRef = useRef(0);
  const pendingCaptionsRef = useRef(new Map());
  const savePendingCaptionsRef = useRef(async () => true);
  const captionAutosaveRef = useRef(null);

  const friendlyError = (source, fallback) => (
    getFriendlyError?.(source, fallback) || source?.message || fallback
  );

  const setPhotosState = (nextValue) => {
    const next = typeof nextValue === "function" ? nextValue(photosRef.current) : nextValue;
    photosRef.current = next;
    setPhotos(next);
    return next;
  };

  if (!captionAutosaveRef.current) {
    captionAutosaveRef.current = createPhotoAutosave({
      save: () => savePendingCaptionsRef.current(),
      onChange: (snapshot) => {
        if (!mountedRef.current) return;
        setCaptionSaveStatus(snapshot.status);
        if (snapshot.status === "dirty") setCaptionSaveMessage("사진 설명을 자동 저장합니다.");
        if (snapshot.status === "saving") setCaptionSaveMessage("사진 설명 저장 중...");
        if (snapshot.status === "saved") setCaptionSaveMessage("사진 설명이 저장되었습니다.");
        if (snapshot.status === "error") setCaptionSaveMessage(snapshot.error || "사진 설명을 저장하지 못했습니다.");
      },
    });
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      loadRequestRef.current += 1;
      urlRequestRef.current += 1;
      backgroundRequestRef.current += 1;
      captionAutosaveRef.current?.clearTimer();
    };
  }, []);

  useEffect(() => {
    companyIdRef.current = companyId;
    loadRequestRef.current += 1;
    urlRequestRef.current += 1;
    backgroundRequestRef.current += 1;
    committedPyeongRef.current = null;
    pendingPyeongRef.current = null;
    pendingCaptionsRef.current.clear();
    setDraftPyeong("");
    setPendingPyeong(null);
    setCommittedPyeong(null);
    setPhotosState([]);
    setStatus(PYEONG_PHOTO_STATUS.NO_PYEONG_SELECTED);
    setPhotoRowsLoading(false);
    setPhotoUrlLoading(false);
    setError("");
    setPreviewError("");
    setPyeongDrawerOpen(true);

    if (!companyId) {
      setSnippets([]);
      return undefined;
    }

    let active = true;
    listPhotoCaptionSnippets(companyId)
      .then((rows) => { if (active && mountedRef.current) setSnippets(rows); })
      .catch((source) => {
        if (active && mountedRef.current) {
          setError(friendlyError(source, "자주 쓰는 설명을 불러오지 못했습니다."));
        }
      });
    return () => { active = false; };
  }, [companyId]);

  async function resolvePhotoPreviews(rows, pyeong, ownerRequestId) {
    if (!rows.length) {
      if (mountedRef.current && committedPyeongRef.current === pyeong) setPhotoUrlLoading(false);
      return;
    }
    const urlRequestId = ++urlRequestRef.current;
    setPhotoUrlLoading(true);
    setPreviewError("");
    try {
      const resolved = await resolvePyeongPhotoUrls(rows);
      if (
        !mountedRef.current
        || ownerRequestId !== loadRequestRef.current
        || urlRequestId !== urlRequestRef.current
        || committedPyeongRef.current !== pyeong
      ) return;
      setPhotosState(resolved);
    } catch (source) {
      if (
        mountedRef.current
        && ownerRequestId === loadRequestRef.current
        && urlRequestId === urlRequestRef.current
        && committedPyeongRef.current === pyeong
      ) setPreviewError(friendlyError(source, "일부 사진 미리보기를 불러오지 못했습니다."));
    } finally {
      if (
        mountedRef.current
        && ownerRequestId === loadRequestRef.current
        && urlRequestId === urlRequestRef.current
        && committedPyeongRef.current === pyeong
      ) setPhotoUrlLoading(false);
    }
  }

  async function selectPyeong(value) {
    const normalizedPyeong = normalizePositivePyeong(value);
    if (!normalizedPyeong) {
      setError("0보다 큰 평수를 선택해 주세요.");
      return false;
    }
    if (!companyId) return false;
    if (normalizedPyeong === committedPyeongRef.current && !pendingPyeongRef.current) {
      setDraftPyeong(`${normalizedPyeong}`);
      setPyeongDrawerOpen(false);
      return true;
    }

    const requestCompanyId = companyId;
    const requestId = ++loadRequestRef.current;
    urlRequestRef.current += 1;
    pendingPyeongRef.current = normalizedPyeong;
    setPendingPyeong(normalizedPyeong);
    setStatus(PYEONG_PHOTO_STATUS.PYEONG_LOADING);
    setPhotoRowsLoading(true);
    setPhotoUrlLoading(false);
    setError("");
    setPreviewError("");
    setNotice("");

    try {
      const rows = await listPyeongPhotoRows({ companyId: requestCompanyId, pyeong: normalizedPyeong });
      if (
        !mountedRef.current
        || requestId !== loadRequestRef.current
        || requestCompanyId !== companyIdRef.current
      ) return false;

      committedPyeongRef.current = normalizedPyeong;
      pendingPyeongRef.current = null;
      setCommittedPyeong(normalizedPyeong);
      setPendingPyeong(null);
      setDraftPyeong(`${normalizedPyeong}`);
      setPhotosState(rows);
      setStatus(getReadyStatus(rows));
      setPhotoRowsLoading(false);
      setPyeongDrawerOpen(false);
      void resolvePhotoPreviews(rows, normalizedPyeong, requestId);
      return true;
    } catch (source) {
      if (
        mountedRef.current
        && requestId === loadRequestRef.current
        && requestCompanyId === companyIdRef.current
      ) {
        pendingPyeongRef.current = null;
        setPendingPyeong(null);
        setPhotoRowsLoading(false);
        setStatus(PYEONG_PHOTO_STATUS.ERROR);
        setError(friendlyError(source, `${normalizedPyeong}평 사진을 불러오지 못했습니다.`));
      }
      return false;
    }
  }

  function openPyeongDrawer() {
    setDraftPyeong(committedPyeongRef.current ? `${committedPyeongRef.current}` : "");
    setPyeongDrawerOpen(true);
    setError("");
  }

  function canMutateCommittedContext() {
    return Boolean(
      companyIdRef.current
      && committedPyeongRef.current
      && !pendingPyeongRef.current
      && !photoRowsLoading
    );
  }

  async function reloadCommittedPhotos() {
    const pyeong = committedPyeongRef.current;
    const requestCompanyId = companyIdRef.current;
    if (!pyeong || !requestCompanyId || pendingPyeongRef.current) return false;
    const requestId = ++backgroundRequestRef.current;
    try {
      const rows = await listPyeongPhotoRows({ companyId: requestCompanyId, pyeong });
      if (
        !mountedRef.current
        || requestId !== backgroundRequestRef.current
        || requestCompanyId !== companyIdRef.current
        || pyeong !== committedPyeongRef.current
        || pendingPyeongRef.current
      ) return false;
      setPhotosState(rows);
      setStatus(getReadyStatus(rows));
      if (rows.length) setPhotoUrlLoading(true);
      const resolved = rows.length ? await resolvePyeongPhotoUrls(rows) : rows;
      if (
        !mountedRef.current
        || requestId !== backgroundRequestRef.current
        || requestCompanyId !== companyIdRef.current
        || pyeong !== committedPyeongRef.current
        || pendingPyeongRef.current
      ) return false;
      setPhotosState(resolved);
      setPhotoUrlLoading(false);
      return true;
    } catch {
      if (
        mountedRef.current
        && requestId === backgroundRequestRef.current
        && requestCompanyId === companyIdRef.current
        && pyeong === committedPyeongRef.current
      ) setPhotoUrlLoading(false);
      return false;
    }
  }

  async function uploadPhotos({ constructionSubitemId, files, sashCatalogEntryId = null }) {
    const fileRows = Array.from(files ?? []);
    const scopePyeong = committedPyeongRef.current;
    if (!canMutateCommittedContext() || !constructionSubitemId || !fileRows.length) {
      setError("평형을 먼저 확정한 뒤 사진을 추가해 주세요.");
      return false;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const scopeCompanyId = companyIdRef.current;
    const uploaded = [];
    const attemptedPhotoIds = [];
    try {
      const currentCount = photosRef.current.filter((photo) => (
        photo.constructionSubitemId === constructionSubitemId
        && photo.sashCatalogEntryId === sashCatalogEntryId
      )).length;
      for (const [index, file] of fileRows.entries()) {
        if (!canMutateCommittedContext() || committedPyeongRef.current !== scopePyeong) {
          throw new Error("사진 업로드 중 평형 범위가 변경되었습니다.");
        }
        const photoId = createPhotoId();
        attemptedPhotoIds.push(photoId);
        uploaded.push(await uploadPyeongSubitemPhoto({
          companyId: scopeCompanyId,
          photoId,
          file,
          pyeong: scopePyeong,
          constructionSubitemId,
          sashCatalogEntryId,
          existingCount: currentCount + index,
        }));
      }
      if (!canMutateCommittedContext() || committedPyeongRef.current !== scopePyeong) {
        throw new Error("사진 업로드 중 평형 범위가 변경되었습니다.");
      }
      const next = setPhotosState((current) => [...current, ...uploaded]);
      setStatus(getReadyStatus(next));
      setNotice(`${uploaded.length}장의 사진을 추가했습니다.`);
      return true;
    } catch (source) {
      const uploadError = source instanceof Error
        ? source
        : new Error(String(source ?? "Photo upload failed"));
      if (attemptedPhotoIds.length) {
        try {
          // Storage and Postgres cannot share one transaction. Newly-created
          // or commit-uncertain rows are archived as one compensating DB
          // transaction; their objects remain recoverable and invisible to
          // active queries. Missing IDs are safe when Storage failed first.
          await compensatePhotoUploadBatchAtomic({
            companyId: scopeCompanyId,
            photoIds: attemptedPhotoIds,
          });
        } catch (cleanupError) {
          uploadError.cleanupError = cleanupError;
        }
      }
      setError(friendlyError(uploadError, "사진을 업로드하지 못했습니다."));
      await reloadCommittedPhotos();
      return false;
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  savePendingCaptionsRef.current = async () => {
    if (!canMutateCommittedContext()) throw new Error("평형 변경이 끝난 뒤 다시 시도해 주세요.");
    const scopePyeong = committedPyeongRef.current;
    const pending = [...pendingCaptionsRef.current.entries()].filter(([photoId]) => (
      photosRef.current.some((photo) => photo.id === photoId && photo.pyeong === scopePyeong)
    ));
    if (!pending.length) return true;
    pendingCaptionsRef.current.clear();
    try {
      const savedRows = await updatePhotoDescriptionsAtomic({
        companyId: companyIdRef.current,
        updates: pending.map(([photoId, description]) => ({ photoId, description })),
      });
      if (committedPyeongRef.current !== scopePyeong || pendingPyeongRef.current) return false;
      const savedById = new Map(savedRows.map((photo) => [photo.id, photo]));
      setPhotosState((current) => current.map((photo) => {
        const saved = savedById.get(photo.id);
        return saved ? { ...photo, ...saved, signedUrl: photo.signedUrl } : photo;
      }));
      return true;
    } catch (source) {
      pending.forEach(([photoId, description]) => pendingCaptionsRef.current.set(photoId, description));
      setError(friendlyError(source, "사진 설명을 저장하지 못했습니다."));
      throw source;
    }
  };

  function changeCaption(photoId, value) {
    if (!canMutateCommittedContext()) return false;
    const photo = photosRef.current.find((entry) => entry.id === photoId);
    if (!photo || photo.pyeong !== committedPyeongRef.current) return false;
    setPhotosState((current) => current.map((entry) => (
      entry.id === photoId ? { ...entry, caption: value, description: value } : entry
    )));
    pendingCaptionsRef.current.set(photoId, value);
    captionAutosaveRef.current.markDirty(PYEONG_CAPTION_AUTOSAVE_TARGET);
    return true;
  }

  async function flushCaption(photoId) {
    if (!pendingCaptionsRef.current.has(photoId)) return true;
    return captionAutosaveRef.current.run(PYEONG_CAPTION_AUTOSAVE_TARGET);
  }

  async function reorderPhotos(constructionSubitemId, draggedId, dropId) {
    if (!canMutateCommittedContext()) return false;
    const scopePyeong = committedPyeongRef.current;
    const scoped = photosRef.current.filter((photo) => photo.constructionSubitemId === constructionSubitemId);
    const reordered = reorderRowsById(scoped, draggedId, dropId);
    if (reordered.map((photo) => photo.id).join("|") === scoped.map((photo) => photo.id).join("|")) return false;
    setPhotosState((current) => [
      ...current.filter((photo) => photo.constructionSubitemId !== constructionSubitemId),
      ...reordered.map((photo, sortOrder) => ({ ...photo, sortOrder })),
    ]);
    try {
      await reorderPhotoV2Rows({ companyId: companyIdRef.current, photos: reordered });
      return committedPyeongRef.current === scopePyeong && !pendingPyeongRef.current;
    } catch (source) {
      setError(friendlyError(source, "사진 순서를 저장하지 못했습니다."));
      await reloadCommittedPhotos();
      return false;
    }
  }

  async function archivePhoto(photoId) {
    if (!canMutateCommittedContext()) return false;
    const photo = photosRef.current.find((entry) => entry.id === photoId);
    if (!photo || photo.pyeong !== committedPyeongRef.current) return false;
    setSaving(true);
    setError("");
    try {
      await archivePhotoV2({ companyId: companyIdRef.current, photoId });
      const next = setPhotosState((current) => current.filter((entry) => entry.id !== photoId));
      setStatus(getReadyStatus(next));
      setNotice("사진을 보관했습니다.");
      return true;
    } catch (source) {
      setError(friendlyError(source, "사진을 보관하지 못했습니다."));
      return false;
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  async function addSnippet(content) {
    const normalized = `${content ?? ""}`.trim();
    if (!normalized) return false;
    try {
      const snippet = await createPhotoCaptionSnippet({
        companyId: companyIdRef.current,
        snippetId: createPhotoId(),
        content: normalized,
        sortOrder: snippets.length,
      });
      setSnippets((current) => [...current, snippet]);
      return snippet;
    } catch (source) {
      setError(friendlyError(source, "자주 쓰는 설명을 추가하지 못했습니다."));
      return false;
    }
  }

  async function editSnippet(snippetId, content) {
    try {
      const saved = await updatePhotoCaptionSnippet({ companyId: companyIdRef.current, snippetId, content });
      setSnippets((current) => current.map((snippet) => snippet.id === snippetId ? saved : snippet));
      return true;
    } catch (source) {
      setError(friendlyError(source, "자주 쓰는 설명을 수정하지 못했습니다."));
      return false;
    }
  }

  async function archiveSnippet(snippetId) {
    try {
      await archivePhotoCaptionSnippet({ companyId: companyIdRef.current, snippetId });
      setSnippets((current) => current.filter((snippet) => snippet.id !== snippetId));
      return true;
    } catch (source) {
      setError(friendlyError(source, "자주 쓰는 설명을 보관하지 못했습니다."));
      return false;
    }
  }

  async function reorderSnippets(draggedId, dropId) {
    const reordered = reorderRowsById(snippets, draggedId, dropId);
    if (reordered.map((snippet) => snippet.id).join("|") === snippets.map((snippet) => snippet.id).join("|")) return false;
    setSnippets(reordered.map((snippet, sortOrder) => ({ ...snippet, sortOrder })));
    try {
      await reorderPhotoCaptionSnippets({ companyId: companyIdRef.current, snippets: reordered });
      return true;
    } catch (source) {
      setError(friendlyError(source, "자주 쓰는 설명 순서를 저장하지 못했습니다."));
      setSnippets(snippets);
      return false;
    }
  }

  const canEdit = Boolean(committedPyeong && !pendingPyeong && !photoRowsLoading);

  return {
    draftPyeong,
    setDraftPyeong,
    pendingPyeong,
    committedPyeong,
    pyeongDrawerOpen,
    setPyeongDrawerOpen,
    photos,
    snippets,
    status,
    photoRowsLoading,
    photoUrlLoading,
    canEdit,
    saving,
    error,
    setError,
    previewError,
    notice,
    captionSaveStatus,
    captionSaveMessage,
    selectPyeong,
    openPyeongDrawer,
    uploadPhotos,
    changeCaption,
    flushCaption,
    reorderPhotos,
    archivePhoto,
    addSnippet,
    editSnippet,
    archiveSnippet,
    reorderSnippets,
  };
}
