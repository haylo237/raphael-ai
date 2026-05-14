/**
 * Centralised design tokens for the Raphael nurse / health-worker app.
 *
 * Visual language: fast, operational, high legibility in busy conditions.
 */
export const colors = {
  // Canvas
  bg: "#f2f6f9",
  bgElevated: "#ffffff",
  surface: "#ffffff",
  surfaceAlt: "#eef3f7",
  surfaceHi: "#e5edf4",

  // Borders / dividers
  border: "#d1dbe7",
  borderStrong: "#b9c8d9",
  borderGlow: "#9ec8f6",

  // Brand
  primary: "#0f6aa8",
  primarySoft: "#2f8fce",
  primaryDeep: "#0b4f7d",
  accent: "#0ea879",
  accentSoft: "rgba(14,168,121,0.12)",

  // Semantic
  success: "#18845f",
  successSoft: "rgba(24,132,95,0.14)",
  warning: "#d18812",
  warningSoft: "rgba(209,136,18,0.14)",
  danger: "#ce3e3e",
  dangerSoft: "rgba(206,62,62,0.14)",
  info: "#2b72c8",
  infoSoft: "rgba(43,114,200,0.16)",

  // Text
  textPrimary: "#1a2a3a",
  textSecondary: "#4b6177",
  textMuted: "#6d8096",
  textInverse: "#f2f6f9",
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
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
};
