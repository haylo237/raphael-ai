"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../lib/auth";
import { listEmergencies } from "../../../lib/api";

function isMine(item, user) {
  const userPhone = String(user?.phone || "").trim();
  const casePhone = String(item?.phone || item?.patient?.phone || item?.patient?.phone_number || "").trim();
  if (userPhone && casePhone && userPhone === casePhone) return true;
  return String(item?.created_by_user_id || "") === String(user?.id || "");
}

export default function PatientHomePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    listEmergencies()
      .then((res) => setRows(res?.data || []))
      .catch(() => setRows([]));
  }, []);

  const myRecent = useMemo(
    () => rows.filter((item) => isMine(item, user)).slice(0, 3),
    [rows, user?.id, user?.phone]
  );

  const profile = user?.patient_profile || user?.patientProfile || {};

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Good Morning, {user?.name?.split(" ")[0] || "Patient"}</h1>
      <p className="text-gray-500 text-sm mb-5">Patient ID: {profile?.code || "Pending"} · Blood Group: {profile?.blood_group || "Unknown"}</p>

      <Link
        href="/patient/request"
        className="block text-center w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-2xl px-6 py-4 shadow-sm"
      >
        Emergency Help
      </Link>

      <section className="mt-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm max-w-2xl">
        <h2 className="font-semibold text-gray-800">Recent Activity</h2>
        {myRecent.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">No recent emergency activity yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {myRecent.map((item) => (
              <li key={item.id} className="border border-gray-100 rounded-lg px-3 py-2 bg-gray-50">
                {(item.emergency_type || "Emergency")} · {String(item.status || "submitted").replaceAll("_", " ")}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
