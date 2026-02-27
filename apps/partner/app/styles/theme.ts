/**
 * Hillaha Partner Dashboard Design System
 * Color palette, spacing, shadows, and typography definitions
 */

export const theme = {
  // ============= COLORS =============
  colors: {
    // Primary purple theme
    primary: '#8B5CF6',
    primaryDark: '#6D28D9',
    primaryLight: '#A78BFA',
    primarySoft: '#EDE9FE',

    // Accent colors
    pink: '#EC4899',
    pinkSoft: '#FCE7F3',

    // Semantic colors
    success: '#10B981',
    successDark: '#059669',
    successLight: '#D1FAE5',

    warning: '#F59E0B',
    warningDark: '#D97706',
    warningLight: '#FEF3C7',

    danger: '#EF4444',
    dangerDark: '#DC2626',
    dangerLight: '#FEE2E2',

    info: '#3B82F6',
    infoDark: '#1D4ED8',
    infoLight: '#DBEAFE',

    // Neutral colors
    text: '#1F1B2E',
    textMuted: '#6B6480',
    textLight: '#9F9DB4',

    border: '#E7E3FF',
    borderLight: '#F3F0FF',

    surface: '#FFFFFF',
    background: '#FAFAFF',

    // Disabled state
    disabled: '#D1D5DB',
    disabledBg: '#F9FAFB',
  },

  // ============= SPACING =============
  spacing: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    9: '36px',
    10: '40px',
    12: '48px',
    14: '56px',
    16: '64px',
  },

  // ============= BORDER RADIUS =============
  borderRadius: {
    none: '0',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },

  // ============= SHADOWS =============
  shadows: {
    none: 'none',
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 2px 0 rgba(139, 92, 246, 0.1)',
    md: '0 4px 6px -1px rgba(139, 92, 246, 0.1), 0 2px 4px -1px rgba(139, 92, 246, 0.06)',
    lg: '0 10px 15px -3px rgba(139, 92, 246, 0.1), 0 4px 6px -2px rgba(139, 92, 246, 0.05)',
    xl: '0 20px 25px -5px rgba(139, 92, 246, 0.1), 0 10px 10px -5px rgba(139, 92, 246, 0.04)',
    hover: '0 8px 24px rgba(139, 92, 246, 0.15)',
    card: '0 1px 3px rgba(139,92,246,0.1)',
  },

  // ============= TYPOGRAPHY =============
  typography: {
    // Font families
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif',
      mono: '"JetBrains Mono", monospace',
    },

    // Font sizes
    fontSize: {
      xs: { size: '12px', lineHeight: '16px' },
      sm: { size: '13px', lineHeight: '18px' },
      base: { size: '14px', lineHeight: '20px' },
      lg: { size: '16px', lineHeight: '24px' },
      xl: { size: '18px', lineHeight: '26px' },
      '2xl': { size: '20px', lineHeight: '28px' },
      '3xl': { size: '24px', lineHeight: '32px' },
      '4xl': { size: '28px', lineHeight: '36px' },
      '5xl': { size: '32px', lineHeight: '40px' },
    },

    // Font weights
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },

  // ============= TRANSITIONS =============
  transitions: {
    fast: '150ms ease-in-out',
    default: '300ms ease-in-out',
    slow: '500ms ease-in-out',
  },

  // ============= Z-INDEX =============
  zIndex: {
    dropdown: 1000,
    sticky: 800,
    fixed: 900,
    modalBackdrop: 1200,
    modal: 1210,
    tooltip: 1300,
    notification: 1400,
  },
};

// ============= HELPER FUNCTIONS =============

/**
 * Returns CSS string for inline styling when needed
 * Used in React components for direct style props
 */
export const getCSSVariable = (path: string): string => {
  const keys = path.split('.');
  let value: any = theme;

  for (const key of keys) {
    value = value[key];
    if (!value) return '';
  }

  return String(value);
};

/**
 * Returns a responsive style object
 * Useful for inline styles with conditions
 */
export const createResponsiveStyle = (
  mobileStyle: React.CSSProperties,
  tabletStyle?: React.CSSProperties,
  desktopStyle?: React.CSSProperties
) => ({
  mobile: mobileStyle,
  tablet: tabletStyle || mobileStyle,
  desktop: desktopStyle || tabletStyle || mobileStyle,
});

export default theme;
