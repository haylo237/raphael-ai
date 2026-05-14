"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth";
import { listConsultations, listEmergencies } from "../../../lib/api";

const STATUS = ["all", "pending", "assigned", "accepted", "in_progress", "resolved"];

export default function DoctorCasesPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [cases, setCases] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [consultRes, emergencyRes] = await Promise.all([
        listConsultations().catch(() => ({ data: [] })),
        listEmergencies().catch(() => ({ data: [] })),
      ]);

      const consultationRows = (consultRes?.data || []).map((row) => ({
        id: row.id,
        kind: "Consultation",
        patient: row.patient_name || row.patient_id || "Patient",
        status: row.status || "pending",
        urgency: row.priority || "MEDIUM",
        updatedAt: row.updated_at || row.created_at,
      }));

      const emergencyRows = (emergencyRes?.data || []).map((row) => ({
        id: `EMG-${row.id}`,
        kind: "Emergency",
        patient: row.patient_name || row.patient?.first_name || "Patient",
        status: row.status || "pending",
        urgency: row.priority || row.severity || "HIGH",
        updatedAt: row.updated_at || row.created_at,
      }));

      const all = [...consultationRows, ...emergencyRows].sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      );
      setCases(all);
    };

    load();
    const t = setInterval(load, 9000);
    return () => clearInterval(t);
  }, []);

  const visible = useMemo(() => {
    if (filter === "all") return cases;
    return cases.filter((row) => String(row.status || "").toLowerCase() === filter);
  }, [filter, cases]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Assigned Cases Workspace</h1>
      <p className="text-gray-500 text-sm mb-5">
        Doctor-focused list with urgency, status, and fast jump to emergency context.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Status Filter</p>
        <div className="flex flex-wrap gap-2">
          {STATUS.map((item) => {
            const active = item === filter;
            return (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`px-3 py-1 rounded-full text-xs border ${
                  active ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-700 border-gray-200"
                }`}
              >
                {item.replaceAll("_", " ")}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Patient</th>
              <th className="px-4 py-3 text-left">Urgency</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Updated</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No cases in this state.
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{row.kind}</td>
                  <td className="px-4 py-3">{row.patient}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">{String(row.urgency || "-")}</span>
                  </td>
                  <td className="px-4 py-3 capitalize">{String(row.status || "-").replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 text-gray-500">{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3">
                    <Link href="/emergency/feed" className="text-blue-700 hover:underline text-xs">
                      Open Workspace
                    </Link>
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
