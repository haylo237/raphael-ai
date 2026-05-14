/**
 * Centralised design tokens for the Raphael patient app.
 *
 * Visual language: calm, reassuring, simple.
 */
export const colors = {
  // Canvas
  bg: "#f5f9ff",
  bgElevated: "#ffffff",
  surface: "#ffffff",
  surfaceAlt: "#eef4ff",
  surfaceHi: "#e6f0ff",

  // Borders / dividers
  border: "#d8e5f8",
  borderStrong: "#bfd3ef",
  borderGlow: "#a8c6ef",

  // Brand
  primary: "#2f6ecf",
  primarySoft: "#5f8fe0",
  primaryDeep: "#1f4f97",
  accent: "#20a58f",
  accentSoft: "rgba(32,165,143,0.14)",

  // Semantic
  success: "#2d9b73",
  successSoft: "rgba(45,155,115,0.14)",
  warning: "#d79c2c",
  warningSoft: "rgba(215,156,44,0.14)",
  danger: "#d44545",
  dangerSoft: "rgba(212,69,69,0.14)",
  info: "#3f78d7",
  infoSoft: "rgba(63,120,215,0.16)",

  // Text
  textPrimary: "#1c2a3a",
  textSecondary: "#4f6280",
  textMuted: "#6f7f98",
  textInverse: "#f5f9ff",
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
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
};
