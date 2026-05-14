import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Badge from "../../components/shared/Badge";
import KeyValue from "../../components/shared/KeyValue";
import PrimaryButton from "../../components/shared/PrimaryButton";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { colors, spacing, typography } from "../../theme";

function priorityVariant(priority) {
  switch ((priority || "").toUpperCase()) {
    case "HIGH": return "danger";
    case "NORMAL": return "info";
    default: return "default";
  }
}

function modeVariant(mode) {
  switch ((mode || "").toUpperCase()) {
    case "PRIORITY": return "danger";
    case "VIDEO": return "success";
    case "AUDIO": return "warning";
    case "CHAT": return "info";
    default: return "default";
  }
}

function formatTimestamp(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}

export default function EmergencyStatusScreen({ navigation, route }) {
  const { decision, emergencyMeta, patientId } = route.params || {};
  const d = decision?.decision || {};
  const timeline = decision?.timeline || [];
  const explanation = decision?.explanation || [];
  const offline = decision?.offline;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={typography.subtitle}>Raphael · Pulse Decision</Text>
          <Text style={typography.title}>Response plan ready</Text>
          <Text style={typography.mono}>{patientId}</Text>
        </View>
        {offline ? <Badge label="Offline plan" variant="warning" pulse /> : <Badge label="Live" variant="success" pulse />}
      </View>

      <Section title="Summary" glow>
        <View style={styles.badgeRow}>
          <Badge label={`Priority · ${d.priority || "—"}`} variant={priorityVariant(d.priority)} pulse={d.priority === "HIGH"} />
          <Badge label={`Mode · ${d.mode || "—"}`} variant={modeVariant(d.mode)} />
          {decision?.request_qod ? <Badge label="QoD requested" variant="danger" pulse /> : null}
        </View>
        <KeyValue label="Emergency Type" value={emergencyMeta?.type} />
        <KeyValue label="Severity" value={emergencyMeta?.severity} />
        <KeyValue label="Location" value={emergencyMeta?.location} />
        <KeyValue label="Assigned Hospital" value={decision?.assigned_hospital} />
      </Section>

      <Section title="Recommended actions">
        {(d.actions || []).length === 0 ? (
          <Text style={typography.muted}>No actions returned.</Text>
        ) : (
          (d.actions || []).map((a, idx) => (
            <Text key={idx} style={styles.action}>• {a}</Text>
          ))
        )}
      </Section>

      <Section title="Why this decision">
        {explanation.length === 0 ? (
          <Text style={typography.muted}>No explanation provided.</Text>
        ) : (
          explanation.map((line, idx) => (
            <Text key={idx} style={styles.action}>• {line}</Text>
          ))
        )}
      </Section>

      <Section title="Timeline">
        {timeline.length === 0 ? (
          <Text style={typography.muted}>No events.</Text>
        ) : (
          <View>
            {timeline.map((evt, idx) => (
              <View key={idx} style={styles.timelineRow}>
                <View style={styles.rail}>
                  <View style={styles.railDot} />
                  {idx < timeline.length - 1 ? <View style={styles.railLine} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: spacing.md }}>
                  <Text style={styles.timelineEvent}>{evt.event}</Text>
                  <Text style={[typography.mono, { fontSize: 11 }]}>{formatTimestamp(evt.timestamp)}</Text>
                  {evt.detail ? (
                    <Text style={[typography.muted, { marginTop: 2 }]}>
                      {Object.entries(evt.detail)
                        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                        .join(" · ")}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </Section>

      {offline ? (
        <Section title="Offline notice">
          <Text style={typography.muted}>
            Pulse engine unreachable — showing a locally computed plan. Decision will be reconciled
            when connectivity returns.
          </Text>
        </Section>
      ) : null}

      <PrimaryButton
        title="Back to Patient"
        variant="secondary"
        onPress={() => navigation.navigate("PatientProfile", { patientId })}
      />
      <PrimaryButton
        title="Done — Home"
        onPress={() => navigation.popToTop()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  action: { ...typography.body, paddingVertical: 3 },
  timelineRow: { flexDirection: "row", gap: spacing.md },
  rail: { width: 16, alignItems: "center" },
  railDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    marginTop: 4,
  },
  railLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.borderStrong,
    marginTop: 2,
  },
  timelineEvent: {
    ...typography.body,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontSize: 12,
  },
});
