export const HillahColors = {
  primary: "#8B5CF6",
  primarySoft: "#EDE9FE",
  pink: "#EC4899",
  pinkSoft: "#FCE7F3",
  bg: "#FAFAFF",
  surface: "#FFFFFF",
  border: "#E7E3FF",
  text: "#1F1B2E",
  textMuted: "#6B6480",
  success: "#34D399",
  warning: "#F59E0B",
  danger: "#EF4444",
  deepPurple: "#6D28D9",
} as const;

export const HillahRadius = { card: 16, button: 14, input: 12 } as const;

export const HILLAHA_THEME = { colors: HillahColors, radius: HillahRadius } as const;
