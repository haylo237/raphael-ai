"use client";

import { useMemo, useState } from "react";
import { createPatient } from "../../../lib/api";

const STEP_LABELS = ["Basic Info", "Medical Info", "Emergency Contact"];

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function NurseIntakePage() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    gender: "female",
    date_of_birth: "",
    phone: "",
    address: "",
    blood_group: "O+",
    allergies: "",
    conditions: "",
    medications: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
  });

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(form.first_name.trim() && form.last_name.trim());
    if (step === 1) return true;
    return Boolean(form.emergency_contact_name.trim() && form.emergency_contact_phone.trim());
  }, [step, form]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await createPatient({
        first_name: form.first_name,
        last_name: form.last_name,
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        phone: form.phone || null,
        address: form.address || null,
        blood_group: form.blood_group || null,
        allergies: parseList(form.allergies),
        conditions: parseList(form.conditions),
        medications: parseList(form.medications),
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        notes: form.emergency_contact_relationship
          ? `Emergency contact relationship: ${form.emergency_contact_relationship}`
          : null,
      });
      setMessage(`Patient registered: ${res?.data?.code || "created"}`);
      setStep(0);
      setForm({
        first_name: "",
        last_name: "",
        gender: "female",
        date_of_birth: "",
        phone: "",
        address: "",
        blood_group: "O+",
        allergies: "",
        conditions: "",
        medications: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        emergency_contact_relationship: "",
      });
    } catch (e) {
      setError(e?.message || "Registration failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Nurse Intake</h1>
      <p className="text-gray-500 text-sm mb-5">Step-based patient registration for fast operational capture.</p>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {STEP_LABELS.map((label, idx) => (
            <div
              key={label}
              className={`px-3 py-1 rounded-full text-xs border ${
                idx === step ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-700 border-gray-200"
              }`}
            >
              {idx + 1}. {label}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm max-w-3xl space-y-4">
        {step === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="First Name" value={form.first_name} onChange={(v) => update("first_name", v)} />
            <Field label="Last Name" value={form.last_name} onChange={(v) => update("last_name", v)} />
            <Field label="Gender" value={form.gender} onChange={(v) => update("gender", v)} placeholder="female / male / other" />
            <Field label="Date of Birth" value={form.date_of_birth} onChange={(v) => update("date_of_birth", v)} placeholder="YYYY-MM-DD" />
            <Field label="Phone" value={form.phone} onChange={(v) => update("phone", v)} />
            <Field label="Address" value={form.address} onChange={(v) => update("address", v)} />
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Blood Group" value={form.blood_group} onChange={(v) => update("blood_group", v)} />
            <Field
              label="Allergies"
              value={form.allergies}
              onChange={(v) => update("allergies", v)}
              placeholder="comma separated"
            />
            <Field
              label="Chronic Conditions"
              value={form.conditions}
              onChange={(v) => update("conditions", v)}
              placeholder="comma separated"
            />
            <Field
              label="Medications"
              value={form.medications}
              onChange={(v) => update("medications", v)}
              placeholder="comma separated"
            />
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Contact Name"
              value={form.emergency_contact_name}
              onChange={(v) => update("emergency_contact_name", v)}
            />
            <Field
              label="Relationship"
              value={form.emergency_contact_relationship}
              onChange={(v) => update("emergency_contact_relationship", v)}
            />
            <Field
              label="Contact Phone"
              value={form.emergency_contact_phone}
              onChange={(v) => update("emergency_contact_phone", v)}
            />
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 disabled:opacity-50"
          >
            Back
          </button>

          {step < STEP_LABELS.length - 1 ? (
            <button
              disabled={!canContinue}
              onClick={() => setStep((s) => Math.min(STEP_LABELS.length - 1, s + 1))}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              disabled={busy || !canContinue}
              onClick={submit}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50"
            >
              {busy ? "Saving..." : "Register Patient"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-600">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
      />
    </label>
  );
}
