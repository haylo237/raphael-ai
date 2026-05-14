"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "../lib/auth";

export default function Shell({ children }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

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
    // AuthProvider will redirect; render nothing meanwhile.
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-h-screen ml-60">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
          <span className="text-xl font-bold text-blue-700">Raphael AI</span>
          <span className="text-gray-400 text-sm">Clinical Operations Dashboard</span>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-gray-600">
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
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
