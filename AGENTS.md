# FORMATE Agent Handoff

이 문서는 새 Codex, ChatGPT, Claude Code, Cursor 대화가 FORMATE의 기획과 개발을 안전하게 이어받기 위한 최신 기준 문서입니다.

최종 갱신일: 2026-07-28  
현재 구조 리팩터링 브랜치: `refactor/feature-boundaries`  
현재 구조 리팩터링 기준선: `25038e5 fix(price-table): preserve prices by flooring variant`  
구조 리팩터링 실행 계획: `FORMATE_REFACTORING_PLAN.md`

브랜치와 커밋은 작업 시작 시 실제 Git 상태를 우선합니다.

## 0. 이 문서의 우선순위

작업을 시작하기 전에 다음 순서로 확인합니다.

1. 이 `AGENTS.md`
2. 현재 사용자 요청
3. `git status --short --branch`
4. 관련 실제 코드와 Supabase SQL
5. `TODO.md`, `CHANGELOG_WORKLOG.md`

`TODO.md`와 `CHANGELOG_WORKLOG.md`는 2026-07-06 기준의 과거 기록이며 한글 인코딩도 일부 깨져 있습니다. 특히 아래 내용은 이미 오래된 정보이므로 그대로 작업하지 않습니다.

- `admin_condition_templates`, `admin_condition_template_values`가 스키마에 없다는 설명
- 고정 `COMPANY_ID`를 사용한다는 설명
- Supabase RLS가 꺼져 있다는 설명
- 마지막 커밋이 `a638004`라는 설명
- 업체 코드와 비밀번호를 프런트에서 평문 비교한다는 설명

충돌할 경우 이 문서와 현재 코드를 우선합니다. 그래도 불명확하면 컬럼명, 상태값, RPC signature를 추측하지 말고 실제 SQL과 호출부를 확인합니다.

## 1. 제품의 현재 정의

FORMATE는 인테리어 업체가 자기 조건별 단가표를 저장하고, 들어온 고객 문의를 견적과 현장 업무로 빠르게 전환하는 B2B 운영 도구입니다.

핵심 문장:

> 우리 업체 단가표로 빠르게 만드는 인테리어 견적서

현재 제품의 중심 흐름은 다음과 같습니다.

1. 업체 계정 로그인
2. 업체별 조건부 단가표 관리
3. 조건을 선택해 견적 초안 생성
4. 견적 편집, 미리보기, 저장, PDF 다운로드
5. 고객 공유 링크 발급
6. 고객 요청 수신과 처리
7. 고객·현장 단위로 견적, 요청, 공사, 정산, 사후관리 관계 확인
8. 요청과 현장의 완료·취소 처리
9. 견적 또는 현장을 휴지통으로 이동하고 복원

고객·현장 화면은 현장 전체 관계를 확인하는 Single Source of Truth입니다. 받은 요청은 요청을 실제 처리하는 업무함입니다. 두 화면의 역할을 다시 섞지 않습니다.

## 2. 현재 작업 상태

### 2.1 커밋된 기능

최근 커밋은 다음 순서로 lifecycle 기반을 완성했습니다.

```text
aa3921b feat: apply estimate and project lifecycle filters across operations
c900972 Add project trash and restore workflow
b01ba38 Add request and project lifecycle actions
db77b5b Replace estimate archive flow with trash workflow
c1f2469 Add operations lifecycle foundation
864d88b Merge customer operations UI overhaul
```

완료된 1~5단계:

1. 견적·요청·현장 lifecycle DB 컬럼과 RPC
2. 저장 견적의 일반 목록·휴지통·삭제·복원
3. 받은 요청 처리 상태와 현장 완료·취소·다시 진행
4. 현장 전체 휴지통 영향 조회·이동·복원
5. 홈과 운영 화면, 저장 견적, 고객 포털에 lifecycle 조회 정책 적용

`supabase/operations_lifecycle_foundation.sql`은 현재 Supabase에 적용된 상태라는 사용자 확인을 기준으로 합니다. SQL을 다시 작성하거나 실행하기 전에 실제 배포 상태와 사용자 지시를 재확인합니다.

### 2.2 현재 구조 리팩터링

현재 브랜치:

- `refactor/feature-boundaries`

완료:

- 안전 기준선과 전체 구조 분석
- Vitest 도입
- 바닥재 규격·두께별 단가·인건비 독립 저장 수정
- `priceTableModel`과 회귀 테스트
- 기준 커밋 `25038e5`

남은 작업은 `FORMATE_REFACTORING_PLAN.md`의 첫 번째 `PENDING` Phase부터 수행합니다.

이번 Goal은 기존 UI·동작·DB 계약을 유지하는 구조 분리입니다. 다음은 구현하지 않습니다.

- 견적 미리보기 스크롤·PDF 동작 개선
- 상담·계약 상태 흐름 변경
- AI Excel 업로드/내보내기 통합
- 계약서 작성·출력
- 새 UI 레퍼런스 적용

## 3. 기술 스택

- 프런트엔드: React + Vite
- 언어: JavaScript, JSX
- 라우팅: React Router 없이 `src/App.jsx`의 `page` state와 hash allowlist 사용
- DB/Auth: Supabase JavaScript client
- PDF: `html2canvas`, `jspdf`
- Excel: `xlsx`
- 아이콘: `lucide-react`
- 스타일: 직접 작성한 CSS + `src/styles/tokens.css`의 CSS 변수
- 폰트: Pretendard Variable, 숫자 표시에는 SUIT도 사용
- 패키지 매니저: npm

주요 명령:

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run test:watch
git diff --check
```

환경 변수:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

프런트엔드에 Supabase service role key를 넣지 않습니다.

## 4. 인증과 회사 범위

### 4.1 현재 로그인

현재는 실제 Supabase Auth를 사용합니다.

- 사용자가 입력한 업체 코드를 내부 이메일 형태로 변환합니다.
- 변환 형식은 `company-${base64url(companyCode)}@formate.local` 계열입니다.
- `supabase.auth.signInWithPassword({ email, password })`로 로그인합니다.
- 세션 복원 시 `auth.getSession()`과 `auth.getUser()`를 사용합니다.
- 로그인 사용자의 `company_members.user_id`를 조회해 현재 회사를 결정합니다.
- 회사 기본 정보는 `companies`에서 읽습니다.

`companies.admin_password_hash` 컬럼과 과거 seed 값이 남아 있을 수 있지만, 현재 로그인과 관리자 재인증은 이 값을 프런트에서 평문 비교하는 방식이 아닙니다.

### 4.2 브라우저 저장 키

```text
localStorage:
- formate.selectedCompanyId
- formate.selectedCompanyName
- formate.selectedCompanyCode

sessionStorage:
- formate.adminVerifiedCompanyId
```

회사 변경 시 Supabase Auth에서 sign out하고 위 업체 정보와 관리자 인증 상태를 정리합니다.

### 4.3 관리자 재인증

관리 화면은 로그인 직후 자동으로 열지 않습니다.

- 현재 Supabase Auth 비밀번호를 다시 확인합니다.
- 성공한 관리자 확인은 같은 브라우저 sessionStorage 안에서만 유지합니다.
- 보호 대상에는 단가표, 템플릿, 세부 비용, AI 초기 세팅 등의 관리자 화면이 포함됩니다.

### 4.4 멀티테넌시 보안 원칙

모든 핵심 조회와 변경은 현재 `companyId`를 사용합니다.

- demo company UUID를 fallback으로 하드코딩하지 않습니다.
- 프런트에서 전달한 `company_id`만 믿지 않습니다.
- RLS 또는 RPC 내부에서 `auth.uid()`와 `company_members` 소속을 재검증합니다.
- 다른 회사 row의 수량도 노출하면 안 됩니다.
- SECURITY DEFINER 함수는 고정 `search_path`와 명시적 실행 권한을 사용합니다.
- service role을 브라우저에 노출하지 않습니다.

## 5. 화면과 정보구조

### 5.1 현재 Sidebar

현재 미커밋 정보구조 개편 기준:

```text
홈
- 홈

업무
- 받은 요청
- 사후관리·A/S

견적·현장
- 새 견적서 작성
- 저장 견적 보기
- 고객·현장

관리
- 사진 관리/확인
- 단가표 관리
- 견적 템플릿 만들기
- 세부 비용 관리
- AI 초기 세팅
```

`메시지 이력`은 독립 사용자 메뉴가 아닙니다. `customer_messages`, `timeline_events`, `notifications`와 관련 API는 운영 데이터로 계속 유지됩니다.

Sidebar의 다크 그린 브랜드, account footer, 독립 스크롤 구조는 유지합니다.

### 5.2 주요 page key

라우팅은 `src/App.jsx`의 state 기반입니다. 실제 상수는 `src/features/customerOperations/constants.js`를 확인합니다.

대표 page:

- `landing`: 홈
- `condition`: 새 견적 조건
- `items`: 견적 편집
- `preview`: 견적 미리보기
- `admin-estimates`: 저장 견적
- `incoming-requests`: 받은 요청
- `customers-sites`: 고객·현장
- `after-service`: 사후관리·A/S
- `photo-management`: 사진 관리
- `admin`: 관리자 홈
- `admin-prices`, `admin-items`, `admin-condition-labels`: 단가표·템플릿 관련 관리
- `admin-detail-costs`: 세부 비용
- `admin-ai-setup`: AI 초기 세팅

고객 포털은 `/c/:token` 형태의 직접 경로를 사용합니다.

`#message-history`는 더 이상 독립 화면을 렌더링하지 않고 고객·현장 화면으로 전환합니다.

## 6. 핵심 기능

### 6.1 홈

`HomeOperationsOverview.jsx`는 다음 네 영역을 구성합니다.

- 오늘 처리할 일
- 진행 중 현장
- 최근 견적
- 최근 활동

lifecycle 필터:

- 완료·반려 요청은 오늘 처리할 일에서 제외
- 완료·취소·휴지통 현장은 진행 중 현장에서 제외
- 개별 휴지통 견적과 휴지통 현장의 견적은 최근 견적에서 제외
- 휴지통 현장에 연결된 활동은 제외
- count와 실제 목록이 같은 필터를 사용해야 함

### 6.2 받은 요청

`CustomerRequestsPage.jsx`가 요청 처리 전용 업무함입니다.

탭:

- 처리 필요
- 처리 중
- 완료

상태별 동작:

- 접수: 반려·종료, 처리 시작
- 처리 중: 처리 보류, 처리 완료
- 완료: 처리 다시 열기
- 반려·종료: 다시 열기

사용 RPC:

```text
update_customer_request_status(
  p_company_id,
  p_request_id,
  p_next_status,
  p_closed_reason
)
```

상태 변경 후 전체 reload 없이 목록, 수량, 선택 state를 즉시 갱신합니다. 요청 완료가 현장 완료를 자동으로 유발하면 안 됩니다.

휴지통 현장에 연결된 요청은 일반 받은 요청 화면에서 숨기고, 현장 복원 후 원래 요청 상태 탭에 다시 표시합니다.

### 6.3 고객·현장

`CustomersProjectsPage.jsx`는 현장의 기준 정보와 연결 관계를 확인하는 화면입니다.

현재 미커밋 개편 기준 구조:

- 좌측: 검색·상태 필터가 적용된 현장 목록
- 우측: 선택 현장 header와 상세
- 탭: 개요, 견적, 요청, 공사, 정산, 사후관리
- `···`: 고객·현장 정보, 활동 기록, 완료·취소·다시 진행, 휴지통·복원

목록 원칙:

- 현장명이 있으면 제목으로 사용하고 없으면 주소를 fallback으로 사용
- 정규화한 현장명과 주소가 같으면 주소를 반복 표시하지 않음
- 고객명, 현장 상태, 최근 업데이트, 미처리 요청 수만 필요한 밀도로 표시
- 견적번호와 전화번호는 목록에서 표시하지 않음

상세 원칙:

- header에서 주소와 전화번호를 반복 표시하지 않음
- 정적 고객·현장 속성은 정보 drawer에서 확인
- 활동은 activity drawer에서 확인
- 요청 상태 변경은 하지 않고 받은 요청 화면으로 이동
- 휴지통 현장은 읽기 전용

### 6.4 현장 lifecycle

사용 RPC:

```text
update_project_status(
  p_company_id,
  p_project_id,
  p_next_status
)
```

지원 동작:

- 진행 중 → 완료
- 진행 중 → 취소
- 완료 → 다시 진행
- 취소 → 다시 진행

연결된 견적, 요청, 메시지, 활동 row는 유지합니다.

### 6.5 현장 휴지통

사용 RPC:

```text
get_project_trash_impact(p_company_id, p_project_id)
move_project_to_trash(p_company_id, p_project_id)
restore_project_from_trash(p_company_id, p_project_id)
```

핵심 정책:

- `projects` 한 row의 `deleted_at`, `deleted_by`만 변경
- estimates, requests, messages, timeline, customer row를 물리 삭제하지 않음
- 하위 row의 `deleted_at`을 일괄 변경하지 않음
- 연결된 활성 견적 공유 token은 비활성화
- 복원 시 원래 project status와 하위 row 상태 유지
- 과거 공유 token 자동 활성화 금지
- 개별 휴지통 견적 자동 복원 금지

### 6.6 저장 견적

저장 견적은 다음 두 탭을 사용합니다.

- 저장 견적: `estimate.deleted_at is null`
- 휴지통: `estimate.deleted_at is not null`, 최근 삭제순

일반 행 동작:

- 보기
- 견적서 확인
- 복사
- 삭제

삭제는 고객 발송 여부와 무관하게 휴지통 이동이 가능하고, 비밀번호 재인증이나 hard delete/archive 분기를 사용하지 않습니다.

사용 RPC:

```text
move_saved_estimate_to_trash(p_company_id, p_estimate_id)
restore_saved_estimate_from_trash(p_company_id, p_estimate_id)
```

핵심 정책:

- estimate row와 `items_data` 유지
- 고객 요청, 메시지, timeline, change order, 고객·현장 row 유지
- 활성 공유 token 비활성화
- 복원 시 token 자동 활성화 금지
- 복사와 이어서 작성 대상에서는 개별 휴지통 견적과 휴지통 현장의 견적 제외
- 현장 때문에 숨겨진 정상 견적은 견적 휴지통 탭에 넣지 않음

### 6.7 견적 작성과 PDF

견적 작성 흐름:

1. 평수
2. 신축·구축과 확장 조건
3. 빈집·살림집
4. 현재 업체 조건별 단가표 조회
5. 항목 포함 여부와 세부 값 편집
6. 미리보기
7. 저장 또는 PDF 다운로드

체크박스는 견적 포함 여부만 담당하고, 펼침 화살표는 세부 편집의 열기·닫기만 담당합니다. 펼침 상태가 금액 포함 여부를 바꾸면 안 됩니다.

저장 데이터:

- `condition_snapshot`: 선택 조건 snapshot
- `items_data`: 견적 항목, 추가금·할인, 내부 현장 메모, 합계
- `items_data.estimateMeta`: 고객명, 연락처, 부가세, 작성일, 유효기간, 견적번호 등
- `total_amount`: 최종 금액

PDF 파일명:

```text
견적서_{업체명}_{고객명또는주소}_{작성일}.pdf
```

견적 계산 공식, `items_data` 구조, PDF는 lifecycle 또는 정보구조 작업에서 변경하지 않습니다.

### 6.8 조건별 단가표와 관리자

실제 `supabase/schema.sql`에는 다음 테이블이 이미 있습니다.

- `admin_condition_templates`
- `admin_condition_template_values`

unique constraint, index, timestamp, RLS 관련 정의도 실제 스키마에 있으므로 “누락된 테이블을 새로 추가”하는 과거 TODO를 실행하지 않습니다.

관리 기능:

- 조건별 단가표
- 시공 대분류와 세부 소재
- flat/itemized 항목
- 수량, 단가, 인원, 인건비
- 즐겨찾기, 검색, 접기·펼치기
- 세부 비용
- AI Excel 초기 세팅

기본 카탈로그는 시공 항목과 세부항목 구조를 준비하지만 업체의 단가와 인건비를 임의 생성하지 않습니다.

`detail_cost_categories`는 관리 CRUD가 존재하지만 견적 계산이나 마진 분석에 자동 반영한다고 가정하지 않습니다.

### 6.9 사진 관리

사진 관리 화면과 관련 Supabase 테이블·storage 흐름이 존재합니다. 새 작업 전 `supabase/photo_management.sql`과 실제 App 호출부를 확인합니다.

사진, PDF, 견적 계산은 고객·현장 정보구조 개편의 부수 작업으로 수정하지 않습니다.

### 6.10 고객 포털

관련 파일:

- `src/features/customerPortal/customerPortalApi.js`
- `src/features/customerPortal/CustomerPortalPage.jsx`
- `src/features/customerPortal/customerPortalUtils.js`

고객 링크는 token으로 견적을 조회하고 고객 요청 또는 승인을 기록합니다.

접근 차단:

- estimate가 휴지통
- 연결 project가 휴지통
- token이 revoked, inactive 또는 expired

차단 문구:

> 삭제되었거나 더 이상 사용할 수 없는 견적 링크입니다.

정상 링크의 견적 열람, 고객 요청, 승인 흐름을 유지합니다. 고객 포털 UI는 별도 요청 없이 재설계하지 않습니다.

### 6.11 사후관리·A/S

조회 화면과 데이터 테이블은 존재하지만 이번 정보구조 1단계에서 새로운 사후관리·A/S 생성 기능은 만들지 않았습니다.

관련 데이터:

- `aftercare_schedules`
- `service_requests`
- `service_request_updates`

가짜 CTA, 빈 dialog, 임시 데이터를 만들지 않습니다. 실제 생성 기능은 별도 제품 결정과 요청이 있을 때 구현합니다.

## 7. 실제 lifecycle 상태

상태 문자열을 새로 만들지 말고 실제 SQL과 constants/utils를 사용합니다.

### 7.1 customer_requests

실제 상태:

```text
received
reviewing
pricing
awaiting_customer_approval
approved
rejected
closed
```

UI 논리 매핑:

- 접수: `received`
- 처리 중: `reviewing`, `pricing`, `awaiting_customer_approval`
- 완료: `approved`, `closed`
- 반려·종료: `rejected`

RPC가 논리 상태명을 실제 값으로 변환하는 부분과 프런트 helper가 있으므로 임의 문자열을 추가하지 않습니다.

### 7.2 projects

현장 lifecycle UI는 실제 `construction_status` 구조를 사용합니다.

```text
not_started
scheduled
in_progress
paused
completed
cancelled
```

프런트 lifecycle 동작은 주로 `in_progress`, `completed`, `cancelled`을 사용하고, 기존 진행 중 계열은 helper로 묶습니다.

프로젝트의 별도 상태:

```text
estimate_status:
draft, sent, viewed, revision_requested, approved, expired, cancelled

contract_status:
not_started, reviewing, signed, cancelled

aftercare_status:
not_started, scheduled, active, paused, completed, cancelled
```

### 7.3 기타 상태

```text
estimate_versions.status:
draft, sent, viewed, revision_requested, approved, expired, cancelled

customer_access_tokens.status:
active, revoked, expired

service_requests.status:
not_started, received, contacted, visit_scheduled,
in_progress, resolved, closed

change_orders.status:
draft, awaiting_approval, approved, rejected, completed, cancelled
```

같은 의미라도 테이블별 상태값이 다릅니다. request, project, construction, estimate 상태를 서로 바꾸어 쓰지 않습니다.

## 8. soft delete와 복원 불변식

### estimates

```text
deleted_at timestamptz
deleted_by uuid
delete_reason text
```

과거 `archived_at`, `archived_by`는 migration 호환을 위해 유지됩니다. 새 UI 기준은 `deleted_at`입니다.

### projects

```text
deleted_at timestamptz
deleted_by uuid
completed_at timestamptz
completed_by uuid
cancelled_at timestamptz
cancelled_by uuid
```

### customer_requests

완료 관련 컬럼과 `closed_reason`은 기존 값을 보존합니다. 재오픈 시 RPC가 완료 metadata를 정리합니다.

### 절대 불변식

- 견적 휴지통은 estimate row를 삭제하지 않음
- 현장 휴지통은 project row만 soft delete
- 고객 row를 삭제하지 않음
- 요청, 메시지, 활동, 변경공사 row를 물리 삭제하지 않음
- 현장 복원 시 하위 row를 새 상태로 덮어쓰지 않음
- 개별 휴지통 견적은 현장 복원 후에도 휴지통 유지
- 비활성화된 공유 token은 자동 복구하지 않음

## 9. lifecycle 공통 조회 정책

공통 helper는 `src/features/customerOperations/utils.js`를 먼저 확인합니다.

대표 helper:

- `isDeletedProject`
- `isDeletedEstimate`
- `isActiveProjectStatus`
- `isProjectLinkedRowVisible`
- `isOperationalEstimate`
- 요청의 논리 상태 판정 helper

일반 운영 화면:

- `project.deleted_at is null`
- estimate를 보여줄 때 `estimate.deleted_at is null`
- 연결 project가 있으면 그 project도 휴지통이 아니어야 함

휴지통 화면:

- 견적 휴지통은 estimate 자체의 `deleted_at is not null`만 표시
- 현장 휴지통은 project 자체의 `deleted_at is not null`만 표시

복원:

- 현장 복원 후 하위 요청·메시지·활동은 원래 상태대로 다시 보임
- estimate 자체가 개별 휴지통이면 계속 숨김

문구 검색으로 시스템 기록을 숨기지 않습니다. `event_type`, `message_type`, `channel`, `related_type`, `related_id`, FK처럼 구조화된 필드를 사용합니다. 구조상 구분할 수 없으면 임의로 삭제하거나 숨기지 않습니다.

## 10. Supabase 구조와 SQL

### 10.1 주요 SQL

- `supabase/schema.sql`: 회사, 단가표, 견적 등 기본 스키마
- `supabase/customer_operations.sql`: 고객·현장·요청·메시지·활동 등 운영 구조
- `supabase/customer_portal.sql`: 고객 token 포털과 관련 함수
- `supabase/operations_lifecycle_foundation.sql`: 완료·취소·휴지통 기반과 RPC
- `supabase/photo_management.sql`: 사진 관리
- `supabase/operator_demo_company.sql`: Auth 사용자와 회사 소속 준비
- `supabase/delete_saved_estimate.sql`: 과거 저장 견적 삭제 흐름
- `supabase/estimate_archive_policy.sql`: 과거 archive 정책

과거 SQL 파일이 남아 있어도 현재 프런트는 lifecycle foundation의 trash RPC를 사용합니다. 기존 SQL 파일을 삭제하거나 현재 정책으로 오인하지 않습니다.

### 10.2 주요 테이블

회사와 단가표:

- `companies`
- `company_members`
- `construction_items`
- `construction_subitems`
- `admin_condition_templates`
- `admin_condition_template_values`
- `detail_cost_categories`
- `price_conditions`

견적:

- `estimates`
- `estimate_versions`
- `customer_access_tokens`

고객 운영:

- `customers`
- `projects`
- `customer_requests`
- `customer_messages`
- `timeline_events`
- `notifications`
- `change_orders`
- `change_order_items`
- `aftercare_schedules`
- `service_requests`
- `service_request_updates`

### 10.3 lifecycle RPC

```text
move_saved_estimate_to_trash(uuid, uuid)
restore_saved_estimate_from_trash(uuid, uuid)
update_customer_request_status(uuid, uuid, text, text)
update_project_status(uuid, uuid, text)
get_project_trash_impact(uuid, uuid)
move_project_to_trash(uuid, uuid)
restore_project_from_trash(uuid, uuid)
```

정확한 default argument, 반환형, 상태 변환은 SQL 본문을 확인합니다. signature를 기억에 의존해 수정하지 않습니다.

### 10.4 SQL 작업 원칙

- 사용자가 명시적으로 요청하지 않으면 schema나 RPC를 변경하지 않음
- 실제 적용 여부를 확인하지 않고 SQL을 실행하지 않음
- 이미 있는 컬럼, constraint, policy, index를 중복 생성하지 않음
- 실행 SQL은 가능한 범위에서 idempotent하게 작성
- `SECURITY DEFINER`는 `search_path` 고정
- public/anon 실행 권한과 authenticated grant를 명시적으로 검토
- 기존 정상 데이터와 legacy archive 값을 파괴하지 않음

## 11. 중요한 프런트엔드 파일

앱과 레이아웃:

- `src/App.jsx`: 인증, page state, 주요 화면, 견적 로직, 큰 CSS 문자열
- `src/components/layout/AppShell.jsx`: 공통 앱 shell과 Sidebar 렌더링
- `src/styles/tokens.css`: 디자인 토큰
- `src/lib/supabaseClient.js`: Supabase client

고객 운영:

- `src/features/customerOperations/HomeOperationsOverview.jsx`
- `src/features/customerOperations/CustomerRequestsPage.jsx`
- `src/features/customerOperations/CustomersProjectsPage.jsx`
- `src/features/customerOperations/AftercareServicePage.jsx`
- `src/features/customerOperations/MessagesPage.jsx`
- `src/features/customerOperations/api.js`
- `src/features/customerOperations/constants.js`
- `src/features/customerOperations/utils.js`
- `src/features/customerOperations/components.jsx`
- `src/features/customerOperations/customerOperations.css`
- `src/features/customerOperations/ProjectStatusConfirmDialog.jsx`
- `src/features/customerOperations/ProjectTrashDialog.jsx`
- `src/features/customerOperations/ShareEstimateModal.jsx`

저장 견적:

- `src/features/estimates/api.js`
- `src/features/estimates/DeleteSavedEstimateDialog.jsx`

고객 포털:

- `src/features/customerPortal/customerPortalApi.js`
- `src/features/customerPortal/CustomerPortalPage.jsx`
- `src/features/customerPortal/customerPortalUtils.js`

현재 `MessagesPage.jsx`는 독립 navigation에서 제거됐지만 데이터 구조나 향후 drawer 재사용 가능성 때문에 삭제하지 않았습니다. 참조 여부를 다시 확인하지 않고 제거하지 않습니다.

## 12. 디자인 시스템과 UX 원칙

현재 UI는 React + 직접 작성한 CSS + CSS 변수 기반입니다.

반드시 유지:

- `src/styles/tokens.css`의 기존 토큰
- Pretendard Variable
- lucide-react 아이콘
- 다크 그린 Sidebar와 FORMATE 브랜드
- 기존 light/dark custom scrollbar
- 기존 semantic status color
- focus-visible과 dialog/drawer Escape 닫기

사용하지 않음:

- Tailwind
- shadcn/ui
- Radix UI
- MUI
- Chakra
- Ant Design

새 UI 라이브러리를 설치하지 않습니다.

정보구조 원칙:

- 한 화면은 한 가지 질문에 답함
- 목록은 대상을 식별할 정보만 표시
- header는 현재 선택 대상과 상태만 표시
- 상세 속성은 drawer 등 필요할 때 확인
- 같은 정보는 같은 화면에서 한 번만 표시
- card 안에 card를 반복하지 않음
- 색과 장식보다 타이포그래피, 간격, 정렬로 위계를 표현
- 가짜 기능, 빈 dialog, placeholder action을 만들지 않음
- danger action은 큰 빨간 filled 버튼 대신 메뉴의 danger text 사용

## 13. 반드시 보존할 기능

- Supabase Auth 로그인과 회사 소속 확인
- 회사별 `company_id` 격리
- 관리자 재인증
- 조건별 단가표 저장·조회
- 신규 견적 생성과 편집
- 견적 저장, 복사, 이어서 작성
- PDF 다운로드
- 저장 견적 휴지통과 복원
- 요청 lifecycle
- 현장 완료·취소·다시 진행
- 현장 휴지통 영향 조회·이동·복원
- 고객 포털
- 홈 lifecycle 필터
- 고객·현장 검색, 필터, 선택
- 고객 연락처 복사
- 현장 정보와 활동 drawer
- 사진 관리
- 기존 견적 계산과 `items_data`
- custom scrollbar와 AppShell account footer

## 14. 알려진 한계와 다음 판단

### 14.1 승인된 구조 리팩터링

사용자는 `FORMATE_REFACTORING_PLAN.md`에 정의된 Feature 경계 리팩터링을 승인했습니다.

목표 계층:

```text
UI/Page
→ Controller
→ Domain/Model
→ Feature API
→ Supabase/RPC
```

이번 Goal에서는:

- 기존 UI, className, CSS, 문구 유지
- 기존 계산, snapshot, PDF, 상태, RPC 유지
- DB schema·SQL·운영 데이터 변경 금지
- Phase별 test/build 통과 후 전용 커밋
- 중단 조건 발생 시 임의 결정 금지

`사용자가 요청하지 않은 대규모 리팩터링 금지` 원칙은 유지하되,
현재 `FORMATE_REFACTORING_PLAN.md` 범위는 사용자가 승인한 예외입니다.
계획 문서 밖으로 범위를 확장하지 않습니다.

### 구조

- `src/App.jsx`가 여전히 매우 크고 많은 화면·상태·CSS를 포함합니다.
- 정식 router 없이 `page` state와 hash allowlist를 사용합니다.
- feature 파일로 일부 분리됐지만 대규모 구조 개선은 아직 필요합니다.
- 한 번에 라우팅, DB, 디자인을 모두 바꾸는 대규모 리팩터링은 피합니다.

### 제품

- 받은 요청 lifecycle은 구현됐지만 정보구조와 시각 구조의 전면 개편은 다음 단계 후보입니다.
- 사후관리·A/S 조회 기반은 있으나 새 일정이나 A/S 생성 UX는 아직 제품 결정이 필요합니다.
- 정산 탭은 실제 데이터가 있는 범위만 보여주며 가짜 정산 입력을 만들지 않습니다.
- 세부 비용을 견적 계산, 원가, 마진에 연결할지는 아직 별도 결정 사항입니다.

### 데이터와 운영

- `TODO.md`와 `CHANGELOG_WORKLOG.md`는 최신 상태로 갱신되지 않았습니다.
- 실제 Supabase end-to-end 검증은 로컬 환경 변수와 배포 DB 상태가 필요합니다.
- build 성공이 DB 함수, RLS, token 동작까지 보장하지 않습니다.

### 성능

- Vite build에서 큰 chunk 경고가 발생합니다.
- PDF, Excel 의존성의 영향이 있으나 현재 기능 실패는 아닙니다.
- 별도 요청 없이 동적 import나 code splitting을 큰 범위로 진행하지 않습니다.

## 15. 현재 우선순위

1. `FORMATE_REFACTORING_PLAN.md`의 첫 번째 `PENDING` Phase 수행
2. Phase별 characterization test 보강
3. Feature API·Controller·Page 경계 분리
4. App.jsx를 composition shell로 축소
5. 전체 자동 검증과 사용자 수동 검증 체크리스트 작성
6. 구조 리팩터링 완료 후 별도 요청으로 후속 제품 기능과 UI 개편 진행

기존 구조를 다시 분석하거나 새로운 전체 구조를 제안하지 않습니다.
중단 조건이 나오지 않는 한 Phase별 사용자 승인을 기다리지 않습니다.

## 16. 새 에이전트 작업 절차

1. `AGENTS.md`를 끝까지 읽음
2. `git status --short --branch` 확인
3. `git log --oneline -n 15` 확인
4. `git diff --stat`와 관련 파일 diff 확인
5. 요청과 관련된 실제 컴포넌트, API, SQL 확인
6. 필요하면 변경 전 `npm run build`로 baseline 확인
7. 사용자 변경을 보존하며 최소 범위로 수정
8. `npm run build`
9. `git diff --check`
10. `git status --short --branch`
11. `git diff --stat`
12. 수정 파일, 검증 결과, 브라우저 확인 항목 보고

사용자가 금지한 명령은 실행하지 않습니다.

기본적으로 사용자가 명시적으로 요청하지 않으면 `git add`, `git commit`, `git push`를 하지 않습니다.

예외:
사용자가 Goal mode에서 `FORMATE_REFACTORING_PLAN.md` 실행을 시작한 경우,
문서에 정의된 Phase 전용 `git add`와 `git commit`은 명시적으로 허용된 것으로 봅니다.

항상 금지:
- `git push`
- `git reset --hard`
- `git checkout -- .`
- 여러 Phase 변경을 한 커밋으로 합치기
- 예상하지 못한 사용자 변경을 포함해 커밋하기

## 17. 현재 브라우저 직접 확인 체크리스트

### Sidebar와 route

- 메뉴가 홈/업무/견적·현장/관리로 한 번씩만 표시되는지
- 독립 메시지 이력 메뉴가 없는지
- 과거 `#message-history` 접근이 빈 화면 없이 고객·현장으로 이동하는지
- Sidebar account footer와 scroll이 유지되는지

### 고객·현장

- 검색어로 고객명, 현장명, 주소, 견적번호를 찾을 수 있는지
- 전체/진행 중/완료/취소/휴지통 수량과 목록이 일치하는지
- 목록에서 같은 주소가 반복되지 않는지
- 긴 현장명과 주소가 레이아웃을 깨지 않는지
- 선택 현장 header에서 주소, 전화번호, 상태가 반복되지 않는지
- 고객·현장 정보 drawer가 열리고 Escape로 닫히는지
- 연락처 복사가 유지되는지
- 활동 기록 drawer가 event type 기준으로 업무 사건만 보여주는지
- 개요/견적/요청/공사/정산/사후관리 탭이 정상 전환되는지
- 요청 탭이 상태 변경 UI를 복제하지 않는지
- 받은 요청 이동이 정상인지
- 삭제된 견적이 견적 탭에 노출되지 않는지
- 완료·취소·다시 진행이 유지되는지
- 현장 휴지통 영향 dialog, 이동, 읽기 전용, 복원이 유지되는지

### lifecycle 회귀

- 요청 완료 후 처리 필요/처리 중 목록과 홈에서 제외되는지
- 완료·취소 현장이 홈 진행 중 현장에서 제외되는지
- 견적 휴지통 이동과 복원이 즉시 반영되는지
- 현장 휴지통 이동 후 하위 데이터가 일반 운영 화면에서 숨겨지는지
- 현장 복원 후 원래 상태의 요청·메시지·활동이 다시 보이는지
- 개별 휴지통 견적은 현장 복원 후에도 숨겨지는지
- 휴지통 처리된 견적 또는 현장의 고객 링크가 차단되는지
- 정상 고객 포털 링크는 그대로 동작하는지

### 반응형과 접근성

- 좁은 화면에서 검색과 필터가 겹치지 않는지
- master/detail 내부에 불필요한 이중 스크롤이 없는지
- tab의 active state와 `aria-selected`가 맞는지
- icon-only button에 `aria-label`이 있는지
- keyboard focus-visible이 보이는지

## 18. 절대 하지 말아야 할 것

- 사용자 요청 없이 DB schema나 Supabase SQL을 작성·실행하지 않음
- demo company id fallback을 다시 추가하지 않음
- 회사 범위 조건을 제거하지 않음
- Supabase service role key를 프런트에 노출하지 않음
- 사용자 워킹트리를 `git reset --hard`, `git checkout -- .` 등으로 되돌리지 않음
- 기존 견적, 요청, 메시지, timeline, 고객, 현장 row를 물리 삭제하지 않음
- token을 복원 시 자동 활성화하지 않음
- 견적 계산 공식, `items_data`, PDF를 관련 없는 작업에서 변경하지 않음
- 새 상태 문자열이나 DB 컬럼을 추측해서 추가하지 않음
- 새 UI 라이브러리나 상태관리 라이브러리를 설치하지 않음
- 가짜 메뉴, 빈 drawer, 동작하지 않는 CTA를 만들지 않음
- 독립 메시지 이력 화면을 다시 만들지 않음
- 받은 요청 처리 UI를 고객·현장 요청 탭에 중복 구현하지 않음
- 사용자가 승인한 `FORMATE_REFACTORING_PLAN.md` 범위 밖의 대규모 리팩터링을 하지 않음
- 구조 리팩터링 중 UI 재설계, 기능 추가, 제품 정책 변경을 함께 하지 않음
- Phase 검증 실패 상태에서 다음 Phase로 넘어가지 않음
- 테스트 assertion을 삭제·완화해 통과시키지 않음
- 계획 문서 상태를 사실과 다르게 DONE으로 표시하지 않음
- build만 보고 Supabase end-to-end 동작을 검증했다고 보고하지 않음

## 19. Goal 기반 장기 리팩터링 프로토콜

Goal 작업 순서:

1. `AGENTS.md`를 끝까지 읽음
2. `FORMATE_REFACTORING_PLAN.md`를 끝까지 읽음
3. branch, HEAD, working tree 확인
4. 첫 번째 `PENDING` Phase 선택
5. 기준 test/build 실행
6. characterization test 보강
7. Phase 내부 작업 수행
8. 중간마다 test/build
9. 완료 조건·중단 조건 확인
10. Phase 전용 commit
11. 계획 문서 상태 갱신
12. 다음 Phase 자동 진행

다음이면 Goal을 중단하고 보고합니다.

- SQL·migration·운영 데이터 변경 필요
- 저장 형식·계산·PDF·상태·RPC 변경 필요
- 제품 정책 결정 필요
- 기존 테스트를 유지하면서 분리 불가능
- 예상하지 못한 사용자 변경 발견
- 3회의 집중 보완 후에도 검증 실패

Goal은 목표를 유지하는 도구이며 계획 문서를 대체하지 않습니다.
세부 실행 기준은 `FORMATE_REFACTORING_PLAN.md`입니다.

## 20. 새 대화를 시작할 때 전달할 한 문장

> `AGENTS.md`와 `FORMATE_REFACTORING_PLAN.md`를 최신 기준으로 먼저 읽고, `refactor/feature-boundaries` 브랜치의 첫 번째 `PENDING` Phase부터 기존 UI·동작·DB 계약을 보존하며 실행해 주세요.
