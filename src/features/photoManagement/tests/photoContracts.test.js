import { describe, expect, it } from "vitest";
import {
  MAX_PHOTO_UPLOAD_BYTES,
  PHOTO_STORAGE_BUCKET,
  PHOTO_TYPES,
  buildPhotoInsertPayload,
  buildPhotoPlacementUpdates,
  buildPhotoStoragePath,
  getPrimaryPhoto,
  reorderRowsById,
  sortPhotos,
  validatePhotoFile,
} from "../photoModel";

describe("photo management contracts", () => {
  it("keeps bucket and storage path", () => {
    expect(PHOTO_STORAGE_BUCKET).toBe("formate-photos");
    expect(buildPhotoStoragePath({
      companyId: "company", targetType: "subitem", targetId: "target",
      photoId: "photo", fileName: "sample.PNG",
    })).toBe("company/subitem/target/photo.png");
  });

  it("keeps upload metadata and subitem collection behavior", () => {
    expect(buildPhotoInsertPayload({
      companyId: "company", targetType: PHOTO_TYPES.SUBITEM, targetId: "target",
      photoId: "photo", storagePath: "path", file: { name: "a.jpg", type: "image/jpeg", size: 100 },
      existingCount: 0,
    })).toEqual({
      id: "photo", company_id: "company", photo_type: "subitem", collection_id: null,
      target_type: "subitem", target_id: "target", storage_bucket: "formate-photos",
      storage_path: "path", original_filename: "a.jpg", content_type: "image/jpeg",
      file_size: 100, is_primary: true, sort_order: 0,
    });
  });

  it("keeps validation, order, and primary fallback", () => {
    expect(validatePhotoFile()).toContain("선택");
    expect(validatePhotoFile({ type: "text/plain", size: 1 })).toContain("이미지");
    expect(validatePhotoFile({ type: "image/png", size: MAX_PHOTO_UPLOAD_BYTES + 1 })).toContain("10MB");
    const rows = [{ id: "b", sort_order: 1 }, { id: "a", sort_order: 0 }];
    expect(sortPhotos(rows).map((row) => row.id)).toEqual(["a", "b"]);
    expect(getPrimaryPhoto(rows).id).toBe("a");
  });

  it("reorders rows without creating or removing entries", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(reorderRowsById(rows, "c", "a").map((row) => row.id)).toEqual(["c", "a", "b"]);
    expect(rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
  });

  it("moves only the selected photo and keeps at most one primary per target", () => {
    const photos = [
      { id: "source-primary", target_type: "full_project", target_id: "source", photo_type: "full_project", collection_id: "source", is_primary: true, sort_order: 0 },
      { id: "source-next", target_type: "full_project", target_id: "source", photo_type: "full_project", collection_id: "source", is_primary: false, sort_order: 1 },
      { id: "destination-primary", target_type: "full_project", target_id: "destination", photo_type: "full_project", collection_id: "destination", is_primary: true, sort_order: 0 },
    ];
    const updates = buildPhotoPlacementUpdates({
      photos,
      photoId: "source-primary",
      targetType: "full_project",
      targetId: "destination",
      targetIndex: 1,
    });
    const sourceUpdates = updates.filter((row) => row.target_id === "source");
    const destinationUpdates = updates.filter((row) => row.target_id === "destination");

    expect(sourceUpdates).toHaveLength(1);
    expect(sourceUpdates[0]).toMatchObject({ id: "source-next", is_primary: true, sort_order: 0 });
    expect(destinationUpdates.map((row) => row.id)).toEqual(["destination-primary", "source-primary"]);
    expect(destinationUpdates.filter((row) => row.is_primary).map((row) => row.id)).toEqual(["destination-primary"]);
  });

  it("reorders photos inside one target without changing the target", () => {
    const photos = [
      { id: "a", target_type: "subitem", target_id: "wallpaper", is_primary: true, sort_order: 0 },
      { id: "b", target_type: "subitem", target_id: "wallpaper", is_primary: false, sort_order: 1 },
    ];
    const updates = buildPhotoPlacementUpdates({
      photos,
      photoId: "b",
      targetType: "subitem",
      targetId: "wallpaper",
      targetIndex: 0,
    });

    expect(updates.map((row) => row.id)).toEqual(["b", "a"]);
    expect(updates.every((row) => row.target_id === "wallpaper")).toBe(true);
    expect(updates.filter((row) => row.is_primary).map((row) => row.id)).toEqual(["a"]);
  });
});
