import { useEffect, useMemo, useRef, useState } from "react";
import { createPriceTableAutosave } from "./priceTableAutosave";

export default function usePriceTableController({
  page,
  adminConditionStep,
  isCatalogEditing,
  canSelectCategory,
  onAutoSave,
}) {
  const [adminItems, setAdminItems] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminNotice, setAdminNotice] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [adminFavoriteOnly, setAdminFavoriteOnly] = useState(false);
  const [expandedAdminItemIds, setExpandedAdminItemIds] = useState([]);
  const [selectedAdminCategoryId, setSelectedAdminCategoryId] = useState("");
  const [adminCommonPriceSavedAt, setAdminCommonPriceSavedAt] = useState("");
  const [adminBulkInputs, setAdminBulkInputs] = useState({});
  const [activeFlooringThicknessByGroup, setActiveFlooringThicknessByGroup] =
    useState({});
  const [activeSpecOptionsPopoverId, setActiveSpecOptionsPopoverId] =
    useState("");
  const [newlyAddedSubitemId, setNewlyAddedSubitemId] = useState("");
  const [adminPriceValidationError, setAdminPriceValidationError] =
    useState(null);
  const [dragItemId, setDragItemId] = useState("");
  const [dragOverItemId, setDragOverItemId] = useState("");
  const [dragSubitem, setDragSubitem] = useState(null);
  const [dragOverSubitem, setDragOverSubitem] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState("idle");
  const [autoSaveTarget, setAutoSaveTarget] = useState("");
  const [autoSaveSavedAt, setAutoSaveSavedAt] = useState("");
  const [autoSaveError, setAutoSaveError] = useState("");
  const [adminUnsavedLeaveOpen, setAdminUnsavedLeaveOpen] = useState(false);
  const [adminUnsavedLeaveSaving, setAdminUnsavedLeaveSaving] = useState(false);
  const [adminUnsavedLeaveError, setAdminUnsavedLeaveError] = useState("");

  const pageRef = useRef(page);
  const adminConditionStepRef = useRef(adminConditionStep);
  const onAutoSaveRef = useRef(onAutoSave);
  const adminItemsRef = useRef(adminItems);
  const adminPriceRowRefs = useRef(new Map());
  const pendingAdminLeaveActionRef = useRef(null);
  const autoSaveRunningRef = useRef(false);
  const autoSaveQueuedRef = useRef(false);
  const autoSaveTargetRef = useRef("");

  pageRef.current = page;
  adminConditionStepRef.current = adminConditionStep;
  onAutoSaveRef.current = onAutoSave;
  adminItemsRef.current = adminItems;

  const autosaveRef = useRef(null);
  if (!autosaveRef.current) {
    autosaveRef.current = createPriceTableAutosave({
      save: (target) => onAutoSaveRef.current(target),
      onChange: (snapshot) => {
        autoSaveRunningRef.current = snapshot.running;
        autoSaveQueuedRef.current = snapshot.queued;
        autoSaveTargetRef.current = snapshot.target;
        setAutoSaveStatus(snapshot.status);
        setAutoSaveTarget(snapshot.target);
        setAutoSaveSavedAt(snapshot.savedAt);
        setAutoSaveError(snapshot.error);
      },
    });
  }

  const adminSearchTerm = adminSearch.trim().toLowerCase();
  const filteredAdminItems = useMemo(() => {
    return adminItems.filter((item) => {
      if (adminFavoriteOnly && !item.is_favorite) return false;
      if (!adminSearchTerm) return true;
      const itemMatches = item.name.toLowerCase().includes(adminSearchTerm);
      const subitemMatches = (item.subitems ?? []).some((subitem) =>
        subitem.name.toLowerCase().includes(adminSearchTerm)
      );
      return itemMatches || subitemMatches;
    });
  }, [adminFavoriteOnly, adminItems, adminSearchTerm]);

  useEffect(() => {
    if (!canSelectCategory) return;

    const firstVisibleItemId = filteredAdminItems[0]?.id ?? "";
    if (!firstVisibleItemId) {
      if (selectedAdminCategoryId) setSelectedAdminCategoryId("");
      return;
    }

    const selectedItemVisible = filteredAdminItems.some(
      (item) => item.id === selectedAdminCategoryId
    );
    if (!selectedItemVisible) {
      setSelectedAdminCategoryId(firstVisibleItemId);
    }
  }, [
    canSelectCategory,
    filteredAdminItems,
    selectedAdminCategoryId,
  ]);

  useEffect(() => {
    if (isCatalogEditing) return;
    autosaveRef.current.reset();
    pendingAdminLeaveActionRef.current = null;
    setAdminUnsavedLeaveOpen(false);
    setAdminUnsavedLeaveError("");
  }, [isCatalogEditing]);

  const hasUnsavedAdminCatalogChanges =
    isCatalogEditing
    && ["dirty", "saving", "error"].includes(autoSaveStatus);

  useEffect(() => {
    if (!hasUnsavedAdminCatalogChanges) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedAdminCatalogChanges]);

  function getCurrentAutoSaveTarget() {
    if (pageRef.current === "admin-prices") return "prices";
    if (
      pageRef.current === "admin-items"
      && adminConditionStepRef.current === "edit"
    ) {
      return "quantities";
    }
    return "";
  }

  function normalizeAdminSaveTarget(requestedTarget = "") {
    const pageTarget = getCurrentAutoSaveTarget();
    if (pageTarget) return pageTarget;
    return requestedTarget === "prices" || requestedTarget === "quantities"
      ? requestedTarget
      : "";
  }

  function markAdminCatalogDirty(target = getCurrentAutoSaveTarget()) {
    const saveTarget = normalizeAdminSaveTarget(target);
    if (!saveTarget) return;
    autosaveRef.current.markDirty(saveTarget);
  }

  function runAdminAutoSave(target = autoSaveTargetRef.current) {
    const saveTarget = normalizeAdminSaveTarget(target);
    if (!saveTarget) return Promise.resolve(false);
    return autosaveRef.current.run(saveTarget);
  }

  function clearAutoSaveTimer() {
    autosaveRef.current.clearTimer();
  }

  function markAdminCatalogSavedNow(target = getCurrentAutoSaveTarget()) {
    const saveTarget = normalizeAdminSaveTarget(target);
    autosaveRef.current.markSaved(saveTarget);
    setAdminPriceValidationError(null);
  }

  function markAdminCatalogSaving(target = getCurrentAutoSaveTarget()) {
    const saveTarget = normalizeAdminSaveTarget(target);
    autosaveRef.current.markSaving(saveTarget);
  }

  function markAdminCatalogError(error, target = getCurrentAutoSaveTarget()) {
    const saveTarget = normalizeAdminSaveTarget(target);
    autosaveRef.current.markError(error, saveTarget);
  }

  function resetAdminAutoSave() {
    autosaveRef.current.reset();
  }

  function getAutoSaveStatusLabel() {
    if (autoSaveStatus === "dirty") return "변경사항 있음";
    if (autoSaveStatus === "saving") return "자동 저장 중...";
    if (autoSaveStatus === "error") return "자동 저장 실패";
    if (autoSaveStatus === "saved" && autoSaveSavedAt) {
      const savedDate = new Date(autoSaveSavedAt);
      const savedTime = Number.isNaN(savedDate.getTime())
        ? ""
        : savedDate.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          });
      return savedTime ? `자동 저장됨 · ${savedTime}` : "자동 저장됨";
    }
    return "자동 저장 대기";
  }

  function setAdminPriceRowRef(subitemId, node) {
    if (!subitemId) return;
    if (node) {
      adminPriceRowRefs.current.set(subitemId, node);
    } else {
      adminPriceRowRefs.current.delete(subitemId);
    }
  }

  function scrollToAdminPriceRow(subitemId) {
    if (!subitemId) return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        adminPriceRowRefs.current.get(subitemId)?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      });
    });
  }

  return {
    activeFlooringThicknessByGroup,
    activeSpecOptionsPopoverId,
    adminBulkInputs,
    adminCommonPriceSavedAt,
    adminError,
    adminFavoriteOnly,
    adminItems,
    adminItemsRef,
    adminLoading,
    adminNotice,
    adminPriceValidationError,
    adminSaving,
    adminSearch,
    adminSearchTerm,
    adminUnsavedLeaveError,
    adminUnsavedLeaveOpen,
    adminUnsavedLeaveSaving,
    autoSaveError,
    autoSaveQueuedRef,
    autoSaveRunningRef,
    autoSaveSavedAt,
    autoSaveStatus,
    autoSaveTarget,
    autoSaveTargetRef,
    clearAutoSaveTimer,
    dragItemId,
    dragOverItemId,
    dragOverSubitem,
    dragSubitem,
    expandedAdminItemIds,
    filteredAdminItems,
    getAutoSaveStatusLabel,
    getCurrentAutoSaveTarget,
    hasUnsavedAdminCatalogChanges,
    markAdminCatalogDirty,
    markAdminCatalogError,
    markAdminCatalogSavedNow,
    markAdminCatalogSaving,
    newlyAddedSubitemId,
    normalizeAdminSaveTarget,
    pendingAdminLeaveActionRef,
    resetAdminAutoSave,
    runAdminAutoSave,
    scrollToAdminPriceRow,
    selectedAdminCategoryId,
    setActiveFlooringThicknessByGroup,
    setActiveSpecOptionsPopoverId,
    setAdminBulkInputs,
    setAdminCommonPriceSavedAt,
    setAdminError,
    setAdminFavoriteOnly,
    setAdminItems,
    setAdminLoading,
    setAdminNotice,
    setAdminPriceRowRef,
    setAdminPriceValidationError,
    setAdminSaving,
    setAdminSearch,
    setAdminUnsavedLeaveError,
    setAdminUnsavedLeaveOpen,
    setAdminUnsavedLeaveSaving,
    setAutoSaveError,
    setAutoSaveSavedAt,
    setAutoSaveStatus,
    setAutoSaveTarget,
    setDragItemId,
    setDragOverItemId,
    setDragOverSubitem,
    setDragSubitem,
    setExpandedAdminItemIds,
    setNewlyAddedSubitemId,
    setSelectedAdminCategoryId,
  };
}
