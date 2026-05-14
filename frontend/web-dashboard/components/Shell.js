"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "../lib/auth";
import {
  getHomeRouteForRole,
  getRoleTone,
  isRouteAllowedForRole,
  normalizeRole,
} from "../lib/roleExperience";

export default function Shell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = normalizeRole(user?.role);
  const roleTone = getRoleTone(role);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user || loading) return;
    if (!isRouteAllowedForRole(pathname, role)) {
      router.replace(getHomeRouteForRole(role));
    }
  }, [pathname, user, loading, role, router]);

  // Auth-less pages: render bare children
  if (pathname === "/login") {
    return <div className="min-h-screen flex items-center justify-center p-6">{children}</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading Raphael AI…
      </div>
    );
  }

  if (!user) {
    // AuthProvider will redirect to /login.
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Redirecting to login…
      </div>
    );
  }

  if (!isRouteAllowedForRole(pathname, role)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Preparing your workspace…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />

      {mobileOpen && (
        <button
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="flex-1 flex flex-col min-h-screen md:ml-60">
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 text-gray-600"
            aria-label="Open navigation"
          >
            ≡
          </button>
          <span className="text-xl font-bold text-blue-700">Raphael AI</span>
          <span className="text-gray-400 text-sm hidden sm:inline">{roleTone.title}</span>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-gray-600 hidden sm:inline">
              {user.name} <span className="text-gray-400">· {user.role}</span>
            </span>
            <button
              onClick={logout}
              className="px-3 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <div className="sm:hidden text-xs text-gray-500 mb-3">{roleTone.subtitle}</div>
          {children}
        </main>
      </div>
    </div>
  );
}
