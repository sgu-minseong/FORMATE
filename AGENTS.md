# FORMATE Agent Handoff

이 문서는 Codex, Claude Code, Cursor 등 다른 개발 에이전트가 이 프로젝트를 이어받기 위한 공통 인수인계 문서입니다. 새 에이전트는 작업을 시작하기 전에 반드시 이 파일과 `TODO.md`, `CHANGELOG_WORKLOG.md`를 읽어야 합니다.

## 1. 서비스 개요

FORMATE는 인테리어 업체가 상담 현장에서 빠르게 견적을 만들고, 조건별 단가 템플릿을 관리하고, 저장된 견적서를 다시 확인할 수 있게 하는 B2B 견적 관리 프로토타입입니다.

핵심 사용자는 인테리어 시공업체 또는 상담 담당자입니다. 이 사용자는 고객 상담 중 평수, 신축/구축, 확장 여부, 빈집/살림집 같은 조건을 선택하고, 업체가 미리 등록해 둔 시공 항목과 소재별 단가를 바탕으로 견적 금액을 빠르게 조합해야 합니다.

현재 제품의 중심 가치는 다음입니다.

- 상담 자리에서 평수와 공사 조건을 선택하면 조건별 템플릿을 불러와 견적을 바로 만들 수 있다.
- 업체가 관리자 화면에서 시공 항목, 소재, 단가, 수량, 인건비 기준을 직접 관리할 수 있다.
- 견적 작성 중 수량, 단가, 인원, 인건비를 현장 상황에 맞게 수정할 수 있다.
- 추가금/할인, 내부 현장 메모, 고객용 표시 여부를 분리해서 관리할 수 있다.
- 완성된 견적서를 Supabase에 저장하고 PDF로 다운로드할 수 있다.

## 2. 현재 기술 스택

- 프론트엔드: React + Vite
- 언어: JavaScript, JSX
- 라우팅: 정식 라우터 없음. `src/App.jsx`의 `page` state로 화면을 전환함.
- DB/백엔드: Supabase JavaScript client
- PDF 생성: `html2canvas` + `jspdf`
- 아이콘: `lucide-react`
- 스타일링: `src/styles/tokens.css`의 디자인 토큰 + `src/App.jsx` 하단의 큰 `styles` 문자열
- 패키지 매니저: npm

실행 명령:

```bash
npm install
npm run dev
npm run build
npm run preview
```

환경 변수:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`.env.example`에 위 두 값이 비어 있는 템플릿으로 들어 있습니다. 실제 로컬 실행에서 Supabase 기능을 쓰려면 `.env`에 값을 넣어야 합니다.

## 3. 중요한 파일

- `src/App.jsx`: 현재 대부분의 앱 로직, 화면, 상태 관리, Supabase CRUD, 견적 계산, PDF 다운로드, CSS 문자열이 들어 있는 중심 파일입니다.
- `src/main.jsx`: React 앱 엔트리. `src/styles/tokens.css`를 import합니다.
- `src/components/PriceText.jsx`: 원화/수량 숫자 표시용 컴포넌트입니다. 숫자 폰트와 단위를 분리해서 렌더링합니다.
- `src/lib/supabaseClient.js`: Supabase client 생성. 환경 변수가 없을 때도 앱이 크래시하지 않도록 placeholder client와 `isSupabaseConfigured`를 export합니다.
- `src/styles/tokens.css`: 컬러, 타이포, spacing, radius, shadow 등 디자인 토큰입니다.
- `src/assets/logo.svg`: FORMATE 로고 SVG입니다.
- `index.html`: Pretendard, SUIT 웹폰트를 로드하고 문서 제목을 `FORMATE`로 설정합니다.
- `supabase/schema.sql`: Supabase 기본 테이블, 마이그레이션성 alter, trigger, grant가 들어 있습니다.
- `supabase/seed.sql`: 데모 회사와 샘플 견적 데이터를 넣는 seed 파일입니다.
- `FORMATE 서비스 소개서.docx`, `서비스 데모 페이지.docx`, `서비스 데모 페이지.pdf`: 서비스 기획/데모 관련 참고 자료로 보입니다. 코드 작업 전에 필요하면 열람하되, 우선 현재 앱 상태는 코드와 이 문서를 기준으로 파악하세요.

## 4. 현재 구현된 화면 흐름

### 랜딩

`page === "landing"`에서 렌더링됩니다.

- FORMATE 브랜드와 “상담 자리에서 바로 만드는 인테리어 견적” 메시지
- 오른쪽에 견적서 카드 형태의 정적 preview UI
- 주요 CTA:
  - 신규 견적서 만들기: `condition` 화면으로 이동
  - 견적 항목/단가 관리: `admin` 화면으로 이동
- 보조 CTA:
  - 상담/공사 일정: 현재 `ready` 준비중 화면
  - CS/사후관리: 현재 `ready` 준비중 화면

### 공사 조건 입력

`page === "condition"`에서 3단계 wizard로 렌더링됩니다.

1. 평수 선택
   - 1~90평 옵션
   - 즐겨찾는 평수 기능 있음
   - 즐겨찾기는 `localStorage`의 `formate.favoritePyeong`에 저장
2. 신축/구축 조건
   - 신축
   - 구축
   - 구축이면 확장 없음/확장 있음 선택
   - 확장 있음이면 거실, 주방, 작은방, 안방, 베란다, 현관, 다용도실 다중 선택
3. 빈집/살림집 선택

마지막 단계에서 `fetchEstimateCatalog()`를 호출해 Supabase에서 시공 항목과 조건별 템플릿을 불러오고, 성공하면 `items` 화면으로 이동합니다.

### 견적 항목 선택 및 편집

`page === "items"`에서 렌더링됩니다.

- 왼쪽: 시공 항목 목록, 조건 chip, 견적 기준 평수, 총액, 이전 버튼
- 오른쪽: 선택된 시공 항목의 소재/단일 항목 목록
- 각 행에서 다음 값을 직접 편집할 수 있습니다.
  - 수량
  - 단가
  - 인원
  - 인건비
  - 장판류의 경우 두께
- 장판 두께 옵션은 `1.8T`부터 `4.5T`까지 0.1 단위로 자동 생성합니다.
- 행을 펼친 뒤 선택 버튼을 눌러 견적에 포함합니다.
- 선택한 항목 summary가 하단에 정리됩니다.
- 추가금/할인 입력:
  - 라벨
  - 추가금/할인 구분
  - 금액
  - 고객용 표시 여부
  - 내부 메모
- 현장 메모 입력:
  - 고객용 견적서에는 표시하지 않는 내부 메모 의도로 구현되어 있습니다.
- “견적서 미리보기”로 `preview` 화면 이동

### 견적서 미리보기, 저장, PDF

`page === "preview"`에서 렌더링됩니다.

- 주소와 시공 예정일 입력
- 공사 조건, 조건 평수, 견적 기준 평수 표시
- 선택 항목 표:
  - 시공 항목
  - 소재
  - 수량
  - 인원
  - 가격
  - 인건비
  - 합계
- 추가금/할인 및 최종 견적 금액 표시
- 고객용 표시가 켜진 추가금/할인은 별도 표로 표시
- “견적서 저장”:
  - `estimates` 테이블에 insert
  - `condition_snapshot`에 조건 정보를 저장
  - `items_data`에 선택 항목, 추가금/할인, 현장 메모, 합계 데이터를 저장
- “PDF 다운로드”:
  - `previewPdfRef` 영역을 `html2canvas`로 캡처
  - `jspdf`로 A4 PDF 생성
  - 파일명은 `견적서_{주소}_{날짜}.pdf`

### 관리자 홈

`page === "admin"`에서 렌더링됩니다.

- 시공항목 및 단가 관리
- 세부견적 관리
- 견적서 관리

### 시공항목 및 단가 관리

`page === "admin-items"`에서 렌더링됩니다.

주요 목적은 업체가 조건별 단가 템플릿을 만드는 것입니다.

- 관리 기준 선택:
  - 평수
  - 신축/구축
  - 구축이면 확장 없음/확장 있음
- 저장된 템플릿 목록 표시
- 항목 추가
- 시공 항목 즐겨찾기
- 시공 항목명 수정
- 항목 삭제
- drag & drop 순서 변경
- 소재 추가
- 소재명 수정
- 소재 삭제
- 소재 순서 변경
- 단위 선택:
  - 평
  - ㎡
  - 미터
  - 개소
  - 식
- 조건별 값 입력:
  - 단가
  - 인건비
  - 수량
  - 인원
- 단일 항목과 소재형 항목 구분:
  - `item_type === "flat"`이면 항목 자체가 하나의 견적 row처럼 동작
  - `item_type === "itemized"`이면 하위 소재들을 관리
- 기본 항목 자동 생성:
  - 도배, 장판은 소재형
  - 몰딩, 페인트, 조명은 단일 항목
- flat 항목은 하위 subitem이 1개만 유지되도록 보정합니다.
- 장판 항목은 하위 소재명을 바탕으로 1.8~4.5 두께 subitem을 자동 생성합니다.

중요: 현재 앱은 `admin_condition_templates`, `admin_condition_template_values` 테이블을 사용하지만, 현재 `supabase/schema.sql`에는 이 두 테이블 정의가 없습니다. 이 상태에서 실제 Supabase에 새 schema를 적용하면 관리자 템플릿 저장/불러오기와 신규 견적 템플릿 로딩이 실패할 가능성이 큽니다. 이 문서 작성 시점의 가장 중요한 DB TODO입니다.

### 세부견적 관리

`page === "admin-detail-costs"`에서 렌더링됩니다.

- 소재별 내부 비용을 관리합니다.
- `detail_cost_categories` 테이블 사용
- 고객용 견적서에는 표시하지 않는 비용이라는 설명이 UI에 있습니다.
- 추가/수정/삭제 가능
- 카테고리 타입:
  - `basic`: 기본에 포함
  - `full`: 전체에만 포함

현재 이 세부 비용은 관리 화면에서 CRUD만 가능하고, 견적 계산에는 아직 반영되지 않습니다.

### 견적서 관리

`page === "admin-estimates"`에서 렌더링됩니다.

- `estimates` 테이블에서 저장된 견적서 목록 조회
- 주소 검색은 `ilike("address", "%keyword%")`
- 카드에서 총액, 주소, 시공 예정일, 생성일 표시
- 견적서보기 modal:
  - 저장된 `items_data.items`를 표로 표시
  - 저장된 `items_data.adjustments` 표시
  - 저장된 `items_data.siteMemo` 표시
- 사진보기는 현재 `alert("사진 기능은 준비 중입니다.")`

## 5. 데이터 모델 요약

현재 `supabase/schema.sql`에 있는 주요 테이블:

- `companies`
  - 업체 기본 정보
  - 현재 demo company id는 `00000000-0000-4000-8000-000000000001`
- `construction_items`
  - 시공 항목
  - `item_type`: `itemized` 또는 `flat`
  - `is_favorite`, `sort_order` 보유
- `construction_subitems`
  - 시공 항목 하위 소재 또는 flat 항목의 단일 row
  - `unit`, `unit_price`, `labor_rate`, `sort_order`
  - 현재 앱에서는 단가/인건비의 조건별 값을 template value 테이블에 저장하려는 방향입니다.
- `subitem_pyeong_values`
  - 평수별 수량/인원 값을 저장하려던 이전 구조로 보입니다.
  - 현재 `App.jsx`의 최신 관리자 저장 흐름은 이 테이블보다 `admin_condition_template_values`를 사용합니다.
- `detail_cost_categories`
  - 소재별 내부 비용
- `price_conditions`
  - 조건 저장용 테이블입니다.
  - 현재 견적 저장 시 `condition_id`는 `null`이고 `condition_snapshot`만 저장합니다.
- `estimates`
  - 저장된 견적서
  - `condition_snapshot`, `items_data`, `total_amount` 포함

앱이 사용하지만 schema에 없는 테이블:

- `admin_condition_templates`
  - 예상 컬럼: `id`, `company_id`, `pyeong`, `build_type`, `has_extension`, timestamp
  - 예상 unique: `company_id,pyeong,build_type,has_extension`
- `admin_condition_template_values`
  - 예상 컬럼: `id`, `template_id`, `item_id`, `subitem_id`, `option_value`, `quantity`, `labor_count`, `unit_price`, `labor_rate`, timestamp
  - 예상 unique: `template_id,subitem_id,option_value`

이 두 테이블을 추가하는 것이 다음 개발의 최우선입니다.

## 6. 현재 변경 상태

마지막 커밋:

```text
a638004 Initial Supabase setup
```

현재 워킹트리에는 커밋되지 않은 변경사항이 있습니다. 다른 에이전트는 절대 임의로 `git reset --hard`, `git checkout -- .` 같은 되돌리기를 하면 안 됩니다.

확인된 변경 요약:

- `index.html`
  - title을 `FORMATE`로 변경
  - Pretendard, SUIT 웹폰트 추가
- `package.json`, `package-lock.json`
  - `html2canvas`, `jspdf` 추가
- `src/main.jsx`
  - `src/styles/tokens.css` import 추가
- `src/lib/supabaseClient.js`
  - `isSupabaseConfigured` 추가
  - 환경 변수가 없을 때 placeholder client 사용
- `src/App.jsx`
  - 대규모 기능 확장
  - 랜딩, 조건 wizard, 견적 편집, 관리자, 세부비용, 견적서 관리, PDF 다운로드 구현
- `src/components/PriceText.jsx`
  - 새 숫자 표시 컴포넌트
- `src/styles/tokens.css`
  - 새 디자인 토큰 파일
- `src/assets/logo.svg`
  - 새 FORMATE 로고
- `supabase/schema.sql`
  - item type, labor rate, condition snapshot, detail cost timestamps 등 확장
  - 기존 DB 정규화용 alter block 추가
- `supabase/seed.sql`
  - demo company와 sample estimates 추가
- `FORMATE 서비스 소개서.docx`, `formate_logo_concept.png`, `src/assets/`, `src/components/`, `src/styles/`, `supabase/seed.sql` 등이 untracked로 보입니다.
- 임시 Office 파일로 보이는 `~$...docx`, `~WRL1226.tmp` 삭제 상태가 있습니다. 사용자가 만든 파일일 수 있으므로 임의 복구/삭제 판단을 하지 마세요.

## 7. 디자인 방향

현재 UI는 B2B 운영 도구에 가까운 차분한 톤입니다.

디자인 토큰:

- 주요 배경: `#FAFAFA`, `#FFFFFF`, `#F3F4F6`
- 주요 텍스트: `#1A1A2E`
- 보조 텍스트: `#5B5F72`
- 브랜드 컬러: `#2B3568`
- 브랜드 보조 라인: `#8890C0`
- 카드 radius: 8px
- 버튼 radius: 6px
- 폰트: Pretendard, 숫자는 SUIT 우선

디자인 유지 원칙:

- SaaS/CRM 같은 업무용 밀도를 유지합니다.
- 과한 hero marketing 레이아웃보다 실제 견적 작성 화면의 사용성을 우선합니다.
- 숫자와 금액은 `PriceText`를 우선 사용합니다.
- lucide-react 아이콘을 기존 방식처럼 버튼에 사용합니다.
- 카드 안에 카드를 과하게 중첩하지 않습니다.
- 긴 텍스트와 금액은 모바일에서 줄바꿈/축약이 어색하지 않도록 확인합니다.
- dominant purple/blue gradient 같은 장식적 배경은 피합니다.
- 현재 앱은 single-file CSS 문자열이 많으므로, 큰 리팩터링 없이 작은 수정을 할 때는 기존 class와 token을 재사용하세요.

## 8. 코드 구조와 주의점

현재 `App.jsx`는 5천 줄이 넘는 단일 파일입니다. 빠르게 기능을 만든 프로토타입 구조라서 응집도가 낮습니다. 다음 작업자는 큰 리팩터링보다 다음 순서를 권장합니다.

1. DB schema 누락을 먼저 해결합니다.
2. 앱이 실제 Supabase와 end-to-end로 동작하는지 확인합니다.
3. 작게 컴포넌트를 분리합니다.
4. 라우팅과 상태 관리를 정리합니다.

특히 주의할 점:

- `pageFromHash()`는 `landing`, `condition`, `admin`, `admin-items`만 허용합니다. `admin-detail-costs`, `admin-estimates`, `items`, `preview` 등은 직접 hash 진입이 안 됩니다.
- `setPage()`는 hash를 업데이트하지 않습니다. 현재는 client state 전환입니다.
- `condition.powderRoom`, `condition.dressRoom` 상태가 남아 있지만 현재 UI에서는 신축 조건에서 사용하지 않습니다. 이전 설계의 흔적으로 보입니다.
- `dummySavedData`, `categories`는 초기 mock 흐름의 흔적입니다. 최신 견적 흐름은 Supabase catalog를 우선 사용합니다.
- `subitem_pyeong_values`를 보정하는 함수가 일부 남아 있지만 최신 저장 흐름은 `admin_condition_template_values`를 사용합니다.
- `detail_cost_categories`는 현재 견적 계산에 반영되지 않습니다.
- Supabase RLS는 schema에서 disable되고 anon/authenticated에 광범위한 CRUD grant가 있습니다. 프로토타입용입니다. 실제 서비스 전에는 인증/권한 설계를 다시 해야 합니다.
- `admin_password_hash`는 있지만 현재 로그인/인증 UI는 없습니다.

## 9. 검증 상태

이 문서 작성 직전에 실행한 검증:

```bash
npm run build
```

결과:

- 빌드 성공
- Vite chunk size warning 있음
- `jspdf` 등으로 인해 큰 chunk가 생겼습니다. 기능상 실패는 아니지만 추후 dynamic import/code splitting 후보입니다.

검증하지 못했거나 남은 검증:

- 실제 Supabase 연결 후 관리자 템플릿 저장/불러오기
- 신규 견적 생성부터 저장까지 end-to-end
- PDF 다운로드의 실제 브라우저 동작
- 모바일 화면 캡처
- DB schema를 새 Supabase 프로젝트에 적용했을 때의 전체 성공 여부

## 10. 다음 에이전트 작업 시작 절차

새 에이전트는 다음 순서로 시작하세요.

1. `AGENTS.md`, `TODO.md`, `CHANGELOG_WORKLOG.md`를 읽습니다.
2. `git status --short`로 현재 변경 상태를 확인합니다.
3. `package.json`, `src/App.jsx`, `supabase/schema.sql`를 확인합니다.
4. `npm run build`를 실행해 현재 baseline을 잡습니다.
5. Supabase 관련 작업이라면 `.env` 존재 여부와 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정 여부를 확인합니다.
6. 가장 먼저 `admin_condition_templates`, `admin_condition_template_values` schema 누락을 해결합니다.
7. 변경 후 `npm run build`를 다시 실행합니다.

## 11. 절대 하지 말아야 할 것

- 사용자가 요청하지 않았는데 워킹트리 변경을 되돌리지 마세요.
- `git reset --hard`, `git checkout -- .`를 사용하지 마세요.
- 대규모 리팩터링으로 화면과 DB 작업을 동시에 뒤섞지 마세요.
- 현재 앱이 사용하는 한글 라벨과 서비스 방향을 영어 SaaS 템플릿처럼 바꾸지 마세요.
- Supabase schema 변경 없이 관리자 단가 템플릿 UI만 수정해서 완료했다고 판단하지 마세요.
- build만 성공했다고 실제 DB 기능이 동작한다고 가정하지 마세요.

## 12. 추천 개발 우선순위

1. Supabase schema에 관리자 조건 템플릿 테이블 추가
2. 실제 Supabase에서 관리자 템플릿 저장/불러오기 검증
3. 신규 견적 생성 -> 항목 선택 -> preview -> 저장 -> 견적서 관리 화면에서 확인하는 전체 플로우 검증
4. PDF 다운로드 검증
5. `App.jsx`에서 최소 단위 컴포넌트 분리
6. 직접 URL 진입을 위한 라우팅 또는 hash sync 정리
7. 인증/권한 모델 설계
8. 세부견적 비용을 견적 계산이나 내부 margin 분석에 연결할지 제품 결정을 내림

