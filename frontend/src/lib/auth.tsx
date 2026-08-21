"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, clearTokens, setTokens } from "./api";
import { getErrorMessage } from "./api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  roles: string[];
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPerm: (perm: string) => boolean;
  hasAnyPerm: (perms: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_KEY = "alhamd_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post("/auth/login", { email, password });
      setTokens(data.accessToken, data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    clearTokens();
    localStorage.removeItem(USER_KEY);
    setUser(null);
    router.push("/login");
  }, [router]);

  const hasPerm = useCallback(
    (perm: string) => Boolean(user?.permissions?.includes(perm)),
    [user]
  );

  const hasAnyPerm = useCallback(
    (perms: string[]) => {
      if (!user?.permissions) return false;
      return perms.some((p) => user.permissions.includes(p));
    },
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, hasPerm, hasAnyPerm }),
    [user, loading, login, logout, hasPerm, hasAnyPerm]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { getErrorMessage };
