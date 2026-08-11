import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { checkFormateDataIntegrity } from "./data-integrity/checker.mjs";

const PAGE_SIZE = 1000;
const PHOTO_BUCKET = "formate-photos";

function parseArgs(argv) {
  const options = { fixture: "", companyId: "", skipStorage: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--fixture") options.fixture = argv[++index] ?? "";
    else if (argument === "--company") options.companyId = argv[++index] ?? "";
    else if (argument === "--skip-storage") options.skipStorage = true;
    else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown option: ${argument}`);
  }
  return options;
}

function printHelp() {
  console.log(`FORMATE data integrity checker

Live DB (server-only key; never use a VITE_ variable for the service-role key):
  $env:FORMATE_INTEGRITY_SUPABASE_URL="https://...supabase.co"
  $env:FORMATE_INTEGRITY_SERVICE_ROLE_KEY="..."
  npm run check:data-integrity

Optional company scope:
  npm run check:data-integrity -- --company <company-uuid>

Skip Storage object enumeration:
  npm run check:data-integrity -- --company <company-uuid> --skip-storage

Offline fixture validation:
  npm run check:data-integrity -- --fixture scripts/fixtures/canonical-integrity.valid.json`);
}

function createHeaders(serviceRoleKey, extra = {}) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...extra,
  };
}

async function fetchTable({ url, serviceRoleKey, table }) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: createHeaders(serviceRoleKey, {
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        "Range-Unit": "items",
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to read ${table}: ${response.status} ${await response.text()}`);
    }
    const page = await response.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function listStorageObjects({ url, serviceRoleKey, prefix = "" }) {
  const objects = [];
  const directories = [prefix];
  const visited = new Set();
  while (directories.length) {
    const currentPrefix = directories.shift();
    if (visited.has(currentPrefix)) continue;
    visited.add(currentPrefix);
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const response = await fetch(`${url}/storage/v1/object/list/${PHOTO_BUCKET}`, {
        method: "POST",
        headers: createHeaders(serviceRoleKey, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          prefix: currentPrefix,
          limit: PAGE_SIZE,
          offset,
          sortBy: { column: "name", order: "asc" },
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to list ${PHOTO_BUCKET}: ${response.status} ${await response.text()}`);
      }
      const page = await response.json();
      for (const entry of page) {
        const path = currentPrefix ? `${currentPrefix}/${entry.name}` : entry.name;
        if (entry.id || entry.metadata) objects.push(path);
        else directories.push(path);
      }
      if (page.length < PAGE_SIZE) break;
    }
  }
  return objects;
}

async function loadLiveDataset(options) {
  const rawUrl = process.env.FORMATE_INTEGRITY_SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || "";
  const serviceRoleKey = process.env.FORMATE_INTEGRITY_SERVICE_ROLE_KEY || "";
  if (!rawUrl || !serviceRoleKey) {
    throw new Error(
      "Live check requires FORMATE_INTEGRITY_SUPABASE_URL and "
      + "FORMATE_INTEGRITY_SERVICE_ROLE_KEY. Use --fixture for an offline check."
    );
  }
  const url = rawUrl.replace(/\/$/, "");
  const tableNames = {
    constructionItems: "construction_items",
    constructionSubitems: "construction_subitems",
    variantGroups: "construction_subitem_variant_groups",
    templates: "admin_condition_templates",
    templateValues: "admin_condition_template_values",
    detailCosts: "detail_cost_categories",
    photos: "photos",
    photoCollections: "photo_collections",
    photoLibraryFolders: "photo_library_folders",
    sashCatalogEntries: "sash_catalog_entries",
    estimates: "estimates",
    priceConditions: "price_conditions",
  };
  const entries = await Promise.all(Object.entries(tableNames).map(async ([key, table]) => [
    key,
    await fetchTable({ url, serviceRoleKey, table }),
  ]));
  const dataset = Object.fromEntries(entries);
  if (!options.skipStorage) {
    dataset.storageObjects = await listStorageObjects({
      url,
      serviceRoleKey,
      prefix: options.companyId || process.env.FORMATE_INTEGRITY_COMPANY_ID || "",
    });
  }
  return dataset;
}

function printResult(result, source, companyId) {
  console.log(`FORMATE integrity source: ${source}`);
  if (companyId) console.log(`Company scope: ${companyId}`);
  console.log(`Checked rows: ${Object.entries(result.counts).map(([key, value]) => `${key}=${value}`).join(", ")}`);
  if (!result.issues.length) {
    console.log("Data integrity: PASS (0 issues)");
    return;
  }
  console.error(`Data integrity: FAIL (${result.issues.length} issues)`);
  for (const issue of result.issues) {
    console.error(
      `[${issue.severity.toUpperCase()}] ${issue.code} ${issue.entityType}:${issue.entityId ?? "-"} - ${issue.message}`
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const companyId = options.companyId || process.env.FORMATE_INTEGRITY_COMPANY_ID || "";
  const dataset = options.fixture
    ? JSON.parse(await readFile(resolve(options.fixture), "utf8"))
    : await loadLiveDataset({ ...options, companyId });
  const result = checkFormateDataIntegrity(dataset, { companyId });
  printResult(result, options.fixture ? `fixture:${options.fixture}` : "live Supabase", companyId);
  if (result.issues.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Data integrity checker failed: ${error.message}`);
  process.exitCode = 2;
});
