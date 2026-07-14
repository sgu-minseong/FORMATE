export const AI_BASIC_FIELD_KEYS = ["category", "item_name", "spec", "unit", "quantity", "unit_price", "labor_rate", "labor_count"];
export const AI_EXCEL_FIELD_DEFINITIONS = [
  {
    key: "category",
    label: "대분류",
    type: "basic_field",
    aliases: ["공종", "구분", "대분류", "분류", "공사구분", "작업구분", "공정", "공사종류", "항목구분", "카테고리", "공사명", "공사항목", "공사분류", "공사", "품목", "구분명"],
  },
  {
    key: "item_name",
    label: "항목명",
    type: "basic_field",
    aliases: ["품명", "항목", "공사항목", "작업내용", "내역", "세부내역", "명칭", "자재명", "시공항목", "세부공사", "내용", "품목", "품목명", "품목/내역", "품목내역", "품목 및 내역", "내역/품목", "세부품목", "작업내역", "공사내역", "공사명 및 세부내역", "총괄내역", "상세내역", "시공내역"],
  },
  {
    key: "spec",
    label: "규격",
    type: "basic_field",
    aliases: ["규격", "사양", "적요", "상세", "상세내용", "설명", "모델명", "제품규격", "제품명", "제품", "브랜드", "모델", "옵션", "재질", "두께", "색상"],
  },
  {
    key: "unit",
    label: "단위",
    type: "basic_field",
    aliases: ["단위", "UNIT", "unit", "단위명", "UOM"],
  },
  {
    key: "quantity",
    label: "수량",
    type: "basic_field",
    aliases: ["수량", "물량", "면적", "길이", "개수", "EA", "ea", "QTY", "qty", "수"],
  },
  {
    key: "unit_price",
    label: "단가",
    type: "basic_field",
    aliases: ["단가", "자재단가", "재료단가", "공급단가", "시공단가", "품목단가", "자재비단가", "재료비단가"],
  },
  {
    key: "labor_rate",
    label: "인건비",
    type: "basic_field",
    aliases: ["인건비", "노무비", "공임", "시공비", "작업비", "인건비단가", "노무단가", "공임단가", "인건", "노무"],
  },
  {
    key: "labor_count",
    label: "인원",
    type: "basic_field",
    aliases: ["인원", "작업인원", "투입인원", "인부", "사람", "명", "공수", "품"],
  },
  {
    key: "expense_cost",
    label: "경비/기타비",
    type: "cost_field",
    aliases: ["경비", "잡비", "운반비", "양중비", "폐기물비", "폐기물처리비", "출장비", "기타비", "기타금액", "관리비", "일반관리비", "공과잡비"],
  },
  {
    key: "original_amount",
    label: "원본 금액",
    type: "validation_field",
    aliases: ["금액", "합계", "총액", "소계", "계", "견적가", "공급가", "공급가액", "총공사비", "공사금액", "합계금액", "합계 금액", "합계(₩)", "합계(원)", "금액(원)", "금액(₩)", "총금액", "총 금액", "견적금액", "견적 금액"],
  },
  {
    key: "tax",
    label: "세금",
    type: "summary_field",
    aliases: ["부가세", "VAT", "vat", "세액", "세금", "총합계"],
  },
  {
    key: "memo",
    label: "메모",
    type: "custom_field",
    aliases: ["비고", "메모", "특이사항", "참고", "요청사항", "위치", "시공위치", "장소", "공간", "방", "구역", "총괄내역", "상세내역", "특이 사항", "참고사항"],
  },
  {
    key: "document_info",
    label: "문서 정보",
    type: "document_info",
    aliases: ["고객명", "발주처", "현장명", "현장주소", "주소", "연락처", "견적일자", "작성일", "공사기간", "업체명", "담당자"],
  },
  {
    key: "ignored",
    label: "미사용",
    type: "ignored",
    aliases: ["No.", "NO.", "no.", "No", "NO", "번호", "순번", "연번", "#", "No"],
  },
];
export const AI_MAPPING_GROUPS = [
  { key: "basic_field", title: "기본 필드", description: "FORMATE 단가표와 템플릿으로 이어질 수 있는 핵심 열입니다." },
  { key: "custom_field", title: "추가필드 후보", description: "메모나 위치처럼 참고 정보로 사용할 수 있는 열입니다." },
  { key: "cost_field", title: "비용성 필드 후보", description: "경비나 기타비처럼 별도 비용 후보로 볼 수 있는 열입니다." },
  { key: "validation_field", title: "검산 필드", description: "원본 금액 검산에 활용할 수 있는 열입니다." },
  { key: "summary_field", title: "요약/세금 필드", description: "부가세나 총합계처럼 문서 요약 성격의 열입니다." },
  { key: "document_info", title: "문서 정보 필드", description: "고객, 현장, 작성일처럼 견적서 문서 정보에 가까운 열입니다." },
  { key: "ignored", title: "미사용/미인식 열", description: "이번 변환에서 쓰지 않거나 아직 판단하지 못한 열입니다." },
];
export const AI_MAPPING_SELECT_OPTIONS = [
  { value: "ignored", label: "미사용/무시", mappedKey: null, mappedLabel: "미사용", fieldType: "ignored" },
  ...AI_EXCEL_FIELD_DEFINITIONS.filter((definition) => definition.type !== "ignored").map((definition) => ({
    value: definition.key,
    label: definition.label,
    mappedKey: definition.key,
    mappedLabel: definition.label,
    fieldType: definition.type ?? "basic_field",
  })),
  { value: "custom_field", label: "추가필드", mappedKey: "custom_field", mappedLabel: "추가필드", fieldType: "custom_field" },
];
export const AI_DUPLICATE_WARNING_KEYS = ["category", "item_name", "spec", "unit", "quantity", "unit_price", "labor_rate", "labor_count", "original_amount"];
export const AI_ROW_TYPE_OPTIONS = [
  { value: "work_item", label: "공사항목" },
  { value: "cost_item", label: "비용항목" },
  { value: "margin_item", label: "마진/관리비" },
  { value: "tax_item", label: "세금" },
  { value: "subtotal_row", label: "소계" },
  { value: "total_row", label: "총합계" },
  { value: "ignored", label: "무시" },
  { value: "needs_review", label: "검토 필요" },
];
