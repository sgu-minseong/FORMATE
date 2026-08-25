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
  getAdminProductSelectedSubitemId,
  getConstructionItemRendererKind,
  getUnitSelectOptions,
  isLocalPriceTableSubitem,
  normalizeUnitOptionValue,
  resolveAdminProductSubitem,
} from "./priceTableModel";
import { CONSTRUCTION_PRODUCT_KINDS } from "../constructionCatalog/constructionCatalogModel";
import CanonicalVariantSelect from "../constructionCatalog/CanonicalVariantSelect";
import SashCatalogSection from "../sash/SashCatalogSection";
import AdminCategoryPanel from "./AdminCategoryPanel";
import AdminCatalogTableSkeleton from "./AdminCatalogTableSkeleton";

export default function PriceTablePage({
  companyId,
  addAdminSubitem,
  adminError,
  adminFavoriteOnly,
  catalogStatus,
  adminNotice,
  adminPriceValidationError,
  adminSaving,
  adminSearch,
  autoSaveError,
  autoSaveStatus,
  canReorderAdminCatalog,
  clearAdminDragState,
  clearAdminPriceValidationErrorForSubitem,
  archiveAdminProduct,
  archiveAdminProductVariant,
  createAdminProductVariant,
  deleteAdminSubitem,
  dragItemId,
  dragOverItemId,
  dragOverSubitem,
  dragSubitem,
  fetchAdminItems,
  excelExporting,
  excelExportError,
  filteredAdminItems,
  getAutoSaveStatusLabel,
  getVisibleAdminProducts,
  getVisibleAdminSubitems,
  handleAdminItemDragOver,
  handleAdminItemDragStart,
  handleAdminProductDragOver,
  handleAdminProductDragStart,
  handleAdminSubitemDragOver,
  handleAdminSubitemDragStart,
  handleSashSaveStateChange,
  materialNamePlaceholder,
  markAdminCatalogDirty,
  newlyAddedSubitemId,
  onExcelExport,
  onExcelImport,
  renameAdminProduct,
  renameAdminSubitem,
  reorderAdminItems,
  reorderAdminProducts,
  reorderAdminSubitems,
  requestAdminCatalogLeave,
  retryAdminCatalogMutation,
  saveAdminPrices,
  selectAdminCanonicalVariant,
  selectedAdminPriceItem,
  selectedSubitemIdByProduct,
  setAdminFavoriteOnly,
  setAdminItems,
  setAdminPriceRowRef,
  setAdminSearch,
  setSelectedAdminCategoryId,
  toggleAdminFavorite,
  updateAdminProductVariant,
  updateAdminProductVariantKind,
  updateAdminSubitemUnit,
  updateLocalSubitemDraft,
  updateLocalSubitemPrice,
}) {
  const catalogLoading = catalogStatus === "loading";
  const catalogReady = catalogStatus === "ready";
  const catalogUnavailable = !catalogReady;

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

  function renderPrimarySubitemCells(item, product, subitem) {
    const selectedSubitemId = getAdminProductSelectedSubitemId(
      product,
      selectedSubitemIdByProduct
    );
    return (
      <>
        <div className="spec-options-field">
          <span className="field-label">규격/두께</span>
          <CanonicalVariantSelect
            product={product}
            value={selectedSubitemId}
            disabled={adminSaving}
            onChange={(constructionSubitemId) => (
              selectAdminCanonicalVariant(product.productId, constructionSubitemId)
            )}
            management={{
              canConvertStandard: !isLocalPriceTableSubitem(subitem),
              onAdd: (draft) => createAdminProductVariant(item, product, draft),
              onUpdate: (variant, draft) => updateAdminProductVariant(item, product, variant, draft),
              onArchive: (variant) => archiveAdminProductVariant(item, product, variant),
              onUpdateKind: (variantKind) => updateAdminProductVariantKind(item, product, variantKind),
            }}
          />
        </div>
        <label className="price-unit-field">
          <span className="field-label">단위</span>
          <select
            value={normalizeUnitOptionValue(subitem?.unit)}
            onChange={(event) => {
              if (subitem?.id) {
                updateAdminSubitemUnit(
                  subitem.id,
                  event.target.value
                );
              }
            }}
          >
            {getUnitSelectOptions(subitem?.unit).map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">단가</span>
          <input
            className={isEmptyOrZeroDisplayValue(subitem?.unit_price) ? "items-v2-muted-value" : ""}
            type="text"
            inputMode="numeric"
            value={formatMoneyInputValue(subitem?.unit_price)}
            disabled={!subitem}
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
            className={isEmptyOrZeroDisplayValue(subitem?.labor_rate_empty ?? subitem?.labor_rate) ? "items-v2-muted-value" : ""}
            type="text"
            inputMode="numeric"
            value={formatMoneyInputValue(subitem?.labor_rate_empty ?? subitem?.labor_rate)}
            disabled={!subitem}
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
            className={isEmptyOrZeroDisplayValue(subitem?.labor_rate_occupied ?? subitem?.labor_rate) ? "items-v2-muted-value" : ""}
            type="text"
            inputMode="numeric"
            value={formatMoneyInputValue(subitem?.labor_rate_occupied ?? subitem?.labor_rate)}
            disabled={!subitem}
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
    const itemProducts = getVisibleAdminProducts(item);
    const canReorderProducts = canReorderAdminCatalog && !itemProducts.some((product) => (
      product.kind === CONSTRUCTION_PRODUCT_KINDS.SUBITEM
      && isLocalPriceTableSubitem(product.subitemId)
    ));

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
          onSaveStateChange={handleSashSaveStateChange}
        />
      );
    }

    return (
      <div className="admin-subitem-list price-table-list admin-price-v2-grid-list">
        {renderHeader()}
        {itemProducts.map((product) => {
          const subitem = resolveAdminProductSubitem(
            item,
            product,
            selectedSubitemIdByProduct
          );
          if (!subitem) return null;
          const hasValidationError =
            adminPriceValidationError?.subitemId === subitem.id;
          return (
            <div
              key={product.productId}
              ref={(node) => setAdminPriceRowRef(subitem.id, node)}
              className={`admin-value-row common-price-row price-table-row admin-price-v2-grid ${subitem.expanded ? "expanded" : ""} ${hasValidationError ? "admin-price-v2-row-error" : ""} ${newlyAddedSubitemId === subitem.id ? "newly-added" : ""} ${dragSubitem?.itemId === item.id && dragSubitem?.productId === product.productId ? "dragging" : ""} ${dragOverSubitem?.itemId === item.id && dragOverSubitem?.productId === product.productId ? "drop-target" : ""}`.trim()}
              data-product-id={product.productId}
              data-subitem-id={subitem.id}
              onDragOver={(event) => handleAdminProductDragOver(event, item.id, product.productId)}
              onDrop={() => reorderAdminProducts(item.id, product.productId)}
              onDragEnd={clearAdminDragState}
            >
              <span
                className={`drag-handle admin-price-v2-drag-handle ${canReorderProducts ? "enabled" : ""}`.trim()}
                title="소재 순서 변경"
                draggable={canReorderProducts && !adminSaving}
                onDragStart={(event) => handleAdminProductDragStart(event, item.id, product.productId)}
                onDragEnd={clearAdminDragState}
              >
                ::
              </span>
              <label className={`admin-material-name-field ${hasValidationError ? "admin-material-name-field--error" : ""}`.trim()}>
                <span className="field-label">소재명</span>
                {product.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP ? (
                  <input
                    key={`${product.productId}:${product.displayName}`}
                    defaultValue={product.displayName}
                    placeholder={materialNamePlaceholder}
                    onBlur={(event) => renameAdminProduct(item, product, event.target.value)}
                  />
                ) : (
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
                    onBlur={(event) => renameAdminProduct(item, product, event.target.value)}
                  />
                )}
                {hasValidationError && (
                  <span className="admin-price-validation-helper">
                    {adminPriceValidationError.message}
                  </span>
                )}
              </label>
              {renderPrimarySubitemCells(item, product, subitem)}
              <button
                className="danger-button admin-price-v2-danger-button"
                disabled={adminSaving}
                aria-label={`${product.displayName} 보관`}
                onClick={() => archiveAdminProduct(item, product)}
              >
                <Trash2 size={18} strokeWidth={1.5} />
              </button>
              {renderExpandButton(subitem)}
              {renderExpandedRow(subitem)}
            </div>
          );
        })}
        {!itemProducts.length && (
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
        items={catalogReady ? filteredAdminItems : []}
        selectedItemId={selectedAdminPriceItem?.id}
        loading={catalogLoading}
        canReorder={canReorderAdminCatalog}
        disabled={adminSaving}
        dragItemId={dragItemId}
        dragOverItemId={dragOverItemId}
        onSelect={setSelectedAdminCategoryId}
        onDragOver={handleAdminItemDragOver}
        onDrop={reorderAdminItems}
        onDragStart={handleAdminItemDragStart}
        onDragEnd={clearAdminDragState}
        onToggleFavorite={toggleAdminFavorite}
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
              disabled={catalogUnavailable || adminSaving}
              onClick={onExcelImport}
            >
              Excel 업로드
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download />}
              disabled={catalogUnavailable || adminSaving || excelExporting}
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
            {getConstructionItemRendererKind(item) === CONSTRUCTION_ITEM_RENDERER_KINDS.SASH && autoSaveStatus === "error" && (
              <button type="button" className="sash-autosave-retry" onClick={retryAdminCatalogMutation}>재시도</button>
            )}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCcw />}
              disabled={catalogLoading || adminSaving}
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
                disabled={catalogUnavailable || adminSaving}
                onClick={() => saveAdminPrices({ target: "prices" })}
              >
                저장하기
              </Button>
            )}
          </div>
        </header>

        <div className="items-v2-toolbar admin-price-v2-toolbar">
          {catalogLoading ? (
            <div className="admin-catalog-toolbar-skeleton" aria-hidden="true" />
          ) : (
            <>
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
                고정 항목만 보기
              </label>
            </>
          )}
        </div>

        {adminSaving && <div className="status-box">저장 중...</div>}
        {adminNotice && <div className="status-box">{adminNotice}</div>}
        {adminError && <div className="error-box">{adminError}</div>}
        {excelExportError && <div className="error-box">{excelExportError}</div>}

        {catalogLoading ? (
          <section className="items-v2-table-section admin-price-v2-table-section" aria-label="단가표 로딩">
            <div className="admin-price-v2-table-scroll formate-scroll-light">
              <AdminCatalogTableSkeleton variant="price" />
            </div>
          </section>
        ) : catalogReady && item ? (
          <section className="items-v2-table-section admin-price-v2-table-section">
            <div className="admin-price-v2-table-scroll formate-scroll-light">
              {renderRows(item)}
            </div>
          </section>
        ) : catalogReady ? (
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
        ) : (
          <section className="items-v2-table-section admin-price-v2-table-section">
            <EmptyState
              title="단가표를 불러오지 못했습니다."
              description="오류 내용을 확인한 뒤 되돌리기를 눌러 다시 시도하세요."
            />
          </section>
        )}
      </section>
    </main>
  );
}
