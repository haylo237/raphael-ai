"use client";

import { useEffect, useMemo, useState } from "react";
import { listPatients, listEmergencies, listQueue } from "../../lib/api";

export default function ReportsPage() {
  const [patients, setPatients] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [p, e, q] = await Promise.all([
        listPatients().catch(() => ({ data: [] })),
        listEmergencies().catch(() => ({ data: [] })),
        listQueue().catch(() => ({ data: [] })),
      ]);
      setPatients(p?.data || []);
      setEmergencies(e?.data || []);
      setQueue(q?.data || []);
    };

    load();
  }, []);

  const summary = useMemo(() => {
    const critical = emergencies.filter((e) => String(e.severity || "").toLowerCase() === "critical").length;
    const openEmergencies = emergencies.filter((e) => String(e.status || "").toLowerCase() !== "resolved").length;
    const queuedHighRisk = queue.filter((q) => ["urgent", "emergency"].includes(String(q.priority || "").toLowerCase())).length;

    return {
      totalPatients: patients.length,
      openEmergencies,
      critical,
      queuedHighRisk,
    };
  }, [patients, emergencies, queue]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Reports</h1>
      <p className="text-gray-500 text-sm mb-6">Operational visibility for shifts, emergency burden, and care capacity.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Patients" value={summary.totalPatients} tone="blue" />
        <Kpi label="Open emergencies" value={summary.openEmergencies} tone="red" />
        <Kpi label="Critical cases" value={summary.critical} tone="amber" />
        <Kpi label="High-risk queue" value={summary.queuedHighRisk} tone="green" />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-2">Shift Notes</h2>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>Keep emergency case panel open for active decision updates.</li>
          <li>Prioritize queue entries with urgent or emergency priority.</li>
          <li>Use patient Pulse Context tab when contact attempts fail.</li>
        </ul>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }) {
  const tones = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    red: "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    green: "bg-green-50 border-green-200 text-green-700",
  };
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
