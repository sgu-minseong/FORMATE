const CATEGORY_TOKEN_BY_KEY = {
  floor: "var(--cat-floor)",
  wallpaper: "var(--cat-wallpaper)",
  demo: "var(--cat-demo)",
  protect: "var(--cat-protect)",
  plumbing: "var(--cat-plumbing)",
  electric: "var(--cat-electric)",
  wood: "var(--cat-wood)",
  window: "var(--cat-window)",
  door: "var(--cat-door)",
  paint: "var(--cat-paint)",
  bath: "var(--cat-bath)",
  etc: "var(--cat-etc)",
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Badge({
  variant = "muted",
  category = "etc",
  className = "",
  children,
  style,
  ...props
}) {
  const categoryStyle =
    variant === "category"
      ? { "--category-color": CATEGORY_TOKEN_BY_KEY[category] || CATEGORY_TOKEN_BY_KEY.etc, ...style }
      : style;

  return (
    <span className={cx("ui-badge", `ui-badge--${variant}`, className)} style={categoryStyle} {...props}>
      {children}
    </span>
  );
}
