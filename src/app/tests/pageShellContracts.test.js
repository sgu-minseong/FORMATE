import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (filePath) => fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8");

describe("global page shell contracts", () => {
  it("keeps work pages on the shared compact header without duplicate navigation copy", () => {
    const adminSource = read("src/app/AdminApp.jsx");
    const detailSource = read("src/features/detailCosts/DetailCostsPage.jsx");
    const photoSource = read("src/features/photoManagement/PhotoManagementPage.jsx");
    const operationsSource = [
      read("src/features/customerOperations/CustomerRequestsPage.jsx"),
      read("src/features/customerOperations/AftercareServicePage.jsx"),
      read("src/features/customerOperations/CustomersProjectsPage.jsx"),
    ].join("\n");
    const savedHeaderStart = adminSource.indexOf('{page === "admin-estimates" && renderAppShell');
    const savedHeaderEnd = adminSource.indexOf('<nav className="saved-estimate-view-tabs"', savedHeaderStart);
    const savedHeaderSource = adminSource.slice(savedHeaderStart, savedHeaderEnd);

    expect(operationsSource).not.toContain("고객 요청을 확인하고 처리 상태를 관리합니다.");
    expect(operationsSource).not.toContain("공사 완료 후 예정된 점검과 접수된 A/S 요청을 관리합니다.");
    expect(operationsSource).not.toContain("고객과 연결된 현장의 견적, 요청, 공사 기록을 확인합니다.");
    expect(savedHeaderSource).toContain("<PageHeader");
    expect(savedHeaderSource).not.toContain("홈으로");
    expect(savedHeaderSource).not.toContain("고객명이나 주소로 찾고 다시 열 수 있습니다.");
    expect(detailSource).toContain('<PageHeader\n        title="세부 비용 관리"');
    expect(detailSource).not.toContain("관리자 홈");
    expect(detailSource).not.toContain("onBack");
    expect(photoSource).toContain('<PageHeader title="사진 관리" />');
    expect(photoSource).not.toContain("관리할 사진의 기준을 선택하세요.");
  });

  it("keeps legacy panel pages at the compact workspace starting position", () => {
    const styles = read("src/styles/appStyles.js");
    const operationsStyles = read("src/features/customerOperations/customerOperations.css");

    expect(styles).toMatch(/\.saved-estimates-page,\s*\.detail-cost-page\s*\{\s*padding:\s*0;/s);
    expect(styles).toMatch(/\.photo-management-page\.photo-management-landing\s*\{[^}]*padding:\s*0 var\(--space-2\) var\(--space-2\);/s);
    expect(operationsStyles).toMatch(/\.customer-projects-workspace-page\s*\{[^}]*gap:\s*var\(--space-1-5\);/s);
  });

  it("uses standard arrow navigation without pressed movement", () => {
    const shellSource = read("src/components/layout/AppShell.jsx");
    const tokens = read("src/styles/tokens.css");

    expect(shellSource).toContain("ArrowLeft");
    expect(shellSource).toContain("ArrowRight");
    expect(shellSource).not.toContain("ChevronLeft");
    expect(shellSource).not.toContain("ChevronRight");
    expect(tokens).toMatch(/\.formate-app-shell__history-button:active:not\(:disabled\)\s*\{[^}]*transform:\s*none/s);
  });
});
