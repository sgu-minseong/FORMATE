import { describe, expect, it } from "vitest";
import {
  MAX_PHOTO_UPLOAD_BYTES,
  PHOTO_STORAGE_BUCKET,
  PHOTO_TYPES,
  PHOTO_V2_ERROR_CODES,
  assertPhotoLibraryFolderMove,
  assertUniqueActiveSiblingFolderName,
  buildPhotoInsertPayload,
  buildPhotoLibraryScope,
  buildPyeongSubitemPhotoScope,
  buildPhotoStoragePath,
  getActiveLibraryFolderTree,
  getPyeongPhotoCounts,
  normalizePhotoCaption,
  normalizePhotoV2Error,
  normalizePhotoV2Photo,
  reorderRowsById,
  resolveVisibleFolderIds,
  validatePhotoFile,
} from "../photoModel";

describe("canonical photo management contracts", () => {
  it("keeps bucket, storage path, and upload metadata", () => {
    expect(PHOTO_STORAGE_BUCKET).toBe("formate-photos");
    expect(buildPhotoStoragePath({
      companyId: "company",
      targetType: PHOTO_TYPES.SUBITEM,
      targetId: "target",
      photoId: "photo",
      fileName: "sample.PNG",
    })).toBe("company/subitem/target/photo.png");
    expect(buildPhotoInsertPayload({
      companyId: "company",
      targetType: PHOTO_TYPES.SUBITEM,
      targetId: "target",
      photoId: "photo",
      storagePath: "path",
      file: { name: "a.jpg", type: "image/jpeg", size: 100 },
      existingCount: 0,
    })).toMatchObject({
      id: "photo",
      company_id: "company",
      target_type: PHOTO_TYPES.SUBITEM,
      target_id: "target",
      storage_bucket: PHOTO_STORAGE_BUCKET,
      storage_path: "path",
    });
  });

  it("validates files and reorders rows without changing identity", () => {
    expect(validatePhotoFile()).toContain("선택");
    expect(validatePhotoFile({ type: "text/plain", size: 1 })).toContain("이미지");
    expect(validatePhotoFile({ type: "image/png", size: MAX_PHOTO_UPLOAD_BYTES + 1 })).toContain("10MB");
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(reorderRowsById(rows, "c", "a").map((row) => row.id)).toEqual(["c", "a", "b"]);
    expect(rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps pyeong photos scoped by subitem UUID and optional sash UUID", () => {
    expect(buildPyeongSubitemPhotoScope({
      pyeong: 24,
      constructionSubitemId: "variant-18-id",
    })).toMatchObject({
      photo_type: PHOTO_TYPES.SUBITEM,
      target_type: PHOTO_TYPES.SUBITEM,
      target_id: "variant-18-id",
      pyeong: 24,
      construction_subitem_id: "variant-18-id",
      sash_catalog_entry_id: null,
      photo_library_folder_id: null,
    });
    expect(buildPyeongSubitemPhotoScope({
      pyeong: 34,
      constructionSubitemId: "sash-subitem-id",
      sashCatalogEntryId: "sash-spec-id",
    })).toMatchObject({
      pyeong: 34,
      construction_subitem_id: "sash-subitem-id",
      sash_catalog_entry_id: "sash-spec-id",
    });
  });

  it("normalizes the v2 row without losing primary presentation metadata", () => {
    expect(normalizePhotoV2Photo({
      id: "photo-id",
      construction_subitem_id: "variant-text-id",
      original_filename: "sample.jpg",
      is_primary: true,
    })).toMatchObject({
      id: "photo-id",
      constructionSubitemId: "variant-text-id",
      originalFilename: "sample.jpg",
      isPrimary: true,
    });
  });

  it("counts only active photos for known subitem UUIDs", () => {
    expect(getPyeongPhotoCounts([
      { id: "a", constructionSubitemId: "wall" },
      { id: "b", constructionSubitemId: "wall", archivedAt: "2026-08-08" },
      { id: "c", constructionSubitemId: "floor" },
      { id: "d", constructionSubitemId: "unknown" },
    ], [
      { id: "wall" },
      { id: "floor" },
      { id: "empty" },
    ])).toEqual({ wall: 1, floor: 1, empty: 0 });
  });

  it("keeps Library photos in the stable photo_library contract", () => {
    expect(buildPhotoLibraryScope("folder-a")).toEqual({
      photo_type: PHOTO_TYPES.LIBRARY,
      target_type: PHOTO_TYPES.LIBRARY,
      target_id: "folder-a",
      collection_id: null,
      pyeong: null,
      construction_subitem_id: null,
      sash_catalog_entry_id: null,
      photo_library_folder_id: "folder-a",
    });
  });

  it("hides archived Folder subtrees from active Library views", () => {
    const folders = [
      { id: "active", name: "활성", parent_folder_id: null, archived_at: null, sort_order: 0 },
      { id: "archived", name: "보관", parent_folder_id: null, archived_at: "2026-01-01", sort_order: 1 },
      { id: "hidden-child", name: "하위", parent_folder_id: "archived", archived_at: null, sort_order: 0 },
      { id: "active-child", name: "하위", parent_folder_id: "active", archived_at: null, sort_order: 0 },
    ];
    expect([...resolveVisibleFolderIds(folders)]).toEqual(["active", "active-child"]);
    expect(getActiveLibraryFolderTree(folders)).toMatchObject([{
      id: "active",
      children: [{ id: "active-child" }],
    }]);
  });

  it("normalizes caption and folder errors for shared Photo v2 handling", () => {
    expect(normalizePhotoCaption("  시공 완료  ")).toBe("시공 완료");
    expect(normalizePhotoCaption("  ")).toBeNull();
    expect(normalizePhotoV2Error({
      code: "23505",
      message: 'duplicate key value violates unique constraint "photo_library_folders_company_root_name_active_uidx"',
    }).code).toBe(PHOTO_V2_ERROR_CODES.DUPLICATE_FOLDER_NAME);
    expect(() => assertUniqueActiveSiblingFolderName({
      companyId: "company",
      parentFolderId: null,
      name: " photo ",
      folderRows: [{ id: "folder", company_id: "company", parent_folder_id: null, name: "Photo", archived_at: null }],
    })).toThrow("같은 위치");
  });

  it("rejects moves into self or a descendant", () => {
    const folderRows = [
      { id: "root", parent_folder_id: null, archived_at: null },
      { id: "child", parent_folder_id: "root", archived_at: null },
    ];
    expect(() => assertPhotoLibraryFolderMove({ folderId: "root", parentFolderId: "root", folderRows })).toThrow("자기 자신");
    expect(() => assertPhotoLibraryFolderMove({ folderId: "root", parentFolderId: "child", folderRows })).toThrow("하위 폴더");
  });
});
