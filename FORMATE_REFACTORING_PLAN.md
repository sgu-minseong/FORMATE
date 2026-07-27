# FORMATE 안전 리팩터링 계획

> 문서 목적: FORMATE의 대규모 리팩터링을 한 번에 진행하지 않고, 현재 기능과 데이터를 보호하면서 기능별 경계를 단계적으로 분리하기 위한 기준 문서  
> 적용 대상: React + Vite + Supabase 기반 FORMATE  
> 현재 기준 브랜치: `feature/post-deploy-ui-polish`

---

## 1. 왜 이 작업이 필요한가

현재 FORMATE의 `App.jsx`에는 다음 책임이 한 파일에 함께 들어 있다.

- 로그인 및 회사 세션
- 화면 전환과 AppShell
- 단가표 조회·수정·자동 저장
- 규격/두께 선택
- 견적 작성과 계산
- 견적 미리보기
- 견적 저장
- PDF 생성
- 사진 관리
- 세부 비용 관리
- AI Excel 초기 설정
- 많은 전역 CSS

이 구조에서는 UI만 수정하려고 해도 같은 파일 안의 저장 대상, 계산 규칙, 자동 저장 로직이 함께 영향을 받을 수 있다.

이번 바닥재 문제도 다음과 같은 결합 때문에 발생한 것으로 본다.

```text
규격 선택 UI
→ 가격 변경 handler
→ 실제 저장 대상 ID 결정
→ Supabase 저장
```

화면과 저장 로직이 가까이 붙어 있으므로, UI를 정리하는 과정에서 저장 대상까지 잘못 바뀔 수 있다.

---

## 2. 리팩터링의 최종 목표

FORMATE를 마이크로서비스로 전환하지 않는다.

현재 React + Supabase 구조는 유지하면서, 다음 형태의 **모듈형 모놀리스**로 정리한다.

```text
UI
↓
Controller / Feature State
↓
Domain Rules
↓
Feature API
↓
Supabase / RPC / DB
```

### 각 계층의 역할

#### UI

- 버튼, 입력창, 드롭다운, 표, 레이아웃, CSS
- 사용자 입력을 Controller에 전달
- Supabase 테이블명과 저장 payload를 알지 않음

#### Controller

- 선택 상태
- 편집 draft
- dirty 상태
- 자동 저장
- loading/error
- 화면 작업 순서

#### Domain

- 규격 정규화
- 실제 저장 대상 식별
- 단가 및 인건비 계산
- 견적 계산
- snapshot 생성·복원
- 상태 전환 규칙

React, DOM, Supabase에 의존하지 않는 순수 함수로 만든다.

#### Feature API

- Supabase 조회·저장
- RPC 호출
- DB payload 변환
- DB 오류를 Feature용 오류로 변환

#### Supabase / RPC / DB

- 실제 데이터 저장
- RLS
- unique constraint
- 중요한 상태 전환 검증
- 여러 테이블을 동시에 변경하는 작업의 원자성 보장

---

## 3. 절대 지켜야 할 원칙

### 3.1 UI 작업과 데이터 작업을 섞지 않는다

UI 전용 작업에서 수정 가능:

```text
feature UI component
feature CSS
shared UI component
design token
```

사용자 승인 없이 수정 금지:

```text
Supabase query
api/repository
domain 규칙
SQL
migration
RPC
저장 payload
DB 식별 키
상태 문자열
```

UI 구현 중 데이터 로직 수정이 필요해 보이면 작업자가 임의로 변경하지 않고 먼저 보고한다.

### 3.2 하드코딩을 추가하지 않는다

다음과 같은 임시 보완을 금지한다.

```text
1.8T, 2.2T, 3.0T만 별도 조건문으로 처리
특정 DB ID 직접 입력
특정 회사 ID 직접 입력
화면 문자열을 영속 저장 ID처럼 사용
```

규격이나 조건은 데이터와 공통 helper를 기준으로 처리한다.

### 3.3 App.jsx 전체를 한 번에 분해하지 않는다

한 번에 대량 이동하면 다음 위험이 있다.

- 기존 계산식 변경
- 저장 snapshot 변경
- 고객 포털 호환성 손상
- PDF 누락
- 자동 저장 회귀
- 기존 견적 복원 실패
- CSS 전역 영향

기능 하나씩 테스트를 추가하고 이동한다.

### 3.4 운영 DB를 임의로 변경하지 않는다

- migration 파일 작성과 실제 운영 DB 실행을 분리한다.
- SQL 실행 전 사용자에게 영향과 실행 순서를 보고한다.
- 기존 데이터 삭제·초기화 금지
- 과거 값을 임의 추정하여 채우지 않음

### 3.5 기존 인터페이스를 먼저 고정한다

리팩터링 중에는 다음을 임의로 변경하지 않는다.

- `items_data`
- `condition_snapshot`
- 견적 계산 공식
- 고객 포털 공유 RPC
- 기존 lifecycle RPC signature
- 실제 status 문자열
- RLS와 company membership 검증
- PDF 파일 내용과 페이지 분할 기준

---

## 4. 목표 폴더 구조

```text
src/
├─ app/
│  ├─ App.jsx
│  ├─ navigation.js
│  ├─ useAppSession.js
│  └─ authApi.js
│
├─ features/
│  ├─ priceTable/
│  │  ├─ PriceTablePage.jsx
│  │  ├─ usePriceTableController.js
│  │  ├─ priceTableApi.js
│  │  ├─ priceTableModel.js
│  │  ├─ specifications.js
│  │  ├─ components/
│  │  └─ tests/
│  │
│  ├─ estimates/
│  │  ├─ EstimateEditorPage.jsx
│  │  ├─ EstimatePreviewPage.jsx
│  │  ├─ SavedEstimatesPage.jsx
│  │  ├─ useEstimateDraft.js
│  │  ├─ estimateApi.js
│  │  ├─ calculation.js
│  │  ├─ snapshot.js
│  │  ├─ EstimateDocument.jsx
│  │  ├─ exportEstimatePdf.js
│  │  └─ tests/
│  │
│  ├─ customerOperations/
│  ├─ customerRequests/
│  ├─ afterService/
│  └─ customerPortal/
│
├─ components/
│  ├─ ui/
│  └─ layout/
│
├─ shared/
│  ├─ constants/
│  ├─ utils/
│  └─ lib/
│
└─ styles/
```

모든 Feature에 똑같은 파일을 기계적으로 만들지는 않는다. 복잡한 기능에만 Controller, Domain, API 계층을 모두 둔다.

---

## 5. App.jsx의 최종 역할

최종적으로 `App.jsx`에는 다음만 남긴다.

- 로그인 및 회사 세션 연결
- 고객 포털 route 분기
- 관리자 gate
- 현재 page
- AppShell
- 각 Feature Page mount
- 최상위 오류 처리

다음 책임은 기능별 폴더로 이동한다.

- 단가표 조회·저장·자동 저장
- 규격 식별
- 견적 계산
- 견적 snapshot
- 견적 저장
- 미리보기
- PDF 생성
- 사진 Storage 처리
- 세부 비용 CRUD
- 고객·현장 상태 전환

---

## 6. 실행 순서

### 0단계 — 안전 기준선 만들기

#### 목적

리팩터링 전 현재 상태를 되돌릴 수 있도록 고정한다.

#### 작업

1. 현재 브랜치와 working tree 확인
2. 현재 기준 커밋 기록
3. 별도 리팩터링 브랜치 생성
4. Supabase 운영 DB 변경 금지 확인
5. 주요 화면 수동 점검 목록 작성
6. 테스트 도구 도입 범위를 결정
7. 현재 저장 payload와 snapshot fixture 수집

권장 브랜치:

```text
refactor/feature-boundaries
```

주의: 현재 버그가 있는 동작을 그대로 “정상 동작” 테스트로 고정하면 안 된다.

---

### 1단계 — 바닥재 규격별 저장 버그 수정

#### 목적

다른 리팩터링보다 먼저 데이터 손상 가능성을 제거한다.

#### 이번 단계의 범위

- 선택된 바닥재 두께가 실제 어떤 `construction_subitems.id`를 가리키는지 고정
- 단가, 빈집 인건비, 살림집 인건비가 해당 ID만 수정하도록 변경
- 저장 payload 테스트
- 저장 후 재조회 테스트
- 신규 SQL 구조 도입 여부는 과거 구현과 실제 DB 데이터를 확인한 뒤 결정

#### 반드시 확인할 사례

```text
1.8T
- 단가 12,000
- 빈집 인건비 11,000
- 살림집 인건비 13,000

2.2T
- 단가 10,000
- 빈집 인건비 9,000
- 살림집 인건비 12,000

3.0T
- 단가 20,000
- 빈집 인건비 18,000
- 살림집 인건비 22,000
```

검증:

- 3.0T를 수정해도 1.8T와 2.2T 유지
- 새로고침 후 값 유지
- 다른 바닥재 항목에도 동일 원칙 적용
- 규격 없는 일반 소재 저장 유지

#### 이번 단계에서 변경 금지

- 견적 계산식
- `items_data`
- `condition_snapshot`
- 고객·현장 lifecycle
- PDF 형식
- App.jsx 전체 구조

---

### 2단계 — 단가표 Feature 분리

#### 추출 순서

1. 규격 관련 순수 함수
2. 저장 payload builder
3. 단가표 API
4. 자동 저장 Controller
5. 단가표 Page와 Components

#### 최소 추출 대상

```text
normalizeSpecOptions
parseFlooringThickness
composeFlooringSubitemName
resolveFlooringVariant
buildSubitemPricePayload
```

#### 목표

```text
PriceTablePage
→ usePriceTableController
→ specifications / priceTableModel
→ priceTableApi
→ Supabase
```

#### 완료 기준

- UI 파일에 Supabase import 없음
- UI 파일에 DB 테이블명 없음
- 화면 모양을 변경해도 저장 payload 테스트 통과
- 자동 저장 상태 유지
- 검색, 정렬, 펼침, drag 등 기존 기능 유지

---

### 3단계 — 견적서 미리보기 스크롤 수정

#### 목표 구조

```text
EstimatePreviewPage
└─ Preview Scroll Host
   └─ EstimateDocument
```

#### 역할

`Preview Scroll Host`

- 화면 스크롤
- 화면 여백
- action button 영역

`EstimateDocument`

- 실제 견적서 내용
- 읽기 전용
- PDF 캡처 대상

#### 검증

- 일반 견적서
- 세부 견적서
- 긴 견적
- 화면 배율 100%, 125%, 150%
- 좁은 노트북 화면
- PDF 전체 항목 포함
- 이전 화면 복귀

#### 변경 금지

미리보기 스크롤 수정과 PDF 디자인 개편을 동시에 하지 않는다.

---

### 4단계 — 견적 Feature 분리

다음 순서로 하나씩 진행한다.

1. `calculation.js`
2. `snapshot.js`
3. `estimateApi.js`
4. `useEstimateDraft.js`
5. `EstimateEditorPage.jsx`
6. `EstimatePreviewPage.jsx`
7. `EstimateDocument.jsx`
8. `exportEstimatePdf.js`
9. `SavedEstimatesPage.jsx`

#### 계산 영역

- 수량 × 단가
- 인원 × 인건비
- 추가금·할인
- 항목 합계
- 최종 합계

#### Snapshot 영역

- draft → `items_data`
- condition → `condition_snapshot`
- 저장 데이터 → draft 복원
- 기존 배열/객체 형식 호환

#### 완료 기준

- 저장 전후 합계 동일
- 기존 저장 견적 복원 가능
- 고객 포털 표시 동일
- 미리보기 이동만으로 DB 저장되지 않음
- 명시적 저장 시에만 estimate 저장

---

### 5단계 — 고객 운영 기능 세분화

현재 `customerOperations/api.js`에 섞인 기능을 점진적으로 나눈다.

```text
customerRequestsApi.js
projectsApi.js
homeApi.js
afterServiceApi.js
estimateShareApi.js
```

#### RPC 유지 대상

- 고객 포털 링크 생성
- request/project lifecycle
- trash/restore
- 여러 테이블을 함께 변경하는 중요한 작업

업무 상태의 의미 변경과 파일 분리를 같은 작업으로 진행하지 않는다.

---

### 6단계 — 공통 UI Kit 정리

기능 경계가 안정된 뒤 진행한다.

#### 공통화 대상

- Button
- TextInput
- NumberInput
- Select
- Tabs
- Modal
- Table
- PageHeader
- SearchField
- StatusBadge
- EmptyState
- LoadingState
- ErrorState

#### 성급하게 공통화하지 않을 것

- 받은 요청 전체 workspace
- 고객·현장 inspector 전체
- 견적서 항목 표 전체

업무 의미가 강한 화면은 각 Feature가 소유한다.

---

### 7단계 — 본격적인 UI 개편 재개

이 단계부터 Figma 시안을 적극 반영한다.

UI 변경 diff에 다음이 포함되면 중단하고 별도 데이터 작업으로 분리한다.

```text
supabase.from
supabase.rpc
insert
update
upsert
construction_subitems
estimates
projects
items_data
condition_snapshot
```

---

## 7. 테스트 도입 순서

현재 테스트 설정이 없으므로 한 번에 모든 테스트를 만들지 않는다.

### 1순위

- 규격 선택 → 실제 subitem ID
- 규격별 저장 payload
- 규격 간 덮어쓰기 방지

### 2순위

- 규격 정규화
- 바닥재 이름 parse/compose
- variant grouping

### 3순위

- 견적 계산
- 추가금·할인
- 최종 합계

### 4순위

- draft → snapshot → draft
- legacy snapshot 호환

### 5순위

- preview scroll
- PDF 전체 항목

### 6순위

- 고객·현장 lifecycle
- 고객 포털 RPC contract

---

## 8. 작업 단위 규칙

각 단계는 가능한 한 작은 커밋으로 나눈다.

```text
test(price-table): add flooring variant identity fixtures
fix(price-table): preserve price by flooring subitem id
refactor(price-table): extract specification helpers
refactor(price-table): extract save payload builder
refactor(price-table): extract API
refactor(price-table): extract autosave controller
refactor(price-table): extract page components
```

한 커밋에 다음을 섞지 않는다.

- UI 변경 + DB 변경
- 리팩터링 + 기능 추가
- 버그 수정 + 상태 의미 변경
- CSS 전면 이동 + 화면 구조 변경
- migration + 기존 데이터 자동 변환

---

## 9. 각 단계 완료 보고 형식

Codex는 작업 후 다음을 반드시 보고한다.

1. 변경 이유
2. 변경 파일 목록
3. 실제 코드 흐름 변화
4. DB 및 데이터 영향
5. 테스트 명령과 결과
6. build 결과
7. 수동 검증 항목과 결과
8. 남은 위험
9. 되돌리는 방법
10. SQL 실행 여부
11. git commit 여부

운영 DB SQL 실행과 자동 커밋은 사용자 지시 없이는 수행하지 않는다.

---

## 10. 지금 바로 할 일

### 첫 번째

이 문서를 저장소 루트에 추가한다.

권장 파일명:

```text
FORMATE_REFACTORING_PLAN.md
```

### 두 번째

Codex에게 0단계만 수행시킨다.

- 코드 수정 금지
- 테스트 도구 후보와 영향 분석
- 현재 기준 동작 fixture 계획
- 리팩터링 브랜치 전략
- 첫 번째 규격 저장 테스트 범위 확정

### 세 번째

0단계 결과를 검토한 후 1단계인 바닥재 규격별 저장 버그 수정에 들어간다.

전체 리팩터링을 바로 시작하지 않는다.

---

## 11. 최종 완료 상태

```text
App
= 세션·네비게이션·AppShell

Feature Page
= 화면 구성

Controller
= 화면 상태·자동 저장·작업 순서

Domain
= 규격·계산·snapshot·상태 규칙

Feature API
= Supabase 조회·저장

RPC
= 중요한 상태 전환·다중 테이블 작업

DB
= RLS·unique constraint·최종 데이터 보호

Shared UI
= 반복되는 시각 요소와 token

Tests
= UI 변경이 데이터 로직을 깨뜨리는지 감시
```

이 문서의 목적은 폴더를 예쁘게 나누는 것이 아니라, **향후 UI를 계속 수정하더라도 단가·견적·고객 데이터가 함께 깨지지 않도록 변경 경계를 만드는 것**이다.
