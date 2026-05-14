import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "raphael.doctor.session.v1";
const empty = { doctorId: null, name: null, specialty: null, signedInAt: null };

const Ctx = createContext({ state: empty, hydrated: false, signIn: async () => {}, signOut: async () => {} });

export function DoctorSessionProvider({ children }) {
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
      signIn: ({ doctorId, name, specialty }) =>
        persist({ doctorId, name, specialty, signedInAt: new Date().toISOString() }),
      signOut: () => persist(empty),
    }),
    [state, hydrated, persist]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDoctorSession() {
  return useContext(Ctx);
}
