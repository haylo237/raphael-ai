"use client";

import { useEffect, useState } from "react";
import { listEmergencies, getPulseHealth } from "../../../lib/api";

export default function PulseMonitorPage() {
  const [emergencies, setEmergencies] = useState([]);
  const [pulseOk, setPulseOk] = useState(null);

  const load = async () => {
    try {
      const r = await listEmergencies();
      setEmergencies(r?.data || []);
    } catch {
      setEmergencies([]);
    }
    getPulseHealth().then(() => setPulseOk(true)).catch(() => setPulseOk(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const decisions = emergencies
    .map((e) => ({ id: e.id, patient: e.patient_name, decision: e.decision }))
    .filter((d) => d.decision);

  const qodActive = decisions.filter((d) => d.decision.request_qod).length;
  const modes = decisions.reduce((acc, d) => {
    const m = d.decision.decision?.mode || d.decision.mode || "—";
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">📡 Raphael Pulse Monitoring</h1>
      <p className="text-gray-500 text-sm mb-6">
        Aggregate view of CAMARA network operations driving emergency response.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Pulse engine</p>
          <p className={`text-2xl font-bold ${pulseOk === null ? "text-gray-400" : pulseOk ? "text-green-600" : "text-red-600"}`}>
            {pulseOk === null ? "…" : pulseOk ? "Healthy" : "Offline"}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">QoD sessions active</p>
          <p className="text-2xl font-bold text-red-600">{qodActive}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Active decisions</p>
          <p className="text-2xl font-bold text-blue-600">{decisions.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Tracked emergencies</p>
          <p className="text-2xl font-bold text-purple-600">{emergencies.length}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <p className="font-semibold mb-3">Communication mode distribution</p>
          {Object.keys(modes).length === 0 ? (
            <p className="text-sm text-gray-400">No active decisions.</p>
          ) : (
            <ul className="space-y-1">
              {Object.entries(modes).map(([m, c]) => (
                <li key={m} className="flex justify-between text-sm">
                  <span className="font-mono">{m}</span>
                  <span className="font-bold">{c}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <p className="font-semibold mb-3">Recent Pulse decisions</p>
          {decisions.length === 0 ? (
            <p className="text-sm text-gray-400">No decisions yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {decisions.slice(-6).reverse().map((d) => {
                const dec = d.decision.decision || d.decision || {};
                return (
                  <li key={d.id} className="py-2 text-sm flex items-center justify-between">
                    <div>
                      <p className="font-medium">{d.patient || "—"}</p>
                      <p className="text-xs font-mono text-gray-500">{d.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs">
                        <span className="font-bold">{dec.priority || "—"}</span> · {dec.mode || "—"}
                      </p>
                      {d.decision.request_qod ? (
                        <p className="text-xs text-red-600 font-semibold">QoD active</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({ children }) {
  return <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">{children}</div>;
}
