"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavGroupsForRole } from "../lib/roleExperience";

export default function Sidebar({ user, mobileOpen, onNavigate }) {
  const pathname = usePathname();
  const navGroups = getNavGroupsForRole(user?.role);

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-60 bg-slate-800 text-slate-100 flex flex-col z-30 transform transition-transform md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="px-5 py-4 border-b border-slate-700">
        <span className="font-bold text-white text-lg">Raphael AI</span>
        <span className="block text-slate-400 text-xs mt-0.5">Hospital Operations</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="px-5 pt-2 pb-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              {group.label}
            </p>
            {group.items.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={`block px-5 py-2 text-sm transition-colors ${
                    active
                      ? "bg-blue-600 text-white font-medium"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="px-5 py-3 border-t border-slate-700 text-xs text-slate-500">
        Pulse context embedded in cases
      </div>
    </aside>
  );
}
