import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Card, Pressable, FadeSlide } from '../components/AnimatedComponents';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';
const bold = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';

export default function RegisterScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const register = async () => {
    if (!email || !password) {
      alert('Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (!email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    console.log('🔄 [Register] Calling supabase.auth.signUp for:', email.trim());
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || 'Seeker',
          },
        },
      });
      setLoading(false);

      if (error) {
        console.error('❌ [Supabase Register Error Details]:', {
          message: error.message,
          name: error.name,
          status: (error as any).status,
          fullErrorObj: error
        });
        alert(`Registration Error: ${error.message}\n(Check browser console F12 for full details)`);
        return;
      }

      console.log('✅ [Register Success Data]:', data);
      if (data?.session) {
        router.replace('/(tabs)');
      } else {
        setEmailSent(true);
      }
    } catch (err: any) {
      setLoading(false);
      console.error('❌ [Register Exception]:', err);
      alert(`Unexpected Network Error: ${err?.message || err}\nPlease check network/CORS settings or open F12 Console.`);
    }
  };

  if (emailSent) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <FadeSlide delay={50}>
          <Card style={styles.card}>
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>📩</Text>
              <Text style={[styles.title, { color: theme.text, fontFamily: serif, textAlign: 'center' }]}>
                Check Your Inbox
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: body, textAlign: 'center', marginTop: 8 }]}>
                We have sent a confirmation link to{'\n'}
                <Text style={{ color: theme.accent, fontWeight: '700' }}>{email}</Text>
              </Text>
              <Text style={{ fontSize: 13, color: theme.textTertiary, textAlign: 'center', marginTop: 14, lineHeight: 20 }}>
                Click the link in the email to activate your account and enjoy unlimited consultations.
              </Text>

              <Pressable onPress={() => router.replace('/login')} style={{ width: '100%', marginTop: 24 }}>
                <View style={[styles.button, { backgroundColor: theme.accent }]}>
                  <Text style={[styles.buttonText, { fontFamily: bold }]}>Go to Sign In</Text>
                </View>
              </Pressable>
            </View>
          </Card>
        </FadeSlide>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <FadeSlide delay={50}>
        <Card style={styles.card}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text, fontFamily: serif }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: body }]}>
              Join to unlock unlimited Vedic consultations
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.inputLabel, { color: theme.textTertiary, fontFamily: bold }]}>YOUR NAME</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, fontFamily: body }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Arjuna"
              placeholderTextColor={theme.isDark ? '#666' : '#999'}
            />

            <Text style={[styles.inputLabel, { color: theme.textTertiary, fontFamily: bold }]}>EMAIL</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, fontFamily: body }]}
              value={email}
              onChangeText={setEmail}
              placeholder="seeker@vedic.ai"
              placeholderTextColor={theme.isDark ? '#666' : '#999'}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={[styles.inputLabel, { color: theme.textTertiary, fontFamily: bold }]}>PASSWORD</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, fontFamily: body }]}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
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

            <Text style={[styles.inputLabel, { color: theme.textTertiary, fontFamily: bold }]}>CONFIRM PASSWORD</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder, fontFamily: body }]}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor={theme.isDark ? '#666' : '#999'}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Pressable onPress={register} disabled={loading}>
              <View style={[styles.button, { backgroundColor: theme.accent, opacity: loading ? 0.6 : 1 }]}>
                <Text style={[styles.buttonText, { fontFamily: bold }]}>
                  {loading ? 'Sending Link...' : 'Sign Up with Email'}
                </Text>
              </View>
            </Pressable>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textSecondary, fontFamily: body }]}>
                Already have an account?{' '}
              </Text>
              <Pressable onPress={() => router.push('/login')}>
                <Text style={[styles.linkText, { color: theme.accent, fontFamily: bold }]}>Sign In</Text>
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
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
    padding: 2,
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