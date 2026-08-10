---
name: formate-design-system
description: FORMATE 전용 제품 UI 디자인 시스템과 작업 전 점검 절차. FORMATE의 화면 수정, 신규 화면, 레이아웃, 컴포넌트, 테이블, 목록, 폼, 모달, 상태 UI를 설계하거나 구현하기 전에 사용한다. 사진 관리, 견적 작성, 고객·현장, 계약 관리, CRM, 대시보드 등 모든 운영 화면에서 기존 Sidebar, 단가표 관리, 기본 견적 설정의 디자인 언어를 유지할 때 사용한다.
---

# FORMATE Design System

FORMATE UI를 설계하거나 수정하기 전에 이 문서를 읽고, 기존 토큰과 컴포넌트를 우선 재사용한다. 이 문서는 특정 화면의 복제 명세가 아니라 FORMATE 전반에 적용할 제품 UI 규칙이다.

## 목차

1. FORMATE Design Philosophy
2. Layout System
3. Color System
4. Typography System
5. Spacing System
6. Component System
7. Table/List System
8. Card 사용 규칙
9. Interaction System
10. Page Design Rules
11. Forbidden Patterns
12. Evolution Rule
13. 구현 근거와 우선순위

## 1. FORMATE Design Philosophy

### 제품 방향

- FORMATE를 인테리어 업체 운영자가 매일 장시간 사용하는 고밀도 B2B SaaS 업무 도구로 설계한다.
- 장식보다 탐색 속도, 비교 가능성, 입력 효율, 상태 명확성을 우선한다.
- 화면의 완성도를 그림자나 장식이 아니라 정렬, 타이포그래피, 간격, 1px 경계, 일관된 상태 표현으로 만든다.
- 개발자 도구처럼 원시 데이터와 컨트롤을 그대로 노출하지 않는다. 업무 용어, 명확한 레이블, 예측 가능한 순서, 안전한 상태 피드백을 제공한다.
- `DESIGN_VARIANCE 2`, `MOTION_INTENSITY 1`, `VISUAL_DENSITY 9`를 FORMATE 운영 화면의 기준으로 본다.

### 참고 원칙

- Linear에서 밀도 높은 목록, 빠른 스캔, 절제된 선택 상태, 일관된 키보드 포커스를 참고한다.
- Notion에서 카드보다 타이포그래피와 구분선으로 구조를 만드는 원칙을 참고한다.
- Slack에서 고정 Sidebar, 워크스페이스 정체성, 독립 스크롤, 현재 위치의 명확성을 참고한다.
- 위 제품의 외형을 복제하지 않는다. FORMATE 토큰과 업무 구조로 원칙만 번역한다.

### 정보 밀도

- 한 화면에서 사용자가 수행하는 핵심 질문과 행동을 먼저 정의한다.
- 반복 데이터는 테이블 또는 목록으로 표현하고, 행 높이와 열 정렬을 고정한다.
- 보조 설명은 제목 옆 한 줄 또는 빈 상태에만 둔다. 업무 영역 안에 설명 카드를 반복하지 않는다.
- 숫자는 우측 정렬과 tabular 숫자를 사용해 비교 가능하게 만든다.

### 카드와 공간

- 카드가 없어도 배경, 구분선, 간격으로 그룹이 구분되면 카드를 만들지 않는다.
- 전역 Sidebar를 제외한 운영 Workspace는 가용 폭과 높이를 채운다.
- 큰 중앙 `max-width` 컨테이너로 업무 화면을 좁히지 않는다.
- 화면 안쪽에서 고정 패널과 스크롤 영역을 명확히 나누고, 페이지 전체와 내부 패널의 이중 스크롤을 피한다.

## 2. Layout System

### 전체 앱 구조

```text
AppShell
├─ Global Sidebar: 232px
└─ Main Workspace: minmax(0, 1fr)
```

- `height: 100dvh`, `min-width: 0`, `min-height: 0`, `overflow: hidden`을 앱 셸의 기본으로 사용한다.
- 전역 Sidebar는 브랜드, 섹션형 탐색, 도움말, 계정 Footer를 포함하고 독립 스크롤한다.
- 전체 화면형 업무 페이지에서는 `.formate-app-shell__main`의 기본 padding을 제거하고 해당 Page Pattern이 공간을 직접 배분한다.

### Global Sidebar

- 펼침 폭은 `232px`, 향후 축소형은 `64px` 토큰을 사용한다.
- 배경은 `#042F2C`, 좌우 padding은 `12px`, 상단 padding은 `16px` 또는 overview 화면의 `24px`를 사용한다.
- 브랜드 영역은 최소 `44px`, 로고는 `32px`, 제품명은 14px bold, 설명은 12px regular를 사용한다.
- 탐색을 홈, 업무, 견적·현장, 관리처럼 업무 맥락으로 그룹화한다.
- 메뉴 높이는 `36px`, 아이콘은 Lucide 18-20px와 1.5 stroke를 사용한다.
- 현재 메뉴는 `#0D5C52` 배경, `#10B981` 좌측 2px 선, 흰색 텍스트로 표현한다.
- Hover는 흰색 6% 배경만 사용한다. 새 그림자나 glow를 추가하지 않는다.
- 계정 Footer는 최소 `58px`, 32px avatar, 이름과 회사명을 말줄임 처리한다.

### Header

- 전체 Workspace Header 높이는 최소 `56px`로 유지하고 상단에 sticky 처리한다.
- 좌측에 제목과 한 줄 설명, 우측에 상태와 주요 행동을 배치한다.
- 제목은 workspace 기준 20px, 설명은 12px를 사용한다.
- 버튼은 한 줄을 유지하고 8px 간격으로 배치한다. 핵심 저장 행동만 Primary를 사용한다.
- Header 아래 도구가 필요한 경우 별도 Toolbar 행을 둔다. Header에 검색과 필터를 과밀하게 넣지 않는다.

### Workspace와 Panel

- Workspace는 `minmax(0, 1fr)`로 남은 공간을 전부 사용한다.
- Panel은 독립적인 탐색 또는 편집 문맥이 있을 때만 만든다.
- 인접 Panel은 카드 간격 대신 1px Border로 분리한다.
- 고정 Panel Header, 스크롤 Body, 고정 Footer가 필요한 경우 각 영역의 flex 축을 분리한다.
- 한 Workspace 안에서 배경은 페이지 `#F6F4EF`, 입력·목록 Surface는 `#FFFFFF`로 구분한다.

### Management Page Pattern

단가표 관리, 분류 관리, 설정 목록처럼 카테고리를 선택하고 데이터를 편집하는 화면에 사용한다.

```text
Global Sidebar | Category Panel 240px | Content Panel flexible
```

- Category Panel에 제목, 수량, 검색 대상 목록을 둔다.
- Content Panel에 sticky Header, Toolbar, Table/List를 세로로 쌓는다.
- Table/List가 남은 높이를 채우고 내부 스크롤한다.
- 단가표처럼 열이 많으면 `min-width`와 가로 스크롤을 사용하고 열을 억지로 압축하지 않는다.

### Multi-Management Page Pattern

견적 템플릿 만들기처럼 두 단계의 선택 문맥이 있는 관리 화면에 사용한다.

```text
Global Sidebar | Condition Panel 240-256px | Category Panel 220-240px | Content Panel flexible
```

- 첫 Panel에는 상위 작업 문맥, 두 번째 Panel에는 해당 문맥의 분류를 둔다.
- 각 Panel은 독립 Header와 스크롤 목록을 갖는다.
- 생성 행동은 첫 Panel Footer에 고정한다.
- 선택 문맥이 하나뿐이면 3열을 억지로 사용하지 말고 Management Page Pattern으로 축소한다.

### Editor Page Pattern

새 견적서 작성처럼 선택, 편집, 결과 확인이 연속되는 화면에 사용한다.

```text
Navigation 240px | Editor flexible | Preview optional
```

- Navigation은 편집 대상을 전환한다.
- Editor는 표 또는 폼 중심으로 구성한다.
- Preview는 결과 비교가 지속적으로 필요한 경우에만 추가한다. 일회성 확인은 별도 단계나 Modal을 사용한다.
- 하단 합계 또는 완료 행동은 Sticky Total Bar를 사용한다.

### Detail Page Pattern

고객·현장, 계약, CRM처럼 목록에서 대상을 선택하고 관계 정보를 확인하는 화면에 사용한다.

```text
List 320-380px | Detail minmax(0, 1fr)
```

- List에는 대상 식별에 필요한 최소 정보만 표시한다.
- Detail Header에는 현재 대상과 상태만 표시한다.
- 정적 속성, 활동, 위험 행동은 Drawer나 명시적 상세 섹션으로 분리한다.
- 선택 행은 배경과 좌측 3px 강조선으로 표시한다.

### Specialized Editor Rule

- 특수 데이터 타입은 해당 데이터의 Editor 영역만 특수화한다.
- Navigation, Layout, Selection Pattern은 같은 화면 family의 기존 FORMATE 공통 Pattern을 재사용한다.
- 특수 기능을 이유로 별도 Sidebar, Tab Navigation, Page Shell을 만들지 않는다.
- 사용자가 익힌 탐색법과 화면 구조를 유지해 기능별 학습 비용을 최소화한다.
- 특수 데이터에 일반 Table column을 억지로 적용해 의미 없는 placeholder, dash, 반복 설명을 만들지 않는다.
- Collapsed 상태에는 탐색과 판단에 필요한 최소 상태 정보만 표시하고, 상세 편집 정보는 Expanded 상태에서 제공한다.
- 동일한 source of truth를 편집하는 여러 화면은 동일 Editor Component와 interaction을 재사용한다.
- 기존 Component를 시각적으로 복제하는 것보다 실제 Component와 Style 경로를 재사용하는 것을 우선한다.
- 예: `standard`는 Standard Editor를 사용하고, `sash`는 같은 탐색·선택 구조 안에서 Sash Catalog Editor로 교체한다.

## 3. Color System

새 화면에서 아래 Semantic Token을 사용한다. 임의 HEX, RGB, 이름 기반 색상을 추가하지 않는다.

| 역할 | Token | 값 | 사용 |
|---|---|---:|---|
| Brand Primary | `--color-primary` | `#0D5C52` | Primary action, focus, selected line |
| Brand Hover | `--color-primary-hover` | `#042F2C` | Primary button hover |
| Brand Accent | `--color-accent` | `#10B981` | Sidebar active line, 실제 성공 상태 |
| Brand Deep | `--color-brand-deep` | `#042F2C` | Global Sidebar |
| Background | `--color-bg` | `#F6F4EF` | Page, Workspace |
| Surface | `--color-surface` | `#FFFFFF` | Table, Panel, Input, Modal |
| Surface Subtle | `--color-surface-subtle` | `#FBFAF7` | Hover, alternate row, selected neutral |
| Header Background | `--color-header-bg` | `#F3F1EC` | Table header |
| Border | `--color-border` | `#E2DED6` | Row, Panel, section divider |
| Border Strong | `--color-border-strong` | `#CFC8BC` | Input, emphasized boundary |
| Text Primary | `--color-text-primary` | `#1F2933` | 제목, 본문 핵심 값 |
| Text Secondary | `--color-text-secondary` | `#667085` | 설명, 레이블, 보조 값 |
| Text Muted | `--color-text-muted` | `#98A2B3` | Placeholder, disabled-like value |
| Selected Surface | `--color-primary-soft` | `#ECFDF5` | 선택 행, 선택 메뉴 |
| Selected Border | `--color-primary-border` | `#A7F3D0` | Drop target, selected outline |
| Success | `--color-success` | `#10B981` | 완료, 정상 저장 |
| Warning | `--color-warning` | `#D97706` | 주의, 확인 필요 |
| Error | `--color-danger` | `#DC2626` | 오류, 삭제 |
| Info | `--color-info` | `#2563EB` | 정보 상태 |
| AI | `--color-ai` | `#7C3AED` | AI 기능에만 제한 |

### 상태 색상 규칙

- Hover 기본은 `#FBFAF7`을 사용한다. 더 강한 행 Hover가 필요할 때만 `--color-row-hover: #F1EFE8`을 사용한다.
- Disabled는 별도 회색을 만들지 말고 `opacity: 0.56`, Surface Subtle, Text Muted 조합을 사용한다.
- Success, Warning, Error, Info는 실제 의미가 있을 때만 사용한다. 장식용 색점으로 쓰지 않는다.
- 카테고리 색상은 기존 `--cat-*` 토큰에 한정하고, 선택 상태 전체를 무지개색으로 만들지 않는다.
- 모든 새 색은 먼저 `src/styles/tokens.css`의 기존 역할로 표현 가능한지 확인한다.

## 4. Typography System

Pretendard Variable과 기존 시스템 fallback을 사용한다. 별도 서체를 추가하지 않는다.

| 역할 | Size | Weight | Line height | Color |
|---|---:|---:|---:|---|
| Route Page Title | 24px | 600 | 32px | Text Primary |
| Workspace Title | 20px | 600 | 28px | Text Primary |
| Section Title | 15px | 600 | 22px | Text Primary |
| Body | 14px | 400 | 22px | Text Primary |
| Body Emphasis | 14px | 500-600 | 22px | Text Primary |
| Caption/Metadata | 12px | 400-500 | 18px | Text Secondary |
| Table Header | 12px | 500 | 16px | Text Secondary |
| Table Cell | 13px | 400 | 18px | Text Primary |
| Button | 14px | 500 | 22px | Variant에 따른 색 |
| Small Button | 12px | 500 | 18px | Variant에 따른 색 |

- Page Title을 24px보다 키우지 않는다. 업무 도구의 위계는 크기보다 위치와 굵기로 만든다.
- 숫자 열과 금액에는 `font-variant-numeric: tabular-nums`를 적용한다.
- Table Header에만 `0.02em` letter-spacing을 허용한다. 한글 제목에 과도한 자간을 적용하지 않는다.
- 한글 단어를 글자 단위로 줄바꿈하지 않는다. `word-break: keep-all` 또는 말줄임을 사용한다.
- 한 행 레이블은 한 줄 말줄임을 기본으로 하고, 조건명처럼 정보 손실이 큰 경우에만 최대 두 줄을 허용한다.

## 5. Spacing System

4px micro step과 8px 기본 리듬을 사용한다.

| Token/역할 | 값 |
|---|---:|
| Micro | 4px |
| Control gap | 8px |
| Compact group | 12px |
| Panel padding | 16px |
| Section gap | 24px |
| Page horizontal | 32px |
| Page vertical | 24px |
| Table cell horizontal | 12px |
| Input horizontal | 10px |
| Button horizontal | 14px |

### 고정 크기

- Global Sidebar: 232px
- Local Sidebar: 240px
- Header: 최소 56px
- Button/Input: 36px
- Small Button/Table Input: 32px
- Table Header: 36px
- Table Row: 40px
- Badge: 22px
- Sticky Total Bar: 64px
- 기본 Icon: 18px, Sidebar Icon: 18-20px, stroke 1.5

### Radius

- Button/Input: 6px
- Card/Panel/Table: 8px
- Badge/Pill: 999px
- Dense Table Cell: 0px

- 새 margin이나 padding을 숫자로 직접 추가하기 전에 기존 spacing token을 사용한다.
- 같은 계층의 인접 요소에는 같은 gap을 적용한다.
- 행 내부 세로 여백을 임의로 늘리지 말고 Row Height 토큰을 변경 여부부터 판단한다.

## 6. Component System

먼저 `src/components/ui`의 기존 컴포넌트를 사용한다. 기존 화면의 `primary-button`, `secondary-button` 같은 레거시 클래스는 점진적으로 공통 `Button`에 맞추되, 요청 범위 밖에서 일괄 교체하지 않는다.

### Sidebar

- 목적: 앱 전체 탐색과 워크스페이스 정체성 유지.
- 상태: default, hover, active, disabled, focus-visible.
- 금지: 페이지별 별도 전역 Sidebar, 밝은 Sidebar 변형, 메뉴 카드화.

### Header/PageHeader

- 목적: 화면 제목, 현재 문맥, 최상위 행동 제공.
- 크기: 56px 이상, 제목 20px 또는 Route Title 24px.
- 금지: 검색, 필터, 설명, KPI, 버튼을 한 행에 모두 넣기.

### Button

- Primary: 화면당 핵심 확정 행동 하나에 사용한다.
- Secondary: 되돌리기, 업로드, 내보내기, 추가 등 보조 행동에 사용한다.
- Tertiary: 뒤로가기, 닫기, 낮은 우선순위 행동에 사용한다.
- Danger: 삭제처럼 파괴적 행동에만 사용한다. 큰 filled red 버튼을 기본으로 쓰지 않는다.
- 높이: 36px, Dense Header와 Table Action은 32px.
- 금지: 텍스트 없는 icon 버튼에 `aria-label` 누락, 버튼 안 두 줄 텍스트, 임의 radius.

### Input/Select

- 목적: 명시적 레이블이 있는 데이터 입력.
- 기본: 36px, Strong Border, 6px radius, 14px Body.
- Table 내부: 32px, 투명 Border와 Background로 시작하고 Focus에서만 Surface와 Primary Border를 표시한다.
- 금지: Placeholder를 레이블로 대체, 숫자 좌측 정렬, 행마다 두꺼운 입력 상자 노출.

### Canonical Variant Dropdown

- Table 셀 trigger에는 선택된 canonical `variant value + unit`과 Chevron만 표시하고 별도 관리 버튼을 두지 않는다.
- dropdown은 canonical ordering의 variant를 `construction_subitem_id`로 선택하며, 목록 아래 구분선과 `관리` action을 둔다.
- `관리`는 Modal이나 두 번째 Popover를 열지 않고 같은 dropdown surface를 관리 mode로 전환한다. 추가·수정·비파괴 보관 후 `완료`하면 선택 mode로 돌아간다.
- 행 높이 32px, 기존 Surface/Border/Primary Soft token, focus-visible, Escape와 바깥 클릭 닫기를 유지한다.
- 기준 구현: `src/features/constructionCatalog/CanonicalVariantSelect.jsx`, `CanonicalVariantManager.jsx`, `src/features/priceTable/PriceTablePage.jsx`.

### Table/List Row

- 목적: 반복 업무 데이터의 비교와 편집.
- 기본: Header 36px, Row 40px, Cell 좌우 12px, 1px bottom/right Border.
- 상태: hover, selected, drag, drop target, error, newly added.
- 금지: 각 행을 독립 Card로 만들기, 행마다 그림자 사용, 열 정렬을 화면마다 변경.

### Panel

- 목적: 독립 탐색 또는 편집 문맥 분리.
- 기본: Surface, 1px Border, 0 또는 8px radius. Split Layout에서는 radius 0을 사용한다.
- 금지: 단순 문단 하나를 Panel로 감싸기, Panel 안에 의미 없는 중첩 Card 추가.

### Modal과 Drawer

- Modal: 사용 흐름을 잠시 중단해야 하는 확인, 위험 행동, 짧은 편집에 사용한다.
- Modal Overlay는 `rgba(31, 41, 51, 0.42)`, 기본 padding 24px를 사용한다.
- Drawer: 현재 대상의 보조 속성 또는 생성 조건처럼 본문 문맥을 유지해야 하는 작업에 사용한다.
- Drawer는 우측 고정, 420px 이하, 100dvh를 기본으로 한다.
- Drawer가 열릴 때 배경 문맥은 약한 opacity/blur로 비활성 상태를 전달한다.
- 금지: 빈 Modal, 가짜 CTA, 전체 페이지를 Modal로 구현.

### Badge

- 목적: 짧은 상태와 수량 표시.
- 크기: 높이 22px, 12px medium, pill radius.
- 금지: 문장형 설명, 장식 태그, 실제 상태가 아닌 색점 남발.

### Empty State

- 목적: 데이터가 없는 이유와 다음 행동을 설명.
- 기본: Subtle Surface, dashed Strong Border, 16-24px padding, 제목 15px, 설명 12px.
- 금지: 큰 일러스트, 마케팅 문구, 실제 없는 행동 버튼.

### Loading과 Error

- Loading은 최종 구조와 같은 폭의 line/row skeleton을 사용한다.
- Error는 해당 Workspace 안의 `error-box` 또는 입력 바로 아래 helper로 표시한다.
- 재시도 가능한 오류에는 명시적 재시도 행동을 제공한다.
- 금지: 구조와 무관한 중앙 Spinner만 표시, Toast만으로 영구 오류를 숨기기.

## 7. Table/List System

단가표 관리와 기본 견적 설정을 기준 구현으로 사용한다.

### 구조

- Grid 또는 semantic Table을 사용하되 Header와 Row에 동일한 열 정의를 공유한다.
- 텍스트 열은 `minmax(..., 1fr)`, 고정 제어 열은 40-110px 범위를 사용한다.
- 열이 많은 관리표는 최소 폭을 보존하고 가로 스크롤한다.
- Table Header는 `#F3F1EC`, Row는 `#FFFFFF`, 교차행과 Hover는 `#FBFAF7`을 사용한다.
- Outer Card padding 없이 Workspace 가장자리까지 표를 사용할 수 있다.

### Row와 Cell

- Header 36px, Row 40px를 기본으로 한다.
- Cell은 좌우 12px, 우측 1px Border를 사용한다. 마지막 Cell Border는 제거한다.
- 행은 Bottom Border 하나로 구분한다. Top과 Bottom Border를 동시에 반복하지 않는다.
- 숫자, 금액, 수량, 인원은 우측 정렬하고 tabular 숫자를 사용한다.
- Label Cell은 말줄임하고, 편집 컨트롤은 Cell 폭을 전부 사용한다.
- 0 또는 빈 값은 Text Muted로 낮추되 값 자체를 숨기지 않는다.

### 상태

- Hover: Surface Subtle로만 변화시킨다.
- Selected: Primary Soft 배경과 좌측 3px Primary inset line을 사용한다.
- Focus: Cell Input에 Primary Border와 Surface를 표시한다.
- Error: Danger Soft 배경, 좌측 3px Danger line, Cell 아래 12px helper를 사용한다.
- Dragging: opacity를 낮추고 아주 약한 scale만 사용한다.
- Drop Target: Primary Border 또는 행 위 3px Primary insertion line을 사용한다.
- Newly Added: 1.4-1.6초의 짧은 highlight 후 기본 Surface로 복귀한다.
- Delete: 32px icon action, 기본은 투명, Hover에서 Danger Soft를 사용한다.

### Empty

- 빈 목록을 정상 행처럼 만들지 않는다.
- 표 영역 안에 Empty State 또는 24px padding의 muted 문구를 사용한다.
- 데이터를 추가할 실제 기능이 있을 때만 Add Action을 제공한다.

## 8. Card 사용 규칙

### 사용 가능

- 다른 영역과 독립적으로 이해되는 정보 묶음
- 사진과 파일 Preview
- KPI처럼 한 단위로 비교하는 요약
- Modal, Popover, 독립 설정 묶음

### 사용 금지

- 전체 업무 페이지를 감싸는 큰 Card
- Table이나 List의 각 행을 대체하는 Card
- Header, Toolbar, Table을 각각 Card로 만드는 중첩 Card
- 단순 설명 문구를 위한 안내 Card
- 공간이 남는다는 이유로 추가하는 장식 Card

### 표현

- 기본 Card는 Surface, 1px Border, 8px radius, 그림자 없음이다.
- Hover Shadow가 필요한 실제 interactive Card에만 `--shadow-hover`를 사용한다.
- Split Layout의 Panel과 Table은 radius 0을 허용한다.

## 9. Interaction System

### 공통

- Hover와 Focus transition은 150-160ms를 사용한다.
- 자동 장식 애니메이션을 추가하지 않는다.
- `focus-visible`은 컨트롤 자체에 가까운 작고 절제된 단일 표시를 제공한다.
- Hover만으로 필수 행동을 숨기지 않는다. Hover 노출 icon은 Focus와 Active 상태에서도 보여야 한다.

### Interaction Cost Minimization Rule

- FORMATE UI 설계 시 사용자가 작업을 끝내기 위해 필요한 클릭, 열기, 닫기, 화면 전환, 재입력 횟수를 핵심 평가 기준으로 사용한다.
- 같은 정보를 확인하기 위한 불필요한 interaction을 줄이고, 반복 업무에서 안전하게 바로 노출할 수 있는 정보는 추가 interaction 뒤에 숨기지 않는다.
- Accordion, Modal, Drawer, Popover는 화면을 정리하기 위한 목적으로 남용하지 않고 실제 복잡도가 높은 정보에만 Progressive Disclosure를 적용한다.
- 여러 object를 빠르게 비교하거나 탐색하는 업무에서는 장식적 단순함보다 scanability와 click reduction을 우선한다.
- 이미 선택한 Context, preference, favorite를 다른 화면에서 다시 입력하게 하지 않고 동일 의미의 상태는 가능한 하나의 source를 재사용한다.
- 내부 상태 갱신을 위해 사용자가 별도 새로고침을 수행하도록 요구하지 않는다.
- 구현 전 `이 작업을 끝내려면 몇 번 클릭해야 하는가`, `한 번에 볼 수 있는 정보를 불필요하게 숨기고 있는가`, `이미 아는 Context를 다시 입력시키는가`를 확인한다.

### Focus Treatment Rule

- 큰 초록 focus rectangle, double outline, glow, wrapper halo를 사용하지 않는다.
- Focus는 현재 입력 위치를, Selected는 선택된 데이터 상태를 나타내며 두 상태를 같은 표현으로 혼용하지 않는다.
- 마우스로 입력 컨트롤을 활성화할 때는 control 자체의 subtle border/state 변화로 표현하고 외부 두 번째 rectangle을 추가하지 않는다.
- Checkbox wrapper 전체나 Editable Cell parent 전체를 focus rectangle으로 둘러싸지 않는다.
- 키보드 `:focus-visible` 접근성은 유지하되 컨트롤에 가까운 작고 절제된 indicator를 사용한다.
- 페이지별 임시 focus override보다 공통 Component와 Token 수준의 수정을 우선한다.

### 상태 정의

- Hover: Surface Subtle, Text Primary, Border Strong 중 필요한 최소 변화만 사용한다.
- Active/Selected: Primary Soft와 Primary line을 사용하고 글자 굵기를 500으로 올린다.
- Disabled: `cursor: not-allowed`, opacity 0.56을 기본으로 한다.
- Loading: 실제 Panel과 Row 구조를 유지한 skeleton 또는 해당 위치의 `불러오는 중` 상태를 사용한다.
- Saving: 자동 저장 pill을 유지하고 편집 데이터는 화면에서 사라지지 않게 한다.
- Saved: 중립 Surface와 Text Secondary로 복귀하고 180ms 이하의 짧은 feedback만 허용한다.
- Dirty: 저장 전임을 명시하되 Warning 색을 남발하지 않는다.
- Error: Danger Border/Surface/Text를 함께 사용하고 복구 방법을 제공한다.

### 자동 저장

- `idle`, `dirty`, `saving`, `saved`, `error` 상태를 구분한다.
- Header action 영역의 pill처럼 현재 상태를 한 줄로 표시한다.
- 저장 성공은 조용하게, 저장 실패는 명확하게 표시한다.
- 자동 저장 상태와 수동 저장 버튼의 역할이 충돌하지 않도록 수동 저장은 명시적 확정 또는 재시도 수단으로 사용한다.

## 10. Page Design Rules

### Before coding

1. Management, Multi-Management, Editor, Detail 중 어떤 Page Pattern인지 먼저 선언한다.
2. 사용자가 이 화면에서 답해야 하는 핵심 질문을 한 문장으로 적는다.
3. `src/components/ui`와 기존 feature component 중 재사용할 항목을 나열한다.
4. 기존 Page Pattern과 공유할 Header, Toolbar, Panel, Row, 상태 규칙을 나열한다.
5. 필요한 색, 간격, 크기가 모두 기존 token에 있는지 확인한다.
6. 전체 화면, Panel, Table 중 어느 영역이 스크롤하는지 먼저 결정한다.
7. Loading, Empty, Error, Disabled, Saving 상태를 구현 범위에 포함한다.

### During coding

- `min-width: 0`, `min-height: 0`을 Split Layout의 각 Grid/Flex 자식에 적용한다.
- Header와 Table Header의 sticky 위치와 z-index를 최소 범위로 관리한다.
- 버튼, Input, Row 높이를 토큰과 일치시킨다.
- Icon은 기존 Lucide 계열과 1.5 stroke를 유지한다.
- 기존 문구, 정보 구조, 접근성 속성, 기능 계약을 요청 없이 바꾸지 않는다.

### Before completion

- 전역 Sidebar와 현재 화면의 active 상태를 확인한다.
- 가용 공간을 채우는지, 불필요한 중앙 여백이 없는지 확인한다.
- 내부 이중 스크롤과 잘린 Footer/Toolbar가 없는지 확인한다.
- 긴 한글 레이블, 작은 화면, 확대/축소에서 줄바꿈과 말줄임을 확인한다.
- Hover, Focus, Selected, Disabled, Loading, Error 상태를 확인한다.
- 임의 색상, 임의 spacing, 새 중복 component가 없는지 diff로 확인한다.

## 11. Forbidden Patterns

- 페이지마다 새로운 CSS 디자인 언어 만들기
- 기존 Semantic Token으로 표현 가능한 임의 색상 추가
- 모든 영역과 모든 행을 Card로 만들기
- 업무 화면을 좁히는 큰 중앙 Container 또는 과도한 `max-width`
- 불필요한 설명 Card, 안내 Card, 가짜 CTA
- Gradient, glow, glassmorphism, 장식용 blur
- 12px를 넘는 과도한 radius 또는 근거 없는 pill 사용
- 한글을 글자 단위로 줄바꿈하기
- 기존 `src/components/ui`를 무시하고 같은 역할의 새 component 만들기
- 페이지마다 서로 다른 Button, Input, Table 높이 사용
- Table을 동일한 Card grid로 대체하기
- Row마다 그림자와 두꺼운 Border 사용
- Placeholder를 Field Label로 사용하기
- 장식용 색점과 상태 Badge 남발
- 전체 페이지 스크롤과 내부 Panel 스크롤을 동시에 무계획으로 사용하기
- 실제 기능이 없는 Empty State action, Modal, Drawer 만들기
- 요청 없이 정보 구조, Navigation label, route, 기능 흐름 변경하기

## 12. Evolution Rule

이 스킬을 고정된 산출물이 아니라 FORMATE 디자인 언어의 변경 기록으로 유지한다.

### 승인된 UI 규칙 반영 절차

1. 사용자가 특정 UI나 상호작용을 명시적으로 좋다고 승인했는지 확인한다.
2. 승인된 이유를 화면 복제가 아닌 재사용 가능한 규칙으로 표현한다.
3. 가장 좁은 관련 시스템을 갱신한다.
   - 단가표 행 승인: Table/List System 갱신
   - 사진관리 Viewer 승인: Viewer Component 규칙 추가
   - 계약 상세 구조 승인: Detail Page Pattern 갱신
4. 실제 코드의 token, component, state와 일치하는지 확인한다.
5. 기존 규칙과 충돌하면 새 규칙을 추가하기 전에 적용 범위와 우선순위를 명시한다.
6. 단일 화면의 일회성 취향은 전역 규칙으로 승격하지 않는다.

### 변경 원칙

- 승인된 패턴의 근거 화면과 관련 source file을 함께 기록한다.
- 새 값이 반복되면 먼저 token으로 승격한 뒤 문서에 반영한다.
- 새 component가 여러 화면에서 재사용될 때 Component System에 추가한다.
- 폐기된 패턴은 조용히 삭제하지 말고 대체 규칙과 migration 범위를 기록한다.
- UI 작업이 끝날 때 이 스킬에 추가할 승인된 규칙이 생겼는지 확인한다.

## 13. 구현 근거와 우선순위

### 분석한 기준 구현

- 전역 Sidebar와 AppShell: `src/components/layout/AppShell.jsx`, `src/styles/tokens.css`, `src/app/AdminApp.jsx`
- 단가표 관리: `src/features/priceTable/PriceTablePage.jsx`, `src/styles/appStyles.js`
- 견적 템플릿 만들기: `src/app/AdminApp.jsx`의 `renderAdminItemsWorkbench`, `src/styles/appStyles.js`
- 공통 UI: `src/components/ui/*`

### 우선순위

1. 현재 사용자 요청
2. 이 FORMATE Design System
3. `src/styles/tokens.css`의 실제 Semantic Token
4. `src/components/ui`와 기준 화면의 실제 구현
5. 일반적인 외부 디자인 관행

문서와 실제 코드가 다르면 현재 코드를 확인하고, 차이가 의도된 승인인지 판단한 뒤 이 스킬을 갱신한다. 임의로 문서나 코드를 진실로 가정하지 않는다.
