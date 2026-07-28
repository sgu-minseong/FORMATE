import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.resolve(process.cwd(), "src");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const sourceFiles = walk(SRC_ROOT).filter((file) => /\.(js|jsx)$/.test(file));
const read = (file) => fs.readFileSync(file, "utf8");
const relative = (file) => path.relative(SRC_ROOT, file).replaceAll("\\", "/");

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  return [
    base,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, "index.js"),
    path.join(base, "index.jsx"),
  ].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

describe("architecture feature boundaries", () => {
  it("keeps domain and model modules free of React, Supabase, and DOM access", () => {
    const domainFiles = sourceFiles.filter((file) => (
      /(?:Model|Contracts|calculation|snapshot)\.js$/.test(file)
      && !relative(file).includes("/tests/")
    ));
    const violations = domainFiles.flatMap((file) => {
      const source = read(file);
      return /from\s+["']react["']|supabaseClient|\bwindow\b|\bdocument\b/.test(source)
        ? [relative(file)]
        : [];
    });
    expect(violations).toEqual([]);
  });

  it("keeps Feature pages and components away from direct Supabase imports", () => {
    const uiFiles = sourceFiles.filter((file) => (
      relative(file).startsWith("features/")
      && /\.jsx$/.test(file)
    ));
    const violations = uiFiles
      .filter((file) => read(file).includes("supabaseClient"))
      .map(relative);
    expect(violations).toEqual([]);
  });

  it("keeps shared UI independent from Feature modules", () => {
    const sharedUi = sourceFiles.filter((file) => relative(file).startsWith("components/ui/"));
    const violations = sharedUi
      .filter((file) => /from\s+["'][^"']*features\//.test(read(file)))
      .map(relative);
    expect(violations).toEqual([]);
  });

  it("keeps App free of direct Feature DB and Storage access", () => {
    const source = read(path.join(SRC_ROOT, "App.jsx"));
    expect(source).not.toMatch(/supabase\.(?:from|rpc|storage)/);
    expect(source).not.toMatch(/import\s+\{[^}]*\bsupabase\b[^}]*\}\s+from/);
  });

  it("keeps relative source imports acyclic", () => {
    const graph = new Map(sourceFiles.map((file) => {
      const imports = [...read(file).matchAll(/from\s+["']([^"']+)["']/g)]
        .map((match) => resolveImport(file, match[1]))
        .filter(Boolean);
      return [file, imports];
    }));
    const visiting = new Set();
    const visited = new Set();
    const cycles = [];

    function visit(file, stack) {
      if (visiting.has(file)) {
        const index = stack.indexOf(file);
        cycles.push([...stack.slice(index), file].map(relative));
        return;
      }
      if (visited.has(file)) return;
      visiting.add(file);
      (graph.get(file) ?? []).forEach((dependency) => visit(dependency, [...stack, file]));
      visiting.delete(file);
      visited.add(file);
    }

    sourceFiles.forEach((file) => visit(file, []));
    expect(cycles).toEqual([]);
  });
});
