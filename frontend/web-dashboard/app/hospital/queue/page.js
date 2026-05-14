"use client";

import { useEffect, useState } from "react";
import { listQueue, assignQueueEntry, removeFromQueue } from "../../../lib/api";

export default function QueuePage() {
  const [queue, setQueue] = useState([]);
  const [doctorIdMap, setDoctorIdMap] = useState({});

  const load = async () => {
    try {
      const res = await listQueue();
      setQueue(res?.data || []);
    } catch {
      setQueue([]);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const assign = async (id) => {
    const doctor_id = doctorIdMap[id];
    if (!doctor_id) return;
    await assignQueueEntry(id, doctor_id);
    load();
  };

  const remove = async (id) => {
    await removeFromQueue(id);
    load();
  };

  const priorityColor = (p) =>
    p === "emergency"
      ? "bg-red-100 text-red-700 border-red-200"
      : p === "urgent"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Queue & Assignment</h1>
      <p className="text-gray-500 text-sm mb-6">Assign waiting patients to a doctor.</p>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Patient</th>
              <th className="px-4 py-3 text-left">Reason</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Doctor</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {queue.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Queue is empty.
                </td>
              </tr>
            ) : (
              queue.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{q.patient_name || "—"}</p>
                    <p className="text-xs font-mono text-gray-400">{q.patient_id || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{q.reason || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs border ${priorityColor(q.priority)}`}>
                      {q.priority || "normal"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{q.status}</td>
                  <td className="px-4 py-3">
                    {q.assigned_doctor_id ? (
                      <span className="font-mono text-xs">{q.assigned_doctor_id}</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          className="border border-gray-300 rounded px-2 py-1 text-xs w-24"
                          placeholder="DOC-0001"
                          value={doctorIdMap[q.id] || ""}
                          onChange={(e) => setDoctorIdMap({ ...doctorIdMap, [q.id]: e.target.value })}
                        />
                        <button
                          onClick={() => assign(q.id)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Assign
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(q.id)} className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
