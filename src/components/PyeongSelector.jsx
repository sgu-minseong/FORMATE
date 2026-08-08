import { Check, ChevronDown, Star } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFavoritePyeongs, toggleFavoritePyeong } from "../features/estimates/pyeongPreferences";
import { PYEONG_OPTIONS } from "../shared/constants/estimateOptions";

export function PyeongOption({ pyeong, selectedValue, favorite, onSelect }) {
  const selected = String(pyeong) === String(selectedValue);
  return (
    <div className={`pyeong-option-row ${selected ? "selected" : ""}`.trim()} role="option" aria-selected={selected}>
      <button type="button" className="pyeong-option-main" onClick={() => onSelect(String(pyeong))}>
        <span>{pyeong}평</span>
        {selected && <Check size={16} />}
      </button>
      <button
        type="button"
        className={`favorite-pyeong-toggle ${favorite ? "active" : ""}`.trim()}
        aria-label={`${pyeong}평 즐겨찾기 ${favorite ? "해제" : "추가"}`}
        onClick={(event) => {
          event.stopPropagation();
          toggleFavoritePyeong(pyeong);
        }}
      >
        <Star size={15} fill={favorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

export function PyeongOptionsList({ value, onSelect, ariaLabel, className = "", style, containerRef }) {
  const favoritePyeongs = useFavoritePyeongs();
  const renderOption = (pyeong) => (
    <PyeongOption
      key={pyeong}
      pyeong={pyeong}
      selectedValue={value}
      favorite={favoritePyeongs.includes(Number(pyeong))}
      onSelect={onSelect}
    />
  );

  return (
    <div
      ref={containerRef}
      className={`custom-select-menu ${className}`.trim()}
      style={style}
      role="listbox"
      aria-label={ariaLabel}
    >
      {favoritePyeongs.length > 0 && (
        <div className="custom-select-section favorite-pyeong-section">
          <p>즐겨찾는 평수</p>
          {favoritePyeongs.map(renderOption)}
        </div>
      )}
      <div className="custom-select-section">
        <p>전체 평수</p>
        {PYEONG_OPTIONS.map(renderOption)}
      </div>
    </div>
  );
}

export default function PyeongSelector({
  value = "",
  open = false,
  onOpenChange,
  onChange,
  placeholder = "평수 선택",
  className = "",
  ariaLabel = "평수 선택",
  disabled = false,
  menuPortal = false,
}) {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [portalStyle, setPortalStyle] = useState(null);
  const selectPyeong = (nextValue) => {
    onChange?.(nextValue);
    onOpenChange?.(false);
  };

  useEffect(() => {
    if (disabled && open) onOpenChange?.(false);
  }, [disabled, onOpenChange, open]);

  useLayoutEffect(() => {
    if (!open || !menuPortal || typeof window === "undefined") return undefined;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 8;
      const menuGap = 8;
      const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding - menuGap;
      const spaceAbove = rect.top - viewportPadding - menuGap;
      const openAbove = spaceBelow < 200 && spaceAbove > spaceBelow;
      const availableHeight = openAbove ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(120, Math.min(320, availableHeight));
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - viewportPadding - width
      );
      const top = openAbove
        ? Math.max(viewportPadding, rect.top - menuGap - maxHeight)
        : rect.bottom + menuGap;
      setPortalStyle({ left, top, width, maxHeight });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuPortal, open]);

  useEffect(() => {
    if (!open || !menuPortal || typeof document === "undefined") return undefined;
    const handlePointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      onOpenChange?.(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onOpenChange?.(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuPortal, onOpenChange, open]);

  const optionsList = open ? (
    <PyeongOptionsList
      value={value}
      onSelect={selectPyeong}
      ariaLabel={ariaLabel}
      className={menuPortal ? "custom-select-menu--portal formate-scroll-light" : ""}
      style={menuPortal ? portalStyle ?? { visibility: "hidden" } : undefined}
      containerRef={menuRef}
    />
  ) : null;

  return (
    <div className={`custom-select ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className={`custom-select-trigger ${value ? "has-value" : ""} ${open ? "open" : ""}`.trim()}
        onClick={() => onOpenChange?.(!open)}
        aria-label={ariaLabel}
        aria-expanded={open}
        disabled={disabled}
      >
        <span>{value ? `${value}평` : placeholder}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {menuPortal && typeof document !== "undefined"
        ? createPortal(optionsList, document.body)
        : optionsList}
    </div>
  );
}
