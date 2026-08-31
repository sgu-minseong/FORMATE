import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Table from "../Table";

const rows = [{ id: "row-a", material: "실크", spec: "1200" }];

function renderTable(specWidth) {
  return renderToStaticMarkup(
    <Table
      resizable
      columns={[
        { key: "material", label: "소재명", width: 260 },
        { key: "spec", label: "규격", width: specWidth },
        { key: "quantity", label: "수량", width: 72 },
      ]}
      rows={rows}
    />,
  );
}

describe("resizable semantic table rendering", () => {
  it("renders the table at the exact column sum and shrinks only with the changed column", () => {
    const before = renderTable(120);
    const after = renderTable(80);

    expect(before).toContain("width:452px;min-width:452px;max-width:452px;table-layout:fixed");
    expect(after).toContain("width:412px;min-width:412px;max-width:412px;table-layout:fixed");
    expect(after).toContain('<col style="width:260px"/>');
    expect(after).toContain('<col style="width:80px"/>');
    expect(after).toContain('<col style="width:72px"/>');
    expect(after).toContain("ui-table-wrap--resizable");
  });
});
