import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import { SASH_OPTION_KINDS } from "./sashOptionApi";

export function resolveSashOptionValue(options, value, optionId = "") {
  const allOptions = options ?? [];
  const activeOptions = allOptions.filter((option) => !option.archived_at);
  const objectId = typeof value === "object" ? value?.id : optionId;
  const rawValue = typeof value === "object"
    ? value?.label ?? value?.semantic_value ?? ""
    : value;
  if (!objectId && !String(rawValue ?? "").trim()) return null;
  return allOptions.find((option) => objectId && `${option.id}` === `${objectId}`)
    ?? activeOptions.find((option) => `${option.label}` === `${rawValue}`)
    ?? activeOptions.find((option) => `${option.semantic_value ?? ""}` === `${rawValue ?? ""}`)
    ?? null;
}

function OptionManageRow({ option, disabled, onArchive, onRename }) {
  const [label, setLabel] = useState(option.label);
  const [saving, setSaving] = useState(false);

  useEffect(() => setLabel(option.label), [option.id, option.label]);

  async function commitRename() {
    const nextLabel = label.trim();
    if (!nextLabel || nextLabel === option.label) {
      setLabel(option.label);
      return;
    }
    setSaving(true);
    try {
      await onRename?.(option, nextLabel);
    } catch {
      setLabel(option.label);
    } finally {
      setSaving(false);
    }
  }

  async function archiveOption() {
    setSaving(true);
    try {
      await onArchive?.(option);
    } catch {
      // The open manager owns the persistence error message.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sash-option-select__manage-row">
      <Pencil aria-hidden="true" size={14} strokeWidth={1.5} />
      <input
        value={label}
        disabled={disabled || saving}
        aria-label={`${option.label} 이름`}
        onChange={(event) => setLabel(event.target.value)}
        onBlur={commitRename}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setLabel(option.label);
        }}
      />
      <span
        className="sash-option-select__semantic"
        title={option.option_kind === SASH_OPTION_KINDS.WINDOW_TYPE ? "계산 의미는 변경되지 않습니다." : undefined}
        aria-hidden={option.option_kind !== SASH_OPTION_KINDS.WINDOW_TYPE}
      >
        {option.option_kind === SASH_OPTION_KINDS.WINDOW_TYPE
          ? option.semantic_value === "double" ? "2중창 ×2" : "단창 ×1"
          : ""}
      </span>
      <button
        type="button"
        className="items-v2-icon-button sash-option-select__archive"
        disabled={disabled || saving}
        aria-label={`${option.label} 삭제`}
        title="삭제"
        onClick={() => void archiveOption()}
      >
        <Trash2 aria-hidden="true" size={15} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export default function SashOptionSelect({
  optionKind,
  options = [],
  value = "",
  optionId = "",
  disabled = false,
  ariaLabel,
  onChange,
  onCreate,
  onRename,
  onArchive,
}) {
  const controlRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("select");
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [semanticValue, setSemanticValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const scopedOptions = options.filter((option) => option.option_kind === optionKind);
  const activeOptions = scopedOptions.filter((option) => !option.archived_at);
  const isWindowType = optionKind === SASH_OPTION_KINDS.WINDOW_TYPE;
  const controlledValue = isWindowType && !optionId && value === "unspecified" ? "" : value;
  const selectedOption = resolveSashOptionValue(scopedOptions, controlledValue, optionId);
  const rawDisplayValue = typeof controlledValue === "object"
    ? controlledValue?.label
    : String(controlledValue ?? "").trim();
  const displayValue = selectedOption?.label ?? (rawDisplayValue || "미지정");

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsidePointer(event) {
      if (
        !controlRef.current?.contains(event.target)
        && !popoverRef.current?.contains(event.target)
        && !event.target.closest?.(".ui-select-popover")
      ) closeDropdown();
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || typeof window === "undefined") return undefined;
    function positionPopover() {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (!triggerRect) return;
      const viewportPadding = 8;
      const gap = 4;
      const preferredWidth = mode === "manage" ? 320 : 196;
      const width = Math.min(Math.max(preferredWidth, triggerRect.width), window.innerWidth - viewportPadding * 2);
      const height = Math.min(popoverRef.current?.offsetHeight ?? 320, window.innerHeight - viewportPadding * 2);
      const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding - gap;
      const openAbove = spaceBelow < height && triggerRect.top > spaceBelow;
      setPopoverStyle({
        left: Math.min(
          Math.max(viewportPadding, triggerRect.left),
          window.innerWidth - viewportPadding - width
        ),
        top: openAbove
          ? Math.max(viewportPadding, triggerRect.top - gap - height)
          : Math.min(triggerRect.bottom + gap, window.innerHeight - viewportPadding - height),
        width,
      });
    }
    positionPopover();
    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", positionPopover, true);
    return () => {
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
    };
  }, [activeOptions.length, adding, error, mode, open]);

  function closeDropdown() {
    setOpen(false);
    setMode("select");
    setAdding(false);
    setNewLabel("");
    setSemanticValue("");
    setError("");
  }

  function selectOption(option) {
    if (option) onChange?.(option);
    else onChange?.(null);
    closeDropdown();
    triggerRef.current?.focus();
  }

  function moveActive(direction) {
    const optionCount = activeOptions.length + 1;
    setActiveIndex((current) => (current + direction + optionCount) % optionCount);
  }

  async function createOption() {
    const label = newLabel.trim();
    if (!label || submitting || (isWindowType && !semanticValue)) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await onCreate?.({
        optionKind,
        label,
        semanticValue: isWindowType ? semanticValue : null,
      });
      if (created) onChange?.(created);
      closeDropdown();
    } catch (nextError) {
      setError(nextError?.message || "샷시 옵션을 추가하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function renameOption(option, label) {
    setError("");
    try {
      return await onRename?.(option, label);
    } catch (nextError) {
      setError(nextError?.message || "샷시 옵션 이름을 저장하지 못했습니다.");
      throw nextError;
    }
  }

  async function archiveOption(option) {
    setError("");
    try {
      return await onArchive?.(option);
    } catch (nextError) {
      setError(nextError?.message || "샷시 옵션을 삭제하지 못했습니다.");
      throw nextError;
    }
  }

  const createControl = (
    <div className="sash-option-select__create">
      <input
        autoFocus
        value={newLabel}
        disabled={submitting}
        aria-label="새 샷시 옵션 이름"
        placeholder="옵션 이름"
        onChange={(event) => setNewLabel(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            createOption();
          }
        }}
      />
      {isWindowType && (
        <Select
          value={semanticValue}
          disabled={submitting}
          aria-label="창 유형 계산 의미"
          onChange={(event) => setSemanticValue(event.target.value)}
        >
          <option value="">계산 의미 선택</option>
          <option value="single">단창 ×1</option>
          <option value="double">2중창 ×2</option>
        </Select>
      )}
      <div className="sash-option-select__create-actions">
        <Button
          variant="tertiary"
          size="sm"
          disabled={submitting}
          onClick={() => {
            setAdding(false);
            setNewLabel("");
            setSemanticValue("");
            setError("");
            if (mode === "select") triggerRef.current?.focus();
          }}
        >
          취소
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={submitting || !newLabel.trim() || (isWindowType && !semanticValue)}
          onClick={createOption}
        >
          추가
        </Button>
      </div>
      {error && <span className="sash-option-select__error" role="alert">{error}</span>}
    </div>
  );

  const popover = open ? (
    <div
      ref={popoverRef}
      className={`spec-options-popover canonical-variant-dropdown sash-option-select__popover formate-scroll-light ${mode === "manage" ? "sash-option-select__popover--manage" : ""}`.trim()}
      style={popoverStyle ?? { visibility: "hidden" }}
    >
      {mode === "manage" ? (
        <div className="sash-option-select__manager">
          <div className="sash-condition-control__manager-header">
            <strong>옵션 관리</strong>
            <Button variant="tertiary" size="sm" onClick={() => setMode("select")}>완료</Button>
          </div>
          <div className="sash-option-select__manage-list">
            {activeOptions.map((option) => (
              <OptionManageRow
                key={option.id}
                option={option}
                disabled={disabled}
                onRename={renameOption}
                onArchive={archiveOption}
              />
            ))}
          </div>
          <div className="canonical-variant-dropdown__separator" />
          {adding ? createControl : (
            <Button variant="tertiary" size="sm" leftIcon={<Plus />} onClick={() => setAdding(true)}>
              옵션 추가
            </Button>
          )}
          {error && !adding && <span className="sash-option-select__error" role="alert">{error}</span>}
        </div>
      ) : (
        <>
          <div id={listId} className="canonical-variant-dropdown__options" role="listbox" aria-label={ariaLabel}>
            <button
              type="button"
              className={`canonical-variant-dropdown__option ${!selectedOption && !rawDisplayValue ? "selected" : ""} ${activeIndex === 0 ? "active" : ""}`.trim()}
              role="option"
              aria-selected={!selectedOption && !rawDisplayValue}
              onPointerMove={() => setActiveIndex(0)}
              onClick={() => selectOption(null)}
            >
              <span>미지정</span>
              {!selectedOption && !rawDisplayValue && <Check aria-hidden="true" size={14} strokeWidth={1.8} />}
            </button>
            {activeOptions.map((option, index) => {
              const selected = selectedOption?.id === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`canonical-variant-dropdown__option ${selected ? "selected" : ""} ${activeIndex === index + 1 ? "active" : ""}`.trim()}
                  role="option"
                  aria-selected={selected}
                  onPointerMove={() => setActiveIndex(index + 1)}
                  onClick={() => selectOption(option)}
                >
                  <span>{option.label}</span>
                  {selected && <Check aria-hidden="true" size={14} strokeWidth={1.8} />}
                </button>
              );
            })}
          </div>
          <div className="canonical-variant-dropdown__separator" />
          {adding ? createControl : (
            <div className="sash-option-select__footer-actions">
              <Button variant="tertiary" size="sm" leftIcon={<Plus />} disabled={disabled} onClick={() => setAdding(true)}>
                옵션 추가
              </Button>
              <Button variant="tertiary" size="sm" leftIcon={<Pencil />} disabled={disabled} onClick={() => setMode("manage") }>
                관리
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  ) : null;

  return (
    <div
      ref={controlRef}
      className="canonical-variant-control sash-option-select"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          if (mode === "manage") {
            setMode("select");
            setAdding(false);
          } else {
            closeDropdown();
            triggerRef.current?.focus();
          }
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="canonical-variant-trigger sash-option-select__trigger"
        disabled={disabled}
        role="combobox"
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => {
          if (!open) setActiveIndex(Math.max(0, activeOptions.findIndex((option) => option.id === selectedOption?.id) + 1));
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "Escape"].includes(event.key)) {
            event.preventDefault();
          }
          if (event.key === "Escape") return closeDropdown();
          if (event.key === "Home") {
            setOpen(true);
            return setActiveIndex(0);
          }
          if (event.key === "End") {
            setOpen(true);
            return setActiveIndex(activeOptions.length);
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            if (!open) {
              setOpen(true);
              return setActiveIndex(Math.max(0, activeOptions.findIndex((option) => option.id === selectedOption?.id) + 1));
            }
            return moveActive(event.key === "ArrowDown" ? 1 : -1);
          }
          if ((event.key === "Enter" || event.key === " ") && open) {
            return selectOption(activeIndex === 0 ? null : activeOptions[activeIndex - 1]);
          }
          if (event.key === "Enter" || event.key === " ") setOpen(true);
        }}
      >
        <span className={displayValue === "미지정" ? "admin-items-v2-muted-cell" : undefined}>{displayValue}</span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
      </button>
      {typeof document !== "undefined" && createPortal(popover, document.body)}
    </div>
  );
}
