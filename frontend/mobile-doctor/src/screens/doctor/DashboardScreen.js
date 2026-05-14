import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Badge from "../../components/shared/Badge";
import PrimaryButton from "../../components/shared/PrimaryButton";
import RoleHero from "../../components/shared/RoleHero";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { colors, radius, spacing, typography } from "../../theme";
import { listEmergencies, listConsultations } from "../../services/api";
import { useDoctorSession } from "../../services/DoctorSession";

function severityVariant(s) {
  switch (String(s || "").toLowerCase()) {
    case "critical":
    case "high":
      return "danger";
    case "medium":
      return "warning";
    default:
      return "info";
  }
}

export default function DashboardScreen({ navigation }) {
  const { state, signOut } = useDoctorSession();
  const [emergencies, setEmergencies] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const e = await listEmergencies();
    const c = await listConsultations({ doctor_id: state.doctorId });
    setEmergencies(Array.isArray(e?.data) ? e.data : []);
    setConsultations(Array.isArray(c?.data) ? c.data : []);
    setRefreshing(false);
  }, [state.doctorId]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingEmergencies = emergencies.filter((e) => e.status === "pending");
  const openConsultations = consultations.filter((c) => c.status === "open");
  const todays = consultations.filter((c) => {
    if (!c.created_at) return false;
    const d = new Date(c.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return (
    <Screen
      subtitle={`Hello, ${state.name || "Doctor"} · ${state.specialty || ""}`}
      title="Clinical Dashboard"
    >
      <RoleHero
        eyebrow="Doctor Workspace"
        title="Consultation-first view"
        subtitle="Keep focus on assigned cases, emergency actions, and clinical context."
      />

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{todays.length}</Text>
          <Text style={typography.label}>Today</Text>
        </View>
        <View style={[styles.statCard, pendingEmergencies.length > 0 && styles.statCardAlert]}>
          <Text style={[styles.statValue, pendingEmergencies.length > 0 && { color: colors.danger }]}>
            {pendingEmergencies.length}
          </Text>
          <Text style={typography.label}>Emergencies</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{openConsultations.length}</Text>
          <Text style={typography.label}>Open cases</Text>
        </View>
      </View>

      <Section title="Active emergencies" glow>
        {pendingEmergencies.length === 0 ? (
          <Text style={typography.muted}>No active emergencies.</Text>
        ) : (
          pendingEmergencies.slice(0, 5).map((e) => (
            <TouchableOpacity
              key={e.id}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Consultation", { emergencyId: e.id })}
            >
              <View style={[styles.dot, { backgroundColor: colors.danger }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{e.patient_name || "Unnamed patient"}</Text>
                <Text style={[typography.mono, { fontSize: 11 }]}>{e.id}</Text>
                <Text style={typography.muted}>
                  {e.emergency_type || "—"} · {e.location || "Unknown"}
                </Text>
              </View>
              <Badge label={(e.severity || "—").toUpperCase()} variant={severityVariant(e.severity)} pulse />
            </TouchableOpacity>
          ))
        )}
      </Section>

      <Section title="My consultations">
        {consultations.length === 0 ? (
          <Text style={typography.muted}>No consultations assigned.</Text>
        ) : (
          consultations.slice(0, 5).map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Consultation", { consultationId: c.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{c.patient_name || c.patient_id || "Patient"}</Text>
                <Text style={[typography.mono, { fontSize: 11 }]}>{c.id}</Text>
                <Text style={typography.muted}>{c.notes || "No notes"}</Text>
              </View>
              <Badge label={c.status} variant={c.status === "resolved" ? "success" : "info"} />
            </TouchableOpacity>
          ))
        )}
      </Section>

      <PrimaryButton title="View all cases" variant="secondary" onPress={() => navigation.navigate("CaseList")} />
      <PrimaryButton title={refreshing ? "Refreshing…" : "Refresh"} variant="ghost" onPress={load} />
      <PrimaryButton title="Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  statCardAlert: {
    borderColor: colors.danger,
    shadowColor: colors.danger,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  statValue: { fontSize: 26, fontWeight: "800", color: colors.primary, letterSpacing: 1 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, gap: spacing.md },
  rowTitle: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
