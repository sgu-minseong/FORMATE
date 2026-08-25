import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Calculator,
  Check,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  HelpCircle,
  Home,
  Image,
  MessageSquare,
  Pin,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  SlidersHorizontal,
  Upload,
  TriangleAlert,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import {
  isAdminVerifiedForCompany,
  isAuthBackendConfigured as isSupabaseConfigured,
  isValidUuid,
  normalizeCompanyCode,
  reauthenticateCompany,
  writeAdminVerifiedCompany,
} from "./authApi";
import { useAppSession } from "./useAppSession";
import PriceText from "../components/PriceText.jsx";
import PhotoViewer from "../components/PhotoViewer.jsx";
import PyeongSelector from "../components/PyeongSelector.jsx";
import AppShell from "../components/layout/AppShell.jsx";
import Button from "../components/ui/Button.jsx";
import CategorySidebar from "../components/ui/CategorySidebar.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Input from "../components/ui/Input.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import StickyTotalBar from "../components/ui/StickyTotalBar.jsx";
import Table from "../components/ui/Table.jsx";
import logoUrl from "../assets/formate-logo-icon.png";
import { AI_MAPPING_GROUPS, AI_MAPPING_SELECT_OPTIONS, AI_ROW_TYPE_OPTIONS } from "../features/aiExcelImport/constants";
import {
  getAiRowTypeLabel,
  getAiDisplayMatchStatus,
  getAiRowTypeGuidance,
  getAiDisplayMatchStatusLabel,
  isAiWorkItemRow,
  getAiCatalogMappingUnavailableMessage,
  getAiActionOptionsForRowType,
  getAiActionSelectValue,
  getAiActionLabel,
  getAiRecommendationActionLabel,
} from "../features/aiExcelImport/display";
import {
  formatExcelCellValue,
  getExcelColumnLabel,
  analyzeExcelSheetForFormate,
  getExcelMappingSelectValue,
  applyExcelMappingOption,
  createManualExcelMappings,
  summarizeExcelHeaderRow,
  createExcelMappingAnalysisFromManual,
  getExcelDuplicateMappingWarnings,
  createExcelPreviewColumns,
} from "../features/aiExcelImport/excelMapping";
import {
  PYEONG_OPTIONS,
} from "../shared/constants/estimateOptions";
import {
  EXTENDED_VARIANTS,
  OLD_EXTENDED_VARIANTS,
  OLD_NO_EXTENSION_VARIANT,
  CONDITION_VARIANT_KEYS,
} from "../shared/constants/conditionVariants";
import { DEFAULT_CONSTRUCTION_CATALOG } from "../shared/constants/defaultConstructionCatalog";
import {
  toNumberOrZero,
  toNullableNumber,
  toNonNegativeNumberOrZero,
  hasNumericInput,
  stripNumberInputFormatting,
  formatMoneyInputValue,
  isEmptyOrZeroDisplayValue,
} from "../shared/utils/numbers";
import {
  getTodayDateInput,
  getDateInputFromValue,
  addDaysToDateInput,
  formatDisplayDate,
  formatDisplayDateTime,
  formatRecentSaveTime,
} from "../shared/utils/dates";
import AftercareServicePage from "../features/customerOperations/AftercareServicePage";
import CustomerRequestsPage from "../features/customerOperations/CustomerRequestsPage";
import CustomersProjectsPage from "../features/customerOperations/CustomersProjectsPage";
import HomeOperationsOverview from "../features/customerOperations/HomeOperationsOverview";
import ShareEstimateModal from "../features/customerOperations/ShareEstimateModal";
import { StatusText } from "../features/customerOperations/components";
import { CUSTOMER_OPERATIONS_PAGES } from "../features/customerOperations/constants";
import {
  getEstimateShareAction,
  isOperationalEstimate,
  operationStatusViews,
} from "../features/customerOperations/utils";
import DeleteSavedEstimateDialog from "../features/estimates/DeleteSavedEstimateDialog";
import {
  fetchEstimateConstructionCatalogRows,
  fetchSavedEstimateLists,
  saveEstimateDraft,
  saveEstimateDraftWithTemplate,
  moveSavedEstimateToTrash,
  restoreSavedEstimate,
  SAVED_ESTIMATE_RESTORE_RESULT,
  SAVED_ESTIMATE_TRASH_RESULT,
} from "../features/estimates/estimateApi";
import {
  buildSelectedEstimateRows,
  buildEstimateDraftRows,
  buildEstimateSummary,
  calculateEstimateRow,
  cleanEstimateAdjustments as getCleanEstimateAdjustments,
  getAdjustmentAmount,
  getAdjustmentSignedAmount,
  getEstimateItemsDataAdjustments,
  getEstimateItemsDataConstructionDaysTotal,
  getEstimateItemsDataItems,
  getEstimateItemsDataMeta,
  getEstimateItemsDataSiteMemo,
  getTemporaryTaxAmount,
  isEstimateRowModified,
  toConstructionDays,
} from "../features/estimates/calculation";
import {
  applyEstimateRowPatch,
  buildEstimateItemsFromTemplate,
  getEstimateRowSpecChoices,
  getEstimateRowSpecChoiceValue,
  getEstimateRowSpecPatchFromChoice,
} from "../features/estimates/estimateItemModel";
import {
  buildConditionSnapshot,
  buildEstimateInsertPayload,
  buildEstimateItemsData,
  restoreEstimateDraft,
} from "../features/estimates/snapshot";
import { exportEstimatePdf } from "../features/estimates/exportEstimatePdf";
import { useEstimateDraft } from "../features/estimates/useEstimateDraft";
import {
  ESTIMATE_TEMPLATE_DERIVED_FIELDS,
  getEstimateDraftRowKeys,
  reconcileEstimateDraftItems,
} from "../features/estimates/estimateDraftReconciliation";
import {
  applyEstimateConditionChange as runEstimateConditionChange,
  createEstimatePyeongChange,
} from "../features/estimates/estimateConditionChange";
import {
  getLegacyEstimateHistorySpecLabel,
} from "../features/estimates/estimateHistoryCompatibility";
import EstimateEditorPage from "../features/estimates/EstimateEditorPage";
import EstimatePreviewPage from "../features/estimates/EstimatePreviewPage";
import SavedEstimatesPage from "../features/estimates/SavedEstimatesPage";
import PhotoManagementPage from "../features/photoManagement/PhotoManagementPage";
import { usePhotoManagement } from "../features/photoManagement/usePhotoManagement";
import { listPyeongSubitemPhotos } from "../features/photoManagement/photoApi";
import { getPhotoImageUrl } from "../features/photoManagement/photoModel";
import DetailCostsPage from "../features/detailCosts/DetailCostsPage";
import { useDetailCosts } from "../features/detailCosts/useDetailCosts";
import { buildAiRecommendationRequest, requestAiRecommendations } from "../features/aiSetup/aiSetupApi";
import {
  createEmptyAiSetupApplyCondition,
  createEmptyAiSetupConditionTouched,
  useAiSetup,
} from "../features/aiSetup/useAiSetup";
import { isSupportedAiSetupExcelFile, parseAiSetupWorkbook } from "../features/aiSetup/aiSetupExcel";
import { exportFormateExcel } from "../features/excelImport/excelExport";
import {
  EXCEL_IMPORT_MODES,
  EXCEL_IMPORT_TARGETS,
  LUMP_SUM_CATEGORY_NAME,
  LUMP_SUM_ITEM_TYPE,
  buildCanonicalExcelCatalogItems,
  buildImportSubitemName,
  buildLumpSumExclusionPatches,
  createScopedExcelImportContext,
  findCatalogCopyMatch,
  findCatalogMatchByStableIds,
  getCopyImportDefaultAction,
  getImportReviewStatus,
  getLumpSumSourceTotal,
  hasExcelImportWriteTargets,
  isLumpSumImportRow,
  prepareExcelImportRowsForCompany,
  readFormateWorkbookMetadata,
  resolveLegacyExcelImportRoute,
  shouldApplyExcelConflict,
} from "../features/excelImport/excelImportModel";
import ContractEditorPage from "../features/contracts/ContractEditorPage";
import {
  archiveCanonicalConstructionSubitem,
  archiveCanonicalVariantGroup,
  createCanonicalVariantProductAtomic,
  fetchCanonicalConstructionCatalogRows,
  fetchConstructionCatalogRows,
  insertCanonicalVariantSubitem,
  updateCanonicalConstructionSubitem,
  updateCanonicalVariantGroup,
} from "../features/constructionCatalog/constructionCatalogApi";
import {
  CONSTRUCTION_PRODUCT_KINDS,
  buildCanonicalConstructionCatalog,
  buildCanonicalConstructionProductModel,
  buildConstructionVariantGroupWritePayload,
  buildConstructionVariantMetadataWritePayload,
  buildConstructionVariantSubitemInsertPayload,
} from "../features/constructionCatalog/constructionCatalogModel";
import CanonicalVariantSelect from "../features/constructionCatalog/CanonicalVariantSelect";
import {
  CONSTRUCTION_ITEM_RENDERER_KINDS,
  buildAdminTemplateValueAtomicWrites,
  buildConstructionItemSavePayload,
  buildConstructionSubitemInsertPayload,
  buildConstructionSubitemSavePayload,
  countVerifiedImportRows,
  getConstructionItemRendererKind,
  getLaborRateEmptyValue,
  getLaborRateOccupiedValue,
  filterAdminProductRows,
  getAdminProductSelectedSubitemId,
  isEmptyLocalPriceTableSubitemPlaceholder as isEmptyLocalAdminSubitemPlaceholder,
  isLocalPriceTableSubitem as isLocalSubitemId,
  loadAdminCatalogSnapshot,
  normalizeAdminItems,
  patchSubitemPriceById,
  reconcileInsertedSubitems,
  normalizeUnitOptionValue,
  reconcileAdminProductSelections,
  resolveAdminProductSubitem,
} from "../features/priceTable/priceTableModel";
import usePriceTableController from "../features/priceTable/usePriceTableController";
import PriceTablePage from "../features/priceTable/PriceTablePage";
import AdminCategoryPanel from "../features/priceTable/AdminCategoryPanel";
import AdminCatalogTableSkeleton from "../features/priceTable/AdminCatalogTableSkeleton";
import TemplateConditionSwitcher from "../features/priceTable/TemplateConditionSwitcher";
import {
  addRecentTemplateCondition,
  readTemplateConditionPreferences,
  toggleFavoriteTemplateCondition,
  writeLastSelectedTemplateCondition,
  writeTemplateConditionFavorites,
  writeTemplateConditionRecent,
} from "../features/priceTable/templateConditionPreferences";
import SashCatalogSection from "../features/sash/SashCatalogSection";
import SashEstimateEditor from "../features/sash/SashEstimateEditor";
import { fetchSashUsageRankingContext } from "../features/sash/sashUsageRankingApi";
import {
  getSashSpecLabel,
  isSashItem,
  isSashEstimateSpecPricingConfirmed,
} from "../features/sash/sashCatalogModel";
import {
  deleteAdminTemplate,
  deleteConstructionItem,
  fetchAdminTemplateCandidates,
  fetchAdminTemplateRows,
  fetchAdminTemplateValues,
  fetchConditionVariantLabelRows,
  insertConstructionItem,
  createStandardCatalogEntriesAtomic,
  initializeDefaultConstructionCatalogAtomic,
  reorderAdminCatalogAtomic,
  saveAdminCatalogAtomic,
  saveAdminTemplateAtomic,
  updateConstructionItem,
  upsertConditionVariantLabelRows,
  upsertSubitemPyeongValues,
} from "../features/priceTable/priceTableApi";
import "../features/customerOperations/customerOperations.css";
import appStyles from "../styles/appStyles";
import {
  canMoveInternalPageHistory,
  createInternalPageHistory,
  getCurrentInternalPage,
  moveInternalPageHistory,
  pushInternalPage,
} from "../shared/navigation/internalPageHistory";

const pageFromHash = () => {
  const page = resolveLegacyExcelImportRoute(window.location.hash.replace("#", ""));
  if (page === "message-history") {
    return CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS;
  }
  return [
    "landing",
    "condition",
    "photo-management",
    "admin",
    "admin-prices",
    "admin-items",
    "admin-condition-labels",
    ...Object.values(CUSTOMER_OPERATIONS_PAGES),
  ].includes(page) ? page : "landing";
};

const PROTECTED_ADMIN_PAGES = ["admin", "admin-prices", "admin-items", "admin-condition-labels", "admin-detail-costs"];
const APP_SHELL_NAV_ITEMS = [
  {
    key: "home-work",
    type: "section",
    label: "홈",
    items: [
      { key: "landing", label: "홈", icon: <Home /> },
    ],
  },
  {
    key: "operations-work",
    type: "section",
    label: "업무",
    items: [
      { key: CUSTOMER_OPERATIONS_PAGES.REQUESTS, label: "받은 요청", icon: <MessageSquare /> },
      { key: CUSTOMER_OPERATIONS_PAGES.AFTERCARE_SERVICE, label: "사후관리·A/S", icon: <SlidersHorizontal /> },
    ],
  },
  {
    key: "estimate-project-work",
    type: "section",
    label: "견적·현장",
    items: [
      { key: "condition", label: "새 견적서 작성", icon: <ClipboardList />, activeKeys: ["condition", "items"] },
      { key: "admin-estimates", label: "저장 견적 보기", icon: <FileText /> },
      { key: CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS, label: "고객·현장", icon: <Users /> },
    ],
  },
  {
    key: "admin-work",
    type: "section",
    label: "관리",
    items: [
      { key: "photo-management", label: "사진 관리/확인", icon: <Image /> },
      { key: "admin-prices", label: "단가표 관리", icon: <Calculator /> },
      { key: "admin-items", label: "견적 템플릿 만들기", icon: <BookOpen />, activeKeys: ["admin-items", "admin-condition-labels"] },
      { key: "admin-detail-costs", label: "세부 비용 관리", icon: <Wrench /> },
    ],
  },
  { key: "help-support", label: "도움말 / 지원", icon: <HelpCircle />, placement: "bottom", disabled: true },
];
const USE_ITEMS_SCREEN_V2 = true;
const spaces = ["거실", "주방", "작은방", "안방", "베란다", "현관", "다용도실"];
const ADMIN_TEMPLATE_ORDER_STORAGE_PREFIX = "formate.adminTemplateOrder";
const MATERIAL_NAME_PLACEHOLDER = "추가된 항목의 이름을 입력하세요";

function createEmptyAdminTemplateConditionDraft() {
  return {
    pyeong: "",
    buildType: "",
    hasExtension: false,
    conditionVariant: "",
  };
}

function getAdminTemplateOrderStorageKey(companyId) {
  return `${ADMIN_TEMPLATE_ORDER_STORAGE_PREFIX}.${companyId || "default"}`;
}

function readAdminTemplateOrder(companyId) {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(getAdminTemplateOrderStorageKey(companyId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.map((id) => `${id}`) : [];
  } catch {
    return [];
  }
}

function writeAdminTemplateOrder(companyId, order) {
  if (typeof window === "undefined" || !companyId) return;
  window.localStorage.setItem(
    getAdminTemplateOrderStorageKey(companyId),
    JSON.stringify((order ?? []).map((id) => `${id}`))
  );
}

const categories = [
  {
    id: "wallpaper",
    name: "도배",
    options: ["실크", "광폭", "디아방"],
  },
  {
    id: "flooring",
    name: "장판",
    options: ["2.2T", "4.5T", "강마루"],
  },
  {
    id: "woodwork",
    name: "목공",
    options: ["걸레받이", "몰딩", "문틀 보수"],
  },
  {
    id: "bathroom",
    name: "욕실",
    options: ["기본형", "고급형", "타일 교체"],
  },
];

const dummySavedData = {};

function makeConditionKey(condition) {
  if (!condition.size || !condition.buildType || !condition.occupancy) return "";

  return [
    condition.size,
    getHouseTypeStateValue(condition.buildType),
    getConditionVariant(condition),
    condition.occupancy,
  ].join("|");
}

function createConditionVariantLabelRows(rows = []) {
  const rowByKey = new Map((rows ?? []).map((row) => [row.variant_key, row]));
  return CONDITION_VARIANT_KEYS.map((variantKey) => {
    const row = rowByKey.get(variantKey) ?? {};
    return {
      id: row.id ?? "",
      variant_key: variantKey,
      label: row.label ?? "",
      description: row.description ?? "",
    };
  });
}

function makeConditionVariantLabelMap(rows = []) {
  return Object.fromEntries(
    (rows ?? []).map((row) => [
      row.variant_key,
      {
        label: `${row.label ?? ""}`.trim(),
        description: `${row.description ?? ""}`.trim(),
      },
    ])
  );
}

function mergeConditionVariantLabelOverrides(baseLabels = {}, overrideLabels = {}) {
  const nextLabels = { ...baseLabels };
  Object.entries(overrideLabels ?? {}).forEach(([variantKey, label]) => {
    const trimmedLabel = `${label ?? ""}`.trim();
    if (!trimmedLabel) return;
    nextLabels[variantKey] = {
      ...(nextLabels[variantKey] ?? {}),
      label: trimmedLabel,
    };
  });
  return nextLabels;
}

function getConditionVariantLabel(variantKey, variantLabels = {}) {
  return `${variantLabels?.[variantKey]?.label ?? ""}`.trim();
}

function formatConditionVariantLabel(variantKey, variantLabels = {}) {
  const label = getConditionVariantLabel(variantKey, variantLabels);
  return label ? `${variantKey} (${label})` : variantKey;
}

function isMissingConditionVariantLabelsTable(error) {
  const raw = `${error?.code ?? ""} ${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
  return raw.includes("condition_variant_labels") && (
    raw.includes("does not exist") ||
    raw.includes("could not find") ||
    raw.includes("schema cache") ||
    raw.includes("42p01") ||
    raw.includes("pgrst")
  );
}

function makeConditionSummary(condition, variantLabels = {}) {
  if (!condition.size || !condition.buildType) return "";

  const base = [`${condition.size}평`];
  if (isExtendedHouseType(condition.buildType)) {
    base.push("확장형");
    base.push(formatConditionVariantLabel(getConditionVariant(condition), variantLabels));
  } else {
    base.push("구형");
    if (condition.expanded) {
      base.push("확장 있음");
    } else {
      base.push("확장 없음");
    }
    base.push(formatConditionVariantLabel(getConditionVariant(condition), variantLabels));
  }
  return base.join(" · ");
}

function makeConditionChips(condition, variantLabels = {}) {
  if (!condition.size && !condition.buildType && !condition.occupancy) return [];

  const chips = [];
  if (condition.size) chips.push(`${condition.size}평`);
  if (condition.buildType) {
    if (isExtendedHouseType(condition.buildType)) {
      chips.push("확장형");
    } else {
      chips.push("구형");
      chips.push(condition.expanded ? "확장 있음" : "확장 없음");
    }
    chips.push(formatConditionVariantLabel(getConditionVariant(condition), variantLabels));
  }
  if (condition.occupancy) chips.push(condition.occupancy === "empty" ? "빈집" : "살림집");
  return chips;
}

function seedItemsFromSaved(saved) {
  const seeded = {};
  categories.forEach((category) => {
    const savedRows = saved?.items?.[category.id] ?? [];
    const byMaterial = Object.fromEntries(savedRows.map((row) => [row.material, row]));
    seeded[category.id] = category.options.map((material) => ({
      material,
      price: byMaterial[material]?.price ?? "",
      selected: Boolean(byMaterial[material]?.selected),
    }));

    savedRows.forEach((row) => {
      if (!category.options.includes(row.material)) {
        seeded[category.id].push({ ...row });
      }
    });
  });
  return seeded;
}

function createEmptyItems() {
  return seedItemsFromSaved(null);
}

function createAdminTemplateConditionDraft(template) {
  if (!template) return createEmptyAdminTemplateConditionDraft();
  const conditionVariant = `${template.condition_variant ?? ""}`;
  return {
    pyeong: `${template.pyeong ?? ""}`,
    buildType: conditionVariant.startsWith("확장형") ? "new" : "old",
    hasExtension: Boolean(template.has_extension),
    conditionVariant,
  };
}

function getDefaultQuantityForUnit(unit, pyeong) {
  return null;
}

function isExtendedHouseType(value) {
  return value === "new" || value === "신축" || value === "확장형" || EXTENDED_VARIANTS.includes(value);
}

function getHouseTypeStateValue(value) {
  return isExtendedHouseType(value) ? "new" : "old";
}

function normalizeConditionVariant(buildType, hasExtension, variant) {
  const houseType = getHouseTypeStateValue(buildType);
  if (houseType === "new") {
    if (EXTENDED_VARIANTS.includes(variant)) return variant;
    if (EXTENDED_VARIANTS.includes(buildType)) return buildType;
    return "확장형1";
  }
  if (!hasExtension) return OLD_NO_EXTENSION_VARIANT;
  if (OLD_EXTENDED_VARIANTS.includes(variant)) return variant;
  if (OLD_EXTENDED_VARIANTS.includes(buildType)) return buildType;
  return "구형1";
}

function getConditionVariant(condition) {
  return normalizeConditionVariant(
    condition?.buildType,
    Boolean(condition?.expanded),
    condition?.conditionVariant
  );
}

function buildTemplateCondition({ pyeong, buildType, hasExtension = false, conditionVariant = "" }) {
  const houseType = getHouseTypeStateValue(buildType);
  const expanded = houseType === "old" ? Boolean(hasExtension) : false;
  const variant = normalizeConditionVariant(buildType, expanded, conditionVariant);
  return {
    pyeong: Number(pyeong),
    build_type: houseType === "new" ? "확장형" : "구형",
    has_extension: houseType === "old" ? variant !== OLD_NO_EXTENSION_VARIANT : false,
    condition_variant: variant,
  };
}

function normalizeTemplateRowCondition(template) {
  if (!template) return null;
  return buildTemplateCondition({
    pyeong: template.pyeong,
    buildType: template.condition_variant || template.build_type,
    hasExtension: template.has_extension,
    conditionVariant: template.condition_variant,
  });
}

function getTemplateConditionKey(templateOrCondition) {
  const isTemplateRow = Object.prototype.hasOwnProperty.call(templateOrCondition ?? {}, "build_type");
  const condition = isTemplateRow
    ? buildTemplateCondition({
        pyeong: templateOrCondition.pyeong,
        buildType: templateOrCondition.condition_variant || templateOrCondition.build_type,
        hasExtension: templateOrCondition.has_extension,
        conditionVariant: templateOrCondition.condition_variant,
      })
    : templateOrCondition;
  if (!condition) return "";
  return [
    Number(condition.pyeong),
    condition.build_type,
    Boolean(condition.has_extension),
    condition.condition_variant,
  ].join("|");
}

function getAdminCatalogScopeKey(mode, templateId = "") {
  return mode === "prices"
    ? "prices"
    : `condition:${templateId || "none"}`;
}

function getScopedResourceStatus(resource, companyId, scopeKey, errorScopePrefix = "") {
  if (!companyId || resource?.companyId !== companyId) return "loading";
  if (resource.scopeKey === scopeKey) {
    return resource.status === "idle" ? "loading" : resource.status;
  }
  if (
    resource.status === "error"
    && errorScopePrefix
    && resource.scopeKey.startsWith(errorScopePrefix)
  ) {
    return "error";
  }
  return "loading";
}

function orderAdminTemplateRows(templates, templateOrder) {
  const orderIndex = new Map((templateOrder ?? []).map((id, index) => [`${id}`, index]));
  return [...(templates ?? [])].sort((a, b) => {
    const aIndex = orderIndex.has(`${a.id}`) ? orderIndex.get(`${a.id}`) : Number.MAX_SAFE_INTEGER;
    const bIndex = orderIndex.has(`${b.id}`) ? orderIndex.get(`${b.id}`) : Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return (templates ?? []).indexOf(a) - (templates ?? []).indexOf(b);
  });
}

function getTemplateTimestamp(template) {
  const updatedAt = Date.parse(template?.updated_at ?? "");
  if (Number.isFinite(updatedAt)) return updatedAt;
  const createdAt = Date.parse(template?.created_at ?? "");
  return Number.isFinite(createdAt) ? createdAt : 0;
}

function pickRepresentativeTemplate(templates = []) {
  return [...templates].sort((a, b) => {
    const timeDiff = getTemplateTimestamp(b) - getTemplateTimestamp(a);
    if (timeDiff !== 0) return timeDiff;
    return `${b.id ?? ""}`.localeCompare(`${a.id ?? ""}`);
  })[0] ?? null;
}

function dedupeTemplatesByCondition(templates = []) {
  const groups = new Map();
  (templates ?? []).forEach((template) => {
    const key = getTemplateConditionKey(template);
    if (!key) return;
    groups.set(key, [...(groups.get(key) ?? []), template]);
  });
  return [...groups.values()]
    .map((group) => pickRepresentativeTemplate(group))
    .filter(Boolean)
    .sort((a, b) => {
      const conditionA = normalizeTemplateRowCondition(a);
      const conditionB = normalizeTemplateRowCondition(b);
      return (
        (conditionA?.pyeong ?? 0) - (conditionB?.pyeong ?? 0) ||
        `${conditionA?.build_type ?? ""}`.localeCompare(`${conditionB?.build_type ?? ""}`) ||
        Number(Boolean(conditionA?.has_extension)) - Number(Boolean(conditionB?.has_extension)) ||
        `${conditionA?.condition_variant ?? ""}`.localeCompare(`${conditionB?.condition_variant ?? ""}`)
      );
    });
}

function getLegacyTemplateConditions(condition) {
  if (!condition) return [];
  const legacy = [];
  if (condition.condition_variant) {
    legacy.push({
      ...condition,
      build_type: condition.condition_variant,
      has_extension: condition.condition_variant.startsWith("구형")
        ? condition.condition_variant !== OLD_NO_EXTENSION_VARIANT
        : false,
    });
  }
  if (condition.condition_variant === "확장형1") {
    legacy.push({ ...condition, build_type: "신축", has_extension: false, condition_variant: "" });
  }
  if (condition.condition_variant === OLD_NO_EXTENSION_VARIANT) {
    legacy.push({ ...condition, build_type: "구축", has_extension: false, condition_variant: "" });
  }
  if (condition.condition_variant === "구형1") {
    legacy.push({ ...condition, build_type: "구축", has_extension: true, condition_variant: "" });
  }
  return legacy;
}

function makeTemplateLabel(template, variantLabels = {}) {
  if (!template) return "";
  const condition = buildTemplateCondition({
    pyeong: template.pyeong,
    buildType: template.condition_variant || template.build_type,
    hasExtension: template.has_extension,
    conditionVariant: template.condition_variant,
  });
  const houseType = condition.condition_variant.startsWith("확장형") ? "확장형" : "구형";
  const parts = [`${template.pyeong}평`, houseType];
  if (houseType === "구형") parts.push(condition.has_extension ? "확장 있음" : "확장 없음");
  parts.push(formatConditionVariantLabel(condition.condition_variant, variantLabels));
  return parts.join(" · ");
}

function getEstimateRowSpecLabel(row) {
  if (row?.itemKind === "sash") {
    return getSashSpecLabel(row.sashSpec);
  }
  const selectedCanonicalOption = (row?.estimateOptions ?? []).find(
    (option) => option.id === row?.selectedEstimateOptionId
  );
  if (selectedCanonicalOption?.label) return `${selectedCanonicalOption.label}`.trim();

  return getLegacyEstimateHistorySpecLabel(row);
}

function getSashEstimateRowValidationMessage(row) {
  if (!row?.sashSpec) return "견적에 포함한 샷시의 실제 규격을 선택하세요.";
  if (!isSashEstimateSpecPricingConfirmed(row.sashSpec)) {
    return "견적에 포함한 샷시의 단창·2중창을 선택하세요.";
  }
  return "";
}

function getSupabaseFriendlyError(error, fallback = "일시적인 문제가 발생했어요. 다시 시도해주세요.") {
  const message = error?.message ?? "";
  const details = error?.details ?? "";
  const hint = error?.hint ?? "";
  const code = error?.code ?? "";
  const raw = `${message} ${details} ${hint}`.toLowerCase();

  console.error("[FORMATE Supabase]", {
    code,
    message,
    details,
    hint,
    error,
  });

  if (!isSupabaseConfigured || message.includes("VITE_SUPABASE")) {
    return "Supabase 연결 설정이 필요합니다. .env의 URL과 anon key를 확인한 뒤 개발 서버를 다시 켜주세요.";
  }
  if (
    raw.includes("invalid path") ||
    raw.includes("failed to fetch") ||
    raw.includes("networkerror") ||
    raw.includes("request url") ||
    raw.includes("could not fetch")
  ) {
    return "Supabase에 연결하지 못했습니다. URL/key 입력값과 네트워크 상태를 확인한 뒤 개발 서버를 다시 켜주세요.";
  }
  if (
    code === "PGRST201" ||
    raw.includes("more than one relationship")
  ) {
    return "DB 조회 관계를 결정하지 못했습니다. 앱을 최신 상태로 새로고침한 뒤 다시 시도해주세요.";
  }
  if (
    code === "42P01" ||
    code === "PGRST204" ||
    raw.includes("does not exist") ||
    raw.includes("could not find")
  ) {
    return "필요한 DB 테이블 또는 컬럼을 찾지 못했습니다. 오류 코드와 적용된 migration을 확인해주세요.";
  }
  if (code === "23503" || raw.includes("foreign key")) {
    return "기본 업체 정보가 없어 저장할 수 없습니다. Supabase SQL Editor에서 supabase/seed.sql을 실행하거나 companies에 기본 업체를 추가해주세요.";
  }
  if (
    code === "42501" ||
    raw.includes("row-level security") ||
    raw.includes("permission denied") ||
    raw.includes("not authorized")
  ) {
    return "DB 저장 권한이 막혀 있습니다. Supabase의 RLS 정책 또는 테이블 권한을 확인해주세요.";
  }
  if (code === "22P02" || raw.includes("invalid input syntax for type uuid")) {
    return "저장 기준으로 쓰는 업체 ID 형식이 올바르지 않습니다. 현재 로그인된 업체 정보를 확인해주세요.";
  }
  if (!code && message && !details && !hint) {
    return message;
  }
  return fallback;
}

function getFriendlyError(error, fallback = "일시적인 문제가 발생했어요. 다시 시도해주세요.") {
  return getSupabaseFriendlyError(error, fallback);
}

function createEstimateDraftKey() {
  return globalThis.crypto.randomUUID();
}

function createLocalId(prefix = "row") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createStorageSafeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }
  return "00000000-0000-4000-8000-000000000000".replace(/0/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

function getAiSaveTargetName(target) {
  const categoryName = formatExcelCellValue(target?.selectedCategoryName ?? target?.categoryName ?? target?.sourceCategory).trim();
  const itemName = formatExcelCellValue(target?.selectedSubitemName ?? target?.subitemName ?? target?.sourceItemName).trim();
  return [categoryName, itemName].filter(Boolean).join(" / ") || "이름 없는 항목";
}

function getCompactNameSummary(names, limit = 3) {
  const uniqueNames = Array.from(new Set((names ?? []).filter(Boolean)));
  if (uniqueNames.length === 0) return "";
  const visible = uniqueNames.slice(0, limit).join(", ");
  const remaining = uniqueNames.length - limit;
  return remaining > 0 ? `${visible} 외 ${remaining}개` : visible;
}

function sanitizeFileNamePart(value, fallback) {
  const cleaned = `${value ?? ""}`
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

function getSavedEstimateCustomerName(estimate) {
  return `${getEstimateItemsDataMeta(estimate?.items_data).customerName ?? ""}`.trim();
}

function getSavedEstimateCustomerPhone(estimate) {
  return `${getEstimateItemsDataMeta(estimate?.items_data).customerPhone ?? ""}`.trim();
}

function getApprovedEstimateContractTarget(estimate) {
  if (estimate?.status !== "approved" || !estimate?.current_estimate_version_id) return null;
  const consultation = Array.isArray(estimate.consultation)
    ? estimate.consultation[0]
    : estimate.consultation;
  const project = Array.isArray(consultation?.project)
    ? consultation.project[0]
    : consultation?.project;
  const versions = Array.isArray(estimate.estimate_versions) ? estimate.estimate_versions : [];
  const currentVersion = versions.find((version) => version.id === estimate.current_estimate_version_id);
  const projectId = currentVersion?.project_id || project?.id || "";
  if (!projectId || project?.deleted_at) return null;
  return {
    projectId,
    estimateVersionId: estimate.current_estimate_version_id,
  };
}

function getSavedEstimateDisplayDate(estimate) {
  const rawDate = estimate?.created_at;
  if (!rawDate) return "-";

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getHomeEstimateStatusView(estimate) {
  const estimateMeta = getEstimateItemsDataMeta(estimate?.items_data);
  const status = `${estimate?.status ?? estimateMeta.status ?? estimateMeta.estimateStatus ?? ""}`
    .trim()
    .toLowerCase();

  if (status === "approved") return { label: "확정", tone: "success" };
  if (status === "viewed") return { label: "고객 열람", tone: "info" };
  if (status === "sent" || status === "revision_requested") {
    return { label: status === "sent" ? "고객 검토 중" : "수정 요청", tone: "warning" };
  }
  if (status === "expired" || status === "cancelled") {
    return { label: status === "expired" ? "만료" : "취소", tone: "danger" };
  }
  if (status === "draft") return { label: "초안", tone: "muted" };
  return { label: "저장됨", tone: "muted" };
}

function HomePlaceholderWidget({ title }) {
  // TODO: 이 위젯은 UI 껍데기만 존재합니다. "처리 필요"/"진행 중"
  // 기능(고객 요청, 승인 상태 등)은 아직 설계/구현되지 않았습니다.
  // 실제 상태값 스키마 설계 후 이 컴포넌트를 다시 작업해야 합니다.
  return (
    <section className="home-placeholder-widget" aria-label={title}>
      <div className="home-section-head">
        <h2>{title}</h2>
        <span className="home-placeholder-badge">준비 중</span>
      </div>
      <div className="home-placeholder-empty">
        <FileText size={18} strokeWidth={1.5} aria-hidden="true" />
        <span>아직 연결된 데이터가 없습니다</span>
      </div>
    </section>
  );
}

function normalizeCatalogMatchText(value) {
  return formatExcelCellValue(value)
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[（][^）]*[）]/g, " ")
    .replace(/[₩￦]/g, "")
    .replace(/[\/\\,.;；:：\-_]/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, "")
    .replace(/\s+/g, "")
    .replace(/공사$/g, "");
}

function tokenizeCatalogMatchText(value) {
  return formatExcelCellValue(value)
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[（][^）]*[）]/g, " ")
    .replace(/[\/\\,.;；:：\-_()\s]+/g, " ")
    .split(/\s+/g)
    .map((token) => normalizeCatalogMatchText(token))
    .filter(Boolean);
}

function getCatalogMatchScore(sourceValue, targetValue) {
  const source = formatExcelCellValue(sourceValue).trim();
  const target = formatExcelCellValue(targetValue).trim();
  if (!source || !target) return null;
  if (source === target) return { method: "exact", confidence: 1 };

  const normalizedSource = normalizeCatalogMatchText(source);
  const normalizedTarget = normalizeCatalogMatchText(target);
  if (!normalizedSource || !normalizedTarget) return null;
  if (normalizedSource === normalizedTarget) return { method: "normalized", confidence: 0.92 };
  if (normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource)) {
    return { method: "includes", confidence: 0.78 };
  }

  const sourceTokens = tokenizeCatalogMatchText(source);
  const targetTokens = tokenizeCatalogMatchText(target);
  if (sourceTokens.some((token) => token && (token === normalizedTarget || targetTokens.includes(token)))) {
    return { method: "token", confidence: 0.74 };
  }
  if (targetTokens.some((token) => token && (token === normalizedSource || sourceTokens.includes(token)))) {
    return { method: "token", confidence: 0.74 };
  }

  return null;
}

function findBestCatalogCategoryMatch(sourceCategory, catalogItems) {
  const candidates = (catalogItems ?? [])
    .map((item) => {
      const score = getCatalogMatchScore(sourceCategory, item.name);
      if (!score) return null;
      return {
        sourceCategory,
        matchedCategoryId: item.id,
        matchedCategoryName: item.name,
        categoryMatchMethod: score.method,
        categoryConfidence: score.confidence,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.categoryConfidence - a.categoryConfidence);
  return candidates[0] ?? null;
}

function findBestCatalogSubitemMatch(sourceItemName, catalogItems, categoryMatch) {
  const preferredItems = categoryMatch?.matchedCategoryId
    ? (catalogItems ?? []).filter((item) => item.id === categoryMatch.matchedCategoryId)
    : [];
  const preferredSubitems = preferredItems.flatMap((item) =>
    (item.subitems ?? []).map((subitem) => ({ ...subitem, categoryId: item.id, categoryName: item.name, preferred: true }))
  );
  const allSubitems = (catalogItems ?? []).flatMap((item) =>
    (item.subitems ?? []).map((subitem) => ({ ...subitem, categoryId: item.id, categoryName: item.name, preferred: false }))
  );
  const searchPool = preferredSubitems.length > 0 ? preferredSubitems : allSubitems;

  const candidates = searchPool
    .map((subitem) => {
      const score = getCatalogMatchScore(sourceItemName, subitem.name);
      if (!score) return null;
      const confidence = Math.min(1, score.confidence + (subitem.preferred ? 0.06 : 0));
      return {
        sourceItemName,
        matchedSubitemId: subitem.id,
        matchedSubitemName: subitem.name,
        matchedSubitemCategoryId: subitem.categoryId,
        matchedSubitemCategoryName: subitem.categoryName,
        subitemMatchMethod: score.method,
        subitemConfidence: confidence,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.subitemConfidence - a.subitemConfidence);
  return candidates[0] ?? null;
}

function getAiMatchStatus(row, categoryMatch, subitemMatch) {
  const sourceCategory = formatExcelCellValue(row?.category).trim();
  const sourceItemName = formatExcelCellValue(row?.item_name).trim();
  if (!sourceCategory && !sourceItemName) return "needs_review";
  if (categoryMatch?.categoryConfidence >= 0.82 && subitemMatch?.subitemConfidence >= 0.82) return "matched";
  if (categoryMatch?.categoryConfidence >= 0.78) return "category_matched";
  if (subitemMatch?.subitemConfidence >= 0.72) return "subitem_candidate";
  if (sourceCategory || sourceItemName) return "new_candidate";
  return "needs_review";
}

function getAiRowText(row) {
  return [
    row?.category,
    row?.item_name,
    row?.spec,
    row?.memo,
    row?.original_amount,
    row?.tax,
  ].map(formatExcelCellValue).join(" ");
}

function inferAiRowType(row, categoryMatch, subitemMatch) {
  const values = Object.entries(row ?? {})
    .filter(([key]) => key !== "sourceRowNumber")
    .map(([, value]) => formatExcelCellValue(value).trim())
    .filter(Boolean);
  if (values.length === 0) return "ignored";

  const text = normalizeCatalogMatchText(getAiRowText(row));
  const onlySequenceLike = values.length <= 1 && /^(no|번호|순번|연번|#)?\d*$/i.test(values[0]);
  if (onlySequenceLike) return "ignored";
  if (!text) return "ignored";
  if (/(부분합계|소계)/.test(text)) return "subtotal_row";
  if (/(총합계|청구계|총계|합계)/.test(text)) return "total_row";
  if (/(부가세|vat|세금|세액)/i.test(text)) return "tax_item";
  if (categoryMatch?.categoryConfidence >= 0.78 || subitemMatch?.subitemConfidence >= 0.72) return "work_item";
  return "needs_review";
}

function getDefaultAiMatchAction(status) {
  if (status === "matched") return "link";
  if (status === "new_candidate") return "new";
  if (status === "ignored") return "ignore";
  return "review";
}

function getDefaultAiActionForRowType(rowType, matchStatus) {
  if (rowType === "work_item") return getDefaultAiMatchAction(matchStatus);
  if (["cost_item", "margin_item", "tax_item"].includes(rowType)) return "cost";
  if (["subtotal_row", "total_row"].includes(rowType)) return "validate";
  if (rowType === "ignored") return "ignore";
  return "review";
}

function normalizeAiActionForRowType(rowType, action, matchStatus = "needs_review") {
  if (rowType === "work_item") {
    return ["link", "new", "ignore", "review"].includes(action)
      ? action
      : getDefaultAiMatchAction(matchStatus);
  }
  return getDefaultAiActionForRowType(rowType, matchStatus);
}

function getAiSplitRowSourceNumber(sourceRowNumber, index) {
  return `${sourceRowNumber}-${index + 1}`;
}

function formatAiShortReason(value, maxLength = 72) {
  const text = formatExcelCellValue(value).trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function createAiSplitOverridePatch(splitRow, catalogItems = []) {
  const suggestedSubitemId = splitRow?.suggestedSubitemId || "";
  const suggestedCategoryId = splitRow?.suggestedCategoryId || "";
  let categoryId = suggestedCategoryId;
  let subitemId = suggestedSubitemId;

  if (suggestedSubitemId) {
    const matchedCategory = (catalogItems ?? []).find((item) =>
      (item.subitems ?? []).some((subitem) => subitem.id === suggestedSubitemId)
    );
    if (matchedCategory) {
      categoryId = categoryId && categoryId === matchedCategory.id ? categoryId : matchedCategory.id;
      const matchedSubitem = (matchedCategory.subitems ?? []).find((subitem) => subitem.id === suggestedSubitemId);
      subitemId = matchedSubitem?.id ?? "";
    } else {
      subitemId = "";
    }
  }

  if (splitRow?.suggestedAction === "link_existing" && categoryId && subitemId) {
    return {
      rowType: "work_item",
      action: "link",
      categoryId,
      subitemId,
    };
  }

  if (splitRow?.suggestedAction === "new") {
    return {
      rowType: "work_item",
      action: "new",
      categoryId,
      subitemId: "",
    };
  }

  return {
    rowType: "work_item",
    action: "review",
    categoryId,
    subitemId: "",
  };
}

function createAiCatalogMatchRow(row, catalogItems, override = {}, options = {}) {
    const lumpSum = Boolean(options.isLumpSum || options.isSplitParent || isLumpSumImportRow(row));
    const isCopyImport = row.__formateImportMode === EXCEL_IMPORT_MODES.COPY;
    const stableMatch = isCopyImport ? null : findCatalogMatchByStableIds(catalogItems, row);
    const copyMatch = isCopyImport ? findCatalogCopyMatch(catalogItems, row) : null;
    const sourceCategory = formatExcelCellValue(
      override.sourceCategory ?? (lumpSum ? LUMP_SUM_CATEGORY_NAME : row.category ?? row.sourceCategory)
    ).trim();
    const sourceItemName = formatExcelCellValue(override.sourceItemName ?? override.itemName ?? row.item_name ?? row.sourceItemName).trim();
    const categoryMatch = stableMatch?.item
      ? {
          sourceCategory,
          matchedCategoryId: stableMatch.item.id,
          matchedCategoryName: stableMatch.item.name,
          categoryMatchMethod: "stable_key",
          categoryConfidence: 1,
        }
      : copyMatch?.item
        ? {
            sourceCategory,
            matchedCategoryId: copyMatch.item.id,
            matchedCategoryName: copyMatch.item.name,
            categoryMatchMethod: "current_company_copy",
            categoryConfidence: copyMatch.categoryConfidence,
          }
        : findBestCatalogCategoryMatch(sourceCategory, catalogItems);
    const subitemMatch = stableMatch?.subitem
      ? {
          sourceItemName,
          matchedSubitemId: stableMatch.subitem.id,
          matchedSubitemName: stableMatch.subitem.name,
          matchedSubitemCategoryId: stableMatch.item.id,
          matchedSubitemCategoryName: stableMatch.item.name,
          subitemMatchMethod: "stable_key",
          subitemConfidence: 1,
        }
      : copyMatch?.subitem
        ? {
            sourceItemName,
            matchedSubitemId: copyMatch.subitem.id,
            matchedSubitemName: copyMatch.subitem.name,
            matchedSubitemCategoryId: copyMatch.item.id,
            matchedSubitemCategoryName: copyMatch.item.name,
            subitemMatchMethod: copyMatch.matchMethod ?? "current_company_copy",
            subitemConfidence: copyMatch.subitemConfidence,
          }
        : isCopyImport
          ? null
          : findBestCatalogSubitemMatch(sourceItemName, catalogItems, categoryMatch);
    const autoStatus = getAiMatchStatus(row, categoryMatch, subitemMatch);
    const rowType = options.isSplitChildDefaultIgnored && !override.rowType
      ? "ignored"
      : override.rowType ?? (
        lumpSum || (isCopyImport && (sourceCategory || sourceItemName))
          ? "work_item"
          : inferAiRowType(row, categoryMatch, subitemMatch)
      );
    const selectedCategoryId = override.categoryId ?? categoryMatch?.matchedCategoryId ?? subitemMatch?.matchedSubitemCategoryId ?? "";
    const selectedCategory = (catalogItems ?? []).find((item) => item.id === selectedCategoryId);
    const selectedSubitemId = override.subitemId ?? (
      selectedCategoryId && subitemMatch?.matchedSubitemCategoryId === selectedCategoryId ? subitemMatch?.matchedSubitemId : ""
    );
    const selectedSubitem = (selectedCategory?.subitems ?? []).find((subitem) => subitem.id === selectedSubitemId);
    const hasConflict = Boolean(selectedSubitem && (
      (hasImportValue(override.unitPrice ?? row.unit_price) && importValuesDiffer(selectedSubitem.unit_price, override.unitPrice ?? row.unit_price))
      || (hasImportValue(override.laborRate ?? row.labor_rate) && importValuesDiffer(selectedSubitem.labor_rate, override.laborRate ?? row.labor_rate))
      || (hasImportValue(override.laborRateEmpty ?? row.labor_rate_empty) && importValuesDiffer(getLaborRateEmptyValue(selectedSubitem), override.laborRateEmpty ?? row.labor_rate_empty))
      || (hasImportValue(override.laborRateOccupied ?? row.labor_rate_occupied) && importValuesDiffer(getLaborRateOccupiedValue(selectedSubitem), override.laborRateOccupied ?? row.labor_rate_occupied))
    ));
    const defaultAction = isCopyImport
      ? getCopyImportDefaultAction(copyMatch)
      : lumpSum && !selectedSubitemId
        ? "new"
        : getDefaultAiActionForRowType(rowType, autoStatus);
    const action = normalizeAiActionForRowType(rowType, override.action ?? defaultAction, autoStatus);

    const matchStatus = rowType === "ignored" || action === "ignore"
      ? "ignored"
      : rowType !== "work_item"
        ? rowType
      : action === "link" && selectedCategoryId && selectedSubitemId
        ? "matched"
        : action === "new"
          ? "new_candidate"
          : action === "review"
            ? "needs_review"
            : autoStatus;

    return {
      ...row,
      spec: override.spec ?? row.spec,
      quantity: override.quantity ?? (lumpSum ? row.quantity || "1" : row.quantity),
      unit: override.unit ?? (lumpSum ? "식" : row.unit),
      unit_price: override.unitPrice ?? (lumpSum ? getLumpSumSourceTotal(row) : row.unit_price),
      labor_rate: override.laborRate ?? row.labor_rate,
      labor_rate_empty: override.laborRateEmpty ?? row.labor_rate_empty,
      labor_rate_occupied: override.laborRateOccupied ?? row.labor_rate_occupied,
      labor_count: override.laborCount ?? row.labor_count,
      sourceCategory,
      sourceItemName,
      categoryMatch,
      subitemMatch,
      rowType,
      matchStatus,
      action,
      selectedCategoryId,
      selectedCategoryName: selectedCategory?.name ?? categoryMatch?.matchedCategoryName ?? "",
      selectedSubitemId,
      selectedSubitemName: selectedSubitem?.name ?? subitemMatch?.matchedSubitemName ?? "",
      selectedSubitemUnit: selectedSubitem?.unit ?? "",
      selectedSubitemUnitPrice: selectedSubitem?.unit_price ?? "",
      selectedSubitemLaborRate: selectedSubitem?.labor_rate ?? "",
      selectedSubitemLaborRateEmpty: selectedSubitem ? getLaborRateEmptyValue(selectedSubitem) : "",
      selectedSubitemLaborRateOccupied: selectedSubitem ? getLaborRateOccupiedValue(selectedSubitem) : "",
      stableMatch: Boolean(stableMatch?.subitem),
      reviewStatus: getImportReviewStatus({ row, stableMatch, categoryMatch, subitemMatch, hasConflict }),
      conflictDecision: override.conflictDecision ?? "keep",
      isLumpSum: lumpSum,
      isSplitParent: Boolean(options.isSplitParent),
      isSplitRow: Boolean(options.isSplitRow),
      isSplitChild: Boolean(options.isSplitRow),
      sourceParentRowNumber: options.sourceParentRowNumber ?? row.sourceParentRowNumber ?? null,
      parentSourceRowNumber: options.sourceParentRowNumber ?? row.sourceParentRowNumber ?? null,
      originalRowNumber: options.isSplitRow
        ? `${options.sourceParentRowNumber ?? row.sourceParentRowNumber}-${options.splitIndex ?? ""}`
        : row.sourceRowNumber,
      splitIndex: options.splitIndex ?? null,
      splitCount: options.splitCount ?? 0,
      aiReason: override.aiReason ?? "",
      aiConfidence: override.aiConfidence ?? null,
      aiRecommendedAction: override.aiRecommendedAction ?? "",
      aiReviewNotes: override.aiReviewNotes ?? [],
    };
}

function createAiCatalogMatchRows(previewRows, catalogItems, overrides = {}) {
  return (previewRows ?? []).flatMap((row) => {
    const override = overrides[row.sourceRowNumber] ?? {};
    const splitRows = Array.isArray(override.splitRows) ? override.splitRows : [];
    const isBundleParent = splitRows.length > 0 || isLumpSumImportRow(row);
    const existingBundleCategory = (catalogItems ?? []).find((item) =>
      item.item_type === LUMP_SUM_ITEM_TYPE
      && normalizeCatalogMatchText(item.name) === normalizeCatalogMatchText(LUMP_SUM_CATEGORY_NAME)
    );
    const bundleDefaultPatch = isBundleParent && override.source !== "manual"
      ? {
          rowType: "work_item",
          action: findCatalogMatchByStableIds(catalogItems, row)?.subitem ? "link" : "new",
          categoryId: findCatalogMatchByStableIds(catalogItems, row)?.item?.id || existingBundleCategory?.id || "",
          subitemId: findCatalogMatchByStableIds(catalogItems, row)?.subitem?.id || "",
          sourceItemName: formatExcelCellValue(row.item_name || row.category || `원본 ${row.sourceRowNumber}행 1식 공사`).trim(),
        }
      : {};
    const parentRow = createAiCatalogMatchRow(
      row,
      catalogItems,
      {
        ...override,
        ...bundleDefaultPatch,
        aiReason: splitRows.length > 0
          ? `AI가 ${splitRows.length}개 분해 후보를 만들었습니다. 기본 계산 기준은 원본 묶음 총액입니다.`
          : override.aiReason,
        aiReviewNotes: splitRows.length > 0
          ? [...(override.aiReviewNotes ?? []), "분해 후보는 기본 저장 대상에서 제외됩니다."]
          : override.aiReviewNotes,
      },
      {
        isSplitParent: splitRows.length > 0,
        isLumpSum: isBundleParent,
        splitCount: splitRows.length,
      }
    );

    if (splitRows.length === 0) return [parentRow];

    const generatedRows = splitRows.map((splitRow, index) => {
      const splitSourceRowNumber = getAiSplitRowSourceNumber(row.sourceRowNumber, index);
      const childOverride = overrides[splitSourceRowNumber] ?? {};
      const sourceCategory = formatExcelCellValue(splitRow.categoryName || row.category || row.sourceCategory).trim();
      const sourceItemName = formatExcelCellValue(splitRow.itemName).trim();
      const splitPatch = createAiSplitOverridePatch(splitRow, catalogItems);
      return createAiCatalogMatchRow(
        {
          ...row,
          sourceRowNumber: splitSourceRowNumber,
          sourceParentRowNumber: row.sourceRowNumber,
          category: sourceCategory,
          item_name: sourceItemName,
          sourceCategory,
          sourceItemName,
          unit: row.unit || "식",
          quantity: "1",
          unit_price: splitRow.unitPrice ?? "",
          labor_rate: splitRow.laborRate ?? "",
          labor_rate_empty: splitRow.laborRateEmpty ?? "",
          labor_rate_occupied: splitRow.laborRateOccupied ?? "",
          labor_count: "",
          original_amount: "",
          memo: "",
        },
        catalogItems,
        {
          ...splitPatch,
          ...childOverride,
          rowType: childOverride.rowType ?? "ignored",
          action: childOverride.action ?? "ignore",
          aiReason: childOverride.aiReason ?? splitRow.reason ?? "원본 묶음 행에서 분리된 공사항목입니다.",
          aiConfidence: childOverride.aiConfidence ?? splitRow.confidence ?? null,
          aiRecommendedAction: childOverride.aiRecommendedAction ?? (
            splitRow.suggestedAction === "link_existing"
              ? "link_existing"
              : splitRow.suggestedAction === "new"
                ? "add_new_item"
                : "needs_review"
          ),
        },
        {
          isSplitRow: true,
          isSplitChildDefaultIgnored: true,
          sourceParentRowNumber: row.sourceRowNumber,
          splitIndex: index + 1,
        }
      );
    });

    return [parentRow, ...generatedRows];
  });
}

function summarizeAiCatalogMatchRows(rows) {
  return (rows ?? []).reduce(
    (summary, row) => {
      summary.total += 1;
      if (row.rowType === "work_item") summary.workItem += 1;
      if (["cost_item", "margin_item", "tax_item"].includes(row.rowType)) summary.costSummaryCandidate += 1;
      if (["subtotal_row", "total_row"].includes(row.rowType)) summary.validationRows += 1;
      if (row.matchStatus === "matched") summary.matched += 1;
      else if (row.matchStatus === "new_candidate" && row.rowType === "work_item") summary.newCandidate += 1;
      else if (row.matchStatus === "ignored" || row.rowType === "ignored") summary.ignored += 1;
      else summary.needsReview += 1;
      return summary;
    },
    { total: 0, workItem: 0, matched: 0, newCandidate: 0, costSummaryCandidate: 0, validationRows: 0, needsReview: 0, ignored: 0 }
  );
}

function getAiRecommendationOverridePatch(recommendation) {
  const splitRows = (Array.isArray(recommendation?.splitRows) ? recommendation.splitRows : [])
    .slice(0, 8)
    .map((splitRow) => ({
      itemName: formatExcelCellValue(splitRow?.itemName ?? splitRow?.label).trim(),
      categoryName: formatExcelCellValue(splitRow?.categoryName).trim(),
      suggestedCategoryId: splitRow?.suggestedCategoryId ?? "",
      suggestedSubitemId: splitRow?.suggestedSubitemId ?? "",
      suggestedAction: splitRow?.suggestedAction ?? "needs_review",
      confidence: Number.isFinite(Number(splitRow?.confidence)) ? Number(splitRow.confidence) : null,
      reason: formatExcelCellValue(splitRow?.reason).trim(),
      unitPrice: formatExcelCellValue(splitRow?.unitPrice ?? splitRow?.unit_price).trim(),
      laborRate: formatExcelCellValue(splitRow?.laborRate ?? splitRow?.labor_rate).trim(),
      laborRateEmpty: formatExcelCellValue(splitRow?.laborRateEmpty ?? splitRow?.labor_rate_empty).trim(),
      laborRateOccupied: formatExcelCellValue(splitRow?.laborRateOccupied ?? splitRow?.labor_rate_occupied).trim(),
    }))
    .filter((splitRow) => splitRow.itemName);
  const withSplitRows = (patch) => splitRows.length > 0 ? { ...patch, splitRows } : patch;
  const recommendedAction = recommendation?.recommendedAction;
  if (recommendedAction === "link_existing") {
    return withSplitRows({
      rowType: "work_item",
      action: "link",
      categoryId: recommendation.recommendedCategoryId ?? "",
      subitemId: recommendation.recommendedSubitemId ?? "",
    });
  }
  if (recommendedAction === "add_new_item") {
    return withSplitRows({
      rowType: "work_item",
      action: "new",
      categoryId: recommendation.recommendedCategoryId ?? "",
      subitemId: "",
    });
  }
  if (recommendedAction === "cost_candidate") {
    const rowType = ["cost_item", "margin_item", "tax_item"].includes(recommendation?.recommendedRowType)
      ? recommendation.recommendedRowType
      : "cost_item";
    return withSplitRows({ rowType, action: "cost" });
  }
  if (recommendedAction === "validation_only") {
    const rowType = ["subtotal_row", "total_row"].includes(recommendation?.recommendedRowType)
      ? recommendation.recommendedRowType
      : "total_row";
    return withSplitRows({ rowType, action: "validate" });
  }
  if (recommendedAction === "ignore") {
    return withSplitRows({ rowType: "ignored", action: "ignore" });
  }
  return withSplitRows({ rowType: "needs_review", action: "review" });
}

function hasImportValue(value) {
  return formatExcelCellValue(value).trim() !== "";
}

function displayImportValue(value) {
  return hasImportValue(value) ? formatExcelCellValue(value) : "-";
}

function normalizeImportComparableValue(value) {
  const text = formatExcelCellValue(value).trim();
  if (!text) return "";
  const numericText = text.replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (numericText && /[0-9]/.test(numericText)) {
    const number = Number(numericText);
    if (Number.isFinite(number)) return String(number);
  }
  return normalizeCatalogMatchText(text);
}

function importValuesDiffer(currentValue, excelValue) {
  if (!hasImportValue(excelValue)) return false;
  return normalizeImportComparableValue(currentValue) !== normalizeImportComparableValue(excelValue);
}

function parseAiImportCurrencyNumber(value) {
  const text = formatExcelCellValue(value).trim();
  if (!text) return null;
  const numericText = text.replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (!numericText || numericText === "-" || numericText === "." || numericText === "-.") return null;
  const number = Number(numericText);
  return Number.isFinite(number) ? number : null;
}

function formatAiImportMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${Math.round(number).toLocaleString("ko-KR")}원`;
}

function getAiSplitRowInputAmount(row) {
  if (!row?.isSplitRow) return 0;
  const quantity = parseAiImportCurrencyNumber(row.quantity);
  const laborCount = parseAiImportCurrencyNumber(row.labor_count);
  const unitPrice = parseAiImportCurrencyNumber(row.unit_price);
  const laborRate = parseAiImportCurrencyNumber(row.labor_rate);
  const productAmount = unitPrice === null ? 0 : unitPrice * (quantity ?? 1);
  const laborAmount = laborRate === null ? 0 : laborRate * (laborCount ?? 1);
  return productAmount + laborAmount;
}

function createAiSplitValidationSummaries(rows) {
  const allRows = rows ?? [];
  const splitChildrenByParent = new Map();
  allRows.forEach((row) => {
    if (!row?.isSplitRow || !row.sourceParentRowNumber) return;
    const list = splitChildrenByParent.get(row.sourceParentRowNumber) ?? [];
    list.push(row);
    splitChildrenByParent.set(row.sourceParentRowNumber, list);
  });

  return allRows
    .filter((row) => row?.isSplitParent)
    .map((row) => {
      const children = splitChildrenByParent.get(row.sourceRowNumber) ?? [];
      const originalAmount = parseAiImportCurrencyNumber(row.original_amount || row.tax);
      const inputTotal = children.reduce((sum, child) => sum + getAiSplitRowInputAmount(child), 0);
      return {
        sourceRowNumber: row.sourceRowNumber,
        sourceCategory: row.sourceCategory,
        sourceItemName: row.sourceItemName,
        originalAmount,
        inputTotal,
        difference: originalAmount === null ? null : originalAmount - inputTotal,
        splitCount: children.length,
      };
    });
}

function getAiApplyPlanReviewReasons(row) {
  const reasons = [];
  if (row.rowType === "needs_review") reasons.push("\uD589 \uC720\uD615 \uD655\uC778 \uD544\uC694");
  if (row.action === "review" || row.action === "needs_review") reasons.push("\uCC98\uB9AC \uBC29\uC2DD \uD655\uC778 \uD544\uC694");
  if (!row.sourceCategory && !row.sourceItemName) reasons.push("\uB300\uBD84\uB958/\uD56D\uBAA9\uBA85 \uC5C6\uC74C");
  if (row.rowType === "work_item" && row.action === "link" && !row.selectedSubitemId) {
    reasons.push("\uC5F0\uACB0\uB41C \uC138\uBD80\uD56D\uBAA9 \uC5C6\uC74C");
  }
  if (row.rowType === "work_item" && row.action === "new" && !row.sourceItemName && !row.sourceCategory) {
    reasons.push("\uC0C8 \uC138\uBD80\uD56D\uBAA9\uBA85 \uC5C6\uC74C");
  }
  return reasons;
}

function isAiImportWorkItem(row) {
  return row?.rowType === "work_item";
}

function isAiImportLinkAction(action) {
  return action === "link";
}

function isAiImportNewAction(action) {
  return action === "new";
}

function createAiImportApplyPlan(rows) {
  const plan = {
    priceUpdates: [],
    newCategoryCandidates: [],
    newSubitemCandidates: [],
    templateValueCandidates: [],
    costCandidates: [],
    validationRows: [],
    ignoredRows: [],
    reviewRows: [],
  };
  const categoryCandidateMap = new Map();

  (rows ?? []).forEach((row) => {
    const isWorkItem = isAiImportWorkItem(row);
    const isIgnored = row.rowType === "ignored" || row.action === "ignore";
    const sourceCategory = row.sourceCategory || "";
    const sourceItemName = row.sourceItemName || "";
    const hasQuantityValue = hasImportValue(row.quantity);
    const hasLaborCountValue = hasImportValue(row.labor_count);
    const hasConstructionDaysValue = hasImportValue(row.construction_days);
    const hasUnitPriceValue = hasImportValue(row.unit_price);
    const hasLaborRateValue = hasImportValue(row.labor_rate);
    const hasLaborRateEmptyValue = hasImportValue(row.labor_rate_empty);
    const hasLaborRateOccupiedValue = hasImportValue(row.labor_rate_occupied);
    const reviewReasons = getAiApplyPlanReviewReasons(row);

    if (row.isSplitChild) {
      plan.ignoredRows.push({
        sourceRowNumber: row.sourceRowNumber,
        sourceCategory,
        sourceItemName,
        rowType: "ignored",
        action: "ignore",
        reason: "부모 1식 총액 기준에서 분해 후보는 계산과 저장에서 제외됩니다.",
      });
      return;
    }

    if (isIgnored) {
      plan.ignoredRows.push({
        sourceRowNumber: row.sourceRowNumber,
        sourceCategory,
        sourceItemName,
        rowType: row.rowType,
        action: row.action,
      });
      return;
    }

    if (["cost_item", "margin_item", "tax_item"].includes(row.rowType)) {
      plan.costCandidates.push({
        sourceRowNumber: row.sourceRowNumber,
        sourceCategory,
        sourceItemName,
        originalAmount: row.original_amount || row.tax || "",
        rowType: row.rowType,
        action: row.action,
      });
      return;
    }

    if (["subtotal_row", "total_row"].includes(row.rowType)) {
      plan.validationRows.push({
        sourceRowNumber: row.sourceRowNumber,
        sourceCategory,
        sourceItemName,
        originalAmount: row.original_amount || row.tax || "",
        rowType: row.rowType,
      });
      return;
    }

    if (reviewReasons.length > 0) {
      plan.reviewRows.push({
        sourceRowNumber: row.sourceRowNumber,
        sourceCategory,
        sourceItemName,
        reasons: reviewReasons,
        rowType: row.rowType,
        action: row.action,
      });
      return;
    }

    if (isWorkItem && isAiImportLinkAction(row.action) && row.selectedSubitemId && (hasUnitPriceValue || hasLaborRateValue || hasLaborRateEmptyValue || hasLaborRateOccupiedValue)) {
      const unitPriceWillChange = hasUnitPriceValue && importValuesDiffer(row.selectedSubitemUnitPrice, row.unit_price);
      const laborRateWillChange = hasLaborRateValue && importValuesDiffer(row.selectedSubitemLaborRate, row.labor_rate);
      const laborRateEmptyWillChange = hasLaborRateEmptyValue && importValuesDiffer(row.selectedSubitemLaborRateEmpty, row.labor_rate_empty);
      const laborRateOccupiedWillChange = hasLaborRateOccupiedValue && importValuesDiffer(row.selectedSubitemLaborRateOccupied, row.labor_rate_occupied);
      if (unitPriceWillChange || laborRateWillChange || laborRateEmptyWillChange || laborRateOccupiedWillChange) {
        plan.priceUpdates.push({
          sourceRowNumber: row.sourceRowNumber,
          matchedSubitemId: row.selectedSubitemId,
          matchedItemId: row.selectedCategoryId,
          sourceCategory,
          sourceItemName,
          selectedCategoryName: row.selectedCategoryName,
          selectedSubitemName: row.selectedSubitemName,
          currentUnitPrice: row.selectedSubitemUnitPrice,
          excelUnitPrice: row.unit_price,
          currentLaborRate: row.selectedSubitemLaborRate,
          excelLaborRate: row.labor_rate,
          currentLaborRateEmpty: row.selectedSubitemLaborRateEmpty,
          excelLaborRateEmpty: row.labor_rate_empty,
          currentLaborRateOccupied: row.selectedSubitemLaborRateOccupied,
          excelLaborRateOccupied: row.labor_rate_occupied,
          willChange: true,
          conflictDecision: row.conflictDecision ?? "keep",
        });
      }
    }

    if (isWorkItem && isAiImportNewAction(row.action) && !row.selectedCategoryId && sourceCategory) {
      const key = normalizeCatalogMatchText(sourceCategory);
      const existing = categoryCandidateMap.get(key);
      if (existing) {
        existing.sourceRows.push(row.sourceRowNumber);
      } else {
        categoryCandidateMap.set(key, {
          sourceCategory,
          sourceRows: [row.sourceRowNumber],
        });
      }
    }

    if (isWorkItem && isAiImportNewAction(row.action) && !row.selectedSubitemId && (sourceItemName || sourceCategory)) {
      plan.newSubitemCandidates.push({
        sourceRowNumber: row.sourceRowNumber,
        categoryName: row.selectedCategoryName || sourceCategory || "\uC0C8 \uB300\uBD84\uB958 \uD6C4\uBCF4",
        sourceItemName: sourceItemName || sourceCategory || "\uC0C8 \uC138\uBD80\uD56D\uBAA9 \uD6C4\uBCF4",
        spec: row.spec,
        unit: row.unit,
        unitPrice: row.unit_price,
        laborRate: row.labor_rate,
        quantity: row.quantity,
        laborCount: row.labor_count,
      });
    }

    if (isWorkItem && row.selectedSubitemId && (hasQuantityValue || hasLaborCountValue || hasConstructionDaysValue)) {
      const selectedSubitemName = row.selectedSubitemName || sourceItemName || "\uC138\uBD80\uD56D\uBAA9 \uBBF8\uC815";
      plan.templateValueCandidates.push({
        sourceRowNumber: row.sourceRowNumber,
        matchedSubitemId: row.selectedSubitemId,
        matchedItemId: row.selectedCategoryId,
        rowType: row.rowType,
        action: row.action,
        categoryName: row.selectedCategoryName || sourceCategory || "\uB300\uBD84\uB958 \uBBF8\uC815",
        subitemName: selectedSubitemName,
        quantity: row.quantity,
        laborCount: row.labor_count,
        constructionDays: row.construction_days,
        conflictDecision: row.templateConflictDecision ?? "keep",
        unit: row.unit || row.selectedSubitemUnit || "",
      });
    }
  });

  plan.newCategoryCandidates = Array.from(categoryCandidateMap.values());
  return plan;
}

function summarizeAiImportApplyPlan(plan) {
  return {
    priceUpdates: plan.priceUpdates.length,
    newCategoryCandidates: plan.newCategoryCandidates.length,
    newSubitemCandidates: plan.newSubitemCandidates.length,
    templateValueCandidates: plan.templateValueCandidates.length,
    costCandidates: plan.costCandidates.length,
    validationRows: plan.validationRows.length,
    reviewRows: plan.reviewRows.length,
    ignoredRows: plan.ignoredRows.length,
  };
}

function getAiPriceUpdateTargets(plan) {
  return (plan?.priceUpdates ?? []).filter((row) =>
    row?.matchedSubitemId &&
    row?.matchedItemId &&
    row?.willChange &&
    shouldApplyExcelConflict(row?.conflictDecision) &&
    (hasImportValue(row.excelUnitPrice) || hasImportValue(row.excelLaborRate) || hasImportValue(row.excelLaborRateEmpty) || hasImportValue(row.excelLaborRateOccupied))
  );
}

function getAiTemplateValueTargets(plan) {
  return (plan?.templateValueCandidates ?? []).filter((row) =>
    row?.rowType === "work_item" &&
    row?.matchedSubitemId &&
    row?.matchedItemId &&
    (hasImportValue(row.quantity) || hasImportValue(row.laborCount) || hasImportValue(row.constructionDays))
  );
}

function getAiNewItemTargets(rows) {
  return (rows ?? [])
    .filter((row) =>
      row?.rowType === "work_item" &&
      row?.action === "new" &&
      (formatExcelCellValue(row.sourceItemName).trim() || formatExcelCellValue(row.sourceCategory).trim())
    )
    .map((row) => {
      const sourceCategory = formatExcelCellValue(row.sourceCategory).trim();
      const sourceItemName = formatExcelCellValue(row.sourceItemName).trim();
      return {
        sourceRowNumber: row.sourceRowNumber,
        existingCategoryId: row.selectedCategoryId || row.categoryMatch?.matchedCategoryId || "",
        existingCategoryName: row.selectedCategoryName || row.categoryMatch?.matchedCategoryName || "",
        sourceCategory,
        categoryName: row.selectedCategoryName || row.categoryMatch?.matchedCategoryName || sourceCategory,
        subitemName: buildImportSubitemName(sourceItemName || sourceCategory, row.spec),
        spec: row.spec,
        unit: formatExcelCellValue(row.unit).trim() || "평",
        unitPrice: row.unit_price,
        laborRate: row.labor_rate,
        laborRateEmpty: row.labor_rate_empty,
        laborRateOccupied: row.labor_rate_occupied,
        isLumpSum: Boolean(row.isLumpSum),
      };
    })
    .filter((row) => row.categoryName && row.subitemName);
}

function summarizeAiNewItemTargets(targets = [], catalogItems = []) {
  const existingCategoryIds = new Set((catalogItems ?? []).map((item) => item.id).filter(Boolean));
  const existingCategoryNames = new Set((catalogItems ?? []).map((item) => normalizeCatalogMatchText(item.name)).filter(Boolean));
  const newCategoryNames = new Set();
  (targets ?? []).forEach((target) => {
    const normalizedCategoryName = normalizeCatalogMatchText(target.categoryName);
    if (
      normalizedCategoryName &&
      (!target.existingCategoryId || !existingCategoryIds.has(target.existingCategoryId)) &&
      !existingCategoryNames.has(normalizedCategoryName)
    ) {
      newCategoryNames.add(normalizedCategoryName);
    }
  });
  return {
    newCategoryCount: newCategoryNames.size,
    subitemCount: targets.length,
  };
}

function getAiSetupTemplateCondition(condition) {
  if (!isAiSetupApplyConditionComplete(condition)) return null;
  return buildTemplateCondition({
    pyeong: condition.pyeong,
    buildType: condition.buildType,
    hasExtension: condition.buildType === "old" && condition.conditionVariant !== OLD_NO_EXTENSION_VARIANT,
    conditionVariant: condition.conditionVariant,
  });
}

function parseAiImportTemplateNumber(value) {
  if (!hasImportValue(value)) return null;
  return parseAiImportCurrencyNumber(value);
}

function normalizePyeongValue(value) {
  const text = formatExcelCellValue(value);
  if (!text) return "";
  const candidates = findPyeongCandidatesInText(text);
  return candidates[0] ? String(candidates[0]) : "";
}

function matchPyeongOptionNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 5 || number >= 100) return "";
  const matched = PYEONG_OPTIONS.find((pyeong) => Number(pyeong) === Math.round(number));
  return matched ? String(matched) : "";
}

function findPyeongCandidatesInText(value) {
  const text = formatExcelCellValue(value);
  if (!text) return [];
  const matches = [];
  const pattern = /(?:전용|공급|실평수|계약면적)?\s*(\d{1,3})\s*(?:평형|평|py|p)(?![a-z])/gi;
  let match = pattern.exec(text);
  while (match) {
    const numberText = match[1];
    const number = Number(numberText);
    if (Number.isFinite(number) && number >= 5 && number < 100) {
      matches.push(number);
    }
    match = pattern.exec(text);
  }
  return matches;
}

function matchPyeongOptionValue(value) {
  const normalized = normalizePyeongValue(value);
  if (!normalized) return "";
  return matchPyeongOptionNumber(normalized);
}

function findAreaPyeongCandidatesInText(value) {
  const text = formatExcelCellValue(value);
  if (!text) return [];
  const matches = [];
  const patterns = [
    /(?:전용|공급|계약면적|면적)\s*(\d{2,3}(?:\.\d+)?)\s*(?:㎡|m2|m²|제곱미터)?/gi,
    /(\d{2,3}(?:\.\d+)?)\s*(?:㎡|m2|m²|제곱미터)/gi,
  ];

  patterns.forEach((pattern) => {
    let match = pattern.exec(text);
    while (match) {
      const area = Number(match[1]);
      const pyeong = matchPyeongOptionNumber(area / 3.3058);
      if (pyeong) matches.push(Number(pyeong));
      match = pattern.exec(text);
    }
  });

  return matches;
}

function resolveUniqueAiSetupCandidate(candidates) {
  const unique = [...new Set((candidates ?? []).filter(Boolean))];
  return unique.length === 1 ? unique[0] : "";
}

function detectAiSetupPyeong(texts) {
  const directCandidates = [];
  const areaCandidates = [];

  (texts ?? []).forEach((text) => {
    directCandidates.push(...findPyeongCandidatesInText(text).map(String));
    areaCandidates.push(...findAreaPyeongCandidatesInText(text).map(String));
  });

  return resolveUniqueAiSetupCandidate(directCandidates) || resolveUniqueAiSetupCandidate(areaCandidates);
}

function collectAiSetupConditionSearchTexts(fileName, sheet, previewRows = []) {
  const texts = [fileName, sheet?.name].filter(Boolean).map(formatExcelCellValue);
  const rows = sheet?.rows ?? [];
  rows.slice(0, 30).forEach((row) => {
    (row ?? []).forEach((cell) => {
      const text = formatExcelCellValue(cell).trim();
      if (text) texts.push(text);
    });
  });

  let extraCells = 0;
  for (const row of rows.slice(30)) {
    for (const cell of row ?? []) {
      if (extraCells >= 300) return texts;
      const text = formatExcelCellValue(cell).trim();
      if (!text) continue;
      texts.push(text);
      extraCells += 1;
    }
  }

  (previewRows ?? []).slice(0, 100).forEach((row) => {
    Object.values(row ?? {}).forEach((value) => {
      const text = formatExcelCellValue(value).trim();
      if (text) texts.push(text);
    });
  });

  return texts;
}

function detectAiSetupConditionVariant(joinedText) {
  const explicitCandidates = [];
  const explicitPattern = /확장형\s*([1-5])|구형\s*([0-5])/g;
  let explicitMatch = explicitPattern.exec(joinedText);
  while (explicitMatch) {
    const candidate = explicitMatch[1] ? `확장형${explicitMatch[1]}` : `구형${explicitMatch[2]}`;
    if (CONDITION_VARIANT_KEYS.includes(candidate)) explicitCandidates.push(candidate);
    explicitMatch = explicitPattern.exec(joinedText);
  }

  const explicitVariant = resolveUniqueAiSetupCandidate(explicitCandidates);
  if (explicitVariant) return explicitVariant;
  if (explicitCandidates.length > 1) return "";

  const noExtensionPattern = /(비확장|미확장|무확장|확장\s*없음|확장없음)/;
  const noExtensionReplacePattern = /(비확장|미확장|무확장|확장\s*없음|확장없음)/g;
  const hasNoExtension = noExtensionPattern.test(joinedText);
  const positiveExtensionText = joinedText.replace(noExtensionReplacePattern, " ");
  const hasExtension = /(확장|발코니\s*확장)/.test(positiveExtensionText);
  if (hasNoExtension && hasExtension) return "";
  if (hasNoExtension) return OLD_NO_EXTENSION_VARIANT;
  if (hasExtension && EXTENDED_VARIANTS.includes("확장형1")) return "확장형1";
  return "";
}

function detectAiSetupBuildType(joinedText, conditionVariant) {
  if (conditionVariant) {
    if (EXTENDED_VARIANTS.includes(conditionVariant)) return "new";
    if (conditionVariant === OLD_NO_EXTENSION_VARIANT || OLD_EXTENDED_VARIANTS.includes(conditionVariant)) return "old";
  }

  const newCandidates = /(신축|확장형|신규)/.test(joinedText);
  const oldCandidates = /(구형|구축|기축|노후)/.test(joinedText);
  if (newCandidates && oldCandidates) return "";
  if (newCandidates) return "new";
  if (oldCandidates) return "old";
  return "";
}

function detectAiSetupOccupancy(joinedText) {
  const emptyCandidate = /(빈집|공실|입주\s*전|이사\s*전)/.test(joinedText);
  const occupiedCandidate = /(살림집|거주\s*중|거주중|입주\s*후|이사\s*후|생활\s*중)/.test(joinedText);
  if (emptyCandidate && occupiedCandidate) return "";
  if (emptyCandidate) return "empty";
  if (occupiedCandidate) return "occupied";
  return "";
}

function detectAiSetupConditionHint(fileName, sheet, previewRows = []) {
  const texts = collectAiSetupConditionSearchTexts(fileName, sheet, previewRows);
  const joined = texts.join(" ");
  const pyeong = detectAiSetupPyeong(texts);
  const conditionVariant = detectAiSetupConditionVariant(joined);
  const buildType = detectAiSetupBuildType(joined, conditionVariant);
  const occupancy = detectAiSetupOccupancy(joined);

  return {
    pyeong: matchPyeongOptionValue(`${pyeong}평`),
    buildType,
    conditionVariant,
    occupancy,
    detected: Boolean(pyeong || buildType || conditionVariant || occupancy),
  };
}

function hasAiSetupConditionHintValue(hint) {
  return Boolean(hint?.pyeong || hint?.buildType || hint?.conditionVariant || hint?.occupancy);
}

function isAiSetupApplyConditionComplete(condition) {
  return Boolean(condition?.pyeong && condition?.buildType && condition?.conditionVariant && condition?.occupancy);
}

function getAiSetupApplyConditionLabel(condition, variantLabels = {}) {
  if (!condition?.pyeong && !condition?.buildType && !condition?.conditionVariant && !condition?.occupancy) return "";
  const pyeongLabel = condition.pyeong ? `${condition.pyeong}평` : "평수 선택 안 함";
  const houseType = condition.buildType === "new" ? "확장형" : condition.buildType === "old" ? "구형" : "주택 유형 선택 안 함";
  const variantLabel = condition.conditionVariant
    ? formatConditionVariantLabel(condition.conditionVariant, variantLabels)
    : "세부 유형 선택 안 함";
  const occupancyLabel = condition.occupancy === "empty"
    ? "빈집"
    : condition.occupancy === "occupied"
      ? "살림집"
      : "거주 상태 선택 안 함";
  return [
    pyeongLabel,
    houseType,
    variantLabel,
    occupancyLabel,
  ].join(" / ");
}

function getAiSetupConditionHintRows(hint, variantLabels = {}) {
  return [
    { label: "평수", value: hint?.pyeong ? `${hint.pyeong}평` : "감지 안 됨" },
    { label: "주택 유형", value: hint?.buildType === "new" ? "확장형" : hint?.buildType === "old" ? "구형" : "감지 안 됨" },
    { label: "세부 유형", value: hint?.conditionVariant ? formatConditionVariantLabel(hint.conditionVariant, variantLabels) : "감지 안 됨" },
    { label: "거주 상태", value: hint?.occupancy === "empty" ? "빈집" : hint?.occupancy === "occupied" ? "살림집" : "감지 안 됨" },
  ];
}

function getAiApplyReadiness(condition, summary, target = EXCEL_IMPORT_TARGETS.PRICES) {
  const hasCondition = isAiSetupApplyConditionComplete(condition);
  const saveCandidateCount = target === EXCEL_IMPORT_TARGETS.TEMPLATES
    ? (summary?.templateValueCandidates ?? 0)
    : (summary?.priceUpdates ?? 0) + (summary?.newCategoryCandidates ?? 0) + (summary?.newSubitemCandidates ?? 0);

  if (target === EXCEL_IMPORT_TARGETS.TEMPLATES && !hasCondition && (summary?.templateValueCandidates ?? 0) > 0) {
    return { status: "needs_condition", label: "조건 선택 필요" };
  }
  if ((summary?.reviewRows ?? 0) > 0) {
    return { status: "needs_review", label: "검토 필요 행 확인 필요" };
  }
  if (saveCandidateCount === 0) {
    return { status: "empty", label: "저장 후보 없음" };
  }
  return { status: "ready", label: "저장 전 최종 확인 가능" };
}

function getAiSetupStepStatusLabel(status) {
  const labels = {
    done: "완료",
    active: "진행 중",
    pending: "대기",
    warning: "확인 필요",
  };
  return labels[status] ?? "대기";
}

function hasAiSetupApplyPlanCandidate(summary = {}) {
  return Object.values(summary).some((count) => Number(count) > 0);
}

function getAiSetupFlowState({
  fileName,
  status,
  selectedSheet,
  hasHeader,
  recognizedCount,
  previewRowCount,
  mappedColumnCount,
  aiLoading,
  aiResult,
  catalogMatchRowCount,
  reviewRowCount,
  conditionComplete,
  applyPlanSummary,
  priceTargetCount,
  newItemTargetCount,
  templateTargetCount,
}) {
  const hasFile = Boolean(fileName);
  const hasSheet = Boolean(selectedSheet);
  const hasPreview = previewRowCount > 0 && mappedColumnCount > 0;
  const hasApplyPlan = hasAiSetupApplyPlanCandidate(applyPlanSummary);
  const hasSaveTarget = priceTargetCount + newItemTargetCount + (conditionComplete ? templateTargetCount : 0) > 0;

  const steps = [
    {
      number: 1,
      title: "엑셀 업로드",
      status: !hasFile ? "active" : status === "error" ? "warning" : "done",
      detail: !hasFile ? "파일을 선택하세요." : status === "error" ? "파일 읽기를 확인하세요." : "파일을 읽었습니다.",
    },
    {
      number: 2,
      title: "시트/헤더 확인",
      status: !hasFile ? "pending" : hasSheet && hasHeader ? "done" : hasSheet ? "warning" : "active",
      detail: hasSheet && hasHeader ? "헤더 행이 선택됐습니다." : hasSheet ? "헤더 행을 확인하세요." : "분석할 시트를 선택하세요.",
    },
    {
      number: 3,
      title: "열 매핑 확인",
      status: !hasHeader ? "pending" : hasPreview ? "done" : recognizedCount > 0 ? "warning" : "warning",
      detail: hasPreview ? "표준 필드 미리보기가 준비됐습니다." : "필드 매핑을 확인하세요.",
    },
    {
      number: 4,
      title: "AI 매칭 추천",
      status: !hasPreview ? "pending" : aiLoading ? "active" : aiResult ? "done" : "active",
      detail: aiResult ? "추천 결과가 적용됐습니다." : aiLoading ? "추천을 분석 중입니다." : "AI 추천을 실행할 수 있습니다.",
    },
    {
      number: 5,
      title: "항목 검토",
      status: !catalogMatchRowCount ? "pending" : reviewRowCount > 0 ? "warning" : "done",
      detail: reviewRowCount > 0 ? "검토 필요 행이 남아 있습니다." : catalogMatchRowCount ? "매칭 검토가 정리됐습니다." : "표준 행을 먼저 준비하세요.",
    },
    {
      number: 6,
      title: "공사 조건 선택",
      status: !hasHeader ? "pending" : conditionComplete ? "done" : templateTargetCount > 0 ? "warning" : "active",
      detail: conditionComplete ? "템플릿 저장 조건이 준비됐습니다." : "평수와 조건을 선택하세요.",
    },
    {
      number: 7,
      title: "반영 계획 확인",
      status: !hasHeader ? "pending" : hasApplyPlan ? "done" : "warning",
      detail: hasApplyPlan ? "반영 후보가 정리됐습니다." : "저장 후보가 없습니다.",
    },
    {
      number: 8,
      title: "저장/반영",
      status: hasSaveTarget ? "active" : hasApplyPlan ? "warning" : "pending",
      detail: hasSaveTarget ? "필요한 항목만 저장하세요." : hasApplyPlan ? "저장 조건을 확인하세요." : "저장할 후보가 없습니다.",
    },
  ];

  let nextAction = "저장 전 반영 계획을 확인한 뒤 필요한 항목만 반영해주세요.";
  if (!hasFile) nextAction = "엑셀 견적서 파일을 업로드해주세요.";
  else if (status === "error") nextAction = "파일 읽기 오류를 확인하고 다시 업로드해주세요.";
  else if (!hasSheet) nextAction = "분석할 시트를 선택해주세요.";
  else if (!hasHeader) nextAction = "헤더 행을 자동으로 찾지 못했습니다. 헤더 행을 직접 선택해주세요.";
  else if (!hasPreview) nextAction = "열 매핑을 확인하고 필요한 필드를 수정해주세요.";
  else if (!aiResult) nextAction = "AI로 매칭 추천을 실행한 뒤 결과를 검토해주세요.";
  else if (reviewRowCount > 0) nextAction = "검토 필요 행을 확인하고 행 유형/처리 방식을 조정해주세요.";
  else if (templateTargetCount > 0 && !conditionComplete) nextAction = "템플릿 저장을 위해 평수/주택 유형/세부 유형/거주 상태를 선택해주세요.";
  else if (!hasApplyPlan) nextAction = "저장할 후보가 없습니다. 매칭 상태와 처리 방식을 확인해주세요.";

  return { steps, nextAction };
}

export default function AdminApp() {
  const printableEstimateDocumentRef = useRef(null);
  const estimatePhotoRequestRef = useRef("");
  const estimateBlankCatalogRequestRef = useRef(0);
  const estimateListRequestRef = useRef(0);
  const estimateListResourceRef = useRef({ status: "idle", companyId: "", scopeKey: "estimates" });
  const conditionLabelsRequestRef = useRef(0);
  const conditionLabelsResourceRef = useRef({ status: "idle", companyId: "", scopeKey: "condition-labels" });
  const adminTemplatesCompanyIdRef = useRef("");
  const estimateDeleteTriggerRef = useRef(null);
  const estimateAggregateIdRef = useRef(null);
  const estimateClientDraftKeyRef = useRef(createEstimateDraftKey());
  const currentAdminTemplateConditionRef = useRef(null);
  const estimateConditionRef = useRef(null);
  const estimatePyeongApplyRef = useRef(null);
  const estimatePyeongInvalidateRef = useRef(null);
  const estimatePyeongChangeRef = useRef(null);
  const skipNextEstimatePyeongBlurRef = useRef(false);
  const estimateTemplateConflictScrollRef = useRef(null);
  const {
    companySession,
    authUser,
    loginCode, setLoginCode,
    loginPassword, setLoginPassword,
    loginLoading,
    loginError, setLoginError,
    authScreenMode, setAuthScreenMode,
    adminVerifyOpen, setAdminVerifyOpen,
    adminVerifyPassword, setAdminVerifyPassword,
    adminVerifyLoading, setAdminVerifyLoading,
    adminVerifyError, setAdminVerifyError,
    login: loginAppSession,
    logout: logoutAppSession,
  } = useAppSession();
  const [pendingAdminPage, setPendingAdminPage] = useState("admin");
  const [navigationHistory, setNavigationHistory] = useState(() =>
    createInternalPageHistory(pageFromHash())
  );
  const page = getCurrentInternalPage(navigationHistory);

  function setPage(nextPage) {
    setNavigationHistory((current) => pushInternalPage(current, nextPage));
  }
  const [contractEditorTarget, setContractEditorTarget] = useState(null);
  const [step, setStep] = useState(1);
  const {
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
  } = useEstimateDraft();
  estimateConditionRef.current = condition;
  if (!estimatePyeongChangeRef.current) {
    estimatePyeongChangeRef.current = createEstimatePyeongChange({
      apply: (pyeong) => estimatePyeongApplyRef.current?.(pyeong),
      invalidate: () => estimatePyeongInvalidateRef.current?.(),
    });
  }
  const estimateItemsRef = useRef(items);
  estimateItemsRef.current = items;
  const estimateAutoSaveTimerRef = useRef(null);
  const estimateAutoSaveRunningRef = useRef(false);
  const estimateAutoSaveQueuedRef = useRef(false);
  const estimateAutoSaveRunnerRef = useRef(null);
  estimateAutoSaveRunnerRef.current = () => saveEstimateToSupabase({ auto: true });
  useEffect(() => () => {
    if (estimateAutoSaveTimerRef.current !== null) {
      globalThis.clearTimeout(estimateAutoSaveTimerRef.current);
    }
  }, []);
  const [estimatePhotoViewerIndex, setEstimatePhotoViewerIndex] = useState(null);
  const [selectedAdminPyeong, setSelectedAdminPyeong] = useState("");
  const [selectedAdminBuildType, setSelectedAdminBuildType] = useState("");
  const [selectedAdminHasExtension, setSelectedAdminHasExtension] = useState(false);
  const [selectedAdminConditionVariant, setSelectedAdminConditionVariant] = useState("");
  const [adminTemplates, setAdminTemplates] = useState([]);
  const [templateDeleteTarget, setTemplateDeleteTarget] = useState(null);
  const [templateDeletePassword, setTemplateDeletePassword] = useState("");
  const [templateDeleteLoading, setTemplateDeleteLoading] = useState(false);
  const [templateDeleteError, setTemplateDeleteError] = useState("");
  const [currentAdminTemplateId, setCurrentAdminTemplateId] = useState("");
  const [adminConditionStep, setAdminConditionStep] = useState("select");
  const [adminTemplateOrder, setAdminTemplateOrder] = useState([]);
  const [dragAdminTemplateId, setDragAdminTemplateId] = useState("");
  const [dragOverAdminTemplateId, setDragOverAdminTemplateId] = useState("");
  const [adminTemplateConditionDrawerOpen, setAdminTemplateConditionDrawerOpen] = useState(false);
  const [adminTemplateConditionDraft, setAdminTemplateConditionDraft] = useState(createEmptyAdminTemplateConditionDraft);
  const [adminTemplateConditionDrawerMode, setAdminTemplateConditionDrawerMode] = useState("create");
  const [adminTemplateConditionSourceId, setAdminTemplateConditionSourceId] = useState("");
  const [adminTemplateFavoriteIds, setAdminTemplateFavoriteIds] = useState([]);
  const [adminTemplateRecentIds, setAdminTemplateRecentIds] = useState([]);
  const [lastSelectedAdminTemplateId, setLastSelectedAdminTemplateId] = useState("");
  const [adminTemplatePreferencesReady, setAdminTemplatePreferencesReady] = useState(false);
  const [newlyCreatedAdminTemplateKey, setNewlyCreatedAdminTemplateKey] = useState("");
  const [conditionVariantLabels, setConditionVariantLabels] = useState(() => createConditionVariantLabelRows());
  const [conditionLabelsResource, setConditionLabelsResource] = useState({
    status: "idle",
    companyId: "",
    scopeKey: "condition-labels",
  });
  const {
    adminCommonPriceSavedAt,
    adminCatalogResource,
    adminCatalogResourceRef,
    adminError,
    adminFavoriteOnly,
    adminItems,
    adminItemsRef,
    adminNotice,
    adminPriceValidationError,
    adminSaving,
    adminSearch,
    adminSearchTerm,
    adminUnsavedLeaveError,
    adminUnsavedLeaveOpen,
    adminUnsavedLeaveSaving,
    autoSaveError,
    autoSaveSavedAt,
    autoSaveStatus,
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
    scrollToAdminPriceRow,
    selectedAdminCategoryId,
    selectedSubitemIdByProduct,
    setAdminCommonPriceSavedAt,
    setAdminCatalogResource,
    setAdminError,
    setAdminFavoriteOnly,
    setAdminItems,
    setAdminNotice,
    setAdminPriceRowRef,
    setAdminPriceValidationError,
    setAdminSaving,
    setAdminSearch,
    setAdminUnsavedLeaveError,
    setAdminUnsavedLeaveOpen,
    setAdminUnsavedLeaveSaving,
    setDragItemId,
    setDragOverItemId,
    setDragOverSubitem,
    setDragSubitem,
    setExpandedAdminItemIds,
    setNewlyAddedSubitemId,
    setSelectedAdminCategoryId,
    setSelectedSubitemIdByProduct,
  } = usePriceTableController({
    page,
    adminConditionStep,
    isCatalogEditing:
      page === "admin-prices"
      || (page === "admin-items" && adminConditionStep === "edit"),
    canSelectCategory:
      page === "admin-prices"
      || (page === "admin-items" && adminConditionStep === "edit"),
    onAutoSave: async (target) => {
      try {
        return await saveAdminPrices({
          auto: true,
          target,
          stayOnPage: true,
          refetch: false,
        });
      } catch (error) {
        throw new Error(
          getFriendlyError(
            error,
            "자동 저장에 실패했습니다. 저장하기 버튼을 눌러주세요."
          )
        );
      }
    },
  });
  const [estimates, setEstimates] = useState([]);
  const [trashedEstimates, setTrashedEstimates] = useState([]);
  const [estimateListResource, setEstimateListResource] = useState({
    status: "idle",
    companyId: "",
    scopeKey: "estimates",
  });
  const [estimateSearch, setEstimateSearch] = useState("");
  const [estimateListView, setEstimateListView] = useState("active");
  const [estimateListCounts, setEstimateListCounts] = useState({ active: 0, trash: 0 });
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [estimateDeleteTarget, setEstimateDeleteTarget] = useState(null);
  const [estimateDeleteLoading, setEstimateDeleteLoading] = useState(false);
  const [estimateDeleteError, setEstimateDeleteError] = useState("");
  const [estimateDeleteNotice, setEstimateDeleteNotice] = useState("");
  const [estimateRestoreLoadingId, setEstimateRestoreLoadingId] = useState("");
  const [shareEstimateTarget, setShareEstimateTarget] = useState(null);
  const [pyeongDropdownOpen, setPyeongDropdownOpen] = useState(false);
  const [adminPyeongDropdownOpen, setAdminPyeongDropdownOpen] = useState(false);
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [excelImportTarget, setExcelImportTarget] = useState(EXCEL_IMPORT_TARGETS.PRICES);
  const [excelExportTarget, setExcelExportTarget] = useState("");
  const [excelExportError, setExcelExportError] = useState("");
  const aiSetupController = useAiSetup();
  const {
    aiSetupFileName, setAiSetupFileName, aiSetupStatus, setAiSetupStatus,
    aiSetupError, setAiSetupError, aiSetupSheets, setAiSetupSheets,
    aiSetupImportContext, setAiSetupImportContext,
    selectedAiSetupSheetName, setSelectedAiSetupSheetName,
    aiSetupHeaderRowIndex, setAiSetupHeaderRowIndex,
    aiSetupColumnMappings, setAiSetupColumnMappings,
    aiSetupCatalogItems, setAiSetupCatalogItems,
    aiSetupCatalogLoading, setAiSetupCatalogLoading,
    aiSetupCatalogError, setAiSetupCatalogError,
    aiSetupMatchOverrides, setAiSetupMatchOverrides,
    aiSetupApplyCondition, setAiSetupApplyCondition,
    aiSetupApplyConditionTouched, setAiSetupApplyConditionTouched,
    aiSetupPriceConfirmOpen, setAiSetupPriceConfirmOpen,
    aiSetupPriceSaving, setAiSetupPriceSaving, aiSetupPriceResult, setAiSetupPriceResult,
    aiSetupPriceError, setAiSetupPriceError,
    aiSetupTemplateConfirmOpen, setAiSetupTemplateConfirmOpen,
    aiSetupTemplateSaving, setAiSetupTemplateSaving,
    aiSetupTemplateResult, setAiSetupTemplateResult,
    aiSetupTemplateError, setAiSetupTemplateError,
    aiSetupNewItemConfirmOpen, setAiSetupNewItemConfirmOpen,
    aiSetupNewItemSaving, setAiSetupNewItemSaving,
    aiSetupNewItemResult, setAiSetupNewItemResult,
    aiSetupNewItemError, setAiSetupNewItemError,
    aiSetupAiLoading, setAiSetupAiLoading, aiSetupAiError, setAiSetupAiError,
    aiSetupAiResult, setAiSetupAiResult,
    aiSetupAdvancedOpen, setAiSetupAdvancedOpen,
    aiSetupStandardOpen, setAiSetupStandardOpen, aiSetupRawOpen, setAiSetupRawOpen,
    aiSetupMatchReviewOpen, setAiSetupMatchReviewOpen,
    aiSetupMatchReviewMode, setAiSetupMatchReviewMode,
    aiSetupSplitReviewOpen, setAiSetupSplitReviewOpen,
    aiSetupApplyPlanOpen, setAiSetupApplyPlanOpen,
    aiSetupSaveGuideOpen, setAiSetupSaveGuideOpen,
  } = aiSetupController;

  const selectedCompany = companySession.company;
  const selectedCompanyId = selectedCompany?.id ?? "";
  const selectedCompanyName = selectedCompany?.name ?? "";
  const selectedCompanyIdRef = useRef(selectedCompanyId);
  const adminCatalogLoadRequestRef = useRef(0);
  const adminCatalogSnapshotRef = useRef({ companyId: "", snapshot: null });
  const adminCatalogBootstrapAttemptedRef = useRef(new Set());
  selectedCompanyIdRef.current = selectedCompanyId;

  function updateEstimateListResource(nextResource) {
    const resolvedResource = typeof nextResource === "function"
      ? nextResource(estimateListResourceRef.current)
      : nextResource;
    estimateListResourceRef.current = resolvedResource;
    setEstimateListResource(resolvedResource);
  }

  function updateConditionLabelsResource(nextResource) {
    const resolvedResource = typeof nextResource === "function"
      ? nextResource(conditionLabelsResourceRef.current)
      : nextResource;
    conditionLabelsResourceRef.current = resolvedResource;
    setConditionLabelsResource(resolvedResource);
  }
  const photoManagement = usePhotoManagement({
    companyId: selectedCompanyId,
    createPhotoId: createStorageSafeId,
    getFriendlyError,
  });
  const {
    refresh: refreshPhotoCatalog,
    reset: resetPhotoManagement,
  } = photoManagement;
  const detailCostsController = useDetailCosts({
    companyId: selectedCompanyId,
    getFriendlyError,
  });
  const {
    selectedSubitemId: selectedDetailSubitemId,
    loadSubitems: fetchDetailSubitems,
    loadCosts: fetchDetailCosts,
    reset: resetDetailCosts,
  } = detailCostsController;
  const authUserMetadata = authUser?.user_metadata ?? {};
  const accountDisplayName = `${authUserMetadata.display_name || authUserMetadata.full_name || authUserMetadata.name || "운영자"}`.trim();
  const accountAvatarUrl = `${authUserMetadata.avatar_url || authUserMetadata.picture || ""}`.trim();
  const estimateCreatedDate = useMemo(() => formatDisplayDate(estimateIssuedAt), [estimateIssuedAt]);
  const estimateValidUntil = useMemo(
    () => formatDisplayDate(addDaysToDateInput(estimateIssuedAt, 30)),
    [estimateIssuedAt]
  );
  const adminVerified = isAdminVerifiedForCompany(selectedCompanyId);
  const isProtectedAdminPage = PROTECTED_ADMIN_PAGES.includes(page);
  const isCommonPriceAdminPage = page === "admin-prices";
  const isConditionQuantityAdminPage = page === "admin-items";

  const conditionKey = useMemo(() => makeConditionKey(condition), [condition]);
  const estimateNumber = useMemo(
    () => `FM-${estimateIssuedAt.replaceAll("-", "")}-${String(Math.abs(conditionKey.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0))).padStart(4, "0").slice(-4)}`,
    [conditionKey, estimateIssuedAt]
  );
  const conditionVariantLabelMap = useMemo(
    () => makeConditionVariantLabelMap(conditionVariantLabels),
    [conditionVariantLabels]
  );
  const estimateConditionVariantLabelMap = useMemo(
    () => mergeConditionVariantLabelOverrides(conditionVariantLabelMap, estimateConditionVariantLabels),
    [conditionVariantLabelMap, estimateConditionVariantLabels]
  );
  const conditionSummary = useMemo(
    () => makeConditionSummary(condition, estimateConditionVariantLabelMap),
    [condition, estimateConditionVariantLabelMap]
  );
  const conditionChips = useMemo(
    () => makeConditionChips(condition, estimateConditionVariantLabelMap),
    [condition, estimateConditionVariantLabelMap]
  );
  const estimateTemplateConflictByRowKey = useMemo(
    () => new Map(estimateTemplateConflicts.map((conflict) => [conflict.rowKey, conflict])),
    [estimateTemplateConflicts]
  );
  const estimateTemplateConflictValueCount = useMemo(
    () => estimateTemplateConflicts.reduce((count, conflict) => count + conflict.fields.length, 0),
    [estimateTemplateConflicts]
  );
  const activeEstimateConditionVariant = getConditionVariant(condition);
  const activeEstimateConditionVariantLabel = getConditionVariantLabel(activeEstimateConditionVariant, estimateConditionVariantLabelMap);

  const selectedRows = useMemo(() => {
    return buildSelectedEstimateRows({
      items,
      estimateCatalog,
      fallbackCategories: categories,
      conditionPyeong: condition.size,
      estimatePyeong,
      getSpecLabel: getEstimateRowSpecLabel,
    });
  }, [condition.size, estimateCatalog, estimatePyeong, items]);

  const cleanEstimateAdjustments = useMemo(
    () => getCleanEstimateAdjustments(estimateAdjustments, () => createLocalId("adjustment")),
    [estimateAdjustments]
  );
  const {
    selectedItemsTotal,
    adjustmentTotal,
    finalTotal: total,
    constructionDaysTotal: selectedConstructionDaysTotal,
    constructionDayParts: selectedConstructionDayParts,
    rowsByCategory: selectedRowsByCategory,
    customerVisibleAdjustments,
  } = buildEstimateSummary(selectedRows, cleanEstimateAdjustments);
  const visibleEstimates = useMemo(() => {
    const sourceRows = estimateListView === "trash" ? trashedEstimates : estimates;
    return sourceRows.filter((estimate) => doesSavedEstimateMatchSearch(estimate, estimateSearch));
  }, [estimateListView, estimateSearch, estimates, trashedEstimates]);
  const savedEstimateColumns = useMemo(() => (
    estimateListView === "trash"
      ? [
          { key: "customer", label: "고객명", width: "14%" },
          { key: "address", label: "현장 주소", width: "22%" },
          { key: "estimateNumber", label: "견적번호", width: "14%" },
          { key: "createdAt", label: "작성일", width: "10%" },
          { key: "deletedAt", label: "삭제일", width: "10%" },
          { key: "amount", label: "총액", align: "right", width: "12%" },
          { key: "actions", label: "작업", align: "right", width: "110px" },
        ]
      : [
          { key: "customer", label: "고객명", width: "14%" },
          { key: "address", label: "현장 주소", width: "20%" },
          { key: "status", label: "견적 상태", width: "10%" },
          { key: "createdAt", label: "작성일", width: "11%" },
          { key: "constructionDays", label: "예상시공일", align: "right", width: "10%" },
          { key: "constructionDate", label: "시공 예정일", width: "12%" },
          { key: "amount", label: "총액", align: "right", width: "12%" },
          { key: "actions", label: "작업", align: "right", width: "270px" },
        ]
  ), [estimateListView]);
  const savedEstimateRows = useMemo(() => visibleEstimates.map((estimate) => ({
    id: estimate.id,
    estimate,
    customer: getSavedEstimateCustomerName(estimate) || "고객명 미입력",
    address: estimate.address || "주소 미입력",
    status: estimate.status || "draft",
    estimateNumber: `${getEstimateItemsDataMeta(estimate.items_data).estimateNumber ?? ""}`.trim() || "-",
    createdAt: estimate.created_at ? new Date(estimate.created_at).toLocaleDateString("ko-KR") : "-",
    deletedAt: estimate.deleted_at ? new Date(estimate.deleted_at).toLocaleDateString("ko-KR") : "-",
    constructionDays: getEstimateItemsDataConstructionDaysTotal(estimate.items_data),
    constructionDate: estimate.construction_date || "-",
    amount: estimate.total_amount || 0,
  })), [visibleEstimates]);
  const previewEstimate = estimateAggregateIdRef.current
    ? estimates.find((estimate) => estimate.id === estimateAggregateIdRef.current) ?? null
    : null;
  const previewEstimateShareAction = getEstimateShareAction(previewEstimate);
  const previewEstimateContractTarget = getApprovedEstimateContractTarget(previewEstimate);
  const selectedEstimateContractTarget = getApprovedEstimateContractTarget(selectedEstimate);
  const recentHomeEstimates = useMemo(() =>
    [...estimates]
      .filter(isOperationalEstimate)
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 8),
    [estimates]
  );
  const currentCategory =
    estimateCatalog.find((category) => category.id === openCategory) ??
    categories.find((category) => category.id === openCategory);
  const selectedEstimateItems = selectedEstimate
    ? getEstimateItemsDataItems(selectedEstimate.items_data)
    : [];
  const selectedEstimateAdjustments = selectedEstimate
    ? getEstimateItemsDataAdjustments(selectedEstimate.items_data)
    : [];
  const selectedEstimateSiteMemo = selectedEstimate
    ? getEstimateItemsDataSiteMemo(selectedEstimate.items_data)
    : "";
  const selectedAiSetupSheet = useMemo(() => {
    return aiSetupSheets.find((sheet) => sheet.name === selectedAiSetupSheetName) ?? aiSetupSheets[0] ?? null;
  }, [aiSetupSheets, selectedAiSetupSheetName]);
  const aiSetupPreviewRows = useMemo(() => {
    return selectedAiSetupSheet ? selectedAiSetupSheet.rows.slice(0, 100) : [];
  }, [selectedAiSetupSheet]);
  const aiSetupAutoMappingAnalysis = useMemo(() => {
    return analyzeExcelSheetForFormate(selectedAiSetupSheet);
  }, [selectedAiSetupSheet]);
  const aiSetupMappingAnalysis = useMemo(() => {
    return createExcelMappingAnalysisFromManual(selectedAiSetupSheet, aiSetupHeaderRowIndex, aiSetupColumnMappings);
  }, [aiSetupColumnMappings, aiSetupHeaderRowIndex, selectedAiSetupSheet]);
  const aiSetupHeaderRowOptions = useMemo(() => {
    return (selectedAiSetupSheet?.rows ?? []).slice(0, 30).map((row, index) => ({
      index,
      label: `${index + 1}행: ${summarizeExcelHeaderRow(row)}`,
    }));
  }, [selectedAiSetupSheet]);
  const aiSetupMappedPreviewColumns = useMemo(() => {
    return createExcelPreviewColumns(aiSetupMappingAnalysis.mappings);
  }, [aiSetupMappingAnalysis.mappings]);
  const aiSetupDuplicateWarnings = useMemo(() => {
    return getExcelDuplicateMappingWarnings(aiSetupMappingAnalysis.mappings);
  }, [aiSetupMappingAnalysis.mappings]);
  const aiSetupCompanyScopedPreviewRows = useMemo(() => {
    return prepareExcelImportRowsForCompany(
      aiSetupMappingAnalysis.previewRows,
      aiSetupImportContext
    );
  }, [aiSetupImportContext, aiSetupMappingAnalysis.previewRows]);
  const aiSetupCatalogMatchRows = useMemo(() => {
    return createAiCatalogMatchRows(aiSetupCompanyScopedPreviewRows, aiSetupCatalogItems, aiSetupMatchOverrides);
  }, [aiSetupCatalogItems, aiSetupCompanyScopedPreviewRows, aiSetupMatchOverrides]);
  const aiSetupSplitValidationSummaries = useMemo(() => {
    return createAiSplitValidationSummaries(aiSetupCatalogMatchRows);
  }, [aiSetupCatalogMatchRows]);
  const aiSetupCatalogMatchSummary = useMemo(() => {
    return summarizeAiCatalogMatchRows(aiSetupCatalogMatchRows);
  }, [aiSetupCatalogMatchRows]);
  const aiSetupImportApplyPlan = useMemo(() => {
    return createAiImportApplyPlan(aiSetupCatalogMatchRows);
  }, [aiSetupCatalogMatchRows]);
  const aiSetupImportApplyPlanSummary = useMemo(() => {
    return summarizeAiImportApplyPlan(aiSetupImportApplyPlan);
  }, [aiSetupImportApplyPlan]);
  const aiSetupPriceUpdateTargets = useMemo(() => {
    return getAiPriceUpdateTargets(aiSetupImportApplyPlan);
  }, [aiSetupImportApplyPlan]);
  const aiSetupTemplateValueTargets = useMemo(() => {
    return getAiTemplateValueTargets(aiSetupImportApplyPlan);
  }, [aiSetupImportApplyPlan]);
  const aiSetupNewItemTargets = useMemo(() => {
    return getAiNewItemTargets(aiSetupCatalogMatchRows);
  }, [aiSetupCatalogMatchRows]);
  const aiSetupNewItemSummary = useMemo(() => {
    return summarizeAiNewItemTargets(aiSetupNewItemTargets, aiSetupCatalogItems);
  }, [aiSetupCatalogItems, aiSetupNewItemTargets]);
  const aiSetupDetectedConditionHint = useMemo(() => {
    return detectAiSetupConditionHint(aiSetupFileName, selectedAiSetupSheet, aiSetupMappingAnalysis.previewRows);
  }, [aiSetupFileName, aiSetupMappingAnalysis.previewRows, selectedAiSetupSheet]);
  const aiSetupApplyConditionLabel = useMemo(() => {
    return getAiSetupApplyConditionLabel(aiSetupApplyCondition, conditionVariantLabelMap);
  }, [aiSetupApplyCondition, conditionVariantLabelMap]);
  const aiSetupApplyConditionComplete = useMemo(() => {
    return isAiSetupApplyConditionComplete(aiSetupApplyCondition);
  }, [aiSetupApplyCondition]);
  const aiSetupApplyReadiness = useMemo(() => {
    return getAiApplyReadiness(aiSetupApplyCondition, aiSetupImportApplyPlanSummary, excelImportTarget);
  }, [aiSetupApplyCondition, aiSetupImportApplyPlanSummary, excelImportTarget]);
  const aiSetupFlowState = useMemo(() => {
    return getAiSetupFlowState({
      fileName: aiSetupFileName,
      status: aiSetupStatus,
      selectedSheet: selectedAiSetupSheet,
      hasHeader: aiSetupMappingAnalysis.hasHeader,
      recognizedCount: aiSetupMappingAnalysis.recognizedCount,
      previewRowCount: aiSetupMappingAnalysis.previewRows.length,
      mappedColumnCount: aiSetupMappedPreviewColumns.length,
      aiLoading: aiSetupAiLoading,
      aiResult: aiSetupAiResult,
      catalogMatchRowCount: aiSetupCatalogMatchRows.length,
      reviewRowCount: aiSetupImportApplyPlanSummary.reviewRows,
      conditionComplete: excelImportTarget === EXCEL_IMPORT_TARGETS.PRICES || aiSetupApplyConditionComplete,
      applyPlanSummary: aiSetupImportApplyPlanSummary,
      priceTargetCount: aiSetupPriceUpdateTargets.length,
      newItemTargetCount: aiSetupNewItemTargets.length,
      templateTargetCount: excelImportTarget === EXCEL_IMPORT_TARGETS.TEMPLATES ? aiSetupTemplateValueTargets.length : 0,
    });
  }, [
    aiSetupAiLoading,
    aiSetupAiResult,
    aiSetupApplyConditionComplete,
    aiSetupCatalogMatchRows.length,
    aiSetupFileName,
    aiSetupImportApplyPlanSummary,
    aiSetupMappedPreviewColumns.length,
    aiSetupMappingAnalysis.hasHeader,
    aiSetupMappingAnalysis.previewRows.length,
    aiSetupMappingAnalysis.recognizedCount,
    aiSetupNewItemTargets.length,
    aiSetupPriceUpdateTargets.length,
    aiSetupStatus,
    aiSetupTemplateValueTargets.length,
    excelImportTarget,
    selectedAiSetupSheet,
  ]);
  const aiSetupAutoSelectedFields = useMemo(() => {
    return {
      pyeong: Boolean(aiSetupDetectedConditionHint.pyeong && aiSetupApplyCondition.pyeong === aiSetupDetectedConditionHint.pyeong && !aiSetupApplyConditionTouched.pyeong),
      buildType: Boolean(aiSetupDetectedConditionHint.buildType && aiSetupApplyCondition.buildType === aiSetupDetectedConditionHint.buildType && !aiSetupApplyConditionTouched.buildType),
      conditionVariant: Boolean(aiSetupDetectedConditionHint.conditionVariant && aiSetupApplyCondition.conditionVariant === aiSetupDetectedConditionHint.conditionVariant && !aiSetupApplyConditionTouched.conditionVariant),
      occupancy: Boolean(aiSetupDetectedConditionHint.occupancy && aiSetupApplyCondition.occupancy === aiSetupDetectedConditionHint.occupancy && !aiSetupApplyConditionTouched.occupancy),
    };
  }, [aiSetupApplyCondition, aiSetupApplyConditionTouched, aiSetupDetectedConditionHint]);
  const hasAiSetupAutoSelectedCondition = Object.values(aiSetupAutoSelectedFields).some(Boolean);
  const aiSetupStatusLabel =
    aiSetupStatus === "reading"
      ? "파일 읽는 중"
      : aiSetupStatus === "analyzing"
        ? "시트 분석 중"
        : aiSetupStatus === "mapping"
          ? "항목 매핑 중"
          : aiSetupStatus === "success"
            ? "검토 결과 준비 완료"
            : aiSetupStatus === "error"
              ? "읽기 실패"
              : "대기 중";
  const aiSetupAdvancedReviewCount =
    (aiSetupMappingAnalysis.hasHeader ? 0 : 1) +
    (aiSetupMappingAnalysis.unknownCount ?? 0) +
    aiSetupDuplicateWarnings.length;
  const aiSetupAdvancedBadges = [
    aiSetupMappingAnalysis.hasHeader
      ? `헤더 행 ${aiSetupMappingAnalysis.headerRowIndex + 1}행`
      : "헤더 확인 필요",
    `열 매핑 ${aiSetupMappingAnalysis.recognizedCount ?? 0}개`,
    `확인 필요 ${aiSetupAdvancedReviewCount}개`,
  ];
  const aiSetupStandardBadges = [
    `표준화 행 ${aiSetupMappingAnalysis.previewRows.length}개`,
    `표준 필드 ${aiSetupMappedPreviewColumns.length}개`,
  ];
  const aiSetupRawBadges = [
    `원본 데이터 ${selectedAiSetupSheet?.rowCount ?? 0}행`,
    `${selectedAiSetupSheet?.columnCount ?? 0}열`,
  ];
  const aiSetupSheetCompactMeta = selectedAiSetupSheet
    ? `${selectedAiSetupSheet.name} · ${selectedAiSetupSheet.rowCount ?? 0}행 · ${selectedAiSetupSheet.columnCount ?? 0}열`
    : "";
  const aiSetupCatalogReviewRows = aiSetupCatalogMatchRows.filter((row) => {
    const displayStatus = getAiDisplayMatchStatus(row);
    return !["matched", "new_candidate", "ignored", "cost_item", "margin_item", "tax_item", "subtotal_row", "total_row"].includes(displayStatus);
  });
  const aiSetupVisibleCatalogMatchRows =
    aiSetupMatchReviewMode === "review" ? aiSetupCatalogReviewRows : aiSetupCatalogMatchRows;
  const aiSetupSplitValidationSummaryText = [
    `묶음 원본 ${aiSetupSplitValidationSummaries.length}개`,
    `자동 분해 ${aiSetupCatalogMatchRows.filter((row) => row.isSplitRow).length}개`,
    `금액 미입력 ${aiSetupCatalogMatchRows.filter((row) => row.isSplitRow && !hasImportValue(row.unit_price) && !hasImportValue(row.labor_rate)).length}개`,
  ].join(" · ");
  const aiSetupAnalysisSummaryItems = aiSetupAiResult
    ? [
        ["기존 연결", aiSetupAiResult.linkExisting],
        ["템플릿", aiSetupImportApplyPlanSummary.templateValueCandidates],
        ["분해", aiSetupAiResult.splitRows ?? 0],
        ["비용/합계", (aiSetupAiResult.costItem ?? 0) + (aiSetupAiResult.marginItem ?? 0) + (aiSetupAiResult.taxItem ?? 0) + (aiSetupAiResult.validationRows ?? 0)],
        ["검토 필요", aiSetupAiResult.needsReview],
      ]
    : [
        ["표준화", aiSetupMappingAnalysis.previewRows.length],
        ["열 매핑", aiSetupMappedPreviewColumns.length],
        ["기존 항목", aiSetupCatalogMatchSummary.matched],
        ["검토 필요", aiSetupCatalogMatchSummary.needsReview],
      ];
  const aiSetupCatalogSummaryItems = [
    ["자동 매핑 가능", aiSetupCatalogMatchRows.filter((row) => row.reviewStatus === "automatic").length],
    ["확인 필요", aiSetupCatalogMatchRows.filter((row) => row.reviewStatus === "needs_review").length],
    ["매핑되지 않음", aiSetupCatalogMatchRows.filter((row) => row.reviewStatus === "unmapped").length],
    ["기존 값과 충돌", aiSetupCatalogMatchRows.filter((row) => row.reviewStatus === "conflict").length],
  ];
  const aiSetupApplyPlanSummaryItems = [
    ["기존 단가", aiSetupImportApplyPlanSummary.priceUpdates],
    ["새 항목", aiSetupImportApplyPlanSummary.newCategoryCandidates + aiSetupImportApplyPlanSummary.newSubitemCandidates],
    ["템플릿", aiSetupImportApplyPlanSummary.templateValueCandidates],
    ["비용/합계", aiSetupImportApplyPlanSummary.costCandidates + aiSetupImportApplyPlanSummary.validationRows],
    ["검토 필요", aiSetupImportApplyPlanSummary.reviewRows],
  ];
  const aiSetupAutoExcludedCount =
    aiSetupImportApplyPlanSummary.costCandidates +
    aiSetupImportApplyPlanSummary.validationRows +
    aiSetupImportApplyPlanSummary.reviewRows +
    aiSetupImportApplyPlanSummary.ignoredRows;
  const currentAdminTemplateCondition = getAdminTemplateCondition();
  const currentAdminConditionLabel = currentAdminTemplateCondition
    ? makeTemplateLabel(currentAdminTemplateCondition, conditionVariantLabelMap)
    : "";
  const adminTemplateConditionDraftValue = adminTemplateConditionDraft.pyeong && adminTemplateConditionDraft.buildType
    ? buildTemplateCondition({
        pyeong: Number(adminTemplateConditionDraft.pyeong),
        buildType: adminTemplateConditionDraft.buildType,
        hasExtension: adminTemplateConditionDraft.buildType === "old" ? Boolean(adminTemplateConditionDraft.hasExtension) : false,
        conditionVariant: adminTemplateConditionDraft.conditionVariant,
      })
    : null;
  const orderedAdminTemplates = useMemo(
    () => orderAdminTemplateRows(adminTemplates, adminTemplateOrder),
    [adminTemplateOrder, adminTemplates]
  );
  const adminPriceCatalogStatus = getScopedResourceStatus(
    adminCatalogResource,
    selectedCompanyId,
    getAdminCatalogScopeKey("prices")
  );
  const adminTemplateCatalogStatus = getScopedResourceStatus(
    adminCatalogResource,
    selectedCompanyId,
    getAdminCatalogScopeKey("condition", currentAdminTemplateId),
    "condition:"
  );
  const estimateListStatus = getScopedResourceStatus(
    estimateListResource,
    selectedCompanyId,
    "estimates"
  );
  const conditionLabelsStatus = getScopedResourceStatus(
    conditionLabelsResource,
    selectedCompanyId,
    "condition-labels"
  );
  const canEditConditionQuantities = isConditionQuantityAdminPage
    && adminConditionStep === "edit"
    && adminTemplateCatalogStatus === "ready"
    && Boolean(currentAdminTemplateCondition);
  const canReorderAdminCatalog = isCommonPriceAdminPage || canEditConditionQuantities;
  const showAdminConditionSelect = isConditionQuantityAdminPage && adminConditionStep === "select";
  const showAdminConditionEditor = isConditionQuantityAdminPage && adminConditionStep === "edit";
  const showAdminCatalogEditor = isCommonPriceAdminPage || showAdminConditionEditor;
  const adminCommonPriceSavedLabel = adminCommonPriceSavedAt ? formatDisplayDateTime(adminCommonPriceSavedAt) : "";
  const isAdminCatalogEditing = isCommonPriceAdminPage || showAdminConditionEditor;
  const selectedAdminPriceItem =
    isCommonPriceAdminPage
      ? filteredAdminItems.find((item) => item.id === selectedAdminCategoryId) ?? filteredAdminItems[0] ?? null
      : null;
  const selectedAdminTemplateItem =
    canEditConditionQuantities
      ? filteredAdminItems.find((item) => item.id === selectedAdminCategoryId) ?? filteredAdminItems[0] ?? null
      : null;

  currentAdminTemplateConditionRef.current = currentAdminTemplateCondition;

  useEffect(() => {
    if (!isCommonPriceAdminPage || !adminPriceValidationError?.subitemId) return;
    scrollToAdminPriceRow(adminPriceValidationError.subitemId);
  }, [adminPriceValidationError, adminFavoriteOnly, adminSearch, isCommonPriceAdminPage, selectedAdminCategoryId]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    initializeConditionVariantLabels({ silent: true });
  }, [selectedCompanyId]);

  useEffect(() => {
    setAdminTemplateOrder(readAdminTemplateOrder(selectedCompanyId));
  }, [selectedCompanyId]);

  useEffect(() => {
    setAdminTemplatePreferencesReady(false);
    if (!selectedCompanyId || typeof window === "undefined") {
      setAdminTemplateFavoriteIds([]);
      setAdminTemplateRecentIds([]);
      setLastSelectedAdminTemplateId("");
      return;
    }
    const preferences = readTemplateConditionPreferences(window.localStorage, selectedCompanyId);
    setAdminTemplateFavoriteIds(preferences.favorites);
    setAdminTemplateRecentIds(preferences.recent);
    setLastSelectedAdminTemplateId(preferences.lastSelectedId);
    setAdminTemplatePreferencesReady(true);
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    if (!isProtectedAdminPage || adminVerified) return;

    setPendingAdminPage(page);
    setAdminVerifyOpen(true);
    setAdminVerifyPassword("");
    setAdminVerifyError("");
    setPage("landing");
  }, [adminVerified, isProtectedAdminPage, page, selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    if (PROTECTED_ADMIN_PAGES.includes(page) && !isAdminVerifiedForCompany(selectedCompanyId)) return;
    if (page === "admin-prices") {
      initializeAdminItems({ mode: "prices" });
      return;
    }
    if (page === "admin-items") {
      if (!adminTemplatePreferencesReady) return;
      setAdminSearch("");
      setAdminFavoriteOnly(false);
      const selectedTemplate = adminTemplatesCompanyIdRef.current === selectedCompanyId
        ? adminTemplates.find(
            (template) => `${template.id}` === `${currentAdminTemplateId}`
          )
        : null;
      initializeAdminItems({
        mode: "condition",
        template: selectedTemplate,
        selectPreferredTemplate: true,
      });
    }
    if (page === "admin-condition-labels") {
      initializeConditionVariantLabels();
    }
    if (page === "admin-detail-costs") {
      fetchDetailSubitems();
    }
    if (page === "admin-estimates") {
      initializeEstimateLists();
    }
    if (page === "landing") {
      initializeEstimateLists();
    }
    if (page === "photo-management") {
      refreshPhotoCatalog();
    }
  }, [adminTemplatePreferencesReady, page, selectedCompanyId]);

  useEffect(() => {
    if (page === "condition" && USE_ITEMS_SCREEN_V2) {
      setEstimateConditionDrawerOpen(true);
      return;
    }
    if (page === "items") return;
    setEstimateConditionDrawerOpen(false);
    setPyeongDropdownOpen(false);
    setConditionLabelEditOpen(false);
    setEstimatePhotoViewerIndex(null);
  }, [page]);

  useEffect(() => () => {
    estimatePyeongChangeRef.current?.reset();
  }, []);

  useEffect(() => {
    if (!estimateTemplateConflicts.length) {
      estimateTemplateConflictScrollRef.current = null;
      return;
    }
    if (
      page !== "items"
      || estimateTemplateConflictScrollRef.current === estimateTemplateConflicts
      || typeof window === "undefined"
    ) return;
    estimateTemplateConflictScrollRef.current = estimateTemplateConflicts;
    const firstConflict = estimateTemplateConflicts[0];
    setOpenCategory(firstConflict.categoryId);
    const frameId = window.requestAnimationFrame(() => {
      document.getElementById(`estimate-template-conflict-${encodeURIComponent(firstConflict.rowKey)}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [estimateTemplateConflicts, page]);

  useEffect(() => {
    if (!selectedCompanyId || !excelImportOpen || !adminVerified) return;
    fetchAiSetupCatalogItems();
  }, [adminVerified, excelImportOpen, selectedCompanyId]);

  useEffect(() => {
    if (!excelImportOpen) return undefined;
    function handleExcelImportEscape(event) {
      if (event.key !== "Escape") return;
      if (aiSetupPriceSaving || aiSetupTemplateSaving || aiSetupNewItemSaving || aiSetupAiLoading) return;
      setExcelImportOpen(false);
    }
    window.addEventListener("keydown", handleExcelImportEscape);
    return () => window.removeEventListener("keydown", handleExcelImportEscape);
  }, [aiSetupAiLoading, aiSetupNewItemSaving, aiSetupPriceSaving, aiSetupTemplateSaving, excelImportOpen]);

  useEffect(() => {
    setAiSetupMatchOverrides({});
    setAiSetupAiError("");
    setAiSetupAiResult(null);
  }, [aiSetupMappingAnalysis.headerRowIndex, aiSetupMappingAnalysis.previewRows, selectedAiSetupSheetName]);

  useEffect(() => {
    if (!selectedAiSetupSheet || !hasAiSetupConditionHintValue(aiSetupDetectedConditionHint)) return;
    setAiSetupApplyCondition((prev) => {
      const next = { ...prev };
      if (!aiSetupApplyConditionTouched.pyeong && aiSetupDetectedConditionHint.pyeong) {
        next.pyeong = aiSetupDetectedConditionHint.pyeong;
      }
      if (!aiSetupApplyConditionTouched.buildType && aiSetupDetectedConditionHint.buildType) {
        next.buildType = aiSetupDetectedConditionHint.buildType;
      }
      if (!aiSetupApplyConditionTouched.conditionVariant && aiSetupDetectedConditionHint.conditionVariant) {
        next.conditionVariant = aiSetupDetectedConditionHint.conditionVariant;
      }
      if (!aiSetupApplyConditionTouched.occupancy && aiSetupDetectedConditionHint.occupancy) {
        next.occupancy = aiSetupDetectedConditionHint.occupancy;
      }
      return (
        next.pyeong === prev.pyeong &&
        next.buildType === prev.buildType &&
        next.conditionVariant === prev.conditionVariant &&
        next.occupancy === prev.occupancy
      )
        ? prev
        : next;
    });
  }, [aiSetupApplyConditionTouched, aiSetupDetectedConditionHint, selectedAiSetupSheet]);

  useEffect(() => {
    if (excelImportTarget !== EXCEL_IMPORT_TARGETS.TEMPLATES) return;
    const firstRow = aiSetupMappingAnalysis.previewRows[0];
    if (!firstRow) return;
    const explicitPyeong = matchPyeongOptionNumber(firstRow.pyeong);
    const explicitVariant = CONDITION_VARIANT_KEYS.includes(firstRow.condition_variant)
      ? firstRow.condition_variant
      : "";
    const explicitBuildType = detectAiSetupBuildType(`${firstRow.build_type ?? ""}`, explicitVariant);
    setAiSetupApplyCondition((current) => ({
      ...current,
      pyeong: aiSetupApplyConditionTouched.pyeong ? current.pyeong : explicitPyeong || current.pyeong,
      buildType: aiSetupApplyConditionTouched.buildType ? current.buildType : explicitBuildType || current.buildType,
      conditionVariant: aiSetupApplyConditionTouched.conditionVariant ? current.conditionVariant : explicitVariant || current.conditionVariant,
    }));
  }, [aiSetupApplyConditionTouched, aiSetupMappingAnalysis.previewRows, excelImportTarget]);

  useEffect(() => {
    if (selectedCompanyId && page === "admin-detail-costs" && selectedDetailSubitemId) {
      fetchDetailCosts(selectedDetailSubitemId);
    }
  }, [page, selectedDetailSubitemId, selectedCompanyId]);

  useEffect(() => {
    if (!selectedAiSetupSheet) {
      setAiSetupHeaderRowIndex(-1);
      setAiSetupColumnMappings([]);
      return;
    }

    if (aiSetupAutoMappingAnalysis.hasHeader) {
      setAiSetupHeaderRowIndex(aiSetupAutoMappingAnalysis.headerRowIndex);
      setAiSetupColumnMappings(aiSetupAutoMappingAnalysis.mappings);
      return;
    }

    setAiSetupHeaderRowIndex(-1);
    setAiSetupColumnMappings([]);
  }, [aiSetupAutoMappingAnalysis, selectedAiSetupSheet]);

  function requireSelectedCompanyId() {
    if (!selectedCompanyId) {
      throw new Error("업체 로그인 후 이용해주세요.");
    }
    if (!isValidUuid(selectedCompanyId)) {
      throw new Error("저장 기준으로 쓰는 업체 ID 형식이 올바르지 않습니다. 다시 로그인해주세요.");
    }
    return selectedCompanyId;
  }

  async function handleCompanyLogin(event) {
    event.preventDefault();

    const companyCode = normalizeCompanyCode(loginCode);
    const password = loginPassword.trim();

    if (!companyCode) {
      setLoginError("업체 코드를 확인해주세요.");
      return;
    }
    if (!password) {
      setLoginError("비밀번호를 확인해주세요.");
      return;
    }
    if (!isSupabaseConfigured) {
      setLoginError("로그인 중 문제가 발생했습니다.");
      return;
    }

    setLoginError("");
    try {
      clearCompanyScopedState();
      await loginAppSession(companyCode, password);
      setLoginError("");
    } catch (error) {
      console.error("[FORMATE company login] login failed");
      setLoginError("업체 코드 또는 비밀번호를 확인해주세요.");
    }
  }

  async function handleChangeCompany() {
    clearCompanyScopedState();
    try {
      await logoutAppSession();
    } catch (error) {
      console.error("[FORMATE auth sign out] failed");
    }
    setLoginCode("");
    setLoginPassword("");
    setLoginError("");
    setAuthScreenMode("landing");
    setAdminVerifyOpen(false);
    setAdminVerifyPassword("");
    setAdminVerifyError("");
    setPendingAdminPage("admin");
  }

  function openAdminGate(nextPage = "admin") {
    if (!selectedCompanyId) {
      handleChangeCompany();
      return;
    }

    if (isAdminVerifiedForCompany(selectedCompanyId)) {
      setPage(nextPage);
      return;
    }

    setPendingAdminPage(nextPage);
    setAdminVerifyOpen(true);
    setAdminVerifyPassword("");
    setAdminVerifyError("");
  }

  function closeAdminGate() {
    setAdminVerifyOpen(false);
    setAdminVerifyPassword("");
    setAdminVerifyError("");
    setPendingAdminPage("admin");
  }

  function resetAiSetupUpload() {
    setAiSetupFileName("");
    setAiSetupStatus("idle");
    setAiSetupError("");
    setAiSetupImportContext(null);
    setAiSetupSheets([]);
    setSelectedAiSetupSheetName("");
    setAiSetupHeaderRowIndex(-1);
    setAiSetupColumnMappings([]);
    setAiSetupMatchOverrides({});
    setAiSetupApplyCondition(createEmptyAiSetupApplyCondition());
    setAiSetupApplyConditionTouched(createEmptyAiSetupConditionTouched());
    setAiSetupPriceConfirmOpen(false);
    setAiSetupPriceSaving(false);
    setAiSetupPriceResult(null);
    setAiSetupPriceError("");
    setAiSetupTemplateConfirmOpen(false);
    setAiSetupTemplateSaving(false);
    setAiSetupTemplateResult(null);
    setAiSetupTemplateError("");
    setAiSetupNewItemConfirmOpen(false);
    setAiSetupNewItemSaving(false);
    setAiSetupNewItemResult(null);
    setAiSetupNewItemError("");
    setAiSetupAiLoading(false);
    setAiSetupAiError("");
    setAiSetupAiResult(null);
    setAiSetupAdvancedOpen(false);
    setAiSetupStandardOpen(false);
    setAiSetupRawOpen(false);
  }

  function openExcelImport(target) {
    resetAiSetupUpload();
    setExcelImportTarget(target);
    setExcelImportOpen(true);
  }

  function closeExcelImport() {
    if (aiSetupPriceSaving || aiSetupTemplateSaving || aiSetupNewItemSaving || aiSetupAiLoading) return;
    setExcelImportOpen(false);
  }

  async function handleExcelExport(target) {
    if (excelExportTarget) return;
    setExcelExportTarget(target);
    setExcelExportError("");
    try {
      await exportFormateExcel({
        companyId: requireSelectedCompanyId(),
        companyName: selectedCompanyName,
        target,
      });
    } catch (error) {
      console.error("[FORMATE Excel export]", error);
      setExcelExportError(getFriendlyError(error, "Excel 파일을 내보내지 못했습니다."));
    } finally {
      setExcelExportTarget("");
    }
  }

  function updateAiSetupApplyConditionPatch(patch, touchedFields = Object.keys(patch)) {
    setAiSetupApplyCondition((prev) => ({ ...prev, ...patch }));
    setAiSetupApplyConditionTouched((prev) => {
      const next = { ...prev };
      touchedFields.forEach((field) => {
        next[field] = true;
      });
      return next;
    });
  }

  async function processAiSetupFile(file) {
    resetAiSetupUpload();

    if (!file) return;

    const fileName = file.name ?? "";
    const isExcelFile = isSupportedAiSetupExcelFile(fileName);
    setAiSetupFileName(fileName);

    if (!isExcelFile) {
      setAiSetupStatus("error");
      setAiSetupError("엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.");
      return;
    }

    setAiSetupStatus("reading");
    try {
      const parsedSheets = await parseAiSetupWorkbook(file);
      if (parsedSheets.length === 0) {
        setAiSetupStatus("error");
        setAiSetupError("읽을 수 있는 시트가 없습니다.");
        return;
      }
      const workbookMetadata = readFormateWorkbookMetadata(parsedSheets);
      const importContext = createScopedExcelImportContext(
        requireSelectedCompanyId(),
        workbookMetadata
      );
      setAiSetupImportContext(importContext);

      setAiSetupStatus("analyzing");
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const importSheets = parsedSheets.filter((sheet) => sheet.name !== "FORMATE_META");
      if (!importSheets.length) {
        setAiSetupStatus("error");
        setAiSetupError("가져올 데이터 시트가 없습니다.");
        return;
      }
      setAiSetupSheets(importSheets);
      setSelectedAiSetupSheetName(importSheets[0]?.name ?? "");
      const analysis = analyzeExcelSheetForFormate(importSheets[0]);
      setAiSetupStatus("mapping");
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      if (analysis.hasHeader) {
        setAiSetupHeaderRowIndex(analysis.headerRowIndex);
        setAiSetupColumnMappings(analysis.mappings);
      }
      setAiSetupStatus("success");
      setAiSetupError("");
    } catch (error) {
      console.error("[FORMATE AI setup excel parse]", error);
      setAiSetupStatus("error");
      setAiSetupError("엑셀 파일을 읽지 못했습니다. 파일 형식을 확인해주세요.");
      setAiSetupSheets([]);
      setSelectedAiSetupSheetName("");
    }
  }

  async function handleAiSetupFileChange(event) {
    const input = event.target;
    await processAiSetupFile(event.target.files?.[0]);
    input.value = "";
  }

  function handleAiSetupFileDrop(event) {
    event.preventDefault();
    if (aiSetupStatus === "reading") return;
    processAiSetupFile(event.dataTransfer.files?.[0]);
  }

  function handleAiSetupHeaderRowChange(event) {
    const nextHeaderRowIndex = Number(event.target.value);
    if (!selectedAiSetupSheet || !Number.isInteger(nextHeaderRowIndex) || nextHeaderRowIndex < 0) {
      setAiSetupHeaderRowIndex(-1);
      setAiSetupColumnMappings([]);
      return;
    }

    const columnCount = Math.max(
      selectedAiSetupSheet.columnCount ?? 0,
      selectedAiSetupSheet.rows?.[nextHeaderRowIndex]?.length ?? 0
    );
    setAiSetupHeaderRowIndex(nextHeaderRowIndex);
    setAiSetupColumnMappings(createManualExcelMappings(selectedAiSetupSheet.rows, nextHeaderRowIndex, columnCount));
  }

  function updateAiSetupColumnMapping(columnIndex, optionValue) {
    setAiSetupColumnMappings((currentMappings) =>
      currentMappings.map((mapping) =>
        mapping.columnIndex === columnIndex ? applyExcelMappingOption(mapping, optionValue) : mapping
      )
    );
  }

  function updateAiSetupCustomFieldName(columnIndex, value) {
    setAiSetupColumnMappings((currentMappings) =>
      currentMappings.map((mapping) =>
        mapping.columnIndex === columnIndex ? { ...mapping, customFieldName: value } : mapping
      )
    );
  }

  async function fetchAiSetupCatalogItems() {
    if (!selectedCompanyId) return;

    setAiSetupCatalogLoading(true);
    setAiSetupCatalogError("");
    try {
      const companyId = requireSelectedCompanyId();
      const catalogRows = await fetchCanonicalConstructionCatalogRows(companyId);
      setAiSetupCatalogItems(
        buildCanonicalExcelCatalogItems(catalogRows.canonicalCatalog)
      );
      return catalogRows;
    } catch (error) {
      console.error("[FORMATE AI setup catalog fetch]", error);
      setAiSetupCatalogError("기존 단가표 항목을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return null;
    } finally {
      setAiSetupCatalogLoading(false);
    }
  }

  function updateAiSetupRowOverride(sourceRowNumber, patch) {
    setAiSetupMatchOverrides((current) => {
      const previous = current[sourceRowNumber] ?? {};
      const next = { ...previous, ...patch, source: "manual" };
      if (Object.prototype.hasOwnProperty.call(patch, "rowType") && !Object.prototype.hasOwnProperty.call(patch, "action")) {
        next.action = getDefaultAiActionForRowType(patch.rowType, "needs_review");
      }
      if (Object.prototype.hasOwnProperty.call(patch, "categoryId")) {
        next.subitemId = "";
      }
      const updated = {
        ...current,
        [sourceRowNumber]: next,
      };
      const targetRow = aiSetupCatalogMatchRows.find((row) => `${row.sourceRowNumber}` === `${sourceRowNumber}`);
      const activatesRow = patch.action && !["ignore", "review"].includes(patch.action);
      Object.entries(buildLumpSumExclusionPatches(aiSetupCatalogMatchRows, targetRow, activatesRow)).forEach(([rowKey, exclusionPatch]) => {
        updated[rowKey] = { ...(updated[rowKey] ?? {}), ...exclusionPatch };
      });
      return updated;
    });
  }

  async function handleAiSetupRecommendMatches() {
    if (aiSetupAiLoading || aiSetupCatalogMatchRows.length === 0) return;
    const hasManualOverrides = Object.values(aiSetupMatchOverrides).some((override) => override?.source === "manual");
    if (hasManualOverrides) {
      const shouldContinue = window.confirm("AI 추천을 다시 실행하면 현재 화면에서 수정한 매칭 결과가 새 추천으로 바뀔 수 있습니다. 계속할까요?");
      if (!shouldContinue) return;
    }

    setAiSetupAiLoading(true);
    setAiSetupAiError("");
    setAiSetupAiResult(null);

    try {
      const requestPayload = buildAiRecommendationRequest({
        catalogItems: aiSetupCatalogItems,
        matchRows: aiSetupCatalogMatchRows,
        overrides: aiSetupMatchOverrides,
        mappings: aiSetupMappingAnalysis.mappings,
        condition: aiSetupApplyCondition,
        conditionLabel: aiSetupApplyConditionLabel,
      });
      const result = await requestAiRecommendations(requestPayload);

      const recommendations = Array.isArray(result?.recommendations) ? result.recommendations : [];
      const sourceRowNumbers = new Set(aiSetupCatalogMatchRows.map((row) => row.sourceRowNumber));
      const recommendationPatches = recommendations.reduce((patches, recommendation) => {
        const sourceRowNumber = Number(recommendation.rowIndex);
        if (!sourceRowNumbers.has(sourceRowNumber)) return patches;
        patches.items.push({
          sourceRowNumber,
          patch: {
            ...getAiRecommendationOverridePatch(recommendation),
            source: "ai",
            aiReason: recommendation.reason ?? "",
            aiConfidence: recommendation.confidence ?? null,
            aiRecommendedAction: recommendation.recommendedAction ?? "",
            aiReviewNotes: Array.isArray(recommendation.reviewNotes) ? recommendation.reviewNotes : [],
          },
        });
        return patches;
      }, { items: [], skippedManualCount: 0 });

      if (recommendationPatches.items.length > 0) {
        setAiSetupMatchOverrides((current) => {
          const next = { ...current };
          recommendationPatches.items.forEach(({ sourceRowNumber, patch }) => {
            next[sourceRowNumber] = {
              ...(next[sourceRowNumber] ?? {}),
              ...patch,
            };
          });
          return next;
        });
      }

      const recommendationSummary = recommendations.reduce(
        (summary, recommendation) => {
          if (recommendation.recommendedAction === "link_existing") summary.linkExisting += 1;
          else if (recommendation.recommendedAction === "add_new_item") summary.addNewItem += 1;
          else if (recommendation.recommendedRowType === "cost_item") summary.costItem += 1;
          else if (recommendation.recommendedRowType === "margin_item") summary.marginItem += 1;
          else if (recommendation.recommendedRowType === "tax_item") summary.taxItem += 1;
          else if (["subtotal_row", "total_row"].includes(recommendation.recommendedRowType)) summary.validationRows += 1;
          else if (recommendation.recommendedAction === "ignore" || recommendation.recommendedRowType === "ignored") summary.ignored += 1;
          else summary.needsReview += 1;
          if (Array.isArray(recommendation.reviewNotes) && recommendation.reviewNotes.length > 0) summary.reviewSignals += 1;
          if (Array.isArray(recommendation.splitRows)) summary.splitRows += recommendation.splitRows.length;
          return summary;
        },
        { linkExisting: 0, addNewItem: 0, costItem: 0, marginItem: 0, taxItem: 0, validationRows: 0, ignored: 0, needsReview: 0, reviewSignals: 0, splitRows: 0 }
      );

      setAiSetupAiResult({
        model: result?.model ?? "",
        warnings: result?.warnings ?? [],
        totalRecommendations: recommendations.length,
        appliedCount: recommendationPatches.items.length,
        skippedManualCount: recommendationPatches.skippedManualCount,
        ...recommendationSummary,
      });
    } catch (error) {
      console.error("[FORMATE AI recommend matches]", error);
      setAiSetupAiError(error?.message || "AI 매칭 추천 중 문제가 발생했습니다.");
    } finally {
      setAiSetupAiLoading(false);
    }
  }

  function openAiSetupPriceConfirm() {
    if (aiSetupPriceSaving || aiSetupPriceUpdateTargets.length === 0) return;
    setAiSetupPriceError("");
    setAiSetupPriceResult(null);
    setAiSetupPriceConfirmOpen(true);
  }

  function closeAiSetupPriceConfirm() {
    if (aiSetupPriceSaving) return;
    setAiSetupPriceConfirmOpen(false);
    setAiSetupPriceError("");
  }

  async function confirmAiSetupPriceUpdates() {
    if (aiSetupPriceSaving || !hasExcelImportWriteTargets(aiSetupPriceUpdateTargets)) return;

    setAiSetupPriceSaving(true);
    setAiSetupPriceError("");
    setAiSetupPriceResult(null);

    try {
      const companyId = requireSelectedCompanyId();
      const allowedSubitems = new Map();
      aiSetupCatalogItems.forEach((item) => {
        (item.subitems ?? []).forEach((subitem) => {
          allowedSubitems.set(subitem.id, { ...subitem, itemId: item.id, itemName: item.name });
        });
      });

      const results = [];
      const atomicSubitemUpdates = [];
      for (const target of aiSetupPriceUpdateTargets) {
        const allowedSubitem = allowedSubitems.get(target.matchedSubitemId);
        if (!allowedSubitem || allowedSubitem.itemId !== target.matchedItemId) {
          results.push({
            status: "rejected",
            target,
            reason: "현재 업체의 단가표 항목으로 확인되지 않았습니다.",
          });
          continue;
        }

        const payload = {};
        const nextUnitPrice = parseAiImportCurrencyNumber(target.excelUnitPrice);
        const nextLaborRate = parseAiImportCurrencyNumber(target.excelLaborRate);
        const nextLaborRateEmpty = parseAiImportCurrencyNumber(target.excelLaborRateEmpty);
        const nextLaborRateOccupied = parseAiImportCurrencyNumber(target.excelLaborRateOccupied);
        if (nextUnitPrice !== null && importValuesDiffer(target.currentUnitPrice, target.excelUnitPrice)) {
          payload.unit_price = nextUnitPrice;
        }
        if (nextLaborRate !== null && importValuesDiffer(target.currentLaborRate, target.excelLaborRate)) {
          payload.labor_rate = nextLaborRate;
        }
        if (nextLaborRateEmpty !== null && importValuesDiffer(target.currentLaborRateEmpty, target.excelLaborRateEmpty)) {
          payload.labor_rate_empty = nextLaborRateEmpty;
          payload.labor_rate = nextLaborRateEmpty;
        }
        if (nextLaborRateOccupied !== null && importValuesDiffer(target.currentLaborRateOccupied, target.excelLaborRateOccupied)) {
          payload.labor_rate_occupied = nextLaborRateOccupied;
        }

        if (Object.keys(payload).length === 0) {
          results.push({ status: "fulfilled", target, skipped: true });
          continue;
        }

        atomicSubitemUpdates.push({
          id: target.matchedSubitemId,
          item_id: target.matchedItemId,
          ...payload,
        });
        results.push({ status: "fulfilled", target, payload });
      }

      if (atomicSubitemUpdates.length) {
        await saveAdminCatalogAtomic({
          companyId,
          subitemUpdates: atomicSubitemUpdates,
        });
      }

      const successRows = results.filter((result) => result.status === "fulfilled" && !result.skipped);
      const skippedRows = results.filter((result) => result.status === "fulfilled" && result.skipped);
      const failedRows = results.filter((result) => result.status === "rejected");
      let verifiedCount = 0;
      let verificationFailedCount = 0;
      let refreshFailed = false;

      if (successRows.length > 0) {
        await fetchAiSetupCatalogItems();
        const refreshedSnapshot = await fetchAdminItems({ mode: "prices" });
        if (refreshedSnapshot) {
          verifiedCount = countVerifiedImportRows(successRows, refreshedSnapshot);
          verificationFailedCount = successRows.length - verifiedCount;
          if (verificationFailedCount > 0) {
            setAiSetupPriceError(`저장 응답 후 ${verificationFailedCount}개 항목이 DB 재조회에서 확인되지 않았습니다.`);
          }
        } else {
          refreshFailed = true;
          setAiSetupPriceError("저장은 완료됐지만 현재 단가표를 다시 확인하지 못했습니다. 기존 화면 데이터는 유지했습니다.");
        }
      }

      setAiSetupPriceResult({
        successCount: successRows.length,
        verifiedCount,
        verificationFailedCount,
        refreshFailed,
        skippedCount: skippedRows.length,
        failedCount: failedRows.length,
        failedRows,
        savedAt: new Date().toISOString(),
        savedNames: successRows.map((result) => getAiSaveTargetName(result.target)),
        skippedNames: skippedRows.map((result) => getAiSaveTargetName(result.target)),
      });

      if (failedRows.length === 0 && !refreshFailed && verificationFailedCount === 0) {
        setAiSetupPriceConfirmOpen(false);
      }
    } catch (error) {
      console.error("[FORMATE AI setup price update]", error);
      setAiSetupPriceError(getFriendlyError(error, "기존 항목 단가/인건비를 반영하지 못했습니다."));
    } finally {
      setAiSetupPriceSaving(false);
    }
  }

  function openAiSetupTemplateConfirm() {
    if (aiSetupTemplateSaving || !aiSetupApplyConditionComplete || aiSetupTemplateValueTargets.length === 0) return;
    setAiSetupTemplateError("");
    setAiSetupTemplateResult(null);
    setAiSetupTemplateConfirmOpen(true);
  }

  function closeAiSetupTemplateConfirm() {
    if (aiSetupTemplateSaving) return;
    setAiSetupTemplateConfirmOpen(false);
    setAiSetupTemplateError("");
  }

  async function confirmAiSetupTemplateValues() {
    if (aiSetupTemplateSaving || !aiSetupApplyConditionComplete || !hasExcelImportWriteTargets(aiSetupTemplateValueTargets)) return;

    setAiSetupTemplateSaving(true);
    setAiSetupTemplateError("");
    setAiSetupTemplateResult(null);

    try {
      const companyId = requireSelectedCompanyId();
      const templateCondition = getAiSetupTemplateCondition(aiSetupApplyCondition);
      if (!templateCondition) {
        throw new Error("공사 조건이 완성되지 않았습니다.");
      }

      const allowedSubitems = new Map();
      aiSetupCatalogItems.forEach((item) => {
        (item.subitems ?? []).forEach((subitem) => {
          allowedSubitems.set(subitem.id, { ...subitem, itemId: item.id, itemName: item.name });
        });
      });

      const preflightResults = [];
      const preparedTargets = [];
      for (const target of aiSetupTemplateValueTargets) {
        const allowedSubitem = allowedSubitems.get(target.matchedSubitemId);
        if (!allowedSubitem || allowedSubitem.itemId !== target.matchedItemId) {
          preflightResults.push({
            status: "skipped",
            target,
            reason: "현재 업체의 기존 세부항목으로 확인되지 않았습니다.",
          });
          continue;
        }

        const hasQuantity = hasImportValue(target.quantity);
        const hasLaborCount = hasImportValue(target.laborCount);
        const hasConstructionDays = hasImportValue(target.constructionDays);
        const quantity = hasQuantity ? parseAiImportTemplateNumber(target.quantity) : null;
        const laborCount = hasLaborCount ? parseAiImportTemplateNumber(target.laborCount) : null;
        const constructionDays = hasConstructionDays ? parseAiImportTemplateNumber(target.constructionDays) : null;

        if ((hasQuantity && quantity === null) || (hasLaborCount && laborCount === null) || (hasConstructionDays && constructionDays === null)) {
          preflightResults.push({
            status: "rejected",
            target,
            reason: "수량 또는 인원 값을 숫자로 읽을 수 없습니다.",
          });
          continue;
        }

        preparedTargets.push({
          ...target,
          hasQuantity,
          hasLaborCount,
          hasConstructionDays,
          quantity,
          laborCount,
          constructionDays,
        });
      }

      if (preparedTargets.length === 0) {
        const skippedRows = preflightResults.filter((result) => result.status === "skipped");
        const failedRows = preflightResults.filter((result) => result.status === "rejected");
        setAiSetupTemplateResult({
          successCount: 0,
          skippedCount: skippedRows.length,
          failedCount: failedRows.length,
          failedRows,
          savedAt: new Date().toISOString(),
          savedNames: [],
          skippedNames: skippedRows.map((result) => getAiSaveTargetName(result.target)),
          templateId: "",
          createdTemplate: false,
        });
        return;
      }

      const existingTemplate = await fetchTemplateRowByCondition(companyId, templateCondition);
      const existingTemplateValues = existingTemplate?.id
        ? await fetchAdminTemplateValues(existingTemplate.id)
        : [];
      const existingValueBySubitemId = new Map();
      existingTemplateValues.forEach((value) => {
        if (existingValueBySubitemId.has(value.subitem_id)) {
          const contractError = new Error(
            "A canonical template contains duplicate rows for one construction_subitem UUID."
          );
          contractError.code = "duplicate-template-subitem-id";
          throw contractError;
        }
        existingValueBySubitemId.set(value.subitem_id, value);
      });
      const results = [...preflightResults];
      const templateValueWrites = [];
      for (const target of preparedTargets) {
        const existingValue = existingValueBySubitemId.get(target.matchedSubitemId);

        if (existingValue?.id) {
          if (!shouldApplyExcelConflict(target.conflictDecision)) {
            results.push({ status: "skipped", target, reason: "기존 템플릿 값을 유지했습니다." });
            continue;
          }
          const updatePayload = {};
          if (target.hasQuantity) updatePayload.quantity = target.quantity;
          if (target.hasLaborCount) updatePayload.labor_count = target.laborCount;
          if (target.hasConstructionDays) updatePayload.construction_days = Math.max(0, Math.round(target.constructionDays));
          templateValueWrites.push({
            item_id: target.matchedItemId,
            subitem_ref: target.matchedSubitemId,
            ...updatePayload,
          });
          results.push({ status: "fulfilled", target, mode: "updated" });
          continue;
        }

        templateValueWrites.push({
          item_id: target.matchedItemId,
          subitem_ref: target.matchedSubitemId,
          quantity: target.hasQuantity ? target.quantity : null,
          labor_count: target.hasLaborCount ? target.laborCount : null,
          construction_days: target.hasConstructionDays ? Math.max(0, Math.round(target.constructionDays)) : 0,
        });
        results.push({ status: "fulfilled", target, mode: "inserted" });
      }

      const atomicTemplate = await saveAdminTemplateAtomic({
        companyId,
        condition: templateCondition,
        mode: "upsert",
        values: templateValueWrites,
      });
      const templateRow = atomicTemplate.template;
      const createdTemplate = Boolean(atomicTemplate.created);

      const successRows = results.filter((result) => result.status === "fulfilled");
      const skippedRows = results.filter((result) => result.status === "skipped");
      const failedRows = results.filter((result) => result.status === "rejected");

      setAiSetupTemplateResult({
        successCount: successRows.length,
        skippedCount: skippedRows.length,
        failedCount: failedRows.length,
        failedRows,
        savedAt: new Date().toISOString(),
        savedNames: successRows.map((result) => getAiSaveTargetName(result.target)),
        skippedNames: skippedRows.map((result) => getAiSaveTargetName(result.target)),
        templateId: templateRow.id,
        createdTemplate,
      });

      if (successRows.length > 0) {
        try {
          await fetchAdminTemplateList();
        } catch (refreshError) {
          console.warn("[FORMATE AI setup template refresh]", refreshError);
        }
      }
      if (failedRows.length === 0) {
        setAiSetupTemplateConfirmOpen(false);
      }
    } catch (error) {
      console.error("[FORMATE AI setup template save]", error);
      setAiSetupTemplateError(getFriendlyError(error, "선택 조건의 템플릿 수량/인원을 저장하지 못했습니다."));
    } finally {
      setAiSetupTemplateSaving(false);
    }
  }

  function openAiSetupNewItemConfirm() {
    if (aiSetupNewItemSaving || aiSetupNewItemTargets.length === 0) return;
    setAiSetupNewItemError("");
    setAiSetupNewItemResult(null);
    setAiSetupNewItemConfirmOpen(true);
  }

  function closeAiSetupNewItemConfirm() {
    if (aiSetupNewItemSaving) return;
    setAiSetupNewItemConfirmOpen(false);
    setAiSetupNewItemError("");
  }

  async function confirmAiSetupNewItems() {
    if (aiSetupNewItemSaving || !hasExcelImportWriteTargets(aiSetupNewItemTargets)) return;

    setAiSetupNewItemSaving(true);
    setAiSetupNewItemError("");
    setAiSetupNewItemResult(null);

    try {
      const companyId = requireSelectedCompanyId();
      const { itemRows, subitemRows } = await fetchConstructionCatalogRows(companyId);
      const categoriesById = new Map((itemRows ?? []).map((item) => [item.id, { ...item }]));
      const categoriesByName = new Map();
      (itemRows ?? []).forEach((item) => {
        const key = normalizeCatalogMatchText(item.name);
        if (key && !categoriesByName.has(key)) categoriesByName.set(key, { ...item });
      });

      const subitemsByItemId = new Map();
      (subitemRows ?? []).forEach((subitem) => {
        const list = subitemsByItemId.get(subitem.item_id) ?? [];
        list.push({ ...subitem });
        subitemsByItemId.set(subitem.item_id, list);
      });

      let nextItemSortOrder = itemRows.length
        ? Math.max(...itemRows.map((item) => item.sort_order ?? 0)) + 1
        : 0;
      const nextSubitemSortOrders = new Map(
        (itemRows ?? []).map((item) => {
          const subitems = subitemsByItemId.get(item.id) ?? [];
          const nextOrder = subitems.length
            ? Math.max(...subitems.map((subitem) => subitem.sort_order ?? 0)) + 1
            : 0;
          return [item.id, nextOrder];
        })
      );

      let results = [];
      const atomicEntries = [];
      const categoryUpdateRefs = new Set();
      let localCategorySequence = 0;
      let atomicEntrySequence = 0;

      const createAtomicEntryId = (prefix, target) => {
        atomicEntrySequence += 1;
        return `${prefix}-${target.sourceRowNumber}-${atomicEntrySequence}`;
      };

      for (const target of aiSetupNewItemTargets) {
        const categoryName = formatExcelCellValue(target.categoryName).trim();
        const subitemName = formatExcelCellValue(target.subitemName).trim();
        if (!categoryName) {
          results.push({ status: "rejected", target, reason: "대분류가 없어 저장 후보에서 제외됐습니다." });
          continue;
        }
        if (!subitemName) {
          results.push({ status: "rejected", target, reason: "세부항목명이 없어 저장 후보에서 제외됐습니다." });
          continue;
        }

        const unitPrice = hasImportValue(target.unitPrice) ? parseAiImportCurrencyNumber(target.unitPrice) : 0;
        const laborRate = hasImportValue(target.laborRate) ? parseAiImportCurrencyNumber(target.laborRate) : 0;
        const laborRateEmpty = hasImportValue(target.laborRateEmpty) ? parseAiImportCurrencyNumber(target.laborRateEmpty) : laborRate;
        const laborRateOccupied = hasImportValue(target.laborRateOccupied) ? parseAiImportCurrencyNumber(target.laborRateOccupied) : laborRate;
        if (unitPrice === null || laborRate === null || laborRateEmpty === null || laborRateOccupied === null) {
          results.push({ status: "rejected", target, reason: "단가 또는 인건비 값을 숫자로 읽을 수 없습니다." });
          continue;
        }

        let category = target.existingCategoryId ? categoriesById.get(target.existingCategoryId) : null;
        if (!category) {
          const normalizedCategoryName = normalizeCatalogMatchText(categoryName);
          category = normalizedCategoryName ? categoriesByName.get(normalizedCategoryName) : null;
        }

        if (!category) {
          localCategorySequence += 1;
          const categoryRef = `new-category-${localCategorySequence}`;
          category = {
            id: categoryRef,
            name: categoryName,
            item_type: target.isLumpSum ? LUMP_SUM_ITEM_TYPE : "itemized",
            item_kind: "standard",
            is_favorite: false,
            sort_order: nextItemSortOrder,
            __categoryRef: categoryRef,
            __local: true,
          };
          nextItemSortOrder += 1;
          categoriesById.set(category.id, { ...category });
          const normalizedCategoryName = normalizeCatalogMatchText(category.name);
          if (normalizedCategoryName) categoriesByName.set(normalizedCategoryName, { ...category });
          nextSubitemSortOrders.set(category.id, 0);
        } else if (target.isLumpSum && category.item_type !== LUMP_SUM_ITEM_TYPE) {
          category = { ...category, item_type: LUMP_SUM_ITEM_TYPE };
          categoriesById.set(category.id, category);
          const normalizedCategoryName = normalizeCatalogMatchText(category.name);
          if (normalizedCategoryName) categoriesByName.set(normalizedCategoryName, category);
        }

        const categoryRef = category.__categoryRef ?? category.id;
        const categoryPayload = {
          name: category.name,
          item_type: category.item_type,
          item_kind: category.item_kind ?? "standard",
          is_favorite: category.is_favorite ?? false,
          sort_order: category.sort_order ?? 0,
        };

        const normalizedSubitemName = normalizeCatalogMatchText(subitemName);
        const existingSubitem = (subitemsByItemId.get(category.id) ?? []).find(
          (subitem) => normalizeCatalogMatchText(subitem.name) === normalizedSubitemName
        );

        if (existingSubitem?.id) {
          if (
            target.isLumpSum
            && !categoryUpdateRefs.has(categoryRef)
          ) {
            categoryUpdateRefs.add(categoryRef);
            atomicEntries.push({
              client_id: createAtomicEntryId("category", target),
              category_ref: categoryRef,
              ...(!category.__local ? { category_id: category.id } : {}),
              category: categoryPayload,
              subitem: {},
            });
          }
          results.push({ status: "fulfilled", target, category, subitem: existingSubitem, skipped: true });
          continue;
        }

        const sortOrder = nextSubitemSortOrders.get(category.id) ?? 0;
        const clientId = createAtomicEntryId("subitem", target);
        const plannedSubitem = {
          id: clientId,
          item_id: category.id,
          name: subitemName,
          unit: target.unit || "평",
          unit_price: unitPrice,
          labor_rate: laborRateEmpty,
          labor_rate_empty: laborRateEmpty,
          labor_rate_occupied: laborRateOccupied,
          sort_order: sortOrder,
          __clientId: clientId,
        };
        atomicEntries.push({
          client_id: clientId,
          category_ref: categoryRef,
          ...(!category.__local ? { category_id: category.id } : {}),
          category: categoryPayload,
          subitem: plannedSubitem,
        });

        nextSubitemSortOrders.set(category.id, sortOrder + 1);
        subitemsByItemId.set(category.id, [...(subitemsByItemId.get(category.id) ?? []), plannedSubitem]);
        results.push({ status: "fulfilled", target, category, subitem: plannedSubitem, skipped: false });
      }

      const atomicResult = atomicEntries.length > 0
        ? await createStandardCatalogEntriesAtomic({ companyId, entries: atomicEntries })
        : { entries: [] };
      const atomicRows = atomicResult.entries ?? [];
      const atomicRowsByClientId = new Map(atomicRows.map((row) => [row.clientId, row]));
      const atomicCategoriesByRef = new Map(
        atomicRows
          .filter((row) => row.categoryRef && row.category?.id)
          .map((row) => [row.categoryRef, row.category])
      );

      results = results.map((result) => {
        if (result.status !== "fulfilled") return result;
        const categoryRef = result.category.__categoryRef ?? result.category.id;
        const category = atomicCategoriesByRef.get(categoryRef) ?? result.category;
        const subitem = result.subitem.__clientId
          ? atomicRowsByClientId.get(result.subitem.__clientId)?.subitem
          : result.subitem;
        if (!category?.id || !subitem?.id) {
          throw new Error("Atomic catalog save response is missing a stable entity identity.");
        }
        return { ...result, category, subitem };
      });

      const createdCategoryIds = new Set(
        atomicRows
          .filter((row) => row.categoryCreated && row.category?.id)
          .map((row) => row.category.id)
      );
      const linkedOverrides = Object.fromEntries(
        results
          .filter((result) => result.status === "fulfilled")
          .map((result) => [result.target.sourceRowNumber, {
            rowType: "work_item",
            action: "link",
            categoryId: result.category.id,
            subitemId: result.subitem.id,
          }])
      );

      const successRows = results.filter((result) => result.status === "fulfilled" && !result.skipped);
      const skippedRows = results.filter((result) => result.status === "fulfilled" && result.skipped);
      const failedRows = results.filter((result) => result.status === "rejected");
      let verifiedCount = 0;
      let verificationFailedCount = 0;
      let refreshFailed = false;

      if (Object.keys(linkedOverrides).length > 0) {
        setAiSetupMatchOverrides((current) => {
          const next = { ...current };
          Object.entries(linkedOverrides).forEach(([sourceRowNumber, override]) => {
            next[sourceRowNumber] = {
              ...(next[sourceRowNumber] ?? {}),
              ...override,
            };
          });
          return next;
        });
      }

      if (successRows.length > 0 || skippedRows.length > 0) {
        await fetchAiSetupCatalogItems();
      }
      if (successRows.length > 0) {
        const refreshOptions = page === "admin-items"
          ? { mode: "condition", condition: currentAdminTemplateCondition }
          : { mode: "prices" };
        const refreshedSnapshot = await fetchAdminItems(refreshOptions);
        if (refreshedSnapshot) {
          verifiedCount = countVerifiedImportRows(successRows, refreshedSnapshot);
          verificationFailedCount = successRows.length - verifiedCount;
          if (verificationFailedCount > 0) {
            setAiSetupNewItemError(`저장 응답 후 ${verificationFailedCount}개 항목이 DB 재조회에서 확인되지 않았습니다.`);
          }
        } else {
          refreshFailed = true;
          setAiSetupNewItemError("저장은 완료됐지만 현재 단가표를 다시 확인하지 못했습니다. 기존 화면 데이터는 유지했습니다.");
        }
      }

      setAiSetupNewItemResult({
        createdCategoryCount: createdCategoryIds.size,
        createdSubitemCount: successRows.length,
        verifiedCount,
        verificationFailedCount,
        refreshFailed,
        skippedCount: skippedRows.length,
        failedCount: failedRows.length,
        failedRows,
        savedAt: new Date().toISOString(),
        savedNames: successRows.map((result) => getAiSaveTargetName(result.target)),
        skippedNames: skippedRows.map((result) => getAiSaveTargetName(result.target)),
      });

      if (failedRows.length === 0 && !refreshFailed && verificationFailedCount === 0) {
        setAiSetupNewItemConfirmOpen(false);
      }
    } catch (error) {
      console.error("[FORMATE AI setup new items]", error);
      setAiSetupNewItemError(getFriendlyError(error, "새 항목 후보를 단가표에 추가하지 못했습니다."));
    } finally {
      setAiSetupNewItemSaving(false);
    }
  }

  function renderAiSetupSaveResult({ result, title, successCount, successUnit = "개", successText, skippedText }) {
    if (!result) return null;
    const hasFailures = (result.failedCount ?? 0) > 0
      || (result.verificationFailedCount ?? 0) > 0
      || result.refreshFailed;
    const savedSummary = getCompactNameSummary(result.savedNames);
    const skippedSummary = getCompactNameSummary(result.skippedNames);
    const savedAtLabel = formatRecentSaveTime(result.savedAt);

    return (
      <div className={`ai-save-result ${hasFailures ? "has-failure" : "success"}`.trim()}>
        <div className="ai-save-result-head">
          <strong>{title} · {successCount}{successUnit}</strong>
          {savedAtLabel && <span>{savedAtLabel}</span>}
        </div>
        {successText && <p>{successText}</p>}
        {Number.isInteger(result.verifiedCount) && successCount > 0 && (
          <p>DB 재조회 확인 · {result.verifiedCount}/{successCount}개</p>
        )}
        {result.refreshFailed && <p>DB 재조회 실패 · 기존 화면 데이터 유지</p>}
        {(result.verificationFailedCount ?? 0) > 0 && (
          <p>DB 반영 미확인 · {result.verificationFailedCount}개</p>
        )}
        {savedSummary && <p>저장됨: {savedSummary}</p>}
        {(result.skippedCount ?? 0) > 0 && (
          <p>{skippedText ?? "건너뜀"} · {result.skippedCount}개{skippedSummary ? ` (${skippedSummary})` : ""}</p>
        )}
        {(result.failedCount ?? 0) > 0 && (
          <p>실패 · {result.failedCount}개</p>
        )}
        {aiSetupAutoExcludedCount > 0 && (
          <p>자동 저장 제외 · 비용/세금/검산/검토/무시 행 {aiSetupAutoExcludedCount}개</p>
        )}
        {((result.savedNames?.length ?? 0) > 0 || (result.skippedNames?.length ?? 0) > 0 || (result.failedRows?.length ?? 0) > 0) && (
          <details className="ai-save-result-details">
            <summary>자세히 보기</summary>
            {result.savedNames?.length > 0 && (
              <div>
                <b>저장된 항목</b>
                {result.savedNames.map((name, index) => <span key={`saved-${title}-${index}`}>{name}</span>)}
              </div>
            )}
            {result.skippedNames?.length > 0 && (
              <div>
                <b>건너뜀</b>
                {result.skippedNames.map((name, index) => <span key={`skipped-${title}-${index}`}>{name}</span>)}
              </div>
            )}
            {result.failedRows?.length > 0 && (
              <div>
                <b>실패</b>
                {result.failedRows.map((row, index) => (
                  <span key={`failed-${title}-${index}`}>
                    {getAiSaveTargetName(row.target)}: {row.reason || "저장 실패"}
                  </span>
                ))}
              </div>
            )}
          </details>
        )}
      </div>
    );
  }

  async function handleAdminVerify(event) {
    event.preventDefault();

    const password = adminVerifyPassword.trim();
    if (!selectedCompanyId) {
      handleChangeCompany();
      return;
    }
    if (!password) {
      setAdminVerifyError("비밀번호를 확인해주세요.");
      return;
    }
    if (!isSupabaseConfigured) {
      setAdminVerifyError("관리자 확인 중 문제가 발생했습니다.");
      return;
    }

    setAdminVerifyLoading(true);
    setAdminVerifyError("");
    try {
      try {
        await reauthenticateCompany({ company: selectedCompany, password });
      } catch {
        setAdminVerifyError("비밀번호를 확인해주세요.");
        return;
      }

      writeAdminVerifiedCompany(selectedCompanyId);
      const nextPage = pendingAdminPage || "admin";
      setAdminVerifyOpen(false);
      setAdminVerifyPassword("");
      setAdminVerifyError("");
      setPage(nextPage);
    } catch (error) {
      console.error("[FORMATE admin verify]", error);
      setAdminVerifyError("관리자 확인 중 문제가 발생했습니다.");
    } finally {
      setAdminVerifyLoading(false);
    }
  }

  async function ensureDefaultConstructionCatalog(companyId, itemRows = [], subitemRows = []) {
    // Defaults are an empty-company bootstrap, not a name-based reconciliation
    // identity. Customized catalogs are never filled or reinterpreted later.
    if (itemRows.length || subitemRows.length) return false;
    const initialized = await initializeDefaultConstructionCatalogAtomic({
      companyId,
      catalog: DEFAULT_CONSTRUCTION_CATALOG.map((item, itemIndex) => ({
        name: item.name,
        item_type: "itemized",
        item_kind: item.item_kind ?? "standard",
        is_favorite: false,
        sort_order: itemIndex,
        subitems: item.subitems.map(([name, unit], subitemIndex) => ({
          name,
          unit,
          sort_order: subitemIndex,
        })),
      })),
    });
    return Boolean(initialized.created);
  }

  async function ensurePyeongValuesForPyeong(subitemRows, pyeong, existingPyeongRows = []) {
    const selectedPyeong = Number(pyeong);
    if (!Number.isInteger(selectedPyeong) || selectedPyeong < 1 || selectedPyeong > 90) return false;

    const existingSubitemIds = new Set((existingPyeongRows ?? []).map((row) => row.subitem_id));
    const missingPayloads = (subitemRows ?? [])
      .filter((subitem) => subitem.id && !existingSubitemIds.has(subitem.id))
      .map((subitem) => ({
        subitem_id: subitem.id,
        pyeong: selectedPyeong,
        quantity: getDefaultQuantityForUnit(subitem.unit, selectedPyeong),
        labor_count: null,
      }));

    if (!missingPayloads.length) return false;

    await upsertSubitemPyeongValues(missingPayloads);
    return true;
  }

  function getAdminTemplateCondition() {
    if (!selectedAdminPyeong || !selectedAdminBuildType) return null;
    return buildTemplateCondition({
      pyeong: Number(selectedAdminPyeong),
      buildType: selectedAdminBuildType,
      hasExtension: selectedAdminBuildType === "old" ? Boolean(selectedAdminHasExtension) : false,
      conditionVariant: selectedAdminConditionVariant,
    });
  }

  function getEstimateTemplateCondition(nextCondition = condition) {
    if (!nextCondition.size || !nextCondition.buildType) return null;
    return buildTemplateCondition({
      pyeong: Number(nextCondition.size),
      buildType: nextCondition.buildType,
      hasExtension: nextCondition.buildType === "old" ? Boolean(nextCondition.expanded) : false,
      conditionVariant: nextCondition.conditionVariant,
    });
  }

  function initializeConditionVariantLabels(options = {}) {
    const companyId = selectedCompanyIdRef.current;
    const currentResource = conditionLabelsResourceRef.current;
    if (
      companyId
      && currentResource.companyId === companyId
      && ["loading", "ready"].includes(currentResource.status)
    ) {
      return Promise.resolve();
    }
    return fetchConditionVariantLabels(options);
  }

  async function fetchConditionVariantLabels(options = {}) {
    const requestId = conditionLabelsRequestRef.current + 1;
    conditionLabelsRequestRef.current = requestId;
    const loadCompanyId = selectedCompanyIdRef.current;
    if (!loadCompanyId) {
      setConditionVariantLabels(createConditionVariantLabelRows());
      updateConditionLabelsResource({ status: "idle", companyId: "", scopeKey: "condition-labels" });
      return;
    }
    updateConditionLabelsResource({
      status: "loading",
      companyId: loadCompanyId,
      scopeKey: "condition-labels",
    });
    if (!options.silent) {
      setAdminError("");
      setAdminNotice("");
    }

    try {
      if (!isSupabaseConfigured) {
        throw new Error(".env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해야 합니다.");
      }
      let rows;
      try {
        rows = await fetchConditionVariantLabelRows(loadCompanyId);
      } catch (error) {
        if (isMissingConditionVariantLabelsTable(error)) {
          if (
            requestId !== conditionLabelsRequestRef.current
            || loadCompanyId !== selectedCompanyIdRef.current
          ) return;
          setConditionVariantLabels(createConditionVariantLabelRows());
          updateConditionLabelsResource({
            status: "error",
            companyId: loadCompanyId,
            scopeKey: "condition-labels",
          });
          if (!options.silent) {
            setAdminError("확장형/구형 설명 테이블이 아직 없습니다. supabase/schema.sql의 condition_variant_labels SQL을 Supabase SQL Editor에 적용해주세요.");
          }
          return;
        }
        throw error;
      }

      if (
        requestId !== conditionLabelsRequestRef.current
        || loadCompanyId !== selectedCompanyIdRef.current
      ) return;
      setConditionVariantLabels(createConditionVariantLabelRows(rows));
      if (!options.silent && page === "admin-condition-labels") {
        setAdminNotice("확장형/구형 설명을 불러왔습니다.");
      }
      updateConditionLabelsResource({
        status: "ready",
        companyId: loadCompanyId,
        scopeKey: "condition-labels",
      });
    } catch (error) {
      if (
        requestId !== conditionLabelsRequestRef.current
        || loadCompanyId !== selectedCompanyIdRef.current
      ) return;
      updateConditionLabelsResource({
        status: "error",
        companyId: loadCompanyId,
        scopeKey: "condition-labels",
      });
      if (options.silent) {
        console.warn("[FORMATE condition variant labels]", error);
      } else {
        setAdminError(getFriendlyError(error, "확장형/구형 설명을 불러오지 못했어요. 다시 시도해주세요."));
      }
    }
  }

  function updateConditionVariantLabel(variantKey, patch) {
    setConditionVariantLabels((current) =>
      createConditionVariantLabelRows(current).map((row) =>
        row.variant_key === variantKey ? { ...row, ...patch } : row
      )
    );
  }

  async function saveConditionVariantLabels() {
    setAdminSaving(true);
    setAdminError("");
    setAdminNotice("");
    try {
      const companyId = requireSelectedCompanyId();
      const payloads = createConditionVariantLabelRows(conditionVariantLabels).map((row) => ({
        company_id: companyId,
        variant_key: row.variant_key,
        label: `${row.label ?? ""}`.trim(),
        description: `${row.description ?? ""}`.trim(),
      }));

      let rows;
      try {
        rows = await upsertConditionVariantLabelRows(payloads);
      } catch (error) {
        if (isMissingConditionVariantLabelsTable(error)) {
          throw new Error("condition_variant_labels 테이블이 아직 없습니다. supabase/schema.sql의 SQL을 Supabase SQL Editor에 적용한 뒤 다시 저장해주세요.");
        }
        throw error;
      }

      setConditionVariantLabels(createConditionVariantLabelRows(rows));
      updateConditionLabelsResource({
        status: "ready",
        companyId,
        scopeKey: "condition-labels",
      });
      setAdminNotice("확장형/구형 설명을 저장했습니다.");
      setPage("admin-items");
    } catch (error) {
      setAdminError(getFriendlyError(error, "확장형/구형 설명을 저장하지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminSaving(false);
    }
  }

  async function fetchAdminTemplateList() {
    const companyId = requireSelectedCompanyId();
    const rows = await fetchAdminTemplateRows(companyId);
    const nextTemplates = dedupeTemplatesByCondition(rows);
    if (companyId !== selectedCompanyIdRef.current) return [];
    adminTemplatesCompanyIdRef.current = companyId;
    setAdminTemplates(nextTemplates);
    return nextTemplates;
  }

  async function fetchTemplateRowByCondition(companyId, condition) {
    const candidates = [condition, ...getLegacyTemplateConditions(condition)].filter(Boolean);
    for (const candidate of candidates) {
      const rows = await fetchAdminTemplateCandidates(companyId, candidate);
      const representative = pickRepresentativeTemplate(rows);
      if (representative?.id) return representative;
    }
    return null;
  }

  function openTemplateDeleteDialog(template) {
    setTemplateDeleteTarget(template);
    setTemplateDeletePassword("");
    setTemplateDeleteError("");
    setAdminError("");
  }

  function closeTemplateDeleteDialog() {
    if (templateDeleteLoading) return;
    setTemplateDeleteTarget(null);
    setTemplateDeletePassword("");
    setTemplateDeleteError("");
  }

  async function confirmDeleteAdminTemplate(event) {
    event.preventDefault();

    if (!templateDeleteTarget?.id) {
      setTemplateDeleteError("삭제할 템플릿을 다시 선택해주세요.");
      return;
    }

    const password = templateDeletePassword.trim();
    if (!password) {
      setTemplateDeleteError("비밀번호를 확인해주세요.");
      return;
    }

    if (!isSupabaseConfigured) {
      setTemplateDeleteError("삭제 중 문제가 발생했습니다.");
      return;
    }

    setTemplateDeleteLoading(true);
    setTemplateDeleteError("");
    setAdminNotice("");
    setAdminError("");

    try {
      const companyId = requireSelectedCompanyId();
      try {
        await reauthenticateCompany({ company: selectedCompany, password });
      } catch {
        setTemplateDeleteError("비밀번호를 확인해주세요.");
        return;
      }

      const deletedTemplates = await deleteAdminTemplate(
        templateDeleteTarget.id,
        companyId
      );
      if (!deletedTemplates?.length) {
        throw new Error("삭제할 템플릿을 찾지 못했습니다.");
      }

      const deletedCurrentTemplate = currentAdminTemplateId === templateDeleteTarget.id;
      if (deletedCurrentTemplate) {
        setCurrentAdminTemplateId("");
      }
      setAdminTemplates((current) => current.filter((template) => template.id !== templateDeleteTarget.id));
      if (typeof window !== "undefined") {
        setAdminTemplateFavoriteIds((current) => {
          const next = current.filter((id) => `${id}` !== `${templateDeleteTarget.id}`);
          writeTemplateConditionFavorites(window.localStorage, companyId, next);
          return next;
        });
        setAdminTemplateRecentIds((current) => {
          const next = current.filter((id) => `${id}` !== `${templateDeleteTarget.id}`);
          writeTemplateConditionRecent(window.localStorage, companyId, next);
          return next;
        });
        if (`${lastSelectedAdminTemplateId}` === `${templateDeleteTarget.id}`) {
          setLastSelectedAdminTemplateId("");
          writeLastSelectedTemplateCondition(window.localStorage, companyId, "");
        }
      }
      setAdminNotice("템플릿을 삭제했습니다.");
      setTemplateDeleteTarget(null);
      setTemplateDeletePassword("");
      setTemplateDeleteError("");
      const nextTemplates = await fetchAdminTemplateList();
      if (deletedCurrentTemplate) {
        const nextTemplate = orderAdminTemplateRows(nextTemplates, adminTemplateOrder)[0] ?? null;
        if (nextTemplate) {
          await loadAdminTemplate(nextTemplate, { templateRows: nextTemplates });
        } else {
          setSelectedAdminPyeong("");
          setSelectedAdminBuildType("");
          setSelectedAdminHasExtension(false);
          setSelectedAdminConditionVariant("");
          setAdminConditionStep("select");
          setAdminCatalogResource({
            status: "ready",
            companyId,
            scopeKey: getAdminCatalogScopeKey("condition"),
          });
        }
      }
    } catch (error) {
      console.error("[FORMATE delete admin template]", error);
      setTemplateDeleteError(getFriendlyError(error, "템플릿을 삭제하지 못했어요. 다시 시도해주세요."));
    } finally {
      setTemplateDeleteLoading(false);
    }
  }

  async function loadAdminItems(
    options = {},
    { allowBootstrap = false, reuseCatalog = false } = {}
  ) {
    const requestId = adminCatalogLoadRequestRef.current + 1;
    adminCatalogLoadRequestRef.current = requestId;
    const requestedMode = options.mode ?? (page === "admin-prices" ? "prices" : "condition");
    let loadCompanyId = selectedCompanyIdRef.current ?? "";
    let loadScopeKey = getAdminCatalogScopeKey(requestedMode, options.template?.id);
    try {
      if (!isSupabaseConfigured) {
        throw new Error(".env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해야 합니다.");
      }
      const companyId = requireSelectedCompanyId();
      loadCompanyId = companyId;
      const mode = requestedMode;
      const shouldLoadConditionValues = mode === "condition";
      const requestedTemplateId = options.template?.id ?? "";
      loadScopeKey = getAdminCatalogScopeKey(mode, requestedTemplateId);
      setAdminCatalogResource({
        status: "loading",
        companyId,
        scopeKey: loadScopeKey,
      });
      setAdminError("");
      setAdminNotice("");
      setAdminPriceValidationError(null);

      const requestIsCurrent = () => (
        requestId === adminCatalogLoadRequestRef.current
        && companyId === selectedCompanyIdRef.current
      );

      const cachedSnapshot = adminCatalogSnapshotRef.current;
      const canReuseCatalog = Boolean(
        reuseCatalog
        && cachedSnapshot.companyId === companyId
        && cachedSnapshot.snapshot
      );
      const catalogPromise = canReuseCatalog
        ? Promise.resolve(cachedSnapshot.snapshot)
        : loadAdminCatalogSnapshot({
            companyId,
            readCatalog: fetchCanonicalConstructionCatalogRows,
            bootstrapCatalog: ensureDefaultConstructionCatalog,
            allowBootstrap,
            hasBootstrapBeenAttempted: () => adminCatalogBootstrapAttemptedRef.current.has(companyId),
            canBootstrap: () => requestIsCurrent(),
            markBootstrapAttempted: () => {
              adminCatalogBootstrapAttemptedRef.current.add(companyId);
              if (requestIsCurrent()) {
                setAdminNotice("FORMATE 기본 시공항목을 준비하고 있습니다.");
              }
            },
          });
      const suppliedTemplateRows = Array.isArray(options.templateRows)
        ? options.templateRows
        : null;
      const canReuseTemplates = shouldLoadConditionValues
        && !suppliedTemplateRows
        && !options.refreshTemplates
        && adminTemplatesCompanyIdRef.current === companyId;
      const templateRowsPromise = shouldLoadConditionValues
        ? suppliedTemplateRows
          ? Promise.resolve(suppliedTemplateRows)
          : canReuseTemplates
          ? Promise.resolve(adminTemplates)
          : fetchAdminTemplateRows(companyId)
        : Promise.resolve([]);
      const [snapshot, templateRows] = await Promise.all([
        catalogPromise,
        templateRowsPromise,
      ]);
      if (!requestIsCurrent()) return null;

      adminCatalogSnapshotRef.current = { companyId, snapshot };
      const { itemRows, subitemRows } = snapshot;
      const nextTemplates = shouldLoadConditionValues
        ? dedupeTemplatesByCondition(templateRows)
        : [];

      let templateValueRows = [];
      let nextTemplateId = "";
      let nextTemplate = options.template ?? null;
      let nextNotice = "";
      let adminTemplateCondition = Object.prototype.hasOwnProperty.call(options, "condition")
        ? options.condition
        : getAdminTemplateCondition();
      if (shouldLoadConditionValues && options.selectPreferredTemplate && !nextTemplate) {
        const orderedTemplates = orderAdminTemplateRows(nextTemplates, adminTemplateOrder);
        nextTemplate = orderedTemplates.find(
          (template) => `${template.id}` === `${currentAdminTemplateId}`
        ) ?? orderedTemplates.find(
          (template) => `${template.id}` === `${lastSelectedAdminTemplateId}`
        ) ?? orderedTemplates[0] ?? null;
      }
      if (nextTemplate?.id) {
        nextTemplate = nextTemplates.find(
          (template) => `${template.id}` === `${nextTemplate.id}`
        ) ?? nextTemplate;
        nextTemplateId = nextTemplate.id;
        adminTemplateCondition = normalizeTemplateRowCondition(nextTemplate);
      }
      if (shouldLoadConditionValues && adminTemplateCondition) {
        const templateRow = nextTemplate?.id
          ? nextTemplate
          : await fetchTemplateRowByCondition(companyId, adminTemplateCondition);
        nextTemplate = templateRow ?? null;
        nextTemplateId = templateRow?.id ?? "";

        if (templateRow?.id) {
          templateValueRows = await fetchAdminTemplateValues(templateRow.id);
        } else {
          nextNotice = "아직 이 조건의 견적 템플릿이 없습니다. 기본 수량과 기본 인원을 입력한 뒤 저장하세요.";
        }
      } else if (shouldLoadConditionValues && snapshot.bootstrapped) {
        nextNotice = "기본 시공항목이 준비되었습니다. 먼저 조건을 선택한 뒤 관리하기를 눌러주세요.";
      } else if (!shouldLoadConditionValues && snapshot.bootstrapped) {
        nextNotice = "기본 시공항목이 준비되었습니다. 공통 단가와 인건비를 입력하세요.";
      }

      if (!requestIsCurrent()) return null;
      if (shouldLoadConditionValues) {
        adminTemplatesCompanyIdRef.current = companyId;
        setAdminTemplates(nextTemplates);
        if (nextTemplate?.id) {
          applyAdminTemplateSelection(nextTemplate, {
            remember: options.rememberSelection !== false,
          });
        } else {
          setCurrentAdminTemplateId("");
          setAdminConditionStep(adminTemplateCondition ? "edit" : "select");
        }
      }
      setAdminNotice(nextNotice);
      if (!shouldLoadConditionValues) {
        const latestUpdatedAt = subitemRows
          .map((subitem) => subitem.updated_at)
          .filter(Boolean)
          .sort()
          .at(-1);
        if (latestUpdatedAt) setAdminCommonPriceSavedAt(latestUpdatedAt);
      }
      const nextAdminItems = normalizeAdminItems(
        itemRows,
        subitemRows,
        templateValueRows,
        snapshot.canonicalCatalog
      );
      setAdminItems(nextAdminItems);
      setSelectedSubitemIdByProduct((current) => (
        reconcileAdminProductSelections(nextAdminItems, current)
      ));
      setAdminCatalogResource({
        status: "ready",
        companyId,
        scopeKey: shouldLoadConditionValues
          ? getAdminCatalogScopeKey("condition", nextTemplateId)
          : getAdminCatalogScopeKey("prices"),
      });
      return snapshot;
    } catch (error) {
      if (
        requestId === adminCatalogLoadRequestRef.current
        && (!loadCompanyId || loadCompanyId === selectedCompanyIdRef.current)
      ) {
        setAdminNotice("");
        setAdminError(getFriendlyError(error, "데이터를 불러오지 못했어요. 다시 시도해주세요."));
        setAdminCatalogResource({
          status: "error",
          companyId: loadCompanyId,
          scopeKey: loadScopeKey,
        });
      }
      return null;
    }
  }

  function fetchAdminItems(options = {}) {
    return loadAdminItems(options, {
      allowBootstrap: false,
      reuseCatalog: Boolean(options.reuseCatalog),
    });
  }

  function initializeAdminItems(options = {}) {
    const companyId = selectedCompanyIdRef.current;
    const mode = options.mode ?? (page === "admin-prices" ? "prices" : "condition");
    const expectedScopeKey = getAdminCatalogScopeKey(
      mode,
      options.template?.id ?? currentAdminTemplateId
    );
    const currentResource = adminCatalogResourceRef.current;
    if (
      companyId
      && currentResource.companyId === companyId
      && currentResource.scopeKey === expectedScopeKey
      && ["loading", "ready"].includes(currentResource.status)
    ) {
      return Promise.resolve(adminCatalogSnapshotRef.current.snapshot);
    }
    return loadAdminItems(options, { allowBootstrap: true, reuseCatalog: true });
  }

  function doesSavedEstimateMatchSearch(estimate, searchText = estimateSearch) {
    const normalizedKeyword = searchText.trim().toLowerCase();
    if (!normalizedKeyword) return true;

    const addressText = `${estimate?.address ?? ""}`.toLowerCase();
    const customerText = getSavedEstimateCustomerName(estimate).toLowerCase();
    return addressText.includes(normalizedKeyword) || customerText.includes(normalizedKeyword);
  }

  function initializeEstimateLists() {
    const companyId = selectedCompanyIdRef.current;
    const currentResource = estimateListResourceRef.current;
    if (
      companyId
      && currentResource.companyId === companyId
      && ["loading", "ready"].includes(currentResource.status)
    ) {
      return Promise.resolve();
    }
    return fetchEstimates();
  }

  async function fetchEstimates() {
    const requestId = estimateListRequestRef.current + 1;
    estimateListRequestRef.current = requestId;
    let loadCompanyId = selectedCompanyIdRef.current ?? "";
    try {
      if (!isSupabaseConfigured) {
        throw new Error(".env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해야 합니다.");
      }
      const companyId = requireSelectedCompanyId();
      loadCompanyId = companyId;
      updateEstimateListResource({
        status: "loading",
        companyId,
        scopeKey: "estimates",
      });
      setAdminError("");
      const { active: activeRows, trash: trashRows } = await fetchSavedEstimateLists(companyId);
      if (
        estimateListRequestRef.current !== requestId
        || companyId !== selectedCompanyIdRef.current
      ) return;

      setEstimates(activeRows);
      setTrashedEstimates(trashRows);
      setEstimateListCounts({
        active: activeRows.length,
        trash: trashRows.length,
      });
      updateEstimateListResource({
        status: "ready",
        companyId,
        scopeKey: "estimates",
      });
    } catch (error) {
      if (
        estimateListRequestRef.current !== requestId
        || (loadCompanyId && loadCompanyId !== selectedCompanyIdRef.current)
      ) return;
      setAdminError(getFriendlyError(error, "견적서 목록을 불러오지 못했어요. 다시 시도해주세요."));
      updateEstimateListResource({
        status: "error",
        companyId: loadCompanyId,
        scopeKey: "estimates",
      });
    }
  }

  function handleEstimateShared({ result, form }) {
    const patchEstimate = (estimate) => {
      if (!estimate || estimate.id !== shareEstimateTarget?.id) return estimate;
      const currentConsultation = Array.isArray(estimate.consultation)
        ? estimate.consultation[0]
        : estimate.consultation;
      const nextConsultation = {
        ...currentConsultation,
        customer_id: result.customerId,
        project_id: result.projectId,
        customer: {
          id: result.customerId,
          name: form.customerName,
          phone: form.customerPhone,
          email: form.customerEmail,
        },
        project: {
          id: result.projectId,
          name: form.projectName,
          address: form.projectBaseAddress || form.projectAddress,
          detail_address: form.projectDetailAddress,
          deleted_at: null,
        },
      };
      return {
        ...estimate,
        status: result.status || "sent",
        current_estimate_version_id: result.estimateVersionId,
        has_unpublished_changes: false,
        consultation: Array.isArray(estimate.consultation)
          ? [nextConsultation]
          : nextConsultation,
      };
    };

    setEstimates((current) => current.map(patchEstimate));
    setSelectedEstimate((current) => patchEstimate(current));
    setShareEstimateTarget((current) => patchEstimate(current));
  }

  function openEstimateDeleteDialog(event, estimate) {
    estimateDeleteTriggerRef.current = event.currentTarget;
    setEstimateDeleteNotice("");
    setEstimateDeleteError("");
    setEstimateDeleteTarget(estimate);
  }

  function closeEstimateDeleteDialog() {
    if (estimateDeleteLoading) return;
    setEstimateDeleteTarget(null);
    setEstimateDeleteError("");
    window.requestAnimationFrame(() => {
      estimateDeleteTriggerRef.current?.focus();
    });
  }

  async function confirmSavedEstimateRemoval() {
    const estimateId = estimateDeleteTarget?.id;
    if (!estimateId || estimateDeleteLoading) return;

    setEstimateDeleteLoading(true);
    setEstimateDeleteError("");
    setEstimateDeleteNotice("");

    try {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase is not configured.");
      }

      const companyId = requireSelectedCompanyId();
      const result = await moveSavedEstimateToTrash({ estimateId, companyId });

      if (
        !result?.ok
        || ![
          SAVED_ESTIMATE_TRASH_RESULT.MOVED_TO_TRASH,
          SAVED_ESTIMATE_TRASH_RESULT.ALREADY_IN_TRASH,
        ].includes(result?.result)
      ) {
        setEstimateDeleteError("견적을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      const trashedEstimate = {
        ...estimateDeleteTarget,
        deleted_at: result?.deletedAt ?? new Date().toISOString(),
        delete_reason: estimateDeleteTarget.delete_reason || "user_deleted",
      };
      setEstimates((current) => current.filter((estimate) => estimate.id !== estimateId));
      setTrashedEstimates((current) => [
        trashedEstimate,
        ...current.filter((estimate) => estimate.id !== estimateId),
      ].sort((a, b) => new Date(b.deleted_at ?? 0).getTime() - new Date(a.deleted_at ?? 0).getTime()));
      if (result.result === SAVED_ESTIMATE_TRASH_RESULT.MOVED_TO_TRASH) {
        setEstimateListCounts((current) => ({
          active: Math.max(0, current.active - 1),
          trash: current.trash + 1,
        }));
      }
      setSelectedEstimate((current) => current?.id === estimateId ? null : current);
      setShareEstimateTarget((current) => current?.id === estimateId ? null : current);
      setEstimateDeleteTarget(null);
      setEstimateDeleteNotice("견적을 휴지통으로 이동했습니다.");

      window.requestAnimationFrame(() => {
        document.querySelector(".estimate-search-panel input")?.focus();
      });
    } catch (error) {
      setEstimateDeleteError("견적을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setEstimateDeleteLoading(false);
    }
  }

  async function restoreTrashedEstimate(estimate) {
    if (!estimate?.id || estimateRestoreLoadingId) return;

    setEstimateRestoreLoadingId(estimate.id);
    setEstimateDeleteNotice("");
    setAdminError("");

    try {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase is not configured.");
      }

      const companyId = requireSelectedCompanyId();
      const result = await restoreSavedEstimate({
        estimateId: estimate.id,
        companyId,
      });

      if (
        !result?.ok
        || ![
          SAVED_ESTIMATE_RESTORE_RESULT.RESTORED,
          SAVED_ESTIMATE_RESTORE_RESULT.ALREADY_RESTORED,
        ].includes(result?.result)
      ) {
        setAdminError("견적을 복원하지 못했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      const restoredEstimate = {
        ...estimate,
        deleted_at: null,
        deleted_by: null,
        delete_reason: null,
      };
      const restoreToActiveList = isOperationalEstimate(restoredEstimate);
      setTrashedEstimates((current) => current.filter((row) => row.id !== estimate.id));
      setEstimates((current) => {
        if (!restoreToActiveList) {
          return current;
        }
        return [
          restoredEstimate,
          ...current.filter((row) => row.id !== estimate.id),
        ].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
      });
      if (result.result === SAVED_ESTIMATE_RESTORE_RESULT.RESTORED) {
        setEstimateListCounts((current) => ({
          active: current.active + Number(restoreToActiveList),
          trash: Math.max(0, current.trash - 1),
        }));
      }
      setSelectedEstimate((current) => current?.id === estimate.id ? null : current);
      setEstimateDeleteNotice("견적을 복원했습니다.");
    } catch (error) {
      setAdminError("견적을 복원하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setEstimateRestoreLoadingId("");
    }
  }

  function clearAdminPriceValidationErrorForSubitem(subitemId, nextName = "") {
    if (!`${nextName ?? ""}`.trim()) return;
    setAdminPriceValidationError((current) =>
      current?.subitemId === subitemId ? null : current
    );
  }

  function focusAdminPriceValidationRow(subitem, parent) {
    if (!subitem?.id) return;
    if (parent?.id) {
      const parentVisible = filteredAdminItems.some((item) => item.id === parent.id);
      if (!parentVisible) {
        setAdminSearch("");
        setAdminFavoriteOnly(false);
      }
      setSelectedAdminCategoryId(parent.id);
      setExpandedAdminItemIds((current) => [...new Set([...current, parent.id])]);
    }
    scrollToAdminPriceRow(subitem.id);
  }

  function requestAdminCatalogLeave(action) {
    if (!hasUnsavedAdminCatalogChanges) {
      action();
      return;
    }
    pendingAdminLeaveActionRef.current = action;
    setAdminUnsavedLeaveOpen(true);
    setAdminUnsavedLeaveError("");
  }

  function closeAdminUnsavedLeaveDialog() {
    pendingAdminLeaveActionRef.current = null;
    setAdminUnsavedLeaveOpen(false);
    setAdminUnsavedLeaveSaving(false);
    setAdminUnsavedLeaveError("");
    setAiSetupFileName("");
    setAiSetupStatus("idle");
    setAiSetupError("");
    setAiSetupSheets([]);
    setSelectedAiSetupSheetName("");
    setAiSetupHeaderRowIndex(-1);
    setAiSetupColumnMappings([]);
    setAiSetupCatalogItems([]);
    setAiSetupCatalogLoading(false);
    setAiSetupCatalogError("");
    setAiSetupMatchOverrides({});
    setAiSetupApplyCondition(createEmptyAiSetupApplyCondition());
    setAiSetupApplyConditionTouched(createEmptyAiSetupConditionTouched());
    setAiSetupPriceConfirmOpen(false);
    setAiSetupPriceSaving(false);
    setAiSetupPriceResult(null);
    setAiSetupPriceError("");
    setAiSetupTemplateConfirmOpen(false);
    setAiSetupTemplateSaving(false);
    setAiSetupTemplateResult(null);
    setAiSetupTemplateError("");
    setAiSetupNewItemConfirmOpen(false);
    setAiSetupNewItemSaving(false);
    setAiSetupNewItemResult(null);
    setAiSetupNewItemError("");
    setAiSetupAiLoading(false);
    setAiSetupAiError("");
    setAiSetupAiResult(null);
  }

  async function saveAndLeaveAdminCatalog() {
    setAdminUnsavedLeaveSaving(true);
    setAdminUnsavedLeaveError("");
    try {
      const target = normalizeAdminSaveTarget(autoSaveTargetRef.current || getCurrentAutoSaveTarget());
      const saved = await saveAdminPrices({
        target,
        stayOnPage: true,
        refetch: false,
      });
      if (!saved) throw new Error("저장하지 못했습니다.");
      markAdminCatalogSavedNow(target);
      const action = pendingAdminLeaveActionRef.current;
      closeAdminUnsavedLeaveDialog();
      if (action) action();
    } catch (error) {
      setAdminUnsavedLeaveError(getFriendlyError(error, "저장하지 못했습니다. 다시 시도해주세요."));
    } finally {
      setAdminUnsavedLeaveSaving(false);
    }
  }

  function updateCondition(patch) {
    setCondition((current) => ({ ...current, ...patch }));
    if (
      Object.prototype.hasOwnProperty.call(patch, "buildType") ||
      Object.prototype.hasOwnProperty.call(patch, "expanded") ||
      Object.prototype.hasOwnProperty.call(patch, "conditionVariant")
    ) {
      setConditionLabelEditOpen(false);
      setConditionLabelDrafts({});
    }
    setEstimateError("");
  }

  function getEstimateConditionVariantEditKeys(nextCondition = condition) {
    if (nextCondition.buildType === "new") return EXTENDED_VARIANTS;
    if (nextCondition.buildType === "old") {
      return nextCondition.expanded ? OLD_EXTENDED_VARIANTS : [OLD_NO_EXTENSION_VARIANT];
    }
    return [];
  }

  function openEstimateConditionLabelEditor(variantKeys = getEstimateConditionVariantEditKeys()) {
    setConditionLabelDrafts(
      Object.fromEntries(
        variantKeys.map((variantKey) => [
          variantKey,
          `${estimateConditionVariantLabels[variantKey] ?? getConditionVariantLabel(variantKey, conditionVariantLabelMap) ?? ""}`,
        ])
      )
    );
    setConditionLabelEditOpen(true);
  }

  function saveEstimateConditionVariantLabel(variantKeys = getEstimateConditionVariantEditKeys()) {
    if (!condition.buildType || !variantKeys.length) return;
    setEstimateConditionVariantLabels((current) => {
      const next = { ...current };
      variantKeys.forEach((variantKey) => {
        const nextLabel = `${conditionLabelDrafts[variantKey] ?? ""}`.trim();
        if (nextLabel) next[variantKey] = nextLabel;
        else delete next[variantKey];
      });
      return next;
    });
    setConditionLabelEditOpen(false);
    setConditionLabelDrafts({});
    setEstimateNotice("이 견적서에서만 조건 이름을 변경했습니다.");
  }

  function renderEstimateConditionLabelEditor(variantKeys) {
    if (!conditionLabelEditOpen) return null;
    return (
      <div className="condition-variant-label-editor">
        <div>
          <strong>이 견적서에서만 이름 변경</strong>
          <span>관리자 전역 설정에는 적용되지 않습니다. 빈 값은 전역 이름 또는 기본 key로 표시됩니다.</span>
        </div>
        <div className="condition-variant-label-grid">
          {variantKeys.map((variantKey) => (
            <label key={variantKey}>
              {variantKey}
              <input
                className="ui-input"
                value={conditionLabelDrafts[variantKey] ?? ""}
                onChange={(event) =>
                  setConditionLabelDrafts((current) => ({
                    ...current,
                    [variantKey]: event.target.value,
                  }))
                }
                placeholder={getConditionVariantLabel(variantKey, conditionVariantLabelMap) || variantKey}
              />
            </label>
          ))}
        </div>
        <div className="condition-variant-label-actions">
          <button type="button" className="secondary-button" onClick={() => saveEstimateConditionVariantLabel(variantKeys)}>
            적용
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setConditionLabelEditOpen(false);
              setConditionLabelDrafts({});
            }}
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  async function openAdminConditionEditor(
    condition,
    template = null,
    { refreshTemplates = false, templateRows = null } = {}
  ) {
    if (!condition) return;
    await fetchAdminItems({
      mode: "condition",
      condition,
      template,
      rememberSelection: false,
      refreshTemplates,
      templateRows,
      reuseCatalog: true,
    });
    setAdminConditionStep("edit");
  }

  function rememberAdminTemplateSelection(templateId) {
    if (!templateId || !selectedCompanyId || typeof window === "undefined") return;
    setLastSelectedAdminTemplateId(`${templateId}`);
    writeLastSelectedTemplateCondition(window.localStorage, selectedCompanyId, templateId);
    setAdminTemplateRecentIds((current) => {
      const next = addRecentTemplateCondition(current, templateId);
      writeTemplateConditionRecent(window.localStorage, selectedCompanyId, next);
      return next;
    });
  }

  function toggleAdminTemplateFavorite(templateId) {
    if (!selectedCompanyId || typeof window === "undefined") return;
    setAdminTemplateFavoriteIds((current) => {
      const next = toggleFavoriteTemplateCondition(current, templateId);
      writeTemplateConditionFavorites(window.localStorage, selectedCompanyId, next);
      return next;
    });
  }

  function applyAdminTemplateSelection(template, { remember = false } = {}) {
    if (!template?.id) return null;
    const condition = normalizeTemplateRowCondition(template);
    setSelectedAdminPyeong(String(template.pyeong));
    setSelectedAdminBuildType(condition.condition_variant.startsWith("확장형") ? "new" : "old");
    setSelectedAdminHasExtension(Boolean(condition.has_extension));
    setSelectedAdminConditionVariant(condition.condition_variant);
    setCurrentAdminTemplateId(template.id);
    setAdminConditionStep("edit");
    if (remember) rememberAdminTemplateSelection(template.id);
    return condition;
  }

  async function returnToAdminConditionSelect() {
    setAdminConditionStep("select");
    setCurrentAdminTemplateId("");
    await fetchAdminItems({ mode: "condition", condition: null });
  }

  async function loadAdminTemplate(template, options = {}) {
    const condition = applyAdminTemplateSelection(template, { remember: true });
    await openAdminConditionEditor(condition, template, options);
  }

  function updateAdminTemplateConditionDraft(patch) {
    setAdminTemplateConditionDraft((current) => {
      const next = { ...current, ...patch };
      if (Object.prototype.hasOwnProperty.call(patch, "buildType")) {
        if (patch.buildType === "new") {
          next.hasExtension = false;
          next.conditionVariant = EXTENDED_VARIANTS[0] ?? "";
        } else if (patch.buildType === "old") {
          next.hasExtension = false;
          next.conditionVariant = OLD_NO_EXTENSION_VARIANT;
        }
      }
      if (Object.prototype.hasOwnProperty.call(patch, "hasExtension") && next.buildType === "old") {
        next.conditionVariant = patch.hasExtension
          ? OLD_EXTENDED_VARIANTS.includes(next.conditionVariant)
            ? next.conditionVariant
            : OLD_EXTENDED_VARIANTS[0] ?? ""
          : OLD_NO_EXTENSION_VARIANT;
      }
      return next;
    });
    setAdminError("");
  }

  function openAdminTemplateConditionDrawer() {
    setAdminTemplateConditionDrawerMode("create");
    setAdminTemplateConditionSourceId("");
    setAdminTemplateConditionDraft(createEmptyAdminTemplateConditionDraft());
    setAdminTemplateConditionDrawerOpen(true);
    setAdminPyeongDropdownOpen(false);
    setAdminError("");
  }

  function openAdminTemplateConditionEditDrawer(template) {
    setAdminTemplateConditionDrawerMode("edit");
    setAdminTemplateConditionSourceId(template.id);
    setAdminTemplateConditionDraft(createAdminTemplateConditionDraft(template));
    setAdminTemplateConditionDrawerOpen(true);
    setAdminPyeongDropdownOpen(false);
    setAdminError("");
  }

  function openAdminTemplateConditionDuplicateDrawer(template) {
    setAdminTemplateConditionDrawerMode("duplicate");
    setAdminTemplateConditionSourceId(template.id);
    setAdminTemplateConditionDraft(createAdminTemplateConditionDraft(template));
    setAdminTemplateConditionDrawerOpen(true);
    setAdminPyeongDropdownOpen(false);
    setAdminError("");
  }

  function closeAdminTemplateConditionDrawer() {
    setAdminTemplateConditionDrawerOpen(false);
    setAdminPyeongDropdownOpen(false);
    setAdminTemplateConditionDrawerMode("create");
    setAdminTemplateConditionSourceId("");
    setAdminTemplateConditionDraft(createEmptyAdminTemplateConditionDraft());
  }

  function handleAdminTemplateDragStart(event, templateId) {
    setDragAdminTemplateId(templateId);
    setDragOverAdminTemplateId("");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", templateId);
  }

  function handleAdminTemplateDragOver(event, templateId) {
    if (!dragAdminTemplateId || dragAdminTemplateId === templateId) return;
    event.preventDefault();
    setDragOverAdminTemplateId(templateId);
  }

  function clearAdminTemplateDragState() {
    setDragAdminTemplateId("");
    setDragOverAdminTemplateId("");
  }

  function reorderAdminTemplates(dropTemplateId) {
    if (!dragAdminTemplateId || dragAdminTemplateId === dropTemplateId) {
      clearAdminTemplateDragState();
      return;
    }
    const orderedIds = orderedAdminTemplates.map((template) => template.id);
    const fromIndex = orderedIds.indexOf(dragAdminTemplateId);
    const toIndex = orderedIds.indexOf(dropTemplateId);
    if (fromIndex < 0 || toIndex < 0) {
      clearAdminTemplateDragState();
      return;
    }
    const nextOrder = [...orderedIds];
    const [movedId] = nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, movedId);
    setAdminTemplateOrder(nextOrder);
    writeAdminTemplateOrder(selectedCompanyId, nextOrder);
    clearAdminTemplateDragState();
  }

  async function saveAdminTemplateFromDrawer() {
    if (!adminTemplateConditionDraftValue) {
      setAdminError("평수와 주택 조건을 선택해주세요.");
      return;
    }

    const drawerMode = adminTemplateConditionDrawerMode;
    const draftKey = getTemplateConditionKey(adminTemplateConditionDraftValue);
    const sourceTemplate = adminTemplates.find((template) => `${template.id}` === `${adminTemplateConditionSourceId}`);
    if (drawerMode === "duplicate" && sourceTemplate && getTemplateConditionKey(sourceTemplate) === draftKey) {
      setAdminError("복제할 조건에서 하나 이상 변경해주세요.");
      return;
    }
    const existingTemplate = adminTemplates.find((template) =>
      getTemplateConditionKey(template) === draftKey
      && `${template.id}` !== `${adminTemplateConditionSourceId}`
    );
    if (existingTemplate?.id) {
      if (drawerMode !== "create") {
        setAdminError("이미 존재하는 조건입니다. 다른 조건 값으로 변경해주세요.");
        return;
      }
      setNewlyCreatedAdminTemplateKey(draftKey);
      window.setTimeout(() => setNewlyCreatedAdminTemplateKey(""), 1600);
      closeAdminTemplateConditionDrawer();
      await loadAdminTemplate(existingTemplate);
      setAdminNotice("이미 존재하는 조건입니다. 기존 조건을 열었습니다.");
      return;
    }

    setAdminSaving(true);
    setAdminError("");
    setAdminNotice("");
    try {
      const companyId = requireSelectedCompanyId();
      const atomicTemplate = await saveAdminTemplateAtomic({
        companyId,
        condition: adminTemplateConditionDraftValue,
        mode: drawerMode === "duplicate"
          ? "duplicate"
          : drawerMode === "edit"
            ? "edit"
            : "upsert",
        templateId: drawerMode === "edit"
          ? adminTemplateConditionSourceId
          : null,
        sourceTemplateId: drawerMode === "duplicate"
          ? adminTemplateConditionSourceId
          : null,
      });
      const templateRow = atomicTemplate.template;

      if (templateRow?.id) {
        const nextOrder = drawerMode === "edit"
          ? adminTemplateOrder.includes(templateRow.id)
            ? adminTemplateOrder
            : [...adminTemplateOrder, templateRow.id]
          : [...adminTemplateOrder.filter((id) => id !== templateRow.id), templateRow.id];
        setAdminTemplateOrder(nextOrder);
        writeAdminTemplateOrder(companyId, nextOrder);
      }

      setSelectedAdminPyeong(String(adminTemplateConditionDraftValue.pyeong));
      setSelectedAdminBuildType(adminTemplateConditionDraft.buildType);
      setSelectedAdminHasExtension(Boolean(adminTemplateConditionDraftValue.has_extension));
      setSelectedAdminConditionVariant(adminTemplateConditionDraftValue.condition_variant);
      setCurrentAdminTemplateId(templateRow?.id ?? "");
      rememberAdminTemplateSelection(templateRow?.id);
      setNewlyCreatedAdminTemplateKey(getTemplateConditionKey(adminTemplateConditionDraftValue));
      window.setTimeout(() => setNewlyCreatedAdminTemplateKey(""), 1600);
      closeAdminTemplateConditionDrawer();
      await openAdminConditionEditor(
        adminTemplateConditionDraftValue,
        templateRow,
        { refreshTemplates: true }
      );
      setAdminNotice(
        drawerMode === "edit"
          ? "기본 견적 조건을 수정했습니다."
          : drawerMode === "duplicate"
            ? "조건과 템플릿 값을 복제했습니다."
            : "새 기본 견적 조건을 만들었습니다."
      );
    } catch (error) {
      setAdminError(getFriendlyError(error, "기본 견적 조건을 저장하지 못했습니다. 다시 시도해주세요."));
    } finally {
      setAdminSaving(false);
    }
  }

  function hasCurrentCompanySubitem(subitemId) {
    return adminItems.some((item) =>
      item.subitems?.some((subitem) => subitem.id === subitemId)
    );
  }

  function rebuildAdminItemCanonicalProducts(item) {
    if (!Array.isArray(item?.products)) return item;
    const currentSubitemsById = new Map(
      (item.subitems ?? []).map((subitem) => [subitem.id, subitem])
    );
    const canonicalSubitems = (item.canonicalSourceSubitems ?? [])
      .map((subitem) => currentSubitemsById.get(subitem.id) ?? subitem);
    const canonicalSubitemIds = new Set(
      canonicalSubitems.map((subitem) => subitem.id)
    );
    const productModel = buildCanonicalConstructionProductModel({
      subitems: [
        ...canonicalSubitems,
        ...(item.subitems ?? []).filter(
          (subitem) => !canonicalSubitemIds.has(subitem.id)
        ),
      ],
      variantGroups: item.variantGroups ?? [],
    });
    return {
      ...item,
      products: productModel.products,
    };
  }

  function toggleAdminItemExpanded(itemId) {
    setExpandedAdminItemIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    );
  }

  function expandVisibleAdminItems() {
    setExpandedAdminItemIds((current) => [
      ...new Set([...current, ...filteredAdminItems.map((item) => item.id)]),
    ]);
  }

  function collapseVisibleAdminItems() {
    const visibleIds = new Set(filteredAdminItems.map((item) => item.id));
    setExpandedAdminItemIds((current) => current.filter((id) => !visibleIds.has(id)));
  }

  function updateLocalSubitemName(subitemId, name) {
    setAdminItems((current) =>
      current.map((item) => rebuildAdminItemCanonicalProducts({
        ...item,
        subitems: item.subitems.map((subitem) =>
          subitem.id === subitemId ? { ...subitem, name, option_value: "" } : subitem
        ),
      }))
    );
    markAdminCatalogDirty();
  }

  function getVisibleAdminSubitems(item) {
    const subitems = item.subitems ?? [];
    if (!adminSearchTerm || item.name.toLowerCase().includes(adminSearchTerm)) return subitems;
    return subitems.filter((subitem) => subitem.name.toLowerCase().includes(adminSearchTerm));
  }

  function getVisibleAdminProducts(item) {
    return filterAdminProductRows(item, adminSearchTerm);
  }

  function selectAdminCanonicalVariant(productId, constructionSubitemId) {
    const product = adminItems
      .flatMap((item) => item.products ?? [])
      .find((entry) => entry.productId === productId);
    if (!product?.selectableSubitemIds?.includes(constructionSubitemId)) return;
    setSelectedSubitemIdByProduct((current) => ({
      ...current,
      [productId]: constructionSubitemId,
    }));
  }

  function toggleExpansionSpace(space) {
    setCondition((current) => {
      const exists = current.expansionSpaces.includes(space);
      return {
        ...current,
        expansionSpaces: exists
          ? current.expansionSpaces.filter((entry) => entry !== space)
          : [...current.expansionSpaces, space],
      };
    });
  }

  function isEstimateConditionComplete(nextCondition = condition) {
    if (!nextCondition.size || !nextCondition.buildType || !nextCondition.occupancy) return false;
    const variant = getConditionVariant(nextCondition);
    if (nextCondition.buildType === "new") return EXTENDED_VARIANTS.includes(variant);
    if (nextCondition.buildType === "old") {
      if (!nextCondition.expanded) return variant === OLD_NO_EXTENSION_VARIANT;
      return OLD_EXTENDED_VARIANTS.includes(variant);
    }
    return false;
  }

  function canGoNext() {
    return isEstimateConditionComplete(condition);
  }

  function mergeEstimateDraftItems(nextItems, previousItems) {
    return reconcileEstimateDraftItems({
      nextItems,
      previousItems,
      applyRowPatch: applyEstimateRowPatch,
      recalculateRow: recalculateEstimateRow,
    });
  }

  async function applyEstimateConditionChangePipeline(nextCondition, {
    forceBlank = false,
    navigateToItems = false,
    preserveDraft = estimateConditionEditMode,
  } = {}) {
    if (!isEstimateConditionComplete(nextCondition)) return false;

    const result = await runEstimateConditionChange({
      nextCondition,
      preserveDraft,
      forceBlank,
      updateCondition: (resolvedCondition) => {
        estimateConditionRef.current = resolvedCondition;
        setCondition(resolvedCondition);
      },
      loadCatalog: fetchEstimateCatalog,
    });

    if (result.applied && navigateToItems) {
      setEstimateConditionEditMode(false);
      setEstimateConditionDrawerOpen(false);
      setPage("items");
    }
    return result.applied;
  }

  function loadEstimateFromCondition({ forceBlank = false } = {}) {
    estimatePyeongChangeRef.current?.reset();
    return applyEstimateConditionChangePipeline(condition, {
      preserveDraft: estimateConditionEditMode,
      forceBlank,
      navigateToItems: true,
    });
  }

  function invalidatePendingEstimatePyeongChange() {
    estimateBlankCatalogRequestRef.current += 1;
    setEstimateLoading(false);
  }

  function applyEstimatePyeongCondition(pyeong) {
    const nextCondition = {
      ...estimateConditionRef.current,
      size: pyeong,
    };
    return applyEstimateConditionChangePipeline(nextCondition, {
      preserveDraft: true,
      navigateToItems: false,
    });
  }

  estimatePyeongApplyRef.current = applyEstimatePyeongCondition;
  estimatePyeongInvalidateRef.current = invalidatePendingEstimatePyeongChange;

  function handleEstimatePyeongInputChange(event) {
    const value = event.target.value;
    skipNextEstimatePyeongBlurRef.current = false;
    setEstimatePyeong(value);
    estimatePyeongChangeRef.current.queue(value);
  }

  function flushEstimatePyeongInput(value) {
    const applied = estimatePyeongChangeRef.current.flush(value);
    if (!applied) setEstimatePyeong(estimateConditionRef.current?.size ?? "");
    return applied;
  }

  function handleEstimatePyeongInputBlur(event) {
    if (skipNextEstimatePyeongBlurRef.current) {
      skipNextEstimatePyeongBlurRef.current = false;
      return;
    }
    flushEstimatePyeongInput(event.currentTarget.value);
  }

  function handleEstimatePyeongInputKeyDown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    skipNextEstimatePyeongBlurRef.current = true;
    flushEstimatePyeongInput(event.currentTarget.value);
  }

  function openNewEstimateCondition() {
    estimatePyeongChangeRef.current?.reset();
    resetEstimateDraftForNewStart();
    setEstimateTemplateConflicts([]);
    setEstimateTemplateConditionKey("");
    setEstimateConditionDrawerOpen(true);
    setPage("condition");
  }

  function moveAppHistory(direction) {
    if (!canMoveInternalPageHistory(navigationHistory, direction)) return;
    const nextHistory = moveInternalPageHistory(navigationHistory, direction);
    const nextPage = getCurrentInternalPage(nextHistory);

    if (
      direction === "forward"
      && page === "condition"
      && nextPage === "items"
      && estimateTemplateConditionKey !== makeConditionKey(condition)
    ) {
      loadEstimateFromCondition();
      return;
    }

    if (direction === "back" && page === "items" && nextPage === "condition") {
      setEstimateConditionEditMode(true);
      setEstimateConditionDrawerOpen(true);
    }
    if (nextPage === "items") {
      setEstimateConditionDrawerOpen(false);
    }

    setNavigationHistory(nextHistory);
  }

  function closeEstimateConditionStage() {
    if (page === "condition") {
      moveAppHistory("back");
      return;
    }
    setEstimateConditionDrawerOpen(false);
  }

  async function fetchEstimateCatalog(pyeong = condition.size, nextCondition = condition, options = {}) {
    const requestId = estimateBlankCatalogRequestRef.current + 1;
    estimateBlankCatalogRequestRef.current = requestId;
    const loadCompanyId = selectedCompanyId;
    const preserveDraft = Boolean(options.preserveDraft);
    const forceBlank = Boolean(options.forceBlank);
    setEstimateLoading(true);
    setEstimateError("");
    setEstimateNotice("");
    try {
      if (!isSupabaseConfigured) {
        throw new Error(".env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해야 합니다.");
      }
      if (!pyeong) {
        throw new Error("평수를 먼저 선택하세요.");
      }
      const companyId = requireSelectedCompanyId();

      const snapshot = await loadAdminCatalogSnapshot({
        companyId,
        readCatalog: fetchEstimateConstructionCatalogRows,
        bootstrapCatalog: ensureDefaultConstructionCatalog,
        allowBootstrap: true,
        hasBootstrapBeenAttempted: () => adminCatalogBootstrapAttemptedRef.current.has(companyId),
        canBootstrap: () => (
          requestId === estimateBlankCatalogRequestRef.current
          && companyId === selectedCompanyIdRef.current
        ),
        markBootstrapAttempted: () => {
          adminCatalogBootstrapAttemptedRef.current.add(companyId);
        },
      });
      if (
        requestId !== estimateBlankCatalogRequestRef.current
        || companyId !== selectedCompanyIdRef.current
      ) return false;
      const { itemRows, subitemRows } = snapshot;

      let templateValueRows = [];
      let templateFound = false;
      const templateCondition = getEstimateTemplateCondition(nextCondition);
      if (templateCondition && !forceBlank) {
        const templateRow = await fetchTemplateRowByCondition(companyId, templateCondition);

        if (templateRow?.id) {
          templateFound = true;
          templateValueRows = await fetchAdminTemplateValues(templateRow.id);
        }
      }

      if (
        requestId !== estimateBlankCatalogRequestRef.current
        || companyId !== selectedCompanyIdRef.current
      ) return false;

      const catalog = normalizeAdminItems(
        itemRows,
        subitemRows,
        templateValueRows,
        snapshot.canonicalCatalog
      );
      let sashUsageContext = {};
      if (catalog.some((item) => isSashItem(item))) {
        try {
          sashUsageContext = await fetchSashUsageRankingContext(companyId);
        } catch (rankingError) {
          console.error("Failed to load sash usage rankings", rankingError);
          setEstimateNotice("대표제품 사용 이력을 불러오지 못해 샷시는 미선택으로 시작합니다.");
        }
      }
      if (
        requestId !== estimateBlankCatalogRequestRef.current
        || companyId !== selectedCompanyIdRef.current
      ) return false;
      const nextItems = buildEstimateItemsFromTemplate(
        catalog,
        pyeong,
        nextCondition.occupancy,
        {
          sashUsageRankings: sashUsageContext.rankings,
          sashCatalogEntries: sashUsageContext.sashCatalogEntries,
          sashCatalogPins: sashUsageContext.sashCatalogPins,
        }
      );
      const firstCategoryId = catalog[0]?.id ?? "";

      const draftResult = preserveDraft
        ? mergeEstimateDraftItems(nextItems, estimateItemsRef.current)
        : { items: nextItems, conflicts: [] };

      setEstimateCatalog(catalog);
      setItems(draftResult.items);
      if (!preserveDraft) {
        clearEstimateAutoSaveTimer();
        setEstimateAutoSaveStatus("idle");
        setEstimateAutoSaveError("");
      }
      setEstimateTemplateConflicts(draftResult.conflicts);
      setEstimateTemplateConditionKey(makeConditionKey(nextCondition));
      if (!preserveDraft) setActiveCategories([]);
      setOpenCategory((current) =>
        preserveDraft && catalog.some((item) => item.id === current) ? current : firstCategoryId
      );
      setEstimatePyeong(String(pyeong));
      setEstimateDraftSource(templateFound ? "template" : "blank");
      return true;
    } catch (error) {
      if (
        requestId === estimateBlankCatalogRequestRef.current
        && loadCompanyId === selectedCompanyIdRef.current
      ) {
        setEstimateNotice("");
        setEstimateError(getFriendlyError(error, "견적 템플릿을 불러오지 못했어요. 다시 시도해주세요."));
      }
      return false;
    } finally {
      if (
        requestId === estimateBlankCatalogRequestRef.current
        && loadCompanyId === selectedCompanyIdRef.current
      ) {
        setEstimateLoading(false);
      }
    }
  }

  async function preloadBlankEstimateCatalogForNewStart() {
    const requestId = estimateBlankCatalogRequestRef.current + 1;
    estimateBlankCatalogRequestRef.current = requestId;
    setEstimateLoading(true);
    setEstimateError("");
    setEstimateNotice("");

    try {
      if (!isSupabaseConfigured) {
        throw new Error(".env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해야 합니다.");
      }

      const companyId = requireSelectedCompanyId();
      const { itemRows, subitemRows, variantGroupRows } = await fetchEstimateConstructionCatalogRows(companyId);
      if (estimateBlankCatalogRequestRef.current !== requestId) return false;

      const canonicalCatalog = buildCanonicalConstructionCatalog({
        itemRows,
        subitemRows,
        variantGroupRows,
      });
      const catalog = normalizeAdminItems(itemRows, subitemRows, [], canonicalCatalog);
      const nextItems = buildEstimateItemsFromTemplate(catalog, "", "empty");

      setEstimateCatalog(catalog);
      setItems(nextItems);
      clearEstimateAutoSaveTimer();
      setEstimateAutoSaveStatus("idle");
      setEstimateAutoSaveError("");
      setActiveCategories([]);
      setOpenCategory(catalog[0]?.id ?? "");
      setEstimateDraftSource("blank");
      setEstimateTemplateConflicts([]);
      setEstimateTemplateConditionKey("");
      return true;
    } catch (error) {
      if (estimateBlankCatalogRequestRef.current === requestId) {
        setEstimateError(getFriendlyError(error, "단가표 항목을 불러오지 못했습니다. 조건을 선택하거나 다시 시도해 주세요."));
      }
      return false;
    } finally {
      if (estimateBlankCatalogRequestRef.current === requestId) {
        setEstimateLoading(false);
      }
    }
  }

  function toggleCategory(categoryId) {
    setActiveCategories((current) => (current.includes(categoryId) ? current : [...current, categoryId]));
    setOpenCategory(categoryId);
  }

  function recalculateEstimateRow(row) {
    return calculateEstimateRow(row);
  }

  function clearEstimateAutoSaveTimer() {
    if (estimateAutoSaveTimerRef.current === null) return;
    globalThis.clearTimeout(estimateAutoSaveTimerRef.current);
    estimateAutoSaveTimerRef.current = null;
  }

  async function runEstimateAutoSave() {
    clearEstimateAutoSaveTimer();
    if (estimateAutoSaveRunningRef.current) {
      estimateAutoSaveQueuedRef.current = true;
      return;
    }
    estimateAutoSaveRunningRef.current = true;
    setEstimateAutoSaveStatus("saving");
    setEstimateAutoSaveError("");
    try {
      const saved = await estimateAutoSaveRunnerRef.current?.();
      setEstimateAutoSaveStatus(saved === false ? "dirty" : "saved");
    } catch (error) {
      setEstimateAutoSaveStatus("error");
      setEstimateAutoSaveError(getFriendlyError(error, "견적 작업본을 자동 저장하지 못했습니다."));
    } finally {
      estimateAutoSaveRunningRef.current = false;
      if (estimateAutoSaveQueuedRef.current) {
        estimateAutoSaveQueuedRef.current = false;
        estimateAutoSaveTimerRef.current = globalThis.setTimeout(() => {
          estimateAutoSaveTimerRef.current = null;
          void runEstimateAutoSave();
        }, 800);
      }
    }
  }

  function queueEstimateAutoSave({ immediate = false } = {}) {
    clearEstimateAutoSaveTimer();
    setEstimateAutoSaveStatus((current) => (current === "saving" ? current : "dirty"));
    setEstimateAutoSaveError("");
    if (estimateAutoSaveRunningRef.current) {
      estimateAutoSaveQueuedRef.current = true;
      return;
    }
    estimateAutoSaveTimerRef.current = globalThis.setTimeout(() => {
      estimateAutoSaveTimerRef.current = null;
      void runEstimateAutoSave();
    }, immediate ? 0 : 800);
  }

  function updateItem(categoryId, index, patch, { immediate = false } = {}) {
    setItems((current) => ({
      ...current,
      [categoryId]: current[categoryId].map((row, rowIndex) =>
        rowIndex === index ? recalculateEstimateRow(applyEstimateRowPatch(row, patch)) : row
      ),
    }));
    queueEstimateAutoSave({ immediate });
  }

  function getEstimateTemplateConflict(row, categoryId) {
    return getEstimateDraftRowKeys({ ...row, categoryId })
      .map((rowKey) => estimateTemplateConflictByRowKey.get(rowKey))
      .find((conflict) => conflict?.categoryId === categoryId);
  }

  function getEstimateTemplateConflictFieldLabel(conflict) {
    return (conflict?.fields ?? [])
      .map((fieldKey) => (fieldKey === "quantity" ? "수량" : fieldKey === "laborCount" ? "인원" : ""))
      .filter(Boolean)
      .join("·");
  }

  function keepEstimateTemplateOverrides() {
    setEstimateTemplateConflicts([]);
  }

  function applyEstimateTemplateValuesToOverrides() {
    const conflictsByRowKey = new Map(
      estimateTemplateConflicts.map((conflict) => [conflict.rowKey, conflict])
    );

    setItems((current) =>
      Object.fromEntries(
        Object.entries(current).map(([categoryId, rows]) => [
          categoryId,
          (rows ?? []).map((row) => {
            const conflict = getEstimateDraftRowKeys({ ...row, categoryId })
              .map((rowKey) => conflictsByRowKey.get(rowKey))
              .find((entry) => entry?.categoryId === categoryId);
            if (!conflict) return row;

            const nextRow = { ...row };
            conflict.fields.forEach((fieldKey) => {
              const field = ESTIMATE_TEMPLATE_DERIVED_FIELDS.find((entry) => entry.fieldKey === fieldKey);
              if (field) nextRow[field.fieldKey] = nextRow[field.baseKey] ?? "";
            });
            return recalculateEstimateRow(nextRow);
          }),
        ])
      )
    );
    setEstimateTemplateConflicts([]);
  }

  async function handleOpenItemPhotos(row) {
    const subitemId = row?.subitemId ?? "";
    const subitemName = row?.itemType === "flat" ? row?.itemName : row?.material;
    if (subitemId && selectedPhotoSubitemId === subitemId) {
      estimatePhotoRequestRef.current = "";
      setSelectedPhotoSubitemId("");
      setSelectedPhotoSubitemName("");
      setEstimateItemPhotos([]);
      setEstimateItemPhotosError("");
      setEstimatePhotoViewerIndex(null);
      return;
    }

    setSelectedPhotoSubitemId(subitemId);
    estimatePhotoRequestRef.current = subitemId;
    setSelectedPhotoSubitemName(subitemName ?? "");
    setEstimateItemPhotos([]);
    setEstimateItemPhotosError("");
    setEstimatePhotoViewerIndex(null);

    if (!subitemId) {
      setEstimateItemPhotosError("이 항목은 세부항목 ID가 없어 사진을 조회할 수 없습니다.");
      return;
    }

    setIsLoadingEstimateItemPhotos(true);
    try {
      const companyId = requireSelectedCompanyId();
      const photosWithSignedUrls = await listPyeongSubitemPhotos({
        companyId,
        pyeong: row?.pyeong || estimatePyeong || condition.size,
        constructionSubitemId: subitemId,
        sashCatalogEntryId:
          row?.selectedSashCatalogEntryId || row?.sashCatalogEntryId || null,
      });
      if (estimatePhotoRequestRef.current === subitemId) {
        setEstimateItemPhotos(photosWithSignedUrls);
      }
    } catch (error) {
      console.error("[FORMATE estimate item photos]", error);
      if (estimatePhotoRequestRef.current === subitemId) {
        setEstimateItemPhotosError(getFriendlyError(error, "사진을 불러오지 못했습니다."));
      }
    } finally {
      if (estimatePhotoRequestRef.current === subitemId) {
        setIsLoadingEstimateItemPhotos(false);
      }
    }
  }

  function closeEstimateItemPhotoPanel() {
    estimatePhotoRequestRef.current = "";
    setSelectedPhotoSubitemId("");
    setSelectedPhotoSubitemName("");
    setEstimateItemPhotos([]);
    setEstimateItemPhotosError("");
    setIsLoadingEstimateItemPhotos(false);
    setEstimatePhotoViewerIndex(null);
  }

  function renderEstimateItemPhotoPanel(row) {
    if (!row?.subitemId || selectedPhotoSubitemId !== row.subitemId) return null;
    return (
      <div className="estimate-item-photo-panel">
        <div className="estimate-item-photo-header">
          <div>
            <strong>{selectedPhotoSubitemName || row.material || row.itemName || "세부항목"} 사진</strong>
            <p>사진 관리/확인 &gt; 평형별 사진 관리에 등록된 사진입니다.</p>
          </div>
          <button type="button" className="ghost compact-button" onClick={closeEstimateItemPhotoPanel}>
            닫기
          </button>
        </div>

        {isLoadingEstimateItemPhotos ? (
          <div className="photo-empty-inline">사진을 불러오는 중입니다.</div>
        ) : estimateItemPhotosError ? (
          <div className="error-box">{estimateItemPhotosError}</div>
        ) : estimateItemPhotos.length === 0 ? (
          <div className="photo-empty-inline">
            등록된 사진이 없습니다.
            <span>사진 관리/확인에서 세부항목 사진을 추가할 수 있습니다.</span>
          </div>
        ) : (
          <div className="estimate-item-photo-grid">
            {estimateItemPhotos.map((photo, index) => {
              const imageUrl = getPhotoImageUrl(photo);
              const isPrimary = index === 0 && Boolean(photo.isPrimary);
              const originalFilename = photo.originalFilename || photo.original_filename || "";
              return (
                <figure className={isPrimary ? "primary" : ""} key={photo.id}>
                  <button
                    type="button"
                    className="estimate-item-photo-thumb"
                    onClick={() => setEstimatePhotoViewerIndex(index)}
                    aria-label={`${selectedPhotoSubitemName || "세부항목"} ${index + 1}번째 사진 확대 보기`}
                  >
                    {imageUrl ? <img src={imageUrl} alt={originalFilename || selectedPhotoSubitemName || "세부항목 사진"} /> : <Image size={24} />}
                    {isPrimary && <span>대표</span>}
                  </button>
                  <figcaption title={originalFilename}>{originalFilename || "사진"}</figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function addEstimateAdjustment() {
    setEstimateAdjustments((current) => [
      ...current,
      {
        id: createLocalId("adjustment"),
        label: "",
        type: "charge",
        amount: "",
        visibleToCustomer: true,
        memo: "",
      },
    ]);
  }

  function updateEstimateAdjustment(adjustmentId, patch) {
    setEstimateAdjustments((current) =>
      current.map((adjustment) =>
        adjustment.id === adjustmentId ? { ...adjustment, ...patch } : adjustment
      )
    );
  }

  function removeEstimateAdjustment(adjustmentId) {
    setEstimateAdjustments((current) =>
      current.filter((adjustment) => adjustment.id !== adjustmentId)
    );
  }

  function renderEstimateAdjustmentEditor() {
    return (
      <div className="estimate-adjustment-panel">
        <div className="selected-summary-header">
          <h3>추가금/할인</h3>
          <button type="button" className="secondary-button" onClick={addEstimateAdjustment}>
            <Plus size={16} /> 추가금/할인 추가
          </button>
        </div>
        {estimateAdjustments.length ? (
          <div className="adjustment-list">
            {estimateAdjustments.map((adjustment) => (
              <div className="adjustment-row" key={adjustment.id}>
                <input
                  className="ui-input"
                  value={adjustment.label}
                  onChange={(event) =>
                    updateEstimateAdjustment(adjustment.id, { label: event.target.value })
                  }
                  placeholder="예: 폐기물 추가"
                />
                <select
                  className="ui-select"
                  value={adjustment.type}
                  onChange={(event) =>
                    updateEstimateAdjustment(adjustment.id, { type: event.target.value })
                  }
                >
                  <option value="charge">추가금</option>
                  <option value="discount">할인</option>
                </select>
                <input
                  className="ui-input"
                  type="text"
                  inputMode="numeric"
                  value={formatMoneyInputValue(adjustment.amount)}
                  onChange={(event) =>
                    updateEstimateAdjustment(adjustment.id, { amount: stripNumberInputFormatting(event.target.value) })
                  }
                  placeholder="금액"
                />
                <label className="adjustment-visible-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(adjustment.visibleToCustomer)}
                    onChange={(event) =>
                      updateEstimateAdjustment(adjustment.id, {
                        visibleToCustomer: event.target.checked,
                      })
                    }
                  />
                  고객용 표시
                </label>
                <input
                  className="ui-input"
                  value={adjustment.memo ?? ""}
                  onChange={(event) =>
                    updateEstimateAdjustment(adjustment.id, { memo: event.target.value })
                  }
                  placeholder="내부 메모"
                />
                <button
                  type="button"
                  className="secondary-button adjustment-delete-button"
                  onClick={() => removeEstimateAdjustment(adjustment.id)}
                >
                  <Trash2 size={16} /> 삭제
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted selected-summary-empty">
            현장 상황에 따른 추가금이나 할인이 있으면 추가하세요.
          </p>
        )}
      </div>
    );
  }

  function renderEstimateAdjustmentSummary() {
    return (
      <div className="customer-adjustment-preview">
        <h3>추가금/할인</h3>
        {cleanEstimateAdjustments.length ? (
          <table className="preview-table customer-adjustment-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>구분</th>
                <th>금액</th>
              </tr>
            </thead>
            <tbody>
              {cleanEstimateAdjustments.map((adjustment) => (
                <tr key={adjustment.id}>
                  <td>{adjustment.label || (adjustment.type === "discount" ? "할인" : "추가 공사비")}</td>
                  <td>{adjustment.type === "discount" ? "할인" : "추가금"}</td>
                  <td>
                    <span className={`signed-total ${adjustment.type === "discount" ? "negative" : ""}`}>
                      {adjustment.type === "discount" ? "-" : "+"}
                      <PriceText value={getAdjustmentAmount(adjustment)} size="sm" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted selected-summary-empty">추가금/할인 항목이 없습니다.</p>
        )}
      </div>
    );
  }

  function renderGeneralEstimateTable() {
    return (
      <table className="preview-table general-estimate-table">
        <thead>
          <tr>
            <th>시공항목</th>
            <th>내용</th>
            <th>공급가</th>
            <th>세액</th>
          </tr>
        </thead>
        <tbody>
          {selectedRows.map((row, index) => (
            <tr key={`${row.categoryId}-${row.material}-${index}`}>
              <td>{row.categoryName}</td>
              <td>{row.material}</td>
              <td><PriceText value={row.totalAmount} size="sm" /></td>
              <td><PriceText value={getTemporaryTaxAmount(row.totalAmount)} size="sm" /></td>
            </tr>
          ))}
          {!selectedRows.length && (
            <tr>
              <td colSpan="4">선택된 소재가 없습니다.</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="2">선택 항목 공급가</td>
            <td><PriceText value={selectedItemsTotal} size="md" /></td>
            <td><PriceText value={getTemporaryTaxAmount(selectedItemsTotal)} size="md" /></td>
          </tr>
          <tr>
            <td colSpan="2">추가금/할인</td>
            <td colSpan="2">
              <span className={`signed-total ${adjustmentTotal < 0 ? "negative" : ""}`}>
                {adjustmentTotal >= 0 ? "+" : "-"}
                <PriceText value={Math.abs(adjustmentTotal)} size="sm" />
              </span>
            </td>
          </tr>
          <tr>
            <td colSpan="2">최종 견적 금액</td>
            <td colSpan="2"><PriceText value={total} size="md" /></td>
          </tr>
        </tfoot>
      </table>
    );
  }

  function renderDetailEstimateTable() {
    return (
      <div className="detail-estimate-groups">
        {Object.entries(selectedRowsByCategory).map(([categoryName, rows]) => (
          <section className="detail-estimate-group" key={categoryName}>
            <h3>{categoryName}</h3>
            <table className="preview-table detail-estimate-table">
              <thead>
                <tr>
                  <th>소재/업체</th>
                  <th>규격</th>
                  <th>단가/인건비</th>
                  <th>수량/인원</th>
                  <th>공급가</th>
                  <th>세액</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <Fragment key={`${row.categoryId}-${row.subitemId ?? row.material}-${index}`}>
                    <tr>
                      <td>{row.material}</td>
                      <td>{getEstimateRowSpecLabel(row) || "규격 없음"}</td>
                      <td><PriceText value={row.unitPrice} size="sm" /></td>
                      <td><PriceText value={row.quantity} unit={row.unit} size="sm" /></td>
                      <td><PriceText value={row.productAmount} size="sm" /></td>
                      <td><PriceText value={getTemporaryTaxAmount(row.productAmount)} size="sm" /></td>
                    </tr>
                    <tr className="labor-detail-row">
                      <td>{row.contractor || "-"}</td>
                      <td>인</td>
                      <td><PriceText value={row.laborRate} size="sm" /></td>
                      <td><PriceText value={row.laborCount} unit="명" size="sm" /></td>
                      <td><PriceText value={row.laborAmount} size="sm" /></td>
                      <td><PriceText value={getTemporaryTaxAmount(row.laborAmount)} size="sm" /></td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        {!selectedRows.length && <p className="muted selected-summary-empty">선택된 소재가 없습니다.</p>}
      </div>
    );
  }

  function getEstimateTemplateValuePayloads() {
    return Object.values(items)
      .flatMap((rows) => rows ?? [])
      .filter((row) => row.subitemId && (hasNumericInput(row.quantity) || hasNumericInput(row.laborCount)))
      .map((row) => ({
        item_id: row.itemId,
        subitem_ref: row.subitemId,
        quantity: toNullableNumber(row.quantity),
        labor_count: toNullableNumber(row.laborCount),
      }));
  }

  function getBlankEstimateTemplateWrite() {
    if (estimateDraftSource !== "blank") return null;

    const templateCondition = getEstimateTemplateCondition(condition);
    if (!templateCondition) return null;

    const pendingTemplateValues = getEstimateTemplateValuePayloads();
    if (!pendingTemplateValues.length) return null;
    return {
      condition: templateCondition,
      values: pendingTemplateValues,
    };
  }

  function loadSavedEstimateDraft(estimate, { copy = false, destination = "preview" } = {}) {
    if (!isOperationalEstimate(estimate)) {
      setSelectedEstimate(null);
      setEstimateNotice("휴지통의 견적 또는 휴지통 현장에 연결된 견적은 사용할 수 없습니다.");
      return;
    }

    const snapshot = estimate.condition_snapshot ?? {};
    const restoredDraft = restoreEstimateDraft(estimate);
    const restoredConditionVariant = restoredDraft.condition.conditionVariant;

    clearEstimateAutoSaveTimer();
    estimateAutoSaveQueuedRef.current = false;
    estimateAggregateIdRef.current = copy ? null : estimate.id;
    estimateClientDraftKeyRef.current = copy
      ? createEstimateDraftKey()
      : estimate.client_draft_key || createEstimateDraftKey();

    setCondition(restoredDraft.condition);
    setItems(restoredDraft.items);
    setEstimateCatalog(restoredDraft.catalog);
    setActiveCategories(restoredDraft.catalog.map((group) => group.id));
    setOpenCategory(restoredDraft.catalog[0]?.id ?? "");
    setEstimatePyeong(restoredDraft.estimatePyeong);
    setEstimateAdjustments(restoredDraft.adjustments);
    setSiteMemo(restoredDraft.siteMemo);
    setCustomerName(copy ? "" : `${restoredDraft.meta.customerName ?? ""}`);
    setCustomerPhone(copy ? "" : `${restoredDraft.meta.customerPhone ?? ""}`);
    setAddress(copy ? "" : estimate.address ?? "");
    setWorkDate(copy ? "" : estimate.construction_date ?? "");
    setEstimateVatStatus(restoredDraft.meta.vatStatus ?? "부가세 별도");
    setEstimateIssuedAt(copy ? getTodayDateInput() : restoredDraft.meta.createdDate ?? getDateInputFromValue(estimate.created_at));
    const restoredConditionVariantLabel =
      `${snapshot.condition_variant_display_label ?? snapshot.conditionVariantDisplayLabel ?? ""}`.trim();
    const restoredConditionVariantLabelOverrides =
      snapshot.condition_variant_label_overrides && typeof snapshot.condition_variant_label_overrides === "object"
        ? snapshot.condition_variant_label_overrides
        : {};
    setEstimateConditionVariantLabels({
      ...restoredConditionVariantLabelOverrides,
      ...(restoredConditionVariantLabel && restoredConditionVariant
        ? { [restoredConditionVariant]: restoredConditionVariantLabel }
        : {}),
    });
    setConditionLabelEditOpen(false);
    setConditionLabelDrafts({});
    setStep(3);
    setSelectedEstimate(null);
    setEstimateError("");
    setEstimateAutoSaveStatus(copy ? "idle" : "saved");
    setEstimateAutoSaveError("");
    setEstimateNotice(copy ? "기존 견적서를 복사한 새 초안입니다. 고객 정보와 현장 정보를 입력한 뒤 저장하세요." : "");
    setEstimateDraftSource("template");
    setEstimateConditionEditMode(false);
    setEstimateTemplateConflicts([]);
    setEstimateTemplateConditionKey(makeConditionKey(restoredDraft.condition));
    estimatePhotoRequestRef.current = "";
    setSelectedPhotoSubitemId("");
    setSelectedPhotoSubitemName("");
    setEstimateItemPhotos([]);
    setIsLoadingEstimateItemPhotos(false);
    setEstimateItemPhotosError("");
    setPreviewBackPage(destination === "preview" && !copy ? "admin-estimates" : "items");
    if (destination === "preview") setEstimatePreviewType("general");
    setPage(destination);
  }

  function unselectEstimateRow(targetRow) {
    setItems((current) => ({
      ...current,
      [targetRow.categoryId]: (current[targetRow.categoryId] ?? []).map((row) => {
        const sameSubitem = targetRow.subitemId && row.subitemId === targetRow.subitemId;
        const sameMaterial = !targetRow.subitemId && row.material === targetRow.material;
        return sameSubitem || sameMaterial ? { ...row, selected: false, expanded: false } : row;
      }),
    }));
  }

  function addMaterial() {
    const name = newMaterialName.trim();
    if (!name || !openCategory) return;
    setItems((current) => ({
      ...current,
      [openCategory]: [...current[openCategory], { material: name, price: "", selected: true }],
    }));
    setNewMaterialName("");
  }

  function resetFlow() {
    estimateAggregateIdRef.current = null;
    estimateClientDraftKeyRef.current = createEstimateDraftKey();
    setPage("landing");
    setStep(1);
    setCondition({
      size: "",
      buildType: "",
      powderRoom: false,
      dressRoom: false,
      expanded: false,
      conditionVariant: "",
      expansionSpaces: [],
      occupancy: "",
    });
    setItems({});
    setActiveCategories([]);
    setOpenCategory("");
    setCustomerName("");
    setCustomerPhone("");
    setAddress("");
    setWorkDate("");
    setEstimatePyeong("");
    setEstimateAdjustments([]);
    setSiteMemo("");
    setEstimateVatStatus("부가세 별도");
    setEstimateIssuedAt(getTodayDateInput());
    setEstimateConditionVariantLabels({});
    setConditionLabelEditOpen(false);
    setConditionLabelDrafts({});
    setEstimateCatalog([]);
    setEstimateError("");
    setEstimateNotice("");
    setEstimateDraftSource("template");
    setEstimateConditionEditMode(false);
    setEstimateTemplateConflicts([]);
    setEstimateTemplateConditionKey("");
    estimatePhotoRequestRef.current = "";
    setSelectedPhotoSubitemId("");
    setSelectedPhotoSubitemName("");
    setEstimateItemPhotos([]);
    setIsLoadingEstimateItemPhotos(false);
    setEstimateItemPhotosError("");
    setEstimatePreviewType("general");
  }

  function resetEstimateDraftForNewStart() {
    clearEstimateAutoSaveTimer();
    estimateAutoSaveQueuedRef.current = false;
    estimateAggregateIdRef.current = null;
    estimateClientDraftKeyRef.current = createEstimateDraftKey();
    estimateBlankCatalogRequestRef.current += 1;
    setStep(1);
    setCondition({
      size: "",
      buildType: "",
      powderRoom: false,
      dressRoom: false,
      expanded: false,
      conditionVariant: "",
      expansionSpaces: [],
      occupancy: "",
    });
    setItems({});
    setActiveCategories([]);
    setOpenCategory("");
    setCustomerName("");
    setCustomerPhone("");
    setAddress("");
    setWorkDate("");
    setEstimatePyeong("");
    setEstimateAdjustments([]);
    setSiteMemo("");
    setEstimateVatStatus("부가세 별도");
    setEstimateIssuedAt(getTodayDateInput());
    setEstimateConditionVariantLabels({});
    setConditionLabelEditOpen(false);
    setConditionLabelDrafts({});
    setEstimateCatalog([]);
    setEstimateError("");
    setEstimateNotice("");
    setEstimateAutoSaveStatus("idle");
    setEstimateAutoSaveError("");
    setEstimateDraftSource("template");
    setEstimateConditionEditMode(false);
    setEstimateTemplateConflicts([]);
    setEstimateTemplateConditionKey("");
    estimatePhotoRequestRef.current = "";
    setSelectedPhotoSubitemId("");
    setSelectedPhotoSubitemName("");
    setEstimateItemPhotos([]);
    setIsLoadingEstimateItemPhotos(false);
    setEstimateItemPhotosError("");
    setPreviewBackPage("items");
    setEstimatePreviewType("general");
  }

  function clearCompanyScopedState() {
    estimateListRequestRef.current += 1;
    adminCatalogLoadRequestRef.current += 1;
    conditionLabelsRequestRef.current += 1;
    adminCatalogSnapshotRef.current = { companyId: "", snapshot: null };
    adminTemplatesCompanyIdRef.current = "";
    setAdminCatalogResource({ status: "idle", companyId: "", scopeKey: "" });
    updateEstimateListResource({ status: "idle", companyId: "", scopeKey: "estimates" });
    updateConditionLabelsResource({ status: "idle", companyId: "", scopeKey: "condition-labels" });
    resetFlow();
    setContractEditorTarget(null);
    setAdminItems([]);
    setAdminError("");
    setAdminNotice("");
    setAdminSearch("");
    setAdminFavoriteOnly(false);
    setExpandedAdminItemIds([]);
    setAdminTemplates([]);
    setCurrentAdminTemplateId("");
    setAdminCommonPriceSavedAt("");
    setSelectedAdminPyeong("");
    setSelectedAdminBuildType("");
    setSelectedAdminHasExtension(false);
    setSelectedAdminConditionVariant("");
    resetDetailCosts();
    setEstimates([]);
    setTrashedEstimates([]);
    setEstimateSearch("");
    setEstimateListView("active");
    setEstimateListCounts({ active: 0, trash: 0 });
    setSelectedEstimate(null);
    setEstimateDeleteTarget(null);
    setEstimateDeleteLoading(false);
    setEstimateDeleteError("");
    setEstimateDeleteNotice("");
    setEstimateRestoreLoadingId("");
    estimatePhotoRequestRef.current = "";
    setSelectedPhotoSubitemId("");
    setSelectedPhotoSubitemName("");
    setEstimateItemPhotos([]);
    setIsLoadingEstimateItemPhotos(false);
    setEstimateItemPhotosError("");
    resetPhotoManagement();
    setDragItemId("");
    setDragOverItemId("");
    setDragSubitem(null);
    setDragOverSubitem(null);
    resetAdminAutoSave();
    pendingAdminLeaveActionRef.current = null;
    setAdminUnsavedLeaveOpen(false);
    setAdminUnsavedLeaveSaving(false);
    setAdminUnsavedLeaveError("");
    setAiSetupFileName("");
    setAiSetupStatus("idle");
    setAiSetupError("");
    setAiSetupSheets([]);
    setSelectedAiSetupSheetName("");
    setAiSetupHeaderRowIndex(-1);
    setAiSetupColumnMappings([]);
    setAiSetupCatalogItems([]);
    setAiSetupCatalogLoading(false);
    setAiSetupCatalogError("");
    setAiSetupMatchOverrides({});
    setAiSetupApplyCondition(createEmptyAiSetupApplyCondition());
    setAiSetupApplyConditionTouched(createEmptyAiSetupConditionTouched());
    setAiSetupPriceConfirmOpen(false);
    setAiSetupPriceSaving(false);
    setAiSetupPriceResult(null);
    setAiSetupPriceError("");
    setAiSetupTemplateConfirmOpen(false);
    setAiSetupTemplateSaving(false);
    setAiSetupTemplateResult(null);
    setAiSetupTemplateError("");
    setAiSetupNewItemConfirmOpen(false);
    setAiSetupNewItemSaving(false);
    setAiSetupNewItemResult(null);
    setAiSetupNewItemError("");
    setAiSetupAiLoading(false);
    setAiSetupAiError("");
    setAiSetupAiResult(null);
  }

  async function addAdminItem() {
    const existingNames = new Set(adminItems.map((item) => item.name.trim()));
    let name = "새 대분류";
    let suffix = 2;
    while (existingNames.has(name)) {
      name = `새 대분류 ${suffix}`;
      suffix += 1;
    }

    setAdminSaving(true);
    setAdminError("");
    try {
      const nextSortOrder = adminItems.length
        ? Math.max(...adminItems.map((item) => item.sort_order ?? 0)) + 1
        : 0;
      const item = await insertConstructionItem({
        company_id: requireSelectedCompanyId(),
        name,
        item_type: "itemized",
        is_favorite: false,
        sort_order: nextSortOrder,
      });
      await fetchAdminItems();
      setExpandedAdminItemIds((current) => [...new Set([...current, item.id])]);
      setAdminNotice("새 대분류를 추가했습니다. 대분류명을 수정하고 하단의 소재 추가 버튼으로 소재를 넣어주세요.");
      markAdminCatalogSavedNow();
    } catch (error) {
      setAdminError(getFriendlyError(error, "대분류를 추가하지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminSaving(false);
    }
  }

  function addAdminSubitem(itemId) {
    const parent = adminItems.find((item) => item.id === itemId);
    if (!parent) return;
    const nextSubitemId = createLocalId("local-subitem");
    const nextSortOrder = parent?.subitems?.length
      ? Math.max(...parent.subitems.map((subitem) => subitem.sort_order ?? 0)) + 1
      : 0;
    const source = parent.subitems?.[0];
    const nextSubitem = {
      id: nextSubitemId,
      item_id: itemId,
      name: "",
      option_value: "",
      unit: source?.unit ?? "평",
      cost_price: "",
      cost_unit: normalizeUnitOptionValue(source?.cost_unit),
      unit_price: "",
      labor_rate: "",
      labor_rate_empty: "",
      labor_rate_occupied: "",
      variant_group_id: null,
      variant_value: null,
      variant_value_text: null,
      variant_unit: null,
      archived_at: null,
      quantity: "",
      labor_count: "",
      template_value_id: null,
      sort_order: nextSortOrder,
    };

    setAdminError("");
    setAdminItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? rebuildAdminItemCanonicalProducts({
              ...item,
              item_type: "itemized",
              subitems: [...(item.subitems ?? []), nextSubitem],
            })
          : item
      )
    );
    setExpandedAdminItemIds((current) => [...new Set([...current, itemId])]);
    setNewlyAddedSubitemId(nextSubitemId);
    window.setTimeout(() => {
      setNewlyAddedSubitemId((current) => (current === nextSubitemId ? "" : current));
    }, 1800);
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-subitem-id="${nextSubitemId}"]`)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
    setAdminNotice("새 소재를 추가했습니다. 소재명을 입력한 뒤 저장하세요.");
    markAdminCatalogDirty(isCommonPriceAdminPage ? "prices" : "quantities");
  }

  async function deleteAdminItem(itemId) {
    if (!window.confirm("이 시공 항목과 하위 소재를 삭제할까요?")) return;

    setAdminSaving(true);
    setAdminError("");
    try {
      await deleteConstructionItem(itemId, requireSelectedCompanyId());
      await fetchAdminItems();
      markAdminCatalogSavedNow();
    } catch (error) {
      setAdminError(getFriendlyError(error, "항목을 삭제하지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminSaving(false);
    }
  }

  async function deleteAdminSubitem(subitemId) {
    if (isLocalSubitemId(subitemId)) {
      setAdminItems((current) =>
        current.map((item) => rebuildAdminItemCanonicalProducts({
          ...item,
          subitems: item.subitems.filter((subitem) => subitem.id !== subitemId),
        }))
      );
      setAdminPriceValidationError((current) =>
        current?.subitemId === subitemId ? null : current
      );
      markAdminCatalogDirty();
      return;
    }
    if (!hasCurrentCompanySubitem(subitemId)) return;

    setAdminSaving(true);
    setAdminError("");
    try {
      const parent = adminItems.find((item) => (
        item.subitems?.some((subitem) => subitem.id === subitemId)
      ));
      const targetSubitem = parent?.subitems?.find((subitem) => subitem.id === subitemId);
      if (!targetSubitem?.item_id) return;
      await archiveCanonicalConstructionSubitem(subitemId, targetSubitem.item_id);
      await fetchAdminItems();
      markAdminCatalogSavedNow();
    } catch (error) {
      setAdminError(getFriendlyError(error, "소재를 삭제하지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminSaving(false);
    }
  }

  async function toggleAdminFavorite(item) {
    setAdminSaving(true);
    setAdminError("");
    try {
      await updateConstructionItem(
        item.id,
        requireSelectedCompanyId(),
        { is_favorite: !item.is_favorite }
      );
      await fetchAdminItems();
    } catch (error) {
      setAdminError(getFriendlyError(error, "고정 상태를 변경하지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminSaving(false);
    }
  }

  async function renameAdminItem(itemId, name) {
    const nextName = name.trim();
    if (!nextName) return fetchAdminItems();
    setAdminError("");
    try {
      await updateConstructionItem(
        itemId,
        requireSelectedCompanyId(),
        { name: nextName }
      );
      setAdminItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                name: nextName,
              }
            : item
        )
      );
    } catch (error) {
      setAdminError(getFriendlyError(error, "항목명을 수정하지 못했어요. 다시 시도해주세요."));
      await fetchAdminItems();
    }
  }

  async function renameAdminSubitem(subitemId, name) {
    const nextName = name.trim();
    if (!nextName) return fetchAdminItems();
    if (isLocalSubitemId(subitemId)) {
      updateLocalSubitemName(subitemId, nextName);
      return;
    }
    if (!hasCurrentCompanySubitem(subitemId)) return;
    const targetSubitem = adminItems
      .flatMap((item) => item.subitems ?? [])
      .find((subitem) => subitem.id === subitemId);
    if (!targetSubitem?.item_id) return;

    setAdminError("");
    try {
      await updateCanonicalConstructionSubitem(
        subitemId,
        targetSubitem.item_id,
        { name: nextName }
      );
      setAdminItems((current) =>
        current.map((item) => rebuildAdminItemCanonicalProducts({
          ...item,
          subitems: item.subitems.map((subitem) =>
            subitem.id === subitemId
              ? { ...subitem, name: nextName, option_value: "" }
              : subitem
          ),
        }))
      );
    } catch (error) {
      setAdminError(getFriendlyError(error, "소재명을 수정하지 못했어요. 다시 시도해주세요."));
      await fetchAdminItems();
    }
  }

  function updateAdminSubitemUnit(subitemId, unit) {
    setAdminError("");
    updateLocalSubitemPrice(subitemId, { unit: normalizeUnitOptionValue(unit) });
  }

  function handleAdminItemDragStart(event, itemId) {
    if (!canReorderAdminCatalog) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemId);
    setDragItemId(itemId);
    setDragOverItemId("");
  }

  function handleAdminItemDragOver(event, itemId) {
    if (!canReorderAdminCatalog || !dragItemId || dragItemId === itemId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverItemId(itemId);
  }

  function handleAdminSubitemDragStart(event, itemId, subitemId, groupBaseName = "") {
    if (!canReorderAdminCatalog || !subitemId) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", subitemId);
    setDragSubitem({ itemId, subitemId, groupBaseName });
    setDragOverSubitem(null);
  }

  function handleAdminSubitemDragOver(event, itemId, subitemId, groupBaseName = "") {
    if (!canReorderAdminCatalog || !dragSubitem || dragSubitem.itemId !== itemId) return;
    const isSameTarget = groupBaseName
      ? dragSubitem.groupBaseName === groupBaseName
      : dragSubitem.subitemId === subitemId;
    if (isSameTarget) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverSubitem({ itemId, subitemId, groupBaseName });
  }

  function handleAdminProductDragStart(event, itemId, productId) {
    if (!canReorderAdminCatalog || !productId) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", productId);
    setDragSubitem({ itemId, productId });
    setDragOverSubitem(null);
  }

  function handleAdminProductDragOver(event, itemId, productId) {
    if (
      !canReorderAdminCatalog
      || !dragSubitem?.productId
      || dragSubitem.itemId !== itemId
      || dragSubitem.productId === productId
    ) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverSubitem({ itemId, productId });
  }

  function clearAdminDragState() {
    setDragItemId("");
    setDragOverItemId("");
    setDragSubitem(null);
    setDragOverSubitem(null);
  }

  async function reorderAdminItems(dropItemId) {
    if (!dragItemId || dragItemId === dropItemId) {
      clearAdminDragState();
      return;
    }

    const fromIndex = adminItems.findIndex((item) => item.id === dragItemId);
    const toIndex = adminItems.findIndex((item) => item.id === dropItemId);
    if (fromIndex < 0 || toIndex < 0) {
      clearAdminDragState();
      return;
    }

    const nextItems = [...adminItems];
    const [moved] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, moved);
    const reordered = nextItems.map((item, index) => ({ ...item, sort_order: index }));
    setAdminItems(reordered);
    setDragItemId("");
    setDragOverItemId("");

    setAdminSaving(true);
    markAdminCatalogSaving();
    setAdminError("");
    try {
      const companyId = requireSelectedCompanyId();
      await reorderAdminCatalogAtomic({
        companyId,
        entries: reordered.map((item) => ({
          entity_type: "item",
          id: item.id,
          sort_order: item.sort_order,
        })),
      });
      await fetchAdminItems();
      markAdminCatalogSavedNow();
    } catch (error) {
      setAdminError(getFriendlyError(error, "항목 순서를 저장하지 못했어요. 다시 시도해주세요."));
      markAdminCatalogError(error?.message || "순서 저장 실패");
      await fetchAdminItems();
    } finally {
      setAdminSaving(false);
      setDragItemId("");
      setDragOverItemId("");
    }
  }

  async function reorderAdminSubitems(itemId, dropSubitemId) {
    if (!dragSubitem || dragSubitem.itemId !== itemId || dragSubitem.subitemId === dropSubitemId) {
      setDragSubitem(null);
      setDragOverSubitem(null);
      return;
    }

    const parent = adminItems.find((item) => item.id === itemId);
    const fromIndex = parent?.subitems.findIndex((subitem) => subitem.id === dragSubitem.subitemId) ?? -1;
    const toIndex = parent?.subitems.findIndex((subitem) => subitem.id === dropSubitemId) ?? -1;
    if (!parent || fromIndex < 0 || toIndex < 0) {
      setDragSubitem(null);
      setDragOverSubitem(null);
      return;
    }

    const nextSubitems = [...parent.subitems];
    const [moved] = nextSubitems.splice(fromIndex, 1);
    nextSubitems.splice(toIndex, 0, moved);
    const reorderedSubitems = nextSubitems.map((subitem, index) => ({ ...subitem, sort_order: index }));

    setAdminItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, subitems: reorderedSubitems } : item))
    );
    setDragSubitem(null);
    setDragOverSubitem(null);

    setAdminSaving(true);
    markAdminCatalogSaving();
    setAdminError("");
    try {
      await reorderAdminCatalogAtomic({
        companyId: requireSelectedCompanyId(),
        entries: reorderedSubitems.map((subitem) => ({
          entity_type: "subitem",
          id: subitem.id,
          item_id: itemId,
          sort_order: subitem.sort_order,
        })),
      });
      await fetchAdminItems();
      markAdminCatalogSavedNow();
    } catch (error) {
      setAdminError(getFriendlyError(error, "소재 순서를 저장하지 못했어요. 다시 시도해주세요."));
      markAdminCatalogError(error?.message || "순서 저장 실패");
      await fetchAdminItems();
    } finally {
      setAdminSaving(false);
      setDragSubitem(null);
      setDragOverSubitem(null);
    }
  }

  function updateLocalPrice(itemId, patch) {
    setAdminItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
    );
    markAdminCatalogDirty();
  }

  function updateLocalSubitemPrice(subitemId, patch) {
    setAdminItems((current) => {
      const targetSubitem = current
        .flatMap((item) => item.subitems ?? [])
        .find((subitem) => subitem.id === subitemId);
      const nextPatch = isLocalSubitemId(targetSubitem?.id)
        ? {
            ...patch,
            _dirtyFields: [
              ...new Set([
                ...(Array.isArray(targetSubitem?._dirtyFields) ? targetSubitem._dirtyFields : []),
                ...Object.keys(patch),
              ]),
            ],
          }
        : patch;
      return patchSubitemPriceById(current, subitemId, nextPatch);
    });
    markAdminCatalogDirty();
  }

  function updateLocalSubitemDraft(subitemId, patch) {
    setAdminItems((current) =>
      current.map((item) => ({
        ...item,
        subitems: item.subitems.map((subitem) =>
          subitem.id === subitemId ? { ...subitem, ...patch } : subitem
        ),
      }))
    );
  }

  function renderAdminPricesWorkbench() {
    return renderAppShell(
      <PriceTablePage
        archiveAdminProduct={archiveAdminProduct}
        archiveAdminProductVariant={archiveAdminProductVariant}
        companyId={selectedCompanyId}
        createAdminProductVariant={createAdminProductVariant}
        addAdminSubitem={addAdminSubitem}
        adminError={adminError}
        adminFavoriteOnly={adminFavoriteOnly}
        catalogStatus={adminPriceCatalogStatus}
        adminNotice={adminNotice}
        adminPriceValidationError={adminPriceValidationError}
        adminSaving={adminSaving}
        adminSearch={adminSearch}
        autoSaveError={autoSaveError}
        autoSaveStatus={autoSaveStatus}
        canReorderAdminCatalog={canReorderAdminCatalog}
        clearAdminDragState={clearAdminDragState}
        clearAdminPriceValidationErrorForSubitem={clearAdminPriceValidationErrorForSubitem}
        deleteAdminSubitem={deleteAdminSubitem}
        dragItemId={dragItemId}
        dragOverItemId={dragOverItemId}
        dragOverSubitem={dragOverSubitem}
        dragSubitem={dragSubitem}
        excelExporting={excelExportTarget === EXCEL_IMPORT_TARGETS.PRICES}
        excelExportError={excelExportError}
        fetchAdminItems={fetchAdminItems}
        filteredAdminItems={filteredAdminItems}
        getAutoSaveStatusLabel={getAutoSaveStatusLabel}
        getVisibleAdminProducts={getVisibleAdminProducts}
        getVisibleAdminSubitems={getVisibleAdminSubitems}
        handleAdminItemDragOver={handleAdminItemDragOver}
        handleAdminItemDragStart={handleAdminItemDragStart}
        handleAdminProductDragOver={handleAdminProductDragOver}
        handleAdminProductDragStart={handleAdminProductDragStart}
        handleAdminSubitemDragOver={handleAdminSubitemDragOver}
        handleAdminSubitemDragStart={handleAdminSubitemDragStart}
        markAdminCatalogDirty={markAdminCatalogDirty}
        materialNamePlaceholder={MATERIAL_NAME_PLACEHOLDER}
        newlyAddedSubitemId={newlyAddedSubitemId}
        onExcelExport={() => handleExcelExport(EXCEL_IMPORT_TARGETS.PRICES)}
        onExcelImport={() => openExcelImport(EXCEL_IMPORT_TARGETS.PRICES)}
        renameAdminProduct={renameAdminProduct}
        renameAdminSubitem={renameAdminSubitem}
        reorderAdminItems={reorderAdminItems}
        reorderAdminProducts={reorderAdminProducts}
        reorderAdminSubitems={reorderAdminSubitems}
        requestAdminCatalogLeave={requestAdminCatalogLeave}
        saveAdminPrices={saveAdminPrices}
        selectAdminCanonicalVariant={selectAdminCanonicalVariant}
        selectedAdminPriceItem={selectedAdminPriceItem}
        selectedSubitemIdByProduct={selectedSubitemIdByProduct}
        setAdminFavoriteOnly={setAdminFavoriteOnly}
        setAdminItems={setAdminItems}
        setAdminPriceRowRef={setAdminPriceRowRef}
        setAdminSearch={setAdminSearch}
        setSelectedAdminCategoryId={setSelectedAdminCategoryId}
        toggleAdminFavorite={toggleAdminFavorite}
        updateAdminSubitemUnit={updateAdminSubitemUnit}
        updateAdminProductVariant={updateAdminProductVariant}
        updateAdminProductVariantKind={updateAdminProductVariantKind}
        updateLocalSubitemDraft={updateLocalSubitemDraft}
        updateLocalSubitemPrice={updateLocalSubitemPrice}
      />,
      { className: "formate-app-shell--admin-price-v2" }
    );
  }

  function renderAdminItemsCategorySidebar() {
    return (
      <aside className="admin-price-v2-sidebar admin-items-v2-sidebar formate-scroll-light" aria-label="견적 템플릿 대분류">
        <div className="admin-price-v2-sidebar-header">
          <span>대분류</span>
          <strong>{filteredAdminItems.length}개</strong>
        </div>
        <div className="admin-price-v2-category-list">
          {filteredAdminItems.map((item) => {
            const active = selectedAdminTemplateItem?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`admin-price-v2-category-item ${active ? "active" : ""} ${dragItemId === item.id ? "dragging" : ""} ${dragOverItemId === item.id ? "drop-target" : ""}`.trim()}
                onClick={() => setSelectedAdminCategoryId(item.id)}
                onDragOver={(event) => handleAdminItemDragOver(event, item.id)}
                onDrop={() => reorderAdminItems(item.id)}
                onDragEnd={clearAdminDragState}
              >
                <span
                  className={`drag-handle admin-price-v2-drag-handle ${canReorderAdminCatalog ? "enabled" : ""}`.trim()}
                  title="대분류 순서 변경"
                  draggable={canReorderAdminCatalog && !adminSaving}
                  onDragStart={(event) => handleAdminItemDragStart(event, item.id)}
                  onDragEnd={clearAdminDragState}
                >
                  ::
                </span>
                <span className="admin-price-v2-category-name">
                  {item.is_favorite && <Pin size={14} fill="currentColor" />}
                  <span>{item.name}</span>
                </span>
                <span className="admin-price-v2-category-count">{(item.subitems ?? []).length}개</span>
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  function renderAdminTemplateConditionSidebar() {
    const currentConditionKey = currentAdminTemplateCondition ? getTemplateConditionKey(currentAdminTemplateCondition) : "";

    return (
      <aside className="admin-price-v2-sidebar admin-items-v2-sidebar admin-template-condition-sidebar" aria-label="기본 견적 조건 목록">
        <div className="admin-price-v2-sidebar-header">
          <span>기본 견적 조건</span>
          <strong>총 {orderedAdminTemplates.length}개</strong>
        </div>
        <div className="admin-price-v2-category-list admin-template-condition-list formate-scroll-light">
          {orderedAdminTemplates.map((template) => {
            const templateKey = getTemplateConditionKey(template);
            const active = currentAdminTemplateId === template.id || currentConditionKey === templateKey;
            return (
              <div
                key={template.id}
                className={`admin-price-v2-category-item admin-template-condition-item ${active ? "active" : ""} ${newlyCreatedAdminTemplateKey === templateKey ? "newly-added" : ""} ${dragAdminTemplateId === template.id ? "dragging" : ""} ${dragOverAdminTemplateId === template.id ? "drop-target" : ""}`.trim()}
                role="button"
                tabIndex={0}
                onClick={() => requestAdminCatalogLeave(() => loadAdminTemplate(template))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    requestAdminCatalogLeave(() => loadAdminTemplate(template));
                  }
                }}
                onDragOver={(event) => handleAdminTemplateDragOver(event, template.id)}
                onDrop={() => reorderAdminTemplates(template.id)}
                onDragEnd={clearAdminTemplateDragState}
              >
                <span
                  className="drag-handle admin-price-v2-drag-handle enabled"
                  title="조건 순서 변경"
                  draggable={!adminSaving}
                  onClick={(event) => event.stopPropagation()}
                  onDragStart={(event) => handleAdminTemplateDragStart(event, template.id)}
                  onDragEnd={clearAdminTemplateDragState}
                >
                  ::
                </span>
                <span className="admin-price-v2-category-name admin-template-condition-name">
                  <span>{makeTemplateLabel(template, conditionVariantLabelMap)}</span>
                </span>
                <button
                  type="button"
                  className="template-delete-button admin-template-condition-delete"
                  disabled={adminTemplateCatalogStatus === "loading" || adminSaving || templateDeleteLoading}
                  aria-label={`${makeTemplateLabel(template, conditionVariantLabelMap)} 삭제`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openTemplateDeleteDialog(template);
                  }}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            );
          })}
          {!orderedAdminTemplates.length && (
            <div className="admin-template-condition-empty">
              <strong>저장된 조건이 없습니다.</strong>
              <span>새 조건을 만들면 기본 수량과 인원을 입력할 수 있습니다.</span>
            </div>
          )}
        </div>
        <div className="admin-template-condition-sidebar-footer">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus />}
            disabled={adminTemplateCatalogStatus === "loading" || adminSaving}
            onClick={openAdminTemplateConditionDrawer}
          >
            새 조건 만들기
          </Button>
        </div>
      </aside>
    );
  }

  function renderAdminItemsCategoryStrip() {
    if (!canEditConditionQuantities) return null;

    return (
      <aside className="admin-items-v2-category-panel" aria-label="대분류 선택">
        <div className="admin-items-v2-category-panel-head">
          <span>대분류</span>
          <strong>{filteredAdminItems.length}개</strong>
        </div>
        <div className="admin-items-v2-category-panel-list formate-scroll-light">
          {filteredAdminItems.map((item) => {
            const active = selectedAdminTemplateItem?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`admin-price-v2-category-item admin-items-v2-category-chip ${active ? "active" : ""} ${dragItemId === item.id ? "dragging" : ""} ${dragOverItemId === item.id ? "drop-target" : ""}`.trim()}
                onClick={() => setSelectedAdminCategoryId(item.id)}
                onDragOver={(event) => handleAdminItemDragOver(event, item.id)}
                onDrop={() => reorderAdminItems(item.id)}
                onDragEnd={clearAdminDragState}
              >
                <span
                  className={`drag-handle admin-price-v2-drag-handle ${canReorderAdminCatalog ? "enabled" : ""}`.trim()}
                  title="대분류 순서 변경"
                  draggable={canReorderAdminCatalog && !adminSaving}
                  onDragStart={(event) => handleAdminItemDragStart(event, item.id)}
                  onDragEnd={clearAdminDragState}
                >
                  ::
                </span>
                <span className="admin-price-v2-category-name">
                  {item.is_favorite && <Pin size={14} fill="currentColor" />}
                  <span>{item.name}</span>
                </span>
                <span className="admin-price-v2-category-count">{(item.subitems ?? []).length}개</span>
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  function renderAdminItemsHeaderV2() {
    return (
      <div className="admin-quantity-table-header admin-items-v2-table-header standard-quantity-table-header">
        <span />
        <span>소재명</span>
        <span>규격/두께</span>
        <span>공사기간</span>
        <span>수량</span>
        <span>인원</span>
        <span>삭제</span>
      </div>
    );
  }

  async function reorderAdminProducts(itemId, dropProductId) {
    const parent = adminItems.find((item) => item.id === itemId);
    const products = parent?.products ?? [];
    if (products.some((product) => (
      product.kind === CONSTRUCTION_PRODUCT_KINDS.SUBITEM
      && isLocalSubitemId(product.subitemId)
    ))) {
      clearAdminDragState();
      setAdminNotice("새 소재가 저장된 뒤 순서를 변경할 수 있습니다.");
      return;
    }
    const dragProductId = dragSubitem?.productId;
    if (!dragProductId || dragProductId === dropProductId) {
      clearAdminDragState();
      return;
    }
    const fromIndex = products.findIndex((product) => product.productId === dragProductId);
    const toIndex = products.findIndex((product) => product.productId === dropProductId);
    if (fromIndex < 0 || toIndex < 0) {
      clearAdminDragState();
      return;
    }

    const reordered = [...products];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const nextProducts = reordered.map((product, index) => ({
      ...product,
      sortOrder: index,
      groupSortOrder: product.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP
        ? index
        : product.groupSortOrder,
    }));
    setAdminItems((current) => current.map((item) => (
      item.id === itemId ? { ...item, products: nextProducts } : item
    )));
    clearAdminDragState();

    setAdminSaving(true);
    markAdminCatalogSaving();
    setAdminError("");
    try {
      await reorderAdminCatalogAtomic({
        companyId: requireSelectedCompanyId(),
        entries: nextProducts.map((product) => ({
          entity_type: product.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP
            ? "variant_group"
            : "subitem",
          id: product.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP
            ? product.variantGroupId
            : product.subitemId,
          item_id: product.constructionItemId,
          sort_order: product.sortOrder,
        })),
      });
      await fetchAdminItems({ mode: isCommonPriceAdminPage ? "prices" : "condition" });
      markAdminCatalogSavedNow();
    } catch (error) {
      setAdminError(getFriendlyError(error, "소재 순서를 저장하지 못했어요. 다시 시도해주세요."));
      markAdminCatalogError(error?.message || "순서 저장 실패");
      await fetchAdminItems({ mode: isCommonPriceAdminPage ? "prices" : "condition" });
    } finally {
      setAdminSaving(false);
    }
  }

  async function renameAdminProduct(item, product, name) {
    const nextName = `${name ?? ""}`.trim();
    if (!nextName) {
      await fetchAdminItems({ mode: isCommonPriceAdminPage ? "prices" : "condition" });
      return;
    }
    if (product.kind !== CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP) {
      await renameAdminSubitem(product.subitemId, nextName);
      return;
    }

    setAdminError("");
    try {
      await updateCanonicalVariantGroup(
        product.variantGroupId,
        product.constructionItemId,
        {
          display_name: nextName,
        }
      );
      setAdminItems((current) => current.map((entry) => (
        entry.id === item.id
          ? {
              ...entry,
              products: (entry.products ?? []).map((entryProduct) => (
                entryProduct.productId === product.productId
                  ? { ...entryProduct, displayName: nextName, label: nextName }
                  : entryProduct
              )),
              variantGroups: (entry.variantGroups ?? []).map((group) => (
                group.id === product.variantGroupId
                  ? { ...group, displayName: nextName }
                  : group
              )),
            }
          : entry
      )));
    } catch (error) {
      setAdminError(getFriendlyError(error, "제품명을 수정하지 못했어요. 다시 시도해주세요."));
      await fetchAdminItems({ mode: isCommonPriceAdminPage ? "prices" : "condition" });
    }
  }

  async function createAdminProductVariant(item, product, draft) {
    const sourceSubitem = resolveAdminProductSubitem(
      item,
      product,
      selectedSubitemIdByProduct
    );
    if (!sourceSubitem || isLocalSubitemId(sourceSubitem.id)) {
      setAdminError("소재명을 먼저 저장한 뒤 옵션을 추가해주세요.");
      return;
    }

    setAdminSaving(true);
    setAdminError("");
    let selectedProductId = product.productId;
    let selectedConstructionSubitemId = "";
    const constructionItemId = product.constructionItemId;
    try {
      if (product.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP) {
        const nextSortOrder = product.allVariants?.length
          ? Math.max(...product.allVariants.map((variant) => variant.sortOrder ?? 0)) + 1
          : 0;
        const insertedVariant = await insertCanonicalVariantSubitem(
          buildConstructionVariantSubitemInsertPayload({
            constructionItemId,
            variantGroupId: product.variantGroupId,
            displayName: product.displayName,
            variantValueType: product.variantValueType,
            value: draft.value,
            unit: draft.unit,
            workUnit: sourceSubitem.unit,
            sortOrder: nextSortOrder,
          })
        );
        selectedConstructionSubitemId = insertedVariant.id;
      } else {
        const created = await createCanonicalVariantProductAtomic({
          companyId: requireSelectedCompanyId(),
          constructionItemId,
          sourceSubitemId: sourceSubitem.id,
          group: buildConstructionVariantGroupWritePayload({
            constructionItemId,
            displayName: sourceSubitem.name,
            variantKind: draft.variantKind,
            variantValueType: draft.variantValueType,
            sortOrder: product.sortOrder ?? sourceSubitem.sort_order ?? 0,
          }),
          variant: {
            variant_value_type: draft.variantValueType,
            value: draft.value,
            unit: draft.unit,
          },
        });
        selectedProductId = created.variantGroup.id;
        selectedConstructionSubitemId = sourceSubitem.id;
      }

      await fetchAdminItems({ mode: isCommonPriceAdminPage ? "prices" : "condition" });
      setSelectedSubitemIdByProduct((current) => ({
        ...current,
        [selectedProductId]: selectedConstructionSubitemId,
      }));
      markAdminCatalogSavedNow();
      setAdminNotice("제품 옵션을 저장했습니다.");
    } catch (error) {
      setAdminError(getFriendlyError(error, "제품 옵션을 저장하지 못했어요. 값과 단위를 확인해주세요."));
      await fetchAdminItems({ mode: isCommonPriceAdminPage ? "prices" : "condition" });
    } finally {
      setAdminSaving(false);
    }
  }

  async function updateAdminProductVariant(item, product, variant, draft) {
    setAdminSaving(true);
    setAdminError("");
    try {
      const insertShape = buildConstructionVariantSubitemInsertPayload({
        constructionItemId: product.constructionItemId,
        variantGroupId: product.variantGroupId,
        displayName: product.displayName,
        variantValueType: product.variantValueType,
        value: draft.value,
        unit: draft.unit,
        workUnit: variant.subitem?.unit,
        sortOrder: variant.sortOrder,
      });
      await updateCanonicalConstructionSubitem(
        variant.constructionSubitemId,
        product.constructionItemId,
        {
          name: insertShape.name,
          ...buildConstructionVariantMetadataWritePayload({
            variantGroupId: product.variantGroupId,
            variantValueType: product.variantValueType,
            value: draft.value,
            unit: draft.unit,
          }),
        }
      );
      await fetchAdminItems({ mode: isCommonPriceAdminPage ? "prices" : "condition" });
      markAdminCatalogSavedNow();
    } catch (error) {
      setAdminError(getFriendlyError(error, "제품 옵션을 수정하지 못했어요. 중복 값인지 확인해주세요."));
      await fetchAdminItems({ mode: isCommonPriceAdminPage ? "prices" : "condition" });
    } finally {
      setAdminSaving(false);
    }
  }

  async function updateAdminProductVariantKind(item, product, variantKind) {
    if (product.kind !== CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP) return;
    setAdminSaving(true);
    setAdminError("");
    try {
      await updateCanonicalVariantGroup(product.variantGroupId, product.constructionItemId, {
        variant_kind: variantKind,
      });
      await fetchAdminItems({ mode: isCommonPriceAdminPage ? "prices" : "condition" });
      markAdminCatalogSavedNow();
    } catch (error) {
      setAdminError(getFriendlyError(error, "옵션 구분을 수정하지 못했어요."));
    } finally {
      setAdminSaving(false);
    }
  }

  async function archiveAdminProductVariant(item, product, variant) {
    if (!window.confirm(`${variant.label} 옵션을 보관할까요?`)) return;
    setAdminSaving(true);
    setAdminError("");
    try {
      if ((product.variants ?? []).length <= 1) {
        await archiveCanonicalVariantGroup(product.variantGroupId, product.constructionItemId);
      } else {
        await archiveCanonicalConstructionSubitem(
          variant.constructionSubitemId,
          product.constructionItemId
        );
      }
      await fetchAdminItems({ mode: isCommonPriceAdminPage ? "prices" : "condition" });
      markAdminCatalogSavedNow();
    } catch (error) {
      setAdminError(getFriendlyError(error, "제품 옵션을 보관하지 못했어요."));
    } finally {
      setAdminSaving(false);
    }
  }

  async function archiveAdminProduct(item, product) {
    if (!window.confirm(`${product.displayName} 항목을 보관할까요?`)) return;
    if (product.kind === CONSTRUCTION_PRODUCT_KINDS.SUBITEM && isLocalSubitemId(product.subitemId)) {
      await deleteAdminSubitem(product.subitemId);
      return;
    }

    setAdminSaving(true);
    setAdminError("");
    try {
      if (product.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP) {
        await archiveCanonicalVariantGroup(product.variantGroupId, product.constructionItemId);
      } else {
        await archiveCanonicalConstructionSubitem(product.subitemId, product.constructionItemId);
      }
      await fetchAdminItems({ mode: isCommonPriceAdminPage ? "prices" : "condition" });
      markAdminCatalogSavedNow();
    } catch (error) {
      setAdminError(getFriendlyError(error, "항목을 보관하지 못했어요."));
    } finally {
      setAdminSaving(false);
    }
  }

  function renderAdminItemsQuantityCells(subitem) {
    return (
      <>
        <label className="admin-items-v2-number-cell admin-items-v2-construction-days-cell">
          <span className="field-label">공사기간</span>
          <span className="admin-items-v2-day-input">
            <input
              className={`items-v2-inline-input items-v2-inline-input--number ${isEmptyOrZeroDisplayValue(subitem.construction_days) ? "items-v2-muted-value" : ""}`.trim()}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              value={subitem.construction_days ?? ""}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (nextValue === "" || /^\d+$/.test(nextValue)) {
                  updateLocalSubitemPrice(subitem.id, { construction_days: nextValue });
                }
              }}
            />
            <span aria-hidden="true">일</span>
          </span>
        </label>
        <label className="admin-items-v2-number-cell">
          <span className="field-label">수량</span>
          <input
            className="items-v2-inline-input items-v2-inline-input--number"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={subitem.quantity ?? ""}
            onChange={(event) => updateLocalSubitemPrice(subitem.id, { quantity: event.target.value })}
          />
        </label>
        <label className="admin-items-v2-number-cell">
          <span className="field-label">인원</span>
          <input
            className="items-v2-inline-input items-v2-inline-input--number"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={subitem.labor_count ?? ""}
            onChange={(event) => updateLocalSubitemPrice(subitem.id, { labor_count: event.target.value })}
          />
        </label>
      </>
    );
  }

  function renderAdminItemsRows(item) {
    const rendererKind = getConstructionItemRendererKind(item);
    const itemSubitems = getVisibleAdminSubitems(item);
    const itemProducts = getVisibleAdminProducts(item);
    const canReorderProducts = canReorderAdminCatalog && !itemProducts.some((product) => (
      product.kind === CONSTRUCTION_PRODUCT_KINDS.SUBITEM
      && isLocalSubitemId(product.subitemId)
    ));
    if (rendererKind === CONSTRUCTION_ITEM_RENDERER_KINDS.SASH) {
      return (
        <SashCatalogSection
          companyId={selectedCompanyId}
          pyeong={selectedAdminPyeong}
          item={item}
          subitems={itemSubitems}
          adminSaving={adminSaving}
          canReorder={canReorderAdminCatalog}
          dragSubitem={dragSubitem}
          dragOverSubitem={dragOverSubitem}
          newlyAddedSubitemId={newlyAddedSubitemId}
          materialNamePlaceholder={MATERIAL_NAME_PLACEHOLDER}
          onAddSubitem={addAdminSubitem}
          onDeleteSubitem={deleteAdminSubitem}
          onDragEnd={clearAdminDragState}
          onDragOver={handleAdminSubitemDragOver}
          onDragStart={handleAdminSubitemDragStart}
          onDrop={reorderAdminSubitems}
          onSubitemNameChange={(subitemId, value) => {
            setAdminItems((current) => current.map((entry) => (
              entry.id === item.id
                ? {
                    ...entry,
                    subitems: entry.subitems.map((subitem) => (
                      subitem.id === subitemId ? { ...subitem, name: value } : subitem
                    )),
                  }
                : entry
            )));
          }}
          onSubitemNameInput={markAdminCatalogDirty}
          onSubitemNameBlur={renameAdminSubitem}
        />
      );
    }

    return (
      <div className="admin-subitem-list quantity-table-list admin-items-v2-grid-list">
        {renderAdminItemsHeaderV2()}
        {itemProducts.map((product) => {
          const subitem = resolveAdminProductSubitem(
            item,
            product,
            selectedSubitemIdByProduct
          );
          if (!subitem) return null;
          const selectedSubitemId = getAdminProductSelectedSubitemId(
            product,
            selectedSubitemIdByProduct
          );
          return (
            <div
              key={product.productId}
              className={`admin-value-row condition-quantity-row quantity-table-row itemized-quantity-row ${newlyAddedSubitemId === subitem.id ? "newly-added" : ""} ${dragSubitem?.itemId === item.id && dragSubitem?.productId === product.productId ? "dragging" : ""} ${dragOverSubitem?.itemId === item.id && dragOverSubitem?.productId === product.productId ? "drop-target" : ""}`.trim()}
              data-product-id={product.productId}
              data-subitem-id={subitem.id}
              onDragOver={(event) => handleAdminProductDragOver(event, item.id, product.productId)}
              onDrop={() => reorderAdminProducts(item.id, product.productId)}
              onDragEnd={clearAdminDragState}
            >
              <span
                className={`drag-handle admin-price-v2-drag-handle ${canReorderProducts ? "enabled" : ""}`.trim()}
                title="소재 순서 변경"
                draggable={canReorderProducts && !adminSaving}
                onDragStart={(event) => handleAdminProductDragStart(event, item.id, product.productId)}
                onDragEnd={clearAdminDragState}
              >
                ::
              </span>
              <label className="admin-material-name-field">
                <span className="field-label">소재명</span>
                {product.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP ? (
                  <input
                    key={`${product.productId}:${product.displayName}`}
                    defaultValue={product.displayName}
                    placeholder={MATERIAL_NAME_PLACEHOLDER}
                    onBlur={(event) => renameAdminProduct(item, product, event.target.value)}
                  />
                ) : (
                  <input
                    value={subitem.name}
                    placeholder={MATERIAL_NAME_PLACEHOLDER}
                    onChange={(event) => updateLocalSubitemName(subitem.id, event.target.value)}
                    onBlur={(event) => renameAdminProduct(item, product, event.target.value)}
                  />
                )}
              </label>
              <div className="spec-options-field">
                <span className="field-label">규격/두께</span>
                <CanonicalVariantSelect
                  product={product}
                  value={selectedSubitemId}
                  disabled={adminSaving}
                  onChange={(constructionSubitemId) => (
                    selectAdminCanonicalVariant(product.productId, constructionSubitemId)
                  )}
                />
              </div>
              {renderAdminItemsQuantityCells(subitem)}
              <button
                className="danger-button admin-price-v2-danger-button"
                disabled={adminSaving}
                aria-label={`${product.displayName} 보관`}
                onClick={() => archiveAdminProduct(item, product)}
              >
                <Trash2 size={18} strokeWidth={1.5} />
              </button>
            </div>
          );
        })}
        {!itemProducts.length && <p className="admin-price-v2-empty muted">등록된 소재가 없습니다.</p>}
        <div className="admin-add-subitem-row admin-price-v2-add-row">
          <span>{item.name}에 소재 추가</span>
          <button className="secondary-button" type="button" disabled={adminSaving} onClick={() => addAdminSubitem(item.id)}>
            <Plus size={18} /> 소재 추가
          </button>
        </div>
      </div>
    );
  }

  function renderAdminTemplateConditionDrawer() {
    if (!adminTemplateConditionDrawerOpen) return null;
    const drawerTitle = adminTemplateConditionDrawerMode === "edit"
      ? "기본 견적 조건 수정"
      : adminTemplateConditionDrawerMode === "duplicate"
        ? "기본 견적 조건 복제"
        : "기본 견적 조건 만들기";
    const drawerActionLabel = adminTemplateConditionDrawerMode === "edit"
      ? "조건 저장"
      : adminTemplateConditionDrawerMode === "duplicate"
        ? "조건 복제"
        : "조건 만들기";
    const draftConditionLabel = adminTemplateConditionDraftValue
      ? makeTemplateLabel(adminTemplateConditionDraftValue, conditionVariantLabelMap)
      : "선택중";

    return (
      <aside className="estimate-condition-drawer admin-template-condition-drawer" aria-label={drawerTitle}>
        <div className="estimate-condition-drawer__header">
          <div>
            <span>{drawerTitle}</span>
            <strong>{draftConditionLabel}</strong>
          </div>
          <Button variant="tertiary" size="sm" onClick={closeAdminTemplateConditionDrawer}>
            닫기
          </Button>
        </div>

        <div className="condition-static-grid estimate-condition-drawer__fields formate-scroll-light">
          <div className="condition-static-field">
            <p className="field-label">평수</p>
            <PyeongSelector
              className="admin-pyeong-select"
              value={adminTemplateConditionDraft.pyeong}
              open={adminPyeongDropdownOpen}
              onOpenChange={setAdminPyeongDropdownOpen}
              onChange={(value) => updateAdminTemplateConditionDraft({ pyeong: value })}
            />
          </div>

          <div className="condition-static-field">
            <p className="field-label">주택 유형</p>
            <div className="segmented flush">
              <button
                type="button"
                className={adminTemplateConditionDraft.buildType === "new" ? "selected" : ""}
                onClick={() => updateAdminTemplateConditionDraft({ buildType: "new" })}
              >
                확장형
              </button>
              <button
                type="button"
                className={adminTemplateConditionDraft.buildType === "old" ? "selected" : ""}
                onClick={() => updateAdminTemplateConditionDraft({ buildType: "old" })}
              >
                구형
              </button>
            </div>
          </div>

          {adminTemplateConditionDraft.buildType === "new" && (
            <div className="condition-static-field condition-static-wide">
              <div className="condition-variant-card-head">
                <p className="field-label">확장형 세부 유형</p>
              </div>
              <div className="chips">
                {EXTENDED_VARIANTS.map((variant) => (
                  <button
                    key={variant}
                    type="button"
                    className={`condition-variant-option ${normalizeConditionVariant("new", false, adminTemplateConditionDraft.conditionVariant) === variant ? "selected" : ""}`.trim()}
                    onClick={() => updateAdminTemplateConditionDraft({ conditionVariant: variant })}
                  >
                    <span>{getConditionVariantLabel(variant, conditionVariantLabelMap) || variant}</span>
                    {getConditionVariantLabel(variant, conditionVariantLabelMap) && <small>{variant}</small>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {adminTemplateConditionDraft.buildType === "old" && (
            <>
              <div className="condition-static-field">
                <p className="field-label">확장 여부</p>
                <div className="segmented flush">
                  <button
                    type="button"
                    className={!adminTemplateConditionDraft.hasExtension ? "selected" : ""}
                    onClick={() => updateAdminTemplateConditionDraft({ hasExtension: false })}
                  >
                    확장 없음
                  </button>
                  <button
                    type="button"
                    className={adminTemplateConditionDraft.hasExtension ? "selected" : ""}
                    onClick={() => updateAdminTemplateConditionDraft({ hasExtension: true })}
                  >
                    확장 있음
                  </button>
                </div>
              </div>
              {adminTemplateConditionDraft.hasExtension ? (
                <div className="condition-static-field condition-static-wide">
                  <div className="condition-variant-card-head">
                    <p className="field-label">구형 세부 유형</p>
                  </div>
                  <div className="chips">
                    {OLD_EXTENDED_VARIANTS.map((variant) => (
                      <button
                        key={variant}
                        type="button"
                        className={`condition-variant-option ${normalizeConditionVariant("old", true, adminTemplateConditionDraft.conditionVariant) === variant ? "selected" : ""}`.trim()}
                        onClick={() => updateAdminTemplateConditionDraft({ conditionVariant: variant })}
                      >
                        <span>{getConditionVariantLabel(variant, conditionVariantLabelMap) || variant}</span>
                        {getConditionVariantLabel(variant, conditionVariantLabelMap) && <small>{variant}</small>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="condition-static-field condition-static-wide">
                  <div className="condition-static-note">
                    확장 없음은 <strong>{formatConditionVariantLabel(OLD_NO_EXTENSION_VARIANT, conditionVariantLabelMap)}</strong> 기준으로 저장됩니다.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {adminError && <div className="error-box admin-template-condition-drawer-error">{adminError}</div>}

        <div className="estimate-condition-drawer__actions">
          <Button
            variant="primary"
            disabled={adminTemplateCatalogStatus === "loading" || adminSaving || !adminTemplateConditionDraftValue}
            onClick={() => requestAdminCatalogLeave(() => saveAdminTemplateFromDrawer())}
          >
            {adminSaving ? "저장 중..." : drawerActionLabel}
          </Button>
          <Button variant="secondary" disabled={adminTemplateCatalogStatus === "loading" || adminSaving} onClick={closeAdminTemplateConditionDrawer}>
            취소
          </Button>
        </div>
      </aside>
    );
  }

  function renderAdminItemsWorkbench() {
    const item = selectedAdminTemplateItem;
    const catalogLoading = adminTemplateCatalogStatus === "loading";
    const catalogReady = adminTemplateCatalogStatus === "ready";
    const editorReady = catalogReady
      && adminConditionStep === "edit"
      && Boolean(currentAdminTemplateCondition)
      && Boolean(item);

    return renderAppShell(
      <main className={`admin-price-v2-page admin-items-v2-page ${adminTemplateConditionDrawerOpen ? "admin-items-v2-page--drawer-open" : ""}`.trim()}>
        <AdminCategoryPanel
          ariaLabel="견적 템플릿 대분류"
          items={catalogReady ? filteredAdminItems : []}
          selectedItemId={selectedAdminCategoryId}
          loading={catalogLoading}
          canReorder={canReorderAdminCatalog}
          disabled={adminSaving}
          dragItemId={dragItemId}
          dragOverItemId={dragOverItemId}
          onSelect={setSelectedAdminCategoryId}
          onDragOver={handleAdminItemDragOver}
          onDrop={reorderAdminItems}
          onDragStart={handleAdminItemDragStart}
          onDragEnd={clearAdminDragState}
          onToggleFavorite={toggleAdminFavorite}
        />
        <section className="admin-price-v2-workspace admin-items-v2-workspace">
          <header className="admin-price-v2-header admin-items-v2-header">
            <div className="items-v2-titleline">
              <h1>견적 템플릿 만들기</h1>
            </div>
            <div className="items-v2-header-actions">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Upload />}
                disabled={!catalogReady || adminSaving}
                onClick={() => openExcelImport(EXCEL_IMPORT_TARGETS.TEMPLATES)}
              >
                Excel 업로드
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download />}
                disabled={!catalogReady || adminSaving || Boolean(excelExportTarget)}
                onClick={() => handleExcelExport(EXCEL_IMPORT_TARGETS.TEMPLATES)}
              >
                {excelExportTarget === EXCEL_IMPORT_TARGETS.TEMPLATES ? "내보내는 중" : "Excel 내보내기"}
              </Button>
              {!isSashItem(item) && (
                <span className={`autosave-pill ${autoSaveStatus}`.trim()} title={autoSaveError || getAutoSaveStatusLabel()}>
                  {getAutoSaveStatusLabel()}
                </span>
              )}
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCcw />}
                disabled={catalogLoading || adminSaving}
                onClick={() => requestAdminCatalogLeave(() => (
                  currentAdminTemplateCondition
                    ? fetchAdminItems({ mode: "condition", condition: currentAdminTemplateCondition })
                    : initializeAdminItems({ mode: "condition", selectPreferredTemplate: true })
                ))}
              >
                되돌리기
              </Button>
              {!isSashItem(item) && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Save />}
                  disabled={!catalogReady || adminSaving || !canEditConditionQuantities}
                  onClick={() => saveAdminPrices({ target: "quantities", stayOnPage: true })}
                >
                  저장하기
                </Button>
              )}
            </div>
          </header>

          <div className="items-v2-toolbar admin-price-v2-toolbar admin-items-v2-toolbar">
            {catalogLoading ? (
              <div className="admin-catalog-toolbar-skeleton" aria-hidden="true" />
            ) : (
              <TemplateConditionSwitcher
                templates={orderedAdminTemplates}
                currentTemplateId={currentAdminTemplateId}
                favoriteIds={adminTemplateFavoriteIds}
                recentIds={adminTemplateRecentIds}
                getLabel={(template) => makeTemplateLabel(template, conditionVariantLabelMap)}
                disabled={adminSaving}
                onSelect={(template) => requestAdminCatalogLeave(() => loadAdminTemplate(template))}
                onToggleFavorite={toggleAdminTemplateFavorite}
                onCreate={openAdminTemplateConditionDrawer}
                onEdit={(template) => requestAdminCatalogLeave(() => openAdminTemplateConditionEditDrawer(template))}
                onDuplicate={(template) => requestAdminCatalogLeave(() => openAdminTemplateConditionDuplicateDrawer(template))}
                onDelete={openTemplateDeleteDialog}
              />
            )}
          </div>

          {adminSaving && <div className="status-box">저장 중...</div>}
          {adminNotice && <div className="status-box">{adminNotice}</div>}
          {adminError && <div className="error-box">{adminError}</div>}
          {excelExportError && <div className="error-box">{excelExportError}</div>}

          {catalogLoading ? (
            <section className="items-v2-table-section admin-price-v2-table-section admin-items-v2-table-section" aria-label="견적 템플릿 로딩">
              <div className="admin-price-v2-table-scroll formate-scroll-light">
                <AdminCatalogTableSkeleton variant="quantity" />
              </div>
            </section>
          ) : editorReady ? (
            <section className="items-v2-table-section admin-price-v2-table-section admin-items-v2-table-section">
              <div className="admin-price-v2-table-scroll formate-scroll-light">
                {renderAdminItemsRows(item)}
              </div>
            </section>
          ) : catalogReady ? (
            <section className="items-v2-table-section admin-price-v2-table-section admin-items-v2-table-section">
              <EmptyState
                title={orderedAdminTemplates.length ? "대분류를 선택하세요." : "기본 견적 조건이 없습니다."}
                description={orderedAdminTemplates.length ? "대분류를 선택하면 기본 수량과 인원 표가 표시됩니다." : "새 조건을 만들면 기본 수량과 인원을 입력할 수 있습니다."}
                action={!orderedAdminTemplates.length ? (
                  <Button variant="secondary" size="sm" leftIcon={<Plus />} onClick={openAdminTemplateConditionDrawer}>
                    새 조건 만들기
                  </Button>
                ) : null}
              />
            </section>
          ) : (
            <section className="items-v2-table-section admin-price-v2-table-section admin-items-v2-table-section">
              <EmptyState
                title="견적 템플릿을 불러오지 못했습니다."
                description="오류 내용을 확인한 뒤 되돌리기를 눌러 다시 시도하세요."
              />
            </section>
          )}
        </section>
        {renderAdminTemplateConditionDrawer()}
      </main>,
      { className: "formate-app-shell--admin-items-v2" }
    );
  }

  async function saveAdminPrices(options = {}) {
    const {
      auto = false,
      target = "",
      stayOnPage = false,
      refetch = true,
    } = options;
    if (!auto) setAdminSaving(true);
    if (!auto) clearAutoSaveTimer();
    setAdminError("");
    try {
      const saveTarget = normalizeAdminSaveTarget(target);
      if (!saveTarget) {
        throw new Error("저장할 관리 화면을 확인하지 못했습니다.");
      }
      const companyId = requireSelectedCompanyId();
      const snapshotItems = adminItemsRef.current;
      const adminSubitems = snapshotItems.flatMap((item) => item.subitems ?? []);
      const persistableAdminSubitems = adminSubitems.filter(
        (subitem) =>
          !isEmptyLocalAdminSubitemPlaceholder(
            subitem,
            MATERIAL_NAME_PLACEHOLDER
          )
      );
      const isCommonPriceSave = saveTarget === "prices";
      const sashItemIds = new Set(
        snapshotItems.filter(isSashItem).map((item) => item.id)
      );
      const standardPersistableAdminSubitems = persistableAdminSubitems.filter(
        (subitem) => !sashItemIds.has(subitem.item_id)
      );
      const invalidNameSubitem = standardPersistableAdminSubitems.find((subitem) => {
        const name = `${subitem.name ?? ""}`.trim();
        return !name || name === MATERIAL_NAME_PLACEHOLDER;
      });

      if (invalidNameSubitem) {
        const message = "소재명을 입력해야 저장할 수 있습니다.";
        const parent = snapshotItems.find((item) =>
          item.subitems?.some((subitem) => subitem.id === invalidNameSubitem.id)
        );
        setAdminError(message);
        setAdminPriceValidationError({
          subitemId: invalidNameSubitem.id,
          itemId: parent?.id ?? "",
          message,
        });
        focusAdminPriceValidationRow(invalidNameSubitem, parent);
        setNewlyAddedSubitemId(invalidNameSubitem.id);
        if (auto) {
          markAdminCatalogError(message, saveTarget);
        }
        return false;
      }
      setAdminPriceValidationError(null);

      const existingSubitems = standardPersistableAdminSubitems.filter((subitem) => !isLocalSubitemId(subitem.id));
      const localSubitems = standardPersistableAdminSubitems.filter((subitem) => isLocalSubitemId(subitem.id));
      const adminTemplateCondition = isCommonPriceSave
        ? null
        : currentAdminTemplateConditionRef.current ?? getAdminTemplateCondition();
      if (!isCommonPriceSave && !adminTemplateCondition) {
        throw new Error("저장할 평수와 주택 유형을 먼저 선택하세요.");
      }
      const templateValues = isCommonPriceSave
        ? []
        : buildAdminTemplateValueAtomicWrites({
            items: [{
              id: "canonical-template-values",
              subitems: standardPersistableAdminSubitems,
            }],
          });
      const atomicResult = await saveAdminCatalogAtomic({
        companyId,
        itemUpdates: snapshotItems.map((item) => ({
          id: item.id,
          ...buildConstructionItemSavePayload(item),
        })),
        subitemUpdates: existingSubitems.map((subitem) => ({
          id: subitem.id,
          item_id: subitem.item_id,
          ...buildConstructionSubitemSavePayload(
            subitem,
            { includePrices: isCommonPriceSave }
          ),
        })),
        subitemInserts: localSubitems.map((subitem) => ({
          client_id: subitem.id,
          ...buildConstructionSubitemInsertPayload(subitem),
        })),
        templateCondition: adminTemplateCondition,
        templateValues,
      });
      adminCatalogSnapshotRef.current = { companyId: "", snapshot: null };
      const insertResults = (atomicResult.insertedSubitems ?? []).map((entry) => ({
        localId: entry.clientId,
        persistedSubitem: entry.subitem,
      }));
      const reconciledLocalSubitems = reconcileInsertedSubitems(
        localSubitems,
        insertResults
      );
      if (localSubitems.length) {
        const persistedByLocalId = new Map(
          localSubitems.map((subitem, index) => [
            subitem.id,
            reconciledLocalSubitems[index],
          ])
        );
        setAdminItems((current) =>
          current.map((item) => {
            const nextSubitems = (item.subitems ?? []).map((subitem) => {
              const persisted = persistedByLocalId.get(subitem.id);
              if (!persisted || persisted.id === subitem.id) return subitem;
              return {
                ...subitem,
                id: persisted.id,
                created_at: persisted.created_at ?? subitem.created_at,
                updated_at: persisted.updated_at ?? subitem.updated_at,
              };
            });
            return rebuildAdminItemCanonicalProducts({
              ...item,
              subitems: nextSubitems,
            });
          })
        );
      }

      const persistedTemplateValueIds = new Map(
        (atomicResult.templateValues ?? []).map((value) => [
          value.subitemId,
          value.valueId,
        ])
      );
      if (persistedTemplateValueIds.size) {
        setAdminItems((current) => current.map((item) => ({
          ...item,
          subitems: (item.subitems ?? []).map((subitem) => {
            const persistedSubitem = insertResults.find(
              (entry) => entry.localId === subitem.id
            )?.persistedSubitem;
            const constructionSubitemId = persistedSubitem?.id ?? subitem.id;
            return persistedTemplateValueIds.has(constructionSubitemId)
              ? {
                  ...subitem,
                  ...(persistedSubitem ? { id: constructionSubitemId } : {}),
                  template_value_id: persistedTemplateValueIds.get(constructionSubitemId),
                  template_option_value: "",
                  option_value: "",
                }
              : subitem;
          }),
        })));
      }

      if (isCommonPriceSave) {
        const savedAt = new Date().toISOString();
        setAdminCommonPriceSavedAt(savedAt);
        if (!auto) setAdminNotice("공통 단가/인건비를 저장했습니다.");
        if (refetch) await fetchAdminItems({ mode: "prices" });
        if (!auto) {
          markAdminCatalogSavedNow(saveTarget);
        }
        return true;
      }

      if (!stayOnPage) {
        setCurrentAdminTemplateId("");
        setAdminConditionStep("select");
        await fetchAdminTemplateList();
        setAdminCatalogResource({
          status: "ready",
          companyId,
          scopeKey: getAdminCatalogScopeKey("condition"),
        });
      }
      if (!auto) setAdminNotice("현재 조건의 수량/인원을 저장했습니다.");
      if (refetch && stayOnPage) {
        await fetchAdminItems({ mode: "condition", condition: adminTemplateCondition });
      }
      if (!auto) {
        markAdminCatalogSavedNow(saveTarget);
      }
      return true;
    } catch (error) {
      const message = getFriendlyError(error, "시공 항목 값을 저장하지 못했어요. 다시 시도해주세요.");
      setAdminError(message);
      if (auto) throw error;
      markAdminCatalogError(message, target);
      return false;
    } finally {
      if (!auto) setAdminSaving(false);
    }
  }

  async function saveEstimateToSupabase({ auto = false } = {}) {
    if (!auto) {
      clearEstimateAutoSaveTimer();
      setEstimateSaving(true);
      setEstimateError("");
      setEstimateNotice("");
    }
    try {
      if (!isSupabaseConfigured) {
        throw new Error(".env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해야 합니다.");
      }
      if (!auto && !selectedRows.length) {
        throw new Error("견적서에 포함할 소재를 하나 이상 선택하세요.");
      }
      const incompleteSashRow = !auto && selectedRows.find((row) => (
        row.itemKind === "sash" && getSashEstimateRowValidationMessage(row)
      ));
      if (incompleteSashRow) throw new Error(getSashEstimateRowValidationMessage(incompleteSashRow));
      const companyId = requireSelectedCompanyId();

      const conditionSnapshot = buildConditionSnapshot({
        condition,
        companyId,
        summary: conditionSummary,
        estimatePyeong,
        conditionVariantLabel: activeEstimateConditionVariantLabel,
        conditionVariantLabelOverrides: estimateConditionVariantLabels,
      });
      const itemsData = buildEstimateItemsData({
        items: selectedRows,
        draftItems: buildEstimateDraftRows({
          items,
          estimateCatalog,
          fallbackCategories: categories,
          conditionPyeong: condition.size,
          estimatePyeong,
          getSpecLabel: getEstimateRowSpecLabel,
        }),
        adjustments: cleanEstimateAdjustments,
        siteMemo,
        estimateMeta: {
          estimateNumber,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          companyName: selectedCompanyName,
          createdDate: estimateIssuedAt,
          validUntil: addDaysToDateInput(estimateIssuedAt, 30),
          vatStatus: estimateVatStatus,
        },
        selectedItemsTotal,
        constructionDaysTotal: selectedConstructionDaysTotal,
        adjustmentTotal,
        finalTotal: total,
      });
      const estimatePayload = buildEstimateInsertPayload({
        companyId,
        address,
        workDate,
        conditionSnapshot,
        itemsData,
        total,
      });
      const templateWrite = auto ? null : getBlankEstimateTemplateWrite();
      const saveOptions = {
        estimate: estimatePayload,
        estimateId: estimateAggregateIdRef.current,
        clientDraftKey: estimateClientDraftKeyRef.current,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        projectName: address.trim(),
        templateCondition: templateWrite?.condition ?? null,
        templateValues: templateWrite?.values ?? [],
      };
      const saveResult = auto
        ? await saveEstimateDraft(saveOptions)
        : await saveEstimateDraftWithTemplate(saveOptions);
      estimateAggregateIdRef.current = saveResult.estimateId;
      updateEstimateListResource({
        status: "idle",
        companyId,
        scopeKey: "estimates",
      });

      if (auto) return true;

      const createdTemplate = Boolean(saveResult.templateCreated);

      setEstimateNotice(
        createdTemplate
          ? "견적서를 저장했고, 입력한 수량과 인원을 새 견적 템플릿으로 저장했습니다."
          : "저장되었습니다."
      );
      if (createdTemplate) setEstimateDraftSource("template");
      setPreviewBackPage("items");
      setEstimatePreviewType("general");
      setPage("preview");
      setEstimateAutoSaveStatus("saved");
      return true;
    } catch (error) {
      if (auto) throw error;
      setEstimateError(getFriendlyError(error, "견적서를 저장하지 못했어요. 다시 시도해주세요."));
      return false;
    } finally {
      if (!auto) setEstimateSaving(false);
    }
  }

  async function downloadEstimatePdf() {
    if (!printableEstimateDocumentRef.current) return;

    setEstimateError("");
    try {
      await exportEstimatePdf({
        documentNode: printableEstimateDocumentRef.current,
        companyName: selectedCompanyName,
        customerName,
        address,
        issuedAt: estimateIssuedAt,
        backgroundColor:
          getComputedStyle(document.documentElement).getPropertyValue("--bg-surface").trim(),
      });
    } catch (error) {
      setEstimateError(getFriendlyError(error, "PDF를 다운로드하지 못했어요. 다시 시도해주세요."));
    }
  }

  function handleOpenContract(nextTarget) {
    if (!nextTarget?.projectId && !nextTarget?.contractId) return;
    setSelectedEstimate(null);
    setContractEditorTarget({
      ...nextTarget,
      returnPage: nextTarget.returnPage || (page === "preview" ? "preview" : "admin-estimates"),
    });
    setPage("contract-editor");
  }

  function handleCloseContractEditor() {
    const returnPage = contractEditorTarget?.returnPage || CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS;
    setContractEditorTarget(null);
    setPage(returnPage);
  }

  function handleAppShellNavigate(nextPage) {
    if (nextPage === "logout") {
      requestAdminCatalogLeave(handleChangeCompany);
      return;
    }
    if (nextPage === "help-support") {
      return;
    }
    if (nextPage === "condition") {
      openNewEstimateCondition();
      return;
    }
    if (PROTECTED_ADMIN_PAGES.includes(nextPage)) {
      openAdminGate(nextPage);
      return;
    }
    setPage(nextPage);
  }

  function renderAppShell(children, shellOptions = {}) {
    const providedShellClassName = shellOptions.className || "";
    const shellClassName = [
      !providedShellClassName.includes("formate-app-shell--overview") && "formate-app-shell--overview",
      providedShellClassName,
    ].filter(Boolean).join(" ");

    const workspaceHeader = shellOptions.workspaceHeader ?? (
      <div className="home-sidebar-workspace">
        <img src={logoUrl} alt="" />
        <span>
          <strong>FORMATE</strong>
          <em>운영 워크스페이스</em>
        </span>
      </div>
    );

    return (
      <AppShell
        currentPage={page}
        onNavigate={handleAppShellNavigate}
        companyName={selectedCompanyName}
        userName={accountDisplayName}
        userAvatarUrl={accountAvatarUrl}
        onLogout={() => requestAdminCatalogLeave(handleChangeCompany)}
        navItems={APP_SHELL_NAV_ITEMS}
        className={shellClassName}
        workspaceHeader={workspaceHeader}
        canNavigateBack={canMoveInternalPageHistory(navigationHistory, "back")}
        canNavigateForward={canMoveInternalPageHistory(navigationHistory, "forward")}
        onNavigateBack={() => moveAppHistory("back")}
        onNavigateForward={() => moveAppHistory("forward")}
      >
        {children}
      </AppShell>
    );
  }

  function openEstimatePreview(previewType) {
    const incompleteSashRow = selectedRows.find(
      (row) => row.itemKind === "sash" && getSashEstimateRowValidationMessage(row)
    );
    if (incompleteSashRow) {
      setEstimateError(getSashEstimateRowValidationMessage(incompleteSashRow));
      setOpenCategory(incompleteSashRow.categoryId);
      return;
    }
    setEstimateError("");
    setPreviewBackPage("items");
    setEstimatePreviewType(previewType);
    setPage("preview");
  }

  function renderItemsScreenV2() {
    const currentRows = items[openCategory] ?? [];
    const estimateConditionDisplay = conditionChips.length > 0 ? conditionChips.join(" · ") : "조건 미선택";
    const hasEstimateCondition = canGoNext();
    const estimateConditionDrawerSummary = hasEstimateCondition && conditionChips.length > 0
      ? conditionChips.join(" · ")
      : "";
    const itemTableColumns = [
      { key: "selected", label: "", width: "32px" },
      { key: "material", label: "소재명", width: "38%" },
      { key: "spec", label: "규격", width: "26%" },
      { key: "quantity", label: "수량", align: "right", width: "100px" },
      { key: "unit", label: "단위", width: "60px" },
      { key: "totalAmount", label: "합계", align: "right", width: "140px" },
      { key: "photos", label: "사진", width: "56px" },
      { key: "expanded", label: "", width: "48px" },
    ];
    const categoryItems = estimateCatalog.map((category) => ({
      id: category.id,
      label: category.name,
      count: (items[category.id] ?? []).length,
      active: openCategory === category.id,
    }));

    const renderItemCell = ({ row, column, rowIndex }) => {
      const rowLabel = row.itemType === "flat" ? row.itemName : row.material;
      const rowConflict = getEstimateTemplateConflict(row, openCategory);

      if (column.key === "selected") {
        return (
          <label className="items-v2-check-cell" aria-label={`${rowLabel} 견적 포함`}>
            <input
              type="checkbox"
              checked={Boolean(row.selected)}
              onChange={(event) => updateItem(openCategory, rowIndex, {
                selected: event.target.checked,
                ...(row.itemKind === "sash" && event.target.checked ? { expanded: true } : {}),
              }, { immediate: true })}
            />
          </label>
        );
      }

      if (column.key === "material") {
        return (
          <div className="items-v2-material-cell">
            <strong>{rowLabel}</strong>
            <span>
              {rowConflict ? (
                <em className="items-v2-badge items-v2-badge--warning">
                  직접 수정됨 · {getEstimateTemplateConflictFieldLabel(rowConflict)}
                </em>
              ) : isEstimateRowModified(row) ? (
                <em className="items-v2-badge items-v2-badge--muted">수정됨</em>
              ) : null}
              {row.itemKind === "sash"
                && row.sashSelectionSource === "ranking"
                && row.sashUsageCount > 0 && (
                  <em className="items-v2-badge items-v2-badge--muted">
                    대표제품 · {row.sashUsageCount}회
                  </em>
                )}
              {row.itemKind === "sash"
                && row.sashSelectionSource === "pinned" && (
                  <em className="items-v2-badge items-v2-badge--muted">
                    <Pin size={12} strokeWidth={1.5} fill="currentColor" /> 대표
                  </em>
                )}
              {row.selected && <em className="items-v2-badge items-v2-badge--selected">포함</em>}
              {row.itemKind === "sash" && row.selected && !row.sashSpec ? (
                <em className="items-v2-badge items-v2-badge--warning">규격 선택 필요</em>
              ) : row.itemKind === "sash" && row.selected && !isSashEstimateSpecPricingConfirmed(row.sashSpec) ? (
                <em className="items-v2-badge items-v2-badge--warning">창 유형 선택 필요</em>
              ) : row.itemKind !== "sash" && !row.hasTemplateValue && (
                <em className="items-v2-badge items-v2-badge--warning">미입력</em>
              )}
            </span>
          </div>
        );
      }

      if (column.key === "spec") {
        if (row.itemKind === "sash") {
          return (
            <span
              className={`items-v2-sash-summary ${row.sashSpec ? "" : "items-v2-muted-value"}`.trim()}
              title={getEstimateRowSpecLabel(row) || undefined}
            >
              {getEstimateRowSpecLabel(row) || "제품 미선택"}
            </span>
          );
        }
        const choices = getEstimateRowSpecChoices(row);

        return choices.length ? (
          <select
            className="items-v2-inline-select"
            value={getEstimateRowSpecChoiceValue(row)}
            onChange={(event) => updateItem(openCategory, rowIndex, getEstimateRowSpecPatchFromChoice(event.target.value))}
          >
            {choices.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <span className={getEstimateRowSpecLabel(row) ? "" : "items-v2-muted-value"}>
            {getEstimateRowSpecLabel(row) || "규격 없음"}
          </span>
        );
      }

      if (column.key === "quantity") {
        if (row.itemKind === "sash") {
          if (row.unit !== "헤베") return <span className="items-v2-muted-value">-</span>;
          return (
            <span className={isSashEstimateSpecPricingConfirmed(row.sashSpec) ? "" : "items-v2-muted-value"}>
              {isSashEstimateSpecPricingConfirmed(row.sashSpec)
                ? Number(row.quantity).toLocaleString("ko-KR", { maximumFractionDigits: 4 })
                : "미확정"}
            </span>
          );
        }
        return (
          <input
            className={`items-v2-inline-input items-v2-inline-input--number ${rowConflict?.fields.includes("quantity") ? "items-v2-inline-input--template-conflict" : ""}`.trim()}
            type="text"
            inputMode="decimal"
            aria-label={`${rowLabel} 수량`}
            value={row.quantity ?? ""}
            onChange={(event) => updateItem(openCategory, rowIndex, { quantity: event.target.value })}
          />
        );
      }

      if (column.key === "unit") {
        return <span className={row.unit ? "" : "items-v2-muted-value"}>{row.unit || "-"}</span>;
      }

      if (column.key === "totalAmount") {
        if (row.itemKind === "sash" && row.selected && !isSashEstimateSpecPricingConfirmed(row.sashSpec)) {
          return <span className="items-v2-muted-value">미확정</span>;
        }
        if (row.itemKind === "sash" && !row.selected) {
          return row.sashSpec
            ? <span className="items-v2-sash-preview-amount"><PriceText value={row.totalAmount} size="sm" /></span>
            : <span className="items-v2-muted-value">—</span>;
        }
        return <PriceText value={row.totalAmount} size="sm" />;
      }

      if (column.key === "photos") {
        return (
          <button
            type="button"
            className={`items-v2-icon-button ${selectedPhotoSubitemId === row.subitemId ? "active" : ""}`.trim()}
            aria-label={`${rowLabel} 사진보기`}
            title="사진보기"
            onClick={() => handleOpenItemPhotos(row)}
          >
            <Image size={18} strokeWidth={1.5} />
          </button>
        );
      }

      if (column.key === "expanded") {
        return (
          <button
            type="button"
            className="items-v2-icon-button"
            aria-label={`${rowLabel} 세부 수정 ${row.expanded ? "닫기" : "열기"}`}
            title={row.expanded ? "세부 수정 닫기" : "세부 수정 열기"}
            onClick={() => updateItem(openCategory, rowIndex, { expanded: !row.expanded })}
          >
            {row.expanded ? <ChevronDown size={18} strokeWidth={1.5} /> : <ChevronRight size={18} strokeWidth={1.5} />}
          </button>
        );
      }

      return row[column.key] ?? "";
    };

    const renderItemExpandedRow = ({ row, rowIndex }) => {
      const photoPanel = renderEstimateItemPhotoPanel(row);
      const rowConflict = getEstimateTemplateConflict(row, openCategory);
      if (!row.expanded && !photoPanel) return null;

      return (
        <div className={`items-v2-expanded-stack ${row.itemKind === "sash" ? "items-v2-expanded-stack--sash" : ""}`.trim()}>
          {photoPanel}
          {row.expanded && (
            <div className={`items-v2-detail-panel ${row.itemKind === "sash" ? "items-v2-detail-panel--sash" : ""}`.trim()}>
              {row.itemKind === "sash" && (
                <SashEstimateEditor
                  companyId={selectedCompanyId}
                  row={row}
                  included={Boolean(row.selected)}
                  onPatch={(patch, options) => updateItem(openCategory, rowIndex, patch, options)}
                />
              )}
              {row.itemKind !== "sash" && (
                <>
              {!row.hasTemplateValue && (
                <p className="items-v2-detail-note">
                  아직 이 조건의 수량/인원 기준이 없습니다. 이번 견적에서 직접 입력해 사용할 수 있습니다.
                </p>
              )}
              <label>
                <span>단가</span>
                <div className="items-v2-money-field">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatMoneyInputValue(row.unitPrice)}
                    onChange={(event) =>
                      updateItem(openCategory, rowIndex, { unitPrice: stripNumberInputFormatting(event.target.value) })
                    }
                  />
                  <em>원</em>
                </div>
              </label>
              <label>
                <span>인원</span>
                <div className={`items-v2-money-field ${rowConflict?.fields.includes("laborCount") ? "items-v2-money-field--template-conflict" : ""}`.trim()}>
                  <input
                    type="number"
                    min="0"
                    value={row.laborCount ?? ""}
                    onChange={(event) => updateItem(openCategory, rowIndex, { laborCount: event.target.value })}
                  />
                  <em>명</em>
                </div>
              </label>
              <label>
                <span>인건비</span>
                <div className="items-v2-money-field">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatMoneyInputValue(row.laborRate)}
                    onChange={(event) =>
                      updateItem(openCategory, rowIndex, { laborRate: stripNumberInputFormatting(event.target.value) })
                    }
                  />
                  <em>원</em>
                </div>
              </label>
              <label>
                <span>업체/브랜드</span>
                <div className="items-v2-money-field items-v2-brand-field">
                  <input
                    type="text"
                    value={row.contractor ?? ""}
                    placeholder="업체명 또는 브랜드"
                    onChange={(event) => updateItem(openCategory, rowIndex, { contractor: event.target.value })}
                  />
                </div>
              </label>
                </>
              )}
            </div>
          )}
        </div>
      );
    };

    const renderEstimateConditionDrawer = () => {
      if (!estimateConditionDrawerOpen) return null;

      return (
        <>
          <aside className="estimate-condition-drawer" aria-label="견적 조건 설정">
            <div className="estimate-condition-drawer__header">
              <div>
                <span>견적 조건 설정</span>
                {estimateConditionDrawerSummary && <strong>{estimateConditionDrawerSummary}</strong>}
              </div>
              <Button variant="tertiary" size="sm" onClick={closeEstimateConditionStage}>
                닫기
              </Button>
            </div>

            <div className="condition-static-grid estimate-condition-drawer__fields formate-scroll-light">
              <div className="condition-static-field">
                <p className="field-label">평수</p>
                <PyeongSelector
                  value={condition.size}
                  open={pyeongDropdownOpen}
                  onOpenChange={setPyeongDropdownOpen}
                  onChange={(value) => updateCondition({ size: value })}
                />
              </div>

              <div className="condition-static-field">
                <p className="field-label">주택 유형</p>
                <div className="segmented flush">
                  <button
                    type="button"
                    className={condition.buildType === "new" ? "selected" : ""}
                    onClick={() =>
                      updateCondition({
                        buildType: "new",
                        powderRoom: false,
                        dressRoom: false,
                        expanded: false,
                        conditionVariant: "확장형1",
                        expansionSpaces: [],
                      })
                    }
                  >
                    확장형
                  </button>
                  <button
                    type="button"
                    className={condition.buildType === "old" ? "selected" : ""}
                    onClick={() =>
                      updateCondition({
                        buildType: "old",
                        powderRoom: false,
                        dressRoom: false,
                        expanded: false,
                        conditionVariant: OLD_NO_EXTENSION_VARIANT,
                        expansionSpaces: [],
                      })
                    }
                  >
                    구형
                  </button>
                </div>
              </div>

              {condition.buildType === "new" && (
                <div className="condition-static-field condition-static-wide">
                  <div className="condition-variant-card-head">
                    <p className="field-label">확장형 세부 유형</p>
                    <button
                      type="button"
                      className="ghost condition-label-link"
                      onClick={() => openEstimateConditionLabelEditor(EXTENDED_VARIANTS)}
                    >
                      이름 변경
                    </button>
                  </div>
                  <div className="chips">
                    {EXTENDED_VARIANTS.map((variant) => (
                      <button
                        key={variant}
                        type="button"
                        className={`condition-variant-option ${getConditionVariant(condition) === variant ? "selected" : ""}`.trim()}
                        onClick={() => updateCondition({ conditionVariant: variant })}
                      >
                        <span>{getConditionVariantLabel(variant, estimateConditionVariantLabelMap) || variant}</span>
                        {getConditionVariantLabel(variant, estimateConditionVariantLabelMap) && <small>{variant}</small>}
                      </button>
                    ))}
                  </div>
                  {renderEstimateConditionLabelEditor(EXTENDED_VARIANTS)}
                </div>
              )}

              {condition.buildType === "old" && (
                <>
                  <div className="condition-static-field">
                    <p className="field-label">확장 여부</p>
                    <div className="segmented flush">
                      <button
                        type="button"
                        className={!condition.expanded ? "selected" : ""}
                        onClick={() =>
                          updateCondition({
                            expanded: false,
                            conditionVariant: OLD_NO_EXTENSION_VARIANT,
                            expansionSpaces: [],
                          })
                        }
                      >
                        확장 없음
                      </button>
                      <button
                        type="button"
                        className={condition.expanded ? "selected" : ""}
                        onClick={() =>
                          updateCondition({
                            expanded: true,
                            conditionVariant: OLD_EXTENDED_VARIANTS.includes(condition.conditionVariant)
                              ? condition.conditionVariant
                              : "구형1",
                          })
                        }
                      >
                        확장 있음
                      </button>
                    </div>
                  </div>

                  <div className="condition-static-field condition-static-wide">
                    <div className="condition-variant-card-head">
                      <p className="field-label">구형 세부 유형</p>
                      <button
                        type="button"
                        className="ghost condition-label-link"
                        onClick={() =>
                          openEstimateConditionLabelEditor(
                            condition.expanded ? OLD_EXTENDED_VARIANTS : [OLD_NO_EXTENSION_VARIANT]
                          )
                        }
                      >
                        이름 변경
                      </button>
                    </div>
                    {condition.expanded ? (
                      <div className="chips">
                        {OLD_EXTENDED_VARIANTS.map((variant) => (
                          <button
                            key={variant}
                            type="button"
                            className={`condition-variant-option ${getConditionVariant(condition) === variant ? "selected" : ""}`.trim()}
                            onClick={() => updateCondition({ conditionVariant: variant })}
                          >
                            <span>{getConditionVariantLabel(variant, estimateConditionVariantLabelMap) || variant}</span>
                            {getConditionVariantLabel(variant, estimateConditionVariantLabelMap) && <small>{variant}</small>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="condition-static-note">
                        확장 없음은 <strong>{formatConditionVariantLabel(OLD_NO_EXTENSION_VARIANT, estimateConditionVariantLabelMap)}</strong> 기준으로 불러옵니다.
                      </div>
                    )}
                    {renderEstimateConditionLabelEditor(
                      condition.expanded ? OLD_EXTENDED_VARIANTS : [OLD_NO_EXTENSION_VARIANT]
                    )}
                  </div>
                </>
              )}

              <div className="condition-static-field">
                <p className="field-label">거주 상태</p>
                <div className="segmented flush">
                  <button
                    type="button"
                    className={condition.occupancy === "empty" ? "selected" : ""}
                    onClick={() => updateCondition({ occupancy: "empty" })}
                  >
                    빈집
                  </button>
                  <button
                    type="button"
                    className={condition.occupancy === "occupied" ? "selected" : ""}
                    onClick={() => updateCondition({ occupancy: "occupied" })}
                  >
                    살림집
                  </button>
                </div>
              </div>
            </div>

            {estimateError && <div className="error-box">{estimateError}</div>}

            <div className="estimate-condition-drawer__actions">
              <Button variant="primary" disabled={!hasEstimateCondition || estimateLoading} onClick={() => loadEstimateFromCondition()}>
                {estimateLoading ? "불러오는 중..." : "기본 견적 불러오기"}
              </Button>
            </div>
            <div className="estimate-condition-drawer__spacer" aria-hidden="true" />
          </aside>
        </>
      );
    };

    return renderAppShell(
      <main className={`items-v2-page ${estimateConditionDrawerOpen ? "items-v2-page--condition-drawer-open" : ""}`.trim()}>
        <CategorySidebar
          title="공사 항목"
          items={categoryItems}
          onSelect={(categoryId) => toggleCategory(categoryId)}
          className="items-v2-category-sidebar"
          aria-label="견적 공사 항목"
        />
        <section className="items-v2-workspace">
          <header className="items-v2-header">
            <div className="items-v2-titleline">
              <h1>견적서 작성</h1>
              <span>{estimateConditionDisplay}</span>
            </div>
            <div className="items-v2-header-actions">
              <span className={`autosave-pill ${estimateAutoSaveStatus}`.trim()} title={estimateAutoSaveError || undefined}>
                {estimateAutoSaveStatus === "saving" ? "저장 중…" : estimateAutoSaveStatus === "error" ? "저장 실패" : estimateAutoSaveStatus === "saved" ? "저장됨" : "자동 저장"}
              </span>
              {estimateAutoSaveStatus === "error" && (
                <button type="button" className="sash-autosave-retry" onClick={runEstimateAutoSave}>재시도</button>
              )}
              <Button
                variant="primary"
                onClick={() => openEstimatePreview("general")}
              >
                일반 견적서 확인
              </Button>
              <Button
                variant="secondary"
                onClick={() => openEstimatePreview("detail")}
              >
                세부 견적서 확인
              </Button>
            </div>
          </header>

          <div className="items-v2-toolbar">
            <div className="items-v2-condition-summary">
              <span>현재 조건</span>
              <strong>{estimateConditionDisplay}</strong>
            </div>
            <div className="items-v2-pyeong-controls">
              <label htmlFor="items-v2-estimate-pyeong">견적 기준 평수</label>
              <div>
                <input
                  id="items-v2-estimate-pyeong"
                  type="number"
                  min="1"
                  max="90"
                  value={estimatePyeong}
                  onChange={handleEstimatePyeongInputChange}
                  onBlur={handleEstimatePyeongInputBlur}
                  onKeyDown={handleEstimatePyeongInputKeyDown}
                />
                <span>평</span>
              </div>
            </div>
          </div>

          {estimateLoading && <div className="status-box">시공 항목을 불러오는 중...</div>}
          {estimateNotice && <div className="status-box">{estimateNotice}</div>}
          {estimateError && <div className="error-box">{estimateError}</div>}

          {estimateTemplateConflicts.length > 0 && (
            <div className="items-v2-template-review" role="status">
              <div className="items-v2-template-review__message">
                <TriangleAlert size={18} strokeWidth={1.7} aria-hidden="true" />
                <span>
                  <strong>{condition.size}평으로 변경했습니다.</strong>{" "}
                  직접 입력한 수량·인원 {estimateTemplateConflictValueCount}건은 자동으로 변경하지 않았습니다.
                </span>
              </div>
              <div className="items-v2-template-review__actions">
                <Button variant="secondary" size="sm" onClick={keepEstimateTemplateOverrides}>
                  내가 입력한 값 유지
                </Button>
                <Button variant="primary" size="sm" onClick={applyEstimateTemplateValuesToOverrides}>
                  {condition.size}평 기준값으로 변경
                </Button>
              </div>
            </div>
          )}

          <section className="items-v2-table-section">
            <div className="items-v2-section-header">
              <div>
                <h2>{currentCategory?.name || "공사 항목"} 견적 내역</h2>
                {currentCategory?.item_kind !== "sash" && (
                  <p>{condition.size ? `${condition.size}평 템플릿` : "견적 템플릿"}</p>
                )}
              </div>
              <span>{currentRows.length}개 항목</span>
            </div>
            {openCategory && currentRows.length ? (
              <Table
                columns={itemTableColumns}
                rows={currentRows}
                renderCell={renderItemCell}
                renderExpandedRow={renderItemExpandedRow}
                zebra
                rowHeight={40}
                emptyAsZeroMuted
                getRowClassName={(row) => (
                  getEstimateTemplateConflict(row, openCategory)
                    ? "items-v2-row--template-conflict"
                    : ""
                )}
                getRowId={(row) => {
                  const conflict = getEstimateTemplateConflict(row, openCategory);
                  return conflict ? `estimate-template-conflict-${encodeURIComponent(conflict.rowKey)}` : undefined;
                }}
                className="items-v2-table"
              />
            ) : (
              <EmptyState
                className="items-v2-table-empty"
                title={estimateLoading ? "단가표 항목을 불러오는 중입니다." : estimateCatalog.length ? "이 항목에 등록된 소재가 없습니다." : "등록된 시공 항목이 없습니다."}
                description={estimateLoading ? "잠시만 기다려 주세요." : estimateCatalog.length ? "관리자 페이지에서 소재를 추가하면 이 화면에서 견적에 포함할 수 있습니다." : "관리자 페이지에서 항목과 소재를 먼저 추가하세요."}
              />
            )}
          </section>

          <details className="items-v2-site-memo">
            <summary>현장 메모</summary>
            <textarea
              className="ui-input ui-input--textarea"
              value={siteMemo}
              onChange={(event) => setSiteMemo(event.target.value)}
              placeholder="고객에게 보여주지 않을 내부 메모를 적어두세요."
            />
          </details>

          <StickyTotalBar
            className="items-v2-total-bar"
            label={`${selectedRows.length}개 선택`}
            amounts={[
              { label: "선택 항목 합계", value: `${selectedItemsTotal.toLocaleString("ko-KR")}원` },
              { label: "추가금/할인", value: `${adjustmentTotal >= 0 ? "+" : "-"}${Math.abs(adjustmentTotal).toLocaleString("ko-KR")}원` },
              ...(selectedConstructionDaysTotal > 0
                ? [{ label: "예상 공사일정", value: `${selectedConstructionDaysTotal.toLocaleString("ko-KR")}일` }]
                : []),
              { label: "최종 견적 금액", value: `${total.toLocaleString("ko-KR")}원` },
            ]}
            actions={(
              <div className="items-v2-total-actions">
                <Button
                  variant="primary"
                  onClick={() => openEstimatePreview("general")}
                >
                  견적서 출력하기
                </Button>
              </div>
            )}
          />
        </section>
        {renderEstimateConditionDrawer()}
      </main>,
      { className: "formate-app-shell--items-v2" }
    );
  }

  if (companySession.checking) {
    return (
      <div className="app-shell login-shell">
        <style>{appStyles}</style>
        <section className="login-card">
          <div className="login-brand">
            <img src={logoUrl} alt="" />
            <strong>FORMATE</strong>
          </div>
          <p className="muted">업체 정보를 확인하는 중입니다...</p>
        </section>
      </div>
    );
  }

  if (!selectedCompany) {
    return (
      <div className={`app-shell ${authScreenMode === "login" ? "login-shell" : "public-shell"}`}>
        <style>{appStyles}</style>
        {authScreenMode === "login" ? (
          <section className="login-card">
            <button
              type="button"
              className="ghost login-back-button"
              onClick={() => {
                setLoginError("");
                setAuthScreenMode("landing");
              }}
            >
              <ArrowLeft size={18} /> 처음 화면으로
            </button>
            <div className="login-brand">
              <img src={logoUrl} alt="" />
              <strong>FORMATE</strong>
            </div>
            <div>
              <p className="eyebrow dark">업체 전용</p>
              <h1>업체 코드로 시작하기</h1>
              <p className="login-helper">업체 코드와 비밀번호만 입력하면 바로 사용할 수 있습니다.</p>
            </div>
            <form className="login-form" onSubmit={handleCompanyLogin}>
              <Input
                label="업체 코드"
                value={loginCode}
                onChange={(event) => setLoginCode(event.target.value)}
                autoComplete="username"
                placeholder="예: 삼풍"
              />
              <Input
                label="비밀번호"
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="비밀번호"
              />
              {loginError && <div className="error-box">{loginError}</div>}
              <Button variant="primary" type="submit" disabled={loginLoading}>
                {loginLoading ? "확인 중..." : "FORMATE 시작하기"}
              </Button>
            </form>
          </section>
        ) : (
          <main className="public-landing">
            <header className="public-header">
              <button
                type="button"
                className="secondary-button public-login-button"
                onClick={() => setAuthScreenMode("login")}
              >
                업체 로그인
              </button>
            </header>
            <section className="hero public-hero">
              <div className="hero-copy">
                <div className="hero-brand public-hero-brand" aria-label="FORMATE">
                  <img src={logoUrl} alt="" />
                  <strong>FORMATE</strong>
                </div>
                <p className="eyebrow dark">우리 업체 단가표로 만드는 견적서</p>
                <h1 className="public-hero-title">
                  <span>우리 업체 기준으로</span>
                  <span>빠르게 만드는</span>
                  <span>인테리어 견적서</span>
                </h1>
                <p>
                  평수와 주택 조건을 고르면 미리 입력한 단가와 수량 기준으로 견적 초안을 바로 만듭니다.
                  복잡한 설정 없이 상담 내용을 빠르게 견적서로 정리하세요.
                </p>
              </div>
              <div className="hero-preview" aria-hidden="true">
                <div className="preview-top">
                  <div>
                    <span>견적 입력</span>
                    <strong>32평 · 확장형 · 확장형1</strong>
                  </div>
                  <button type="button">PDF 저장</button>
                </div>
                <div className="preview-conditions">
                  <span>도배</span>
                  <span>장판</span>
                  <span>목공</span>
                </div>
                <div className="preview-lines">
                  <div>
                    <span>도배 · 실크</span>
                    <strong>수량 32평</strong>
                    <b>1,920,000원</b>
                  </div>
                  <div>
                    <span>장판 · 2.2T</span>
                    <strong>수량 32평</strong>
                    <b>1,280,000원</b>
                  </div>
                  <div>
                    <span>목공 · 몰딩</span>
                    <strong>인원 2명</strong>
                    <b>680,000원</b>
                  </div>
                </div>
                <div className="preview-total">
                  <span>총 견적 금액</span>
                  <strong>3,880,000원</strong>
                </div>
              </div>
            </section>
          </main>
        )}
      </div>
    );
  }

  return (
    <div className={`app-shell admin-shell-root ${(page === "items" || page === "condition") && USE_ITEMS_SCREEN_V2 ? "items-v2-shell" : ""} ${page === "landing" ? "home-workspace-shell" : ""}`.trim()}>
      <style>{appStyles}</style>

      {adminVerifyOpen && (
        <div className="modal-backdrop" onClick={closeAdminGate}>
          <section className="admin-verify-modal" onClick={(event) => event.stopPropagation()}>
            <div>
              <p className="eyebrow dark">FORMATE 관리</p>
              <h2>관리자 확인</h2>
              <p className="muted">
                단가와 시공 항목을 수정하려면 관리자 비밀번호를 입력해주세요.
              </p>
            </div>
            <form className="login-form" onSubmit={handleAdminVerify}>
              <label>
                관리자 비밀번호
                <input
                  className="ui-input"
                  type="password"
                  value={adminVerifyPassword}
                  onChange={(event) => setAdminVerifyPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="비밀번호"
                  autoFocus
                />
              </label>
              {adminVerifyError && <div className="error-box">{adminVerifyError}</div>}
              <div className="actions">
                <button type="button" className="secondary-button" onClick={closeAdminGate}>
                  취소
                </button>
                <button type="submit" className="primary-button" disabled={adminVerifyLoading}>
                  {adminVerifyLoading ? "확인 중..." : "관리자 페이지 들어가기"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {templateDeleteTarget && (
        <div className="modal-backdrop" onClick={closeTemplateDeleteDialog}>
          <section className="admin-verify-modal template-delete-modal" onClick={(event) => event.stopPropagation()}>
            <div>
              <p className="eyebrow danger">템플릿 삭제</p>
              <h2>저장한 템플릿을 삭제할까요?</h2>
              <p className="muted">
                <strong>{makeTemplateLabel(templateDeleteTarget, conditionVariantLabelMap)}</strong> 템플릿과 이 템플릿의 기본 수량/인원 값이 삭제됩니다.
              </p>
            </div>
            <form className="login-form" onSubmit={confirmDeleteAdminTemplate}>
              <label>
                관리자 비밀번호
                <input
                  className="ui-input"
                  type="password"
                  value={templateDeletePassword}
                  onChange={(event) => setTemplateDeletePassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="비밀번호"
                  autoFocus
                />
              </label>
              {templateDeleteError && <div className="error-box">{templateDeleteError}</div>}
              <div className="actions">
                <button type="button" className="secondary-button" onClick={closeTemplateDeleteDialog} disabled={templateDeleteLoading}>
                  취소
                </button>
                <button type="submit" className="danger-button" disabled={templateDeleteLoading}>
                  {templateDeleteLoading ? "삭제 중..." : "삭제하기"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {adminUnsavedLeaveOpen && (
        <div className="modal-backdrop" onClick={closeAdminUnsavedLeaveDialog}>
          <section className="admin-verify-modal unsaved-leave-modal" onClick={(event) => event.stopPropagation()}>
            <div>
              <p className="eyebrow danger">저장 확인</p>
              <h2>저장되지 않은 항목이 있습니다.</h2>
              <p className="muted">저장되지 않은 항목이 있습니다. 저장하기 버튼을 눌러주세요.</p>
            </div>
            {adminUnsavedLeaveError && <div className="error-box">{adminUnsavedLeaveError}</div>}
            <div className="actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeAdminUnsavedLeaveDialog}
                disabled={adminUnsavedLeaveSaving}
              >
                계속 편집하기
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={saveAndLeaveAdminCatalog}
                disabled={adminUnsavedLeaveSaving}
              >
                {adminUnsavedLeaveSaving ? "저장 중..." : "저장하고 나가기"}
              </button>
            </div>
          </section>
        </div>
      )}

      {aiSetupPriceConfirmOpen && (
        <div className="modal-backdrop" onClick={closeAiSetupPriceConfirm}>
          <section className="admin-verify-modal ai-price-update-modal" onClick={(event) => event.stopPropagation()}>
            <div>
              <p className="eyebrow dark">Excel 가져오기</p>
              <h2>기존 항목 단가/인건비를 반영할까요?</h2>
              <p className="muted">
                업데이트 예정 항목은 <strong>{aiSetupPriceUpdateTargets.length}개</strong>입니다.
                이 작업은 기존 단가표의 단가/인건비만 수정합니다. 새 항목, 템플릿 수량/인원, 비용/세금 후보는 저장되지 않습니다.
              </p>
            </div>
            <div className="ai-table-wrap ai-price-update-modal-table">
              <table className="ai-data-table ai-catalog-match-table">
                <thead>
                  <tr>
                    <th>FORMATE 대분류</th>
                    <th>FORMATE 세부항목</th>
                    <th>현재 단가 → 엑셀 단가</th>
                    <th>현재 인건비 → 엑셀 인건비</th>
                  </tr>
                </thead>
                <tbody>
                  {aiSetupPriceUpdateTargets.map((row) => (
                    <tr key={`confirm-price-${row.matchedSubitemId}-${row.sourceRowNumber}`}>
                      <td>{row.selectedCategoryName || "-"}</td>
                      <td>{row.selectedSubitemName || "-"}</td>
                      <td>{displayImportValue(row.currentUnitPrice)} → {displayImportValue(row.excelUnitPrice)}</td>
                      <td>{displayImportValue(row.currentLaborRate)} → {displayImportValue(row.excelLaborRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ai-plan-notice">
              이 작업은 기존 단가표의 단가/인건비만 수정합니다. 새 항목, 템플릿 수량/인원, 비용/세금 후보는 저장되지 않습니다.
            </div>
            {aiSetupPriceError && <div className="error-box">{aiSetupPriceError}</div>}
            {aiSetupPriceResult?.failedCount > 0 && (
              <div className="error-box">
                <strong>{aiSetupPriceResult.failedCount}개 항목을 반영하지 못했습니다.</strong>
                {aiSetupPriceResult.failedRows.map((row) => (
                  <p key={`failed-price-${row.target?.matchedSubitemId}-${row.target?.sourceRowNumber}`}>
                    {row.target?.selectedCategoryName || "-"} / {row.target?.selectedSubitemName || "-"}: {row.reason}
                  </p>
                ))}
              </div>
            )}
            <div className="actions">
              <button type="button" className="secondary-button" onClick={closeAiSetupPriceConfirm} disabled={aiSetupPriceSaving}>
                취소
              </button>
              <button type="button" className="primary-button" onClick={confirmAiSetupPriceUpdates} disabled={aiSetupPriceSaving || aiSetupPriceUpdateTargets.length === 0}>
                {aiSetupPriceSaving ? "단가표 반영 중..." : "반영하기"}
              </button>
            </div>
          </section>
        </div>
      )}

      {aiSetupTemplateConfirmOpen && (
        <div className="modal-backdrop" onClick={closeAiSetupTemplateConfirm}>
          <section className="admin-verify-modal ai-price-update-modal ai-template-save-modal" onClick={(event) => event.stopPropagation()}>
            <div>
              <p className="eyebrow dark">Excel 가져오기</p>
              <h2>선택 조건의 견적 템플릿에 저장할까요?</h2>
              <p className="muted">
                선택 조건은 <strong>{aiSetupApplyConditionLabel}</strong>입니다.
                저장 예정 항목은 <strong>{aiSetupTemplateValueTargets.length}개</strong>입니다.
              </p>
            </div>
            <div className="ai-table-wrap ai-price-update-modal-table">
              <table className="ai-data-table ai-catalog-match-table">
                <thead>
                  <tr>
                    <th>FORMATE 대분류</th>
                    <th>FORMATE 세부항목</th>
                    <th>수량</th>
                    <th>인원</th>
                    <th>단위</th>
                  </tr>
                </thead>
                <tbody>
                  {aiSetupTemplateValueTargets.map((row) => (
                    <tr key={`confirm-template-${row.matchedSubitemId}-${row.sourceRowNumber}`}>
                      <td>{row.categoryName || "-"}</td>
                      <td>{row.subitemName || "-"}</td>
                      <td>{displayImportValue(row.quantity)}</td>
                      <td>{displayImportValue(row.laborCount)}</td>
                      <td>{row.unit || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ai-plan-notice">
              이 작업은 선택한 조건의 견적 템플릿 수량/인원만 저장합니다. 단가/인건비는 단가표에 저장되는 값이며,
              새 항목과 비용/세금 후보는 저장되지 않습니다.
            </div>
            {aiSetupTemplateError && <div className="error-box">{aiSetupTemplateError}</div>}
            {aiSetupTemplateResult?.failedCount > 0 && (
              <div className="error-box">
                <strong>{aiSetupTemplateResult.failedCount}개 항목을 저장하지 못했습니다.</strong>
                {aiSetupTemplateResult.failedRows.map((row) => (
                  <p key={`failed-template-${row.target?.matchedSubitemId}-${row.target?.sourceRowNumber}`}>
                    {row.target?.categoryName || "-"} / {row.target?.subitemName || "-"}: {row.reason}
                  </p>
                ))}
              </div>
            )}
            <div className="actions">
              <button type="button" className="secondary-button" onClick={closeAiSetupTemplateConfirm} disabled={aiSetupTemplateSaving}>
                취소
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={confirmAiSetupTemplateValues}
                disabled={aiSetupTemplateSaving || !aiSetupApplyConditionComplete || aiSetupTemplateValueTargets.length === 0}
              >
                {aiSetupTemplateSaving ? "템플릿 저장 중..." : "저장하기"}
              </button>
            </div>
          </section>
        </div>
      )}

      {aiSetupNewItemConfirmOpen && (
        <div className="modal-backdrop" onClick={closeAiSetupNewItemConfirm}>
          <section className="admin-verify-modal ai-price-update-modal ai-new-item-modal" onClick={(event) => event.stopPropagation()}>
            <div>
              <p className="eyebrow dark">Excel 가져오기</p>
              <h2>새 항목 후보를 단가표에 추가할까요?</h2>
              <p className="muted">
                추가 예정 대분류는 <strong>{aiSetupNewItemSummary.newCategoryCount}개</strong>,
                세부항목은 <strong>{aiSetupNewItemTargets.length}개</strong>입니다.
              </p>
            </div>
            <div className="ai-table-wrap ai-price-update-modal-table">
              <table className="ai-data-table ai-catalog-match-table">
                <thead>
                  <tr>
                    <th>원본 행</th>
                    <th>대분류</th>
                    <th>세부항목명</th>
                    <th>단위</th>
                    <th>단가</th>
                    <th>인건비</th>
                  </tr>
                </thead>
                <tbody>
                  {aiSetupNewItemTargets.map((row) => (
                    <tr key={`confirm-new-item-${row.sourceRowNumber}`}>
                      <td className="ai-column-code">{row.sourceRowNumber}</td>
                      <td>{row.categoryName || "-"}</td>
                      <td>{row.subitemName || "-"}</td>
                      <td>{row.unit || "-"}</td>
                      <td>{displayImportValue(row.unitPrice)}</td>
                      <td>{displayImportValue(row.laborRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ai-plan-notice">
              이 작업은 새 대분류/새 세부항목만 단가표에 추가합니다. 템플릿 수량/인원, 비용/세금 후보, 검산/합계 행은 저장되지 않습니다.
            </div>
            {aiSetupNewItemError && <div className="error-box">{aiSetupNewItemError}</div>}
            {aiSetupNewItemResult?.failedCount > 0 && (
              <div className="error-box">
                <strong>{aiSetupNewItemResult.failedCount}개 항목을 추가하지 못했습니다.</strong>
                {aiSetupNewItemResult.failedRows.map((row) => (
                  <p key={`failed-new-item-${row.target?.sourceRowNumber}`}>
                    {row.target?.categoryName || "-"} / {row.target?.subitemName || "-"}: {row.reason}
                  </p>
                ))}
              </div>
            )}
            <div className="actions">
              <button type="button" className="secondary-button" onClick={closeAiSetupNewItemConfirm} disabled={aiSetupNewItemSaving}>
                취소
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={confirmAiSetupNewItems}
                disabled={aiSetupNewItemSaving || aiSetupNewItemTargets.length === 0}
              >
                {aiSetupNewItemSaving ? "새 항목 추가 중..." : "추가하기"}
              </button>
            </div>
          </section>
        </div>
      )}

      {conditionSummary && page === "preview" && (
        <div className="sticky-summary">
          <span>견적 조건</span>
          <strong>{conditionSummary}</strong>
        </div>
      )}

      {page === "landing" && renderAppShell(
        <main className="landing work-home work-home-flat">
          <section className="work-home-content">
            <HomeOperationsOverview
              companyId={selectedCompanyId}
              onNavigate={setPage}
              headerAction={
                <Button
                  variant="primary"
                  leftIcon={<Plus />}
                  className="customer-operations-home-priority__create-estimate"
                  onClick={openNewEstimateCondition}
                >
                  새 견적서 작성
                </Button>
              }
              recentEstimates={
                <>
                  <header>
                    <h3 id="home-recent-estimates-title">최근 견적</h3>
                    <button type="button" className="home-text-link" onClick={() => setPage("admin-estimates")}>
                      전체 보기
                    </button>
                  </header>
                  {recentHomeEstimates.length > 0 ? (
                    <div className="customer-operations-home-priority__estimate-list">
                      {recentHomeEstimates.slice(0, 4).map((estimate) => {
                        const estimateMeta = getEstimateItemsDataMeta(estimate.items_data);
                        const customerName = getSavedEstimateCustomerName(estimate);
                        const address = `${estimate.address ?? ""}`.trim();
                        const title = address || customerName || "견적 정보";
                        const estimateNumber = `${estimateMeta.estimateNumber ?? ""}`.trim();
                        const constructionDays = getEstimateItemsDataConstructionDaysTotal(estimate.items_data);
                        const statusView = getHomeEstimateStatusView(estimate);
                        const totalAmount = toNonNegativeNumberOrZero(estimate.total_amount);
                        const showZeroAmount = statusView.tone === "success";
                        const displayDate = getSavedEstimateDisplayDate(estimate);
                        const metadata = [
                          estimateNumber,
                          displayDate !== "-" ? displayDate : "",
                          constructionDays > 0 ? `예상 ${constructionDays}일` : "",
                          estimate.construction_date ? `시공 ${estimate.construction_date}` : "",
                        ].filter(Boolean);

                        return (
                          <article className="customer-operations-home-priority__estimate-row" key={estimate.id}>
                            <span className="customer-operations-home-priority__estimate-copy">
                              <strong className={title === "견적 정보" ? "is-fallback" : ""}>{title}</strong>
                              {address && customerName ? <small>{customerName} 고객</small> : null}
                              <small>{metadata.join(" · ")}</small>
                            </span>
                            <span className="customer-operations-home-priority__estimate-side">
                              {totalAmount > 0 || showZeroAmount
                                ? <PriceText value={totalAmount} size="sm" />
                                : <strong className="is-undecided">금액 미정</strong>}
                              <span className={`customer-operations-home-priority__estimate-status is-${statusView.tone}`}>
                                <i aria-hidden="true" />
                                {statusView.label}
                              </span>
                            </span>
                            <span className="customer-operations-home-priority__estimate-actions">
                              <button
                                type="button"
                                className="home-text-action"
                                onClick={() => setSelectedEstimate(estimate)}
                              >
                                확인
                              </button>
                              <button
                                type="button"
                                className="home-text-action"
                                onClick={() => loadSavedEstimateDraft(estimate, { copy: true, destination: "items" })}
                              >
                                이어서 작성
                              </button>
                            </span>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="customer-operations-home-priority__state">
                      최근 저장 견적이 없습니다
                    </div>
                  )}
                </>
              }
            />
          </section>

          {selectedEstimate && (
            <div className="modal-backdrop" onClick={() => setSelectedEstimate(null)}>
              <section className="estimate-modal home-estimate-modal" onClick={(event) => event.stopPropagation()}>
                <div className="editor-header">
                  <div>
                    <span>저장 견적</span>
                    <h3>{getSavedEstimateCustomerName(selectedEstimate) || selectedEstimate.address || "견적서"}</h3>
                  </div>
                  <Button variant="tertiary" onClick={() => setSelectedEstimate(null)}>
                    닫기
                  </Button>
                </div>
                <div className="home-estimate-modal-summary">
                  <span>
                    <strong>작성일</strong>
                    {getSavedEstimateDisplayDate(selectedEstimate)}
                  </span>
                  <span>
                    <strong>현장</strong>
                    {selectedEstimate.address || "주소 미입력"}
                  </span>
                  <span>
                    <strong>금액</strong>
                    <PriceText value={selectedEstimate.total_amount || 0} size="sm" />
                  </span>
                </div>
                <div className="modal-actions">
                  <Button variant="secondary" onClick={() => loadSavedEstimateDraft(selectedEstimate, { destination: "preview" })}>
                    견적서 보기
                  </Button>
                  <Button variant="primary" onClick={() => loadSavedEstimateDraft(selectedEstimate, { copy: true, destination: "items" })}>
                    이어서 작성
                  </Button>
                </div>
              </section>
            </div>
          )}
        </main>
        , {
          className: "formate-app-shell--overview formate-app-shell--home-workspace",
          workspaceHeader: (
            <div className="home-sidebar-workspace">
              <img src={logoUrl} alt="" />
              <span>
                <strong>FORMATE</strong>
                <em>운영 워크스페이스</em>
              </span>
            </div>
          ),
        }
      )}

      {page === CUSTOMER_OPERATIONS_PAGES.REQUESTS && renderAppShell(
        <CustomerRequestsPage companyId={selectedCompanyId} onNavigate={setPage} />,
        { className: "formate-app-shell--customer-requests" }
      )}

      {page === CUSTOMER_OPERATIONS_PAGES.CUSTOMERS_PROJECTS && renderAppShell(
        <CustomersProjectsPage
          companyId={selectedCompanyId}
          onNavigate={setPage}
          onOpenContract={handleOpenContract}
        />,
        { className: "formate-app-shell--customer-projects" }
      )}

      {page === "contract-editor" && contractEditorTarget && renderAppShell(
        <ContractEditorPage
          companyId={selectedCompanyId}
          target={contractEditorTarget}
          onBack={handleCloseContractEditor}
        />
      )}

      {page === CUSTOMER_OPERATIONS_PAGES.AFTERCARE_SERVICE && renderAppShell(
        <AftercareServicePage companyId={selectedCompanyId} onNavigate={setPage} />,
        { className: "formate-app-shell--aftercare" }
      )}

      {page === "admin" && adminVerified && renderAppShell(
        <main className="panel-page admin-home-page">
          <section className="admin-home-section">
            <PageHeader
              eyebrow="관리자 홈"
              title="템플릿 만들기"
              description="고객에게 보여주는 견적서가 아니라, 우리 업체 내부 템플릿입니다."
              actions={
                <Button variant="tertiary" leftIcon={<ArrowLeft />} onClick={() => setPage("landing")}>
                  돌아가기
                </Button>
              }
            />
            <div className="admin-action-list">
              <button
                className="admin-action-row"
                onClick={() => setPage("admin-prices")}
              >
                <ClipboardList size={18} strokeWidth={1.5} />
                <span>
                  <strong>1. 단가표 관리</strong>
                  <em>자주 쓰는 기본 단가와 인건비를 저장해두세요. 견적서 작성 중에도 금액은 수정할 수 있습니다.</em>
                </span>
              </button>
              <button
                className="admin-action-row"
                onClick={() => setPage("admin-items")}
              >
                <ClipboardList size={18} strokeWidth={1.5} />
                <span>
                  <strong>2. 견적 템플릿 만들기</strong>
                  <em>자주 쓰는 견적 템플릿을 만들어두세요. 기본 수량과 기본 인원을 저장할 수 있습니다.</em>
                </span>
              </button>
              <button className="admin-action-row" onClick={() => setPage("admin-detail-costs")}>
                <FileText size={18} strokeWidth={1.5} />
                <span>
                  <strong>3. 세부 비용 관리</strong>
                  <em>철거, 폐기물, 운반비처럼 견적서에 추가할 수 있는 비용을 관리합니다.</em>
                </span>
              </button>
            </div>
          </section>
        </main>
        , { className: "formate-app-shell--overview" }
      )}

      {excelImportOpen && adminVerified && (
        <div className="excel-import-modal-backdrop" onMouseDown={closeExcelImport}>
          <section
            className="excel-import-modal formate-scroll-light"
            role="dialog"
            aria-modal="true"
            aria-labelledby="excel-import-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
          <main className="panel-page admin-page ai-setup-page">
          <section className="panel wide ai-setup-panel">
            <div className="ai-setup-header">
              <div>
                <p className="eyebrow dark">Excel 가져오기</p>
                <h2 id="excel-import-modal-title">{excelImportTarget === EXCEL_IMPORT_TARGETS.PRICES ? "단가표 Excel 업로드" : "견적 템플릿 Excel 업로드"}</h2>
                <p className="muted">
                  기존 Excel 단가표를 분석해 FORMATE 항목으로 가져옵니다. 저장 전 결과를 검토할 수 있습니다.
                </p>
              </div>
              <div className="excel-import-modal-head-actions">
                <span className="ai-status-pill">대상: {excelImportTarget === EXCEL_IMPORT_TARGETS.PRICES ? "단가표" : "견적 템플릿"}</span>
                <span className={`ai-status-pill ${aiSetupStatus}`.trim()}>{aiSetupStatusLabel}</span>
                <Button variant="tertiary" size="sm" onClick={closeExcelImport}>닫기</Button>
              </div>
            </div>

            <div className="ai-upload-grid">
              <label
                className="ai-upload-box"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleAiSetupFileDrop}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleAiSetupFileChange}
                  disabled={aiSetupStatus === "reading"}
                />
                <FileText />
                <strong>파일 선택 또는 드래그 앤 드롭</strong>
                <span>.xlsx, .xls 파일을 선택하세요.</span>
              </label>
              <div className="ai-upload-summary">
                <span>선택한 파일</span>
                <strong>{aiSetupFileName ? `선택됨 · ${aiSetupFileName}` : "아직 선택한 파일이 없습니다."}</strong>
                {aiSetupSheetCompactMeta && <p>{aiSetupSheetCompactMeta}</p>}
              </div>
            </div>

            {aiSetupError && <div className="error-box">{aiSetupError}</div>}
            {aiSetupImportContext?.notice && (
              <div className="info-box" role="status">{aiSetupImportContext.notice}</div>
            )}

            {aiSetupSheets.length > 0 && (
              <section className="ai-review-panel" aria-live="polite">
                <div className="ai-sheet-tabs" role="tablist" aria-label="엑셀 시트 선택">
                  {aiSetupSheets.map((sheet) => (
                    <button
                      key={sheet.name}
                      type="button"
                      className={sheet.name === selectedAiSetupSheet?.name ? "selected" : ""}
                      onClick={() => setSelectedAiSetupSheetName(sheet.name)}
                    >
                      {sheet.name}
                      <span>{sheet.rowCount}행</span>
                    </button>
                  ))}
                </div>

                <div className="ai-sheet-meta-line">
                  {aiSetupFileName} · 시트 {aiSetupSheets.length}개 · {aiSetupSheetCompactMeta || "시트 선택 전"} · 표시 {aiSetupPreviewRows.length}행
                </div>

                <section className="ai-collapsible-section">
                  <button
                    type="button"
                    className="ai-collapsible-toggle"
                    onClick={() => setAiSetupAdvancedOpen((open) => !open)}
                    aria-expanded={aiSetupAdvancedOpen}
                  >
                    <span>{aiSetupAdvancedOpen ? "고급 설정 접기" : "고급 설정 보기"}</span>
                    <em>헤더 {aiSetupMappingAnalysis.hasHeader ? `${aiSetupMappingAnalysis.headerRowIndex + 1}행` : "확인 필요"} · 열 매핑 {aiSetupMappingAnalysis.recognizedCount ?? 0}개</em>
                    <div>
                      {aiSetupAdvancedBadges.map((badge) => (
                        <b key={badge}>{badge}</b>
                      ))}
                    </div>
                  </button>
                </section>

                {aiSetupAdvancedOpen && (
                  <>
                <section className="ai-manual-review-panel">
                  <div className="ai-mapping-title">
                    <div>
                      <h3>헤더 행 선택</h3>
                      <p>자동 탐지 결과를 기본으로 사용합니다. 엑셀 구조가 다르면 직접 헤더 행을 바꿔주세요.</p>
                    </div>
                    {aiSetupAutoMappingAnalysis.hasHeader ? (
                      <div className="ai-mapping-stats">
                        <span>자동 탐지: {aiSetupAutoMappingAnalysis.headerRowIndex + 1}행</span>
                      </div>
                    ) : (
                      <div className="ai-mapping-stats warning">
                        <span>자동 탐지 실패</span>
                      </div>
                    )}
                  </div>
                  <label className="ai-header-select">
                    헤더 행
                    <select value={aiSetupHeaderRowIndex >= 0 ? aiSetupHeaderRowIndex : ""} onChange={handleAiSetupHeaderRowChange}>
                      <option value="">헤더 행을 선택하세요</option>
                      {aiSetupHeaderRowOptions.map((option) => (
                        <option key={option.index} value={option.index}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>

                {aiSetupHeaderRowIndex >= 0 && aiSetupColumnMappings.length > 0 && (
                  <section className="ai-column-review-panel">
                    <div className="ai-mapping-title">
                      <div>
                        <h3>열 매핑 검토/수정</h3>
                        <p>각 원본 열을 FORMATE 표준 필드로 바꿔 지정할 수 있습니다. 변경하면 아래 미리보기가 바로 갱신됩니다.</p>
                      </div>
                    </div>
                    <div className="ai-table-wrap ai-column-map-wrap">
                      <table className="ai-data-table ai-column-map-table">
                        <thead>
                          <tr>
                            <th>열</th>
                            <th>원본 헤더명</th>
                            <th>현재 매핑</th>
                            <th>필드 유형</th>
                            <th>신뢰도</th>
                            <th>매칭 방식</th>
                            <th>매핑 수정</th>
                            <th>추가필드명</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiSetupColumnMappings.map((mapping) => (
                            <tr key={`map-${mapping.columnIndex}`}>
                              <td className="ai-column-code">{getExcelColumnLabel(mapping.columnIndex)}</td>
                              <td>{mapping.originalHeader}</td>
                              <td>{mapping.fieldType === "ignored" ? "미사용" : mapping.fieldType === "unknown" ? "미인식" : mapping.mappedLabel}</td>
                              <td>{mapping.fieldType}</td>
                              <td>{mapping.confidence ? `${Math.round(mapping.confidence * 100)}%` : "-"}</td>
                              <td>
                                <span className="ai-match-method" title={mapping.reason || ""}>
                                  {mapping.matchMethod || "unknown"}
                                </span>
                              </td>
                              <td>
                                <select
                                  value={getExcelMappingSelectValue(mapping)}
                                  onChange={(event) => updateAiSetupColumnMapping(mapping.columnIndex, event.target.value)}
                                >
                                  {AI_MAPPING_SELECT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                {mapping.mappedKey === "custom_field" ? (
                                  <input
                                    type="text"
                                    value={mapping.customFieldName || mapping.originalHeader || ""}
                                    onChange={(event) => updateAiSetupCustomFieldName(mapping.columnIndex, event.target.value)}
                                    placeholder="추가필드명"
                                  />
                                ) : (
                                  <span className="ai-mapping-empty">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {aiSetupDuplicateWarnings.length > 0 && (
                  <div className="ai-duplicate-warning">
                    {aiSetupDuplicateWarnings.map((warning) => (
                      <p key={warning.key}>
                        {warning.label} 필드에 {warning.count}개 열이 매핑되어 있습니다. 미리보기에는 첫 번째 열이 사용됩니다. ({warning.columns})
                      </p>
                    ))}
                  </div>
                )}

                <section className="ai-mapping-panel">
                  <div className="ai-mapping-title">
                    <div>
                      <h3>열 자동 인식 결과</h3>
                      <p>
                        현재 선택된 헤더 행과 열 매핑을 기준으로 정리한 결과입니다.
                      </p>
                    </div>
                    {aiSetupMappingAnalysis.hasHeader ? (
                      <div className="ai-mapping-stats">
                        <span>헤더 행 {aiSetupMappingAnalysis.headerRowIndex + 1}</span>
                        <span>인식 {aiSetupMappingAnalysis.recognizedCount}개</span>
                        <span>미사용/미인식 {aiSetupMappingAnalysis.unknownCount}개</span>
                      </div>
                    ) : (
                      <div className="ai-mapping-stats warning">
                        <span>헤더 행을 자동으로 찾지 못했습니다</span>
                      </div>
                    )}
                  </div>

                  {aiSetupMappingAnalysis.hasHeader ? (
                    <div className="ai-mapping-groups">
                      {AI_MAPPING_GROUPS.map((group) => {
                        const entries = aiSetupMappingAnalysis.groupedMappings[group.key] ?? [];
                        return (
                          <div key={group.key} className={`ai-mapping-group ${group.key}`.trim()}>
                            <div className="ai-mapping-group-head">
                              <strong>{group.title}</strong>
                              <span>{entries.length}개</span>
                            </div>
                            <p>{group.description}</p>
                            {entries.length > 0 ? (
                              <div className="ai-mapping-chip-list">
                                {entries.map((mapping) => (
                                  <span key={`${mapping.columnIndex}-${mapping.originalHeader}`} className="ai-mapping-chip">
                                    <b>{getExcelColumnLabel(mapping.columnIndex)}</b>
                                    {mapping.originalHeader}
                                    {!["unknown", "ignored"].includes(mapping.fieldType) && (
                                      <em>{mapping.mappedLabel} · {Math.round(mapping.confidence * 100)}%</em>
                                    )}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="ai-mapping-empty">해당 열 없음</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="ai-empty-sheet">
                      <strong>헤더 행을 자동으로 찾지 못했습니다.</strong>
                      <p>공종, 품명, 수량, 단가처럼 표준 필드와 맞는 열 이름이 2개 이상 있는 행을 헤더로 인식합니다.</p>
                    </div>
                  )}
                </section>
                  </>
                )}

                {aiSetupMappingAnalysis.hasHeader && (
                  <section className="ai-collapsible-section">
                    <button
                      type="button"
                      className="ai-collapsible-toggle"
                      onClick={() => setAiSetupStandardOpen((open) => !open)}
                      aria-expanded={aiSetupStandardOpen}
                    >
                      <span>{aiSetupStandardOpen ? "표준화 결과 접기" : "표준화 결과 보기"}</span>
                      <em>{aiSetupMappingAnalysis.previewRows.length}행</em>
                      <div>
                        {aiSetupStandardBadges.map((badge) => (
                          <b key={badge}>{badge}</b>
                        ))}
                      </div>
                    </button>
                  </section>
                )}

                {aiSetupMappingAnalysis.hasHeader && aiSetupStandardOpen && (
                  <section className="ai-standard-preview">
                    <div className="ai-mapping-title">
                      <div>
                        <h3>표준 필드 미리보기</h3>
                        <p>헤더 아래 데이터를 FORMATE 표준 필드 형태로 옮긴 미리보기입니다. 아직 저장하지 않습니다.</p>
                      </div>
                      <div className="ai-mapping-stats">
                        <span>최대 50행</span>
                      </div>
                    </div>
                    {aiSetupMappedPreviewColumns.length > 0 && aiSetupMappingAnalysis.previewRows.length > 0 ? (
                      <div className="ai-table-wrap">
                        <table className="ai-data-table ai-standard-table">
                          <thead>
                            <tr>
                              <th className="row-number-cell">원본 행</th>
                              {aiSetupMappedPreviewColumns.map((mapping) => (
                                <th key={mapping.valueKey}>{mapping.displayLabel}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {aiSetupMappingAnalysis.previewRows.map((row) => (
                              <tr key={`mapped-${row.sourceRowNumber}`}>
                                <td className="row-number-cell">{row.sourceRowNumber}</td>
                                {aiSetupMappedPreviewColumns.map((mapping) => (
                                  <td key={mapping.valueKey}>{row[mapping.valueKey] ?? ""}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="ai-empty-sheet">
                        <strong>미리보기로 보여줄 데이터가 없습니다.</strong>
                        <p>매핑 가능한 열이 없거나 헤더 아래에 내용이 있는 행이 없습니다.</p>
                      </div>
                    )}
                  </section>
                )}

                {aiSetupMappingAnalysis.hasHeader && (
                  <section className="ai-catalog-match-panel">
                    <div className="ai-mapping-title">
                      <div>
                        <h3>FORMATE 항목 매칭 검토</h3>
                        <p>표준 필드 미리보기 행을 현재 업체의 기존 대분류/세부항목과 비교한 후보입니다. 아직 저장하지 않습니다.</p>
                      </div>
                      {aiSetupCatalogLoading && (
                        <div className="ai-mapping-stats">
                          <span>기존 항목 불러오는 중</span>
                        </div>
                      )}
                    </div>

                    {aiSetupCatalogError && <div className="error-box">{aiSetupCatalogError}</div>}
                    {!aiSetupCatalogLoading && !aiSetupCatalogError && aiSetupCatalogItems.length === 0 && (
                      <div className="ai-empty-sheet">
                        <strong>아직 등록된 단가표 항목이 없어 모두 새 항목 후보로 표시됩니다.</strong>
                        <p>이 화면에서는 후보만 검토합니다. 실제 단가표 저장은 아직 실행하지 않습니다.</p>
                      </div>
                    )}

                    {aiSetupAiError && <div className="error-box">{aiSetupAiError}</div>}
                    {aiSetupAiResult && (
                      <div className="ai-recommendation-summary">
                        <div className="ai-compact-summary-bar">
                          {aiSetupAnalysisSummaryItems.map(([label, count]) => (
                            <span key={label} className={label === "검토 필요" && count > 0 ? "needs-review" : ""}>
                              {label} <strong>{count}개</strong>
                            </span>
                          ))}
                        </div>
                        {aiSetupAiResult.warnings?.length > 0 && (
                          <details className="ai-compact-details">
                            <summary>AI 안내 {aiSetupAiResult.warnings.length}개 보기</summary>
                            <div className="ai-recommendation-warnings">
                            {aiSetupAiResult.warnings.map((warning, index) => (
                              <p key={`ai-warning-${index}`}>{warning}</p>
                            ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )}

                    <div className="ai-compact-summary-bar">
                      {aiSetupCatalogSummaryItems.map(([label, count]) => (
                        <span key={label} className={label === "검토 필요" && count > 0 ? "needs-review" : ""}>
                          {label} <strong>{count}개</strong>
                        </span>
                      ))}
                    </div>

                    <div className="ai-compact-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setAiSetupMatchReviewMode("review");
                          setAiSetupMatchReviewOpen((open) => !(open && aiSetupMatchReviewMode === "review"));
                        }}
                      >
                        검토 필요 {aiSetupCatalogMatchSummary.needsReview}개 확인
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setAiSetupMatchReviewMode("all");
                          setAiSetupMatchReviewOpen((open) => !(open && aiSetupMatchReviewMode === "all"));
                        }}
                      >
                        전체 항목 보기
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={handleAiSetupRecommendMatches}
                        disabled={aiSetupAiLoading || aiSetupCatalogMatchRows.length === 0 || !aiSetupMappingAnalysis.hasHeader}
                      >
                        {aiSetupAiLoading ? "AI 분석 중..." : aiSetupAiResult ? "AI 다시 추천" : "AI로 매칭 추천"}
                      </button>
                    </div>

                    {aiSetupMatchReviewOpen && (aiSetupVisibleCatalogMatchRows.length > 0 ? (
                      <div className="ai-table-wrap ai-catalog-match-wrap">
                        <table className="ai-data-table ai-catalog-match-table">
                          <thead>
                            <tr>
                              <th>원본 행</th>
                              <th>원본 대분류</th>
                              <th>원본 항목명</th>
                              <th>규격 또는 옵션</th>
                              <th>단위</th>
                              <th>기존 값 처리</th>
                              <th>행 유형</th>
                              <th>매칭 상태</th>
                              <th>처리 방식</th>
                              <th>FORMATE 대분류</th>
                              <th>FORMATE 세부항목</th>
                              <th>수량</th>
                              <th>단가</th>
                              <th>인건비(빈집)</th>
                              <th>인건비(살림집)</th>
                              <th>인원</th>
                              <th>원본 금액</th>
                              <th>메모</th>
                            </tr>
                          </thead>
                          <tbody>
                            {aiSetupVisibleCatalogMatchRows.map((row) => {
                              const canEditCatalogMapping = isAiWorkItemRow(row);
                              const selectedCategory = canEditCatalogMapping
                                ? aiSetupCatalogItems.find((item) => item.id === row.selectedCategoryId)
                                : null;
                              const availableSubitems = canEditCatalogMapping ? selectedCategory?.subitems ?? [] : [];
                              return (
                                <tr
                                  key={`catalog-match-${row.sourceRowNumber}`}
                                  className={`${row.isSplitParent ? "ai-split-parent-row" : ""} ${row.isSplitRow ? "ai-split-child-row" : ""}`.trim()}
                                >
                                  <td className="ai-column-code">
                                    {row.originalRowNumber ?? row.sourceRowNumber}
                                    {row.isSplitChild && (
                                      <small className="ai-match-hint">자동 분해 · 원본 {row.sourceParentRowNumber}행</small>
                                    )}
                                    {row.isSplitParent && (
                                      <small className="ai-match-hint">묶음 총액 · 기본 계산 기준</small>
                                    )}
                                  </td>
                                  <td>{row.sourceCategory || "-"}</td>
                                  <td>
                                    {canEditCatalogMapping ? (
                                      <input
                                        className="ai-inline-input wide"
                                        value={row.sourceItemName ?? ""}
                                        placeholder="항목명"
                                        onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { sourceItemName: event.target.value })}
                                      />
                                    ) : (
                                      row.sourceItemName || "-"
                                    )}
                                  </td>
                                  <td>
                                    {canEditCatalogMapping ? (
                                      <input
                                        className="ai-inline-input"
                                        value={row.spec ?? ""}
                                        placeholder="직접 입력"
                                        onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { spec: event.target.value })}
                                      />
                                    ) : row.spec || "-"}
                                  </td>
                                  <td>
                                    {canEditCatalogMapping ? (
                                      <input
                                        className="ai-inline-input"
                                        value={row.unit ?? ""}
                                        placeholder="직접 입력"
                                        onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { unit: event.target.value })}
                                      />
                                    ) : row.unit || "-"}
                                  </td>
                                  <td>
                                    {row.reviewStatus === "conflict" && row.action === "link" ? (
                                      <select
                                        value={row.conflictDecision ?? "keep"}
                                        onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { conflictDecision: event.target.value })}
                                      >
                                        <option value="keep">기존 값 유지</option>
                                        <option value="excel">Excel 값으로 변경</option>
                                      </select>
                                    ) : (
                                      <span className={`ai-match-status ${row.reviewStatus ?? "needs_review"}`}>
                                        {row.reviewStatus === "automatic" ? "자동 매핑 가능" : row.reviewStatus === "unmapped" ? "매핑되지 않음" : "확인 필요"}
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    <select
                                      value={row.rowType}
                                      onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { rowType: event.target.value })}
                                    >
                                      {AI_ROW_TYPE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td>
                                    <span className={`ai-match-status ${row.isSplitParent ? "subtotal_row" : getAiDisplayMatchStatus(row)}`.trim()}>
                                      {row.isSplitParent ? "묶음 총액" : getAiDisplayMatchStatusLabel(row)}
                                    </span>
                                    {row.aiReason && (
                                      <small className="ai-recommendation-reason" title={row.aiReason}>
                                        AI {row.aiConfidence !== null ? `${Math.round(Number(row.aiConfidence) * 100)}%` : ""} · {getAiRecommendationActionLabel(row.aiRecommendedAction)} · {formatAiShortReason(row.aiReason)}
                                        {row.aiReviewNotes?.length > 0 && (
                                          <span title={row.aiReviewNotes.join(" ")}>확인 필요 · {formatAiShortReason(row.aiReviewNotes.join(" "), 56)}</span>
                                        )}
                                      </small>
                                    )}
                                  </td>
                                  <td>
                                    {row.isSplitChild ? (
                                      <span className="ai-match-status ignored">분해 후보 · 계산 제외</span>
                                    ) : (
                                      <select
                                        value={getAiActionSelectValue(row)}
                                        onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { action: event.target.value })}
                                      >
                                        {getAiActionOptionsForRowType(row.rowType).map((option) => (
                                          <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                      </select>
                                    )}
                                  </td>
                                  <td>
                                    {canEditCatalogMapping ? (
                                      <>
                                        <select
                                          value={row.selectedCategoryId}
                                          onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { categoryId: event.target.value })}
                                        >
                                          <option value="">선택 안 함</option>
                                          {aiSetupCatalogItems.map((item) => (
                                            <option key={item.id} value={item.id}>{item.name}</option>
                                          ))}
                                        </select>
                                        {row.categoryMatch && (
                                          <small className="ai-match-hint">
                                            {row.categoryMatch.categoryMatchMethod} · {Math.round(row.categoryMatch.categoryConfidence * 100)}%
                                          </small>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <span className="ai-match-status ignored">해당 없음</span>
                                        <small className="ai-match-hint">{getAiCatalogMappingUnavailableMessage(row.rowType)}</small>
                                      </>
                                    )}
                                  </td>
                                  <td>
                                    {canEditCatalogMapping ? (
                                      <>
                                        <select
                                          value={row.selectedSubitemId}
                                          onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { subitemId: event.target.value })}
                                          disabled={!row.selectedCategoryId}
                                        >
                                          <option value="">선택 안 함</option>
                                          {availableSubitems.map((subitem) => (
                                            <option key={subitem.id} value={subitem.id}>{subitem.name}</option>
                                          ))}
                                        </select>
                                        {row.subitemMatch && (
                                          <small className="ai-match-hint">
                                            {row.subitemMatch.subitemMatchMethod} · {Math.round(row.subitemMatch.subitemConfidence * 100)}%
                                          </small>
                                        )}
                                      </>
                                    ) : (
                                      <span className="ai-match-status ignored">해당 없음</span>
                                    )}
                                  </td>
                                  <td>
                                    {canEditCatalogMapping ? (
                                      <input
                                        className="ai-inline-input"
                                        value={row.quantity ?? ""}
                                        placeholder="직접 입력"
                                        onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { quantity: event.target.value })}
                                      />
                                    ) : row.quantity ?? ""}
                                  </td>
                                  <td>
                                    {canEditCatalogMapping ? (
                                      <input
                                        className="ai-inline-input"
                                        value={row.unit_price ?? ""}
                                        placeholder="직접 입력"
                                        onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { unitPrice: event.target.value })}
                                      />
                                    ) : (
                                      row.unit_price ?? ""
                                    )}
                                  </td>
                                  <td>
                                    {canEditCatalogMapping ? (
                                      <input
                                        className="ai-inline-input"
                                        value={row.labor_rate_empty ?? row.labor_rate ?? ""}
                                        placeholder="직접 입력"
                                        onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { laborRateEmpty: event.target.value })}
                                      />
                                    ) : (
                                      row.labor_rate_empty ?? row.labor_rate ?? ""
                                    )}
                                  </td>
                                  <td>
                                    {canEditCatalogMapping ? (
                                      <input
                                        className="ai-inline-input"
                                        value={row.labor_rate_occupied ?? row.labor_rate ?? ""}
                                        placeholder="직접 입력"
                                        onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { laborRateOccupied: event.target.value })}
                                      />
                                    ) : row.labor_rate_occupied ?? row.labor_rate ?? ""}
                                  </td>
                                  <td>
                                    {canEditCatalogMapping ? (
                                      <input
                                        className="ai-inline-input"
                                        value={row.labor_count ?? ""}
                                        placeholder="직접 입력"
                                        onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { laborCount: event.target.value })}
                                      />
                                    ) : row.labor_count ?? ""}
                                  </td>
                                  <td>{row.original_amount ?? ""}</td>
                                  <td>{row.memo ?? ""}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="ai-empty-sheet">
                        <strong>{aiSetupMatchReviewMode === "review" ? "검토 필요 행이 없습니다." : "매칭 검토할 표준 미리보기 행이 없습니다."}</strong>
                        <p>{aiSetupMatchReviewMode === "review" ? "전체 항목이 필요하면 전체 항목 보기를 눌러 확인하세요." : "헤더 행과 열 매핑을 확인해주세요."}</p>
                      </div>
                    ))}

                    {aiSetupSplitValidationSummaries.length > 0 && (
                      <div className="ai-split-validation-panel">
                        <div className="ai-mapping-title compact">
                          <div>
                            <h4>묶음 공사 분해 검산</h4>
                            <p>{aiSetupSplitValidationSummaryText}</p>
                          </div>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setAiSetupSplitReviewOpen((open) => !open)}
                          >
                            {aiSetupSplitReviewOpen ? "묶음 분해 접기" : "묶음 분해 보기"}
                          </button>
                        </div>
                        {aiSetupSplitReviewOpen && (
                        <div className="ai-table-wrap compact">
                          <table className="ai-data-table ai-catalog-match-table">
                            <thead>
                              <tr>
                                <th>원본 행</th>
                                <th>원본 대분류</th>
                                <th>원본 항목명</th>
                                <th>분해 행</th>
                                <th>원본 묶음 총액</th>
                                <th>분해 행 입력 합계</th>
                                <th>차이</th>
                                <th>안내</th>
                              </tr>
                            </thead>
                            <tbody>
                              {aiSetupSplitValidationSummaries.map((summary) => (
                                <tr key={`split-validation-${summary.sourceRowNumber}`}>
                                  <td className="ai-column-code">{summary.sourceRowNumber}</td>
                                  <td>{summary.sourceCategory || "-"}</td>
                                  <td>{summary.sourceItemName || "-"}</td>
                                  <td>{summary.splitCount}개</td>
                                  <td>{formatAiImportMoney(summary.originalAmount)}</td>
                                  <td>{formatAiImportMoney(summary.inputTotal)}</td>
                                  <td>{summary.difference === null ? "-" : formatAiImportMoney(summary.difference)}</td>
                                  <td>원본 총액과 분해 행 입력 합계가 다르면 필요한 경우 단가/인건비를 직접 입력해주세요.</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        )}
                      </div>
                    )}

                    {aiSetupCatalogMatchRows.some((row) => row.rowType === "work_item" && (row.matchStatus === "new_candidate" || row.action === "new")) && (
                      <div className="ai-new-candidate-panel">
                        <h4>새 항목 후보</h4>
                        <div className="ai-new-candidate-list">
                          {aiSetupCatalogMatchRows
                            .filter((row) => row.rowType === "work_item" && (row.matchStatus === "new_candidate" || row.action === "new"))
                            .map((row) => (
                              <div key={`new-candidate-${row.sourceRowNumber}`}>
                                <span>원본 {row.sourceRowNumber}행</span>
                                <strong>{row.sourceCategory || "새 대분류"} / {row.sourceItemName || "새 세부항목"}</strong>
                                <p>
                                  단위 {row.unit || "-"} · 수량 {row.quantity || "-"} · 단가 {row.unit_price || "-"} · 인건비 {row.labor_rate || "-"} · 인원 {row.labor_count || "-"}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {aiSetupCatalogMatchRows.some((row) => ["cost_item", "margin_item", "tax_item"].includes(row.rowType)) && (
                      <div className="ai-new-candidate-panel">
                        <h4>비용/요약 후보</h4>
                        <div className="ai-table-wrap ai-catalog-match-wrap compact">
                          <table className="ai-data-table ai-catalog-match-table">
                            <thead>
                              <tr>
                                <th>원본 행</th>
                                <th>원본 대분류</th>
                                <th>원본 항목명</th>
                                <th>원본 금액</th>
                                <th>행 유형</th>
                                <th>처리 방식</th>
                              </tr>
                            </thead>
                            <tbody>
                              {aiSetupCatalogMatchRows
                                .filter((row) => ["cost_item", "margin_item", "tax_item"].includes(row.rowType))
                                .map((row) => (
                                  <tr key={`cost-row-${row.sourceRowNumber}`}>
                                    <td className="ai-column-code">{row.sourceRowNumber}</td>
                                    <td>{row.sourceCategory || "-"}</td>
                                    <td>{row.sourceItemName || "-"}</td>
                                    <td>{row.original_amount || "-"}</td>
                                    <td>{getAiRowTypeLabel(row.rowType)}</td>
                                    <td>{row.action}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {aiSetupCatalogMatchRows.some((row) => ["subtotal_row", "total_row"].includes(row.rowType)) && (
                      <div className="ai-new-candidate-panel">
                        <h4>검산/합계 행</h4>
                        <div className="ai-new-candidate-list">
                          {aiSetupCatalogMatchRows
                            .filter((row) => ["subtotal_row", "total_row"].includes(row.rowType))
                            .map((row) => (
                              <div key={`validation-row-${row.sourceRowNumber}`}>
                                <span>원본 {row.sourceRowNumber}행 · {getAiRowTypeLabel(row.rowType)}</span>
                                <strong>{row.sourceCategory || row.sourceItemName || "합계 행"} · {row.original_amount || "금액 없음"}</strong>
                                <p>현재 단계에서는 검산 후보로만 표시하며 FORMATE 계산값과 비교하지 않습니다.</p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {excelImportTarget === EXCEL_IMPORT_TARGETS.TEMPLATES && aiSetupMappingAnalysis.hasHeader && (
                  <section className="ai-apply-condition-panel">
                    <div className="ai-mapping-title">
                      <div>
                        <h3>공사 조건 선택</h3>
                        <p>수량/인원을 저장할 조건을 선택하세요.</p>
                      </div>
                    </div>
                    <div className="ai-condition-grid">
                      <label>
                        <span>평수</span>
                        <select
                          value={aiSetupApplyCondition.pyeong}
                          onChange={(event) => updateAiSetupApplyConditionPatch({ pyeong: event.target.value })}
                        >
                          <option value="">선택 안 함</option>
                          {PYEONG_OPTIONS.map((pyeong) => (
                            <option key={pyeong} value={String(pyeong)}>{pyeong}평</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>주택 유형</span>
                        <select
                          value={aiSetupApplyCondition.buildType}
                          onChange={(event) => {
                            const buildType = event.target.value;
                            updateAiSetupApplyConditionPatch({
                              buildType,
                              conditionVariant: buildType === "new" ? "확장형1" : buildType === "old" ? OLD_NO_EXTENSION_VARIANT : "",
                            }, ["buildType", "conditionVariant"]);
                          }}
                        >
                          <option value="">선택 안 함</option>
                          <option value="old">구형</option>
                          <option value="new">확장형</option>
                        </select>
                      </label>
                      <label>
                        <span>세부 유형</span>
                        <select
                          value={aiSetupApplyCondition.conditionVariant}
                          onChange={(event) => updateAiSetupApplyConditionPatch({ conditionVariant: event.target.value })}
                          disabled={!aiSetupApplyCondition.buildType}
                        >
                          <option value="">선택 안 함</option>
                          {(aiSetupApplyCondition.buildType === "new" ? EXTENDED_VARIANTS : [OLD_NO_EXTENSION_VARIANT, ...OLD_EXTENDED_VARIANTS]).map((variant) => (
                            <option key={variant} value={variant}>
                              {formatConditionVariantLabel(variant, conditionVariantLabelMap)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>거주 상태</span>
                        <select
                          value={aiSetupApplyCondition.occupancy}
                          onChange={(event) => updateAiSetupApplyConditionPatch({ occupancy: event.target.value })}
                        >
                          <option value="">선택 안 함</option>
                          <option value="empty">빈집</option>
                          <option value="occupied">살림집</option>
                        </select>
                      </label>
                    </div>
                  </section>
                )}

                {aiSetupMappingAnalysis.hasHeader && (
                  <section className="ai-apply-plan-panel">
                    <div className="ai-mapping-title">
                      <div>
                        <h3>FORMATE 반영 계획 미리보기</h3>
                        <p>저장 후보만 요약합니다.</p>
                      </div>
                    </div>

                    <div className="ai-compact-summary-bar">
                      {aiSetupApplyPlanSummaryItems.map(([label, count]) => (
                        <span key={label} className={label === "검토 필요" && count > 0 ? "needs-review" : ""}>
                          {label} <strong>{count}개</strong>
                        </span>
                      ))}
                    </div>

                    <div className="ai-compact-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setAiSetupApplyPlanOpen((open) => !open)}
                      >
                        {aiSetupApplyPlanOpen ? "반영 계획 접기" : "반영 계획 자세히 보기"}
                      </button>
                    </div>

                    {aiSetupApplyPlanOpen && (
                    <>
                    <div className="ai-plan-section">
                      <h4>기존 항목 업데이트 후보</h4>
                      {aiSetupImportApplyPlan.priceUpdates.length > 0 ? (
                        <div className="ai-table-wrap ai-catalog-match-wrap compact">
                          <table className="ai-data-table ai-catalog-match-table">
                            <thead>
                              <tr>
                                <th>원본 행</th>
                                <th>원본 대분류</th>
                                <th>원본 항목명</th>
                                <th>FORMATE 대분류</th>
                                <th>FORMATE 세부항목</th>
                                <th>현재 단가</th>
                                <th>엑셀 단가</th>
                                <th>현재 인건비(빈집/살림집)</th>
                                <th>Excel 인건비(빈집/살림집)</th>
                                <th>변경 여부</th>
                              </tr>
                            </thead>
                            <tbody>
                              {aiSetupImportApplyPlan.priceUpdates.map((row) => (
                                <tr key={`apply-price-${row.sourceRowNumber}`}>
                                  <td className="ai-column-code">{row.sourceRowNumber}</td>
                                  <td>{row.sourceCategory || "-"}</td>
                                  <td>{row.sourceItemName || "-"}</td>
                                  <td>{row.selectedCategoryName || "-"}</td>
                                  <td>{row.selectedSubitemName || "-"}</td>
                                  <td>{displayImportValue(row.currentUnitPrice)}</td>
                                  <td>{displayImportValue(row.excelUnitPrice)}</td>
                                  <td>{displayImportValue(row.currentLaborRateEmpty ?? row.currentLaborRate)} / {displayImportValue(row.currentLaborRateOccupied ?? row.currentLaborRate)}</td>
                                  <td>{displayImportValue(row.excelLaborRateEmpty ?? row.excelLaborRate)} / {displayImportValue(row.excelLaborRateOccupied ?? row.excelLaborRate)}</td>
                                  <td>
                                    {row.willChange ? (
                                      <select
                                        value={row.conflictDecision ?? "keep"}
                                        onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { conflictDecision: event.target.value })}
                                      >
                                        <option value="keep">기존 값 유지</option>
                                        <option value="excel">Excel 값으로 변경</option>
                                      </select>
                                    ) : <span className="ai-match-status matched">동일</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="ai-plan-empty">해당 없음</p>
                      )}
                    </div>

                    <div className="ai-plan-section">
                      <h4>새 항목 후보</h4>
                      {(aiSetupImportApplyPlan.newCategoryCandidates.length > 0 || aiSetupImportApplyPlan.newSubitemCandidates.length > 0) ? (
                        <div className="ai-plan-split">
                          <div className="ai-new-candidate-list">
                            {aiSetupImportApplyPlan.newCategoryCandidates.length > 0 ? (
                              aiSetupImportApplyPlan.newCategoryCandidates.map((row) => (
                                <div key={`apply-category-${normalizeCatalogMatchText(row.sourceCategory)}`}>
                                  <span>새 대분류 후보 · 원본 {row.sourceRows.join(", ")}행</span>
                                  <strong>{row.sourceCategory}</strong>
                                  <p>기존 대분류와 연결되지 않은 공사항목 행에서 나온 후보입니다.</p>
                                </div>
                              ))
                            ) : (
                              <div><span>새 대분류 후보</span><strong>해당 없음</strong></div>
                            )}
                          </div>
                          <div className="ai-table-wrap ai-catalog-match-wrap compact">
                            <table className="ai-data-table ai-catalog-match-table">
                              <thead>
                                <tr>
                                  <th>원본 행</th>
                                  <th>대분류</th>
                                  <th>새 세부항목명</th>
                                  <th>규격</th>
                                  <th>단위</th>
                                  <th>단가</th>
                                  <th>인건비</th>
                                  <th>수량</th>
                                  <th>인원</th>
                                </tr>
                              </thead>
                              <tbody>
                                {aiSetupImportApplyPlan.newSubitemCandidates.length > 0 ? (
                                  aiSetupImportApplyPlan.newSubitemCandidates.map((row) => (
                                    <tr key={`apply-subitem-${row.sourceRowNumber}`}>
                                      <td className="ai-column-code">{row.sourceRowNumber}</td>
                                      <td>{row.categoryName || "-"}</td>
                                      <td>{row.sourceItemName || "-"}</td>
                                      <td>{row.spec || "-"}</td>
                                      <td>{row.unit || "-"}</td>
                                      <td>{row.unitPrice || "-"}</td>
                                      <td>{row.laborRate || "-"}</td>
                                      <td>{row.quantity || "-"}</td>
                                      <td>{row.laborCount || "-"}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr><td colSpan="9">해당 없음</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <p className="ai-plan-empty">해당 없음</p>
                      )}
                    </div>

                    <div className="ai-plan-section">
                      <h4>템플릿 값 후보</h4>
                      <p className="ai-plan-context">
                        {aiSetupApplyConditionComplete
                          ? `선택 조건: ${aiSetupApplyConditionLabel}. 선택한 조건의 견적 템플릿 값으로 저장될 후보입니다. 아직 저장되지 않았습니다.`
                          : "조건을 선택하면 이 수량/인원 값이 어느 템플릿에 저장될지 확인할 수 있습니다."}
                      </p>
                      {aiSetupImportApplyPlan.templateValueCandidates.length > 0 ? (
                        <div className="ai-table-wrap ai-catalog-match-wrap compact">
                          <table className="ai-data-table ai-catalog-match-table">
                            <thead>
                              <tr>
                                <th>원본 행</th>
                                <th>대분류</th>
                                <th>세부항목</th>
                                <th>수량</th>
                                <th>인원</th>
                                <th>공사기간</th>
                                <th>단위</th>
                                <th>기존 값 처리</th>
                                <th>계획</th>
                              </tr>
                            </thead>
                            <tbody>
                              {aiSetupImportApplyPlan.templateValueCandidates.map((row) => (
                                <tr key={`apply-template-${row.sourceRowNumber}`}>
                                  <td className="ai-column-code">{row.sourceRowNumber}</td>
                                  <td>{row.categoryName || "-"}</td>
                                  <td>{row.subitemName || "-"}</td>
                                  <td>{row.quantity || "-"}</td>
                                  <td>{row.laborCount || "-"}</td>
                                  <td>{row.constructionDays || "-"}</td>
                                  <td>{row.unit || "-"}</td>
                                  <td>
                                    <select
                                      value={row.conflictDecision ?? "keep"}
                                      onChange={(event) => updateAiSetupRowOverride(row.sourceRowNumber, { templateConflictDecision: event.target.value })}
                                    >
                                      <option value="keep">기존 값이 있으면 유지</option>
                                      <option value="excel">Excel 값으로 변경</option>
                                    </select>
                                  </td>
                                  <td>조건 선택 후 견적 템플릿 값으로 저장할 후보</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="ai-plan-empty">해당 없음</p>
                      )}
                    </div>

                    <div className="ai-plan-section">
                      <h4>비용/세금 후보</h4>
                      {aiSetupImportApplyPlan.costCandidates.length > 0 ? (
                        <div className="ai-table-wrap ai-catalog-match-wrap compact">
                          <table className="ai-data-table ai-catalog-match-table">
                            <thead>
                              <tr>
                                <th>원본 행</th>
                                <th>원본 대분류</th>
                                <th>원본 항목명</th>
                                <th>원본 금액</th>
                                <th>행 유형</th>
                                <th>처리 방식</th>
                                <th>계획</th>
                              </tr>
                            </thead>
                            <tbody>
                              {aiSetupImportApplyPlan.costCandidates.map((row) => (
                                <tr key={`apply-cost-${row.sourceRowNumber}`}>
                                  <td className="ai-column-code">{row.sourceRowNumber}</td>
                                  <td>{row.sourceCategory || "-"}</td>
                                  <td>{row.sourceItemName || "-"}</td>
                                  <td>{row.originalAmount || "-"}</td>
                                  <td>{getAiRowTypeLabel(row.rowType)}</td>
                                  <td>{getAiActionLabel(row.action)}</td>
                                  <td>관리비/경비/세금/기타비용으로 처리할 후보</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="ai-plan-empty">해당 없음</p>
                      )}
                    </div>

                    <div className="ai-plan-section">
                      <h4>검산/합계 행</h4>
                      {aiSetupImportApplyPlan.validationRows.length > 0 ? (
                        <div className="ai-new-candidate-list">
                          {aiSetupImportApplyPlan.validationRows.map((row) => (
                            <div key={`apply-validation-${row.sourceRowNumber}`}>
                              <span>원본 {row.sourceRowNumber}행 · {getAiRowTypeLabel(row.rowType)}</span>
                              <strong>{row.sourceCategory || row.sourceItemName || "합계 행"} · {row.originalAmount || "금액 없음"}</strong>
                              <p>나중에 FORMATE 계산 결과와 원본 금액을 비교할 검산용 후보입니다.</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="ai-plan-empty">해당 없음</p>
                      )}
                    </div>

                    <div className="ai-plan-section">
                      <h4>검토 필요 행</h4>
                      {aiSetupImportApplyPlan.reviewRows.length > 0 ? (
                        <div className="ai-table-wrap ai-catalog-match-wrap compact">
                          <table className="ai-data-table ai-catalog-match-table">
                            <thead>
                              <tr>
                                <th>원본 행</th>
                                <th>원본 대분류</th>
                                <th>원본 항목명</th>
                                <th>부족한 정보</th>
                                <th>안내</th>
                              </tr>
                            </thead>
                            <tbody>
                              {aiSetupImportApplyPlan.reviewRows.map((row, index) => (
                                <tr key={`apply-review-${row.sourceRowNumber}-${index}`}>
                                  <td className="ai-column-code">{row.sourceRowNumber}</td>
                                  <td>{row.sourceCategory || "-"}</td>
                                  <td>{row.sourceItemName || "-"}</td>
                                  <td>{row.reasons.join(", ")}</td>
                                  <td>매칭 검토에서 행 유형, 처리 방식, 대분류 또는 세부항목을 확인하세요.</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="ai-plan-empty">해당 없음</p>
                      )}
                    </div>
                    </>
                    )}
                  </section>
                )}

                {aiSetupMappingAnalysis.hasHeader && (
                  <section className="ai-final-confirm-panel">
                    <div className="ai-mapping-title">
                      <div>
                        <h3>최종 반영 확인</h3>
                        <p>저장할 항목을 선택해 반영하세요.</p>
                      </div>
                      <div className="ai-mapping-stats">
                        <span>반영 준비 상태: {aiSetupApplyReadiness.label}</span>
                      </div>
                    </div>

                    {excelImportTarget === EXCEL_IMPORT_TARGETS.TEMPLATES && <div className="ai-selected-condition final">
                      <span>선택한 공사 조건</span>
                      <strong>{aiSetupApplyConditionLabel || "공사 조건이 선택되지 않았습니다."}</strong>
                      {!aiSetupApplyConditionComplete && (
                        <p>공사 조건이 선택되지 않아 템플릿 값은 저장할 수 없습니다.</p>
                      )}
                    </div>}

                    <div className="ai-save-safety-line">
                      <span>AI 추천은 자동 저장되지 않습니다.</span>
                      <span>누른 저장 버튼의 범위만 반영됩니다.</span>
                      <span>비용/세금/검산 행은 자동 저장하지 않습니다.</span>
                      <span>1식 공사는 원본 총액이 기본 계산 기준이며 분해 후보는 기본 제외됩니다.</span>
                    </div>

                    <button
                      type="button"
                      className="ai-inline-disclosure"
                      onClick={() => setAiSetupSaveGuideOpen((open) => !open)}
                      aria-expanded={aiSetupSaveGuideOpen}
                    >
                      {aiSetupSaveGuideOpen ? "저장 전 안내 접기" : "저장 전 안내 보기"}
                    </button>

                    {aiSetupSaveGuideOpen && (
                    <>
                    <div className="ai-confirm-warning-list">
                      {excelImportTarget === EXCEL_IMPORT_TARGETS.TEMPLATES && hasAiSetupAutoSelectedCondition && !aiSetupApplyConditionComplete && (
                        <p>평수는 자동 감지되었지만, 일부 조건이 선택되지 않았습니다. 템플릿 저장 전 나머지 조건을 확인해야 합니다.</p>
                      )}
                      {aiSetupImportApplyPlanSummary.reviewRows > 0 && (
                        <p>검토 필요 행이 남아 있습니다. 실제 반영 전 확인이 필요합니다.</p>
                      )}
                      {excelImportTarget === EXCEL_IMPORT_TARGETS.TEMPLATES && !aiSetupApplyConditionComplete && (
                        <p>공사 조건이 선택되지 않아 템플릿 값은 저장할 수 없습니다.</p>
                      )}
                      {aiSetupImportApplyPlanSummary.priceUpdates > 0 && (
                        <p>기존 단가표의 단가/인건비가 변경될 수 있습니다.</p>
                      )}
                      {(aiSetupImportApplyPlanSummary.newCategoryCandidates > 0 || aiSetupImportApplyPlanSummary.newSubitemCandidates > 0) && (
                        <p>새 항목으로 추가될 후보가 있습니다.</p>
                      )}
                      {aiSetupImportApplyPlanSummary.costCandidates > 0 && (
                        <p>비용/세금 후보는 단가표 항목과 별도로 처리해야 합니다.</p>
                      )}
                      {aiSetupImportApplyPlanSummary.validationRows > 0 && (
                        <p>검산/합계 행은 저장용이 아니라 금액 비교용입니다.</p>
                      )}
                      {aiSetupApplyReadiness.status === "empty" && (
                        <p>현재 검토 결과에는 실제 반영 후보가 없습니다.</p>
                      )}
                    </div>

                    <div className="ai-plan-notice">
                      현재 단계에서는 기존 항목 단가/인건비, 새 항목 후보, 선택 조건의 템플릿 수량/인원만 반영할 수 있습니다.
                      비용/세금 후보와 검산/합계 행은 저장하지 않습니다.
                      새 항목 후보가 있는 경우 먼저 단가표에 새 항목을 추가해야 해당 항목의 수량/인원을 템플릿에 저장할 수 있습니다.
                    </div>

                    <div className="ai-save-guide">
                      <strong>저장 전 확인</strong>
                      <p>AI 추천은 단가표나 템플릿에 자동 저장되지 않습니다. 저장 전 반영 계획을 확인해주세요.</p>
                      <ul>
                        <li>기존 항목 단가/인건비, 새 항목 추가, 템플릿 수량/인원 저장은 각각 별도로 실행됩니다.</li>
                        <li>비용/세금 후보와 검산/합계 행은 현재 자동 저장되지 않습니다.</li>
                      </ul>
                    </div>
                    </>
                    )}

                    {excelImportTarget === EXCEL_IMPORT_TARGETS.PRICES && <>
                    {renderAiSetupSaveResult({
                      result: aiSetupNewItemResult,
                      title: "새 항목 추가 완료",
                      successCount: aiSetupNewItemResult?.createdSubitemCount ?? 0,
                      successText: aiSetupNewItemResult
                        ? `${aiSetupNewItemResult.createdCategoryCount}개 대분류, ${aiSetupNewItemResult.createdSubitemCount}개 세부항목을 단가표에 추가했습니다.`
                        : "",
                      skippedText: "이미 있거나 연결되어 건너뜀",
                    })}
                    {aiSetupNewItemError && <div className="error-box">{aiSetupNewItemError}</div>}

                    <div className="ai-price-update-actions ai-new-item-actions">
                      <div>
                        <strong>새 항목 후보 단가표 추가</strong>
                        {aiSetupNewItemTargets.length === 0 && (
                          <p className="ai-plan-empty">추가할 새 항목 후보가 없습니다. 공사항목 행의 처리 방식을 새 항목으로 추가로 바꿔주세요.</p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={openAiSetupNewItemConfirm}
                        disabled={aiSetupNewItemSaving || aiSetupNewItemTargets.length === 0}
                      >
                        {aiSetupNewItemSaving ? "새 항목 저장 중..." : "선택한 새 항목 저장"}
                      </button>
                    </div>

                    {renderAiSetupSaveResult({
                      result: aiSetupPriceResult,
                      title: "기존 단가 업데이트 완료",
                      successCount: aiSetupPriceResult?.successCount ?? 0,
                      successText: aiSetupPriceResult ? `${aiSetupPriceResult.successCount}개 항목의 단가/인건비를 업데이트했습니다.` : "",
                      skippedText: "변경할 값이 없어 건너뜀",
                    })}
                    {aiSetupPriceError && <div className="error-box">{aiSetupPriceError}</div>}

                    <div className="ai-price-update-actions">
                      <div>
                        <strong>기존 항목 단가/인건비 반영</strong>
                        {aiSetupPriceUpdateTargets.length === 0 && (
                          <p className="ai-plan-empty">업데이트할 기존 항목 단가/인건비 후보가 없습니다.</p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={openAiSetupPriceConfirm}
                        disabled={aiSetupPriceSaving || aiSetupPriceUpdateTargets.length === 0}
                      >
                        {aiSetupPriceSaving ? "단가표 반영 중..." : "선택한 Excel 값 저장"}
                      </button>
                    </div>
                    </>}

                    {excelImportTarget === EXCEL_IMPORT_TARGETS.TEMPLATES && <>
                    {renderAiSetupSaveResult({
                      result: aiSetupTemplateResult,
                      title: "템플릿 저장 완료",
                      successCount: aiSetupTemplateResult?.successCount ?? 0,
                      successText: aiSetupTemplateResult
                        ? `${aiSetupTemplateResult.successCount}개 항목의 템플릿 수량/인원을 저장했습니다.${aiSetupTemplateResult.createdTemplate ? " 새 견적 템플릿도 만들었습니다." : ""}`
                        : "",
                      skippedText: "기존 항목 연결이 없어 건너뜀",
                    })}
                    {aiSetupTemplateError && <div className="error-box">{aiSetupTemplateError}</div>}

                    <div className="ai-price-update-actions ai-template-save-actions">
                      <div>
                        <strong>선택 조건 템플릿 수량/인원 저장</strong>
                        {!aiSetupApplyConditionComplete ? (
                          <p className="ai-plan-empty">공사 조건이 완성되지 않았습니다.</p>
                        ) : aiSetupTemplateValueTargets.length === 0 ? (
                          <p className="ai-plan-empty">저장할 템플릿 수량/인원 후보가 없습니다.</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={openAiSetupTemplateConfirm}
                        disabled={aiSetupTemplateSaving || !aiSetupApplyConditionComplete || aiSetupTemplateValueTargets.length === 0}
                      >
                        {aiSetupTemplateSaving ? "템플릿 저장 중..." : "선택 항목 저장"}
                      </button>
                    </div>
                    </>}
                  </section>
                )}

                <section className="ai-collapsible-section">
                  <button
                    type="button"
                    className="ai-collapsible-toggle"
                    onClick={() => setAiSetupRawOpen((open) => !open)}
                    aria-expanded={aiSetupRawOpen}
                  >
                    <span>{aiSetupRawOpen ? "원본 데이터 접기" : "원본 데이터 보기"}</span>
                    <em>{selectedAiSetupSheet?.rowCount ?? 0}행 {selectedAiSetupSheet?.columnCount ?? 0}열</em>
                    <div>
                      {aiSetupRawBadges.map((badge) => (
                        <b key={badge}>{badge}</b>
                      ))}
                    </div>
                  </button>
                </section>

                {aiSetupRawOpen && (selectedAiSetupSheet && selectedAiSetupSheet.rowCount > 0 ? (
                  <section className="ai-raw-data-panel">
                    <div className="ai-mapping-title">
                      <div>
                        <h3>원본 시트 데이터</h3>
                        <p>업로드한 엑셀의 원본 행과 열입니다. 자동 인식 결과와 비교해서 확인하세요.</p>
                      </div>
                    </div>
                    <div className="ai-table-wrap">
                      <table className="ai-data-table">
                        <thead>
                          <tr>
                            <th className="row-number-cell">행</th>
                            {Array.from({ length: selectedAiSetupSheet.columnCount }, (_, index) => (
                              <th key={index}>{getExcelColumnLabel(index)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {aiSetupPreviewRows.map((row, rowIndex) => (
                            <tr key={`${selectedAiSetupSheet.name}-${rowIndex}`}>
                              <td className="row-number-cell">{rowIndex + 1}</td>
                              {Array.from({ length: selectedAiSetupSheet.columnCount }, (_, columnIndex) => (
                                <td key={columnIndex}>{row[columnIndex] ?? ""}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : (
                  <div className="ai-empty-sheet">
                    <strong>선택한 시트에 표시할 행이 없습니다.</strong>
                    <p>다른 시트를 선택하거나 원본 엑셀 파일의 내용을 확인해주세요.</p>
                  </div>
                ))}

                {aiSetupRawOpen && (selectedAiSetupSheet?.rowCount ?? 0) > 100 && (
                  <p className="caption ai-row-limit-note">화면 속도를 위해 첫 100행만 표시합니다. 원본 파일은 저장하지 않습니다.</p>
                )}
              </section>
            )}
          </section>
          </main>
          </section>
        </div>
      )}

      {page === "admin-condition-labels" && adminVerified && renderAppShell(
        <main className="panel-page admin-page">
          <div className="editor-header">
            <div>
              <Button variant="tertiary" leftIcon={<ArrowLeft />} onClick={() => setPage("admin-items")}>
                견적 템플릿 만들기
              </Button>
              <h2>확장형/구형 설명 관리</h2>
              <p className="muted caption">
                조건 key는 확장형1, 구형2처럼 유지하고, 업체 내부에서 이해하기 쉬운 설명만 표시용으로 저장합니다.
              </p>
            </div>
            <div className="admin-actions">
              <Button
                type="button"
                variant="secondary"
                leftIcon={<RefreshCcw />}
                disabled={conditionLabelsStatus === "loading" || adminSaving}
                onClick={() => fetchConditionVariantLabels()}
              >
                되돌리기
              </Button>
              <Button
                type="button"
                variant="primary"
                leftIcon={<Save />}
                disabled={conditionLabelsStatus === "loading" || adminSaving}
                onClick={saveConditionVariantLabels}
              >
                저장
              </Button>
            </div>
          </div>

          {conditionLabelsStatus === "loading" && <div className="status-box">불러오는 중...</div>}
          {adminSaving && <div className="status-box">저장 중...</div>}
          {adminNotice && <div className="status-box">{adminNotice}</div>}
          {adminError && <div className="error-box">{adminError}</div>}

          <section className="panel condition-label-panel">
            <div className="condition-label-guide">
              <strong>표시 설명</strong>
              <span>예: 확장형1 = 드레스룸 1개, 구형2 = 거실 + 주방 확장. 비워두면 기존 코드만 표시됩니다.</span>
            </div>
            <div className="condition-label-list">
              {conditionVariantLabels.map((row) => (
                <div className="condition-label-row" key={row.variant_key}>
                  <strong>{row.variant_key}</strong>
                  <Input
                    label="표시 이름"
                    value={row.label}
                    onChange={(event) => updateConditionVariantLabel(row.variant_key, { label: event.target.value })}
                    placeholder={row.variant_key === OLD_NO_EXTENSION_VARIANT ? "예: 확장 없음" : "예: 거실 + 주방 확장"}
                  />
                  <Input
                    label="상세 설명"
                    value={row.description}
                    onChange={(event) => updateConditionVariantLabel(row.variant_key, { description: event.target.value })}
                    placeholder="선택 기준이나 내부 메모"
                  />
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {page === "photo-management" && renderAppShell(
        <PhotoManagementPage controller={photoManagement} />,
        { className: "formate-app-shell--photo-management" }
      )}

      {page === "ready" && renderAppShell(
        <main className="simple-page">
          <EmptyState
            icon={<Building2 size={24} strokeWidth={1.5} />}
            title="준비 중입니다"
            description="현재 프로토타입에서는 신규 견적서 입력 흐름만 확인할 수 있습니다."
            action={
              <Button variant="secondary" leftIcon={<ArrowLeft />} onClick={() => setPage("landing")}>
                홈으로 돌아가기
              </Button>
            }
          />
        </main>
      )}

      {page === "condition" && !USE_ITEMS_SCREEN_V2 && renderAppShell(
        <main className="panel-page condition-page">
          <section className="panel condition-builder-panel">
            <div className="editor-header condition-builder-header">
              <div>
                <h2>시작할 템플릿을 선택하세요</h2>
                <p className="muted caption">
                  저장된 템플릿에서 빠르게 시작하거나, 템플릿이 없는 조건은 빈 견적서로 직접 작성할 수 있습니다.
                  템플릿으로 불러온 항목과 수량은 작성 중 현장에 맞게 수정할 수 있습니다.
                </p>
              </div>
              <Button variant="tertiary" leftIcon={<ArrowLeft />} onClick={resetFlow}>
                이전
              </Button>
            </div>

            <div className={`estimate-current-condition ${conditionChips.length > 0 ? "has-value" : ""} ${canGoNext() ? "active" : ""}`.trim()}>
              <span>선택한 템플릿</span>
              <strong>
                {conditionChips.length > 0 ? conditionChips.join(" · ") : "시작할 템플릿을 선택하세요."}
              </strong>
              <p>
                빈집/살림집은 견적서 정보에만 남고, 템플릿 조회에는 포함하지 않습니다.
              </p>
            </div>

            <div className="condition-static-grid">
              <div className="condition-static-field">
                <p className="field-label">평수 선택</p>
                <PyeongSelector
                  value={condition.size}
                  open={pyeongDropdownOpen}
                  onOpenChange={setPyeongDropdownOpen}
                  onChange={(value) => updateCondition({ size: value })}
                />
              </div>

              <div className="condition-static-field">
                <p className="field-label">주택 유형</p>
                <div className="segmented flush">
                  <button
                    className={condition.buildType === "new" ? "selected" : ""}
                    onClick={() =>
                      updateCondition({
                        buildType: "new",
                        powderRoom: false,
                        dressRoom: false,
                        expanded: false,
                        conditionVariant: "확장형1",
                        expansionSpaces: [],
                      })
                    }
                  >
                    확장형
                  </button>
                  <button
                    className={condition.buildType === "old" ? "selected" : ""}
                    onClick={() =>
                      updateCondition({
                        buildType: "old",
                        powderRoom: false,
                        dressRoom: false,
                        expanded: false,
                        conditionVariant: OLD_NO_EXTENSION_VARIANT,
                        expansionSpaces: [],
                      })
                    }
                  >
                    구형
                  </button>
                </div>
              </div>

              {condition.buildType === "new" && (
                <div className="condition-static-field condition-static-wide">
                  <div className="condition-variant-card-head">
                    <p className="field-label">확장형 세부 유형</p>
                    <button
                      type="button"
                      className="ghost condition-label-link"
                      onClick={() => openEstimateConditionLabelEditor(EXTENDED_VARIANTS)}
                    >
                      이름 변경
                    </button>
                  </div>
                  <div className="chips">
                    {EXTENDED_VARIANTS.map((variant) => (
                      <button
                        key={variant}
                        type="button"
                        className={`condition-variant-option ${getConditionVariant(condition) === variant ? "selected" : ""}`.trim()}
                        onClick={() => updateCondition({ conditionVariant: variant })}
                      >
                        <span>{getConditionVariantLabel(variant, estimateConditionVariantLabelMap) || variant}</span>
                        {getConditionVariantLabel(variant, estimateConditionVariantLabelMap) && (
                          <small>{variant}</small>
                        )}
                      </button>
                    ))}
                  </div>
                  {renderEstimateConditionLabelEditor(EXTENDED_VARIANTS)}
                </div>
              )}

              {condition.buildType === "old" && (
                <>
                  <div className="condition-static-field">
                    <p className="field-label">확장 여부</p>
                    <div className="segmented flush">
                      <button
                        className={!condition.expanded ? "selected" : ""}
                        onClick={() =>
                          updateCondition({
                            expanded: false,
                            conditionVariant: OLD_NO_EXTENSION_VARIANT,
                            expansionSpaces: [],
                          })
                        }
                      >
                        확장 없음
                      </button>
                      <button
                        className={condition.expanded ? "selected" : ""}
                        onClick={() =>
                          updateCondition({
                            expanded: true,
                            conditionVariant: OLD_EXTENDED_VARIANTS.includes(condition.conditionVariant)
                              ? condition.conditionVariant
                              : "구형1",
                          })
                        }
                      >
                        확장 있음
                      </button>
                    </div>
                  </div>

                  <div className="condition-static-field condition-static-wide">
                    <div className="condition-variant-card-head">
                      <p className="field-label">구형 세부 유형</p>
                      <button
                        type="button"
                        className="ghost condition-label-link"
                        onClick={() =>
                          openEstimateConditionLabelEditor(
                            condition.expanded ? OLD_EXTENDED_VARIANTS : [OLD_NO_EXTENSION_VARIANT]
                          )
                        }
                      >
                        이름 변경
                      </button>
                    </div>
                    {condition.expanded ? (
                      <div className="chips">
                        {OLD_EXTENDED_VARIANTS.map((variant) => (
                          <button
                            key={variant}
                            type="button"
                            className={`condition-variant-option ${getConditionVariant(condition) === variant ? "selected" : ""}`.trim()}
                            onClick={() => updateCondition({ conditionVariant: variant })}
                          >
                            <span>{getConditionVariantLabel(variant, estimateConditionVariantLabelMap) || variant}</span>
                            {getConditionVariantLabel(variant, estimateConditionVariantLabelMap) && (
                              <small>{variant}</small>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="condition-static-note">
                        확장 없음은 <strong>{formatConditionVariantLabel(OLD_NO_EXTENSION_VARIANT, estimateConditionVariantLabelMap)}</strong> 기준으로 불러옵니다.
                      </div>
                    )}
                    {renderEstimateConditionLabelEditor(
                      condition.expanded ? OLD_EXTENDED_VARIANTS : [OLD_NO_EXTENSION_VARIANT]
                    )}
                  </div>
                </>
              )}

              <div className="condition-static-field">
                <p className="field-label">거주 상태</p>
                <div className="segmented flush">
                  <button
                    className={condition.occupancy === "empty" ? "selected" : ""}
                    onClick={() => updateCondition({ occupancy: "empty" })}
                  >
                    빈집
                  </button>
                  <button
                    className={condition.occupancy === "occupied" ? "selected" : ""}
                    onClick={() => updateCondition({ occupancy: "occupied" })}
                  >
                    살림집
                  </button>
                </div>
              </div>
            </div>

            {estimateNotice && <div className="status-box">{estimateNotice}</div>}
            {estimateError && <div className="error-box">{estimateError}</div>}

            <div className="condition-start-row">
              <Button variant="primary" disabled={!canGoNext() || estimateLoading} onClick={() => loadEstimateFromCondition()}>
                {estimateLoading
                  ? "템플릿 불러오는 중..."
                  : estimateConditionEditMode
                    ? "수정한 조건으로 돌아가기"
                    : "견적서 작성 시작"}
              </Button>
            </div>
          </section>
        </main>
      )}

      {(page === "items" || page === "condition") && USE_ITEMS_SCREEN_V2 && (
        <EstimateEditorPage>{renderItemsScreenV2()}</EstimateEditorPage>
      )}

      {page === "items" && !USE_ITEMS_SCREEN_V2 && (
        <main className="workspace estimate-workspace">
          <section className="category-column">
            <div className="category-title-row">
              <div>
                <h2>공사 항목</h2>
                <p className="muted caption">
                  이번 견적에 넣을 항목을 고르고 수량을 확인하세요.
                </p>
                <p className="estimate-start-guide">
                  {estimateDraftSource === "blank"
                    ? "빈 견적서로 시작했습니다. 입력한 수량과 인원은 이 조건의 템플릿으로 저장됩니다."
                    : "템플릿에서 불러온 기본값입니다. 이번 견적에 넣을 항목만 체크하고, 현장에 맞게 수정하세요."}
                </p>
              </div>
              <div className="estimate-header-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setEstimateConditionEditMode(true);
                    setPage("condition");
                    setStep(1);
                  }}
                >
                  조건 다시 선택
                </button>
                <button
                  className="primary-button"
                  onClick={() => {
                    setPreviewBackPage("items");
                    setEstimatePreviewType("general");
                    setPage("preview");
                  }}
                >
                  일반 견적서 확인
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setPreviewBackPage("items");
                    setEstimatePreviewType("detail");
                    setPage("preview");
                  }}
                >
                  세부 견적서 확인
                </button>
              </div>
            </div>
            <div className="estimate-pyeong-panel">
              <div>
                <label htmlFor="estimate-pyeong-input">견적 기준 평수</label>
                <p>확장이나 현장 상황에 따라 실제 시공 평수가 다르면 수정하세요.</p>
              </div>
              <div className="estimate-pyeong-controls">
                <label className="estimate-pyeong-input">
                  <input
                    id="estimate-pyeong-input"
                    type="number"
                    min="1"
                    max="90"
                    value={estimatePyeong}
                    onChange={handleEstimatePyeongInputChange}
                    onBlur={handleEstimatePyeongInputBlur}
                    onKeyDown={handleEstimatePyeongInputKeyDown}
                  />
                  <span>평</span>
                </label>
              </div>
            </div>
            {estimateLoading && <div className="status-box">시공 항목을 불러오는 중...</div>}
            {estimateNotice && <div className="status-box">{estimateNotice}</div>}
            {estimateError && <div className="error-box">{estimateError}</div>}
            <div className="category-grid">
              {estimateCatalog.map((category) => {
                const selected = openCategory === category.id;
                return (
                  <button
                    key={category.id}
                    className={`category-card ${selected ? "selected" : ""}`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <span>{category.name}</span>
                    {selected && <Check size={18} />}
                  </button>
                );
              })}
              {!estimateLoading && !estimateCatalog.length && (
                <p className="muted">등록된 시공 항목이 없습니다. 관리자 페이지에서 항목과 소재를 먼저 추가하세요.</p>
              )}
            </div>
            <div className="total-box">
              <span>최종 견적 금액</span>
              <PriceText value={total} size="lg" />
            </div>
            <button
              className="secondary-button category-back-button"
              onClick={() => {
                setEstimateConditionEditMode(true);
                setPage("condition");
                setStep(3);
              }}
            >
              <ArrowLeft size={18} /> 이전
            </button>
          </section>

          <section className="editor">
            <div className="editor-header">
              <div>
                <h2>{currentCategory?.name} 견적 내역</h2>
                <p className="muted caption">
                  {condition.size ? `${condition.size}평 템플릿` : "견적 템플릿"}
                </p>
              </div>
            </div>
            <div className="material-list">
              <div className="estimate-row-header" aria-hidden="true">
                <span>체크</span>
                <span>소재명</span>
                <span>규격</span>
                <span>수량</span>
                <span>단위</span>
                <span>합계</span>
                <span>사진보기</span>
                <span>펼치기</span>
              </div>
              {(items[openCategory] ?? []).map((row, index) => (
                <div
                  className={`estimate-template-row ${!row.hasTemplateValue ? "missing-template" : ""} ${row.expanded ? "expanded" : ""} ${row.selected ? "selected" : ""}`.trim()}
                  key={`${row.subitemId ?? row.material}-${index}`}
                >
                  <div className="estimate-template-main">
                    <label className="estimate-row-cell estimate-row-check-cell" aria-label={`${row.itemType === "flat" ? row.itemName : row.material} 견적 포함`}>
                      <input
                        type="checkbox"
                        checked={Boolean(row.selected)}
                        onChange={(event) => updateItem(openCategory, index, { selected: event.target.checked })}
                      />
                    </label>
                    <div className="estimate-row-cell estimate-row-name-cell">
                      <strong>{row.itemType === "flat" ? row.itemName : row.material}</strong>
                      <span className="estimate-row-badges">
                        {isEstimateRowModified(row) && <span className="modified-badge">수정됨</span>}
                        {row.selected && <span className="selected-badge">포함</span>}
                      </span>
                    </div>
                    <div className={`estimate-row-cell estimate-row-spec-cell ${getEstimateRowSpecLabel(row) ? "" : "empty"}`.trim()}>
                      {getEstimateRowSpecChoices(row).length ? (
                        <select
                          value={getEstimateRowSpecChoiceValue(row)}
                          onChange={(event) => updateItem(openCategory, index, getEstimateRowSpecPatchFromChoice(event.target.value))}
                        >
                          {getEstimateRowSpecChoices(row).map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        getEstimateRowSpecLabel(row) || "규격 없음"
                      )}
                    </div>
                    <label className="estimate-row-cell estimate-row-quantity-cell">
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={`${row.itemType === "flat" ? row.itemName : row.material} 수량`}
                        value={row.quantity ?? ""}
                        onChange={(event) => updateItem(openCategory, index, { quantity: event.target.value })}
                      />
                    </label>
                    <div className="estimate-row-cell estimate-row-unit-cell">{row.unit || ""}</div>
                    <div className="estimate-row-cell estimate-row-total-cell">
                      <PriceText value={row.totalAmount} size="sm" />
                    </div>
                    <button
                      type="button"
                      className={`estimate-row-cell estimate-photo-button ${selectedPhotoSubitemId === row.subitemId ? "active" : ""}`.trim()}
                      onClick={() => handleOpenItemPhotos(row)}
                    >
                      사진보기
                    </button>
                    <button
                      type="button"
                      className="estimate-row-cell estimate-expand-toggle"
                      aria-label={`${row.itemType === "flat" ? row.itemName : row.material} 세부 수정 ${row.expanded ? "닫기" : "열기"}`}
                      onClick={() => updateItem(openCategory, index, { expanded: !row.expanded })}
                    >
                      {row.expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                  </div>

                  {renderEstimateItemPhotoPanel(row)}

                  <div className="estimate-template-expand">
                    <div className="estimate-template-expanded-content">
                      {!row.hasTemplateValue && (
                        <p className="muted template-missing">
                          아직 이 조건의 수량/인원 기준이 없습니다. 이번 견적에서 직접 입력해 사용할 수 있습니다.
                        </p>
                      )}
                        <div className="estimate-template-detail">
                          <div>
                            <span>가격</span>
                            <label className="estimate-draft-field">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatMoneyInputValue(row.unitPrice)}
                                onChange={(event) =>
                                  updateItem(openCategory, index, { unitPrice: stripNumberInputFormatting(event.target.value) })
                                }
                              />
                              <em>원</em>
                            </label>
                          </div>
                          <div>
                            <span>인원</span>
                            <label className="estimate-draft-field">
                              <input
                                type="number"
                                min="0"
                                value={row.laborCount ?? ""}
                                onChange={(event) =>
                                  updateItem(openCategory, index, { laborCount: event.target.value })
                                }
                              />
                              <em>명</em>
                            </label>
                          </div>
                          <div>
                            <span>인건비</span>
                            <label className="estimate-draft-field">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatMoneyInputValue(row.laborRate)}
                                onChange={(event) =>
                                  updateItem(openCategory, index, { laborRate: stripNumberInputFormatting(event.target.value) })
                                }
                              />
                              <em>원</em>
                            </label>
                          </div>
                          <div>
                            <span>업체/브랜드</span>
                            <label className="estimate-draft-field estimate-contractor-field">
                              <input
                                type="text"
                                value={row.contractor ?? ""}
                                placeholder="업체명 또는 브랜드"
                                onChange={(event) =>
                                  updateItem(openCategory, index, { contractor: event.target.value })
                                }
                              />
                            </label>
                          </div>
                        </div>

                      </div>
                  </div>
                </div>
              ))}
              {!estimateLoading && openCategory && !(items[openCategory] ?? []).length && (
                <p className="muted">이 항목에 등록된 소재가 없습니다.</p>
              )}
            </div>

            <div className="estimate-side-stack">
            <div className="selected-item-summary">
              <div className="selected-summary-header">
                <h3>선택한 항목</h3>
                <PriceText value={selectedItemsTotal} size="md" />
              </div>
              {selectedRows.length ? (
                <div className="selected-summary-groups">
                  {Object.entries(selectedRowsByCategory).map(([categoryName, rows]) => (
                    <div className="selected-summary-group" key={categoryName}>
                      <strong>{categoryName}</strong>
                      <div>
                        {rows.map((row) => (
                          <div className="selected-summary-row" key={`${row.categoryId}-${row.subitemId ?? row.material}`}>
                            <span>
                              {row.material}
                              {row.modified && <em className="modified-inline-badge">수정됨</em>}
                            </span>
                            <PriceText value={row.totalAmount} size="sm" />
                            <button
                              type="button"
                              className="selected-summary-remove"
                              aria-label={`${row.material} 선택 해제`}
                              onClick={() => unselectEstimateRow(row)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted selected-summary-empty">
                  아직 선택한 항목이 없습니다. 필요한 시공 항목을 체크하면 여기에 정리됩니다.
                </p>
              )}
            </div>

            <div className="site-memo-panel">
              <label>
                현장 메모
                <textarea
                  className="ui-input ui-input--textarea"
                  value={siteMemo}
                  onChange={(event) => setSiteMemo(event.target.value)}
                  placeholder="고객에게 보여주지 않을 내부 메모를 적어두세요."
                />
              </label>
            </div>

            <div className="estimate-editor-total">
              <div>
                <span>선택 항목 합계</span>
                <PriceText value={selectedItemsTotal} size="md" />
              </div>
              <div>
                <span>추가금/할인</span>
                <span className={`signed-total ${adjustmentTotal < 0 ? "negative" : ""}`}>
                  {adjustmentTotal >= 0 ? "+" : "-"}
                  <PriceText value={Math.abs(adjustmentTotal)} size="md" />
                </span>
              </div>
              <div className="final-total">
                <span>최종 견적 금액</span>
                <PriceText value={total} size="lg" />
              </div>
            </div>
            </div>
          </section>
        </main>
      )}

      {isCommonPriceAdminPage && adminVerified && renderAdminPricesWorkbench()}

      {isConditionQuantityAdminPage && adminVerified && renderAdminItemsWorkbench()}

      {page === "admin-detail-costs" && adminVerified && renderAppShell(
        <DetailCostsPage controller={detailCostsController} onBack={() => setPage("admin")} />
      )}

      {page === "admin-estimates" && renderAppShell(
        <SavedEstimatesPage>
          <main className="panel-page admin-page saved-estimates-page">
          <div className="editor-header">
            <div>
              <Button variant="tertiary" leftIcon={<ArrowLeft />} onClick={() => setPage("landing")}>
                홈으로
              </Button>
              <h2>{estimateListView === "trash" ? "견적 휴지통" : "저장한 견적"}</h2>
              <p className="muted caption">
                {estimateListView === "trash"
                  ? "삭제한 견적을 확인하고 저장 견적 목록으로 복원할 수 있습니다."
                  : "고객명이나 주소로 찾고 다시 열 수 있습니다."}
              </p>
            </div>
            <div className="admin-actions">
              <Button
                variant="secondary"
                leftIcon={<RefreshCcw />}
                disabled={estimateListStatus === "loading"}
                onClick={() => fetchEstimates()}
              >
                새로고침
              </Button>
            </div>
          </div>

          <nav className="saved-estimate-view-tabs" aria-label="저장 견적 분류">
            <button
              type="button"
              className={estimateListView === "active" ? "is-active" : ""}
              aria-current={estimateListView === "active" ? "page" : undefined}
              onClick={() => {
                setEstimateListView("active");
                setSelectedEstimate(null);
                setEstimateDeleteNotice("");
                setAdminError("");
              }}
            >
              <span>저장 견적</span>
              <span className="saved-estimate-tab-count">{estimateListCounts.active}</span>
            </button>
            <button
              type="button"
              className={estimateListView === "trash" ? "is-active" : ""}
              aria-current={estimateListView === "trash" ? "page" : undefined}
              onClick={() => {
                setEstimateListView("trash");
                setSelectedEstimate(null);
                setEstimateDeleteNotice("");
                setAdminError("");
              }}
            >
              <span>휴지통</span>
              <span className="saved-estimate-tab-count">{estimateListCounts.trash}</span>
            </button>
          </nav>

          <section className="estimate-search-panel">
            <label>
              <span>고객명 또는 주소 검색</span>
              {estimateListStatus === "loading" ? (
                <span className="saved-estimate-search-skeleton" aria-hidden="true" />
              ) : (
                <Input
                  value={estimateSearch}
                  onChange={(event) => setEstimateSearch(event.target.value)}
                  placeholder="예: 홍길동, 아파트, 빌라, 101동"
                />
              )}
            </label>
            <span className="estimate-result-count">
              {estimateListStatus === "loading" ? "" : `${visibleEstimates.length}건`}
            </span>
          </section>

          {adminError && <div className="error-box">{adminError}</div>}
          {estimateDeleteNotice && (
            <div className="success-box saved-estimate-delete-notice" role="status">
              {estimateDeleteNotice}
            </div>
          )}

          <section className="estimate-list">
            {estimateListStatus === "loading" && (
              <Table
                className="saved-estimates-table saved-estimates-table--loading"
                columns={savedEstimateColumns}
                rows={Array.from({ length: 5 }, (_, index) => ({ id: `loading-${index}` }))}
                renderCell={() => <span className="saved-estimate-cell-skeleton" aria-hidden="true" />}
              />
            )}

            {estimateListStatus === "ready" && !visibleEstimates.length && (
              <div className="estimate-empty-state">
                <p className="muted">
                  {estimateListView === "trash"
                    ? "휴지통에 견적이 없습니다."
                    : "저장된 견적이 없습니다."}
                </p>
              </div>
            )}

            {estimateListStatus === "error" && (
              <div className="estimate-empty-state">
                <p className="muted">견적 목록을 불러오지 못했습니다. 새로고침으로 다시 시도하세요.</p>
              </div>
            )}

            {estimateListStatus === "ready" && !!visibleEstimates.length && (
              <Table
                className="saved-estimates-table"
                columns={savedEstimateColumns}
                rows={savedEstimateRows}
                renderCell={({ row, column, value }) => {
                  if (column.key === "customer") {
                    return <strong className="saved-estimate-customer">{value}</strong>;
                  }

                  if (column.key === "address") {
                    return <span className={row.estimate.address ? "saved-estimate-address" : "saved-estimate-muted"}>{value}</span>;
                  }

                  if (column.key === "amount") {
                    return <PriceText value={value} size="sm" />;
                  }

                  if (column.key === "status") {
                    return <StatusText status={operationStatusViews.estimate(value)} />;
                  }

                  if (column.key === "constructionDays") {
                    return value > 0
                      ? <PriceText value={value} unit="일" size="sm" />
                      : <span className="saved-estimate-muted">-</span>;
                  }

                  if (column.key === "actions") {
                    if (estimateListView === "trash") {
                      return (
                        <div className="saved-estimate-table-actions">
                          <button
                            type="button"
                            className="saved-estimate-row-action"
                            onClick={() => setSelectedEstimate(row.estimate)}
                          >
                            보기
                          </button>
                          <button
                            type="button"
                            className="saved-estimate-row-action"
                            disabled={estimateRestoreLoadingId === row.estimate.id}
                            onClick={() => restoreTrashedEstimate(row.estimate)}
                          >
                            {estimateRestoreLoadingId === row.estimate.id ? "복원 중..." : "복원"}
                          </button>
                        </div>
                      );
                    }

                    const shareAction = getEstimateShareAction(row.estimate);
                    return (
                      <div className="saved-estimate-table-actions">
                        <button
                          type="button"
                          className="saved-estimate-row-action"
                          onClick={() => setSelectedEstimate(row.estimate)}
                        >
                          보기
                        </button>
                        <button
                          type="button"
                          className="saved-estimate-row-action"
                          onClick={() => loadSavedEstimateDraft(row.estimate, { destination: "preview" })}
                        >
                          견적서 확인
                        </button>
                        {shareAction ? (
                          <button
                            type="button"
                            className="saved-estimate-row-action is-primary"
                            onClick={() => setShareEstimateTarget(row.estimate)}
                          >
                            {shareAction.label}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="saved-estimate-row-action"
                          onClick={() => loadSavedEstimateDraft(row.estimate, { copy: true, destination: "items" })}
                        >
                          복사
                        </button>
                        <button
                          type="button"
                          className="saved-estimate-row-action is-danger"
                          onClick={(event) => openEstimateDeleteDialog(event, row.estimate)}
                        >
                          삭제
                        </button>
                      </div>
                    );
                  }

                  return <span className={value === "-" ? "saved-estimate-muted" : ""}>{value}</span>;
                }}
              />
            )}
          </section>

          {selectedEstimate && (
            <div className="modal-backdrop" onClick={() => setSelectedEstimate(null)}>
              <section className="estimate-modal" onClick={(event) => event.stopPropagation()}>
                <div className="editor-header">
                  <div>
                    <p className="eyebrow dark">
                      {estimateListView === "trash" ? "휴지통 견적 상세" : "견적서 상세"}
                    </p>
                    <h3>{getSavedEstimateCustomerName(selectedEstimate) || selectedEstimate.address || "견적서"}</h3>
                    {estimateListView !== "trash" ? (
                      <StatusText status={operationStatusViews.estimate(selectedEstimate.status || "draft")} />
                    ) : null}
                    <p className="muted">
                      연락처 {getSavedEstimateCustomerPhone(selectedEstimate) || "-"} · 현장 주소 {selectedEstimate.address || "주소 미입력"}
                    </p>
                    <p className="muted">
                      시공 예정일 {selectedEstimate.construction_date || "-"} · 총액{" "}
                      <PriceText value={selectedEstimate.total_amount || 0} size="md" />
                    </p>
                    {selectedEstimate.condition_snapshot?.summary && (
                      <p className="muted caption">{selectedEstimate.condition_snapshot.summary}</p>
                    )}
                    {estimateListView === "trash" && selectedEstimate.deleted_at ? (
                      <p className="muted caption">
                        삭제일 {new Date(selectedEstimate.deleted_at).toLocaleDateString("ko-KR")} · 고객 요청과 활동 기록 유지
                      </p>
                    ) : null}
                  </div>
                  <Button variant="tertiary" onClick={() => setSelectedEstimate(null)}>
                    닫기
                  </Button>
                </div>

                <div className="estimate-card-actions modal-actions">
                  {estimateListView === "trash" ? (
                    <Button
                      variant="primary"
                      leftIcon={<RefreshCcw />}
                      disabled={estimateRestoreLoadingId === selectedEstimate.id}
                      onClick={() => restoreTrashedEstimate(selectedEstimate)}
                    >
                      {estimateRestoreLoadingId === selectedEstimate.id ? "복원 중..." : "복원"}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="tertiary"
                        leftIcon={<Trash2 />}
                        className="saved-estimate-delete-trigger"
                        onClick={(event) => openEstimateDeleteDialog(event, selectedEstimate)}
                      >
                        견적 삭제
                      </Button>
                      {selectedEstimateContractTarget ? (
                        <Button
                          variant="secondary"
                          onClick={() => handleOpenContract({
                            ...selectedEstimateContractTarget,
                            returnPage: "admin-estimates",
                          })}
                        >
                          계약서 작성
                        </Button>
                      ) : null}
                      {getEstimateShareAction(selectedEstimate) ? (
                        <Button
                          variant="primary"
                          onClick={() => setShareEstimateTarget(selectedEstimate)}
                        >
                          {getEstimateShareAction(selectedEstimate).label}
                        </Button>
                      ) : null}
                      <Button
                        variant="tertiary"
                        onClick={() => loadSavedEstimateDraft(selectedEstimate, { destination: "preview" })}
                      >
                        다시 열기
                      </Button>
                      <Button
                        variant="tertiary"
                        onClick={() => loadSavedEstimateDraft(selectedEstimate, { copy: true, destination: "items" })}
                      >
                        복사해서 견적서 작성
                      </Button>
                    </>
                  )}
                </div>

                {selectedEstimateItems.length ? (
                  <Table
                    className="saved-estimate-detail-table"
                    columns={[
                      { key: "category", label: "시공 항목", width: "18%" },
                      { key: "material", label: "소재/내용", width: "28%" },
                      { key: "quantity", label: "수량", align: "right", width: "10%" },
                      { key: "laborCount", label: "인원", align: "right", width: "8%" },
                      { key: "productAmount", label: "가격", align: "right", width: "12%" },
                      { key: "laborAmount", label: "인건비", align: "right", width: "12%" },
                      { key: "totalAmount", label: "합계", align: "right", width: "12%" },
                    ]}
                    rows={selectedEstimateItems.map((item, index) => ({
                      id: `${item.categoryName ?? item.category ?? "item"}-${index}`,
                      item,
                      category: item.categoryName ?? item.category ?? item.itemName ?? "-",
                      material: item.material ?? item.name ?? item.description ?? "-",
                      quantity: item.quantity ?? 0,
                      laborCount: item.laborCount ?? item.labor_count ?? 0,
                      productAmount: item.productAmount ?? item.price ?? item.amount ?? 0,
                      laborAmount: item.laborAmount ?? 0,
                      totalAmount: item.totalAmount ?? item.price ?? item.amount ?? 0,
                    }))}
                    emptyAsZeroMuted
                    renderCell={({ row, column, value }) => {
                      if (column.key === "quantity") {
                        return <PriceText value={value} unit={row.item.unit ?? ""} size="sm" />;
                      }

                      if (column.key === "laborCount") {
                        return <PriceText value={value} unit="명" size="sm" />;
                      }

                      if (column.align === "right") {
                        return <PriceText value={value} size="sm" />;
                      }

                      return <span className={value === "-" ? "saved-estimate-muted" : ""}>{value}</span>;
                    }}
                  />
                ) : (
                  <EmptyState
                    className="saved-estimate-modal-empty"
                    title="저장된 항목 데이터가 없습니다."
                    description="이 견적서에 저장된 시공 항목 정보를 찾지 못했습니다."
                  />
                )}

                {(selectedEstimateAdjustments.length > 0 || selectedEstimateSiteMemo) && (
                  <div className="saved-estimate-extra">
                    {selectedEstimateAdjustments.length > 0 && (
                      <div>
                        <h4>추가금/할인</h4>
                        {selectedEstimateAdjustments.map((adjustment) => (
                          <div className="saved-adjustment-row" key={adjustment.id}>
                            <span>{adjustment.label || (adjustment.type === "discount" ? "할인" : "추가 공사비")}</span>
                            <span>{adjustment.type === "discount" ? "할인" : "추가금"}</span>
                            <span className={`signed-total ${adjustment.type === "discount" ? "negative" : ""}`}>
                              {adjustment.type === "discount" ? "-" : "+"}
                              <PriceText value={getAdjustmentAmount(adjustment)} size="sm" />
                            </span>
                            {adjustment.memo && <em>{adjustment.memo}</em>}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedEstimateSiteMemo && (
                      <div>
                        <h4>현장 메모</h4>
                        <p>{selectedEstimateSiteMemo}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {estimateDeleteTarget && (
            <DeleteSavedEstimateDialog
              estimate={estimateDeleteTarget}
              title={
                getSavedEstimateCustomerName(estimateDeleteTarget)
                || estimateDeleteTarget.address
                || "고객/현장 미입력"
              }
              address={estimateDeleteTarget.address || ""}
              estimateNumber={
                `${getEstimateItemsDataMeta(estimateDeleteTarget.items_data).estimateNumber ?? ""}`.trim()
              }
              totalAmount={estimateDeleteTarget.total_amount || 0}
              deleting={estimateDeleteLoading}
              error={estimateDeleteError}
              onClose={closeEstimateDeleteDialog}
              onConfirm={confirmSavedEstimateRemoval}
            />
          )}

          </main>
        </SavedEstimatesPage>
      )}

      {page === "preview" && renderAppShell(
        <EstimatePreviewPage
          previewType={estimatePreviewType}
          onPreviewTypeChange={setEstimatePreviewType}
          backLabel={previewBackPage === "admin-estimates" ? "저장 견적 보기" : "견적 재생성"}
          onBack={() => moveAppHistory("back")}
          notice={estimateNotice}
          error={estimateError}
          saving={estimateSaving}
          onSave={saveEstimateToSupabase}
          onDownloadPdf={downloadEstimatePdf}
          onShare={previewEstimate && previewEstimateShareAction
            ? () => setShareEstimateTarget(previewEstimate)
            : undefined}
          shareLabel={previewEstimateShareAction?.label}
          onCreateContract={previewEstimateContractTarget
            ? () => handleOpenContract({
                ...previewEstimateContractTarget,
                returnPage: "preview",
              })
            : undefined}
          printableDocumentRef={printableEstimateDocumentRef}
          documentProps={{
            companyName: selectedCompanyName,
            total,
            createdDate: estimateCreatedDate,
            validUntil: estimateValidUntil,
            vatStatus: estimateVatStatus,
            customerName,
            customerPhone,
            address,
            workDate,
            onCustomerNameChange: (event) => setCustomerName(event.target.value),
            onCustomerPhoneChange: (event) => setCustomerPhone(event.target.value),
            onAddressChange: (event) => setAddress(event.target.value),
            onWorkDateChange: (event) => setWorkDate(event.target.value),
            onVatStatusChange: (event) => setEstimateVatStatus(event.target.value),
            conditionSummary,
            conditionPyeong: condition.size,
            estimatePyeong,
            constructionDaysTotal: selectedConstructionDaysTotal,
            constructionDayParts: selectedConstructionDayParts,
            renderGeneralTable: renderGeneralEstimateTable,
            renderDetailTable: renderDetailEstimateTable,
            renderAdjustmentEditor: renderEstimateAdjustmentEditor,
            renderAdjustmentSummary: renderEstimateAdjustmentSummary,
            siteMemo,
            onSiteMemoChange: (event) => setSiteMemo(event.target.value),
            estimateNumber,
          }}
        />,
        { className: "formate-app-shell--estimate-preview" }
      )}

      {shareEstimateTarget && (
        <ShareEstimateModal
          companyId={selectedCompanyId}
          estimate={shareEstimateTarget}
          onShared={handleEstimateShared}
          onClose={() => setShareEstimateTarget(null)}
        />
      )}
      {estimatePhotoViewerIndex !== null && estimateItemPhotos.length > 0 && (
        <PhotoViewer
          photos={estimateItemPhotos}
          initialIndex={estimatePhotoViewerIndex}
          onClose={() => setEstimatePhotoViewerIndex(null)}
          getPhotoUrl={getPhotoImageUrl}
          getPhotoAlt={(photo) => photo?.original_filename || `${selectedPhotoSubitemName || "세부항목"} 사진`}
        />
      )}
    </div>
  );
}

function Progress({ step }) {
  return (
    <div className="progress">
      {[1, 2, 3].map((entry) => (
        <div key={entry} className={entry <= step ? "active" : ""}>
          <span>{entry}</span>
          <p>{entry === 1 ? "평수" : entry === 2 ? "주택 조건" : "거주 상태"}</p>
        </div>
      ))}
    </div>
  );
}
