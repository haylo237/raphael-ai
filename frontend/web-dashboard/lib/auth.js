"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import * as api from "./api";
import { getHomeRouteForRole } from "./roleExperience";

const AuthContext = createContext(null);

const PUBLIC_ROUTES = new Set(["/login"]);

function withTimeout(promise, ms = 8000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error("Request timed out")), ms);
    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    if (!api.getAuthToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user } = await withTimeout(api.fetchMe(), 8000);
      setUser(user);
    } catch {
      api.setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    if (!user && !PUBLIC_ROUTES.has(pathname)) {
      router.replace("/login");
    }
  }, [user, loading, pathname, router]);

  const login = useCallback(async (creds) => {
    setError(null);
    try {
      const res = await api.login(creds);
      api.setAuthToken(res.token);
      setUser(res.user);
      router.replace(getHomeRouteForRole(res.user?.role));
      return res;
    } catch (e) {
      setError(e.message || "Login failed");
      throw e;
    }
  }, [router]);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch {}
    api.setAuthToken(null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
