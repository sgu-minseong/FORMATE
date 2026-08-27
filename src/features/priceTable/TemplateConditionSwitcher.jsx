import { useEffect, useMemo, useState } from "react";
import { Check, Copy, MoreHorizontal, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import { filterTemplateConditions } from "./templateConditionPreferences";

function ConditionRow({
  active,
  favorite,
  label,
  manage,
  onDelete,
  onDuplicate,
  onEdit,
  onSelect,
  onToggleFavorite,
  template,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={`template-condition-switcher__row ${active ? "active" : ""} ${manage ? "manage" : ""}`.trim()}>
      <button type="button" className="template-condition-switcher__select" onClick={() => onSelect(template)}>
        <span className="template-condition-switcher__check" aria-hidden="true">{active && <Check size={15} />}</span>
        <span>{label}</span>
      </button>
      <button
        type="button"
        className={`template-condition-switcher__icon ${favorite ? "favorite" : ""}`.trim()}
        aria-label={`${label} ${favorite ? "즐겨찾기 해제" : "즐겨찾기"}`}
        onClick={() => onToggleFavorite(template.id)}
      >
        <Star size={15} fill={favorite ? "currentColor" : "none"} />
      </button>
      {manage && (
        <div className="template-condition-switcher__actions">
          <button
            type="button"
            className="template-condition-switcher__icon"
            aria-label={`${label} 작업`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className="template-condition-switcher__row-menu">
              <button type="button" onClick={() => { setMenuOpen(false); onEdit(template); }}><Pencil size={14} />조건 수정</button>
              <button type="button" onClick={() => { setMenuOpen(false); onDuplicate(template); }}><Copy size={14} />복제</button>
              <button type="button" className="danger" onClick={() => { setMenuOpen(false); onDelete(template); }}><Trash2 size={14} />삭제</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TemplateConditionSwitcher({
  currentTemplateId,
  disabled = false,
  favoriteIds = [],
  getLabel,
  onCreate,
  onDelete,
  onDuplicate,
  onEdit,
  onSelect,
  onToggleFavorite,
  recentIds = [],
  templates = [],
}) {
  const [open, setOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const [query, setQuery] = useState("");
  const currentTemplate = templates.find((template) => `${template.id}` === `${currentTemplateId}`) ?? null;
  const filteredTemplates = useMemo(
    () => filterTemplateConditions(templates, query, getLabel),
    [getLabel, query, templates]
  );
  const visibleTemplates = useMemo(() => {
    const byId = new Map(filteredTemplates.map((template) => [`${template.id}`, template]));
    return [...recentIds, ...favoriteIds, ...filteredTemplates.map((template) => template.id)]
      .map((id) => byId.get(`${id}`))
      .filter((template, index, rows) => template && rows.indexOf(template) === index);
  }, [favoriteIds, filteredTemplates, recentIds]);

  useEffect(() => {
    if (!open) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
        setManaging(false);
        setQuery("");
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function closeDrawer() {
    setOpen(false);
    setManaging(false);
    setQuery("");
  }

  function openDrawer(nextManaging = false) {
    setManaging(nextManaging);
    setOpen(true);
  }

  function runAction(action, template) {
    closeDrawer();
    action(template);
  }

  const favoriteSet = new Set(favoriteIds.map(String));
  const currentLabel = currentTemplate ? getLabel(currentTemplate) : "조건을 선택하세요";

  return (
    <section className="template-condition-switcher">
      <div className="template-condition-switcher__summary">
        <div>
          <span>현재 조건</span>
          <strong title={currentLabel}>{currentLabel}</strong>
        </div>
        <div className="template-condition-switcher__summary-actions">
          <button type="button" className="template-condition-switcher__trigger" disabled={disabled} onClick={() => openDrawer()}>
            조건 바꾸기
          </button>
          <button type="button" className="template-condition-switcher__manage" disabled={disabled} onClick={() => openDrawer(true)}>
            조건 관리
          </button>
        </div>
      </div>
      {open && (
        <aside className="estimate-condition-drawer admin-template-condition-drawer template-condition-switcher__drawer" role="dialog" aria-modal="true" aria-label={managing ? "조건 관리" : "조건 바꾸기"}>
          <header className="template-condition-switcher__drawer-header">
            <strong>{managing ? "조건 관리" : "조건 바꾸기"}</strong>
            <button type="button" className="template-condition-switcher__icon" aria-label="닫기" onClick={closeDrawer}><X size={18} /></button>
          </header>
          <label className="admin-search-field template-condition-switcher__search">
            <Search size={16} />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="조건 검색" />
          </label>
          <div className="template-condition-switcher__list formate-scroll-light">
            {!managing && <strong className="template-condition-switcher__list-title">저장된 조건</strong>}
            {visibleTemplates.map((template) => (
              <ConditionRow
                key={template.id}
                template={template}
                label={getLabel(template)}
                active={`${currentTemplateId}` === `${template.id}`}
                favorite={favoriteSet.has(`${template.id}`)}
                manage={managing}
                onSelect={(nextTemplate) => runAction(onSelect, nextTemplate)}
                onToggleFavorite={onToggleFavorite}
                onEdit={(nextTemplate) => runAction(onEdit, nextTemplate)}
                onDuplicate={(nextTemplate) => runAction(onDuplicate, nextTemplate)}
                onDelete={(nextTemplate) => runAction(onDelete, nextTemplate)}
              />
            ))}
            {!visibleTemplates.length && <p className="template-condition-switcher__empty">일치하는 조건이 없습니다.</p>}
          </div>
          <footer className="template-condition-switcher__drawer-actions">
            <button type="button" className="template-condition-switcher__create" onClick={() => runAction(onCreate)}><Plus size={16} />새 조건 추가</button>
            {!managing && <button type="button" className="template-condition-switcher__manage" onClick={() => setManaging(true)}>조건 관리</button>}
          </footer>
        </aside>
      )}
    </section>
  );
}
