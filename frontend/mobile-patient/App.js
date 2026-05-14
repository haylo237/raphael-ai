import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import RootNavigator from "./src/navigation/RootNavigator";
import { PatientSelfProvider } from "./src/services/PatientSelfStore";

export default function App() {
  return (
    <SafeAreaProvider>
      <PatientSelfProvider>
        <RootNavigator />
      </PatientSelfProvider>
    </SafeAreaProvider>
  );
}
