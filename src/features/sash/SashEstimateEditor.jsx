import { useEffect, useState } from "react";
import PriceText from "../../components/PriceText";
import {
  formatMoneyInputValue,
  stripNumberInputFormatting,
} from "../../shared/utils/numbers";
import SashCatalogSelector from "./SashCatalogSelector";
import { fetchActiveSashSpecialItems } from "./sashSpecialItemApi";
import {
  buildSashSpecialItemSelection,
  buildSashSpecialItemSelectionPatch,
  getSashSpecialItemArea,
  getSashSpecialItemSelectionsAmount,
} from "./sashSpecialItemModel";
import {
  buildSashEstimateSelectionPatch,
  buildSashEstimateSpecPatch,
  formatSashArea,
  getSashFrameSpec,
  isSashEstimateSpecPricingConfirmed,
  SASH_MEASUREMENT_KINDS,
  SASH_PRICING_BASES,
  SASH_WINDOW_TYPES,
} from "./sashCatalogModel";

function getWindowTypeLabel(windowType) {
  if (windowType === SASH_WINDOW_TYPES.SINGLE) return "단창";
  if (windowType === SASH_WINDOW_TYPES.DOUBLE) return "2중창";
  return "미지정";
}

function getMeasurementKindLabel(measurementKind) {
  if (measurementKind === SASH_MEASUREMENT_KINDS.MEASURED) return "실측";
  if (measurementKind === SASH_MEASUREMENT_KINDS.ESTIMATE) return "가견적";
  return "미지정";
}

function formatHebe(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return "-";
  return `${Number(numericValue.toFixed(4)).toLocaleString("ko-KR")} 헤베`;
}

function SashEstimateSpecialItems({ companyId, selections = [], onChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!companyId) {
      setItems([]);
      return undefined;
    }

    setLoading(true);
    setError("");
    fetchActiveSashSpecialItems(companyId)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setItems([]);
          setError(nextError?.message || "추가 작업을 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const selectedIds = new Set(selections.map((selection) => selection.sashSpecialItemId));

  function toggleItem(item) {
    if (selectedIds.has(item.id)) {
      onChange(
        selections.filter((selection) => selection.sashSpecialItemId !== item.id),
        { immediate: true }
      );
      return;
    }
    onChange([...selections, buildSashSpecialItemSelection(item)], { immediate: true });
  }

  function patchSelection(selectionId, patch) {
    onChange(selections.map((selection) => (
      selection.sashSpecialItemId === selectionId
        ? buildSashSpecialItemSelectionPatch(selection, patch)
        : selection
    )));
  }

  return (
    <section className="sash-estimate-special" aria-labelledby="sash-estimate-special-title">
      <div className="sash-estimate-special__header">
        <strong id="sash-estimate-special-title">추가 작업</strong>
        <PriceText value={getSashSpecialItemSelectionsAmount(selections)} size="sm" />
      </div>

      {loading ? (
        <p className="sash-selector__status">추가 작업을 불러오는 중...</p>
      ) : error ? (
        <div className="error-box sash-selector__status">{error}</div>
      ) : items.length ? (
        <div className="sash-estimate-special__options">
          {items.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={() => toggleItem(item)}
              />
              <span>{item.description}</span>
              <PriceText value={item.amount} size="sm" />
            </label>
          ))}
        </div>
      ) : (
        <p className="sash-selector__status">등록된 추가 작업이 없습니다.</p>
      )}

      {selections.length > 0 && (
        <div className="sash-estimate-special__selected">
          {selections.map((selection) => {
            const snapshot = selection.sashSpecialItemSnapshot;
            return (
              <div className="sash-estimate-special__row" key={selection.sashSpecialItemId}>
                <label className="sash-estimate-special__description">
                  <span>설명</span>
                  <input
                    value={snapshot.description}
                    onChange={(event) => patchSelection(selection.sashSpecialItemId, {
                      description: event.target.value,
                    })}
                  />
                </label>
                <label>
                  <span>가로</span>
                  <div className="sash-estimate-field__unit">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={snapshot.width_mm}
                      onChange={(event) => patchSelection(selection.sashSpecialItemId, {
                        width_mm: event.target.value.replace(/[^\d]/g, ""),
                      })}
                    />
                    <em>mm</em>
                  </div>
                </label>
                <label>
                  <span>세로</span>
                  <div className="sash-estimate-field__unit">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={snapshot.height_mm}
                      onChange={(event) => patchSelection(selection.sashSpecialItemId, {
                        height_mm: event.target.value.replace(/[^\d]/g, ""),
                      })}
                    />
                    <em>mm</em>
                  </div>
                </label>
                <div className="sash-estimate-special__readonly">
                  <span>면적</span>
                  <strong>{formatSashArea(getSashSpecialItemArea(snapshot))}</strong>
                </div>
                <label>
                  <span>직접입력 금액</span>
                  <div className="sash-estimate-field__unit">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatMoneyInputValue(snapshot.amount)}
                      onChange={(event) => patchSelection(selection.sashSpecialItemId, {
                        amount: stripNumberInputFormatting(event.target.value),
                      })}
                    />
                    <em>원</em>
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function SashEstimateEditor({ companyId, row, included = false, onPatch }) {
  const spec = row?.sashSpec;
  const usesAreaPricing = spec?.pricing_basis === SASH_PRICING_BASES.AREA;
  const pricingConfirmed = isSashEstimateSpecPricingConfirmed(spec);
  const specialItemsAmount = getSashSpecialItemSelectionsAmount(row?.sashSpecialItemSelections);
  const sashBaseAmount = row?.sashBaseAmount
    ?? (pricingConfirmed ? Number(row?.quantity || 0) * Number(row?.unitPrice || 0) : null);

  function patchSpec(patch) {
    onPatch(buildSashEstimateSpecPatch(spec, patch));
  }

  return (
    <div className={`sash-estimate-editor ${included ? "is-included" : "is-preview"}`.trim()}>
      <SashCatalogSelector
        companyId={companyId}
        constructionSubitemId={row.subitemId}
        pinnedEntryId={row.sashPinnedCatalogEntryId}
        selectedEntryId={row.selectedSashCatalogEntryId}
        selectedSashSpec={spec}
        usageRanking={row.sashUsageRanking}
        onSelect={(entry, usage) => onPatch({
          ...buildSashEstimateSelectionPatch(entry),
          sashSelectionSource: "manual",
          sashUsageCount: usage?.usageCount ?? 0,
        }, { immediate: true })}
      />

      {spec && (
        <>
          <section className="sash-estimate-spec" aria-label="선택한 샷시 제품 정보">
            <div className="sash-estimate-spec__summary">
              <dl><dt>제조사</dt><dd>{spec.brand || "-"}</dd></dl>
              <dl><dt>틀</dt><dd>{getSashFrameSpec(spec) || "-"}</dd></dl>
              <dl><dt>페어</dt><dd>{spec.pair_spec || "-"}</dd></dl>
              <dl><dt>유리</dt><dd>{spec.glass_spec || "-"}</dd></dl>
              <dl><dt>가스</dt><dd>{spec.gas_spec || "-"}</dd></dl>
              <dl><dt>망</dt><dd>{spec.screen_spec || "-"}</dd></dl>
              <dl><dt>치수 기준</dt><dd>{getMeasurementKindLabel(spec.measurement_kind)}</dd></dl>
            </div>

            <div className="sash-estimate-spec__fields">
              <label>
                <span>현장 가로</span>
                <div className="sash-estimate-field__unit">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={spec.width_mm ?? ""}
                    onChange={(event) => patchSpec({
                      width_mm: event.target.value.replace(/[^\d]/g, ""),
                    })}
                  />
                  <em>mm</em>
                </div>
              </label>
              <label>
                <span>현장 세로</span>
                <div className="sash-estimate-field__unit">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={spec.height_mm ?? ""}
                    onChange={(event) => patchSpec({
                      height_mm: event.target.value.replace(/[^\d]/g, ""),
                    })}
                  />
                  <em>mm</em>
                </div>
              </label>
              <label>
                <span>창 유형</span>
                <select
                  value={spec.window_type ?? SASH_WINDOW_TYPES.UNSPECIFIED}
                  onChange={(event) => onPatch(
                    buildSashEstimateSpecPatch(spec, { window_type: event.target.value }),
                    { immediate: true }
                  )}
                >
                  <option value={SASH_WINDOW_TYPES.UNSPECIFIED}>선택 필요</option>
                  <option value={SASH_WINDOW_TYPES.SINGLE}>단창</option>
                  <option value={SASH_WINDOW_TYPES.DOUBLE}>2중창</option>
                </select>
              </label>
              <label>
                <span>{usesAreaPricing ? "헤베 단가" : "총액 직접입력"}</span>
                <div className="sash-estimate-field__unit">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatMoneyInputValue(row.unitPrice)}
                    onChange={(event) => patchSpec({
                      unit_price: stripNumberInputFormatting(event.target.value),
                    })}
                  />
                  <em>원</em>
                </div>
              </label>
            </div>

            <div className="sash-estimate-spec__calculation" aria-live="polite">
              <span>창 유형 <strong>{getWindowTypeLabel(spec.window_type)}</strong></span>
              <span>{usesAreaPricing ? "헤베" : "수량"} <strong>{usesAreaPricing ? pricingConfirmed ? formatHebe(row.quantity) : "미확정" : "1식"}</strong></span>
              <span>샷시 금액 <strong>{pricingConfirmed ? <PriceText value={sashBaseAmount} size="sm" /> : "미확정"}</strong></span>
              {specialItemsAmount > 0 && (
                <span>추가 작업 <strong><PriceText value={specialItemsAmount} size="sm" /></strong></span>
              )}
            </div>
          </section>

          <SashEstimateSpecialItems
            companyId={companyId}
            selections={row.sashSpecialItemSelections ?? []}
            onChange={(sashSpecialItemSelections, options) => onPatch({ sashSpecialItemSelections }, options)}
          />
        </>
      )}
    </div>
  );
}
