/**
 * Partner Mobile App - Theme & Colors
 * Consistent with Hillaha (حلّها) design system
 */

export const COLORS = {
  // Primary & Accent
  primary: "#8B5CF6",
  primaryDark: "#6D28D9",
  primarySoft: "#EDE9FE",
  pink: "#EC4899",
  pinkSoft: "#FCE7F3",

  // Deep purple for headers/overlays
  deepPurple: "#6D28D9",
  headerBg: "#1F0A3C",

  // Backgrounds
  bg: "#FAFAFF",
  surface: "#FFFFFF",

  // Typography
  text: "#1F1B2E",
  textMuted: "#6B6480",
  textLight: "#FFFFFF",

  // Semantic
  border: "#E7E3FF",
  success: "#34D399",
  successDark: "#059669",
  danger: "#EF4444",
  warning: "#F59E0B",
  warningDark: "#92400E",

  // Shadows
  shadowColor: "#000000",

  // Chat
  chatBubbleSelf: "#8B5CF6",
  chatBubbleOther: "#F3F0FF",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 19,
  "2xl": 22,
  "3xl": 26,
  "4xl": 32,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;
