import Button from "../ui/Button.jsx";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const DEFAULT_NAV_ITEMS = [
  { key: "landing", label: "홈" },
  { key: "condition", label: "신규 견적" },
  { key: "admin-prices", label: "단가표 관리" },
  { key: "admin-items", label: "템플릿 만들기" },
  { key: "admin-estimates", label: "저장 견적" },
];

export default function AppShell({
  children,
  currentPage = "",
  onNavigate,
  companyName = "",
  userLabel = "",
  navItems = DEFAULT_NAV_ITEMS,
  variant = "app",
  hideSidebar = false,
  documentMode = false,
  className = "",
}) {
  const isDocumentMode = documentMode || variant === "document";

  if (isDocumentMode) {
    return (
      <main className={cx("app-shell app-shell--document", className)}>
        {children}
      </main>
    );
  }

  return (
    <div className={cx("app-shell", hideSidebar && "app-shell--no-sidebar", className)}>
      {!hideSidebar && (
        <aside className="app-shell__sidebar">
          <div className="app-shell__brand">
            <strong>FORMATE</strong>
            {companyName && <span>{companyName}</span>}
          </div>
          <nav className="app-shell__nav" aria-label="주요 화면">
            {navItems.map((item) => (
              <Button
                key={item.key}
                variant={currentPage === item.key ? "primary" : "tertiary"}
                size="sm"
                className="app-shell__nav-button"
                onClick={() => onNavigate?.(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </nav>
          {userLabel && <div className="app-shell__user">{userLabel}</div>}
        </aside>
      )}
      <main className="app-shell__main">
        {children}
      </main>
    </div>
  );
}
