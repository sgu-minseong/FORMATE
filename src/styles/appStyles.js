const appStyles = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: var(--font-sans);
    color: var(--text-primary);
    background: var(--bg-base);
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-regular);
    line-height: var(--line-height-body);
    letter-spacing: var(--letter-spacing-normal);
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
  }
  button, input, select, textarea {
    font: inherit;
    letter-spacing: var(--letter-spacing-normal);
  }
  button {
    cursor: pointer;
    border: 0;
    transition: background-color 100ms ease, border-color 100ms ease, box-shadow 150ms ease, color 100ms ease;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
  .app-shell {
    min-height: 100vh;
    padding-top: 0;
  }
  .app-shell.items-v2-shell {
    padding-top: 0;
  }
  .app-shell.admin-shell-root,
  .app-shell.admin-shell-root.items-v2-shell {
    height: 100dvh;
    min-height: 0;
    overflow: hidden;
    padding-top: 0;
  }
  .app-shell svg {
    stroke-width: 1.75;
  }
  .login-shell {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: var(--space-3);
  }
  .public-shell {
    min-height: 100dvh;
    overflow: hidden;
    padding: 0;
  }
  .public-landing {
    width: min(1120px, 100%);
    margin: 0 auto;
    min-height: 100dvh;
    max-height: 100dvh;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    padding: 14px var(--space-3) 22px;
  }
  .public-header {
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-bottom: 0;
  }
  .public-login-button {
    flex: 0 0 auto;
  }
  .public-hero {
    min-height: 0;
    align-items: center;
    padding: 0 0 12px;
    transform: translateY(-16px);
  }
  .public-hero-title {
    max-width: 500px;
  }
  .public-hero-title span {
    display: block;
    white-space: nowrap;
  }
  .login-card {
    width: min(420px, 100%);
    display: grid;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-md);
  }
  .login-back-button {
    justify-self: start;
    margin: -6px 0 2px;
  }
  .login-brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--text-primary);
  }
  .login-brand img {
    width: 38px;
    height: 38px;
    display: block;
  }
  .login-brand strong {
    font-size: var(--font-size-title-sm);
  }
  .login-card h1 {
    margin: 0 0 8px;
    font-size: var(--font-size-title-lg);
    letter-spacing: 0;
  }
  .login-helper {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.55;
  }
  .login-form {
    display: grid;
    gap: var(--space-2);
  }
  .login-form label {
    display: grid;
    gap: var(--space-1);
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
  }
  .admin-verify-modal {
    width: min(440px, calc(100vw - 32px));
    display: grid;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-md);
  }
  .admin-verify-modal h2 {
    margin: 0 0 8px;
    font-size: var(--font-size-title-md);
  }
  .ai-price-update-modal {
    width: min(920px, calc(100vw - 32px));
    max-height: 86vh;
    overflow: auto;
  }
  .ai-price-update-modal-table {
    max-height: 340px;
  }
  .unsaved-leave-modal .actions {
    justify-content: flex-end;
  }
  .global-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 80;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 0 var(--space-3);
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg-surface-overlay);
  }
  .global-brand {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    gap: var(--space-1);
    padding: 0;
    background: transparent;
    color: var(--text-primary);
    text-align: left;
  }
  .global-brand img {
    width: 27px;
    height: 27px;
    display: block;
  }
  .global-brand strong {
    font-size: var(--font-size-section-title);
    letter-spacing: 0;
  }
  .global-header.with-admin-condition,
  .global-header.with-estimate-condition {
    display: grid;
    grid-template-columns: minmax(150px, 1fr) minmax(240px, auto) minmax(180px, 1fr);
  }
  .header-admin-condition,
  .header-estimate-condition {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-width: 0;
    max-width: min(54vw, 620px);
    justify-self: center;
    min-height: 32px;
    padding: 0 var(--space-1-5);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    text-align: center;
  }
  .header-admin-condition.active,
  .header-estimate-condition {
    border-color: var(--brand-primary);
    background: var(--bg-surface);
    color: var(--text-primary);
  }
  .header-admin-condition span,
  .header-estimate-condition span {
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-caption);
  }
  .header-admin-condition strong,
  .header-estimate-condition strong {
    display: block;
    max-width: 100%;
    overflow: hidden;
    color: inherit;
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-body);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .company-session {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-1);
    min-width: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
  }
  .company-session span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .session-status-dot {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    border: 1px solid var(--border-subtle);
    border-radius: 999px;
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
  }
  .session-status-dot::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--brand-primary);
  }
  .company-switch-button {
    flex: 0 0 auto;
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .company-switch-button:hover,
  .company-switch-button:focus-visible {
    border-color: var(--brand-primary);
    box-shadow: var(--focus-ring);
    outline: none;
  }
  .landing {
    max-width: 1120px;
    margin: 0 auto;
    padding: var(--space-3) var(--space-3) 56px;
  }
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 0.98fr) minmax(320px, 0.88fr);
    gap: var(--space-3);
    align-items: start;
    padding: var(--space-3) 0;
    color: var(--text-primary);
  }
  .hero-copy {
    padding-top: 4px;
  }
  .public-hero-brand {
    margin-bottom: 18px;
  }
  .landing-session-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: 34px;
  }
  .hero-brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    flex: 0 0 auto;
    padding: 0;
    background: transparent;
    color: var(--text-primary);
    font-weight: var(--font-weight-bold);
  }
  .hero-brand img {
    width: 34px;
    height: 34px;
    display: block;
  }
  .hero-brand strong {
    font-size: var(--font-size-title-sm);
    letter-spacing: 0;
  }
  .landing-company-greeting {
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
  }
  .hero h1 {
    max-width: 560px;
    margin: 0 0 12px;
    font-size: clamp(33px, 3.75vw, 42px);
    line-height: 1.1;
    letter-spacing: 0;
  }
  .hero h1 span {
    display: block;
  }
  .hero p {
    max-width: 560px;
    margin: 0;
    color: var(--text-secondary);
    font-size: 16px;
    line-height: 1.52;
  }
  .hero-preview {
    width: min(100%, 452px);
    justify-self: end;
    padding: var(--space-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-card);
    background: linear-gradient(180deg, var(--bg-surface), #FBFAF7);
    box-shadow: var(--shadow-md);
  }
  .preview-top {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: flex-start;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .preview-top span,
  .preview-lines span,
  .preview-total span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .preview-top strong {
    display: block;
    margin-top: 4px;
    font-size: var(--font-size-body);
  }
  .preview-top button {
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .preview-conditions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin: 12px 0;
  }
  .preview-conditions span {
    padding: 6px 9px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: #F7F1E8;
    color: var(--text-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .preview-lines {
    display: grid;
    gap: var(--space-1);
  }
  .preview-lines div {
    display: grid;
    grid-template-columns: minmax(100px, 1fr) auto auto;
    gap: var(--space-1);
    align-items: center;
    padding: 9px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .preview-lines strong {
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
  }
  .preview-lines b {
    color: var(--text-primary);
    font-family: var(--font-number);
    font-variant-numeric: tabular-nums;
    font-size: var(--font-size-body-sm);
  }
  .preview-total {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: baseline;
    margin-top: 12px;
    padding: 12px;
    border-radius: var(--radius-card);
    background: var(--brand-primary);
    color: var(--text-inverse);
  }
  .preview-total span {
    color: rgba(255, 255, 255, 0.76);
  }
  .preview-total strong {
    font-family: var(--font-number);
    font-variant-numeric: tabular-nums;
    font-size: 22px;
  }
  .eyebrow {
    margin: 0 0 12px;
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
    text-transform: uppercase;
  }
  .eyebrow.dark {
    color: var(--brand-primary);
  }
  .eyebrow.danger {
    color: #a33a3a;
  }
  .landing-actions {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  .work-home {
    padding-top: 42px;
    padding-bottom: 32px;
  }
  .work-home .landing-actions {
    gap: var(--space-2);
  }
  .work-home-heading {
    display: grid;
    gap: 5px;
    margin-bottom: 2px;
  }
  .work-home-heading span {
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .work-home-heading h1 {
    margin: 0;
    font-size: clamp(28px, 3.4vw, 36px);
    line-height: 1.16;
    letter-spacing: 0;
  }
  .work-home-heading p {
    max-width: 520px;
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.45;
  }
  .section-heading h2 {
    margin: 0;
    font-size: var(--font-size-title-md);
  }
  .primary-action-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .secondary-action-grid,
  .menu-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 14px;
  }
  .menu-card {
    min-height: 124px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    padding: 18px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
    text-align: left;
    font-size: var(--font-size-title-sm);
    font-weight: var(--font-weight-bold);
    transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
  }
  .menu-card:hover,
  .menu-card:focus-visible {
    transform: translateY(-3px);
    border-color: var(--brand-primary);
    box-shadow: var(--shadow-md);
    background: #FDFCF9;
    outline: none;
  }
  .menu-card svg {
    color: var(--brand-primary);
  }
  .menu-card p {
    margin: 8px 0 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-regular);
    line-height: 1.45;
  }
  .feature-card {
    min-height: 172px;
    padding: 22px;
    border-color: var(--border-default);
  }
  .feature-card span {
    margin-top: 10px;
    font-size: var(--font-size-title-sm);
  }
  .feature-card strong {
    margin-top: 14px;
    padding: 8px 11px;
    border-radius: var(--radius-button);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-body-sm);
  }
  .home-primary-card {
    border-color: var(--brand-primary);
    background: #fbfcff;
  }
  .home-primary-card svg {
    color: var(--brand-primary);
  }
  .home-recent-compact {
    display: grid;
    gap: var(--space-1);
    padding: 14px 16px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .home-recent-compact-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .home-recent-compact-head strong {
    font-size: var(--font-size-body-sm);
  }
  .home-recent-compact-list {
    display: grid;
    gap: 6px;
  }
  .home-recent-compact-row {
    display: grid;
    grid-template-columns: minmax(100px, 0.8fr) minmax(160px, 1fr) 112px;
    gap: var(--space-1);
    align-items: center;
    min-height: 38px;
    padding: 7px 9px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-muted);
    color: var(--text-primary);
    text-align: left;
  }
  .home-recent-compact-row:hover,
  .home-recent-compact-row:focus-visible {
    border-color: var(--brand-accent-line);
    background: var(--bg-surface);
    outline: none;
  }
  .home-recent-compact-row span,
  .home-recent-compact-row em {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .header-estimate-actions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-1);
    justify-self: end;
    min-width: 0;
  }
  .header-estimate-actions .ui-button {
    height: var(--button-height);
  }
  .home-recent-compact-row span {
    font-weight: var(--font-weight-semibold);
  }
  .home-recent-compact-row em {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-style: normal;
  }
  .home-recent-compact-row .number-text {
    justify-self: end;
  }
  .support-card {
    min-height: 116px;
    padding: 16px;
    color: var(--text-primary);
  }
  .support-card span {
    margin-top: var(--space-1);
  }
  .menu-card.primary {
    border-color: var(--brand-primary);
  }
  .menu-card.primary svg {
    color: var(--brand-primary);
  }
  .simple-page, .panel-page {
    max-width: 960px;
    margin: 0 auto;
    padding: var(--space-6) var(--space-3);
  }
  .empty-state {
    margin-top: 80px;
    padding: var(--space-8) var(--space-3);
    text-align: center;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-sm);
  }
  .panel {
    padding: var(--space-4);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-sm);
  }
  .panel.wide {
    max-width: 1120px;
    margin: 0 auto;
  }
  .panel h2, .category-column h2, .editor h2 {
    margin: 0 0 10px;
  }
  .muted {
    color: var(--text-secondary);
    line-height: 1.6;
  }
  .caption {
    font-size: var(--font-size-body-sm);
    color: var(--text-secondary);
    margin-top: 0;
  }
  .progress {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-1);
    margin-bottom: var(--space-3);
  }
  .progress div {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    color: var(--text-secondary);
    box-shadow: var(--shadow-sm);
  }
  .progress div.active {
    border-color: var(--brand-primary);
    color: var(--brand-primary);
  }
  .progress span {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    font-weight: var(--font-weight-bold);
  }
  .progress .active span {
    background: var(--brand-primary);
    color: var(--text-inverse);
  }
  .progress p {
    margin: 0;
    font-weight: var(--font-weight-bold);
  }
  .segmented {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-1);
    margin: var(--space-3) 0;
  }
  .segmented.flush {
    margin: 0;
  }
  .segmented.compact {
    max-width: 420px;
  }
  .segmented button, .chips button {
    min-height: 44px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
  }
  .segmented button.selected, .chips button.selected {
    border-color: var(--brand-primary);
    background: var(--surface-selected);
    color: var(--brand-primary);
  }
  .custom-select {
    position: relative;
    max-width: 360px;
  }
  .custom-select-trigger {
    width: 100%;
    min-height: 48px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    padding: 0 14px;
    border: 1px solid var(--border-default);
    border-radius: 10px;
    background: var(--bg-surface);
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
    box-shadow: var(--shadow-sm);
  }
  .custom-select-trigger:hover,
  .custom-select-trigger:focus-visible,
  .custom-select-trigger.open {
    border-color: var(--brand-primary);
    box-shadow: none;
    outline: none;
  }
  .custom-select-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    z-index: 30;
    max-height: 280px;
    overflow: auto;
    padding: 6px;
    border: 1px solid var(--border-default);
    border-radius: 10px;
    background: var(--bg-surface);
    box-shadow: var(--shadow-md);
  }
  .custom-select-menu--portal {
    position: fixed;
    right: auto;
    z-index: 970;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .custom-select-menu button {
    width: 100%;
    min-height: 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    padding: 0 10px;
    border: 1px solid transparent;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
    text-align: left;
  }
  .custom-select-menu button:hover,
  .custom-select-menu button:focus-visible {
    background: var(--bg-subtle);
    outline: none;
  }
  .custom-select-menu button.selected {
    border-color: var(--border-selected);
    background: var(--surface-selected);
    color: var(--brand-primary);
  }
  .custom-select-section {
    display: grid;
    gap: 4px;
  }
  .custom-select-section + .custom-select-section {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border-subtle);
  }
  .custom-select-section p {
    margin: 4px 6px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .favorite-pyeong-section {
    margin: -2px -2px 0;
    padding: 6px 2px 8px;
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .pyeong-option-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 34px;
    align-items: center;
    gap: 4px;
    border: 1px solid transparent;
    border-radius: var(--radius-button);
  }
  .pyeong-option-row.selected {
    border-color: var(--border-selected);
    background: var(--surface-selected);
  }
  .custom-select-menu .pyeong-option-main {
    min-width: 0;
    padding: 0 10px;
    background: transparent;
  }
  .pyeong-option-row.selected .pyeong-option-main {
    color: var(--brand-primary);
  }
  .custom-select-menu .favorite-pyeong-toggle {
    width: 34px;
    min-height: 34px;
    justify-content: center;
    padding: 0;
    color: var(--text-tertiary);
    background: transparent;
  }
  .custom-select-menu .favorite-pyeong-toggle.active {
    color: var(--brand-primary);
  }
  .favorite-pyeong-section .pyeong-option-main:hover,
  .favorite-pyeong-section .pyeong-option-main:focus-visible,
  .favorite-pyeong-section .favorite-pyeong-toggle:hover,
  .favorite-pyeong-section .favorite-pyeong-toggle:focus-visible {
    background: var(--bg-surface);
  }
  .check-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .check-row label, .material-check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: var(--font-weight-semibold);
  }
  .check-row input, .material-check input {
    width: 18px;
    min-height: 18px;
  }
  .stack {
    display: grid;
    gap: var(--space-2);
  }
  .field-label {
    margin: 0 0 10px;
    font-weight: var(--font-weight-semibold);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .chips button {
    padding: 0 14px;
  }
  .chips button.condition-variant-option {
    height: auto;
    min-height: 48px;
    display: inline-grid;
    gap: 2px;
    align-content: center;
    justify-items: center;
    padding: 8px 14px;
    line-height: 1.2;
  }
  .condition-variant-option small {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .condition-variant-option.selected small {
    color: var(--brand-primary);
  }
  .condition-builder-panel {
    display: grid;
    gap: var(--space-3);
  }
  .condition-builder-header {
    align-items: flex-start;
    margin-bottom: 0;
  }
  .estimate-current-condition {
    display: grid;
    gap: 6px;
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .estimate-current-condition.active {
    border-color: var(--brand-primary);
    background: var(--surface-selected);
  }
  .estimate-current-condition span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .estimate-current-condition strong {
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
    line-height: 1.4;
  }
  .estimate-current-condition p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .condition-static-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
    align-items: start;
  }
  .condition-static-field {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }
  .condition-static-wide {
    grid-column: 1 / -1;
  }
  .condition-static-note {
    min-height: 44px;
    display: flex;
    align-items: center;
    padding: 10px 12px;
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .condition-static-note strong {
    color: var(--text-primary);
  }
  .condition-start-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-subtle);
  }
  .condition-start-row p {
    margin: 0;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-1);
    margin-top: var(--space-4);
  }
  .sticky-summary {
    position: sticky;
    top: 64px;
    z-index: 10;
    display: grid;
    grid-template-columns: auto minmax(220px, 1fr);
    gap: 14px;
    align-items: center;
    padding: 12px 24px;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg-surface-overlay);
  }
  .sticky-summary span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  code {
    padding: 5px 8px;
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--text-primary);
    white-space: normal;
  }
  .key-box {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .key-box span, .dummy-note span {
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
  }
  .load-box {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-2);
    align-items: center;
    margin-top: var(--space-3);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--brand-primary-subtle);
  }
  .load-box p {
    margin: 6px 0 0;
    color: var(--text-secondary);
  }
  .dummy-note {
    display: grid;
    gap: var(--space-1);
    margin-top: var(--space-3);
    padding: var(--space-2);
    border-left: 4px solid var(--border-default);
    background: var(--bg-subtle);
  }
  .admin-menu {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .admin-menu .menu-card {
    min-height: 158px;
    justify-content: flex-start;
    gap: 10px;
  }
  .admin-menu .menu-card p {
    margin-top: 0;
  }
  .ai-setup-page {
    max-width: 1180px;
  }
  .excel-import-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 45;
    display: grid;
    place-items: center;
    padding: var(--space-3);
    background: rgba(18, 29, 25, 0.54);
  }
  .excel-import-modal {
    width: min(1240px, calc(100vw - 40px));
    max-height: calc(100dvh - 40px);
    overflow: auto;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: 0 24px 70px rgba(18, 29, 25, 0.24);
  }
  .excel-import-modal .ai-setup-page {
    max-width: none;
    padding: 0;
  }
  .excel-import-modal .ai-setup-panel {
    border: 0;
    box-shadow: none;
  }
  .excel-import-modal-head-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-1);
    flex-wrap: wrap;
  }
  .ai-setup-panel {
    display: grid;
    gap: var(--space-3);
  }
  .ai-setup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: 56px;
    padding-bottom: var(--space-1);
    border-bottom: 1px solid var(--color-border);
  }
  .ai-setup-header h2 {
    margin-bottom: 0;
  }
  .ai-setup-header .muted {
    max-width: 780px;
    margin: 0;
  }
  .ai-status-pill {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 11px;
    border: 1px solid var(--border-subtle);
    border-radius: 999px;
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .ai-status-pill.reading {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
  }
  .ai-status-pill.success {
    border-color: rgba(49, 124, 82, 0.24);
    background: rgba(49, 124, 82, 0.08);
    color: #317c52;
  }
  .ai-status-pill.error {
    border-color: rgba(190, 62, 62, 0.26);
    background: rgba(190, 62, 62, 0.07);
    color: #a33a3a;
  }
  .ai-upload-grid {
    display: grid;
    grid-template-columns: minmax(280px, 0.9fr) minmax(280px, 1.1fr);
    gap: var(--space-2);
  }
  .ai-upload-box {
    position: relative;
    min-height: 124px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 8px;
    padding: var(--space-2);
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
    color: var(--text-primary);
    text-align: center;
    cursor: pointer;
    transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
  }
  .ai-upload-box:hover,
  .ai-upload-box:focus-within {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
    box-shadow: none;
  }
  .ai-upload-box input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .ai-upload-box svg {
    color: var(--brand-primary);
  }
  .ai-upload-box strong {
    font-size: var(--font-size-title-sm);
  }
  .ai-upload-box span,
  .ai-upload-summary span {
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
  }
  .ai-upload-summary {
    display: grid;
    align-content: center;
    gap: 8px;
    min-height: 124px;
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .ai-upload-summary strong {
    overflow-wrap: anywhere;
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .ai-upload-summary p {
    max-width: 560px;
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.45;
  }
  .ai-flow-panel,
  .ai-next-action-box,
  .ai-save-guide {
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .ai-flow-panel {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-2);
  }
  .ai-flow-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .ai-flow-head strong {
    display: block;
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .ai-flow-head p {
    margin: 4px 0 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .ai-flow-head span {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .ai-flow-steps {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-1);
  }
  .ai-flow-step {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-areas:
      "number body"
      "status status";
    gap: 8px 10px;
    min-height: 108px;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: #fbfcfe;
  }
  .ai-flow-step-number {
    grid-area: number;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .ai-flow-step > div {
    grid-area: body;
    min-width: 0;
  }
  .ai-flow-step strong {
    display: block;
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
  }
  .ai-flow-step p {
    margin: 3px 0 0;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.45;
  }
  .ai-flow-step em {
    grid-area: status;
    justify-self: start;
    font-style: normal;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .ai-flow-step.done {
    border-color: rgba(49, 124, 82, 0.18);
    background: rgba(49, 124, 82, 0.06);
  }
  .ai-flow-step.done .ai-flow-step-number,
  .ai-flow-step.done em {
    color: #317c52;
  }
  .ai-flow-step.active {
    border-color: rgba(43, 53, 104, 0.18);
    background: var(--brand-primary-subtle);
  }
  .ai-flow-step.active .ai-flow-step-number,
  .ai-flow-step.active em {
    color: var(--brand-primary);
  }
  .ai-flow-step.warning {
    border-color: rgba(190, 62, 62, 0.18);
    background: rgba(190, 62, 62, 0.05);
  }
  .ai-flow-step.warning .ai-flow-step-number,
  .ai-flow-step.warning em {
    color: #a33a3a;
  }
  .ai-flow-step.pending {
    opacity: 0.72;
  }
  .ai-next-action-box {
    display: grid;
    gap: 6px;
    padding: 14px 16px;
    border-color: rgba(43, 53, 104, 0.14);
    background: var(--brand-primary-subtle);
  }
  .ai-next-action-box span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .ai-next-action-box strong {
    color: var(--brand-primary);
    font-size: var(--font-size-body);
  }
  .ai-save-guide {
    display: grid;
    gap: 8px;
    padding: 14px 16px;
    background: #fbfcfe;
  }
  .ai-save-guide strong {
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
  }
  .ai-save-guide p,
  .ai-save-guide li {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.55;
  }
  .ai-save-guide ul {
    display: grid;
    gap: 4px;
    margin: 0;
    padding-left: 18px;
  }
  .ai-save-safety-line {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .ai-save-safety-line span {
    display: inline-flex;
    align-items: center;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }
  .ai-save-safety-line span + span::before {
    content: "";
    width: 1px;
    height: 12px;
    margin-right: 6px;
    background: var(--border-default);
  }
  .ai-save-result {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid rgba(49, 124, 82, 0.2);
    border-radius: var(--radius-button);
    background: rgba(49, 124, 82, 0.06);
  }
  .ai-save-result.has-failure {
    border-color: rgba(190, 122, 38, 0.24);
    background: rgba(190, 122, 38, 0.06);
  }
  .ai-save-result-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
  }
  .ai-save-result-head strong {
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
  }
  .ai-save-result-head span,
  .ai-save-result p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
    line-height: 1.45;
  }
  .ai-save-result-details {
    display: grid;
    gap: 8px;
  }
  .ai-save-result-details summary {
    width: fit-content;
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
    cursor: pointer;
  }
  .ai-save-result-details div {
    display: grid;
    gap: 4px;
    padding-top: 4px;
  }
  .ai-save-result-details b,
  .ai-save-result-details span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .ai-save-result-details b {
    color: var(--text-primary);
  }
  .ai-review-panel {
    display: grid;
    gap: var(--space-2);
    padding-top: var(--space-1);
    border-top: 1px solid var(--border-subtle);
  }
  .ai-sheet-tabs {
    display: flex;
    gap: var(--space-1);
    overflow-x: auto;
    padding-bottom: 2px;
  }
  .ai-sheet-tabs button {
    flex: 0 0 auto;
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border: 1px solid var(--border-default);
    border-radius: 999px;
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-bold);
  }
  .ai-sheet-tabs button span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .ai-sheet-tabs button.selected {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
  }
  .ai-sheet-tabs button.selected span {
    color: var(--brand-primary);
  }
  .ai-sheet-meta {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: var(--space-1);
  }
  .ai-sheet-meta div {
    display: grid;
    gap: 4px;
    min-width: 0;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .ai-sheet-meta span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .ai-sheet-meta strong {
    min-width: 0;
    overflow: hidden;
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ai-sheet-meta-line {
    min-width: 0;
    padding: 8px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ai-mapping-panel,
  .ai-standard-preview,
  .ai-raw-data-panel,
  .ai-manual-review-panel,
  .ai-column-review-panel,
  .ai-catalog-match-panel,
  .ai-apply-plan-panel,
  .ai-apply-condition-panel,
  .ai-final-confirm-panel {
    display: grid;
    gap: var(--space-2);
  }
  .ai-collapsible-section {
    display: grid;
  }
  .ai-collapsible-toggle {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(160px, auto) minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-1);
    min-height: 42px;
    padding: 8px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
    color: var(--text-primary);
    text-align: left;
  }
  .ai-collapsible-toggle:hover {
    border-color: rgba(43, 53, 104, 0.24);
    background: var(--brand-primary-subtle);
  }
  .ai-collapsible-toggle span {
    color: var(--brand-primary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-bold);
    white-space: nowrap;
  }
  .ai-collapsible-toggle em {
    min-width: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-style: normal;
    line-height: 1.45;
  }
  .ai-collapsible-toggle div {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }
  .ai-collapsible-toggle b {
    display: inline-flex;
    align-items: center;
    min-height: 22px;
    padding: 0 7px;
    border-radius: 999px;
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
    white-space: nowrap;
  }
  .ai-mapping-panel,
  .ai-standard-preview,
  .ai-manual-review-panel,
  .ai-column-review-panel,
  .ai-catalog-match-panel,
  .ai-apply-plan-panel,
  .ai-apply-condition-panel,
  .ai-final-confirm-panel {
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .ai-mapping-title {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .ai-mapping-title h3 {
    margin: 0 0 4px;
    font-size: var(--font-size-title-sm);
  }
  .ai-mapping-title p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .ai-mapping-stats {
    flex: 0 0 auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }
  .ai-mapping-stats span {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 10px;
    border: 1px solid var(--border-subtle);
    border-radius: 999px;
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
    white-space: nowrap;
  }
  .ai-mapping-stats.warning span {
    border-color: rgba(190, 62, 62, 0.22);
    background: rgba(190, 62, 62, 0.06);
    color: #a33a3a;
  }
  .ai-header-select {
    max-width: 520px;
    display: grid;
    gap: 6px;
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
  }
  .ai-column-map-wrap {
    max-height: 460px;
  }
  .ai-column-map-table th,
  .ai-column-map-table td {
    min-width: 150px;
    vertical-align: middle;
  }
  .ai-column-map-table th:first-child,
  .ai-column-map-table td:first-child {
    min-width: 58px;
    max-width: 58px;
  }
  .ai-column-map-table select,
  .ai-column-map-table input {
    min-width: 160px;
    min-height: 38px;
    padding: 8px 10px;
    font-size: var(--font-size-body-sm);
  }
  .ai-column-code {
    color: var(--brand-primary);
    font-family: var(--font-number);
    font-weight: var(--font-weight-bold);
    text-align: center;
  }
  .ai-match-method {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    padding: 0 8px;
    border-radius: 999px;
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
    white-space: nowrap;
  }
  .ai-duplicate-warning {
    display: grid;
    gap: 6px;
    padding: 12px 14px;
    border: 1px solid rgba(190, 122, 38, 0.24);
    border-radius: var(--radius-button);
    background: rgba(190, 122, 38, 0.07);
    color: #8a5a1d;
  }
  .ai-duplicate-warning p {
    margin: 0;
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
    line-height: 1.5;
  }
  .ai-match-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(126px, 1fr));
    gap: var(--space-1);
  }
  .ai-match-summary div {
    display: grid;
    gap: 4px;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .ai-match-summary span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .ai-match-summary strong {
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .ai-compact-summary-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .ai-compact-summary-bar span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 24px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }
  .ai-compact-summary-bar span + span::before {
    content: "";
    width: 1px;
    height: 12px;
    margin-right: 2px;
    background: var(--border-default);
  }
  .ai-compact-summary-bar strong {
    color: var(--text-primary);
    font-size: var(--font-size-caption);
  }
  .ai-compact-summary-bar .needs-review,
  .ai-compact-summary-bar .needs-review strong {
    color: #a33a3a;
  }
  .ai-compact-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .ai-compact-actions .secondary-button {
    min-height: 34px;
    padding: 0 11px;
    font-size: var(--font-size-body-sm);
  }
  .ai-compact-details {
    display: grid;
    gap: 8px;
  }
  .ai-compact-details summary,
  .ai-inline-disclosure {
    width: fit-content;
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
    cursor: pointer;
  }
  .ai-inline-disclosure {
    display: inline-flex;
    align-items: center;
  }
  .ai-catalog-match-wrap {
    max-height: 560px;
  }
  .ai-catalog-match-wrap.compact {
    max-height: 320px;
  }
  .ai-catalog-match-table th,
  .ai-catalog-match-table td {
    min-width: 130px;
    vertical-align: middle;
  }
  .ai-catalog-match-table select {
    min-width: 160px;
    min-height: 38px;
    padding: 8px 10px;
    font-size: var(--font-size-body-sm);
  }
  .ai-catalog-match-table .ai-inline-input {
    width: 120px;
    min-width: 120px;
    min-height: 34px;
    padding: 0 10px;
    font-size: var(--font-size-body-sm);
  }
  .ai-catalog-match-table .ai-inline-input.wide {
    width: 180px;
    min-width: 180px;
  }
  .ai-split-parent-row td {
    background: rgba(43, 53, 104, 0.04);
  }
  .ai-split-child-row td:first-child {
    border-left: 3px solid rgba(43, 53, 104, 0.22);
  }
  .ai-split-validation-panel {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-2);
    border: 1px dashed rgba(43, 53, 104, 0.22);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .ai-match-status {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 9px;
    border-radius: 999px;
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
    white-space: nowrap;
  }
  .ai-match-status.matched {
    background: rgba(49, 124, 82, 0.08);
    color: #317c52;
  }
  .ai-match-status.work_item {
    background: rgba(49, 124, 82, 0.08);
    color: #317c52;
  }
  .ai-match-status.cost_item,
  .ai-match-status.margin_item,
  .ai-match-status.tax_item {
    background: rgba(190, 122, 38, 0.08);
    color: #8a5a1d;
  }
  .ai-match-status.subtotal_row,
  .ai-match-status.total_row {
    background: rgba(43, 53, 104, 0.08);
    color: var(--brand-primary);
  }
  .ai-match-status.category_matched,
  .ai-match-status.subitem_candidate {
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
  }
  .ai-match-status.new_candidate {
    background: rgba(190, 122, 38, 0.08);
    color: #8a5a1d;
  }
  .ai-match-status.needs_review,
  .ai-match-status.ignored {
    background: rgba(91, 95, 114, 0.08);
    color: var(--text-secondary);
  }
  .ai-match-hint {
    display: block;
    margin-top: 5px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .ai-new-candidate-panel {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-2);
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .ai-new-candidate-panel h4 {
    margin: 0;
    font-size: var(--font-size-title-sm);
  }
  .ai-new-candidate-list {
    display: grid;
    gap: var(--space-1);
  }
  .ai-new-candidate-list div {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
  }
  .ai-new-candidate-list span,
  .ai-new-candidate-list p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .ai-new-candidate-list strong {
    color: var(--text-primary);
  }
  .ai-plan-notice {
    padding: 12px 14px;
    border: 1px solid rgba(43, 53, 104, 0.16);
    border-radius: var(--radius-button);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
    line-height: 1.5;
  }
  .ai-plan-section {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .ai-plan-section h4 {
    margin: 0;
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .ai-plan-context {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .ai-plan-empty {
    margin: 0;
    padding: 12px;
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
  }
  .ai-plan-split {
    display: grid;
    grid-template-columns: minmax(240px, 0.75fr) minmax(0, 1.25fr);
    gap: var(--space-1);
    align-items: start;
  }
  .ai-condition-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-1);
  }
  .ai-condition-hint-box {
    display: grid;
    gap: var(--space-1);
    padding: 12px 14px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .ai-condition-hint-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
  }
  .ai-condition-hint-head strong {
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
  }
  .ai-condition-hint-head span {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    padding: 0 8px;
    border-radius: 999px;
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
    white-space: nowrap;
  }
  .ai-condition-hint-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-1);
  }
  .ai-condition-hint-grid div {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
  }
  .ai-condition-hint-grid span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .ai-condition-hint-grid strong {
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
  }
  .ai-condition-hint-box p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .ai-condition-grid label {
    display: grid;
    gap: 6px;
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
  }
  .ai-condition-grid select {
    min-height: 42px;
    padding: 9px 11px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
  }
  .ai-selected-condition {
    display: grid;
    gap: 5px;
    padding: 12px 14px;
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .ai-selected-condition.ready,
  .ai-selected-condition.final {
    border-style: solid;
    border-color: rgba(43, 53, 104, 0.16);
    background: var(--brand-primary-subtle);
  }
  .ai-selected-condition span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .ai-selected-condition strong {
    color: var(--text-primary);
    font-size: var(--font-size-body);
  }
  .ai-selected-condition p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.5;
  }
  .ai-final-summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-1);
  }
  .ai-final-summary-grid div {
    display: grid;
    gap: 4px;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .ai-final-summary-grid span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .ai-final-summary-grid strong {
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .ai-confirm-warning-list {
    display: grid;
    gap: 6px;
  }
  .ai-confirm-warning-list p {
    margin: 0;
    padding: 10px 12px;
    border: 1px solid rgba(190, 122, 38, 0.2);
    border-radius: var(--radius-button);
    background: rgba(190, 122, 38, 0.06);
    color: #8a5a1d;
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
    line-height: 1.5;
  }
  .ai-price-update-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
    align-items: center;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .ai-price-update-actions div {
    display: grid;
    gap: 6px;
  }
  .ai-price-update-actions strong {
    color: var(--text-primary);
    font-size: var(--font-size-body);
  }
  .ai-price-update-actions p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .ai-final-confirm-panel .ai-price-update-actions {
    gap: var(--space-1);
    padding: 10px 12px;
    border-radius: var(--radius-button);
  }
  .ai-final-confirm-panel .ai-price-update-actions strong {
    font-size: var(--font-size-body-sm);
  }
  .ai-final-confirm-panel .primary-button {
    min-height: 38px;
    padding: 0 12px;
  }
  .ai-recommendation-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
    align-items: center;
    padding: var(--space-2);
    border: 1px solid rgba(43, 53, 104, 0.14);
    border-radius: var(--radius-card);
    background: rgba(43, 53, 104, 0.04);
  }
  .ai-recommendation-actions div {
    display: grid;
    gap: 6px;
  }
  .ai-recommendation-actions strong {
    color: var(--text-primary);
    font-size: var(--font-size-body);
  }
  .ai-recommendation-actions p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .ai-recommendation-summary {
    display: grid;
    gap: var(--space-1);
    padding: 0;
    border: 0;
    background: transparent;
  }
  .ai-recommendation-summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-1);
  }
  .ai-recommendation-summary-grid div {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .ai-recommendation-summary-grid span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .ai-recommendation-summary-grid strong {
    color: var(--text-primary);
    font-size: var(--font-size-body);
  }
  .ai-recommendation-warnings {
    display: grid;
    gap: 6px;
  }
  .ai-recommendation-warnings p {
    margin: 0;
    padding: 8px 10px;
    border-radius: var(--radius-button);
    background: rgba(190, 122, 38, 0.08);
    color: #8a5a1d;
    font-size: var(--font-size-body-sm);
    line-height: 1.45;
  }
  .ai-recommendation-reason {
    display: block;
    max-width: 260px;
    margin-top: 6px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.45;
  }
  .ai-recommendation-reason span {
    display: block;
    margin-top: 4px;
    color: #8a5a1d;
    font-weight: var(--font-weight-semibold);
  }
  .ai-mapping-groups {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-1);
  }
  .ai-mapping-group {
    display: grid;
    gap: 8px;
    min-width: 0;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .ai-mapping-group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
  }
  .ai-mapping-group-head strong {
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
  }
  .ai-mapping-group-head span,
  .ai-mapping-empty {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .ai-mapping-group p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.45;
  }
  .ai-mapping-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .ai-mapping-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--border-subtle);
    border-radius: 999px;
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .ai-mapping-chip b {
    color: var(--brand-primary);
    font-family: var(--font-number);
  }
  .ai-mapping-chip em {
    color: var(--text-secondary);
    font-style: normal;
  }
  .ai-mapping-group.unknown .ai-mapping-chip,
  .ai-mapping-group.ignored .ai-mapping-chip {
    border-color: rgba(91, 95, 114, 0.18);
    background: rgba(91, 95, 114, 0.05);
    color: var(--text-secondary);
  }
  .ai-table-wrap {
    max-height: 560px;
    overflow: auto;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .ai-data-table {
    min-width: max-content;
    border-collapse: separate;
    border-spacing: 0;
  }
  .ai-data-table th,
  .ai-data-table td {
    min-width: 120px;
    max-width: 280px;
    padding: 10px 12px;
    border: 0;
    border-right: 1px solid var(--border-subtle);
    border-bottom: 1px solid var(--border-subtle);
    vertical-align: top;
    font-size: var(--font-size-body-sm);
    line-height: 1.45;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .ai-data-table th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .ai-data-table .row-number-cell {
    position: sticky;
    left: 0;
    z-index: 3;
    min-width: 58px;
    max-width: 58px;
    background: var(--bg-subtle);
    color: var(--text-secondary);
    text-align: right;
    font-family: var(--font-number);
    font-variant-numeric: tabular-nums;
    font-weight: var(--font-weight-semibold);
  }
  .ai-data-table tbody .row-number-cell {
    z-index: 1;
  }
  .ai-standard-table th,
  .ai-standard-table td {
    min-width: 140px;
  }
  .ai-empty-sheet {
    display: grid;
    gap: 6px;
    padding: var(--space-3);
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .ai-empty-sheet p,
  .ai-row-limit-note {
    margin: 0;
  }
  .admin-page {
    max-width: 1180px;
  }
  .admin-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: var(--space-1);
  }
  .admin-pyeong-panel {
    position: relative;
    display: grid;
    grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr) minmax(220px, 1fr);
    gap: var(--space-2);
    align-items: end;
    margin-bottom: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .admin-pyeong-panel label {
    display: grid;
    gap: var(--space-1);
    font-weight: var(--font-weight-semibold);
  }
  .admin-condition-title {
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    align-self: center;
  }
  .admin-condition-title > div {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .admin-condition-title strong,
  .template-list-panel strong {
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .admin-condition-title span,
  .template-list-panel span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .admin-condition-toggle {
    min-width: 0;
  }
  .admin-condition-grid {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
    align-items: stretch;
  }
  .admin-condition-field {
    display: grid;
    align-content: start;
    gap: var(--space-1);
    min-width: 0;
    min-height: 186px;
    padding: 14px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: #ffffff;
  }
  .admin-condition-field-title {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .admin-condition-field .segmented,
  .admin-condition-field .chips {
    margin: 0;
  }
  .admin-condition-detail-card {
    grid-template-rows: auto auto 1fr;
  }
  .admin-condition-detail-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
  }
  .admin-condition-detail-card .chips {
    gap: 8px;
  }
  .admin-condition-detail-card .condition-variant-option {
    flex: 1 1 86px;
  }
  .admin-condition-detail-card .condition-static-note {
    min-height: 54px;
    margin-top: 4px;
  }
  .admin-extension-toggle {
    margin-bottom: 4px;
  }
  .condition-label-link {
    flex: 0 0 auto;
    min-height: 36px;
    padding: 0 12px;
    font-size: var(--font-size-caption);
  }
  .admin-condition-submit {
    grid-column: 1 / -1;
    display: flex;
    align-items: end;
    justify-content: flex-end;
  }
  .admin-pyeong-select {
    max-width: none;
  }
  .admin-pyeong-select .custom-select-menu {
    z-index: 45;
  }
  .admin-pyeong-panel p {
    margin: 0;
  }
  .template-list-panel {
    display: grid;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .template-list-panel > div:first-child {
    display: grid;
    gap: 4px;
  }
  .template-list {
    display: grid;
    gap: var(--space-1);
  }
  .template-list-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: var(--space-1);
    align-items: center;
    padding: 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .template-list-row span {
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
  }
  .template-delete-button {
    width: 34px;
    min-height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid rgba(190, 62, 62, 0.22);
    border-radius: 999px;
    background: rgba(190, 62, 62, 0.05);
    color: #a33a3a;
  }
  .template-delete-button:hover:not(:disabled) {
    border-color: rgba(190, 62, 62, 0.38);
    background: rgba(190, 62, 62, 0.09);
  }
  .template-delete-modal .muted strong {
    color: var(--text-primary);
  }
  .admin-edit-panel {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .admin-edit-title {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: flex-start;
    padding: 2px 2px 0;
  }
  .admin-edit-title div {
    display: grid;
    gap: 4px;
  }
  .admin-edit-title strong {
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .admin-edit-title span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.5;
  }
  .admin-edit-title em {
    flex: 0 0 auto;
    padding: 6px 10px;
    border-radius: 9999px;
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-style: normal;
    font-weight: var(--font-weight-bold);
  }
  .admin-edit-current {
    display: grid;
    gap: 6px;
    padding: 14px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .admin-edit-current.active {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
  }
  .admin-edit-current span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .admin-edit-current strong {
    color: var(--text-primary);
    font-size: 22px;
    line-height: 1.35;
  }
  .admin-edit-current p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.55;
  }
  .admin-catalog-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
    align-items: center;
    padding: 12px 14px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .admin-catalog-actions div {
    display: grid;
    gap: 4px;
  }
  .admin-catalog-actions strong {
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .admin-catalog-actions span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.45;
  }
  .admin-bottom-add-category {
    display: flex;
    justify-content: center;
    padding: 14px;
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .admin-bottom-add-category .secondary-button {
    min-width: 180px;
  }
  .admin-empty-edit-notice {
    border: 1px dashed var(--border-default);
    background: var(--bg-surface);
  }
  .admin-empty-edit-notice strong {
    display: block;
    margin-bottom: 6px;
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .condition-label-panel {
    display: grid;
    gap: var(--space-2);
  }
  .condition-label-guide {
    display: grid;
    gap: 4px;
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .condition-label-guide strong {
    color: var(--text-primary);
  }
  .condition-label-guide span {
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .condition-label-list {
    display: grid;
    gap: var(--space-1);
  }
  .condition-label-row {
    display: grid;
    grid-template-columns: 92px minmax(180px, 1fr) minmax(220px, 1.4fr);
    gap: var(--space-1);
    align-items: end;
    padding: var(--space-1);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
  }
  .condition-label-row > strong {
    align-self: center;
    color: var(--brand-primary);
  }
  .condition-label-row label {
    display: grid;
    gap: 6px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .status-box, .error-box {
    margin-bottom: var(--space-2);
    padding: 12px 14px;
    border-radius: var(--radius-button);
    font-weight: var(--font-weight-semibold);
    animation: formate-feedback-in 0.18s ease both;
  }
  .status-box {
    border: 1px solid var(--border-subtle);
    background: var(--bg-subtle);
    color: var(--text-primary);
  }
  .error-box {
    border: 1px solid var(--color-danger-border);
    background: var(--color-danger-subtle);
    color: var(--color-danger);
  }
  .success-box {
    margin-bottom: var(--space-2);
    padding: 12px 14px;
    border: 1px solid var(--color-success-border);
    border-radius: var(--radius-button);
    background: var(--color-success-bg);
    color: var(--color-success);
    font-weight: var(--font-weight-semibold);
    animation: formate-feedback-in 0.18s ease both;
  }
  @keyframes formate-feedback-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .success-box p,
  .error-box p {
    margin: 6px 0 0;
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .info-box {
    margin-bottom: var(--space-2);
    padding: 12px 14px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-weight: var(--font-weight-semibold);
  }
  .compact-button {
    min-height: 36px;
    padding: 8px 11px;
    font-size: var(--font-size-body-sm);
  }
  .photo-management-panel {
    width: 100%;
    display: grid;
    gap: var(--space-3);
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .photo-management-page .ui-page-header {
    margin-bottom: 0;
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }
  .photo-storage-note {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1) var(--space-1-5);
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--color-text-muted);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .photo-storage-note svg {
    color: var(--color-text-muted);
  }
  .photo-autosave-status {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    margin-bottom: var(--space-2);
    padding: var(--space-1) var(--space-1-5);
    border: 1px solid var(--color-info-border);
    border-radius: var(--radius-button);
    background: var(--color-info-bg);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-caption);
  }
  .photo-autosave-status span {
    color: var(--color-info);
  }
  .photo-autosave-status.saving span {
    color: var(--color-text-secondary);
  }
  .photo-autosave-status.error {
    border-color: var(--color-danger-border);
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }
  .photo-autosave-status.error span {
    color: var(--color-danger);
  }
  .photo-tabs {
    display: inline-flex;
    gap: var(--space-1);
    margin-bottom: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
  .photo-tabs button {
    min-height: var(--button-height-sm);
    padding: 0 var(--space-1-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-body);
  }
  .photo-tabs button:hover,
  .photo-tabs button:focus-visible {
    border-color: var(--color-border-strong);
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    outline: none;
  }
  .photo-tabs button.active {
    border-color: var(--color-primary);
    background: var(--color-primary-soft);
    color: var(--color-primary);
    box-shadow: none;
  }
  .photo-tab-panel,
  .photo-collection-list,
  .photo-subitem-groups {
    display: grid;
    gap: var(--space-3);
  }
  .photo-section-header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: center;
    padding-bottom: var(--space-1-5);
    border-bottom: 1px solid var(--color-border);
  }
  .photo-section-header h3,
  .photo-subitem-group h3 {
    margin: 0 0 var(--space-0-5);
    color: var(--color-text-primary);
    font-size: var(--font-size-section-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-section-title);
  }
  .photo-collection-card,
  .photo-subitem-group {
    overflow: hidden;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: none;
    transition: border-color 150ms ease, background-color 150ms ease;
  }
  .photo-collection-card:hover,
  .photo-subitem-group:hover {
    border-color: var(--color-border-strong);
    box-shadow: none;
  }
  .photo-collection-title-row {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) auto 36px auto;
    gap: var(--space-1);
    align-items: center;
    margin-bottom: 0;
    padding: var(--space-1-5);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-subtle);
  }
  .photo-collection-title-row input {
    min-width: 0;
    height: var(--button-height-sm);
    border: 1px solid transparent;
    border-bottom-color: var(--color-border);
    border-radius: 0;
    padding: 0 var(--space-1);
    background: transparent;
    color: var(--color-text-primary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-body);
  }
  .photo-collection-title-row input:hover {
    border-bottom-color: var(--color-border-strong);
  }
  .photo-collection-title-row input:focus {
    border-color: var(--color-primary);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    box-shadow: none;
    outline: none;
  }
  .photo-collection-delete-button {
    width: var(--button-height-sm);
    height: var(--button-height-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-danger);
    cursor: pointer;
  }
  .photo-collection-delete-button:hover,
  .photo-collection-delete-button:focus-visible {
    background: var(--color-danger-bg);
    outline: none;
  }
  .photo-collection-delete-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .danger-text {
    color: var(--color-danger);
  }
  .photo-upload-button {
    position: relative;
    min-height: var(--button-height-sm);
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-1);
    padding: 0 var(--space-1-5);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-body);
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, box-shadow 150ms ease;
  }
  .photo-upload-button:hover,
  .photo-upload-button:focus-within {
    border-color: var(--color-border-strong);
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    box-shadow: none;
    outline: none;
  }
  .photo-upload-button input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .photo-upload-button.disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .photo-upload-button.disabled input {
    cursor: not-allowed;
  }
  .photo-empty-inline {
    padding: 13px;
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    text-align: center;
  }
  .photo-empty-state {
    min-height: 144px;
    display: grid;
    place-items: center;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    text-align: center;
  }
  .photo-tab-panel .compact-empty,
  .photo-collection-card > .photo-empty-state {
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
  }
  .photo-collection-card > .photo-thumb-grid,
  .photo-collection-card > .photo-empty-state {
    margin: var(--space-1-5);
  }
  .photo-thumb-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--space-1);
  }
  .photo-thumb-card {
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease;
  }
  .photo-thumb-card:hover {
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-hover);
  }
  .photo-thumb-card.primary {
    border-color: var(--color-success-border);
    background: var(--color-success-bg);
  }
  .photo-thumb-image {
    position: relative;
    aspect-ratio: 4 / 3;
    display: grid;
    place-items: center;
    background: var(--color-surface-subtle);
    color: var(--color-text-muted);
  }
  .photo-thumb-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .photo-thumb-image span {
    position: absolute;
    top: var(--space-1);
    left: var(--space-1);
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 var(--space-1);
    border: 1px solid var(--color-success-border);
    border-radius: var(--radius-badge);
    background: var(--color-success-bg);
    color: var(--color-success);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-caption);
  }
  .photo-thumb-meta {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-1);
  }
  .photo-thumb-meta p {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .photo-thumb-actions {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-0-5);
  }
  .photo-thumb-actions button {
    min-height: var(--button-height-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-caption);
  }
  .photo-thumb-actions button:hover:not(:disabled),
  .photo-thumb-actions button:focus-visible {
    border-color: var(--color-border-strong);
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    outline: none;
  }
  .photo-thumb-actions button:disabled {
    opacity: 0.44;
  }
  .photo-thumb-actions button.danger {
    color: var(--color-danger);
  }
  .photo-thumb-actions button.danger:hover:not(:disabled),
  .photo-thumb-actions button.danger:focus-visible {
    border-color: var(--color-danger-border);
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }
  .compact-empty {
    min-height: 132px;
    margin-top: 0;
    padding: var(--space-3);
  }
  .photo-subitem-table {
    display: grid;
    gap: var(--space-1);
  }
  .photo-subitem-group-toggle {
    width: 100%;
    min-height: var(--table-row-height);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
    padding: 0 var(--space-1-5);
    background: transparent;
    color: var(--color-text-primary);
    text-align: left;
    border-radius: 0;
  }
  .photo-subitem-group-toggle:hover,
  .photo-subitem-group-toggle:focus-visible {
    color: var(--color-primary);
    outline: none;
  }
  .photo-subitem-group-toggle span {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-1);
    min-width: 0;
  }
  .photo-subitem-group-toggle strong {
    font-size: var(--font-size-section-title);
    line-height: var(--line-height-section-title);
  }
  .photo-subitem-group-toggle em {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-style: normal;
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-caption);
  }
  .photo-subitem-group.expanded {
    border-color: var(--color-primary-border);
  }
  .photo-subitem-group.expanded .photo-subitem-table {
    margin-top: 0;
    padding: var(--space-1-5);
    border-top: 1px solid var(--color-border);
  }
  .photo-subitem-header,
  .photo-subitem-row {
    display: grid;
    grid-template-columns: minmax(180px, 0.8fr) minmax(280px, 1.6fr) 130px;
    gap: var(--space-1);
    align-items: start;
  }
  .photo-subitem-header {
    min-height: var(--table-header-height);
    align-items: center;
    padding: 0 var(--space-table-cell-x);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card) var(--radius-card) 0 0;
    background: var(--color-header-bg);
    color: var(--color-text-secondary);
    font-size: var(--font-size-table-header);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-table-header);
    letter-spacing: var(--letter-spacing-table-header);
  }
  .photo-subitem-row {
    padding: var(--space-1-5);
    border: 1px solid var(--color-border);
    border-radius: 0;
    background: var(--color-surface);
    transition: border-color 150ms ease, background-color 150ms ease;
  }
  .photo-subitem-row:nth-child(even) {
    background: var(--color-row-alt);
  }
  .photo-subitem-row:hover {
    border-color: var(--color-border-strong);
    background: var(--color-row-alt);
  }
  .photo-subitem-name {
    display: grid;
    gap: var(--space-0-5);
    min-width: 0;
  }
  .photo-subitem-name strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--color-text-primary);
    font-size: var(--font-size-table-cell);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-table-cell);
  }
  .photo-subitem-name span,
  .photo-subitem-upload p,
  .photo-count-line {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .photo-subitem-manage {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }
  .photo-count-line {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    font-variant-numeric: tabular-nums;
    font-weight: var(--font-weight-medium);
  }
  .photo-subitem-upload {
    display: grid;
    gap: var(--space-label-gap);
    justify-items: start;
  }
  .photo-subitem-upload p {
    margin: 0;
  }
  .admin-tool-panel {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) auto auto;
    gap: var(--space-1);
    align-items: center;
    margin-bottom: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .admin-search-field {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-1);
    align-items: center;
    height: var(--button-height);
    min-height: var(--button-height);
    padding: 0 var(--space-input-x);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-input);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
  }
  .admin-search-field:focus-within {
    border-color: var(--color-primary);
    background: var(--color-surface);
    box-shadow: none;
  }
  .admin-search-field input {
    width: 100%;
    min-width: 0;
    height: 100%;
    min-height: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--color-text-primary);
    outline: none;
  }
  .admin-search-field input:focus {
    box-shadow: none;
  }
  .admin-favorite-filter {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: var(--button-height-sm);
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }
  .admin-favorite-filter input {
    width: 16px;
    min-height: 16px;
  }
  .admin-tool-actions {
    display: inline-flex;
    gap: var(--space-1);
  }
  .admin-list {
    display: grid;
    gap: var(--space-2);
  }
  .admin-item-card {
    position: relative;
    padding: var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
    transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease, background 150ms ease, opacity 150ms ease;
  }
  .admin-item-card:hover {
    border-color: var(--border-default);
    box-shadow: var(--shadow-md);
  }
  .admin-item-header {
    display: grid;
    grid-template-columns: 28px 34px minmax(180px, 1fr) auto 42px 42px;
    gap: var(--space-1);
    align-items: center;
  }
  .drag-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 34px;
    border-radius: 10px;
    color: var(--text-tertiary);
    font-weight: 800;
    letter-spacing: 0;
    cursor: default;
    user-select: none;
    transition: color 150ms ease, background 150ms ease, transform 150ms ease;
  }
  .drag-handle.enabled {
    cursor: grab;
  }
  .drag-handle.enabled:hover,
  .drag-handle.enabled:focus-visible {
    background: var(--bg-subtle);
    color: var(--brand-primary);
  }
  .drag-handle.enabled:active {
    cursor: grabbing;
  }
  .icon-button, .danger-button {
    width: 42px;
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-button);
  }
  .icon-button {
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-secondary);
  }
  .favorite-button {
    width: 34px;
    min-height: 34px;
    border-color: transparent;
    background: transparent;
    color: var(--text-tertiary);
  }
  .favorite-button:hover,
  .favorite-button:focus-visible {
    border-color: var(--border-subtle);
    background: var(--bg-subtle);
    color: var(--text-secondary);
  }
  .expand-button {
    background: var(--bg-subtle);
  }
  .icon-button.active {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
  }
  .icon-button.favorite-button.active {
    border-color: rgba(43, 53, 104, 0.16);
    background: rgba(244, 246, 255, 0.72);
    color: var(--brand-primary);
  }
  .danger-button {
    border: 1px solid var(--color-danger-border);
    background: var(--bg-surface);
    color: var(--color-danger);
  }
  .name-input {
    font-weight: var(--font-weight-bold);
  }
  .admin-item-name-field {
    display: grid;
    gap: 5px;
    min-width: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .admin-item-name-field input {
    width: 100%;
  }
  .admin-material-name-field {
    min-width: 0;
  }
  .admin-item-title {
    min-width: 0;
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .admin-item-placeholder {
    min-width: 0;
  }
  .admin-readonly-material {
    display: grid;
    gap: 4px;
    align-self: center;
    min-width: 0;
  }
  .admin-readonly-material strong {
    color: var(--text-primary);
    font-size: var(--font-size-body);
  }
  .admin-readonly-material span {
    width: fit-content;
    padding: 3px 8px;
    border: 1px solid var(--border-subtle);
    border-radius: 9999px;
    background: var(--bg-surface);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .type-badge {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }
  .admin-bulk-panel {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 8px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--brand-primary-subtle);
  }
  .admin-bulk-title {
    flex: 0 0 auto;
    min-width: 118px;
  }
  .admin-bulk-panel strong {
    color: var(--text-primary);
    font-size: 13px;
    line-height: 1.2;
  }
  .admin-bulk-panel label {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: var(--font-weight-bold);
    white-space: nowrap;
  }
  .admin-bulk-actions {
    display: flex;
    flex: 0 0 auto;
    justify-content: flex-start;
  }
  .admin-bulk-actions .secondary-button {
    min-height: 32px;
    padding: 6px 10px;
    font-size: 13px;
  }
  .danger-text-button {
    color: var(--color-danger);
  }
  .admin-add-subitem-row strong {
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
  }
  .admin-add-subitem-row span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.45;
  }
  .flooring-thickness-list {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }
  .flooring-spec-guide {
    display: grid;
    gap: 4px;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .flooring-spec-guide strong {
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
  }
  .flooring-spec-guide span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.45;
  }
  .flat-subitem-name {
    min-height: 44px;
    display: flex;
    align-items: center;
    color: var(--text-primary);
  }
  .price-item-header {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) 240px;
    gap: var(--space-2);
    align-items: end;
    margin-bottom: 12px;
  }
  .price-item-header strong {
    font-size: var(--font-size-title-sm);
  }
  .price-item-header label, .price-row label {
    display: grid;
    gap: 6px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .price-grid {
    display: grid;
    gap: var(--space-1);
  }
  .price-row {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) 140px 180px;
    gap: var(--space-1);
    align-items: end;
    padding: 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .price-row span {
    align-self: center;
    font-weight: var(--font-weight-semibold);
  }
  .detail-cost-layout {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: var(--space-2);
  }
  .detail-subitem-panel, .detail-cost-panel {
    padding: var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .detail-subitem-panel h3, .detail-cost-panel h3 {
    margin: 0 0 8px;
  }
  .detail-group-list {
    display: grid;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }
  .detail-group {
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    overflow: hidden;
  }
  .detail-group.expanded {
    border-color: var(--brand-accent-line);
  }
  .detail-group-toggle {
    width: 100%;
    min-height: 46px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
    padding: 10px 12px;
    background: transparent;
    color: var(--text-primary);
    text-align: left;
  }
  .detail-group-toggle span {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .detail-group-toggle strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .detail-group-toggle em {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-style: normal;
    font-weight: var(--font-weight-semibold);
  }
  .detail-subitem-list {
    display: grid;
    gap: 6px;
    padding: 0 10px 10px;
  }
  .detail-subitem-list button {
    display: grid;
    gap: 4px;
    padding: 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    color: var(--text-primary);
    text-align: left;
    transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
  }
  .detail-subitem-list button:hover {
    border-color: var(--border-default);
    box-shadow: var(--shadow-sm);
  }
  .detail-subitem-list button.selected {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
  }
  .detail-subitem-list span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .detail-cost-title {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: flex-start;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .detail-cost-title span {
    padding: 6px 8px;
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .detail-add-row {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) 128px 150px auto;
    gap: var(--space-1);
    margin: var(--space-2) 0;
  }
  .detail-bulk-panel {
    display: grid;
    grid-template-columns: minmax(240px, 1fr) 140px minmax(230px, auto);
    gap: var(--space-1);
    align-items: end;
    margin-bottom: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--brand-primary-subtle);
  }
  .detail-bulk-panel > div {
    display: grid;
    gap: 4px;
  }
  .detail-bulk-panel strong {
    color: var(--text-primary);
  }
  .detail-bulk-panel span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.5;
  }
  .detail-bulk-panel label {
    display: grid;
    gap: 6px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .detail-bulk-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
  }
  .detail-cost-list {
    display: grid;
    gap: var(--space-1);
  }
  .detail-cost-header {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) 128px 230px 42px;
    gap: var(--space-1);
    padding: 0 10px;
    color: var(--text-tertiary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .detail-cost-row {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) 128px 230px 42px;
    gap: var(--space-1);
    align-items: center;
    padding: 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .detail-type-toggle {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-1);
  }
  .detail-type-toggle label {
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 8px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .detail-type-toggle label.selected {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
  }
  .detail-type-toggle input {
    width: 14px;
    min-height: 14px;
  }
  .estimate-search-panel {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) auto;
    gap: var(--space-1);
    align-items: end;
    margin-bottom: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: none;
  }
  .estimate-search-panel label {
    display: grid;
    gap: var(--space-label-gap);
    font-weight: var(--font-weight-medium);
  }
  .estimate-search-panel label span,
  .estimate-result-count {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-caption);
  }
  .estimate-result-count {
    min-height: var(--button-height);
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    white-space: nowrap;
  }
  .saved-estimate-search-skeleton {
    display: block;
    width: 100%;
    height: var(--button-height);
    border-radius: var(--radius-input);
    background: var(--color-surface-subtle);
  }
  .saved-estimate-cell-skeleton {
    display: block;
    width: 64%;
    height: 8px;
    border-radius: var(--radius-badge);
    background: var(--color-border);
    opacity: 0.56;
  }
  .ui-table__cell--right .saved-estimate-cell-skeleton {
    margin-left: auto;
  }
  .estimate-list {
    display: grid;
    gap: var(--space-2);
    background: transparent;
    box-shadow: none;
  }
  .estimate-card {
    display: grid;
    grid-template-columns: minmax(220px, 1.2fr) minmax(180px, 0.75fr) 150px auto;
    gap: var(--space-1);
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    box-shadow: none;
    transition: background-color 150ms ease;
  }
  .estimate-card:last-child {
    border-bottom: 0;
  }
  .estimate-card:hover {
    background: var(--bg-muted);
  }
  .estimate-card strong {
    display: block;
    margin-bottom: 4px;
    font-size: var(--font-size-body);
  }
  .estimate-card p {
    margin: 0;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .estimate-card-main,
  .estimate-card-meta {
    min-width: 0;
  }
  .estimate-card-meta {
    display: grid;
    gap: 4px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .estimate-amount {
    font-size: var(--font-size-title-sm);
    font-weight: var(--font-weight-bold);
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .estimate-card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
  }
  .estimate-card-actions .secondary-button,
  .estimate-card-actions .ghost {
    min-height: 34px;
    padding: 0 10px;
    font-size: var(--font-size-caption);
  }
  .estimate-empty-state {
    padding: var(--space-3);
    text-align: center;
    background: var(--color-surface);
  }
  .estimate-empty-state p {
    margin: 0;
  }
  .modal-actions {
    justify-content: flex-start;
    margin-bottom: var(--space-2);
  }
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    padding: var(--space-3);
    background: var(--bg-modal-overlay);
  }
  .estimate-modal {
    width: min(860px, 100%);
    max-height: 86vh;
    overflow: auto;
    padding: var(--space-3);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-md);
  }
  .estimate-modal h3 {
    margin: 0 0 8px;
    font-size: var(--font-size-title-md);
  }
  .json-preview {
    overflow: auto;
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--text-primary);
    color: var(--bg-subtle);
  }
  .workspace {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: var(--space-3);
    max-width: 1180px;
    margin: 0 auto;
    padding: var(--space-4) var(--space-3);
  }
  .estimate-selected-condition-panel {
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--brand-primary);
    border-radius: var(--radius-card);
    background: var(--brand-primary-subtle);
    box-shadow: var(--shadow-sm);
  }
  .estimate-selected-condition-panel div {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .estimate-selected-condition-panel span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .estimate-selected-condition-panel strong {
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
    line-height: 1.4;
  }
  .estimate-selected-condition-panel p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
  }
  .category-column, .editor {
    padding: var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .category-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
  .category-title-row h2 {
    margin-bottom: 4px;
  }
  .estimate-header-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
  .estimate-header-actions .primary-button,
  .estimate-header-actions .secondary-button {
    width: auto;
    min-width: 128px;
    min-height: 40px;
    padding: 0 12px;
  }
  .category-grid {
    display: grid;
    gap: var(--space-1);
    margin: var(--space-3) 0;
  }
  .condition-chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 4px 0 var(--space-2);
  }
  .condition-chip-group span {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 6px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: 9999px;
    background: var(--bg-subtle);
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
    line-height: 1;
  }
  .estimate-pyeong-panel {
    display: grid;
    gap: var(--space-1);
    margin: 0 0 var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .condition-variant-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
    margin-bottom: 8px;
  }
  .condition-variant-card-head .field-label {
    margin: 0;
  }
  .condition-variant-label-editor {
    display: grid;
    gap: var(--space-1);
    margin-top: var(--space-1);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-subtle);
  }
  .condition-variant-label-editor > div:first-child {
    display: grid;
    gap: 4px;
  }
  .condition-variant-label-editor strong {
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
  }
  .condition-variant-label-editor span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.5;
  }
  .condition-variant-label-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--space-1);
  }
  .condition-variant-label-grid label {
    display: grid;
    gap: 6px;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .condition-variant-label-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
  }
  .estimate-pyeong-panel label {
    font-weight: var(--font-weight-bold);
  }
  .estimate-pyeong-panel p {
    margin: 4px 0 0;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.5;
  }
  .estimate-pyeong-controls {
    display: grid;
    gap: var(--space-1);
  }
  .estimate-pyeong-input {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 6px;
    min-height: 42px;
    padding: 0 10px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .estimate-pyeong-input:focus-within {
    border-color: var(--brand-primary);
    background: var(--bg-surface);
  }
  .estimate-pyeong-input input {
    width: 100%;
    min-width: 0;
    min-height: 38px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font-weight: var(--font-weight-bold);
    text-align: right;
  }
  .estimate-pyeong-input input:focus {
    outline: none;
  }
  .estimate-pyeong-input span {
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
  }
  .category-card {
    min-height: 66px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-body);
    transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
  }
  .category-card:hover {
    border-color: var(--border-default);
    box-shadow: var(--shadow-sm);
  }
  .category-card.selected {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
  }
  .total-box {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-2);
    border-radius: var(--radius-card);
    border: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
  }
  .total-box span {
    color: var(--text-secondary);
  }
  .total-box strong {
    font-size: 28px;
    font-weight: var(--font-weight-bold);
    color: var(--brand-primary);
  }
  .category-back-button {
    width: 100%;
    margin-top: var(--space-2);
  }
  .editor-header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: center;
    min-height: 56px;
    margin-bottom: var(--space-2);
    padding-bottom: var(--space-1);
    border-bottom: 1px solid var(--border-subtle);
  }
  .admin-last-updated-pill {
    width: fit-content;
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    margin-top: 8px;
    padding: 4px 10px;
    border: 1px solid rgba(43, 53, 104, 0.12);
    border-radius: 999px;
    background: rgba(244, 246, 255, 0.72);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .autosave-pill {
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    padding: 6px 11px;
    border: 1px solid var(--border-subtle);
    border-radius: 999px;
    background: #f8fafc;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
    white-space: nowrap;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .autosave-pill.dirty,
  .autosave-pill.saving {
    border-color: rgba(43, 53, 104, 0.16);
    background: rgba(244, 246, 255, 0.8);
    color: var(--brand-primary);
  }
  .autosave-pill.saved {
    background: #ffffff;
    color: var(--text-secondary);
    animation: formate-feedback-in 0.18s ease both;
  }
  .autosave-pill.error {
    border-color: var(--color-danger-border);
    background: var(--color-danger-subtle);
    color: var(--color-danger);
  }
  .material-list {
    display: grid;
    gap: var(--space-1);
    --estimate-row-grid: 28px minmax(160px, 1.2fr) 78px 70px 40px minmax(152px, 170px) 74px 44px;
  }
  .material-row {
    display: grid;
    grid-template-columns: minmax(140px, 1fr) 150px 160px;
    gap: var(--space-1);
    align-items: center;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
  }
  .estimate-template-row {
    display: grid;
    grid-template-rows: auto 0fr;
    gap: 0;
    align-items: stretch;
    max-width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease, grid-template-rows 220ms ease;
  }
  .estimate-template-row.expanded {
    grid-template-rows: auto 1fr;
    gap: var(--space-2);
  }
  .estimate-template-row.selected {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
  }
  .estimate-template-row > * {
    min-width: 0;
  }
  .estimate-row-header {
    display: grid;
    grid-template-columns: var(--estimate-row-grid);
    gap: 6px;
    align-items: center;
    padding: 0 10px 4px;
    color: var(--text-tertiary);
    font-size: 11px;
    font-weight: var(--font-weight-bold);
  }
  .estimate-row-header span {
    min-width: 0;
    text-align: center;
    white-space: nowrap;
  }
  .estimate-row-header span:nth-child(2) {
    text-align: left;
  }
  .estimate-template-main {
    display: grid;
    grid-template-columns: var(--estimate-row-grid);
    align-items: stretch;
    gap: 6px;
    width: 100%;
    min-width: 0;
    overflow: hidden;
  }
  .estimate-row-cell {
    box-sizing: border-box;
    min-width: 0;
    min-height: 0;
    height: 36px;
    display: flex;
    align-items: center;
    padding: 6px 8px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: #ffffff;
    color: var(--text-primary);
    overflow: hidden;
  }
  .estimate-row-check-cell {
    justify-content: center;
    padding: 0;
    border-color: transparent;
    background: transparent;
  }
  .estimate-row-check-cell input {
    width: 18px;
    min-height: 18px;
    margin: 0;
  }
  .estimate-row-name-cell {
    justify-content: space-between;
    gap: 6px;
    min-width: 0;
  }
  .estimate-row-name-cell strong {
    display: -webkit-box;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-bold);
    line-height: 1.3;
  }
  .estimate-row-spec-cell,
  .estimate-row-unit-cell {
    justify-content: center;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
    text-align: center;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .estimate-row-spec-cell {
    padding-left: 6px;
    padding-right: 6px;
  }
  .estimate-row-spec-cell select {
    width: 100%;
    min-width: 0;
    min-height: 0;
    height: 100%;
    padding: 0 4px;
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .estimate-row-unit-cell {
    padding-left: 4px;
    padding-right: 4px;
  }
  .estimate-row-spec-cell.empty {
    color: var(--text-tertiary);
  }
  .estimate-row-quantity-cell {
    padding: 0;
  }
  .estimate-row-quantity-cell input {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    min-height: 0;
    height: 100%;
    padding: 0 8px;
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-bold);
    line-height: 1;
    text-align: right;
  }
  .estimate-row-quantity-cell:focus-within {
    border-color: var(--brand-primary);
    box-shadow: none;
  }
  .estimate-row-total-cell {
    justify-content: flex-end;
    color: var(--brand-primary);
    font-weight: var(--font-weight-bold);
    text-align: right;
    white-space: nowrap;
    padding-left: 8px;
    padding-right: 8px;
  }
  .estimate-row-total-cell .number-text {
    max-width: 100%;
    justify-content: flex-end;
    overflow: hidden;
    font-size: 15px;
  }
  .estimate-row-total-cell .number-text-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .estimate-photo-button,
  .estimate-expand-toggle {
    justify-content: center;
    cursor: pointer;
  }
  .estimate-photo-button {
    min-width: 0;
    padding-left: 5px;
    padding-right: 5px;
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }
  .estimate-expand-toggle {
    min-width: 0;
    padding-left: 0;
    padding-right: 0;
  }
  .estimate-photo-button:hover,
  .estimate-photo-button:focus-visible,
  .estimate-photo-button.active,
  .estimate-expand-toggle:hover,
  .estimate-expand-toggle:focus-visible {
    border-color: var(--brand-primary);
    color: var(--brand-primary);
  }
  .photo-preview-message {
    margin-bottom: var(--space-1);
    padding: 9px 11px;
    border: 1px solid var(--brand-accent-line);
    border-radius: var(--radius-card);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
  }
  .estimate-item-photo-panel {
    margin-top: 8px;
    padding: 10px;
    border: 1px solid var(--brand-accent-line);
    border-radius: var(--radius-card);
    background: var(--brand-primary-subtle);
  }
  .estimate-item-photo-header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-1);
    align-items: flex-start;
    margin-bottom: 8px;
  }
  .estimate-item-photo-header strong {
    color: var(--brand-primary);
    font-size: var(--font-size-body);
  }
  .estimate-item-photo-header p {
    margin: 3px 0 0;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .estimate-item-photo-panel .photo-empty-inline {
    background: var(--bg-surface);
  }
  .estimate-item-photo-panel .photo-empty-inline span {
    display: block;
    margin-top: 4px;
  }
  .estimate-item-photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    gap: 8px;
  }
  .estimate-item-photo-grid figure {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .estimate-item-photo-grid figure.primary {
    border-color: var(--brand-primary);
  }
  .estimate-item-photo-grid .estimate-item-photo-thumb {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: var(--bg-subtle);
    color: var(--text-tertiary);
    cursor: zoom-in;
  }
  .estimate-item-photo-grid img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
  .estimate-item-photo-grid .estimate-item-photo-thumb span {
    position: absolute;
    top: 6px;
    left: 6px;
    padding: 3px 6px;
    border-radius: var(--radius-button);
    background: var(--brand-primary);
    color: white;
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-bold);
  }
  .estimate-item-photo-grid figcaption {
    padding: 6px 7px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .estimate-template-row.missing-template {
    background: var(--bg-surface);
  }
  .selected-badge {
    flex: 0 0 auto;
    padding: 6px 8px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .estimate-row-badges {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .modified-badge,
  .modified-inline-badge {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 4px 7px;
    border: 1px solid var(--brand-accent-line);
    border-radius: var(--radius-button);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
    line-height: 1;
    white-space: nowrap;
  }
  .modified-inline-badge {
    min-height: 20px;
    margin-left: 6px;
    padding: 3px 6px;
    vertical-align: middle;
  }
  .estimate-template-expand {
    overflow: hidden;
    min-height: 0;
    opacity: 0;
    transform: translateY(-4px);
    transition: opacity 180ms ease, transform 220ms ease;
  }
  .estimate-template-row.expanded .estimate-template-expand {
    opacity: 1;
    transform: translateY(0);
  }
  .estimate-template-expanded-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
    align-items: end;
    padding-top: 0;
  }
  .estimate-template-detail {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    min-width: 0;
  }
  .estimate-template-detail div {
    display: grid;
    gap: 3px;
    min-width: 0;
    padding: 7px 9px;
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    background: var(--bg-subtle);
  }
  .estimate-template-detail span,
  .estimate-template-total span {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: var(--font-weight-semibold);
  }
  .estimate-draft-field {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 6px;
  }
  .estimate-draft-field input {
    width: 100%;
    min-width: 0;
    min-height: 24px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: var(--font-weight-bold);
    text-align: right;
  }
  .estimate-draft-field select {
    width: 100%;
    min-width: 0;
    min-height: 24px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: var(--font-weight-bold);
    text-align: right;
  }
  .estimate-draft-field input:focus {
    outline: none;
  }
  .estimate-contractor-field input {
    text-align: left;
  }
  .estimate-draft-field select:focus {
    outline: none;
  }
  .estimate-draft-field:focus-within {
    border-radius: 4px;
    box-shadow: inset 0 -1px 0 var(--brand-primary);
  }
  .estimate-draft-field em {
    color: var(--text-secondary);
    font-style: normal;
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }
  .template-missing {
    grid-column: 1 / -1;
    margin: 0;
    padding: 10px 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    font-size: var(--font-size-body-sm);
  }
  .estimate-start-guide {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    margin: 8px 0 0;
    padding: 8px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: 999px;
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: 1.4;
  }
  .estimate-template-total {
    min-width: 132px;
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: 6px;
    padding: 7px 9px;
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    background: #ffffff;
    text-align: right;
    color: var(--brand-primary);
  }
  .estimate-template-total .number-text {
    font-size: 14px;
  }
  .estimate-select-button {
    min-height: 36px;
    padding: 0 12px;
  }
  .estimate-template-detail .number-text,
  .estimate-template-total .number-text,
  .estimate-editor-total .number-text {
    white-space: nowrap;
  }
  .selected-item-summary {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .selected-summary-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
  }
  .selected-summary-header h3 {
    margin: 0;
    font-size: var(--font-size-title-sm);
  }
  .selected-summary-groups {
    display: grid;
    gap: var(--space-2);
  }
  .selected-summary-group {
    display: grid;
    gap: 8px;
  }
  .selected-summary-group > strong {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .selected-summary-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 30px;
    align-items: center;
    gap: var(--space-1);
    min-height: 38px;
    padding: 8px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .selected-summary-row > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-primary);
    font-weight: var(--font-weight-semibold);
  }
  .selected-summary-remove {
    width: 30px;
    min-height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--text-tertiary);
    font-size: 18px;
    line-height: 1;
  }
  .selected-summary-remove:hover,
  .selected-summary-remove:focus-visible {
    background: var(--bg-surface);
    color: var(--color-danger);
    outline: none;
  }
  .selected-summary-empty {
    margin: 0;
  }
  .estimate-adjustment-panel,
  .site-memo-panel,
  .saved-estimate-extra {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
    box-shadow: var(--shadow-sm);
  }
  .adjustment-list {
    display: grid;
    gap: var(--space-1);
  }
  .adjustment-row {
    display: grid;
    grid-template-columns: minmax(200px, 1.4fr) 108px 118px minmax(110px, auto) minmax(220px, 1fr) auto;
    gap: var(--space-1);
    align-items: center;
    padding: var(--space-1);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .adjustment-row input,
  .adjustment-row select {
    min-width: 0;
    background: var(--bg-surface);
  }
  .adjustment-visible-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 38px;
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }
  .adjustment-visible-toggle input {
    width: 16px;
    min-height: 16px;
  }
  .adjustment-delete-button {
    min-height: 38px;
    padding: 0 10px;
  }
  .site-memo-panel label {
    display: grid;
    gap: var(--space-1);
    font-weight: var(--font-weight-semibold);
  }
  .site-memo-panel textarea {
    width: 100%;
    min-height: 92px;
    resize: vertical;
  }
  .estimate-editor-total {
    position: sticky;
    bottom: var(--space-2);
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-surface-overlay);
    box-shadow: var(--shadow-sm);
  }
  .estimate-editor-total span {
    color: var(--text-secondary);
    font-weight: var(--font-weight-semibold);
  }
  .estimate-editor-total > div {
    display: grid;
    gap: 4px;
  }
  .estimate-editor-total .final-total {
    justify-items: end;
    text-align: right;
  }
  .signed-total {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    color: var(--brand-primary);
    font-weight: var(--font-weight-bold);
    white-space: nowrap;
  }
  .signed-total.negative {
    color: var(--color-danger);
  }
  .customer-adjustment-preview {
    display: grid;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }
  .customer-adjustment-preview h3,
  .saved-estimate-extra h4 {
    margin: 0;
    font-size: var(--font-size-title-sm);
  }
  .saved-estimate-extra p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.6;
  }
  .saved-adjustment-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 80px auto;
    gap: var(--space-1);
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid var(--border-subtle);
  }
  .saved-adjustment-row:last-child {
    border-bottom: 0;
  }
  .saved-adjustment-row em {
    grid-column: 1 / -1;
    color: var(--text-secondary);
    font-style: normal;
    font-size: var(--font-size-caption);
  }
  .thumb {
    min-height: 54px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .add-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }
  .form-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
  .form-grid label {
    display: grid;
    gap: var(--space-1);
    font-weight: var(--font-weight-semibold);
  }
  .compact-key {
    margin: var(--space-2) 0;
  }
  .estimate-pyeong-preview {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-1);
    margin: 0 0 var(--space-2);
  }
  .estimate-pyeong-preview div {
    display: grid;
    gap: 4px;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .estimate-pyeong-preview span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .estimate-construction-schedule {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-1);
    margin: 0 0 var(--space-2);
    padding: var(--space-1) 0;
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
  }
  .estimate-construction-schedule > span {
    color: var(--color-text-secondary);
    font-size: var(--font-size-table-cell);
    font-weight: var(--font-weight-medium);
  }
  .estimate-construction-schedule > strong {
    color: var(--color-text-primary);
    font-size: var(--font-size-table-cell);
    font-variant-numeric: tabular-nums;
    font-weight: var(--font-weight-semibold);
  }
  .estimate-construction-schedule > p {
    flex-basis: 100%;
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .estimate-meta-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-1);
    margin-bottom: var(--space-2);
  }
  .estimate-meta-grid div {
    display: grid;
    gap: 4px;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .estimate-meta-grid span {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-semibold);
  }
  .estimate-meta-grid strong {
    color: var(--text-primary);
    font-size: var(--font-size-body-sm);
  }
  .estimate-meta-grid em {
    color: var(--text-tertiary);
    font-size: var(--font-size-caption);
    font-style: normal;
  }
  .tax-note {
    margin: 8px 0 0;
    color: var(--text-tertiary);
    font-size: var(--font-size-caption);
  }
  .estimate-number-footer {
    margin-top: var(--space-2);
    color: var(--text-tertiary);
    font-size: var(--font-size-caption);
    text-align: right;
  }
  .estimate-note-box {
    display: grid;
    gap: 6px;
    margin-top: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-subtle);
  }
  .estimate-note-box strong {
    color: var(--text-primary);
  }
  .estimate-note-box p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.6;
  }
  .pdf-capture-area {
    padding: var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: var(--bg-surface);
  }
  .general-preview-page {
    background: #f3f5f8;
  }
  .general-preview-panel {
    width: min(1040px, 100%);
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }
  .general-preview-panel > .editor-header {
    margin-bottom: var(--space-2);
    padding: 14px 16px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: rgba(255, 255, 255, 0.92);
    box-shadow: var(--shadow-sm);
  }
  .general-preview-panel > .editor-header h2 {
    margin: 0;
    font-size: var(--font-size-title-md);
  }
  .general-preview-panel .estimate-header-actions .primary-button,
  .general-preview-panel .estimate-header-actions .secondary-button,
  .general-preview-panel .estimate-header-actions .ghost,
  .general-preview-panel .actions .primary-button,
  .general-preview-panel .actions .secondary-button {
    min-height: 38px;
    padding: 0 12px;
  }
  .general-preview-panel .actions {
    justify-content: flex-end;
    margin-top: var(--space-2);
  }
  .general-estimate-document {
    width: min(920px, 100%);
    margin: 0 auto;
    padding: 38px 42px;
    border: 1px solid #d9dee8;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 18px 56px rgba(23, 32, 51, 0.1);
  }
  .general-estimate-document .pdf-title-row {
    margin-bottom: 18px;
    padding-bottom: 18px;
    border-bottom: 2px solid var(--text-primary);
  }
  .general-estimate-document .pdf-title-row h3 {
    font-size: 28px;
    letter-spacing: 0;
  }
  .general-estimate-document .pdf-title-row .number-text {
    font-size: 30px;
    color: var(--brand-primary);
  }
  .general-estimate-document .estimate-meta-grid {
    grid-template-columns: minmax(130px, 1.1fr) minmax(160px, 1.3fr) repeat(3, minmax(110px, 1fr));
    gap: 8px;
    margin-bottom: 18px;
  }
  .general-estimate-document .estimate-meta-grid div,
  .general-estimate-document .estimate-pyeong-preview div,
  .general-estimate-document .compact-key,
  .general-estimate-document .estimate-note-box,
  .general-estimate-document .preview-site-memo,
  .general-estimate-document .estimate-adjustment-panel {
    border-color: #e2e7ef;
    background: #f8fafc;
    box-shadow: none;
  }
  .general-estimate-document .estimate-meta-grid strong {
    font-size: var(--font-size-body);
  }
  .general-estimate-document .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 16px;
    padding: 14px;
    border: 1px solid #e2e7ef;
    border-radius: 12px;
    background: #fbfcfe;
  }
  .general-estimate-document .form-grid label {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .general-estimate-document .form-grid input,
  .general-estimate-document .form-grid select,
  .general-estimate-document .preview-site-memo textarea {
    border-color: #dce3ee;
    background: #ffffff;
  }
  .general-estimate-document .compact-key,
  .general-estimate-document .estimate-pyeong-preview,
  .general-estimate-document .estimate-adjustment-panel,
  .general-estimate-document .preview-site-memo,
  .general-estimate-document .estimate-note-box {
    margin-top: 14px;
  }
  .general-estimate-document .general-estimate-table {
    margin-top: 18px;
    overflow: hidden;
    border: 1px solid #dfe5ee;
    border-radius: 10px;
  }
  .general-estimate-document .general-estimate-table th,
  .general-estimate-document .general-estimate-table td {
    padding: 13px 14px;
    border-color: #e4e9f1;
  }
  .general-estimate-document .general-estimate-table th {
    background: #f4f6fa;
    color: var(--text-secondary);
  }
  .general-estimate-document .general-estimate-table th:nth-child(3),
  .general-estimate-document .general-estimate-table th:nth-child(4),
  .general-estimate-document .general-estimate-table td:nth-child(3),
  .general-estimate-document .general-estimate-table td:nth-child(4),
  .general-estimate-document .general-estimate-table tfoot td:not(:first-child) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .general-estimate-document .general-estimate-table tbody tr:nth-child(even) td {
    background: #fbfcfe;
  }
  .general-estimate-document .general-estimate-table tfoot td {
    background: #f8fafc;
    font-weight: var(--font-weight-bold);
  }
  .general-estimate-document .general-estimate-table tfoot tr:last-child td {
    border-top: 2px solid var(--brand-primary);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-body);
  }
  .general-estimate-document .tax-note,
  .general-estimate-document .estimate-note-box p,
  .general-estimate-document .preview-site-memo label,
  .general-estimate-document .estimate-number-footer {
    color: var(--text-secondary);
  }
  .general-estimate-document .estimate-note-box strong,
  .general-estimate-document .customer-adjustment-preview h3,
  .general-estimate-document .estimate-adjustment-panel h3 {
    font-size: var(--font-size-title-sm);
  }
  .general-preview-panel svg {
    width: 18px;
    height: 18px;
    stroke-width: 1.5;
  }
  .detail-preview-page {
    background: #f4f6f9;
  }
  .detail-preview-panel {
    width: min(1180px, 100%);
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }
  .detail-preview-panel > .editor-header {
    margin-bottom: var(--space-2);
    padding: 14px 16px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card);
    background: rgba(255, 255, 255, 0.94);
    box-shadow: var(--shadow-sm);
  }
  .detail-preview-panel > .editor-header h2 {
    margin: 0;
    font-size: var(--font-size-title-md);
  }
  .detail-preview-panel .estimate-header-actions .primary-button,
  .detail-preview-panel .estimate-header-actions .secondary-button,
  .detail-preview-panel .estimate-header-actions .ghost,
  .detail-preview-panel .actions .primary-button,
  .detail-preview-panel .actions .secondary-button {
    min-height: 38px;
    padding: 0 12px;
  }
  .detail-preview-panel .actions {
    justify-content: flex-end;
    margin-top: var(--space-2);
  }
  .detail-estimate-document {
    width: min(1100px, 100%);
    margin: 0 auto;
    padding: 34px 36px;
    border: 1px solid #d8dee8;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 18px 56px rgba(23, 32, 51, 0.1);
  }
  .detail-estimate-document .pdf-title-row {
    margin-bottom: 18px;
    padding-bottom: 18px;
    border-bottom: 2px solid var(--brand-primary);
  }
  .detail-estimate-document .pdf-title-row h3 {
    font-size: 27px;
    letter-spacing: 0;
  }
  .detail-estimate-document .pdf-title-row .number-text {
    font-size: 29px;
    color: var(--brand-primary);
  }
  .detail-estimate-document .estimate-meta-grid {
    grid-template-columns: minmax(130px, 1fr) minmax(160px, 1.25fr) repeat(3, minmax(110px, 1fr));
    gap: 8px;
    margin-bottom: 16px;
  }
  .detail-estimate-document .estimate-meta-grid div,
  .detail-estimate-document .estimate-pyeong-preview div,
  .detail-estimate-document .compact-key,
  .detail-estimate-document .customer-adjustment-preview,
  .detail-estimate-document .estimate-note-box,
  .detail-estimate-document .preview-site-memo {
    border-color: #e1e7f0;
    background: #f8fafc;
    box-shadow: none;
  }
  .detail-estimate-document .form-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 16px;
    padding: 12px;
    border: 1px solid #e1e7f0;
    border-radius: 12px;
    background: #fbfcfe;
  }
  .detail-estimate-document .form-grid label {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .detail-estimate-document .form-grid input,
  .detail-estimate-document .form-grid select,
  .detail-estimate-document .preview-site-memo textarea {
    border-color: #dce3ee;
    background: #ffffff;
  }
  .detail-estimate-document .detail-estimate-groups {
    gap: 14px;
    margin-top: 18px;
  }
  .detail-estimate-document .detail-estimate-group {
    gap: 8px;
    padding: 12px;
    border: 1px solid #dfe5ee;
    border-radius: 12px;
    background: #fbfcfe;
  }
  .detail-estimate-document .detail-estimate-group h3 {
    display: flex;
    align-items: center;
    min-height: 30px;
    margin: 0;
    padding: 0 2px;
    color: var(--brand-primary);
    font-size: var(--font-size-title-sm);
  }
  .detail-estimate-document .detail-estimate-table {
    overflow: hidden;
    border: 1px solid #e1e7f0;
    border-radius: 10px;
  }
  .detail-estimate-document .detail-estimate-table th,
  .detail-estimate-document .detail-estimate-table td {
    padding: 11px 12px;
    border-color: #e5eaf2;
    vertical-align: middle;
  }
  .detail-estimate-document .detail-estimate-table th {
    background: #f2f5fa;
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
  }
  .detail-estimate-document .detail-estimate-table th:nth-child(n+3),
  .detail-estimate-document .detail-estimate-table td:nth-child(n+3) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .detail-estimate-document .detail-estimate-table tbody tr:nth-child(4n+3) td,
  .detail-estimate-document .detail-estimate-table tbody tr:nth-child(4n+4) td {
    background: #fdfefe;
  }
  .detail-estimate-document .detail-estimate-table tbody tr:hover td {
    background: var(--color-row-alt);
  }
  .detail-estimate-document .labor-detail-row td {
    color: var(--text-secondary);
    background: #f8fafc;
  }
  .detail-estimate-document .labor-detail-row td:nth-child(1),
  .detail-estimate-document .detail-estimate-table td:empty {
    color: var(--text-tertiary);
  }
  .detail-estimate-document .customer-adjustment-preview,
  .detail-estimate-document .preview-site-memo,
  .detail-estimate-document .estimate-note-box,
  .detail-estimate-document .estimate-pyeong-preview,
  .detail-estimate-document .compact-key {
    margin-top: 14px;
  }
  .detail-estimate-document .customer-adjustment-preview h3,
  .detail-estimate-document .estimate-note-box strong {
    font-size: var(--font-size-title-sm);
  }
  .detail-estimate-document .customer-adjustment-preview table th:nth-child(3),
  .detail-estimate-document .customer-adjustment-preview table td:nth-child(3) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .detail-estimate-document .tax-note,
  .detail-estimate-document .estimate-note-box p,
  .detail-estimate-document .preview-site-memo label,
  .detail-estimate-document .estimate-number-footer {
    color: var(--text-secondary);
  }
  .detail-preview-panel svg {
    width: 18px;
    height: 18px;
    stroke-width: 1.5;
  }
  .pdf-title-row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: flex-start;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border-subtle);
    margin-bottom: var(--space-2);
  }
  .pdf-title-row h3 {
    margin: 0;
    font-size: var(--font-size-title-lg);
  }
  .pdf-title-row .number-text {
    font-size: 28px;
    color: var(--brand-primary);
  }
  .number-text {
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
    font-family: var(--font-number);
    font-variant-numeric: tabular-nums;
    color: inherit;
    white-space: nowrap;
  }
  .number-text-value {
    font-weight: var(--font-weight-bold);
  }
  .number-text-unit {
    font-size: 14px;
    font-weight: var(--font-weight-regular);
    color: currentColor;
  }
  .number-text-sm {
    font-size: 15px;
  }
  .number-text-md {
    font-size: 20px;
  }
  .number-text-lg {
    font-size: 28px;
  }
  input[type="number"] {
    font-family: var(--font-number);
    font-variant-numeric: tabular-nums;
  }
  input[inputmode="numeric"] {
    font-family: var(--font-number);
    font-variant-numeric: tabular-nums;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-surface);
  }
  .pdf-capture-area .general-estimate-table th:nth-child(1),
  .pdf-capture-area .general-estimate-table td:nth-child(1) {
    width: 150px;
  }
  .pdf-capture-area .general-estimate-table th:nth-child(2),
  .pdf-capture-area .general-estimate-table td:nth-child(2) {
    width: auto;
    min-width: 260px;
  }
  .pdf-capture-area .general-estimate-table th:nth-child(3),
  .pdf-capture-area .general-estimate-table td:nth-child(3),
  .pdf-capture-area .general-estimate-table th:nth-child(4),
  .pdf-capture-area .general-estimate-table td:nth-child(4) {
    width: 130px;
    white-space: nowrap;
  }
  .detail-estimate-groups {
    display: grid;
    gap: var(--space-2);
  }
  .detail-estimate-group {
    display: grid;
    gap: var(--space-1);
  }
  .detail-estimate-group h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: var(--font-size-title-sm);
  }
  .pdf-capture-area .detail-estimate-table th:nth-child(1),
  .pdf-capture-area .detail-estimate-table td:nth-child(1) {
    min-width: 180px;
  }
  .pdf-capture-area .detail-estimate-table th:nth-child(n+3),
  .pdf-capture-area .detail-estimate-table td:nth-child(n+3) {
    width: 112px;
    white-space: nowrap;
  }
  .labor-detail-row td {
    background: #fbfcff;
    color: var(--text-secondary);
  }
  .estimate-modal table th:nth-child(2),
  .estimate-modal table td:nth-child(2),
  .pdf-capture-area table th:nth-child(2),
  .pdf-capture-area table td:nth-child(2) {
    width: 34%;
    min-width: 220px;
  }
  .estimate-modal table th:nth-child(n+3),
  .estimate-modal table td:nth-child(n+3),
  .pdf-capture-area table th:nth-child(n+3),
  .pdf-capture-area table td:nth-child(n+3) {
    width: 86px;
    white-space: nowrap;
  }
  .estimate-modal table th:first-child,
  .estimate-modal table td:first-child,
  .pdf-capture-area table th:first-child,
  .pdf-capture-area table td:first-child {
    min-width: 140px;
  }
  th, td {
    padding: 13px;
    border: 1px solid var(--border-subtle);
    text-align: left;
  }
  th {
    background: var(--bg-subtle);
    color: var(--text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
  }
  tfoot td {
    font-weight: var(--font-weight-bold);
    background: var(--bg-subtle);
  }
  @media (max-width: 840px) {
    .excel-import-modal-backdrop {
      padding: 0;
    }
    .excel-import-modal {
      width: 100vw;
      max-height: 100dvh;
      border-radius: 0;
    }
    .ai-setup-header,
    .excel-import-modal-head-actions {
      align-items: flex-start;
      flex-direction: column;
    }
    .hero, .primary-action-grid, .secondary-action-grid,
    .menu-grid, .admin-menu, .workspace, .form-grid, .material-row, .sticky-summary,
    .condition-static-grid,
    .admin-pyeong-panel, .admin-catalog-actions, .admin-item-header, .admin-add-subitem-row,
    .price-item-header, .price-row,
    .admin-bulk-panel,
    .condition-label-row,
    .template-list-row, .detail-cost-layout, .detail-add-row, .detail-bulk-panel, .detail-cost-header, .detail-cost-row, .estimate-card,
    .estimate-template-expanded-content, .estimate-template-detail, .condition-variant-label-actions, .estimate-pyeong-preview,
    .estimate-meta-grid, .adjustment-row, .estimate-editor-total,
    .ai-upload-grid, .ai-sheet-meta, .ai-mapping-groups, .ai-match-summary, .ai-plan-split,
    .ai-flow-steps,
    .ai-condition-grid, .ai-condition-hint-grid, .ai-final-summary-grid, .ai-price-update-actions,
    .ai-recommendation-actions, .ai-recommendation-summary-grid,
    .photo-section-header, .photo-collection-title-row, .photo-subitem-header, .photo-subitem-row {
      grid-template-columns: 1fr;
    }
    .ai-flow-head {
      display: grid;
    }
    .photo-section-header {
      display: grid;
    }
    .photo-tabs {
      display: grid;
      grid-template-columns: 1fr;
      width: 100%;
    }
    .ai-collapsible-toggle {
      grid-template-columns: 1fr;
    }
    .ai-collapsible-toggle div {
      justify-content: flex-start;
    }
    .ai-mapping-title {
      display: grid;
    }
    .ai-mapping-stats {
      justify-content: flex-start;
    }
    .hero {
      padding: var(--space-3) 0;
    }
    .admin-condition-grid {
      grid-template-columns: 1fr;
    }
    .admin-condition-field {
      min-height: auto;
    }
    .admin-condition-submit {
      justify-content: stretch;
    }
    .public-landing {
      padding: var(--space-2) var(--space-2) var(--space-4);
      min-height: 100dvh;
      max-height: none;
    }
    .public-shell {
      overflow: auto;
    }
    .public-header {
      margin-bottom: var(--space-1);
    }
    .public-hero {
      min-height: auto;
      transform: none;
    }
    .public-hero .hero-preview {
      width: 100%;
      justify-self: stretch;
    }
    .public-hero-title span {
      white-space: normal;
    }
    .work-home {
      padding-top: 30px;
    }
    .hero-copy {
      padding-top: 0;
    }
    .hero-brand {
      margin-bottom: 0;
    }
    .global-header {
      padding: 0 var(--space-2);
    }
    .global-header.with-admin-condition,
    .global-header.with-estimate-condition {
      height: 56px;
      min-height: 56px;
      grid-template-columns: minmax(120px, 1fr) minmax(180px, auto) minmax(120px, 1fr);
      grid-template-areas: "brand condition company";
      gap: var(--space-1);
      padding-top: 0;
      padding-bottom: 0;
    }
    .global-header.with-admin-condition .global-brand,
    .global-header.with-estimate-condition .global-brand {
      grid-area: brand;
    }
    .global-header.with-admin-condition .company-session,
    .global-header.with-estimate-condition .company-session,
    .global-header.with-estimate-condition .header-estimate-actions {
      grid-area: company;
    }
    .global-header.with-admin-condition .header-admin-condition,
    .global-header.with-estimate-condition .header-estimate-condition {
      grid-area: condition;
      max-width: none;
      padding: 0 var(--space-1);
    }
    .global-header.with-admin-condition .header-admin-condition strong,
    .global-header.with-estimate-condition .header-estimate-condition strong {
      white-space: normal;
    }
    .global-header.with-admin-condition ~ .admin-page,
    .global-header.with-estimate-condition ~ .workspace {
      margin-top: 0;
    }
    .company-session {
      gap: 6px;
    }
    .company-session span {
      max-width: 46vw;
    }
    .company-session .session-status-dot {
      display: none;
    }
    .landing-session-bar {
      gap: var(--space-1);
      margin-bottom: var(--space-3);
    }
    .hero h1 {
      font-size: 34px;
      line-height: 1.2;
    }
    .hero p {
      font-size: var(--font-size-body);
    }
    .preview-lines div {
      grid-template-columns: 1fr;
    }
    .feature-card {
      min-height: 190px;
      padding: var(--space-3);
    }
    .editor-header, .actions, .condition-start-row, .estimate-selected-condition-panel, .admin-condition-title {
      flex-direction: column;
      align-items: stretch;
    }
    .load-box {
      grid-template-columns: 1fr;
    }
    .detail-cost-title {
      flex-direction: column;
    }
    .admin-edit-title {
      flex-direction: column;
    }
    .pdf-title-row {
      flex-direction: column;
    }
    .estimate-amount {
      text-align: left;
    }
    .saved-estimates-page .estimate-amount {
      text-align: right;
    }
    .estimate-card-actions {
      justify-content: stretch;
      flex-direction: column;
    }
    .saved-estimates-page .estimate-card-actions {
      flex-direction: row;
      justify-content: flex-end;
    }
    .estimate-header-actions,
    .estimate-header-actions .primary-button,
    .estimate-header-actions .secondary-button {
      width: 100%;
    }
    .material-list {
      --estimate-row-grid: 28px minmax(120px, 1fr) 72px 76px 48px;
    }
    .estimate-row-header {
      display: none;
    }
    .estimate-template-main {
      align-items: flex-start;
    }
    .estimate-template-total {
      text-align: left;
      justify-items: start;
      min-width: 0;
    }
    .estimate-row-name-cell strong {
      -webkit-line-clamp: 2;
    }
    .panel.wide,
    .estimate-modal,
    .pdf-capture-area {
      overflow-x: auto;
    }
    table {
      min-width: 680px;
    }
    .estimate-editor-total {
      align-items: flex-start;
    }
  }

  /* FORMATE v8.1 design layer */
  :root {
    --color-bg: #F9FBFA;
    --color-surface: #FFFFFF;
    --color-surface-subtle: #F3F7F5;
    --color-border: #DCE6E2;
    --color-border-strong: #C8D6D0;
    --color-text-primary: #1F2933;
    --color-text-secondary: #5F6D68;
    --color-text-muted: #87938F;
    --color-primary: #0D5C52;
    --color-primary-hover: #042F2C;
    --color-primary-soft: #ECFDF5;
    --color-primary-border: #A7F3D0;
    --color-accent: #10B981;
    --color-brand-deep: #042F2C;
    --color-header-bg: #EFF5F2;
    --color-row-alt: #FBFCFC;
    --color-row-hover: #F3F8F5;
    --color-cell-focus: #ECFDF5;
    --color-danger: #DC2626;
    --color-danger-bg: #FEF2F2;
    --color-danger-border: #FECACA;
    --bg-base: var(--color-bg);
    --bg-surface: var(--color-surface);
    --bg-subtle: var(--color-surface-subtle);
    --bg-surface-overlay: rgba(255, 255, 255, 0.96);
    --text-primary: var(--color-text-primary);
    --text-secondary: var(--color-text-secondary);
    --text-tertiary: var(--color-text-muted);
    --brand-primary: var(--color-primary);
    --brand-primary-hover: var(--color-primary-hover);
    --brand-primary-subtle: var(--color-primary-soft);
    --brand-accent-line: var(--color-primary-border);
    --border-default: var(--color-border);
    --border-subtle: var(--color-border);
    --radius-card: 8px;
    --radius-button: 6px;
    --shadow-sm: none;
    --shadow-md: none;
  }
  .ai-match-status.automatic {
    color: #317c52;
    background: rgba(49, 124, 82, 0.08);
  }
  .ai-match-status.conflict,
  .ai-match-status.needs_review {
    color: #8a5a16;
    background: rgba(170, 111, 28, 0.1);
  }
  .ai-match-status.unmapped {
    color: var(--text-secondary);
    background: var(--bg-subtle);
  }
  .ai-status-pill.analyzing,
  .ai-status-pill.mapping {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
  }
  body {
    background: var(--bg-base);
  }
  button {
    transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, color 160ms ease;
  }
  button:active:not(:disabled) {
    transform: translateY(1px);
  }
  .app-shell {
    padding-top: 0;
  }
  .app-shell.items-v2-shell {
    padding-top: 0;
  }
  .global-header {
    height: 56px;
    padding: 0 var(--space-3);
    background: var(--bg-surface);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .global-brand strong,
  .hero-brand strong,
  .login-brand strong {
    letter-spacing: -0.01em;
  }
  .company-session {
    min-height: var(--button-height);
    padding: 0 var(--space-1);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-button);
    background: var(--bg-surface);
  }
  .company-switch-button {
    min-height: var(--button-height-sm);
    border-radius: var(--radius-button);
  }
  .login-shell {
    padding: 24px;
  }
  .login-card {
    width: min(460px, 100%);
    gap: 22px;
    padding: 34px;
    border-radius: 22px;
    box-shadow: 0 26px 70px rgba(23, 32, 51, 0.14);
  }
  .login-card h1 {
    margin-bottom: 10px;
    font-size: clamp(28px, 4vw, 36px);
    line-height: 1.18;
  }
  .login-form {
    gap: 16px;
  }
  .login-form label {
    gap: 8px;
  }
  .landing,
  .panel-page,
  .simple-page {
    max-width: 1160px;
  }
  .hero {
    grid-template-columns: minmax(0, 1fr) minmax(340px, 0.85fr);
    align-items: center;
    min-height: calc(100dvh - 110px);
    padding: 34px 0 44px;
  }
  .hero h1 {
    max-width: 620px;
    font-size: clamp(42px, 5vw, 64px);
    line-height: 1.08;
    letter-spacing: -0.02em;
  }
  .hero p {
    max-width: 540px;
    font-size: 18px;
    line-height: 1.65;
  }
  .hero-preview {
    border-radius: 22px;
    background: #ffffff;
    box-shadow: 0 30px 80px rgba(23, 32, 51, 0.16);
  }
  .preview-lines div {
    border-radius: 14px;
  }
  .landing-actions {
    gap: 18px;
  }
  .section-heading h2 {
    font-size: clamp(24px, 3vw, 32px);
    letter-spacing: -0.01em;
  }
  .primary-action-grid {
    grid-template-columns: 1.15fr 0.85fr;
  }
  .secondary-action-grid {
    opacity: 0.92;
  }
  .menu-card {
    border-radius: 18px;
    box-shadow: var(--shadow-sm);
  }
  .menu-card:hover,
  .menu-card:focus-visible {
    transform: translateY(-2px);
    background: #ffffff;
    box-shadow: 0 18px 46px rgba(23, 32, 51, 0.12);
  }
  .menu-card span {
    font-size: 20px;
    letter-spacing: -0.01em;
  }
  .menu-card strong {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
    font-size: var(--font-size-body-sm);
  }
  .admin-menu .menu-card:nth-child(3) {
    background: #fbfcfe;
  }
  .admin-menu .menu-card:nth-child(3) svg {
    opacity: 0.72;
  }
  .panel {
    border-radius: 22px;
    padding: clamp(22px, 3vw, 34px);
    box-shadow: var(--shadow-sm);
  }
  .panel h2,
  .category-column h2,
  .editor h2 {
    font-size: clamp(26px, 3vw, 36px);
    line-height: 1.2;
    letter-spacing: -0.015em;
  }
  .muted,
  .caption {
    color: var(--text-secondary);
  }
  .eyebrow {
    letter-spacing: 0.04em;
  }
  .condition-page {
    max-width: 900px;
    min-height: calc(100dvh - 70px);
    display: grid;
    align-items: start;
    padding: 24px var(--space-3) 18px;
  }
  .condition-builder-panel {
    gap: 14px;
    padding: 20px;
  }
  .condition-builder-header h2 {
    margin-bottom: 0;
    font-size: clamp(24px, 2.5vw, 32px);
  }
  .estimate-current-condition,
  .admin-edit-current {
    border-radius: 18px;
    padding: 14px 16px;
  }
  .estimate-current-condition.active,
  .admin-edit-current.active {
    background: linear-gradient(180deg, #f4f7ff, #ffffff);
    box-shadow: inset 0 0 0 1px rgba(36, 48, 79, 0.04);
  }
  .estimate-current-condition strong,
  .admin-edit-current strong {
    font-size: clamp(20px, 2.5vw, 26px);
    letter-spacing: -0.01em;
  }
  .condition-page .estimate-current-condition p {
    display: none;
  }
  .condition-static-grid,
  .admin-pyeong-panel {
    gap: 12px;
  }
  .condition-static-field,
  .admin-pyeong-panel label {
    padding: 13px;
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    background: #ffffff;
  }
  .condition-static-wide {
    padding: 13px;
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    background: #ffffff;
  }
  .condition-static-wide .field-label {
    margin-bottom: 8px;
  }
  .segmented button,
  .chips button {
    min-height: 44px;
    border-radius: 12px;
  }
  .condition-variant-option small {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .condition-start-row {
    padding: 12px 0 0;
    justify-content: flex-end;
    border: 0;
    border-top: 1px solid var(--border-subtle);
    border-radius: 0;
    background: transparent;
  }
  .condition-page .condition-start-row {
    margin-top: -2px;
  }
  .condition-start-row .primary-button {
    min-width: 180px;
  }
  .admin-pyeong-panel,
  .template-list-panel,
  .admin-edit-panel,
  .admin-tool-panel,
  .admin-catalog-actions {
    border-radius: 18px;
    box-shadow: var(--shadow-sm);
  }
  .admin-pyeong-panel {
    padding: 18px;
    background: linear-gradient(180deg, #ffffff, #fbfcff);
  }
  .admin-condition-title {
    padding: 4px 2px 8px;
  }
  .admin-condition-title strong,
  .template-list-panel strong,
  .admin-edit-title strong,
  .admin-catalog-actions strong {
    font-size: 20px;
    letter-spacing: -0.01em;
  }
  .condition-label-link {
    min-height: 42px;
    color: var(--text-secondary);
  }
  .admin-condition-detail-head .condition-label-link {
    min-height: 32px;
    padding: 0 10px;
    border-color: var(--border-subtle);
    background: #ffffff;
    font-size: var(--font-size-caption);
  }
  .admin-condition-submit .primary-button {
    width: 100%;
  }
  .template-list-panel {
    padding: 18px;
    background: #ffffff;
  }
  .template-list-row {
    min-height: 58px;
    padding: 12px 14px;
    border-radius: 14px;
    background: #fbfcfe;
  }
  .admin-edit-panel {
    padding: 18px;
    background: #ffffff;
  }
  .admin-tool-panel {
    padding: 12px;
    background: #fbfcfe;
  }
  .admin-tool-panel .secondary-button,
  .admin-tool-panel .ghost {
    min-height: 42px;
    color: var(--text-secondary);
  }
  .admin-list {
    gap: 14px;
  }
  .admin-value-row.newly-added {
    animation: admin-new-row-highlight 1.6s ease-out;
  }
  @keyframes admin-new-row-highlight {
    0% {
      background: #fff6d8;
      box-shadow: inset 3px 0 0 #f2b94b;
    }
    100% {
      background: #ffffff;
      box-shadow: inset 3px 0 0 transparent;
    }
  }
  .detail-cost-row input[inputmode="numeric"],
  .detail-bulk-panel input[inputmode="numeric"] {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .detail-cost-row {
    min-height: 46px;
  }
  .detail-cost-list .detail-cost-row:nth-of-type(even),
  .detail-subitem-list button:nth-child(even) {
    background: var(--color-row-alt);
  }
  .detail-cost-row:hover,
  .detail-subitem-list button:hover {
    background: var(--color-row-alt);
  }
  .detail-cost-header {
    border-color: var(--border-subtle);
    background: #f8f9fb;
    color: var(--text-secondary);
    letter-spacing: 0;
  }
  .detail-bulk-panel {
    border-color: var(--border-subtle);
    background: #fbfcfe;
    box-shadow: none;
  }
  .detail-bulk-panel strong {
    color: var(--text-primary);
  }
  .detail-cost-row input:focus,
  .detail-cost-row select:focus {
    border-color: var(--brand-primary);
    background: var(--bg-surface);
    box-shadow: none;
  }
  .detail-cost-layout input::placeholder,
  .detail-cost-layout textarea::placeholder,
  .admin-readonly-material span,
  .detail-subitem-list span,
  .detail-cost-list .muted {
    color: var(--text-tertiary);
  }
  .detail-cost-row input[inputmode="numeric"],
  .detail-bulk-panel input[inputmode="numeric"] {
    font-variant-numeric: tabular-nums;
  }
  .admin-item-card svg,
  .admin-tool-panel svg,
  .admin-edit-panel svg,
  .template-list-panel svg,
  .detail-cost-layout svg,
  .admin-condition-title svg {
    width: 18px;
    height: 18px;
    stroke-width: 1.5;
  }
  .admin-item-card .danger-button,
  .detail-cost-layout .danger-button {
    width: 36px;
    min-height: 36px;
  }
  .admin-item-card .danger-button:hover,
  .admin-item-card .danger-button:focus-visible,
  .detail-cost-layout .danger-button:hover,
  .detail-cost-layout .danger-button:focus-visible {
    background: var(--color-danger-subtle);
    outline: none;
  }
  .admin-item-card:hover,
  .admin-item-card:focus-within,
  .detail-group:hover,
  .detail-group:focus-within {
    border-color: var(--brand-accent-line);
  }
  .spec-options-control {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px;
    align-items: center;
    min-width: 0;
  }
  .spec-options-select {
    width: 100%;
    min-width: 0;
    appearance: auto;
    background-position: right 6px center;
    font-size: 13px;
  }
  .spec-options-popover {
    position: absolute;
    z-index: 35;
    top: calc(100% + 6px);
    left: 0;
    width: 260px;
    padding: 8px;
    border: 1px solid var(--border-default);
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 14px 34px rgba(36, 48, 79, 0.16);
  }
  .spec-options-popover-list {
    display: grid;
    gap: 4px;
    max-height: 180px;
    overflow: auto;
  }
  .spec-options-popover-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px;
    align-items: center;
    min-height: 30px;
    padding: 4px 6px;
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    background: #fbfcff;
  }
  .spec-options-popover-row span {
    overflow: hidden;
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: var(--font-weight-semibold);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .spec-options-popover-row div {
    display: inline-flex;
    gap: 3px;
  }
  .icon-mini-button {
    width: 24px;
    min-width: 24px;
    min-height: 24px;
    padding: 0;
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    background: #ffffff;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
  }
  .icon-mini-button:disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }
  .icon-mini-button.danger {
    color: var(--color-danger);
  }
  .spec-options-popover-empty {
    padding: 8px;
    color: var(--text-tertiary);
    font-size: 12px;
  }
  .spec-options-popover-add {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 5px;
    margin-top: 6px;
  }
  .spec-options-popover-add input {
    min-height: 30px;
    padding: 5px 8px;
    font-size: 13px;
  }
  .spec-options-popover-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 6px;
  }
  .canonical-variant-control {
    position: relative;
    width: 100%;
  }
  .canonical-variant-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-width: 0;
    min-height: 32px;
    padding: 5px 8px;
    border: 1px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--color-text-primary);
    cursor: pointer;
    font-size: 13px;
    line-height: var(--line-height-table-cell);
    text-align: left;
  }
  .canonical-variant-trigger:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }
  .canonical-variant-trigger:focus-visible {
    border-color: var(--color-primary);
    background: var(--color-surface);
    outline: none;
  }
  .canonical-variant-trigger span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .canonical-variant-trigger svg {
    flex: 0 0 auto;
    margin-left: var(--space-1);
  }
  .canonical-variant-dropdown {
    width: 180px;
    max-width: calc(100vw - 32px);
    padding: 4px;
  }
  .canonical-variant-dropdown--manage {
    width: 320px;
    padding: 8px;
  }
  .canonical-variant-dropdown__options {
    display: grid;
    max-height: 220px;
    overflow-y: auto;
  }
  .canonical-variant-dropdown__option,
  .canonical-variant-dropdown__manage-action {
    width: 100%;
    min-height: 30px;
    padding: 5px 8px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--color-text-primary);
    cursor: pointer;
    font-size: var(--font-size-table-cell);
    line-height: var(--line-height-table-cell);
    text-align: left;
  }
  .canonical-variant-dropdown__option:hover,
  .canonical-variant-dropdown__manage-action:hover,
  .canonical-variant-dropdown__option:focus-visible,
  .canonical-variant-dropdown__manage-action:focus-visible {
    background: var(--color-surface-subtle);
    outline: none;
  }
  .canonical-variant-dropdown__option.selected {
    border-color: var(--border-selected);
    background: var(--surface-selected);
    color: var(--color-primary);
    font-weight: var(--font-weight-semibold);
  }
  .canonical-variant-dropdown__separator {
    height: 1px;
    margin: 4px 0;
    background: var(--border-subtle);
  }
  .canonical-variant-dropdown__manage-action {
    color: var(--color-text-secondary);
  }
  .canonical-variant-manager {
    width: 100%;
  }
  .canonical-variant-manager__metadata {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 92px;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
  .canonical-variant-manager__metadata label {
    display: grid;
    gap: var(--space-1);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
  }
  .canonical-variant-manager__metadata input,
  .canonical-variant-manager__metadata select,
  .canonical-variant-manager__row input,
  .canonical-variant-manager__add input {
    min-width: 0;
    min-height: 30px;
    padding: 5px 8px;
    font-size: var(--font-size-table-cell);
  }
  .canonical-variant-manager__row {
    grid-template-columns: minmax(0, 1fr) 52px;
  }
  .canonical-variant-manager__value-fields {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 72px;
    gap: var(--space-1) !important;
    min-width: 0;
  }
  .canonical-variant-manager__add {
    grid-template-columns: minmax(0, 1fr) 88px auto;
  }
  .canonical-variant-manager__row-actions {
    display: inline-flex;
    gap: var(--space-1);
  }
  .admin-item-card.dragging,
  .admin-value-row.dragging {
    opacity: 0.62;
    transform: scale(0.996);
    box-shadow: 0 14px 30px rgba(36, 48, 79, 0.14);
  }
  .admin-item-card.drop-target,
  .admin-value-row.drop-target {
    border-color: rgba(43, 53, 104, 0.38);
    background: #fbfcff;
  }
  .admin-item-card.drop-target::before,
  .admin-value-row.drop-target::before {
    content: "";
    position: absolute;
    top: -3px;
    left: 16px;
    right: 16px;
    height: 3px;
    border-radius: 999px;
    background: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(43, 53, 104, 0.08);
  }
  .admin-value-row.drop-target::before {
    left: 10px;
    right: 10px;
  }
  .admin-item {
    border-radius: 18px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }
  .admin-item-header,
  .admin-bulk-panel {
    border-radius: 14px;
  }
  .estimate-template-detail input,
  .estimate-template-detail select {
    min-height: 52px;
    font-size: 17px;
  }
  .estimate-template-detail input,
  .estimate-template-detail select {
    min-height: 24px;
    font-size: 13px;
  }
  .workspace {
    gap: 18px;
    padding: 22px;
  }
  .estimate-selected-condition-panel,
  .category-column,
  .editor,
  .total-box,
  .estimate-card,
  .estimate-modal,
  .pdf-capture-area {
    border-radius: 20px;
    box-shadow: var(--shadow-sm);
  }
  .category-card {
    min-height: 54px;
    border-radius: 14px;
  }
  .total-box strong {
    font-size: 32px;
  }
  .estimate-template-row {
    border-radius: 18px;
    padding: 10px 12px;
  }
  .estimate-template-row.selected {
    box-shadow: 0 16px 42px rgba(36, 48, 79, 0.12);
  }
  .estimate-template-row.missing-template {
    opacity: 0.82;
  }
  .estimate-row-cell {
    border-radius: 12px;
  }
  .selected-badge,
  .modified-badge,
  .modified-inline-badge {
    border-radius: 999px;
  }
  .estimate-expand-toggle {
    border-radius: 12px;
  }
  .estimate-card-actions .secondary-button,
  .estimate-card-actions .primary-button {
    min-height: 42px;
  }
  .estimate-workspace {
    grid-template-columns: minmax(260px, 300px) minmax(0, 1fr);
    align-items: start;
    width: min(1440px, 100%);
    max-width: 1440px;
    gap: 20px;
    padding: 24px;
  }
  .estimate-workspace .category-column,
  .estimate-workspace .editor {
    min-width: 0;
    border-color: var(--border-subtle);
    box-shadow: var(--shadow-sm);
  }
  .estimate-workspace .category-column {
    position: sticky;
    top: 88px;
    max-height: calc(100dvh - 112px);
    overflow: auto;
    padding: 18px;
  }
  .estimate-workspace .editor {
    display: grid;
    gap: 14px;
    padding: 18px;
  }
  .estimate-workspace .category-title-row,
  .estimate-workspace .editor-header {
    margin-bottom: 0;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .estimate-workspace .estimate-header-actions {
    gap: 6px;
  }
  .estimate-workspace .estimate-header-actions .primary-button,
  .estimate-workspace .estimate-header-actions .secondary-button {
    min-width: 116px;
    min-height: 38px;
    padding: 0 11px;
  }
  .estimate-workspace .estimate-pyeong-panel,
  .estimate-workspace .selected-item-summary,
  .estimate-workspace .site-memo-panel {
    margin-top: 0;
    background: #fbfcfe;
    box-shadow: none;
  }
  .estimate-workspace .category-grid {
    margin: 12px 0;
    gap: 8px;
  }
  .estimate-workspace .category-card {
    min-height: 50px;
  }
  .estimate-workspace .total-box {
    margin-top: 12px;
    border-color: var(--brand-accent-line);
    background: var(--brand-primary-subtle);
  }
  .estimate-workspace .material-list {
    gap: 8px;
    padding: 10px;
    overflow-x: auto;
    border: 1px solid var(--border-subtle);
    border-radius: 18px;
    background: #fbfcfe;
  }
  .estimate-workspace .estimate-row-header,
  .estimate-workspace .estimate-template-row {
    min-width: 704px;
  }
  .estimate-workspace .estimate-template-row {
    box-shadow: none;
  }
  .estimate-workspace .estimate-template-row:hover {
    border-color: var(--brand-accent-line);
    background: #ffffff;
  }
  .estimate-workspace .estimate-side-stack {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr);
    align-items: start;
    gap: 12px;
  }
  .estimate-workspace .selected-item-summary,
  .estimate-workspace .site-memo-panel,
  .estimate-workspace .estimate-editor-total {
    border-radius: 18px;
  }
  .estimate-workspace .selected-summary-row {
    background: #ffffff;
  }
  .estimate-workspace .site-memo-panel textarea {
    min-height: 108px;
  }
  .estimate-workspace .estimate-editor-total {
    grid-column: 1 / -1;
    bottom: 16px;
    z-index: 8;
    margin-top: 0;
    border-color: var(--brand-accent-line);
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 -12px 34px rgba(23, 32, 51, 0.08);
  }
  .estimate-workspace svg {
    width: 18px;
    height: 18px;
    stroke-width: 1.5;
  }
  /* 7-8 final visual polish: hierarchy, state, type, and numeric consistency. */
  .primary-button,
  .secondary-button,
  .ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-height: var(--button-height);
    border-radius: var(--radius-button);
    padding: 0 var(--space-button-x);
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-medium);
    line-height: 1;
    box-shadow: none;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease, opacity 120ms ease;
  }
  .primary-button {
    border: 1px solid var(--brand-primary);
    background: var(--brand-primary);
    color: var(--text-inverse);
  }
  .primary-button:hover:not(:disabled) {
    border-color: var(--brand-primary-hover);
    background: var(--brand-primary-hover);
    box-shadow: none;
    transform: none;
  }
  .primary-button:active:not(:disabled),
  .secondary-button:active:not(:disabled),
  .ghost:active:not(:disabled) {
    opacity: 0.82;
  }
  .secondary-button {
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-primary);
  }
  .secondary-button:hover:not(:disabled) {
    border-color: var(--brand-accent-line);
    background: var(--bg-muted);
  }
  .ghost {
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-secondary);
  }
  .ghost:hover:not(:disabled) {
    background: var(--bg-subtle);
    color: var(--text-primary);
  }
  .primary-button:focus-visible,
  .secondary-button:focus-visible,
  .ghost:focus-visible,
  .icon-button:focus-visible,
  .danger-button:focus-visible,
  .template-delete-button:focus-visible,
  .selected-summary-remove:focus-visible,
  .estimate-photo-button:focus-visible,
  .estimate-expand-toggle:focus-visible,
  .preview-top button:focus-visible,
  .photo-tabs button:focus-visible,
  .segmented button:focus-visible,
  .chips button:focus-visible {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: var(--focus-ring);
  }
  .danger-button,
  .template-delete-button,
  .photo-thumb-actions button.danger {
    border-color: var(--color-danger-border);
    background: var(--bg-surface);
    color: var(--color-danger);
    box-shadow: none;
  }
  .danger-button:hover:not(:disabled),
  .danger-button:focus-visible,
  .template-delete-button:hover:not(:disabled),
  .template-delete-button:focus-visible,
  .danger-text-button:hover:not(:disabled),
  .danger-text:hover:not(:disabled) {
    border-color: rgba(194, 46, 46, 0.34);
    background: var(--color-danger-subtle);
    color: var(--color-danger);
  }
  .preview-type-button.active {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
    color: var(--brand-primary);
  }
  .panel h2,
  .category-column h2,
  .editor h2,
  .editor-header h2,
  .admin-verify-modal h2,
  .estimate-modal h3 {
    font-size: var(--font-size-title-md);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-heading);
    letter-spacing: var(--letter-spacing-tight);
  }
  .section-heading h2,
  .selected-summary-header h3,
  .customer-adjustment-preview h3,
  .estimate-adjustment-panel h3,
  .saved-estimate-extra h4,
  .detail-estimate-group h3,
  .admin-condition-title strong,
  .template-list-panel strong,
  .admin-edit-title strong,
  .admin-catalog-actions strong,
  .admin-empty-edit-notice strong,
  .condition-label-guide strong,
  .admin-add-subitem-row strong {
    font-size: 15px;
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-compact);
    letter-spacing: var(--letter-spacing-normal);
  }
  .muted,
  .caption,
  .estimate-meta-grid span,
  .estimate-pyeong-preview span,
  .admin-condition-title span,
  .template-list-panel span,
  .admin-edit-title span,
  .admin-catalog-actions span,
  .admin-add-subitem-row span,
  .tax-note,
  .estimate-number-footer {
    color: var(--text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-copy);
  }
  p,
  label,
  th,
  td,
  .status-box,
  .error-box,
  .info-box,
  .success-box {
    line-height: var(--line-height-copy);
  }
  .custom-select-trigger,
  .admin-search-field,
  .estimate-pyeong-input {
    border-radius: var(--radius-button);
  }
  .custom-select-trigger:focus-visible,
  .custom-select-trigger.open,
  .admin-search-field:focus-within,
  .estimate-pyeong-input:focus-within {
    border-color: var(--brand-primary);
    background: var(--bg-surface);
    outline: none;
  }
  .custom-select-trigger:focus-visible {
    box-shadow: var(--focus-ring);
  }
  input[type="checkbox"],
  input[type="radio"] {
    width: auto;
    min-height: 0;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }
  input[type="checkbox"]:focus,
  input[type="radio"]:focus {
    outline: none;
    box-shadow: none;
  }
  input[type="checkbox"]:focus-visible,
  input[type="radio"]:focus-visible {
    outline: 1px solid var(--focus-ring-color);
    outline-offset: 1px;
    box-shadow: none;
  }
  .empty-state,
  .estimate-empty-state,
  .admin-empty-edit-notice,
  .ai-empty-sheet,
  .compact-empty {
    border: 1px dashed var(--border-default);
    border-radius: var(--radius-card);
    background: var(--bg-muted);
    box-shadow: none;
    color: var(--text-secondary);
  }
  .estimate-empty-state {
    padding: var(--space-4);
  }
  .photo-empty-inline,
  .selected-summary-empty,
  .ai-plan-empty,
  .spec-options-popover-empty,
  .ai-mapping-empty,
  .estimate-row-spec-cell.empty,
  .admin-readonly-material span,
  td:empty {
    color: var(--text-tertiary);
  }
  .category-card:hover,
  .template-list-row:hover,
  .selected-summary-row:hover,
  .adjustment-row:hover,
  .estimate-template-row:hover,
  .admin-item-card:hover,
  .estimate-card:hover {
    background: #f8faff;
  }
  .ai-data-table tbody tr:nth-child(even) td:not(.row-number-cell),
  .estimate-modal table tbody tr:nth-child(even) td,
  .selected-summary-row:nth-child(even),
  .adjustment-row:nth-child(even),
  .estimate-card:nth-child(even) {
    background: var(--color-row-alt);
  }
  .ai-data-table tbody tr:hover td:not(.row-number-cell),
  .estimate-modal table tbody tr:hover td,
  .general-estimate-document .general-estimate-table tbody tr:hover td,
  .detail-estimate-document .detail-estimate-table tbody tr:hover td {
    background: var(--color-row-alt);
  }
  .number-text,
  .signed-total,
  .estimate-amount,
  .estimate-row-total-cell,
  .estimate-template-total,
  .estimate-editor-total .final-total,
  .preview-total strong,
  input[type="number"],
  input[inputmode="numeric"] {
    font-family: var(--font-number);
    font-variant-numeric: tabular-nums;
    letter-spacing: var(--letter-spacing-normal);
  }
  input[type="number"],
  input[inputmode="numeric"],
  .price-number-field input,
  .estimate-row-quantity-cell input,
  .estimate-amount,
  .estimate-row-total-cell,
  .estimate-template-total,
  .estimate-editor-total .final-total {
    text-align: right;
  }
  td .number-text,
  th .number-text {
    justify-content: flex-end;
  }
  .estimate-modal table td:has(.number-text),
  .estimate-modal table th:nth-child(n+3),
  .pdf-capture-area table td:has(.number-text),
  .pdf-capture-area table th:nth-child(n+3),
  .ai-data-table .row-number-cell {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .pdf-capture-area {
    font-family: var(--font-sans);
    line-height: 1.48;
    letter-spacing: var(--letter-spacing-normal);
  }
  .pdf-capture-area h3 {
    line-height: 1.28;
    letter-spacing: var(--letter-spacing-tight);
  }
  .pdf-capture-area th,
  .pdf-capture-area td {
    line-height: 1.42;
  }
  button svg,
  .compact-button svg,
  .icon-button svg,
  .danger-button svg,
  .admin-tool-panel svg,
  .admin-edit-panel svg,
  .template-list-panel svg,
  .detail-cost-layout svg,
  .photo-storage-note svg,
  .estimate-workspace svg,
  .general-preview-panel svg,
  .detail-preview-panel svg {
    width: 18px;
    height: 18px;
    stroke-width: 1.5;
    flex: 0 0 auto;
  }
  .empty-state > svg,
  .compact-empty > svg,
  .ui-empty-state__icon svg {
    width: 24px;
    height: 24px;
    stroke-width: 1.5;
  }
  .panel,
  .category-column,
  .editor,
  .selected-item-summary,
  .site-memo-panel,
  .estimate-adjustment-panel,
  .estimate-editor-total,
  .estimate-card,
  .estimate-modal,
  .pdf-capture-area,
  .admin-pyeong-panel,
  .template-list-panel,
  .admin-edit-panel,
  .admin-tool-panel,
  .admin-catalog-actions,
  .estimate-selected-condition-panel,
  .estimate-pyeong-panel,
  .total-box {
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-sm);
  }
  .status-box,
  .error-box {
    border-radius: 14px;
  }
  .formate-app-shell--overview .formate-app-shell__sidebar {
    padding-top: var(--space-3);
  }
  .work-home,
  .admin-home-page {
    padding-top: var(--space-3);
    padding-bottom: var(--space-4);
  }
  .work-home .landing-actions,
  .admin-home-section {
    display: grid;
    gap: var(--space-3);
  }
  .work-home-heading {
    margin-bottom: 0;
  }
  .home-action-list,
  .admin-action-list {
    display: grid;
    gap: var(--space-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    padding: var(--space-1);
    box-shadow: none;
  }
  .home-action-row,
  .admin-action-row {
    width: 100%;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: var(--space-1-5);
    border: 1px solid transparent;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-primary);
    padding: var(--space-2);
    text-align: left;
    cursor: pointer;
  }
  .home-action-row:hover,
  .home-action-row:focus-visible,
  .admin-action-row:hover,
  .admin-action-row:focus-visible {
    border-color: var(--color-border-strong);
    background: var(--color-surface-subtle);
    box-shadow: var(--shadow-hover);
    outline: none;
  }
  .home-action-row--primary {
    border-color: var(--color-primary-border);
    background: var(--color-primary-soft);
  }
  .home-action-row svg,
  .admin-action-row svg {
    color: var(--color-text-secondary);
  }
  .home-action-row span,
  .admin-action-row span {
    display: grid;
    gap: var(--space-0-5);
    min-width: 0;
  }
  .home-action-row strong,
  .admin-action-row strong {
    color: var(--color-text-primary);
    font-size: var(--font-size-section-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-section-title);
  }
  .home-action-row em,
  .admin-action-row em {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-style: normal;
    font-weight: var(--font-weight-regular);
    line-height: var(--line-height-caption);
  }
  .home-recent-compact {
    margin-top: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: none;
  }
  .home-recent-compact-row:hover,
  .home-recent-compact-row:focus-visible {
    background: var(--color-row-alt);
    outline: none;
  }
  .condition-page .condition-builder-panel {
    width: 100%;
    padding: var(--space-card-padding);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-panel);
    background: var(--color-surface);
    box-shadow: none;
    gap: var(--space-section-gap);
  }
  .condition-page .condition-builder-header {
    align-items: flex-start;
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }
  .condition-page .condition-builder-header h2 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--font-size-work-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-work-title);
  }
  .condition-page .condition-builder-header .muted {
    max-width: 760px;
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-regular);
    line-height: var(--line-height-caption);
  }
  .condition-page .estimate-current-condition {
    gap: var(--space-0-5);
    padding: var(--space-card-padding);
    border: 1px dashed var(--color-border-strong);
    border-radius: var(--radius-card);
    background: var(--color-surface-subtle);
    box-shadow: none;
  }
  .condition-page .estimate-current-condition.active {
    border-color: var(--color-primary);
    background: var(--color-surface-subtle);
    box-shadow: none;
  }
  .condition-page .estimate-current-condition span {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-caption);
  }
  .condition-page .estimate-current-condition strong {
    color: var(--color-text-muted);
    font-size: var(--font-size-section-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-section-title);
    letter-spacing: var(--letter-spacing-normal);
  }
  .condition-page .estimate-current-condition.has-value strong {
    color: var(--color-text-primary);
  }
  .condition-page .estimate-current-condition p {
    display: block;
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .condition-page .condition-static-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
  }
  .condition-page .condition-static-field,
  .condition-page .condition-static-wide {
    padding: var(--space-card-padding);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: none;
    gap: var(--space-1);
  }
  .condition-page .condition-static-wide {
    grid-column: 1 / -1;
  }
  .condition-page .field-label,
  .condition-page .condition-static-wide .field-label {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-caption);
  }
  .condition-page .custom-select {
    max-width: none;
  }
  .condition-page .custom-select-menu {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: var(--shadow-popover);
  }
  .condition-page .custom-select-section p {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-caption);
  }
  .condition-page .pyeong-option-row.selected {
    border-color: var(--border-selected);
    background: var(--surface-selected);
  }
  .condition-page .pyeong-option-row.selected .pyeong-option-main {
    color: var(--color-primary);
  }
  .condition-page .custom-select-menu button:hover,
  .condition-page .custom-select-menu button:focus-visible {
    background: var(--color-row-alt);
    outline: none;
  }
  .condition-page .custom-select-menu .favorite-pyeong-toggle.active {
    color: var(--color-primary);
  }
  .condition-page .custom-select-trigger,
  .condition-page .segmented button,
  .condition-page .chips button {
    min-height: var(--button-height);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-body);
    box-shadow: none;
  }
  .condition-page .custom-select-trigger:hover,
  .condition-page .custom-select-trigger:focus-visible,
  .condition-page .custom-select-trigger.open,
  .condition-page .segmented button:hover,
  .condition-page .segmented button:focus-visible,
  .condition-page .chips button:hover,
  .condition-page .chips button:focus-visible {
    border-color: var(--color-primary);
    background: var(--color-surface);
    color: var(--color-primary);
    box-shadow: none;
    outline: none;
  }
  .condition-page .segmented button.selected,
  .condition-page .chips button.selected {
    border-color: var(--color-primary);
    background: var(--surface-selected);
    color: var(--color-primary);
    box-shadow: none;
  }
  .condition-page .custom-select-trigger.has-value {
    border-color: var(--color-primary);
    background: var(--surface-selected);
    color: var(--color-primary);
  }
  .condition-page .chips {
    gap: var(--space-1);
  }
  .condition-page .chips button.condition-variant-option {
    min-height: var(--button-height);
    padding: var(--space-1) var(--space-1-5);
    border-radius: var(--radius-button);
    justify-items: start;
    text-align: left;
  }
  .condition-page .condition-variant-option small {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-regular);
    line-height: var(--line-height-caption);
  }
  .condition-page .condition-variant-option.selected small {
    color: var(--color-primary);
  }
  .condition-page .condition-static-note {
    min-height: var(--button-height);
    padding: var(--space-1) var(--space-1-5);
    border: 1px dashed var(--color-border-strong);
    border-radius: var(--radius-button);
    background: var(--color-surface-subtle);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .condition-page .condition-static-note strong {
    color: var(--color-text-primary);
  }
  .condition-page .condition-label-link {
    min-height: var(--button-height-sm);
    color: var(--color-text-secondary);
  }
  .condition-page .condition-start-row {
    justify-content: flex-end;
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border);
  }
  .saved-estimates-page,
  .detail-cost-page {
    padding: 0;
  }
  .saved-estimates-page > .ui-page-header,
  .detail-cost-page > .ui-page-header {
    margin-bottom: var(--space-1-5);
  }
  .detail-cost-page .detail-cost-layout {
    display: grid;
    grid-template-columns: var(--layout-local-sidebar) minmax(0, 1fr);
    gap: var(--space-3);
    align-items: start;
  }
  .detail-cost-sidebar {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }
  .detail-cost-sidebar .ui-category-sidebar {
    width: var(--layout-local-sidebar);
    min-height: 560px;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
  }
  .detail-cost-sidebar .ui-category-sidebar__list {
    max-height: calc(100dvh - 220px);
    overflow: auto;
  }
  .detail-cost-sidebar-hint {
    margin: 0;
    padding: 0 var(--space-1);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .detail-cost-page .detail-cost-panel {
    min-width: 0;
    padding: var(--space-card-padding);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: none;
  }
  .detail-cost-page .detail-cost-title {
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }
  .detail-cost-page .detail-cost-title h3 {
    color: var(--color-text-primary);
    font-size: var(--font-size-section-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-section-title);
  }
  .detail-cost-page .detail-cost-title > span {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-badge);
    background: var(--color-surface-subtle);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
  }
  .detail-cost-page .detail-add-row {
    grid-template-columns: minmax(260px, 1fr) 140px 160px auto;
    gap: var(--space-1);
    margin: var(--space-2) 0;
  }
  .detail-cost-page .detail-add-row select {
    height: var(--button-height);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-input);
    background: var(--color-surface);
    color: var(--color-text-primary);
  }
  .detail-cost-page .detail-bulk-panel {
    grid-template-columns: minmax(280px, 1fr) 160px auto;
    gap: var(--space-1);
    margin-bottom: var(--space-2);
    padding: var(--space-card-padding);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface-subtle);
    box-shadow: none;
  }
  .detail-cost-page .detail-bulk-panel strong {
    color: var(--color-text-primary);
    font-size: var(--font-size-section-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-section-title);
  }
  .detail-cost-page .detail-bulk-panel span,
  .detail-cost-page .detail-bulk-panel label {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .detail-cost-page .detail-bulk-actions {
    gap: var(--space-1);
  }
  .detail-cost-page .detail-cost-list {
    display: grid;
    gap: var(--space-1);
  }
  .detail-cost-page .detail-cost-table {
    table-layout: fixed;
  }
  .detail-cost-page .detail-cost-table-input {
    width: 100%;
    height: 32px;
    border: 1px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--color-text-primary);
    font-size: var(--font-size-table-cell);
    line-height: var(--line-height-table-cell);
  }
  .detail-cost-page .detail-cost-table-input.numeric {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .detail-cost-page .detail-cost-table-input:focus {
    border-color: var(--color-primary);
    background: var(--color-surface);
    box-shadow: none;
    outline: none;
  }
  .detail-cost-page .detail-type-toggle {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-1);
  }
  .detail-cost-page .detail-type-toggle label {
    min-height: var(--button-height-sm);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
  }
  .detail-cost-page .detail-type-toggle label.selected {
    border-color: var(--color-primary);
    background: var(--color-surface-subtle);
    color: var(--color-primary);
  }
  .detail-cost-page .detail-cost-empty {
    margin-top: 0;
  }
  .formate-app-shell--items-v2 .formate-app-shell__main {
    padding: 0;
  }
  .items-v2-page {
    --estimate-photo-pane-width: clamp(320px, 24vw, 400px);
    display: grid;
    grid-template-columns: var(--layout-local-sidebar) minmax(0, 1fr) 0;
    min-height: 100dvh;
    min-width: 0;
    overflow-x: clip;
    background: var(--color-bg);
    animation: none;
    transition: grid-template-columns 200ms ease-out;
  }
  .items-v2-page--photo-pane-open {
    grid-template-columns: var(--layout-local-sidebar) minmax(0, 1fr) var(--estimate-photo-pane-width);
  }
  .items-v2-category-sidebar {
    position: sticky;
    top: 0;
    width: var(--layout-local-sidebar);
    height: 100dvh;
    max-height: 100dvh;
    overflow-y: auto;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
    transition: opacity 150ms ease, filter 150ms ease;
  }
  .items-v2-workspace {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
    padding: 0 var(--space-page-x) 0;
    transition: opacity 150ms ease, filter 150ms ease;
  }
  .items-v2-page--condition-drawer-open .items-v2-category-sidebar,
  .items-v2-page--condition-drawer-open .items-v2-workspace {
    opacity: 0.88;
    filter: blur(1px) saturate(0.96);
  }
  .items-v2-header,
  .items-v2-toolbar,
  .items-v2-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .items-v2-header {
    position: sticky;
    top: 0;
    z-index: 4;
    min-height: 56px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .items-v2-shell .items-v2-header {
    display: none;
  }
  .items-v2-titleline {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }
  .items-v2-header h1 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--font-size-work-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-work-title);
  }
  .items-v2-titleline span,
  .items-v2-section-header p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .items-v2-titleline span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .items-v2-header-actions,
  .items-v2-total-actions {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    flex-wrap: nowrap;
  }
  .items-v2-toolbar {
    padding: var(--space-toolbar-y) var(--space-toolbar-x);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
  }
  .items-v2-condition-summary {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
  }
  .items-v2-condition-summary span,
  .items-v2-pyeong-controls label,
  .items-v2-section-header span {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .items-v2-condition-summary strong {
    min-width: 0;
    max-width: min(52vw, 520px);
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-body);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .items-v2-condition-edit {
    flex: 0 0 auto;
  }
  .items-v2-pyeong-controls {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }
  .items-v2-pyeong-controls > div {
    display: inline-flex;
    align-items: center;
    width: 120px;
    height: var(--button-height);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-input);
    background: var(--color-surface);
    overflow: hidden;
  }
  .items-v2-pyeong-controls input {
    width: 100%;
    height: 100%;
    border: 0;
    padding: 0 var(--space-input-x);
    background: transparent;
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .items-v2-pyeong-controls input:focus {
    outline: none;
  }
  .items-v2-pyeong-controls > div:focus-within {
    border-color: var(--color-primary);
    box-shadow: none;
  }
  .items-v2-pyeong-controls span {
    padding-right: var(--space-input-x);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
  }
  .items-v2-table-section {
    min-width: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-table);
    background: var(--color-surface);
    overflow: hidden;
  }
  .items-v2-section-header {
    padding: var(--space-card-padding);
    border-bottom: 1px solid var(--color-border);
  }
  .items-v2-section-header h2 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--font-size-section-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-section-title);
  }
  .items-v2-table-section .ui-table-wrap {
    border: 0;
    border-radius: 0;
  }
  .items-v2-table-section .ui-table {
    table-layout: fixed;
  }
  .items-v2-page--photo-pane-open .items-v2-table {
    min-width: 760px;
  }
  .items-v2-page--photo-pane-open .items-v2-table th,
  .items-v2-page--photo-pane-open .items-v2-table td {
    padding-right: var(--space-1);
    padding-left: var(--space-1);
  }
  .items-v2-table-section .ui-table th,
  .items-v2-table-section .ui-table td {
    white-space: nowrap;
  }
  .items-v2-check-cell,
  .items-v2-icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .items-v2-check-cell input {
    width: 16px;
    height: 16px;
    min-width: 16px;
    min-height: 16px;
    margin: 0;
    padding: 0;
    accent-color: var(--color-primary);
  }
  .items-v2-material-cell {
    display: grid;
    gap: var(--space-0-5);
    min-width: 0;
  }
  .items-v2-material-cell strong {
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: var(--font-size-table-cell);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-table-cell);
    text-overflow: ellipsis;
  }
  .items-v2-material-cell span {
    display: inline-flex;
    gap: var(--space-0-5);
    min-height: 0;
  }
  .items-v2-badge {
    display: inline-flex;
    align-items: center;
    height: 22px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-badge);
    padding: 0 var(--space-1);
    font-size: var(--font-size-table-header);
    font-style: normal;
    font-weight: var(--font-weight-medium);
    line-height: 22px;
  }
  .items-v2-badge--muted {
    background: var(--color-surface-subtle);
    color: var(--color-text-secondary);
  }
  .items-v2-badge--selected {
    border-color: var(--color-primary-border);
    background: var(--color-surface);
    color: var(--color-primary);
  }
  .items-v2-badge--warning {
    border-color: var(--color-warning-border);
    background: var(--color-warning-soft);
    color: var(--color-warning);
    font-weight: var(--font-weight-semibold);
  }
  .items-v2-inline-input,
  .items-v2-inline-select {
    width: 100%;
    height: var(--button-height-sm);
    border: 1px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--color-text-primary);
    font-size: var(--font-size-table-cell);
    line-height: var(--line-height-table-cell);
  }
  .items-v2-inline-input--number {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: var(--font-weight-medium);
  }
  .items-v2-inline-input::placeholder {
    color: var(--color-text-muted);
    opacity: 1;
  }
  .items-v2-inline-input:focus,
  .items-v2-inline-select:focus {
    border-color: var(--color-primary);
    background: var(--color-surface);
    outline: none;
  }
  .items-v2-muted-value {
    color: var(--color-text-muted);
  }
  .items-v2-icon-button {
    width: var(--button-height-sm);
    height: var(--button-height-sm);
    border: 0;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: background-color 120ms ease, color 120ms ease, opacity 120ms ease;
  }
  .items-v2-icon-button:hover,
  .items-v2-icon-button.active {
    background: var(--color-surface-subtle);
    color: var(--color-primary);
  }
  .items-v2-icon-button:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
  .items-v2-icon-button:active:not(:disabled) {
    opacity: 0.82;
  }
  .items-v2-photo-trigger.active {
    background: transparent;
    color: var(--color-primary);
    box-shadow: inset 0 0 0 1px var(--color-primary-border);
  }
  .estimate-photo-context-pane {
    position: sticky;
    top: 0;
    display: flex;
    width: 100%;
    height: 100dvh;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
    overflow: hidden;
    background: var(--color-surface);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 160ms ease-out, visibility 0s linear 200ms;
  }
  .estimate-photo-context-pane.is-open {
    border-left: 1px solid var(--color-border);
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transition-delay: 0s;
  }
  .estimate-photo-context-pane__header {
    display: flex;
    min-height: 52px;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }
  .estimate-photo-context-pane__header > div {
    display: flex;
    min-width: 0;
    align-items: baseline;
    gap: var(--space-1);
  }
  .estimate-photo-context-pane__header h2 {
    margin: 0;
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-body);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .estimate-photo-context-pane__header span {
    flex: 0 0 auto;
    color: var(--color-text-muted);
    font-size: var(--font-size-caption);
    font-variant-numeric: tabular-nums;
  }
  .estimate-photo-context-pane__body {
    min-height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: var(--space-2);
  }
  .estimate-photo-context-pane__state {
    margin: 0;
    padding: var(--space-3) var(--space-1);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-sm);
    text-align: center;
  }
  .estimate-photo-context-pane__state--error {
    color: var(--color-danger);
  }
  .estimate-photo-context-pane__list {
    display: grid;
    gap: var(--space-2);
  }
  .estimate-photo-context-pane__list figure {
    min-width: 0;
    margin: 0;
  }
  .estimate-photo-context-pane__list button {
    display: grid;
    width: 100%;
    min-height: 160px;
    place-items: center;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-table);
    background: var(--color-surface-subtle);
    color: var(--color-text-muted);
    cursor: zoom-in;
  }
  .estimate-photo-context-pane__list button:hover,
  .estimate-photo-context-pane__list button:focus-visible {
    border-color: var(--color-primary-border);
  }
  .estimate-photo-context-pane__list button:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
  .estimate-photo-context-pane__list img {
    display: block;
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: calc(100dvh - 132px);
  }
  .estimate-photo-context-pane__list figcaption {
    margin-top: var(--space-0-5);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-sm);
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
  .items-v2-table-section .ui-table tbody tr.ui-table__expanded-row > td {
    height: auto;
    padding: 0 0 var(--space-1);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .items-v2-table-section .ui-table__row--owns-expanded td {
    background: var(--color-header-bg);
  }
  .items-v2-table-section .ui-table__row--owns-expanded td:first-child {
    box-shadow: inset 1px 0 0 var(--color-border-strong);
  }
  .items-v2-expanded-stack {
    display: grid;
    gap: var(--space-2);
    margin-left: 40px;
    padding: var(--space-1-5) var(--space-2) var(--space-2);
    border-left: 1px solid var(--color-border);
    background: var(--color-surface-subtle);
  }
  .items-v2-expanded-stack--sash {
    gap: 0;
    padding: var(--space-1) var(--space-2) var(--space-0-5);
  }
  .items-v2-detail-panel {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-2);
    padding: var(--space-card-padding);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
  }
  .items-v2-detail-note {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .items-v2-detail-panel label {
    display: grid;
    gap: var(--space-label-gap);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .items-v2-money-field {
    display: flex;
    align-items: center;
    height: var(--button-height);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-input);
    background: var(--color-surface);
    overflow: hidden;
  }
  .items-v2-money-field input {
    width: 100%;
    height: 100%;
    border: 0;
    padding: 0 var(--space-input-x);
    background: transparent;
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .items-v2-brand-field input {
    text-align: left;
    font-variant-numeric: normal;
  }
  .items-v2-money-field em {
    padding-right: var(--space-input-x);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-style: normal;
  }
  .items-v2-money-field:focus-within {
    border-color: var(--color-primary);
    box-shadow: none;
  }
  .items-v2-money-field input:focus {
    outline: none;
  }
  .estimate-condition-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    gap: 0;
    width: min(420px, calc(100vw - 24px));
    height: auto;
    padding: 0;
    border-left: 1px solid var(--color-border);
    background: var(--color-surface);
    box-shadow: -12px 0 28px rgba(31, 41, 51, 0.08);
    overflow: hidden;
  }
  .estimate-condition-drawer__header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: 56px;
    padding: var(--space-1-5) var(--space-2);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .estimate-condition-drawer__header div {
    display: grid;
    gap: var(--space-0-5);
    min-width: 0;
  }
  .estimate-condition-drawer__header span {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .estimate-condition-drawer__header strong {
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: var(--font-size-section-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-section-title);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .estimate-condition-drawer__fields {
    display: block;
    flex: 0 1 auto;
    min-height: 0;
    max-height: calc(100dvh - 144px);
    overflow-y: auto;
  }
  .estimate-condition-drawer__fields .condition-static-field,
  .estimate-condition-drawer__fields .condition-static-wide {
    display: grid;
    grid-column: auto;
    gap: var(--space-1);
    min-height: 0;
    padding: var(--space-1-5) var(--space-2);
    border: 0;
    border-bottom: 1px solid var(--color-border);
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .estimate-condition-drawer__fields .field-label {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-body);
  }
  .estimate-condition-drawer__fields .custom-select-trigger,
  .estimate-condition-drawer__fields .segmented button,
  .estimate-condition-drawer__fields .condition-variant-option {
    min-height: var(--button-height);
    border-radius: var(--radius-button);
    box-shadow: none;
  }
  .estimate-condition-drawer__fields .segmented {
    gap: var(--space-1);
  }
  .estimate-condition-drawer__fields .segmented button {
    flex: 1 1 0;
    justify-content: center;
  }
  .estimate-condition-drawer__fields .chips {
    gap: var(--space-1);
  }
  .estimate-condition-drawer__fields .chips button.condition-variant-option {
    padding: 0 var(--space-1-5);
    border-color: var(--color-border);
    background: var(--color-surface);
  }
  .estimate-condition-drawer__fields .chips button.condition-variant-option.selected,
  .estimate-condition-drawer__fields .segmented button.selected,
  .estimate-condition-drawer__fields .custom-select-trigger.has-value {
    border-color: var(--border-selected);
    background: var(--surface-selected);
    color: var(--color-primary);
    font-weight: var(--font-weight-semibold);
  }
  .estimate-condition-drawer__fields .condition-variant-card-head {
    align-items: center;
    margin: 0;
  }
  .estimate-condition-drawer__fields .condition-static-note {
    margin: 0;
    padding: var(--space-1);
    border-radius: var(--radius-button);
    background: var(--color-surface-subtle);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .estimate-condition-drawer__fields .custom-select-menu {
    max-height: 320px;
  }
  .estimate-condition-drawer__actions {
    flex: 0 0 auto;
    display: grid;
    gap: var(--space-1);
    margin-top: 0;
    padding: var(--space-2);
    border-top: 0;
    background: var(--color-surface);
  }
  .estimate-condition-drawer__actions .ui-button {
    width: 100%;
    min-height: var(--button-height);
  }
  .items-v2-empty-actions {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    flex-wrap: wrap;
  }
  .items-v2-table-empty {
    min-height: 160px;
    padding: var(--space-3);
  }
  .items-v2-site-memo {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
  }
  .items-v2-site-memo summary {
    cursor: pointer;
    padding: var(--space-toolbar-y) var(--space-toolbar-x);
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-body);
  }
  .items-v2-site-memo textarea {
    width: calc(100% - var(--space-4));
    min-height: 96px;
    margin: 0 var(--space-2) var(--space-2);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-input);
    padding: var(--space-1);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
    line-height: var(--line-height-body);
    resize: vertical;
  }
  .items-v2-site-memo textarea:focus {
    border-color: var(--color-primary);
    box-shadow: none;
    outline: none;
  }
  .items-v2-total-bar {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr) max-content;
    align-items: center;
    margin-right: calc(var(--space-page-x) * -1);
    margin-left: calc(var(--space-page-x) * -1);
  }
  .items-v2-total-bar .ui-sticky-total-bar__amounts {
    min-width: 0;
    margin-left: 0;
    justify-self: end;
  }
  .items-v2-total-bar .ui-sticky-total-bar__amount-value {
    white-space: nowrap;
  }
  .items-v2-total-bar .items-v2-total-actions {
    justify-self: end;
    flex: 0 0 auto;
  }
  .items-v2-total-bar .items-v2-total-actions .ui-button {
    white-space: nowrap;
  }
  .formate-app-shell--admin-price-v2 .formate-app-shell__main {
    padding: 0;
  }
  .admin-price-v2-page {
    display: grid;
    grid-template-columns: var(--layout-local-sidebar) minmax(0, 1fr);
    min-height: 100dvh;
    min-width: 0;
    background: var(--color-bg);
  }
  .admin-price-v2-sidebar {
    position: sticky;
    top: 0;
    width: var(--layout-local-sidebar);
    height: 100dvh;
    max-height: 100dvh;
    overflow-y: auto;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .admin-price-v2-sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-2);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .admin-price-v2-sidebar-header strong {
    color: var(--color-text-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
  }
  .admin-price-v2-category-list {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-2);
  }
  .admin-price-v2-category-list > .admin-items-v2-loading-line {
    width: 72%;
    height: var(--button-height);
    border-radius: var(--radius-button);
    background: var(--color-surface-subtle);
  }
  .admin-price-v2-category-list > .admin-items-v2-loading-line.wide {
    width: 100%;
  }
  .admin-price-v2-category-list > .admin-items-v2-loading-line.short {
    width: 56%;
  }
  .admin-price-v2-category-item {
    position: relative;
    display: grid;
    grid-template-columns: 20px 28px minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-1);
    min-height: 36px;
    width: 100%;
    padding: 0 var(--space-1);
    border: 1px solid transparent;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-primary);
    text-align: left;
    font: inherit;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  }
  .admin-price-v2-category-item:hover {
    background: var(--color-surface-subtle);
  }
  .admin-price-v2-category-item:focus {
    outline: none;
  }
  .admin-price-v2-category-item:focus-visible {
    outline: 1px solid var(--focus-ring-color);
    outline-offset: -1px;
  }
  .admin-price-v2-category-item.active {
    border-color: var(--border-selected);
    background: var(--surface-selected);
    box-shadow: none;
    font-weight: var(--font-weight-medium);
  }
  .admin-price-v2-category-item.drop-target {
    border-color: var(--color-primary-border);
  }
  .admin-price-v2-drag-handle {
    color: var(--color-text-muted);
    font-size: var(--font-size-caption);
    line-height: 1;
    cursor: grab;
  }
  .admin-price-v2-category-name {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
  }
  .admin-price-v2-category-name span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .admin-price-v2-category-pin {
    display: inline-grid;
    width: 28px;
    height: 28px;
    place-items: center;
    border: 1px solid transparent;
    border-radius: var(--radius-button);
    padding: 0;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .admin-price-v2-category-pin:hover {
    background: var(--color-surface-subtle);
    color: var(--color-text-secondary);
  }
  .admin-price-v2-category-pin.active {
    color: var(--color-primary);
  }
  .admin-price-v2-category-pin:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
  .admin-price-v2-category-count {
    min-width: 34px;
    height: 22px;
    padding: 0 var(--space-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-badge);
    background: var(--color-surface-subtle);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    line-height: 20px;
    text-align: center;
  }
  .admin-price-v2-workspace {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
    padding: 0;
    background: var(--color-bg);
    overflow: hidden;
  }
  .admin-price-v2-header {
    position: sticky;
    top: 0;
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: 56px;
    padding: 0 var(--space-2);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .admin-price-v2-header h1 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--font-size-work-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-work-title);
  }
  .admin-price-v2-toolbar {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-1-5) var(--space-2);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    overflow: visible;
  }
  .admin-price-v2-search {
    flex: 0 1 320px;
    min-width: 180px;
    max-width: 320px;
    height: var(--button-height-sm);
    min-height: var(--button-height-sm);
  }
  .admin-price-v2-search input {
    font-size: var(--font-size-table-cell);
  }
  .admin-price-v2-favorite {
    flex: 0 0 auto;
    min-height: var(--button-height-sm);
    white-space: nowrap;
  }
  .admin-price-v2-toolbar > .admin-bulk-panel {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .admin-price-v2-toolbar .admin-bulk-title {
    display: none;
  }
  .admin-price-v2-toolbar .admin-bulk-panel label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
    white-space: nowrap;
  }
  .admin-price-v2-toolbar .admin-bulk-panel input {
    width: 72px;
    height: var(--button-height-sm);
    min-height: var(--button-height-sm);
    padding: 0 var(--space-1);
    font-size: var(--font-size-table-cell);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .admin-price-v2-toolbar .admin-bulk-actions {
    display: inline-flex;
  }
  .admin-price-v2-toolbar .secondary-button,
  .admin-price-v2-toolbar .ui-button {
    height: var(--button-height-sm);
    min-height: var(--button-height-sm);
  }
  .admin-catalog-toolbar-skeleton {
    width: min(320px, 100%);
    height: var(--button-height-sm);
    border-radius: var(--radius-button);
    background: var(--color-surface-subtle);
  }
  .admin-price-v2-table-section {
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    min-height: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: var(--color-bg);
    box-shadow: none;
    overflow: hidden;
  }
  .admin-price-v2-section-header {
    min-height: 56px;
  }
  .admin-price-v2-context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: 44px;
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .admin-price-v2-context-main,
  .admin-price-v2-context-actions {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
  }
  .admin-price-v2-context-label {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
    white-space: nowrap;
  }
  .admin-price-v2-context input {
    width: 220px;
    height: var(--button-height-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-input);
    padding: 0 var(--space-1);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: var(--font-size-table-cell);
    font-weight: var(--font-weight-medium);
  }
  .admin-price-v2-context input:focus {
    border-color: var(--color-primary);
    outline: none;
  }
  .admin-price-v2-table-scroll {
    width: 100%;
    max-width: 100%;
    height: 100%;
    margin: 0;
    overflow-x: auto;
    overflow-y: visible;
    scrollbar-gutter: stable;
  }
  .admin-price-v2-grid-list {
    display: block;
    width: 100%;
    min-width: 820px;
    max-width: none;
    margin: 0;
    padding-left: 0;
    gap: 0;
    --price-table-columns: 40px minmax(160px, 1fr) 110px 80px 110px 110px 110px 60px 40px;
  }
  .admin-price-v2-grid-list.price-table-list,
  .admin-price-v2-grid-list.admin-subitem-list {
    margin-top: 0;
    padding-left: 0;
  }
  .admin-price-v2-grid-list .admin-price-table-header.admin-price-v2-grid,
  .admin-price-v2-grid-list .admin-value-row.common-price-row.admin-price-v2-grid,
  .admin-price-v2-grid-list .admin-catalog-skeleton-row {
    display: grid;
    width: 100%;
    min-width: 0;
    grid-template-columns: var(--price-table-columns);
    gap: 0;
  }
  .admin-catalog-table-skeleton .admin-catalog-skeleton-row {
    min-height: var(--table-row-height);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .items-v2-detail-panel--sash {
    display: block;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
  .admin-catalog-table-skeleton .admin-catalog-skeleton-row:nth-child(even) {
    background: var(--color-row-alt);
  }
  .admin-catalog-skeleton-line {
    display: block;
    width: 64%;
    height: 8px;
    border-radius: var(--radius-badge);
    background: var(--color-border);
    opacity: 0.56;
  }
  .admin-price-v2-grid-list .admin-price-table-header {
    width: 100%;
    box-sizing: border-box;
    min-height: var(--table-header-height);
    height: var(--table-header-height);
    border: 0;
    border-bottom: 1px solid var(--color-border);
    border-radius: 0;
    background: var(--color-header-bg);
    color: var(--color-text-secondary);
    font-size: var(--font-size-table-header);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-table-header);
    letter-spacing: var(--letter-spacing-table-header);
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row {
    position: relative;
    width: 100%;
    box-sizing: border-box;
    min-height: var(--table-row-height);
    padding: 0;
    border: 0;
    border-bottom: 1px solid var(--color-border);
    border-radius: 0;
    background: var(--color-surface);
    transition: background-color 120ms ease, border-color 120ms ease;
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row.expanded {
    row-gap: var(--space-2);
    padding-top: var(--space-1);
    padding-bottom: var(--space-1);
  }
  .admin-price-v2-grid-list .admin-price-table-header > *,
  .admin-price-v2-grid-list .admin-value-row.common-price-row > *:not(.admin-price-v2-expanded-row),
  .admin-price-v2-grid-list .admin-catalog-skeleton-row > * {
    display: flex;
    align-items: center;
    min-width: 0;
    height: 100%;
    min-height: inherit;
    padding: 0 var(--space-table-cell-x);
    border-right: 1px solid var(--color-border);
    box-sizing: border-box;
    white-space: nowrap;
  }
  .admin-price-v2-grid-list .admin-price-table-header > *:last-child,
  .admin-price-v2-grid-list .admin-value-row.common-price-row > .admin-price-v2-expand-button,
  .admin-price-v2-grid-list .admin-catalog-skeleton-row > *:last-child {
    border-right: 0;
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row > .admin-price-v2-drag-handle,
  .admin-price-v2-grid-list .admin-value-row.common-price-row > .admin-price-v2-danger-button,
  .admin-price-v2-grid-list .admin-value-row.common-price-row > .admin-price-v2-expand-button {
    justify-content: center;
    padding: 0;
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row:nth-of-type(even) {
    background: var(--color-row-alt);
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row:hover {
    background: var(--color-row-alt);
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row.admin-price-v2-row-error {
    min-height: 56px;
    background: var(--color-danger-subtle);
    box-shadow: inset 3px 0 0 var(--color-danger);
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row.admin-price-v2-row-error:hover {
    background: var(--color-danger-subtle);
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row label {
    gap: 0;
  }
  .admin-price-v2-grid-list .admin-material-name-field--error {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: var(--space-1);
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row .field-label {
    display: none;
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row input,
  .admin-price-v2-grid-list .admin-value-row.common-price-row select,
  .admin-price-v2-grid-list .spec-options-control {
    width: 100%;
    min-width: 0;
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row input,
  .admin-price-v2-grid-list .admin-value-row.common-price-row select {
    height: var(--button-height-sm);
    min-height: var(--button-height-sm);
    border: 1px solid transparent;
    border-radius: 0;
    padding: 0 var(--space-1);
    background: transparent;
    color: var(--color-text-primary);
    font-size: var(--font-size-table-cell);
    line-height: var(--line-height-table-cell);
    transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row input:focus,
  .admin-price-v2-grid-list .admin-value-row.common-price-row select:focus {
    border-color: var(--color-primary);
    background: var(--color-surface);
    box-shadow: none;
    outline: none;
  }
  .admin-price-v2-grid-list .admin-material-name-field--error input {
    border-color: var(--color-danger-border);
    background: var(--color-surface);
  }
  .admin-price-validation-helper {
    display: block;
    color: var(--color-danger);
    font-size: var(--font-size-caption);
    line-height: 1.2;
    white-space: normal;
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row input[inputmode="numeric"],
  .admin-price-v2-grid-list .price-number-field input {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: var(--font-weight-medium);
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row .price-unit-field select {
    color: var(--color-text-secondary);
    text-align: center;
  }
  .admin-price-v2-grid-list .admin-value-row.common-price-row input.items-v2-muted-value {
    color: var(--color-text-muted);
  }
  .admin-price-v2-grid-list .spec-options-control {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 48px;
    gap: var(--space-1);
  }
  .admin-price-v2-grid-list .spec-options-control--select-manage {
    display: block;
  }
  .admin-price-v2-danger-button {
    width: var(--button-height-sm);
    height: var(--button-height-sm);
    min-height: var(--button-height-sm);
    border: 0;
    background: transparent;
    color: var(--color-danger);
    box-shadow: none;
    padding: 0;
  }
  .admin-price-v2-danger-button:hover:not(:disabled),
  .admin-price-v2-danger-button:focus-visible {
    border: 0;
    background: var(--color-danger-subtle);
    color: var(--color-danger);
    box-shadow: none;
    outline: none;
  }
  .admin-price-v2-expand-button {
    justify-self: center;
  }
  .admin-price-v2-expanded-row {
    grid-column: 1 / -1;
    padding: 0 0 var(--space-1);
  }
  .admin-price-v2-detail-panel {
    grid-template-columns: repeat(2, minmax(0, 180px));
    align-items: end;
    padding: var(--space-2);
    background: var(--color-surface-subtle);
  }
  .admin-price-v2-detail-select {
    height: var(--button-height);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-input);
    padding: 0 var(--space-input-x);
    background: var(--color-surface);
  }
  .admin-price-v2-add-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-2);
    min-height: 44px;
    padding: var(--space-1) var(--space-table-cell-x);
    border: 0;
    border-bottom: 1px solid var(--color-border);
    border-radius: 0;
    background: var(--color-surface);
  }
  .admin-price-v2-add-row span {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .estimate-condition-drawer__spacer {
    flex: 1 1 auto;
    min-height: 0;
  }
  .items-v2-template-review {
    position: sticky;
    top: 0;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1-5);
    min-height: var(--table-row-height);
    border: 1px solid var(--color-warning-border);
    border-left: 3px solid var(--color-warning);
    border-radius: var(--radius-button);
    background: var(--color-warning-soft);
    background: color-mix(in srgb, var(--color-warning-soft) 82%, var(--color-warning-border));
    color: var(--color-text-primary);
    padding: var(--space-1) var(--space-1-5);
    font-size: var(--font-size-body-sm);
    line-height: var(--line-height-body);
  }
  .items-v2-template-review__message,
  .items-v2-template-review__actions {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--space-1);
  }
  .items-v2-template-review__message {
    flex: 1 1 auto;
    min-width: 0;
  }
  .items-v2-template-review__message svg {
    flex: 0 0 auto;
    color: var(--color-warning);
  }
  .items-v2-template-review__message strong {
    color: var(--color-text-primary);
    font-weight: var(--font-weight-semibold);
  }
  .items-v2-table .items-v2-row--template-conflict td {
    background: var(--color-warning-soft) !important;
    background: color-mix(in srgb, var(--color-warning-soft) 90%, var(--color-warning-border)) !important;
    border-bottom-color: var(--color-warning-border);
  }
  .items-v2-table .items-v2-row--template-conflict td:first-child {
    box-shadow: inset 3px 0 0 var(--color-warning);
  }
  .items-v2-table .items-v2-row--photo-context {
    outline: 1px solid var(--color-primary);
    outline-offset: -1px;
  }
  .items-v2-inline-input--template-conflict,
  .items-v2-money-field--template-conflict {
    border-color: var(--color-warning-border) !important;
    background: var(--color-warning-soft) !important;
    color: var(--color-text-primary);
  }
  .admin-price-v2-add-action {
    display: flex;
    justify-content: center;
    padding: var(--space-2) 0;
  }
  .admin-price-v2-empty {
    margin: 0;
    padding: var(--space-3);
    border-bottom: 1px solid var(--color-border);
  }
  .formate-app-shell--admin-items-v2 .formate-app-shell__main {
    height: 100dvh;
    min-height: 0;
    padding: 0;
    overflow-x: hidden;
    overflow-y: hidden;
  }
  .admin-items-v2-page,
  .admin-items-v2-workspace,
  .admin-items-v2-table-section {
    min-width: 0;
    min-height: 0;
  }
  .admin-items-v2-page {
    grid-template-columns: var(--layout-local-sidebar) minmax(0, 1fr);
    align-items: stretch;
    width: 100%;
    max-width: 100%;
    height: 100dvh;
    max-height: 100dvh;
    overflow: hidden;
  }
  .admin-items-v2-sidebar {
    width: 100%;
    display: flex;
    flex-direction: column;
    transition: opacity 150ms ease, filter 150ms ease;
  }
  .admin-template-condition-sidebar {
    position: relative;
    top: auto;
    height: 100%;
    min-height: 0;
    max-height: none;
    overflow: hidden;
    background: var(--color-surface);
  }
  .admin-template-condition-sidebar .admin-price-v2-category-list {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    flex: 1 1 auto;
    min-height: 0;
    gap: var(--space-0-5);
    padding: var(--space-1);
    overflow-y: auto;
  }
  .admin-template-condition-item {
    flex: 0 0 auto;
    grid-template-columns: 20px minmax(0, 1fr) 32px;
    align-content: center;
    min-height: 44px;
    max-height: none;
    padding: 0 var(--space-1);
    border-radius: var(--radius-button);
    box-shadow: none;
  }
  .admin-template-condition-name span {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    white-space: normal;
    line-height: var(--line-height-caption);
  }
  .admin-template-condition-delete {
    width: 28px;
    height: 28px;
    min-height: 28px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-muted);
    opacity: 0;
    transition: opacity 150ms ease, background-color 150ms ease, color 150ms ease;
  }
  .admin-template-condition-delete:hover:not(:disabled),
  .admin-template-condition-delete:focus-visible {
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
  }
  .admin-template-condition-item:hover .admin-template-condition-delete,
  .admin-template-condition-item.active .admin-template-condition-delete,
  .admin-template-condition-delete:focus-visible {
    opacity: 1;
  }
  .admin-template-condition-item.newly-added {
    animation: admin-template-condition-highlight 1.4s ease;
  }
  .admin-template-condition-empty {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-2);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-panel);
    background: var(--color-surface-subtle);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .admin-template-condition-empty strong {
    color: var(--color-text-primary);
    font-size: var(--font-size-body-sm);
  }
  .admin-template-condition-sidebar-footer {
    flex: 0 0 auto;
    padding: var(--space-2);
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .admin-template-condition-sidebar-footer .ui-button {
    width: 100%;
  }
  .admin-items-v2-page--drawer-open > .admin-price-v2-sidebar,
  .admin-items-v2-page--drawer-open .admin-items-v2-workspace {
    opacity: 0.88;
    filter: blur(1px) saturate(0.96);
  }
  .admin-template-condition-drawer {
    position: fixed;
    inset: 0 0 0 auto;
    width: min(420px, 100vw);
    max-width: 420px;
    height: 100dvh;
    max-height: none;
    margin: 0;
    border-radius: 0;
    box-shadow: -12px 0 28px rgba(31, 41, 51, 0.08);
  }
  .admin-template-condition-drawer-error {
    margin: var(--space-2);
  }
  .admin-items-v2-category-panel {
    position: relative;
    top: auto;
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    height: 100%;
    min-height: 0;
    max-height: none;
    min-width: 0;
    overflow: hidden;
    padding: 0;
    border-right: 1px solid var(--color-border);
    border-radius: 0;
    background: var(--color-surface);
    transition: opacity 150ms ease, filter 150ms ease;
  }
  .admin-items-v2-category-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-2);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .admin-items-v2-category-panel-head strong {
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
  }
  .admin-items-v2-category-panel-list {
    display: grid;
    gap: var(--space-1);
    flex: 1 1 auto;
    padding: var(--space-2);
    min-height: 0;
    overflow-y: auto;
    scrollbar-gutter: stable;
  }
  .admin-items-v2-category-chip {
    width: 100%;
    min-width: 0;
    max-width: none;
  }
  @keyframes admin-template-condition-highlight {
    0% {
      background: var(--color-primary-soft);
      box-shadow: inset 3px 0 0 var(--color-primary);
    }
    100% {
      background: transparent;
      box-shadow: none;
    }
  }
  .admin-items-v2-toolbar {
    align-items: center;
    justify-content: flex-start;
    margin: 0;
  }
  .admin-items-v2-toolbar .admin-price-v2-search {
    flex: 0 1 320px;
    max-width: 320px;
  }
  .admin-items-v2-toolbar .admin-price-v2-favorite {
    flex: 0 0 auto;
  }
  .admin-items-v2-workspace {
    gap: 0;
    height: 100%;
    min-height: 0;
    padding: 0;
    background: var(--color-bg);
    overflow: hidden;
  }
  .admin-items-v2-header {
    flex-wrap: nowrap;
    padding: 0 var(--space-2);
    background: var(--color-bg);
  }
  .admin-items-v2-header .items-v2-titleline,
  .admin-items-v2-header .items-v2-header-actions {
    min-width: 0;
  }
  .admin-items-v2-header .items-v2-header-actions {
    flex-wrap: nowrap;
  }
  .admin-items-v2-header .ui-button,
  .admin-items-v2-header .autosave-pill {
    white-space: nowrap;
  }
  .admin-items-v2-toolbar {
    padding: var(--space-1-5) var(--space-2);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
  }
  .template-condition-switcher {
    position: relative;
    width: min(440px, 100%);
    min-width: 0;
  }
  .template-condition-switcher__trigger {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-1);
    width: 100%;
    height: var(--button-height-sm);
    padding: 0 var(--space-1-5);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-body-sm);
    text-align: left;
    cursor: pointer;
    transition: background-color 120ms ease, border-color 120ms ease, opacity 120ms ease;
  }
  .template-condition-switcher__trigger span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .template-condition-switcher__trigger:hover:not(:disabled) {
    border-color: var(--color-primary-border);
    background: var(--color-surface-subtle);
  }
  .template-condition-switcher__trigger:active:not(:disabled) {
    opacity: 0.82;
  }
  .template-condition-switcher__trigger:focus-visible,
  .template-condition-switcher__icon:focus-visible,
  .template-condition-switcher__select:focus-visible,
  .template-condition-switcher__create:focus-visible,
  .template-condition-switcher__row-menu button:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
  .template-condition-switcher__popover {
    position: absolute;
    z-index: 20;
    top: calc(100% + var(--space-1));
    left: 0;
    display: flex;
    flex-direction: column;
    width: min(420px, calc(100vw - var(--space-4)));
    max-height: min(520px, calc(100dvh - 144px));
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-panel);
    background: var(--color-surface);
    box-shadow: var(--shadow-popover);
    overflow: hidden;
  }
  .template-condition-switcher__search {
    flex: 0 0 auto;
    height: var(--button-height-sm);
    min-height: var(--button-height-sm);
    margin: var(--space-1);
  }
  .template-condition-switcher__search input {
    font-size: var(--font-size-body-sm);
  }
  .template-condition-switcher__list {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    border-top: 1px solid var(--color-border);
  }
  .template-condition-switcher__section {
    display: grid;
    padding: var(--space-1) 0;
    border-bottom: 1px solid var(--color-border);
  }
  .template-condition-switcher__section > strong {
    padding: var(--space-0-5) var(--space-1-5);
    color: var(--color-text-muted);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
  }
  .template-condition-switcher__row {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 32px 32px;
    align-items: center;
    min-height: var(--table-row-height);
    padding: 0 var(--space-1);
    color: var(--color-text-primary);
    transition: background-color 120ms ease, box-shadow 120ms ease;
  }
  .template-condition-switcher__row:hover {
    background: var(--color-surface-subtle);
  }
  .template-condition-switcher__row.active {
    background: var(--surface-selected);
    box-shadow: inset 0 0 0 1px var(--border-selected);
  }
  .template-condition-switcher__select {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr);
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
    height: 100%;
    padding: 0 var(--space-1);
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: var(--font-size-body-sm);
    text-align: left;
    cursor: pointer;
  }
  .template-condition-switcher__select > span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .template-condition-switcher__check {
    display: inline-flex;
    color: var(--color-primary);
  }
  .template-condition-switcher__icon {
    display: inline-grid;
    place-items: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
  }
  .template-condition-switcher__icon:hover {
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
  }
  .template-condition-switcher__icon.favorite {
    color: var(--color-warning);
  }
  .template-condition-switcher__actions {
    position: relative;
  }
  .template-condition-switcher__row-menu {
    position: absolute;
    z-index: 2;
    top: 30px;
    right: 0;
    display: grid;
    width: 132px;
    padding: var(--space-0-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    box-shadow: var(--shadow-popover);
  }
  .template-condition-switcher__row-menu button {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-height: 32px;
    padding: 0 var(--space-1);
    border: 0;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-caption);
    cursor: pointer;
  }
  .template-condition-switcher__row-menu button:hover {
    background: var(--color-surface-subtle);
  }
  .template-condition-switcher__row-menu button.danger {
    color: var(--color-danger);
  }
  .template-condition-switcher__create {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--space-1);
    min-height: var(--button-height-sm);
    padding: 0 var(--space-1-5);
    border: 0;
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-primary);
    font: inherit;
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-medium);
    text-align: left;
    cursor: pointer;
  }
  .template-condition-switcher__create:hover {
    background: var(--color-primary-soft);
  }
  .template-condition-switcher__empty {
    margin: 0;
    padding: var(--space-3) var(--space-2);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-sm);
    text-align: center;
  }
  .admin-items-v2-workspace > .status-box,
  .admin-items-v2-workspace > .error-box {
    margin: var(--space-2);
  }
  .admin-items-v2-table-section {
    flex: 1 1 auto;
    width: 100%;
    max-width: 100%;
    min-height: 0;
    border: 0;
    border-radius: 0;
    background: var(--color-bg);
    box-shadow: none;
    overflow: hidden;
  }
  .admin-items-v2-table-section .admin-price-v2-table-scroll {
    width: 100%;
    max-width: 100%;
    height: 100%;
    background: transparent;
    overflow-x: auto;
    overflow-y: auto;
    border-radius: 0;
  }
  .admin-items-v2-condition {
    flex: 0 1 220px;
  }
  .admin-items-v2-condition strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .admin-items-v2-grid-list {
    display: block;
    width: 100%;
    min-width: 740px;
    max-width: none;
    margin: 0;
    padding-left: 0;
    gap: 0;
    --quantity-table-columns: 48px minmax(220px, 1fr) minmax(120px, 140px) 96px minmax(96px, 120px) minmax(96px, 120px) 64px;
  }
  .admin-items-v2-grid-list.quantity-table-list,
  .admin-items-v2-grid-list.admin-subitem-list {
    margin-top: 0;
    padding-left: 0;
  }
  .admin-items-v2-grid-list .admin-quantity-table-header,
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row,
  .admin-items-v2-grid-list .admin-catalog-skeleton-row {
    display: grid;
    grid-template-columns: var(--quantity-table-columns);
    align-items: center;
    gap: 0;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .admin-items-v2-grid-list .admin-quantity-table-header {
    min-height: var(--table-header-height);
    height: var(--table-header-height);
    padding: 0;
    border: 0;
    border-bottom: 1px solid var(--color-border);
    border-radius: 0;
    background: var(--color-header-bg);
    color: var(--color-text-secondary);
    font-size: var(--font-size-table-header);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-table-header);
    letter-spacing: var(--letter-spacing-table-header);
  }
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row {
    position: relative;
    min-height: var(--table-row-height);
    padding: 0;
    border: 0;
    border-bottom: 1px solid var(--color-border);
    border-radius: 0;
    background: var(--color-surface);
    transition: background-color 120ms ease, border-color 120ms ease;
  }
  .admin-items-v2-grid-list .admin-quantity-table-header > *,
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row > *,
  .admin-items-v2-grid-list .admin-catalog-skeleton-row > * {
    display: flex;
    align-items: center;
    min-width: 0;
    height: 100%;
    min-height: inherit;
    padding: 0 var(--space-table-cell-x);
    border-right: 1px solid var(--color-border);
    box-sizing: border-box;
  }
  .admin-items-v2-grid-list .admin-quantity-table-header > *:last-child,
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row > .admin-price-v2-danger-button,
  .admin-items-v2-grid-list .admin-catalog-skeleton-row > *:last-child {
    border-right: 0;
  }
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row > .admin-price-v2-drag-handle,
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row > .admin-price-v2-danger-button {
    justify-content: center;
    padding: 0;
  }
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row > .admin-price-v2-danger-button {
    justify-self: center;
    width: var(--button-height-sm);
    height: var(--button-height-sm);
    min-height: var(--button-height-sm);
    border: 0;
    background: transparent;
    color: var(--color-danger);
    box-shadow: none;
  }
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row > .admin-price-v2-danger-button:hover:not(:disabled),
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row > .admin-price-v2-danger-button:focus-visible {
    border: 0;
    background: var(--color-danger-subtle);
    color: var(--color-danger);
    box-shadow: none;
  }
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row:nth-of-type(even) {
    background: var(--color-row-alt);
  }
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row:hover {
    background: var(--color-row-alt);
  }
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row label {
    gap: 0;
  }
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row .admin-items-v2-number-cell {
    display: block;
    min-width: 0;
  }
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row .admin-items-v2-day-input {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    width: 100%;
    min-width: 0;
    height: 100%;
  }
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row .admin-items-v2-day-input > span {
    padding-right: var(--space-1);
    color: var(--color-text-muted);
    font-size: var(--font-size-table-cell);
    font-variant-numeric: tabular-nums;
    font-weight: var(--font-weight-medium);
  }
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row .field-label {
    display: none;
  }
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row input,
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row select {
    width: 100%;
    min-width: 0;
    height: var(--button-height-sm);
    min-height: var(--button-height-sm);
    border: 1px solid transparent;
    border-radius: 0;
    padding: 0 var(--space-1);
    background: transparent;
    color: var(--color-text-primary);
    font-size: var(--font-size-table-cell);
    line-height: var(--line-height-table-cell);
    transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
  }
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row input:focus,
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row select:focus {
    border-color: var(--color-primary);
    background: var(--color-surface);
    box-shadow: none;
    outline: none;
  }
  .admin-items-v2-grid-list .admin-value-row.condition-quantity-row .items-v2-inline-input--number {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: var(--font-weight-medium);
  }
  .admin-items-v2-muted-cell {
    color: var(--color-text-muted);
    font-size: var(--font-size-table-cell);
    line-height: var(--line-height-table-cell);
  }
  .saved-estimates-page .estimate-list .ui-table-wrap,
  .saved-estimates-page .estimate-modal .ui-table-wrap {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-table);
    background: var(--color-surface);
    box-shadow: none;
  }
  .saved-estimates-page .estimate-list .ui-table-scroll,
  .saved-estimates-page .estimate-modal .ui-table-scroll {
    overflow: auto;
  }
  .saved-estimates-page .ui-table {
    width: 100%;
    border-collapse: collapse;
    color: var(--color-text-primary);
    font-size: var(--font-size-table-cell);
    line-height: var(--line-height-table-cell);
  }
  .saved-estimates-page .ui-table th,
  .saved-estimates-page .ui-table td {
    height: var(--table-row-height);
    padding: 0 var(--space-table-cell-x);
    border: 0;
    border-bottom: 1px solid var(--color-border);
    text-align: left;
    vertical-align: middle;
  }
  .saved-estimates-page .ui-table th {
    height: var(--table-header-height);
    background: var(--color-header-bg);
    color: var(--color-text-secondary);
    font-size: var(--font-size-table-header);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-table-header);
    letter-spacing: var(--letter-spacing-table-header);
  }
  .saved-estimates-page .ui-table .ui-table__cell--right,
  .saved-estimates-page .ui-table th.ui-table__cell--right,
  .saved-estimates-page .ui-table td.ui-table__cell--right {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .saved-estimates-page .ui-table--zebra tbody tr:nth-child(even) td,
  .saved-estimates-page .estimate-modal .ui-table--zebra tbody tr:nth-child(even) td {
    background: var(--color-row-alt);
  }
  .saved-estimates-page .ui-table tbody tr:hover td,
  .saved-estimates-page .estimate-modal .ui-table tbody tr:hover td {
    background: var(--color-row-alt);
  }
  .saved-estimate-customer {
    display: block;
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: var(--font-size-table-cell);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-table-cell);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .saved-estimate-address,
  .saved-estimate-muted {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .saved-estimate-address {
    color: var(--color-text-primary);
  }
  .saved-estimate-muted {
    color: var(--color-text-muted);
  }
  .saved-estimate-table-actions {
    display: flex;
    flex-wrap: nowrap;
    gap: var(--space-0-5);
    justify-content: flex-end;
    white-space: nowrap;
  }
  .saved-estimate-row-action {
    min-height: 28px;
    padding: 0 var(--space-0-5);
    border: 0;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    font-size: var(--font-size-table-cell);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
  }
  .saved-estimate-row-action:hover,
  .saved-estimate-row-action:focus-visible {
    background: var(--color-primary-soft);
    color: var(--color-primary);
  }
  .saved-estimate-row-action.is-primary {
    color: var(--color-primary);
    font-weight: var(--font-weight-semibold);
  }
  .saved-estimate-row-action:focus-visible {
    outline: 2px solid var(--color-primary-border);
    outline-offset: 1px;
  }
  .saved-estimate-row-action.is-danger {
    color: var(--color-danger);
  }
  .saved-estimate-row-action.is-danger:hover,
  .saved-estimate-row-action.is-danger:focus-visible {
    background: var(--color-danger-soft);
    color: var(--color-danger);
  }
  .saved-estimate-row-action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .saved-estimates-page .modal-actions {
    display: flex;
    gap: var(--space-1);
    justify-content: flex-start;
    margin-bottom: var(--space-2);
  }
  .saved-estimate-view-tabs {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }
  .saved-estimate-view-tabs button {
    position: relative;
    display: inline-flex;
    min-height: var(--button-height-sm);
    align-items: center;
    gap: var(--space-0-5);
    padding: 0 var(--space-0-5);
    border: 0;
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
  }
  .saved-estimate-view-tabs button::after {
    position: absolute;
    right: 0;
    bottom: -1px;
    left: 0;
    height: 2px;
    background: transparent;
    content: "";
  }
  .saved-estimate-view-tabs button:hover,
  .saved-estimate-view-tabs button:focus-visible,
  .saved-estimate-view-tabs button.is-active {
    color: var(--color-primary);
  }
  .saved-estimate-view-tabs button.is-active::after {
    background: var(--color-primary);
  }
  .saved-estimate-view-tabs button:focus-visible {
    outline: 2px solid var(--color-primary-border);
    outline-offset: 2px;
  }
  .saved-estimate-tab-count {
    min-width: 20px;
    padding: 1px var(--space-0-5);
    border-radius: var(--radius-button);
    background: var(--color-header-bg);
    color: var(--color-text-muted);
    font-size: var(--font-size-caption);
    line-height: 18px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .saved-estimate-view-tabs button.is-active .saved-estimate-tab-count {
    background: var(--color-primary-soft);
    color: var(--color-primary);
  }
  .saved-estimates-page .estimate-modal {
    width: min(960px, 100%);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: var(--shadow-popover);
  }
  .saved-estimate-delete-trigger {
    margin-right: auto;
    color: var(--color-danger);
  }
  .saved-estimate-delete-trigger.ui-button--tertiary:hover,
  .saved-estimate-delete-trigger.ui-button--tertiary:focus-visible {
    background: var(--color-danger-soft);
    color: var(--color-danger);
    text-decoration-color: transparent;
  }
  .saved-estimate-delete-notice {
    margin-bottom: var(--space-2);
  }
  .saved-estimate-delete-backdrop {
    z-index: 90;
  }
  .saved-estimate-delete-dialog {
    display: grid;
    width: min(480px, 100%);
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: var(--shadow-popover);
  }
  .saved-estimate-delete-dialog__header {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    align-items: start;
    gap: var(--space-1-5);
  }
  .saved-estimate-delete-dialog__icon {
    display: inline-flex;
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-button);
    background: var(--color-danger-soft);
    color: var(--color-danger);
  }
  .saved-estimate-delete-dialog__header h2 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--font-size-title-sm);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-heading);
  }
  .saved-estimate-delete-dialog__header p,
  .saved-estimate-delete-dialog__preservation-note,
  .saved-estimate-delete-dialog__error {
    margin: var(--space-0-5) 0 0;
    font-size: var(--font-size-table-cell);
    line-height: var(--line-height-body);
  }
  .saved-estimate-delete-dialog__header p,
  .saved-estimate-delete-dialog__preservation-note {
    color: var(--color-text-secondary);
  }
  .saved-estimate-delete-dialog__summary {
    display: grid;
    margin: 0;
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
  }
  .saved-estimate-delete-dialog__summary > div {
    display: grid;
    grid-template-columns: 80px minmax(0, 1fr);
    gap: var(--space-1);
    padding: var(--space-1) 0;
    border-bottom: 1px solid var(--color-border);
  }
  .saved-estimate-delete-dialog__summary > div:last-child {
    border-bottom: 0;
  }
  .saved-estimate-delete-dialog__summary dt,
  .saved-estimate-delete-dialog__summary dd {
    margin: 0;
    font-size: var(--font-size-table-cell);
    line-height: var(--line-height-table-cell);
  }
  .saved-estimate-delete-dialog__summary dt {
    color: var(--color-text-muted);
  }
  .saved-estimate-delete-dialog__summary dd {
    overflow-wrap: anywhere;
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
    font-variant-numeric: tabular-nums;
  }
  .saved-estimate-delete-dialog__preservation-note {
    display: grid;
    margin: 0;
    gap: var(--space-1);
    padding: var(--space-1-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-button);
    background: var(--color-header-bg);
    color: var(--color-text-secondary);
    font-size: var(--font-size-table-cell);
    line-height: var(--line-height-body);
  }
  .saved-estimate-delete-dialog__preservation-note strong {
    color: var(--color-text-primary);
    font-weight: var(--font-weight-semibold);
  }
  .saved-estimate-delete-dialog__preservation-note p {
    margin: 0;
  }
  .saved-estimate-delete-dialog__error {
    margin: 0;
    padding: var(--space-1);
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-button);
    background: var(--color-danger-soft);
    color: var(--color-danger);
  }
  .saved-estimate-delete-dialog__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-1);
  }
  .saved-estimate-detail-table td:nth-child(2) {
    min-width: 220px;
  }
  .saved-estimate-modal-empty {
    margin-top: var(--space-2);
  }
  .general-preview-page,
  .detail-preview-page {
    height: 100%;
    min-height: 0;
    overflow: hidden;
    background: var(--color-bg);
  }
  .general-preview-panel,
  .detail-preview-panel {
    display: flex;
    width: min(var(--viewport-preferred-width), 100%);
    height: 100%;
    min-height: 0;
    flex-direction: column;
    overflow: hidden;
  }
  .estimate-preview-viewport {
    min-width: 0;
    min-height: 0;
    flex: 1 1 auto;
    overflow: auto;
    overscroll-behavior: contain;
  }
  .estimate-document {
    height: auto;
    max-height: none;
    overflow: visible;
    transform: none;
  }
  .estimate-document--screen {
    flex: 0 0 auto;
  }
  .estimate-pdf-export-host {
    position: fixed;
    top: 0;
    left: -100000px;
    width: max-content;
    height: auto;
    overflow: visible;
    pointer-events: none;
  }
  .general-estimate-document.estimate-document--pdf {
    width: 920px;
    max-width: none;
  }
  .detail-estimate-document.estimate-document--pdf {
    width: 1100px;
    max-width: none;
  }
  .general-preview-panel > .editor-header,
  .detail-preview-panel > .editor-header {
    flex: 0 0 auto;
    margin-bottom: var(--space-2);
    padding: var(--space-card-padding);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: none;
  }
  .general-preview-panel > .editor-header h2,
  .detail-preview-panel > .editor-header h2 {
    color: var(--color-text-primary);
    font-size: var(--font-size-work-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-work-title);
  }
  .general-estimate-document,
  .detail-estimate-document {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: none;
  }
  .general-preview-panel > .actions,
  .detail-preview-panel > .actions {
    flex: 0 0 auto;
  }
  .general-estimate-document .pdf-title-row,
  .detail-estimate-document .pdf-title-row {
    margin-bottom: var(--space-3);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border-strong);
  }
  .general-estimate-document .pdf-title-row h3,
  .detail-estimate-document .pdf-title-row h3 {
    color: var(--color-text-primary);
    font-size: var(--font-size-page-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-page-title);
    letter-spacing: var(--letter-spacing-normal);
  }
  .general-estimate-document .pdf-title-row .number-text,
  .detail-estimate-document .pdf-title-row .number-text {
    color: var(--color-text-primary);
    font-size: var(--font-size-work-title);
    font-weight: var(--font-weight-semibold);
  }
  .pdf-capture-area .estimate-meta-grid {
    margin-bottom: var(--space-3);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }
  .general-estimate-document .estimate-meta-grid div,
  .detail-estimate-document .estimate-meta-grid div,
  .general-estimate-document .estimate-pyeong-preview div,
  .detail-estimate-document .estimate-pyeong-preview div,
  .general-estimate-document .compact-key,
  .detail-estimate-document .compact-key,
  .general-estimate-document .estimate-note-box,
  .detail-estimate-document .estimate-note-box,
  .general-estimate-document .preview-site-memo,
  .detail-estimate-document .preview-site-memo,
  .general-estimate-document .estimate-adjustment-panel,
  .detail-estimate-document .customer-adjustment-preview {
    border-color: var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface-subtle);
    box-shadow: none;
  }
  .general-estimate-document .form-grid,
  .detail-estimate-document .form-grid {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface-subtle);
  }
  .general-estimate-document .form-grid input,
  .general-estimate-document .form-grid select,
  .detail-estimate-document .form-grid input,
  .detail-estimate-document .form-grid select,
  .general-estimate-document .preview-site-memo textarea,
  .detail-estimate-document .preview-site-memo textarea {
    border-color: var(--color-border-strong);
    border-radius: var(--radius-input);
    background: var(--color-surface);
  }
  .pdf-capture-area .preview-table {
    width: 100%;
    margin-top: var(--space-3);
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-table);
    border-collapse: separate;
    border-spacing: 0;
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: var(--font-size-table-cell);
    line-height: var(--line-height-table-cell);
  }
  .pdf-capture-area .preview-table th,
  .pdf-capture-area .preview-table td {
    height: var(--table-row-height);
    padding: 0 var(--space-table-cell-x);
    border: 0;
    border-right: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    text-align: left;
    vertical-align: middle;
  }
  .pdf-capture-area .preview-table th:last-child,
  .pdf-capture-area .preview-table td:last-child {
    border-right: 0;
  }
  .pdf-capture-area .preview-table th {
    height: var(--table-header-height);
    background: var(--color-header-bg);
    color: var(--color-text-secondary);
    font-size: var(--font-size-table-header);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-table-header);
    letter-spacing: var(--letter-spacing-table-header);
  }
  .pdf-capture-area .preview-table tbody tr:nth-child(even) td {
    background: var(--color-row-alt);
  }
  .pdf-capture-area .preview-table tbody tr:hover td {
    background: var(--color-row-alt);
  }
  .pdf-capture-area .preview-table td:has(.number-text),
  .pdf-capture-area .preview-table th:nth-child(n+3),
  .pdf-capture-area .preview-table td:nth-child(n+3) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .pdf-capture-area .preview-table .number-text {
    justify-content: flex-end;
    font-variant-numeric: tabular-nums;
  }
  .pdf-capture-area .general-estimate-table tfoot td {
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
  }
  .pdf-capture-area .general-estimate-table tfoot tr:last-child td {
    border-top: 1px solid var(--color-primary);
    background: var(--color-primary-soft);
    color: var(--color-primary);
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
  }
  .pdf-capture-area .detail-estimate-group {
    padding: var(--space-card-padding);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: none;
  }
  .pdf-capture-area .detail-estimate-group h3 {
    color: var(--color-text-primary);
    font-size: var(--font-size-section-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-section-title);
  }
  .pdf-capture-area .labor-detail-row td {
    background: var(--color-surface-subtle);
    color: var(--color-text-secondary);
  }
  .pdf-capture-area .preview-table td:empty,
  .pdf-capture-area .labor-detail-row td:first-child {
    color: var(--color-text-muted);
  }
  .general-preview-panel .actions .primary-button,
  .detail-preview-panel .actions .primary-button {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--text-inverse);
  }
  .general-preview-panel .actions .secondary-button,
  .detail-preview-panel .actions .secondary-button {
    border: 1px solid var(--color-border-strong);
    background: var(--color-surface);
    color: var(--color-text-primary);
  }
  .formate-app-shell__workspace-header {
    flex: 0 0 auto;
    padding-bottom: var(--space-1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .formate-app-shell__nav-section-title {
    color: rgba(255, 255, 255, 0.42);
    font-size: 12px;
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-caption);
  }
  .formate-app-shell--home-workspace {
    min-height: 100dvh;
  }
  .app-shell.home-workspace-shell {
    padding-top: 0;
  }
  .formate-app-shell--home-workspace .formate-app-shell__sidebar {
    top: 0;
    height: 100dvh;
    max-height: 100dvh;
    padding-top: var(--space-2);
  }
  .formate-app-shell--home-workspace .formate-app-shell__main {
    padding: 0;
    background: var(--color-bg);
  }
  .home-sidebar-workspace {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: var(--space-1);
    min-height: 44px;
    color: rgba(255, 255, 255, 0.94);
  }
  .home-sidebar-workspace img {
    width: 32px;
    height: 32px;
    display: block;
  }
  .home-sidebar-workspace span {
    display: grid;
    gap: 0;
    min-width: 0;
  }
  .home-sidebar-workspace strong {
    overflow: hidden;
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-bold);
    line-height: var(--line-height-body-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .home-sidebar-workspace em {
    overflow: hidden;
    color: rgba(255, 255, 255, 0.58);
    font-size: var(--font-size-caption);
    font-style: normal;
    line-height: var(--line-height-caption);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .work-home-flat {
    width: 100%;
    max-width: none;
    min-height: 100dvh;
    margin: 0;
    padding: 0;
    background: var(--color-surface);
  }
  .work-home-content {
    width: min(100%, 1480px);
    margin: 0 auto;
    padding: var(--space-3) var(--space-page-x) var(--space-4);
  }
  .work-home-flat .work-home-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }
  .work-home-flat .work-home-heading h1 {
    margin: 0;
    font-size: 24px;
    font-weight: var(--font-weight-semibold);
    line-height: 1.2;
  }
  .work-home-flat .work-home-heading p {
    margin-top: var(--space-0-5);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-sm);
  }
  .home-placeholder-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .home-placeholder-widget {
    min-height: 152px;
    padding: var(--space-2);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
  }
  .home-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
    min-height: 36px;
    border-bottom: 1px solid var(--color-border);
  }
  .home-section-head h2 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--font-size-section-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-section-title);
  }
  .home-placeholder-badge {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 var(--space-1);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    color: var(--color-text-muted);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
  }
  .home-placeholder-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-height: 96px;
    color: var(--color-text-muted);
    font-size: var(--font-size-body-sm);
  }
  .home-text-link,
  .home-text-action {
    border: 0;
    background: transparent;
    color: var(--color-primary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }
  .home-text-link:hover,
  .home-text-link:focus-visible,
  .home-text-action:hover,
  .home-text-action:focus-visible {
    color: var(--color-primary-hover);
    text-decoration: underline;
    text-underline-offset: 3px;
    outline: none;
  }
  .home-estimate-modal {
    max-width: 560px;
  }
  .home-estimate-modal-summary {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-2) 0;
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
  }
  .home-estimate-modal-summary span {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr);
    gap: var(--space-1);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-sm);
  }
  .home-estimate-modal-summary strong {
    color: var(--color-text-muted);
    font-weight: var(--font-weight-medium);
  }
  @media (max-width: 1180px) {
    .home-placeholder-grid {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 1180px) {
    .estimate-workspace {
      grid-template-columns: 280px minmax(0, 1fr);
      padding: 18px;
    }
    .estimate-workspace .category-column {
      position: static;
      max-height: none;
    }
    .estimate-workspace .estimate-side-stack {
      grid-template-columns: 1fr;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    main,
    button,
    .menu-card,
    .estimate-template-row,
    .estimate-template-expand,
    .admin-item-card,
    .admin-value-row,
    .drag-handle,
    .status-box,
    .success-box,
    .autosave-pill,
    .pyeong-photo-thumbnail-loading,
    .admin-price-v2-category-item,
    .estimate-photo-context-pane {
      animation: none !important;
      transition: none !important;
    }
    .admin-item-card.dragging,
    .admin-value-row.dragging {
      transform: none;
    }
  }
  @media (max-width: 840px) {
    .app-shell {
      padding-top: 0;
    }
    .app-shell.items-v2-shell {
      padding-top: 0;
    }
    .items-v2-total-bar {
      grid-template-columns: max-content minmax(0, 1fr);
      height: auto;
      min-height: var(--sticky-total-height);
      padding-top: var(--space-1);
      padding-bottom: var(--space-1);
    }
    .items-v2-total-bar .ui-sticky-total-bar__amounts {
      grid-row: 2;
      grid-column: 1 / -1;
      justify-self: stretch;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-2);
    }
    .items-v2-total-bar .items-v2-total-actions {
      grid-row: 1;
      grid-column: 2;
    }
    .global-header {
      min-height: 56px;
      height: 56px;
      flex-wrap: nowrap;
      align-content: center;
    }
    .work-home-content {
      padding-right: var(--space-3);
      padding-left: var(--space-3);
    }
    .primary-action-grid,
    .hero,
    .condition-static-grid {
      grid-template-columns: 1fr;
    }
    .hero {
      min-height: auto;
      padding-top: 18px;
    }
    .hero h1 {
      font-size: 38px;
    }
    .condition-static-field,
    .condition-static-wide {
      padding: 14px;
    }
    .condition-start-row {
      align-items: stretch;
    }
    .condition-start-row .primary-button {
      width: 100%;
    }
    .company-session {
      width: 100%;
      justify-content: space-between;
      border-radius: 14px;
    }
    .admin-pyeong-panel,
    .admin-tool-panel,
    .admin-catalog-actions,
    .estimate-template-expanded-content {
      grid-template-columns: 1fr;
    }
  }
  .photo-management-workspace {
    display: grid;
    grid-template-columns: clamp(170px, 14vw, 210px) clamp(250px, 20vw, 320px) minmax(0, 1fr);
    width: 100%;
    min-width: 0;
    min-height: 0;
    flex: 1 1 auto;
    overflow: hidden;
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .formate-app-shell--customer-requests .formate-app-shell__main {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    padding: 0;
  }
  @media (max-width: 1099px) {
    .formate-app-shell--customer-requests .formate-app-shell__main {
      overflow-y: auto;
    }
  }
  .formate-app-shell--aftercare .formate-app-shell__main {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    padding: 0;
  }
  @media (max-width: 767px) {
    .formate-app-shell--aftercare .formate-app-shell__main {
      overflow-y: auto;
    }
  }
  .formate-app-shell--customer-projects .formate-app-shell__main {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    padding: 0;
  }
  @media (max-width: 1099px) {
    .formate-app-shell--customer-projects .formate-app-shell__main {
      overflow-y: auto;
    }
  }
  .formate-app-shell--photo-management .formate-app-shell__main {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    padding: 0;
  }
  .photo-management-page {
    width: 100%;
    max-width: none !important;
    height: 100%;
    min-width: 0;
    min-height: 0;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  .admin-items-v2-page > .admin-price-v2-sidebar {
    position: relative;
    top: auto;
    width: var(--layout-local-sidebar);
    height: 100%;
    min-height: 0;
    max-height: none;
    overflow-y: auto;
  }
  .photo-management-page .photo-management-panel {
    width: 100%;
    max-width: none;
    height: 100%;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
  }
  .photo-management-toolbar {
    min-width: 0;
    min-height: 56px;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 0 var(--space-2);
    background: var(--color-surface);
  }
  .photo-management-toolbar h1 {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: var(--font-size-page-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-page-title);
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: keep-all;
  }
  .photo-management-toolbar-actions {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-1);
  }
  .photo-management-feedback {
    flex: 0 0 auto;
    padding: var(--space-1) var(--space-2);
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .photo-management-feedback > * {
    margin: 0;
  }
  .photo-management-page .photo-autosave-status {
    flex: 0 0 auto;
    align-self: flex-start;
    margin-bottom: 0;
  }
  .photo-type-sidebar,
  .photo-category-sidebar {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .photo-sidebar-header {
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
    padding: 0 var(--space-2);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }
  .photo-sidebar-header strong {
    color: var(--color-text-primary);
    font-size: inherit;
  }
  .photo-sidebar-list {
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    align-content: start;
    gap: var(--space-1);
    overflow-y: auto;
    padding: var(--space-2);
  }
  .photo-type-row {
    width: 100%;
    min-width: 0;
    min-height: 38px;
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) 28px;
    align-items: center;
    gap: var(--space-0-5);
    padding: 0 var(--space-0-5);
    border: 1px solid transparent;
    border-radius: var(--radius-button);
    background: transparent;
    transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
  }
  .photo-type-row:hover,
  .photo-type-row:focus-within {
    background: var(--color-surface-subtle);
  }
  .photo-type-row.active {
    background: var(--color-primary-soft);
    color: var(--color-primary);
    box-shadow: inset 3px 0 0 var(--color-primary);
  }
  .photo-type-row.drop-target {
    border-color: var(--color-primary-border);
    background: var(--color-primary-soft);
  }
  .photo-type-row > input {
    width: 100%;
    min-width: 0;
    height: 30px;
    padding: 0 var(--space-1);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-body-sm);
  }
  .photo-type-select {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-1);
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: var(--font-size-body-sm);
    text-align: left;
    cursor: pointer;
  }
  .photo-type-row.active .photo-type-select {
    font-weight: var(--font-weight-medium);
  }
  .photo-type-select em {
    min-width: 26px;
    height: 20px;
    padding: 0 var(--space-0-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-badge);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-style: normal;
    line-height: 18px;
    text-align: center;
  }
  .photo-row-menu-button {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-muted);
  }
  .photo-row-menu-button:hover,
  .photo-row-menu-button:focus-visible {
    background: var(--color-surface);
    color: var(--color-text-primary);
    outline: none;
  }
  .photo-sidebar-list > button,
  .photo-subitem-sidebar-group > button {
    width: 100%;
    min-height: 36px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-1);
    padding: 0 var(--space-1-5);
    border: 1px solid transparent;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-body-sm);
    text-align: left;
    cursor: pointer;
    transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
  }
  .photo-type-sidebar .photo-sidebar-list > button {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .photo-type-sidebar .photo-sidebar-list > button > span,
  .photo-sidebar-header > span,
  .photo-sidebar-header > strong,
  .photo-subitem-sidebar-group > strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: keep-all;
  }
  .photo-sidebar-list > button:hover,
  .photo-sidebar-list > button:focus-visible,
  .photo-subitem-sidebar-group > button:hover,
  .photo-subitem-sidebar-group > button:focus-visible {
    background: var(--color-surface-subtle);
    outline: none;
  }
  .photo-sidebar-list > button.active,
  .photo-subitem-sidebar-group > button.active {
    background: var(--color-primary-soft);
    color: var(--color-primary);
    box-shadow: inset 3px 0 0 var(--color-primary);
    font-weight: var(--font-weight-medium);
  }
  .photo-sidebar-list > button.drop-target,
  .photo-subitem-sidebar-group > button.drop-target {
    border-color: var(--color-primary-border);
    background: var(--color-primary-soft);
  }
  .photo-sidebar-list em,
  .photo-subitem-sidebar-group button em {
    min-width: 26px;
    height: 20px;
    padding: 0 var(--space-0-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-badge);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-style: normal;
    line-height: 18px;
    text-align: center;
  }
  .photo-drag-handle {
    display: inline-flex;
    color: var(--color-text-muted);
    cursor: grab;
  }
  .photo-drag-handle:active {
    cursor: grabbing;
  }
  .photo-sidebar-item-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: keep-all;
  }
  .photo-category-add-row {
    display: flex !important;
    justify-content: center;
    color: var(--color-text-muted) !important;
    border-style: dashed !important;
    border-color: transparent !important;
  }
  .photo-category-add-row:hover,
  .photo-category-add-row:focus-visible {
    border-color: var(--color-border-strong) !important;
    color: var(--color-primary) !important;
  }
  .photo-category-add-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 32px 32px;
    gap: var(--space-0-5);
  }
  .photo-category-add-form input {
    min-width: 0;
    height: 34px;
    padding: 0 var(--space-1);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-body-sm);
  }
  .photo-category-add-form button {
    display: grid;
    place-items: center;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-secondary);
  }
  .photo-subitem-sidebar-list {
    flex: 1 1 auto;
    min-height: 0;
    max-height: none;
    overflow-y: auto;
    padding: var(--space-1) var(--space-1-5) var(--space-2);
  }
  .photo-subitem-sidebar-group {
    display: grid;
    gap: 0;
    padding: var(--space-0-5) 0;
  }
  .photo-subitem-sidebar-group + .photo-subitem-sidebar-group {
    border-top: 1px solid var(--color-border);
  }
  .photo-subitem-group-toggle,
  .photo-subitem-group-children > button {
    width: 100%;
    min-width: 0;
    min-height: 36px;
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-0-5);
    padding: 0 var(--space-1);
    border: 1px solid transparent;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-body-sm);
    text-align: left;
    cursor: pointer;
  }
  .photo-subitem-group-toggle {
    font-weight: var(--font-weight-semibold);
  }
  .photo-subitem-group-toggle .photo-sidebar-item-label {
    display: block;
    flex-wrap: nowrap;
  }
  .photo-subitem-group-toggle:hover,
  .photo-subitem-group-toggle:focus-visible,
  .photo-subitem-group-children > button:hover,
  .photo-subitem-group-children > button:focus-visible {
    background: var(--color-surface-subtle);
    outline: none;
  }
  .photo-subitem-group-children {
    display: grid;
    gap: var(--space-0-5);
    padding: var(--space-0-5) 0 var(--space-1) var(--space-2);
  }
  .photo-subitem-group-children > button.active {
    background: var(--color-primary-soft);
    color: var(--color-primary);
    box-shadow: inset 3px 0 0 var(--color-primary);
    font-weight: var(--font-weight-medium);
  }
  .photo-subitem-group-children > button.drop-target {
    border-color: var(--color-primary-border);
    background: var(--color-primary-soft);
  }
  .photo-subitem-group-toggle em,
  .photo-subitem-group-children > button em {
    min-width: 26px;
    height: 20px;
    padding: 0 var(--space-0-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-badge);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-style: normal;
    font-weight: var(--font-weight-regular);
    line-height: 18px;
    text-align: center;
  }
  .photo-content-panel {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
    padding: 0;
    background: var(--color-bg);
  }
  .photo-content-header {
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    flex: 0 0 auto;
    padding: 0 var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }
  .photo-content-header > div:first-child {
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
    overflow: hidden;
  }
  .photo-content-header > div:first-child > span,
  .photo-content-header small {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
  }
  .photo-content-header h2,
  .photo-content-header input {
    min-width: 0;
    margin: 0;
    color: var(--color-text-primary);
    font-size: var(--font-size-section-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-section-title);
    white-space: nowrap;
  }
  .photo-content-header h2 {
    display: flex;
    align-items: center;
    gap: var(--space-0-5);
  }
  .photo-content-header h2 span,
  .photo-content-header h2 strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: keep-all;
  }
  .photo-content-header h2,
  .photo-content-header small,
  .photo-content-header > div:first-child > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: keep-all;
  }
  .photo-content-header input {
    max-width: 280px;
    height: 36px;
    padding: 0 var(--space-1);
    border: 1px solid transparent;
    border-bottom-color: var(--color-border-strong);
    border-radius: 0;
    background: transparent;
    font-family: inherit;
  }
  .photo-content-header input:focus {
    border-color: var(--color-primary);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    outline: none;
  }
  .photo-content-actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  .photo-content-actions > span {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    white-space: nowrap;
  }
  .photo-content-menu-button,
  .photo-thumb-delete-button {
    display: inline-grid;
    place-items: center;
    border: 0;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-secondary);
  }
  .photo-content-menu-button {
    width: var(--button-height-sm);
    height: var(--button-height-sm);
  }
  .photo-content-menu-button:hover,
  .photo-content-menu-button:focus-visible,
  .photo-thumb-delete-button:hover,
  .photo-thumb-delete-button:focus-visible {
    background: var(--color-danger-bg);
    color: var(--color-danger);
    outline: none;
  }
  .photo-content-panel .photo-thumb-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 220px));
    align-content: start;
  }
  .photo-grid-scroll {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    overflow: auto;
    padding: var(--space-2);
  }
  .photo-thumb-card {
    position: relative;
  }
  .photo-thumb-card.dragging {
    opacity: 0.48;
  }
  .photo-thumb-card.drop-target {
    border-color: var(--color-primary);
    box-shadow: inset 0 0 0 1px var(--color-primary);
  }
  button.photo-thumb-image {
    width: 100%;
    padding: 0;
    border: 0;
    border-radius: 0;
    cursor: zoom-in;
  }
  button.photo-thumb-image:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }
  .photo-thumb-delete-button {
    position: absolute;
    top: var(--space-1);
    right: var(--space-1);
    width: 30px;
    height: 30px;
    opacity: 0;
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    transition: opacity 150ms ease, background-color 150ms ease, color 150ms ease;
  }
  .photo-thumb-card:hover .photo-thumb-delete-button,
  .photo-thumb-delete-button:focus-visible {
    opacity: 1;
  }
  .photo-thumb-meta {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }
  .photo-thumb-meta button {
    min-height: 30px;
    padding: 0 var(--space-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }
  .photo-thumb-meta button:hover:not(:disabled),
  .photo-thumb-meta button:focus-visible {
    border-color: var(--color-border-strong);
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    outline: none;
  }
  .photo-thumb-meta button:disabled {
    color: var(--color-success);
    opacity: 1;
  }
  .photo-add-tile {
    position: relative;
    min-height: 185px;
    display: grid;
    place-items: center;
    border: 1px dashed var(--color-border-strong);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease;
  }
  .photo-add-tile:hover,
  .photo-add-tile:focus-within {
    border-color: var(--color-primary);
    background: var(--color-primary-soft);
    color: var(--color-primary);
    outline: none;
  }
  .photo-add-tile input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .photo-add-tile.disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .photo-add-tile.disabled input {
    cursor: not-allowed;
  }
  .photo-delete-backdrop {
    z-index: 920;
  }
  .photo-delete-dialog {
    width: min(440px, calc(100vw - 32px));
  }
  .photo-delete-dialog h3,
  .photo-delete-dialog p {
    margin-top: 0;
  }
  .photo-delete-dialog label {
    display: grid;
    gap: var(--space-label-gap);
    margin: var(--space-2) 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-sm);
  }
  .photo-delete-dialog select {
    min-height: var(--button-height-md);
    padding: 0 var(--space-1-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-primary);
  }
  .photo-delete-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-1);
    margin-top: var(--space-2);
  }
  .photo-management-page.photo-management-landing {
    display: block;
    overflow-y: auto;
    padding: 0 var(--space-2) var(--space-2);
    background: var(--color-bg);
  }
  .photo-management-landing > .ui-page-header {
    margin-bottom: var(--space-1-5);
  }
  .photo-management-mode-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
  }
  .photo-management-mode-card {
    min-width: 0;
    min-height: 160px;
    display: grid;
    grid-template-rows: auto 1fr auto;
    align-items: start;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color 150ms ease, background-color 150ms ease;
  }
  .photo-management-mode-card:hover,
  .photo-management-mode-card:focus-visible {
    border-color: var(--color-primary-border);
    background: var(--color-surface-subtle);
    outline: none;
  }
  .photo-management-mode-card:focus-visible {
    box-shadow: var(--focus-ring);
  }
  .photo-management-mode-card:active {
    transform: translateY(1px);
  }
  .photo-management-mode-card__icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-button);
    background: var(--color-surface-subtle);
    color: var(--color-primary);
  }
  .photo-management-mode-card__copy {
    min-width: 0;
    display: grid;
    align-content: start;
    gap: var(--space-1);
  }
  .photo-management-mode-card__copy strong {
    font-size: var(--font-size-section-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-section-title);
    word-break: keep-all;
  }
  .photo-management-mode-card__copy em {
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-sm);
    font-style: normal;
    line-height: 1.5;
    word-break: keep-all;
  }
  .photo-management-mode-card__action {
    display: inline-flex;
    align-items: center;
    gap: var(--space-0-5);
    color: var(--color-primary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }
  .photo-mode-titleline,
  .pyeong-photo-titleline {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  .photo-mode-titleline > button,
  .pyeong-photo-back {
    width: var(--button-height-sm);
    height: var(--button-height-sm);
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-secondary);
  }
  .photo-mode-titleline > button:hover,
  .photo-mode-titleline > button:focus-visible,
  .pyeong-photo-back:hover,
  .pyeong-photo-back:focus-visible {
    border-color: var(--color-border);
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    outline: none;
  }
  .photo-library-placeholder {
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
  }
  .photo-library-placeholder__body {
    padding: var(--space-3);
    border-top: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-sm);
  }
  .photo-library-placeholder__body p {
    margin: 0;
  }
  .photo-management-page.pyeong-photo-page {
    display: grid;
    grid-template-columns: var(--layout-local-sidebar) minmax(0, 1fr);
    background: var(--color-bg);
  }
  .pyeong-photo-page > .admin-price-v2-sidebar {
    position: relative;
    top: auto;
    width: var(--layout-local-sidebar);
    height: 100%;
    min-height: 0;
    max-height: none;
    overflow-y: auto;
  }
  .pyeong-photo-workspace {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--color-bg);
  }
  .pyeong-photo-header {
    min-width: 0;
    min-height: 56px;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 0 var(--space-2);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .pyeong-photo-titleline > div {
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
    overflow: hidden;
  }
  .pyeong-photo-titleline h1 {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: keep-all;
  }
  .pyeong-photo-titleline h1 {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
    color: var(--color-text-primary);
    font-size: var(--font-size-title-md);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-work-title);
  }
  .pyeong-photo-titleline h1 > span {
    flex: 0 0 auto;
    color: var(--color-text-muted);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-regular);
  }
  .pyeong-photo-titleline h1 > em {
    min-width: 0;
    overflow: hidden;
    color: var(--color-text-secondary);
    font-size: var(--font-size-body);
    font-style: normal;
    font-weight: var(--font-weight-medium);
    text-overflow: ellipsis;
  }
  .pyeong-photo-header-actions {
    min-width: 0;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-1);
  }
  .pyeong-photo-jump {
    position: relative;
  }
  .pyeong-photo-jump-trigger {
    height: var(--button-height-sm);
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0 var(--space-1-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    font: inherit;
    font-size: var(--font-size-body-sm);
    white-space: nowrap;
  }
  .pyeong-photo-jump-trigger:hover,
  .pyeong-photo-jump-trigger:focus-visible,
  .pyeong-photo-jump-trigger[aria-expanded="true"] {
    border-color: var(--color-border-strong);
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    outline: none;
  }
  .pyeong-photo-jump-menu {
    position: absolute;
    top: calc(100% + var(--space-0-5));
    right: 0;
    z-index: 20;
    width: min(280px, calc(100vw - 32px));
    max-height: 360px;
    overflow-y: auto;
    padding: var(--space-0-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: var(--shadow-popover);
  }
  .pyeong-photo-jump-menu button {
    width: 100%;
    min-height: 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 0 var(--space-1);
    border: 0;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-body-sm);
    text-align: left;
  }
  .pyeong-photo-jump-menu button:hover,
  .pyeong-photo-jump-menu button:focus-visible {
    background: var(--color-surface-subtle);
    outline: none;
  }
  .pyeong-photo-jump-menu button span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pyeong-photo-jump-menu button em {
    flex: 0 0 auto;
    color: var(--color-text-muted);
    font-size: var(--font-size-caption);
    font-style: normal;
  }
  .pyeong-photo-context-trigger {
    min-width: 86px;
    height: var(--button-height-sm);
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
    padding: 0 var(--space-1-5);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }
  .pyeong-photo-context-trigger:hover,
  .pyeong-photo-context-trigger:focus-visible {
    border-color: var(--color-primary);
    outline: none;
  }
  .pyeong-photo-feedback {
    flex: 0 0 auto;
    padding: var(--space-0-5) var(--space-2);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .pyeong-photo-feedback > * {
    margin: 0;
  }
  .pyeong-photo-feedback .error-box,
  .pyeong-photo-feedback .success-box {
    min-height: 32px;
    padding: var(--space-0-5) var(--space-1);
    font-size: var(--font-size-caption);
  }
  .pyeong-photo-gallery-workspace {
    min-width: 0;
    min-height: 0;
    flex: 1 1 auto;
    overflow: auto;
    scroll-behavior: smooth;
    background: var(--color-bg);
  }
  .pyeong-photo-gallery-list {
    min-width: 0;
    display: grid;
    gap: var(--space-2);
    padding: var(--space-2);
  }
  .pyeong-photo-gallery-section {
    min-width: 0;
    scroll-margin-top: var(--space-2);
  }
  .pyeong-photo-gallery-section__header {
    min-height: 46px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }
  .pyeong-photo-gallery-section__title,
  .pyeong-photo-gallery-section__actions {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  .pyeong-photo-gallery-section__actions {
    flex: 0 0 auto;
  }
  .pyeong-photo-gallery-section__header h2,
  .pyeong-photo-gallery-section__actions > span {
    margin: 0;
    white-space: nowrap;
  }
  .pyeong-photo-gallery-section__header h2 {
    min-width: 0;
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: var(--font-size-section-title);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-section-title);
    text-overflow: ellipsis;
    word-break: keep-all;
  }
  .pyeong-photo-gallery-section__actions > span {
    flex: 0 0 auto;
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-variant-numeric: tabular-nums;
  }
  .pyeong-photo-variant-select {
    position: relative;
    flex: 0 0 auto;
    width: auto;
  }
  .pyeong-photo-variant-select .canonical-variant-control {
    width: auto;
  }
  .pyeong-photo-variant-select .canonical-variant-trigger {
    min-width: 70px;
    height: 30px;
    gap: var(--space-0-5);
    padding: 0 var(--space-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    font-size: var(--font-size-caption);
    font-variant-numeric: tabular-nums;
  }
  .pyeong-photo-variant-select .canonical-variant-trigger:hover,
  .pyeong-photo-variant-select .canonical-variant-trigger:focus-visible,
  .pyeong-photo-variant-select .canonical-variant-trigger[aria-expanded="true"] {
    border-color: var(--color-border-strong);
    background: var(--color-surface-subtle);
    outline: none;
  }
  .pyeong-photo-variant-select .canonical-variant-dropdown {
    top: calc(100% + var(--space-0-5));
    z-index: 36;
  }
  .pyeong-photo-product-editor {
    position: relative;
    flex: 0 0 auto;
  }
  .pyeong-photo-product-editor__trigger {
    width: 28px;
    min-width: 28px;
    height: 28px;
    display: inline-grid;
    place-items: center;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-text-secondary);
    opacity: 0.38;
    transition: opacity 120ms ease, color 120ms ease;
  }
  .pyeong-photo-gallery-section__header:hover .pyeong-photo-product-editor__trigger,
  .pyeong-photo-product-editor__trigger:hover,
  .pyeong-photo-product-editor__trigger:focus-visible,
  .pyeong-photo-product-editor__trigger[aria-expanded="true"] {
    color: var(--color-text-primary);
    opacity: 0.82;
  }
  .pyeong-photo-product-editor__trigger:focus-visible {
    outline: 1px solid var(--focus-ring-color);
    outline-offset: 1px;
  }
  .pyeong-photo-product-editor__trigger:disabled {
    cursor: not-allowed;
    opacity: 0.22;
  }
  .pyeong-photo-product-editor__popover {
    position: absolute;
    top: calc(100% + var(--space-0-5));
    left: 0;
    z-index: 38;
    width: 180px;
    padding: var(--space-0-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: var(--shadow-popover);
  }
  .pyeong-photo-product-editor__popover--manage {
    width: 320px;
    max-width: calc(100vw - 32px);
    padding: var(--space-2);
  }
  .pyeong-photo-product-editor__menu {
    display: grid;
  }
  .pyeong-photo-product-editor__menu button {
    width: 100%;
    min-height: 30px;
    padding: var(--space-0-5) var(--space-1);
    border: 0;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-primary);
    font-size: var(--font-size-caption);
    text-align: left;
  }
  .pyeong-photo-product-editor__menu button:hover,
  .pyeong-photo-product-editor__menu button:focus-visible {
    background: var(--color-surface-subtle);
    outline: none;
  }
  .pyeong-photo-product-editor__rename {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-1);
    align-items: center;
  }
  .pyeong-photo-product-editor__rename input {
    min-width: 0;
    min-height: 30px;
    padding: var(--space-0-5) var(--space-1);
    font-size: var(--font-size-table-cell);
  }
  .pyeong-photo-add-action {
    position: relative;
    height: 30px;
    display: inline-flex;
    align-items: center;
    gap: var(--space-0-5);
    padding: 0 var(--space-1);
    border-radius: var(--radius-button);
    color: var(--color-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    white-space: nowrap;
  }
  .pyeong-photo-add-action:hover,
  .pyeong-photo-add-action:focus-within {
    background: var(--color-primary-soft);
  }
  .pyeong-photo-add-action.disabled {
    opacity: 0.56;
    cursor: not-allowed;
  }
  .pyeong-photo-add-action input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .pyeong-photo-grid {
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 260px));
    align-items: start;
    gap: var(--space-1-5);
    padding-top: var(--space-1-5);
  }
  .pyeong-photo-card {
    position: relative;
    min-width: 0;
    border: 1px solid var(--color-border);
    border-radius: 0;
    background: var(--color-surface);
    box-shadow: none;
    cursor: grab;
    transition: border-color 150ms ease, opacity 150ms ease;
  }
  .pyeong-photo-card:active {
    cursor: grabbing;
  }
  .pyeong-photo-card.dragging {
    opacity: 0.48;
  }
  .pyeong-photo-card.drop-target {
    border-color: var(--color-primary);
    outline: 1px solid var(--color-primary);
    outline-offset: -2px;
  }
  .pyeong-photo-thumbnail {
    width: 100%;
    aspect-ratio: 4 / 3;
    display: block;
    overflow: hidden;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: var(--color-surface-subtle);
    cursor: zoom-in;
  }
  .pyeong-photo-thumbnail:focus-visible {
    outline: 1px solid var(--color-primary);
    outline-offset: -1px;
  }
  .pyeong-photo-thumbnail img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
  .pyeong-photo-thumbnail > span {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    align-content: center;
    gap: var(--space-1);
    color: var(--color-text-muted);
  }
  .pyeong-photo-thumbnail-loading {
    background: var(--color-surface-subtle);
    animation: formate-photo-pulse 1.2s ease-in-out infinite alternate;
  }
  @keyframes formate-photo-pulse {
    from { opacity: 0.56; }
    to { opacity: 1; }
  }
  .pyeong-photo-thumbnail em {
    font-size: var(--font-size-caption);
    font-style: normal;
  }
  .pyeong-photo-card-menu {
    position: absolute;
    top: var(--space-1);
    right: var(--space-1);
    z-index: 2;
  }
  .pyeong-photo-card-menu__trigger {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    opacity: 0;
    transition: opacity 150ms ease, background-color 150ms ease;
  }
  .pyeong-photo-card:hover .pyeong-photo-card-menu__trigger,
  .pyeong-photo-card:focus-within .pyeong-photo-card-menu__trigger,
  .pyeong-photo-card-menu__trigger[aria-expanded="true"] {
    opacity: 1;
  }
  .pyeong-photo-card-menu__trigger:hover,
  .pyeong-photo-card-menu__trigger:focus-visible {
    border-color: var(--color-border-strong);
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    outline: none;
  }
  .pyeong-photo-card-menu__popover {
    position: absolute;
    top: calc(100% + var(--space-0-5));
    right: 0;
    width: 132px;
    padding: var(--space-0-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    box-shadow: var(--shadow-popover);
  }
  .pyeong-photo-card-menu__popover button {
    width: 100%;
    min-height: 32px;
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0 var(--space-1);
    border: 0;
    border-radius: var(--radius-button);
    background: transparent;
    font: inherit;
    font-size: var(--font-size-caption);
    text-align: left;
  }
  .pyeong-photo-card-menu__popover button:hover,
  .pyeong-photo-card-menu__popover button:focus-visible {
    background: var(--color-danger-bg);
    outline: none;
  }
  .pyeong-photo-caption-area {
    min-width: 0;
    min-height: 52px;
    border-top: 1px solid var(--color-border);
    border-radius: 0;
    box-shadow: none;
  }
  .pyeong-photo-caption-display {
    width: 100%;
    min-height: 52px;
    display: -webkit-box;
    overflow: hidden;
    padding: var(--space-1) var(--space-1-5);
    border: 0;
    background: transparent;
    color: var(--color-text-muted);
    font: inherit;
    font-size: var(--font-size-caption);
    line-height: 18px;
    text-align: left;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  .pyeong-photo-caption-display.has-caption {
    color: var(--color-text-primary);
  }
  .pyeong-photo-caption-display:not(.has-caption) {
    display: flex;
    align-items: center;
    gap: var(--space-0-5);
  }
  .pyeong-photo-caption-display:hover,
  .pyeong-photo-caption-display:focus-visible {
    background: var(--color-surface-subtle);
    outline: none;
  }
  .pyeong-photo-caption-editor {
    position: relative;
    display: grid;
    gap: var(--space-0-5);
    padding: var(--space-1);
  }
  .pyeong-photo-caption-editor textarea {
    width: 100%;
    min-height: 54px;
    resize: vertical;
    padding: var(--space-1);
    border: 1px solid var(--color-border-strong);
    border-radius: 0;
    background: var(--color-surface);
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-caption);
    line-height: 18px;
  }
  .pyeong-photo-caption-editor textarea:focus {
    border-color: var(--color-primary);
    box-shadow: none;
    outline: none;
  }
  .pyeong-photo-caption-editor > button {
    min-height: 28px;
    display: inline-flex;
    align-items: center;
    justify-self: start;
    gap: var(--space-0-5);
    padding: 0 var(--space-1);
    border: 1px solid transparent;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    font-size: var(--font-size-caption);
  }
  .pyeong-photo-caption-editor > button:hover,
  .pyeong-photo-caption-editor > button:focus-visible {
    border-color: var(--color-border);
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    outline: none;
  }
  .pyeong-caption-snippet-popover {
    position: absolute;
    right: var(--space-1);
    bottom: 36px;
    z-index: 12;
    width: min(320px, calc(100vw - 64px));
    max-height: 360px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    box-shadow: var(--shadow-popover);
  }
  .pyeong-caption-snippet-popover > header {
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
    padding: 0 var(--space-1-5);
    border-bottom: 1px solid var(--color-border);
    font-size: var(--font-size-body-sm);
  }
  .pyeong-caption-snippet-popover button {
    border: 0;
    background: transparent;
    color: var(--color-text-secondary);
  }
  .pyeong-caption-snippet-popover > header button,
  .pyeong-caption-snippet-row > button:not(.pyeong-caption-snippet-apply),
  .pyeong-caption-snippet-add > button {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    padding: 0;
    border-radius: var(--radius-button);
  }
  .pyeong-caption-snippet-popover button:hover,
  .pyeong-caption-snippet-popover button:focus-visible {
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    outline: none;
  }
  .pyeong-caption-snippet-list {
    min-height: 72px;
    overflow-y: auto;
    padding: var(--space-1);
  }
  .pyeong-caption-snippet-list > p {
    margin: var(--space-1);
    color: var(--color-text-muted);
    font-size: var(--font-size-caption);
  }
  .pyeong-caption-snippet-row {
    min-width: 0;
    min-height: 34px;
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) 28px 28px;
    align-items: center;
    gap: var(--space-0-5);
  }
  .pyeong-caption-snippet-handle {
    color: var(--color-text-muted);
    cursor: grab;
  }
  .pyeong-caption-snippet-apply,
  .pyeong-caption-snippet-row input {
    width: 100%;
    min-width: 0;
    height: 30px;
    padding: 0 var(--space-1);
    overflow: hidden;
    color: var(--color-text-primary) !important;
    font: inherit;
    font-size: var(--font-size-caption);
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pyeong-caption-snippet-row input {
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-button);
    background: var(--color-surface);
  }
  .pyeong-caption-snippet-add {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 30px;
    gap: var(--space-1);
    padding: var(--space-1);
    border-top: 1px solid var(--color-border);
  }
  .pyeong-caption-snippet-add input {
    min-width: 0;
    height: 32px;
    padding: 0 var(--space-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-button);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-caption);
  }
  .pyeong-caption-snippet-add input:focus {
    border-color: var(--color-primary);
    outline: none;
  }
  .pyeong-photo-add-inline {
    position: relative;
    width: 40px;
    min-height: 40px;
    align-self: center;
    justify-self: start;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
  }
  .pyeong-photo-add-inline:hover,
  .pyeong-photo-add-inline:focus-within {
    background: var(--color-surface-subtle);
    color: var(--color-primary);
  }
  .pyeong-photo-add-inline.disabled {
    opacity: 0.56;
    cursor: not-allowed;
  }
  .pyeong-photo-add-inline input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .pyeong-photo-gallery-section__footer {
    min-height: 36px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-top: var(--space-0-5);
  }
  .pyeong-photo-more-button {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    padding: 0 var(--space-1);
    border: 1px solid transparent;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-primary);
    font: inherit;
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
  }
  .pyeong-photo-more-button:hover,
  .pyeong-photo-more-button:focus-visible {
    border-color: var(--color-primary-border);
    background: var(--color-primary-soft);
    outline: none;
  }
  .pyeong-photo-gallery-modal-backdrop {
    z-index: 960;
    display: grid;
    place-items: center;
    padding: var(--space-3);
  }
  .pyeong-photo-gallery-modal {
    width: min(1120px, calc(100vw - 48px));
    max-height: 80dvh;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-panel);
    background: var(--color-surface);
    box-shadow: var(--shadow-popover);
  }
  .pyeong-photo-gallery-modal > header {
    position: sticky;
    top: 0;
    z-index: 2;
    min-height: 52px;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 0 var(--space-2);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .pyeong-photo-gallery-modal > header > div {
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
  }
  .pyeong-photo-gallery-modal h2,
  .pyeong-photo-gallery-modal header span {
    margin: 0;
    white-space: nowrap;
  }
  .pyeong-photo-gallery-modal h2 {
    min-width: 0;
    overflow: hidden;
    color: var(--color-text-primary);
    font-size: var(--font-size-section-title);
    line-height: var(--line-height-section-title);
    text-overflow: ellipsis;
  }
  .pyeong-photo-gallery-modal header span {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-variant-numeric: tabular-nums;
  }
  .pyeong-photo-gallery-modal > header > button {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-secondary);
  }
  .pyeong-photo-gallery-modal > header > button:hover,
  .pyeong-photo-gallery-modal > header > button:focus-visible {
    border-color: var(--color-border);
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    outline: none;
  }
  .pyeong-photo-gallery-modal__body {
    min-width: 0;
    min-height: 0;
    flex: 1 1 auto;
    overflow: auto;
    overscroll-behavior: contain;
    padding: var(--space-2);
  }
  .pyeong-photo-gallery-modal__grid {
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 260px));
    align-items: start;
    gap: var(--space-1-5);
  }
  .pyeong-photo-empty input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .pyeong-photo-empty {
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--font-size-body-sm);
  }
  .pyeong-photo-empty label {
    position: relative;
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    gap: var(--space-0-5);
    padding: 0 var(--space-1);
    border-radius: var(--radius-button);
    color: var(--color-primary);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
  }
  .pyeong-photo-empty label:hover,
  .pyeong-photo-empty label:focus-within {
    background: var(--color-primary-soft);
  }
  .pyeong-photo-empty--workspace {
    min-height: 160px;
  }
  .pyeong-photo-context-required {
    min-height: 160px;
    display: grid;
    align-content: center;
    justify-items: start;
    gap: var(--space-0-5);
    color: var(--color-text-secondary);
  }
  .pyeong-photo-context-required strong {
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
  }
  .pyeong-photo-context-required span {
    font-size: var(--font-size-body-sm);
  }
  .pyeong-photo-drawer-backdrop {
    z-index: 940;
    align-items: stretch;
    justify-content: flex-end;
    padding: 0;
  }
  .pyeong-photo-drawer {
    width: min(390px, 100vw);
    height: 100dvh;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-left: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .pyeong-photo-drawer > header {
    min-height: 56px;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 0 var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }
  .pyeong-photo-drawer h2,
  .pyeong-photo-drawer header span {
    margin: 0;
  }
  .pyeong-photo-drawer h2 {
    color: var(--color-text-primary);
    font-size: var(--font-size-section-title);
    line-height: var(--line-height-section-title);
  }
  .pyeong-photo-drawer header span {
    display: block;
    margin-top: var(--space-0-5);
    color: var(--color-text-muted);
    font-size: var(--font-size-caption);
  }
  .pyeong-photo-drawer header > button {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-text-secondary);
  }
  .pyeong-photo-drawer header > button:hover,
  .pyeong-photo-drawer header > button:focus-visible {
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    outline: none;
  }
  .pyeong-photo-drawer-body {
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    align-content: start;
    gap: var(--space-2);
    overflow: hidden;
    padding: var(--space-2);
  }
  .pyeong-photo-drawer-field {
    display: grid;
    gap: var(--space-1);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-sm);
    font-weight: var(--font-weight-medium);
  }
  .photo-pyeong-picker {
    width: 100%;
    max-width: none;
  }
  .photo-pyeong-picker .custom-select-trigger {
    min-height: var(--button-height);
    height: var(--button-height);
    padding: 0 var(--space-input-x);
    border-radius: var(--radius-input);
    box-shadow: none;
  }
  .pyeong-photo-drawer-error {
    color: var(--color-danger);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .photo-viewer-footer {
    min-width: 0;
    display: grid;
    background: var(--bg-sidebar);
  }
  .photo-viewer-caption {
    max-width: 960px;
    margin: 0 auto;
    padding: var(--space-1) var(--space-2) 0;
    color: var(--text-inverse);
    font-size: var(--font-size-body-sm);
    line-height: 1.5;
    text-align: center;
    white-space: pre-wrap;
  }
  .photo-viewer-backdrop {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    z-index: 2147483000;
    display: grid;
    place-items: stretch;
    padding: 0;
    background: rgba(13, 18, 17, 0.88);
  }
  .photo-viewer {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--text-inverse);
    box-shadow: var(--shadow-popover);
  }
  .photo-viewer-toolbar {
    min-width: 0;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
    padding: 0 var(--space-1-5);
  }
  .photo-viewer-toolbar span {
    font-family: var(--font-number);
    font-size: var(--font-size-body-sm);
    font-variant-numeric: tabular-nums;
  }
  .photo-viewer-toolbar button,
  .photo-viewer-nav {
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: var(--radius-button);
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-inverse);
  }
  .photo-viewer-toolbar button {
    width: 34px;
    height: 34px;
  }
  .photo-viewer-toolbar button:hover,
  .photo-viewer-toolbar button:focus-visible,
  .photo-viewer-nav:hover,
  .photo-viewer-nav:focus-visible {
    border-color: rgba(255, 255, 255, 0.46);
    background: rgba(255, 255, 255, 0.16);
    outline: none;
  }
  .photo-viewer-stage {
    position: relative;
    min-width: 0;
    min-height: 0;
    display: grid;
    place-items: center;
    overflow: auto;
    overscroll-behavior: contain;
    padding: clamp(8px, 2dvh, 24px) clamp(52px, 6vw, 88px);
  }
  .photo-viewer-image-wrap {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .photo-viewer-image-wrap > img {
    display: block;
    flex: 0 0 auto;
    width: auto !important;
    height: auto !important;
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: contain !important;
    object-position: center;
  }
  .photo-viewer-image-fallback {
    display: grid;
    place-items: center;
    gap: var(--space-1);
    color: rgba(255, 255, 255, 0.7);
    font-size: var(--font-size-body-sm);
  }
  .photo-viewer-nav {
    position: fixed;
    top: 50dvh;
    width: 42px;
    height: 54px;
    transform: translateY(-50%);
    z-index: 2;
    transition: border-color 100ms ease, background-color 100ms ease;
  }
  .photo-viewer-nav:active:not(:disabled) {
    transform: translateY(-50%);
    border-color: rgba(255, 255, 255, 0.54);
    background: rgba(255, 255, 255, 0.2);
  }
  .photo-viewer-nav.previous { left: clamp(8px, 2vw, 28px); }
  .photo-viewer-nav.next { right: clamp(8px, 2vw, 28px); }
  .photo-viewer-thumbnails {
    min-width: 0;
    min-height: 0;
    display: flex;
    justify-content: flex-start;
    gap: var(--space-1);
    overflow-x: auto;
    padding: var(--space-1-5);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }
  .photo-viewer-thumbnails button {
    flex: 0 0 62px;
    width: 62px;
    height: 48px;
    overflow: hidden;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--radius-button);
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.7);
  }
  .photo-viewer-thumbnails button.active {
    border-color: var(--text-inverse);
  }
  .photo-viewer-thumbnails img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .estimate-item-photo-grid .estimate-item-photo-thumb:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }
  .sash-catalog-section {
    min-width: 0;
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
  }
  .sash-catalog-section__header,
  .sash-catalog-section__summary {
    display: grid;
    grid-template-columns: 40px minmax(220px, 1fr) 120px 88px;
    align-items: center;
    min-width: 520px;
  }
  .sash-catalog-section__header {
    min-height: var(--table-header-height);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-header-bg);
    color: var(--color-text-secondary);
    font-size: var(--font-size-table-header);
    font-weight: var(--font-weight-medium);
    letter-spacing: var(--letter-spacing-table-header);
  }
  .sash-catalog-section__header > span,
  .sash-catalog-section__summary > * {
    display: flex;
    align-items: center;
    min-width: 0;
    height: 100%;
    padding: 0 var(--space-table-cell-x);
    border-right: 1px solid var(--color-border);
  }
  .sash-catalog-section__header > span:last-child,
  .sash-catalog-section__summary > *:last-child {
    border-right: 0;
  }
  .sash-catalog-section__row {
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .sash-catalog-section__row:nth-child(even) .sash-catalog-section__summary,
  .sash-catalog-section__summary:hover {
    background: var(--color-row-alt);
  }
  .sash-catalog-section__row.expanded .sash-catalog-section__summary {
    background: var(--color-header-bg);
    box-shadow: inset 1px 0 0 var(--color-border-strong);
  }
  .sash-catalog-section__row.expanded {
    margin-bottom: var(--space-2);
    background: var(--color-surface-subtle);
  }
  .sash-catalog-section__row.dragging {
    opacity: 0.56;
  }
  .sash-catalog-section__row.drop-target {
    box-shadow: inset 0 3px 0 var(--color-primary);
  }
  .sash-catalog-section__row.newly-added .sash-catalog-section__summary {
    animation: admin-template-condition-highlight 1.4s ease;
  }
  .sash-catalog-section__summary {
    min-height: var(--table-row-height);
    cursor: pointer;
  }
  .sash-catalog-section__summary > .admin-price-v2-drag-handle {
    justify-content: center;
    padding: 0;
  }
  .sash-catalog-section__summary .admin-material-name-field {
    gap: 0;
  }
  .sash-catalog-section__summary .field-label {
    display: none;
  }
  .sash-catalog-section__summary .admin-material-name-field input {
    width: 100%;
    min-width: 0;
    height: var(--button-height-sm);
    min-height: var(--button-height-sm);
    border: 1px solid transparent;
    border-radius: 0;
    padding: 0 var(--space-1);
    background: transparent;
    color: var(--color-text-primary);
    font-size: var(--font-size-table-cell);
    line-height: var(--line-height-table-cell);
  }
  .sash-catalog-section__summary .admin-material-name-field input:focus {
    border-color: var(--color-primary);
    background: var(--color-surface);
    outline: none;
  }
  .sash-catalog-section__count {
    color: var(--color-text-secondary);
    font-size: var(--font-size-table-cell);
    font-variant-numeric: var(--font-variant-numeric);
  }
  .sash-catalog-section__count.muted {
    color: var(--color-text-muted);
  }
  .sash-catalog-section__actions {
    justify-content: center;
    gap: var(--space-0-5);
    padding: 0 var(--space-0-5) !important;
  }
  .sash-catalog-section__actions .admin-price-v2-danger-button,
  .sash-catalog-section__actions .admin-price-v2-expand-button {
    width: 28px;
    height: 28px;
    min-height: 28px;
    padding: 0;
  }
  .sash-catalog-section__actions .admin-price-v2-danger-button {
    background: transparent;
    color: var(--color-text-muted);
  }
  .sash-catalog-section__actions .admin-price-v2-danger-button:hover {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }
  .sash-catalog-section__editor {
    min-width: 0;
    margin-left: 40px;
    padding: var(--space-1);
    border-top: 1px solid var(--color-border);
    border-left: 1px solid var(--color-border);
    background: var(--color-surface-subtle);
  }
  .sash-catalog-section__add-subitem {
    border-bottom: 1px solid var(--color-border);
  }
  .sash-catalog-section__category-tabs {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    width: fit-content;
    margin: 0;
    background: transparent;
  }
  .sash-catalog-section__category-tabs button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-height: 28px;
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 0 var(--space-1-5);
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    font-size: var(--font-size-caption);
    cursor: pointer;
  }
  .sash-catalog-section__category-tabs button.active {
    border-bottom-color: var(--color-primary);
    background: transparent;
    color: var(--color-primary);
    font-weight: var(--font-weight-semibold);
  }
  .sash-catalog-section__category-tabs button:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
  .sash-catalog-section__category-tabs button span {
    color: var(--color-text-muted);
    font-variant-numeric: var(--font-variant-numeric);
  }
  .sash-catalog-section__message {
    margin: var(--space-1);
  }
  .sash-catalog-grid {
    display: grid;
    min-width: 0;
    gap: 0;
    padding: 0;
    background: var(--color-surface);
  }
  .sash-selector__header span,
  .sash-selector__status,
  .sash-selector__snapshot {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-caption);
  }
  .sash-selector__category-tabs {
    display: inline-flex;
    gap: 2px;
    width: fit-content;
    background: transparent;
  }
  .sash-selector__category-tabs button {
    min-height: 28px;
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 0 var(--space-1-5);
    background: transparent;
    color: var(--color-text-secondary);
    font: inherit;
    font-size: var(--font-size-caption);
    cursor: pointer;
  }
  .sash-selector__category-tabs button.active {
    border-bottom-color: var(--color-primary);
    background: transparent;
    color: var(--color-primary);
    font-weight: var(--font-weight-semibold);
  }
  .sash-selector__category-tabs button:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
  .sash-catalog-grid__add:focus-visible,
  .sash-catalog-grid__empty button:focus-visible,
  .sash-selector__option:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
  .sash-catalog-grid__table {
    min-width: 1448px;
    table-layout: fixed;
  }
  .sash-catalog-grid .ui-table-wrap {
    border: 0;
    border-radius: 0;
  }
  .sash-catalog-grid .ui-table th,
  .sash-catalog-grid .ui-table td,
  .sash-special-items .ui-table th,
  .sash-special-items .ui-table td {
    padding-right: var(--space-1);
    padding-left: var(--space-1);
  }
  .sash-catalog-grid .items-v2-inline-select {
    width: 100%;
    min-width: 0;
    height: 30px;
    border-color: transparent;
    border-radius: 0;
    padding: 0 4px;
    background: transparent;
    font-size: var(--font-size-table-cell);
  }
  .sash-catalog-grid .items-v2-inline-select:hover {
    border-color: var(--color-border);
    background: var(--color-surface-subtle);
  }
  .sash-catalog-grid .items-v2-inline-select:focus {
    border-color: var(--color-primary);
    background: var(--color-surface);
  }
  .sash-catalog-grid__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-1);
    min-height: var(--table-header-height);
    padding: 0 var(--space-1);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .sash-catalog-grid__number-input {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-0-5);
  }
  .sash-catalog-grid__number-input > span,
  .sash-catalog-grid__readonly {
    color: var(--color-text-secondary);
    font-size: var(--font-size-table-cell);
    font-variant-numeric: var(--font-variant-numeric);
  }
  .sash-catalog-grid__number-input input {
    text-align: right;
    font-variant-numeric: var(--font-variant-numeric);
  }

  .sash-catalog-grid__pin-context {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-1);
    min-width: 0;
  }
  .sash-catalog-grid__pin-context > strong {
    align-self: center;
    color: var(--color-text-primary);
    font-size: var(--font-size-table-cell);
    white-space: nowrap;
  }
  .sash-catalog-grid__pin-context > label {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
  }
  .sash-catalog-grid__pin-context > .muted {
    align-self: center;
    font-size: var(--font-size-caption);
  }
  .sash-catalog-grid__pin-pyeong {
    align-self: center;
    color: var(--color-text-secondary);
    font-size: var(--font-size-table-cell);
    font-variant-numeric: var(--font-variant-numeric);
  }
  .sash-catalog-grid__pin-context .items-v2-inline-select {
    width: 92px;
    white-space: nowrap;
  }
  .sash-catalog-grid__pin-requirement {
    color: var(--color-warning);
    font-size: var(--font-size-table-cell);
    white-space: nowrap;
  }
  .sash-catalog-grid .ui-table__input::placeholder {
    color: var(--color-text-muted);
  }
  .sash-autosave-status {
    min-width: 48px;
    color: var(--color-text-muted);
    font-size: var(--font-size-caption);
    text-align: right;
    white-space: nowrap;
  }
  .sash-autosave-status.error {
    color: var(--color-danger);
  }
  .sash-autosave-retry {
    min-height: 24px;
    border: 0;
    padding: 0 4px;
    background: transparent;
    color: var(--color-danger);
    font: inherit;
    font-size: var(--font-size-caption);
    cursor: pointer;
  }
  .sash-catalog-grid__pin {
    display: inline-grid;
    width: 28px;
    height: 28px;
    place-items: center;
    border: 0;
    border-radius: var(--radius-button);
    padding: 0;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
  }
  .sash-catalog-grid__pin.is-pinned {
    background: var(--color-primary-soft);
    color: var(--color-primary);
  }
  .sash-catalog-grid__pin:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .sash-catalog-grid__pin:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
  .sash-catalog-grid__legacy-label {
    display: inline-flex;
    align-items: center;
    min-height: 22px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-badge);
    padding: 0 var(--space-1);
    background: var(--color-surface-subtle);
    color: var(--color-text-secondary);
    font-size: var(--font-size-table-header);
    font-weight: var(--font-weight-medium);
    white-space: nowrap;
  }
  .sash-catalog-grid__actions {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-0-5);
  }
  .sash-catalog-grid__actions .items-v2-icon-button {
    color: var(--color-text-muted);
  }
  .sash-catalog-grid__delete:hover {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }
  .sash-catalog-grid__add {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-1);
    width: fit-content;
    min-height: 28px;
    border: 0;
    background: transparent;
    color: var(--color-primary);
    padding: 0 var(--space-1);
    font: inherit;
    font-weight: var(--font-weight-medium);
    cursor: pointer;
  }
  .sash-catalog-grid__add:hover {
    background: var(--color-surface-subtle);
  }
  .sash-catalog-grid__empty {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: var(--table-row-height);
    padding: 0 var(--space-table-cell-x);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    font-size: var(--font-size-table-cell);
  }
  .sash-catalog-grid__empty button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-height: 32px;
    padding: 0 var(--space-1);
    border: 0;
    border-radius: var(--radius-button);
    background: transparent;
    color: var(--color-primary);
    font: inherit;
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
  }
  .sash-catalog-grid__empty button:hover {
    background: var(--color-primary-soft);
  }
  .sash-catalog-grid__loading {
    display: grid;
    gap: 0;
    width: 100%;
  }
  .sash-catalog-grid__loading .admin-items-v2-loading-row {
    height: var(--table-row-height);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .sash-catalog-grid__loading .admin-items-v2-loading-row:nth-child(even) {
    background: var(--color-row-alt);
  }
  .sash-catalog-grid__message {
    margin: var(--space-1);
  }
  .sash-special-items {
    min-width: 0;
    margin: 0;
    background: var(--color-surface);
  }
  .sash-special-items__count {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-variant-numeric: var(--font-variant-numeric);
  }
  .sash-special-items .ui-table-wrap {
    border: 0;
    border-radius: 0;
  }
  .sash-special-items__table {
    min-width: 760px;
    table-layout: fixed;
  }
  .sash-selector {
    display: grid;
    gap: var(--space-1);
    width: 100%;
  }
  .sash-selector__snapshot,
  .sash-selector__status {
    margin: 0;
  }
  .sash-selector__list {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    width: min(100%, 720px);
    border-top: 1px solid var(--color-border);
    border-left: 1px solid var(--color-border);
  }
  .sash-selector__option {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-1);
    min-height: 44px;
    border: 0;
    border-right: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    padding: 2px var(--space-1-5);
    text-align: left;
    cursor: pointer;
  }
  .sash-selector__option:hover {
    background: var(--color-row-hover);
  }
  .sash-selector__option.selected {
    background: var(--surface-selected);
    box-shadow: inset 0 0 0 1px var(--border-selected);
  }
  .sash-selector__radio {
    width: 14px;
    height: 14px;
    border: 1px solid var(--color-border-strong);
    border-radius: 999px;
  }
  .sash-selector__option.selected .sash-selector__radio {
    border: 4px solid var(--color-primary);
  }
  .sash-selector__copy {
    display: grid;
    min-width: 0;
    gap: 1px;
  }
  .sash-selector__copy strong,
  .sash-selector__copy span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sash-selector__copy span {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
  }
  .sash-selector__usage {
    display: inline-flex;
    margin-left: 8px;
    color: var(--color-primary-700);
    font-size: 11px;
    font-style: normal;
    font-weight: 700;
    white-space: nowrap;
  }
  .sash-selector__pin {
    display: inline-block;
    margin-left: var(--space-1);
    color: var(--color-primary-700);
    vertical-align: -2px;
  }
  .sash-estimate-editor {
    display: grid;
    grid-column: 1 / -1;
    gap: var(--space-0-5);
    min-width: 0;
  }
  .sash-estimate-editor__tabs {
    align-self: start;
  }
  .sash-estimate-editor.is-preview .sash-estimate-spec__calculation {
    color: var(--color-text-muted);
  }
  .sash-estimate-product-workspace,
  .sash-estimate-spec,
  .sash-estimate-special {
    display: grid;
    gap: var(--space-0-5);
    min-width: 0;
  }
  .sash-estimate-spec__grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .sash-estimate-spec__grid > * {
    min-height: 52px;
    padding: 2px var(--space-1);
    border-right: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }
  .sash-estimate-spec__reference {
    display: grid;
    align-content: center;
    gap: 1px;
    min-width: 0;
    margin: 0;
    background: var(--color-header-bg);
  }
  .sash-estimate-spec__grid label,
  .sash-estimate-spec__grid .ui-field {
    display: grid;
    align-content: center;
    gap: 2px;
    min-width: 0;
  }
  .sash-estimate-spec__grid label.sash-estimate-spec__field--amount {
    grid-column: auto;
  }
  .sash-estimate-spec__reference dt {
    color: var(--color-text-muted);
    font-size: var(--font-size-caption);
  }
  .sash-estimate-spec__grid label > span {
    color: var(--color-text-primary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
  }
  .sash-estimate-spec__reference dd {
    overflow: hidden;
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-table-cell);
    font-weight: var(--font-weight-regular);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sash-estimate-spec__grid .ui-select,
  .sash-estimate-spec__grid input {
    width: 100%;
    min-width: 0;
    height: var(--button-height-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-input);
    padding: 0 var(--space-input-x);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font: inherit;
    font-size: var(--font-size-table-cell);
  }
  .sash-estimate-spec__grid .ui-select:hover,
  .sash-estimate-spec__grid input:hover {
    border-color: var(--color-border);
  }
  .sash-estimate-spec__grid .ui-select:focus,
  .sash-estimate-spec__grid input:focus {
    border-color: var(--color-primary);
    outline: none;
  }
  .sash-estimate-field__unit {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-input);
    background: var(--color-surface);
    overflow: hidden;
  }
  .sash-estimate-field__unit:hover {
    border-color: var(--color-border);
  }
  .sash-estimate-field__unit:focus-within {
    border-color: var(--color-primary);
  }
  .sash-estimate-field__unit input {
    border: 0;
    border-radius: 0;
    text-align: right;
    font-variant-numeric: var(--font-variant-numeric);
  }
  .sash-estimate-field__unit input:focus {
    border: 0;
  }
  .sash-estimate-field__unit em {
    padding-right: var(--space-input-x);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-style: normal;
  }
  .sash-estimate-spec__calculation {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-3);
    min-height: 32px;
    align-items: center;
    padding: 0 var(--space-table-cell-x);
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-subtle);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
  }
  .sash-estimate-spec__calculation strong {
    margin-left: var(--space-0-5);
    color: var(--color-text-primary);
    font-weight: var(--font-weight-semibold);
  }
  .sash-estimate-spec__total {
    margin-left: auto;
    color: var(--color-text-primary);
  }
  .items-v2-sash-summary {
    display: block;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .items-v2-sash-preview-amount {
    color: var(--color-text-muted);
    opacity: 0.72;
  }
  .items-v2-badge > svg {
    flex: 0 0 auto;
  }
  .sash-estimate-special__options {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    border-top: 1px solid var(--color-border);
  }
  .sash-estimate-special__options label {
    display: grid;
    grid-template-columns: 16px minmax(160px, 1fr) 124px 72px 96px;
    align-items: center;
    gap: var(--space-1);
    min-height: 40px;
    border-bottom: 1px solid var(--color-border);
    padding: 0 var(--space-1-5);
    background: var(--color-surface);
    font-size: var(--font-size-table-cell);
  }
  .sash-estimate-special__options label:hover {
    background: var(--color-row-hover);
  }
  .sash-estimate-special__options input[type="checkbox"] {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--color-primary);
  }
  .sash-estimate-special__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sash-estimate-special__dimensions,
  .sash-estimate-special__area {
    color: var(--color-text-secondary);
    font-variant-numeric: var(--font-variant-numeric);
    text-align: right;
    white-space: nowrap;
  }
  .sash-estimate-special__options .price-text {
    justify-self: end;
  }
  @media (max-width: 1080px) {
    .photo-management-mode-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .photo-management-workspace {
      grid-template-columns: 170px 250px minmax(0, 1fr);
    }
  }
  @media (max-width: 767px) {
    .formate-app-shell--photo-management .formate-app-shell__main {
      overflow-y: auto;
    }
    .photo-management-page {
      height: auto;
      min-height: 100%;
      overflow: visible;
    }
    .photo-management-page.photo-management-landing {
      padding: var(--space-2);
    }
    .photo-management-mode-grid {
      grid-template-columns: 1fr;
    }
    .photo-management-mode-card {
      min-height: 148px;
      padding: var(--space-2);
    }
    .photo-management-page.pyeong-photo-page {
      grid-template-columns: minmax(0, 1fr);
    }
    .pyeong-photo-page > .admin-price-v2-sidebar {
      width: 100%;
      max-height: 240px;
      border-right: 0;
      border-bottom: 1px solid var(--color-border);
    }
    .pyeong-photo-workspace {
      min-height: 620px;
      overflow: visible;
    }
    .pyeong-photo-header {
      align-items: flex-start;
      flex-direction: column;
      padding-top: var(--space-1);
      padding-bottom: var(--space-1);
    }
    .pyeong-photo-titleline,
    .pyeong-photo-header-actions {
      width: 100%;
    }
    .pyeong-photo-header-actions {
      justify-content: flex-end;
    }
    .pyeong-photo-titleline > div {
      align-items: flex-start;
      flex-direction: column;
      gap: 0;
    }
    .pyeong-photo-header-actions {
      flex-wrap: wrap;
    }
    .pyeong-photo-jump {
      min-width: 0;
      flex: 1 1 auto;
    }
    .pyeong-photo-jump-trigger {
      max-width: 100%;
    }
    .pyeong-photo-jump-menu {
      right: auto;
      left: 0;
    }
    .pyeong-photo-grid {
      grid-template-columns: repeat(auto-fit, minmax(min(160px, 100%), 1fr));
    }
    .photo-management-page .photo-management-panel {
      min-height: 100%;
    }
    .photo-management-toolbar {
      min-height: 52px;
      padding: var(--space-1) var(--space-2);
    }
    .photo-management-toolbar-actions {
      flex-wrap: wrap;
    }
    .photo-management-workspace {
      grid-template-columns: 1fr;
      min-height: 0;
      overflow: visible;
    }
    .photo-type-sidebar,
    .photo-category-sidebar {
      border-right: 0;
      border-bottom: 1px solid var(--color-border);
    }
    .photo-type-sidebar .photo-sidebar-list {
      grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
      overflow: visible;
    }
    .photo-type-row {
      grid-template-columns: 18px minmax(0, 1fr) 28px;
    }
    .photo-subitem-sidebar-list {
      max-height: 260px;
    }
    .photo-content-header {
      align-items: flex-start;
      flex-direction: column;
    }
    .photo-content-header > div:first-child {
      align-items: flex-start;
      flex-direction: column;
    }
    .photo-content-actions {
      width: 100%;
      justify-content: flex-end;
    }
    .photo-content-panel .photo-thumb-grid {
      grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    }
    .photo-add-tile {
      min-height: 166px;
    }
    .photo-viewer-backdrop {
      padding: 0;
    }
    .photo-viewer {
      width: 100vw;
      height: 100dvh;
      border: 0;
      border-radius: 0;
    }
    .photo-viewer-stage {
      padding: var(--space-1) 48px;
    }
    .photo-viewer-nav {
      width: 36px;
      height: 48px;
    }
    .photo-viewer-nav.previous { left: var(--space-1); }
    .photo-viewer-nav.next { right: var(--space-1); }
    .photo-viewer-thumbnails {
      justify-content: flex-start;
    }
    .sash-selector__option {
      grid-template-columns: 18px minmax(0, 1fr);
    }
    .sash-selector__option .price-text {
      grid-column: 2;
      justify-self: start;
    }
    .sash-estimate-spec__grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .sash-estimate-spec__reference,
    .sash-estimate-spec__grid label,
    .sash-estimate-spec__grid .ui-field {
      grid-column: span 1;
    }
    .sash-estimate-spec__grid label.sash-estimate-spec__field--amount {
      grid-column: span 2;
    }
    .sash-estimate-special__options label {
      grid-template-columns: 16px minmax(0, 1fr) auto;
    }
    .sash-estimate-special__dimensions,
    .sash-estimate-special__area {
      display: none;
    }
  }
  @media (max-width: 767px) {
    .work-home-content {
      padding-right: var(--space-2);
      padding-left: var(--space-2);
    }
  }
`;

export default appStyles;
