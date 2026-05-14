import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { colors, typography } from "../theme";
import { usePatientSelf } from "../services/PatientSelfStore";
import WelcomeScreen from "../screens/patient/WelcomeScreen";
import OtpScreen from "../screens/patient/OtpScreen";
import ProfileScreen from "../screens/patient/ProfileScreen";
import RequestEmergencyScreen from "../screens/patient/RequestEmergencyScreen";
import EmergencyStatusScreen from "../screens/patient/EmergencyStatusScreen";

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.primary,
    notification: colors.danger,
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: colors.bgElevated },
  headerTintColor: colors.primary,
  headerTitleStyle: { ...typography.h2, fontSize: 14 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

export default function RootNavigator() {
  const { state, hydrated } = usePatientSelf();
  if (!hydrated) return null;

  let initial = "Welcome";
  if (state.verified && state.profile) initial = "Profile";
  else if (state.verified) initial = "Profile";
  else if (state.phone) initial = "Otp";

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator initialRouteName={initial} screenOptions={screenOptions}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Otp" component={OtpScreen} options={{ title: "Verify" }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Raphael · Patient" }} />
        <Stack.Screen name="RequestEmergency" component={RequestEmergencyScreen} options={{ title: "Request Help" }} />
        <Stack.Screen name="EmergencyStatus" component={EmergencyStatusScreen} options={{ title: "Status" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
