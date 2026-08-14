import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/* ── FadeSlide: entrance animation ────────────────────── */
export const FadeSlide: React.FC<{
  delay?: number;
  duration?: number;
  from?: 'bottom' | 'left' | 'right';
  distance?: number;
  children: React.ReactNode;
  style?: any;
}> = ({ delay = 0, duration = 400, from = 'bottom', distance = 16, children, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(
    from === 'left' ? -distance : from === 'right' ? distance : distance
  )).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true }),
      Animated.spring(translate, { toValue: 0, delay, friction: 12, tension: 65, useNativeDriver: true }),
    ]).start();
  }, []);

  const transformKey = from === 'bottom' ? 'translateY' : 'translateX';
  return (
    <Animated.View style={[{ opacity, transform: [{ [transformKey]: translate }] }, style]}>
      {children}
    </Animated.View>
  );
};

/* ── Pressable: scale-spring on press ─────────────────── */
export const Pressable: React.FC<{
  onPress: () => void;
  disabled?: boolean;
  scale?: number;
  style?: any;
  children: React.ReactNode;
}> = ({ onPress, disabled, scale = 0.97, style, children }) => {
  const s = useRef(new Animated.Value(1)).current;
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => Animated.spring(s, { toValue: scale, friction: 5, tension: 300, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(s, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start()}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View style={[{ transform: [{ scale: s }] }, style]}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

/* ── TypingDots: animated 3-dot loader ────────────────── */
export const TypingDots: React.FC<{ color?: string }> = ({ color }) => {
  const { theme } = useTheme();
  const c = color || theme.accent;
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.timing(d, { toValue: 1, duration: 350, delay: i * 140, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0.3, duration: 350, useNativeDriver: true }),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{
            width: 6, height: 6, borderRadius: 3, backgroundColor: c,
            opacity: d,
            transform: [{ scale: d.interpolate({ inputRange: [0.3, 1], outputRange: [0.7, 1.15] }) }],
          }}
        />
      ))}
    </View>
  );
};

/* ── Card: clean bordered container ───────────────────── */
export const Card: React.FC<{
  children: React.ReactNode;
  style?: any;
  noPadding?: boolean;
}> = ({ children, style, noPadding }) => {
  const { theme } = useTheme();
  return (
    <View style={[
      cardStyles.base,
      {
        backgroundColor: theme.surface,
        borderColor: theme.surfaceBorder,
        ...(Platform.OS === 'web' ? { boxShadow: `0 1px 3px ${theme.shadow}` } as any : {
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
          elevation: 2,
        }),
      },
      noPadding && { padding: 0 },
      style,
    ]}>
      {children}
    </View>
  );
};

const cardStyles = StyleSheet.create({
  base: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
});
