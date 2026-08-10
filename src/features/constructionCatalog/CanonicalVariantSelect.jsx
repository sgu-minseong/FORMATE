import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CONSTRUCTION_PRODUCT_KINDS } from "./constructionCatalogModel";
import CanonicalVariantManager from "./CanonicalVariantManager";

export default function CanonicalVariantSelect({
  product,
  value,
  disabled = false,
  onChange,
  management,
}) {
  const isVariantProduct = product?.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("select");
  const controlRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutsidePointer(event) {
      if (!controlRef.current?.contains(event.target)) {
        setOpen(false);
        setMode("select");
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  if (!management) {
    return (
      <div className="spec-options-control canonical-variant-control">
        {isVariantProduct ? (
          <select
            className="spec-options-select"
            aria-label={`${product.displayName} ${product.variantKind} 선택`}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange?.(event.target.value)}
          >
            {(product.variants ?? []).map((variant) => (
              <option
                key={variant.constructionSubitemId}
                value={variant.constructionSubitemId}
              >
                {variant.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="admin-items-v2-muted-cell">-</span>
        )}
      </div>
    );
  }

  const variants = isVariantProduct ? (product.variants ?? []) : [];
  const selectedVariant = variants.find(
    (variant) => variant.constructionSubitemId === value
  );

  function closeDropdown() {
    setOpen(false);
    setMode("select");
  }

  return (
    <div
      ref={controlRef}
      className="spec-options-control spec-options-control--select-manage canonical-variant-control"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.preventDefault();
        if (mode === "manage") {
          setMode("select");
        } else {
          closeDropdown();
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="canonical-variant-trigger"
        disabled={disabled}
        aria-label={`${product?.displayName ?? "소재"} 규격 선택`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          setOpen((current) => !current);
          setMode("select");
        }}
      >
        <span className={!selectedVariant ? "admin-items-v2-muted-cell" : undefined}>
          {selectedVariant?.label ?? "-"}
        </span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
      </button>

      {open && (
        <div
          className={`spec-options-popover canonical-variant-dropdown ${mode === "manage" ? "canonical-variant-dropdown--manage" : ""}`.trim()}
        >
          {mode === "manage" ? (
            <CanonicalVariantManager
              product={product}
              disabled={disabled}
              canConvertStandard={management.canConvertStandard}
              onAdd={management.onAdd}
              onUpdate={management.onUpdate}
              onArchive={management.onArchive}
              onUpdateKind={management.onUpdateKind}
              onClose={() => setMode("select")}
            />
          ) : (
            <>
              {variants.length > 0 && (
                <div className="canonical-variant-dropdown__options">
                  {variants.map((variant) => (
                    <button
                      key={variant.constructionSubitemId}
                      type="button"
                      className={`canonical-variant-dropdown__option ${variant.constructionSubitemId === value ? "selected" : ""}`.trim()}
                      aria-pressed={variant.constructionSubitemId === value}
                      onClick={() => {
                        onChange?.(variant.constructionSubitemId);
                        closeDropdown();
                      }}
                    >
                      {variant.label}
                    </button>
                  ))}
                </div>
              )}
              {variants.length > 0 && <div className="canonical-variant-dropdown__separator" />}
              <button
                type="button"
                className="canonical-variant-dropdown__manage-action"
                disabled={disabled}
                onClick={() => setMode("manage")}
              >
                관리
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
