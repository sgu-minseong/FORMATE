import React from "react";
import { ArrowLeft, ArrowRight, LogOut, UserRound } from "lucide-react";
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

function getNavTarget(item) {
  return item.target || item.key;
}

function isNavItemActive(item, currentPage) {
  if (item.activeKeys?.length) {
    return item.activeKeys.includes(currentPage);
  }

  return currentPage === getNavTarget(item);
}

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
  userName = "",
  userAvatarUrl = "",
  onLogout,
  navItems = DEFAULT_NAV_ITEMS,
  variant = "app",
  hideSidebar = false,
  documentMode = false,
  className = "",
  workspaceHeader = null,
  canNavigateBack = false,
  canNavigateForward = false,
  onNavigateBack,
  onNavigateForward,
}) {
  const isDocumentMode = documentMode || variant === "document";
  const accountName = `${userName || userLabel || "운영자"}`.trim();
  const accountCompanyName = `${companyName || ""}`.trim();
  const accountLabel = [accountName, accountCompanyName].filter(Boolean).join(", ");

  const renderNavButton = (item, { child = false, bottom = false } = {}) => {
    const active = isNavItemActive(item, currentPage);
    const disabled = !!item.disabled;
    const target = getNavTarget(item);

    return (
      <div className="formate-app-shell__nav-entry" key={item.key}>
        <Button
          variant={active ? "primary" : "tertiary"}
          size="sm"
          disabled={disabled}
          className={cx(
            "formate-app-shell__nav-button",
            active && "formate-app-shell__nav-button--active",
            child && "formate-app-shell__nav-button--child",
            bottom && "formate-app-shell__nav-button--bottom",
            item.danger && "formate-app-shell__nav-button--danger",
            disabled && "formate-app-shell__nav-button--disabled",
          )}
          leftIcon={item.icon ? normalizeShellIcon(item.icon) : undefined}
          aria-current={active ? "page" : undefined}
          title={item.description || item.label}
          onClick={() => {
            if (!disabled) {
              onNavigate?.(target, item);
            }
          }}
        >
          <span className="formate-app-shell__nav-label">{item.label}</span>
        </Button>
        {item.description && <span className="formate-app-shell__nav-description">{item.description}</span>}
      </div>
    );
  };

  const renderNavSection = (item) => {
    if (item.type !== "section") {
      return renderNavButton(item);
    }

    return (
      <section className="formate-app-shell__nav-section" key={item.key} aria-label={item.label}>
        <span className="formate-app-shell__nav-section-title">{item.label}</span>
        <div className="formate-app-shell__nav-subitems">
          {item.items?.map((child) => renderNavButton(child, { child: true }))}
        </div>
      </section>
    );
  };

  const mainNavItems = navItems.filter((item) => item.placement !== "bottom");
  const bottomNavItems = navItems.filter((item) => item.placement === "bottom");

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
        className,
      )}
    >
      {!hideSidebar && (
        <aside className="formate-app-shell__sidebar">
          {workspaceHeader && (
            <div className="formate-app-shell__workspace-header">
              <div className="formate-app-shell__workspace-header-copy">
                {workspaceHeader}
              </div>
              {(onNavigateBack || onNavigateForward) && (
                <div className="formate-app-shell__history-controls" aria-label="화면 이동">
                  <button
                    type="button"
                    className="formate-app-shell__history-button"
                    aria-label="뒤로가기"
                    title="뒤로가기"
                    disabled={!canNavigateBack}
                    onClick={onNavigateBack}
                  >
                    <ArrowLeft size={19} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="formate-app-shell__history-button"
                    aria-label="앞으로가기"
                    title="앞으로가기"
                    disabled={!canNavigateForward}
                    onClick={onNavigateForward}
                  >
                    <ArrowRight size={19} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="formate-app-shell__nav-scroll formate-scroll-dark">
            <nav className="formate-app-shell__nav" aria-label="주요 화면">
              {mainNavItems.map(renderNavSection)}
            </nav>
            {bottomNavItems.length > 0 && (
              <nav className="formate-app-shell__nav-bottom" aria-label="보조 메뉴">
                {bottomNavItems.map((item) => renderNavButton(item, { bottom: true }))}
              </nav>
            )}
          </div>
          <footer className="formate-app-shell__account" title={accountLabel}>
            <div className="formate-app-shell__account-avatar">
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt={`${accountName} 프로필`} />
              ) : (
                <UserRound size={18} strokeWidth={1.6} aria-hidden="true" />
              )}
            </div>
            <div className="formate-app-shell__account-copy">
              <strong>{accountName}</strong>
              {accountCompanyName && <span>{accountCompanyName}</span>}
            </div>
            {onLogout && (
              <button
                type="button"
                className="formate-app-shell__account-logout"
                aria-label="로그아웃"
                title="로그아웃"
                onClick={onLogout}
              >
                <LogOut size={17} strokeWidth={1.6} aria-hidden="true" />
              </button>
            )}
          </footer>
        </aside>
      )}
      <div className="formate-app-shell__main formate-scroll-light">
        {children}
      </div>
    </div>
  );
}
