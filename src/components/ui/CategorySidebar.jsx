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

function categoryColor(item) {
  return CATEGORY_TOKEN_BY_KEY[item.category] || CATEGORY_TOKEN_BY_KEY[item.id] || CATEGORY_TOKEN_BY_KEY.etc;
}

export default function CategorySidebar({
  title,
  items = [],
  onSelect,
  className = "",
  "aria-label": ariaLabel = "카테고리",
}) {
  return (
    <aside className={cx("ui-category-sidebar", className)} aria-label={ariaLabel}>
      {title && <div className="ui-category-sidebar__header">{title}</div>}
      <ul className="ui-category-sidebar__list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={cx(
                "ui-category-sidebar__item",
                item.active && "ui-category-sidebar__item--active",
              )}
              style={{ "--category-color": categoryColor(item) }}
              onClick={() => onSelect?.(item.id)}
            >
              <span className="ui-category-sidebar__dot" />
              <span className="ui-category-sidebar__label">{item.label}</span>
              {item.count !== undefined && item.count !== null && (
                <span className="ui-category-sidebar__count">{item.count}개</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
