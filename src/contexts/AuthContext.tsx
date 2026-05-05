"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { User } from "@/types";
import * as api from "@/lib/api";
import { clearKeyMaterial } from "@/lib/db";

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  setUser: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Track refresh token in a ref — we only need it for logout
  const refreshTokenRef = useRef<string | null>(null);

  // On mount, try to restore session via refresh token in httpOnly cookie
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (res.ok) {
          const { access_token } = await res.json() as { access_token: string };
          api.setAccessToken(access_token);
          const me = await api.getMe();
          setUserState(me);
        }
      } catch {
        // No valid session — stay logged out
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setUser = useCallback(
    async (user: User, accessToken: string, refreshToken: string) => {
      api.setAccessToken(accessToken);
      refreshTokenRef.current = refreshToken;
      // Persist refresh token as httpOnly cookie via our route handler
      await fetch("/api/auth/set-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      setUserState(user);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      if (refreshTokenRef.current) {
        await api.logout(refreshTokenRef.current).catch(() => {});
      }
    } finally {
      api.clearAccessToken();
      refreshTokenRef.current = null;
      await fetch("/api/auth/clear-cookie", { method: "POST" });
      await clearKeyMaterial();
      setUserState(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
