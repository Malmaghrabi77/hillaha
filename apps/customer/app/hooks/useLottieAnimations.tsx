import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * ✅ Lottie Animations
 * رسوم متحركة جميلة للحالات المختلفة
 */

interface AnimationProps {
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  style?: any;
}

// ✅ Loading Animation
export const LoadingAnimation: React.FC<AnimationProps> = ({
  width = 100,
  height = 100,
  autoPlay = true,
  loop = true,
  speed = 1,
  style,
}) => {
  return (
    <View style={{ width, height, ...style }}>
      <LottieView
        source={require('../../assets/animations/loading.json')}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
};

// ✅ Success Animation
export const SuccessAnimation: React.FC<AnimationProps> = ({
  width = 120,
  height = 120,
  autoPlay = true,
  loop = false,
  speed = 1,
  style,
}) => {
  return (
    <View style={{ width, height, ...style }}>
      <LottieView
        source={require('../../assets/animations/success.json')}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
};

// ✅ Error Animation
export const ErrorAnimation: React.FC<AnimationProps> = ({
  width = 120,
  height = 120,
  autoPlay = true,
  loop = false,
  speed = 1,
  style,
}) => {
  return (
    <View style={{ width, height, ...style }}>
      <LottieView
        source={require('../../assets/animations/error.json')}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
};

// ✅ Empty State Animation
export const EmptyStateAnimation: React.FC<AnimationProps> = ({
  width = 150,
  height = 150,
  autoPlay = true,
  loop = true,
  speed = 0.8,
  style,
}) => {
  return (
    <View style={{ width, height, ...style }}>
      <LottieView
        source={require('../../assets/animations/empty.json')}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
};

// ✅ Delivery Animation
export const DeliveryAnimation: React.FC<AnimationProps> = ({
  width = 200,
  height = 200,
  autoPlay = true,
  loop = true,
  speed = 1,
  style,
}) => {
  return (
    <View style={{ width, height, ...style }}>
      <LottieView
        source={require('../../assets/animations/delivery.json')}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
};

// ✅ Payment Animation
export const PaymentAnimation: React.FC<AnimationProps> = ({
  width = 150,
  height = 150,
  autoPlay = true,
  loop = false,
  speed = 1,
  style,
}) => {
  return (
    <View style={{ width, height, ...style }}>
      <LottieView
        source={require('../../assets/animations/payment.json')}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
};

// ✅ Celebration Animation
export const CelebrationAnimation: React.FC<AnimationProps> = ({
  width = 200,
  height = 200,
  autoPlay = true,
  loop = false,
  speed = 1,
  style,
}) => {
  return (
    <View style={{ width, height, ...style }}>
      <LottieView
        source={require('../../assets/animations/celebration.json')}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
};

// ✅ Result Screen with Animation
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

// ✅ Animation presets for different scenarios
export const AnimationPresets = {
  loading: { source: 'loading', loop: true, autoPlay: true },
  success: { source: 'success', loop: false, autoPlay: true },
  error: { source: 'error', loop: false, autoPlay: true },
  empty: { source: 'empty', loop: true, autoPlay: true },
  delivery: { source: 'delivery', loop: true, autoPlay: true },
  payment: { source: 'payment', loop: false, autoPlay: true },
  celebration: { source: 'celebration', loop: false, autoPlay: true },
};
