const OPENAI_MODEL = "gpt-5-mini";

const ALLOWED_ROW_TYPES = new Set([
  "work_item",
  "cost_item",
  "margin_item",
  "tax_item",
  "subtotal_row",
  "total_row",
  "ignored",
  "needs_review",
]);

const ALLOWED_ACTIONS = new Set([
  "link_existing",
  "add_new_item",
  "cost_candidate",
  "validation_only",
  "ignore",
  "needs_review",
]);

const REVIEW_SIGNAL_GROUPS = [
  {
    keywords: ["공과잡비", "부대비", "현장관리비", "운반비", "폐기물", "폐기물처리비", "기타잡비", "잡비", "양중비", "출장비"],
    note: "비용 성격일 수 있어 저장 전 확인이 필요합니다.",
  },
  {
    keywords: ["기업마진", "마진", "이윤", "수수료"],
    note: "마진/관리비 성격일 수 있어 저장 전 확인이 필요합니다.",
  },
  {
    keywords: ["부가세", "vat", "세금", "세액", "공급가액"],
    note: "세금/공급가액 관련 행일 수 있어 저장 전 확인이 필요합니다.",
  },
  {
    keywords: ["청구계", "총계", "총합계", "최종견적금액", "최종금액", "결제금액", "청구금액", "소계", "공사비계", "순공사비계", "손공사비계", "부분합계"],
    note: "소계/총계/검산 행일 수 있어 저장 전 확인이 필요합니다.",
  },
];
const BUNDLE_SIGNAL_KEYWORDS = ["포함", "전체", "인건비", "교체", "철거"];
const BUNDLE_SEPARATORS = [",", "/", "\\", "·", "+", "&", " 및 ", "와 ", "과 "];

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["recommendations", "warnings", "summary"],
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "rowIndex",
          "recommendedRowType",
          "recommendedAction",
          "recommendedCategoryId",
          "recommendedCategoryName",
          "recommendedSubitemId",
          "recommendedSubitemName",
          "newCategoryName",
          "newSubitemName",
          "confidence",
          "reason",
        ],
        properties: {
          rowIndex: { type: "number" },
          recommendedRowType: { enum: Array.from(ALLOWED_ROW_TYPES) },
          recommendedAction: { enum: Array.from(ALLOWED_ACTIONS) },
          recommendedCategoryId: { type: ["string", "null"] },
          recommendedCategoryName: { type: ["string", "null"] },
          recommendedSubitemId: { type: ["string", "null"] },
          recommendedSubitemName: { type: ["string", "null"] },
          newCategoryName: { type: ["string", "null"] },
          newSubitemName: { type: ["string", "null"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reason: { type: "string" },
        },
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
    summary: {
      type: "object",
      additionalProperties: false,
      required: ["matchedCount", "newCandidateCount", "reviewCount"],
      properties: {
        matchedCount: { type: "number" },
        newCandidateCount: { type: "number" },
        reviewCount: { type: "number" },
      },
    },
  },
};

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body || "{}");

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function compactRows(rows) {
  return (Array.isArray(rows) ? rows : []).slice(0, 50).map((row) => ({
    rowIndex: Number(row.rowIndex),
    category: row.category ?? "",
    item_name: row.item_name ?? "",
    spec: row.spec ?? "",
    unit: row.unit ?? "",
    quantity: row.quantity ?? "",
    unit_price: row.unit_price ?? "",
    labor_rate: row.labor_rate ?? "",
    labor_count: row.labor_count ?? "",
    original_amount: row.original_amount ?? "",
    memo: row.memo ?? "",
    rowType: row.rowType ?? "",
    action: row.action ?? "",
    matchedCategoryId: row.matchedCategoryId ?? "",
    matchedCategoryName: row.matchedCategoryName ?? "",
    matchedSubitemId: row.matchedSubitemId ?? "",
    matchedSubitemName: row.matchedSubitemName ?? "",
  })).filter((row) => Number.isFinite(row.rowIndex));
}

function compactCategories(categories) {
  return (Array.isArray(categories) ? categories : []).map((category) => ({
    id: String(category.id ?? ""),
    name: String(category.name ?? ""),
  })).filter((category) => category.id && category.name);
}

function compactSubitems(subitems) {
  return (Array.isArray(subitems) ? subitems : []).map((subitem) => ({
    id: String(subitem.id ?? ""),
    name: String(subitem.name ?? ""),
    categoryId: String(subitem.categoryId ?? subitem.item_id ?? ""),
    categoryName: String(subitem.categoryName ?? ""),
    unit: String(subitem.unit ?? ""),
  })).filter((subitem) => subitem.id && subitem.name);
}

function normalizeSafetyText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[(){}\[\]₩원]/g, "")
    .trim();
}

function getSafetyText(row) {
  return [
    row?.category,
    row?.item_name,
    row?.spec,
    row?.memo,
    row?.original_amount,
  ].map((value) => String(value ?? "")).join(" ");
}

function includesAnyKeyword(text, keywords) {
  const normalizedText = normalizeSafetyText(text);
  return keywords.some((keyword) => normalizedText.includes(normalizeSafetyText(keyword)));
}

function hasBundleSeparator(text) {
  const source = String(text ?? "");
  return BUNDLE_SEPARATORS.some((separator) => source.includes(separator));
}

function isOneUnitBundleRow(row) {
  const unit = normalizeSafetyText(row?.unit);
  if (unit !== "식") return false;

  const itemName = String(row?.item_name ?? "");
  const category = String(row?.category ?? "");
  const combined = `${category} ${itemName}`;
  const hasBundleSignal =
    hasBundleSeparator(combined) ||
    includesAnyKeyword(combined, BUNDLE_SIGNAL_KEYWORDS) ||
    combined.split(/\s+/).filter(Boolean).length >= 4;

  if (!hasBundleSignal) return false;

  const simpleKnownWork = ["도배", "장판"].some((keyword) => normalizeSafetyText(combined) === normalizeSafetyText(keyword));
  return !simpleKnownWork;
}

function getReviewNotes(row) {
  const text = getSafetyText(row);
  const notes = REVIEW_SIGNAL_GROUPS
    .filter((group) => includesAnyKeyword(text, group.keywords))
    .map((group) => group.note);
  if (isOneUnitBundleRow(row)) {
    notes.push("1식 묶음 공사일 수 있어 기존 단가표 반영 전 확인이 필요합니다.");
  }

  return Array.from(new Set(notes));
}

function extractOutputText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  const parts = [];
  for (const output of data?.output ?? []) {
    for (const content of output?.content ?? []) {
      if (typeof content?.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function sanitizeRecommendations(rawResult, rows, categories, subitems) {
  const rowIndexes = new Set(rows.map((row) => row.rowIndex));
  const rowsByIndex = new Map(rows.map((row) => [row.rowIndex, row]));
  const categoryIds = new Set(categories.map((category) => category.id));
  const subitemsById = new Map(subitems.map((subitem) => [subitem.id, subitem]));

  const recommendations = (Array.isArray(rawResult?.recommendations) ? rawResult.recommendations : [])
    .filter((recommendation) => rowIndexes.has(Number(recommendation?.rowIndex)))
    .map((recommendation) => {
      const next = {
        rowIndex: Number(recommendation.rowIndex),
        recommendedRowType: ALLOWED_ROW_TYPES.has(recommendation.recommendedRowType) ? recommendation.recommendedRowType : "needs_review",
        recommendedAction: ALLOWED_ACTIONS.has(recommendation.recommendedAction) ? recommendation.recommendedAction : "needs_review",
        recommendedCategoryId: recommendation.recommendedCategoryId || null,
        recommendedCategoryName: recommendation.recommendedCategoryName || null,
        recommendedSubitemId: recommendation.recommendedSubitemId || null,
        recommendedSubitemName: recommendation.recommendedSubitemName || null,
        newCategoryName: recommendation.newCategoryName || null,
        newSubitemName: recommendation.newSubitemName || null,
        confidence: Number.isFinite(Number(recommendation.confidence))
          ? Math.min(1, Math.max(0, Number(recommendation.confidence)))
          : 0,
        reason: String(recommendation.reason || "AI 추천 결과를 확인해주세요."),
        reviewNotes: getReviewNotes(rowsByIndex.get(Number(recommendation.rowIndex))),
      };

      if (next.recommendedCategoryId && !categoryIds.has(next.recommendedCategoryId)) {
        next.recommendedCategoryId = null;
      }

      if (next.recommendedSubitemId && !subitemsById.has(next.recommendedSubitemId)) {
        next.recommendedSubitemId = null;
      }

      if (next.recommendedSubitemId) {
        const subitem = subitemsById.get(next.recommendedSubitemId);
        if (!next.recommendedCategoryId) {
          next.recommendedCategoryId = subitem.categoryId || null;
          next.recommendedCategoryName = subitem.categoryName || next.recommendedCategoryName;
        }
      }

      if (next.recommendedAction === "link_existing" && (!next.recommendedCategoryId || !next.recommendedSubitemId)) {
        next.recommendedAction = "needs_review";
        next.recommendedRowType = "needs_review";
        next.confidence = Math.min(next.confidence, 0.5);
        next.reason = `${next.reason} 유효한 기존 항목 ID가 없어 검토 필요로 전환했습니다.`;
        next.reviewNotes = [...(next.reviewNotes ?? []), "유효한 기존 항목 ID가 없어 검토 필요로 전환했습니다."];
      }

      return next;
    });

  return {
    recommendations,
    warnings: (Array.isArray(rawResult?.warnings) ? rawResult.warnings : []).map(String).filter(Boolean),
    summary: {
      matchedCount: recommendations.filter((row) => row.recommendedAction === "link_existing").length,
      newCandidateCount: recommendations.filter((row) => row.recommendedAction === "add_new_item").length,
      reviewCount: recommendations.filter((row) => row.recommendedAction === "needs_review").length,
    },
  };
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "POST 요청만 지원합니다." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 500, { error: "OPENAI_API_KEY 서버 환경변수가 설정되어 있지 않습니다." });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const rows = compactRows(body.rows);
    const existingCategories = compactCategories(body.existingCategories);
    const existingSubitems = compactSubitems(body.existingSubitems);

    if (rows.length === 0) {
      sendJson(response, 400, { error: "분석할 표준 필드 행이 없습니다." });
      return;
    }

    const userPayload = {
      rows,
      currentMappings: body.currentMappings ?? [],
      existingCategories,
      existingSubitems,
      condition: body.condition ?? null,
    };

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: [
                  "You recommend review-only mappings for FORMATE, a Korean interior estimate tool.",
                  "Use only the supplied category and subitem IDs. Never invent IDs.",
                  "If a row is uncertain, choose needs_review with a short Korean reason.",
                  "Recommendations are not saved to DB; they only help the user review matching.",
                  "",
                  "Classify rowType conservatively:",
                  "- work_item: a real, single construction work item such as wallpaper, flooring, tile, electrical, carpentry, demolition, window/sash, painting. If multiple trades are bundled in one row, prefer needs_review.",
                  "- cost_item: 공과잡비, 부대비, 현장관리비, 운반비, 폐기물 처리비, 기타 잡비, or costs calculated as a percentage of net construction cost.",
                  "- margin_item: 기업마진, 마진, 이윤, 수수료, or margin-like percentage rows.",
                  "- tax_item: 부가세, VAT, 세금, 세액, 공급가액/부가세 rows.",
                  "- subtotal_row: 소계, 공사비계, 순공사비계, 손공사비계, section subtotal rows.",
                  "- total_row: 청구계, 총계, 합계, 최종 견적금액, final billing/payment amount rows.",
                  "- needs_review: unit is 식 and item/category bundles multiple works with comma, slash, 포함, 전체, 인건비, 교체, 철거, or is ambiguous to connect to one existing subitem.",
                  "- ignored: empty rows, title rows, document info such as customer name, address, date.",
                  "",
                  "Choose recommendedAction conservatively:",
                  "- link_existing only when one existing FORMATE subitem clearly has the same meaning. Be cautious with unit 식 bundled rows.",
                  "- add_new_item only for a clear single work item missing from FORMATE. Never use it for cost, margin, tax, subtotal, or total rows.",
                  "- cost_candidate for cost_item, margin_item, and tax_item.",
                  "- validation_only for subtotal_row and total_row.",
                  "- ignore for ignored rows.",
                  "- needs_review for ambiguous or bundled construction rows.",
                  "",
                  "The Korean examples above are not absolute rules. Always judge with category, item_name, unit, quantity, amount, nearby row meaning, and current mappings together.",
                  "The same word can mean different row types depending on context. If confidence is low, choose needs_review.",
                ].join("\n"),
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(userPayload),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "formate_excel_import_recommendations",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
    });

    const responseData = await openAiResponse.json().catch(() => null);
    if (!openAiResponse.ok) {
      sendJson(response, openAiResponse.status, {
        error: responseData?.error?.message || "OpenAI API 호출에 실패했습니다.",
      });
      return;
    }

    const outputText = extractOutputText(responseData);
    if (!outputText) {
      sendJson(response, 502, { error: "OpenAI 응답에서 JSON 결과를 찾지 못했습니다." });
      return;
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(outputText);
    } catch (error) {
      sendJson(response, 502, { error: "OpenAI 응답 JSON을 해석하지 못했습니다." });
      return;
    }

    sendJson(response, 200, {
      ...sanitizeRecommendations(parsedResult, rows, existingCategories, existingSubitems),
      model: OPENAI_MODEL,
    });
  } catch (error) {
    console.error("[FORMATE AI analyze excel import]", error);
    sendJson(response, 500, { error: error?.message || "AI 매칭 추천 중 문제가 발생했습니다." });
  }
};
