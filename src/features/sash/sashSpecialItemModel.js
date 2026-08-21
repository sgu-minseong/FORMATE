import {
  hasNumericInput,
  toNonNegativeNumberOrZero,
} from "../../shared/utils/numbers";
import {
  getSashAreaPreview,
  isBalconySashLocation,
} from "./sashCatalogModel";

export const LOCAL_SASH_SPECIAL_ITEM_PREFIX = "local-sash-special-item-";
const SASH_SPECIAL_ITEM_SNAPSHOT_VERSION = 1;

function createLocalSpecialItemId() {
  const randomId = globalThis.crypto?.randomUUID?.()
    ?? Date.now() + "-" + Math.random().toString(16).slice(2);
  return LOCAL_SASH_SPECIAL_ITEM_PREFIX + randomId;
}

export function isLocalSashSpecialItem(item) {
  return String(item?.id ?? "").startsWith(LOCAL_SASH_SPECIAL_ITEM_PREFIX);
}

export function createLocalSashSpecialItem({
  id = createLocalSpecialItemId(),
  sortOrder = 0,
} = {}) {
  return {
    id,
    description: "",
    width_mm: "",
    height_mm: "",
    area_sqm: null,
    amount: "",
    sort_order: sortOrder,
    archived_at: null,
    created_at: "",
    updated_at: "",
  };
}

export function normalizeSashSpecialItem(item) {
  return {
    ...item,
    description: String(item?.description ?? ""),
    width_mm: item?.width_mm ?? "",
    height_mm: item?.height_mm ?? "",
    amount: item?.amount ?? "",
    sort_order: Number(item?.sort_order ?? 0),
  };
}

export function getSashSpecialItemArea(item) {
  const calculatedArea = getSashAreaPreview(item?.width_mm, item?.height_mm);
  if (calculatedArea !== "") return calculatedArea;
  const storedArea = Number(item?.area_sqm);
  return Number.isFinite(storedArea) && storedArea > 0 ? storedArea : 0;
}

export function getSashSpecialItemValidationError(item) {
  if (!String(item?.description ?? "").trim()) return "특이사항 설명을 입력하세요.";
  if (!hasNumericInput(item?.width_mm) || Number(item.width_mm) <= 0) {
    return "기본 가로(mm)를 0보다 크게 입력하세요.";
  }
  if (!hasNumericInput(item?.height_mm) || Number(item.height_mm) <= 0) {
    return "기본 세로(mm)를 0보다 크게 입력하세요.";
  }
  if (!hasNumericInput(item?.amount)) return "특이사항 금액을 입력하세요.";
  return "";
}

export function buildSashSpecialItemPayload(item, { companyId } = {}) {
  return {
    company_id: companyId,
    description: String(item?.description ?? "").trim(),
    width_mm: Math.trunc(Number(item?.width_mm)),
    height_mm: Math.trunc(Number(item?.height_mm)),
    amount: toNonNegativeNumberOrZero(item?.amount),
    sort_order: Number(item?.sort_order ?? 0),
  };
}

export function createSashSpecialItemSnapshot(item) {
  const canonicalId = String(item?.id ?? "").trim();
  if (!canonicalId || isLocalSashSpecialItem(item)) {
    throw new Error("저장된 canonical 샷시 특이사항 ID가 필요합니다.");
  }
  return {
    sash_special_item_snapshot_version: SASH_SPECIAL_ITEM_SNAPSHOT_VERSION,
    sash_special_item_id: canonicalId,
    description: String(item?.description ?? "").trim(),
    width_mm: Number(item?.width_mm) || 0,
    height_mm: Number(item?.height_mm) || 0,
    area_sqm: getSashSpecialItemArea(item),
    amount: toNonNegativeNumberOrZero(item?.amount),
  };
}

export function buildSashSpecialItemSelection(item) {
  const snapshot = createSashSpecialItemSnapshot(item);
  return {
    sashSpecialItemId: snapshot.sash_special_item_id,
    sashSpecialItemSnapshot: snapshot,
  };
}

export function buildSashSpecialItemSelectionPatch(selection, patch = {}) {
  const canonicalId = String(
    selection?.sashSpecialItemId
      ?? selection?.sashSpecialItemSnapshot?.sash_special_item_id
      ?? ""
  ).trim();
  if (!canonicalId) return selection;
  return buildSashSpecialItemSelection({
    ...(selection?.sashSpecialItemSnapshot ?? {}),
    ...patch,
    id: canonicalId,
    area_sqm: null,
  });
}

function normalizeSashSpecialItemSelection(selection) {
  const canonicalId = String(
    selection?.sashSpecialItemId
      ?? selection?.sash_special_item_id
      ?? selection?.sashSpecialItemSnapshot?.sash_special_item_id
      ?? ""
  ).trim();
  const source = selection?.sashSpecialItemSnapshot ?? selection?.snapshot ?? selection;
  const snapshotId = String(source?.sash_special_item_id ?? canonicalId).trim();
  if (!canonicalId || !snapshotId || canonicalId !== snapshotId) {
    throw new Error("샷시 특이사항 selection ID와 snapshot ID가 일치해야 합니다.");
  }
  const storedSnapshotArea = Number(source?.area_sqm);
  return {
    sashSpecialItemId: canonicalId,
    sashSpecialItemSnapshot: {
      sash_special_item_snapshot_version:
        Number(source?.sash_special_item_snapshot_version) || SASH_SPECIAL_ITEM_SNAPSHOT_VERSION,
      sash_special_item_id: canonicalId,
      description: String(source?.description ?? "").trim(),
      width_mm: Number(source?.width_mm) || 0,
      height_mm: Number(source?.height_mm) || 0,
      area_sqm: Number.isFinite(storedSnapshotArea) && storedSnapshotArea >= 0
        ? storedSnapshotArea
        : getSashSpecialItemArea(source),
      amount: toNonNegativeNumberOrZero(source?.amount),
    },
  };
}

export function buildSashSpecialItemSelectionsSnapshot(
  selections = [],
  locationKind = null
) {
  if (!isBalconySashLocation(locationKind)) return [];
  const seenIds = new Set();
  return (selections ?? []).map((selection) => {
    const normalized = normalizeSashSpecialItemSelection(selection);
    if (seenIds.has(normalized.sashSpecialItemId)) {
      throw new Error("같은 샷시 특이사항을 중복 선택할 수 없습니다.");
    }
    seenIds.add(normalized.sashSpecialItemId);
    return normalized;
  });
}

export function getSashSpecialItemSelectionsAmount(
  selections = [],
  locationKind = null
) {
  if (!isBalconySashLocation(locationKind)) return 0;
  return (selections ?? []).reduce((sum, selection) => {
    const snapshot = selection?.sashSpecialItemSnapshot ?? selection?.snapshot ?? selection;
    return sum + toNonNegativeNumberOrZero(snapshot?.amount);
  }, 0);
}
