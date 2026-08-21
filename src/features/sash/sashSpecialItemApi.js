import { supabase } from "../../lib/supabaseClient";
import { buildSashSpecialItemPayload } from "./sashSpecialItemModel";

function throwIfError(error) {
  if (error) throw error;
}

export async function fetchActiveSashSpecialItems(companyId) {
  const { data, error } = await supabase
    .from("sash_special_items")
    .select("*")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  throwIfError(error);
  return data ?? [];
}

export async function insertSashSpecialItem(item, companyId) {
  const { data, error } = await supabase
    .from("sash_special_items")
    .insert(buildSashSpecialItemPayload(item, { companyId }))
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export async function updateSashSpecialItem(item, companyId) {
  const { data, error } = await supabase
    .from("sash_special_items")
    .update(buildSashSpecialItemPayload(item, { companyId }))
    .eq("id", item.id)
    .eq("company_id", companyId)
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export async function archiveSashSpecialItem(itemId, companyId) {
  const { data, error } = await supabase
    .from("sash_special_items")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("company_id", companyId)
    .select("id, archived_at")
    .single();
  throwIfError(error);
  return data;
}
