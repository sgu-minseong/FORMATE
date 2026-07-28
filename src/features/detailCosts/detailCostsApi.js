import { supabase } from "../../lib/supabaseClient";
import { fetchConstructionCatalogRows } from "../priceTable/priceTableApi";
import { buildDetailSubitems } from "./detailCostModel";

export async function fetchDetailSubitems(companyId) {
  const { itemRows, subitemRows } = await fetchConstructionCatalogRows(companyId);
  return buildDetailSubitems(itemRows, subitemRows);
}

export async function fetchDetailCosts({ companyId, subitemId }) {
  const { data, error } = await supabase.from("detail_cost_categories").select("*")
    .eq("company_id", companyId).eq("subitem_id", subitemId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertDetailCost(payload) {
  const { error } = await supabase.from("detail_cost_categories").insert(payload);
  if (error) throw error;
}

export async function updateDetailCost({ companyId, costId, patch }) {
  const { error } = await supabase.from("detail_cost_categories").update(patch)
    .eq("id", costId).eq("company_id", companyId);
  if (error) throw error;
}

export async function deleteDetailCost({ companyId, costId }) {
  const { error } = await supabase.from("detail_cost_categories").delete()
    .eq("id", costId).eq("company_id", companyId);
  if (error) throw error;
}

export async function bulkUpdateDetailCosts({ companyId, costs, cost }) {
  const results = await Promise.all(costs.map((row) =>
    supabase.from("detail_cost_categories").update({ cost })
      .eq("id", row.id).eq("company_id", companyId)
  ));
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}
