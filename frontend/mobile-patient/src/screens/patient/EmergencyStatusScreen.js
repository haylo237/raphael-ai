import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import Badge from "../../components/shared/Badge";
import KeyValue from "../../components/shared/KeyValue";
import PrimaryButton from "../../components/shared/PrimaryButton";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { colors, spacing, typography } from "../../theme";
import { getEmergency } from "../../services/api";

function priorityVariant(p) {
  switch (String(p || "").toUpperCase()) {
    case "HIGH":
    case "CRITICAL":
      return "danger";
    case "MEDIUM":
      return "warning";
    default:
      return "info";
  }
}

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

function formatTime(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return ts;
  }
}

export default function EmergencyStatusScreen({ route, navigation }) {
  const { emergencyId, decision: initialDecision, offline: initialOffline, local } = route.params || {};
  const [emergency, setEmergency] = useState(null);
  const [offline, setOffline] = useState(!!initialOffline);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const res = await getEmergency(emergencyId);
      if (!cancelled && res?.data) {
        setEmergency(res.data);
        setOffline(false);
      }
    };
    if (emergencyId && !emergencyId.startsWith("OFFLINE-")) {
      tick();
      const t = setInterval(tick, 5000);
      return () => {
        cancelled = true;
        clearInterval(t);
      };
    }
  }, [emergencyId]);

  const decision = emergency?.decision || initialDecision || null;
  const d = decision?.decision || decision || {};
  const timeline = decision?.timeline || [];
  const status = emergency?.status || (offline ? "pending (offline)" : "pending");
  const meta = emergency || {
    emergency_type: local?.type,
    severity: local?.severity,
    symptoms: local?.symptoms,
    location: local?.location,
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={typography.subtitle}>Raphael · Pulse Decision</Text>
          <Text style={typography.title}>Help is on the way</Text>
          <Text style={typography.mono}>{emergencyId}</Text>
        </View>
        {offline ? (
          <Badge label="Offline plan" variant="warning" pulse />
        ) : (
          <Badge label="Live" variant="success" pulse />
        )}
      </View>

      <Section title="Status" glow>
        <View style={styles.badgeRow}>
          <Badge label={`Priority · ${d.priority || "—"}`} variant={priorityVariant(d.priority)} pulse={d.priority === "HIGH"} />
          <Badge label={`Mode · ${d.mode || "—"}`} variant={modeVariant(d.mode)} />
          <Badge label={`Status · ${status}`} variant="info" />
        </View>
        <KeyValue label="Emergency type" value={meta.emergency_type || "—"} />
        <KeyValue label="Severity" value={meta.severity || "—"} />
        <KeyValue label="Symptoms" value={meta.symptoms || "—"} />
        <KeyValue label="Location" value={meta.location || "—"} />
      </Section>

      <Section title="Raphael Pulse context">
        <KeyValue label="Assigned hospital" value={decision?.assigned_hospital || emergency?.assigned_hospital || "Pending assignment"} />
        <KeyValue label="Assigned doctor" value={emergency?.assigned_doctor_id || "Pending"} />
        <KeyValue label="Communication mode" value={d.mode || "—"} />
        <KeyValue label="Priority class" value={d.priority || "—"} />
      </Section>

      {timeline.length > 0 ? (
        <Section title="Timeline">
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

      <PrimaryButton title="Back to profile" variant="secondary" onPress={() => navigation.navigate("Profile")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
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
    shadowOffset: { width: 0, height: 0 },
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
