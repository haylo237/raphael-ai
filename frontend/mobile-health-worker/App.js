import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import RootNavigator from "./src/navigation/RootNavigator";
import { PatientStoreProvider } from "./src/services/PatientStore";

export default function App() {
  return (
    <SafeAreaProvider>
      <PatientStoreProvider>
        <RootNavigator />
      </PatientStoreProvider>
    </SafeAreaProvider>
  );
}
