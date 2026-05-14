"use client";

import { useEffect, useMemo, useState } from "react";
import { listPatients, getPatient } from "../../../lib/api";

export default function RecordsPage() {
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    listPatients().then((r) => setPatients(r?.data || [])).catch(() => setPatients([]));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const name = `${p.basic?.firstName || ""} ${p.basic?.lastName || ""}`.toLowerCase();
      return name.includes(q) || p.id.toLowerCase().includes(q) || (p.basic?.phone || "").includes(q);
    });
  }, [patients, query]);

  const open = async (id) => {
    const r = await getPatient(id).catch(() => null);
    setSelected(r?.data || null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Patient Records</h1>
      <p className="text-gray-500 text-sm mb-6">Search registered patients and view their record.</p>

      <input
        className="w-full max-w-md mb-4 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Search by name, ID, or phone…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">No matches.</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => open(p.id)}
                className={`block w-full text-left px-4 py-3 hover:bg-gray-50 ${selected?.id === p.id ? "bg-blue-50" : ""}`}
              >
                <p className="text-sm font-medium">
                  {p.basic?.firstName} {p.basic?.lastName || ""}
                </p>
                <p className="text-xs font-mono text-gray-500">{p.id}</p>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          {!selected ? (
            <p className="text-sm text-gray-400">Select a patient to view the record.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Patient Record</p>
                <p className="text-xl font-bold">
                  {selected.basic?.firstName} {selected.basic?.lastName || ""}
                </p>
                <p className="font-mono text-xs text-gray-500">{selected.id}</p>
              </div>

              <Section title="Demographics">
                <KV label="Age" value={selected.basic?.age} />
                <KV label="Gender" value={selected.basic?.gender} />
                <KV label="Phone" value={selected.basic?.phone} mono />
              </Section>

              <Section title="Emergency Contact">
                <KV label="Name" value={selected.emergency_contact?.name} />
                <KV label="Phone" value={selected.emergency_contact?.phone} mono />
                <KV label="Relation" value={selected.emergency_contact?.relation} />
              </Section>

              <Section title="Medical">
                <KV label="Blood group" value={selected.medical?.bloodGroup} />
                <KV label="Allergies" value={selected.medical?.allergies} />
                <KV label="Chronic" value={selected.medical?.chronic} />
              </Section>

              <Section title={`Vitals history (${selected.vitals?.length || 0})`}>
                {(selected.vitals || []).slice(-5).reverse().map((v) => (
                  <div key={v.id} className="text-xs text-gray-700 border-t border-gray-100 py-1">
                    <span className="font-mono text-gray-400">{v.recorded_at}</span> · BP {v.bp || "—"} · Pulse {v.pulse || "—"} · SpO2 {v.spo2 || "—"}
                  </div>
                ))}
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">{title}</p>
      <div>{children}</div>
    </div>
  );
}

function KV({ label, value, mono }) {
  return (
    <div className="flex justify-between py-1 text-sm border-b border-gray-100">
      <span className="text-gray-500">{label}</span>
      <span className={mono ? "font-mono text-gray-700" : "text-gray-800"}>{value || "—"}</span>
    </div>
  );
}
