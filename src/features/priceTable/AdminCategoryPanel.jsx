import { Pin } from "lucide-react";

export function AdminCategoryPinButton({ item, onToggle }) {
  const pinned = Boolean(item?.is_favorite);
  return (
    <button
      type="button"
      className={`admin-price-v2-category-pin ${pinned ? "active" : ""}`.trim()}
      aria-label={`${item?.name ?? "대분류"} ${pinned ? "고정 해제" : "고정"}`}
      aria-pressed={pinned}
      title={pinned ? "고정 해제" : "고정"}
      onClick={(event) => {
        event.stopPropagation();
        onToggle?.(item);
      }}
    >
      <Pin size={14} strokeWidth={1.5} fill={pinned ? "currentColor" : "none"} />
    </button>
  );
}

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
  onToggleFavorite,
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
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              className={`admin-price-v2-category-item ${active ? "active" : ""} ${dragItemId === item.id ? "dragging" : ""} ${dragOverItemId === item.id ? "drop-target" : ""}`.trim()}
              onClick={() => onSelect?.(item.id)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                onSelect?.(item.id);
              }}
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
              <AdminCategoryPinButton item={item} onToggle={onToggleFavorite} />
              <span className="admin-price-v2-category-name">
                <span>{item.name}</span>
              </span>
              <span className="admin-price-v2-category-count">
                {(item.products ?? item.subitems ?? []).length}개
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
