"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { getGatewayHealth, getPulseHealth, listEmergencies, listPatients } from "../../lib/api";
import { normalizeRole } from "../../lib/roleExperience";

function Badge({ ok, label }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <span
        className={`inline-block w-3 h-3 rounded-full ${
          ok === null ? "bg-gray-300" : ok ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className={`text-xs mt-0.5 ${ok === null ? "text-gray-400" : ok ? "text-green-600" : "text-red-600"}`}>
          {ok === null ? "checking…" : ok ? "healthy" : "unreachable"}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const [gateway, setGateway] = useState(null);
  const [pulse, setPulse] = useState(null);
  const [kpis, setKpis] = useState({ activeEmergencies: 0, patients: 0, myCases: 0 });

  useEffect(() => {
    getGatewayHealth().then(() => setGateway(true)).catch(() => setGateway(false));
    getPulseHealth().then(() => setPulse(true)).catch(() => setPulse(false));

    const loadKpis = async () => {
      const [emergencyRes, patientRes] = await Promise.all([
        listEmergencies().catch(() => ({ data: [] })),
        listPatients().catch(() => ({ data: [] })),
      ]);

      const emergencies = emergencyRes?.data || [];
      const active = emergencies.filter((item) =>
        ["submitted", "processing", "assigned", "accepted", "in_progress", "in-progress"].includes(
          String(item.status || "").toLowerCase()
        )
      );
      const mine = emergencies.filter((item) => {
        const assignedDoctor = String(item.accepted_by_user_id || item.assigned_doctor_id || "");
        return String(user?.id || "") && assignedDoctor === String(user?.id || "");
      });

      setKpis({
        activeEmergencies: active.length,
        patients: (patientRes?.data || []).length,
        myCases: mine.length,
      });
    };

    loadKpis();
  }, []);

  if (role === "patient") {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Good day, {user?.name?.split(" ")[0] || "Patient"}</h1>
        <p className="text-gray-500 text-sm mb-6">Simple, reassuring care access with one-tap emergency support.</p>

        <Link
          href="/patient/request"
          className="block w-full sm:w-auto text-center bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl px-6 py-4 shadow-sm"
        >
          Request Emergency Help
        </Link>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          <Card title="Emergency Status" description="Track alert, assignment, and acceptance timeline." href="/patient/status" />
          <Card title="My Profile" description="View patient ID, blood group, and medical summary." href="/patient/profile" />
        </div>
      </div>
    );
  }

  const roleCards =
    role === "doctor"
      ? [
          ["Assigned Cases", "/doctor/cases", "Review urgency, vitals, and consultation notes quickly."],
          ["Emergency Cases", "/emergency/feed", "Accept, escalate, and resolve active emergencies."],
          ["Patient Profiles", "/patients", "Open summary, allergies, conditions, and Pulse context."],
        ]
      : ["nurse", "health_worker"].includes(role)
      ? [
          ["Register Patient", "/nurse/intake", "Step-form intake optimized for fast registration."],
          ["Quick Vitals", "/nurse/vitals", "Record temperature, BP, pulse, and SpO2 in one flow."],
          ["Patient Profiles", "/patients", "Open profile, history, and Pulse context."],
          ["Admissions Queue", "/hospital/queue", "Prioritize triage and doctor assignment workflows."],
          ["Emergency Alerts", "/emergency/feed", "Trigger and monitor emergency cases in real time."],
        ]
      : [
          ["Patients", "/patients", "Open complete patient profiles, history, vitals, and Pulse context."],
          ["Consultations", "/consultations", "Track active consultations and communication readiness."],
          ["Emergency Cases", "/emergency/feed", "Coordinate active emergencies with embedded Pulse insights."],
          ["Admissions & Queue", "/hospital/queue", "Manage triage queue and doctor assignment."],
          ["Doctors & Staff", "/staff", "Review available staff and operational roles."],
          ["Reports", "/reports", "Operational summaries and emergency load visibility."],
        ];

  const heading =
    role === "doctor"
      ? "Doctor Dashboard"
      : ["nurse", "health_worker"].includes(role)
      ? "Nurse Dashboard"
      : "Hospital Dashboard";

  const subtitle =
    role === "doctor"
      ? "Clinical context first: assigned cases, emergency actions, and focused consultations."
      : ["nurse", "health_worker"].includes(role)
      ? "Operational speed first: triage, patient intake, and emergency coordination."
      : "Clinical workflow first. Raphael Pulse intelligence is embedded in patient and emergency views.";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{heading}</h1>
      <p className="text-gray-500 text-sm mb-6">{subtitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 max-w-3xl">
        <Stat label="Active Emergencies" value={kpis.activeEmergencies} />
        <Stat label="Patients in View" value={kpis.patients} />
        <Stat label="My Assigned Cases" value={role === "doctor" ? kpis.myCases : "-"} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-xl">
        <Badge ok={gateway} label="Laravel Gateway :8000" />
        <Badge ok={pulse} label="Pulse Engine :8001" />
      </div>

      <div className="mt-10">
        <h2 className="font-semibold text-gray-700 mb-3">Role Workflows</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {roleCards.map(([title, href, desc]) => (
            <Link
              key={href}
              href={href}
              className="block bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-blue-400 hover:shadow transition-all"
            >
              <p className="font-medium text-sm text-blue-700">{title}</p>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-800 mt-1">{value}</p>
    </div>
  );
}

function Card({ title, description, href }) {
  return (
    <Link href={href} className="block bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-blue-400">
      <p className="font-medium text-sm text-blue-700">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </Link>
  );
}
