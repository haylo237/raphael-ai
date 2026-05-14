"use client";

import { useEffect, useState } from "react";
import { listConsultations, listEmergencies } from "../../lib/api";

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState([]);

  useEffect(() => {
    const load = async () => {
      const direct = await listConsultations().catch(() => null);
      if (Array.isArray(direct?.data) && direct.data.length > 0) {
        setConsultations(direct.data);
        return;
      }

      const emergencies = await listEmergencies().catch(() => ({ data: [] }));
      const derived = (emergencies?.data || [])
        .filter((e) => ["pending", "in_progress", "in-progress"].includes(String(e.status || "")))
        .map((e) => ({
          id: `CONS-${e.id}`,
          patient_name: e.patient_name,
          doctor: e.assigned_doctor_id || "Unassigned",
          status: e.status,
          channel: "Emergency response",
          updated_at: e.updated_at || e.created_at,
        }));
      setConsultations(derived);
    };

    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Consultations</h1>
      <p className="text-gray-500 text-sm mb-6">Active clinical collaboration and assignment continuity.</p>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Consultation</th>
              <th className="px-4 py-3 text-left">Patient</th>
              <th className="px-4 py-3 text-left">Doctor</th>
              <th className="px-4 py-3 text-left">Channel</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {consultations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No active consultations.
                </td>
              </tr>
            ) : (
              consultations.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.id}</td>
                  <td className="px-4 py-3 font-medium">{row.patient_name || "—"}</td>
                  <td className="px-4 py-3">{row.doctor || row.assigned_doctor_id || "—"}</td>
                  <td className="px-4 py-3">{row.channel || "Clinical desk"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">{row.status || "active"}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
