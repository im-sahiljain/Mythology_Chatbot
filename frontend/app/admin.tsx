import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TextInput,
  TouchableOpacity,
  Pressable as RNPressable,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import { apiService, API_BASE_URL, AdminOverview, TabUsageStat, LatencyAnalytics, CharacterStat, AdminUserItem, UserChatSessionDetail } from '../src/services/api';
import { Feather } from '@expo/vector-icons';

import { supabase } from '../src/services/supabase';


const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';
const bold = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin Portal Login States
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);


  // Analytics Data States
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [tabUsage, setTabUsage] = useState<TabUsageStat[]>([]);
  const [latency, setLatency] = useState<LatencyAnalytics | null>(null);
  const [characterStats, setCharacterStats] = useState<CharacterStat[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [guestUsage, setGuestUsage] = useState<any>(null);

  // User Inspection Modal / State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userChats, setUserChats] = useState<UserChatSessionDetail[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);

  const fetchAllAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        overviewRes,
        tabRes,
        latencyRes,
        charRes,
        usersRes,
        guestRes,
      ] = await Promise.all([
        apiService.fetchAdminOverview(),
        apiService.fetchAdminTabUsage(),
        apiService.fetchAdminLatencyAnalytics(),
        apiService.fetchAdminCharacterStats(),
        apiService.fetchAdminUsers(0, 50),
        apiService.fetchAdminGuestUsage(),
      ]);

      setOverview(overviewRes);
      setTabUsage(tabRes);
      setLatency(latencyRes);
      setCharacterStats(charRes);
      setUsers(usersRes);
      setGuestUsage(guestRes);
    } catch (err: any) {
      console.error('Failed to load admin analytics:', err);
      setError(err.message || 'Admin authentication required.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setAdminLoginError('Please enter both admin email and password.');
      return;
    }
    const cleanEmail = adminEmail.trim().toLowerCase();

    setAdminLoginLoading(true);

    setAdminLoginError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: cleanEmail, password: adminPassword }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setAdminLoginError(errJson.detail || 'Invalid admin credentials');
        setAdminLoginLoading(false);
        return;
      }

      // Also set token in Supabase JS client for in-memory session
      const authData = await res.json();
      if (authData.access_token) {
        await supabase.auth.setSession({
          access_token: authData.access_token,
          refresh_token: authData.access_token,
        });
      }

      // Refresh admin dashboard metrics
      await fetchAllAdminData();
    } catch (err: any) {
      setAdminLoginError(err.message || 'Failed to authenticate administrator');
    } finally {
      setAdminLoginLoading(false);
    }
  };


  const inspectUser = async (user: AdminUserItem) => {
    setSelectedUserId(user.id);
    setLoadingChats(true);
    try {
      const chats = await apiService.fetchAdminUserChats(user.id);
      setUserChats(chats);
    } catch (err: any) {
      alert(`Could not load chats for ${user.email}: ${err.message}`);
    } finally {
      setLoadingChats(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textSecondary, fontFamily: body }]}>
          Loading Admin Control Center & Telemetry...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.bg, paddingHorizontal: 24 }]}>
        <View style={[styles.adminLoginCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
          <Text style={{ fontSize: 42, textAlign: 'center', marginBottom: 8 }}>🛡️</Text>
          <Text style={[styles.errorTitle, { color: theme.text, fontFamily: serif, textAlign: 'center' }]}>
            Administrator Access Portal
          </Text>
          <Text style={[styles.errorSubtitle, { color: theme.textSecondary, fontFamily: body, textAlign: 'center', marginBottom: 20 }]}>
            Sign in with an authorized administrator account
          </Text>


          {adminLoginError && (
            <View style={[styles.errorBanner, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }]}>
              <Text style={{ color: '#C62828', fontFamily: body, fontSize: 13, textAlign: 'center' }}>
                ⚠️ {adminLoginError}
              </Text>
            </View>
          )}

          <Text style={[styles.inputLabel, { color: theme.textSecondary, fontFamily: bold }]}>ADMINISTRATOR EMAIL</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.outlineVariant, fontFamily: body }]}
            value={adminEmail}
            onChangeText={setAdminEmail}
            placeholder="admin@mythology.ai"
            placeholderTextColor={theme.isDark ? '#666' : '#999'}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={[styles.inputLabel, { color: theme.textSecondary, fontFamily: bold, marginTop: 12 }]}>PASSWORD</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={[styles.passwordInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.outlineVariant, fontFamily: body }]}
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry={!showAdminPassword}
              placeholder="Enter admin access key"
              placeholderTextColor={theme.isDark ? '#666' : '#999'}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowAdminPassword((prev) => !prev)}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather
                name={showAdminPassword ? 'eye-off' : 'eye'}
                size={18}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>




          <RNPressable
            onPress={handleAdminLogin}
            disabled={adminLoginLoading}
            style={[styles.btn, { backgroundColor: theme.accent, marginTop: 20, opacity: adminLoginLoading ? 0.7 : 1 }]}
          >
            {adminLoginLoading ? (
              <ActivityIndicator color="#09090B" />
            ) : (
              <Text style={[styles.btnText, { color: '#09090B', fontFamily: bold }]}>Sign In to Admin Dashboard →</Text>
            )}
          </RNPressable>


          <RNPressable onPress={() => router.replace('/(tabs)')} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: theme.textSecondary, fontFamily: body, fontSize: 13 }}>← Return to Main App</Text>
          </RNPressable>
        </View>
      </View>
    );
  }


  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Admin Header */}
      <View style={[styles.topBar, { borderBottomColor: theme.outlineVariant, backgroundColor: theme.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <RNPressable onPress={() => router.replace('/(tabs)')} style={[styles.backBtn, { borderColor: theme.outlineVariant }]}>
            <Text style={{ color: theme.text, fontSize: 13, fontFamily: bold }}>← Back to App</Text>
          </RNPressable>
          <View>
            <Text style={[styles.appTitle, { color: theme.text, fontFamily: serif }]}>Admin Telemetry & Analytics</Text>
            <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: body }}>
              PostgreSQL Real-Time System Health & Cost Metrics
            </Text>
          </View>
        </View>

        <RNPressable onPress={fetchAllAdminData} style={[styles.refreshBtn, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
          <Text style={{ color: theme.accent, fontSize: 12, fontFamily: bold }}>🔄 Refresh Data</Text>
        </RNPressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* 1. Global Metrics Grid */}
        <Text style={[styles.sectionHeading, { color: theme.text, fontFamily: serif }]}>Key Performance Indicators</Text>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
            <Text style={[styles.metricLabel, { color: theme.textTertiary, fontFamily: bold }]}>REGISTERED USERS</Text>
            <Text style={[styles.metricValue, { color: theme.text, fontFamily: serif }]}>{overview?.total_users || 0}</Text>
            <Text style={{ color: theme.accent, fontSize: 11, marginTop: 4 }}>
              ⚡ {overview?.active_users_today || 0} active today
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
            <Text style={[styles.metricLabel, { color: theme.textTertiary, fontFamily: bold }]}>TOTAL CONVERSATIONS</Text>
            <Text style={[styles.metricValue, { color: theme.text, fontFamily: serif }]}>{overview?.total_sessions || 0}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
              💬 {overview?.total_messages || 0} dialogue turns
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
            <Text style={[styles.metricLabel, { color: theme.textTertiary, fontFamily: bold }]}>TOTAL ESTIMATED COST</Text>
            <Text style={[styles.metricValue, { color: '#10B981', fontFamily: serif }]}>
              ${overview?.total_cost_usd?.toFixed(4) || '0.0000'}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
              🔥 {(overview?.total_tokens || 0).toLocaleString()} tokens
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
            <Text style={[styles.metricLabel, { color: theme.textTertiary, fontFamily: bold }]}>API LATENCY (p95)</Text>
            <Text style={[styles.metricValue, { color: '#3B82F6', fontFamily: serif }]}>
              {latency?.p95_ms || 0} ms
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
              Avg: {latency?.avg_ms || 0} ms ({latency?.sample_size || 0} samples)
            </Text>
          </View>
        </View>

        {/* 2. Tab Usage & Cost Distribution */}
        <View style={styles.twoColumnRow}>
          {/* Tab Usage Breakdown */}
          <View style={[styles.columnCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: serif }]}>📊 Tab Usage Distribution</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 14, fontFamily: body }}>
              Message and request traffic across consultation modes
            </Text>

            {tabUsage.length === 0 ? (
              <Text style={{ color: theme.textTertiary, fontSize: 12 }}>No tab interactions logged yet.</Text>
            ) : (
              tabUsage.map((t, idx) => (
                <View key={idx} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: theme.text, fontSize: 13, fontFamily: bold, textTransform: 'capitalize' }}>
                      {t.tab_mode}
                    </Text>
                    <Text style={{ color: theme.accent, fontSize: 12 }}>
                      {t.request_count} reqs ({t.percentage}%)
                    </Text>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: theme.inputBg }]}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(100, t.percentage)}%`, backgroundColor: theme.accent }]} />
                  </View>
                  <Text style={{ color: theme.textTertiary, fontSize: 10, marginTop: 2 }}>
                    Tokens: {t.tokens.toLocaleString()} | Cost: ${t.cost_usd.toFixed(5)} | Latency: {t.avg_latency_ms}ms
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Character Popularity Stats */}
          <View style={[styles.columnCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: serif }]}>🪷 Most Consulted Legends</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 14, fontFamily: body }}>
              Frequency of legendary characters summoned in Council & Persona
            </Text>

            {characterStats.length === 0 ? (
              <Text style={{ color: theme.textTertiary, fontSize: 12 }}>No character dialogue logged yet.</Text>
            ) : (
              characterStats.map((c, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.outlineVariant }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '✨'}</Text>
                    <Text style={{ color: theme.text, fontSize: 14, fontFamily: bold }}>{c.character}</Text>
                  </View>
                  <Text style={{ color: theme.textSecondary, fontSize: 13, fontFamily: body }}>
                    {c.dialogue_count} turns ({c.percentage}%)
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* 3. Guest Quota & Conversion Telemetry */}
        <View style={[styles.fullWidthCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant, marginTop: 16 }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: serif }]}>👥 Guest (Non-Auth) Quota Telemetry</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 10 }}>
            <View>
              <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: bold }}>TOTAL GUEST VISITORS</Text>
              <Text style={{ color: theme.text, fontSize: 18, fontFamily: serif }}>{guestUsage?.total_guests || 0}</Text>
            </View>
            <View>
              <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: bold }}>GUEST TURNS SENT</Text>
              <Text style={{ color: theme.text, fontSize: 18, fontFamily: serif }}>{guestUsage?.total_guest_messages_sent || 0}</Text>
            </View>
            <View>
              <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: bold }}>HIT 3-MESSAGE LIMIT</Text>
              <Text style={{ color: '#EF4444', fontSize: 18, fontFamily: serif }}>
                {guestUsage?.guests_hitting_3_turn_limit || 0} ({guestUsage?.guest_limit_reach_percentage || 0}%)
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Registered Users & Chat Inspector */}
        <Text style={[styles.sectionHeading, { color: theme.text, fontFamily: serif, marginTop: 28 }]}>
          Registered Users & Chat Inspector
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 14, fontFamily: body }}>
          Select any user to inspect their conversation threads, scripture citations, and questions
        </Text>

        <View style={[styles.fullWidthCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
          {users.map((u) => (
            <RNPressable
              key={u.id}
              onPress={() => inspectUser(u)}
              style={[
                styles.userRow,
                {
                  borderBottomColor: theme.outlineVariant,
                  backgroundColor: selectedUserId === u.id ? 'rgba(217, 119, 6, 0.1)' : 'transparent',
                },
              ]}
            >
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: theme.text, fontSize: 14, fontFamily: bold }}>{u.full_name || 'Seeker'}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: u.role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)' }]}>
                    <Text style={{ color: u.role === 'admin' ? '#EF4444' : '#3B82F6', fontSize: 10, fontFamily: bold }}>
                      {u.role.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 2 }}>{u.email}</Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: theme.accent, fontSize: 12, fontFamily: bold }}>
                  {u.total_sessions} sessions | {u.total_messages} msgs
                </Text>
                <Text style={{ color: theme.textTertiary, fontSize: 10, marginTop: 2 }}>
                  Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
            </RNPressable>
          ))}
        </View>

        {/* User Chat Inspection Viewer */}
        {selectedUserId && (
          <View style={[styles.fullWidthCard, { backgroundColor: theme.surface, borderColor: theme.accent, marginTop: 20 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.cardTitle, { color: theme.text, fontFamily: serif }]}>
                🔍 Conversations Inspector ({userChats.length} Sessions)
              </Text>
              <RNPressable onPress={() => setSelectedUserId(null)}>
                <Text style={{ color: theme.textTertiary, fontSize: 13, fontFamily: bold }}>✕ Close Inspector</Text>
              </RNPressable>
            </View>

            {loadingChats ? (
              <ActivityIndicator size="small" color={theme.accent} style={{ marginVertical: 20 }} />
            ) : userChats.length === 0 ? (
              <Text style={{ color: theme.textTertiary, fontSize: 13, marginVertical: 10 }}>
                This user has not created any chat sessions yet.
              </Text>
            ) : (
              userChats.map((sess) => (
                <View key={sess.session_id} style={[styles.sessionDetailBox, { borderColor: theme.outlineVariant, backgroundColor: theme.inputBg }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: theme.accent, fontSize: 14, fontFamily: bold }}>
                      📄 {sess.title}
                    </Text>
                    <Text style={{ color: theme.textTertiary, fontSize: 11 }}>
                      Mode: {sess.mode} | {sess.message_count} messages
                    </Text>
                  </View>

                  {sess.messages.map((m, idx) => (
                    <View key={m.id || idx} style={[styles.chatBubble, { backgroundColor: m.role === 'user' ? 'rgba(217, 119, 6, 0.12)' : theme.surface }]}>
                      <Text style={{ color: m.role === 'user' ? theme.accent : theme.text, fontSize: 11, fontFamily: bold, marginBottom: 2 }}>
                        {m.role === 'user' ? '👤 Seeker' : `🪷 ${m.character || 'AI Guide'}`}
                      </Text>
                      <Text style={{ color: theme.text, fontSize: 13, lineHeight: 19, fontFamily: body }}>
                        {m.content}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 14,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 22,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  btnText: {
    color: '#09090B',
    fontWeight: '700',
    fontSize: 13,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: 180,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  metricLabel: {
    fontSize: 10,
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '700',
  },
  twoColumnRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
  },
  columnCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
  },
  fullWidthCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sessionDetailBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  chatBubble: {
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  adminLoginCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 16,
    padding: 28,
  },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
    width: '100%',
  },
  passwordInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
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
  errorBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
});


