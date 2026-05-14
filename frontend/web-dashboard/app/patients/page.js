"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listPatients,
  getPatient,
  listPatientVitals,
  retrieveReachabilityStatus,
  retrieveLocation,
  retrieveQodSessions,
} from "../../lib/api";

const TABS = ["clinical", "pulse", "vitals"];

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState("clinical");
  const [vitals, setVitals] = useState([]);
  const [pulse, setPulse] = useState({ loading: false, reachability: null, location: null, qod: null });

  const selectedPatient = useMemo(
    () => patients.find((p) => String(p.id) === String(selectedId)) || detail,
    [patients, selectedId, detail]
  );

  const loadPatients = async () => {
    try {
      const res = await listPatients();
      const rows = res?.data || [];
      setPatients(rows);
      if (!selectedId && rows[0]?.id) setSelectedId(rows[0].id);
    } catch {
      setPatients([]);
    }
  };

  const loadPatientProfile = async (id) => {
    if (!id) {
      setDetail(null);
      return;
    }
    const [profile, vitalsRes] = await Promise.all([
      getPatient(id).catch(() => null),
      listPatientVitals(id).catch(() => null),
    ]);
    setDetail(profile?.data || null);
    setVitals(vitalsRes?.data || []);
  };

  const loadPulseContext = async (phoneNumber) => {
    if (!phoneNumber) {
      setPulse({ loading: false, reachability: null, location: null, qod: null });
      return;
    }
    setPulse((prev) => ({ ...prev, loading: true }));
    const [reachability, location, qod] = await Promise.all([
      retrieveReachabilityStatus(phoneNumber).catch(() => null),
      retrieveLocation({ device: { phoneNumber } }).catch(() => null),
      retrieveQodSessions(phoneNumber).catch(() => null),
    ]);

    setPulse({
      loading: false,
      reachability: reachability?.data || reachability || null,
      location: location?.data || location || null,
      qod: qod?.data || qod || null,
    });
  };

  useEffect(() => {
    loadPatients();
    const t = setInterval(loadPatients, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    loadPatientProfile(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const phoneNumber = detail?.phone || detail?.phone_number;
    if (tab === "pulse") loadPulseContext(phoneNumber);
  }, [tab, detail?.id]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Patients</h1>
      <p className="text-gray-500 text-sm mb-6">
        Patient profiles with embedded Raphael Pulse Context for communication and location intelligence.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-100 max-h-[72vh] overflow-y-auto">
          {patients.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">No patients found.</p>
          ) : (
            patients.map((patient) => {
              const active = String(patient.id) === String(selectedId);
              return (
                <button
                  key={patient.id}
                  onClick={() => setSelectedId(patient.id)}
                  className={`text-left w-full px-4 py-3 hover:bg-gray-50 ${active ? "bg-blue-50" : ""}`}
                >
                  <p className="font-medium text-sm">{patient.name || patient.full_name || "Unnamed"}</p>
                  <p className="text-xs text-gray-600">{patient.phone || patient.phone_number || "No phone"}</p>
                  <p className="text-xs font-mono text-gray-400 mt-1">{patient.id}</p>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          {!selectedPatient ? (
            <p className="text-sm text-gray-400">Select a patient to open profile.</p>
          ) : (
            <PatientProfile detail={selectedPatient} tab={tab} setTab={setTab} vitals={vitals} pulse={pulse} />
          )}
        </div>
      </div>
    </div>
  );
}

function PatientProfile({ detail, tab, setTab, vitals, pulse }) {
  return (
    <div>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-wider text-gray-500">Patient Profile</p>
        <p className="text-xl font-bold">{detail.name || detail.full_name || "Patient"}</p>
        <p className="text-xs text-gray-600">{detail.phone || detail.phone_number || "No phone"}</p>
      </div>

      <div className="border-b border-gray-200 mb-4">
        <div className="flex gap-2">
          {TABS.map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-2 text-sm rounded-t-md border border-b-0 ${
                tab === id ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-600"
              }`}
            >
              {id === "clinical" ? "Clinical Summary" : id === "pulse" ? "Raphael Pulse Context" : "Vitals"}
            </button>
          ))}
        </div>
      </div>

      {tab === "clinical" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age" value={detail.age} />
          <Field label="Sex" value={detail.sex || detail.gender} />
          <Field label="Blood Group" value={detail.blood_group} />
          <Field label="Allergies" value={detail.allergies} />
          <Field label="Conditions" value={detail.conditions || detail.medical_history} wide />
          <Field label="Current Notes" value={detail.notes || detail.reason} wide />
        </div>
      )}

      {tab === "pulse" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Network-assist data for patient communication readiness and location confidence.
          </p>
          {pulse.loading && <p className="text-xs text-gray-500">Refreshing Pulse context...</p>}
          <Field label="Reachability" value={pulse.reachability?.status || pulse.reachability?.reachable || "Unavailable"} />
          <Field
            label="Location Estimate"
            value={
              pulse.location?.latitude && pulse.location?.longitude
                ? `${pulse.location.latitude}, ${pulse.location.longitude}`
                : pulse.location?.area || "Unavailable"
            }
            wide
          />
          <Field
            label="QoD Sessions"
            value={Array.isArray(pulse.qod) ? pulse.qod.length : pulse.qod?.sessions?.length || "No active sessions"}
          />
          <Field
            label="Suggested Action"
            value={pulse.reachability?.status === "reachable" ? "Continue direct care coordination" : "Fallback to alternate contact path"}
            wide
          />
        </div>
      )}

      {tab === "vitals" && (
        <div className="space-y-2">
          {vitals.length === 0 ? (
            <p className="text-sm text-gray-400">No vitals recorded.</p>
          ) : (
            vitals.map((entry) => (
              <div key={entry.id || `${entry.recorded_at}-${entry.bp || "bp"}`} className="border border-gray-200 rounded p-3">
                <p className="text-xs text-gray-500">{entry.recorded_at || entry.created_at || "Unknown time"}</p>
                <p className="text-sm text-gray-700">
                  BP: {entry.bp || "-"} · Temp: {entry.temperature || "-"} · Pulse: {entry.pulse || "-"}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, wide }) {
  return (
    <div className={`bg-gray-50 border border-gray-200 rounded p-3 ${wide ? "col-span-2" : ""}`}>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      <p className="text-sm text-gray-700 mt-1">{value || "—"}</p>
    </div>
  );
}
