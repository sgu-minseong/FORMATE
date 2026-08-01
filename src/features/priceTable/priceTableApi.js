import { supabase } from "../../lib/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

export async function fetchConstructionCatalogRows(companyId) {
  const { data: itemRows, error: itemError } = await supabase
    .from("construction_items")
    .select("*")
    .eq("company_id", companyId)
    .order("is_favorite", { ascending: false })
    .order("sort_order", { ascending: true });

  throwIfError(itemError);

  const itemIds = (itemRows ?? []).map((item) => item.id);
  if (!itemIds.length) {
    return { itemRows: itemRows ?? [], subitemRows: [] };
  }

  const { data: subitemRows, error: subitemError } = await supabase
    .from("construction_subitems")
    .select("*")
    .in("item_id", itemIds)
    .order("sort_order", { ascending: true });

  throwIfError(subitemError);
  return { itemRows: itemRows ?? [], subitemRows: subitemRows ?? [] };
}

export async function fetchAiSetupCatalogRows(companyId) {
  const { data: itemRows, error: itemError } = await supabase
    .from("construction_items")
    .select("id, name, sort_order, is_favorite")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  throwIfError(itemError);

  const itemIds = (itemRows ?? []).map((item) => item.id);
  if (!itemIds.length) {
    return { itemRows: itemRows ?? [], subitemRows: [] };
  }

  const { data: subitemRows, error: subitemError } = await supabase
    .from("construction_subitems")
    .select("*")
    .in("item_id", itemIds)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  throwIfError(subitemError);
  return { itemRows: itemRows ?? [], subitemRows: subitemRows ?? [] };
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

export async function insertConstructionItems(payloads) {
  const { data, error } = await supabase
    .from("construction_items")
    .insert(payloads)
    .select("*");
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

export async function insertConstructionItemRow(payload) {
  const { data, error } = await supabase
    .from("construction_items")
    .insert(payload)
    .select("*")
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

export async function insertConstructionSubitems(payloads, { select = false } = {}) {
  let query = supabase.from("construction_subitems").insert(payloads);
  if (select) query = query.select("*");
  const { data, error } = await query;
  throwIfError(error);
  return data ?? [];
}

export async function insertConstructionSubitemRow(payload) {
  const { data, error } = await supabase
    .from("construction_subitems")
    .insert(payload)
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export async function updateConstructionSubitem(subitemId, payload) {
  const { error } = await supabase
    .from("construction_subitems")
    .update(payload)
    .eq("id", subitemId);
  throwIfError(error);
}

export async function updateConstructionSubitemForItem(
  subitemId,
  itemId,
  payload
) {
  const { data, error } = await supabase
    .from("construction_subitems")
    .update(payload)
    .eq("id", subitemId)
    .eq("item_id", itemId)
    .select("id");
  throwIfError(error);
  return data ?? [];
}

export async function deleteConstructionSubitem(subitemId) {
  const { error } = await supabase
    .from("construction_subitems")
    .delete()
    .eq("id", subitemId);
  throwIfError(error);
}

export async function deleteConstructionSubitems(subitemIds) {
  if (!(subitemIds ?? []).length) return;
  const { error } = await supabase
    .from("construction_subitems")
    .delete()
    .in("id", subitemIds);
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

export async function insertAdminTemplate(payload, { idOnly = false } = {}) {
  const { data, error } = await supabase
    .from("admin_condition_templates")
    .insert(payload)
    .select(idOnly ? "id" : "*")
    .single();
  throwIfError(error);
  return data;
}

export async function updateAdminTemplate(templateId, payload, { idOnly = false } = {}) {
  const { data, error } = await supabase
    .from("admin_condition_templates")
    .update(payload)
    .eq("id", templateId)
    .select(idOnly ? "id" : "*")
    .single();
  throwIfError(error);
  return data;
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
      "id, template_id, item_id, subitem_id, option_value, quantity, labor_count, construction_days"
    )
    .eq("template_id", templateId);
  throwIfError(error);
  return data ?? [];
}

export async function fetchAdminTemplateValueCandidate(
  templateId,
  subitemId,
  optionValue
) {
  const { data, error } = await supabase
    .from("admin_condition_template_values")
    .select("id, quantity, labor_count")
    .eq("template_id", templateId)
    .eq("subitem_id", subitemId)
    .eq("option_value", optionValue)
    .limit(1);
  throwIfError(error);
  return data?.[0] ?? null;
}

export async function updateAdminTemplateValue(valueId, payload) {
  const { data, error } = await supabase
    .from("admin_condition_template_values")
    .update(payload)
    .eq("id", valueId)
    .select("id");
  throwIfError(error);
  return data ?? [];
}

export async function insertAdminTemplateValue(payload) {
  const { data, error } = await supabase
    .from("admin_condition_template_values")
    .insert(payload)
    .select("id");
  throwIfError(error);
  return data ?? [];
}

export async function deleteAdminTemplateValues(templateId) {
  const { error } = await supabase
    .from("admin_condition_template_values")
    .delete()
    .eq("template_id", templateId);
  throwIfError(error);
}

export async function upsertAdminTemplateValues(payloads) {
  const { error } = await supabase
    .from("admin_condition_template_values")
    .upsert(payloads, {
      onConflict: "template_id,subitem_id,option_value",
    });
  throwIfError(error);
}
