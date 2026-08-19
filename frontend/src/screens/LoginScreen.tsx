import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { supabase } from '../services/supabase';
import { API_BASE_URL } from '../services/api';

import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Card, Pressable, FadeSlide } from '../components/AnimatedComponents';
import { Feather } from '@expo/vector-icons';



const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';
const bold = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(false);
  const [resending, setResending] = useState(false);


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
    setUnconfirmedEmail(false);
    console.log('🔄 [Login] Calling /api/auth/login for:', email.trim());
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setLoading(false);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.detail || 'Invalid login credentials';
        console.error('❌ [Login Error]:', errMsg);
        if (errMsg.toLowerCase().includes('email not confirmed')) {
          setUnconfirmedEmail(true);
        } else {
          alert(`Sign In Error: ${errMsg}`);
        }
        return;
      }

      const authData = await res.json();
      if (authData.access_token) {
        await supabase.auth.setSession({
          access_token: authData.access_token,
          refresh_token: authData.access_token,
        });
      }

      console.log('✅ [Login Success]');
      router.replace('/(tabs)');
    } catch (err: any) {
      setLoading(false);
      console.error('❌ [Login Exception]:', err);
      alert(`Unexpected Network Error: ${err?.message || err}`);
    }


  };

  const resendConfirmation = async () => {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    setResending(false);

    if (error) {
      alert(error.message);
    } else {
      alert('✨ Verification email resent! Please check your inbox.');
    }
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

          {unconfirmedEmail && (
            <View style={[styles.unconfirmedBanner, { backgroundColor: 'rgba(234, 179, 8, 0.12)', borderColor: 'rgba(234, 179, 8, 0.3)' }]}>
              <Text style={{ fontSize: 13, color: '#EAB308', fontFamily: bold }}>Email Not Verified Yet</Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4, lineHeight: 18 }}>
                Please click the confirmation link sent to your inbox to activate your account.
              </Text>
              <Pressable onPress={resendConfirmation} disabled={resending} style={{ marginTop: 8 }}>
                <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' }}>
                  {resending ? 'Resending...' : 'Resend Verification Link →'}
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.form}>
            <Text style={[styles.inputLabel, { color: theme.textTertiary, fontFamily: bold }]}>EMAIL</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, fontFamily: body }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.isDark ? '#666' : '#999'}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={[styles.inputLabel, { color: theme.textTertiary, fontFamily: bold }]}>PASSWORD</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.passwordInput, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, fontFamily: body }]}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={theme.isDark ? '#666' : '#999'}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((prev) => !prev)}
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>





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
                  Continue as Guest (3 turns) →
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
  unconfirmedBanner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
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
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 8,
  },
  passwordInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 44,
    paddingVertical: 12,
    fontSize: 14,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  eyeIcon: {
    fontSize: 18,
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