import React from 'react';
import { theme } from '../../styles/theme';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      disabled = false,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const baseStyle: React.CSSProperties = {
      fontFamily: theme.typography.fontFamily.sans,
      fontWeight: theme.typography.fontWeight.semibold,
      border: 'none',
      borderRadius: theme.borderRadius.md,
      cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      transition: theme.transitions.default,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing[2],
      opacity: disabled || isLoading ? 0.6 : 1,
      width: fullWidth ? '100%' : 'auto',
      ...style,
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
        fontSize: '13px',
      },
      md: {
        padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
        fontSize: '14px',
      },
      lg: {
        padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
        fontSize: '15px',
      },
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: theme.colors.primary,
        color: 'white',
        boxShadow: theme.shadows.sm,
      },
      secondary: {
        backgroundColor: theme.colors.primarySoft,
        color: theme.colors.primary,
        border: `1.5px solid ${theme.colors.border}`,
      },
      danger: {
        backgroundColor: theme.colors.danger,
        color: 'white',
        boxShadow: theme.shadows.sm,
      },
      success: {
        backgroundColor: theme.colors.success,
        color: 'white',
        boxShadow: theme.shadows.sm,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: theme.colors.primary,
        border: `1.5px solid ${theme.colors.border}`,
      },
    };

    const hoverStyle = !disabled && !isLoading ? {
      ':hover': {
        boxShadow: theme.shadows.hover,
        transform: 'translateY(-2px)',
      },
    } : {};

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        style={{
          ...baseStyle,
          ...sizeStyles[size],
          ...variantStyles[variant],
        }}
        {...props}
      >
        {isLoading && (
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              border: `2px solid ${variant === 'secondary' || variant === 'ghost' ? theme.colors.primary : 'white'}`,
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
