import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing, typography } from "../../theme";

export default function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  autoCapitalize = "sentences",
  secureTextEntry,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={typography.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, multiline && styles.multiline, focused && styles.inputFocused]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2 },
  input: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
    fontSize: 14,
  },
  inputFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  multiline: { minHeight: 84, textAlignVertical: "top" },
});
