function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}) {
  return (
    <header className={cx("ui-page-header", className)}>
      <div className="ui-page-header__copy">
        {eyebrow && <p className="ui-page-header__eyebrow">{eyebrow}</p>}
        {title && <h1>{title}</h1>}
        {description && <p className="ui-page-header__description">{description}</p>}
      </div>
      {actions && <div className="ui-page-header__actions">{actions}</div>}
    </header>
  );
}
