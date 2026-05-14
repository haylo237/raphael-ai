import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import RootNavigator from "./src/navigation/RootNavigator";
import { DoctorSessionProvider } from "./src/services/DoctorSession";

export default function App() {
  return (
    <SafeAreaProvider>
      <DoctorSessionProvider>
        <RootNavigator />
      </DoctorSessionProvider>
    </SafeAreaProvider>
  );
}
