---
name: formate-workflow
description: FORMATE 저장소의 개발·버그 수정·Root Cause Audit·검증·Git 작업 방식을 통일하는 실행 규칙. FORMATE에서 코드나 문서를 조사·수정할 때 사용한다.
---

# FORMATE Codex Workflow

## 1. Context

- 항상 `AGENTS.md`를 기준으로 작업한다.
- UI/UX 작업일 때만 `.codex/skills/formate-design-system.md`도 반드시 따른다.
- 기존 문서 내용을 완료 보고에서 다시 요약하지 않는다.

## 2. Scope First

- 프롬프트가 지정한 파일과 feature부터 읽는다.
- 처음부터 저장소 전체를 탐색하지 않는다.
- 원인 확인에 필요한 의존성을 따라갈 때만 탐색 범위를 확장한다.
- 단순 UI·버그 작업에서 무관한 architecture refactor를 하지 않는다.
- Root Cause Audit 요청일 때만 필요한 범위의 cross-feature 탐색을 허용한다.

## 3. Minimal Change

- 문제를 해결하는 최소 파일과 최소 변경을 우선한다.
- 기존 데이터, API, 컴포넌트, 구조를 재사용한다.
- 하드코딩, 표시 문자열 기반 runtime 분기, 임시 timeout과 fake delay를 사용하지 않는다.
- 기존 정상 기능을 이유 없이 재작성하지 않는다.

## 4. Root Cause Mode

Root Cause 또는 Audit 요청에서는:

- 증상을 patch하기 전에 state → data → component → CSS 흐름을 추적한다.
- 실제 코드와 로그 근거 없이 추측하지 않는다.
- read-only audit이면 파일을 수정하지 않는다.
- 원인, 관련 파일, 구조적 해결 방향만 짧게 보고한다.

## 5. Validation Budget

- 작은 수정은 관련 focused test부터 실행한다.
- 전체 test와 build는 필요할 때 작업 종료 시 한 번만 실행한다.
- 같은 검증을 반복하지 않는다.
- 실제 브라우저 최종 UX 확인은 사용자에게 맡긴다.
- `git diff --check`는 마지막에 한 번만 실행한다.

## 6. Output Budget

완료 보고는 별도 형식 요구가 없으면 8줄 이내로 작성한다.

- 원인 또는 목표
- 핵심 변경
- 변경 파일
- focused test 결과
- build 결과(실행한 경우)
- git status

요구사항 전체나 테스트 목록을 다시 장황하게 서술하지 않는다.

## 7. Git

- `git add`, commit, push를 하지 않는다.
- 변경은 working tree에 남기고 사용자가 직접 확인한 뒤 commit하게 한다.

## 8. Safety

- 기존 데이터 삭제나 초기화를 하지 않는다.
- destructive migration을 만들지 않는다.
- DB 변경이 필요하면 additive 변경을 우선한다.
- SQL이 필요하면 파일 작성 후 사용자가 직접 실행하기 전에 중단한다.
- 기존 working tree를 reset, restore, discard하지 않는다.
