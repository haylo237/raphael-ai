import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import Field from "../../components/shared/Field";
import PillGroup from "../../components/shared/PillGroup";
import PrimaryButton from "../../components/shared/PrimaryButton";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { colors, spacing, typography } from "../../theme";
import { createEmergency } from "../../services/api";
import { usePatientSelf } from "../../services/PatientSelfStore";

const TYPES = ["Cardiac", "Trauma", "Respiratory", "Stroke", "Other"];
const SEVERITY = ["low", "medium", "high", "critical"];

export default function RequestEmergencyScreen({ navigation }) {
  const { state, setLastEmergency } = usePatientSelf();
  const [type, setType] = useState("Cardiac");
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState("high");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const fullName = `${state.profile?.firstName || ""} ${state.profile?.lastName || ""}`.trim();
    const result = await createEmergency({
      patient_id: null,
      patient_name: fullName || "Patient",
      patient_phone: state.phone,
      emergency_type: type,
      symptoms,
      severity,
      location: location || "Unknown",
    });
    setSubmitting(false);
    const id = result?.data?.id;
    if (id) {
      await setLastEmergency(id);
      navigation.replace("EmergencyStatus", { emergencyId: id, decision: result.data.decision, offline: !!result.offline });
    } else {
      navigation.replace("EmergencyStatus", {
        emergencyId: "OFFLINE-" + Date.now(),
        offline: true,
        offlineReason: result?.offline_reason,
        local: { type, symptoms, severity, location },
      });
    }
  };

  return (
    <Screen subtitle="Emergency Request" title="🚨  Get help now">
      <Text style={[typography.muted, { marginBottom: spacing.md }]}>
        Stay calm. Tap submit and we will alert the nearest emergency team and
        Raphael Pulse will keep the line open even on weak networks.
      </Text>

      <Section title="What is happening?" glow>
        <PillGroup label="Type" options={TYPES} value={type} onChange={setType} />
        <PillGroup label="Severity" options={SEVERITY} value={severity} onChange={setSeverity} />
        <Field
          label="Symptoms / description"
          value={symptoms}
          onChangeText={setSymptoms}
          placeholder="Chest pain, dizziness…"
          multiline
        />
        <Field label="Location (optional)" value={location} onChangeText={setLocation} placeholder="Address, landmark, neighborhood" />
      </Section>

      {submitting ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.subtitle, { color: colors.primary }]}>Contacting Raphael Pulse…</Text>
        </View>
      ) : (
        <PrimaryButton title="🚨  Submit emergency" variant="danger" onPress={onSubmit} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
});
