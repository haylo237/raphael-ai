/**
 * Local patient + emergency-history store.
 *
 * Generates RAP-000123-style IDs, persists patients/vitals/emergencies to
 * AsyncStorage so the nurse app survives reloads, and exposes a Context API
 * consumed by the nurse screens.
 *
 * When the Laravel backend is ready, swap the internal helpers for the
 * remote calls in `services/api.js` (createPatientRemote, recordVitalsRemote).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "raphael.nurse.store.v1";
const PatientStoreContext = createContext(null);

function emptyState() {
  return { patients: {}, order: [], counter: 1 };
}

function formatPatientId(n) {
  return `RAP-${String(n).padStart(6, "0")}`;
}

export function PatientStoreProvider({ children }) {
  const [state, setState] = useState(emptyState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState(JSON.parse(raw));
      } catch {
        // ignore corrupt cache
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated]);

  const api = useMemo(() => {
    function createPatient(data) {
      let createdId;
      setState((prev) => {
        const id = formatPatientId(prev.counter);
        createdId = id;
        const patient = {
          id,
          createdAt: new Date().toISOString(),
          basic: data.basic || {},
          emergencyContact: data.emergencyContact || {},
          medical: data.medical || {},
          initialVitals: data.initialVitals || null,
          vitals: data.initialVitals ? [{ ...data.initialVitals, recordedAt: new Date().toISOString() }] : [],
          emergencies: [],
        };
        return {
          patients: { ...prev.patients, [id]: patient },
          order: [id, ...prev.order],
          counter: prev.counter + 1,
        };
      });
      return createdId;
    }

    function getPatient(id) {
      return state.patients[id] || null;
    }

    function listPatients() {
      return state.order.map((id) => state.patients[id]).filter(Boolean);
    }

    function recordVitals(id, vitals) {
      setState((prev) => {
        const p = prev.patients[id];
        if (!p) return prev;
        const entry = { ...vitals, recordedAt: new Date().toISOString() };
        return {
          ...prev,
          patients: { ...prev.patients, [id]: { ...p, vitals: [entry, ...(p.vitals || [])] } },
        };
      });
    }

    function recordEmergency(id, emergency) {
      setState((prev) => {
        const p = prev.patients[id];
        if (!p) return prev;
        const entry = { ...emergency, createdAt: new Date().toISOString() };
        return {
          ...prev,
          patients: { ...prev.patients, [id]: { ...p, emergencies: [entry, ...(p.emergencies || [])] } },
        };
      });
    }

    return { createPatient, getPatient, listPatients, recordVitals, recordEmergency, hydrated };
  }, [state, hydrated]);

  return <PatientStoreContext.Provider value={api}>{children}</PatientStoreContext.Provider>;
}

export function usePatientStore() {
  const ctx = useContext(PatientStoreContext);
  if (!ctx) throw new Error("usePatientStore must be used inside <PatientStoreProvider>");
  return ctx;
}
