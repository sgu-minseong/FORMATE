function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function EmptyState({
  title,
  description,
  action,
  icon,
  className = "",
}) {
  return (
    <div className={cx("ui-empty-state", className)}>
      {icon && <div className="ui-empty-state__icon">{icon}</div>}
      {title && <h2>{title}</h2>}
      {description && <p>{description}</p>}
      {action && <div className="ui-empty-state__action">{action}</div>}
    </div>
  );
}
