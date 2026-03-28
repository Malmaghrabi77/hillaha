import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

/**
 * Animation Components (Emoji-based fallbacks)
 * No native dependencies required
 */

interface AnimationProps {
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  style?: any;
}

export const LoadingAnimation: React.FC<AnimationProps> = ({
  width = 100,
  height = 100,
  style,
}) => (
  <View style={{ width, height, justifyContent: 'center', alignItems: 'center', ...style }}>
    <ActivityIndicator size="large" color="#8B5CF6" />
  </View>
);

export const SuccessAnimation: React.FC<AnimationProps> = ({
  width = 120,
  height = 120,
  style,
}) => (
  <View style={{ width, height, justifyContent: 'center', alignItems: 'center', ...style }}>
    <Text style={{ fontSize: 52 }}>✅</Text>
  </View>
);

export const ErrorAnimation: React.FC<AnimationProps> = ({
  width = 120,
  height = 120,
  style,
}) => (
  <View style={{ width, height, justifyContent: 'center', alignItems: 'center', ...style }}>
    <Text style={{ fontSize: 52 }}>❌</Text>
  </View>
);

export const EmptyStateAnimation: React.FC<AnimationProps> = ({
  width = 150,
  height = 150,
  style,
}) => (
  <View style={{ width, height, justifyContent: 'center', alignItems: 'center', ...style }}>
    <Text style={{ fontSize: 52 }}>📭</Text>
  </View>
);

export const DeliveryAnimation: React.FC<AnimationProps> = ({
  width = 200,
  height = 200,
  style,
}) => (
  <View style={{ width, height, justifyContent: 'center', alignItems: 'center', ...style }}>
    <Text style={{ fontSize: 52 }}>🛵</Text>
  </View>
);

export const PaymentAnimation: React.FC<AnimationProps> = ({
  width = 150,
  height = 150,
  style,
}) => (
  <View style={{ width, height, justifyContent: 'center', alignItems: 'center', ...style }}>
    <Text style={{ fontSize: 52 }}>💳</Text>
  </View>
);

export const CelebrationAnimation: React.FC<AnimationProps> = ({
  width = 200,
  height = 200,
  style,
}) => (
  <View style={{ width, height, justifyContent: 'center', alignItems: 'center', ...style }}>
    <Text style={{ fontSize: 52 }}>🎉</Text>
  </View>
);

interface ResultScreenProps {
  type: 'success' | 'error' | 'empty';
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  type,
  title,
  subtitle,
  actionButton,
}) => {
  const animations = {
    success: <SuccessAnimation />,
    error: <ErrorAnimation />,
    empty: <EmptyStateAnimation />,
  };

  return (
    <View style={styles.container}>
      {animations[type]}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionButton && <View style={styles.actionButton}>{actionButton}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1F1B2E',
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B6480',
    marginTop: 8,
    textAlign: 'center',
  },
  actionButton: {
    marginTop: 24,
  },
});

export const AnimationPresets = {
  loading: { source: 'loading', loop: true, autoPlay: true },
  success: { source: 'success', loop: false, autoPlay: true },
  error: { source: 'error', loop: false, autoPlay: true },
  empty: { source: 'empty', loop: true, autoPlay: true },
  delivery: { source: 'delivery', loop: true, autoPlay: true },
  payment: { source: 'payment', loop: false, autoPlay: true },
  celebration: { source: 'celebration', loop: false, autoPlay: true },
};
