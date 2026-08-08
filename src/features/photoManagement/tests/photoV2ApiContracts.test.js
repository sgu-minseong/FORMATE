import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  calls: [],
  rows: {},
  resultQueues: {},
}));

function createQuery(table) {
  const query = {
    select(value = "*") {
      mockState.calls.push({ table, method: "select", value });
      return query;
    },
    eq(column, value) {
      mockState.calls.push({ table, method: "eq", column, value });
      return query;
    },
    is(column, value) {
      mockState.calls.push({ table, method: "is", column, value });
      return query;
    },
    in(column, value) {
      mockState.calls.push({ table, method: "in", column, value });
      return query;
    },
    order(column, value) {
      mockState.calls.push({ table, method: "order", column, value });
      return query;
    },
    ilike(column, value) {
      mockState.calls.push({ table, method: "ilike", column, value });
      return query;
    },
    limit(value) {
      mockState.calls.push({ table, method: "limit", value });
      return query;
    },
    then(resolve, reject) {
      const queue = mockState.resultQueues[table];
      const result = queue?.length ? queue.shift() : (mockState.rows[table] ?? { data: [], error: null });
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return query;
}

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    from: (table) => createQuery(table),
    storage: {
      from: () => ({
        createSignedUrls: async () => ({ data: [], error: null }),
      }),
    },
  },
}));

import {
  fetchPhotosForTarget,
  listPyeongSubitemPhotos,
  listRecentPhotoLibraryPhotos,
} from "../photoApi";

describe("Photo v2 API contracts", () => {
  beforeEach(() => {
    mockState.calls = [];
    mockState.rows = {};
    mockState.resultQueues = {};
  });

  it("keeps 24-pyeong subitem photos isolated from other pyeong and sash scopes", async () => {
    mockState.rows.photos = {
      data: [{
        id: "photo-24", company_id: "company", photo_type: "subitem", target_type: "subitem",
        target_id: "flooring-18t", pyeong: 24, construction_subitem_id: "flooring-18t",
        sash_catalog_entry_id: null, archived_at: null, sort_order: 0,
      }],
      error: null,
    };

    const photos = await listPyeongSubitemPhotos({
      companyId: "company",
      pyeong: 24,
      constructionSubitemId: "flooring-18t",
    });

    expect(photos).toHaveLength(1);
    expect(photos[0]).toMatchObject({ pyeong: 24, constructionSubitemId: "flooring-18t" });
    expect(mockState.calls).toContainEqual({ table: "photos", method: "eq", column: "pyeong", value: 24 });
    expect(mockState.calls).toContainEqual({ table: "photos", method: "is", column: "sash_catalog_entry_id", value: null });
    expect(mockState.calls).toContainEqual({ table: "photos", method: "is", column: "archived_at", value: null });
  });

  it("keeps recent photos within active Folder subtrees only", async () => {
    mockState.rows.photo_library_folders = {
      data: [
        { id: "active", company_id: "company", parent_folder_id: null, archived_at: null, sort_order: 0 },
        { id: "hidden-parent", company_id: "company", parent_folder_id: null, archived_at: "2026-08-08", sort_order: 1 },
        { id: "hidden-child", company_id: "company", parent_folder_id: "hidden-parent", archived_at: null, sort_order: 0 },
      ],
      error: null,
    };
    mockState.rows.photos = {
      data: [{
        id: "recent", company_id: "company", photo_type: "photo_library", target_type: "photo_library",
        target_id: "active", photo_library_folder_id: "active", archived_at: null,
      }],
      error: null,
    };

    const photos = await listRecentPhotoLibraryPhotos({ companyId: "company", limit: 12 });

    expect(photos.map((photo) => photo.folderId)).toEqual(["active"]);
    expect(mockState.calls).toContainEqual({
      table: "photos", method: "in", column: "photo_library_folder_id", value: ["active"],
    });
    expect(mockState.calls).toContainEqual({ table: "photos", method: "limit", value: 12 });
  });

  it("does not change the legacy price-photo target query", async () => {
    mockState.rows.photos = {
      data: [{ id: "legacy", company_id: "company", target_type: "full_project", target_id: "price-1000" }],
      error: null,
    };

    await fetchPhotosForTarget({ companyId: "company", targetType: "full_project", targetId: "price-1000" });

    expect(mockState.calls).toContainEqual({ table: "photos", method: "eq", column: "target_type", value: "full_project" });
    expect(mockState.calls).toContainEqual({ table: "photos", method: "eq", column: "target_id", value: "price-1000" });
    expect(mockState.calls.some((call) => call.column === "pyeong" || call.column === "photo_library_folder_id")).toBe(false);
  });

  it("uses the same active Folder visibility rule for Library search", async () => {
    const allFolders = [
      { id: "active", company_id: "company", name: "거실", parent_folder_id: null, archived_at: null, sort_order: 0 },
      { id: "archived", company_id: "company", name: "거실 이전", parent_folder_id: null, archived_at: "2026-08-08", sort_order: 1 },
      { id: "hidden-child", company_id: "company", name: "거실 하위", parent_folder_id: "archived", archived_at: null, sort_order: 0 },
    ];
    mockState.resultQueues.photo_library_folders = [
      { data: allFolders, error: null },
      { data: [allFolders[0]], error: null },
    ];
    mockState.rows.photos = {
      data: [{
        id: "caption-match", company_id: "company", photo_type: "photo_library", target_type: "photo_library",
        target_id: "active", photo_library_folder_id: "active", caption: "거실 시공 완료", archived_at: null,
      }],
      error: null,
    };

    const { searchPhotoLibrary } = await import("../photoApi");
    const result = await searchPhotoLibrary({ companyId: "company", query: "거실" });

    expect(result.folders.map((folder) => folder.id)).toEqual(["active"]);
    expect(result.photos.map((photo) => photo.folderId)).toEqual(["active"]);
    const visibleFolderQueries = mockState.calls.filter((call) => (
      call.method === "in" && (call.column === "id" || call.column === "photo_library_folder_id")
    ));
    expect(visibleFolderQueries).toEqual(expect.arrayContaining([
      { table: "photo_library_folders", method: "in", column: "id", value: ["active"] },
      { table: "photos", method: "in", column: "photo_library_folder_id", value: ["active"] },
    ]));
  });
});
