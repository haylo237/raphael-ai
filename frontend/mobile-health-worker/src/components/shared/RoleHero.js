import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../theme";

export default function RoleHero({ eyebrow, title, subtitle }) {
  return (
    <View style={styles.wrap}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  eyebrow: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    fontSize: 22,
  },
  subtitle: {
    ...typography.muted,
    marginTop: spacing.xs,
  },
});
