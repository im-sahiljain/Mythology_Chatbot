import React from 'react';
import { Tabs } from 'expo-router';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { Pressable } from '../../src/components/AnimatedComponents';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const label = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';

export default function TabLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.bgSecondary,
          borderBottomWidth: 1,
          borderBottomColor: theme.divider,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleAlign: 'center',
        headerRightContainerStyle: {
          paddingRight: 12,
          justifyContent: 'center',
          alignItems: 'center',
        },
        headerRight: () => (
          <Pressable onPress={toggleTheme}>
            <View
              style={[
                styles.themeBtn,
                {
                  backgroundColor: theme.surfaceHover,
                  borderColor: theme.surfaceBorder,
                },
              ]}
            >
              <Text style={{ fontSize: 16 }}>{theme.isDark ? '☀️' : '🌙'}</Text>
            </View>
          </Pressable>
        ),
        tabBarStyle: {
          backgroundColor: theme.bgSecondary,
          borderTopWidth: 1,
          borderTopColor: theme.divider,
          height: Platform.OS === 'ios' ? 84 : 62,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          fontFamily: label,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scholar',
          headerTitle: () => (
            <Text style={[styles.headerTitle, { color: theme.text, fontFamily: serif }]}>
              Epic Scholar
            </Text>
          ),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 17 }}>📜</Text>,
        }}
      />
      <Tabs.Screen
        name="persona"
        options={{
          title: 'Persona',
          headerTitle: () => (
            <Text style={[styles.headerTitle, { color: theme.text, fontFamily: serif }]}>
              Speak with Legends
            </Text>
          ),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 17 }}>👑</Text>,
        }}
      />
      <Tabs.Screen
        name="adaptive"
        options={{
          title: 'Adaptive',
          headerTitle: () => (
            <Text style={[styles.headerTitle, { color: theme.text, fontFamily: serif }]}>
              Adaptive Clarity
            </Text>
          ),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 17 }}>⚖️</Text>,
        }}
      />
      <Tabs.Screen
        name="two-turn"
        options={{
          title: '2-Turn',
          headerTitle: () => (
            <Text style={[styles.headerTitle, { color: theme.text, fontFamily: serif }]}>
              2-Step Decision Tree
            </Text>
          ),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 17 }}>🔄</Text>,
        }}
      />
      <Tabs.Screen
        name="progressive"
        options={{
          title: 'Dialogue',
          headerTitle: () => (
            <Text style={[styles.headerTitle, { color: theme.text, fontFamily: serif }]}>
              Progressive Dialogue
            </Text>
          ),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 17 }}>💬</Text>,
        }}
      />
      <Tabs.Screen
        name="counselor"
        options={{
          title: 'Counselor',
          headerTitle: () => (
            <Text style={[styles.headerTitle, { color: theme.text, fontFamily: serif }]}>
              Socratic Counselor
            </Text>
          ),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 17 }}>🧘</Text>,
        }}
      />
      <Tabs.Screen
        name="full-chat"
        options={{
          title: 'Full Chat',
          headerTitle: () => (
            <Text style={[styles.headerTitle, { color: theme.text, fontFamily: serif }]}>
              Full Interactive Chat
            </Text>
          ),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 17 }}>🧠</Text>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
