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
  const originalOrder = (entries ?? []).map((entry) => ({
    id: entry.id,
    sort_order: entry.sort_order,
  }));
  const nextOrder = (entries ?? []).map((entry, index) => ({
    id: entry.id,
    sort_order: index,
  }));

  try {
    await Promise.all(nextOrder.map(({ id, sort_order }) => (
      supabase
        .from("sash_catalog_entries")
        .update({ sort_order })
        .eq("id", id)
        .eq("company_id", companyId)
        .then(({ error }) => throwIfError(error))
    )));
  } catch (error) {
    await Promise.allSettled(originalOrder.map(({ id, sort_order }) => (
      supabase
        .from("sash_catalog_entries")
        .update({ sort_order })
        .eq("id", id)
        .eq("company_id", companyId)
        .then(({ error: rollbackError }) => throwIfError(rollbackError))
    )));
    throw error;
  }
}
