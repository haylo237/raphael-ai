"use client";

import { useEffect, useMemo, useState } from "react";
import { listPatients, listPatientVitals, recordPatientVitals } from "../../../lib/api";

export default function NurseQuickVitalsPage() {
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [latest, setLatest] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    temperature_c: "",
    heart_rate: "",
    systolic_bp: "",
    diastolic_bp: "",
    respiratory_rate: "",
    oxygen_saturation: "",
    weight_kg: "",
    height_cm: "",
    notes: "",
  });

  const selected = useMemo(
    () => patients.find((row) => String(row.id) === String(selectedId)),
    [patients, selectedId]
  );

  useEffect(() => {
    listPatients().then((res) => {
      const rows = res?.data || [];
      setPatients(rows);
      if (rows[0]?.id) setSelectedId(String(rows[0].id));
    }).catch(() => setPatients([]));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    listPatientVitals(selectedId)
      .then((res) => setLatest((res?.data || [])[0] || null))
      .catch(() => setLatest(null));
  }, [selectedId]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!selectedId) {
      setError("Select a patient first.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...form,
        temperature_c: form.temperature_c ? Number(form.temperature_c) : null,
        heart_rate: form.heart_rate ? Number(form.heart_rate) : null,
        systolic_bp: form.systolic_bp ? Number(form.systolic_bp) : null,
        diastolic_bp: form.diastolic_bp ? Number(form.diastolic_bp) : null,
        respiratory_rate: form.respiratory_rate ? Number(form.respiratory_rate) : null,
        oxygen_saturation: form.oxygen_saturation ? Number(form.oxygen_saturation) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
      };
      await recordPatientVitals(selectedId, payload);
      setMessage("Vitals recorded.");
      setForm({
        temperature_c: "",
        heart_rate: "",
        systolic_bp: "",
        diastolic_bp: "",
        respiratory_rate: "",
        oxygen_saturation: "",
        weight_kg: "",
        height_cm: "",
        notes: "",
      });
      const res = await listPatientVitals(selectedId).catch(() => ({ data: [] }));
      setLatest((res?.data || [])[0] || null);
    } catch (e) {
      setError(e?.message || "Failed to save vitals.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Quick Vitals</h1>
      <p className="text-gray-500 text-sm mb-5">Fast card-entry workflow for nurse operations and triage updates.</p>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm max-w-3xl">
        <label className="text-xs uppercase tracking-wider text-gray-500">Patient</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          {patients.map((row) => (
            <option key={row.id} value={row.id}>
              {(row.first_name || "").trim()} {(row.last_name || "").trim()} · {row.code || row.id}
            </option>
          ))}
        </select>

        {selected && (
          <p className="text-xs text-gray-500 mt-2">{selected.phone || "No phone"} · {selected.blood_group || "Blood group unknown"}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl">
        <CardField label="Temperature (C)" value={form.temperature_c} onChange={(v) => update("temperature_c", v)} />
        <CardField label="Heart Rate" value={form.heart_rate} onChange={(v) => update("heart_rate", v)} />
        <CardField label="Systolic BP" value={form.systolic_bp} onChange={(v) => update("systolic_bp", v)} />
        <CardField label="Diastolic BP" value={form.diastolic_bp} onChange={(v) => update("diastolic_bp", v)} />
        <CardField label="Respiratory Rate" value={form.respiratory_rate} onChange={(v) => update("respiratory_rate", v)} />
        <CardField label="SpO2" value={form.oxygen_saturation} onChange={(v) => update("oxygen_saturation", v)} />
        <CardField label="Weight (kg)" value={form.weight_kg} onChange={(v) => update("weight_kg", v)} />
        <CardField label="Height (cm)" value={form.height_cm} onChange={(v) => update("height_cm", v)} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mt-3 max-w-4xl">
        <label className="text-xs text-gray-600">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-24"
          placeholder="Nurse observations"
        />
      </div>

      {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
      {message && <p className="text-sm text-green-600 mt-3">{message}</p>}

      <button
        disabled={busy || !selectedId}
        onClick={submit}
        className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
      >
        {busy ? "Saving..." : "Record Vitals"}
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4 max-w-4xl">
        <p className="text-sm font-medium text-gray-700">Latest Vitals Snapshot</p>
        {!latest ? (
          <p className="text-sm text-gray-500 mt-2">No previous vitals recorded.</p>
        ) : (
          <p className="text-sm text-gray-600 mt-2">
            Temp: {latest.temperature_c ?? "-"} · HR: {latest.heart_rate ?? "-"} · BP: {latest.systolic_bp ?? "-"}/
            {latest.diastolic_bp ?? "-"} · SpO2: {latest.oxygen_saturation ?? "-"}
          </p>
        )}
      </div>
    </div>
  );
}

function CardField({ label, value, onChange }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
      <label className="text-xs text-gray-600">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
}
