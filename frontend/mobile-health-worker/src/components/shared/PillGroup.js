import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, radius, spacing } from "../../theme";

export default function PillGroup({ options, value, onChange, multi = false }) {
  function toggle(opt) {
    if (multi) {
      const current = Array.isArray(value) ? value : [];
      onChange(current.includes(opt) ? current.filter((x) => x !== opt) : [...current, opt]);
    } else {
      onChange(opt);
    }
  }
  function active(opt) {
    return multi ? Array.isArray(value) && value.includes(opt) : value === opt;
  }
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const isActive = active(opt);
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => toggle(opt)}
            style={[styles.pill, isActive && styles.pillActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: {
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.md + 2,
    backgroundColor: colors.surfaceAlt,
  },
  pillActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  pillText: { color: colors.textSecondary, fontWeight: "600", fontSize: 12, letterSpacing: 0.4 },
  pillTextActive: { color: colors.primarySoft, fontWeight: "800" },
});
