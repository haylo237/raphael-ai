import React from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../theme";

export default function Screen({ title, subtitle, children, scroll = true, footer }) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Body
        contentContainerStyle={scroll ? styles.container : undefined}
        style={!scroll ? styles.container : undefined}
        showsVerticalScrollIndicator={false}
      >
        {title || subtitle ? (
          <View style={styles.header}>
            {subtitle ? <Text style={typography.subtitle}>{subtitle}</Text> : null}
            {title ? <Text style={[typography.title, styles.title]}>{title}</Text> : null}
            <View style={styles.headerAccent} />
          </View>
        ) : null}
        {children}
      </Body>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl + spacing.lg },
  header: { marginBottom: spacing.lg, gap: spacing.xs },
  title: { marginTop: spacing.xs },
  headerAccent: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
});
