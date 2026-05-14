"use client";

import { useEffect, useState } from "react";
import { getGatewayHealth, getPulseHealth } from "../../lib/api";

function Badge({ ok, label }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <span
        className={`inline-block w-3 h-3 rounded-full ${
          ok === null ? "bg-gray-300" : ok ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className={`text-xs mt-0.5 ${ok === null ? "text-gray-400" : ok ? "text-green-600" : "text-red-600"}`}>
          {ok === null ? "checking…" : ok ? "healthy" : "unreachable"}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [gateway, setGateway] = useState(null);
  const [pulse, setPulse] = useState(null);

  useEffect(() => {
    getGatewayHealth().then(() => setGateway(true)).catch(() => setGateway(false));
    getPulseHealth().then(() => setPulse(true)).catch(() => setPulse(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Hospital Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">
        Clinical workflow first. Raphael Pulse intelligence is embedded in patient and emergency views.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-xl">
        <Badge ok={gateway} label="Laravel Gateway :8000" />
        <Badge ok={pulse} label="Pulse Engine :8001" />
      </div>

      <div className="mt-10">
        <h2 className="font-semibold text-gray-700 mb-3">Operational Workflows</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            ["Patients", "/patients", "Open complete patient profiles, history, vitals, and Pulse context."],
            ["Consultations", "/consultations", "Track active consultations and communication readiness."],
            ["Emergency Cases", "/emergency/feed", "Coordinate active emergencies with embedded Pulse insights."],
            ["Admissions & Queue", "/hospital/queue", "Manage triage queue and doctor assignment."],
            ["Doctors & Staff", "/staff", "Review available staff and operational roles."],
            ["Reports", "/reports", "Operational summaries and emergency load visibility."],
          ].map(([title, href, desc]) => (
            <a
              key={href}
              href={href}
              className="block bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-blue-400 hover:shadow transition-all"
            >
              <p className="font-medium text-sm text-blue-700">{title}</p>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
