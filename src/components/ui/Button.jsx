import React from "react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function normalizeIcon(icon) {
  if (!React.isValidElement(icon)) {
    return icon;
  }

  return React.cloneElement(icon, {
    size: icon.props.size ?? 18,
    strokeWidth: icon.props.strokeWidth ?? 1.5,
    "aria-hidden": icon.props["aria-hidden"] ?? true,
    focusable: icon.props.focusable ?? "false",
  });
}

export default function Button({
  variant = "primary",
  size = "md",
  type = "button",
  leftIcon,
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
      {leftIcon && <span className="ui-button__icon">{normalizeIcon(leftIcon)}</span>}
      {children}
    </button>
  );
}
