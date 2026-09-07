import { supabase } from "../../lib/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

function requireText(value, message) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(message);
  return normalized;
}

export async function listSashConditions(companyId) {
  const { data, error } = await supabase
    .from("sash_conditions")
    .select("*")
    .eq("company_id", requireText(companyId, "회사 정보가 필요합니다."))
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  throwIfError(error);
  return data ?? [];
}

export async function createSashCondition({ companyId, name, sortOrder = 0 }) {
  const { data, error } = await supabase
    .from("sash_conditions")
    .insert({
      company_id: requireText(companyId, "회사 정보가 필요합니다."),
      name: requireText(name, "샷시 조건 이름을 입력하세요."),
      sort_order: Number(sortOrder) || 0,
    })
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export async function renameSashCondition(conditionId, companyId, name) {
  const { data, error } = await supabase
    .from("sash_conditions")
    .update({ name: requireText(name, "샷시 조건 이름을 입력하세요.") })
    .eq("id", requireText(conditionId, "샷시 조건 정보가 필요합니다."))
    .eq("company_id", requireText(companyId, "회사 정보가 필요합니다."))
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export async function reorderSashConditions(conditions, companyId) {
  const scopedCompanyId = requireText(companyId, "회사 정보가 필요합니다.");
  await Promise.all((conditions ?? []).map(async (condition, index) => {
    const { error } = await supabase
      .from("sash_conditions")
      .update({ sort_order: index })
      .eq("id", requireText(condition?.id, "샷시 조건 정보가 필요합니다."))
      .eq("company_id", scopedCompanyId);
    throwIfError(error);
  }));
}

export async function archiveSashCondition(conditionId, companyId) {
  const { data, error } = await supabase
    .from("sash_conditions")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", requireText(conditionId, "샷시 조건 정보가 필요합니다."))
    .eq("company_id", requireText(companyId, "회사 정보가 필요합니다."))
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export async function loadSashConditionMappings(companyId, sashConditionId) {
  const { data, error } = await supabase
    .from("sash_condition_entries")
    .select("*, sash_catalog_entry:sash_catalog_entries(*)")
    .eq("company_id", requireText(companyId, "회사 정보가 필요합니다."))
    .eq("sash_condition_id", requireText(sashConditionId, "샷시 조건 정보가 필요합니다."))
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  throwIfError(error);
  return data ?? [];
}

export function buildSashConditionMappingPayload({
  companyId,
  sashConditionId,
  constructionSubitemId,
  sashCatalogEntryId,
  sortOrder = 0,
}) {
  return {
    company_id: requireText(companyId, "회사 정보가 필요합니다."),
    sash_condition_id: requireText(sashConditionId, "샷시 조건 정보가 필요합니다."),
    construction_subitem_id: requireText(constructionSubitemId, "샷시 항목 정보가 필요합니다."),
    sash_catalog_entry_id: requireText(sashCatalogEntryId, "샷시 규격 정보가 필요합니다."),
    sort_order: Number(sortOrder) || 0,
    archived_at: null,
  };
}

export async function upsertSashConditionMapping(mapping) {
  const { data, error } = await supabase
    .from("sash_condition_entries")
    .upsert(buildSashConditionMappingPayload(mapping), {
      onConflict: "sash_condition_id,construction_subitem_id",
    })
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export async function removeSashConditionMapping({
  companyId,
  sashConditionId,
  constructionSubitemId,
}) {
  const { data, error } = await supabase
    .from("sash_condition_entries")
    .update({ archived_at: new Date().toISOString() })
    .eq("company_id", requireText(companyId, "회사 정보가 필요합니다."))
    .eq("sash_condition_id", requireText(sashConditionId, "샷시 조건 정보가 필요합니다."))
    .eq("construction_subitem_id", requireText(constructionSubitemId, "샷시 항목 정보가 필요합니다."))
    .select("*")
    .maybeSingle();
  throwIfError(error);
  return data;
}
