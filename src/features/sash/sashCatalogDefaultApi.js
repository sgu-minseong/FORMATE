import { supabase } from "../../lib/supabaseClient";

function throwIfError(error) {
  if (error) throw error;
}

export async function fetchSashCatalogPin(
  companyId,
  pyeong,
  constructionSubitemId
) {
  if (!companyId || !pyeong || !constructionSubitemId) return null;

  const { data, error } = await supabase
    .from("sash_catalog_defaults")
    .select("id, company_id, pyeong, construction_subitem_id, sash_catalog_entry_id")
    .eq("company_id", companyId)
    .eq("pyeong", Number(pyeong))
    .eq("construction_subitem_id", constructionSubitemId)
    .maybeSingle();
  throwIfError(error);
  return data ?? null;
}

export async function fetchCompanySashCatalogPins(companyId) {
  const { data, error } = await supabase
    .from("sash_catalog_defaults")
    .select("pyeong, construction_subitem_id, sash_catalog_entry_id")
    .eq("company_id", companyId)
    .not("sash_catalog_entry_id", "is", null);
  throwIfError(error);
  return data ?? [];
}

export async function upsertSashCatalogPin({
  companyId,
  pyeong,
  constructionSubitemId,
  sashCatalogEntryId,
}) {
  const { data, error } = await supabase
    .from("sash_catalog_defaults")
    .upsert({
      company_id: companyId,
      pyeong: Number(pyeong),
      construction_subitem_id: constructionSubitemId,
      sash_catalog_entry_id: sashCatalogEntryId || null,
    }, {
      onConflict: "company_id,pyeong,construction_subitem_id",
    })
    .select("id, company_id, pyeong, construction_subitem_id, sash_catalog_entry_id")
    .single();
  throwIfError(error);
  return data;
}
