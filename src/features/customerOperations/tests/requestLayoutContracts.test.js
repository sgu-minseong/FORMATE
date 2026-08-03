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

describe("customer requests layout contracts", () => {
  it("uses a full-bleed request shell without the shared page gutter", () => {
    expect(adminAppSource).toMatch(
      /CUSTOMER_OPERATIONS_PAGES\.REQUESTS[\s\S]*?formate-app-shell--customer-requests/
    );
    expect(appStyles).toMatch(
      /\.formate-app-shell--customer-requests \.formate-app-shell__main\s*\{[\s\S]*?padding:\s*0;/
    );
    expect(operationsStyles).toMatch(
      /\.customer-requests-inbox\s*\{[\s\S]*?width:\s*100%;[\s\S]*?margin-inline:\s*0;/
    );
    expect(operationsStyles).toMatch(
      /@media \(max-width:\s*1099px\)[\s\S]*?\.customer-requests-inbox\s*\{[\s\S]*?min-height:\s*100%;/
    );
  });

  it("keeps search and select controls on the same height token", () => {
    expect(operationsStyles).toMatch(
      /\.customer-requests-inbox__search\s*\{[\s\S]*?height:\s*var\(--button-height\)/
    );
    expect(operationsStyles).toMatch(
      /\.customer-requests-inbox__select select\s*\{[\s\S]*?height:\s*var\(--button-height\);[\s\S]*?min-height:\s*var\(--button-height\);/
    );
  });
});
