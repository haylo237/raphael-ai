import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Badge from "../../components/shared/Badge";
import KeyValue from "../../components/shared/KeyValue";
import PrimaryButton from "../../components/shared/PrimaryButton";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { usePatientStore } from "../../services/PatientStore";
import { colors, spacing, typography } from "../../theme";

export default function PatientProfileScreen({ navigation, route }) {
  const { getPatient } = usePatientStore();
  const patient = getPatient(route.params?.patientId);

  if (!patient) {
    return (
      <Screen title="Patient not found">
        <Text style={typography.muted}>This record may have been removed.</Text>
        <PrimaryButton title="Back to Home" onPress={() => navigation.popToTop()} />
      </Screen>
    );
  }

  const fullName = `${patient.basic.firstName || ""} ${patient.basic.lastName || ""}`.trim();
  const latestVitals = patient.vitals && patient.vitals[0];
  const hasEmergencies = (patient.emergencies || []).length > 0;
  const latestEmergency = hasEmergencies ? patient.emergencies[0] : null;
  const latestDecision = latestEmergency?.decision?.decision || latestEmergency?.decision || null;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={typography.subtitle}>Patient Record</Text>
          <Text style={typography.title}>{fullName || "Unnamed"}</Text>
          <Text style={typography.mono}>{patient.id}</Text>
        </View>
        {hasEmergencies ? <Badge label="History: emergency" variant="warning" pulse /> : <Badge label="Stable" variant="success" />}
      </View>

      <Section title="Identity">
        <KeyValue label="Gender" value={patient.basic.gender} />
        <KeyValue label="Age" value={patient.basic.age ? `${patient.basic.age} yrs` : null} />
        <KeyValue label="Phone" value={patient.basic.phone} />
        <KeyValue label="Alt. Phone" value={patient.basic.altPhone} />
        <KeyValue label="Blood Group" value={patient.basic.bloodGroup} />
        <KeyValue label="Address" value={patient.basic.address} />
        <KeyValue label="City / Region" value={[patient.basic.city, patient.basic.region].filter(Boolean).join(", ") || null} />
      </Section>

      <Section title="Emergency contact">
        <KeyValue label="Name" value={patient.emergencyContact?.name} />
        <KeyValue label="Relationship" value={patient.emergencyContact?.relationship} />
        <KeyValue label="Phone" value={patient.emergencyContact?.phone} />
      </Section>

      <Section title="Latest vitals">
        {latestVitals ? (
          <>
            <KeyValue label="Recorded" value={new Date(latestVitals.recordedAt).toLocaleString()} />
            <KeyValue label="Temperature" value={latestVitals.temperature ? `${latestVitals.temperature} °C` : null} />
            <KeyValue label="Blood Pressure" value={latestVitals.bloodPressure} />
            <KeyValue label="Pulse" value={latestVitals.pulse ? `${latestVitals.pulse} bpm` : null} />
            <KeyValue label="Resp. Rate" value={latestVitals.respiratoryRate ? `${latestVitals.respiratoryRate} /min` : null} />
            <KeyValue label="SpO2" value={latestVitals.spo2 ? `${latestVitals.spo2} %` : null} />
            <KeyValue label="Weight" value={latestVitals.weight ? `${latestVitals.weight} kg` : null} />
            <KeyValue label="Height" value={latestVitals.height ? `${latestVitals.height} cm` : null} />
            <KeyValue label="Blood Sugar" value={latestVitals.bloodSugar ? `${latestVitals.bloodSugar} mg/dL` : null} />
          </>
        ) : (
          <Text style={typography.muted}>No vitals recorded yet.</Text>
        )}
      </Section>

      <Section title="Raphael Pulse context" glow>
        {latestEmergency ? (
          <>
            <KeyValue label="Last emergency" value={latestEmergency.type || "—"} />
            <KeyValue label="Decision mode" value={latestDecision?.mode || "—"} />
            <KeyValue label="Priority" value={latestDecision?.priority || "—"} />
            <KeyValue label="Assigned hospital" value={latestEmergency.decision?.assigned_hospital || "Pending"} />
          </>
        ) : (
          <Text style={typography.muted}>No Pulse decision available yet for this patient.</Text>
        )}
      </Section>

      <Section title={`Emergency history (${(patient.emergencies || []).length})`}>
        {(patient.emergencies || []).length === 0 ? (
          <Text style={typography.muted}>No prior emergencies.</Text>
        ) : (
          patient.emergencies.map((e, idx) => (
            <View key={idx} style={styles.emergencyRow}>
              <Text style={styles.eTitle}>{e.type || "Emergency"} · {e.severity || "n/a"}</Text>
              <Text style={typography.muted}>
                {new Date(e.createdAt).toLocaleString()} — mode: {e.decision?.mode || "—"}
              </Text>
            </View>
          ))
        )}
      </Section>

      <View style={styles.actions}>
        <PrimaryButton title="Record Vitals" variant="secondary" onPress={() => navigation.navigate("RecordVitals", { patientId: patient.id })} />
        <PrimaryButton title="Create Emergency Alert" onPress={() => navigation.navigate("TriggerEmergency", { patientId: patient.id })} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  emergencyRow: { paddingVertical: 4, borderBottomColor: colors.border, borderBottomWidth: 1 },
  eTitle: { ...typography.body, fontWeight: "700", color: colors.primary },
});
