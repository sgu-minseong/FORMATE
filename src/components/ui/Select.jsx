function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Select({
  label,
  hint,
  options = [],
  className = "",
  selectClassName = "",
  children,
  ...props
}) {
  return (
    <label className={cx("ui-field", className)}>
      {label && <span className="ui-field__label">{label}</span>}
      <select className={cx("ui-select", selectClassName)} {...props}>
        {children ||
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
      </select>
      {hint && <span className="ui-field__hint">{hint}</span>}
    </label>
  );
}
