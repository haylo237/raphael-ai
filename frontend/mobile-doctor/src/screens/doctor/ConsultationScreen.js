import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import Badge from "../../components/shared/Badge";
import Field from "../../components/shared/Field";
import KeyValue from "../../components/shared/KeyValue";
import PrimaryButton from "../../components/shared/PrimaryButton";
import RoleHero from "../../components/shared/RoleHero";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { colors, radius, spacing, typography } from "../../theme";
import { getEmergency, getConsultation, updateEmergency, updateConsultation } from "../../services/api";
import { useDoctorSession } from "../../services/DoctorSession";

function modeVariant(m) {
  switch (String(m || "").toUpperCase()) {
    case "PRIORITY":
      return "danger";
    case "VIDEO":
      return "success";
    case "AUDIO":
      return "info";
    default:
      return "default";
  }
}

function networkVariant(q) {
  switch (String(q || "").toUpperCase()) {
    case "GOOD":
      return "success";
    case "MODERATE":
    case "FAIR":
      return "warning";
    case "POOR":
    case "BAD":
      return "danger";
    default:
      return "info";
  }
}

function formatTime(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return ts;
  }
}

export default function ConsultationScreen({ route, navigation }) {
  const { emergencyId, consultationId } = route.params || {};
  const { state } = useDoctorSession();
  const [emergency, setEmergency] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (emergencyId) {
      const r = await getEmergency(emergencyId);
      if (r?.data) setEmergency(r.data);
    }
    if (consultationId) {
      const r = await getConsultation(consultationId);
      if (r?.data) {
        setConsultation(r.data);
        setNotes(r.data.notes || "");
      }
    }
  }, [emergencyId, consultationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const decision = emergency?.decision || null;
  const d = decision?.decision || decision || {};
  const timeline = decision?.timeline || [];

  // Pulse context — derive from decision payload
  const pulseMode = d.mode || "—";
  const network = decision?.network_quality || (decision?.explanation || []).find((s) => /network/i.test(s)) || "UNKNOWN";
  const reachability = decision?.device_reachable ?? decision?.is_emergency ? "YES" : "—";
  const qod = decision?.request_qod ? "ACTIVE" : "INACTIVE";

  const onAccept = async () => {
    if (!emergencyId) return;
    setBusy(true);
    await updateEmergency(emergencyId, { status: "in_progress", assigned_doctor_id: state.doctorId });
    setBusy(false);
    await reload();
  };

  const onResolve = async () => {
    setBusy(true);
    if (emergencyId) await updateEmergency(emergencyId, { status: "resolved" });
    if (consultationId) await updateConsultation(consultationId, { status: "resolved", notes });
    setBusy(false);
    navigation.goBack();
  };

  const onEscalate = async () => {
    if (!emergencyId) return;
    setBusy(true);
    await updateEmergency(emergencyId, { status: "escalated" });
    setBusy(false);
    await reload();
  };

  const onSaveNotes = async () => {
    if (!consultationId) return;
    setBusy(true);
    await updateConsultation(consultationId, { notes });
    setBusy(false);
  };

  const patientName = emergency?.patient_name || consultation?.patient_name || consultation?.patient_id || "Patient";
  const status = emergency?.status || consultation?.status || "—";

  return (
    <Screen>
      <RoleHero
        eyebrow="Consultation Workspace"
        title="Clinical context first"
        subtitle="Patient summary, vitals, pulse context, and emergency actions in one place."
      />

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={typography.subtitle}>Consultation Workspace</Text>
          <Text style={typography.title}>{patientName}</Text>
          <Text style={typography.mono}>{emergencyId || consultationId || "—"}</Text>
        </View>
        <Badge label={status} variant={status === "resolved" ? "success" : status === "pending" ? "danger" : "info"} pulse={status === "pending"} />
      </View>

      <Section title="🧍  Patient Summary">
        <KeyValue label="Name" value={patientName} />
        <KeyValue label="Phone" value={emergency?.patient_phone || "—"} mono />
        <KeyValue label="Patient ID" value={emergency?.patient_id || consultation?.patient_id || "—"} mono />
      </Section>

      <Section title="❤️  Latest vitals">
        <KeyValue label="BP" value={emergency?.vitals?.bp || "—"} />
        <KeyValue label="Pulse" value={emergency?.vitals?.pulse || "—"} />
        <KeyValue label="SpO2" value={emergency?.vitals?.spo2 || "—"} />
        <KeyValue label="Temperature" value={emergency?.vitals?.temperature || "—"} />
      </Section>

      <Section title="🩺  Symptoms & nurse notes">
        <KeyValue label="Emergency type" value={emergency?.emergency_type || "—"} />
        <KeyValue label="Severity" value={emergency?.severity || "—"} />
        <KeyValue label="Symptoms" value={emergency?.symptoms || consultation?.symptoms || "—"} />
        <KeyValue label="Location" value={emergency?.location || "—"} />
      </Section>

      <Section title="📡  Raphael Pulse context" glow>
        <View style={styles.pulseGrid}>
          <View style={styles.pulseCard}>
            <Text style={typography.label}>Communication mode</Text>
            <Badge label={pulseMode} variant={modeVariant(pulseMode)} />
          </View>
          <View style={styles.pulseCard}>
            <Text style={typography.label}>Network quality</Text>
            <Badge label={String(network).toUpperCase()} variant={networkVariant(network)} />
          </View>
          <View style={styles.pulseCard}>
            <Text style={typography.label}>Reachability</Text>
            <Badge label={String(reachability)} variant={String(reachability) === "YES" ? "success" : "warning"} />
          </View>
          <View style={styles.pulseCard}>
            <Text style={typography.label}>QoD</Text>
            <Badge label={qod} variant={qod === "ACTIVE" ? "danger" : "default"} pulse={qod === "ACTIVE"} />
          </View>
        </View>
      </Section>

      <Section title="📝  Doctor notes">
        <Field
          label="Clinical notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Assessment, plan, observations…"
        />
        <PrimaryButton title="Save notes" variant="secondary" onPress={onSaveNotes} />
      </Section>

      <Section title="💊  Prescription">
        {(consultation?.prescriptions || []).length === 0 ? (
          <Text style={typography.muted}>No prescription yet.</Text>
        ) : (
          consultation.prescriptions.map((rx) => (
            <View key={rx.id} style={styles.rxRow}>
              <Text style={styles.rxMed}>{rx.medication}</Text>
              <Text style={typography.muted}>
                {rx.dosage} · {rx.duration || "—"}
              </Text>
              {rx.instructions ? <Text style={typography.body}>{rx.instructions}</Text> : null}
            </View>
          ))
        )}
        <PrimaryButton
          title="Add prescription"
          variant="secondary"
          onPress={() => navigation.navigate("Prescription", { consultationId, emergencyId })}
        />
      </Section>

      {emergencyId ? (
        <Section title="🚨  Emergency actions">
          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}><PrimaryButton title="Accept" onPress={onAccept} /></View>
            <View style={{ flex: 1 }}><PrimaryButton title="Escalate" variant="danger" onPress={onEscalate} /></View>
          </View>
          <PrimaryButton title="Resolve" variant="secondary" onPress={onResolve} />
        </Section>
      ) : (
        <PrimaryButton title="Resolve consultation" onPress={onResolve} />
      )}

      {timeline.length > 0 ? (
        <Section title="📜  Timeline">
          {timeline.map((evt, idx) => (
            <View key={idx} style={styles.tlRow}>
              <View style={styles.rail}>
                <View style={styles.dot} />
                {idx < timeline.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: spacing.md }}>
                <Text style={styles.tlEvent}>{evt.event}</Text>
                <Text style={[typography.mono, { fontSize: 11 }]}>{formatTime(evt.timestamp)}</Text>
              </View>
            </View>
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  pulseGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pulseCard: {
    flexBasis: "48%",
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.xs,
  },
  rxRow: { paddingVertical: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: 1 },
  rxMed: { ...typography.body, fontWeight: "800", color: colors.textPrimary },
  actionRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm },
  tlRow: { flexDirection: "row", gap: spacing.md },
  rail: { width: 16, alignItems: "center" },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    marginTop: 4,
  },
  line: { width: 2, flex: 1, backgroundColor: colors.borderStrong, marginTop: 2 },
  tlEvent: {
    ...typography.body,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontSize: 12,
  },
});
