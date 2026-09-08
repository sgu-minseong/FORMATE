import { useEffect, useMemo, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import Button from "../../components/ui/Button";
import { formatMoneyInputValue } from "../../shared/utils/numbers";
import { getSashFrameSpec } from "./sashCatalogModel";
import {
  buildSharedPriceExpectedGroups,
  getSashPriceContextLabel,
  SASH_PRICE_COMPARISON,
  SASH_PRICE_MATCH,
  SASH_PRICE_SPEC_FIELDS,
} from "./sharedSashPriceModel";

const MATCH_LABELS = {
  [SASH_PRICE_MATCH.HIGH]: "높은 일치",
  [SASH_PRICE_MATCH.PARTIAL]: "일부 일치",
  [SASH_PRICE_MATCH.SPEC_DIFFERENCE]: "사양 차이",
};

function formatPrice(value) {
  return `${formatMoneyInputValue(value)}원`;
}

function getWindowTypeLabel(value) {
  if (value === "single") return "단창";
  if (value === "double") return "2중창";
  return "창 유형 미지정";
}

function getSpecSummary(entry) {
  return SASH_PRICE_SPEC_FIELDS
    .map(({ key, label }) => {
      const value = String(
        key === "frame_spec" ? getSashFrameSpec(entry) : entry?.[key] ?? ""
      ).trim();
      return value ? `${label} ${value}` : "";
    })
    .filter(Boolean)
    .join(" · ") || "추가 사양 정보 없음";
}

function getDimensionsLabel(entry) {
  const width = Number(entry?.width_mm);
  const height = Number(entry?.height_mm);
  return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
    ? `${width.toLocaleString("ko-KR")} × ${height.toLocaleString("ko-KR")}`
    : "가로·세로 미지정";
}

function getDifferenceSummary(candidate) {
  return (candidate.comparisons ?? [])
    .flatMap(({ candidateValue, label, sourceValue, status }) => {
      if (status === SASH_PRICE_COMPARISON.DIFFERENT) {
        return [`${label} ${sourceValue} → ${candidateValue}`];
      }
      if (status === SASH_PRICE_COMPARISON.SOURCE_MISSING) {
        return [`${label} 현재 정보 없음 · 후보 ${candidateValue}`];
      }
      if (status === SASH_PRICE_COMPARISON.CANDIDATE_MISSING) {
        return [`${label} 후보 정보 없음`];
      }
      return [];
    })
    .join(" · ");
}

function PriceMemberRow({
  candidate = false,
  checked,
  disabled,
  entry,
  onChange,
  sourcePriceId,
}) {
  const differentGroup = Boolean(
    candidate && entry.sash_price_id && entry.sash_price_id !== sourcePriceId
  );
  const difference = candidate ? getDifferenceSummary(entry) : "";
  return (
    <label className="sash-price-dialog__member">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(entry.id, event.target.checked)}
      />
      <span className="sash-price-dialog__member-copy">
        <span className="sash-price-dialog__member-heading">
          <strong>{getSashPriceContextLabel(entry)}</strong>
          {candidate && (
            <em className={`sash-price-dialog__match sash-price-dialog__match--${entry.classification}`}>
              {MATCH_LABELS[entry.classification]}
            </em>
          )}
        </span>
        <span>
          {getDimensionsLabel(entry)} · {getWindowTypeLabel(entry.window_type)}
        </span>
        <span>{getSpecSummary(entry)}</span>
        {difference && <span className="sash-price-dialog__difference">차이: {difference}</span>}
        {differentGroup && (
          <span className="sash-price-dialog__move-warning">
            다른 공유 단가 {formatPrice(entry.unit_price)} 사용 중
          </span>
        )}
      </span>
      <strong className="sash-price-dialog__member-price">
        {entry.unit_price === "" ? "미지정" : formatPrice(entry.unit_price)}
      </strong>
    </label>
  );
}

export default function SashPriceImpactDialog({
  error = "",
  impact,
  loading = false,
  nextUnitPrice,
  onClose,
  onConfirm,
  onDetach,
  processing = false,
}) {
  const dialogRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [moveConfirmed, setMoveConfirmed] = useState(false);

  useEffect(() => {
    dialogRef.current?.querySelector("button")?.focus();
  }, []);

  useEffect(() => {
    if (!impact) return;
    setSelectedIds(new Set(
      impact.source.sash_price_id
        ? impact.currentMembers.map((entry) => entry.id)
        : [impact.source.id]
    ));
    setMoveConfirmed(false);
  }, [impact]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !processing) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, processing]);

  const movingEntries = useMemo(() => (impact?.candidates ?? []).filter((entry) => (
    selectedIds.has(entry.id)
    && entry.sash_price_id
    && entry.sash_price_id !== impact.source.sash_price_id
  )), [impact, selectedIds]);

  function toggleEntry(entryId, checked) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(entryId);
      else next.delete(entryId);
      return next;
    });
    setMoveConfirmed(false);
  }

  const previousPrice = impact?.source.unit_price;
  const canConfirm = Boolean(
    impact
    && selectedIds.has(impact.source.id)
    && (!movingEntries.length || moveConfirmed)
    && !loading
    && !processing
  );

  return (
    <div
      className="sash-price-dialog__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="sash-price-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sash-price-dialog-title"
        aria-describedby="sash-price-dialog-description"
      >
        <header>
          <span><Link2 size={16} strokeWidth={1.5} /> 공유 단가</span>
          <h2 id="sash-price-dialog-title">단가 적용 대상 확인</h2>
          <p id="sash-price-dialog-description">
            {previousPrice === "" ? "단가 미지정" : formatPrice(previousPrice)} → {formatPrice(nextUnitPrice)}
          </p>
        </header>

        <div className="sash-price-dialog__body">
          {loading && <p className="sash-price-dialog__status">관련 샷시를 확인하는 중...</p>}
          {error && <p className="sash-price-dialog__error" role="alert">{error}</p>}
          {impact && (
            <>
              <section className="sash-price-dialog__section">
                <div className="sash-price-dialog__section-heading">
                  <strong>{impact.source.sash_price_id ? "현재 같은 가격을 공유 중" : "현재 규격"}</strong>
                  <span>{impact.currentMembers.length}개</span>
                </div>
                <div className="sash-price-dialog__members">
                  {impact.currentMembers.map((entry) => (
                    <PriceMemberRow
                      key={entry.id}
                      entry={entry}
                      checked={selectedIds.has(entry.id)}
                      disabled={processing || entry.id === impact.source.id}
                      onChange={toggleEntry}
                      sourcePriceId={impact.source.sash_price_id}
                    />
                  ))}
                </div>
                {impact.source.sash_price_id && impact.currentMembers.length > 1 && (
                  <p className="sash-price-dialog__hint">
                    선택 해제한 기존 규격은 현재 숫자 가격을 유지한 채 공유 그룹에서 분리됩니다.
                  </p>
                )}
              </section>

              <section className="sash-price-dialog__section">
                <div className="sash-price-dialog__section-heading">
                  <strong>관련 가능성이 있는 샷시</strong>
                  <span>{impact.candidates.length}개</span>
                </div>
                {impact.candidates.length ? (
                  <div className="sash-price-dialog__members">
                    {impact.candidates.map((entry) => (
                      <PriceMemberRow
                        key={entry.id}
                        candidate
                        entry={entry}
                        checked={selectedIds.has(entry.id)}
                        disabled={processing}
                        onChange={toggleEntry}
                        sourcePriceId={impact.source.sash_price_id}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="sash-price-dialog__status">
                    {impact.anchorReady
                      ? "같은 가로·세로·창 유형의 다른 규격이 없습니다."
                      : "가로·세로·창 유형이 모두 입력되면 관련 후보를 찾을 수 있습니다."}
                  </p>
                )}
              </section>

              {movingEntries.length > 0 && (
                <label className="sash-price-dialog__move-confirm">
                  <input
                    type="checkbox"
                    checked={moveConfirmed}
                    disabled={processing}
                    onChange={(event) => setMoveConfirmed(event.target.checked)}
                  />
                  <span>선택한 {movingEntries.length}개 규격을 기존 공유 그룹에서 이동합니다.</span>
                </label>
              )}
            </>
          )}
        </div>

        <footer>
          {impact?.source.sash_price_id && (
            <Button
              variant="tertiary"
              size="sm"
              disabled={processing}
              onClick={onDetach}
            >
              현재 규격 공유 해제
            </Button>
          )}
          <Button variant="secondary" size="sm" disabled={processing} onClick={onClose}>
            취소
          </Button>
          <Button
            size="sm"
            disabled={!canConfirm}
            onClick={() => onConfirm(
              [...selectedIds],
              movingEntries.length > 0,
              buildSharedPriceExpectedGroups([
                ...impact.currentMembers,
                ...impact.candidates,
              ].filter((entry) => selectedIds.has(entry.id)))
            )}
          >
            {processing ? "적용 중..." : "선택한 샷시에 적용"}
          </Button>
        </footer>
      </section>
    </div>
  );
}
