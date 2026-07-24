function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Card({
  as: Component = "section",
  interactive = false,
  className = "",
  children,
  ...props
}) {
  return (
    <Component className={cx("ui-card", interactive && "ui-card--interactive", className)} {...props}>
      {children}
    </Component>
  );
}
