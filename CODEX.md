# Codex Entry

Codex는 이 프로젝트를 이어받을 때 아래 순서를 따르세요.

1. `AGENTS.md`, `TODO.md`, `CHANGELOG_WORKLOG.md`를 먼저 읽습니다.
2. `git status --short`로 커밋되지 않은 변경을 확인합니다.
3. 관련 파일을 읽기 전에는 수정하지 않습니다.
4. 사용자가 명시하지 않은 변경을 되돌리지 않습니다.
5. 작은 범위로 수정하고, 가능하면 `npm run build`로 확인합니다.

현재 앱은 React + Vite + Supabase 기반의 FORMATE 인테리어 견적 관리 프로토타입입니다. 대부분의 기능은 `src/App.jsx`에 들어 있습니다. 가장 먼저 확인해야 할 리스크는 `App.jsx`가 `admin_condition_templates`, `admin_condition_template_values`를 사용하지만 `supabase/schema.sql`에 아직 해당 테이블이 없다는 점입니다.

기존 패턴을 따르세요. 숫자/금액 표시에는 `src/components/PriceText.jsx`를 사용하고, 색상/spacing/radius는 `src/styles/tokens.css`의 토큰을 우선하세요.

