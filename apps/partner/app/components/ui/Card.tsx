import React from 'react';
import { theme } from '../../styles/theme';

interface CardProps {
  children: React.ReactNode;
  padding?: string;
  hoverable?: boolean;
  border?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = theme.spacing[6],
  hoverable = false,
  border = true,
  onClick,
  style,
}) => {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        border: border ? `1px solid ${theme.colors.border}` : 'none',
        padding,
        boxShadow: theme.shadows.sm,
        cursor: hoverable ? 'pointer' : 'default',
        transition: theme.transitions.fast,
        ...(hoverable && {
          ':hover': {
            boxShadow: theme.shadows.hover,
            transform: 'translateY(-2px)',
          },
        }),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

Card.displayName = 'Card';
