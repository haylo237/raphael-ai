"use client";

import { useEffect, useState } from "react";
import { listEmergencies, getEmergency, updateEmergency } from "../../../lib/api";

function severityClass(s) {
  switch (String(s || "").toLowerCase()) {
    case "critical":
      return "bg-red-700 text-white";
    case "high":
      return "bg-red-100 text-red-700 border border-red-200";
    case "medium":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    default:
      return "bg-blue-100 text-blue-700 border border-blue-200";
  }
}
function statusClass(s) {
  switch (String(s || "").toLowerCase()) {
    case "pending":
      return "bg-red-100 text-red-700";
    case "in_progress":
    case "in-progress":
      return "bg-blue-100 text-blue-700";
    case "resolved":
      return "bg-green-100 text-green-700";
    case "escalated":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function FeedPage() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = async () => {
    try {
      const r = await listEmergencies();
      setItems(r?.data || []);
    } catch {
      setItems([]);
    }
  };

  const loadDetail = async (id) => {
    if (!id) return setDetail(null);
    const r = await getEmergency(id).catch(() => null);
    setDetail(r?.data || null);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    loadDetail(selectedId);
    if (!selectedId) return;
    const t = setInterval(() => loadDetail(selectedId), 4000);
    return () => clearInterval(t);
  }, [selectedId]);

  const setStatus = async (id, status) => {
    await updateEmergency(id, { status });
    load();
    if (id === selectedId) loadDetail(id);
  };

  const pending = items.filter((e) => e.status === "pending").length;
  const active = items.filter((e) => e.status === "in_progress").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">🚨 Live Emergency Feed</h1>
        <span className="inline-flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Auto-refresh · 4s
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-6">Coordination console for active emergencies.</p>

      <div className="grid grid-cols-3 gap-4 mb-6 max-w-2xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-red-700 font-semibold">Pending</p>
          <p className="text-3xl font-bold text-red-700">{pending}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-blue-700 font-semibold">In progress</p>
          <p className="text-3xl font-bold text-blue-700">{active}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-gray-600 font-semibold">Total today</p>
          <p className="text-3xl font-bold text-gray-700">{items.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">No emergencies.</p>
          ) : (
            items.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={`block w-full text-left px-4 py-3 hover:bg-gray-50 ${selectedId === e.id ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm">{e.patient_name || "Unnamed"}</p>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${severityClass(e.severity)}`}>
                    {e.severity || "—"}
                  </span>
                </div>
                <p className="text-xs font-mono text-gray-500">{e.id}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-600">
                    {e.emergency_type || "—"} · {e.location || "Unknown"}
                  </p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusClass(e.status)}`}>{e.status}</span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          {!detail ? (
            <p className="text-sm text-gray-400">Select an emergency to see case details and Pulse decisions.</p>
          ) : (
            <Detail detail={detail} onStatus={setStatus} />
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ detail, onStatus }) {
  const decision = detail.decision || {};
  const d = decision.decision || decision || {};
  const timeline = decision.timeline || [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500">Emergency Case</p>
        <p className="text-xl font-bold">{detail.patient_name || "Patient"}</p>
        <p className="font-mono text-xs text-gray-500">{detail.id}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-3">Clinical Situation</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Stat label="Type" value={detail.emergency_type} />
            <Stat label="Severity" value={detail.severity} tone="red" />
            <Stat label="Location" value={detail.location} />
            <Stat label="Status" value={detail.status} tone="blue" />
            <Stat label="Hospital" value={detail.assigned_hospital || decision.assigned_hospital || "Pending"} />
            <Stat label="Doctor" value={detail.assigned_doctor_id || "Pending"} mono />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">Symptoms</p>
            <p className="text-sm text-gray-700">{detail.symptoms || "—"}</p>
          </div>
        </div>

        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-3">Raphael Pulse Context</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Pill label="Priority" value={d.priority} tone={d.priority === "HIGH" ? "red" : "blue"} />
            <Pill label="Mode" value={d.mode} tone="purple" />
            <Pill label="QoD" value={decision.request_qod ? "ACTIVE" : "—"} tone={decision.request_qod ? "red" : "gray"} />
            <Pill label="Reachable" value={decision.is_emergency ? "YES" : "—"} tone="green" />
          </div>

          {Array.isArray(decision.explanation) && decision.explanation.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">Why this decision</p>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
                {decision.explanation.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {timeline.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-2">Timeline</p>
              <ol className="border-l-2 border-blue-200 pl-4 space-y-2">
                {timeline.map((evt, i) => (
                  <li key={i}>
                    <p className="text-xs font-mono text-gray-400">{evt.timestamp}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-700">{evt.event}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        <button onClick={() => onStatus(detail.id, "in_progress")} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Mark in progress</button>
        <button onClick={() => onStatus(detail.id, "escalated")} className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">Escalate</button>
        <button onClick={() => onStatus(detail.id, "resolved")} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">Resolve</button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "gray", mono }) {
  const toneClass = { gray: "text-gray-700", red: "text-red-700", blue: "text-blue-700" }[tone];
  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-2">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      <p className={`text-sm font-medium ${toneClass} ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );
}

function Pill({ label, value, tone = "gray" }) {
  const toneClass = {
    red: "bg-red-100 text-red-700 border-red-200",
    green: "bg-green-100 text-green-700 border-green-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
  }[tone];
  return (
    <div className={`border rounded p-2 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-sm font-bold">{value || "—"}</p>
    </div>
  );
}
