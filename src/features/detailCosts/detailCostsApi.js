import { supabase } from "../../lib/supabaseClient";
import { fetchConstructionCatalogRows } from "../constructionCatalog/constructionCatalogApi";
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
  const { data, error } = await supabase.rpc("bulk_update_detail_costs_atomic", {
    p_company_id: companyId,
    p_cost_ids: costs.map((row) => row.id),
    p_cost: cost,
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.message || "세부비용을 일괄 저장하지 못했습니다.");
  return data;
}
