import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { useTheme } from '../../src/context/ThemeContext';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [statusText, setStatusText] = useState('Verifying your email and activating account...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setStatusText(`Verification issue: ${error.message}`);
          setTimeout(() => router.replace('/login'), 3000);
          return;
        }

        if (data?.session) {
          setStatusText('✨ Email confirmed! Welcome to the Vedic Council.');
          setTimeout(() => router.replace('/(tabs)'), 1200);
        } else {
          // If no immediate session, listen for state change
          const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
              setStatusText('✨ Verification successful! Redirecting...');
              setTimeout(() => router.replace('/(tabs)'), 1000);
            }
          });
        }
      } catch (err: any) {
        setStatusText(`Verification error: ${err.message || 'Please try logging in.'}`);
        setTimeout(() => router.replace('/login'), 3000);
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.accent} style={{ marginBottom: 20 }} />
      <Text style={[styles.title, { color: theme.text, fontFamily: serif }]}>Activating Account</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: body }]}>{statusText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 340,
    lineHeight: 22,
  },
});
