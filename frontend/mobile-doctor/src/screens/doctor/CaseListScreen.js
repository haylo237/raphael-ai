import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Badge from "../../components/shared/Badge";
import PillGroup from "../../components/shared/PillGroup";
import RoleHero from "../../components/shared/RoleHero";
import Screen from "../../components/shared/Screen";
import Section from "../../components/shared/Section";
import { colors, spacing, typography } from "../../theme";
import { listEmergencies, listConsultations } from "../../services/api";

const TABS = ["Emergencies", "Consultations"];
const STATUS_FILTERS = ["all", "pending", "in_progress", "resolved"];

export default function CaseListScreen({ navigation }) {
  const [tab, setTab] = useState("Emergencies");
  const [status, setStatus] = useState("all");
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    let res;
    if (tab === "Emergencies") {
      res = await listEmergencies(status === "all" ? undefined : status);
    } else {
      res = await listConsultations(status === "all" ? {} : { status });
    }
    setItems(Array.isArray(res?.data) ? res.data : []);
  }, [tab, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen subtitle="Clinical workflow queue" title="Cases">
      <RoleHero
        eyebrow="Assigned Cases"
        title="Urgency-first case list"
        subtitle="Open any case to access full consultation context and emergency actions."
      />

      <PillGroup label="Type" options={TABS} value={tab} onChange={setTab} />
      <PillGroup label="Status" options={STATUS_FILTERS} value={status} onChange={setStatus} />

      <Section title={`${tab} · ${items.length}`}>
        {items.length === 0 ? (
          <Text style={typography.muted}>No items.</Text>
        ) : (
          items.map((it) => (
            <TouchableOpacity
              key={it.id}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate("Consultation", tab === "Emergencies" ? { emergencyId: it.id } : { consultationId: it.id })
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{it.patient_name || it.patient_id || "Patient"}</Text>
                <Text style={[typography.mono, { fontSize: 11 }]}>{it.id}</Text>
                <Text style={typography.muted}>
                  {tab === "Emergencies"
                    ? `${it.emergency_type || "—"} · ${it.location || "Unknown"}`
                    : it.notes || "No notes"}
                </Text>
              </View>
              <Badge
                label={(tab === "Emergencies" ? it.severity || it.status : it.status) || "—"}
                variant={
                  ["high", "critical", "pending"].includes(String(it.severity || it.status).toLowerCase())
                    ? "danger"
                    : it.status === "resolved"
                    ? "success"
                    : "info"
                }
              />
            </TouchableOpacity>
          ))
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, gap: spacing.md },
  rowTitle: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
});
