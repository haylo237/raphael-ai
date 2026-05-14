import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../theme";

const VARIANTS = {
  default: { bg: colors.surfaceHi, fg: colors.textSecondary, dot: colors.textMuted },
  success: { bg: colors.successSoft, fg: colors.success, dot: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning, dot: colors.warning },
  danger:  { bg: colors.dangerSoft,  fg: colors.danger,  dot: colors.danger },
  info:    { bg: colors.infoSoft,    fg: colors.info,    dot: colors.info },
};

export default function Badge({ label, variant = "default", pulse = false }) {
  const v = VARIANTS[variant] || VARIANTS.default;
  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.fg }]}>
      <View
        style={[
          styles.dot,
          { backgroundColor: v.dot, shadowColor: v.dot },
          pulse && styles.dotPulse,
        ]}
      />
      <Text style={[styles.text, { color: v.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotPulse: {
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  text: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase" },
});
