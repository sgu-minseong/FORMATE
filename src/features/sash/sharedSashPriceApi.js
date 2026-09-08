import { supabase } from "../../lib/supabaseClient";
import { normalizeSashCatalogEntry } from "./sashCatalogModel";
import {
  buildSharedPriceExpectedRows,
  classifySashPriceCandidate,
  hasSashPriceCandidateAnchor,
  SASH_PRICE_MATCH,
} from "./sharedSashPriceModel";

const ENTRY_SELECT = `
  *,
  sash_price:sash_prices!sash_catalog_entries_company_sash_price_fkey(
    id,
    unit_price,
    updated_at
  ),
  construction_subitem:construction_subitems(
    id,
    name,
    sash_location_kind
  )
`;

function throwIfError(error) {
  if (error) throw error;
}

function attachConditionNames(rows, mappings) {
  const namesByEntryId = new Map();
  (mappings ?? []).forEach((mapping) => {
    const condition = mapping.sash_condition ?? mapping.sash_conditions;
    if (!condition?.name || condition.archived_at) return;
    const names = namesByEntryId.get(mapping.sash_catalog_entry_id) ?? [];
    if (!names.includes(condition.name)) names.push(condition.name);
    namesByEntryId.set(mapping.sash_catalog_entry_id, names);
  });
  return rows.map((row) => ({
    ...normalizeSashCatalogEntry(row),
    sashConditionNames: namesByEntryId.get(row.id) ?? [],
  }));
}

async function fetchConditionMappings(companyId, entryIds) {
  if (!entryIds.length) return [];
  const { data, error } = await supabase
    .from("sash_condition_entries")
    .select(`
      sash_catalog_entry_id,
      sash_condition:sash_conditions!inner(name, archived_at)
    `)
    .eq("company_id", companyId)
    .in("sash_catalog_entry_id", entryIds)
    .is("archived_at", null)
    .is("sash_condition.archived_at", null);
  throwIfError(error);
  return data ?? [];
}

export async function fetchSharedSashPriceImpact(companyId, sourceEntryId) {
  const { data: sourceData, error: sourceError } = await supabase
    .from("sash_catalog_entries")
    .select(ENTRY_SELECT)
    .eq("company_id", companyId)
    .eq("id", sourceEntryId)
    .is("archived_at", null)
    .single();
  throwIfError(sourceError);
  const source = normalizeSashCatalogEntry(sourceData);

  const memberRequest = source.sash_price_id
    ? supabase
        .from("sash_catalog_entries")
        .select(ENTRY_SELECT)
        .eq("company_id", companyId)
        .eq("sash_price_id", source.sash_price_id)
        .is("archived_at", null)
        .order("created_at", { ascending: true })
    : Promise.resolve({ data: [sourceData], error: null });

  let candidateRequest = Promise.resolve({ data: [], error: null });
  if (hasSashPriceCandidateAnchor(source)) {
    candidateRequest = supabase
      .from("sash_catalog_entries")
      .select(ENTRY_SELECT)
      .eq("company_id", companyId)
      .eq("width_mm", source.width_mm)
      .eq("height_mm", source.height_mm)
      .eq("window_type", source.window_type)
      .is("archived_at", null)
      .neq("id", source.id)
      .order("created_at", { ascending: true });
  }

  const [memberResult, candidateResult] = await Promise.all([
    memberRequest,
    candidateRequest,
  ]);
  throwIfError(memberResult.error);
  throwIfError(candidateResult.error);

  const currentMemberIds = new Set((memberResult.data ?? []).map((row) => row.id));
  const candidateData = (candidateResult.data ?? []).filter((row) => (
    !currentMemberIds.has(row.id)
  ));
  const allRows = [...(memberResult.data ?? []), ...candidateData];
  const mappings = await fetchConditionMappings(companyId, allRows.map((row) => row.id));
  const hydratedRows = attachConditionNames(allRows, mappings);
  const hydratedById = new Map(hydratedRows.map((row) => [row.id, row]));
  const hydratedSource = hydratedById.get(source.id) ?? {
    ...source,
    sashConditionNames: [],
  };
  const currentMembers = (memberResult.data ?? [])
    .map((row) => hydratedById.get(row.id))
    .filter(Boolean);
  const matchOrder = {
    [SASH_PRICE_MATCH.HIGH]: 0,
    [SASH_PRICE_MATCH.PARTIAL]: 1,
    [SASH_PRICE_MATCH.SPEC_DIFFERENCE]: 2,
  };
  const candidates = candidateData
    .map((row) => hydratedById.get(row.id))
    .filter(Boolean)
    .map((row) => ({ ...row, ...classifySashPriceCandidate(hydratedSource, row) }))
    .filter((row) => row.classification)
    .sort((left, right) => (
      matchOrder[left.classification] - matchOrder[right.classification]
      || String(left.construction_subitem?.name ?? "")
        .localeCompare(String(right.construction_subitem?.name ?? ""), "ko")
    ));

  return {
    anchorReady: hasSashPriceCandidateAnchor(hydratedSource),
    candidates,
    currentMembers,
    expectedRows: buildSharedPriceExpectedRows([
      ...currentMembers,
      ...candidates,
    ]),
    source: hydratedSource,
  };
}

export async function applySharedSashPrice({
  companyId,
  expectedPriceGroups,
  impact,
  selectedEntryIds,
  unitPrice,
  confirmGroupMoves = false,
}) {
  const { data, error } = await supabase.rpc("apply_shared_sash_price", {
    p_company_id: companyId,
    p_source_entry_id: impact.source.id,
    p_unit_price: Number(unitPrice),
    p_selected_entry_ids: selectedEntryIds,
    p_expected_price_groups: expectedPriceGroups,
    p_expected_rows: impact.expectedRows,
    p_confirm_group_moves: confirmGroupMoves,
  });
  if (error?.code === "40001") {
    throw new Error("다른 사용자가 공유 단가를 변경했습니다. 최신 상태를 다시 확인해주세요.");
  }
  throwIfError(error);
  return data?.[0] ?? data;
}

export async function detachSharedSashPriceMember({ companyId, entry }) {
  const { data, error } = await supabase.rpc("detach_shared_sash_price_member", {
    p_company_id: companyId,
    p_entry_id: entry.id,
    p_expected_entry_updated_at: entry.updated_at,
    p_expected_price_updated_at: entry.sash_price?.updated_at ?? null,
  });
  if (error?.code === "40001") {
    throw new Error("다른 사용자가 공유 단가를 변경했습니다. 최신 상태를 다시 확인해주세요.");
  }
  throwIfError(error);
  return data?.[0] ?? data;
}
