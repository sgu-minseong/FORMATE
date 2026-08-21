import { supabase } from "../../lib/supabaseClient";
import {
  buildSashCatalogEntryCounts,
  buildSashCatalogEntryPayload,
} from "./sashCatalogModel";

function throwIfError(error) {
  if (error) throw error;
}

export async function fetchActiveSashCatalogEntries(companyId, constructionSubitemId) {
  const { data, error } = await supabase
    .from("sash_catalog_entries")
    .select("*")
    .eq("company_id", companyId)
    .eq("construction_subitem_id", constructionSubitemId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  throwIfError(error);
  return data ?? [];
}

export async function fetchActiveCompanySashCatalogEntries(companyId) {
  const { data, error } = await supabase
    .from("sash_catalog_entries")
    .select("*")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  throwIfError(error);
  return data ?? [];
}

export async function fetchActiveSashCatalogEntryCounts(companyId, constructionSubitemIds = []) {
  const requestedIds = [...new Set(constructionSubitemIds.filter(Boolean))];
  const persistedIds = requestedIds.filter((id) => !String(id).startsWith("local-subitem-"));
  if (!companyId || !persistedIds.length) {
    return buildSashCatalogEntryCounts([], requestedIds);
  }

  const { data, error } = await supabase
    .from("sash_catalog_entries")
    .select("construction_subitem_id, archived_at")
    .eq("company_id", companyId)
    .in("construction_subitem_id", persistedIds)
    .is("archived_at", null);
  throwIfError(error);
  return buildSashCatalogEntryCounts(data ?? [], requestedIds);
}

export async function insertSashCatalogEntry(entry, context) {
  const { data, error } = await supabase
    .from("sash_catalog_entries")
    .insert(buildSashCatalogEntryPayload(entry, context))
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export async function updateSashCatalogEntry(entry, context) {
  const { data, error } = await supabase
    .from("sash_catalog_entries")
    .update(buildSashCatalogEntryPayload(entry, context))
    .eq("id", entry.id)
    .eq("company_id", context.companyId)
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export async function archiveSashCatalogEntry(entryId, companyId) {
  const { data, error } = await supabase
    .from("sash_catalog_entries")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("company_id", companyId)
    .select("id, archived_at")
    .single();
  throwIfError(error);
  return data;
}

export async function saveSashCatalogEntryOrder(entries, companyId) {
  const { data, error } = await supabase.rpc(
    "reorder_sash_catalog_entries_atomic",
    {
      p_company_id: companyId,
      p_ordered_ids: (entries ?? []).map((entry) => entry.id),
    }
  );
  throwIfError(error);
  return data;
}
