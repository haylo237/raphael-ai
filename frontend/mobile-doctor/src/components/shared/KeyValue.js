import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../theme";

export default function KeyValue({ label, value, mono }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, mono && typography.mono]}>{value ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 6,
    gap: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    ...typography.label,
    flexShrink: 0,
    color: colors.textMuted,
  },
  value: {
    ...typography.body,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
    color: colors.textPrimary,
  },
});
