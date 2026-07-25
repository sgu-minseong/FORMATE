const PORTAL_STATUS = {
  draft: { label: "견적 준비 중", tone: "muted" },
  sent: { label: "검토 중", tone: "primary" },
  viewed: { label: "검토 중", tone: "primary" },
  revision_requested: {
    label: "변경 요청 전달됨",
    tone: "primary",
    description: "업체에서 요청 내용을 확인하고 있습니다.",
  },
  approved: { label: "견적 확정 완료", tone: "success" },
  expired: { label: "확인 기간 만료", tone: "muted" },
  revoked: { label: "더 이상 유효하지 않은 견적", tone: "muted" },
  cancelled: { label: "더 이상 유효하지 않은 견적", tone: "muted" },
};

export function parseCustomerPortalPath(pathname = "") {
  const normalizedPath = `${pathname || "/"}`.replace(/\/+$/, "") || "/";
  const isPortal = normalizedPath === "/c" || normalizedPath.startsWith("/c/");
  if (!isPortal) return { isPortal: false, token: "" };

  const parts = normalizedPath.split("/").filter(Boolean);
  if (parts.length !== 2 || parts[0] !== "c") {
    return { isPortal: true, token: "" };
  }

  try {
    return {
      isPortal: true,
      token: decodeURIComponent(parts[1]).trim(),
    };
  } catch {
    return { isPortal: true, token: "" };
  }
}

export function getPortalStatus(status) {
  return PORTAL_STATUS[status] ?? { label: "상태 확인 중", tone: "muted" };
}

export function getPortalItems(itemsSnapshot) {
  if (Array.isArray(itemsSnapshot)) return itemsSnapshot;
  return Array.isArray(itemsSnapshot?.items) ? itemsSnapshot.items : [];
}

export function getPortalAdjustments(itemsSnapshot) {
  return Array.isArray(itemsSnapshot?.adjustments) ? itemsSnapshot.adjustments : [];
}

export function getPortalEstimateMeta(itemsSnapshot) {
  return itemsSnapshot?.estimateMeta && typeof itemsSnapshot.estimateMeta === "object"
    ? itemsSnapshot.estimateMeta
    : {};
}

export function getPortalItemLabel(item) {
  const category = `${item?.categoryName ?? item?.category ?? "시공 항목"}`.trim();
  const material = `${item?.material ?? item?.name ?? ""}`.trim();
  return [category, material].filter(Boolean).join(" · ");
}

export function getPortalItemAmount(item) {
  const value = Number(item?.totalAmount ?? item?.price ?? item?.amount ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function getPortalAdjustmentAmount(adjustment) {
  const value = Number(adjustment?.amount ?? 0);
  return Number.isFinite(value) ? Math.abs(value) : 0;
}

export function formatPortalMoney(value) {
  const number = Number(value);
  return `${Number.isFinite(number) ? number.toLocaleString("ko-KR") : "0"}원`;
}

export function formatPortalQuantity(value, unit = "") {
  if (`${value ?? ""}`.trim() === "") return "-";
  const number = Number(value);
  const display = Number.isFinite(number) ? number.toLocaleString("ko-KR") : `${value ?? "-"}`;
  return `${display}${unit ? ` ${unit}` : ""}`;
}

export function formatPortalDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `${value}`;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function getPortalConditionSummary(conditionSnapshot) {
  if (conditionSnapshot?.summary) return `${conditionSnapshot.summary}`;

  return [
    conditionSnapshot?.pyeong ? `${conditionSnapshot.pyeong}평` : "",
    conditionSnapshot?.buildType ?? conditionSnapshot?.build_type,
    conditionSnapshot?.conditionVariantLabel ?? conditionSnapshot?.condition_variant_display_label,
    conditionSnapshot?.occupancyType ?? conditionSnapshot?.occupancy_type,
    conditionSnapshot?.hasExtension === true
      ? "확장 있음"
      : conditionSnapshot?.hasExtension === false
        ? "확장 없음"
        : "",
  ].filter(Boolean).join(" · ");
}

export function getPortalErrorCopy(code) {
  if (code === "expired_token") {
    return {
      title: "만료된 견적 링크입니다",
      description: "새 링크가 필요한 경우 견적을 보낸 업체에 문의해주세요.",
    };
  }
  if (code === "revoked_token" || code === "inactive_token") {
    return {
      title: "사용이 중지된 견적 링크입니다",
      description: "현재 링크로는 견적을 확인할 수 없습니다.",
    };
  }
  if (code === "estimate_not_found") {
    return {
      title: "견적 정보를 찾을 수 없습니다",
      description: "링크가 올바른지 확인하거나 견적을 보낸 업체에 문의해주세요.",
    };
  }
  return {
    title: "유효하지 않은 견적 링크입니다",
    description: "전달받은 링크 전체를 다시 확인해주세요.",
  };
}
