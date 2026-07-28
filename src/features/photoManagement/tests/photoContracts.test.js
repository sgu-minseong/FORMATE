import { describe, expect, it } from "vitest";
import {
  MAX_PHOTO_UPLOAD_BYTES,
  PHOTO_STORAGE_BUCKET,
  PHOTO_TYPES,
  buildPhotoInsertPayload,
  buildPhotoStoragePath,
  getPrimaryPhoto,
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
});
