import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import Badge from "../../components/shared/Badge";
import Field from "../../components/shared/Field";
import PrimaryButton from "../../components/shared/PrimaryButton";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { colors, spacing, typography } from "../../theme";
import { useDoctorSession } from "../../services/DoctorSession";

export default function LoginScreen({ navigation }) {
  const { signIn } = useDoctorSession();
  const [name, setName] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [specialty, setSpecialty] = useState("General Medicine");

  const onSubmit = async () => {
    if (!name.trim() || !doctorId.trim()) return;
    await signIn({ name: name.trim(), doctorId: doctorId.trim(), specialty: specialty.trim() });
    navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
  };

  return (
    <Screen>
      <View style={styles.heroWrap}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>Rx</Text>
        </View>
        <Badge label="Clinical Workspace" variant="info" pulse />
        <Text style={styles.hero}>Raphael Clinical</Text>
        <Text style={typography.subtitle}>Doctor · Consultations · Emergency response</Text>
      </View>

      <Section title="Doctor sign-in" glow>
        <Field label="Full name" value={name} onChangeText={setName} placeholder="Dr. Alice Tchamba" />
        <Field label="Doctor ID" value={doctorId} onChangeText={setDoctorId} placeholder="DOC-0001" />
        <Field label="Specialty" value={specialty} onChangeText={setSpecialty} />
        <PrimaryButton title="Sign in" onPress={onSubmit} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroWrap: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceHi,
    borderColor: colors.primary,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    marginBottom: spacing.sm,
  },
  logoText: { color: colors.primary, fontSize: 26, fontWeight: "900", letterSpacing: 2 },
  hero: { fontSize: 32, fontWeight: "900", color: colors.textPrimary, letterSpacing: 1, textAlign: "center" },
});
