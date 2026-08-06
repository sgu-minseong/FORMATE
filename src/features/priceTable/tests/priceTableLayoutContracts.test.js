import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  new URL("../PriceTablePage.jsx", import.meta.url),
  "utf8"
);
const appStyles = readFileSync(
  new URL("../../../styles/appStyles.js", import.meta.url),
  "utf8"
);

describe("price table add action layout contracts", () => {
  it("replaces the full-width material add rows with centered item actions", () => {
    expect(pageSource).not.toContain("admin-add-subitem-row admin-price-v2-add-row");
    expect(pageSource.match(/admin-price-v2-add-action/g)).toHaveLength(2);
    expect(pageSource.match(/항목 추가/g)).toHaveLength(2);
    expect(pageSource).not.toContain("소재 추가");
  });

  it("centers the action without recreating the bordered row", () => {
    expect(appStyles).toMatch(
      /\.admin-price-v2-add-action\s*\{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*center;[\s\S]*?padding:\s*var\(--space-2\) 0;/
    );
  });
});
