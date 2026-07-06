# FORMATE Worklog

## 현재 기준

작성일: 2026-07-06

마지막 커밋:

```text
a638004 Initial Supabase setup
```

이 커밋 이후 많은 변경사항이 아직 커밋되지 않은 상태입니다. 다른 에이전트는 현재 워킹트리를 사용자의 작업물로 보고 보존해야 합니다.

## 구현된 주요 변경

### 브랜드 및 기본 UI

- 서비스명을 FORMATE로 정리했습니다.
- `index.html` title을 `FORMATE`로 변경했습니다.
- Pretendard, SUIT 웹폰트를 로드하도록 했습니다.
- `src/assets/logo.svg`에 FORMATE 로고를 추가했습니다.
- `src/styles/tokens.css`에 디자인 토큰을 추가했습니다.
- `PriceText` 컴포넌트를 추가해 금액/수량 숫자 표현을 통일했습니다.

### 랜딩 및 사용자 흐름

- 랜딩 화면을 추가했습니다.
- 신규 견적서 만들기와 관리자 진입 CTA를 만들었습니다.
- 상담/공사 일정, CS/사후관리 메뉴는 준비중 상태로 연결했습니다.
- 조건 입력 wizard를 3단계로 정리했습니다.
  - 평수
  - 신축/구축 및 확장 여부
  - 빈집/살림집
- 즐겨찾는 평수 기능을 추가하고 localStorage에 저장하도록 했습니다.

### 견적 작성

- Supabase의 시공 항목/소재 catalog를 기반으로 견적 항목을 불러오도록 확장했습니다.
- 조건별 템플릿 값을 기반으로 수량, 단가, 인원, 인건비를 견적 row에 채웁니다.
- 견적 기준 평수를 별도로 수정하고 평 단위 수량에 적용할 수 있게 했습니다.
- row별 직접 수정 기능을 추가했습니다.
- 수정된 row에 “수정됨” 표시를 추가했습니다.
- 선택한 항목 summary를 만들었습니다.
- 추가금/할인 입력 기능을 추가했습니다.
- 고객용 표시 여부와 내부 메모를 분리했습니다.
- 현장 메모 입력을 추가했습니다.

### 견적서 저장 및 PDF

- 견적서 preview 화면을 만들었습니다.
- 주소와 시공 예정일을 입력할 수 있게 했습니다.
- `estimates` 테이블에 견적서를 저장하도록 구현했습니다.
- `condition_snapshot`과 구조화된 `items_data`를 저장합니다.
- `html2canvas`와 `jspdf`를 사용해 PDF 다운로드 기능을 추가했습니다.

### 관리자

- 관리자 홈을 만들었습니다.
- 시공항목 및 단가 관리 화면을 구현했습니다.
- 기본 시공 항목 자동 생성 로직을 추가했습니다.
  - 도배
  - 장판
  - 몰딩
  - 페인트
  - 조명
- 시공 항목 즐겨찾기, 이름 수정, 삭제, 순서 변경을 구현했습니다.
- 소재 추가, 이름 수정, 삭제, 순서 변경을 구현했습니다.
- 단일 항목(`flat`)과 소재형 항목(`itemized`)을 구분했습니다.
- flat 항목은 하위 subitem을 하나만 유지하도록 보정했습니다.
- 장판 항목은 1.8T~4.5T 두께별 subitem을 자동 생성하도록 했습니다.
- 조건별 관리자 템플릿 저장/불러오기 UI와 로직을 추가했습니다.

### 세부견적 관리

- 소재별 내부 비용 관리 화면을 구현했습니다.
- `detail_cost_categories` CRUD를 구현했습니다.
- `basic`, `full` 카테고리 타입을 선택할 수 있게 했습니다.

### 견적서 관리

- 저장된 견적서 목록 화면을 구현했습니다.
- 주소 검색을 구현했습니다.
- 견적서 상세 modal을 구현했습니다.
- 저장된 항목, 추가금/할인, 현장 메모를 볼 수 있게 했습니다.
- 사진보기 버튼은 아직 준비중 alert입니다.

### Supabase

- `src/lib/supabaseClient.js`에 `isSupabaseConfigured`를 추가했습니다.
- 환경 변수가 없어도 앱 로딩 자체는 깨지지 않도록 placeholder client를 사용했습니다.
- `supabase/schema.sql`에 다음 변경을 반영했습니다.
  - `construction_items.item_type`
  - `construction_subitems.labor_rate`
  - `subitem_pyeong_values`
  - `detail_cost_categories` timestamp
  - `estimates.condition_snapshot`
  - 기존 컬럼명 정리용 migration block
  - updated_at trigger
  - index/grant/RLS disable
- `supabase/seed.sql`에 demo company와 sample estimates를 추가했습니다.

## 발견된 중요한 문제

- `src/App.jsx`는 `admin_condition_templates`, `admin_condition_template_values` 테이블을 사용합니다.
- 현재 `supabase/schema.sql`에는 이 두 테이블 정의가 없습니다.
- 따라서 실제 Supabase DB에서 관리자 단가 템플릿 저장/불러오기, 신규 견적서 템플릿 로딩이 실패할 수 있습니다.
- 다음 작업자는 이 schema 누락을 가장 먼저 해결해야 합니다.

## 검증 기록

2026-07-06:

```bash
npm run build
```

결과:

- 성공
- Vite chunk size warning 발생
- 큰 chunk는 `jspdf`/PDF 관련 의존성 영향으로 보입니다.

## 다음 작업 권장

1. 누락된 관리자 조건 템플릿 테이블 schema 추가
2. 실제 Supabase에서 schema 적용
3. 관리자 템플릿 저장/불러오기 end-to-end 검증
4. 신규 견적 작성/저장/관리 화면 확인
5. PDF 다운로드 브라우저 검증
6. 이후 `App.jsx` 분리와 router 정리 진행

