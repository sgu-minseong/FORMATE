import { useMemo, useState } from "react";
import { toNumberOrZero } from "../../shared/utils/numbers";
import {
  bulkUpdateDetailCosts,
  deleteDetailCost,
  fetchDetailCosts,
  fetchDetailSubitems,
  insertDetailCost,
  updateDetailCost,
} from "./detailCostsApi";
import {
  buildNewDetailCostPayload,
  groupDetailSubitems,
  normalizeDetailCostPatch,
  selectBulkDetailCosts,
} from "./detailCostModel";

export function useDetailCosts({ companyId, getFriendlyError }) {
  const [subitems, setSubitems] = useState([]);
  const [selectedSubitemId, setSelectedSubitemId] = useState("");
  const [costs, setCosts] = useState([]);
  const [newCost, setNewCost] = useState({ name: "", cost: "", category_type: "basic" });
  const [bulkInput, setBulkInput] = useState({ cost: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const groups = useMemo(() => groupDetailSubitems(subitems), [subitems]);
  const selectedSubitem = subitems.find((subitem) => subitem.id === selectedSubitemId) ?? null;
  const selectedGroup = selectedSubitem
    ? groups.find((group) => group.id === selectedSubitem.item_id) ?? null
    : null;

  async function loadSubitems() {
    if (!companyId) return;
    setLoading(true); setError("");
    try {
      const rows = await fetchDetailSubitems(companyId);
      setSubitems(rows);
      setSelectedSubitemId((current) => rows.some((row) => row.id === current) ? current : rows[0]?.id ?? "");
      if (!rows.length) setCosts([]);
    } catch (loadError) {
      setError(getFriendlyError(loadError, "소재 목록을 불러오지 못했어요. 다시 시도해주세요."));
    } finally {
      setLoading(false);
    }
  }

  async function loadCosts(subitemId = selectedSubitemId) {
    if (!subitemId) return setCosts([]);
    setLoading(true); setError("");
    try {
      setCosts(await fetchDetailCosts({ companyId, subitemId }));
    } catch (loadError) {
      setError(getFriendlyError(loadError, "세부비용 항목을 불러오지 못했어요. 다시 시도해주세요."));
    } finally {
      setLoading(false);
    }
  }

  async function runMutation(action, success, fallback, reloadOnError = false) {
    setSaving(true); setError("");
    try {
      await action();
      await loadCosts();
      setNotice(success);
      return true;
    } catch (mutationError) {
      setError(getFriendlyError(mutationError, fallback));
      if (reloadOnError) await loadCosts();
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function add() {
    if (!selectedSubitemId || !newCost.name.trim()) return;
    const payload = buildNewDetailCostPayload({
      companyId, subitemId: selectedSubitemId, draft: newCost, costs,
    });
    const saved = await runMutation(
      () => insertDetailCost(payload),
      "세부비용을 추가했습니다.",
      "세부비용을 추가하지 못했어요. 다시 시도해주세요."
    );
    if (saved) setNewCost({ name: "", cost: "", category_type: "basic" });
  }

  function updateLocal(costId, patch) {
    setCosts((current) => current.map((cost) => cost.id === costId ? { ...cost, ...patch } : cost));
  }

  async function update(costId, patch) {
    const payload = normalizeDetailCostPatch(patch);
    if (Object.prototype.hasOwnProperty.call(payload, "name") && !payload.name) return loadCosts();
    await runMutation(
      () => updateDetailCost({ companyId, costId, patch: payload }),
      "세부비용을 저장했습니다.",
      "세부비용을 수정하지 못했어요. 다시 시도해주세요.",
      true
    );
  }

  async function remove(costId) {
    await runMutation(
      () => deleteDetailCost({ companyId, costId }),
      "세부비용을 삭제했습니다.",
      "세부비용을 삭제하지 못했어요. 다시 시도해주세요."
    );
  }

  async function applyBulk(mode = "empty") {
    const rawCost = `${bulkInput.cost ?? ""}`.trim();
    if (!selectedSubitemId || !rawCost) return setError("일괄 적용할 단가를 입력하세요.");
    if (mode === "overwrite" && !window.confirm("현재 소재의 세부비용 단가를 모두 덮어쓸까요?")) return;
    const targets = selectBulkDetailCosts(costs, mode);
    if (!targets.length) return setNotice("적용할 빈 단가가 없습니다.");
    await runMutation(
      () => bulkUpdateDetailCosts({ companyId, costs: targets, cost: toNumberOrZero(rawCost) }),
      `${targets.length}개 세부비용 단가를 일괄 적용했습니다.`,
      "세부비용 단가를 일괄 적용하지 못했어요. 다시 시도해주세요.",
      true
    );
  }

  function reset() {
    setSubitems([]); setSelectedSubitemId(""); setCosts([]);
    setNewCost({ name: "", cost: "", category_type: "basic" });
    setBulkInput({ cost: "" }); setLoading(false); setSaving(false); setError(""); setNotice("");
  }

  return {
    companyId, subitems, selectedSubitemId, setSelectedSubitemId, costs, newCost, setNewCost,
    bulkInput, setBulkInput, loading, saving, error, notice, groups, selectedSubitem,
    selectedGroup, loadSubitems, loadCosts, add, updateLocal, update, remove, applyBulk, reset,
  };
}
