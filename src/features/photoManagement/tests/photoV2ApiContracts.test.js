import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  calls: [],
  rows: {},
  resultQueues: {},
  signedUrlCalls: [],
  storageUploads: [],
  storageRemovals: [],
  storageUploadResult: { data: {}, error: null },
  storageRemoveResult: { data: {}, error: null },
}));

function createQuery(table) {
  const query = {
    select(value = "*") {
      mockState.calls.push({ table, method: "select", value });
      return query;
    },
    insert(value) {
      mockState.calls.push({ table, method: "insert", value });
      return query;
    },
    single() {
      mockState.calls.push({ table, method: "single" });
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
        upload: async (path, file, options) => {
          mockState.storageUploads.push({ path, file, options });
          return mockState.storageUploadResult;
        },
        remove: async (paths) => {
          mockState.storageRemovals.push(paths);
          return mockState.storageRemoveResult;
        },
        createSignedUrls: async (paths) => {
          mockState.signedUrlCalls.push(paths);
          return { data: paths.map((path) => ({ path, signedUrl: `signed:${path}` })), error: null };
        },
      }),
    },
  },
}));

import {
  fetchPhotoCatalog,
  fetchPhotosForTarget,
  listPyeongPhotoRows,
  listPyeongPhotos,
  listPyeongSubitemPhotos,
  listRecentPhotoLibraryPhotos,
  resolvePyeongPhotoUrls,
  uploadPyeongSubitemPhoto,
} from "../photoApi";
import { PHOTO_V2_ERROR_CODES } from "../photoModel";

describe("Photo v2 API contracts", () => {
  beforeEach(() => {
    mockState.calls = [];
    mockState.rows = {};
    mockState.resultQueues = {};
    mockState.signedUrlCalls = [];
    mockState.storageUploads = [];
    mockState.storageRemovals = [];
    mockState.storageUploadResult = { data: {}, error: null };
    mockState.storageRemoveResult = { data: {}, error: null };
  });

  it("registers pyeong photos as non-primary without changing the legacy payload default", async () => {
    mockState.rows.photos = {
      data: {
        id: "photo-24",
        company_id: "company",
        photo_type: "subitem",
        target_type: "subitem",
        target_id: "wallpaper",
        pyeong: 24,
        construction_subitem_id: "wallpaper",
        sash_catalog_entry_id: null,
        storage_path: "company/subitem/wallpaper/photo-24.jpg",
      },
      error: null,
    };

    await uploadPyeongSubitemPhoto({
      companyId: "company",
      photoId: "photo-24",
      file: { name: "photo.jpg", type: "image/jpeg", size: 1024 },
      pyeong: 24,
      constructionSubitemId: "wallpaper",
      existingCount: 0,
    });

    const insertCall = mockState.calls.find((call) => call.table === "photos" && call.method === "insert");
    expect(insertCall.value).toMatchObject({
      pyeong: 24,
      construction_subitem_id: "wallpaper",
      is_primary: false,
    });
    expect(mockState.storageRemovals).toEqual([]);
  });

  it("cleans up only the new Storage object when pyeong metadata insertion fails", async () => {
    mockState.rows.photos = {
      data: null,
      error: { code: "23505", constraint: "photos_one_primary_per_target_idx" },
    };

    await expect(uploadPyeongSubitemPhoto({
      companyId: "company",
      photoId: "failed-photo",
      file: { name: "failed.jpg", type: "image/jpeg", size: 1024 },
      pyeong: 34,
      constructionSubitemId: "wallpaper",
    })).rejects.toMatchObject({ code: PHOTO_V2_ERROR_CODES.METADATA_INSERT_FAILED });

    expect(mockState.storageRemovals).toEqual([["company/subitem/wallpaper/failed-photo.jpg"]]);
  });

  it("reports Storage upload failure separately and does not attempt a photo insert", async () => {
    mockState.storageUploadResult = { data: null, error: { message: "bucket rejected" } };

    await expect(uploadPyeongSubitemPhoto({
      companyId: "company",
      photoId: "storage-failed-photo",
      file: { name: "failed.jpg", type: "image/jpeg", size: 1024 },
      pyeong: 34,
      constructionSubitemId: "wallpaper",
    })).rejects.toMatchObject({ code: PHOTO_V2_ERROR_CODES.STORAGE_UPLOAD_FAILED });

    expect(mockState.calls.some((call) => call.table === "photos" && call.method === "insert")).toBe(false);
    expect(mockState.storageRemovals).toEqual([]);
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

  it("lists one pyeong workspace without archived or sash-specific photos", async () => {
    mockState.rows.photos = {
      data: [{
        id: "photo-34", company_id: "company", photo_type: "subitem", target_type: "subitem",
        target_id: "flooring", pyeong: 34, construction_subitem_id: "flooring",
        sash_catalog_entry_id: null, archived_at: null, sort_order: 0,
      }],
      error: null,
    };

    const photos = await listPyeongPhotos({ companyId: "company", pyeong: 34 });

    expect(photos).toHaveLength(1);
    expect(photos[0]).toMatchObject({ pyeong: 34, constructionSubitemId: "flooring" });
    expect(mockState.calls).toContainEqual({ table: "photos", method: "eq", column: "pyeong", value: 34 });
    expect(mockState.calls).toContainEqual({ table: "photos", method: "is", column: "sash_catalog_entry_id", value: null });
    expect(mockState.calls).toContainEqual({ table: "photos", method: "is", column: "archived_at", value: null });
  });

  it("makes photo rows ready before signed URL resolution and skips URL work for empty rows", async () => {
    mockState.rows.photos = {
      data: [{
        id: "photo-row", company_id: "company", photo_type: "subitem", target_type: "subitem",
        target_id: "flooring", pyeong: 24, construction_subitem_id: "flooring",
        sash_catalog_entry_id: null, archived_at: null, sort_order: 0, storage_path: "company/photo.jpg",
      }],
      error: null,
    };

    const rows = await listPyeongPhotoRows({ companyId: "company", pyeong: 24 });
    expect(rows[0]).toMatchObject({ pyeong: 24, signedUrl: "" });
    expect(mockState.signedUrlCalls).toEqual([]);

    const resolved = await resolvePyeongPhotoUrls(rows);
    expect(resolved[0]).toMatchObject({ pyeong: 24, signedUrl: "signed:company/photo.jpg" });
    expect(mockState.signedUrlCalls).toEqual([["company/photo.jpg"]]);

    await resolvePyeongPhotoUrls([]);
    expect(mockState.signedUrlCalls).toHaveLength(1);
  });

  it("loads the construction catalog without waiting for legacy photos or signed URLs", async () => {
    mockState.rows.construction_items = { data: [{ id: "item", company_id: "company", name: "철거", sort_order: 0 }], error: null };
    mockState.rows.construction_subitems = { data: [{
      id: "subitem", company_id: "company", item_id: "item", name: "전체 철거", sort_order: 0,
      variant_group_id: "group", variant_value: 1.8, variant_unit: "T",
    }], error: null };
    mockState.rows.construction_subitem_variant_groups = { data: [{
      id: "group", construction_item_id: "item", display_name: "KCC장판",
      variant_kind: "thickness", base_subitem_id: null, sort_order: 0, archived_at: null,
    }], error: null };

    const catalog = await fetchPhotoCatalog("company");

    expect(catalog[0]).toMatchObject({ id: "item", name: "철거" });
    expect(catalog[0].variantGroups).toEqual([expect.objectContaining({
      id: "group",
      constructionItemId: "item",
      displayName: "KCC장판",
    })]);
    expect(mockState.calls).toContainEqual({
      table: "construction_subitem_variant_groups",
      method: "in",
      column: "construction_item_id",
      value: ["item"],
    });
    expect(mockState.calls.some((call) => call.table === "photos")).toBe(false);
    expect(mockState.signedUrlCalls).toEqual([]);
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
