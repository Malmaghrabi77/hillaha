import React from 'react';
import { theme } from '../../styles/theme';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  style,
}) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: theme.colors.primarySoft,
      color: theme.colors.primary,
    },
    success: {
      backgroundColor: theme.colors.successLight,
      color: theme.colors.successDark,
    },
    warning: {
      backgroundColor: theme.colors.warningLight,
      color: theme.colors.warningDark,
    },
    danger: {
      backgroundColor: theme.colors.dangerLight,
      color: theme.colors.dangerDark,
    },
    info: {
      backgroundColor: theme.colors.infoLight,
      color: theme.colors.infoDark,
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
      fontSize: '11px',
      fontWeight: theme.typography.fontWeight.semibold,
      borderRadius: theme.borderRadius.sm,
    },
    md: {
      padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
      fontSize: '12px',
      fontWeight: theme.typography.fontWeight.semibold,
      borderRadius: theme.borderRadius.md,
    },
    lg: {
      padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
      fontSize: '13px',
      fontWeight: theme.typography.fontWeight.semibold,
      borderRadius: theme.borderRadius.md,
    },
  };

  return (
    <span
      style={{
        display: 'inline-block',
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
    >
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';

// ====================================
// Spinner Component
// ====================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  style?: React.CSSProperties;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = theme.colors.primary,
  style,
}) => {
  const sizeMap: Record<string, number> = {
    sm: 20,
    md: 32,
    lg: 48,
  };

  const borderWidth = size === 'sm' ? 2 : size === 'md' ? 3 : 4;

  return (
    <div
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
        borderRadius: '50%',
        border: `${borderWidth}px solid ${theme.colors.border}`,
        borderTopColor: color,
        animation: 'spin 0.8s linear infinite',
        ...style,
      }}
    />
  );
};

Spinner.displayName = 'Spinner';
