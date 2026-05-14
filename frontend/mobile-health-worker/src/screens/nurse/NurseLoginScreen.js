import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import Badge from "../../components/shared/Badge";
import Field from "../../components/shared/Field";
import PrimaryButton from "../../components/shared/PrimaryButton";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { colors, spacing, typography } from "../../theme";

export default function NurseLoginScreen({ navigation }) {
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function onLogin() {
    if (!staffId.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.replace("NurseHome", { nurseName: staffId.trim() });
    }, 300);
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <View style={styles.logoCore} />
        </View>
        <Text style={[typography.subtitle, { color: colors.primary }]}>Raphael · Pulse Network</Text>
        <Text style={[typography.title, styles.heroTitle]}>Nurse{`\n`}Console</Text>
        <Badge label="Secure Channel" variant="info" pulse />
      </View>

      <Section title="Sign in" glow>
        <Field label="Staff ID" value={staffId} onChangeText={setStaffId} autoCapitalize="none" placeholder="nurse.adeola" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" autoCapitalize="none" />
        <PrimaryButton title={loading ? "Authenticating…" : "Sign in"} onPress={onLogin} loading={loading} />
      </Section>

      <Text style={styles.hint}>
        Offline-resilient · CAMARA-aware · Decisions are computed locally if Pulse is unreachable.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: spacing.xl, gap: spacing.md, alignItems: "flex-start" },
  heroTitle: { fontSize: 36, lineHeight: 40, marginVertical: spacing.xs },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  logoCore: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  hint: { ...typography.muted, textAlign: "center", marginTop: spacing.md },
});
