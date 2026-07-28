import { describe, expect, it } from "vitest";
import {
  ADMIN_VERIFIED_STORAGE_KEY,
  COMPANY_STORAGE_KEYS,
  companyCodeToAuthEmail,
  isValidUuid,
  normalizeCompanySession,
} from "../authApi";

describe("app auth and session contracts", () => {
  it("keeps company code internal email encoding stable", () => {
    expect(companyCodeToAuthEmail(" FORMATE-서울 ")).toBe(
      "company-rk9stufurs3shjzsmrg@formate.local"
    );
  });

  it("keeps company and admin verification storage keys", () => {
    expect(COMPANY_STORAGE_KEYS).toEqual({
      id: "formate.selectedCompanyId",
      name: "formate.selectedCompanyName",
      code: "formate.selectedCompanyCode",
    });
    expect(ADMIN_VERIFIED_STORAGE_KEY).toBe("formate.adminVerifiedCompanyId");
  });

  it("normalizes company membership and validates UUID scope", () => {
    expect(normalizeCompanySession({
      id: " company-id ",
      name: " 업체 ",
      company_code: " CODE ",
    })).toEqual({
      id: "company-id",
      name: "업체",
      company_code: "CODE",
      code: "CODE",
    });
    expect(isValidUuid("00000000-0000-4000-8000-000000000000")).toBe(true);
    expect(isValidUuid("demo-company")).toBe(false);
  });
});
