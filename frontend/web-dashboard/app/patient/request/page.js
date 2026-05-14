"use client";

import { useState } from "react";
import { useAuth } from "../../../lib/auth";
import { createEmergency } from "../../../lib/api";

const TYPES = ["Chest Pain", "Accident", "Breathing Difficulty", "Pregnancy", "Other"];

export default function PatientEmergencyRequestPage() {
  const { user } = useAuth();
  const [type, setType] = useState(TYPES[0]);
  const [symptoms, setSymptoms] = useState("");
  const [locationHint, setLocationHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await createEmergency({
        patient_name: user?.name,
        phone: user?.phone,
        emergency_type: type,
        symptoms,
        location_hint: locationHint,
      });
      const code = res?.data?.code || "created";
      setSuccess(`Emergency submitted successfully (${code}).`);
      setSymptoms("");
      setLocationHint("");
    } catch (err) {
      setError(err?.message || "Failed to submit emergency.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Request Emergency Help</h1>
      <p className="text-gray-500 text-sm mb-5">Use simple inputs. Send one high-priority alert immediately.</p>

      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm max-w-2xl space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Emergency Type</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TYPES.map((item) => {
              const active = item === type;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setType(item)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm ${
                    active ? "border-rose-400 bg-rose-50 text-rose-700" : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Symptoms</label>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Describe what you feel right now"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-28"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Location (optional)</label>
          <input
            value={locationHint}
            onChange={(e) => setLocationHint(e.target.value)}
            placeholder="Home, street landmark, neighborhood..."
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <button
          disabled={busy}
          className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-5 py-3 font-semibold disabled:opacity-60"
        >
          {busy ? "Submitting alert..." : "Send Emergency Alert"}
        </button>
      </form>
    </div>
  );
}
