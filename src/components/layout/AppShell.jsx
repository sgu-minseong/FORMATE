import React from "react";
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

function normalizeShellIcon(icon) {
  if (!React.isValidElement(icon)) {
    return icon;
  }

  return React.cloneElement(icon, {
    size: icon.props.size ?? 20,
    strokeWidth: icon.props.strokeWidth ?? 1.5,
    "aria-hidden": icon.props["aria-hidden"] ?? true,
    focusable: icon.props.focusable ?? "false",
  });
}

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
  collapsed = false,
  className = "",
}) {
  const isDocumentMode = documentMode || variant === "document";

  if (isDocumentMode) {
    return (
      <main className={cx("formate-app-shell formate-app-shell--document", className)}>
        {children}
      </main>
    );
  }

  return (
    <div
      className={cx(
        "formate-app-shell",
        hideSidebar && "formate-app-shell--no-sidebar",
        collapsed && "formate-app-shell--collapsed",
        className,
      )}
    >
      {!hideSidebar && (
        <aside className="formate-app-shell__sidebar">
          <div className="formate-app-shell__brand">
            <strong>FORMATE</strong>
            {companyName && <span>{companyName}</span>}
          </div>
          <nav className="formate-app-shell__nav" aria-label="주요 화면">
            {navItems.map((item) => (
              <Button
                key={item.key}
                variant={currentPage === item.key ? "primary" : "tertiary"}
                size="sm"
                className="formate-app-shell__nav-button"
                leftIcon={item.icon ? normalizeShellIcon(item.icon) : undefined}
                aria-label={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                onClick={() => onNavigate?.(item.key)}
              >
                <span className="formate-app-shell__nav-label">{item.label}</span>
              </Button>
            ))}
          </nav>
          {userLabel && <div className="formate-app-shell__user">{userLabel}</div>}
        </aside>
      )}
      <div className="formate-app-shell__main">
        {children}
      </div>
    </div>
  );
}
