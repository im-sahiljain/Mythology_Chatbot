import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Pressable } from './AnimatedComponents';

const label = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_600SemiBold';

export const OptionChips: React.FC<{
  options: string[];
  onSelect: (o: string) => void;
}> = ({ options, onSelect }) => {
  const { theme } = useTheme();
  if (!options || options.length === 0) return null;

  return (
    <View style={s.wrap}>
      <Text style={[s.label, { color: theme.textTertiary, fontFamily: label }]}>REFINE YOUR PATH</Text>
      {options.map((opt, i) => (
        <ChipItem key={i} index={i} option={opt} onSelect={onSelect} />
      ))}
    </View>
  );
};

const ChipItem: React.FC<{ index: number; option: string; onSelect: (o: string) => void }> = ({ index, option, onSelect }) => {
  const { theme } = useTheme();
  const o = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(o, { toValue: 1, duration: 300, delay: index * 80, useNativeDriver: true }),
      Animated.spring(x, { toValue: 0, delay: index * 80, friction: 10, tension: 55, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: o, transform: [{ translateX: x }] }}>
      <Pressable onPress={() => onSelect(option)}>
        <View style={[s.chip, { backgroundColor: theme.accentSubtle, borderColor: theme.surfaceBorder }]}>
          <View style={[s.dot, { backgroundColor: theme.accent }]} />
          <Text style={[s.chipText, { color: theme.text, fontFamily: body }]}>{option}</Text>
          <Text style={[s.arrow, { color: theme.textTertiary }]}>→</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  wrap: { marginTop: 16 },
  label: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' },
  chip: { borderWidth: 1, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, marginRight: 12 },
  chipText: { fontSize: 14, flex: 1, lineHeight: 20 },
  arrow: { fontSize: 14, marginLeft: 8 },
});
