/**
 * Centralised design tokens for the Raphael nurse app.
 *
 * Visual language: futuristic medical — dark navy canvas, cyan tech accent,
 * subtle borders, glow on primary actions, monospace for IDs/timestamps.
 */
export const colors = {
  // Canvas
  bg: "#06101f",
  bgElevated: "#0d1b2a",
  surface: "#11243a",
  surfaceAlt: "#0f1e30",
  surfaceHi: "#173552",

  // Borders / dividers
  border: "#1f3a5a",
  borderStrong: "#2a4d75",
  borderGlow: "#1a4d6e",

  // Brand
  primary: "#4cc9f0",      // cyan — primary tech accent
  primarySoft: "#7fdcff",
  primaryDeep: "#0a3d62",
  accent: "#22d3ee",        // bright teal accent
  accentSoft: "rgba(34,211,238,0.12)",

  // Semantic
  success: "#34d399",
  successSoft: "rgba(52,211,153,0.14)",
  warning: "#fbbf24",
  warningSoft: "rgba(251,191,36,0.14)",
  danger: "#ff5470",
  dangerSoft: "rgba(255,84,112,0.14)",
  info: "#60a5fa",
  infoSoft: "rgba(96,165,250,0.16)",

  // Text
  textPrimary: "#e6f1ff",
  textSecondary: "#9fb6cf",
  textMuted: "#6e8aa8",
  textInverse: "#06101f",
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
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
};
