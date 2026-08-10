import { useEffect, useState } from "react";
import {
  CONSTRUCTION_PRODUCT_KINDS,
  CONSTRUCTION_VARIANT_VALUE_TYPES,
} from "./constructionCatalogModel";

function VariantEditorRow({
  variant,
  valueType,
  disabled,
  onUpdate,
  onArchive,
}) {
  const [value, setValue] = useState(`${variant.value ?? ""}`);
  const [unit, setUnit] = useState(`${variant.unit ?? ""}`);

  useEffect(() => {
    setValue(`${variant.value ?? ""}`);
    setUnit(`${variant.unit ?? ""}`);
  }, [variant.constructionSubitemId, variant.unit, variant.value]);

  async function commit() {
    if (
      !value.trim()
      || (
        valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER
        && !unit.trim()
      )
    ) return;
    if (`${variant.value ?? ""}` === value.trim() && `${variant.unit ?? ""}` === unit.trim()) {
      return;
    }
    await onUpdate?.(variant, { value: value.trim(), unit: unit.trim() });
  }

  const changed = `${variant.value ?? ""}` !== value.trim()
    || `${variant.unit ?? ""}` !== unit.trim();
  const valid = Boolean(value.trim()) && (
    valueType !== CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER
    || Boolean(unit.trim())
  );

  return (
    <div className="spec-options-popover-row canonical-variant-manager__row">
      <div className="canonical-variant-manager__value-fields">
        <input
          aria-label={`${variant.label} 옵션 값`}
          value={value}
          disabled={disabled}
          inputMode={valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER ? "decimal" : undefined}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
          }}
        />
        <input
          aria-label={`${variant.label} 옵션 단위`}
          value={unit}
          disabled={disabled}
          placeholder={valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER ? "단위" : "단위 선택"}
          onChange={(event) => setUnit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
          }}
        />
      </div>
      <div className="canonical-variant-manager__row-actions">
        <button
          type="button"
          className="icon-mini-button"
          disabled={disabled || !changed || !valid}
          aria-label={`${variant.label} 옵션 저장`}
          onClick={commit}
        >
          ✓
        </button>
        <button
          type="button"
          className="icon-mini-button danger"
          disabled={disabled}
          aria-label={`${variant.label} 옵션 보관`}
          onClick={() => onArchive?.(variant)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function CanonicalVariantManager({
  product,
  disabled = false,
  canConvertStandard = true,
  onAdd,
  onUpdate,
  onArchive,
  onUpdateKind,
  onClose,
}) {
  const isVariantProduct = product?.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP;
  const [variantKind, setVariantKind] = useState(product?.variantKind ?? "규격");
  const [valueType, setValueType] = useState(
    product?.variantValueType ?? CONSTRUCTION_VARIANT_VALUE_TYPES.TEXT
  );
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setVariantKind(product?.variantKind ?? "규격");
    setValueType(product?.variantValueType ?? CONSTRUCTION_VARIANT_VALUE_TYPES.TEXT);
    setValue("");
    setUnit("");
  }, [product?.productId, product?.variantKind, product?.variantValueType]);

  async function addVariant() {
    if (
      !value.trim()
      || !variantKind.trim()
      || (
        valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER
        && !unit.trim()
      )
    ) return;
    setSubmitting(true);
    try {
      await onAdd?.({
        variantKind: variantKind.trim(),
        variantValueType: valueType,
        value: value.trim(),
        unit: unit.trim(),
      });
      setValue("");
      setUnit("");
    } finally {
      setSubmitting(false);
    }
  }

  const controlsDisabled = disabled || submitting;
  const addDisabled = controlsDisabled
    || !value.trim()
    || !variantKind.trim()
    || (
      valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER
      && !unit.trim()
    );

  return (
    <div className="canonical-variant-manager">
      <div className="canonical-variant-manager__metadata">
        <label>
          <span>옵션 구분</span>
          <input
            value={variantKind}
            disabled={controlsDisabled}
            placeholder="예: 두께, 색상, 마감"
            onChange={(event) => setVariantKind(event.target.value)}
            onBlur={() => {
              if (isVariantProduct && variantKind.trim() && variantKind.trim() !== product.variantKind) {
                onUpdateKind?.(variantKind.trim());
              }
            }}
          />
        </label>
        <label>
          <span>값 형식</span>
          <select
            value={valueType}
            disabled={controlsDisabled || isVariantProduct}
            onChange={(event) => setValueType(event.target.value)}
          >
            <option value={CONSTRUCTION_VARIANT_VALUE_TYPES.TEXT}>문자</option>
            <option value={CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER}>숫자</option>
          </select>
        </label>
      </div>

      {isVariantProduct ? (
        <div className="spec-options-popover-list">
          {(product.variants ?? []).map((variant) => (
            <VariantEditorRow
              key={variant.constructionSubitemId}
              variant={variant}
              valueType={product.variantValueType}
              disabled={controlsDisabled}
              onUpdate={onUpdate}
              onArchive={onArchive}
            />
          ))}
        </div>
      ) : !canConvertStandard ? (
        <div className="spec-options-popover-empty">
          소재명을 저장한 뒤 옵션을 추가할 수 있습니다.
        </div>
      ) : null}

      {(isVariantProduct || canConvertStandard) && (
        <div className="spec-options-popover-add canonical-variant-manager__add">
          <input
            value={value}
            disabled={controlsDisabled}
            inputMode={valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER ? "decimal" : undefined}
            placeholder={valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER ? "예: 2.2" : "예: 무광"}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addVariant();
              }
            }}
          />
          <input
            value={unit}
            disabled={controlsDisabled}
            placeholder={valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER ? "단위 (필수)" : "단위 (선택)"}
            onChange={(event) => setUnit(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addVariant();
              }
            }}
          />
          <button
            type="button"
            className="secondary-button compact-button"
            disabled={addDisabled}
            onClick={addVariant}
          >
            추가
          </button>
        </div>
      )}

      <div className="spec-options-popover-actions">
        <button
          type="button"
          className="secondary-button compact-button"
          disabled={submitting}
          onClick={onClose}
        >
          완료
        </button>
      </div>
    </div>
  );
}
