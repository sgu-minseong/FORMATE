# FORMATE TODO

## 최우선

- [ ] `supabase/schema.sql`에 `admin_condition_templates` 테이블 추가
- [ ] `supabase/schema.sql`에 `admin_condition_template_values` 테이블 추가
- [ ] 위 두 테이블의 unique constraint 추가
  - `admin_condition_templates`: `company_id,pyeong,build_type,has_extension`
  - `admin_condition_template_values`: `template_id,subitem_id,option_value`
- [ ] 두 테이블에 `updated_at` trigger, index, grant, RLS 설정 추가
- [ ] 기존 Supabase DB에서 schema를 적용한 뒤 PostgREST schema reload 확인

## 핵심 플로우 검증

- [ ] 관리자 화면에서 평수/조건 선택 후 단가, 인건비, 수량, 인원 저장
- [ ] 저장된 템플릿 목록에 방금 저장한 조건이 보이는지 확인
- [ ] 저장된 템플릿을 다시 불러왔을 때 값이 유지되는지 확인
- [ ] 신규 견적서 만들기에서 같은 평수/조건 선택 시 템플릿 값이 들어오는지 확인
- [ ] 장판 두께 선택 시 해당 두께의 단가/수량/인건비로 바뀌는지 확인
- [ ] 추가금/할인과 고객용 표시 여부가 preview에 올바르게 반영되는지 확인
- [ ] 견적서 저장 후 관리자 견적서 관리 화면에서 상세가 올바르게 보이는지 확인
- [ ] PDF 다운로드가 실제 브라우저에서 정상 동작하는지 확인

## 제품/기능

- [ ] `detail_cost_categories`를 실제 견적 계산, 내부 원가, 마진 분석 중 어디에 연결할지 결정
- [ ] 사진보기 기능 설계 및 구현
- [ ] 상담/공사 일정 기능 설계 및 구현
- [ ] CS/사후관리 기능 설계 및 구현
- [ ] 관리자 로그인/권한 설계
- [ ] 회사별 멀티테넌트 구조 확정
- [ ] 현재 고정된 `COMPANY_ID`를 실제 인증/회사 context로 대체

## 코드 품질

- [ ] `src/App.jsx`를 기능 단위로 분리
  - 랜딩
  - 조건 wizard
  - 견적 편집
  - 견적 preview
  - 관리자 단가 관리
  - 세부견적 관리
  - 견적서 관리
- [ ] Supabase query 함수를 `src/lib` 또는 feature별 파일로 분리
- [ ] 견적 계산 로직을 pure function으로 분리하고 테스트 추가
- [ ] 장판 두께 그룹핑 로직 테스트 추가
- [ ] 추가금/할인 계산 로직 테스트 추가
- [ ] `page` state 기반 화면 전환을 hash sync 또는 router로 정리
- [ ] `dummySavedData`, 사용하지 않는 state, 과거 mock 흐름 정리

## 디자인/UX

- [ ] 모바일에서 관리자 단가 grid가 입력하기 편한지 확인
- [ ] PDF 캡처 영역이 A4에서 잘리지 않는지 확인
- [ ] 긴 소재명/주소/금액에서 overflow가 없는지 확인
- [ ] 저장 중/오류/성공 상태 문구를 일관되게 정리
- [ ] 직접 URL 진입 시 원하는 화면으로 이동 가능한지 결정

## 운영/보안

- [ ] Supabase RLS 재설계
- [ ] anon key로 모든 CRUD가 가능한 현재 grant 제거
- [ ] 인증된 사용자별 company 접근 제한
- [ ] 관리자 비밀번호/hash 사용 여부 결정
- [ ] 견적서 PDF/데이터 보관 정책 결정

