import { supabase } from "../../lib/supabaseClient";

export const SASH_OPTION_KINDS = Object.freeze({
  SCREEN: "screen",
  GLASS_TYPE: "glass_type",
  GAS: "gas",
  GLASS_THICKNESS: "glass_thickness",
  HANDLE_TYPE: "handle_type",
  WINDOW_COUNT: "window_count",
  WINDOW_TYPE: "window_type",
});

const VALID_OPTION_KINDS = new Set(Object.values(SASH_OPTION_KINDS));
const VALID_WINDOW_TYPE_SEMANTICS = new Set(["single", "double"]);

function throwIfError(error) {
  if (error) throw error;
}

function requireText(value, message) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(message);
  return normalized;
}

function requireOptionKind(optionKind) {
  const normalized = String(optionKind ?? "").trim();
  if (!VALID_OPTION_KINDS.has(normalized)) throw new Error("지원하지 않는 샷시 옵션 종류입니다.");
  return normalized;
}

export function buildSashOptionValuePayload({
  companyId,
  optionKind,
  label,
  semanticValue = null,
  sortOrder = 0,
}) {
  const normalizedKind = requireOptionKind(optionKind);
  const normalizedSemantic = String(semanticValue ?? "").trim() || null;
  if (
    normalizedKind === SASH_OPTION_KINDS.WINDOW_TYPE
    && !VALID_WINDOW_TYPE_SEMANTICS.has(normalizedSemantic)
  ) {
    throw new Error("창 유형 옵션은 단창 또는 2중창 의미를 선택해야 합니다.");
  }
  return {
    company_id: requireText(companyId, "회사 정보가 필요합니다."),
    option_kind: normalizedKind,
    label: requireText(label, "옵션 이름을 입력하세요."),
    semantic_value: normalizedKind === SASH_OPTION_KINDS.WINDOW_TYPE
      ? normalizedSemantic
      : null,
    sort_order: Number(sortOrder) || 0,
  };
}

export async function listSashOptionValues(
  companyId,
  optionKind = "",
  { includeArchived = false } = {}
) {
  let query = supabase
    .from("sash_option_values")
    .select("*")
    .eq("company_id", requireText(companyId, "회사 정보가 필요합니다."));
  if (optionKind) query = query.eq("option_kind", requireOptionKind(optionKind));
  if (!includeArchived) query = query.is("archived_at", null);
  const { data, error } = await query
    .order("option_kind", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  throwIfError(error);
  return data ?? [];
}

export async function createSashOptionValue(option) {
  const { data, error } = await supabase
    .from("sash_option_values")
    .insert(buildSashOptionValuePayload(option))
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export async function renameSashOptionValue(optionId, companyId, label) {
  const { data, error } = await supabase
    .from("sash_option_values")
    .update({ label: requireText(label, "옵션 이름을 입력하세요.") })
    .eq("id", requireText(optionId, "샷시 옵션 정보가 필요합니다."))
    .eq("company_id", requireText(companyId, "회사 정보가 필요합니다."))
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export async function archiveSashOptionValue(optionId, companyId) {
  const { data, error } = await supabase
    .from("sash_option_values")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", requireText(optionId, "샷시 옵션 정보가 필요합니다."))
    .eq("company_id", requireText(companyId, "회사 정보가 필요합니다."))
    .select("*")
    .single();
  throwIfError(error);
  return data;
}
