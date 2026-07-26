export const CUSTOMER_OPERATIONS_PAGES = {
  REQUESTS: "incoming-requests",
  CUSTOMERS_PROJECTS: "customers-sites",
  AFTERCARE_SERVICE: "after-service",
  MESSAGES: "message-history",
};

export const REQUEST_TYPE = {
  inquiry: { label: "일반 문의", tone: "info" },
  estimate_revision: { label: "견적 수정", tone: "warning" },
  change_request: { label: "변경 요청", tone: "warning" },
  approval: { label: "승인", tone: "success" },
  aftercare: { label: "사후관리", tone: "info" },
  service: { label: "A/S 요청", tone: "danger" },
  other: { label: "기타", tone: "muted" },
};

export const REQUEST_STATUS = {
  received: { label: "접수", tone: "info" },
  reviewing: { label: "처리 중", tone: "warning" },
  pricing: { label: "금액 확인 중", tone: "warning" },
  awaiting_customer_approval: { label: "고객 승인 대기", tone: "warning" },
  approved: { label: "승인", tone: "success" },
  rejected: { label: "반려·종료", tone: "danger" },
  closed: { label: "완료", tone: "success" },
};

export const ESTIMATE_VERSION_STATUS = {
  draft: { label: "작성 중", tone: "muted" },
  sent: { label: "발송", tone: "info" },
  viewed: { label: "열람", tone: "info" },
  revision_requested: { label: "수정 요청", tone: "warning" },
  approved: { label: "승인", tone: "success" },
  expired: { label: "만료", tone: "muted" },
  cancelled: { label: "취소", tone: "danger" },
};

export const CONTRACT_STATUS = {
  not_started: { label: "계약 전", tone: "muted" },
  reviewing: { label: "계약 검토", tone: "warning" },
  signed: { label: "계약 완료", tone: "success" },
  cancelled: { label: "계약 취소", tone: "danger" },
};

export const CONSTRUCTION_STATUS = {
  not_started: { label: "착공 전", tone: "muted" },
  scheduled: { label: "시공 예정", tone: "info" },
  in_progress: { label: "공사 중", tone: "warning" },
  paused: { label: "공사 중단", tone: "danger" },
  completed: { label: "공사 완료", tone: "success" },
  cancelled: { label: "공사 취소", tone: "danger" },
};

export const AFTERCARE_STATUS = {
  not_started: { label: "미등록", tone: "muted" },
  scheduled: { label: "예정", tone: "info" },
  active: { label: "진행 중", tone: "success" },
  paused: { label: "일시 중지", tone: "warning" },
  completed: { label: "완료", tone: "muted" },
  cancelled: { label: "취소", tone: "danger" },
};

export const SERVICE_REQUEST_STATUS = {
  not_started: { label: "요청 없음", tone: "muted" },
  received: { label: "접수", tone: "info" },
  contacted: { label: "연락 완료", tone: "info" },
  visit_scheduled: { label: "방문 예정", tone: "warning" },
  in_progress: { label: "처리 중", tone: "warning" },
  resolved: { label: "처리 완료", tone: "success" },
  closed: { label: "종료", tone: "muted" },
};

export const SERVICE_URGENCY = {
  low: { label: "낮음", tone: "muted" },
  normal: { label: "보통", tone: "info" },
  high: { label: "높음", tone: "warning" },
  urgent: { label: "긴급", tone: "danger" },
};

export const MESSAGE_TYPE = {
  estimate_link: { label: "견적 링크", tone: "info" },
  request_reply: { label: "요청 답변", tone: "info" },
  schedule_notice: { label: "일정 안내", tone: "warning" },
  aftercare: { label: "사후관리", tone: "success" },
  service_update: { label: "A/S 안내", tone: "warning" },
  manual: { label: "수동 기록", tone: "muted" },
  other: { label: "기타", tone: "muted" },
};

export const MESSAGE_CHANNEL = {
  sms: { label: "문자", tone: "info" },
  kakao: { label: "카카오", tone: "warning" },
  email: { label: "이메일", tone: "info" },
  phone: { label: "전화", tone: "muted" },
  manual: { label: "수동", tone: "muted" },
  link_copy: { label: "링크 복사", tone: "muted" },
};

export const MESSAGE_STATUS = {
  draft: { label: "작성 중", tone: "muted" },
  queued: { label: "발송 대기", tone: "warning" },
  sent: { label: "발송", tone: "info" },
  delivered: { label: "전달", tone: "success" },
  clicked: { label: "클릭", tone: "success" },
  responded: { label: "응답", tone: "success" },
  failed: { label: "실패", tone: "danger" },
  cancelled: { label: "취소", tone: "danger" },
};

export const TIMELINE_EVENT_TYPE = {
  customer_created: { label: "고객 등록", tone: "muted" },
  project_created: { label: "현장 등록", tone: "muted" },
  estimate_created: { label: "견적 작성", tone: "info" },
  estimate_sent: { label: "견적 발송", tone: "info" },
  estimate_viewed: { label: "견적 열람", tone: "info" },
  request_received: { label: "요청 접수", tone: "warning" },
  request_updated: { label: "요청 변경", tone: "warning" },
  change_order_created: { label: "변경공사 등록", tone: "warning" },
  change_order_approved: { label: "변경공사 승인", tone: "success" },
  construction_updated: { label: "공사 상태 변경", tone: "info" },
  message_created: { label: "메시지 기록", tone: "muted" },
  aftercare_scheduled: { label: "사후관리 예약", tone: "success" },
  service_requested: { label: "A/S 접수", tone: "danger" },
  service_updated: { label: "A/S 변경", tone: "warning" },
  note: { label: "메모", tone: "muted" },
};

export const CUSTOMER_DETAIL_TABS = [
  { key: "overview", label: "개요" },
  { key: "estimates", label: "견적서" },
  { key: "requests", label: "문의·변경 요청" },
  { key: "construction", label: "공사 진행" },
  { key: "change-orders", label: "변경공사" },
  { key: "settlement", label: "입금·정산" },
  { key: "aftercare", label: "사후관리·A/S" },
  { key: "messages", label: "메시지 이력" },
  { key: "photos-notes", label: "사진·메모" },
  { key: "timeline", label: "타임라인" },
];
