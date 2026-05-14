import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, elevation, radius, spacing, typography } from "../../theme";

export default function Section({ title, children, style, glow }) {
  return (
    <View style={[styles.card, glow && styles.glow, style]}>
      {title ? (
        <View style={styles.titleRow}>
          <View style={styles.dot} />
          <Text style={[typography.h2, styles.title]}>{title}</Text>
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.card,
  },
  glow: {
    borderColor: colors.borderGlow,
    ...elevation.glow,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  title: { marginBottom: 0 },
  body: { gap: spacing.md },
});
