/**
 * Centralised design tokens for the Raphael doctor app.
 *
 * Visual language: clinical workstation, focused and information-dense.
 */
export const colors = {
  // Canvas
  bg: "#eef1f5",
  bgElevated: "#ffffff",
  surface: "#ffffff",
  surfaceAlt: "#f5f7fa",
  surfaceHi: "#e9edf3",

  // Borders / dividers
  border: "#cfd7e3",
  borderStrong: "#b4c2d2",
  borderGlow: "#7fa4d1",

  // Brand
  primary: "#2f4f8f",
  primarySoft: "#4f6fae",
  primaryDeep: "#243d6f",
  accent: "#2e86ab",
  accentSoft: "rgba(46,134,171,0.12)",

  // Semantic
  success: "#2f8f62",
  successSoft: "rgba(47,143,98,0.14)",
  warning: "#c38a1b",
  warningSoft: "rgba(195,138,27,0.14)",
  danger: "#b64040",
  dangerSoft: "rgba(182,64,64,0.14)",
  info: "#406bb0",
  infoSoft: "rgba(64,107,176,0.16)",

  // Text
  textPrimary: "#1f2a38",
  textSecondary: "#546579",
  textMuted: "#6f7e90",
  textInverse: "#eef1f5",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
};

export const typography = {
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  h2: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  body: { fontSize: 14, color: colors.textPrimary },
  muted: { fontSize: 12, color: colors.textMuted, letterSpacing: 0.3 },
  mono: {
    fontSize: 13,
    color: colors.primarySoft,
    fontFamily: "Courier",
    letterSpacing: 0.5,
  },
};

export const elevation = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
};
