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
