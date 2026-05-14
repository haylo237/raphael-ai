"use client";

import { useState } from "react";
import ResultCard from "../../components/ResultCard";
import {
  retrieveQosProfiles,
  createQosAssignment,
  getQosAssignment,
  deleteQosAssignment,
} from "../../lib/api";

export default function QosPage() {
  // Profiles
  const [profiles, setProfiles] = useState(null);
  const [profilesError, setProfilesError] = useState(null);
  const [profilesLoading, setProfilesLoading] = useState(false);

  // Create assignment
  const [phone, setPhone] = useState("+99999991000");
  const [qosProfile, setQosProfile] = useState("QOS_E");
  const [createResult, setCreateResult] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Get / Delete assignment
  const [assignmentId, setAssignmentId] = useState("");
  const [actionResult, setActionResult] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleListProfiles() {
    setProfilesLoading(true);
    setProfiles(null);
    setProfilesError(null);
    try {
      setProfiles(await retrieveQosProfiles());
    } catch (err) {
      setProfilesError(err.data || err.message);
    } finally {
      setProfilesLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateResult(null);
    setCreateError(null);
    try {
      const data = await createQosAssignment({
        device: { phoneNumber: phone.trim() },
        qosProfile,
      });
      setCreateResult(data);
      if (data.assignmentId) setAssignmentId(data.assignmentId);
    } catch (err) {
      setCreateError(err.data || err.message);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleAction(action) {
    if (!assignmentId.trim()) return;
    setActionLoading(true);
    setActionResult(null);
    setActionError(null);
    try {
      let data;
      if (action === "get") data = await getQosAssignment(assignmentId.trim());
      else {
        await deleteQosAssignment(assignmentId.trim());
        data = { revoked: true, assignmentId: assignmentId.trim() };
      }
      setActionResult(data);
    } catch (err) {
      setActionError(err.data || err.message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">QoS Assignments</h1>
        <p className="text-gray-500 text-sm">
          Assign QoS profiles to devices and manage existing assignments.
        </p>
      </div>

      {/* QoS Profiles */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Available QoS Profiles</h2>
        <button
          onClick={handleListProfiles}
          disabled={profilesLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          {profilesLoading ? "Loading…" : "List Profiles"}
        </button>
        <ResultCard data={profiles} error={profilesError} loading={profilesLoading} />
      </section>

      {/* Create Assignment */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Create Assignment</h2>
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
              <label className="block text-sm font-medium mb-1">QoS Profile</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={qosProfile}
                onChange={(e) => setQosProfile(e.target.value)}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={createLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            {createLoading ? "Assigning…" : "Create Assignment"}
          </button>
        </form>
        <ResultCard title="Assignment Created" data={createResult} error={createError} loading={createLoading} />
      </section>

      {/* Get / Delete */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Get / Revoke Assignment by ID</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Assignment ID (auto-filled after create)"
            value={assignmentId}
            onChange={(e) => setAssignmentId(e.target.value)}
          />
          <button
            onClick={() => handleAction("get")}
            disabled={actionLoading || !assignmentId.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            Get
          </button>
          <button
            onClick={() => handleAction("delete")}
            disabled={actionLoading || !assignmentId.trim()}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            Revoke
          </button>
        </div>
        <ResultCard data={actionResult} error={actionError} loading={actionLoading} />
      </section>
    </div>
  );
}
