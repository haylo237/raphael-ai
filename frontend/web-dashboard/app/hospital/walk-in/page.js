"use client";

import { useState } from "react";
import { createPatient, addToQueue } from "../../../lib/api";

const FIELD = "block w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const LABEL = "block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1";

export default function WalkInPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "",
    phone: "",
    reason: "",
    priority: "normal",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const patient = await createPatient({
        basic: {
          firstName: form.firstName,
          lastName: form.lastName,
          age: form.age,
          gender: form.gender,
          phone: form.phone,
        },
        emergency_contact: {},
        medical: {},
      });
      const patientId = patient?.data?.id;
      const queued = await addToQueue({
        patient_id: patientId,
        patient_name: `${form.firstName} ${form.lastName}`.trim(),
        reason: form.reason,
        priority: form.priority,
      });
      setResult({ patient: patient?.data, queue: queued?.data });
      setForm({ firstName: "", lastName: "", age: "", gender: "", phone: "", reason: "", priority: "normal" });
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Walk-in Registration</h1>
      <p className="text-gray-500 text-sm mb-6">Register a new walk-in patient and place them in the queue.</p>

      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div>
          <label className={LABEL}>First name</label>
          <input className={FIELD} value={form.firstName} onChange={set("firstName")} required />
        </div>
        <div>
          <label className={LABEL}>Last name</label>
          <input className={FIELD} value={form.lastName} onChange={set("lastName")} />
        </div>
        <div>
          <label className={LABEL}>Age</label>
          <input className={FIELD} value={form.age} onChange={set("age")} type="number" />
        </div>
        <div>
          <label className={LABEL}>Gender</label>
          <select className={FIELD} value={form.gender} onChange={set("gender")}>
            <option value="">—</option>
            <option value="F">Female</option>
            <option value="M">Male</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Phone</label>
          <input className={FIELD} value={form.phone} onChange={set("phone")} placeholder="+237 6XX XXX XXX" />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>Reason for visit</label>
          <textarea className={FIELD} rows={2} value={form.reason} onChange={set("reason")} />
        </div>
        <div>
          <label className={LABEL}>Priority</label>
          <select className={FIELD} value={form.priority} onChange={set("priority")}>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Registering…" : "Register & add to queue"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}
      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded text-sm">
          <p className="font-medium text-green-800 mb-1">Registered patient {result.patient?.id} and added to queue.</p>
          <pre className="text-xs text-gray-700 mt-2 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
