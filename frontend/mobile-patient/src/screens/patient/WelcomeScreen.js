import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import Field from "../../components/shared/Field";
import PrimaryButton from "../../components/shared/PrimaryButton";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import Badge from "../../components/shared/Badge";
import { colors, radius, spacing, typography } from "../../theme";
import { usePatientSelf } from "../../services/PatientSelfStore";

export default function WelcomeScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const { setPhone: persistPhone } = usePatientSelf();

  const onContinue = async () => {
    if (!phone.trim()) return;
    await persistPhone(phone.trim());
    navigation.navigate("Otp");
  };

  return (
    <Screen>
      <View style={styles.heroWrap}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>R</Text>
        </View>
        <Badge label="Secure Channel" variant="info" pulse />
        <Text style={styles.hero}>Raphael</Text>
        <Text style={typography.subtitle}>Patient · Emergency access</Text>
      </View>

      <Section title="Sign in with your phone" glow>
        <Field
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+237 6XX XXX XXX"
        />
        <PrimaryButton title="Send code" onPress={onContinue} />
      </Section>

      <Text style={styles.fineprint}>
        We will send a one-time code to confirm this device belongs to you.
      </Text>
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
  logoText: { color: colors.primary, fontSize: 32, fontWeight: "900", letterSpacing: 2 },
  hero: { fontSize: 36, fontWeight: "900", color: colors.textPrimary, letterSpacing: 1 },
  fineprint: { ...typography.muted, textAlign: "center", marginTop: spacing.md },
});
