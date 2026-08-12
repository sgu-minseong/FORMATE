import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../../../app/AdminApp.jsx", import.meta.url), "utf8");
const controllerSource = readFileSync(new URL("../usePriceTableController.js", import.meta.url), "utf8");
const switcherSource = readFileSync(new URL("../TemplateConditionSwitcher.jsx", import.meta.url), "utf8");
const appStyles = readFileSync(new URL("../../../styles/appStyles.js", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../../../styles/tokens.css", import.meta.url), "utf8");
const searchControlSource = appStyles.slice(
  appStyles.indexOf(".admin-search-field"),
  appStyles.indexOf(".admin-favorite-filter")
);

const catalogLoadSource = appSource.slice(
  appSource.indexOf("async function loadAdminItems"),
  appSource.indexOf("function fetchAdminItems")
);
const estimateLoadSource = appSource.slice(
  appSource.indexOf("function initializeEstimateLists"),
  appSource.indexOf("async function moveSavedEstimateToTrash")
);

describe("FORMATE control density ownership", () => {
  it("keeps canonical controls scoped and removes broad raw control geometry", () => {
    expect(tokens).toMatch(/\.ui-input,\s*\n\.ui-select\s*\{[\s\S]*?height:\s*var\(--button-height\);/);
    expect(appStyles).not.toContain('input:not([type="checkbox"])');
    expect(appStyles).not.toMatch(/select,\s*\n\s*input/);
    expect(searchControlSource).not.toContain("!important");
  });

  it("renders search as one compact control instead of nested boxes", () => {
    expect(appStyles).toMatch(
      /\.admin-search-field\s*\{[\s\S]*?height:\s*var\(--button-height\);[\s\S]*?border:\s*1px solid var\(--color-border-strong\);/
    );
    expect(appStyles).toMatch(
      /\.admin-search-field input\s*\{[\s\S]*?padding:\s*0;[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;/
    );
    expect(appStyles).toMatch(
      /\.admin-price-v2-search\s*\{[\s\S]*?height:\s*var\(--button-height-sm\);/
    );
    expect(switcherSource).toContain('className="admin-search-field template-condition-switcher__search"');
    expect(appStyles).not.toMatch(
      /\.template-condition-switcher__search\s*\{[^}]*border:/
    );
  });

  it("keeps interaction feedback quiet, immediate, and keyboard-visible", () => {
    expect(tokens).toMatch(/\.ui-button:not\(:disabled\):active\s*\{[^}]*opacity:\s*0\.82;/);
    expect(appStyles).toMatch(/\.items-v2-icon-button:focus-visible\s*\{[^}]*box-shadow:\s*var\(--focus-ring\);/);
    expect(appStyles).toMatch(/\.template-condition-switcher__trigger\s*\{[^}]*transition:[^}]*120ms/);
    expect(appStyles).not.toMatch(/\.template-condition-switcher__trigger:active[^}]*transform:/);
    expect(appStyles).not.toContain("page-enter");
  });
});

describe("FORMATE loading resource ownership", () => {
  it("replaces shared booleans with company-scoped resource states", () => {
    expect(controllerSource).toContain("adminCatalogResource");
    expect(controllerSource).not.toContain("adminLoading");
    expect(appSource).toContain("const [estimateListResource, setEstimateListResource]");
    expect(appSource).toContain("const [conditionLabelsResource, setConditionLabelsResource]");
    expect(appSource).toContain("conditionLabelsRequestRef.current");
    expect(appSource).toContain("initializeConditionVariantLabels");
    expect(appSource).not.toContain("adminConditionLoaded");
    expect(appSource).not.toContain("adminLoading");
    expect(appSource).toContain("getScopedResourceStatus(");
  });

  it("loads catalog and template context once while preserving request races", () => {
    expect(catalogLoadSource).toContain("const [snapshot, templateRows] = await Promise.all([");
    expect(catalogLoadSource).toContain("adminCatalogSnapshotRef.current");
    expect(catalogLoadSource).toContain("adminTemplatesCompanyIdRef.current === companyId");
    expect(catalogLoadSource).toContain("options.selectPreferredTemplate");
    expect(catalogLoadSource).toContain("requestId === adminCatalogLoadRequestRef.current");
    expect(catalogLoadSource).not.toContain("await fetchAdminTemplateList()");
    expect(catalogLoadSource).not.toContain('"initial"');
  });

  it("keeps estimate search local and owns list readiness independently", () => {
    expect(estimateLoadSource).toContain("estimateListResourceRef.current");
    expect(estimateLoadSource).toContain('status: "loading"');
    expect(estimateLoadSource).toContain('status: "ready"');
    expect(appSource).toContain("const visibleEstimates = useMemo");
    expect(appSource).not.toContain("fetchEstimates(estimateSearch)");
  });

  it("retains selection, dirty-leave, save invalidation, and company reset contracts", () => {
    expect(appSource).toContain("requestAdminCatalogLeave");
    expect(appSource).toContain("lastSelectedAdminTemplateId");
    expect(appSource).toContain("markAdminCatalogSavedNow");
    expect(appSource).toContain('adminCatalogSnapshotRef.current = { companyId: "", snapshot: null }');
    expect(appSource).toContain('status: "idle", companyId: "", scopeKey: ""');
  });
});
