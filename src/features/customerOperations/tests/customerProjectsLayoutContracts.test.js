import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminAppSource = readFileSync(
  new URL("../../../app/AdminApp.jsx", import.meta.url),
  "utf8"
);
const operationsStyles = readFileSync(
  new URL("../customerOperations.css", import.meta.url),
  "utf8"
);
const appStyles = readFileSync(
  new URL("../../../styles/appStyles.js", import.meta.url),
  "utf8"
);

describe("customer projects workspace layout contracts", () => {
  it("uses a full-bleed shell without the shared page gutter", () => {
    expect(adminAppSource).toMatch(
      /CUSTOMER_OPERATIONS_PAGES\.CUSTOMERS_PROJECTS[\s\S]*?formate-app-shell--customer-projects/
    );
    expect(appStyles).toMatch(
      /\.formate-app-shell--customer-projects \.formate-app-shell__main\s*\{[\s\S]*?padding:\s*0;/
    );
    expect(operationsStyles).toMatch(
      /\.customer-projects-workspace-page\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?margin-inline:\s*0;/
    );
  });

  it("keeps the search and status filter on the same height token", () => {
    expect(operationsStyles).toMatch(
      /\.customer-projects-workspace__search\s*\{[\s\S]*?height:\s*var\(--button-height\);/
    );
    expect(operationsStyles).toMatch(
      /\.customer-projects-workspace__filter select\s*\{[\s\S]*?height:\s*var\(--button-height\);[\s\S]*?min-height:\s*var\(--button-height\);/
    );
  });

  it("keeps internal header alignment and a square full-width surface", () => {
    expect(operationsStyles).toMatch(
      /\.customer-projects-workspace-page \.ui-page-header\s*\{[\s\S]*?padding:\s*var\(--space-1-5\) var\(--space-2\) 0;/
    );
    expect(operationsStyles).toMatch(
      /\.customer-projects-workspace__surface\s*\{[\s\S]*?border-radius:\s*0;/
    );
    expect(operationsStyles).toMatch(
      /@media \(max-width:\s*1099px\)[\s\S]*?\.customer-projects-workspace-page\s*\{[\s\S]*?min-height:\s*100%;/
    );
  });
});
