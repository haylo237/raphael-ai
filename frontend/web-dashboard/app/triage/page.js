"use client";

import { useState } from "react";
import ResultCard from "../../components/ResultCard";
import { submitTriage } from "../../lib/api";

const URGENCY = ["normal", "medium", "high", "emergency"];
const NETWORK = ["good", "fair", "poor", "offline"];
const LOCATIONS = ["lagos", "nairobi", "kampala", "accra", "dakar", "kinshasa", "yaounde", "unknown"];

export default function TriagePage() {
  const [patientId, setPatientId] = useState("patient-001");
  const [symptoms, setSymptoms] = useState("fever, headache");
  const [urgency, setUrgency] = useState("normal");
  const [network, setNetwork] = useState("fair");
  const [location, setLocation] = useState("lagos");
  const [reachable, setReachable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await submitTriage({
        patient_id: patientId,
        symptoms: symptoms.split(",").map((s) => s.trim()).filter(Boolean),
        urgency,
        network_quality: network,
        device_reachable: reachable,
        location,
      });
      setResult(data);
    } catch (err) {
      setError(err.data || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Case Triage Console</h1>
      <p className="text-gray-500 text-sm mb-6">
        Submit a patient case and receive a full Raphael decision including communication mode, QoD, location, and hospital assignment.
      </p>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Patient ID</label>
          <input
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Symptoms (comma-separated)</label>
          <input
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Urgency</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
            >
              {URGENCY.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Network Quality</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              {NETWORK.map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 mt-5">
            <input
              type="checkbox"
              id="reachable"
              checked={reachable}
              onChange={(e) => setReachable(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="reachable" className="text-sm font-medium">Device Reachable</label>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded text-sm transition-colors"
        >
          {loading ? "Submitting…" : "Submit Case"}
        </button>
      </form>

      <ResultCard title="Triage Decision" data={result} error={error} loading={loading} />
    </div>
  );
}
