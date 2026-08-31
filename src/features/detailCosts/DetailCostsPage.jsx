import { Plus, RefreshCcw, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import CategorySidebar from "../../components/ui/CategorySidebar";
import EmptyState from "../../components/ui/EmptyState";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import Table from "../../components/ui/Table";
import { usePersistentTableWidths } from "../../components/ui/tableWidths";
import { formatDisplayTimestampDate } from "../../shared/utils/dates";
import { formatMoneyInputValue, stripNumberInputFormatting } from "../../shared/utils/numbers";

export const DETAIL_COST_TABLE_COLUMNS = [
  { key: "name", label: "비용명/부자재명", defaultWidth: 240, minWidth: 160, maxWidth: 420 },
  { key: "cost", label: "단가", align: "right", defaultWidth: 110, minWidth: 88, maxWidth: 180 },
  { key: "categoryType", label: "구분", defaultWidth: 220, minWidth: 180, maxWidth: 320 },
  { key: "updated_at", label: "수정일", defaultWidth: 92, minWidth: 76, maxWidth: 140 },
  { key: "actions", label: "삭제", align: "right", defaultWidth: 80, minWidth: 64, maxWidth: 112 },
];

export default function DetailCostsPage({ controller }) {
  const {
    companyId,
    subitems, selectedSubitemId, setSelectedSubitemId, costs, newCost, setNewCost,
    bulkInput, setBulkInput, loading, saving, error, groups, selectedSubitem, selectedGroup,
    loadSubitems, loadCosts, add, updateLocal, update, remove, applyBulk,
  } = controller;
  const tableLayout = usePersistentTableWidths({
    companyId,
    tableId: "detail-costs",
    columns: DETAIL_COST_TABLE_COLUMNS,
  });
  return (
    <main className="panel-page admin-page detail-cost-page">
      <PageHeader
        title="세부 비용 관리"
        actions={(
          <>
            <Button variant="tertiary" className="table-layout-reset" onClick={tableLayout.resetWidths}>열 너비 초기화</Button>
            <Button variant="secondary" leftIcon={<RefreshCcw />} disabled={loading || saving} onClick={() => { loadSubitems(); if (selectedSubitemId) loadCosts(selectedSubitemId); }}>되돌리기</Button>
          </>
        )}
      />
      {loading && <div className="status-box">불러오는 중...</div>}
      {saving && <div className="status-box">저장 중...</div>}
      {error && <div className="error-box">{error}</div>}
      <section className="detail-cost-layout">
        <div className="detail-cost-sidebar">
          <CategorySidebar
            title="대분류/소재"
            aria-label="세부견적 소재 선택"
            items={groups.flatMap((group) => group.subitems.map((subitem) => ({
              id: subitem.id, label: `${group.name} · ${subitem.name}`,
              active: selectedSubitemId === subitem.id,
            })))}
            onSelect={setSelectedSubitemId}
          />
          <p className="muted caption detail-cost-sidebar-hint">소재를 선택하면 오른쪽에서 내부 비용을 관리합니다.</p>
          {!loading && !subitems.length && <EmptyState className="detail-cost-empty" title="등록된 소재가 없습니다." description="먼저 시공항목 수정에서 소재를 추가하세요." />}
        </div>
        <section className="detail-cost-panel">
          <div className="detail-cost-title">
            <div>
              <p className="eyebrow dark">내부 비용 관리</p>
              <h3>{selectedSubitem ? selectedSubitem.name : "부자재 및 기타 비용 관리"}</h3>
              {selectedGroup && <p className="muted caption">{selectedGroup.name} / {selectedSubitem?.unit || "단위 미지정"}</p>}
            </div>
            <span>고객용 견적서에는 표시하지 않는 내부 비용</span>
          </div>
          <div className="detail-add-row">
            <Input value={newCost.name} onChange={(event) => setNewCost((current) => ({ ...current, name: event.target.value }))} placeholder="항목명 예: 풀, 아크졸, 부직포" disabled={!selectedSubitemId} />
            <Input type="text" inputMode="numeric" value={formatMoneyInputValue(newCost.cost)} onChange={(event) => setNewCost((current) => ({ ...current, cost: stripNumberInputFormatting(event.target.value) }))} placeholder="단가" disabled={!selectedSubitemId} />
            <select value={newCost.category_type} onChange={(event) => setNewCost((current) => ({ ...current, category_type: event.target.value }))} disabled={!selectedSubitemId}>
              <option value="basic">기본에 포함</option><option value="full">전체에만 포함</option>
            </select>
            <Button variant="primary" leftIcon={<Plus />} disabled={!selectedSubitemId || saving || !newCost.name.trim()} onClick={add}>추가</Button>
          </div>
          <div className="detail-bulk-panel">
            <div><strong>현재 소재 단가 일괄입력</strong><span>현재 선택한 소재의 세부 비용에만 적용합니다. 인건비/메모는 현재 DB 컬럼이 없어 저장하지 않습니다.</span></div>
            <label>단가<Input type="text" inputMode="numeric" value={formatMoneyInputValue(bulkInput.cost)} onChange={(event) => setBulkInput({ cost: stripNumberInputFormatting(event.target.value) })} placeholder="예: 12000" disabled={!selectedSubitemId} /></label>
            <div className="detail-bulk-actions">
              <Button variant="secondary" disabled={!selectedSubitemId || saving} onClick={() => applyBulk("empty")}>빈/0 단가에 적용</Button>
              <Button variant="danger" size="sm" disabled={!selectedSubitemId || saving} onClick={() => applyBulk("overwrite")}>전체 단가 덮어쓰기</Button>
            </div>
          </div>
          <div className="detail-cost-list">
            {costs.length > 0 && (
              <Table
                className="detail-cost-table"
                columns={tableLayout.columns}
                rows={costs.map((cost) => ({ id: cost.id, detailCost: cost }))}
                emptyAsZeroMuted
                resizable
                onColumnResizeStart={tableLayout.startResize}
                onColumnResizeBy={tableLayout.resizeColumnBy}
                renderCell={({ row, column }) => {
                  const cost = row.detailCost;
                  if (column.key === "name") return <input className="detail-cost-table-input" value={cost.name} onChange={(event) => updateLocal(cost.id, { name: event.target.value })} onBlur={(event) => update(cost.id, { name: event.target.value })} />;
                  if (column.key === "cost") return <input className="detail-cost-table-input numeric" type="text" inputMode="numeric" value={formatMoneyInputValue(cost.cost)} onChange={(event) => updateLocal(cost.id, { cost: stripNumberInputFormatting(event.target.value) })} onBlur={(event) => update(cost.id, { cost: stripNumberInputFormatting(event.target.value) })} />;
                  if (column.key === "categoryType") return <div className="detail-type-toggle">
                    <label className={cost.category_type === "basic" ? "selected" : ""}><input type="radio" name={`detail-type-${cost.id}`} checked={cost.category_type === "basic"} onChange={() => update(cost.id, { category_type: "basic" })} />기본에 포함</label>
                    <label className={cost.category_type === "full" ? "selected" : ""}><input type="radio" name={`detail-type-${cost.id}`} checked={cost.category_type === "full"} onChange={() => update(cost.id, { category_type: "full" })} />전체에만 포함</label>
                  </div>;
                  if (column.key === "updated_at") return <span className="management-updated-at" title={cost.updated_at || undefined}>{formatDisplayTimestampDate(cost.updated_at)}</span>;
                  return <Button variant="danger" size="sm" leftIcon={<Trash2 />} disabled={saving} onClick={() => remove(cost.id)}>삭제</Button>;
                }}
              />
            )}
            {!loading && selectedSubitemId && !costs.length && <EmptyState className="detail-cost-empty" title="등록된 내부 비용이 없습니다." description="상단 입력 영역에서 부자재나 기타 비용을 추가하세요." />}
            {!selectedSubitemId && <EmptyState className="detail-cost-empty" title="소재를 선택하세요." description="왼쪽에서 소재를 선택하면 세부견적 항목을 관리할 수 있습니다." />}
          </div>
        </section>
      </section>
    </main>
  );
}
