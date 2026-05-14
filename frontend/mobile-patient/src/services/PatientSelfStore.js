import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Stores the *single* patient profile bound to this device.
 *
 * Shape:
 * {
 *   phone: "+237...",
 *   verified: boolean,
 *   profile: { firstName, lastName, dob, gender, bloodGroup, emergencyContact: {name, phone, relation}, allergies, chronic },
 *   lastEmergencyId: string | null,
 * }
 */
const STORAGE_KEY = "raphael.patient.self.v1";

const empty = { phone: null, verified: false, profile: null, lastEmergencyId: null };

const Ctx = createContext({
  state: empty,
  hydrated: false,
  setPhone: async () => {},
  verifyPhone: async () => {},
  saveProfile: async () => {},
  setLastEmergency: async () => {},
  signOut: async () => {},
});

export function PatientSelfProvider({ children }) {
  const [state, setState] = useState(empty);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState({ ...empty, ...JSON.parse(raw) });
      } catch {}
      setHydrated(true);
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const api = useMemo(
    () => ({
      state,
      hydrated,
      setPhone: (phone) => persist({ ...state, phone, verified: false }),
      verifyPhone: () => persist({ ...state, verified: true }),
      saveProfile: (profile) => persist({ ...state, profile: { ...(state.profile || {}), ...profile } }),
      setLastEmergency: (id) => persist({ ...state, lastEmergencyId: id }),
      signOut: () => persist(empty),
    }),
    [state, hydrated, persist]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePatientSelf() {
  return useContext(Ctx);
}
