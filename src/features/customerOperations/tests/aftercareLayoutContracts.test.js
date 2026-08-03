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

describe("aftercare workspace layout contracts", () => {
  it("uses a full-bleed shell without the shared page gutter", () => {
    expect(adminAppSource).toMatch(
      /CUSTOMER_OPERATIONS_PAGES\.AFTERCARE_SERVICE[\s\S]*?formate-app-shell--aftercare/
    );
    expect(appStyles).toMatch(
      /\.formate-app-shell--aftercare \.formate-app-shell__main\s*\{[\s\S]*?padding:\s*0;/
    );
  });

  it("keeps internal header alignment while the workspace surface reaches the edges", () => {
    expect(operationsStyles).toMatch(
      /\.aftercare-workspace \.ui-page-header\s*\{[\s\S]*?padding:\s*var\(--space-1-5\) var\(--space-2\) 0;/
    );
    expect(operationsStyles).toMatch(
      /\.aftercare-workspace__toolbar\s*\{[\s\S]*?padding:\s*0 var\(--space-2\);/
    );
    expect(operationsStyles).toMatch(
      /\.aftercare-workspace__surface\s*\{[\s\S]*?border-radius:\s*0;/
    );
  });

  it("keeps the stacked mobile workspace in normal document flow", () => {
    expect(operationsStyles).toMatch(
      /@media \(max-width:\s*767px\)[\s\S]*?\.aftercare-workspace\s*\{[\s\S]*?min-height:\s*100%;/
    );
    expect(operationsStyles).toMatch(
      /@media \(max-width:\s*767px\)[\s\S]*?\.aftercare-workspace__surface\s*\{[\s\S]*?flex:\s*0 0 auto;/
    );
  });
});
