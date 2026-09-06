import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Table from "../Table";
import { fitTableColumns } from "../tableWidths";

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

  it("fits rendered widths without mutating preferred widths and restores them when space returns", () => {
    const preferred = [
      { key: "material", width: 260, minWidth: 160, fitMinWidth: 128 },
      { key: "spec", width: 120, minWidth: 80, fitMinWidth: 64 },
      { key: "quantity", width: 72, minWidth: 56, fitMinWidth: 48 },
    ];

    const fitted = fitTableColumns(preferred, 300);
    expect(fitted.reduce((total, column) => total + column.width, 0)).toBeCloseTo(300);
    expect(fitted.map((column) => column.width)).toEqual([
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(fitted.every((column, index) => column.width >= preferred[index].fitMinWidth)).toBe(true);
    expect(preferred.map((column) => column.width)).toEqual([260, 120, 72]);
    expect(fitTableColumns(preferred, 600).map((column) => column.width)).toEqual([260, 120, 72]);
  });

  it("uses effective columns for one shared header and body geometry", () => {
    const source = renderToStaticMarkup(
      <Table
        resizable
        fitToContainer
        columns={[
          { key: "material", label: "소재명", width: 260, fitMinWidth: 128 },
          { key: "spec", label: "규격", width: 120, fitMinWidth: 64 },
        ]}
        rows={rows}
      />,
    );

    expect(source).toContain('<col style="width:260px"/>');
    expect(source).toContain('<th class="" style="width:260px" scope="col">');
    expect(source.match(/<th /g)).toHaveLength(source.match(/<td /g).length);
  });
});
