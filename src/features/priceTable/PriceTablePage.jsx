import {
  ChevronDown,
  ChevronRight,
  Download,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import {
  formatMoneyInputValue,
  isEmptyOrZeroDisplayValue,
  stripNumberInputFormatting,
} from "../../shared/utils/numbers";
import {
  CONSTRUCTION_ITEM_RENDERER_KINDS,
  getConstructionItemRendererKind,
  getFlooringVariantDisplayValues,
  getUnitSelectOptions,
  normalizeSpecOptions,
  normalizeUnitOptionValue,
} from "./priceTableModel";
import SashCatalogSection from "../sash/SashCatalogSection";
import AdminCategoryPanel from "./AdminCategoryPanel";

function getSpecSelectOptions(subitem, extraOptions = []) {
  return normalizeSpecOptions([
    ...extraOptions,
    ...normalizeSpecOptions(subitem?.spec_options),
  ]);
}

function getSpecSelectValue(subitem, options = [], fallback = "") {
  if (
    subitem?.selected_spec_option
    && options.includes(subitem.selected_spec_option)
  ) {
    return subitem.selected_spec_option;
  }
  if (fallback && options.includes(fallback)) return fallback;
  return "";
}

export default function PriceTablePage({
  companyId,
  addAdminSubitem,
  adminError,
  adminFavoriteOnly,
  adminLoading,
  adminNotice,
  adminPriceValidationError,
  adminSaving,
  adminSearch,
  autoSaveError,
  autoSaveStatus,
  canReorderAdminCatalog,
  clearAdminDragState,
  clearAdminPriceValidationErrorForSubitem,
  deleteAdminItem,
  deleteAdminSubitem,
  dragItemId,
  dragOverItemId,
  dragOverSubitem,
  dragSubitem,
  fetchAdminItems,
  excelExporting,
  excelExportError,
  filteredAdminItems,
  getAdminFlooringActiveThickness,
  getAutoSaveStatusLabel,
  getFlooringOptionEntries,
  getVisibleAdminSubitems,
  handleAdminItemDragOver,
  handleAdminItemDragStart,
  handleAdminSubitemDragOver,
  handleAdminSubitemDragStart,
  materialNamePlaceholder,
  markAdminCatalogDirty,
  newlyAddedSubitemId,
  onExcelExport,
  onExcelImport,
  renameAdminFlooringGroup,
  renameAdminItem,
  renameAdminSubitem,
  renderSpecOptionsControl,
  reorderAdminFlooringGroups,
  reorderAdminItems,
  reorderAdminSubitems,
  requestAdminCatalogLeave,
  saveAdminPrices,
  selectAdminFlooringThickness,
  selectedAdminPriceItem,
  setAdminFavoriteOnly,
  setAdminItems,
  setAdminPriceRowRef,
  setAdminSearch,
  setSelectedAdminCategoryId,
  toggleAdminFavorite,
  updateAdminSubitemUnit,
  updateLocalFlooringGroupBaseName,
  updateLocalSubitemDraft,
  updateLocalSubitemPrice,
}) {
  function renderHeader() {
    return (
      <div className="admin-price-table-header admin-price-v2-grid standard-price-table-header">
        <span />
        <span>소재명</span>
        <span>규격/두께</span>
        <span>단위</span>
        <span>단가</span>
        <span>인건비(빈집)</span>
        <span>인건비(살림집)</span>
        <span>삭제</span>
        <span />
      </div>
    );
  }

  function renderPrimarySubitemCells(subitem) {
    const controlSubitem = subitem ?? null;
    const displayValues = getFlooringVariantDisplayValues(subitem);
    return (
      <>
        <label className="spec-options-field">
          <span className="field-label">규격/두께</span>
          {(() => {
            const specOptions = getSpecSelectOptions(controlSubitem);
            const specValue = getSpecSelectValue(controlSubitem, specOptions);
            return renderSpecOptionsControl(
              controlSubitem,
              specOptions,
              specValue,
              (event) => {
                const nextValue = event.target.value;
                if (controlSubitem?.id) {
                  updateLocalSubitemDraft(controlSubitem.id, {
                    selected_spec_option: nextValue,
                  });
                }
              },
              { manageInSelect: true }
            );
          })()}
        </label>
        <label className="price-unit-field">
          <span className="field-label">단위</span>
          <select
            value={normalizeUnitOptionValue(controlSubitem?.unit)}
            onChange={(event) => {
              if (controlSubitem?.id) {
                updateAdminSubitemUnit(
                  controlSubitem.id,
                  event.target.value
                );
              }
            }}
          >
            {getUnitSelectOptions(controlSubitem?.unit).map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">단가</span>
          <input
            className={isEmptyOrZeroDisplayValue(displayValues.unit_price) ? "items-v2-muted-value" : ""}
            type="text"
            inputMode="numeric"
            value={formatMoneyInputValue(displayValues.unit_price)}
            disabled={displayValues.disabled}
            onChange={(event) => {
              if (!subitem?.id) return;
              updateLocalSubitemPrice(subitem.id, {
                unit_price: stripNumberInputFormatting(event.target.value),
              });
            }}
          />
        </label>
        <label className="price-number-field price-sale-field">
          <span className="field-label">인건비(빈집)</span>
          <input
            className={isEmptyOrZeroDisplayValue(displayValues.labor_rate_empty) ? "items-v2-muted-value" : ""}
            type="text"
            inputMode="numeric"
            value={formatMoneyInputValue(displayValues.labor_rate_empty)}
            disabled={displayValues.disabled}
            onChange={(event) => {
              if (!subitem?.id) return;
              const nextValue = stripNumberInputFormatting(event.target.value);
              updateLocalSubitemPrice(subitem.id, {
                labor_rate_empty: nextValue,
                labor_rate: nextValue,
              });
            }}
          />
        </label>
        <label className="price-number-field price-sale-field">
          <span className="field-label">인건비(살림집)</span>
          <input
            className={isEmptyOrZeroDisplayValue(displayValues.labor_rate_occupied) ? "items-v2-muted-value" : ""}
            type="text"
            inputMode="numeric"
            value={formatMoneyInputValue(displayValues.labor_rate_occupied)}
            disabled={displayValues.disabled}
            onChange={(event) => {
              if (!subitem?.id) return;
              updateLocalSubitemPrice(subitem.id, {
                labor_rate_occupied: stripNumberInputFormatting(
                  event.target.value
                ),
              });
            }}
          />
        </label>
      </>
    );
  }

  function renderExpandButton(subitem) {
    return (
      <button
        type="button"
        className="items-v2-icon-button admin-price-v2-expand-button"
        aria-label={subitem.expanded ? "원가 정보 닫기" : "원가 정보 열기"}
        title={subitem.expanded ? "원가 정보 닫기" : "원가 정보 열기"}
        onClick={() =>
          updateLocalSubitemDraft(subitem.id, {
            expanded: !subitem.expanded,
          })
        }
      >
        {subitem.expanded
          ? <ChevronDown size={18} strokeWidth={1.5} />
          : <ChevronRight size={18} strokeWidth={1.5} />}
      </button>
    );
  }

  function renderExpandedRow(subitem) {
    if (!subitem?.expanded) return null;
    return (
      <div className="admin-price-v2-expanded-row">
        <div className="items-v2-detail-panel admin-price-v2-detail-panel">
          <label>
            <span>원가</span>
            <div className="items-v2-money-field">
              <input
                type="text"
                inputMode="numeric"
                value={formatMoneyInputValue(subitem.cost_price)}
                onChange={(event) =>
                  updateLocalSubitemPrice(subitem.id, {
                    cost_price: stripNumberInputFormatting(
                      event.target.value
                    ),
                  })
                }
              />
              <em>원</em>
            </div>
          </label>
          <label>
            <span>원가 단위</span>
            <select
              className="items-v2-inline-select admin-price-v2-detail-select"
              value={normalizeUnitOptionValue(subitem.cost_unit)}
              onChange={(event) =>
                updateLocalSubitemPrice(subitem.id, {
                  cost_unit: normalizeUnitOptionValue(event.target.value),
                })
              }
            >
              <option value="">선택</option>
              {getUnitSelectOptions(subitem.cost_unit).map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    );
  }

  function renderRows(item) {
    const rendererKind = getConstructionItemRendererKind(item);
    const visibleSubitems = getVisibleAdminSubitems(item);
    const itemSubitems = visibleSubitems;

    if (rendererKind === CONSTRUCTION_ITEM_RENDERER_KINDS.SASH) {
      return (
        <SashCatalogSection
          companyId={companyId}
          item={item}
          subitems={visibleSubitems}
          adminSaving={adminSaving}
          canReorder={canReorderAdminCatalog}
          dragSubitem={dragSubitem}
          dragOverSubitem={dragOverSubitem}
          newlyAddedSubitemId={newlyAddedSubitemId}
          materialNamePlaceholder={materialNamePlaceholder}
          onAddSubitem={addAdminSubitem}
          onDeleteSubitem={deleteAdminSubitem}
          onDragEnd={clearAdminDragState}
          onDragOver={handleAdminSubitemDragOver}
          onDragStart={handleAdminSubitemDragStart}
          onDrop={reorderAdminSubitems}
          onSubitemNameChange={(subitemId, value) => {
            setAdminItems((current) => current.map((entry) => (
              entry.id === item.id
                ? {
                    ...entry,
                    subitems: entry.subitems.map((subitem) => (
                      subitem.id === subitemId ? { ...subitem, name: value } : subitem
                    )),
                  }
                : entry
            )));
            clearAdminPriceValidationErrorForSubitem(subitemId, value);
          }}
          onSubitemNameInput={markAdminCatalogDirty}
          onSubitemNameBlur={renameAdminSubitem}
        />
      );
    }

    return (
      <div className="admin-subitem-list price-table-list admin-price-v2-grid-list">
        {renderHeader()}
        {itemSubitems.map((subitem) => {
          const hasValidationError =
            adminPriceValidationError?.subitemId === subitem.id;
          return (
            <div
              key={subitem.id}
              ref={(node) => setAdminPriceRowRef(subitem.id, node)}
              className={`admin-value-row common-price-row price-table-row admin-price-v2-grid ${subitem.expanded ? "expanded" : ""} ${hasValidationError ? "admin-price-v2-row-error" : ""} ${newlyAddedSubitemId === subitem.id ? "newly-added" : ""} ${dragSubitem?.itemId === item.id && dragSubitem?.subitemId === subitem.id ? "dragging" : ""} ${dragOverSubitem?.itemId === item.id && dragOverSubitem?.subitemId === subitem.id ? "drop-target" : ""}`.trim()}
              data-subitem-id={subitem.id}
              onDragOver={(event) => handleAdminSubitemDragOver(event, item.id, subitem.id)}
              onDrop={() => reorderAdminSubitems(item.id, subitem.id)}
              onDragEnd={clearAdminDragState}
            >
              <span
                className={`drag-handle admin-price-v2-drag-handle ${canReorderAdminCatalog ? "enabled" : ""}`.trim()}
                title="소재 순서 변경"
                draggable={canReorderAdminCatalog && !adminSaving}
                onDragStart={(event) => handleAdminSubitemDragStart(event, item.id, subitem.id)}
                onDragEnd={clearAdminDragState}
              >
                ::
              </span>
              <label className={`admin-material-name-field ${hasValidationError ? "admin-material-name-field--error" : ""}`.trim()}>
                <span className="field-label">소재명</span>
                <input
                  value={subitem.name}
                  placeholder={materialNamePlaceholder}
                  onChange={(event) => {
                    setAdminItems((current) =>
                      current.map((entry) =>
                        entry.id === item.id
                          ? {
                              ...entry,
                              subitems: entry.subitems.map(
                                (entrySubitem) =>
                                  entrySubitem.id === subitem.id
                                    ? { ...entrySubitem, name: event.target.value }
                                    : entrySubitem
                              ),
                            }
                          : entry
                      )
                    );
                    clearAdminPriceValidationErrorForSubitem(subitem.id, event.target.value);
                  }}
                  onInput={() => markAdminCatalogDirty()}
                  onBlur={(event) => renameAdminSubitem(subitem.id, event.target.value)}
                />
                {hasValidationError && (
                  <span className="admin-price-validation-helper">
                    {adminPriceValidationError.message}
                  </span>
                )}
              </label>
              {renderPrimarySubitemCells(subitem)}
              <button
                className="danger-button admin-price-v2-danger-button"
                disabled={adminSaving}
                onClick={() => deleteAdminSubitem(subitem.id)}
              >
                <Trash2 size={18} strokeWidth={1.5} />
              </button>
              {renderExpandButton(subitem)}
              {renderExpandedRow(subitem)}
            </div>
          );
        })}
        {!itemSubitems.length && (
          <p className="admin-price-v2-empty muted">
            등록된 소재가 없습니다.
          </p>
        )}
        <div className="admin-price-v2-add-action">
          <button
            className="secondary-button"
            type="button"
            disabled={adminSaving}
            onClick={() => addAdminSubitem(item.id)}
          >
            <Plus size={18} /> 항목 추가
          </button>
        </div>
      </div>
    );
  }

  const item = selectedAdminPriceItem;

  return (
    <main className="admin-price-v2-page">
      <AdminCategoryPanel
        ariaLabel="단가표 대분류"
        items={filteredAdminItems}
        selectedItemId={selectedAdminPriceItem?.id}
        canReorder={canReorderAdminCatalog}
        disabled={adminSaving}
        dragItemId={dragItemId}
        dragOverItemId={dragOverItemId}
        onSelect={setSelectedAdminCategoryId}
        onDragOver={handleAdminItemDragOver}
        onDrop={reorderAdminItems}
        onDragStart={handleAdminItemDragStart}
        onDragEnd={clearAdminDragState}
      />
      <section className="admin-price-v2-workspace">
        <header className="admin-price-v2-header">
          <div className="items-v2-titleline">
            <h1>단가표 관리</h1>
            <span>업체 공통 단가와 인건비 기준</span>
          </div>
          <div className="items-v2-header-actions">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Upload />}
              disabled={adminLoading || adminSaving}
              onClick={onExcelImport}
            >
              Excel 업로드
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download />}
              disabled={adminLoading || adminSaving || excelExporting}
              onClick={onExcelExport}
            >
              {excelExporting ? "내보내는 중" : "Excel 내보내기"}
            </Button>
            <span
              className={`autosave-pill ${autoSaveStatus}`.trim()}
              title={autoSaveError || getAutoSaveStatusLabel()}
            >
              {getAutoSaveStatusLabel()}
            </span>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCcw />}
              disabled={adminLoading || adminSaving}
              onClick={() =>
                requestAdminCatalogLeave(() =>
                  fetchAdminItems({ mode: "prices" })
                )
              }
            >
              되돌리기
            </Button>
            {getConstructionItemRendererKind(item) !== CONSTRUCTION_ITEM_RENDERER_KINDS.SASH && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Save />}
                disabled={adminLoading || adminSaving}
                onClick={() => saveAdminPrices({ target: "prices" })}
              >
                저장하기
              </Button>
            )}
          </div>
        </header>

        <div className="items-v2-toolbar admin-price-v2-toolbar">
          <label className="admin-search-field admin-price-v2-search">
            <Search size={17} />
            <input
              value={adminSearch}
              onChange={(event) => setAdminSearch(event.target.value)}
              placeholder="대분류 또는 소재 검색"
            />
          </label>
          <label className="admin-favorite-filter admin-price-v2-favorite">
            <input
              type="checkbox"
              checked={adminFavoriteOnly}
              onChange={(event) =>
                setAdminFavoriteOnly(event.target.checked)
              }
            />
            즐겨찾기만 보기
          </label>
        </div>

        {adminLoading && <div className="status-box">불러오는 중...</div>}
        {adminSaving && <div className="status-box">저장 중...</div>}
        {adminNotice && <div className="status-box">{adminNotice}</div>}
        {adminError && <div className="error-box">{adminError}</div>}
        {excelExportError && <div className="error-box">{excelExportError}</div>}

        {item ? (
          <section className="items-v2-table-section admin-price-v2-table-section">
            <div className="admin-price-v2-table-scroll formate-scroll-light">
              {renderRows(item)}
            </div>
          </section>
        ) : (
          <section className="items-v2-table-section admin-price-v2-table-section">
            <div className="items-v2-section-header admin-price-v2-section-header">
              <div>
                <h2>단가표</h2>
                <p>표시할 대분류가 없습니다.</p>
              </div>
            </div>
            <EmptyState
              title="표시할 대분류가 없습니다."
              description="검색 조건을 바꾸거나 대분류를 추가하세요."
            />
          </section>
        )}
      </section>
    </main>
  );
}
