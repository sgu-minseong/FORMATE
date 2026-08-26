import { useState } from "react";
import { addDaysToDateInput, getTodayDateInput } from "../../shared/utils/dates";

export function useEstimateDraft() {
  const [condition, setCondition] = useState({
    size: "",
    buildType: "",
    powderRoom: false,
    dressRoom: false,
    expanded: false,
    conditionVariant: "",
    expansionSpaces: [],
    occupancy: "",
  });
  const [items, setItems] = useState({});
  const [activeCategories, setActiveCategories] = useState([]);
  const [openCategory, setOpenCategory] = useState("");
  const [newMaterialName, setNewMaterialName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [estimatePyeong, setEstimatePyeong] = useState("");
  const [estimateAdjustments, setEstimateAdjustments] = useState([]);
  const [siteMemo, setSiteMemo] = useState("");
  const [estimateVatStatus, setEstimateVatStatus] = useState("부가세 별도");
  const [estimateIssuedAt, setEstimateIssuedAt] = useState(getTodayDateInput);
  const [estimateValidUntil, setEstimateValidUntil] = useState(() => addDaysToDateInput(getTodayDateInput(), 30));
  const [estimateConditionVariantLabels, setEstimateConditionVariantLabels] = useState({});
  const [conditionLabelEditOpen, setConditionLabelEditOpen] = useState(false);
  const [conditionLabelDrafts, setConditionLabelDrafts] = useState({});
  const [previewBackPage, setPreviewBackPage] = useState("items");
  const [estimatePreviewType, setEstimatePreviewType] = useState("general");
  const [estimateCatalog, setEstimateCatalog] = useState([]);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateSaving, setEstimateSaving] = useState(false);
  const [estimateAutoSaveStatus, setEstimateAutoSaveStatus] = useState("idle");
  const [estimateAutoSaveError, setEstimateAutoSaveError] = useState("");
  const [estimateError, setEstimateError] = useState("");
  const [estimateNotice, setEstimateNotice] = useState("");
  const [estimateDraftSource, setEstimateDraftSource] = useState("template");
  const [estimateConditionEditMode, setEstimateConditionEditMode] = useState(false);
  const [estimateConditionDrawerOpen, setEstimateConditionDrawerOpen] = useState(false);
  const [estimateTemplateConflicts, setEstimateTemplateConflicts] = useState([]);
  const [estimateTemplateConditionKey, setEstimateTemplateConditionKey] = useState("");
  const [selectedPhotoSubitemId, setSelectedPhotoSubitemId] = useState("");
  const [selectedPhotoSubitemName, setSelectedPhotoSubitemName] = useState("");
  const [estimateItemPhotos, setEstimateItemPhotos] = useState([]);
  const [isLoadingEstimateItemPhotos, setIsLoadingEstimateItemPhotos] = useState(false);
  const [estimateItemPhotosError, setEstimateItemPhotosError] = useState("");

  return {
    condition, setCondition,
    items, setItems,
    activeCategories, setActiveCategories,
    openCategory, setOpenCategory,
    newMaterialName, setNewMaterialName,
    customerName, setCustomerName,
    customerPhone, setCustomerPhone,
    address, setAddress,
    workDate, setWorkDate,
    estimatePyeong, setEstimatePyeong,
    estimateAdjustments, setEstimateAdjustments,
    siteMemo, setSiteMemo,
    estimateVatStatus, setEstimateVatStatus,
    estimateIssuedAt, setEstimateIssuedAt,
    estimateValidUntil, setEstimateValidUntil,
    estimateConditionVariantLabels, setEstimateConditionVariantLabels,
    conditionLabelEditOpen, setConditionLabelEditOpen,
    conditionLabelDrafts, setConditionLabelDrafts,
    previewBackPage, setPreviewBackPage,
    estimatePreviewType, setEstimatePreviewType,
    estimateCatalog, setEstimateCatalog,
    estimateLoading, setEstimateLoading,
    estimateSaving, setEstimateSaving,
    estimateAutoSaveStatus, setEstimateAutoSaveStatus,
    estimateAutoSaveError, setEstimateAutoSaveError,
    estimateError, setEstimateError,
    estimateNotice, setEstimateNotice,
    estimateDraftSource, setEstimateDraftSource,
    estimateConditionEditMode, setEstimateConditionEditMode,
    estimateConditionDrawerOpen, setEstimateConditionDrawerOpen,
    estimateTemplateConflicts, setEstimateTemplateConflicts,
    estimateTemplateConditionKey, setEstimateTemplateConditionKey,
    selectedPhotoSubitemId, setSelectedPhotoSubitemId,
    selectedPhotoSubitemName, setSelectedPhotoSubitemName,
    estimateItemPhotos, setEstimateItemPhotos,
    isLoadingEstimateItemPhotos, setIsLoadingEstimateItemPhotos,
    estimateItemPhotosError, setEstimateItemPhotosError,
  };
}
