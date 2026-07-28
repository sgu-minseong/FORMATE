import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

export const isAuthBackendConfigured = isSupabaseConfigured;
export const COMPANY_STORAGE_KEYS = {
  id: "formate.selectedCompanyId",
  name: "formate.selectedCompanyName",
  code: "formate.selectedCompanyCode",
};
export const ADMIN_VERIFIED_STORAGE_KEY = "formate.adminVerifiedCompanyId";
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value) {
  return UUID_PATTERN.test(`${value ?? ""}`.trim());
}

export function normalizeCompanySession(company) {
  const code = `${company?.company_code ?? company?.code ?? ""}`.trim();
  return {
    id: `${company?.id ?? ""}`.trim(),
    name: `${company?.name ?? ""}`.trim(),
    company_code: code,
    code,
  };
}

export function normalizeCompanyCode(code) {
  return `${code ?? ""}`.trim();
}

function bytesToBase64Url(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.slice(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return globalThis.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function companyCodeToAuthEmail(companyCode) {
  const normalizedCode = normalizeCompanyCode(companyCode);
  if (!normalizedCode) return "";
  const bytes = new TextEncoder().encode(normalizedCode);
  return `company-${bytesToBase64Url(bytes)}@formate.local`.toLowerCase();
}

export function readStoredCompany() {
  if (typeof window === "undefined") return null;
  const id = window.localStorage.getItem(COMPANY_STORAGE_KEYS.id);
  const name = window.localStorage.getItem(COMPANY_STORAGE_KEYS.name);
  const code = window.localStorage.getItem(COMPANY_STORAGE_KEYS.code);
  const lookupCode = (!isValidUuid(id) && id) ? id : code;
  if (!id && !lookupCode) return null;
  return normalizeCompanySession({
    id: id ?? "",
    name: name ?? "",
    company_code: lookupCode ?? "",
  });
}

export function writeStoredCompany(company) {
  if (typeof window === "undefined") return;
  const normalized = normalizeCompanySession(company);
  window.localStorage.setItem(COMPANY_STORAGE_KEYS.id, normalized.id);
  window.localStorage.setItem(COMPANY_STORAGE_KEYS.name, normalized.name);
  window.localStorage.setItem(COMPANY_STORAGE_KEYS.code, normalized.company_code);
}

export function clearStoredCompany() {
  if (typeof window === "undefined") return;
  Object.values(COMPANY_STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
}

export function isAdminVerifiedForCompany(companyId) {
  if (typeof window === "undefined" || !companyId) return false;
  return window.sessionStorage.getItem(ADMIN_VERIFIED_STORAGE_KEY) === companyId;
}

export function writeAdminVerifiedCompany(companyId) {
  if (typeof window === "undefined" || !companyId) return;
  window.sessionStorage.setItem(ADMIN_VERIFIED_STORAGE_KEY, companyId);
}

export function clearAdminVerifiedCompany() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ADMIN_VERIFIED_STORAGE_KEY);
}

export async function fetchCompanyForAuthUser(userId) {
  if (!isValidUuid(userId)) throw new Error("로그인 세션이 올바르지 않습니다.");
  const { data: membership, error: membershipError } = await supabase
    .from("company_members")
    .select("company_id, user_id, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership?.company_id || !isValidUuid(membership.company_id)) {
    throw new Error("로그인된 계정에 연결된 업체가 없습니다.");
  }
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, company_code")
    .eq("id", membership.company_id)
    .maybeSingle();
  if (companyError) throw companyError;
  if (!company?.id || !isValidUuid(company.id)) {
    throw new Error("업체 정보를 확인할 수 없습니다.");
  }
  return normalizeCompanySession(company);
}

export async function restoreAuthSession() {
  if (!isSupabaseConfigured) return null;
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  let user = sessionData?.session?.user ?? null;
  if (!user?.id) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    user = userData?.user ?? null;
  }
  if (!user?.id) return null;
  const company = await fetchCompanyForAuthUser(user.id);
  writeStoredCompany(company);
  return { user, company };
}

export async function loginWithCompanyCode({ companyCode, password }) {
  const email = companyCodeToAuthEmail(companyCode);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const user = data?.user ?? data?.session?.user ?? null;
  const company = await fetchCompanyForAuthUser(user?.id ?? "");
  clearAdminVerifiedCompany();
  writeStoredCompany(company);
  return { user, company };
}

export async function signOutAppSession() {
  try {
    if (isSupabaseConfigured) await supabase.auth.signOut();
  } finally {
    clearStoredCompany();
    clearAdminVerifiedCompany();
  }
}

export async function reauthenticateCompany({ company, password }) {
  const email = companyCodeToAuthEmail(company?.company_code ?? company?.code ?? "");
  if (!email) throw new Error("업체 정보를 다시 확인해주세요.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return true;
}

export async function getCurrentAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.access_token ?? "";
}
