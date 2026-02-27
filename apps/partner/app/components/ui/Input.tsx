import React from 'react';
import { theme } from '../../styles/theme';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      icon,
      helperText,
      fullWidth = true,
      disabled = false,
      ...props
    },
    ref
  ) => {
    return (
      <div style={{ width: fullWidth ? '100%' : 'auto' }}>
        {label && (
          <label
            style={{
              display: 'block',
              marginBottom: theme.spacing[2],
              fontSize: '14px',
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text,
            }}
          >
            {label}
          </label>
        )}

        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <input
            ref={ref}
            disabled={disabled}
            style={{
              width: '100%',
              padding: `${theme.spacing[3]} ${icon ? theme.spacing[5] : theme.spacing[3]}`,
              paddingRight: icon ? theme.spacing[10] : theme.spacing[3],
              borderRadius: theme.borderRadius.md,
              border: `1.5px solid ${error ? theme.colors.danger : theme.colors.border}`,
              backgroundColor: disabled ? theme.colors.disabledBg : theme.colors.background,
              color: disabled ? theme.colors.disabled : theme.colors.text,
              fontSize: '14px',
              fontFamily: theme.typography.fontFamily.sans,
              transition: theme.transitions.fast,
              outline: 'none',
              '::placeholder': {
                color: theme.colors.textLight,
              },
            } as React.CSSProperties}
            {...props}
          />

          {icon && (
            <div
              style={{
                position: 'absolute',
                right: theme.spacing[3],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                color: theme.colors.textMuted,
              }}
            >
              {icon}
            </div>
          )}
        </div>

        {error && (
          <p
            style={{
              marginTop: theme.spacing[2],
              fontSize: '12px',
              color: theme.colors.danger,
              margin: `${theme.spacing[2]} 0 0 0`,
            }}
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            style={{
              marginTop: theme.spacing[2],
              fontSize: '12px',
              color: theme.colors.textMuted,
              margin: `${theme.spacing[2]} 0 0 0`,
            }}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
