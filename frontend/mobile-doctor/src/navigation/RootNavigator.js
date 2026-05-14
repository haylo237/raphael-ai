import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { colors, typography } from "../theme";
import { useDoctorSession } from "../services/DoctorSession";
import LoginScreen from "../screens/doctor/LoginScreen";
import DashboardScreen from "../screens/doctor/DashboardScreen";
import CaseListScreen from "../screens/doctor/CaseListScreen";
import ConsultationScreen from "../screens/doctor/ConsultationScreen";
import PrescriptionScreen from "../screens/doctor/PrescriptionScreen";

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
  const { state, hydrated } = useDoctorSession();
  if (!hydrated) return null;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={state.doctorId ? "Dashboard" : "Login"}
        screenOptions={screenOptions}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Raphael · Doctor" }} />
        <Stack.Screen name="CaseList" component={CaseListScreen} options={{ title: "Cases" }} />
        <Stack.Screen name="Consultation" component={ConsultationScreen} options={{ title: "Consultation" }} />
        <Stack.Screen name="Prescription" component={PrescriptionScreen} options={{ title: "Prescription" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
