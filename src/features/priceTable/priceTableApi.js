import { supabase } from "../../lib/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

function assertAtomicWriteResult(data, fallbackCode) {
  if (data?.ok) return data;
  const error = new Error(data?.message || "원자적 저장을 완료하지 못했습니다.");
  error.code = data?.code || fallbackCode;
  throw error;
}

export async function fetchConstructionSubitems(itemIds) {
  if (!(itemIds ?? []).length) return [];
  const { data, error } = await supabase
    .from("construction_subitems")
    .select("*")
    .in("item_id", itemIds)
    .order("sort_order", { ascending: true });
  throwIfError(error);
  return data ?? [];
}

export async function insertConstructionItem(payload) {
  const { data, error } = await supabase
    .from("construction_items")
    .insert(payload)
    .select("id, name")
    .single();
  throwIfError(error);
  return data;
}

export async function updateConstructionItem(itemId, companyId, payload) {
  const { error } = await supabase
    .from("construction_items")
    .update(payload)
    .eq("id", itemId)
    .eq("company_id", companyId);
  throwIfError(error);
}

export async function deleteConstructionItem(itemId, companyId) {
  const { error } = await supabase
    .from("construction_items")
    .delete()
    .eq("id", itemId)
    .eq("company_id", companyId);
  throwIfError(error);
}

export async function upsertSubitemPyeongValues(payloads) {
  const { error } = await supabase
    .from("subitem_pyeong_values")
    .upsert(payloads, {
      onConflict: "subitem_id,pyeong",
      ignoreDuplicates: true,
    });
  throwIfError(error);
}

export async function fetchConditionVariantLabelRows(companyId) {
  const { data, error } = await supabase
    .from("condition_variant_labels")
    .select("*")
    .eq("company_id", companyId)
    .order("variant_key", { ascending: true });
  throwIfError(error);
  return data ?? [];
}

export async function upsertConditionVariantLabelRows(payloads) {
  const { data, error } = await supabase
    .from("condition_variant_labels")
    .upsert(payloads, { onConflict: "company_id,variant_key" })
    .select("*");
  throwIfError(error);
  return data ?? payloads;
}

export async function fetchAdminTemplateRows(companyId) {
  const { data, error } = await supabase
    .from("admin_condition_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("pyeong", { ascending: true })
    .order("build_type", { ascending: true })
    .order("condition_variant", { ascending: true })
    .order("has_extension", { ascending: true });
  throwIfError(error);
  return data ?? [];
}

export async function fetchAdminTemplateCandidates(companyId, condition) {
  const { data, error } = await supabase
    .from("admin_condition_templates")
    .select("*")
    .eq("company_id", companyId)
    .eq("pyeong", condition.pyeong)
    .eq("build_type", condition.build_type)
    .eq("has_extension", condition.has_extension)
    .eq("condition_variant", condition.condition_variant);
  throwIfError(error);
  return data ?? [];
}

export async function deleteAdminTemplate(templateId, companyId) {
  const { data, error } = await supabase
    .from("admin_condition_templates")
    .delete()
    .eq("id", templateId)
    .eq("company_id", companyId)
    .select("id");
  throwIfError(error);
  return data ?? [];
}

export async function fetchAdminTemplateValues(templateId) {
  const { data, error } = await supabase
    .from("admin_condition_template_values")
    .select(
      "id, template_id, item_id, subitem_id, quantity, labor_count, labor_count_occupied, construction_days"
    )
    .eq("template_id", templateId);
  throwIfError(error);
  return data ?? [];
}

export async function fetchAdminTemplateValueCandidate(
  templateId,
  subitemId
) {
  const { data, error } = await supabase
    .from("admin_condition_template_values")
    .select("id, quantity, labor_count, labor_count_occupied, construction_days")
    .eq("template_id", templateId)
    .eq("subitem_id", subitemId)
    .limit(2);
  throwIfError(error);
  if ((data ?? []).length > 1) {
    const contractError = new Error(
      "A canonical template contains more than one value row for the same construction_subitem UUID."
    );
    contractError.code = "duplicate-template-subitem-id";
    contractError.context = { templateId, constructionSubitemId: subitemId };
    throw contractError;
  }
  return data?.[0] ?? null;
}

/**
 * Persists one PriceTable/Template save action inside one Postgres transaction.
 * Local subitem IDs are request-scoped references only; the RPC returns their
 * database UUID mapping and template value IDs after every write succeeds.
 */
export async function saveAdminCatalogAtomic({
  companyId,
  itemUpdates = [],
  subitemUpdates = [],
  subitemInserts = [],
  templateCondition = null,
  templateValues = [],
}) {
  const { data, error } = await supabase.rpc("save_admin_catalog_atomic", {
    p_company_id: companyId,
    p_item_updates: itemUpdates,
    p_subitem_updates: subitemUpdates,
    p_subitem_inserts: subitemInserts,
    p_template_condition: templateCondition,
    p_template_values: templateValues,
  });
  throwIfError(error);
  return assertAtomicWriteResult(data, "admin_catalog_atomic_save_failed");
}

/**
 * Creates/updates one canonical Template and all supplied values atomically.
 * `mode` is deliberately narrow: upsert, create_if_absent, edit, or duplicate.
 */
export async function saveAdminTemplateAtomic({
  companyId,
  condition,
  values = [],
  mode = "upsert",
  templateId = null,
  sourceTemplateId = null,
}) {
  const { data, error } = await supabase.rpc("save_admin_template_atomic", {
    p_company_id: companyId,
    p_condition: condition,
    p_values: values,
    p_mode: mode,
    p_template_id: templateId,
    p_source_template_id: sourceTemplateId,
  });
  throwIfError(error);
  return assertAtomicWriteResult(data, "admin_template_atomic_save_failed");
}

export async function reorderAdminCatalogAtomic({ companyId, entries = [] }) {
  const { data, error } = await supabase.rpc("reorder_admin_catalog_atomic", {
    p_company_id: companyId,
    p_entries: entries,
  });
  throwIfError(error);
  return assertAtomicWriteResult(data, "admin_catalog_atomic_reorder_failed");
}

export async function initializeDefaultConstructionCatalogAtomic({ companyId, catalog }) {
  const { data, error } = await supabase.rpc(
    "initialize_default_construction_catalog_atomic",
    {
      p_company_id: companyId,
      p_catalog: catalog,
    }
  );
  throwIfError(error);
  return assertAtomicWriteResult(data, "default_catalog_atomic_initialize_failed");
}

export async function createStandardCatalogEntriesAtomic({ companyId, entries = [] }) {
  const { data, error } = await supabase.rpc(
    "create_standard_catalog_entries_atomic",
    {
      p_company_id: companyId,
      p_entries: entries,
    }
  );
  throwIfError(error);
  return assertAtomicWriteResult(data, "standard_catalog_entries_atomic_create_failed");
}
