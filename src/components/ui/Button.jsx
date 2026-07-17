function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={cx("ui-button", `ui-button--${variant}`, `ui-button--${size}`, className)}
      {...props}
    >
      {children}
    </button>
  );
}
