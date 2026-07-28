import { useEffect, useState } from "react";
import {
  clearAdminVerifiedCompany,
  clearStoredCompany,
  isAuthBackendConfigured,
  loginWithCompanyCode,
  restoreAuthSession,
  signOutAppSession,
} from "./authApi";

export function useAppSession() {
  const [companySession, setCompanySession] = useState({
    company: null,
    checking: isAuthBackendConfigured,
  });
  const [authUser, setAuthUser] = useState(null);
  const [loginCode, setLoginCode] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [authScreenMode, setAuthScreenMode] = useState("landing");
  const [adminVerifyOpen, setAdminVerifyOpen] = useState(false);
  const [adminVerifyPassword, setAdminVerifyPassword] = useState("");
  const [adminVerifyLoading, setAdminVerifyLoading] = useState(false);
  const [adminVerifyError, setAdminVerifyError] = useState("");

  useEffect(() => {
    let active = true;
    restoreAuthSession()
      .then((session) => {
        if (!active) return;
        setAuthUser(session?.user ?? null);
        setCompanySession({ company: session?.company ?? null, checking: false });
        if (!session) {
          clearStoredCompany();
          if (!isAuthBackendConfigured) setLoginError("로그인 정보를 다시 확인해주세요.");
        }
      })
      .catch(async () => {
        try {
          await signOutAppSession();
        } catch {
          clearStoredCompany();
          clearAdminVerifiedCompany();
        }
        if (!active) return;
        setAuthUser(null);
        setLoginError("로그인 정보를 다시 확인해주세요.");
        setCompanySession({ company: null, checking: false });
      });
    return () => {
      active = false;
    };
  }, []);

  async function login(companyCode, password) {
    setLoginLoading(true);
    setLoginError("");
    try {
      const session = await loginWithCompanyCode({ companyCode, password });
      setAuthUser(session.user);
      setCompanySession({ company: session.company, checking: false });
      setLoginCode("");
      setLoginPassword("");
      return session;
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    try {
      await signOutAppSession();
    } finally {
      setAuthUser(null);
      setCompanySession({ company: null, checking: false });
    }
  }

  return {
    companySession, setCompanySession,
    authUser, setAuthUser,
    loginCode, setLoginCode,
    loginPassword, setLoginPassword,
    loginLoading, setLoginLoading,
    loginError, setLoginError,
    authScreenMode, setAuthScreenMode,
    adminVerifyOpen, setAdminVerifyOpen,
    adminVerifyPassword, setAdminVerifyPassword,
    adminVerifyLoading, setAdminVerifyLoading,
    adminVerifyError, setAdminVerifyError,
    login,
    logout,
  };
}
