import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { enterpriseApiClient, personalApiClient } from "@/lib/api";

type AuthUser = { user_id: number; email: string } | null;

type AuthContextType = {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  login: (email: string, password: string) => Promise<boolean>;
  register: (first_name: string, last_name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_KEY = "auth_access_token";
const REFRESH_KEY = "auth_refresh_token";
const USER_KEY = "auth_user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [refreshToken, setRefreshToken] = useState<string | undefined>();

  // Charger depuis localStorage
  useEffect(() => {
    const a = localStorage.getItem(ACCESS_KEY) || undefined;
    const r = localStorage.getItem(REFRESH_KEY) || undefined;
    const u = localStorage.getItem(USER_KEY);
    setAccessToken(a);
    setRefreshToken(r);
    setUser(u ? JSON.parse(u) : null);
  }, []);

  // Appliquer le token aux clients API
  useEffect(() => {
    enterpriseApiClient.setAuthToken(accessToken);
    personalApiClient.setAuthToken(accessToken);
    enterpriseApiClient.setRefreshToken(refreshToken);
    personalApiClient.setRefreshToken(refreshToken);
  }, [accessToken, refreshToken]);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(undefined);
    setRefreshToken(undefined);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // Callback pour mettre à jour le token après refresh
  const handleTokenRefresh = useCallback((newToken: string) => {
    if (newToken) {
      setAccessToken(newToken);
      localStorage.setItem(ACCESS_KEY, newToken);
    } else {
      // Refresh échoué, déconnecter
      logout();
    }
  }, [logout]);

  // Configurer les callbacks de refresh
  useEffect(() => {
    enterpriseApiClient.setOnTokenRefresh(handleTokenRefresh);
    personalApiClient.setOnTokenRefresh(handleTokenRefresh);
  }, [handleTokenRefresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await enterpriseApiClient.login({ email, password });
    if (!res.ok) return false;
    setAccessToken(res.data.access_token);
    setRefreshToken(res.data.refresh_token);
    localStorage.setItem(ACCESS_KEY, res.data.access_token);
    localStorage.setItem(REFRESH_KEY, res.data.refresh_token);
    setUser({ user_id: 0, email });
    localStorage.setItem(USER_KEY, JSON.stringify({ user_id: 0, email }));
    return true;
  }, []);

  const register = useCallback(async (first_name: string, last_name: string, email: string, password: string) => {
    const res = await enterpriseApiClient.register({ first_name, last_name, email, password });
    if (!res.ok) return false;
    setAccessToken(res.data.access_token);
    setRefreshToken(res.data.refresh_token);
    localStorage.setItem(ACCESS_KEY, res.data.access_token);
    localStorage.setItem(REFRESH_KEY, res.data.refresh_token);
    setUser({ user_id: res.data.user_id, email: res.data.email });
    localStorage.setItem(USER_KEY, JSON.stringify({ user_id: res.data.user_id, email: res.data.email }));
    return true;
  }, []);

  const value = useMemo(() => ({ user, accessToken, refreshToken, login, register, logout }), [user, accessToken, refreshToken, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};


