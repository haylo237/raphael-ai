import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { colors, radius, spacing } from "../../theme";

export default function PrimaryButton({ title, onPress, disabled, loading, variant = "primary" }) {
  const styleByVariant = {
    primary: {
      bg: colors.primary,
      border: colors.primary,
      text: colors.textInverse,
      glow: colors.primary,
    },
    danger: {
      bg: colors.danger,
      border: colors.danger,
      text: "#ffffff",
      glow: colors.danger,
    },
    secondary: {
      bg: colors.surface,
      border: colors.borderStrong,
      text: colors.textPrimary,
      glow: null,
    },
    ghost: {
      bg: "transparent",
      border: "transparent",
      text: colors.primarySoft,
      glow: null,
    },
  };
  const v = styleByVariant[variant] || styleByVariant.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.btn,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          shadowColor: v.glow || "transparent",
        },
        v.glow && styles.glow,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[styles.text, { color: v.text }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
    borderWidth: 1,
  },
  glow: {
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  text: { fontWeight: "800", fontSize: 14, letterSpacing: 1.2, textTransform: "uppercase" },
  disabled: { opacity: 0.5 },
});
