import { useState } from "react";

export function createEmptyAiSetupApplyCondition() {
  return { pyeong: "", buildType: "", conditionVariant: "", occupancy: "" };
}

export function createEmptyAiSetupConditionTouched() {
  return { pyeong: false, buildType: false, conditionVariant: false, occupancy: false };
}

export function useAiSetup() {
  const definitions = {
    aiSetupFileName: useState(""),
    aiSetupStatus: useState("idle"),
    aiSetupError: useState(""),
    aiSetupSheets: useState([]),
    selectedAiSetupSheetName: useState(""),
    aiSetupHeaderRowIndex: useState(-1),
    aiSetupColumnMappings: useState([]),
    aiSetupCatalogItems: useState([]),
    aiSetupCatalogLoading: useState(false),
    aiSetupCatalogError: useState(""),
    aiSetupMatchOverrides: useState({}),
    aiSetupApplyCondition: useState(createEmptyAiSetupApplyCondition),
    aiSetupApplyConditionTouched: useState(createEmptyAiSetupConditionTouched),
    aiSetupPriceConfirmOpen: useState(false),
    aiSetupPriceSaving: useState(false),
    aiSetupPriceResult: useState(null),
    aiSetupPriceError: useState(""),
    aiSetupTemplateConfirmOpen: useState(false),
    aiSetupTemplateSaving: useState(false),
    aiSetupTemplateResult: useState(null),
    aiSetupTemplateError: useState(""),
    aiSetupNewItemConfirmOpen: useState(false),
    aiSetupNewItemSaving: useState(false),
    aiSetupNewItemResult: useState(null),
    aiSetupNewItemError: useState(""),
    aiSetupAiLoading: useState(false),
    aiSetupAiError: useState(""),
    aiSetupAiResult: useState(null),
    aiSetupAdvancedOpen: useState(false),
    aiSetupStandardOpen: useState(false),
    aiSetupRawOpen: useState(false),
    aiSetupMatchReviewOpen: useState(false),
    aiSetupMatchReviewMode: useState("review"),
    aiSetupSplitReviewOpen: useState(false),
    aiSetupApplyPlanOpen: useState(false),
    aiSetupSaveGuideOpen: useState(false),
  };
  return Object.fromEntries(Object.entries(definitions).flatMap(([name, pair]) => {
    const setter = `set${name[0].toUpperCase()}${name.slice(1)}`;
    return [[name, pair[0]], [setter, pair[1]]];
  }));
}
