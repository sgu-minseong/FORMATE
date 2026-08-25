import { supabase } from "../../lib/supabaseClient";
import { fetchActiveCompanySashCatalogEntries } from "./sashCatalogApi";
import { fetchCompanySashCatalogPins } from "./sashCatalogDefaultApi";
import { buildSashUsageRankings } from "./sashUsageRankingModel";

const ESTIMATE_PAGE_SIZE = 500;

async function fetchSavedSashUsageSnapshots(companyId) {
  const rows = [];

  for (let from = 0; ; from += ESTIMATE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("estimates")
      .select("id, created_at, updated_at, condition_snapshot, items_data")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, from + ESTIMATE_PAGE_SIZE - 1);
    if (error) throw error;

    const pageRows = data ?? [];
    rows.push(...pageRows);
    if (pageRows.length < ESTIMATE_PAGE_SIZE) break;
  }

  return rows;
}

export async function fetchSashUsageRankingContext(companyId) {
  const [estimates, sashCatalogEntries, sashCatalogPins] = await Promise.all([
    fetchSavedSashUsageSnapshots(companyId),
    fetchActiveCompanySashCatalogEntries(companyId),
    fetchCompanySashCatalogPins(companyId),
  ]);

  return {
    rankings: buildSashUsageRankings(estimates),
    sashCatalogEntries,
    sashCatalogPins,
  };
}
