"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listEmergencies,
  listPatients,
  listQueue,
  listConsultations,
} from "../../../lib/api";

function Stat({ label, value, tone = "blue", href }) {
  const toneMap = {
    blue: "border-blue-200 text-blue-700",
    green: "border-green-200 text-green-700",
    amber: "border-amber-200 text-amber-700",
    red: "border-red-200 text-red-700",
  };
  const Wrap = href ? Link : "div";
  return (
    <Wrap
      href={href || undefined}
      className={`block bg-white rounded-lg border ${toneMap[tone]} p-5 shadow-sm hover:shadow transition-shadow`}
    >
      <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${toneMap[tone].split(" ")[1]}`}>{value}</p>
    </Wrap>
  );
}

export default function HospitalOverviewPage() {
  const [counts, setCounts] = useState({ patients: 0, queue: 0, emergencies: 0, consultations: 0 });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, q, e, c] = await Promise.all([
          listPatients().catch(() => ({ data: [] })),
          listQueue().catch(() => ({ data: [] })),
          listEmergencies().catch(() => ({ data: [] })),
          listConsultations().catch(() => ({ data: [] })),
        ]);
        const patients = p?.data || [];
        const queue = q?.data || [];
        const emergencies = e?.data || [];
        const consultations = c?.data || [];
        const today = new Date().toDateString();
        const patientsToday = patients.filter((x) =>
          x.created_at ? new Date(x.created_at).toDateString() === today : false
        );
        setCounts({
          patients: patientsToday.length || patients.length,
          queue: queue.length,
          emergencies: emergencies.filter((x) => x.status !== "resolved").length,
          consultations: consultations.length,
        });
        setRecent(patients.slice(-5).reverse());
      } catch {}
    };
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Hospital Operations</h1>
      <p className="text-gray-500 text-sm mb-6">Real-time view of activity across the facility</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Patients today" value={counts.patients} tone="blue" href="/patients" />
        <Stat label="In queue" value={counts.queue} tone="amber" href="/hospital/queue" />
        <Stat label="Active emergencies" value={counts.emergencies} tone="red" href="/emergency/feed" />
        <Stat label="Consultations" value={counts.consultations} tone="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold mb-3">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/hospital/walk-in" className="block text-center py-2 px-3 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              + Register walk-in
            </Link>
            <Link href="/hospital/queue" className="block text-center py-2 px-3 bg-amber-500 text-white rounded text-sm hover:bg-amber-600">
              Manage queue
            </Link>
            <Link href="/emergency/feed" className="block text-center py-2 px-3 bg-red-600 text-white rounded text-sm hover:bg-red-700">
              Emergency feed
            </Link>
            <Link href="/hospital/records" className="block text-center py-2 px-3 bg-slate-700 text-white rounded text-sm hover:bg-slate-800">
              Patient records
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold mb-3">Recently registered</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400">No patients yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map((p) => (
                <li key={p.id} className="py-2 text-sm flex justify-between">
                  <span className="font-medium">
                    {p.basic?.firstName} {p.basic?.lastName || ""}
                  </span>
                  <span className="font-mono text-xs text-gray-500">{p.id}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
