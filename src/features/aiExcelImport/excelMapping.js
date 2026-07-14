import {
  AI_BASIC_FIELD_KEYS,
  AI_EXCEL_FIELD_DEFINITIONS,
  AI_MAPPING_GROUPS,
  AI_MAPPING_SELECT_OPTIONS,
  AI_DUPLICATE_WARNING_KEYS,
} from "./constants";

function formatExcelDisplayDate(dateInput) {
  if (!dateInput) return "-";
  const date = new Date(`${dateInput}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateInput;
  return date.toLocaleDateString("ko-KR");
}

export function formatExcelCellValue(value) {
  if (value == null) return "";
  if (value instanceof Date) return formatExcelDisplayDate(value.toISOString().slice(0, 10));
  return `${value}`;
}

export function normalizeExcelRows(rows) {
  return (rows ?? [])
    .map((row) => (Array.isArray(row) ? row.map(formatExcelCellValue) : []))
    .filter((row) => row.some((cell) => `${cell ?? ""}`.trim() !== ""));
}

export function getExcelColumnLabel(index) {
  let columnNumber = index + 1;
  let label = "";
  while (columnNumber > 0) {
    const remainder = (columnNumber - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    columnNumber = Math.floor((columnNumber - 1) / 26);
  }
  return label;
}

export function normalizeExcelHeaderText(value) {
  return formatExcelCellValue(value)
    .trim()
    .toLowerCase()
    .replace(/[₩￦]/g, "")
    .replace(/원/g, "")
    .replace(/[()（）\[\]{}]/g, "")
    .replace(/[:：\-_]/g, "")
    .replace(/[\/\\,.;；]/g, "")
    .replace(/[^\p{L}\p{N}#]+/gu, "")
    .replace(/\s+/g, "");
}

export function tokenizeExcelHeaderText(value) {
  return formatExcelCellValue(value)
    .trim()
    .toLowerCase()
    .replace(/[₩￦]/g, "")
    .replace(/원/g, "")
    .replace(/[()（）\[\]{}]/g, " ")
    .replace(/[:：\-_]/g, " ")
    .split(/[\/\\,.;；\s]+/g)
    .map((token) => normalizeExcelHeaderText(token))
    .filter(Boolean);
}

export function getExcelHeaderMatchTexts(value) {
  const normalized = normalizeExcelHeaderText(value);
  return new Set([normalized, ...tokenizeExcelHeaderText(value)].filter(Boolean));
}

export function findAiFieldByHeader(headerValue) {
  const originalHeader = formatExcelCellValue(headerValue).trim();
  const normalizedHeader = normalizeExcelHeaderText(originalHeader);
  const headerTokens = tokenizeExcelHeaderText(originalHeader);
  if (!normalizedHeader) return null;

  for (const definition of AI_EXCEL_FIELD_DEFINITIONS) {
    if (definition.type !== "ignored") continue;
    const exactAlias = definition.aliases.find((alias) => `${alias}`.trim() === originalHeader);
    if (exactAlias) {
      return { definition, confidence: 1, matchedAlias: exactAlias, matchMethod: "ignored_alias" };
    }
    const normalizedAlias = definition.aliases.find((alias) => normalizeExcelHeaderText(alias) === normalizedHeader);
    if (normalizedAlias) {
      return { definition, confidence: 0.95, matchedAlias: normalizedAlias, matchMethod: "ignored_alias" };
    }
  }

  for (const definition of AI_EXCEL_FIELD_DEFINITIONS) {
    if (definition.type === "ignored") continue;
    const exactAlias = definition.aliases.find((alias) => `${alias}`.trim() === originalHeader);
    if (exactAlias) {
      return { definition, confidence: 1, matchedAlias: exactAlias, matchMethod: "exact_alias" };
    }
  }

  for (const definition of AI_EXCEL_FIELD_DEFINITIONS) {
    if (definition.type === "ignored") continue;
    const normalizedAlias = definition.aliases.find((alias) => normalizeExcelHeaderText(alias) === normalizedHeader);
    if (normalizedAlias) {
      return { definition, confidence: 0.95, matchedAlias: normalizedAlias, matchMethod: "normalized_alias" };
    }
  }

  for (const definition of AI_EXCEL_FIELD_DEFINITIONS) {
    if (definition.type === "ignored") continue;
    const tokenAlias = definition.aliases.find((alias) => {
      const aliasMatches = getExcelHeaderMatchTexts(alias);
      return headerTokens.some((token) => aliasMatches.has(token));
    });
    if (tokenAlias) {
      return { definition, confidence: 0.9, matchedAlias: tokenAlias, matchMethod: "token_alias" };
    }
  }

  return null;
}

export function detectExcelHeaderRow(rows) {
  let bestCandidate = { rowIndex: -1, matchCount: 0, score: 0 };

  (rows ?? []).forEach((row, rowIndex) => {
    const matches = (row ?? []).reduce(
      (result, cell) => {
        const match = findAiFieldByHeader(cell);
        if (!match) return result;
        if (match.definition.type === "ignored") return result;
        result.keys.add(match.definition.key);
        result.score += match.confidence;
        return result;
      },
      { keys: new Set(), score: 0 }
    );
    const matchCount = matches.keys.size;
    if (matchCount > bestCandidate.matchCount || (matchCount === bestCandidate.matchCount && matches.score > bestCandidate.score)) {
      bestCandidate = { rowIndex, matchCount, score: matches.score };
    }
  });

  return bestCandidate.matchCount >= 2 ? bestCandidate : null;
}

export function createUnknownExcelMapping(columnIndex, originalHeader = "") {
  return {
    columnIndex,
    originalHeader: originalHeader || `(빈 헤더 ${getExcelColumnLabel(columnIndex)})`,
    mappedKey: "",
    mappedLabel: "미인식",
    fieldType: "unknown",
    confidence: 0,
    matchMethod: "unknown",
  };
}

export function createExcelMappingFromDefinition(mapping, definitionKey, confidence = 0.88, reason = "") {
  const definition = AI_EXCEL_FIELD_DEFINITIONS.find((field) => field.key === definitionKey);
  if (!definition) return mapping;
  return {
    ...mapping,
    mappedKey: definition.key,
    mappedLabel: definition.label,
    fieldType: definition.type ?? "basic_field",
    confidence,
    matchMethod: "context_rule",
    reason,
  };
}

export function createIgnoredExcelMapping(mapping, confidence = 0.95, reason = "") {
  return {
    ...mapping,
    mappedKey: null,
    mappedLabel: "미사용",
    fieldType: "ignored",
    confidence,
    matchMethod: "ignored_alias",
    reason,
  };
}

function headerMatchesAny(headerValue, aliases) {
  const headerMatches = getExcelHeaderMatchTexts(headerValue);
  return aliases.some((alias) => {
    const aliasMatches = getExcelHeaderMatchTexts(alias);
    return [...aliasMatches].some((entry) => headerMatches.has(entry));
  });
}

function findHeaderColumnIndex(headerRow, aliases) {
  return (headerRow ?? []).findIndex((cell) => headerMatchesAny(cell, aliases));
}

export function applyExcelHeaderContextRules(headerRow, mappings) {
  const hasHeader = (aliases) => findHeaderColumnIndex(headerRow, aliases) >= 0;
  const indexes = {
    no: findHeaderColumnIndex(headerRow, ["No.", "NO.", "no.", "No", "NO", "번호", "순번", "연번", "#"]),
    item: findHeaderColumnIndex(headerRow, ["품목"]),
    content: findHeaderColumnIndex(headerRow, ["내용"]),
    detail: findHeaderColumnIndex(headerRow, ["내역"]),
    constructionName: findHeaderColumnIndex(headerRow, ["공사명"]),
    summaryDetail: findHeaderColumnIndex(headerRow, ["총괄내역"]),
    constructionWithDetail: findHeaderColumnIndex(headerRow, ["공사명 및 세부내역", "공사명및세부내역"]),
    division: findHeaderColumnIndex(headerRow, ["구분"]),
    itemName: findHeaderColumnIndex(headerRow, ["품목명"]),
    productName: findHeaderColumnIndex(headerRow, ["제품명"]),
  };

  return (mappings ?? []).map((mapping) => {
    if (mapping.columnIndex === indexes.no) {
      return createIgnoredExcelMapping(mapping, 0.95, "순번/번호 열은 변환 대상에서 제외");
    }

    if (mapping.columnIndex === indexes.constructionWithDetail) {
      return createExcelMappingFromDefinition(mapping, "item_name", 0.88, "공사명과 세부내역이 한 열에 섞인 후보");
    }

    if (indexes.item >= 0 && indexes.content >= 0 && indexes.item !== indexes.content) {
      if (mapping.columnIndex === indexes.item) {
        return createExcelMappingFromDefinition(mapping, "category", 0.88, "품목 + 내용 조합에서 품목을 대분류로 보정");
      }
      if (mapping.columnIndex === indexes.content) {
        return createExcelMappingFromDefinition(mapping, "item_name", 0.88, "품목 + 내용 조합에서 내용을 항목명으로 보정");
      }
    }

    if (indexes.item >= 0 && indexes.detail >= 0 && indexes.item !== indexes.detail) {
      if (mapping.columnIndex === indexes.item) {
        return createExcelMappingFromDefinition(mapping, "category", 0.88, "품목 + 내역 조합에서 품목을 대분류로 보정");
      }
      if (mapping.columnIndex === indexes.detail) {
        return createExcelMappingFromDefinition(mapping, "item_name", 0.88, "품목 + 내역 조합에서 내역을 항목명으로 보정");
      }
    }

    if (indexes.constructionName >= 0 && indexes.summaryDetail >= 0 && indexes.constructionName !== indexes.summaryDetail) {
      if (mapping.columnIndex === indexes.constructionName) {
        return createExcelMappingFromDefinition(mapping, "category", 0.88, "공사명 + 총괄내역 조합에서 공사명을 대분류로 보정");
      }
      if (mapping.columnIndex === indexes.summaryDetail) {
        return createExcelMappingFromDefinition(mapping, "item_name", 0.88, "공사명 + 총괄내역 조합에서 총괄내역을 항목명으로 보정");
      }
    }

    if (indexes.division >= 0 && indexes.itemName >= 0 && indexes.productName >= 0) {
      if (mapping.columnIndex === indexes.division) {
        return createExcelMappingFromDefinition(mapping, "category", 0.88, "구분 + 품목명 + 제품명 조합에서 구분을 대분류로 보정");
      }
      if (mapping.columnIndex === indexes.itemName) {
        return createExcelMappingFromDefinition(mapping, "item_name", 0.88, "구분 + 품목명 + 제품명 조합에서 품목명을 항목명으로 보정");
      }
      if (mapping.columnIndex === indexes.productName) {
        return createExcelMappingFromDefinition(mapping, "spec", 0.88, "구분 + 품목명 + 제품명 조합에서 제품명을 규격으로 보정");
      }
    }

    return mapping;
  });
}

export function createExcelColumnMappings(headerRow, columnCount) {
  const mappings = Array.from({ length: columnCount }, (_, columnIndex) => {
    const originalHeader = formatExcelCellValue(headerRow?.[columnIndex] ?? "").trim();
    const match = findAiFieldByHeader(originalHeader);
    if (!match) return createUnknownExcelMapping(columnIndex, originalHeader);
    if (match.definition.type === "ignored") {
      return createIgnoredExcelMapping(
        {
          ...createUnknownExcelMapping(columnIndex, originalHeader),
          originalHeader: originalHeader || getExcelColumnLabel(columnIndex),
        },
        match.confidence,
        match.matchedAlias ? `alias: ${match.matchedAlias}` : ""
      );
    }

    return {
      columnIndex,
      originalHeader: originalHeader || getExcelColumnLabel(columnIndex),
      mappedKey: match.definition.key,
      mappedLabel: match.definition.label,
      fieldType: match.definition.type ?? "basic_field",
      confidence: match.confidence,
      matchMethod: match.matchMethod ?? "unknown",
      reason: match.matchedAlias ? `alias: ${match.matchedAlias}` : "",
    };
  });
  return applyExcelHeaderContextRules(headerRow, mappings);
}

export function groupExcelMappings(mappings) {
  return AI_MAPPING_GROUPS.reduce((groups, group) => {
    groups[group.key] = (mappings ?? []).filter((mapping) =>
      group.key === "ignored"
        ? ["unknown", "ignored"].includes(mapping.fieldType)
        : mapping.fieldType === group.key
    );
    return groups;
  }, {});
}

function isSummaryLikePreviewRow(row) {
  const itemName = `${row.item_name ?? ""}`.trim();
  return ["합계", "소계", "총계"].includes(itemName);
}

export function createMappedExcelPreviewRows(rows, mappings, headerRowIndex) {
  const recognizedMappings = (mappings ?? []).filter((mapping) => !["unknown", "ignored"].includes(mapping.fieldType) && mapping.mappedKey);
  if (headerRowIndex < 0 || recognizedMappings.length === 0) return [];

  return (rows ?? [])
    .slice(headerRowIndex + 1)
    .map((row, sourceOffset) => {
      const mappedRow = recognizedMappings.reduce(
        (result, mapping) => {
          result[getExcelMappingValueKey(mapping)] = formatExcelCellValue(row?.[mapping.columnIndex] ?? "");
          return result;
        },
        { sourceRowNumber: headerRowIndex + sourceOffset + 2 }
      );
      return mappedRow;
    })
    .filter((row) => recognizedMappings.some((mapping) => `${row[getExcelMappingValueKey(mapping)] ?? ""}`.trim() !== ""))
    .filter((row) => !isSummaryLikePreviewRow(row))
    .slice(0, 50);
}

export function analyzeExcelSheetForFormate(sheet) {
  if (!sheet?.rows?.length) {
    return {
      headerRowIndex: -1,
      headerMatchCount: 0,
      mappings: [],
      groupedMappings: groupExcelMappings([]),
      previewRows: [],
      recognizedCount: 0,
      unknownCount: 0,
      hasHeader: false,
    };
  }

  const headerCandidate = detectExcelHeaderRow(sheet.rows);
  if (!headerCandidate) {
    return {
      headerRowIndex: -1,
      headerMatchCount: 0,
      mappings: [],
      groupedMappings: groupExcelMappings([]),
      previewRows: [],
      recognizedCount: 0,
      unknownCount: sheet.columnCount ?? 0,
      hasHeader: false,
    };
  }

  const columnCount = Math.max(sheet.columnCount ?? 0, sheet.rows[headerCandidate.rowIndex]?.length ?? 0);
  const mappings = createExcelColumnMappings(sheet.rows[headerCandidate.rowIndex], columnCount);
  const groupedMappings = groupExcelMappings(mappings);
  const recognizedCount = mappings.filter((mapping) => !["unknown", "ignored"].includes(mapping.fieldType)).length;

  return {
    headerRowIndex: headerCandidate.rowIndex,
    headerMatchCount: headerCandidate.matchCount,
    mappings,
    groupedMappings,
    previewRows: createMappedExcelPreviewRows(sheet.rows, mappings, headerCandidate.rowIndex),
    recognizedCount,
    unknownCount: mappings.length - recognizedCount,
    hasHeader: true,
  };
}

export function getAiMappingOptionByValue(value) {
  return AI_MAPPING_SELECT_OPTIONS.find((option) => option.value === value) ?? AI_MAPPING_SELECT_OPTIONS[0];
}

export function getExcelMappingSelectValue(mapping) {
  if (!mapping || ["unknown", "ignored"].includes(mapping.fieldType)) return "ignored";
  return mapping.mappedKey === "custom_field" ? "custom_field" : mapping.mappedKey;
}

export function getExcelMappingValueKey(mapping) {
  return mapping?.mappedKey === "custom_field" ? `custom_field_${mapping.columnIndex}` : mapping?.mappedKey;
}

export function applyExcelMappingOption(mapping, optionValue) {
  const option = getAiMappingOptionByValue(optionValue);
  const customFieldName =
    option.value === "custom_field"
      ? mapping.customFieldName || mapping.originalHeader || `추가필드 ${getExcelColumnLabel(mapping.columnIndex)}`
      : "";

  return {
    ...mapping,
    mappedKey: option.mappedKey,
    mappedLabel: option.mappedLabel,
    fieldType: option.fieldType,
    confidence: option.fieldType === "ignored" ? 0 : mapping.confidence || 1,
    matchMethod: "manual_override",
    reason: "사용자 수동 수정",
    customFieldName,
  };
}

export function createManualExcelMappings(rows, headerRowIndex, columnCount) {
  if (headerRowIndex < 0) return [];
  const headerRow = rows?.[headerRowIndex] ?? [];
  return createExcelColumnMappings(headerRow, columnCount);
}

export function summarizeExcelHeaderRow(row) {
  const preview = (row ?? [])
    .map((cell) => formatExcelCellValue(cell).trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(" / ");
  return preview || "빈 행";
}

export function createExcelMappingAnalysisFromManual(sheet, headerRowIndex, mappings) {
  if (!sheet?.rows?.length || headerRowIndex < 0 || !mappings?.length) {
    return {
      headerRowIndex: -1,
      headerMatchCount: 0,
      mappings: [],
      groupedMappings: groupExcelMappings([]),
      previewRows: [],
      recognizedCount: 0,
      unknownCount: sheet?.columnCount ?? 0,
      hasHeader: false,
    };
  }

  const recognizedCount = mappings.filter((mapping) => !["unknown", "ignored"].includes(mapping.fieldType)).length;
  return {
    headerRowIndex,
    headerMatchCount: mappings.filter((mapping) => !["unknown", "ignored"].includes(mapping.fieldType)).length,
    mappings,
    groupedMappings: groupExcelMappings(mappings),
    previewRows: createMappedExcelPreviewRows(sheet.rows, mappings, headerRowIndex),
    recognizedCount,
    unknownCount: mappings.length - recognizedCount,
    hasHeader: true,
  };
}

export function getExcelDuplicateMappingWarnings(mappings) {
  return AI_DUPLICATE_WARNING_KEYS.flatMap((key) => {
    const entries = (mappings ?? []).filter((mapping) => mapping.mappedKey === key && !["unknown", "ignored"].includes(mapping.fieldType));
    if (entries.length <= 1) return [];
    const definition = AI_EXCEL_FIELD_DEFINITIONS.find((field) => field.key === key);
    return [{
      key,
      label: definition?.label ?? key,
      count: entries.length,
      columns: entries.map((entry) => getExcelColumnLabel(entry.columnIndex)).join(", "),
    }];
  });
}

export function createExcelPreviewColumns(mappings) {
  const usedKeys = new Set();
  const columns = [];

  (mappings ?? []).forEach((mapping) => {
    if (!mapping.mappedKey || ["unknown", "ignored"].includes(mapping.fieldType)) return;
    const valueKey = getExcelMappingValueKey(mapping);
    if (mapping.mappedKey !== "custom_field" && usedKeys.has(mapping.mappedKey)) return;
    if (mapping.mappedKey !== "custom_field") usedKeys.add(mapping.mappedKey);
    columns.push({
      ...mapping,
      valueKey,
      displayLabel: mapping.mappedKey === "custom_field"
        ? (mapping.customFieldName || mapping.originalHeader || "추가필드")
        : mapping.mappedLabel,
    });
  });

  return columns;
}
