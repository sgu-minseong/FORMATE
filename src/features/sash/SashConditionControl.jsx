import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, GripVertical, HelpCircle, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";

export function moveSashCondition(conditions, sourceId, targetId) {
  const sourceIndex = (conditions ?? []).findIndex((condition) => condition.id === sourceId);
  const targetIndex = (conditions ?? []).findIndex((condition) => condition.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return conditions ?? [];
  const reordered = [...conditions];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);
  return reordered.map((condition, index) => ({ ...condition, sort_order: index }));
}

function ConditionManageRow({ condition, disabled, onArchive, onRename }) {
  const [name, setName] = useState(condition.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => setName(condition.name), [condition.id, condition.name]);

  async function commitRename() {
    const nextName = name.trim();
    if (!nextName || nextName === condition.name) {
      setName(condition.name);
      return;
    }
    setSaving(true);
    try {
      await onRename?.(condition, nextName);
    } catch {
      setName(condition.name);
    } finally {
      setSaving(false);
    }
  }

  async function archiveCondition() {
    setSaving(true);
    try {
      await onArchive?.(condition);
    } catch {
      // The parent surfaces the persistence error in the open manager.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sash-condition-control__manage-row" draggable={!disabled && !saving} data-condition-id={condition.id}>
      <span className="drag-handle admin-price-v2-drag-handle enabled" title="샷시 조건 순서 변경">
        <GripVertical aria-hidden="true" size={14} strokeWidth={1.5} />
      </span>
      <Pencil aria-hidden="true" size={14} strokeWidth={1.5} />
      <input
        value={name}
        disabled={disabled || saving}
        aria-label={`${condition.name} 이름`}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitRename}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setName(condition.name);
        }}
      />
      <button
        type="button"
        className="items-v2-icon-button"
        disabled={disabled || saving}
        aria-label={`${condition.name} 보관`}
        title="보관"
        onClick={() => void archiveCondition()}
      >
        <Trash2 aria-hidden="true" size={15} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export default function SashConditionControl({
  conditions = [],
  value = "",
  disabled = false,
  onChange,
  onCreate,
  onRename,
  onReorder,
  onArchive,
}) {
  const controlRef = useRef(null);
  const triggerRef = useRef(null);
  const createInputRef = useRef(null);
  const helpId = useId();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("select");
  const [helpOpen, setHelpOpen] = useState(false);
  const [orderedConditions, setOrderedConditions] = useState(conditions);
  const [draggedId, setDraggedId] = useState("");
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const selectedId = typeof value === "object" ? value?.id : value;
  const selectedCondition = conditions.find((condition) => `${condition.id}` === `${selectedId}`);

  useEffect(() => setOrderedConditions(conditions), [conditions]);

  useEffect(() => {
    if (!open && !helpOpen) return undefined;
    function closeOnOutsidePointer(event) {
      if (!controlRef.current?.contains(event.target)) {
        closeDropdown();
        setHelpOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [helpOpen, open]);

  useEffect(() => {
    if (!open || mode !== "manage") return undefined;
    const frame = window.requestAnimationFrame(() => createInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [mode, open]);

  function closeDropdown() {
    setOpen(false);
    setMode("select");
    setDraggedId("");
    setNewName("");
    setError("");
  }

  async function createCondition() {
    const name = newName.trim();
    if (!name || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await onCreate?.(name);
      setNewName("");
      if (created) onChange?.(created);
    } catch (nextError) {
      setError(nextError?.message || "샷시 조건을 추가하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function dropCondition(targetId) {
    if (!draggedId || draggedId === targetId) return setDraggedId("");
    const previous = orderedConditions;
    const next = moveSashCondition(previous, draggedId, targetId);
    setOrderedConditions(next);
    setDraggedId("");
    setError("");
    try {
      await onReorder?.(next);
    } catch (nextError) {
      setOrderedConditions(previous);
      setError(nextError?.message || "샷시 조건 순서를 저장하지 못했습니다.");
    }
  }

  async function archiveCondition(condition) {
    setError("");
    try {
      await onArchive?.(condition);
    } catch (nextError) {
      setError(nextError?.message || "샷시 조건을 보관하지 못했습니다.");
      throw nextError;
    }
  }

  async function renameCondition(condition, name) {
    setError("");
    try {
      return await onRename?.(condition, name);
    } catch (nextError) {
      setError(nextError?.message || "샷시 조건 이름을 저장하지 못했습니다.");
      throw nextError;
    }
  }

  return (
    <div
      ref={controlRef}
      className="canonical-variant-control sash-condition-control"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (helpOpen) setHelpOpen(false);
        else if (mode === "manage") setMode("select");
        else if (open) {
          closeDropdown();
          triggerRef.current?.focus();
        }
      }}
    >
      <span className="sash-condition-control__label">샷시 조건</span>
      <button
        type="button"
        className="items-v2-icon-button sash-condition-control__help-trigger"
        aria-label="샷시 조건 도움말"
        aria-describedby={helpOpen ? helpId : undefined}
        onMouseEnter={() => setHelpOpen(true)}
        onMouseLeave={() => setHelpOpen(false)}
        onFocus={() => setHelpOpen(true)}
        onBlur={() => setHelpOpen(false)}
        onClick={() => setHelpOpen(true)}
      >
        <HelpCircle aria-hidden="true" size={15} strokeWidth={1.5} />
      </button>
      {helpOpen && (
        <div id={helpId} className="spec-options-popover sash-condition-control__help" role="tooltip">
          <strong>샷시 조건</strong>
          <span>집의 샷시 구조에 따라 미리 저장한 규격을 불러옵니다. 전체 견적 조건과는 별도로 적용됩니다.</span>
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        className="canonical-variant-trigger sash-condition-control__trigger"
        disabled={disabled}
        role="combobox"
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="샷시 조건 선택"
        onClick={() => {
          setHelpOpen(false);
          setOpen((current) => !current);
          setMode("select");
        }}
      >
        <span>{selectedCondition?.name ?? "조건 선택"}</span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.8} />
      </button>

      {open && (
        <div className={`spec-options-popover canonical-variant-dropdown sash-condition-control__popover ${mode === "manage" ? "sash-condition-control__popover--manage" : ""}`.trim()}>
          {mode === "select" ? (
            <>
              <div id={listId} className="canonical-variant-dropdown__options" role="listbox" aria-label="샷시 조건">
                {conditions.map((condition) => {
                  const selected = `${condition.id}` === `${selectedId}`;
                  return (
                    <button
                      key={condition.id}
                      type="button"
                      className={`canonical-variant-dropdown__option ${selected ? "selected" : ""}`.trim()}
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onChange?.(condition);
                        closeDropdown();
                      }}
                    >
                      <span>{condition.name}</span>
                      {selected && <Check aria-hidden="true" size={14} strokeWidth={1.8} />}
                    </button>
                  );
                })}
                {!conditions.length && <span className="sash-condition-control__empty">등록된 샷시 조건이 없습니다.</span>}
              </div>
              <div className="canonical-variant-dropdown__separator" />
              <Button variant="tertiary" size="sm" disabled={disabled} onClick={() => setMode("manage")}>
                관리
              </Button>
            </>
          ) : (
            <div className="sash-condition-control__manager">
              <div className="sash-condition-control__manager-header">
                <strong>샷시 조건 관리</strong>
                <Button variant="tertiary" size="sm" onClick={() => setMode("select")}>완료</Button>
              </div>
              <div className="sash-condition-control__manage-list">
                {orderedConditions.map((condition) => (
                  <div
                    key={condition.id}
                    onDragStart={(event) => {
                      setDraggedId(condition.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", condition.id);
                    }}
                    onDragOver={(event) => {
                      if (draggedId && draggedId !== condition.id) event.preventDefault();
                    }}
                    onDrop={() => dropCondition(condition.id)}
                    onDragEnd={() => setDraggedId("")}
                  >
                    <ConditionManageRow
                      condition={condition}
                      disabled={disabled}
                      onRename={renameCondition}
                      onArchive={archiveCondition}
                    />
                  </div>
                ))}
              </div>
              <div className="sash-condition-control__create">
                <input
                  ref={createInputRef}
                  value={newName}
                  disabled={disabled || submitting}
                  aria-label="새 샷시 조건 이름"
                  placeholder="조건 이름"
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      createCondition();
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus />}
                  disabled={disabled || submitting || !newName.trim()}
                  onClick={createCondition}
                >
                  추가
                </Button>
              </div>
              {error && <span className="sash-condition-control__error" role="alert">{error}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
