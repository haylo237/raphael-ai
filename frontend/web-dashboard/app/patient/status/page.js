"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../lib/auth";
import { listEmergencies } from "../../../lib/api";

function isMine(item, user) {
  const userPhone = String(user?.phone || "").trim();
  const casePhone = String(item?.phone || item?.patient?.phone || item?.patient?.phone_number || "").trim();
  if (userPhone && casePhone && userPhone === casePhone) return true;
  return String(item?.created_by_user_id || "") === String(user?.id || "");
}

export default function PatientEmergencyStatusPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    listEmergencies().then((res) => setRows(res?.data || [])).catch(() => setRows([]));
  }, []);

  const mine = useMemo(
    () => rows.filter((item) => isMine(item, user)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [rows, user?.id, user?.phone]
  );

  const latest = mine[0];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Emergency Status</h1>
      <p className="text-gray-500 text-sm mb-5">Track current case progress and assignment updates.</p>

      {!latest ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-500">No emergency case found yet.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm max-w-3xl">
          <p className="text-lg font-semibold text-gray-800">Emergency Submitted</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Field label="Assigned Hospital" value={latest?.assigned_hospital?.name || latest?.assignedHospital?.name || "Pending"} />
            <Field label="Priority" value={latest?.priority || "HIGH"} />
            <Field label="Communication Mode" value={latest?.decision_json?.recommended_mode || "AUDIO"} />
            <Field label="Case Status" value={String(latest?.status || "submitted").replaceAll("_", " ")} />
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Status Timeline</p>
            <ul className="space-y-2 text-sm text-gray-700">
              {(latest?.timeline_json || []).length === 0 ? (
                <li className="border border-gray-100 rounded-lg px-3 py-2 bg-gray-50">Alert Sent</li>
              ) : (
                (latest.timeline_json || []).map((step, idx) => (
                  <li key={`${step?.event || "step"}-${idx}`} className="border border-gray-100 rounded-lg px-3 py-2 bg-gray-50">
                    {(step?.event || "Step").replaceAll("_", " ")} {step?.detail ? `- ${step.detail}` : ""}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-sm text-gray-800 mt-1">{value || "-"}</p>
    </div>
  );
}
