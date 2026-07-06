# Claude Code Entry

Claude Code는 이 프로젝트를 이어받을 때 아래 순서를 따르세요.

1. 먼저 `AGENTS.md`를 끝까지 읽습니다.
2. 그 다음 `TODO.md`와 `CHANGELOG_WORKLOG.md`를 읽습니다.
3. `git status --short`로 현재 워킹트리 상태를 확인합니다.
4. `package.json`, `src/App.jsx`, `supabase/schema.sql`를 읽고 현재 구현 상태와 문서가 맞는지 확인합니다.
5. 작업 전에 현재 변경사항을 임의로 되돌리지 않습니다.
6. 작업 후 가능한 경우 `npm run build`를 실행합니다.

이 프로젝트는 FORMATE라는 인테리어 B2B 견적 관리 프로토타입입니다. 현재 가장 중요한 기술 리스크는 앱이 `admin_condition_templates`, `admin_condition_template_values` 테이블을 사용하지만 `supabase/schema.sql`에 두 테이블 정의가 없다는 점입니다. Supabase 기능을 건드리는 작업이면 이 문제를 먼저 해결하세요.

기존 UI는 업무용 견적 도구 톤입니다. 랜딩 페이지를 과한 마케팅 사이트처럼 바꾸지 말고, 상담 현장에서 빠르게 견적을 만드는 실사용 흐름을 우선하세요.

