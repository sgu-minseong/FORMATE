import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCanonicalConstructionCatalog } from "../../constructionCatalog/constructionCatalogModel";
import {
  buildAdminTemplateValueAtomicWrites,
  buildAdminTemplateValueClonePayloads,
  normalizeAdminItems,
} from "../priceTableModel";
import {
  addRecentTemplateCondition,
  readTemplateConditionPreferences,
  writeLastSelectedTemplateCondition,
  writeTemplateConditionFavorites,
  writeTemplateConditionRecent,
} from "../templateConditionPreferences";

const appSource = readFileSync(new URL("../../../app/AdminApp.jsx", import.meta.url), "utf8");
const switcherSource = readFileSync(new URL("../TemplateConditionSwitcher.jsx", import.meta.url), "utf8");
const appStyles = readFileSync(new URL("../../../styles/appStyles.js", import.meta.url), "utf8");
const migrationSql = readFileSync(
  new URL("../../../../supabase/template_condition_occupied_personnel.sql", import.meta.url),
  "utf8"
);

const itemRows = [{ id: "item-a", name: "Item", item_type: "itemized", sort_order: 0 }];
const subitemRows = [{
  id: "subitem-a",
  item_id: "item-a",
  name: "Product",
  unit: "ea",
  unit_price: 1000,
  labor_rate_empty: 100,
  labor_rate_occupied: 200,
  sort_order: 0,
}];
const templateValues = [{
  id: "value-a",
  template_id: "template-a",
  item_id: "item-a",
  subitem_id: "subitem-a",
  quantity: 2,
  labor_count: 3,
  labor_count_occupied: 5,
  construction_days: 1,
}];

describe("template vacant and occupied personnel contracts", () => {
  it("keeps existing labor_count as vacant personnel while saving and cloning occupied personnel independently", () => {
    const items = normalizeAdminItems(
      itemRows,
      subitemRows,
      templateValues,
      buildCanonicalConstructionCatalog({ itemRows, subitemRows, variantGroupRows: [] })
    );
    const subitem = items[0].subitems[0];

    expect(subitem).toMatchObject({ labor_count: 3, labor_count_occupied: 5 });
    expect(buildAdminTemplateValueAtomicWrites({ items })).toEqual([{
      item_id: "item-a",
      subitem_ref: "subitem-a",
      quantity: 2,
      labor_count: 3,
      labor_count_occupied: 5,
      construction_days: 1,
    }]);
    expect(buildAdminTemplateValueClonePayloads({ templateId: "template-copy", values: templateValues }))
      .toMatchObject([{ labor_count: 3, labor_count_occupied: 5 }]);
  });

  it("keeps template identity and condition preferences independent from occupancy", () => {
    const keySource = appSource.slice(
      appSource.indexOf("function getTemplateConditionKey"),
      appSource.indexOf("function getAdminCatalogScopeKey")
    );
    expect(keySource).not.toContain("occupancy");

    const storage = new Map();
    const browserStorage = {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    };
    writeTemplateConditionFavorites(browserStorage, "company-a", ["template-a"]);
    writeTemplateConditionRecent(browserStorage, "company-a", addRecentTemplateCondition([], "template-a"));
    writeLastSelectedTemplateCondition(browserStorage, "company-a", "template-a");
    expect(readTemplateConditionPreferences(browserStorage, "company-a")).toEqual({
      favorites: ["template-a"], recent: ["template-a"], lastSelectedId: "template-a",
    });
  });

  it("uses the fixed right Drawer without changing the template workspace grid", () => {
    expect(switcherSource).toContain("현재 조건");
    expect(switcherSource).toContain("조건 바꾸기");
    expect(switcherSource).toContain("조건 관리");
    expect(switcherSource).toContain("estimate-condition-drawer admin-template-condition-drawer");
    expect(appStyles).toMatch(/\.admin-template-condition-drawer\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0 0 0 auto;/);
    expect(switcherSource).not.toContain("template-condition-switcher__popover");
  });

  it("keeps the migration additive and preserves null occupied personnel", () => {
    expect(migrationSql).toContain("add column if not exists labor_count_occupied numeric;");
    expect(migrationSql).not.toMatch(/update\s+public\.admin_condition_template_values\s+set\s+labor_count_occupied/i);
    expect(migrationSql).toContain("'labor_count_occupied'");
    expect(migrationSql).toContain("save_admin_template_atomic");
  });
});
