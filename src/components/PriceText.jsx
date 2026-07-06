export default function PriceText({ value, unit = "원", size = "md", className = "" }) {
  const number = Number(value);
  const displayValue = Number.isFinite(number) ? number.toLocaleString() : value || "0";

  return (
    <span className={`number-text number-text-${size} ${className}`.trim()}>
      <span className="number-text-value">{displayValue}</span>
      {unit && <span className="number-text-unit">{unit}</span>}
    </span>
  );
}
