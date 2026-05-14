"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CORE_NAV_GROUPS = [
  {
    label: "Main",
    items: [{ href: "/dashboard", label: "Dashboard" }],
  },
  {
    label: "Clinical Operations",
    items: [
      { href: "/patients", label: "Patients" },
      { href: "/consultations", label: "Consultations" },
      { href: "/emergency/feed", label: "Emergency Cases" },
      { href: "/hospital/queue", label: "Admissions & Queue" },
      { href: "/staff", label: "Doctors & Staff" },
      { href: "/reports", label: "Reports" },
    ],
  },
  {
    label: "Emergency Coordination",
    items: [
      { href: "/emergency/feed", label: "Live Emergency Feed" },
      { href: "/emergency/pulse", label: "Pulse Insights" },
    ],
  },
];

const ADVANCED_NAV_GROUP = {
  label: "System & Network Tools",
  items: [
    { href: "/triage", label: "Case Triage" },
    { href: "/reachability", label: "Device Reachability" },
    { href: "/subscriptions", label: "Reachability Subscriptions" },
    { href: "/location", label: "Location Lookup" },
    { href: "/identity", label: "Identity & OTP" },
    { href: "/qod", label: "QoD Sessions" },
    { href: "/qos", label: "QoS Assignments" },
    { href: "/device-identifier", label: "Device Identifier" },
    { href: "/geofencing", label: "Geofencing" },
    { href: "/click-to-dial", label: "Click-to-Dial" },
  ],
};

function canViewAdvanced(user) {
  const role = String(user?.role || "").toLowerCase();
  return ["admin", "technical_admin", "ops_admin", "developer"].includes(role);
}

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const navGroups = canViewAdvanced(user)
    ? [...CORE_NAV_GROUPS, ADVANCED_NAV_GROUP]
    : CORE_NAV_GROUPS;

  return (
    <aside className="fixed top-0 left-0 h-full w-60 bg-slate-800 text-slate-100 flex flex-col z-10">
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
