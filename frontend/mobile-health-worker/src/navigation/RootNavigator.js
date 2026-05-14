import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import NurseLoginScreen from "../screens/nurse/NurseLoginScreen";
import NurseHomeScreen from "../screens/nurse/NurseHomeScreen";
import RegisterPatientScreen from "../screens/nurse/RegisterPatientScreen";
import PatientProfileScreen from "../screens/nurse/PatientProfileScreen";
import RecordVitalsScreen from "../screens/nurse/RecordVitalsScreen";
import TriggerEmergencyScreen from "../screens/nurse/TriggerEmergencyScreen";
import EmergencyStatusScreen from "../screens/nurse/EmergencyStatusScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="NurseLogin"
        screenOptions={{
          headerStyle: { backgroundColor: colors.bgElevated },
          headerTintColor: colors.primarySoft,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: "800",
            letterSpacing: 1.2,
            textTransform: "uppercase",
            fontSize: 13,
            color: colors.textPrimary,
          },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="NurseLogin" component={NurseLoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="NurseHome" component={NurseHomeScreen} options={{ title: "Raphael · Nurse" }} />
        <Stack.Screen name="RegisterPatient" component={RegisterPatientScreen} options={{ title: "Register Patient" }} />
        <Stack.Screen name="PatientProfile" component={PatientProfileScreen} options={{ title: "Patient Profile" }} />
        <Stack.Screen name="RecordVitals" component={RecordVitalsScreen} options={{ title: "Record Vitals" }} />
        <Stack.Screen name="TriggerEmergency" component={TriggerEmergencyScreen} options={{ title: "Emergency Alert" }} />
        <Stack.Screen name="EmergencyStatus" component={EmergencyStatusScreen} options={{ title: "Pulse Decision" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
