import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Card, Pressable, FadeSlide } from '../components/AnimatedComponents';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';
const bold = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <FadeSlide delay={50}>
        <Card style={styles.card}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text, fontFamily: serif }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: body }]}>
              Sign in to consult the ancient epics
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.inputLabel, { color: theme.textTertiary, fontFamily: bold }]}>EMAIL</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, fontFamily: body }]}
              placeholder="name@example.com"
              placeholderTextColor={theme.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={[styles.inputLabel, { color: theme.textTertiary, fontFamily: bold }]}>PASSWORD</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, fontFamily: body }]}
              placeholder="••••••••"
              placeholderTextColor={theme.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Pressable onPress={login} disabled={loading}>
              <View style={[styles.button, { backgroundColor: theme.accent, opacity: loading ? 0.6 : 1 }]}>
                <Text style={[styles.buttonText, { fontFamily: bold }]}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Text>
              </View>
            </Pressable>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textSecondary, fontFamily: body }]}>
                Don't have an account?{' '}
              </Text>
              <Pressable onPress={() => router.push('/register')}>
                <Text style={[styles.linkText, { color: theme.accent, fontFamily: bold }]}>Register</Text>
              </Pressable>
            </View>

            <View style={{ marginTop: 14, alignItems: 'center' }}>
              <Pressable onPress={() => router.replace('/(tabs)')}>
                <Text style={[styles.skipText, { color: theme.textTertiary, fontFamily: body }]}>
                  Continue as Guest →
                </Text>
              </Pressable>
            </View>
          </View>
        </Card>
      </FadeSlide>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  buttonText: {
    color: '#09090B',
    fontWeight: '700',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
  },
  linkText: {
    fontSize: 13,
  },
  skipText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});