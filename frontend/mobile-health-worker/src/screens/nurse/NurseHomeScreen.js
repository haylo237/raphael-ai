import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Badge from "../../components/shared/Badge";
import PrimaryButton from "../../components/shared/PrimaryButton";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { usePatientStore } from "../../services/PatientStore";
import { colors, radius, spacing, typography } from "../../theme";

export default function NurseHomeScreen({ navigation, route }) {
  const { listPatients } = usePatientStore();
  const patients = listPatients();
  const nurseName = route.params?.nurseName || "Nurse";
  const emergencyCount = patients.filter((p) => (p.emergencies || []).some((e) => e.is_emergency)).length;

  return (
    <Screen
      subtitle="Online · Pulse network ready"
      title={`Hello, ${nurseName}`}
    >
      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{patients.length}</Text>
          <Text style={typography.label}>Patients</Text>
        </View>
        <View style={[styles.statCard, emergencyCount > 0 && styles.statCardAlert]}>
          <Text style={[styles.statValue, emergencyCount > 0 && { color: colors.danger }]}>{emergencyCount}</Text>
          <Text style={typography.label}>Active alerts</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton title="+ Register New Patient" onPress={() => navigation.navigate("RegisterPatient")} />
      </View>

      <Section title={`Caseload · ${patients.length}`}>
        {patients.length === 0 ? (
          <Text style={typography.muted}>No patients yet. Tap “Register New Patient” to add one.</Text>
        ) : (
          <FlatList
            data={patients}
            keyExtractor={(p) => p.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => {
              const name = `${item.basic?.firstName || ""} ${item.basic?.lastName || ""}`.trim() || "Unnamed";
              const hasOpenEmergency = (item.emergencies || []).some((e) => e.is_emergency);
              return (
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate("PatientProfile", { patientId: item.id })}
                >
                  <View style={[styles.avatar, hasOpenEmergency && styles.avatarAlert]}>
                    <Text style={styles.avatarText}>
                      {(item.basic?.firstName?.[0] || "?").toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{name}</Text>
                    <Text style={[typography.mono, { fontSize: 11 }]}>{item.id}</Text>
                    <Text style={typography.muted}>
                      {item.basic?.gender || "—"} · {item.basic?.age ? `${item.basic.age}y` : "age ?"}
                    </Text>
                  </View>
                  {hasOpenEmergency ? <Badge label="Emergency" variant="danger" pulse /> : <Badge label="Stable" variant="success" />}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </Section>
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
  statValue: { fontSize: 28, fontWeight: "800", color: colors.primary, letterSpacing: 1 },
  actions: { marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceHi,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarAlert: { borderColor: colors.danger },
  avatarText: { color: colors.primarySoft, fontWeight: "800", fontSize: 14 },
  rowName: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  sep: { height: 1, backgroundColor: colors.border, opacity: 0.5 },
});
