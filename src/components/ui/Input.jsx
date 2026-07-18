function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Input({
  label,
  hint,
  as = "input",
  className = "",
  inputClassName = "",
  ...props
}) {
  const Component = as === "textarea" ? "textarea" : "input";

  return (
    <label className={cx("ui-field", className)}>
      {label && <span className="ui-field__label">{label}</span>}
      <Component
        className={cx("ui-input", as === "textarea" && "ui-input--textarea", inputClassName)}
        {...props}
      />
      {hint && <span className="ui-field__hint">{hint}</span>}
    </label>
  );
}
