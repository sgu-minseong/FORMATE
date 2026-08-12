const SKELETON_CONFIG = {
  price: {
    columnCount: 9,
    listClassName: "admin-price-v2-grid-list price-table-list",
    headerClassName: "admin-price-table-header admin-price-v2-grid",
    rowClassName: "admin-price-v2-grid",
  },
  quantity: {
    columnCount: 7,
    listClassName: "admin-items-v2-grid-list quantity-table-list",
    headerClassName: "admin-quantity-table-header",
    rowClassName: "",
  },
};

export default function AdminCatalogTableSkeleton({ variant = "price", rowCount = 5 }) {
  const config = SKELETON_CONFIG[variant] ?? SKELETON_CONFIG.price;
  const cells = Array.from({ length: config.columnCount }, (_, index) => index);
  const rows = Array.from({ length: rowCount }, (_, index) => index);

  return (
    <div
      className={`${config.listClassName} admin-catalog-table-skeleton`.trim()}
      role="status"
      aria-label="표 데이터를 불러오는 중"
    >
      <div className={config.headerClassName} aria-hidden="true">
        {cells.map((cellIndex) => <span key={cellIndex} />)}
      </div>
      {rows.map((rowIndex) => (
        <div
          key={rowIndex}
          className={`admin-catalog-skeleton-row ${config.rowClassName}`.trim()}
          aria-hidden="true"
        >
          {cells.map((cellIndex) => (
            <span key={cellIndex}>
              <i className="admin-catalog-skeleton-line" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
