"use client";

import { useState } from "react";
import ResultCard from "../../components/ResultCard";
import {
  createQodSession,
  getQodSession,
  deleteQodSession,
  extendQodSession,
  retrieveQodSessions,
} from "../../lib/api";

const QOS_PROFILES = ["QOS_E", "QOS_S", "QOS_M", "QOS_L"];

export default function QodPage() {
  // Create session
  const [phone, setPhone] = useState("+99999991000");
  const [appServerIp, setAppServerIp] = useState("198.51.100.1");
  const [profile, setProfile] = useState("QOS_E");
  const [duration, setDuration] = useState("3600");
  const [createResult, setCreateResult] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Get / Delete / Extend by ID
  const [sessionId, setSessionId] = useState("");
  const [extendSecs, setExtendSecs] = useState("1800");
  const [actionResult, setActionResult] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Retrieve sessions for device
  const [retrievePhone, setRetrievePhone] = useState("+99999991000");
  const [retrieveResult, setRetrieveResult] = useState(null);
  const [retrieveError, setRetrieveError] = useState(null);
  const [retrieveLoading, setRetrieveLoading] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateResult(null);
    setCreateError(null);
    try {
      const data = await createQodSession({
        device: { phoneNumber: phone.trim() },
        applicationServer: { ipv4Address: appServerIp.trim() },
        qosProfile: profile,
        duration: parseInt(duration, 10),
      });
      setCreateResult(data);
      if (data.sessionId) setSessionId(data.sessionId);
    } catch (err) {
      setCreateError(err.data || err.message);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleAction(action) {
    if (!sessionId.trim()) return;
    setActionLoading(true);
    setActionResult(null);
    setActionError(null);
    try {
      let data;
      if (action === "get") data = await getQodSession(sessionId.trim());
      else if (action === "delete") {
        await deleteQodSession(sessionId.trim());
        data = { deleted: true, sessionId: sessionId.trim() };
      } else if (action === "extend")
        data = await extendQodSession(sessionId.trim(), parseInt(extendSecs, 10));
      setActionResult(data);
    } catch (err) {
      setActionError(err.data || err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRetrieve(e) {
    e.preventDefault();
    setRetrieveLoading(true);
    setRetrieveResult(null);
    setRetrieveError(null);
    try {
      setRetrieveResult(await retrieveQodSessions(retrievePhone.trim()));
    } catch (err) {
      setRetrieveError(err.data || err.message);
    } finally {
      setRetrieveLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">QoD Session Manager</h1>
        <p className="text-gray-500 text-sm">
          Create and manage Quality-on-Demand priority network sessions for patient devices.
        </p>
      </div>

      {/* Create */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Create Session</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Device Phone Number</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">App Server IPv4</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={appServerIp}
                onChange={(e) => setAppServerIp(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">QoS Profile</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
              >
                {QOS_PROFILES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration (seconds)</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={createLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            {createLoading ? "Creating…" : "Create Session"}
          </button>
        </form>
        <ResultCard title="Session Created" data={createResult} error={createError} loading={createLoading} />
      </section>

      {/* Get / Delete / Extend */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Manage Session by ID</h2>
        <div className="space-y-3">
          <input
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Session ID (auto-filled after create)"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleAction("get")}
              disabled={actionLoading || !sessionId.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
            >
              Get
            </button>
            <button
              onClick={() => handleAction("delete")}
              disabled={actionLoading || !sessionId.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
            >
              Delete
            </button>
            <div className="flex gap-1 items-center">
              <input
                type="number"
                className="w-24 border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={extendSecs}
                onChange={(e) => setExtendSecs(e.target.value)}
                min="1"
                placeholder="Secs"
              />
              <button
                onClick={() => handleAction("extend")}
                disabled={actionLoading || !sessionId.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
              >
                Extend
              </button>
            </div>
          </div>
        </div>
        <ResultCard data={actionResult} error={actionError} loading={actionLoading} />
      </section>

      {/* Retrieve for device */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Retrieve Sessions for Device</h2>
        <form onSubmit={handleRetrieve} className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+99999991000"
            value={retrievePhone}
            onChange={(e) => setRetrievePhone(e.target.value)}
          />
          <button
            type="submit"
            disabled={retrieveLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors whitespace-nowrap"
          >
            {retrieveLoading ? "Loading…" : "List Sessions"}
          </button>
        </form>
        <ResultCard data={retrieveResult} error={retrieveError} loading={retrieveLoading} />
      </section>
    </div>
  );
}
