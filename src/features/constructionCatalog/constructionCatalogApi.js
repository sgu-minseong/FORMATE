import { supabase } from "../../lib/supabaseClient";
import { buildCanonicalConstructionCatalog } from "./constructionCatalogModel";

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

export async function fetchCanonicalConstructionCatalogRows(companyId) {
  const catalogRows = await fetchConstructionCatalogRows(companyId);
  const constructionItemIds = [...new Set(
    (catalogRows.itemRows ?? []).map((row) => row.id).filter(Boolean)
  )];
  if (!constructionItemIds.length) {
    return {
      ...catalogRows,
      variantGroupRows: [],
      canonicalCatalog: buildCanonicalConstructionCatalog({
        itemRows: catalogRows.itemRows,
        subitemRows: catalogRows.subitemRows,
        variantGroupRows: [],
      }),
    };
  }

  // Archived groups must remain loaded so the model can distinguish a valid
  // historical relation from missing metadata without reviving its base row.
  const { data, error } = await supabase
    .from("construction_subitem_variant_groups")
    .select("*")
    .in("construction_item_id", constructionItemIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  throwIfError(error);

  const variantGroupRows = data ?? [];
  const canonicalCatalog = buildCanonicalConstructionCatalog({
    itemRows: catalogRows.itemRows,
    subitemRows: catalogRows.subitemRows,
    variantGroupRows,
  });

  return { ...catalogRows, variantGroupRows, canonicalCatalog };
}

export async function insertCanonicalVariantGroup(payload) {
  const { data, error } = await supabase
    .from("construction_subitem_variant_groups")
    .insert(payload)
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export async function updateCanonicalVariantGroup(
  variantGroupId,
  constructionItemId,
  payload
) {
  const { data, error } = await supabase
    .from("construction_subitem_variant_groups")
    .update(payload)
    .eq("id", variantGroupId)
    .eq("construction_item_id", constructionItemId)
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export async function insertCanonicalVariantSubitem(payload) {
  const { data, error } = await supabase
    .from("construction_subitems")
    .insert(payload)
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export async function updateCanonicalConstructionSubitem(
  constructionSubitemId,
  constructionItemId,
  payload
) {
  const { data, error } = await supabase
    .from("construction_subitems")
    .update(payload)
    .eq("id", constructionSubitemId)
    .eq("item_id", constructionItemId)
    .select("*")
    .single();
  throwIfError(error);
  return data;
}

export function archiveCanonicalVariantGroup(
  variantGroupId,
  constructionItemId,
  archivedAt = new Date().toISOString()
) {
  return updateCanonicalVariantGroup(
    variantGroupId,
    constructionItemId,
    { archived_at: archivedAt }
  );
}

export function archiveCanonicalConstructionSubitem(
  constructionSubitemId,
  constructionItemId,
  archivedAt = new Date().toISOString()
) {
  return updateCanonicalConstructionSubitem(
    constructionSubitemId,
    constructionItemId,
    { archived_at: archivedAt }
  );
}
