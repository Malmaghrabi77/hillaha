/**
 * Partner Mobile App - Theme & Colors
 * Consistent with Hillaha design system
 */

export const COLORS = {
  // Primary & Accent
  primary: "#8B5CF6",        // Purple
  primarySoft: "#EDE9FE",    // Light purple
  pink: "#EC4899",
  pinkSoft: "#FCE7F3",

  // Backgrounds
  bg: "#FAFAFF",             // Almost white
  surface: "#FFFFFF",        // White (cards)

  // Typography
  text: "#1F1B2E",           // Dark text
  textMuted: "#6B6480",      // Gray text

  // Semantic
  border: "#E7E3FF",
  success: "#34D399",        // Green
  danger: "#EF4444",         // Red
  warning: "#F59E0B",        // Amber

  // Shadows
  shadowColor: "#000000",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const FONT_SIZES = {
  xs: 12,
  sm: 13,
  base: 14,
  lg: 16,
  xl: 18,
  "2xl": 20,
  "3xl": 24,
  "4xl": 32,
} as const;

export const FONT_WEIGHTS = {
  light: "300",
  normal: "400",
  semibold: "600",
  bold: "700",
  extrabold: "900",
} as const;
