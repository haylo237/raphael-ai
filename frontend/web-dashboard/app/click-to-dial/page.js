"use client";

import { useState } from "react";
import ResultCard from "../../components/ResultCard";
import { createCall, getCall, terminateCall } from "../../lib/api";

export default function ClickToDialPage() {
  // Create call
  const [caller, setCaller] = useState("+99999991000");
  const [callee, setCallee] = useState("+99999991001");
  const [createResult, setCreateResult] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Get / Terminate
  const [callId, setCallId] = useState("");
  const [actionResult, setActionResult] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateResult(null);
    setCreateError(null);
    try {
      const data = await createCall(caller.trim(), callee.trim());
      setCreateResult(data);
      if (data.callId) setCallId(data.callId);
    } catch (err) {
      setCreateError(err.data || err.message);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleAction(action) {
    if (!callId.trim()) return;
    setActionLoading(true);
    setActionResult(null);
    setActionError(null);
    try {
      let data;
      if (action === "get") data = await getCall(callId.trim());
      else {
        await terminateCall(callId.trim());
        data = { terminated: true, callId: callId.trim() };
      }
      setActionResult(data);
    } catch (err) {
      setActionError(err.data || err.message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Click-to-Dial</h1>
        <p className="text-gray-500 text-sm">
          Dispatch admin-initiated calls between two parties — e.g. ambulance dispatch to patient, or doctor to nurse.
        </p>
      </div>

      {/* Create call */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Create Call</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Caller Number (E.164)</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+99999991000"
              value={caller}
              onChange={(e) => setCaller(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Callee Number (E.164)</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+99999991001"
              value={callee}
              onChange={(e) => setCallee(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={createLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded text-sm transition-colors"
          >
            {createLoading ? "Dialling…" : "Create Call"}
          </button>
        </form>
        <ResultCard title="Call Created" data={createResult} error={createError} loading={createLoading} />
      </section>

      {/* Get / Terminate */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Manage Call by ID</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Call ID (auto-filled after create)"
            value={callId}
            onChange={(e) => setCallId(e.target.value)}
          />
          <button
            onClick={() => handleAction("get")}
            disabled={actionLoading || !callId.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            Get
          </button>
          <button
            onClick={() => handleAction("terminate")}
            disabled={actionLoading || !callId.trim()}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            Terminate
          </button>
        </div>
        <ResultCard data={actionResult} error={actionError} loading={actionLoading} />
      </section>
    </div>
  );
}
