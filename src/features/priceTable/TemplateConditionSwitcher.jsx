import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Copy, MoreHorizontal, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { filterTemplateConditions } from "./templateConditionPreferences";

function ConditionRow({
  active,
  favorite,
  label,
  onDelete,
  onDuplicate,
  onEdit,
  onSelect,
  onToggleFavorite,
  template,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={`template-condition-switcher__row ${active ? "active" : ""}`.trim()}>
      <button type="button" className="template-condition-switcher__select" onClick={() => onSelect(template)}>
        <span className="template-condition-switcher__check" aria-hidden="true">
          {active && <Check size={15} />}
        </span>
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
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const currentTemplate = templates.find((template) => `${template.id}` === `${currentTemplateId}`) ?? null;
  const filteredTemplates = useMemo(
    () => filterTemplateConditions(templates, query, getLabel),
    [getLabel, query, templates]
  );
  const filteredIds = new Set(filteredTemplates.map((template) => `${template.id}`));
  const recentTemplates = recentIds
    .map((id) => templates.find((template) => `${template.id}` === `${id}`))
    .filter((template) => template && filteredIds.has(`${template.id}`));
  const favoriteTemplates = favoriteIds
    .map((id) => templates.find((template) => `${template.id}` === `${id}`))
    .filter((template) => template && filteredIds.has(`${template.id}`));

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsidePointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const renderSection = (title, rows) => rows.length > 0 && (
    <section className="template-condition-switcher__section">
      <strong>{title}</strong>
      {rows.map((template) => (
        <ConditionRow
          key={`${title}-${template.id}`}
          template={template}
          label={getLabel(template)}
          active={`${currentTemplateId}` === `${template.id}`}
          favorite={favoriteIds.includes(`${template.id}`)}
          onSelect={(nextTemplate) => { setOpen(false); setQuery(""); onSelect(nextTemplate); }}
          onToggleFavorite={onToggleFavorite}
          onEdit={(nextTemplate) => { setOpen(false); onEdit(nextTemplate); }}
          onDuplicate={(nextTemplate) => { setOpen(false); onDuplicate(nextTemplate); }}
          onDelete={(nextTemplate) => { setOpen(false); onDelete(nextTemplate); }}
        />
      ))}
    </section>
  );

  return (
    <div className="template-condition-switcher" ref={rootRef}>
      <button
        type="button"
        className="template-condition-switcher__trigger"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{currentTemplate ? getLabel(currentTemplate) : "조건을 선택하세요"}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="template-condition-switcher__popover" role="dialog" aria-label="견적 조건 변경">
          <label className="template-condition-switcher__search">
            <Search size={16} />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="조건 검색" />
          </label>
          <div className="template-condition-switcher__list formate-scroll-light">
            {renderSection("최근 사용", recentTemplates)}
            {renderSection("즐겨찾기", favoriteTemplates)}
            {renderSection("모든 조건", filteredTemplates)}
            {!filteredTemplates.length && <p className="template-condition-switcher__empty">일치하는 조건이 없습니다.</p>}
          </div>
          <button type="button" className="template-condition-switcher__create" onClick={() => { setOpen(false); onCreate(); }}>
            <Plus size={16} />새 조건 만들기
          </button>
        </div>
      )}
    </div>
  );
}
