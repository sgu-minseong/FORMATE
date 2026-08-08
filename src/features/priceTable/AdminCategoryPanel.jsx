import { Star } from "lucide-react";

export default function AdminCategoryPanel({
  ariaLabel = "대분류",
  canReorder = false,
  disabled = false,
  dragItemId = "",
  dragOverItemId = "",
  items = [],
  loading = false,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onSelect,
  selectedItemId = "",
}) {
  return (
    <aside className="admin-price-v2-sidebar formate-scroll-light" aria-label={ariaLabel}>
      <div className="admin-price-v2-sidebar-header">
        <span>대분류</span>
        <strong>{loading ? "불러오는 중" : `${items.length}개`}</strong>
      </div>
      <div className="admin-price-v2-category-list">
        {loading ? (
          <>
            <div className="admin-items-v2-loading-line wide" />
            <div className="admin-items-v2-loading-line" />
            <div className="admin-items-v2-loading-line" />
            <div className="admin-items-v2-loading-line short" />
          </>
        ) : items.map((item) => {
          const active = selectedItemId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`admin-price-v2-category-item ${active ? "active" : ""} ${dragItemId === item.id ? "dragging" : ""} ${dragOverItemId === item.id ? "drop-target" : ""}`.trim()}
              onClick={() => onSelect?.(item.id)}
              onDragOver={(event) => onDragOver?.(event, item.id)}
              onDrop={() => onDrop?.(item.id)}
              onDragEnd={onDragEnd}
            >
              <span
                className={`drag-handle admin-price-v2-drag-handle ${canReorder ? "enabled" : ""}`.trim()}
                title="대분류 순서 변경"
                draggable={canReorder && !disabled}
                onDragStart={(event) => onDragStart?.(event, item.id)}
                onDragEnd={onDragEnd}
              >
                ::
              </span>
              <span className="admin-price-v2-category-name">
                {item.is_favorite && <Star size={14} fill="currentColor" />}
                <span>{item.name}</span>
              </span>
              <span className="admin-price-v2-category-count">
                {(item.subitems ?? []).length}개
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
