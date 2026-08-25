import { useEffect, useMemo, useState } from "react";
import { Pin } from "lucide-react";
import PriceText from "../../components/PriceText";
import {
  fetchActiveSashCatalogEntries,
} from "./sashCatalogApi";
import {
  formatSashArea,
  getSashBillableArea,
  getSashCategory,
  getSashCategoryLabel,
  getSashEntryArea,
  getSashFrameSpec,
  orderSashCatalogEntriesForDisplay,
  SASH_CATEGORIES,
  SASH_PRICING_BASES,
  SASH_WINDOW_TYPES,
} from "./sashCatalogModel";

function getFriendlySashError(error) {
  return error?.message || "샷시 규격을 불러오지 못했습니다. 다시 시도해주세요.";
}

function getWindowTypeLabel(windowType) {
  if (windowType === SASH_WINDOW_TYPES.SINGLE) return "단창";
  if (windowType === SASH_WINDOW_TYPES.DOUBLE) return "2중창";
  return "창 유형 미지정";
}

export default function SashCatalogSelector({
  companyId,
  constructionSubitemId,
  pinnedEntryId = "",
  selectedEntryId,
  selectedSashSpec,
  usageRanking = [],
  onSelect,
}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState(() => (
    getSashCategory(selectedSashSpec) === SASH_CATEGORIES.UNSPECIFIED
      ? SASH_CATEGORIES.STANDARD
      : getSashCategory(selectedSashSpec)
  ));
  const rankingByEntryId = useMemo(() => new Map(
    usageRanking.map((rankedEntry) => [
      rankedEntry.sashCatalogEntryId,
      rankedEntry,
    ])
  ), [usageRanking]);
  const categoryEntries = useMemo(() => entries.filter((entry) => (
    getSashCategory(entry) === activeCategory
  )), [activeCategory, entries]);
  const orderedEntries = useMemo(() => orderSashCatalogEntriesForDisplay(categoryEntries, {
    pinnedEntryId,
    usageRanking,
  }), [categoryEntries, pinnedEntryId, usageRanking]);

  useEffect(() => {
    if (!selectedSashSpec) return;
    const selectedCategory = getSashCategory(selectedSashSpec);
    if (selectedCategory !== SASH_CATEGORIES.UNSPECIFIED) setActiveCategory(selectedCategory);
  }, [selectedEntryId, selectedSashSpec]);

  useEffect(() => {
    let cancelled = false;
    if (!companyId || !constructionSubitemId) {
      setEntries([]);
      return undefined;
    }

    setLoading(true);
    setError("");
    fetchActiveSashCatalogEntries(companyId, constructionSubitemId)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setEntries([]);
          setError(getFriendlySashError(nextError));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, constructionSubitemId]);

  if (loading) return <p className="sash-selector__status">샷시 규격을 불러오는 중...</p>;
  if (error) return <div className="error-box sash-selector__status">{error}</div>;

  return (
    <section className="sash-selector" aria-label="샷시 규격 선택">
      <div className="sash-selector__header">
        <strong>제품 선택</strong>
      </div>
      <div className="sash-selector__category-tabs" role="tablist" aria-label="샷시 제품 분류">
        {[SASH_CATEGORIES.STANDARD, SASH_CATEGORIES.BALCONY].map((sashCategory) => (
          <button
            key={sashCategory}
            type="button"
            role="tab"
            aria-selected={activeCategory === sashCategory}
            className={activeCategory === sashCategory ? "active" : ""}
            onClick={() => setActiveCategory(sashCategory)}
          >
            {getSashCategoryLabel(sashCategory)}
          </button>
        ))}
      </div>
      {orderedEntries.length ? (
        <div className="sash-selector__list">
          {orderedEntries.map((entry) => {
            const selected = entry.id === selectedEntryId;
            const usage = rankingByEntryId.get(entry.id);
            const pinned = entry.id === pinnedEntryId;
            return (
              <button
                key={entry.id}
                type="button"
                className={"sash-selector__option" + (selected ? " selected" : "")}
                aria-pressed={selected}
                onClick={() => onSelect(entry, usage)}
              >
                <span className="sash-selector__radio" aria-hidden="true" />
                <span className="sash-selector__copy">
                  <strong>
                    {entry.brand} / {getSashFrameSpec(entry)}
                    {pinned && <Pin className="sash-selector__pin" size={13} strokeWidth={1.5} fill="currentColor" aria-label="대표제품" />}
                    {usage?.usageCount > 0 && (
                      <em className="sash-selector__usage">
                        {usage.usageCount}회 사용
                      </em>
                    )}
                  </strong>
                  <span>
                    {[entry.pair_spec, entry.glass_spec, entry.gas_spec, entry.screen_spec]
                      .filter(Boolean)
                      .join(" · ") || "추가 사양 없음"}
                  </span>
                  <span>
                    {Number(entry.width_mm).toLocaleString("ko-KR")} × {Number(entry.height_mm).toLocaleString("ko-KR")}
                    {" · "}{getWindowTypeLabel(entry.window_type)}
                    {" · "}{formatSashArea(
                      entry.pricing_basis === SASH_PRICING_BASES.AREA
                        ? getSashBillableArea(entry)
                        : getSashEntryArea(entry)
                    )}
                  </span>
                </span>
                <PriceText value={entry.unit_price} size="sm" />
              </button>
            );
          })}
        </div>
      ) : (
        <p className="sash-selector__status">등록된 제품이 없습니다.</p>
      )}
    </section>
  );
}
