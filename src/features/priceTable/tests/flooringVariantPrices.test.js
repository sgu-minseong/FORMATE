import { describe, expect, it } from "vitest";
import {
  buildSubitemPricePayload,
  buildSubitemSaveOperation,
  buildUniqueFlooringOptions,
  createEmptyFlooringVariantDraft,
  getFlooringVariantDisplayValues,
  isFlooringThicknessSelection,
  normalizeFlooringOptionKey,
  normalizePriceTableRows,
  patchSubitemPriceById,
  reconcileFlooringVariantRows,
  reconcileInsertedSubitems,
  resolveActiveFlooringVariant,
  resolveFlooringVariant,
} from "../priceTableModel";

const FLOORING_ITEM_ID = "flooring-item";

const kccRows = [
  {
    id: "subitem-18-id",
    item_id: FLOORING_ITEM_ID,
    name: "KCC 장판 1.8T",
    unit_price: 12000,
    labor_rate_empty: 11000,
    labor_rate_occupied: 13000,
  },
  {
    id: "subitem-22-id",
    item_id: FLOORING_ITEM_ID,
    name: "KCC 장판 2.2T",
    unit_price: 10000,
    labor_rate_empty: 9000,
    labor_rate_occupied: 12000,
  },
  {
    id: "subitem-30-id",
    item_id: FLOORING_ITEM_ID,
    name: "KCC 장판 3.0T",
    unit_price: 20000,
    labor_rate_empty: 18000,
    labor_rate_occupied: 22000,
  },
];

const lgRows = [
  {
    id: "lg-subitem-18-id",
    item_id: FLOORING_ITEM_ID,
    name: "LG 장판 1.8T",
    unit_price: 15000,
    labor_rate_empty: 14000,
    labor_rate_occupied: 16000,
  },
];

const nonVariantRow = {
  id: "wood-flooring-id",
  item_id: "flooring-item-wood",
  name: "강마루",
  unit_price: 43000,
  labor_rate: 25000,
};

function createAdminItems() {
  return [
    {
      id: FLOORING_ITEM_ID,
      subitems: [...kccRows, ...lgRows].map((row) => ({ ...row })),
    },
    {
      id: "flooring-item-wood",
      subitems: [{ ...nonVariantRow }],
    },
  ];
}

describe("flooring variant identity", () => {
  it.each([
    ["1.8T", "subitem-18-id"],
    ["2.2T", "subitem-22-id"],
    ["3.0T", "subitem-30-id"],
  ])("resolves %s to its persisted subitem id", (thickness, expectedId) => {
    expect(resolveFlooringVariant(kccRows, "KCC 장판", thickness)?.id).toBe(expectedId);
  });

  it("is independent of row order", () => {
    const shuffledRows = [kccRows[2], kccRows[0], kccRows[1]];
    expect(resolveFlooringVariant(shuffledRows, "KCC 장판", "2.2T")?.id).toBe("subitem-22-id");
  });

  it("does not mix brands that share a thickness", () => {
    const rows = [...lgRows, ...kccRows];
    expect(resolveFlooringVariant(rows, "KCC 장판", "1.8T")?.id).toBe("subitem-18-id");
    expect(resolveFlooringVariant(rows, "LG 장판", "1.8T")?.id).toBe("lg-subitem-18-id");
  });
});

describe("price edits by subitem id", () => {
  it.each([
    ["subitem-18-id", 12500],
    ["subitem-22-id", 10500],
  ])("changes only %s and preserves every other variant", (subitemId, nextPrice) => {
    const current = createAdminItems();
    const untouchedKccRows = current[0].subitems.filter((row) => row.id !== subitemId);
    const untouchedWoodItem = current[1];
    const next = patchSubitemPriceById(current, subitemId, { unit_price: nextPrice });

    expect(next).not.toBe(current);
    expect(next[0]).not.toBe(current[0]);
    expect(next[1]).toBe(untouchedWoodItem);
    expect(next[0].subitems.find((row) => row.id === subitemId)?.unit_price).toBe(nextPrice);
    untouchedKccRows.forEach((row) => {
      expect(next[0].subitems.find((candidate) => candidate.id === row.id)).toBe(row);
    });
  });

  it("does not reproduce the last edited value across all thicknesses", () => {
    let items = createAdminItems();
    items = patchSubitemPriceById(items, "subitem-18-id", {
      unit_price: 12000,
      labor_rate_empty: 11000,
      labor_rate_occupied: 13000,
    });
    items = patchSubitemPriceById(items, "subitem-22-id", {
      unit_price: 10000,
      labor_rate_empty: 9000,
      labor_rate_occupied: 12000,
    });
    items = patchSubitemPriceById(items, "subitem-30-id", {
      unit_price: 20000,
      labor_rate_empty: 18000,
      labor_rate_occupied: 22000,
    });

    expect(
      items[0].subitems
        .filter((row) => row.name.startsWith("KCC 장판"))
        .map((row) => [
          row.unit_price,
          row.labor_rate_empty,
          row.labor_rate_occupied,
        ])
    ).toEqual([
      [12000, 11000, 13000],
      [10000, 9000, 12000],
      [20000, 18000, 22000],
    ]);
  });
});

describe("price persistence contract", () => {
  it("keeps the legacy labor_rate field aligned with empty-home labor", () => {
    expect(buildSubitemPricePayload(kccRows[0])).toEqual({
      unit_price: 12000,
      labor_rate_empty: 11000,
      labor_rate_occupied: 13000,
      labor_rate: 11000,
    });
  });

  it("preserves the non-variant material save fallback", () => {
    expect(buildSubitemPricePayload(nonVariantRow)).toEqual({
      unit_price: 43000,
      labor_rate_empty: 25000,
      labor_rate_occupied: 25000,
      labor_rate: 25000,
    });
  });

  it("creates update operations for persisted rows and insert operations for local rows", () => {
    const localRow = {
      ...kccRows[2],
      id: "local-subitem-new-30",
    };

    expect(buildSubitemSaveOperation(kccRows[0])).toMatchObject({
      operation: "update",
      id: "subitem-18-id",
      payload: { name: "KCC 장판 1.8T" },
    });
    expect(buildSubitemSaveOperation(localRow)).toMatchObject({
      operation: "insert",
      payload: { name: "KCC 장판 3T" },
    });
  });

  it("reconciles inserted rows by item and canonical name instead of response index", () => {
    const localRows = [
      { ...kccRows[0], id: "local-subitem-18" },
      { ...kccRows[1], id: "local-subitem-22" },
      { ...kccRows[2], id: "local-subitem-30" },
    ];
    const shuffledInsertedRows = [
      { ...kccRows[2], id: "persisted-30-id" },
      { ...kccRows[0], id: "persisted-18-id" },
      { ...kccRows[1], id: "persisted-22-id" },
    ];

    expect(reconcileInsertedSubitems(localRows, shuffledInsertedRows).map((row) => row.id)).toEqual([
      "persisted-18-id",
      "persisted-22-id",
      "persisted-30-id",
    ]);
  });

  it("round-trips distinct values through payloads and shuffled requery normalization", () => {
    const persistedRows = kccRows.map((row) => ({
      id: row.id,
      item_id: row.item_id,
      name: row.name,
      ...buildSubitemPricePayload(row),
    }));
    const normalizedRows = normalizePriceTableRows([
      persistedRows[2],
      persistedRows[0],
      persistedRows[1],
    ]);

    expect(buildSubitemPricePayload(resolveFlooringVariant(normalizedRows, "KCC 장판", "1.8T"))).toEqual(
      buildSubitemPricePayload(kccRows[0])
    );
    expect(buildSubitemPricePayload(resolveFlooringVariant(normalizedRows, "KCC 장판", "2.2T"))).toEqual(
      buildSubitemPricePayload(kccRows[1])
    );
    expect(buildSubitemPricePayload(resolveFlooringVariant(normalizedRows, "KCC 장판", "3.0T"))).toEqual(
      buildSubitemPricePayload(kccRows[2])
    );
  });
});

describe("active flooring variant UI contract", () => {
  const reproducedRows = [
    {
      id: "subitem-22-existing",
      item_id: FLOORING_ITEM_ID,
      name: "KCC 장판 2.2T",
      unit: "평",
      unit_price: 100000,
      labor_rate_empty: 100000,
      labor_rate_occupied: 100000,
    },
  ];

  function appendEmptyVariant(rows, thickness, id) {
    return [
      ...rows,
      createEmptyFlooringVariantDraft({
        id,
        itemId: FLOORING_ITEM_ID,
        baseName: "KCC 장판",
        thickness,
        source: rows[0],
        sortOrder: rows.length,
      }),
    ];
  }

  it("switches 2.2T, 2.7T, and 3.5T to their own row ids", () => {
    const rows = [
      ...reproducedRows,
      { ...reproducedRows[0], id: "subitem-27-existing", name: "KCC 장판 2.7T" },
      { ...reproducedRows[0], id: "subitem-35-existing", name: "KCC 장판 3.5T" },
    ];

    expect(resolveActiveFlooringVariant(rows, "KCC 장판", "2.2T")?.id).toBe("subitem-22-existing");
    expect(resolveActiveFlooringVariant(rows, "KCC 장판", "2.7T")?.id).toBe("subitem-27-existing");
    expect(resolveActiveFlooringVariant(rows, "KCC 장판", "3.5T")?.id).toBe("subitem-35-existing");
  });

  it("reads only the selected 2.7T row after 2.2T has a value", () => {
    const rows = [
      ...reproducedRows,
      {
        ...reproducedRows[0],
        id: "subitem-27-existing",
        name: "KCC 장판 2.7T",
        unit_price: 200000,
      },
    ];
    const active = resolveActiveFlooringVariant(rows, "KCC 장판", "2.7T");

    expect(getFlooringVariantDisplayValues(active).unit_price).toBe(200000);
    expect(active?.id).toBe("subitem-27-existing");
  });

  it("does not fall back to 2.2T when the selected 2.7T row is missing", () => {
    const active = resolveActiveFlooringVariant(reproducedRows, "KCC 장판", "2.7T");

    expect(active).toBeNull();
    expect(getFlooringVariantDisplayValues(active)).toEqual({
      disabled: true,
      unit_price: "",
      labor_rate_empty: "",
      labor_rate_occupied: "",
    });
  });

  it("creates a separate empty local row for a missing 3.5T selection", () => {
    const draft = createEmptyFlooringVariantDraft({
      id: "local-subitem-35",
      itemId: FLOORING_ITEM_ID,
      baseName: "KCC 장판",
      thickness: "3.5T",
      source: reproducedRows[0],
      sortOrder: 1,
    });

    expect(draft).toMatchObject({
      id: "local-subitem-35",
      item_id: FLOORING_ITEM_ID,
      name: "KCC 장판 3.5T",
      unit_price: "",
      labor_rate_empty: "",
      labor_rate_occupied: "",
    });
    expect(draft).not.toBe(reproducedRows[0]);
  });

  it("keeps 2.2T and 2.7T unchanged when the local 3.5T row is edited", () => {
    let rows = appendEmptyVariant(reproducedRows, "2.7T", "local-subitem-27");
    rows = appendEmptyVariant(rows, "3.5T", "local-subitem-35");
    const items = [{ id: FLOORING_ITEM_ID, subitems: rows }];
    const next = patchSubitemPriceById(items, "local-subitem-35", {
      unit_price: 300000,
      labor_rate_empty: 300000,
      labor_rate_occupied: 300000,
    });

    expect(next[0].subitems.find((row) => row.id === "subitem-22-existing")?.unit_price).toBe(100000);
    expect(next[0].subitems.find((row) => row.id === "local-subitem-27")?.unit_price).toBe("");
    expect(next[0].subitems.find((row) => row.id === "local-subitem-35")?.unit_price).toBe(300000);
  });

  it("uses one active row for both displayed values and the onChange target id", () => {
    const rows = appendEmptyVariant(reproducedRows, "2.7T", "local-subitem-27");
    const active = resolveActiveFlooringVariant(rows, "KCC 장판", "2.7T");
    const displayValues = getFlooringVariantDisplayValues(active);

    expect(active?.id).toBe("local-subitem-27");
    expect(displayValues).toEqual({
      disabled: false,
      unit_price: "",
      labor_rate_empty: "",
      labor_rate_occupied: "",
    });

    const next = patchSubitemPriceById(
      [{ id: FLOORING_ITEM_ID, subitems: rows }],
      active.id,
      { unit_price: 200000 }
    );
    expect(next[0].subitems.find((row) => row.id === active.id)?.unit_price).toBe(200000);
  });

  it("does not replicate the last value during sequential variant transitions", () => {
    let items = [{ id: FLOORING_ITEM_ID, subitems: [...reproducedRows] }];
    items[0].subitems = appendEmptyVariant(items[0].subitems, "2.7T", "local-subitem-27");
    items[0].subitems = appendEmptyVariant(items[0].subitems, "3.5T", "local-subitem-35");
    items = patchSubitemPriceById(items, "local-subitem-27", { unit_price: 200000 });
    items = patchSubitemPriceById(items, "local-subitem-35", { unit_price: 300000 });

    expect([
      resolveActiveFlooringVariant(items[0].subitems, "KCC 장판", "2.2T")?.unit_price,
      resolveActiveFlooringVariant(items[0].subitems, "KCC 장판", "2.7T")?.unit_price,
      resolveActiveFlooringVariant(items[0].subitems, "KCC 장판", "3.5T")?.unit_price,
    ]).toEqual([100000, 200000, 300000]);
  });

  it("normalizes thickness selections with and without the T suffix", () => {
    const rows = appendEmptyVariant(reproducedRows, "2.7", "local-subitem-27");

    expect(resolveActiveFlooringVariant(rows, "KCC 장판", "2.7")?.id).toBe("local-subitem-27");
    expect(resolveActiveFlooringVariant(rows, "KCC 장판", "2.7T")?.id).toBe("local-subitem-27");
    expect(isFlooringThicknessSelection("2.7")).toBe(true);
    expect(isFlooringThicknessSelection("2.7T")).toBe(true);
  });

  it("is independent of row and spec option order", () => {
    const rows = appendEmptyVariant(reproducedRows, "2.7T", "local-subitem-27").reverse();
    const specOptions = ["3.5T", "2.7T", "일반 규격"];

    expect(resolveActiveFlooringVariant(rows, "KCC 장판", specOptions[1])?.id).toBe("local-subitem-27");
    expect(isFlooringThicknessSelection(specOptions[0])).toBe(true);
    expect(isFlooringThicknessSelection(specOptions[2])).toBe(false);
  });

  it("keeps all values after local rows reconcile to persisted ids in shuffled order", () => {
    const localRows = [
      ...reproducedRows,
      createEmptyFlooringVariantDraft({
        id: "local-subitem-27",
        itemId: FLOORING_ITEM_ID,
        baseName: "KCC 장판",
        thickness: "2.7T",
        source: reproducedRows[0],
      }),
      createEmptyFlooringVariantDraft({
        id: "local-subitem-35",
        itemId: FLOORING_ITEM_ID,
        baseName: "KCC 장판",
        thickness: "3.5T",
        source: reproducedRows[0],
      }),
    ];
    localRows[1] = { ...localRows[1], unit_price: 200000 };
    localRows[2] = { ...localRows[2], unit_price: 300000 };
    const insertedRows = [
      { ...localRows[2], id: "persisted-subitem-35" },
      { ...localRows[1], id: "persisted-subitem-27" },
    ];
    const reconciled = [
      localRows[0],
      ...reconcileInsertedSubitems(localRows.slice(1), insertedRows),
    ];

    expect([
      resolveActiveFlooringVariant(reconciled, "KCC 장판", "2.2T")?.unit_price,
      resolveActiveFlooringVariant(reconciled, "KCC 장판", "2.7T")?.unit_price,
      resolveActiveFlooringVariant(reconciled, "KCC 장판", "3.5T")?.unit_price,
    ]).toEqual([100000, 200000, 300000]);
    expect(resolveActiveFlooringVariant(reconciled, "KCC 장판", "3.5T")?.id).toBe("persisted-subitem-35");
  });
});

describe("canonical flooring dropdown contract", () => {
  const baseName = "KCC 장판";
  const persisted22 = {
    id: "persisted-22",
    item_id: FLOORING_ITEM_ID,
    name: "KCC 장판 2.2T",
    unit_price: 100000,
    labor_rate_empty: 100000,
    labor_rate_occupied: 100000,
  };
  const persisted27 = {
    id: "persisted-27",
    item_id: FLOORING_ITEM_ID,
    name: "KCC 장판 2.7T",
    unit_price: 200000,
    labor_rate_empty: 200000,
    labor_rate_occupied: 200000,
  };
  const persisted35 = {
    id: "persisted-35",
    item_id: FLOORING_ITEM_ID,
    name: "KCC 장판 3.5T",
    unit_price: 300000,
    labor_rate_empty: 300000,
    labor_rate_occupied: 300000,
  };
  const configuredOptions = ["2.2T", " 2.7t ", "3.5T"];

  it("collapses spec_options 2.2T and row thickness 2.2 into one option", () => {
    expect(buildUniqueFlooringOptions({
      subitems: [persisted22],
      baseName,
      specOptions: ["2.2T"],
    })).toEqual(["2.2"]);
  });

  it("shows one option when local and persisted rows share a canonical thickness", () => {
    const local22 = { ...persisted22, id: "local-subitem-22", name: "KCC 장판 2.2" };
    const rows = reconcileFlooringVariantRows([local22, persisted22]);

    expect(buildUniqueFlooringOptions({ subitems: rows, baseName })).toEqual(["2.2"]);
  });

  it("prefers a persisted row over a local duplicate", () => {
    const local22 = { ...persisted22, id: "local-subitem-22", unit_price: "" };

    expect(reconcileFlooringVariantRows([local22, persisted22])).toEqual([persisted22]);
    expect(reconcileFlooringVariantRows([persisted22, local22])).toEqual([persisted22]);
  });

  it("does not increase the option count after 2.2T is saved", () => {
    const before = buildUniqueFlooringOptions({
      subitems: [],
      baseName,
      specOptions: configuredOptions,
    });
    const after = buildUniqueFlooringOptions({
      subitems: [persisted22],
      baseName,
      specOptions: configuredOptions,
    });

    expect(before).toHaveLength(3);
    expect(after).toHaveLength(3);
  });

  it("keeps 2.2T and 2.7T once each after both are saved", () => {
    expect(buildUniqueFlooringOptions({
      subitems: [persisted22, persisted27],
      baseName,
      specOptions: configuredOptions,
    })).toEqual(["2.2", "2.7", "3.5"]);
  });

  it("remains duplicate-free after repeated reconcile cycles", () => {
    const local27 = { ...persisted27, id: "local-subitem-27" };
    let rows = reconcileFlooringVariantRows([persisted22, local27]);
    rows = reconcileFlooringVariantRows([
      ...rows,
      ...reconcileInsertedSubitems([local27], [persisted27]),
    ]);
    rows = reconcileFlooringVariantRows(rows);

    expect(buildUniqueFlooringOptions({
      subitems: rows,
      baseName,
      specOptions: configuredOptions,
    })).toEqual(["2.2", "2.7", "3.5"]);
  });

  it("is duplicate-free when requery row order changes", () => {
    expect(buildUniqueFlooringOptions({
      subitems: [persisted35, persisted22, persisted27],
      baseName,
      specOptions: [...configuredOptions].reverse(),
    })).toEqual(["3.5", "2.2", "2.7"]);
  });

  it("does not mix equal KCC and LG thicknesses", () => {
    const lg22 = {
      ...persisted22,
      id: "lg-persisted-22",
      name: "LG 장판 2.2T",
    };

    expect(buildUniqueFlooringOptions({
      subitems: [lg22, persisted22],
      baseName: "KCC 장판",
      specOptions: ["2.2T"],
    })).toEqual(["2.2"]);
    expect(buildUniqueFlooringOptions({
      subitems: [persisted22, lg22],
      baseName: "LG 장판",
      specOptions: ["2.2"],
    })).toEqual(["2.2"]);
  });

  it("returns no active variant when the selection value is empty", () => {
    const defaultRow = {
      ...persisted22,
      id: "persisted-default",
      name: "KCC 장판",
    };
    expect(resolveActiveFlooringVariant([defaultRow, persisted22], baseName, "")).toBeNull();
  });

  it("returns a disabled display model when no option is selected", () => {
    expect(getFlooringVariantDisplayValues(null)).toEqual({
      disabled: true,
      unit_price: "",
      labor_rate_empty: "",
      labor_rate_occupied: "",
    });
  });

  it("does not patch adminItems when no active variant is selected", () => {
    const items = [{ id: FLOORING_ITEM_ID, subitems: [persisted22] }];
    const next = patchSubitemPriceById(items, undefined, { unit_price: 999999 });

    expect(next).toBe(items);
    expect(next[0].subitems[0].unit_price).toBe(100000);
  });

  it("does not create a save operation for an empty selection", () => {
    expect(buildSubitemSaveOperation(null)).toBeNull();
  });

  it("enables the display model only after a thickness is selected", () => {
    expect(getFlooringVariantDisplayValues(null).disabled).toBe(true);
    expect(
      getFlooringVariantDisplayValues(
        resolveActiveFlooringVariant([persisted22], baseName, "2.2T")
      ).disabled
    ).toBe(false);
  });

  it("keeps a saved value when selection moves to 2.2T and back to empty", () => {
    const rows = [persisted22];
    expect(resolveActiveFlooringVariant(rows, baseName, "")).toBeNull();
    expect(resolveActiveFlooringVariant(rows, baseName, "2.2T")?.unit_price).toBe(100000);
    expect(resolveActiveFlooringVariant(rows, baseName, "")).toBeNull();
    expect(rows[0].unit_price).toBe(100000);
  });

  it("keeps three unique options and independent values after save", () => {
    const rows = reconcileFlooringVariantRows([
      persisted22,
      persisted27,
      persisted35,
      { ...persisted27, id: "local-subitem-27" },
    ]);
    const options = buildUniqueFlooringOptions({
      subitems: rows,
      baseName,
      specOptions: configuredOptions,
    });

    expect(options).toEqual(["2.2", "2.7", "3.5"]);
    expect(options.map((option) =>
      resolveActiveFlooringVariant(rows, baseName, option)?.unit_price
    )).toEqual([100000, 200000, 300000]);
    expect(normalizeFlooringOptionKey(" 2.2t ")).toBe("2.2");
  });
});
