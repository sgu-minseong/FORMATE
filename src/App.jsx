import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  Image,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Settings,
  Star,
  Trash2,
  Wrench,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import PriceText from "./components/PriceText.jsx";
import logoUrl from "./assets/logo.svg";

const pageFromHash = () => {
  const page = window.location.hash.replace("#", "");
  return ["landing", "condition", "admin", "admin-prices", "admin-items", "admin-condition-labels"].includes(page) ? page : "landing";
};

const COMPANY_STORAGE_KEYS = {
  id: "formate.selectedCompanyId",
  name: "formate.selectedCompanyName",
  code: "formate.selectedCompanyCode",
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ADMIN_VERIFIED_STORAGE_KEY = "formate.adminVerifiedCompanyId";
const PROTECTED_ADMIN_PAGES = ["admin", "admin-prices", "admin-items", "admin-condition-labels", "admin-detail-costs"];
const spaces = ["거실", "주방", "작은방", "안방", "베란다", "현관", "다용도실"];
const UNIT_OPTIONS = ["평", "㎡", "미터", "개소", "식"];
const PYEONG_OPTIONS = Array.from({ length: 90 }, (_, index) => index + 1);
const FLOORING_THICKNESS_OPTIONS = Array.from({ length: 28 }, (_, index) => (1.8 + index / 10).toFixed(1));
const DEFAULT_FLOORING_SPEC = "기본";
const DEFAULT_FLOORING_AUTO_SPECS = ["1.8", "2.2", "2.7"];
const FLOORING_NAME_KEYWORDS = ["장판", "바닥", "바닥재"];
const FLOORING_MATERIAL_KEYWORDS = ["장판", "마루", "데코타일", "바닥"];
const EXTENDED_VARIANTS = ["확장형1", "확장형2", "확장형3", "확장형4", "확장형5"];
const OLD_EXTENDED_VARIANTS = ["구형1", "구형2", "구형3", "구형4", "구형5"];
const OLD_NO_EXTENSION_VARIANT = "구형0";
const CONDITION_VARIANT_KEYS = [...EXTENDED_VARIANTS, OLD_NO_EXTENSION_VARIANT, ...OLD_EXTENDED_VARIANTS];
const FAVORITE_PYEONG_STORAGE_KEY = "formate.favoritePyeong";
const CATEGORY_DISPLAY_TARGETS = {
  몰딩: "목공",
  페인트: "도장/페인트",
  도장: "도장/페인트",
};
const DEFAULT_CONSTRUCTION_CATALOG = [
  {
    name: "철거",
    subitems: [
      ["전체 철거", "식"], ["부분 철거", "식"], ["도배 철거", "평"], ["장판 철거", "평"],
      ["마루 철거", "평"], ["타일 철거", "평"], ["욕실 철거", "개소"], ["주방 철거", "식"],
      ["몰딩 철거", "m"], ["걸레받이 철거", "m"], ["싱크대 철거", "식"], ["붙박이장 철거", "식"],
      ["문/문틀 철거", "개"], ["조명 철거", "개"], ["폐기물 반출", "식"],
    ],
  },
  {
    name: "가설/보양",
    subitems: [
      ["바닥 보양", "평"], ["엘리베이터 보양", "식"], ["공용부 보양", "식"], ["현관 보양", "식"],
      ["가구 보양", "식"], ["먼지 차단 비닐", "식"], ["양중/운반", "식"], ["사다리차", "회"],
      ["현장 정리", "식"],
    ],
  },
  {
    name: "설비/수도",
    subitems: [
      ["수도 배관 이동", "개소"], ["배수 배관 이동", "개소"], ["세탁기 배관", "개소"],
      ["싱크대 급배수", "식"], ["욕실 급배수", "개소"], ["보일러 배관", "식"], ["난방 배관", "평"],
      ["분배기 교체", "개"], ["수전 설치", "개"], ["배수구 교체", "개"], ["방수 작업", "평"],
      ["미장 작업", "평"],
    ],
  },
  {
    name: "전기/조명",
    subitems: [
      ["전체 전기 배선", "식"], ["콘센트 추가", "개"], ["스위치 교체", "개"], ["분전함 교체", "식"],
      ["조명 배선", "개"], ["다운라이트 타공/설치", "개"], ["간접조명 배선", "m"], ["LED 등 설치", "개"],
      ["주방 조명", "개"], ["욕실 조명", "개"], ["인터넷/LAN 배선", "개소"], ["인터폰/도어락 배선", "개소"],
    ],
  },
  {
    name: "목공",
    subitems: [
      ["천장 목공", "평"], ["벽체 목공", "평"], ["가벽 시공", "m"], ["문틀 목공", "개"],
      ["몰딩 시공", "m"], ["걸레받이 시공", "m"], ["등박스", "식"], ["간접조명 박스", "m"],
      ["커튼박스", "m"], ["아트월 목공", "식"], ["수납장 목공", "식"], ["단차 보정", "식"],
    ],
  },
  {
    name: "창호/샷시",
    subitems: [
      ["거실 샷시", "개소"], ["안방 샷시", "개소"], ["작은방 샷시", "개소"], ["주방 창호", "개소"],
      ["발코니 창호", "개소"], ["터닝도어", "개"], ["방충망 교체", "개"], ["유리 교체", "장"],
      ["실리콘 마감", "m"], ["창호 철거", "개소"],
    ],
  },
  {
    name: "중문/도어",
    subitems: [
      ["3연동 중문", "개"], ["슬라이딩 중문", "개"], ["여닫이 중문", "개"], ["방문 교체", "개"],
      ["문틀 교체", "개"], ["문 손잡이 교체", "개"], ["도어락 설치", "개"], ["현관문 필름", "개"],
      ["문선 시공", "m"],
    ],
  },
  {
    name: "도배",
    subitems: [
      ["실크벽지", "평"], ["합지벽지", "평"], ["천장 도배", "평"], ["벽면 도배", "평"],
      ["부분 도배", "식"], ["초배지", "평"], ["퍼티/면처리", "평"], ["기존 벽지 제거", "평"],
    ],
  },
  {
    name: "바닥",
    subitems: [
      ["장판", "평"], ["KCC장판 1.8T", "평"], ["KCC장판 2.2T", "평"], ["KCC장판 2.7T", "평"],
      ["LG장판 1.8T", "평"], ["LG장판 2.2T", "평"], ["강마루", "평"], ["강화마루", "평"],
      ["원목마루", "평"], ["데코타일", "평"], ["포세린 바닥", "평"], ["바닥 평탄화", "평"],
      ["걸레받이", "m"], ["기존 바닥 철거", "평"],
    ],
  },
  {
    name: "필름",
    subitems: [
      ["현관문 필름", "개"], ["방문 필름", "개"], ["문틀 필름", "개"], ["샷시 필름", "개소"],
      ["주방 필름", "식"], ["붙박이장 필름", "식"], ["몰딩 필름", "m"], ["걸레받이 필름", "m"],
      ["아트월 필름", "식"],
    ],
  },
  {
    name: "도장/페인트",
    subitems: [
      ["벽면 도장", "평"], ["천장 도장", "평"], ["방문 도장", "개"], ["문틀 도장", "개"],
      ["베란다 탄성코트", "평"], ["발코니 페인트", "평"], ["방수 페인트", "평"], ["퍼티 작업", "평"],
      ["곰팡이 방지 도장", "평"],
    ],
  },
  {
    name: "타일",
    subitems: [
      ["주방 벽타일", "m"], ["욕실 벽타일", "평"], ["욕실 바닥타일", "평"], ["현관 바닥타일", "평"],
      ["발코니 타일", "평"], ["포세린 타일", "평"], ["타일 덧방", "평"], ["타일 철거", "평"],
      ["줄눈 시공", "m"], ["실리콘 마감", "m"],
    ],
  },
  {
    name: "욕실",
    subitems: [
      ["욕실 전체 공사", "개소"], ["욕조 철거", "개"], ["샤워부스 설치", "개"], ["양변기 설치", "개"],
      ["세면대 설치", "개"], ["욕실장 설치", "개"], ["거울 설치", "개"], ["수건장 설치", "개"],
      ["환풍기 설치", "개"], ["젠다이 시공", "m"], ["욕실 방수", "평"], ["욕실 돔천장", "개소"],
      ["욕실 악세서리", "식"], ["욕실 문 교체", "개"],
    ],
  },
  {
    name: "주방/가구",
    subitems: [
      ["싱크대", "m"], ["상부장", "m"], ["하부장", "m"], ["키큰장", "개"], ["아일랜드 식탁", "식"],
      ["주방 상판", "m"], ["주방 벽타일", "m"], ["후드 설치", "개"], ["쿡탑 설치", "개"],
      ["식기세척기 자리", "개소"], ["냉장고장", "개"], ["붙박이장", "m"], ["신발장", "m"],
      ["수납장", "식"],
    ],
  },
  {
    name: "현관",
    subitems: [
      ["현관 타일", "평"], ["신발장", "m"], ["현관 중문", "개"], ["현관 센서등", "개"],
      ["현관문 필름", "개"], ["도어락", "개"], ["현관 거울", "개"], ["현관 수납", "식"],
    ],
  },
  {
    name: "발코니/확장",
    subitems: [
      ["발코니 확장", "개소"], ["확장부 단열", "평"], ["확장부 난방 배관", "평"], ["발코니 타일", "평"],
      ["발코니 탄성코트", "평"], ["빨래건조대", "개"], ["배수 트랩", "개"], ["발코니 창호", "개소"],
      ["확장부 마감", "식"],
    ],
  },
  {
    name: "에어컨/환기",
    subitems: [
      ["시스템에어컨 배관", "개소"], ["에어컨 배관 매립", "개소"], ["에어컨 전용 콘센트", "개"],
      ["실외기 배관", "m"], ["환풍기 설치", "개"], ["주방 후드 배관", "식"], ["욕실 환기 배관", "식"],
    ],
  },
  {
    name: "청소/폐기물/마감",
    subitems: [
      ["입주 청소", "평"], ["준공 청소", "식"], ["폐기물 처리", "식"], ["폐기물 추가 반출", "회"],
      ["실리콘 마감", "m"], ["코킹", "m"], ["하자 보수", "식"], ["마감재 보수", "식"], ["현장 정리", "식"],
    ],
  },
];

function readStoredCompany() {
  if (typeof window === "undefined") return null;

  const id = window.localStorage.getItem(COMPANY_STORAGE_KEYS.id);
  const name = window.localStorage.getItem(COMPANY_STORAGE_KEYS.name);
  const code = window.localStorage.getItem(COMPANY_STORAGE_KEYS.code);
  const lookupCode = (!isValidUuid(id) && id) ? id : code;

  if (!id && !lookupCode) return null;
  return { id: id ?? "", name: name ?? "", code: lookupCode ?? "", company_code: lookupCode ?? "" };
}

function writeStoredCompany(company) {
  if (typeof window === "undefined") return;

  const normalizedCompany = normalizeCompanySession(company);
  window.localStorage.setItem(COMPANY_STORAGE_KEYS.id, normalizedCompany.id);
  window.localStorage.setItem(COMPANY_STORAGE_KEYS.name, normalizedCompany.name);
  window.localStorage.setItem(COMPANY_STORAGE_KEYS.code, normalizedCompany.company_code);
}

function clearStoredCompany() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(COMPANY_STORAGE_KEYS.id);
  window.localStorage.removeItem(COMPANY_STORAGE_KEYS.name);
  window.localStorage.removeItem(COMPANY_STORAGE_KEYS.code);
}

function isAdminVerifiedForCompany(companyId) {
  if (typeof window === "undefined" || !companyId) return false;
  return window.sessionStorage.getItem(ADMIN_VERIFIED_STORAGE_KEY) === companyId;
}

function writeAdminVerifiedCompany(companyId) {
  if (typeof window === "undefined" || !companyId) return;
  window.sessionStorage.setItem(ADMIN_VERIFIED_STORAGE_KEY, companyId);
}

function isValidUuid(value) {
  return UUID_PATTERN.test(`${value ?? ""}`.trim());
}

function normalizeCompanySession(company) {
  return {
    id: `${company?.id ?? ""}`.trim(),
    name: `${company?.name ?? ""}`.trim(),
    company_code: `${company?.company_code ?? company?.code ?? ""}`.trim(),
    code: `${company?.company_code ?? company?.code ?? ""}`.trim(),
  };
}

function getStoredCompanyLookupCode(company) {
  return `${(!isValidUuid(company?.id) && company?.id) ? company.id : company?.company_code ?? company?.code ?? ""}`.trim();
}

function clearAdminVerifiedCompany() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ADMIN_VERIFIED_STORAGE_KEY);
}

function readFavoritePyeongs() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(FAVORITE_PYEONG_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];

    return [...new Set(
      parsed
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= 90)
    )].sort((a, b) => a - b);
  } catch {
    return [];
  }
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

function sortAdminItems(rows) {
  return [...rows].sort((a, b) => {
    if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

function getCategoryDisplayName(name) {
  const trimmed = `${name ?? ""}`.trim();
  return CATEGORY_DISPLAY_TARGETS[trimmed] ?? trimmed;
}

function getDefaultCatalogItemAliases(name) {
  return name === "도장/페인트" ? ["도장/페인트", "도장"] : [name];
}

function findItemByDefaultCatalogName(itemRows, catalogName) {
  const aliases = getDefaultCatalogItemAliases(catalogName);
  return (itemRows ?? []).find((item) => aliases.includes(`${item.name ?? ""}`.trim()));
}

function getCategorySourceRank(sourceName, displayName) {
  const trimmed = `${sourceName ?? ""}`.trim();
  if (trimmed === displayName) return 0;
  if (displayName === "도장/페인트" && trimmed === "도장") return 1;
  return 2;
}

function mergeDisplayCategoryItems(items) {
  const mergedByName = new Map();

  sortAdminItems(items).forEach((item) => {
    const sourceName = `${item.name ?? ""}`.trim();
    const displayName = getCategoryDisplayName(sourceName);
    const normalizedItem = {
      ...item,
      name: displayName,
      item_type: sourceName === displayName ? item.item_type ?? "itemized" : "itemized",
      _sourceName: sourceName,
    };
    const existing = mergedByName.get(displayName);

    if (!existing) {
      mergedByName.set(displayName, normalizedItem);
      return;
    }

    const existingRank = getCategorySourceRank(existing._sourceName, displayName);
    const currentRank = getCategorySourceRank(sourceName, displayName);
    const useCurrentAsParent = currentRank < existingRank;
    const parent = useCurrentAsParent ? normalizedItem : existing;
    const other = useCurrentAsParent ? existing : normalizedItem;
    mergedByName.set(displayName, {
      ...parent,
      is_favorite: Boolean(parent.is_favorite || other.is_favorite),
      sort_order: Math.min(parent.sort_order ?? 0, other.sort_order ?? 0),
      subitems: [...(existing.subitems ?? []), ...(normalizedItem.subitems ?? [])]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      _sourceName: parent._sourceName,
    });
  });

  return sortAdminItems(
    [...mergedByName.values()].map(({ _sourceName, ...item }) => item)
  );
}

function normalizeAdminItems(itemsRows, subitemRows, templateValueRows = []) {
  const subitemsByItemId = subitemRows.reduce((acc, row) => {
    acc[row.item_id] = acc[row.item_id] ?? [];
    acc[row.item_id].push(row);
    return acc;
  }, {});
  const templateValueBySubitemId = Object.fromEntries(
    templateValueRows.map((row) => [row.subitem_id, row])
  );

  return mergeDisplayCategoryItems(
    itemsRows.map((item) => ({
      ...item,
      item_type: item.item_type ?? "itemized",
      subitems: [...(subitemsByItemId[item.id] ?? [])]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((subitem) => {
          const templateValue = templateValueBySubitemId[subitem.id];
          return {
            ...subitem,
            option_value: getTemplateOptionValue(subitem),
            unit_price: subitem.unit_price ?? "",
            labor_rate: subitem.labor_rate ?? "",
            quantity: templateValue?.quantity ?? "",
            labor_count: templateValue?.labor_count ?? "",
            template_value_id: templateValue?.id ?? null,
          };
        }),
    }))
  );
}

function toNumberOrZero(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toNullableNumber(value) {
  if (`${value ?? ""}`.trim() === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toNonNegativeNumberOrZero(value) {
  return Math.max(0, toNumberOrZero(value));
}

function hasNumericInput(value) {
  if (`${value ?? ""}`.trim() === "") return false;
  return Number.isFinite(Number(value));
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

function getTemplateOptionValue(subitem) {
  const thickness = parseFlooringThicknessName(subitem?.name)?.thickness;
  return thickness && thickness !== DEFAULT_FLOORING_SPEC ? thickness : "";
}

function isFlooringCategoryName(name) {
  const normalized = `${name ?? ""}`.trim();
  return FLOORING_NAME_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isFlooringMaterialName(name) {
  const normalized = `${name ?? ""}`.trim();
  return FLOORING_MATERIAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isWallpaperCategoryName(name) {
  return `${name ?? ""}`.trim().includes("도배");
}

function normalizeFlooringThickness(value) {
  const raw = `${value ?? ""}`.trim();
  if (!raw || raw === DEFAULT_FLOORING_SPEC) return DEFAULT_FLOORING_SPEC;
  const withoutSuffix = raw.replace(/t$/i, "");
  const numberValue = Number(withoutSuffix);
  if (!Number.isFinite(numberValue)) return DEFAULT_FLOORING_SPEC;
  const normalized = numberValue.toFixed(1);
  return FLOORING_THICKNESS_OPTIONS.includes(normalized) ? normalized : DEFAULT_FLOORING_SPEC;
}

function formatFlooringThickness(thickness) {
  const normalized = normalizeFlooringThickness(thickness);
  if (normalized === DEFAULT_FLOORING_SPEC) return DEFAULT_FLOORING_SPEC;
  const numberValue = Number(normalized);
  const displayValue = Number.isInteger(numberValue) ? String(numberValue) : normalized;
  return `${displayValue}T`;
}

function composeFlooringSubitemName(baseName, thickness) {
  const nextBaseName = `${baseName ?? ""}`.trim() || "장판";
  const normalizedThickness = normalizeFlooringThickness(thickness);
  if (normalizedThickness === DEFAULT_FLOORING_SPEC) return nextBaseName;
  return `${nextBaseName} ${formatFlooringThickness(normalizedThickness)}`;
}

function getFlooringThicknessSelectOptions(currentThickness) {
  return [
    ...new Set([
      DEFAULT_FLOORING_SPEC,
      ...DEFAULT_FLOORING_AUTO_SPECS,
      normalizeFlooringThickness(currentThickness),
      ...FLOORING_THICKNESS_OPTIONS,
    ]),
  ].filter(Boolean).sort(compareFlooringThickness);
}

function compareFlooringThickness(a, b) {
  if (a === b) return 0;
  if (a === DEFAULT_FLOORING_SPEC) return -1;
  if (b === DEFAULT_FLOORING_SPEC) return 1;
  return Number(a) - Number(b);
}

function parseFlooringThicknessName(name) {
  const normalized = `${name ?? ""}`.trim();
  const directThickness = normalized.match(/^([1-4](?:\.\d)?)T?$/i);
  if (directThickness) {
    return {
      baseName: "장판",
      thickness: normalizeFlooringThickness(directThickness[1]),
    };
  }

  const match = normalized.match(/^(.+?)\s+(기본|[1-4](?:\.\d)?T?)$/i);
  if (match) {
    const thickness = match[2] === DEFAULT_FLOORING_SPEC ? DEFAULT_FLOORING_SPEC : normalizeFlooringThickness(match[2]);
    if (thickness === DEFAULT_FLOORING_SPEC && match[2] !== DEFAULT_FLOORING_SPEC) return null;
    return {
      baseName: match[1].trim(),
      thickness,
    };
  }

  if (!isFlooringMaterialName(normalized)) return null;
  return {
    baseName: normalized,
    thickness: DEFAULT_FLOORING_SPEC,
  };
}

function getCanonicalFlooringSubitemName(name) {
  const parsed = parseFlooringThicknessName(name);
  if (!parsed) return `${name ?? ""}`.trim();
  return composeFlooringSubitemName(parsed.baseName, parsed.thickness);
}

function isLocalSubitemId(subitemId) {
  return `${subitemId ?? ""}`.startsWith("local-subitem-");
}

function isFlooringThicknessItem(item) {
  return isFlooringCategoryName(item?.name);
}

function getFlooringThicknessGroups(subitems = []) {
  const groupsByName = new Map();

  subitems.forEach((subitem) => {
    const parsed = parseFlooringThicknessName(subitem.name);
    const baseName = parsed?.baseName ?? subitem.name;
    const thickness = parsed?.thickness ?? DEFAULT_FLOORING_SPEC;

    if (!groupsByName.has(baseName)) {
      groupsByName.set(baseName, {
        baseName,
        sort_order: subitem.sort_order ?? 0,
        options: {},
      });
    }

    const group = groupsByName.get(baseName);
    group.sort_order = Math.min(group.sort_order, subitem.sort_order ?? group.sort_order);
    if (!group.options[thickness]) {
      group.options[thickness] = {
        ...subitem,
        baseName,
        thickness,
      };
    }
  });

  return [...groupsByName.values()].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
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
    code === "42P01" ||
    code === "PGRST204" ||
    raw.includes("relation") ||
    raw.includes("does not exist") ||
    raw.includes("could not find")
  ) {
    return "필요한 DB 테이블 또는 컬럼이 아직 없습니다. Supabase SQL Editor에서 supabase/schema.sql을 다시 실행해주세요.";
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

function toDbCondition(condition, companyId) {
  const isExtended = isExtendedHouseType(condition.buildType);
  const conditionVariant = getConditionVariant(condition);
  return {
    company_id: companyId,
    pyeong: toNumberOrZero(condition.size),
    build_type: isExtended ? "확장형" : "구형",
    condition_variant: conditionVariant,
    powder_room: null,
    dress_room: null,
    has_extension: isExtended ? false : conditionVariant !== OLD_NO_EXTENSION_VARIANT,
    extension_areas: null,
    occupancy_type: condition.occupancy === "empty" ? "빈집" : "살림집",
  };
}

function hasTemplateValue(row) {
  return hasNumericInput(row?.quantity) || hasNumericInput(row?.labor_count ?? row?.laborCount);
}

function createEstimateRowFromSubitem(item, subitem, pyeong, patch = {}) {
  const isReady = hasTemplateValue(subitem);
  const quantity = subitem.quantity ?? "";
  const laborCount = subitem.labor_count ?? "";
  const unitPrice = toNonNegativeNumberOrZero(subitem.unit_price);
  const laborRate = toNonNegativeNumberOrZero(subitem.labor_rate);
  const productAmount = toNumberOrZero(quantity) * unitPrice;
  const laborAmount = toNumberOrZero(laborCount) * laborRate;
  return {
    itemId: item.id,
    itemName: item.name,
    itemType: item.item_type ?? "itemized",
    subitemId: subitem.id,
    material: subitem.name,
    displayMaterial: subitem.name,
    unit: subitem.unit ?? "평",
    pyeong: Number(pyeong),
    baseQuantity: quantity,
    baseUnitPrice: unitPrice,
    baseLaborCount: laborCount,
    baseLaborRate: laborRate,
    quantity,
    laborCount,
    unitPrice,
    laborRate,
    productAmount,
    laborAmount,
    totalAmount: productAmount + laborAmount,
    hasTemplateRecord: Boolean(subitem.template_value_id),
    hasTemplateValue: isReady,
    expanded: false,
    selected: isReady,
    ...patch,
  };
}

function buildEstimateItemsFromTemplate(catalog, pyeong) {
  return Object.fromEntries(
    catalog.map((item) => {
      const itemSubitems = item.item_type === "flat" ? item.subitems.slice(0, 1) : item.subitems;
      const rows = isFlooringThicknessItem(item)
        ? getFlooringThicknessGroups(itemSubitems).map((group) => {
            const optionKeys = Object.keys(group.options).sort(compareFlooringThickness);
            const templateValueThickness = optionKeys.find((thickness) => hasTemplateValue(group.options[thickness]));
            const selectedThickness = templateValueThickness
              ?? (group.options[DEFAULT_FLOORING_SPEC]
              ? DEFAULT_FLOORING_SPEC
              : group.options["1.8"]
                ? "1.8"
                : optionKeys[0]);
            const selectedOption = group.options[selectedThickness];
            return createEstimateRowFromSubitem(item, selectedOption, pyeong, {
              material: group.baseName,
              displayMaterial: composeFlooringSubitemName(group.baseName, selectedThickness),
              selectedThickness,
              thicknessOptions: optionKeys.map((thickness) => {
                const option = group.options[thickness];
                return option
                  ? {
                      thickness,
                      label: formatFlooringThickness(thickness),
                      subitemId: option.id,
                      quantity: option.quantity ?? "",
                      laborCount: option.labor_count ?? "",
                      unitPrice: toNonNegativeNumberOrZero(option.unit_price),
                      laborRate: toNonNegativeNumberOrZero(option.labor_rate),
                      baseQuantity: option.quantity ?? "",
                      baseLaborCount: option.labor_count ?? "",
                      baseUnitPrice: toNonNegativeNumberOrZero(option.unit_price),
                      baseLaborRate: toNonNegativeNumberOrZero(option.labor_rate),
                      templateValueId: option.template_value_id ?? null,
                      hasTemplateRecord: Boolean(option.template_value_id),
                      hasTemplateValue: hasTemplateValue(option),
                    }
                  : null;
              }).filter(Boolean),
            });
          })
        : itemSubitems.map((subitem) => createEstimateRowFromSubitem(item, subitem, pyeong));

      return [item.id, rows];
    })
  );
}

function createLocalId(prefix = "row") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getAdjustmentAmount(adjustment) {
  return toNumberOrZero(adjustment?.amount);
}

function getAdjustmentSignedAmount(adjustment) {
  const amount = getAdjustmentAmount(adjustment);
  return adjustment?.type === "discount" ? -amount : amount;
}

function getCleanEstimateAdjustments(adjustments) {
  return (adjustments ?? [])
    .filter((adjustment) =>
      `${adjustment.label ?? ""}`.trim() ||
      `${adjustment.memo ?? ""}`.trim() ||
      toNumberOrZero(adjustment.amount) !== 0
    )
    .map((adjustment) => ({
      id: adjustment.id ?? createLocalId("adjustment"),
      label: `${adjustment.label ?? ""}`.trim(),
      type: adjustment.type === "discount" ? "discount" : "charge",
      amount: getAdjustmentAmount(adjustment),
      visibleToCustomer: Boolean(adjustment.visibleToCustomer),
      memo: `${adjustment.memo ?? ""}`.trim(),
    }));
}

function getEstimateItemsDataItems(itemsData) {
  if (Array.isArray(itemsData)) return itemsData;
  if (Array.isArray(itemsData?.items)) return itemsData.items;
  return [];
}

function getEstimateItemsDataAdjustments(itemsData) {
  if (Array.isArray(itemsData?.adjustments)) return itemsData.adjustments;
  return [];
}

function getEstimateItemsDataSiteMemo(itemsData) {
  return `${itemsData?.siteMemo ?? ""}`;
}

function getEstimateItemsDataMeta(itemsData) {
  return itemsData?.estimateMeta && typeof itemsData.estimateMeta === "object"
    ? itemsData.estimateMeta
    : {};
}

function getTodayDateInput() {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function getDateInputFromValue(value) {
  if (!value) return getTodayDateInput();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getTodayDateInput();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function addDaysToDateInput(dateInput, days) {
  const date = new Date(`${dateInput || getTodayDateInput()}T00:00:00`);
  date.setDate(date.getDate() + days);
  return getDateInputFromValue(date);
}

function formatDisplayDate(dateInput) {
  if (!dateInput) return "-";
  const date = new Date(`${dateInput}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateInput;
  return date.toLocaleDateString("ko-KR");
}

function formatDisplayDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function isEstimateRowModified(row) {
  if (!row) return false;
  return (
    toNumberOrZero(row.baseQuantity) !== toNumberOrZero(row.quantity) ||
    toNumberOrZero(row.baseUnitPrice) !== toNumberOrZero(row.unitPrice ?? row.unit_price) ||
    toNumberOrZero(row.baseLaborCount) !== toNumberOrZero(row.laborCount) ||
    toNumberOrZero(row.baseLaborRate) !== toNumberOrZero(row.laborRate)
  );
}

export default function App() {
  const previewPdfRef = useRef(null);
  const [companySession, setCompanySession] = useState(() => {
    const company = readStoredCompany();
    return {
      company,
      checking: Boolean(company?.id || company?.company_code || company?.code),
    };
  });
  const [loginCode, setLoginCode] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [adminVerifyOpen, setAdminVerifyOpen] = useState(false);
  const [adminVerifyPassword, setAdminVerifyPassword] = useState("");
  const [adminVerifyLoading, setAdminVerifyLoading] = useState(false);
  const [adminVerifyError, setAdminVerifyError] = useState("");
  const [pendingAdminPage, setPendingAdminPage] = useState("admin");
  const [page, setPage] = useState(pageFromHash);
  const [step, setStep] = useState(1);
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
  const [estimateCatalog, setEstimateCatalog] = useState([]);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateSaving, setEstimateSaving] = useState(false);
  const [estimateError, setEstimateError] = useState("");
  const [estimateNotice, setEstimateNotice] = useState("");
  const [adminItems, setAdminItems] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminNotice, setAdminNotice] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [adminFavoriteOnly, setAdminFavoriteOnly] = useState(false);
  const [expandedAdminItemIds, setExpandedAdminItemIds] = useState([]);
  const [selectedAdminPyeong, setSelectedAdminPyeong] = useState("");
  const [selectedAdminBuildType, setSelectedAdminBuildType] = useState("");
  const [selectedAdminHasExtension, setSelectedAdminHasExtension] = useState(false);
  const [selectedAdminConditionVariant, setSelectedAdminConditionVariant] = useState("");
  const [adminTemplates, setAdminTemplates] = useState([]);
  const [currentAdminTemplateId, setCurrentAdminTemplateId] = useState("");
  const [adminConditionLoaded, setAdminConditionLoaded] = useState(false);
  const [adminConditionStep, setAdminConditionStep] = useState("select");
  const [adminCommonPriceSavedAt, setAdminCommonPriceSavedAt] = useState("");
  const [conditionVariantLabels, setConditionVariantLabels] = useState(() => createConditionVariantLabelRows());
  const [wallpaperBulkInputs, setWallpaperBulkInputs] = useState({});
  const [dragItemId, setDragItemId] = useState("");
  const [dragSubitem, setDragSubitem] = useState(null);
  const [detailSubitems, setDetailSubitems] = useState([]);
  const [selectedDetailSubitemId, setSelectedDetailSubitemId] = useState("");
  const [detailCosts, setDetailCosts] = useState([]);
  const [newDetailCost, setNewDetailCost] = useState({
    name: "",
    cost: "",
    category_type: "basic",
  });
  const [estimates, setEstimates] = useState([]);
  const [estimateSearch, setEstimateSearch] = useState("");
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [pyeongDropdownOpen, setPyeongDropdownOpen] = useState(false);
  const [adminPyeongDropdownOpen, setAdminPyeongDropdownOpen] = useState(false);
  const [favoritePyeongs, setFavoritePyeongs] = useState(readFavoritePyeongs);

  const selectedCompany = companySession.company;
  const selectedCompanyId = selectedCompany?.id ?? "";
  const selectedCompanyName = selectedCompany?.name ?? "";
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
  const conditionSummary = useMemo(
    () => makeConditionSummary(condition, conditionVariantLabelMap),
    [condition, conditionVariantLabelMap]
  );
  const conditionChips = useMemo(
    () => makeConditionChips(condition, conditionVariantLabelMap),
    [condition, conditionVariantLabelMap]
  );

  const selectedRows = useMemo(() => {
    return Object.entries(items).flatMap(([categoryId, rows]) => {
      const catalogItem = estimateCatalog.find((entry) => entry.id === categoryId);
      const fallbackCategory = categories.find((entry) => entry.id === categoryId);
      return (rows ?? [])
        .filter((row) => row.selected)
        .map((row) => {
          const quantity = toNumberOrZero(row.quantity);
          const laborCount = toNumberOrZero(row.laborCount);
          const unitPrice = toNonNegativeNumberOrZero(row.unitPrice ?? row.unit_price);
          const laborRate = toNonNegativeNumberOrZero(row.laborRate);
          const productAmount = unitPrice * quantity;
          const laborAmount = laborRate * laborCount;
          const totalAmount = productAmount + laborAmount;
          return {
            categoryId,
            itemId: row.itemId ?? categoryId,
            categoryName: row.itemName ?? catalogItem?.name ?? fallbackCategory?.name ?? categoryId,
            itemType: row.itemType ?? catalogItem?.item_type ?? "itemized",
            subitemId: row.subitemId,
            material: row.displayMaterial ?? row.material,
            selectedThickness: row.selectedThickness ?? null,
            pyeong: toNumberOrZero(row.pyeong ?? condition.size),
            conditionPyeong: toNumberOrZero(condition.size),
            estimatePyeong: toNumberOrZero(estimatePyeong || condition.size),
            quantity,
            laborCount,
            unit: row.unit ?? "평",
            unitPrice,
            laborRate,
            baseQuantity: toNumberOrZero(row.baseQuantity),
            baseUnitPrice: toNonNegativeNumberOrZero(row.baseUnitPrice),
            baseLaborCount: toNumberOrZero(row.baseLaborCount),
            baseLaborRate: toNonNegativeNumberOrZero(row.baseLaborRate),
            modified: isEstimateRowModified(row),
            productAmount,
            laborAmount,
            totalAmount,
            price: totalAmount,
          };
        });
    });
  }, [condition.size, estimateCatalog, estimatePyeong, items]);

  const selectedItemsTotal = selectedRows.reduce((sum, row) => sum + row.price, 0);
  const cleanEstimateAdjustments = useMemo(
    () => getCleanEstimateAdjustments(estimateAdjustments),
    [estimateAdjustments]
  );
  const adjustmentTotal = cleanEstimateAdjustments.reduce(
    (sum, adjustment) => sum + getAdjustmentSignedAmount(adjustment),
    0
  );
  const total = Math.max(0, selectedItemsTotal + adjustmentTotal);
  const customerVisibleAdjustments = cleanEstimateAdjustments.filter(
    (adjustment) => adjustment.visibleToCustomer
  );
  const selectedRowsByCategory = useMemo(() => {
    return selectedRows.reduce((groups, row) => {
      const key = row.categoryName || "시공 항목";
      groups[key] = groups[key] ?? [];
      groups[key].push(row);
      return groups;
    }, {});
  }, [selectedRows]);
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
  const currentAdminTemplateCondition = getAdminTemplateCondition();
  const currentAdminConditionLabel = currentAdminTemplateCondition
    ? makeTemplateLabel(currentAdminTemplateCondition, conditionVariantLabelMap)
    : "";
  const canEditConditionQuantities = isConditionQuantityAdminPage && adminConditionLoaded && Boolean(currentAdminTemplateCondition);
  const showAdminConditionSelect = isConditionQuantityAdminPage && adminConditionStep === "select";
  const showAdminConditionEditor = isConditionQuantityAdminPage && adminConditionStep === "edit";
  const showAdminCatalogEditor = isCommonPriceAdminPage || showAdminConditionEditor;
  const adminCommonPriceSavedLabel = adminCommonPriceSavedAt ? formatDisplayDateTime(adminCommonPriceSavedAt) : "";

  useEffect(() => {
    let active = true;

    async function verifyStoredCompany() {
      const storedCompany = readStoredCompany();
      const storedCompanyId = `${storedCompany?.id ?? ""}`.trim();
      const storedCompanyCode = getStoredCompanyLookupCode(storedCompany);
      if (!storedCompanyId && !storedCompanyCode) {
        clearStoredCompany();
        if (active) setCompanySession({ company: null, checking: false });
        return;
      }

      if (!isSupabaseConfigured) {
        clearStoredCompany();
        if (active) {
          setLoginError("로그인 중 문제가 발생했습니다.");
          setCompanySession({ company: null, checking: false });
        }
        return;
      }

      try {
        let companyQuery = supabase
          .from("companies")
          .select("id, name, company_code");

        if (isValidUuid(storedCompanyId)) {
          companyQuery = companyQuery.eq("id", storedCompanyId);
        } else if (storedCompanyCode) {
          companyQuery = companyQuery.eq("company_code", storedCompanyCode);
        } else {
          clearStoredCompany();
          if (active) setCompanySession({ company: null, checking: false });
          return;
        }

        const { data, error } = await companyQuery.maybeSingle();

        if (error) throw error;
        if (!data?.id || !isValidUuid(data.id)) {
          clearStoredCompany();
          if (active) setCompanySession({ company: null, checking: false });
          return;
        }

        const verifiedCompany = normalizeCompanySession(data);
        writeStoredCompany(verifiedCompany);
        if (active) {
          setCompanySession({ company: verifiedCompany, checking: false });
        }
      } catch (error) {
        console.error("[FORMATE company session]", error);
        clearStoredCompany();
        if (active) {
          setLoginError("로그인 중 문제가 발생했습니다.");
          setCompanySession({ company: null, checking: false });
        }
      }
    }

    verifyStoredCompany();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) return;
    fetchConditionVariantLabels({ silent: true });
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
      fetchAdminItems({ mode: "prices" });
      return;
    }
    if (page === "admin-items") {
      const activeCondition = adminConditionStep === "edit" && adminConditionLoaded ? getAdminTemplateCondition() : null;
      if (!activeCondition) {
        setAdminConditionLoaded(false);
        setCurrentAdminTemplateId("");
      }
      fetchAdminItems({ mode: "condition", condition: activeCondition });
    }
    if (page === "admin-condition-labels") {
      fetchConditionVariantLabels();
    }
    if (page === "admin-detail-costs") {
      fetchDetailSubitems();
    }
    if (page === "admin-estimates") {
      fetchEstimates();
    }
  }, [page, selectedCompanyId]);

  useEffect(() => {
    if (selectedCompanyId && page === "admin-detail-costs" && selectedDetailSubitemId) {
      fetchDetailCosts(selectedDetailSubitemId);
    }
  }, [page, selectedDetailSubitemId, selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId || page !== "admin-estimates") return;
    const timer = window.setTimeout(() => {
      fetchEstimates(estimateSearch);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [estimateSearch, page, selectedCompanyId]);

  useEffect(() => {
    window.localStorage.setItem(FAVORITE_PYEONG_STORAGE_KEY, JSON.stringify(favoritePyeongs));
  }, [favoritePyeongs]);

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

    const companyCode = loginCode.trim();
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

    setLoginLoading(true);
    setLoginError("");
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, company_code, admin_password_hash")
        .eq("company_code", companyCode)
        .maybeSingle();

      if (error) throw error;
      if (!data?.id || !isValidUuid(data.id)) {
        setLoginError("업체 코드를 확인해주세요.");
        return;
      }
      if (`${data.admin_password_hash ?? ""}` !== password) {
        setLoginError("비밀번호를 확인해주세요.");
        return;
      }

      const nextCompany = normalizeCompanySession(data);
      clearAdminVerifiedCompany();
      writeStoredCompany(nextCompany);
      clearCompanyScopedState();
      setCompanySession({ company: nextCompany, checking: false });
      setLoginCode("");
      setLoginPassword("");
      setLoginError("");
    } catch (error) {
      console.error("[FORMATE company login]", error);
      setLoginError("로그인 중 문제가 발생했습니다.");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleChangeCompany() {
    clearStoredCompany();
    clearAdminVerifiedCompany();
    clearCompanyScopedState();
    setCompanySession({ company: null, checking: false });
    setLoginCode("");
    setLoginPassword("");
    setLoginError("");
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
      const { data, error } = await supabase
        .from("companies")
        .select("id, admin_password_hash")
        .eq("id", selectedCompanyId)
        .maybeSingle();

      if (error) throw error;
      if (!data?.id || `${data.admin_password_hash ?? ""}` !== password) {
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

  function toggleFavoritePyeong(pyeong) {
    const nextPyeong = Number(pyeong);
    setFavoritePyeongs((current) =>
      current.includes(nextPyeong)
        ? current.filter((value) => value !== nextPyeong)
        : [...current, nextPyeong].sort((a, b) => a - b)
    );
  }

  function renderPyeongOption(pyeong, selectedValue, onSelect) {
    const selected = String(pyeong) === String(selectedValue);
    const favorite = favoritePyeongs.includes(Number(pyeong));

    return (
      <div
        key={pyeong}
        className={`pyeong-option-row ${selected ? "selected" : ""}`.trim()}
        role="option"
        aria-selected={selected}
      >
        <button type="button" className="pyeong-option-main" onClick={() => onSelect(String(pyeong))}>
          <span>{pyeong}평</span>
          {selected && <Check size={16} />}
        </button>
        <button
          type="button"
          className={`favorite-pyeong-toggle ${favorite ? "active" : ""}`.trim()}
          aria-label={`${pyeong}평 즐겨찾기 ${favorite ? "해제" : "추가"}`}
          onClick={(event) => {
            event.stopPropagation();
            toggleFavoritePyeong(pyeong);
          }}
        >
          <Star size={15} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
    );
  }

  function renderPyeongDropdownMenu(selectedValue, onSelect) {
    return (
      <div className="custom-select-menu" role="listbox">
        {favoritePyeongs.length > 0 && (
          <div className="custom-select-section favorite-pyeong-section">
            <p>즐겨찾는 평수</p>
            {favoritePyeongs.map((pyeong) => renderPyeongOption(pyeong, selectedValue, onSelect))}
          </div>
        )}
        <div className="custom-select-section">
          <p>전체 평수</p>
          {PYEONG_OPTIONS.map((pyeong) => renderPyeongOption(pyeong, selectedValue, onSelect))}
        </div>
      </div>
    );
  }

  async function fetchConstructionCatalogRows(companyId) {
    const { data: itemRows, error: itemError } = await supabase
      .from("construction_items")
      .select("*")
      .eq("company_id", companyId)
      .order("is_favorite", { ascending: false })
      .order("sort_order", { ascending: true });

    if (itemError) throw itemError;

    const itemIds = (itemRows ?? []).map((item) => item.id);
    if (!itemIds.length) {
      return { itemRows: itemRows ?? [], subitemRows: [] };
    }

    const { data: subitemRows, error: subitemError } = await supabase
      .from("construction_subitems")
      .select("*")
      .in("item_id", itemIds)
      .order("sort_order", { ascending: true });

    if (subitemError) throw subitemError;
    return { itemRows: itemRows ?? [], subitemRows: subitemRows ?? [] };
  }

  function hasDefaultCatalogGaps(itemRows = [], subitemRows = []) {
    const subitemNamesByItemId = subitemRows.reduce((acc, subitem) => {
      acc[subitem.item_id] = acc[subitem.item_id] ?? new Set();
      acc[subitem.item_id].add(subitem.name.trim());
      return acc;
    }, {});

    return DEFAULT_CONSTRUCTION_CATALOG.some((catalogItem) => {
      const item = findItemByDefaultCatalogName(itemRows, catalogItem.name);
      if (!item?.id) return true;
      const subitemNames = subitemNamesByItemId[item.id] ?? new Set();
      return catalogItem.subitems.some(([name]) => !subitemNames.has(name));
    });
  }

  async function ensureDefaultConstructionCatalog(companyId, itemRows = [], subitemRows = []) {
    let nextItemRows = [...itemRows];
    const missingItemPayloads = DEFAULT_CONSTRUCTION_CATALOG
      .filter((item) => !findItemByDefaultCatalogName(nextItemRows, item.name))
      .map((item, index) => ({
        company_id: companyId,
        name: item.name,
        item_type: "itemized",
        is_favorite: false,
        sort_order: index,
      }));

    let changed = false;
    if (missingItemPayloads.length) {
      const { data: insertedItems, error } = await supabase
        .from("construction_items")
        .insert(missingItemPayloads)
        .select("*");
      if (error) throw error;
      nextItemRows = [...nextItemRows, ...(insertedItems ?? [])];
      changed = true;
    }

    const itemIds = nextItemRows.map((item) => item.id);
    let nextSubitemRows = [...subitemRows];
    if (changed && itemIds.length) {
      const { data, error } = await supabase
        .from("construction_subitems")
        .select("*")
        .in("item_id", itemIds)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      nextSubitemRows = data ?? [];
    }

    const subitemsByItemId = nextSubitemRows.reduce((acc, subitem) => {
      acc[subitem.item_id] = acc[subitem.item_id] ?? new Set();
      acc[subitem.item_id].add(subitem.name.trim());
      return acc;
    }, {});
    const missingSubitemPayloads = DEFAULT_CONSTRUCTION_CATALOG.flatMap((item) => {
      const parent = findItemByDefaultCatalogName(nextItemRows, item.name);
      if (!parent?.id) return [];
      const existingNames = subitemsByItemId[parent.id] ?? new Set();
      return item.subitems
        .filter(([name]) => !existingNames.has(name))
        .map(([name, unit], index) => ({
          item_id: parent.id,
          name,
          unit,
          unit_price: 0,
          labor_rate: 0,
          sort_order: index,
        }));
    });

    if (missingSubitemPayloads.length) {
      const { error } = await supabase.from("construction_subitems").insert(missingSubitemPayloads);
      if (error) throw error;
      changed = true;
    }

    return changed;
  }

  async function ensureFlatSubitems(itemRows, subitemRows) {
    const flatItems = (itemRows ?? []).filter((item) => (item.item_type ?? "itemized") === "flat");
    if (!flatItems.length) return false;

    let changed = false;
    const subitemsByItemId = subitemRows.reduce((acc, subitem) => {
      acc[subitem.item_id] = acc[subitem.item_id] ?? [];
      acc[subitem.item_id].push(subitem);
      return acc;
    }, {});

    for (const item of flatItems) {
      const subitems = [...(subitemsByItemId[item.id] ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      );

      if (!subitems.length) {
        const { error } = await supabase.from("construction_subitems").insert({
          item_id: item.id,
          name: item.name,
          unit: "식",
          unit_price: 0,
          labor_rate: 0,
          sort_order: 0,
        });
        if (error) throw error;
        changed = true;
        continue;
      }

      const [primary, ...extras] = subitems;
      if (primary.name !== item.name || (primary.sort_order ?? 0) !== 0) {
        const { error } = await supabase
          .from("construction_subitems")
          .update({ name: item.name, sort_order: 0 })
          .eq("id", primary.id);
        if (error) throw error;
        changed = true;
      }

      if (extras.length) {
        const { error } = await supabase
          .from("construction_subitems")
          .delete()
          .in("id", extras.map((subitem) => subitem.id));
        if (error) throw error;
        changed = true;
      }
    }

    return changed;
  }

  async function ensureFlooringThicknessSubitems(itemRows, subitemRows) {
    const subitemsByItemId = subitemRows.reduce((acc, subitem) => {
      acc[subitem.item_id] = acc[subitem.item_id] ?? [];
      acc[subitem.item_id].push(subitem);
      return acc;
    }, {});

    const payloads = [];

    (itemRows ?? []).forEach((item) => {
      const itemSubitems = subitemsByItemId[item.id] ?? [];
      if (!isFlooringThicknessItem({ ...item, subitems: itemSubitems })) return;

      getFlooringThicknessGroups(itemSubitems).forEach((group) => {
        if (!group.baseName.includes("장판")) return;
        const source = group.options["1.8"] ?? group.options[DEFAULT_FLOORING_SPEC] ?? Object.values(group.options)[0];
        if (!source) return;

        DEFAULT_FLOORING_AUTO_SPECS.forEach((thickness, thicknessIndex) => {
          if (group.options[thickness]) return;
          payloads.push({
            item_id: item.id,
            name: composeFlooringSubitemName(group.baseName, thickness),
            unit: source.unit ?? "평",
            unit_price: 0,
            labor_rate: 0,
            sort_order: (source.sort_order ?? 0) * 100 + thicknessIndex,
          });
        });
      });
    });

    if (!payloads.length) return false;

    const { error } = await supabase.from("construction_subitems").insert(payloads);
    if (error) throw error;
    return true;
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

    const { error } = await supabase
      .from("subitem_pyeong_values")
      .upsert(missingPayloads, {
        onConflict: "subitem_id,pyeong",
        ignoreDuplicates: true,
      });

    if (error) throw error;
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

  async function fetchConditionVariantLabels(options = {}) {
    if (!selectedCompanyId || !isSupabaseConfigured) {
      setConditionVariantLabels(createConditionVariantLabelRows());
      return;
    }

    if (!options.silent) {
      setAdminLoading(true);
      setAdminError("");
      setAdminNotice("");
    }

    try {
      const { data, error } = await supabase
        .from("condition_variant_labels")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .order("variant_key", { ascending: true });

      if (error) {
        if (isMissingConditionVariantLabelsTable(error)) {
          setConditionVariantLabels(createConditionVariantLabelRows());
          if (!options.silent) {
            setAdminError("확장형/구형 설명 테이블이 아직 없습니다. supabase/schema.sql의 condition_variant_labels SQL을 Supabase SQL Editor에 적용해주세요.");
          }
          return;
        }
        throw error;
      }

      setConditionVariantLabels(createConditionVariantLabelRows(data ?? []));
      if (!options.silent && page === "admin-condition-labels") {
        setAdminNotice("확장형/구형 설명을 불러왔습니다.");
      }
    } catch (error) {
      if (options.silent) {
        console.warn("[FORMATE condition variant labels]", error);
      } else {
        setAdminError(getFriendlyError(error, "확장형/구형 설명을 불러오지 못했어요. 다시 시도해주세요."));
      }
    } finally {
      if (!options.silent) setAdminLoading(false);
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

      const { data, error } = await supabase
        .from("condition_variant_labels")
        .upsert(payloads, { onConflict: "company_id,variant_key" })
        .select("*");

      if (error) {
        if (isMissingConditionVariantLabelsTable(error)) {
          throw new Error("condition_variant_labels 테이블이 아직 없습니다. supabase/schema.sql의 SQL을 Supabase SQL Editor에 적용한 뒤 다시 저장해주세요.");
        }
        throw error;
      }

      setConditionVariantLabels(createConditionVariantLabelRows(data ?? payloads));
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
    const { data, error } = await supabase
      .from("admin_condition_templates")
      .select("*")
      .eq("company_id", companyId)
      .order("pyeong", { ascending: true })
      .order("build_type", { ascending: true })
      .order("condition_variant", { ascending: true })
      .order("has_extension", { ascending: true });

    if (error) throw error;
    setAdminTemplates(dedupeTemplatesByCondition(data ?? []));
  }

  async function fetchTemplateRowByCondition(companyId, condition) {
    const candidates = [condition, ...getLegacyTemplateConditions(condition)].filter(Boolean);
    for (const candidate of candidates) {
      const { data, error } = await supabase
        .from("admin_condition_templates")
        .select("*")
        .eq("company_id", companyId)
        .eq("pyeong", candidate.pyeong)
        .eq("build_type", candidate.build_type)
        .eq("has_extension", candidate.has_extension)
        .eq("condition_variant", candidate.condition_variant);

      if (error) throw error;
      const representative = pickRepresentativeTemplate(data ?? []);
      if (representative?.id) return representative;
    }
    return null;
  }

  async function fetchAdminItems(options = {}) {
    setAdminLoading(true);
    setAdminError("");
    try {
      if (!isSupabaseConfigured) {
        throw new Error(".env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해야 합니다.");
      }
      const companyId = requireSelectedCompanyId();
      const mode = options.mode ?? (page === "admin-prices" ? "prices" : "condition");
      const shouldLoadConditionValues = mode === "condition";

      let { itemRows, subitemRows } = await fetchConstructionCatalogRows(companyId);
      let defaultCatalogPrepared = false;
      if (hasDefaultCatalogGaps(itemRows, subitemRows)) {
        setAdminNotice("FORMATE 기본 시공항목을 준비하고 있습니다.");
        const catalogChanged = await ensureDefaultConstructionCatalog(companyId, itemRows, subitemRows);
        if (catalogChanged) {
          ({ itemRows, subitemRows } = await fetchConstructionCatalogRows(companyId));
          defaultCatalogPrepared = true;
        }
      }

      const flatSubitemsChanged = await ensureFlatSubitems(itemRows, subitemRows);
      if (flatSubitemsChanged) {
        await fetchAdminItems(options);
        return;
      }

      const flooringThicknessChanged = await ensureFlooringThicknessSubitems(itemRows, subitemRows);
      if (flooringThicknessChanged) {
        await fetchAdminItems(options);
        return;
      }

      if (shouldLoadConditionValues) {
        await fetchAdminTemplateList();
      } else {
        setAdminTemplates([]);
        setCurrentAdminTemplateId("");
        setAdminConditionLoaded(false);
      }

      let templateValueRows = [];
      const adminTemplateCondition = Object.prototype.hasOwnProperty.call(options, "condition")
        ? options.condition
        : getAdminTemplateCondition();
      if (shouldLoadConditionValues && adminTemplateCondition) {
        const templateRow = await fetchTemplateRowByCondition(companyId, adminTemplateCondition);
        setCurrentAdminTemplateId(templateRow?.id ?? "");
        setAdminConditionLoaded(true);

        if (templateRow?.id) {
          const { data: values, error: valuesError } = await supabase
            .from("admin_condition_template_values")
            .select("id, template_id, item_id, subitem_id, option_value, quantity, labor_count")
            .eq("template_id", templateRow.id);

          if (valuesError) throw valuesError;
          templateValueRows = values ?? [];
          setAdminNotice("저장된 조건별 수량/인원을 불러왔습니다. 단가/인건비는 모든 조건에 공통으로 적용됩니다.");
        } else {
          setAdminNotice("아직 이 조건의 수량/인원 기준이 없습니다. 공통 단가/인건비와 조건별 수량/인원을 입력한 뒤 저장하세요.");
        }
      } else {
        setCurrentAdminTemplateId("");
        if (shouldLoadConditionValues) {
          setAdminConditionLoaded(false);
          setAdminNotice(defaultCatalogPrepared ? "기본 시공항목이 준비되었습니다. 먼저 조건을 선택한 뒤 관리하기를 눌러주세요." : "");
        } else {
          const latestUpdatedAt = subitemRows
            .map((subitem) => subitem.updated_at)
            .filter(Boolean)
            .sort()
            .at(-1);
          if (latestUpdatedAt) setAdminCommonPriceSavedAt(latestUpdatedAt);
          setAdminNotice(defaultCatalogPrepared ? "기본 시공항목이 준비되었습니다. 공통 단가와 인건비를 입력하세요." : "");
        }
      }

      setAdminItems(normalizeAdminItems(itemRows, subitemRows, templateValueRows));
    } catch (error) {
      setAdminError(getFriendlyError(error, "데이터를 불러오지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminLoading(false);
    }
  }

  async function fetchDetailSubitems() {
    setAdminLoading(true);
    setAdminError("");
    try {
      if (!isSupabaseConfigured) {
        throw new Error(".env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해야 합니다.");
      }
      const companyId = requireSelectedCompanyId();

      const { data: itemRows, error: itemError } = await supabase
        .from("construction_items")
        .select("id, name, sort_order, is_favorite")
        .eq("company_id", companyId)
        .order("is_favorite", { ascending: false })
        .order("sort_order", { ascending: true });

      if (itemError) throw itemError;

      const itemIds = (itemRows ?? []).map((item) => item.id);
      if (!itemIds.length) {
        setDetailSubitems([]);
        setSelectedDetailSubitemId("");
        setDetailCosts([]);
        return;
      }

      const { data: subitemRows, error: subitemError } = await supabase
        .from("construction_subitems")
        .select("*")
        .in("item_id", itemIds)
        .order("sort_order", { ascending: true });

      if (subitemError) throw subitemError;

      const itemById = Object.fromEntries((itemRows ?? []).map((item) => [item.id, item]));
      const nextSubitems = (subitemRows ?? []).map((subitem) => ({
        ...subitem,
        item_name: itemById[subitem.item_id]?.name ?? "시공 항목",
        item_sort_order: itemById[subitem.item_id]?.sort_order ?? 0,
        item_is_favorite: Boolean(itemById[subitem.item_id]?.is_favorite),
      }));

      setDetailSubitems(nextSubitems);
      setSelectedDetailSubitemId((current) => {
        if (current && nextSubitems.some((subitem) => subitem.id === current)) return current;
        return nextSubitems[0]?.id ?? "";
      });
    } catch (error) {
      setAdminError(getFriendlyError(error, "소재 목록을 불러오지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminLoading(false);
    }
  }

  async function fetchDetailCosts(subitemId = selectedDetailSubitemId) {
    if (!subitemId) {
      setDetailCosts([]);
      return;
    }

    setAdminLoading(true);
    setAdminError("");
    try {
      const { data, error } = await supabase
        .from("detail_cost_categories")
        .select("*")
        .eq("company_id", requireSelectedCompanyId())
        .eq("subitem_id", subitemId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setDetailCosts(data ?? []);
    } catch (error) {
      setAdminError(getFriendlyError(error, "세부비용 항목을 불러오지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminLoading(false);
    }
  }

  async function fetchEstimates(searchText = estimateSearch) {
    setAdminLoading(true);
    setAdminError("");
    try {
      if (!isSupabaseConfigured) {
        throw new Error(".env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해야 합니다.");
      }
      const companyId = requireSelectedCompanyId();

      let query = supabase
        .from("estimates")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      const keyword = searchText.trim();
      const { data, error } = await query;
      if (error) throw error;

      const normalizedKeyword = keyword.toLowerCase();
      const filtered = normalizedKeyword
        ? (data ?? []).filter((estimate) => {
            const addressText = `${estimate.address ?? ""}`.toLowerCase();
            const customerText = getSavedEstimateCustomerName(estimate).toLowerCase();
            return addressText.includes(normalizedKeyword) || customerText.includes(normalizedKeyword);
          })
        : data ?? [];
      setEstimates(filtered);
    } catch (error) {
      setAdminError(getFriendlyError(error, "견적서 목록을 불러오지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminLoading(false);
    }
  }

  function updateCondition(patch) {
    setCondition((current) => ({ ...current, ...patch }));
  }

  async function openAdminConditionEditor(condition) {
    if (!condition) return;
    await fetchAdminItems({ mode: "condition", condition });
    setAdminConditionStep("edit");
  }

  async function returnToAdminConditionSelect() {
    setAdminConditionStep("select");
    setAdminConditionLoaded(false);
    setCurrentAdminTemplateId("");
    await fetchAdminItems({ mode: "condition", condition: null });
  }

  async function loadAdminTemplate(template) {
    const condition = buildTemplateCondition({
      pyeong: template.pyeong,
      buildType: template.condition_variant || template.build_type,
      hasExtension: template.has_extension,
      conditionVariant: template.condition_variant,
    });
    setSelectedAdminPyeong(String(template.pyeong));
    setSelectedAdminBuildType(condition.condition_variant.startsWith("확장형") ? "new" : "old");
    setSelectedAdminHasExtension(Boolean(condition.has_extension));
    setSelectedAdminConditionVariant(condition.condition_variant);
    setCurrentAdminTemplateId(template.id);
    setAdminConditionLoaded(false);
    await openAdminConditionEditor(condition);
  }

  function hasCurrentCompanySubitem(subitemId) {
    return adminItems.some((item) =>
      item.subitems?.some((subitem) => subitem.id === subitemId)
    );
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
      current.map((item) => ({
        ...item,
        subitems: item.subitems.map((subitem) =>
          subitem.id === subitemId ? { ...subitem, name, option_value: getTemplateOptionValue({ name }) } : subitem
        ),
      }))
    );
  }

  async function updateAdminFlooringSubitemName(subitem, patch) {
    const parent = adminItems.find((item) =>
      item.subitems?.some((entrySubitem) => entrySubitem.id === subitem.id)
    );
    const parsed = parseFlooringThicknessName(subitem.name) ?? {
      baseName: subitem.name,
      thickness: DEFAULT_FLOORING_SPEC,
    };
    const nextName = composeFlooringSubitemName(
      Object.prototype.hasOwnProperty.call(patch, "baseName") ? patch.baseName : parsed.baseName,
      Object.prototype.hasOwnProperty.call(patch, "thickness") ? patch.thickness : parsed.thickness
    );
    const canonicalNextName = getCanonicalFlooringSubitemName(nextName);
    const hasDuplicate = parent?.subitems?.some(
      (entrySubitem) =>
        entrySubitem.id !== subitem.id &&
        getCanonicalFlooringSubitemName(entrySubitem.name) === canonicalNextName
    );

    if (hasDuplicate) {
      setAdminError("같은 대분류 안에 동일한 소재명과 규격/두께가 이미 있습니다.");
      if (!isLocalSubitemId(subitem.id)) {
        await fetchAdminItems({ mode: isCommonPriceAdminPage ? "prices" : "condition" });
      }
      return;
    }

    updateLocalSubitemName(subitem.id, nextName);
    if (isLocalSubitemId(subitem.id)) return;
    await renameAdminSubitem(subitem.id, nextName);
  }

  function switchAdminFlooringSubitemThickness(subitem, nextThickness) {
    const parsed = parseFlooringThicknessName(subitem.name) ?? {
      baseName: subitem.name,
      thickness: DEFAULT_FLOORING_SPEC,
    };
    const nextName = composeFlooringSubitemName(parsed.baseName, nextThickness);
    const canonicalNextName = getCanonicalFlooringSubitemName(nextName);
    const canonicalCurrentName = getCanonicalFlooringSubitemName(subitem.name);
    if (canonicalNextName === canonicalCurrentName) return;

    setAdminError("");
    setAdminItems((current) =>
      current.map((item) => {
        const currentIndex = item.subitems.findIndex((entrySubitem) => entrySubitem.id === subitem.id);
        if (currentIndex < 0) return item;

        const nextSubitems = [...item.subitems];
        const targetIndex = nextSubitems.findIndex(
          (entrySubitem, index) =>
            index !== currentIndex &&
            getCanonicalFlooringSubitemName(entrySubitem.name) === canonicalNextName
        );

        if (targetIndex >= 0) {
          const targetSubitem = nextSubitems[targetIndex];
          nextSubitems[targetIndex] = nextSubitems[currentIndex];
          nextSubitems[currentIndex] = targetSubitem;
          return { ...item, subitems: nextSubitems };
        }

        const currentSubitem = nextSubitems[currentIndex];
        const nextSubitem = {
          ...currentSubitem,
          id: createLocalId("local-subitem"),
          name: canonicalNextName,
          option_value: getTemplateOptionValue({ name: canonicalNextName }),
          unit_price: "",
          labor_rate: "",
          quantity: "",
          labor_count: "",
          template_value_id: null,
          sort_order: (currentSubitem.sort_order ?? currentIndex) + 0.01,
        };

        nextSubitems[currentIndex] = nextSubitem;
        nextSubitems.splice(currentIndex + 1, 0, currentSubitem);
        return { ...item, subitems: nextSubitems };
      })
    );
  }

  function getVisibleAdminSubitems(item) {
    const subitems = item.subitems ?? [];
    if (!adminSearchTerm || item.name.toLowerCase().includes(adminSearchTerm)) return subitems;
    return subitems.filter((subitem) => subitem.name.toLowerCase().includes(adminSearchTerm));
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

  async function goNext() {
    if (!canGoNext()) return;
    const loaded = await fetchEstimateCatalog(condition.size, condition);
    if (loaded) setPage("items");
  }

  async function fetchEstimateCatalog(pyeong = condition.size, nextCondition = condition) {
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

      let { itemRows, subitemRows } = await fetchConstructionCatalogRows(companyId);
      let defaultCatalogPrepared = false;
      if (hasDefaultCatalogGaps(itemRows, subitemRows)) {
        setEstimateNotice("FORMATE 기본 시공항목을 준비하고 있습니다.");
        const catalogChanged = await ensureDefaultConstructionCatalog(companyId, itemRows, subitemRows);
        if (catalogChanged) {
          ({ itemRows, subitemRows } = await fetchConstructionCatalogRows(companyId));
          defaultCatalogPrepared = true;
        }
      }

      const flatSubitemsChanged = await ensureFlatSubitems(itemRows, subitemRows);
      if (flatSubitemsChanged) {
        return await fetchEstimateCatalog(pyeong, nextCondition);
      }

      const flooringThicknessChanged = await ensureFlooringThicknessSubitems(itemRows, subitemRows);
      if (flooringThicknessChanged) {
        return await fetchEstimateCatalog(pyeong, nextCondition);
      }

      let templateValueRows = [];
      const templateCondition = getEstimateTemplateCondition(nextCondition);
      if (templateCondition) {
        const templateRow = await fetchTemplateRowByCondition(companyId, templateCondition);

        if (templateRow?.id) {
          const { data: values, error: valuesError } = await supabase
            .from("admin_condition_template_values")
            .select("id, template_id, item_id, subitem_id, option_value, quantity, labor_count")
            .eq("template_id", templateRow.id);

          if (valuesError) throw valuesError;
          templateValueRows = values ?? [];
          if (defaultCatalogPrepared) {
            setEstimateNotice("기본 시공항목이 준비되었습니다. 공통 단가/인건비와 조건별 수량/인원을 바탕으로 견적을 작성할 수 있습니다.");
          } else if (templateValueRows.length) {
            setEstimateNotice("저장된 조건별 수량/인원을 적용해 견적서 초안을 만들었습니다. 단가/인건비는 공통 기준값을 사용합니다.");
          }
        } else {
          setEstimateNotice("아직 이 조건의 수량/인원 기준이 없습니다. 소재 구조와 공통 단가/인건비는 표시되며, 이번 견적에서 직접 입력할 수 있습니다.");
        }
      }

      const catalog = normalizeAdminItems(itemRows, subitemRows, templateValueRows);
      const nextItems = buildEstimateItemsFromTemplate(catalog, pyeong);
      const selectedCategoryIds = catalog
        .filter((item) => nextItems[item.id]?.some((row) => row.selected))
        .map((item) => item.id);
      const firstCategoryId = catalog[0]?.id ?? "";

      setEstimateCatalog(catalog);
      setItems(nextItems);
      setActiveCategories(selectedCategoryIds);
      setOpenCategory(firstCategoryId);
      setEstimatePyeong(String(pyeong));
      return true;
    } catch (error) {
      setEstimateError(getFriendlyError(error, "조건별 기준을 불러오지 못했어요. 다시 시도해주세요."));
      return false;
    } finally {
      setEstimateLoading(false);
    }
  }

  function toggleCategory(categoryId) {
    setActiveCategories((current) => (current.includes(categoryId) ? current : [...current, categoryId]));
    setOpenCategory(categoryId);
  }

  function recalculateEstimateRow(row) {
    const productAmount = toNumberOrZero(row.quantity) * toNonNegativeNumberOrZero(row.unitPrice);
    const laborAmount = toNumberOrZero(row.laborCount) * toNonNegativeNumberOrZero(row.laborRate);
    return {
      ...row,
      productAmount,
      laborAmount,
      totalAmount: productAmount + laborAmount,
    };
  }

  function applyEstimateRowPatch(row, patch) {
    if (!patch.selectedThickness) return { ...row, ...patch };

    const matchedOption = (row.thicknessOptions ?? []).find(
      (option) => option.thickness === patch.selectedThickness
    );

    if (!matchedOption) return { ...row, ...patch };

    return {
      ...row,
      ...patch,
      subitemId: matchedOption.subitemId,
      template_value_id: matchedOption.templateValueId,
      quantity: matchedOption.quantity,
      laborCount: matchedOption.laborCount,
      unitPrice: matchedOption.unitPrice,
      laborRate: matchedOption.laborRate,
      baseQuantity: matchedOption.baseQuantity,
      baseLaborCount: matchedOption.baseLaborCount,
      baseUnitPrice: matchedOption.baseUnitPrice,
      baseLaborRate: matchedOption.baseLaborRate,
      hasTemplateRecord: matchedOption.hasTemplateRecord,
      hasTemplateValue: matchedOption.hasTemplateValue,
      selected: matchedOption.hasTemplateValue,
      displayMaterial: composeFlooringSubitemName(row.material, matchedOption.thickness),
    };
  }

  function updateItem(categoryId, index, patch) {
    setItems((current) => ({
      ...current,
      [categoryId]: current[categoryId].map((row, rowIndex) =>
        rowIndex === index ? recalculateEstimateRow(applyEstimateRowPatch(row, patch)) : row
      ),
    }));
  }

  function applyEstimatePyeongToPyeongUnits() {
    const nextQuantity = `${estimatePyeong ?? ""}`.trim();
    if (!nextQuantity) return;

    setItems((current) =>
      Object.fromEntries(
        Object.entries(current).map(([categoryId, rows]) => [
          categoryId,
          (rows ?? []).map((row) =>
            `${row.unit ?? ""}`.trim() === "평"
              ? recalculateEstimateRow({ ...row, quantity: nextQuantity })
              : row
          ),
        ])
      )
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

  function loadSavedEstimateDraft(estimate, { copy = false, destination = "preview" } = {}) {
    const savedItems = getEstimateItemsDataItems(estimate.items_data);
    const savedAdjustments = getEstimateItemsDataAdjustments(estimate.items_data);
    const savedSiteMemo = getEstimateItemsDataSiteMemo(estimate.items_data);
    const savedMeta = getEstimateItemsDataMeta(estimate.items_data);
    const snapshot = estimate.condition_snapshot ?? {};
    const groupedItems = {};
    const catalogGroups = [];

    savedItems.forEach((item, index) => {
      const categoryName = item.categoryName ?? item.category ?? item.itemName ?? "시공 항목";
      const categoryId = item.categoryId ?? item.itemId ?? `saved-${sanitizeFileNamePart(categoryName, "item")}-${index}`;
      if (!groupedItems[categoryId]) {
        groupedItems[categoryId] = [];
        catalogGroups.push({
          id: categoryId,
          name: categoryName,
          item_type: item.itemType ?? "itemized",
          subitems: [],
        });
      }

      groupedItems[categoryId].push({
        itemId: item.itemId ?? categoryId,
        itemName: categoryName,
        itemType: item.itemType ?? "itemized",
        subitemId: item.subitemId ?? `${categoryId}-${index}`,
        material: item.material ?? item.name ?? item.description ?? "소재",
        displayMaterial: item.material ?? item.name ?? item.description ?? "소재",
        unit: item.unit ?? "평",
        pyeong: toNumberOrZero(item.pyeong ?? snapshot.estimate_pyeong ?? snapshot.condition_pyeong),
        baseQuantity: item.baseQuantity ?? item.quantity ?? "",
        baseUnitPrice: toNonNegativeNumberOrZero(item.baseUnitPrice ?? item.unitPrice ?? item.unit_price),
        baseLaborCount: item.baseLaborCount ?? item.laborCount ?? item.labor_count ?? "",
        baseLaborRate: toNonNegativeNumberOrZero(item.baseLaborRate ?? item.laborRate ?? item.labor_rate),
        quantity: item.quantity ?? "",
        laborCount: item.laborCount ?? item.labor_count ?? "",
        unitPrice: toNonNegativeNumberOrZero(item.unitPrice ?? item.unit_price),
        laborRate: toNonNegativeNumberOrZero(item.laborRate ?? item.labor_rate),
        productAmount: toNumberOrZero(item.productAmount),
        laborAmount: toNumberOrZero(item.laborAmount),
        totalAmount: toNumberOrZero(item.totalAmount ?? item.price ?? item.amount),
        hasTemplateValue: true,
        expanded: false,
        selected: true,
      });
    });

    const restoredTemplateCondition = buildTemplateCondition({
      pyeong: snapshot.condition_pyeong ?? snapshot.pyeong,
      buildType: snapshot.condition_variant || snapshot.build_type,
      hasExtension: snapshot.has_extension,
      conditionVariant: snapshot.condition_variant,
    });
    const restoredBuildType = restoredTemplateCondition.condition_variant.startsWith("확장형") ? "new" : "old";
    const nextCondition = {
      size: `${snapshot.condition_pyeong ?? snapshot.pyeong ?? ""}`,
      buildType: restoredBuildType,
      powderRoom: false,
      dressRoom: false,
      expanded: restoredBuildType === "old" ? restoredTemplateCondition.has_extension : false,
      conditionVariant: restoredTemplateCondition.condition_variant,
      expansionSpaces: [],
      occupancy: snapshot.occupancy_type === "빈집" ? "empty" : snapshot.occupancy_type === "살림집" ? "occupied" : "",
    };

    setCondition(nextCondition);
    setItems(groupedItems);
    setEstimateCatalog(catalogGroups);
    setActiveCategories(catalogGroups.map((group) => group.id));
    setOpenCategory(catalogGroups[0]?.id ?? "");
    setEstimatePyeong(`${snapshot.estimate_pyeong ?? snapshot.condition_pyeong ?? snapshot.pyeong ?? ""}`);
    setEstimateAdjustments(savedAdjustments);
    setSiteMemo(savedSiteMemo);
    setCustomerName(copy ? "" : `${savedMeta.customerName ?? ""}`);
    setCustomerPhone(copy ? "" : `${savedMeta.customerPhone ?? ""}`);
    setAddress(copy ? "" : estimate.address ?? "");
    setWorkDate(copy ? "" : estimate.construction_date ?? "");
    setEstimateVatStatus(savedMeta.vatStatus ?? "부가세 별도");
    setEstimateIssuedAt(copy ? getTodayDateInput() : savedMeta.createdDate ?? getDateInputFromValue(estimate.created_at));
    setStep(3);
    setSelectedEstimate(null);
    setEstimateError("");
    setEstimateNotice(copy ? "기존 견적서를 복사한 새 초안입니다. 고객 정보와 현장 정보를 입력한 뒤 저장하세요." : "");
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
    setEstimateCatalog([]);
    setEstimateError("");
    setEstimateNotice("");
  }

  function clearCompanyScopedState() {
    resetFlow();
    setAdminItems([]);
    setAdminError("");
    setAdminNotice("");
    setAdminSearch("");
    setAdminFavoriteOnly(false);
    setExpandedAdminItemIds([]);
    setAdminTemplates([]);
    setCurrentAdminTemplateId("");
    setAdminConditionLoaded(false);
    setAdminCommonPriceSavedAt("");
    setSelectedAdminPyeong("");
    setSelectedAdminBuildType("");
    setSelectedAdminHasExtension(false);
    setSelectedAdminConditionVariant("");
    setDetailSubitems([]);
    setSelectedDetailSubitemId("");
    setDetailCosts([]);
    setNewDetailCost({
      name: "",
      cost: "",
      category_type: "basic",
    });
    setEstimates([]);
    setEstimateSearch("");
    setSelectedEstimate(null);
    setDragItemId("");
    setDragSubitem(null);
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
      const { data: item, error } = await supabase
        .from("construction_items")
        .insert({
          company_id: requireSelectedCompanyId(),
          name,
          item_type: "itemized",
          is_favorite: false,
          sort_order: nextSortOrder,
        })
        .select("id, name")
        .single();
      if (error) throw error;
      await fetchAdminItems();
      setExpandedAdminItemIds((current) => [...new Set([...current, item.id])]);
      setAdminNotice("새 대분류를 추가했습니다. 대분류명을 수정하고 하단의 소재 추가 버튼으로 소재를 넣어주세요.");
    } catch (error) {
      setAdminError(getFriendlyError(error, "대분류를 추가하지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminSaving(false);
    }
  }

  async function addDetailCost() {
    if (!selectedDetailSubitemId || !newDetailCost.name.trim()) return;

    setAdminSaving(true);
    setAdminError("");
    try {
      const nextSortOrder = detailCosts.length
        ? Math.max(...detailCosts.map((cost) => cost.sort_order ?? 0)) + 1
        : 0;
      const { error } = await supabase.from("detail_cost_categories").insert({
        company_id: requireSelectedCompanyId(),
        subitem_id: selectedDetailSubitemId,
        name: newDetailCost.name.trim(),
        cost: toNumberOrZero(newDetailCost.cost),
        category_type: newDetailCost.category_type,
        sort_order: nextSortOrder,
      });

      if (error) throw error;
      setNewDetailCost({ name: "", cost: "", category_type: "basic" });
      await fetchDetailCosts(selectedDetailSubitemId);
    } catch (error) {
      setAdminError(getFriendlyError(error, "세부비용을 추가하지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminSaving(false);
    }
  }

  function updateLocalDetailCost(costId, patch) {
    setDetailCosts((current) =>
      current.map((cost) => (cost.id === costId ? { ...cost, ...patch } : cost))
    );
  }

  async function updateDetailCost(costId, patch) {
    setAdminError("");
    try {
      const payload = { ...patch };
      if (Object.prototype.hasOwnProperty.call(payload, "name")) {
        payload.name = payload.name.trim();
        if (!payload.name) return fetchDetailCosts(selectedDetailSubitemId);
      }
      if (Object.prototype.hasOwnProperty.call(payload, "cost")) {
        payload.cost = toNumberOrZero(payload.cost);
      }

      const { error } = await supabase
        .from("detail_cost_categories")
        .update(payload)
        .eq("id", costId)
        .eq("company_id", requireSelectedCompanyId());

      if (error) throw error;
      await fetchDetailCosts(selectedDetailSubitemId);
    } catch (error) {
      setAdminError(getFriendlyError(error, "세부비용을 수정하지 못했어요. 다시 시도해주세요."));
      await fetchDetailCosts(selectedDetailSubitemId);
    }
  }

  async function deleteDetailCost(costId) {
    setAdminSaving(true);
    setAdminError("");
    try {
      const { error } = await supabase
        .from("detail_cost_categories")
        .delete()
        .eq("id", costId)
        .eq("company_id", requireSelectedCompanyId());

      if (error) throw error;
      await fetchDetailCosts(selectedDetailSubitemId);
    } catch (error) {
      setAdminError(getFriendlyError(error, "세부비용을 삭제하지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminSaving(false);
    }
  }

  async function addAdminSubitem(itemId) {
    const parent = adminItems.find((item) => item.id === itemId);
    const defaultName = isFlooringThicknessItem(parent) ? "장판 1.8T" : "새 소재";
    const name = window.prompt("새 소재명을 입력하세요.", defaultName);
    if (!name?.trim()) return;
    const nextName = name.trim();
    const parsedNextFlooring = parseFlooringThicknessName(nextName);
    const canonicalNextName = parsedNextFlooring
      ? composeFlooringSubitemName(parsedNextFlooring.baseName, parsedNextFlooring.thickness)
      : nextName;
    const hasDuplicateSubitem = parent?.subitems?.some((subitem) => {
      const parsedExisting = parseFlooringThicknessName(subitem.name);
      const canonicalExisting = parsedExisting
        ? composeFlooringSubitemName(parsedExisting.baseName, parsedExisting.thickness)
        : subitem.name.trim();
      return canonicalExisting === canonicalNextName;
    });
    if (hasDuplicateSubitem) {
      setAdminError("같은 대분류 안에 동일한 소재명이 이미 있습니다.");
      return;
    }

    setAdminSaving(true);
    setAdminError("");
    try {
      if ((parent?.item_type ?? "itemized") === "flat") {
        const { error: typeError } = await supabase
          .from("construction_items")
          .update({ item_type: "itemized" })
          .eq("id", itemId)
          .eq("company_id", requireSelectedCompanyId());
        if (typeError) throw typeError;
      }

      const nextSortOrder = parent?.subitems?.length
        ? Math.max(...parent.subitems.map((subitem) => subitem.sort_order ?? 0)) + 1
        : 0;
      const { error } = await supabase.from("construction_subitems").insert({
        item_id: itemId,
        name: canonicalNextName,
        unit: "평",
        unit_price: 0,
        labor_rate: 0,
        sort_order: nextSortOrder,
      });
      if (error) throw error;
      await fetchAdminItems();
    } catch (error) {
      setAdminError(getFriendlyError(error, "소재를 추가하지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminSaving(false);
    }
  }

  async function deleteAdminItem(itemId) {
    if (!window.confirm("이 시공 항목과 하위 소재를 삭제할까요?")) return;

    setAdminSaving(true);
    setAdminError("");
    try {
      const { error } = await supabase
        .from("construction_items")
        .delete()
        .eq("id", itemId)
        .eq("company_id", requireSelectedCompanyId());
      if (error) throw error;
      await fetchAdminItems();
    } catch (error) {
      setAdminError(getFriendlyError(error, "항목을 삭제하지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminSaving(false);
    }
  }

  async function deleteAdminSubitem(subitemId) {
    if (isLocalSubitemId(subitemId)) {
      setAdminItems((current) =>
        current.map((item) => ({
          ...item,
          subitems: item.subitems.filter((subitem) => subitem.id !== subitemId),
        }))
      );
      return;
    }
    if (!hasCurrentCompanySubitem(subitemId)) return;

    setAdminSaving(true);
    setAdminError("");
    try {
      const { error } = await supabase.from("construction_subitems").delete().eq("id", subitemId);
      if (error) throw error;
      await fetchAdminItems();
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
      const { error } = await supabase
        .from("construction_items")
        .update({ is_favorite: !item.is_favorite })
        .eq("id", item.id)
        .eq("company_id", requireSelectedCompanyId());
      if (error) throw error;
      await fetchAdminItems();
    } catch (error) {
      setAdminError(getFriendlyError(error, "즐겨찾기를 변경하지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminSaving(false);
    }
  }

  async function renameAdminItem(itemId, name) {
    const nextName = name.trim();
    if (!nextName) return fetchAdminItems();
    const currentItem = adminItems.find((item) => item.id === itemId);

    setAdminError("");
    try {
      const { error } = await supabase
        .from("construction_items")
        .update({ name: nextName })
        .eq("id", itemId)
        .eq("company_id", requireSelectedCompanyId());
      if (error) throw error;
      if ((currentItem?.item_type ?? "itemized") === "flat" && currentItem?.subitems?.[0]) {
        const { error: subitemError } = await supabase
          .from("construction_subitems")
          .update({ name: nextName })
          .eq("id", currentItem.subitems[0].id);
        if (subitemError) throw subitemError;
      }
      setAdminItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                name: nextName,
                subitems:
                  (item.item_type ?? "itemized") === "flat"
                    ? item.subitems.map((subitem, index) =>
                        index === 0 ? { ...subitem, name: nextName } : subitem
                      )
                    : item.subitems,
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

    setAdminError("");
    try {
      const { error } = await supabase
        .from("construction_subitems")
        .update({ name: nextName })
        .eq("id", subitemId);
      if (error) throw error;
      setAdminItems((current) =>
        current.map((item) => ({
          ...item,
          subitems: item.subitems.map((subitem) =>
            subitem.id === subitemId
              ? { ...subitem, name: nextName, option_value: getTemplateOptionValue({ name: nextName }) }
              : subitem
          ),
        }))
      );
    } catch (error) {
      setAdminError(getFriendlyError(error, "소재명을 수정하지 못했어요. 다시 시도해주세요."));
      await fetchAdminItems();
    }
  }

  async function updateAdminSubitemUnit(subitemId, unit) {
    if (isLocalSubitemId(subitemId)) {
      updateLocalSubitemPrice(subitemId, { unit });
      return;
    }
    if (!hasCurrentCompanySubitem(subitemId)) return;

    setAdminError("");
    try {
      const { error } = await supabase
        .from("construction_subitems")
        .update({ unit })
        .eq("id", subitemId);
      if (error) throw error;
      setAdminItems((current) =>
        current.map((item) => ({
          ...item,
          subitems: item.subitems.map((subitem) =>
            subitem.id === subitemId ? { ...subitem, unit } : subitem
          ),
        }))
      );
    } catch (error) {
      setAdminError(getFriendlyError(error, "단위를 수정하지 못했어요. 다시 시도해주세요."));
      await fetchAdminItems();
    }
  }

  async function reorderAdminItems(dropItemId) {
    if (!dragItemId || dragItemId === dropItemId) return;

    const fromIndex = adminItems.findIndex((item) => item.id === dragItemId);
    const toIndex = adminItems.findIndex((item) => item.id === dropItemId);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextItems = [...adminItems];
    const [moved] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, moved);
    const reordered = nextItems.map((item, index) => ({ ...item, sort_order: index }));
    setAdminItems(reordered);
    setDragItemId("");

    setAdminSaving(true);
    setAdminError("");
    try {
      await Promise.all(
        reordered.map((item) =>
          supabase
            .from("construction_items")
            .update({ sort_order: item.sort_order })
            .eq("id", item.id)
            .eq("company_id", requireSelectedCompanyId())
        )
      ).then((results) => {
        const failed = results.find((result) => result.error);
        if (failed?.error) throw failed.error;
      });
      await fetchAdminItems();
    } catch (error) {
      setAdminError(getFriendlyError(error, "항목 순서를 저장하지 못했어요. 다시 시도해주세요."));
      await fetchAdminItems();
    } finally {
      setAdminSaving(false);
    }
  }

  async function reorderAdminSubitems(itemId, dropSubitemId) {
    if (!dragSubitem || dragSubitem.itemId !== itemId || dragSubitem.subitemId === dropSubitemId) return;

    const parent = adminItems.find((item) => item.id === itemId);
    const fromIndex = parent?.subitems.findIndex((subitem) => subitem.id === dragSubitem.subitemId) ?? -1;
    const toIndex = parent?.subitems.findIndex((subitem) => subitem.id === dropSubitemId) ?? -1;
    if (!parent || fromIndex < 0 || toIndex < 0) return;

    const nextSubitems = [...parent.subitems];
    const [moved] = nextSubitems.splice(fromIndex, 1);
    nextSubitems.splice(toIndex, 0, moved);
    const reorderedSubitems = nextSubitems.map((subitem, index) => ({ ...subitem, sort_order: index }));

    setAdminItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, subitems: reorderedSubitems } : item))
    );
    setDragSubitem(null);

    setAdminSaving(true);
    setAdminError("");
    try {
      await Promise.all(
        reorderedSubitems.map((subitem) =>
          supabase
            .from("construction_subitems")
            .update({ sort_order: subitem.sort_order })
            .eq("id", subitem.id)
        )
      ).then((results) => {
        const failed = results.find((result) => result.error);
        if (failed?.error) throw failed.error;
      });
      await fetchAdminItems();
    } catch (error) {
      setAdminError(getFriendlyError(error, "소재 순서를 저장하지 못했어요. 다시 시도해주세요."));
      await fetchAdminItems();
    } finally {
      setAdminSaving(false);
    }
  }

  function updateLocalPrice(itemId, patch) {
    setAdminItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
    );
  }

  function updateLocalSubitemPrice(subitemId, patch) {
    setAdminItems((current) =>
      current.map((item) => ({
        ...item,
        subitems: item.subitems.map((subitem) =>
          subitem.id === subitemId ? { ...subitem, ...patch } : subitem
        ),
      }))
    );
  }

  function updateWallpaperBulkInput(itemId, patch) {
    setWallpaperBulkInputs((current) => ({
      ...current,
      [itemId]: {
        quantity: "",
        labor_count: "",
        ...(current[itemId] ?? {}),
        ...patch,
      },
    }));
  }

  function applyWallpaperBulkInput(itemId) {
    const bulkInput = wallpaperBulkInputs[itemId] ?? {};
    const hasQuantity = `${bulkInput.quantity ?? ""}`.trim() !== "";
    const hasLaborCount = `${bulkInput.labor_count ?? ""}`.trim() !== "";
    if (!hasQuantity && !hasLaborCount) {
      setAdminError("도배 일괄 적용할 수량 또는 인원을 입력하세요.");
      return;
    }

    setAdminItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          subitems: item.subitems.map((subitem) => ({
            ...subitem,
            ...(hasQuantity && `${subitem.quantity ?? ""}`.trim() === ""
              ? { quantity: bulkInput.quantity }
              : {}),
            ...(hasLaborCount && `${subitem.labor_count ?? ""}`.trim() === ""
              ? { labor_count: bulkInput.labor_count }
              : {}),
          })),
        };
      })
    );
    setAdminError("");
    setAdminNotice("도배 하위 소재의 빈 수량/인원에 일괄값을 적용했습니다. 저장 버튼을 눌러 반영하세요.");
  }

  async function saveAdminPrices() {
    setAdminSaving(true);
    setAdminError("");
    try {
      const companyId = requireSelectedCompanyId();
      const adminSubitems = adminItems.flatMap((item) => item.subitems ?? []);
      const isCommonPriceSave = page === "admin-prices";

      if (isCommonPriceSave) {
        const existingSubitems = adminSubitems.filter((subitem) => !isLocalSubitemId(subitem.id));
        const localSubitems = adminSubitems.filter((subitem) => isLocalSubitemId(subitem.id));

        if (existingSubitems.length) {
          await Promise.all(
            existingSubitems.map((subitem) =>
              supabase
                .from("construction_subitems")
                .update({
                  unit: subitem.unit ?? "평",
                  unit_price: toNonNegativeNumberOrZero(subitem.unit_price),
                  labor_rate: toNonNegativeNumberOrZero(subitem.labor_rate),
                })
                .eq("id", subitem.id)
            )
          ).then((results) => {
            const failed = results.find((result) => result.error);
            if (failed?.error) throw failed.error;
          });
        }

        if (localSubitems.length) {
          const { error: insertError } = await supabase
            .from("construction_subitems")
            .insert(
              localSubitems.map((subitem) => ({
                item_id: subitem.item_id,
                name: getCanonicalFlooringSubitemName(subitem.name),
                unit: subitem.unit ?? "평",
                unit_price: toNonNegativeNumberOrZero(subitem.unit_price),
                labor_rate: toNonNegativeNumberOrZero(subitem.labor_rate),
                sort_order: subitem.sort_order ?? 0,
              }))
            );
          if (insertError) throw insertError;
        }

        const savedAt = new Date().toISOString();
        setAdminCommonPriceSavedAt(savedAt);
        setAdminNotice("공통 단가/인건비를 저장했습니다.");
        await fetchAdminItems({ mode: "prices" });
        return;
      }

      const adminTemplateCondition = getAdminTemplateCondition();
      if (!adminTemplateCondition) {
        throw new Error("저장할 평수와 주택 유형을 먼저 선택하세요.");
      }

      let templateRow = await fetchTemplateRowByCondition(companyId, adminTemplateCondition);
      if (templateRow?.id) {
        const { data: updatedTemplate, error: updateTemplateError } = await supabase
          .from("admin_condition_templates")
          .update(adminTemplateCondition)
          .eq("id", templateRow.id)
          .select("id")
          .single();
        if (updateTemplateError) throw updateTemplateError;
        templateRow = updatedTemplate;
      } else {
        const { data: insertedTemplate, error: insertTemplateError } = await supabase
          .from("admin_condition_templates")
          .insert({
            company_id: companyId,
            ...adminTemplateCondition,
          })
          .select("id")
          .single();
        if (insertTemplateError) throw insertTemplateError;
        templateRow = insertedTemplate;
      }

      const templateValuePayloads = adminSubitems.map((subitem) => ({
        template_id: templateRow.id,
        item_id: subitem.item_id,
        subitem_id: subitem.id,
        option_value: subitem.option_value ?? getTemplateOptionValue(subitem),
        quantity: toNullableNumber(subitem.quantity),
        labor_count: toNullableNumber(subitem.labor_count),
      }));

      if (templateValuePayloads.length) {
        const { error: valuesError } = await supabase
          .from("admin_condition_template_values")
          .upsert(templateValuePayloads, { onConflict: "template_id,subitem_id,option_value" });
        if (valuesError) throw valuesError;
      }

      setCurrentAdminTemplateId("");
      setAdminConditionLoaded(false);
      setAdminConditionStep("select");
      setAdminNotice("현재 조건의 수량/인원을 저장했습니다.");
      await fetchAdminTemplateList();
    } catch (error) {
      setAdminError(getFriendlyError(error, "시공 항목 값을 저장하지 못했어요. 다시 시도해주세요."));
    } finally {
      setAdminSaving(false);
    }
  }

  async function saveEstimateToSupabase() {
    setEstimateSaving(true);
    setEstimateError("");
    setEstimateNotice("");
    try {
      if (!isSupabaseConfigured) {
        throw new Error(".env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해야 합니다.");
      }
      if (!selectedRows.length) {
        throw new Error("견적서에 포함할 소재를 하나 이상 선택하세요.");
      }
      const companyId = requireSelectedCompanyId();

      const dbCondition = toDbCondition(condition, companyId);
      const conditionSnapshot = {
        ...dbCondition,
        summary: conditionSummary,
        condition_pyeong: toNumberOrZero(condition.size),
        estimate_pyeong: toNumberOrZero(estimatePyeong || condition.size),
      };
      const itemsData = {
        items: selectedRows,
        adjustments: cleanEstimateAdjustments,
        siteMemo: siteMemo.trim(),
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
        adjustmentTotal,
        finalTotal: total,
      };

      const { error: estimateError } = await supabase.from("estimates").insert({
        company_id: companyId,
        address,
        construction_date: workDate || null,
        condition_id: null,
        condition_snapshot: conditionSnapshot,
        items_data: itemsData,
        total_amount: total,
      });

      if (estimateError) throw estimateError;

      setEstimateNotice("저장되었습니다.");
      setPage("preview");
    } catch (error) {
      setEstimateError(getFriendlyError(error, "견적서를 저장하지 못했어요. 다시 시도해주세요."));
    } finally {
      setEstimateSaving(false);
    }
  }

  async function downloadEstimatePdf() {
    if (!previewPdfRef.current) return;

    setEstimateError("");
    try {
      const canvas = await html2canvas(previewPdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor:
          getComputedStyle(document.documentElement).getPropertyValue("--bg-surface").trim(),
      });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const renderWidth = pageWidth - margin * 2;
      const renderHeight = (canvas.height * renderWidth) / canvas.width;

      let remainingHeight = renderHeight;
      let position = margin;
      pdf.addImage(imageData, "PNG", margin, position, renderWidth, renderHeight);
      remainingHeight -= pageHeight - margin * 2;

      while (remainingHeight > 0) {
        position = remainingHeight - renderHeight + margin;
        pdf.addPage();
        pdf.addImage(imageData, "PNG", margin, position, renderWidth, renderHeight);
        remainingHeight -= pageHeight - margin * 2;
      }

      const safeCompany = sanitizeFileNamePart(selectedCompanyName, "업체명");
      const safeTarget = sanitizeFileNamePart(customerName || address, "고객정보");
      pdf.save(`견적서_${safeCompany}_${safeTarget}_${estimateIssuedAt}.pdf`);
    } catch (error) {
      setEstimateError(getFriendlyError(error, "PDF를 다운로드하지 못했어요. 다시 시도해주세요."));
    }
  }

  if (companySession.checking) {
    return (
      <div className="app-shell login-shell">
        <style>{styles}</style>
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
      <div className="app-shell login-shell">
        <style>{styles}</style>
        <section className="login-card">
          <div className="login-brand">
            <img src={logoUrl} alt="" />
            <strong>FORMATE</strong>
          </div>
          <div>
            <p className="eyebrow dark">Internal Test</p>
            <h1>FORMATE 업체 로그인</h1>
            <p className="login-helper">테스트용 계정은 관리자에게 문의하세요.</p>
          </div>
          <form className="login-form" onSubmit={handleCompanyLogin}>
            <label>
              업체 코드
              <input
                value={loginCode}
                onChange={(event) => setLoginCode(event.target.value)}
                autoComplete="username"
                placeholder="예: dad"
              />
            </label>
            <label>
              비밀번호
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="비밀번호"
              />
            </label>
            {loginError && <div className="error-box">{loginError}</div>}
            <button className="primary-button" type="submit" disabled={loginLoading}>
              {loginLoading ? "확인 중..." : "입장하기"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <style>{styles}</style>

      {page !== "landing" && (
        <header className={`global-header ${isConditionQuantityAdminPage && adminVerified && adminConditionStep === "edit" ? "with-admin-condition" : ""}`.trim()}>
          <button className="global-brand" onClick={resetFlow} aria-label="FORMATE 홈으로 이동">
            <img src={logoUrl} alt="" />
            <strong>FORMATE</strong>
          </button>
          {isConditionQuantityAdminPage && adminVerified && adminConditionStep === "edit" && (
            <div className={`header-admin-condition ${canEditConditionQuantities ? "active" : ""}`.trim()} aria-live="polite">
              <span>현재 관리 중</span>
              <strong>
                {canEditConditionQuantities && currentAdminConditionLabel
                  ? `현재 관리 중: ${currentAdminConditionLabel}`
                  : "현재 관리 중인 조건 없음"}
              </strong>
            </div>
          )}
          <div className="company-session">
            <span>현재 업체: {selectedCompanyName}</span>
            <button type="button" className="company-switch-button" onClick={handleChangeCompany}>
              업체 변경
            </button>
          </div>
        </header>
      )}

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

      {conditionSummary && page !== "landing" && page !== "ready" && page !== "items" && !page.startsWith("admin") && (
        <div className="sticky-summary">
          <span>견적 조건</span>
          <strong>{conditionSummary}</strong>
        </div>
      )}

      {page === "landing" && (
        <main className="landing">
          <section className="hero">
            <div className="hero-copy">
              <div className="landing-session-bar">
                <button className="hero-brand" onClick={resetFlow} aria-label="FORMATE 홈으로 이동">
                  <img src={logoUrl} alt="" />
                  <strong>FORMATE</strong>
                </button>
                <span className="landing-company-greeting">{selectedCompanyName}님 반갑습니다.</span>
                <button type="button" className="company-switch-button" onClick={handleChangeCompany}>
                  업체 변경
                </button>
              </div>
              <h1>
                우리 업체 단가표로 빠르게 만드는
                <span>인테리어 견적서</span>
              </h1>
              <p>
                확장형·구형 세부 유형에 따라 달라지는 시공 항목과 기준을 템플릿으로 저장하고,
                반복되는 견적 업무를 엑셀보다 빠르게 처리하세요.
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

          <section className="landing-actions">
            <div className="section-heading">
              <h2>바로 시작하기</h2>
            </div>
            <div className="primary-action-grid">
              <button className="menu-card feature-card" onClick={() => setPage("condition")}>
                <ClipboardList />
                <span>신규 견적서 만들기</span>
                <p>저장된 기준표를 바탕으로 고객 조건에 맞는 견적서를 빠르게 만듭니다.</p>
                <strong>바로 시작하기</strong>
              </button>
              <button className="menu-card feature-card" onClick={() => openAdminGate("admin")}>
                <Settings />
                <span>조건별 수량/인원 관리</span>
                <p>공통 단가/인건비와 조건별 수량/인원 기준을 관리합니다.</p>
                <strong>기준표 관리하기</strong>
              </button>
            </div>
            <div className="secondary-action-grid">
              <button className="menu-card support-card" onClick={() => setPage("ready")}>
                <CalendarDays />
                <span>상담/공사 메모</span>
                <p>고객 상담 내용과 공사 관련 메모를 정리합니다.</p>
              </button>
              <button className="menu-card support-card" onClick={() => setPage("admin-estimates")}>
                <Wrench />
                <span>저장된 견적서</span>
                <p>작성한 견적서를 다시 확인하고 고객 문의에 이어서 대응합니다.</p>
              </button>
            </div>
          </section>
        </main>
      )}

      {page === "admin" && adminVerified && (
        <main className="panel-page">
          <button className="ghost" onClick={() => setPage("landing")}>
            <ArrowLeft size={18} /> 돌아가기
          </button>
          <section className="panel">
            <p className="eyebrow dark">FORMATE 관리</p>
            <h2>관리자 홈</h2>
            <p className="muted">
              공통 단가/인건비와 조건별 수량/인원을 분리해서 관리합니다.
            </p>
            <p className="muted">
              이 화면은 고객에게 보여주는 견적서가 아니라, 우리 업체 내부 기준을 설정하는 공간입니다.
            </p>
            <div className="admin-menu">
              <button
                className="menu-card"
                onClick={() => {
                  setPage("admin-prices");
                  fetchAdminItems({ mode: "prices" });
                }}
              >
                <ClipboardList />
                <span>공통 단가/인건비 관리</span>
                <p>모든 평수와 주택 조건에 공통 적용되는 소재별 단가와 인건비를 관리합니다.</p>
              </button>
              <button
                className="menu-card"
                onClick={() => {
                  setPage("admin-items");
                  setAdminConditionStep("select");
                  setAdminConditionLoaded(false);
                  fetchAdminItems({ mode: "condition", condition: null });
                }}
              >
                <ClipboardList />
                <span>조건별 수량/인원 관리</span>
                <p>평수와 주택 조건별로 필요한 수량과 인원을 관리합니다.</p>
              </button>
              <button className="menu-card" onClick={() => setPage("admin-detail-costs")}>
                <FileText />
                <span>세부견적 관리</span>
                <p>세부 견적 항목과 기준을 관리합니다.</p>
              </button>
            </div>
          </section>
        </main>
      )}

      {page === "admin-condition-labels" && adminVerified && (
        <main className="panel-page admin-page">
          <div className="editor-header">
            <div>
              <button className="ghost" onClick={() => setPage("admin-items")}>
                <ArrowLeft size={18} /> 조건별 수량/인원 관리
              </button>
              <h2>확장형/구형 설명 관리</h2>
              <p className="muted caption">
                조건 key는 확장형1, 구형2처럼 유지하고, 업체 내부에서 이해하기 쉬운 설명만 표시용으로 저장합니다.
              </p>
            </div>
            <div className="admin-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={adminLoading || adminSaving}
                onClick={() => fetchConditionVariantLabels()}
              >
                <RefreshCcw size={18} /> 되돌리기
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={adminLoading || adminSaving}
                onClick={saveConditionVariantLabels}
              >
                <Save size={18} /> 저장
              </button>
            </div>
          </div>

          {adminLoading && <div className="status-box">불러오는 중...</div>}
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
                  <label>
                    표시 이름
                    <input
                      value={row.label}
                      onChange={(event) => updateConditionVariantLabel(row.variant_key, { label: event.target.value })}
                      placeholder={row.variant_key === OLD_NO_EXTENSION_VARIANT ? "예: 확장 없음" : "예: 거실 + 주방 확장"}
                    />
                  </label>
                  <label>
                    상세 설명
                    <input
                      value={row.description}
                      onChange={(event) => updateConditionVariantLabel(row.variant_key, { description: event.target.value })}
                      placeholder="선택 기준이나 내부 메모"
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {page === "ready" && (
        <main className="simple-page">
          <button className="ghost" onClick={() => setPage("landing")}>
            <ArrowLeft size={18} /> 돌아가기
          </button>
          <div className="empty-state">
            <Building2 size={42} />
            <h2>준비 중입니다</h2>
            <p>현재 프로토타입에서는 신규 견적서 입력 흐름만 확인할 수 있습니다.</p>
          </div>
        </main>
      )}

      {page === "condition" && (
        <main className="panel-page condition-page">
          <section className="panel condition-builder-panel">
            <div className="editor-header condition-builder-header">
              <div>
                <p className="eyebrow dark">신규 견적서 작성</p>
                <h2>견적 조건 선택</h2>
                <p className="muted caption">
                  평수와 주택 조건을 한 화면에서 선택한 뒤 견적을 시작하세요.
                </p>
              </div>
              <button className="ghost" onClick={resetFlow}>
                <ArrowLeft size={18} /> 이전
              </button>
            </div>

            <div className={`estimate-current-condition ${canGoNext() ? "active" : ""}`.trim()}>
              <span>현재 기준</span>
              <strong>
                {conditionChips.length > 0 ? conditionChips.join(" · ") : "조건을 선택하세요."}
              </strong>
              <p>
                빈집/살림집은 견적서 정보에만 남고, 조건별 수량/인원 기준 조회에는 포함하지 않습니다.
              </p>
            </div>

            <div className="condition-static-grid">
              <div className="condition-static-field">
                <p className="field-label">평수 선택</p>
                <div className="custom-select">
                  <button
                    type="button"
                    className={`custom-select-trigger ${pyeongDropdownOpen ? "open" : ""}`.trim()}
                    onClick={() => setPyeongDropdownOpen((current) => !current)}
                    aria-expanded={pyeongDropdownOpen}
                  >
                    <span>{condition.size ? `${condition.size}평` : "평수 선택"}</span>
                    <span aria-hidden="true">⌄</span>
                  </button>
                  {pyeongDropdownOpen &&
                    renderPyeongDropdownMenu(condition.size, (value) => {
                      updateCondition({ size: value });
                      setPyeongDropdownOpen(false);
                    })}
                </div>
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
                  <p className="field-label">확장형 세부 유형</p>
                  <div className="chips">
                    {EXTENDED_VARIANTS.map((variant) => (
                      <button
                        key={variant}
                        type="button"
                        className={`condition-variant-option ${getConditionVariant(condition) === variant ? "selected" : ""}`.trim()}
                        onClick={() => updateCondition({ conditionVariant: variant })}
                      >
                        <span>{variant}</span>
                        {getConditionVariantLabel(variant, conditionVariantLabelMap) && (
                          <small>{getConditionVariantLabel(variant, conditionVariantLabelMap)}</small>
                        )}
                      </button>
                    ))}
                  </div>
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
                    <p className="field-label">구형 세부 유형</p>
                    {condition.expanded ? (
                      <div className="chips">
                        {OLD_EXTENDED_VARIANTS.map((variant) => (
                          <button
                            key={variant}
                            type="button"
                            className={`condition-variant-option ${getConditionVariant(condition) === variant ? "selected" : ""}`.trim()}
                            onClick={() => updateCondition({ conditionVariant: variant })}
                          >
                            <span>{variant}</span>
                            {getConditionVariantLabel(variant, conditionVariantLabelMap) && (
                              <small>{getConditionVariantLabel(variant, conditionVariantLabelMap)}</small>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="condition-static-note">
                        확장 없음은 <strong>{formatConditionVariantLabel(OLD_NO_EXTENSION_VARIANT, conditionVariantLabelMap)}</strong> 기준으로 불러옵니다.
                      </div>
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
              <p className="muted caption">
                {canGoNext()
                  ? "견적 시작을 누르면 공통 단가/인건비와 선택 조건의 수량/인원을 합쳐 초안을 만듭니다."
                  : "평수, 주택 유형, 세부 유형, 거주 상태를 모두 선택하면 견적을 시작할 수 있습니다."}
              </p>
              <button className="primary-button" disabled={!canGoNext() || estimateLoading} onClick={goNext}>
                {estimateLoading ? "템플릿 불러오는 중..." : "견적 시작"}
              </button>
            </div>
          </section>
        </main>
      )}

      {page === "items" && (
        <main className="workspace">
          <section className="estimate-selected-condition-panel">
            <div>
              <span>현재 기준</span>
              <strong>{conditionChips.length > 0 ? conditionChips.join(" · ") : "조건 미선택"}</strong>
              <p>공통 단가/인건비와 선택 조건의 수량/인원을 합쳐 견적 초안을 만들었습니다.</p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setPage("condition");
                setStep(1);
              }}
            >
              조건 다시 선택
            </button>
          </section>
          <section className="category-column">
            <h2>시공 항목 선택</h2>
            <p className="muted caption">
              선택한 조건에 맞는 우리 업체 기준표를 불러왔습니다. 이번 문의에 맞게 수량과 단가를 조정할 수 있습니다.
            </p>
            {conditionChips.length > 0 && (
              <div className="condition-chip-group" aria-label="현재 견적 조건">
                {conditionChips.map((chip) => (
                  <span key={chip}>{chip}</span>
                ))}
              </div>
            )}
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
                    onChange={(event) => setEstimatePyeong(event.target.value)}
                  />
                  <span>평</span>
                </label>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!estimatePyeong}
                  onClick={applyEstimatePyeongToPyeongUnits}
                >
                  평 단위 수량에 적용
                </button>
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
                  {condition.size ? `${condition.size}평 기준표` : "조건별 기준표"}
                </p>
              </div>
              <button className="secondary-button" onClick={() => setPage("preview")}>
                견적서 미리보기
              </button>
            </div>

            <div className="material-list">
              {(items[openCategory] ?? []).map((row, index) => (
                <div
                  className={`estimate-template-row ${!row.hasTemplateValue ? "missing-template" : ""} ${row.expanded ? "expanded" : ""} ${row.selected ? "selected" : ""}`.trim()}
                  key={`${row.subitemId ?? row.material}-${index}`}
                >
                  <div className="estimate-template-main">
                    <label className="material-check">
                      <input
                        type="checkbox"
                        checked={Boolean(row.selected)}
                        onChange={(event) => updateItem(openCategory, index, { selected: event.target.checked })}
                      />
                      <strong>{row.itemType === "flat" ? row.itemName : row.material}</strong>
                    </label>
                    <div className="estimate-row-actions">
                      <span className="estimate-row-total-preview">
                        <PriceText value={row.totalAmount} size="sm" />
                      </span>
                      <div className="estimate-row-badges">
                        {isEstimateRowModified(row) && <span className="modified-badge">수정됨</span>}
                        {row.selected && <span className="selected-badge">포함</span>}
                      </div>
                      <button
                        type="button"
                        className="estimate-expand-toggle"
                        aria-label={`${row.itemType === "flat" ? row.itemName : row.material} 세부 수정 ${row.expanded ? "닫기" : "열기"}`}
                        onClick={() => updateItem(openCategory, index, { expanded: !row.expanded })}
                      >
                        {row.expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="estimate-template-expand">
                    <div className="estimate-template-expanded-content">
                      {!row.hasTemplateValue && (
                        <p className="muted template-missing">
                          아직 이 조건의 수량/인원 기준이 없습니다. 이번 견적에서 직접 입력해 사용할 수 있습니다.
                        </p>
                      )}
                        <div className="estimate-template-detail">
                          {row.thicknessOptions?.length > 0 && (
                            <div className="thickness-field">
                              <span>규격/두께</span>
                              <label className="estimate-draft-field">
                                <select
                                  value={row.selectedThickness ?? DEFAULT_FLOORING_SPEC}
                                  onChange={(event) =>
                                    updateItem(openCategory, index, { selectedThickness: event.target.value })
                                  }
                                >
                                  {row.thicknessOptions.map((option) => (
                                    <option key={option.thickness} value={option.thickness}>
                                      {option.label ?? formatFlooringThickness(option.thickness)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          )}
                          <div>
                            <span>수량</span>
                            <label className="estimate-draft-field">
                              <input
                                type="number"
                                min="0"
                                value={row.quantity ?? ""}
                                onChange={(event) =>
                                  updateItem(openCategory, index, { quantity: event.target.value })
                                }
                              />
                              <em>{row.unit}</em>
                            </label>
                          </div>
                          <div>
                            <span>가격</span>
                            <label className="estimate-draft-field">
                              <input
                                type="number"
                                min="0"
                                value={row.unitPrice ?? ""}
                                onChange={(event) =>
                                  updateItem(openCategory, index, { unitPrice: event.target.value })
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
                                type="number"
                                min="0"
                                value={row.laborRate ?? ""}
                                onChange={(event) =>
                                  updateItem(openCategory, index, { laborRate: event.target.value })
                                }
                              />
                              <em>원</em>
                            </label>
                          </div>
                        </div>

                        <div className="estimate-template-total">
                          <span>이 항목 총액</span>
                          <PriceText value={row.totalAmount} size="md" />
                        </div>
                      </div>
                  </div>
                </div>
              ))}
              {!estimateLoading && openCategory && !(items[openCategory] ?? []).length && (
                <p className="muted">이 항목에 등록된 소재가 없습니다.</p>
              )}
            </div>

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
                        value={adjustment.label}
                        onChange={(event) =>
                          updateEstimateAdjustment(adjustment.id, { label: event.target.value })
                        }
                        placeholder="예: 폐기물 추가"
                      />
                      <select
                        value={adjustment.type}
                        onChange={(event) =>
                          updateEstimateAdjustment(adjustment.id, { type: event.target.value })
                        }
                      >
                        <option value="charge">추가금</option>
                        <option value="discount">할인</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={adjustment.amount}
                        onChange={(event) =>
                          updateEstimateAdjustment(adjustment.id, { amount: event.target.value })
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

            <div className="site-memo-panel">
              <label>
                현장 메모
                <textarea
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
          </section>
        </main>
      )}

      {(isCommonPriceAdminPage || isConditionQuantityAdminPage) && adminVerified && (
        <main className="panel-page admin-page">
          <div className="editor-header">
            <div>
              <button
                className="ghost"
                onClick={() => {
                  if (showAdminConditionEditor) {
                    returnToAdminConditionSelect();
                    return;
                  }
                  setPage("admin");
                }}
              >
                <ArrowLeft size={18} /> {showAdminConditionEditor ? "되돌리기" : "관리자 홈"}
              </button>
              <h2>{isCommonPriceAdminPage ? "공통 단가/인건비 관리" : "조건별 수량/인원 관리"}</h2>
              <p className="muted caption">
                {isCommonPriceAdminPage
                  ? "단가와 인건비는 모든 평수와 주택 유형에 공통 적용됩니다."
                  : "평수와 주택 조건별로 필요한 수량과 인원을 관리합니다."}
              </p>
            </div>
            <div className="admin-actions">
              {isCommonPriceAdminPage && (
              <button
                className="secondary-button"
                disabled={adminLoading || adminSaving}
                onClick={() => fetchAdminItems({ mode: "prices" })}
              >
                <RefreshCcw size={18} /> 되돌리기
              </button>
              )}
              {(isCommonPriceAdminPage || showAdminConditionEditor) && (
              <button
                className="primary-button"
                disabled={adminLoading || adminSaving || (isConditionQuantityAdminPage && !canEditConditionQuantities)}
                onClick={saveAdminPrices}
              >
                <Save size={18} /> 저장
              </button>
              )}
              {isCommonPriceAdminPage && (
                <button className="primary-button" disabled={adminLoading || adminSaving} onClick={addAdminItem}>
                  <Plus size={18} /> 대분류 추가
                </button>
              )}
            </div>
          </div>

          {isCommonPriceAdminPage && (
            <section className="template-list-panel">
              <div>
                <strong>공통 단가/인건비 기준</strong>
                <span>소재명, 규격, 단위, 단가, 인건비만 관리합니다. 수량과 인원은 수량/인원 관리에서 입력합니다.</span>
                <span>마지막 업데이트: {adminCommonPriceSavedLabel || "확인된 저장 시각 없음"}</span>
              </div>
            </section>
          )}

          {showAdminConditionSelect && (
          <section className="admin-pyeong-panel">
            <div className="admin-condition-title">
              <div>
                <strong>조건 선택</strong>
                <span>단가/인건비는 모든 조건에 공통 적용되고, 수량/인원은 선택한 평수와 주택 조건별로 저장됩니다.</span>
              </div>
              <button
                type="button"
                className="secondary-button condition-label-link"
                disabled={adminLoading || adminSaving}
                onClick={() => {
                  setPage("admin-condition-labels");
                  fetchConditionVariantLabels();
                }}
              >
                명칭 변경
              </button>
            </div>
            <label>
              평수 선택
              <div className="custom-select admin-pyeong-select">
                <button
                  type="button"
                  className={`custom-select-trigger ${adminPyeongDropdownOpen ? "open" : ""}`.trim()}
                  onClick={() => setAdminPyeongDropdownOpen((current) => !current)}
                  aria-expanded={adminPyeongDropdownOpen}
                >
                  <span>{selectedAdminPyeong ? `${selectedAdminPyeong}평` : "관리할 평수 선택"}</span>
                  <span aria-hidden="true">⌄</span>
                </button>
                {adminPyeongDropdownOpen &&
                  renderPyeongDropdownMenu(selectedAdminPyeong, (value) => {
                    setSelectedAdminPyeong(value);
                    setAdminConditionLoaded(false);
                    setCurrentAdminTemplateId("");
                    setAdminPyeongDropdownOpen(false);
                  })}
              </div>
            </label>
            <label>
              주택 유형
              <div className="segmented admin-condition-toggle">
                <button
                  type="button"
                  className={selectedAdminBuildType === "new" ? "selected" : ""}
                  onClick={() => {
                    setSelectedAdminBuildType("new");
                    setSelectedAdminHasExtension(false);
                    setSelectedAdminConditionVariant("확장형1");
                    setAdminConditionLoaded(false);
                    setCurrentAdminTemplateId("");
                  }}
                >
                  확장형
                </button>
                <button
                  type="button"
                  className={selectedAdminBuildType === "old" ? "selected" : ""}
                  onClick={() => {
                    setSelectedAdminBuildType("old");
                    setSelectedAdminHasExtension(false);
                    setSelectedAdminConditionVariant(OLD_NO_EXTENSION_VARIANT);
                    setAdminConditionLoaded(false);
                    setCurrentAdminTemplateId("");
                  }}
                >
                  구형
                </button>
              </div>
            </label>
            {selectedAdminBuildType === "new" && (
              <label>
                확장형 세부 유형
                <div className="chips">
                  {EXTENDED_VARIANTS.map((variant) => (
                    <button
                      key={variant}
                      type="button"
                      className={`condition-variant-option ${normalizeConditionVariant("new", false, selectedAdminConditionVariant) === variant ? "selected" : ""}`.trim()}
                      onClick={() => {
                        setSelectedAdminConditionVariant(variant);
                        setAdminConditionLoaded(false);
                        setCurrentAdminTemplateId("");
                      }}
                    >
                      <span>{variant}</span>
                      {getConditionVariantLabel(variant, conditionVariantLabelMap) && (
                        <small>{getConditionVariantLabel(variant, conditionVariantLabelMap)}</small>
                      )}
                    </button>
                  ))}
                </div>
              </label>
            )}
            {selectedAdminBuildType === "old" && (
              <label>
                확장 여부
                <div className="segmented admin-condition-toggle">
                  <button
                    type="button"
                    className={!selectedAdminHasExtension ? "selected" : ""}
                    onClick={() => {
                      setSelectedAdminHasExtension(false);
                      setSelectedAdminConditionVariant(OLD_NO_EXTENSION_VARIANT);
                      setAdminConditionLoaded(false);
                      setCurrentAdminTemplateId("");
                    }}
                  >
                    확장 없음
                  </button>
                  <button
                    type="button"
                    className={selectedAdminHasExtension ? "selected" : ""}
                    onClick={() => {
                      setSelectedAdminHasExtension(true);
                      setSelectedAdminConditionVariant(
                        OLD_EXTENDED_VARIANTS.includes(selectedAdminConditionVariant)
                          ? selectedAdminConditionVariant
                          : "구형1"
                      );
                      setAdminConditionLoaded(false);
                      setCurrentAdminTemplateId("");
                    }}
                  >
                    확장 있음
                  </button>
                </div>
              </label>
            )}
            {selectedAdminBuildType === "old" && selectedAdminHasExtension && (
              <label>
                구형 세부 유형
                <div className="chips">
                  {OLD_EXTENDED_VARIANTS.map((variant) => (
                    <button
                      key={variant}
                      type="button"
                      className={`condition-variant-option ${normalizeConditionVariant("old", true, selectedAdminConditionVariant) === variant ? "selected" : ""}`.trim()}
                      onClick={() => {
                        setSelectedAdminConditionVariant(variant);
                        setAdminConditionLoaded(false);
                        setCurrentAdminTemplateId("");
                      }}
                    >
                      <span>{variant}</span>
                      {getConditionVariantLabel(variant, conditionVariantLabelMap) && (
                        <small>{getConditionVariantLabel(variant, conditionVariantLabelMap)}</small>
                      )}
                    </button>
                  ))}
                </div>
              </label>
            )}
            {selectedAdminBuildType === "old" && !selectedAdminHasExtension && (
              <div className="condition-static-note">
                확장 없음은 <strong>{formatConditionVariantLabel(OLD_NO_EXTENSION_VARIANT, conditionVariantLabelMap)}</strong> 기준으로 저장됩니다.
              </div>
            )}
            <div className="admin-condition-submit">
              <button
                type="button"
                className="primary-button"
                disabled={adminLoading || adminSaving || !currentAdminTemplateCondition}
                onClick={() => openAdminConditionEditor(currentAdminTemplateCondition)}
              >
                관리하기
              </button>
            </div>
          </section>
          )}

          {showAdminConditionSelect && (
          <section className="template-list-panel">
            <div>
              <strong>저장된 조건 기준</strong>
              <span>불러오기를 누르면 해당 조건의 수량/인원 기준이 표시됩니다.</span>
            </div>
            {adminTemplates.length ? (
              <div className="template-list">
                {adminTemplates.map((template) => (
                  <div className="template-list-row" key={template.id}>
                    <span>{makeTemplateLabel(template, conditionVariantLabelMap)}</span>
                    <button className="secondary-button" type="button" onClick={() => loadAdminTemplate(template)}>
                      불러오기
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">
                아직 저장된 조건 기준이 없습니다. 평수와 조건을 선택한 뒤 수량/인원을 저장하면 여기에 표시됩니다.
              </p>
            )}
          </section>
          )}

          {adminLoading && <div className="status-box">불러오는 중...</div>}
          {adminSaving && <div className="status-box">저장 중...</div>}
          {adminNotice && <div className="status-box">{adminNotice}</div>}
          {adminError && <div className="error-box">{adminError}</div>}

          {showAdminCatalogEditor && (
          <section className="admin-edit-panel">
            <div className="admin-edit-title">
              <div>
                <strong>{isCommonPriceAdminPage ? "공통 단가/인건비 관리" : "조건별 수량/인원 관리"}</strong>
                <span>
                  {isCommonPriceAdminPage
                    ? "소재별 단가와 인건비를 입력하세요. 수량과 인원은 수량/인원 관리에서 입력합니다."
                    : "이 화면에서는 현재 조건의 수량과 인원만 입력합니다. 단가와 인건비는 공통 단가/인건비 관리 화면에서 수정합니다."}
                </span>
              </div>
              {isConditionQuantityAdminPage && currentAdminConditionLabel && <em>{currentAdminConditionLabel}</em>}
            </div>

            {isConditionQuantityAdminPage && (
            <div className={`admin-edit-current ${canEditConditionQuantities ? "active" : ""}`.trim()}>
              <span>현재 관리 중</span>
              <strong>
                {canEditConditionQuantities && currentAdminConditionLabel
                  ? currentAdminConditionLabel
                  : "현재 관리 중인 조건이 없습니다. 먼저 평수와 주택 조건을 선택하세요."}
              </strong>
              <p>
                {canEditConditionQuantities
                  ? "이 조건의 수량/인원을 입력하세요. 단가와 인건비는 모든 조건에 공통 적용됩니다."
                  : "먼저 평수와 주택 조건을 선택한 뒤 관리하기 또는 불러오기를 눌러주세요."}
              </p>
            </div>
            )}

            {isCommonPriceAdminPage && (
            <section className="admin-catalog-actions">
              <div>
                <strong>대분류/소재 구조</strong>
                <span>대분류는 시공 항목, 소재는 해당 대분류 안의 세부 항목입니다. 단위, 규격, 단가, 인건비를 여기서 관리합니다.</span>
              </div>
              <button className="primary-button" type="button" disabled={adminLoading || adminSaving} onClick={addAdminItem}>
                <Plus size={18} /> 대분류 추가
              </button>
            </section>
            )}

          {((isCommonPriceAdminPage && adminItems.length > 0) || (canEditConditionQuantities && adminItems.length > 0)) && (
            <section className="admin-tool-panel">
              <label className="admin-search-field">
                <Search size={17} />
                <input
                  value={adminSearch}
                  onChange={(event) => setAdminSearch(event.target.value)}
                  placeholder="시공 항목 또는 소재 검색"
                />
              </label>
              <label className="admin-favorite-filter">
                <input
                  type="checkbox"
                  checked={adminFavoriteOnly}
                  onChange={(event) => setAdminFavoriteOnly(event.target.checked)}
                />
                즐겨찾기만 보기
              </label>
              <div className="admin-tool-actions">
                <button type="button" className="secondary-button" onClick={expandVisibleAdminItems}>
                  전체 펼치기
                </button>
                <button type="button" className="secondary-button" onClick={collapseVisibleAdminItems}>
                  전체 접기
                </button>
              </div>
            </section>
          )}

          {isConditionQuantityAdminPage && !canEditConditionQuantities && (
            <section className="panel admin-empty-edit-notice">
              <strong>조건을 먼저 선택하세요.</strong>
              <p className="muted">먼저 평수와 주택 조건을 선택한 뒤 관리하기 또는 불러오기를 눌러주세요.</p>
              <p className="muted">단가와 인건비는 공통 단가/인건비 관리 화면에서 수정합니다.</p>
            </section>
          )}

          {((isCommonPriceAdminPage && adminItems.length > 0) || (canEditConditionQuantities && adminItems.length > 0)) && !adminLoading && !filteredAdminItems.length && (
            <section className="panel">
              <p className="muted">검색 결과가 없습니다.</p>
            </section>
          )}

          {((isCommonPriceAdminPage && filteredAdminItems.length > 0) || (canEditConditionQuantities && filteredAdminItems.length > 0)) && (
          <section className="admin-list">
            {filteredAdminItems.map((item) => {
              const itemSubitems = getVisibleAdminSubitems(item);
              const itemExpanded = Boolean(adminSearchTerm) || expandedAdminItemIds.includes(item.id);
              return (
              <article
                key={item.id}
                className="admin-item-card"
                draggable={isCommonPriceAdminPage}
                onDragStart={() => isCommonPriceAdminPage && setDragItemId(item.id)}
                onDragOver={(event) => isCommonPriceAdminPage && event.preventDefault()}
                onDrop={() => isCommonPriceAdminPage && reorderAdminItems(item.id)}
              >
                <div className="admin-item-header">
                  <button
                    type="button"
                    className="icon-button"
                    title={itemExpanded ? "접기" : "펼치기"}
                    onClick={() => toggleAdminItemExpanded(item.id)}
                  >
                    {itemExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <span className="drag-handle">::</span>
                  {isCommonPriceAdminPage ? (
                    <button
                      className={`icon-button ${item.is_favorite ? "active" : ""}`}
                      title="즐겨찾기"
                      disabled={adminSaving}
                      onClick={() => toggleAdminFavorite(item)}
                    >
                      <Star size={18} fill={item.is_favorite ? "currentColor" : "none"} />
                    </button>
                  ) : (
                    <span className="admin-item-placeholder" />
                  )}
                  {isCommonPriceAdminPage ? (
                    <label className="admin-item-name-field">
                      <span>대분류명</span>
                      <input
                        className="name-input"
                        value={item.name}
                        onChange={(event) =>
                          setAdminItems((current) =>
                            current.map((entry) =>
                              entry.id === item.id ? { ...entry, name: event.target.value } : entry
                            )
                          )
                        }
                        onBlur={(event) => renameAdminItem(item.id, event.target.value)}
                      />
                    </label>
                  ) : (
                    <strong className="admin-item-title">{item.name}</strong>
                  )}
                  <span className="type-badge">{item.item_type === "flat" ? "단일 항목" : "소재형"}</span>
                  {isCommonPriceAdminPage ? (
                    <button className="secondary-button" disabled={adminSaving} onClick={() => addAdminSubitem(item.id)}>
                      <Plus size={18} /> 소재 추가
                    </button>
                  ) : (
                    <span className="admin-item-placeholder" />
                  )}
                  {isCommonPriceAdminPage ? (
                    <button className="danger-button" disabled={adminSaving} onClick={() => deleteAdminItem(item.id)}>
                      <Trash2 size={18} />
                    </button>
                  ) : (
                    <span className="admin-item-placeholder" />
                  )}
                </div>

                {itemExpanded && isFlooringThicknessItem(item) ? (
                  <div className="flooring-thickness-list">
                    <div className="flooring-spec-guide">
                      <strong>장판/바닥재 규격 관리</strong>
                      <span>소재명과 규격/두께를 나눠 입력합니다. 저장은 기존 소재명에 함께 반영됩니다.</span>
                    </div>
                    {itemSubitems.map((subitem) => {
                      const parsedFlooring = parseFlooringThicknessName(subitem.name) ?? {
                        baseName: subitem.name,
                        thickness: DEFAULT_FLOORING_SPEC,
                      };
                      return (
                        <div
                          key={subitem.id}
                          className={`admin-value-row flooring-value-row ${isCommonPriceAdminPage ? "common-price-row" : "condition-quantity-row"}`.trim()}
                          draggable={isCommonPriceAdminPage}
                          onDragStart={() => isCommonPriceAdminPage && setDragSubitem({ itemId: item.id, subitemId: subitem.id })}
                          onDragOver={(event) => isCommonPriceAdminPage && event.preventDefault()}
                          onDrop={() => isCommonPriceAdminPage && reorderAdminSubitems(item.id, subitem.id)}
                        >
                          {isCommonPriceAdminPage && <span className="drag-handle">::</span>}
                          {isCommonPriceAdminPage ? (
                            <>
                              <label className="admin-material-name-field">
                                소재명
                                <input
                                  value={parsedFlooring.baseName}
                                  onChange={(event) =>
                                    updateLocalSubitemName(
                                      subitem.id,
                                      composeFlooringSubitemName(event.target.value, parsedFlooring.thickness)
                                    )
                                  }
                                  onBlur={(event) =>
                                    updateAdminFlooringSubitemName(subitem, { baseName: event.target.value })
                                  }
                                />
                              </label>
                              <label>
                                규격/두께
                                <select
                                  value={parsedFlooring.thickness}
                                  onChange={(event) =>
                                    switchAdminFlooringSubitemThickness(subitem, event.target.value)
                                  }
                                >
                                  {getFlooringThicknessSelectOptions(parsedFlooring.thickness).map((thickness) => (
                                    <option key={thickness} value={thickness}>
                                      {formatFlooringThickness(thickness)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                단위
                                <select
                                  value={subitem.unit ?? ""}
                                  onChange={(event) => updateAdminSubitemUnit(subitem.id, event.target.value)}
                                >
                                  {UNIT_OPTIONS.map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                단가 <span>공통</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={subitem.unit_price ?? ""}
                                  onChange={(event) =>
                                    updateLocalSubitemPrice(subitem.id, { unit_price: event.target.value })
                                  }
                                />
                              </label>
                              <label>
                                인건비 <span>공통</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={subitem.labor_rate ?? ""}
                                  onChange={(event) =>
                                    updateLocalSubitemPrice(subitem.id, { labor_rate: event.target.value })
                                  }
                                />
                              </label>
                            </>
                          ) : (
                            <div className="admin-readonly-material">
                              <strong>{parsedFlooring.baseName}</strong>
                              <span>{formatFlooringThickness(parsedFlooring.thickness)}</span>
                            </div>
                          )}
                          {isConditionQuantityAdminPage && (
                            <>
                              <label>
                                수량 <span>현재 조건</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={subitem.quantity ?? ""}
                                  onChange={(event) =>
                                    updateLocalSubitemPrice(subitem.id, { quantity: event.target.value })
                                  }
                                />
                              </label>
                              <label>
                                인원 <span>현재 조건</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={subitem.labor_count ?? ""}
                                  onChange={(event) =>
                                    updateLocalSubitemPrice(subitem.id, { labor_count: event.target.value })
                                  }
                                />
                              </label>
                            </>
                          )}
                          {isCommonPriceAdminPage && (
                            <button
                              className="danger-button"
                              disabled={adminSaving}
                              onClick={() => deleteAdminSubitem(subitem.id)}
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {!itemSubitems.length && (
                      <p className="muted">
                        {isCommonPriceAdminPage
                          ? "소재가 없습니다. 예: 장판 1.8T, 장판 2.2T, 데코타일 3T처럼 소재를 추가하세요."
                          : "등록된 소재가 없습니다. 공통 단가/인건비 관리 화면에서 소재를 먼저 추가하세요."}
                      </p>
                    )}
                    {isCommonPriceAdminPage && (
                    <div className="admin-add-subitem-row">
                      <div>
                        <strong>{item.name} 안에 소재 추가</strong>
                        <span>예: 장판 1.8T, 장판 2.2T, 장판 2.7T, 데코타일 3T. 추가 후 규격/두께를 따로 조정할 수 있습니다.</span>
                      </div>
                      <button className="secondary-button" type="button" disabled={adminSaving} onClick={() => addAdminSubitem(item.id)}>
                        <Plus size={18} /> 소재 추가
                      </button>
                    </div>
                    )}
                  </div>
                ) : itemExpanded ? (
                <div className={item.item_type === "flat" ? "admin-flat-list" : "admin-subitem-list"}>
                  {isConditionQuantityAdminPage && isWallpaperCategoryName(item.name) && (
                    <div className="wallpaper-bulk-panel">
                      <div>
                        <strong>도배 일괄 입력</strong>
                        <span>빈 수량/인원 항목에만 적용합니다. 이미 입력된 소재 값은 유지됩니다.</span>
                      </div>
                      <label>
                        수량
                        <input
                          type="number"
                          min="0"
                          value={wallpaperBulkInputs[item.id]?.quantity ?? ""}
                          onChange={(event) => updateWallpaperBulkInput(item.id, { quantity: event.target.value })}
                          placeholder="예: 75"
                        />
                      </label>
                      <label>
                        인원
                        <input
                          type="number"
                          min="0"
                          value={wallpaperBulkInputs[item.id]?.labor_count ?? ""}
                          onChange={(event) => updateWallpaperBulkInput(item.id, { labor_count: event.target.value })}
                          placeholder="예: 3"
                        />
                      </label>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={adminSaving}
                        onClick={() => applyWallpaperBulkInput(item.id)}
                      >
                        빈 항목에 적용
                      </button>
                    </div>
                  )}
                  {(item.item_type === "flat" ? itemSubitems.slice(0, 1) : itemSubitems).map((subitem) => (
                    <div
                      key={subitem.id}
                      className={`admin-value-row ${isCommonPriceAdminPage ? "common-price-row" : "condition-quantity-row"}`.trim()}
                      draggable={isCommonPriceAdminPage && item.item_type !== "flat"}
                      onDragStart={() =>
                        isCommonPriceAdminPage &&
                        item.item_type !== "flat" &&
                        setDragSubitem({ itemId: item.id, subitemId: subitem.id })
                      }
                      onDragOver={(event) => isCommonPriceAdminPage && item.item_type !== "flat" && event.preventDefault()}
                      onDrop={() => isCommonPriceAdminPage && item.item_type !== "flat" && reorderAdminSubitems(item.id, subitem.id)}
                    >
                      {item.item_type === "flat" && isCommonPriceAdminPage ? (
                        <strong className="flat-subitem-name">{item.name}</strong>
                      ) : isCommonPriceAdminPage ? (
                        <>
                          <span className="drag-handle">::</span>
                          <label className="admin-material-name-field">
                            소재명
                            <input
                              value={subitem.name}
                              onChange={(event) =>
                                setAdminItems((current) =>
                                  current.map((entry) =>
                                    entry.id === item.id
                                      ? {
                                          ...entry,
                                          subitems: entry.subitems.map((entrySubitem) =>
                                            entrySubitem.id === subitem.id
                                              ? { ...entrySubitem, name: event.target.value }
                                              : entrySubitem
                                          ),
                                        }
                                      : entry
                                  )
                                )
                              }
                              onBlur={(event) => renameAdminSubitem(subitem.id, event.target.value)}
                            />
                          </label>
                        </>
                      ) : (
                        <div className="admin-readonly-material">
                          <strong>{item.item_type === "flat" ? item.name : subitem.name}</strong>
                          {isFlooringMaterialName(subitem.name) && <span>{formatFlooringThickness(parseFlooringThicknessName(subitem.name)?.thickness)}</span>}
                        </div>
                      )}

                      {isCommonPriceAdminPage && (
                        <>
                          <label>
                            단위
                            <select
                              value={subitem.unit ?? ""}
                              onChange={(event) => updateAdminSubitemUnit(subitem.id, event.target.value)}
                            >
                              {UNIT_OPTIONS.map((unit) => (
                                <option key={unit} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            단가 <span>공통</span>
                            <input
                              type="number"
                              min="0"
                              value={subitem.unit_price ?? ""}
                              onChange={(event) =>
                                updateLocalSubitemPrice(subitem.id, { unit_price: event.target.value })
                              }
                            />
                          </label>
                          <label>
                            인건비 <span>공통</span>
                            <input
                              type="number"
                              min="0"
                              value={subitem.labor_rate ?? ""}
                              onChange={(event) =>
                                updateLocalSubitemPrice(subitem.id, { labor_rate: event.target.value })
                              }
                            />
                          </label>
                        </>
                      )}
                      {isConditionQuantityAdminPage && (
                        <>
                          <label>
                            수량 <span>현재 조건</span>
                            <input
                              type="number"
                              min="0"
                              value={subitem.quantity ?? ""}
                              onChange={(event) =>
                                updateLocalSubitemPrice(subitem.id, { quantity: event.target.value })
                              }
                            />
                          </label>
                          <label>
                            인원 <span>현재 조건</span>
                            <input
                              type="number"
                              min="0"
                              value={subitem.labor_count ?? ""}
                              onChange={(event) =>
                                updateLocalSubitemPrice(subitem.id, { labor_count: event.target.value })
                              }
                            />
                          </label>
                        </>
                      )}
                      {isCommonPriceAdminPage && item.item_type !== "flat" && (
                        <button
                          className="danger-button"
                          disabled={adminSaving}
                          onClick={() => deleteAdminSubitem(subitem.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  {item.item_type !== "flat" && !itemSubitems.length && (
                    <p className="muted">
                      {isCommonPriceAdminPage
                        ? "소재가 없습니다. 소재를 추가하거나 새 단일 항목으로 다시 등록하세요."
                        : "등록된 소재가 없습니다. 공통 단가/인건비 관리 화면에서 소재를 먼저 추가하세요."}
                    </p>
                  )}
                  {isCommonPriceAdminPage && item.item_type !== "flat" && (
                    <div className="admin-add-subitem-row">
                      <div>
                        <strong>{item.name} 안에 소재 추가</strong>
                        <span>소재명, 단위, 단가, 인건비를 입력할 수 있습니다.</span>
                      </div>
                      <button className="secondary-button" type="button" disabled={adminSaving} onClick={() => addAdminSubitem(item.id)}>
                        <Plus size={18} /> 소재 추가
                      </button>
                    </div>
                  )}
                </div>
                ) : null}
              </article>
            );
            })}
          </section>
          )}
          </section>
          )}
        </main>
      )}

      {page === "admin-detail-costs" && adminVerified && (
        <main className="panel-page admin-page">
          <div className="editor-header">
            <div>
              <button className="ghost" onClick={() => setPage("admin")}>
                <ArrowLeft size={18} /> 관리자 홈
              </button>
              <h2>세부견적 관리</h2>
              <p className="muted caption">고객용 견적서에는 표시하지 않는 내부 비용입니다.</p>
            </div>
            <div className="admin-actions">
              <button
                className="secondary-button"
                disabled={adminLoading || adminSaving}
                onClick={() => {
                  fetchDetailSubitems();
                  if (selectedDetailSubitemId) fetchDetailCosts(selectedDetailSubitemId);
                }}
              >
                <RefreshCcw size={18} /> 되돌리기
              </button>
            </div>
          </div>

          {adminLoading && <div className="status-box">불러오는 중...</div>}
          {adminSaving && <div className="status-box">저장 중...</div>}
          {adminError && <div className="error-box">{adminError}</div>}

          <section className="detail-cost-layout">
            <aside className="detail-subitem-panel">
              <h3>소재 선택</h3>
              <p className="muted caption">소재별로 내부 비용을 관리합니다.</p>
              <select
                value={selectedDetailSubitemId}
                onChange={(event) => setSelectedDetailSubitemId(event.target.value)}
                disabled={!detailSubitems.length}
              >
                <option value="">소재 선택</option>
                {detailSubitems.map((subitem) => (
                  <option key={subitem.id} value={subitem.id}>
                    {subitem.item_name} / {subitem.name}
                  </option>
                ))}
              </select>

              <div className="detail-subitem-list">
                {detailSubitems.map((subitem) => (
                  <button
                    key={subitem.id}
                    className={selectedDetailSubitemId === subitem.id ? "selected" : ""}
                    onClick={() => setSelectedDetailSubitemId(subitem.id)}
                  >
                    <span>{subitem.item_name}</span>
                    <strong>{subitem.name}</strong>
                  </button>
                ))}
                {!adminLoading && !detailSubitems.length && (
                  <p className="muted">등록된 소재가 없습니다. 먼저 `시공항목 수정`에서 소재를 추가하세요.</p>
                )}
              </div>
            </aside>

            <section className="detail-cost-panel">
              <div className="detail-cost-title">
                <div>
                  <p className="eyebrow dark">내부 비용 관리</p>
                  <h3>부자재 및 기타 비용 관리</h3>
                </div>
                <span>고객용 견적서에는 표시하지 않는 내부 비용</span>
              </div>

              <div className="detail-add-row">
                <input
                  value={newDetailCost.name}
                  onChange={(event) => setNewDetailCost((current) => ({ ...current, name: event.target.value }))}
                  placeholder="항목명 예: 풀, 아크졸, 부직포"
                  disabled={!selectedDetailSubitemId}
                />
                <input
                  type="number"
                  min="0"
                  value={newDetailCost.cost}
                  onChange={(event) => setNewDetailCost((current) => ({ ...current, cost: event.target.value }))}
                  placeholder="가격"
                  disabled={!selectedDetailSubitemId}
                />
                <select
                  value={newDetailCost.category_type}
                  onChange={(event) =>
                    setNewDetailCost((current) => ({ ...current, category_type: event.target.value }))
                  }
                  disabled={!selectedDetailSubitemId}
                >
                  <option value="basic">기본에 포함</option>
                  <option value="full">전체에만 포함</option>
                </select>
                <button
                  className="primary-button"
                  disabled={!selectedDetailSubitemId || adminSaving || !newDetailCost.name.trim()}
                  onClick={addDetailCost}
                >
                  <Plus size={18} /> 추가
                </button>
              </div>

              <div className="detail-cost-list">
                {detailCosts.map((cost) => (
                  <div key={cost.id} className="detail-cost-row">
                    <input
                      value={cost.name}
                      onChange={(event) => updateLocalDetailCost(cost.id, { name: event.target.value })}
                      onBlur={(event) => updateDetailCost(cost.id, { name: event.target.value })}
                    />
                    <input
                      type="number"
                      min="0"
                      value={cost.cost ?? ""}
                      onChange={(event) => updateLocalDetailCost(cost.id, { cost: event.target.value })}
                      onBlur={(event) => updateDetailCost(cost.id, { cost: event.target.value })}
                    />
                    <div className="detail-type-toggle">
                      <label className={cost.category_type === "basic" ? "selected" : ""}>
                        <input
                          type="radio"
                          name={`detail-type-${cost.id}`}
                          checked={cost.category_type === "basic"}
                          onChange={() => updateDetailCost(cost.id, { category_type: "basic" })}
                        />
                        기본에 포함
                      </label>
                      <label className={cost.category_type === "full" ? "selected" : ""}>
                        <input
                          type="radio"
                          name={`detail-type-${cost.id}`}
                          checked={cost.category_type === "full"}
                          onChange={() => updateDetailCost(cost.id, { category_type: "full" })}
                        />
                        전체에만 포함
                      </label>
                    </div>
                    <button className="danger-button" disabled={adminSaving} onClick={() => deleteDetailCost(cost.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}

                {!adminLoading && selectedDetailSubitemId && !detailCosts.length && (
                  <p className="muted">이 소재에 등록된 부자재 및 기타 비용이 없습니다.</p>
                )}
                {!selectedDetailSubitemId && (
                  <p className="muted">왼쪽에서 소재를 선택하면 세부견적 항목을 관리할 수 있습니다.</p>
                )}
              </div>
            </section>
          </section>
        </main>
      )}

      {page === "admin-estimates" && (
        <main className="panel-page admin-page">
          <div className="editor-header">
            <div>
              <button className="ghost" onClick={() => setPage("landing")}>
                <ArrowLeft size={18} /> 홈으로
              </button>
              <h2>CS/사후관리</h2>
              <p className="muted caption">저장된 견적서와 고객 요청사항을 관리합니다.</p>
            </div>
            <div className="admin-actions">
              <button className="secondary-button" disabled={adminLoading} onClick={() => fetchEstimates()}>
                <RefreshCcw size={18} /> 새로고침
              </button>
            </div>
          </div>

          <section className="estimate-search-panel">
            <label>
              고객명 또는 주소 검색
              <input
                value={estimateSearch}
                onChange={(event) => setEstimateSearch(event.target.value)}
                placeholder="예: 홍길동, 아파트, 빌라, 101동"
              />
            </label>
          </section>

          {adminLoading && <div className="status-box">불러오는 중...</div>}
          {adminError && <div className="error-box">{adminError}</div>}

          <section className="estimate-list">
            {!adminLoading && !estimates.length && (
              <div className="panel">
                <p className="muted">
                  조회된 견적서가 없습니다. 신규 견적서를 저장하면 이곳에 자동으로 쌓입니다.
                </p>
              </div>
            )}

            {estimates.map((estimate) => (
              <article key={estimate.id} className="estimate-card">
                <div>
                  <strong>{getSavedEstimateCustomerName(estimate) || "고객명 미입력"}</strong>
                  <p>현장 주소 {estimate.address || "주소 미입력"}</p>
                  <p>
                    작성일 {estimate.created_at ? new Date(estimate.created_at).toLocaleDateString("ko-KR") : "-"} ·
                    시공 예정일 {estimate.construction_date || "-"}
                  </p>
                </div>
                <div className="estimate-amount">
                  <PriceText value={estimate.total_amount || 0} size="lg" />
                </div>
                <div className="estimate-card-actions">
                  <button className="secondary-button" onClick={() => setSelectedEstimate(estimate)}>
                    상세 보기
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => loadSavedEstimateDraft(estimate, { destination: "preview" })}
                  >
                    다시 열기/PDF
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => loadSavedEstimateDraft(estimate, { copy: true, destination: "items" })}
                  >
                    복사해서 새 견적서
                  </button>
                </div>
              </article>
            ))}
          </section>

          {selectedEstimate && (
            <div className="modal-backdrop" onClick={() => setSelectedEstimate(null)}>
              <section className="estimate-modal" onClick={(event) => event.stopPropagation()}>
                <div className="editor-header">
                  <div>
                    <p className="eyebrow dark">견적서 상세</p>
                    <h3>{getSavedEstimateCustomerName(selectedEstimate) || selectedEstimate.address || "견적서"}</h3>
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
                  </div>
                  <button className="ghost" onClick={() => setSelectedEstimate(null)}>
                    닫기
                  </button>
                </div>

                <div className="estimate-card-actions modal-actions">
                  <button
                    className="secondary-button"
                    onClick={() => loadSavedEstimateDraft(selectedEstimate, { destination: "preview" })}
                  >
                    다시 열기/PDF 다운로드
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => loadSavedEstimateDraft(selectedEstimate, { copy: true, destination: "items" })}
                  >
                    복사해서 새 견적서 만들기
                  </button>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>시공 항목</th>
                      <th>소재/내용</th>
                      <th>수량</th>
                      <th>인원</th>
                      <th>가격</th>
                      <th>인건비</th>
                      <th>합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEstimateItems.map((item, index) => (
                      <tr key={`${item.categoryName ?? item.category ?? "item"}-${index}`}>
                        <td>{item.categoryName ?? item.category ?? item.itemName ?? "-"}</td>
                        <td>{item.material ?? item.name ?? item.description ?? "-"}</td>
                        <td><PriceText value={item.quantity ?? 0} unit={item.unit ?? ""} size="sm" /></td>
                        <td><PriceText value={item.laborCount ?? item.labor_count ?? 0} unit="명" size="sm" /></td>
                        <td><PriceText value={item.productAmount ?? item.price ?? item.amount ?? 0} size="sm" /></td>
                        <td><PriceText value={item.laborAmount ?? 0} size="sm" /></td>
                        <td><PriceText value={item.totalAmount ?? item.price ?? item.amount ?? 0} size="sm" /></td>
                      </tr>
                    ))}
                    {!selectedEstimateItems.length && (
                      <tr>
                        <td colSpan="7">저장된 항목 데이터가 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>

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
        </main>
      )}

      {page === "preview" && (
        <main className="panel-page">
          <section className="panel wide">
            <div className="editor-header">
              <div>
                <h2>견적서 미리보기</h2>
              </div>
              <button className="ghost" onClick={() => setPage("items")}>
                <ArrowLeft size={18} /> 항목 수정
              </button>
            </div>

            {estimateNotice && <div className="status-box">{estimateNotice}</div>}
            {estimateError && <div className="error-box">{estimateError}</div>}
            {estimateSaving && <div className="status-box">저장 중...</div>}

            <div className="pdf-capture-area" ref={previewPdfRef}>
              <div className="pdf-title-row">
                <div>
                  <p className="eyebrow dark">FORMATE 인테리어 견적서</p>
                  <h3>{selectedCompanyName} 견적서</h3>
                </div>
                <PriceText value={total} size="lg" />
              </div>

              <div className="estimate-meta-grid">
                <div>
                  <span>견적서 번호</span>
                  <strong>{estimateNumber}</strong>
                </div>
                <div>
                  <span>업체명</span>
                  <strong>{selectedCompanyName}</strong>
                </div>
                <div>
                  <span>작성일</span>
                  <strong>{estimateCreatedDate}</strong>
                </div>
                <div>
                  <span>유효기간</span>
                  <strong>{estimateValidUntil}까지</strong>
                </div>
                <div>
                  <span>부가세</span>
                  <strong>{estimateVatStatus}</strong>
                </div>
              </div>

              <div className="form-grid">
                <label>
                  고객명
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="예: 홍길동"
                  />
                </label>
                <label>
                  연락처
                  <input
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="예: 010-0000-0000"
                  />
                </label>
                <label>
                  현장 주소
                  <input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="예: 서울시 강남구 ..."
                  />
                </label>
                <label>
                  시공 예정일
                  <input
                    type="date"
                    value={workDate}
                    onChange={(event) => setWorkDate(event.target.value)}
                  />
                </label>
                <label>
                  부가세 표시
                  <select
                    value={estimateVatStatus}
                    onChange={(event) => setEstimateVatStatus(event.target.value)}
                  >
                    <option value="부가세 별도">부가세 별도</option>
                    <option value="부가세 포함">부가세 포함</option>
                    <option value="부가세 없음">부가세 없음</option>
                  </select>
                </label>
              </div>

              <div className="key-box compact-key">
                <span>견적 조건</span>
                <strong>{conditionSummary}</strong>
              </div>

              <div className="estimate-pyeong-preview">
                <div>
                  <span>조건 평수</span>
                  <PriceText value={condition.size || 0} unit="평" size="sm" />
                </div>
                <div>
                  <span>견적 기준 평수</span>
                  <PriceText value={estimatePyeong || condition.size || 0} unit="평" size="sm" />
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>시공 항목</th>
                    <th>소재</th>
                    <th>수량</th>
                    <th>인원</th>
                    <th>가격</th>
                    <th>인건비</th>
                    <th>합계</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRows.map((row, index) => (
                    <tr key={`${row.categoryId}-${row.material}-${index}`}>
                      <td>{row.categoryName}</td>
                      <td>{row.material}</td>
                      <td>
                        <PriceText value={row.quantity} unit={row.unit} size="sm" />
                      </td>
                      <td>
                        <PriceText value={row.laborCount} unit="명" size="sm" />
                      </td>
                      <td><PriceText value={row.productAmount} size="sm" /></td>
                      <td><PriceText value={row.laborAmount} size="sm" /></td>
                      <td><PriceText value={row.totalAmount} size="sm" /></td>
                    </tr>
                  ))}
                  {!selectedRows.length && (
                    <tr>
                      <td colSpan="7">선택된 소재가 없습니다.</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="6">선택 항목 합계</td>
                    <td><PriceText value={selectedItemsTotal} size="md" /></td>
                  </tr>
                  <tr>
                    <td colSpan="6">추가금/할인</td>
                    <td>
                      <span className={`signed-total ${adjustmentTotal < 0 ? "negative" : ""}`}>
                        {adjustmentTotal >= 0 ? "+" : "-"}
                        <PriceText value={Math.abs(adjustmentTotal)} size="sm" />
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="6">최종 견적 금액</td>
                    <td><PriceText value={total} size="md" /></td>
                  </tr>
                </tfoot>
              </table>

              {customerVisibleAdjustments.length > 0 && (
                <div className="customer-adjustment-preview">
                  <h3>추가금/할인</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>항목</th>
                        <th>구분</th>
                        <th>금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerVisibleAdjustments.map((adjustment) => (
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
                </div>
              )}

              <div className="estimate-note-box">
                <strong>견적 조건</strong>
                <p>공사 기간: 협의 후 확정</p>
                <p>결제 조건: 계약금 / 중도금 / 잔금 협의</p>
                <p>변경 사항: 공사 중 추가 요청 또는 현장 상황 변경 시 추가 비용이 발생할 수 있습니다.</p>
                <p>보증 조건: 시공 후 하자 보수 기준은 별도 협의합니다.</p>
              </div>

              <div className="estimate-note-box">
                <strong>제외 항목</strong>
                <p>본 견적서에 명시되지 않은 항목은 별도 견적입니다.</p>
                <p>가전제품, 가구, 관리사무소 비용, 엘리베이터 사용료 등은 별도 협의가 필요할 수 있습니다.</p>
              </div>
            </div>

            <div className="actions">
              <button
                className="primary-button"
                disabled={estimateSaving}
                onClick={saveEstimateToSupabase}
              >
                <Save size={18} /> 견적서 저장
              </button>
              <button
                className="secondary-button"
                onClick={downloadEstimatePdf}
              >
                <Printer size={18} /> PDF 다운로드
              </button>
            </div>
          </section>
        </main>
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

const styles = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: var(--font-sans);
    color: var(--text-primary);
    background: var(--bg-base);
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-regular);
  }
  button, input, select, textarea {
    font: inherit;
  }
  button {
    cursor: pointer;
    border: 0;
    transition: background-color 100ms ease, border-color 100ms ease, box-shadow 150ms ease, color 100ms ease;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
  .app-shell {
    min-height: 100vh;
    padding-top: 70px;
  }
  .app-shell svg {
    stroke-width: 1.75;
  }
  .login-shell {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: var(--space-3);
  }
  .login-card {
    width: min(420px, 100%);
    display: grid;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-md);
  }
  .login-brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--text-primary);
  }
  .login-brand img {
    width: 34px;
    height: 34px;
    display: block;
  }
  .login-brand strong {
    font-size: var(--font-size-title-sm);
  }
  .login-card h1 {
    margin: 0 0 8px;
    font-size: var(--font-size-title-lg);
    letter-spacing: 0;
  }
  .login-helper {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.55;
  }
  .login-form {
    display: grid;
    gap: var(--space-2);
  }
  .login-form label {
    display: grid;
    gap: var(--space-1);
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
  }
  .admin-verify-modal {
    width: min(440px, calc(100vw - 32px));
    display: grid;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-md);
  }
  .admin-verify-modal h2 {
    margin: 0 0 8px;
    font-size: var(--font-size-title-md);
  }
  main {
    animation: page-enter 180ms ease-out both;
  }
  @keyframes page-enter {
    from {
      opacity: 0;
      transform: translateX(8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  .global-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 80;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 0 var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg-surface-overlay);
  }
  .global-brand {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    gap: var(--space-1);
    padding: 0;
    background: transparent;
    color: var(--text-primary);
    text-align: left;
  }
  .global-brand img {
    width: 34px;
    height: 34px;
    display: block;
  }
  .global-brand strong {
    font-size: var(--font-size-title-sm);
    letter-spacing: 0;
  }
  .global-header.with-admin-condition {
    display: grid;
    grid-template-columns: minmax(150px, 1fr) minmax(240px, auto) minmax(180px, 1fr);
  }
  .header-admin-condition {
    display: grid;
    justify-items: center;
    gap: 2px;
    min-width: 0;
    max-width: min(54vw, 620px);
    justify-self: center;
    padding: 6px 14px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    text-align: center;
  }
  .header-admin-condition.active {
    border-color: var(--brand-primary);
    background: rgba(244, 246, 255, 0.98);
    color: var(--text-primary);
  }
  .header-admin-condition span {
    font-size: 11px;
    font-weight: var(--font-weight-semibold);
    line-height: 1.1;
  }
  .header-admin-condition strong {
    display: block;
    max-width: 100%;
    overflow: hidden;
    color: inherit;
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-bold);
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .company-session {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-1);
    min-width: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
  }
  .company-session span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .company-switch-button {
    flex: 0 0 auto;
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .company-switch-button:hover,
  .company-switch-button:focus-visible {
    border-color: var(--brand-primary);
    box-shadow: var(--focus-ring);
    outline: none;
  }
  .landing {
    max-width: 1120px;
    margin: 0 auto;
    padding: var(--space-3) var(--space-3) 56px;
  }
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(360px, 1.05fr);
    gap: var(--space-4);
    align-items: start;
    padding: var(--space-4) 0 var(--space-4);
    color: var(--text-primary);
  }
  .hero-copy {
    padding-top: 10px;
  }
  .landing-session-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: 34px;
  }
  .hero-brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    flex: 0 0 auto;
    padding: 0;
    background: transparent;
    color: var(--text-primary);
    font-weight: var(--font-weight-bold);
  }
  .hero-brand img {
    width: 32px;
    height: 32px;
    display: block;
  }
  .hero-brand strong {
    font-size: var(--font-size-title-sm);
    letter-spacing: 0;
  }
  .landing-company-greeting {
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
  }
  .hero h1 {
    max-width: 560px;
    margin: 0 0 16px;
    font-size: clamp(38px, 4.3vw, 48px);
    line-height: 1.18;
    letter-spacing: 0;
  }
  .hero h1 span {
    display: block;
  }
  .hero p {
    max-width: 560px;
    margin: 0;
    color: var(--text-secondary);
    font-size: 18px;
    line-height: 1.65;
  }
  .hero-preview {
    padding: var(--space-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-card);
    background: linear-gradient(180deg, var(--bg-surface), #FBFAF7);
    box-shadow: var(--shadow-md);
  }
  .preview-top {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: flex-start;
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--border-subtle);
  }
  .preview-top span,
  .preview-lines span,
  .preview-total span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .preview-top strong {
    display: block;
    margin-top: 6px;
    font-size: var(--font-size-title-sm);
  }
  .preview-top button {
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .preview-conditions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin: var(--space-2) 0;
  }
  .preview-conditions span {
    padding: 7px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: #F7F1E8;
    color: var(--text-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .preview-lines {
    display: grid;
    gap: var(--space-1);
  }
  .preview-lines div {
    display: grid;
    grid-template-columns: minmax(100px, 1fr) auto auto;
    gap: var(--space-1);
    align-items: center;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .preview-lines strong {
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
  }
  .preview-lines b {
    color: var(--text-primary);
    font-family: var(--font-number);
    font-variant-numeric: tabular-nums;
    font-size: var(--font-size-body-sm);
  }
  .preview-total {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: baseline;
    margin-top: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius-card);
    background: var(--brand-primary);
    color: var(--text-inverse);
  }
  .preview-total span {
    color: rgba(255, 255, 255, 0.76);
  }
  .preview-total strong {
    font-family: var(--font-number);
    font-variant-numeric: tabular-nums;
    font-size: 26px;
  }
  .eyebrow {
    margin: 0 0 12px;
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
  }
  .eyebrow.dark {
    color: var(--brand-primary);
  }
  .landing-actions {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  .section-heading h2 {
    margin: 0;
    font-size: var(--font-size-title-md);
  }
  .primary-action-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }
  .secondary-action-grid,
  .menu-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: var(--space-2);
  }
  .menu-card {
    min-height: 140px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--space-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
    text-align: left;
    font-size: var(--font-size-title-sm);
    font-weight: var(--font-weight-bold);
    transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
  }
  .menu-card:hover,
  .menu-card:focus-visible {
    transform: translateY(-3px);
    border-color: var(--brand-primary);
    box-shadow: var(--shadow-md);
    background: #FDFCF9;
    outline: none;
  }
  .menu-card svg {
    color: var(--brand-primary);
  }
  .menu-card p {
    margin: 12px 0 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-regular);
    line-height: 1.55;
  }
  .feature-card {
    min-height: 220px;
    padding: var(--space-4);
    border-color: var(--border-default);
  }
  .feature-card span {
    margin-top: var(--space-2);
    font-size: var(--font-size-title-md);
  }
  .feature-card strong {
    margin-top: var(--space-3);
    padding: 9px 12px;
    border-radius: var(--radius-button);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-body-sm);
  }
  .support-card {
    min-height: 132px;
    padding: var(--space-2);
    color: var(--text-primary);
  }
  .support-card span {
    margin-top: var(--space-1);
  }
  .menu-card.primary {
    border-color: var(--brand-primary);
  }
  .menu-card.primary svg {
    color: var(--brand-primary);
  }
  .simple-page, .panel-page {
    max-width: 960px;
    margin: 0 auto;
    padding: var(--space-6) var(--space-3);
  }
  .empty-state {
    margin-top: 80px;
    padding: var(--space-8) var(--space-3);
    text-align: center;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-sm);
  }
  .panel {
    padding: var(--space-4);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-sm);
  }
  .panel.wide {
    max-width: 1120px;
    margin: 0 auto;
  }
  .panel h2, .category-column h2, .editor h2 {
    margin: 0 0 10px;
  }
  .muted {
    color: var(--text-secondary);
    line-height: 1.6;
  }
  .caption {
    font-size: var(--font-size-body-sm);
    color: var(--text-secondary);
    margin-top: 0;
  }
  select, input, textarea {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--text-primary);
    outline: none;
    transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
  }
  select:focus, input:focus, textarea:focus {
    border-color: var(--brand-primary);
    background: var(--bg-surface);
    box-shadow: var(--focus-ring);
  }
  .progress {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-1);
    margin-bottom: var(--space-3);
  }
  .progress div {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    color: var(--text-secondary);
    box-shadow: var(--shadow-sm);
  }
  .progress div.active {
    border-color: var(--brand-primary);
    color: var(--brand-primary);
  }
  .progress span {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    font-weight: var(--font-weight-bold);
  }
  .progress .active span {
    background: var(--brand-primary);
    color: var(--text-inverse);
  }
  .progress p {
    margin: 0;
    font-weight: var(--font-weight-bold);
  }
  .segmented {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-1);
    margin: var(--space-3) 0;
  }
  .segmented.flush {
    margin: 0;
  }
  .segmented.compact {
    max-width: 420px;
  }
  .segmented button, .chips button {
    min-height: 44px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
  }
  .segmented button.selected, .chips button.selected {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
  }
  .custom-select {
    position: relative;
    max-width: 360px;
  }
  .custom-select-trigger {
    width: 100%;
    min-height: 48px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    padding: 0 14px;
    border: 1px solid var(--border-default);
    border-radius: 10px;
    background: var(--bg-surface);
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
    box-shadow: var(--shadow-sm);
  }
  .custom-select-trigger:hover,
  .custom-select-trigger:focus-visible,
  .custom-select-trigger.open {
    border-color: var(--brand-primary);
    box-shadow: var(--focus-ring);
    outline: none;
  }
  .custom-select-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    z-index: 30;
    max-height: 280px;
    overflow: auto;
    padding: 6px;
    border: 1px solid var(--border-default);
    border-radius: 10px;
    background: var(--bg-surface);
    box-shadow: var(--shadow-md);
  }
  .custom-select-menu button {
    width: 100%;
    min-height: 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    padding: 0 10px;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
    text-align: left;
  }
  .custom-select-menu button:hover,
  .custom-select-menu button:focus-visible {
    background: var(--bg-subtle);
    outline: none;
  }
  .custom-select-menu button.selected {
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
  }
  .custom-select-section {
    display: grid;
    gap: 4px;
  }
  .custom-select-section + .custom-select-section {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border-subtle);
  }
  .custom-select-section p {
    margin: 4px 6px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .favorite-pyeong-section {
    margin: -2px -2px 0;
    padding: 6px 2px 8px;
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .pyeong-option-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 34px;
    align-items: center;
    gap: 4px;
    border-radius: var(--radius-button);
  }
  .pyeong-option-row.selected {
    background: var(--brand-primary-subtle);
  }
  .custom-select-menu .pyeong-option-main {
    min-width: 0;
    padding: 0 10px;
    background: transparent;
  }
  .pyeong-option-row.selected .pyeong-option-main {
    color: var(--brand-primary);
  }
  .custom-select-menu .favorite-pyeong-toggle {
    width: 34px;
    min-height: 34px;
    justify-content: center;
    padding: 0;
    color: var(--text-tertiary);
    background: transparent;
  }
  .custom-select-menu .favorite-pyeong-toggle.active {
    color: var(--brand-primary);
  }
  .favorite-pyeong-section .pyeong-option-main:hover,
  .favorite-pyeong-section .pyeong-option-main:focus-visible,
  .favorite-pyeong-section .favorite-pyeong-toggle:hover,
  .favorite-pyeong-section .favorite-pyeong-toggle:focus-visible {
    background: var(--bg-surface);
  }
  .check-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .check-row label, .material-check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: var(--font-weight-semibold);
  }
  .check-row input, .material-check input {
    width: 18px;
    min-height: 18px;
  }
  .stack {
    display: grid;
    gap: var(--space-2);
  }
  .field-label {
    margin: 0 0 10px;
    font-weight: var(--font-weight-semibold);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .chips button {
    padding: 0 14px;
  }
  .chips button.condition-variant-option {
    height: auto;
    min-height: 48px;
    display: inline-grid;
    gap: 2px;
    align-content: center;
    justify-items: center;
    padding: 8px 14px;
    line-height: 1.2;
  }
  .condition-variant-option small {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .condition-variant-option.selected small {
    color: var(--brand-primary);
  }
  .condition-builder-panel {
    display: grid;
    gap: var(--space-3);
  }
  .condition-builder-header {
    align-items: flex-start;
  }
  .estimate-current-condition {
    display: grid;
    gap: 6px;
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .estimate-current-condition.active {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
  }
  .estimate-current-condition span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .estimate-current-condition strong {
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
    line-height: 1.4;
  }
  .estimate-current-condition p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .condition-static-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
    align-items: start;
  }
  .condition-static-field {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }
  .condition-static-wide {
    grid-column: 1 / -1;
  }
  .condition-static-note {
    min-height: 44px;
    display: flex;
    align-items: center;
    padding: 10px 12px;
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .condition-static-note strong {
    color: var(--text-primary);
  }
  .condition-start-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-subtle);
  }
  .condition-start-row p {
    margin: 0;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-1);
    margin-top: var(--space-4);
  }
  .primary-button, .secondary-button, .ghost {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: 0 16px;
    border-radius: var(--radius-button);
    font-weight: var(--font-weight-semibold);
  }
  .primary-button {
    background: var(--brand-primary);
    color: var(--text-inverse);
  }
  .primary-button:hover:not(:disabled) {
    background: var(--brand-primary-hover);
  }
  .secondary-button {
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-primary);
  }
  .secondary-button:hover:not(:disabled),
  .ghost:hover:not(:disabled) {
    background: var(--bg-subtle);
  }
  .ghost {
    background: transparent;
    color: var(--text-primary);
  }
  .sticky-summary {
    position: sticky;
    top: 64px;
    z-index: 10;
    display: grid;
    grid-template-columns: auto minmax(220px, 1fr);
    gap: 14px;
    align-items: center;
    padding: 12px 24px;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg-surface-overlay);
  }
  .sticky-summary span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  code {
    padding: 5px 8px;
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--text-primary);
    white-space: normal;
  }
  .key-box {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .key-box span, .dummy-note span {
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
  }
  .load-box {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-2);
    align-items: center;
    margin-top: var(--space-3);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--brand-primary-subtle);
  }
  .load-box p {
    margin: 6px 0 0;
    color: var(--text-secondary);
  }
  .dummy-note {
    display: grid;
    gap: var(--space-1);
    margin-top: var(--space-3);
    padding: var(--space-2);
    border-left: 4px solid var(--border-default);
    background: var(--bg-subtle);
  }
  .admin-menu {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .admin-page {
    max-width: 1180px;
  }
  .admin-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-1);
  }
  .admin-pyeong-panel {
    position: relative;
    display: grid;
    grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr) minmax(220px, 1fr);
    gap: var(--space-2);
    align-items: end;
    margin-bottom: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .admin-pyeong-panel label {
    display: grid;
    gap: var(--space-1);
    font-weight: var(--font-weight-semibold);
  }
  .admin-condition-title {
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    align-self: center;
  }
  .admin-condition-title > div {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .admin-condition-title strong,
  .template-list-panel strong {
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .admin-condition-title span,
  .template-list-panel span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .admin-condition-toggle {
    min-width: 0;
  }
  .condition-label-link {
    flex: 0 0 auto;
    min-height: 36px;
    padding: 0 12px;
  }
  .admin-condition-submit {
    display: flex;
    align-items: end;
    justify-content: flex-end;
  }
  .admin-pyeong-select {
    max-width: none;
  }
  .admin-pyeong-select .custom-select-menu {
    z-index: 45;
  }
  .admin-pyeong-panel p {
    margin: 0;
  }
  .template-list-panel {
    display: grid;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .template-list-panel > div:first-child {
    display: grid;
    gap: 4px;
  }
  .template-list {
    display: grid;
    gap: var(--space-1);
  }
  .template-list-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-1);
    align-items: center;
    padding: 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .template-list-row span {
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
  }
  .admin-edit-panel {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .admin-edit-title {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: flex-start;
    padding: 2px 2px 0;
  }
  .admin-edit-title div {
    display: grid;
    gap: 4px;
  }
  .admin-edit-title strong {
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .admin-edit-title span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.5;
  }
  .admin-edit-title em {
    flex: 0 0 auto;
    padding: 6px 10px;
    border-radius: 9999px;
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-style: normal;
    font-weight: var(--font-weight-bold);
  }
  .admin-edit-current {
    display: grid;
    gap: 6px;
    padding: 14px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .admin-edit-current.active {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
  }
  .admin-edit-current span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .admin-edit-current strong {
    color: var(--text-primary);
    font-size: 22px;
    line-height: 1.35;
  }
  .admin-edit-current p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.55;
  }
  .admin-catalog-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
    align-items: center;
    padding: 12px 14px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .admin-catalog-actions div {
    display: grid;
    gap: 4px;
  }
  .admin-catalog-actions strong {
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .admin-catalog-actions span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.45;
  }
  .admin-empty-edit-notice {
    border: 1px dashed var(--border-default);
    background: var(--bg-surface);
  }
  .admin-empty-edit-notice strong {
    display: block;
    margin-bottom: 6px;
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .condition-label-panel {
    display: grid;
    gap: var(--space-2);
  }
  .condition-label-guide {
    display: grid;
    gap: 4px;
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .condition-label-guide strong {
    color: var(--text-primary);
  }
  .condition-label-guide span {
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .condition-label-list {
    display: grid;
    gap: var(--space-1);
  }
  .condition-label-row {
    display: grid;
    grid-template-columns: 92px minmax(180px, 1fr) minmax(220px, 1.4fr);
    gap: var(--space-1);
    align-items: end;
    padding: var(--space-1);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
  }
  .condition-label-row > strong {
    align-self: center;
    color: var(--brand-primary);
  }
  .condition-label-row label {
    display: grid;
    gap: 6px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .status-box, .error-box {
    margin-bottom: var(--space-2);
    padding: 12px 14px;
    border-radius: var(--radius-button);
    font-weight: var(--font-weight-semibold);
  }
  .status-box {
    border: 1px solid var(--border-subtle);
    background: var(--bg-subtle);
    color: var(--text-primary);
  }
  .error-box {
    border: 1px solid var(--color-danger-border);
    background: var(--color-danger-subtle);
    color: var(--color-danger);
  }
  .admin-tool-panel {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) auto auto;
    gap: var(--space-1);
    align-items: center;
    margin-bottom: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .admin-search-field {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 8px;
    align-items: center;
    min-height: 42px;
    padding: 0 12px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--text-secondary);
  }
  .admin-search-field:focus-within {
    border-color: var(--brand-primary);
    background: var(--bg-surface);
    box-shadow: var(--focus-ring);
  }
  .admin-search-field input {
    min-height: 38px;
    padding: 0;
    border: 0;
    background: transparent;
  }
  .admin-search-field input:focus {
    box-shadow: none;
  }
  .admin-favorite-filter {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 42px;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }
  .admin-favorite-filter input {
    width: 16px;
    min-height: 16px;
  }
  .admin-tool-actions {
    display: inline-flex;
    gap: var(--space-1);
  }
  .admin-list {
    display: grid;
    gap: var(--space-2);
  }
  .admin-item-card {
    padding: var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .admin-item-card:hover {
    border-color: var(--border-default);
    box-shadow: var(--shadow-md);
  }
  .admin-item-header {
    display: grid;
    grid-template-columns: 42px 28px 42px minmax(180px, 1fr) auto auto 42px;
    gap: var(--space-1);
    align-items: center;
  }
  .drag-handle {
    color: var(--text-tertiary);
    font-weight: 800;
    letter-spacing: 0;
    cursor: grab;
  }
  .icon-button, .danger-button {
    width: 42px;
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-button);
  }
  .icon-button {
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-secondary);
  }
  .icon-button.active {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
  }
  .danger-button {
    border: 1px solid var(--color-danger-border);
    background: var(--bg-surface);
    color: var(--color-danger);
  }
  .name-input {
    font-weight: var(--font-weight-bold);
  }
  .admin-item-name-field {
    display: grid;
    gap: 5px;
    min-width: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .admin-item-name-field input {
    width: 100%;
  }
  .admin-material-name-field {
    min-width: 0;
  }
  .admin-item-title {
    min-width: 0;
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .admin-item-placeholder {
    min-width: 0;
  }
  .admin-readonly-material {
    display: grid;
    gap: 4px;
    align-self: center;
    min-width: 0;
  }
  .admin-readonly-material strong {
    color: var(--text-primary);
    font-size: var(--font-size-body);
  }
  .admin-readonly-material span {
    width: fit-content;
    padding: 3px 8px;
    border: 1px solid var(--border-subtle);
    border-radius: 9999px;
    background: var(--bg-surface);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .type-badge {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }
  .admin-subitem-list, .admin-flat-list {
    display: grid;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }
  .admin-subitem-list {
    padding-left: 80px;
  }
  .admin-flat-list {
    padding-left: 0;
  }
  .wallpaper-bulk-panel {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) 140px 140px auto;
    gap: var(--space-1);
    align-items: end;
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--brand-primary-subtle);
  }
  .wallpaper-bulk-panel > div {
    display: grid;
    gap: 4px;
  }
  .wallpaper-bulk-panel strong {
    color: var(--text-primary);
  }
  .wallpaper-bulk-panel span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.5;
  }
  .wallpaper-bulk-panel label {
    display: grid;
    gap: 6px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .admin-subitem-row {
    display: grid;
    grid-template-columns: 28px minmax(160px, 1fr) 130px 42px;
    gap: var(--space-1);
    align-items: center;
  }
  .admin-value-row {
    display: grid;
    grid-template-columns: 28px minmax(150px, 1.1fr) 110px repeat(4, minmax(132px, 1fr)) 42px;
    gap: var(--space-1);
    align-items: end;
    padding: 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .admin-flat-list .admin-value-row {
    grid-template-columns: minmax(150px, 1.1fr) 110px repeat(4, minmax(132px, 1fr));
  }
  .flooring-value-row {
    grid-template-columns: 28px minmax(140px, 1.1fr) 120px 100px repeat(4, minmax(118px, 1fr)) 42px;
  }
  .admin-value-row.common-price-row {
    grid-template-columns: 28px minmax(150px, 1.1fr) 110px repeat(2, minmax(132px, 1fr)) 42px;
  }
  .admin-flat-list .admin-value-row.common-price-row {
    grid-template-columns: minmax(150px, 1.1fr) 110px repeat(2, minmax(132px, 1fr));
  }
  .flooring-value-row.common-price-row {
    grid-template-columns: 28px minmax(140px, 1.1fr) 120px 100px repeat(2, minmax(118px, 1fr)) 42px;
  }
  .admin-value-row.condition-quantity-row,
  .flooring-value-row.condition-quantity-row {
    grid-template-columns: minmax(180px, 1fr) repeat(2, minmax(132px, 180px));
  }
  .admin-value-row label {
    display: grid;
    gap: 5px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .admin-value-row label span {
    color: var(--text-tertiary);
    font-size: 11px;
    font-weight: var(--font-weight-medium);
  }
  .admin-add-subitem-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
    align-items: center;
    padding: 12px;
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .admin-add-subitem-row div {
    display: grid;
    gap: 4px;
  }
  .admin-add-subitem-row strong {
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
  }
  .admin-add-subitem-row span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.45;
  }
  .flooring-thickness-list {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  .flooring-spec-guide {
    display: grid;
    gap: 4px;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .flooring-spec-guide strong {
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
  }
  .flooring-spec-guide span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.45;
  }
  .flooring-thickness-group {
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .flooring-thickness-group summary {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: center;
    cursor: pointer;
  }
  .flooring-thickness-group summary strong {
    color: var(--text-primary);
  }
  .flooring-thickness-group summary span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .flooring-thickness-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: var(--space-1);
    margin-top: var(--space-2);
  }
  .flooring-thickness-grid label {
    display: grid;
    gap: 5px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .flooring-thickness-grid input {
    min-height: 38px;
    text-align: right;
  }
  .flat-subitem-name {
    min-height: 44px;
    display: flex;
    align-items: center;
    color: var(--text-primary);
  }
  .price-item-header {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) 240px;
    gap: var(--space-2);
    align-items: end;
    margin-bottom: 12px;
  }
  .price-item-header strong {
    font-size: var(--font-size-title-sm);
  }
  .price-item-header label, .price-row label {
    display: grid;
    gap: 6px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .price-grid {
    display: grid;
    gap: var(--space-1);
  }
  .price-row {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) 140px 180px;
    gap: var(--space-1);
    align-items: end;
    padding: 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .price-row span {
    align-self: center;
    font-weight: var(--font-weight-semibold);
  }
  .detail-cost-layout {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: var(--space-2);
  }
  .detail-subitem-panel, .detail-cost-panel {
    padding: var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .detail-subitem-panel h3, .detail-cost-panel h3 {
    margin: 0 0 8px;
  }
  .detail-subitem-list {
    display: grid;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }
  .detail-subitem-list button {
    display: grid;
    gap: 4px;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    color: var(--text-primary);
    text-align: left;
    transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
  }
  .detail-subitem-list button:hover {
    border-color: var(--border-default);
    box-shadow: var(--shadow-sm);
  }
  .detail-subitem-list button.selected {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
  }
  .detail-subitem-list span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .detail-cost-title {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: flex-start;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .detail-cost-title span {
    padding: 6px 8px;
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .detail-add-row {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) 140px 160px auto;
    gap: var(--space-1);
    margin: var(--space-2) 0;
  }
  .detail-cost-list {
    display: grid;
    gap: var(--space-1);
  }
  .detail-cost-row {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) 140px 250px 42px;
    gap: var(--space-1);
    align-items: center;
    padding: 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .detail-type-toggle {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-1);
  }
  .detail-type-toggle label {
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 8px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .detail-type-toggle label.selected {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
  }
  .detail-type-toggle input {
    width: 14px;
    min-height: 14px;
  }
  .estimate-search-panel {
    margin-bottom: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .estimate-search-panel label {
    display: grid;
    gap: var(--space-1);
    font-weight: var(--font-weight-semibold);
  }
  .estimate-list {
    display: grid;
    gap: var(--space-1);
  }
  .estimate-card {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) 180px auto;
    gap: var(--space-2);
    align-items: center;
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .estimate-card:hover {
    border-color: var(--border-default);
    box-shadow: var(--shadow-md);
  }
  .estimate-card strong {
    display: block;
    margin-bottom: 6px;
    font-size: var(--font-size-title-sm);
  }
  .estimate-card p {
    margin: 0;
    color: var(--text-secondary);
  }
  .estimate-amount {
    font-size: 28px;
    font-weight: var(--font-weight-bold);
    text-align: right;
  }
  .estimate-card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    justify-content: flex-end;
  }
  .modal-actions {
    justify-content: flex-start;
    margin-bottom: var(--space-2);
  }
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    padding: var(--space-3);
    background: var(--bg-modal-overlay);
  }
  .estimate-modal {
    width: min(860px, 100%);
    max-height: 86vh;
    overflow: auto;
    padding: var(--space-3);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-md);
  }
  .estimate-modal h3 {
    margin: 0 0 8px;
    font-size: var(--font-size-title-md);
  }
  .json-preview {
    overflow: auto;
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--text-primary);
    color: var(--bg-subtle);
  }
  .workspace {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: var(--space-3);
    max-width: 1180px;
    margin: 0 auto;
    padding: var(--space-4) var(--space-3);
  }
  .estimate-selected-condition-panel {
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--brand-primary);
    border-radius: var(--radius-card);
    background: var(--brand-primary-subtle);
    box-shadow: var(--shadow-sm);
  }
  .estimate-selected-condition-panel div {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .estimate-selected-condition-panel span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .estimate-selected-condition-panel strong {
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
    line-height: 1.4;
  }
  .estimate-selected-condition-panel p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .category-column, .editor {
    padding: var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .category-grid {
    display: grid;
    gap: var(--space-1);
    margin: var(--space-3) 0;
  }
  .condition-chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 4px 0 var(--space-2);
  }
  .condition-chip-group span {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 6px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: 9999px;
    background: var(--bg-subtle);
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
    line-height: 1;
  }
  .estimate-pyeong-panel {
    display: grid;
    gap: var(--space-1);
    margin: 0 0 var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .estimate-pyeong-panel label {
    font-weight: var(--font-weight-bold);
  }
  .estimate-pyeong-panel p {
    margin: 4px 0 0;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.5;
  }
  .estimate-pyeong-controls {
    display: grid;
    gap: var(--space-1);
  }
  .estimate-pyeong-input {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 6px;
    min-height: 42px;
    padding: 0 10px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .estimate-pyeong-input:focus-within {
    border-color: var(--brand-primary);
    background: var(--bg-surface);
  }
  .estimate-pyeong-input input {
    width: 100%;
    min-width: 0;
    min-height: 38px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font-weight: var(--font-weight-bold);
    text-align: right;
  }
  .estimate-pyeong-input input:focus {
    outline: none;
  }
  .estimate-pyeong-input span {
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
  }
  .category-card {
    min-height: 66px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-body);
    transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
  }
  .category-card:hover {
    border-color: var(--border-default);
    box-shadow: var(--shadow-sm);
  }
  .category-card.selected {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
  }
  .total-box {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-2);
    border-radius: var(--radius-card);
    border: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
  }
  .total-box span {
    color: var(--text-secondary);
  }
  .total-box strong {
    font-size: 28px;
    font-weight: var(--font-weight-bold);
    color: var(--brand-primary);
  }
  .category-back-button {
    width: 100%;
    margin-top: var(--space-2);
  }
  .editor-header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: flex-start;
    margin-bottom: var(--space-3);
  }
  .material-list {
    display: grid;
    gap: var(--space-1);
  }
  .material-row {
    display: grid;
    grid-template-columns: minmax(140px, 1fr) 150px 160px;
    gap: var(--space-1);
    align-items: center;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
  }
  .estimate-template-row {
    display: grid;
    grid-template-rows: auto 0fr;
    gap: 0;
    align-items: stretch;
    padding: 18px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease, grid-template-rows 220ms ease;
  }
  .estimate-template-row.expanded {
    grid-template-rows: auto 1fr;
    gap: var(--space-2);
  }
  .estimate-template-row.selected {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
  }
  .estimate-template-row > * {
    min-width: 0;
  }
  .estimate-template-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-width: 0;
  }
  .estimate-template-row .material-check {
    min-width: 0;
  }
  .estimate-template-row .material-check strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .estimate-template-row.missing-template {
    background: var(--bg-surface);
  }
  .selected-badge {
    flex: 0 0 auto;
    padding: 6px 8px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .estimate-row-badges {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .estimate-row-actions {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    min-width: 0;
  }
  .estimate-row-total-preview {
    color: var(--brand-primary);
    font-weight: var(--font-weight-bold);
    white-space: nowrap;
  }
  .estimate-expand-toggle {
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
    color: var(--text-primary);
  }
  .estimate-expand-toggle:hover,
  .estimate-expand-toggle:focus-visible {
    border-color: var(--brand-primary);
    color: var(--brand-primary);
  }
  .modified-badge,
  .modified-inline-badge {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 4px 7px;
    border: 1px solid var(--brand-accent-line);
    border-radius: var(--radius-button);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
    line-height: 1;
    white-space: nowrap;
  }
  .modified-inline-badge {
    min-height: 20px;
    margin-left: 6px;
    padding: 3px 6px;
    vertical-align: middle;
  }
  .estimate-template-expand {
    overflow: hidden;
    min-height: 0;
    opacity: 0;
    transform: translateY(-4px);
    transition: opacity 180ms ease, transform 220ms ease;
  }
  .estimate-template-row.expanded .estimate-template-expand {
    opacity: 1;
    transform: translateY(0);
  }
  .estimate-template-expanded-content {
    display: grid;
    grid-template-columns: minmax(360px, 1fr) minmax(170px, auto);
    gap: var(--space-2);
    align-items: center;
    padding-top: 2px;
  }
  .estimate-template-detail {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    min-width: 0;
  }
  .estimate-template-detail div {
    flex: 1 1 124px;
    min-width: 124px;
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .estimate-template-detail div:nth-child(2),
  .estimate-template-detail div:nth-child(4) {
    flex-basis: 150px;
    min-width: 150px;
  }
  .estimate-template-detail span,
  .estimate-template-total span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .estimate-draft-field {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 6px;
  }
  .estimate-draft-field input {
    width: 100%;
    min-width: 0;
    min-height: 30px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-bold);
    text-align: right;
  }
  .estimate-draft-field select {
    width: 100%;
    min-width: 0;
    min-height: 30px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-bold);
    text-align: right;
  }
  .estimate-draft-field input:focus {
    outline: none;
  }
  .estimate-draft-field select:focus {
    outline: none;
  }
  .estimate-draft-field:focus-within {
    border-radius: 4px;
    box-shadow: inset 0 -1px 0 var(--brand-primary);
  }
  .estimate-draft-field em {
    color: var(--text-secondary);
    font-style: normal;
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }
  .template-missing {
    grid-column: 1 / -1;
    margin: 0;
    padding: 10px 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    font-size: var(--font-size-body-sm);
  }
  .estimate-template-total {
    min-width: 170px;
    display: grid;
    gap: 6px;
    justify-items: end;
    text-align: right;
    color: var(--brand-primary);
  }
  .estimate-select-button {
    min-height: 36px;
    padding: 0 12px;
  }
  .estimate-template-detail .number-text,
  .estimate-template-total .number-text,
  .estimate-editor-total .number-text {
    white-space: nowrap;
  }
  .selected-item-summary {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .selected-summary-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
  }
  .selected-summary-header h3 {
    margin: 0;
    font-size: var(--font-size-title-sm);
  }
  .selected-summary-groups {
    display: grid;
    gap: var(--space-2);
  }
  .selected-summary-group {
    display: grid;
    gap: 8px;
  }
  .selected-summary-group > strong {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .selected-summary-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 30px;
    align-items: center;
    gap: var(--space-1);
    min-height: 38px;
    padding: 8px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .selected-summary-row > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
  }
  .selected-summary-remove {
    width: 30px;
    min-height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--text-tertiary);
    font-size: 18px;
    line-height: 1;
  }
  .selected-summary-remove:hover,
  .selected-summary-remove:focus-visible {
    background: var(--bg-surface);
    color: var(--color-danger);
    outline: none;
  }
  .selected-summary-empty {
    margin: 0;
  }
  .estimate-adjustment-panel,
  .site-memo-panel,
  .saved-estimate-extra {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .adjustment-list {
    display: grid;
    gap: var(--space-1);
  }
  .adjustment-row {
    display: grid;
    grid-template-columns: minmax(140px, 1.2fr) 110px 130px minmax(120px, auto) minmax(140px, 1fr) auto;
    gap: var(--space-1);
    align-items: center;
    padding: var(--space-1);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .adjustment-row input,
  .adjustment-row select {
    min-width: 0;
    background: var(--bg-surface);
  }
  .adjustment-visible-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 38px;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }
  .adjustment-visible-toggle input {
    width: 16px;
    min-height: 16px;
  }
  .adjustment-delete-button {
    min-height: 38px;
    padding: 0 10px;
  }
  .site-memo-panel label {
    display: grid;
    gap: var(--space-1);
    font-weight: var(--font-weight-semibold);
  }
  .site-memo-panel textarea {
    width: 100%;
    min-height: 92px;
    resize: vertical;
  }
  .estimate-editor-total {
    position: sticky;
    bottom: var(--space-2);
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-surface-overlay);
    box-shadow: var(--shadow-sm);
  }
  .estimate-editor-total span {
    color: var(--text-secondary);
    font-weight: var(--font-weight-semibold);
  }
  .estimate-editor-total > div {
    display: grid;
    gap: 4px;
  }
  .estimate-editor-total .final-total {
    justify-items: end;
    text-align: right;
  }
  .signed-total {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    color: var(--brand-primary);
    font-weight: var(--font-weight-bold);
    white-space: nowrap;
  }
  .signed-total.negative {
    color: var(--color-danger);
  }
  .customer-adjustment-preview {
    display: grid;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }
  .customer-adjustment-preview h3,
  .saved-estimate-extra h4 {
    margin: 0;
    font-size: var(--font-size-title-sm);
  }
  .saved-estimate-extra p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.6;
  }
  .saved-adjustment-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 80px auto;
    gap: var(--space-1);
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid var(--border-subtle);
  }
  .saved-adjustment-row:last-child {
    border-bottom: 0;
  }
  .saved-adjustment-row em {
    grid-column: 1 / -1;
    color: var(--text-secondary);
    font-style: normal;
    font-size: var(--font-size-caption);
  }
  .thumb {
    min-height: 54px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .add-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }
  .form-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
  .form-grid label {
    display: grid;
    gap: var(--space-1);
    font-weight: var(--font-weight-semibold);
  }
  .compact-key {
    margin: var(--space-2) 0;
  }
  .estimate-pyeong-preview {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-1);
    margin: 0 0 var(--space-2);
  }
  .estimate-pyeong-preview div {
    display: grid;
    gap: 4px;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .estimate-pyeong-preview span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .estimate-meta-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-1);
    margin-bottom: var(--space-2);
  }
  .estimate-meta-grid div {
    display: grid;
    gap: 4px;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .estimate-meta-grid span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .estimate-meta-grid strong {
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
  }
  .estimate-note-box {
    display: grid;
    gap: 6px;
    margin-top: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .estimate-note-box strong {
    color: var(--text-primary);
  }
  .estimate-note-box p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.6;
  }
  .pdf-capture-area {
    padding: var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .pdf-title-row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: flex-start;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border-subtle);
    margin-bottom: var(--space-2);
  }
  .pdf-title-row h3 {
    margin: 0;
    font-size: var(--font-size-title-lg);
  }
  .pdf-title-row .number-text {
    font-size: 28px;
    color: var(--brand-primary);
  }
  .number-text {
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
    font-family: var(--font-number);
    font-variant-numeric: tabular-nums;
    color: inherit;
    white-space: nowrap;
  }
  .number-text-value {
    font-weight: var(--font-weight-bold);
  }
  .number-text-unit {
    font-size: 14px;
    font-weight: var(--font-weight-regular);
    color: currentColor;
  }
  .number-text-sm {
    font-size: 15px;
  }
  .number-text-md {
    font-size: 20px;
  }
  .number-text-lg {
    font-size: 28px;
  }
  input[type="number"] {
    font-family: var(--font-number);
    font-variant-numeric: tabular-nums;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-surface);
  }
  th, td {
    padding: 13px;
    border: 1px solid var(--border-subtle);
    text-align: left;
  }
  th {
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
  }
  tfoot td {
    font-weight: var(--font-weight-bold);
    background: var(--bg-subtle);
  }
  @media (max-width: 840px) {
    .hero, .primary-action-grid, .secondary-action-grid,
    .menu-grid, .admin-menu, .workspace, .form-grid, .material-row, .sticky-summary,
    .condition-static-grid,
    .admin-pyeong-panel, .admin-catalog-actions, .admin-item-header, .admin-subitem-row, .admin-value-row, .admin-add-subitem-row,
    .admin-flat-list .admin-value-row, .price-item-header, .price-row,
    .wallpaper-bulk-panel,
    .condition-label-row,
    .template-list-row, .detail-cost-layout, .detail-add-row, .detail-cost-row, .estimate-card,
    .estimate-template-expanded-content, .estimate-template-detail, .estimate-pyeong-preview,
    .estimate-meta-grid, .adjustment-row, .estimate-editor-total {
      grid-template-columns: 1fr;
    }
    .hero {
      padding: var(--space-3) 0;
    }
    .hero-copy {
      padding-top: 0;
    }
    .hero-brand {
      margin-bottom: 0;
    }
    .global-header {
      padding: 0 var(--space-2);
    }
    .global-header.with-admin-condition {
      height: auto;
      min-height: 64px;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        "brand company"
        "condition condition";
      gap: 6px var(--space-1);
      padding-top: 8px;
      padding-bottom: 8px;
    }
    .global-header.with-admin-condition .global-brand {
      grid-area: brand;
    }
    .global-header.with-admin-condition .company-session {
      grid-area: company;
    }
    .global-header.with-admin-condition .header-admin-condition {
      grid-area: condition;
      width: 100%;
      max-width: none;
      padding: 5px 10px;
    }
    .global-header.with-admin-condition .header-admin-condition strong {
      white-space: normal;
    }
    .global-header.with-admin-condition ~ .admin-page {
      margin-top: 42px;
    }
    .company-session {
      gap: 6px;
    }
    .company-session span {
      max-width: 46vw;
    }
    .landing-session-bar {
      gap: var(--space-1);
      margin-bottom: var(--space-3);
    }
    .hero h1 {
      font-size: 34px;
      line-height: 1.2;
    }
    .hero p {
      font-size: var(--font-size-body);
    }
    .preview-lines div {
      grid-template-columns: 1fr;
    }
    .feature-card {
      min-height: 190px;
      padding: var(--space-3);
    }
    .editor-header, .actions, .condition-start-row, .estimate-selected-condition-panel, .admin-condition-title {
      flex-direction: column;
      align-items: stretch;
    }
    .load-box {
      grid-template-columns: 1fr;
    }
    .admin-subitem-list {
      padding-left: 0;
    }
    .detail-cost-title {
      flex-direction: column;
    }
    .admin-edit-title {
      flex-direction: column;
    }
    .pdf-title-row {
      flex-direction: column;
    }
    .estimate-amount {
      text-align: left;
    }
    .estimate-card-actions {
      justify-content: stretch;
      flex-direction: column;
    }
    .estimate-template-main {
      align-items: flex-start;
    }
    .estimate-row-actions {
      flex-wrap: wrap;
      justify-content: flex-start;
    }
    .estimate-template-total {
      text-align: left;
      justify-items: start;
      min-width: 0;
    }
    .estimate-template-row .material-check strong {
      white-space: normal;
    }
    .panel.wide,
    .estimate-modal,
    .pdf-capture-area {
      overflow-x: auto;
    }
    table {
      min-width: 680px;
    }
    .estimate-editor-total {
      align-items: flex-start;
    }
  }
`;
