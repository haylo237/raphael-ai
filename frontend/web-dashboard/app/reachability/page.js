"use client";

import { useState } from "react";
import ResultCard from "../../components/ResultCard";
import { retrieveReachabilityStatus } from "../../lib/api";

export default function ReachabilityPage() {
  const [phone, setPhone] = useState("+99999991000");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await retrieveReachabilityStatus(phone.trim());
      setResult(data);
    } catch (err) {
      setError(err.data || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-1">Device Reachability Monitor</h1>
      <p className="text-gray-500 text-sm mb-6">
        Check the live CAMARA reachability status for a device. Returns connectivity type (DATA / SMS / OFFLINE) and timestamp.
      </p>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number (E.164)</label>
          <input
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+99999991000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <p className="text-xs text-gray-400 mt-1">Live test numbers: +99999991000, +99999991001</p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded text-sm transition-colors"
        >
          {loading ? "Checking…" : "Check Reachability"}
        </button>
      </form>

      <ResultCard title="Reachability Status" data={result} error={error} loading={loading} />
    </div>
  );
}
