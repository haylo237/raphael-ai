"use client";

import { useAuth } from "../../../lib/auth";

function Row({ label, value }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-sm text-gray-800 mt-1">{value || "-"}</p>
    </div>
  );
}

export default function PatientProfilePage() {
  const { user } = useAuth();
  const profile = user?.patient_profile || user?.patientProfile || {};

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">My Profile</h1>
      <p className="text-gray-500 text-sm mb-5">Basic information and emergency care summary.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
        <Row label="Basic Information" value={`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || user?.name} />
        <Row label="Patient ID" value={profile.code} />
        <Row label="Phone" value={profile.phone || user?.phone} />
        <Row label="Gender" value={profile.gender} />
        <Row label="Blood Group" value={profile.blood_group} />
        <Row label="Hospital" value={user?.hospital?.name || user?.staff_profile?.hospital?.name || "Not assigned"} />
        <Row label="Allergies" value={profile.allergies} />
        <Row label="Chronic Conditions" value={profile.conditions || profile.medical_history} />
        <Row label="Emergency Contact" value={profile.emergency_contact_name || "Not set"} />
        <Row label="Emergency Contact Phone" value={profile.emergency_contact_phone || "Not set"} />
      </div>
    </div>
  );
}
