import { Pencil } from "lucide-react";
import PriceText from "../../components/PriceText";
import Button from "../../components/ui/Button";

export default function EstimateLiveSummary({
  conditionSummary,
  onEditCondition,
  onOutput,
  rowsByCategory = {},
  selectedCount = 0,
  selectedItemsTotal = 0,
  adjustmentTotal = 0,
  finalTotal = 0,
}) {
  return (
    <section className="estimate-live-summary" aria-label="실시간 견적 요약">
      <header className="estimate-live-summary__condition">
        <div>
          <span>현재 조건</span>
          <strong title={conditionSummary}>{conditionSummary || "조건 미선택"}</strong>
        </div>
        <button
          type="button"
          className="items-v2-icon-button estimate-live-summary__edit"
          aria-label="조건 수정"
          title="조건 수정"
          onClick={onEditCondition}
        >
          <Pencil size={14} aria-hidden="true" />
        </button>
      </header>

      <section className="estimate-live-summary__content" aria-label="선택 항목">
        <h2 className="estimate-live-summary__count">선택 항목 {selectedCount}개</h2>

        {selectedCount === 0 ? (
          <p className="estimate-live-summary__empty">담은 견적 항목이 없습니다.</p>
        ) : (
          <div className="estimate-live-summary__groups">
            {Object.entries(rowsByCategory).map(([categoryName, rows]) => (
              <section className="estimate-live-summary__group" key={categoryName}>
                <h2>{categoryName}</h2>
                <div>
                  {rows.map((row, index) => (
                    <div
                      className="estimate-live-summary__row"
                      key={[row.categoryId || categoryName, row.subitemId || row.material || index].join("-")}
                    >
                      <div>
                        <strong>{row.material || categoryName}</strong>
                        <span>
                          {[row.spec, String(row.quantity ?? 0) + (row.unit || "")].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                      <PriceText value={row.totalAmount} size="sm" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

      </section>

      <footer className="estimate-live-summary__footer">
        <dl className="estimate-live-summary__totals">
          <div>
            <dt>선택 항목 합계</dt>
            <dd><PriceText value={selectedItemsTotal} size="sm" /></dd>
          </div>
          <div>
            <dt>추가금/할인</dt>
            <dd><PriceText value={adjustmentTotal} size="sm" /></dd>
          </div>
          <div className="estimate-live-summary__final">
            <dt>최종 견적 금액</dt>
            <dd><PriceText value={finalTotal} size="md" /></dd>
          </div>
        </dl>
        <div className="estimate-live-summary__actions">
          <Button variant="primary" onClick={onOutput}>
            견적서 출력하기
          </Button>
        </div>
      </footer>
    </section>
  );
}
