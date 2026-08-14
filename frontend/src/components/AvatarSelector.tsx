import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export interface CharacterItem {
  name: string;
  epic: 'Ramayana' | 'Mahabharata';
  icon: string;
  role: string;
  subtitle: string;
}

export const AVAILABLE_CHARACTERS: CharacterItem[] = [
  { name: 'Sita', epic: 'Ramayana', icon: '🌸', role: 'Moral Dignity', subtitle: 'Princess of Mithila' },
  { name: 'Krishna', epic: 'Mahabharata', icon: '🪶', role: 'Karma Guide', subtitle: 'Divine Strategist' },
  { name: 'Vibhishana', epic: 'Ramayana', icon: '🛡️', role: 'Righteous Defector', subtitle: 'Truth over Kinship' },
  { name: 'Drona', epic: 'Mahabharata', icon: '🏹', role: 'Master Preceptor', subtitle: 'Archery Guru' },
  { name: 'Arjuna', epic: 'Mahabharata', icon: '🎯', role: 'Reluctant Warrior', subtitle: 'Duty vs Family' },
  { name: 'Karna', epic: 'Mahabharata', icon: '🌅', role: 'Tragic Hero', subtitle: 'Unwavering Loyalty' },
  { name: 'Sugriva', epic: 'Ramayana', icon: '👑', role: 'Alliance King', subtitle: 'Vanara Sovereign' },
];

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const label = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';

export const AvatarSelector: React.FC<{
  selectedCharacter: string;
  onSelect: (c: CharacterItem) => void;
}> = ({ selectedCharacter, onSelect }) => {
  const { theme } = useTheme();
  const active = AVAILABLE_CHARACTERS.find(c => c.name.toLowerCase() === selectedCharacter.toLowerCase()) || AVAILABLE_CHARACTERS[0];

  // Subtle pulse on selected
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 1100, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
    ])).start();
  }, []);

  // Banner entrance
  const bannerY = useRef(new Animated.Value(8)).current;
  const bannerO = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    bannerY.setValue(8);
    bannerO.setValue(0);
    Animated.parallel([
      Animated.spring(bannerY, { toValue: 0, friction: 10, tension: 60, useNativeDriver: true }),
      Animated.timing(bannerO, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [selectedCharacter]);

  return (
    <View style={s.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {AVAILABLE_CHARACTERS.map(c => {
          const sel = selectedCharacter.toLowerCase() === c.name.toLowerCase();
          return (
            <TouchableOpacity key={c.name} style={s.item} onPress={() => onSelect(c)} activeOpacity={0.7}>
              {sel ? (
                <Animated.View style={[s.avatar, s.avatarActive, {
                  borderColor: theme.accent,
                  backgroundColor: theme.accentSubtle,
                  transform: [{ scale: pulse }],
                }]}>
                  <Text style={s.emoji}>{c.icon}</Text>
                </Animated.View>
              ) : (
                <View style={[s.avatar, { borderColor: theme.surfaceBorder, backgroundColor: theme.bgTertiary }]}>
                  <Text style={s.emoji}>{c.icon}</Text>
                </View>
              )}
              <Text style={[s.name, { color: sel ? theme.accent : theme.textTertiary, fontFamily: sel ? label : body }]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Animated.View style={[s.banner, {
        backgroundColor: theme.bgTertiary,
        borderColor: theme.surfaceBorder,
        opacity: bannerO,
        transform: [{ translateY: bannerY }],
      }]}>
        <Text style={[s.bannerName, { color: theme.text, fontFamily: serif }]}>{active.name}</Text>
        <Text style={[s.bannerRole, { color: theme.textSecondary, fontFamily: body }]}>{active.role} · {active.subtitle}</Text>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { marginBottom: 8 },
  scroll: { paddingHorizontal: 2, paddingVertical: 8, alignItems: 'center' },
  item: { alignItems: 'center', marginRight: 16, width: 64 },
  avatar: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, marginBottom: 5 },
  avatarActive: { borderWidth: 2 },
  emoji: { fontSize: 22 },
  name: { fontSize: 11, textAlign: 'center' },
  banner: { marginTop: 8, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  bannerName: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  bannerRole: { fontSize: 12, opacity: 0.8 },
});
