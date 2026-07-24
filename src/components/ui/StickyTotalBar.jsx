function formatAmount(value) {
  if (typeof value === "number") {
    return `${value.toLocaleString("ko-KR")}원`;
  }

  return value;
}

export default function StickyTotalBar({
  label,
  amount,
  amounts,
  actions,
  className = "",
}) {
  const entries = amounts || [{ label: "", value: amount }];

  return (
    <div className={`ui-sticky-total-bar ${className}`.trim()}>
      {label && <div className="ui-sticky-total-bar__label">{label}</div>}
      <div className="ui-sticky-total-bar__amounts">
        {entries.map((entry) => (
          <div key={entry.label || entry.value} className="ui-sticky-total-bar__amount">
            {entry.label && <div className="ui-sticky-total-bar__amount-label">{entry.label}</div>}
            <div className="ui-sticky-total-bar__amount-value">{formatAmount(entry.value)}</div>
          </div>
        ))}
      </div>
      {actions}
    </div>
  );
}
