import { useEffect, useRef, useState } from "react";
import { Bell, ChevronLeft, ChevronRight, Search } from "lucide-react";

export default function GlobalTopbar({
  companyName = "",
  contextContent = null,
  onLogout,
}) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    if (!profileMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [profileMenuOpen]);

  return (
    <div className="home-workspace-toolbar formate-global-topbar" aria-label="전역 작업 도구">
      <div className="home-workspace-toolbar__nav">
        <button
          type="button"
          className="home-toolbar-icon-button"
          aria-label="뒤로가기"
          disabled
        >
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          className="home-toolbar-icon-button"
          aria-label="앞으로가기"
          disabled
        >
          <ChevronRight size={18} strokeWidth={1.5} />
        </button>
      </div>

      <label className="home-workspace-search">
        <Search size={16} strokeWidth={1.5} aria-hidden="true" />
        <input
          type="search"
          readOnly
          placeholder="고객, 현장 주소, 견적번호 검색"
          aria-label="고객, 현장 주소, 견적번호 검색"
        />
        <kbd>Ctrl K</kbd>
      </label>

      <div className="formate-global-topbar__right">
        {contextContent && (
          <div className="formate-global-topbar__context">
            {contextContent}
          </div>
        )}

        <div className="home-workspace-actions">
          <button type="button" className="home-toolbar-icon-button" aria-label="알림">
            <Bell size={18} strokeWidth={1.5} />
          </button>
          <div className="home-profile-menu" ref={profileMenuRef}>
            <button
              type="button"
              className="home-toolbar-avatar"
              aria-label="프로필 메뉴"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen((open) => !open)}
            >
              {`${companyName || "운"}`.trim().charAt(0) || "운"}
            </button>
            {profileMenuOpen && (
              <div className="home-profile-dropdown" role="menu">
                <div className="home-profile-dropdown__meta">{companyName || "운영자"}</div>
                <button
                  type="button"
                  className="home-profile-dropdown__item"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    onLogout?.();
                  }}
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
