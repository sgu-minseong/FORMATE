import { isSupabaseConfigured } from "../../lib/supabaseClient";

export function assertCustomerOperationsQuery(companyId) {
  if (!isSupabaseConfigured) {
    throw new Error(".env에 Supabase 환경 변수를 설정해야 고객 운영 데이터를 불러올 수 있습니다.");
  }
  if (!companyId) {
    throw new Error("로그인된 업체 정보를 확인할 수 없습니다.");
  }
}

export function unwrap(result) {
  if (result.error) throw result.error;
  return result.data ?? [];
}

export function unwrapSingle(result) {
  if (result.error) throw result.error;
  return result.data ?? null;
}
