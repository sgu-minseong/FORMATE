import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function normalizeOptions(options, children) {
  if (options.length) return options;
  return Children.toArray(children).flatMap((child) => (
    isValidElement(child) && child.type === "option"
      ? [{
          disabled: Boolean(child.props.disabled),
          label: child.props.children,
          value: String(child.props.value ?? ""),
        }]
      : []
  ));
}

const Select = forwardRef(function Select({
  label,
  hint,
  options = [],
  className = "",
  selectClassName = "",
  children,
  value,
  defaultValue = "",
  disabled = false,
  name,
  id,
  onChange,
  onBlur,
  "aria-label": ariaLabel,
  ...props
}, forwardedRef) {
  const generatedId = useId();
  const triggerId = id || `ui-select-${generatedId}`;
  const listboxId = `${triggerId}-listbox`;
  const triggerRef = useRef(null);
  const controlled = value !== undefined;
  const [localValue, setLocalValue] = useState(String(defaultValue ?? ""));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [popoverStyle, setPopoverStyle] = useState({});
  const normalizedOptions = useMemo(
    () => normalizeOptions(options, children),
    [children, options]
  );
  const selectedValue = String(controlled ? value ?? "" : localValue);
  const selectedIndex = normalizedOptions.findIndex((option) => String(option.value) === selectedValue);
  const selectedOption = normalizedOptions[selectedIndex] ?? normalizedOptions[0];

  function setTriggerRef(node) {
    triggerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }

  function positionPopover() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(240, normalizedOptions.length * 34 + 8);
    setPopoverStyle({
      left: Math.min(rect.left, Math.max(8, window.innerWidth - rect.width - 8)),
      minWidth: rect.width,
      top: spaceBelow >= estimatedHeight || rect.top < estimatedHeight
        ? rect.bottom + 4
        : Math.max(8, rect.top - estimatedHeight - 4),
    });
  }

  useEffect(() => {
    if (!open) return undefined;
    positionPopover();
    const close = (event) => {
      if (!triggerRef.current?.contains(event.target)
        && !event.target.closest?.(`#${CSS.escape(listboxId)}`)) {
        setOpen(false);
      }
    };
    const closeOnViewportChange = () => setOpen(false);
    document.addEventListener("pointerdown", close);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange);
    };
  }, [listboxId, normalizedOptions.length, open]);

  function selectOption(option) {
    if (!option || option.disabled) return;
    const nextValue = String(option.value);
    if (!controlled) setLocalValue(nextValue);
    onChange?.({ target: { name, value: nextValue } });
    setOpen(false);
    triggerRef.current?.focus();
  }

  function moveActive(direction) {
    if (!normalizedOptions.length) return;
    let nextIndex = activeIndex;
    do {
      nextIndex = (nextIndex + direction + normalizedOptions.length) % normalizedOptions.length;
    } while (normalizedOptions[nextIndex]?.disabled && nextIndex !== activeIndex);
    setActiveIndex(nextIndex);
  }

  return (
    <div className={cx("ui-field", className)}>
      {label && <span className="ui-field__label" id={`${triggerId}-label`}>{label}</span>}
      <button
        {...props}
        ref={setTriggerRef}
        id={triggerId}
        type="button"
        className={cx("ui-select", selectClassName)}
        disabled={disabled}
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-labelledby={label ? `${triggerId}-label` : undefined}
        onBlur={onBlur}
        onClick={() => {
          if (!open) setActiveIndex(Math.max(0, selectedIndex));
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "Escape"].includes(event.key)) {
            event.preventDefault();
          }
          if (event.key === "Escape") return setOpen(false);
          if (event.key === "Home") {
            setOpen(true);
            return setActiveIndex(0);
          }
          if (event.key === "End") {
            setOpen(true);
            return setActiveIndex(Math.max(0, normalizedOptions.length - 1));
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            if (!open) {
              setActiveIndex(Math.max(0, selectedIndex));
              return setOpen(true);
            }
            return moveActive(event.key === "ArrowDown" ? 1 : -1);
          }
          if ((event.key === "Enter" || event.key === " ") && open) {
            return selectOption(normalizedOptions[activeIndex]);
          }
          if (event.key === "Enter" || event.key === " ") setOpen(true);
        }}
      >
        <span>{selectedOption?.label ?? ""}</span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
      </button>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      {hint && <span className="ui-field__hint">{hint}</span>}
      {open && createPortal(
        <div
          id={listboxId}
          className="ui-select-popover formate-scroll-light"
          role="listbox"
          aria-label={ariaLabel || label}
          style={popoverStyle}
        >
          {normalizedOptions.map((option, index) => {
            const selected = String(option.value) === selectedValue;
            return (
              <button
                key={`${String(option.value)}-${index}`}
                type="button"
                className={cx(
                  "ui-select-option",
                  selected && "selected",
                  index === activeIndex && "active"
                )}
                disabled={option.disabled}
                role="option"
                aria-selected={selected}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
              >
                <span>{option.label}</span>
                {selected && <Check aria-hidden="true" size={14} strokeWidth={1.8} />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
});

export default Select;
