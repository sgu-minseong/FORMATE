import EstimateLiveSummary from "./EstimateLiveSummary";
import EstimatePhotoContextPane from "./EstimatePhotoContextPane";

export default function EstimateContextPane({
  activeMode = "estimate",
  onModeChange,
  estimateSummaryProps,
  conditionContent,
  photoTitle,
  photos,
  photosLoading,
  photosError,
  onOpenPhoto,
}) {
  const currentMode = ["photo", "condition"].includes(activeMode) ? activeMode : "estimate";

  return (
    <section className="estimate-context-pane" aria-label="견적 작성 컨텍스트">
      {currentMode !== "condition" && (
        <div className="estimate-context-pane__tabs" role="tablist" aria-label="견적 작성 컨텍스트">
          <button
            id="estimate-context-tab-estimate"
            type="button"
            role="tab"
            aria-controls="estimate-context-panel"
            aria-selected={currentMode === "estimate"}
            className={currentMode === "estimate" ? "active" : ""}
            onClick={() => onModeChange?.("estimate")}
          >
            견적서
          </button>
          <button
            id="estimate-context-tab-photo"
            type="button"
            role="tab"
            aria-controls="estimate-context-panel"
            aria-selected={currentMode === "photo"}
            className={currentMode === "photo" ? "active" : ""}
            onClick={() => onModeChange?.("photo")}
          >
            사진
          </button>
        </div>
      )}

      <div
        id="estimate-context-panel"
        className={`estimate-context-pane__body estimate-context-pane__body--${currentMode}`}
        role={currentMode === "condition" ? "region" : "tabpanel"}
        aria-labelledby={currentMode === "condition" ? undefined : `estimate-context-tab-${currentMode}`}
      >
        {currentMode === "condition" ? conditionContent : currentMode === "estimate" ? (
          <EstimateLiveSummary {...estimateSummaryProps} />
        ) : (
          <EstimatePhotoContextPane
            open
            title={photoTitle}
            photos={photos}
            loading={photosLoading}
            error={photosError}
            onClose={() => onModeChange?.("estimate")}
            onOpenPhoto={onOpenPhoto}
          />
        )}
      </div>
    </section>
  );
}
