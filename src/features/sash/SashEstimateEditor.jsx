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
  getSashSpecialItemArea,
  getSashSpecialItemSelectionsAmount,
} from "./sashSpecialItemModel";
import {
  buildSashEstimateSelectionPatch,
  buildSashEstimateSpecPatch,
  formatSashArea,
  getSashCategory,
  getSashCategoryLabel,
  getSashFrameSpec,
  isSashEstimateSpecPricingConfirmed,
  SASH_CATEGORIES,
  SASH_MEASUREMENT_KINDS,
  SASH_PRICING_BASES,
  SASH_WINDOW_TYPES,
} from "./sashCatalogModel";

const SPECIAL_ITEMS_TAB = "special-items";

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

  const selectionById = new Map(selections.map((selection) => [
    selection.sashSpecialItemId,
    selection,
  ]));
  const selectedIds = new Set(selectionById.keys());
  const itemIds = new Set(items.map((item) => item.id));
  const displayItems = [
    ...items,
    ...selections
      .filter((selection) => !itemIds.has(selection.sashSpecialItemId))
      .map((selection) => ({
        id: selection.sashSpecialItemId,
        ...selection.sashSpecialItemSnapshot,
      })),
  ];

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

  return (
    <section className="sash-estimate-special" aria-label="추가 작업 선택">
      {loading && (
        <p className="sash-selector__status">추가 작업을 불러오는 중...</p>
      )}
      {error && (
        <div className="error-box sash-selector__status">{error}</div>
      )}
      {!loading && displayItems.length ? (
        <div className="sash-estimate-special__options">
          {displayItems.map((item) => {
            const selection = selectionById.get(item.id);
            const snapshot = selection?.sashSpecialItemSnapshot ?? item;
            return (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={Boolean(selection)}
                  onChange={() => toggleItem(item)}
                />
                <span className="sash-estimate-special__name">{snapshot.description}</span>
                <span className="sash-estimate-special__dimensions">
                  {Number(snapshot.width_mm || 0).toLocaleString("ko-KR")} × {Number(snapshot.height_mm || 0).toLocaleString("ko-KR")}
                </span>
                <span className="sash-estimate-special__area">
                  {formatSashArea(getSashSpecialItemArea(snapshot))}
                </span>
                <PriceText value={snapshot.amount} size="sm" />
              </label>
            );
          })}
        </div>
      ) : !loading && !error ? (
        <p className="sash-selector__status">등록된 추가 작업이 없습니다.</p>
      ) : null}
    </section>
  );
}

export default function SashEstimateEditor({ companyId, row, included = false, onPatch }) {
  const spec = row?.sashSpec;
  const selectedCategory = getSashCategory(spec);
  const [activeTab, setActiveTab] = useState(() => {
    return selectedCategory === SASH_CATEGORIES.UNSPECIFIED
      ? SASH_CATEGORIES.STANDARD
      : selectedCategory;
  });
  const usesAreaPricing = spec?.pricing_basis === SASH_PRICING_BASES.AREA;
  const pricingConfirmed = isSashEstimateSpecPricingConfirmed(spec);
  const specialItemsAmount = getSashSpecialItemSelectionsAmount(row?.sashSpecialItemSelections);
  const referenceSpecs = [
    ["제조사", spec?.brand],
    ["틀", getSashFrameSpec(spec)],
    ["페어", spec?.pair_spec],
    ["유리", spec?.glass_spec],
    ["가스", spec?.gas_spec],
    ["망", spec?.screen_spec],
  ].filter(([, value]) => `${value ?? ""}`.trim());

  useEffect(() => {
    if (selectedCategory === SASH_CATEGORIES.UNSPECIFIED) return;
    setActiveTab((currentTab) => (
      currentTab === SPECIAL_ITEMS_TAB ? currentTab : selectedCategory
    ));
  }, [row?.selectedSashCatalogEntryId]);

  function patchSpec(patch) {
    onPatch(buildSashEstimateSpecPatch(spec, patch));
  }

  return (
    <div className={`sash-estimate-editor ${included ? "is-included" : "is-preview"}`.trim()}>
      <div className="sash-selector__category-tabs sash-estimate-editor__tabs" role="tablist" aria-label="샷시 견적 편집">
        {[SASH_CATEGORIES.STANDARD, SASH_CATEGORIES.BALCONY, SPECIAL_ITEMS_TAB].map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab === SPECIAL_ITEMS_TAB ? "추가작업" : getSashCategoryLabel(tab)}
          </button>
        ))}
      </div>

      {activeTab === SPECIAL_ITEMS_TAB ? (
        <div role="tabpanel" aria-label="추가작업">
          <SashEstimateSpecialItems
            companyId={companyId}
            selections={row.sashSpecialItemSelections ?? []}
            onChange={(sashSpecialItemSelections, options) => onPatch({ sashSpecialItemSelections }, options)}
          />
        </div>
      ) : (
        <div className="sash-estimate-product-workspace" role="tabpanel" aria-label={getSashCategoryLabel(activeTab)}>
          <SashCatalogSelector
            companyId={companyId}
            constructionSubitemId={row.subitemId}
            pinnedEntryId={row.sashPinnedCatalogEntryId}
            selectedEntryId={row.selectedSashCatalogEntryId}
            activeCategory={activeTab}
            usageRanking={row.sashUsageRanking}
            onSelect={(entry, usage) => onPatch({
              ...buildSashEstimateSelectionPatch(entry),
              sashSelectionSource: "manual",
              sashUsageCount: usage?.usageCount ?? 0,
            }, { immediate: true })}
          />

          {spec && selectedCategory === activeTab && (
            <section className="sash-estimate-spec" aria-label="선택한 샷시 제품 정보">
              <div className="sash-estimate-spec__grid">
                {referenceSpecs.map(([label, value]) => (
                  <dl className="sash-estimate-spec__reference" key={label}><dt>{label}</dt><dd>{value}</dd></dl>
                ))}
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
                <span>측정 구분</span>
                <select
                  value={spec.measurement_kind ?? SASH_MEASUREMENT_KINDS.UNSPECIFIED}
                  onChange={(event) => onPatch(
                    buildSashEstimateSpecPatch(spec, { measurement_kind: event.target.value }),
                    { immediate: true }
                  )}
                >
                  <option value={SASH_MEASUREMENT_KINDS.UNSPECIFIED}>미지정</option>
                  <option value={SASH_MEASUREMENT_KINDS.ESTIMATE}>가견적</option>
                  <option value={SASH_MEASUREMENT_KINDS.MEASURED}>실측</option>
                </select>
              </label>
              <label className="sash-estimate-spec__field--amount">
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
            </section>
          )}
        </div>
      )}

      {spec && (
          <div className="sash-estimate-spec__calculation" aria-live="polite">
            <span>{usesAreaPricing ? "계산 헤베" : "계산 기준"} <strong>{usesAreaPricing ? pricingConfirmed ? formatHebe(row.quantity) : "미확정" : "1식"}</strong></span>
            {specialItemsAmount > 0 && (
              <span>추가 작업 <strong><PriceText value={specialItemsAmount} size="sm" /></strong></span>
            )}
            <span className="sash-estimate-spec__total">행 금액 <strong>{pricingConfirmed ? <PriceText value={row.totalAmount} size="sm" /> : "미확정"}</strong></span>
          </div>
      )}
    </div>
  );
}
