# FORMATE 구조 리팩터링 실행 계획

> 목적: 현재 React + Vite + Supabase 구조와 사용자 동작을 유지하면서 `src/App.jsx`에 결합된 기능을 Feature 경계로 분리한다.
> 작업 성격: 구조 리팩터링만 수행한다. UI 재설계·제품 기능 추가·DB 구조 변경은 포함하지 않는다.
> 실행 브랜치: `refactor/feature-boundaries`
> 현재 기준 커밋: `25038e5 fix(price-table): preserve prices by flooring variant`
> 실행 방식: Goal mode에서 첫 번째 `PENDING` Phase부터 순서대로 수행한다.

---

## 1. 현재 완료 상태

| Phase | 작업 | 상태 | 기준 |
|---|---|---:|---|
| 0 | 안전 기준선·아키텍처 분석·Vitest 도입 | DONE | 분석 완료 |
| 1 | 규격·두께별 단가·인건비 독립 저장 수정 | DONE | `25038e5` |
| 2 | 단가표 Feature 분리 | DONE | 44 tests + build |
| 3 | 견적 Feature 분리 | PENDING |  |
| 4 | 고객 운영 Feature 경계 정리 | PENDING |  |
| 5 | App 소유 잔여 기능 분리 | PENDING |  |
| 6 | AppShell 축소·아키텍처 경계 고정 | PENDING |  |
| 7 | 최종 자동 검증·인수인계 보고 | PENDING |  |

현재 테스트 기준:

```text
npm run test
- priceTable 회귀 테스트 44개 통과

npm run build
- 통과
- 기존 대형 chunk 경고는 오류가 아님
```

---

## 2. 이번 실행에 포함하지 않는 후속 제품 작업

다음은 구조 리팩터링 완료 후 별도 요청으로 구현한다.

1. 견적서 미리보기 스크롤 동작과 PDF 화면 개선
2. 견적 저장과 상담·계약 상태 흐름 변경
3. AI 초기 세팅 화면 폐지 및 단가표·기본견적 설정의 Excel 업로드/내보내기 통합
4. 계약서 작성·미리보기·출력 기능 추가
5. 준비된 새 UI 레퍼런스 적용
6. AI 분석 시 `1식 공사`, 불명확 항목, 신뢰도 낮은 결과 처리 정책

견적 Feature를 분리하면서 `EstimatePreviewPage`, `EstimateDocument`, PDF 모듈을 만들 수는 있다. 그러나 화면 동작, 스크롤 방식, 디자인, PDF 결과는 바꾸지 않는다.

---

## 3. 목표 계층

```text
UI/Page
↓
Controller/Hook
├─ Domain/Model 순수 함수
└─ Feature API
   ↓
Supabase client / 기존 RPC
```

원칙:

- UI/Page는 Supabase 테이블명과 payload 세부사항을 모른다.
- Controller는 화면 state와 작업 순서를 소유한다.
- Domain/Model은 React·DOM·Supabase에 의존하지 않는다.
- Feature API와 문서에 명시된 `app/authApi.js`, `customerPortalApi.js` 등의 API 모듈만 Supabase 접근을 소유한다.
- UI, Page, Component, Domain, Model은 Supabase를 직접 접근하지 않는다.
- 기존 RPC·DB 계약은 변경하지 않는다.
- 실제 코드가 단순하면 불필요한 파일을 억지로 만들지 않는다.

---

## 4. 공통 실행 규칙

### 4.1 Phase 실행 순서

각 Phase에서 다음을 수행한다.

1. branch, HEAD, working tree 확인
2. 기준 `npm run test`, `npm run build`
3. 기존 동작을 보호할 characterization test 보강
4. 작은 내부 순서로 코드 이동
5. 각 내부 이동 후 test/build
6. Phase 완료 조건 검사
7. `git diff --check`, 변경 범위 검토
8. Phase 전용 커밋
9. 이 문서의 Phase 상태를 `DONE`으로 갱신
10. 다음 `PENDING` Phase로 자동 진행

별도 전체 분석 보고서를 먼저 작성하거나 사용자 승인을 기다리지 않는다.

### 4.2 Git

허용:

- Phase 전용 `git add`, `git commit`
- 한 Phase 안에서 테스트 보호 커밋과 구조 이동 커밋을 분리
- 한 Phase당 최대 2개 커밋
- 단, Phase 5는 5A·5B·5C·5D 각각을 독립 Subphase로 보고 Subphase당 최대 2개 커밋

금지:

- `git push`
- `git reset --hard`
- `git checkout -- .`
- 여러 Phase를 하나의 커밋으로 합치기
- 무관한 파일 포함
- `npm audit fix`

Phase 시작 전 예상하지 못한 변경이 있으면 중단한다.

### 4.3 공통 검증

각 Phase마다 실행:

```bash
npm run test
npm run build
git diff --check
git status --short --branch
git diff --stat
```

필요 시 추가:

```bash
rg "supabase\.from|supabase\.rpc|supabase\.storage" src
rg "items_data|condition_snapshot" src
rg "supabaseClient" src/features
```

### 4.4 실패 처리

- test/build 실패 상태에서 다음 Phase로 넘어가지 않는다.
- 기존 assertion을 삭제·완화하거나 expected 값을 현재 오류에 맞추지 않는다.
- 현재 Phase 안에서 최대 3회의 집중 보완을 수행한다.
- 그 후에도 기존 계약을 유지할 수 없으면 중단하여 보고한다.
- 실패한 Phase를 부분 완료 처리하거나 억지로 커밋하지 않는다.

---

## 5. 공통 변경 금지

Goal 전체에서 다음을 변경하지 않는다.

- DB schema, SQL, migration, 운영 Supabase 데이터
- RLS와 `company_members` 기반 회사 격리
- `items_data`, `condition_snapshot`
- 견적 계산 공식과 반올림 규칙
- PDF 내용·파일명·페이지 분할 방식
- 고객 포털 공유 RPC와 반환 계약
- lifecycle RPC signature와 실제 상태 문자열
- soft delete·복원 정책
- 1.2초 단가표 autosave debounce
- 현재 className·CSS·레이아웃·문구
- 새 UI·상태관리 라이브러리
- 제품 기능 추가
- 라우터 도입
- 동적 import·code splitting
- AI 초기 세팅 기능 동작

---

## 6. 공통 즉시 중단 조건

1. SQL 또는 migration이 필요함
2. 운영 DB 데이터를 바꿔야 검증 가능함
3. 저장 형식·계산·PDF·상태·RPC 변경이 필요함
4. 기존 견적을 동일 결과로 복원할 수 없음
5. 제품 정책·UX 결정이 필요함
6. 테스트를 약화해야만 통과 가능함
7. 다른 Feature의 실제 동작 변경이 필요함
8. 예상하지 못한 사용자 변경이나 다른 작업 diff 발견
9. 순환 의존을 없애기 위해 전역 state·하드코딩이 필요함
10. 현재 Phase 범위를 넘어 DB·UI·기능을 함께 고쳐야 함

---

# Phase 2 — 단가표 Feature 분리

## 목적

`App.jsx`의 단가표 UI·state·규격 규칙·autosave·Supabase 접근을 `features/priceTable`로 이동한다.

## 작업 범위

### 2.1 Model

현재 `priceTableModel.js` 회귀 계약을 유지한다.

- 규격 정규화
- 바닥재 base name·두께 해석
- active variant
- 빈 선택 상태
- local/persisted row reconcile
- DB row → 편집 model
- 편집 model → save operation
- insert/update payload
- 저장 후 ID reconcile

React·DOM·Supabase import 금지.

### 2.2 API

`priceTableApi.js`로 이동:

- `construction_items`
- `construction_subitems`
- `subitem_pyeong_values`
- `admin_condition_templates`
- `admin_condition_template_values`
- `condition_variant_labels`
- 단가표 조회·update·insert·upsert·재조회

기존 select/filter/order/conflict key와 payload를 보존한다. API는 React state setter와 JSX를 모른다.

### 2.3 Controller

`usePriceTableController.js`로 이동:

- `adminItems`, ref
- 검색·즐겨찾기·선택·접힘·펼침·drag
- active 규격
- dirty marker
- autosave status/error/savedAt/target
- 1.2초 debounce
- 저장 중 중복 방지와 queued autosave
- 수동 저장
- 조회·저장·재조회 orchestration

회사 ID와 navigation은 props/callback으로 받는다.

### 2.4 Page·Components

실제 V2 경로를 이동한다.

```text
renderAdminPricesWorkbench
→ renderAdminPriceRows
→ renderAdminPricePrimarySubitemCells
```

목표:

```jsx
<PriceTablePage companyId={companyId} ... />
```

현재 UI, className, CSS 문자열, 관리자 gate를 유지한다. 이번 Phase에서 CSS를 이동하지 않는다.

## 테스트

- 기존 priceTable 38개 유지
- update 대상 ID와 payload
- local row insert 분류
- insert 응답 reconcile
- 선택 상태 save operation 없음
- dirty 후 autosave 예약
- 저장 중 변경 시 queued autosave
- 저장 성공 후 최신 local 입력 유지

React Testing Library/jsdom이 필요하면 설치하지 말고 중단 보고한다.

## 완료 조건

- 단가표 UI에 Supabase import 없음
- UI가 테이블명·conflict key를 모름
- 규격·payload는 model/API에 있음
- autosave timer가 `App.jsx`에 없음
- 실제 V2 행 렌더 세부 구현이 `App.jsx`에 없음
- 기존 className·CSS 변경 없음
- test/build 통과

## Phase 전용 금지

- 견적 catalog·계산 변경
- 일반 `spec_options` 데이터 모델 변경
- 단가표 UI 디자인 변경
- AI Excel 적용 방식 변경

## 커밋

```text
refactor(price-table): extract price table feature
```

필요 시:

```text
test(price-table): protect controller contracts
refactor(price-table): extract price table feature
```

---

# Phase 3 — 견적 Feature 분리

## 목적

견적 작성·계산·snapshot·조회/저장·미리보기·PDF·저장 견적 책임을 `features/estimates`로 이동한다.

## 3.1 Characterization test

- 수량 × 단가
- 인원 × 인건비
- 빈집/살림집 인건비
- 추가금·할인
- 항목 합계·최종 합계
- object/legacy array `items_data`
- `condition_snapshot`
- 저장 → 복원 round-trip
- 기존 저장 견적 복원 시 동일 합계
- estimate payload 필드
- 미리보기 이동은 저장하지 않음
- 명시적 저장만 insert/update
- PDF 파일명 규칙

운영 고객 데이터 대신 synthetic fixture를 사용한다.

## 3.2 Domain

- `calculation.js`
- `snapshot.js`

React·DOM·Supabase import 금지.

## 3.3 API

`estimateApi.js`로 이동:

- estimate 목록·draft 저장·조회·복원·복사
- 기존 trash/restore API와 명확한 공개 경계
- template read model은 priceTable 공개 경계만 사용

payload·DB 컬럼 변경 금지.

## 3.4 Controller

`useEstimateDraft.js`가 소유:

- 조건
- 편집 항목
- 고객·현장 입력
- 조정금액·메모
- source/template/saved estimate
- loading/saving/error
- 계산 selector
- 저장·복원 orchestration

## 3.5 Page·Document·PDF

- `EstimateEditorPage.jsx`
- `EstimatePreviewPage.jsx`
- `SavedEstimatesPage.jsx`
- `EstimateDocument.jsx`
- `exportEstimatePdf.js`

현재 렌더 결과와 CSS를 유지한다. 스크롤 개선·PDF 디자인·계약서 기능은 하지 않는다.
PDF 데이터 계약과 생성 코드는 자동 검증한다. 실제 시각적 동일성은 자동 검증 완료로 간주하지 않고 최종 보고서에 사용자 수동 검증 대기로 명시한다.

## 완료 조건

- 계산·snapshot이 `App.jsx`에 없음
- estimate CRUD Supabase 접근이 `App.jsx`에 없음
- editor/preview/saved estimate 상세 JSX가 Feature에 있음
- 저장 형식·합계·PDF 결과 유지
- 기존/legacy snapshot fixture 복원
- customer portal 표시 유지
- test/build 통과

## 추가 중단 조건

- snapshot 형식이 코드 위치별로 충돌해 하나를 선택해야 함
- 기존 저장 견적을 같은 값으로 복원할 수 없음
- PDF 결과에 유의미한 차이가 발생함

## 커밋

```text
test(estimates): protect estimate contracts
refactor(estimates): extract estimate feature
```

---

# Phase 4 — 고객 운영 Feature 경계 정리

## 목적

`customerOperations/api.js`와 페이지에 섞인 요청·현장·홈·사후관리·공유 책임을 분리한다.

## 작업 순서

1. request status·filter·visibility 순수 규칙
2. `customerRequestsApi.js`
3. `projectsApi.js`
4. `homeApi.js`
5. `afterServiceApi.js`
6. `estimateShareApi.js`
7. 필요 시 페이지를 `customerRequests`, `afterService` Feature로 이동
8. public import 정리

기존 `customerPortal` 구조는 보존한다.

## 보호 테스트

- request 상태 논리 매핑
- 상태 변경 후 local list/selection
- project active/deleted visibility
- estimate/project soft delete visibility
- 현장 복원 후 하위 row 원상 유지
- 개별 휴지통 견적 유지
- 정상/차단 고객 포털 판정
- 공유 API의 기존 RPC 인자
- company scope 전달

## 완료 조건

- 하나의 API 파일이 모든 운영 영역을 소유하지 않음
- 페이지가 Supabase를 직접 import하지 않음
- lifecycle RPC와 상태 문자열 유지
- customer portal 동작 유지
- test/build 통과

## Phase 전용 금지

- 상담·계약 상태 흐름 구현
- 새 A/S 생성 UX
- 상태 문자열·RPC·SQL 변경
- 고객·현장 UI 재설계

## 커밋

```text
test(customer-operations): protect lifecycle contracts
refactor(customer-operations): split feature API boundaries
```

---

# Phase 5 — App 소유 잔여 기능 분리

5A·5B·5C·5D는 각각 독립 Subphase로 수행한다.

각 Subphase에서 다음을 별도로 수행한다.

1. 시작 전 branch, HEAD, working tree 확인
2. characterization test 보강
3. 해당 Subphase 범위만 구조 이동
4. `npm run test`
5. `npm run build`
6. `git diff --check`, 변경 범위 검토
7. Subphase 전용 커밋

“한 Phase당 최대 2개 커밋” 규칙은 Phase 5 전체가 아니라 각 Subphase에 적용한다.
한 Subphase의 검증이 실패하면 다음 Subphase로 넘어가지 않는다.

## 5A. 인증·세션

목표:

```text
src/app/
├─ useAppSession.js
└─ authApi.js
```

이동:

- Supabase Auth 로그인·세션 복원
- company membership 조회
- 회사 전환
- 관리자 재인증 API

보존:

- 업체 코드 → 내부 이메일
- company 결정
- local/sessionStorage key
- sign out/회사 변경
- 관리자 재인증 session 범위

커밋:

```text
refactor(app): extract session and auth boundary
```

## 5B. 사진 관리

`features/photoManagement/`로 metadata·Storage·upload/delete/reorder·Page/state를 이동한다.

bucket·path·metadata·UI 유지.

```text
refactor(photo-management): extract photo feature
```

## 5C. 세부 비용

`features/detailCosts/`로 `detail_cost_categories` CRUD·state·Page·API를 이동한다.

견적 계산·마진에 새로 연결하지 않는다.

```text
refactor(detail-costs): extract detail cost feature
```

## 5D. AI 초기 세팅

`features/aiSetup/`으로 현재 Excel 분석·mapping·catalog/template 반영을 구조만 이동한다.

금지:

- 별도 화면 폐지
- 새 Excel 업로드/내보내기 UX
- AI 모델·prompt·저장 정책 변경
- `1식 공사` 처리 설계

```text
refactor(ai-setup): extract AI setup feature
```

## 완료 조건

- 인증 외 독립 기능의 Supabase/Storage 작업이 `App.jsx`에 없음
- 각 Feature의 기존 UI·동작 유지
- test/build 통과

---

# Phase 6 — AppShell 축소·아키텍처 경계 고정

## 목적

`App.jsx`를 앱 조립과 최상위 흐름만 담당하도록 축소하고 자동 경계를 추가한다.

## App에 남길 책임

- 고객 포털 route 분기
- session 연결
- page/hash 호환
- 관리자 gate orchestration
- AppShell props
- Feature Page mount
- 최상위 오류·modal mount

## App에서 제거할 책임

- Feature Supabase query
- Feature 저장 payload
- 계산 규칙
- autosave timer
- Feature 상세 JSX
- Storage CRUD
- PDF 세부 구현
- lifecycle 상태 해석

## 아키텍처 테스트

새 라이브러리 설치 없이 Vitest/Node로 정적 검사:

- `domain`, `model`은 React/Supabase/DOM import 금지
- Feature Page/component는 `supabaseClient` 직접 import 금지
- `shared/ui`는 Feature import 금지
- `App.jsx`는 Feature DB 세부 함수를 직접 호출하지 않음
- 명시적 허용 목록 외 순환 import 없음

ESLint 전체 도입은 하지 않는다.

## 완료 조건

- App이 허용 책임 중심으로 축소됨
- Feature UI에서 직접 Supabase 접근 없음
- model/domain 순수성 검사 통과
- 순환 import 검사 통과
- test/build 통과
- CSS 디자인 변경 없음

## 커밋

```text
test(architecture): enforce feature boundaries
refactor(app): reduce app to composition shell
```

---

# Phase 7 — 최종 자동 검증·인수인계

## 자동 검증

```bash
npm run test
npm run build
git diff --check
git status --short --branch
git log --oneline --decorate -n 20
rg "supabase\.from|supabase\.rpc|supabase\.storage" src
```

## 확인 내용

- Supabase 접근 위치
- `App.jsx` 전후 줄 수와 남은 책임
- Feature 공개 인터페이스
- Phase별 커밋
- working tree clean
- 계획 상태 모두 갱신
- 사용자 수동 체크리스트 작성

## 사용자 수동 검증 체크리스트

- 로그인·세션 복원·회사 변경·관리자 재인증
- 단가표 조회·규격 전환·독립 저장·새로고침
- 일반 소재·신규 규격·autosave
- 견적 조건·편집·계산·저장·복원·복사
- 일반/세부 미리보기와 PDF
- PDF 실제 시각적 동일성은 자동 완료 처리하지 않고 사용자 수동 검증 대기로 유지
- 저장 견적 휴지통·복원
- 받은 요청 상태 전환
- 고객·현장 조회·완료·취소·복원
- 사후관리·A/S 조회
- 고객 포털 정상/차단 링크
- 사진 관리
- 세부 비용
- AI 초기 세팅 기존 화면

## 최종 완료 조건

- Phase 2~6 `DONE`
- 자동 검증 통과
- DB·SQL 변경 없음
- push 없음
- working tree clean
- 후속 제품 작업 미구현
- 수동 체크리스트와 위험 보고 완료
- PDF 실제 시각적 동일성의 사용자 수동 검증 대기 상태 명시

## 최종 보고

```text
A. 완료한 Phase
B. Phase별 커밋
C. 생성·이동·삭제 파일
D. App.jsx 전후 줄 수
E. App.jsx에 남은 책임
F. Feature별 공개 인터페이스
G. 테스트 수와 결과
H. build 결과
I. DB·SQL·운영 데이터 영향
J. 중단·보류 항목
K. 남은 위험
L. 사용자 수동 검증 체크리스트
M. git status와 push 여부
```

---

## 7. Goal 시작 명령

```text
기존 AGENTS.md와 FORMATE_REFACTORING_PLAN.md를 끝까지 읽어라.

FORMATE_REFACTORING_PLAN.md를 이번 Goal의 유일한 실행 계획으로 사용한다.
현재 branch가 refactor/feature-boundaries이고 working tree가 clean인지 확인한 뒤,
첫 번째 PENDING Phase부터 순서대로 실행한다.

각 Phase는 문서의 테스트·build·완료 조건을 모두 통과해야 DONE으로 갱신하고
Phase 전용 커밋을 남긴 뒤 다음 Phase로 진행한다.

검증 실패 시 현재 Phase 안에서 최대 3회의 집중 보완을 수행한다.
공통 또는 Phase별 중단 조건이 발생하면 임의로 우회하지 말고 중단하여 보고한다.

전체 아키텍처를 다시 분석하거나 새 구조를 제안하지 않는다.
UI·제품 기능·DB 계약을 변경하지 않고 승인된 구조 분리만 수행한다.
commit은 허용하지만 push는 하지 않는다.
목표를 달성하거나 중단 조건을 만날 때까지 계속 진행한다.
```
