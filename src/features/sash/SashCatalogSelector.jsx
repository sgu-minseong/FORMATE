import { useEffect, useState } from "react";
import PriceText from "../../components/PriceText";
import {
  fetchActiveSashCatalogEntries,
} from "./sashCatalogApi";
import {
  formatSashArea,
  getSashEntryArea,
  getSashSpecLabel,
} from "./sashCatalogModel";

function getFriendlySashError(error) {
  return error?.message || "샷시 규격을 불러오지 못했습니다. 다시 시도해주세요.";
}

export default function SashCatalogSelector({
  companyId,
  constructionSubitemId,
  selectedEntryId,
  selectedSashSpec,
  onSelect,
}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        <strong>샷시 규격 선택</strong>
        <span>현장 규격을 하나 선택하세요.</span>
      </div>
      {selectedSashSpec && !entries.some((entry) => entry.id === selectedEntryId) && (
        <p className="sash-selector__snapshot">
          현재 선택: {getSashSpecLabel(selectedSashSpec)} · {formatSashArea(selectedSashSpec.area_sqm)}
        </p>
      )}
      {entries.length ? (
        <div className="sash-selector__list">
          {entries.map((entry) => {
            const selected = entry.id === selectedEntryId;
            return (
              <button
                key={entry.id}
                type="button"
                className={"sash-selector__option" + (selected ? " selected" : "")}
                aria-pressed={selected}
                onClick={() => onSelect(entry)}
              >
                <span className="sash-selector__radio" aria-hidden="true" />
                <span className="sash-selector__copy">
                  <strong>{entry.brand} / {entry.product_type}</strong>
                  <span>{Number(entry.width_mm).toLocaleString("ko-KR")} × {Number(entry.height_mm).toLocaleString("ko-KR")} · {formatSashArea(getSashEntryArea(entry))}</span>
                </span>
                <PriceText value={entry.unit_price} size="sm" />
              </button>
            );
          })}
        </div>
      ) : (
        <p className="sash-selector__status">
          등록된 샷시 규격이 없습니다. 단가표 관리에서 샷시 규격을 먼저 등록하세요.
        </p>
      )}
    </section>
  );
}
