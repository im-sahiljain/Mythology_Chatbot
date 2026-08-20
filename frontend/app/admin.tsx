import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Pressable as RNPressable,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import {
  apiService,
  AdminOverview,
  TabUsageStat,
  LatencyAnalytics,
  CharacterStat,
  AdminUserItem,
  UserChatSessionDetail,
  TimeSeriesData,
  ScriptureInsights,
  RawTelemetryLog,
  CostProviderStat,
  API_BASE_URL,
} from '../src/services/api';
import { supabase } from '../src/services/supabase';
import {
  TimeSeriesTrendChart,
  RankedBarChart,
  DistributionChart,
  LatencyGaugeCard,
} from '../src/components/AdminCharts';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';
const bold = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';

export const formatISTTime = (isoString?: string | null): string => {
  if (!isoString) return '';
  const cleanStr = isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`;
  try {
    const d = new Date(cleanStr);
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

export const formatISTDateTime = (isoString?: string | null): string => {
  if (!isoString) return '';
  const cleanStr = isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`;
  try {
    const d = new Date(cleanStr);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

export const formatISTDate = (isoString?: string | null): string => {
  if (!isoString) return '';
  const cleanStr = isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`;
  try {
    const d = new Date(cleanStr);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
};

type NavTab = 'overview' | 'users' | 'financials' | 'performance' | 'scripture' | 'logs';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const isTablet = width >= 720;

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<NavTab>('users');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [timeframeDays, setTimeframeDays] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Column Visibility States for 3-Column Chat Inspector
  const [showUsersColumn, setShowUsersColumn] = useState(true);
  const [showSessionsColumn, setShowSessionsColumn] = useState(true);
  const [expandedSourcesIdx, setExpandedSourcesIdx] = useState<number | null>(null);

  // Admin Login States
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  // Analytics Data States
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData | null>(null);
  const [tabUsage, setTabUsage] = useState<TabUsageStat[]>([]);
  const [latency, setLatency] = useState<LatencyAnalytics | null>(null);
  const [characterStats, setCharacterStats] = useState<CharacterStat[]>([]);
  const [providersData, setProvidersData] = useState<CostProviderStat[]>([]);
  const [scriptureInsights, setScriptureInsights] = useState<ScriptureInsights | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [guestUsage, setGuestUsage] = useState<any>(null);
  const [rawLogs, setRawLogs] = useState<RawTelemetryLog[]>([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [userSubTab, setUserSubTab] = useState<'registered' | 'guests'>('registered');

  // Inspection Modal / State
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [userChats, setUserChats] = useState<UserChatSessionDetail[]>([]);
  const [loadingUserChats, setLoadingUserChats] = useState(false);

  const [guestChats, setGuestChats] = useState<UserChatSessionDetail[]>([]);
  const [loadingGuestChats, setLoadingGuestChats] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  // Active Selected Session for Transcript Column
  const [activeSession, setActiveSession] = useState<UserChatSessionDetail | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleCopyText = async (text: string, id: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedMsgId(id);
      setTimeout(() => {
        setCopiedMsgId(null);
      }, 2000);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
    }
  };

  const fetchAllAdminData = async (days = timeframeDays) => {
    setLoading(true);
    setError(null);
    try {
      const [
        overviewRes,
        timeSeriesRes,
        tabRes,
        latencyRes,
        charRes,
        costRes,
        scriptureRes,
        usersRes,
        guestRes,
        logsRes,
      ] = await Promise.all([
        apiService.fetchAdminOverview(),
        apiService.fetchAdminTimeSeries(days),
        apiService.fetchAdminTabUsage(),
        apiService.fetchAdminLatencyAnalytics(),
        apiService.fetchAdminCharacterStats(),
        apiService.fetchAdminCostAnalytics(days),
        apiService.fetchAdminScriptureInsights(),
        apiService.fetchAdminUsers(0, 100),
        apiService.fetchAdminGuestUsage(),
        apiService.fetchAdminRawLogs(0, 50),
      ]);

      setOverview(overviewRes);
      setTimeSeries(timeSeriesRes);
      setTabUsage(tabRes);
      setLatency(latencyRes);
      setCharacterStats(charRes);
      setProvidersData(costRes?.providers || []);
      setScriptureInsights(scriptureRes);
      setUsers(usersRes);
      setGuestUsage(guestRes);
      setRawLogs(logsRes);

      // Auto-select first user if none selected
      if (!selectedUser && usersRes.length > 0) {
        inspectUser(usersRes[0]);
      }
    } catch (err: any) {
      console.error('Failed to load admin analytics:', err);
      setError(err.message || 'Admin authentication required.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          fetchAllAdminData(timeframeDays);
        } else {
          setLoading(false);
          setError('Admin authentication required.');
        }
      } catch (err) {
        setLoading(false);
        setError('Admin authentication required.');
      }
    };

    checkAuthAndFetch();
  }, [timeframeDays]);

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

      const authData = await res.json();
      if (authData.access_token) {
        await supabase.auth.setSession({
          access_token: authData.access_token,
          refresh_token: authData.access_token,
        });
      }

      setAdminLoginLoading(false);
      fetchAllAdminData();
    } catch (err: any) {
      setAdminLoginError(`Authentication network failure: ${err.message}`);
      setAdminLoginLoading(false);
    }
  };

  const inspectUser = async (user: AdminUserItem) => {
    setSelectedUser(user);
    setLoadingUserChats(true);
    try {
      const chats = await apiService.fetchAdminUserChats(user.id);
      setUserChats(chats);
      if (chats.length > 0) {
        setActiveSession(chats[0]);
      } else {
        setActiveSession(null);
      }
    } catch (err: any) {
      alert(`Could not load chats for ${user.email}: ${err.message}`);
    } finally {
      setLoadingUserChats(false);
    }
  };

  const loadGuestSessions = async () => {
    setLoadingGuestChats(true);
    try {
      const chats = await apiService.fetchAdminGuestSessions(50);
      setGuestChats(chats);
      if (!activeSession && chats.length > 0) {
        setActiveSession(chats[0]);
      }
    } catch (err: any) {
      alert(`Could not load guest chats: ${err.message}`);
    } finally {
      setLoadingGuestChats(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && userSubTab === 'guests' && guestChats.length === 0) {
      loadGuestSessions();
    }
  }, [activeTab, userSubTab]);

  // If unauthenticated / error
  if (error && !overview) {
    return (
      <View style={[styles.loginContainer, { backgroundColor: theme.bg }]}>
        <View style={[styles.loginCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>🔐</Text>
          <Text style={[styles.loginTitle, { color: theme.text, fontFamily: serif }]}>
            Admin Control Center
          </Text>
          <Text style={[styles.loginSubtitle, { color: theme.textSecondary, fontFamily: body }]}>
            Restricted access. Sign in with administrative credentials.
          </Text>

          {adminLoginError && (
            <View style={[styles.errorAlert, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
              <Text style={{ color: '#EF4444', fontSize: 13, fontFamily: body }}>⚠️ {adminLoginError}</Text>
            </View>
          )}

          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.outlineVariant }]}
            placeholder="Admin Email"
            placeholderTextColor={theme.textTertiary}
            value={adminEmail}
            onChangeText={setAdminEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.outlineVariant }]}
            placeholder="Password"
            placeholderTextColor={theme.textTertiary}
            value={adminPassword}
            onChangeText={setAdminPassword}
            secureTextEntry
          />

          <RNPressable
            onPress={handleAdminLogin}
            disabled={adminLoginLoading}
            style={[styles.loginBtn, { backgroundColor: theme.accent }]}
          >
            {adminLoginLoading ? (
              <ActivityIndicator color="#09090B" />
            ) : (
              <Text style={[styles.btnText, { color: '#09090B', fontFamily: bold }]}>
                Sign In to Admin Dashboard →
              </Text>
            )}
          </RNPressable>

          <RNPressable onPress={() => router.replace('/(tabs)')} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: theme.textSecondary, fontFamily: body, fontSize: 13 }}>← Return to Main App</Text>
          </RNPressable>
        </View>
      </View>
    );
  }

  // Filtered Lists
  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group unique guests from guestChats
  const uniqueGuestMap = new Map<string, { guest_id: string; total_sessions: number; total_messages: number; last_active?: string | null }>();
  guestChats.forEach((g) => {
    const gid = g.guest_id || 'anonymous';
    const existing = uniqueGuestMap.get(gid) || {
      guest_id: gid,
      total_sessions: 0,
      total_messages: 0,
      last_active: g.created_at,
    };
    existing.total_sessions += 1;
    existing.total_messages += g.message_count || (g.messages ? g.messages.length : 0);
    if (g.created_at && (!existing.last_active || new Date(g.created_at) > new Date(existing.last_active))) {
      existing.last_active = g.created_at;
    }
    uniqueGuestMap.set(gid, existing);
  });
  const uniqueGuests = Array.from(uniqueGuestMap.values()).sort((a, b) => {
    const dateA = a.last_active ? new Date(a.last_active).getTime() : 0;
    const dateB = b.last_active ? new Date(b.last_active).getTime() : 0;
    return dateB - dateA;
  });

  const filteredUniqueGuests = uniqueGuests.filter((g) =>
    g.guest_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const guestSessionsForSelected = selectedGuestId
    ? guestChats.filter((g) => (g.guest_id || 'anonymous') === selectedGuestId)
    : guestChats;

  const displayedSessions = userSubTab === 'registered' ? userChats : guestSessionsForSelected;
  const filteredDisplayedSessions = displayedSessions.filter(
    (s) =>
      s.title.toLowerCase().includes(sessionSearchQuery.toLowerCase()) ||
      s.mode.toLowerCase().includes(sessionSearchQuery.toLowerCase()) ||
      (s.created_at && formatISTDateTime(s.created_at).toLowerCase().includes(sessionSearchQuery.toLowerCase()))
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Navbar */}
      <View style={[styles.topBar, { borderBottomColor: theme.outlineVariant, backgroundColor: theme.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={[styles.menuToggleBtn, { borderColor: theme.outlineVariant }]}
          >
            <Text style={{ color: theme.text, fontSize: 15 }}>{sidebarCollapsed ? '▶' : '◀'}</Text>
          </TouchableOpacity>
          <View>
            <Text style={[styles.appTitle, { color: theme.text, fontFamily: serif }]}>
              Vedic Analytics & Control Center
            </Text>
            <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: body }}>
              PostgreSQL Telemetry • LLM Billing • Timestamps in IST (UTC+5:30)
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Timeframe selector */}
          <View style={[styles.timeframePill, { backgroundColor: theme.inputBg, borderColor: theme.outlineVariant }]}>
            {[7, 14, 30].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setTimeframeDays(d)}
                style={[
                  styles.timeframeBtn,
                  timeframeDays === d && { backgroundColor: theme.accent },
                ]}
              >
                <Text
                  style={{
                    color: timeframeDays === d ? '#09090B' : theme.textSecondary,
                    fontSize: 11,
                    fontFamily: bold,
                  }}
                >
                  {d}D
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => fetchAllAdminData(timeframeDays)}
            style={[styles.actionBtn, { borderColor: theme.accent, backgroundColor: theme.surface }]}
          >
            <Text style={{ color: theme.accent, fontSize: 12, fontFamily: bold }}>🔄 Sync</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={[styles.actionBtn, { borderColor: theme.outlineVariant, backgroundColor: theme.surface }]}
          >
            <Text style={{ color: theme.text, fontSize: 12, fontFamily: bold }}>App ↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body: Responsive Layout (Collapsible Sidebar + Main Area) */}
      <View style={styles.bodyLayout}>
        {/* Left Sidebar (Collapses to icons-only when closed) */}
        <View
          style={[
            styles.sidebar,
            {
              backgroundColor: theme.surface,
              borderRightColor: theme.outlineVariant,
              width: sidebarCollapsed ? 64 : 220,
            },
          ]}
        >
          {!sidebarCollapsed && (
            <Text style={[styles.sidebarSectionLabel, { color: theme.textTertiary, fontFamily: bold }]}>
              NAVIGATION
            </Text>
          )}

          <TouchableOpacity
            onPress={() => setActiveTab('overview')}
            style={[
              styles.navItem,
              activeTab === 'overview' && { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: theme.accent },
              sidebarCollapsed && { justifyContent: 'center', paddingHorizontal: 0 },
            ]}
          >
            <Text style={{ fontSize: 18 }}>📊</Text>
            {!sidebarCollapsed && (
              <Text style={[styles.navText, { color: activeTab === 'overview' ? theme.accent : theme.text, fontFamily: activeTab === 'overview' ? bold : body }]}>
                Overview & KPIs
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('users')}
            style={[
              styles.navItem,
              activeTab === 'users' && { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: theme.accent },
              sidebarCollapsed && { justifyContent: 'center', paddingHorizontal: 0 },
            ]}
          >
            <Text style={{ fontSize: 18 }}>💬</Text>
            {!sidebarCollapsed && (
              <Text style={[styles.navText, { color: activeTab === 'users' ? theme.accent : theme.text, fontFamily: activeTab === 'users' ? bold : body }]}>
                Chat Inspector
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('financials')}
            style={[
              styles.navItem,
              activeTab === 'financials' && { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: theme.accent },
              sidebarCollapsed && { justifyContent: 'center', paddingHorizontal: 0 },
            ]}
          >
            <Text style={{ fontSize: 18 }}>💰</Text>
            {!sidebarCollapsed && (
              <Text style={[styles.navText, { color: activeTab === 'financials' ? theme.accent : theme.text, fontFamily: activeTab === 'financials' ? bold : body }]}>
                Financials & Cost
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('performance')}
            style={[
              styles.navItem,
              activeTab === 'performance' && { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: theme.accent },
              sidebarCollapsed && { justifyContent: 'center', paddingHorizontal: 0 },
            ]}
          >
            <Text style={{ fontSize: 18 }}>⚡</Text>
            {!sidebarCollapsed && (
              <Text style={[styles.navText, { color: activeTab === 'performance' ? theme.accent : theme.text, fontFamily: activeTab === 'performance' ? bold : body }]}>
                Performance
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('scripture')}
            style={[
              styles.navItem,
              activeTab === 'scripture' && { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: theme.accent },
              sidebarCollapsed && { justifyContent: 'center', paddingHorizontal: 0 },
            ]}
          >
            <Text style={{ fontSize: 18 }}>🪷</Text>
            {!sidebarCollapsed && (
              <Text style={[styles.navText, { color: activeTab === 'scripture' ? theme.accent : theme.text, fontFamily: activeTab === 'scripture' ? bold : body }]}>
                Scripture & Personas
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('logs')}
            style={[
              styles.navItem,
              activeTab === 'logs' && { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: theme.accent },
              sidebarCollapsed && { justifyContent: 'center', paddingHorizontal: 0 },
            ]}
          >
            <Text style={{ fontSize: 18 }}>📜</Text>
            {!sidebarCollapsed && (
              <Text style={[styles.navText, { color: activeTab === 'logs' ? theme.accent : theme.text, fontFamily: activeTab === 'logs' ? bold : body }]}>
                Live Raw Logs
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <View style={[styles.systemStatusBox, { backgroundColor: theme.inputBg, borderColor: theme.outlineVariant }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              {!sidebarCollapsed && (
                <Text style={{ color: theme.text, fontSize: 11, fontFamily: bold }}>PostgreSQL Connected</Text>
              )}
            </View>
            {!sidebarCollapsed && (
              <Text style={{ color: theme.textTertiary, fontSize: 10, marginTop: 4 }}>
                pgvector embeddings: {scriptureInsights?.total_indexed_scenarios || 0}
              </Text>
            )}
          </View>
        </View>

        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {loading && !overview ? (
            <View style={{ alignItems: 'center', marginVertical: 40 }}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={{ color: theme.textSecondary, marginTop: 12, fontFamily: body }}>
                Refreshing telemetry matrix...
              </Text>
            </View>
          ) : (
            <>
              {/* ========================================================= */}
              {/* TAB 1: OVERVIEW & KPIS                                    */}
              {/* ========================================================= */}
              {activeTab === 'overview' && (
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
                  {/* Top KPI Cards Grid */}
                  <View style={styles.kpiGrid}>
                    <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                      <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: bold }]}>REGISTERED USERS</Text>
                      <Text style={[styles.kpiValue, { color: theme.text, fontFamily: serif }]}>{overview?.total_users || 0}</Text>
                      <Text style={{ color: theme.accent, fontSize: 11, marginTop: 4 }}>
                        ⚡ {overview?.active_users_today || 0} active today
                      </Text>
                    </View>

                    <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                      <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: bold }]}>TOTAL SESSIONS</Text>
                      <Text style={[styles.kpiValue, { color: theme.text, fontFamily: serif }]}>{overview?.total_sessions || 0}</Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                        💬 {overview?.total_messages || 0} dialogue turns
                      </Text>
                    </View>

                    <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                      <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: bold }]}>ESTIMATED LLM COST</Text>
                      <Text style={[styles.kpiValue, { color: '#10B981', fontFamily: serif }]}>
                        ${overview?.total_cost_usd?.toFixed(4) || '0.0000'}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                        🔥 {(overview?.total_tokens || 0).toLocaleString()} tokens
                      </Text>
                    </View>

                    <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                      <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: bold }]}>p95 API LATENCY</Text>
                      <Text style={[styles.kpiValue, { color: '#3B82F6', fontFamily: serif }]}>
                        {latency?.p95_ms || 0} ms
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                        Avg: {latency?.avg_ms || 0} ms
                      </Text>
                    </View>
                  </View>

                  {/* Time Series Charts */}
                  <View style={styles.chartRow}>
                    <View style={{ flex: 1, minWidth: 280 }}>
                      <TimeSeriesTrendChart
                        data={timeSeries?.series || []}
                        metric="requests"
                        theme={theme}
                        title={`📈 Daily Request Traffic (${timeframeDays} Days)`}
                        unit="requests"
                        color="#D97706"
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 280 }}>
                      <TimeSeriesTrendChart
                        data={timeSeries?.series || []}
                        metric="cost_usd"
                        theme={theme}
                        title={`💵 Daily LLM Spend (${timeframeDays} Days)`}
                        unit="USD"
                        color="#10B981"
                      />
                    </View>
                  </View>

                  {/* Tab Mode Distribution & Guest Quota */}
                  <View style={styles.chartRow}>
                    <View style={{ flex: 1, minWidth: 280 }}>
                      <DistributionChart
                        title="📊 Mode Distribution"
                        subtitle="Requests by consultation modality"
                        items={tabUsage.map((t, idx) => ({
                          label: t.tab_mode.toUpperCase(),
                          value: t.request_count,
                          percentage: t.percentage,
                          color: idx === 0 ? '#D97706' : idx === 1 ? '#3B82F6' : idx === 2 ? '#10B981' : '#8B5CF6',
                        }))}
                        theme={theme}
                      />
                    </View>

                    <View style={{ flex: 1, minWidth: 280 }}>
                      <View style={[styles.cardBox, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                        <Text style={[styles.boxTitle, { color: theme.text, fontFamily: serif }]}>
                          👥 Guest Conversion & Quotas
                        </Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12, fontFamily: body }}>
                          Anonymous non-authenticated visitor limits
                        </Text>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 6 }}>
                          <View>
                            <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: bold }}>TOTAL GUEST VISITORS</Text>
                            <Text style={{ color: theme.text, fontSize: 20, fontFamily: serif }}>{guestUsage?.total_guests || 0}</Text>
                          </View>
                          <View>
                            <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: bold }}>GUEST MESSAGES SENT</Text>
                            <Text style={{ color: theme.text, fontSize: 20, fontFamily: serif }}>{guestUsage?.total_guest_messages_sent || 0}</Text>
                          </View>
                          <View>
                            <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: bold }}>HIT 3-MSG LIMIT</Text>
                            <Text style={{ color: '#EF4444', fontSize: 20, fontFamily: serif }}>
                              {guestUsage?.guests_hitting_3_turn_limit || 0} ({guestUsage?.guest_limit_reach_percentage || 0}%)
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </ScrollView>
              )}

              {/* ========================================================= */}
              {/* TAB 2: 3-COLUMN SEPARATED CHAT INSPECTOR                   */}
              {/* ========================================================= */}
              {activeTab === 'users' && (
                <View style={styles.threeColumnLayout}>
                  {/* COLUMN 1: Seekers / Users List */}
                  {showUsersColumn && (
                    <View
                      style={[
                        styles.usersListColumn,
                        {
                          backgroundColor: theme.surface,
                          borderRightColor: theme.outlineVariant,
                          width: isTablet ? 250 : '100%',
                        },
                      ]}
                    >
                      {/* Column 1 Header */}
                      <View style={[styles.columnHeader, { borderBottomColor: theme.outlineVariant }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={[styles.columnHeaderTitle, { color: theme.text, fontFamily: serif }]}>
                            Seekers
                          </Text>
                          <TouchableOpacity
                            onPress={() => setShowUsersColumn(false)}
                            style={[styles.collapseIconBtn, { borderColor: theme.outlineVariant }]}
                          >
                            <Text style={{ color: theme.textTertiary, fontSize: 11 }}>◀ Hide</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Subtab Toggle (Users / Guests) */}
                        <View style={[styles.subtabToggle, { backgroundColor: theme.inputBg, borderColor: theme.outlineVariant }]}>
                          <TouchableOpacity
                            onPress={() => {
                              setUserSubTab('registered');
                              if (users.length > 0) inspectUser(users[0]);
                            }}
                            style={[styles.subtabBtn, userSubTab === 'registered' && { backgroundColor: theme.accent }]}
                          >
                            <Text style={{ color: userSubTab === 'registered' ? '#09090B' : theme.textSecondary, fontSize: 11, fontFamily: bold }}>
                              Users ({users.length})
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              setUserSubTab('guests');
                              loadGuestSessions();
                            }}
                            style={[styles.subtabBtn, userSubTab === 'guests' && { backgroundColor: theme.accent }]}
                          >
                            <Text style={{ color: userSubTab === 'guests' ? '#09090B' : theme.textSecondary, fontSize: 11, fontFamily: bold }}>
                              Guests ({guestUsage?.total_guests || 0})
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Search Input */}
                        <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.outlineVariant, marginTop: 8 }]}>
                          <Text style={{ fontSize: 11, marginRight: 6 }}>🔍</Text>
                          <TextInput
                            style={{ flex: 1, color: theme.text, fontSize: 11, paddingVertical: 2 }}
                            placeholder="Filter seekers..."
                            placeholderTextColor={theme.textTertiary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                          />
                        </View>
                      </View>

                      {/* Seekers Scroll List */}
                      <ScrollView style={{ flex: 1 }}>
                        {userSubTab === 'registered' ? (
                          filteredUsers.map((u) => {
                            const isSelected = selectedUser?.id === u.id;
                            return (
                              <TouchableOpacity
                                key={u.id}
                                onPress={() => inspectUser(u)}
                                style={[
                                  styles.userCardItem,
                                  {
                                    backgroundColor: isSelected ? 'rgba(217, 119, 6, 0.12)' : 'transparent',
                                    borderLeftColor: isSelected ? '#D97706' : 'transparent',
                                    borderBottomColor: theme.outlineVariant,
                                  },
                                ]}
                              >
                                <View style={[styles.avatarCircle, { backgroundColor: isSelected ? 'rgba(217, 119, 6, 0.3)' : 'rgba(255,255,255,0.06)' }]}>
                                  <Text style={{ fontSize: 14 }}>👤</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text numberOfLines={1} style={{ color: theme.text, fontSize: 12, fontFamily: bold, flex: 1 }}>
                                      {u.full_name || 'Seeker'}
                                    </Text>
                                    <View style={[styles.sessCountBadge, { backgroundColor: isSelected ? theme.accent : theme.inputBg }]}>
                                      <Text style={{ color: isSelected ? '#09090B' : theme.textTertiary, fontSize: 10, fontFamily: bold }}>
                                        {u.total_sessions}
                                      </Text>
                                    </View>
                                  </View>
                                  <Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 10, marginTop: 2 }}>
                                    {u.email}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })
                        ) : (
                          <>
                            {/* All Guests Card */}
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedGuestId(null);
                                if (guestChats.length > 0) setActiveSession(guestChats[0]);
                              }}
                              style={[
                                styles.userCardItem,
                                {
                                  backgroundColor: selectedGuestId === null ? 'rgba(217, 119, 6, 0.12)' : 'transparent',
                                  borderLeftColor: selectedGuestId === null ? '#D97706' : 'transparent',
                                  borderBottomColor: theme.outlineVariant,
                                },
                              ]}
                            >
                              <View style={[styles.avatarCircle, { backgroundColor: 'rgba(217, 119, 6, 0.25)' }]}>
                                <Text style={{ fontSize: 14 }}>✨</Text>
                              </View>
                              <View style={{ flex: 1, marginLeft: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Text numberOfLines={1} style={{ color: theme.text, fontSize: 12, fontFamily: bold, flex: 1 }}>
                                    All Guests
                                  </Text>
                                  <View style={[styles.sessCountBadge, { backgroundColor: selectedGuestId === null ? theme.accent : theme.inputBg }]}>
                                    <Text style={{ color: selectedGuestId === null ? '#09090B' : theme.textTertiary, fontSize: 10, fontFamily: bold }}>
                                      {guestChats.length}
                                    </Text>
                                  </View>
                                </View>
                                <Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 10, marginTop: 2 }}>
                                  {uniqueGuests.length} unique visitors
                                </Text>
                              </View>
                            </TouchableOpacity>

                            {/* Individual Unique Guest IDs */}
                            {loadingGuestChats ? (
                              <ActivityIndicator size="small" color={theme.accent} style={{ marginVertical: 20 }} />
                            ) : filteredUniqueGuests.length === 0 ? (
                              <Text style={{ color: theme.textTertiary, fontSize: 11, padding: 12 }}>No guest IDs match search.</Text>
                            ) : (
                              filteredUniqueGuests.map((g) => {
                                const isSelected = selectedGuestId === g.guest_id;
                                return (
                                  <TouchableOpacity
                                    key={g.guest_id}
                                    onPress={() => {
                                      setSelectedGuestId(g.guest_id);
                                      const gSessions = guestChats.filter((sess) => (sess.guest_id || 'anonymous') === g.guest_id);
                                      if (gSessions.length > 0) setActiveSession(gSessions[0]);
                                    }}
                                    style={[
                                      styles.userCardItem,
                                      {
                                        backgroundColor: isSelected ? 'rgba(217, 119, 6, 0.12)' : 'transparent',
                                        borderLeftColor: isSelected ? '#D97706' : 'transparent',
                                        borderBottomColor: theme.outlineVariant,
                                      },
                                    ]}
                                  >
                                    <View style={[styles.avatarCircle, { backgroundColor: isSelected ? 'rgba(217, 119, 6, 0.3)' : 'rgba(59, 130, 246, 0.15)' }]}>
                                      <Text style={{ fontSize: 14 }}>👻</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 8 }}>
                                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 11, fontFamily: bold, flex: 1 }}>
                                          {g.guest_id.length > 18 ? `${g.guest_id.slice(0, 16)}...` : g.guest_id}
                                        </Text>
                                        <View style={[styles.sessCountBadge, { backgroundColor: isSelected ? theme.accent : theme.inputBg }]}>
                                          <Text style={{ color: isSelected ? '#09090B' : theme.textTertiary, fontSize: 10, fontFamily: bold }}>
                                            {g.total_sessions}
                                          </Text>
                                        </View>
                                      </View>
                                      <Text numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 9, marginTop: 2 }}>
                                        {g.total_messages} msgs • {formatISTDateTime(g.last_active)}
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                );
                              })
                            )}
                          </>
                        )}
                      </ScrollView>
                    </View>
                  )}

                  {/* COLUMN 2: User's Consultation Sessions / Threads List */}
                  {showSessionsColumn && (
                    <View
                      style={[
                        styles.sessionsListColumn,
                        {
                          backgroundColor: theme.surface,
                          borderRightColor: theme.outlineVariant,
                          width: isTablet ? 270 : '100%',
                        },
                      ]}
                    >
                      {/* Column 2 Header */}
                      <View style={[styles.columnHeader, { borderBottomColor: theme.outlineVariant }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {!showUsersColumn && (
                              <TouchableOpacity
                                onPress={() => setShowUsersColumn(true)}
                                style={[styles.collapseIconBtn, { borderColor: theme.accent, backgroundColor: 'rgba(217, 119, 6, 0.1)' }]}
                              >
                                <Text style={{ color: theme.accent, fontSize: 11, fontFamily: bold }}>▶ Seekers</Text>
                              </TouchableOpacity>
                            )}
                            <Text numberOfLines={1} style={[styles.columnHeaderTitle, { color: theme.text, fontFamily: serif }]}>
                              {userSubTab === 'registered'
                                ? `${selectedUser?.full_name || 'User'} Sessions`
                                : selectedGuestId
                                ? `${selectedGuestId.length > 14 ? selectedGuestId.slice(0, 12) + '...' : selectedGuestId} Sessions`
                                : 'All Guest Threads'}
                            </Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => setShowSessionsColumn(false)}
                            style={[styles.collapseIconBtn, { borderColor: theme.outlineVariant }]}
                          >
                            <Text style={{ color: theme.textTertiary, fontSize: 11 }}>◀ Hide</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Search sessions */}
                        <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.outlineVariant }]}>
                          <Text style={{ fontSize: 11, marginRight: 6 }}>🔍</Text>
                          <TextInput
                            style={{ flex: 1, color: theme.text, fontSize: 11, paddingVertical: 2 }}
                            placeholder="Filter session title..."
                            placeholderTextColor={theme.textTertiary}
                            value={sessionSearchQuery}
                            onChangeText={setSessionSearchQuery}
                          />
                        </View>
                      </View>

                      {/* Sessions Scroll List */}
                      <ScrollView style={{ flex: 1 }}>
                        {loadingUserChats || loadingGuestChats ? (
                          <ActivityIndicator size="small" color={theme.accent} style={{ marginVertical: 24 }} />
                        ) : filteredDisplayedSessions.length === 0 ? (
                          <Text style={{ color: theme.textTertiary, fontSize: 11, padding: 16 }}>No sessions found.</Text>
                        ) : (
                          filteredDisplayedSessions.map((sess) => {
                            const isSelected = activeSession?.session_id === sess.session_id;
                            return (
                              <TouchableOpacity
                                key={sess.session_id}
                                onPress={() => setActiveSession(sess)}
                                style={[
                                  styles.sessionCardItem,
                                  {
                                    backgroundColor: isSelected ? 'rgba(217, 119, 6, 0.14)' : 'transparent',
                                    borderLeftColor: isSelected ? '#D97706' : 'transparent',
                                    borderBottomColor: theme.outlineVariant,
                                  },
                                ]}
                              >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Text numberOfLines={1} style={{ color: isSelected ? theme.accent : theme.text, fontSize: 12, fontFamily: bold, flex: 1 }}>
                                    {sess.title}
                                  </Text>
                                  <View style={[styles.modeTag, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                                    <Text style={{ color: '#3B82F6', fontSize: 9, fontFamily: bold }}>
                                      {sess.mode.toUpperCase()}
                                    </Text>
                                  </View>
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                  <Text style={{ color: theme.textTertiary, fontSize: 10 }}>
                                    💬 {sess.message_count} messages
                                  </Text>
                                  <Text style={{ color: theme.textTertiary, fontSize: 9 }}>
                                    {formatISTDateTime(sess.created_at)}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })
                        )}
                      </ScrollView>
                    </View>
                  )}

                  {/* COLUMN 3: Active Dialogue Transcript & Citations */}
                  <View style={[styles.chatTranscriptColumn, { backgroundColor: theme.bg }]}>
                    {/* Column 3 Header */}
                    <View style={[styles.threadHeader, { backgroundColor: theme.surface, borderBottomColor: theme.outlineVariant }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        {/* Quick restore toggles if columns are hidden */}
                        {!showUsersColumn && (
                          <TouchableOpacity
                            onPress={() => setShowUsersColumn(true)}
                            style={[styles.collapseIconBtn, { borderColor: theme.outlineVariant }]}
                          >
                            <Text style={{ color: theme.text, fontSize: 11 }}>👥 Seekers</Text>
                          </TouchableOpacity>
                        )}
                        {!showSessionsColumn && (
                          <TouchableOpacity
                            onPress={() => setShowSessionsColumn(true)}
                            style={[styles.collapseIconBtn, { borderColor: theme.outlineVariant }]}
                          >
                            <Text style={{ color: theme.text, fontSize: 11 }}>📑 Sessions</Text>
                          </TouchableOpacity>
                        )}

                        <View style={[styles.avatarCircle, { backgroundColor: 'rgba(217, 119, 6, 0.2)' }]}>
                          <Text style={{ fontSize: 16 }}>🪷</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={[styles.threadHeaderTitle, { color: theme.text, fontFamily: serif }]}>
                            {activeSession ? activeSession.title : 'Conversation Dialogue Inspector'}
                          </Text>
                          <Text style={{ color: theme.textTertiary, fontSize: 10, fontFamily: body }}>
                            {activeSession
                              ? `Mode: ${activeSession.mode.toUpperCase()} • ID: ${activeSession.session_id} • ${activeSession.message_count} dialogue turns`
                              : 'Select a session from the list to inspect messages'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Scrollable Dialogue Bubbles (Left and Right) */}
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
                      {!activeSession ? (
                        <View style={styles.emptyInspectorState}>
                          <Text style={{ fontSize: 44, marginBottom: 12 }}>💬</Text>
                          <Text style={[styles.emptyInspectorTitle, { color: theme.text, fontFamily: serif }]}>
                            Select a Conversation
                          </Text>
                          <Text style={[styles.emptyInspectorSubtitle, { color: theme.textSecondary, fontFamily: body }]}>
                            Choose a seeker and a consultation session from the left columns to view full left/right dialogue transcripts and scripture citations.
                          </Text>
                        </View>
                      ) : activeSession.messages.length === 0 ? (
                        <View style={{ alignItems: 'center', marginVertical: 30 }}>
                          <Text style={{ color: theme.textTertiary, fontSize: 13 }}>No messages in this session.</Text>
                        </View>
                      ) : (
                        activeSession.messages.map((msg, idx) => {
                          const isUser = msg.role === 'user';
                          const isSourcesExpanded = expandedSourcesIdx === idx;

                          return (
                            <View
                              key={msg.id || idx}
                              style={[
                                styles.bubbleWrapper,
                                { alignItems: isUser ? 'flex-end' : 'flex-start' },
                              ]}
                            >
                              {/* Bubble Sender Label & Timestamp & Copy Button */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <Text style={{ color: isUser ? theme.accent : theme.textSecondary, fontSize: 11, fontFamily: bold }}>
                                  {isUser ? `👤 ${userSubTab === 'registered' ? selectedUser?.full_name || 'Seeker' : 'Guest'}` : `🪷 ${msg.character || 'AI Guide'}`}
                                </Text>
                                {msg.stage && (
                                  <View style={[styles.stageBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                                    <Text style={{ color: '#3B82F6', fontSize: 9, fontFamily: bold }}>
                                      {msg.stage.toUpperCase()}
                                    </Text>
                                  </View>
                                )}
                                <Text style={{ color: theme.textTertiary, fontSize: 10 }}>
                                  {formatISTDateTime(msg.created_at)}
                                </Text>
                                <TouchableOpacity
                                  style={[
                                    styles.copyBtn,
                                    copiedMsgId === (msg.id || String(idx)) && { backgroundColor: theme.inputBg },
                                  ]}
                                  onPress={() => handleCopyText(msg.content, msg.id || String(idx))}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.copyIconText, { color: copiedMsgId === (msg.id || String(idx)) ? '#10B981' : theme.textTertiary }]}>
                                    {copiedMsgId === (msg.id || String(idx)) ? '✓ Copied' : '📋'}
                                  </Text>
                                </TouchableOpacity>
                              </View>

                              {/* Bubble Card */}
                              <View
                                style={[
                                  styles.bubbleCard,
                                  isUser
                                    ? {
                                        backgroundColor: 'rgba(217, 119, 6, 0.16)',
                                        borderColor: 'rgba(217, 119, 6, 0.4)',
                                        borderTopRightRadius: 4,
                                      }
                                    : {
                                        backgroundColor: theme.surface,
                                        borderColor: theme.outlineVariant,
                                        borderTopLeftRadius: 4,
                                      },
                                ]}
                              >
                                <Text style={[styles.bubbleText, { color: theme.text, fontFamily: body }]}>
                                  {msg.content}
                                </Text>

                                {/* Scripture Citations Accordion (Openable / Closable) */}
                                {msg.sources && msg.sources.length > 0 && (
                                  <View style={[styles.sourcesCard, { backgroundColor: theme.inputBg, borderColor: theme.outlineVariant }]}>
                                    <TouchableOpacity
                                      onPress={() => setExpandedSourcesIdx(isSourcesExpanded ? null : idx)}
                                      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                                    >
                                      <Text style={{ color: theme.accent, fontSize: 10, fontFamily: bold }}>
                                        📜 CITED SCRIPTURE SOURCES ({msg.sources.length})
                                      </Text>
                                      <Text style={{ color: theme.accent, fontSize: 10 }}>
                                        {isSourcesExpanded ? '▲ Hide' : '▼ Expand'}
                                      </Text>
                                    </TouchableOpacity>

                                    {isSourcesExpanded && (
                                      <View style={{ marginTop: 8 }}>
                                        {msg.sources.map((s, sIdx) => (
                                          <View key={sIdx} style={{ marginTop: 6, borderTopWidth: sIdx > 0 ? 1 : 0, borderTopColor: theme.outlineVariant, paddingTop: sIdx > 0 ? 4 : 0 }}>
                                            <Text style={{ color: theme.text, fontSize: 11, fontFamily: bold }}>
                                              • {s.scenario_title} <Text style={{ color: theme.textTertiary }}>({s.epic})</Text>
                                            </Text>
                                            {s.summary_snippet && (
                                              <Text style={{ color: theme.textSecondary, fontSize: 10, marginLeft: 8, marginTop: 2 }}>
                                                {s.summary_snippet}
                                              </Text>
                                            )}
                                          </View>
                                        ))}
                                      </View>
                                    )}
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        })
                      )}
                    </ScrollView>
                  </View>
                </View>
              )}

              {/* ========================================================= */}
              {/* TAB 3: FINANCIALS & COST ANALYTICS                        */}
              {/* ========================================================= */}
              {activeTab === 'financials' && (
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
                  <View style={styles.chartRow}>
                    <View style={{ flex: 1, minWidth: 280 }}>
                      <TimeSeriesTrendChart
                        data={timeSeries?.series || []}
                        metric="cost_usd"
                        theme={theme}
                        title={`💵 Daily Spend Trend (${timeframeDays} Days)`}
                        unit="USD"
                        color="#10B981"
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 280 }}>
                      <TimeSeriesTrendChart
                        data={timeSeries?.series || []}
                        metric="tokens"
                        theme={theme}
                        title={`🔥 Token Consumption (${timeframeDays} Days)`}
                        unit="tokens"
                        color="#8B5CF6"
                      />
                    </View>
                  </View>

                  {/* Provider Cost Breakdown */}
                  <RankedBarChart
                    title="🤖 LLM Provider Usage & Cost Breakdown"
                    subtitle="Token consumption and estimated billing per model architecture"
                    items={providersData.map((p) => ({
                      label: p.provider.toUpperCase(),
                      value: p.total_calls,
                      secondaryLabel: `$${p.cost_usd.toFixed(4)} • ${p.total_tokens.toLocaleString()} tokens`,
                      color: p.provider.includes('gemini') ? '#D97706' : p.provider.includes('openai') ? '#10B981' : '#3B82F6',
                      icon: '⚡',
                    }))}
                    theme={theme}
                    unit="calls"
                  />
                </ScrollView>
              )}

              {/* ========================================================= */}
              {/* TAB 4: PERFORMANCE & LATENCY MATRIX                       */}
              {/* ========================================================= */}
              {activeTab === 'performance' && (
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
                  <LatencyGaugeCard
                    p50={latency?.p50_ms || 0}
                    p95={latency?.p95_ms || 0}
                    p99={latency?.p99_ms || 0}
                    avg={latency?.avg_ms || 0}
                    min={latency?.min_ms || 0}
                    max={latency?.max_ms || 0}
                    sampleSize={latency?.sample_size || 0}
                    theme={theme}
                  />

                  <View style={styles.chartRow}>
                    <View style={{ flex: 1, minWidth: 280 }}>
                      <DistributionChart
                        title="🩺 HTTP Response Codes"
                        subtitle="Success rates vs rate-limiting vs server errors"
                        items={Object.entries(latency?.status_distribution || {}).map(([code, count]) => {
                          const total = Object.values(latency?.status_distribution || {}).reduce((a, b) => a + b, 0) || 1;
                          const pct = Math.round((count / total) * 100);
                          const color = code === '200' ? '#10B981' : code === '403' ? '#F59E0B' : '#EF4444';
                          return {
                            label: `HTTP ${code}`,
                            value: count,
                            percentage: pct,
                            color,
                          };
                        })}
                        theme={theme}
                      />
                    </View>

                    <View style={{ flex: 1, minWidth: 280 }}>
                      <RankedBarChart
                        title="⏱️ Average Latency by Tab Mode"
                        subtitle="Round-trip inference & vector search duration (ms)"
                        items={tabUsage.map((t) => ({
                          label: t.tab_mode.toUpperCase(),
                          value: Math.round(t.avg_latency_ms),
                          color: '#3B82F6',
                          icon: '⚡',
                        }))}
                        theme={theme}
                        unit="ms"
                      />
                    </View>
                  </View>
                </ScrollView>
              )}

              {/* ========================================================= */}
              {/* TAB 5: SCRIPTURE & PERSONAS                               */}
              {/* ========================================================= */}
              {activeTab === 'scripture' && (
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
                  <View style={styles.chartRow}>
                    <View style={{ flex: 1, minWidth: 280 }}>
                      <RankedBarChart
                        title="🪷 Most Consulted Vedic Guides"
                        subtitle="Character invocation frequency across consultations"
                        items={characterStats.map((c) => ({
                          label: c.character,
                          value: c.dialogue_count,
                          secondaryLabel: `${c.percentage}%`,
                          icon: '✨',
                        }))}
                        theme={theme}
                        unit="turns"
                      />
                    </View>

                    <View style={{ flex: 1, minWidth: 280 }}>
                      <DistributionChart
                        title="📜 Epics Knowledge Representation"
                        subtitle="Distribution of indexed scenario cards in pgvector"
                        items={(scriptureInsights?.epics_distribution || []).map((e, idx) => ({
                          label: e.epic,
                          value: e.count,
                          percentage: e.percentage,
                          color: idx === 0 ? '#D97706' : '#3B82F6',
                        }))}
                        theme={theme}
                      />
                    </View>
                  </View>

                  <RankedBarChart
                    title="🧠 Top Ethical Dilemma Categories"
                    subtitle="Most prominent philosophical dilemmas indexed and searched"
                    items={(scriptureInsights?.top_categories || []).map((c) => ({
                      label: c.category,
                      value: c.count,
                      color: '#8B5CF6',
                      icon: '⚖️',
                    }))}
                    theme={theme}
                    unit="scenarios"
                  />
                </ScrollView>
              )}

              {/* ========================================================= */}
              {/* TAB 6: LIVE RAW LOGS FEED                                 */}
              {/* ========================================================= */}
              {activeTab === 'logs' && (
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
                  <View style={[styles.cardBox, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <View>
                        <Text style={[styles.boxTitle, { color: theme.text, fontFamily: serif }]}>
                          📜 Live Telemetry Stream ({rawLogs.length} Records)
                        </Text>
                        <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: body }}>
                          Real-time API executions, token meters, latency, and status
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => fetchAllAdminData(timeframeDays)} style={[styles.actionBtn, { borderColor: theme.accent, backgroundColor: theme.surface }]}>
                        <Text style={{ color: theme.accent, fontSize: 11, fontFamily: bold }}>🔄 Refresh Feed</Text>
                      </TouchableOpacity>
                    </View>

                    {rawLogs.length === 0 ? (
                      <Text style={{ color: theme.textTertiary, fontSize: 13, marginVertical: 10 }}>
                        No telemetry logs recorded yet.
                      </Text>
                    ) : (
                      rawLogs.map((log) => (
                        <View
                          key={log.id}
                          style={[
                            styles.logRow,
                            {
                              borderBottomColor: theme.outlineVariant,
                              backgroundColor: theme.inputBg,
                            },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View
                                style={[
                                  styles.statusPill,
                                  {
                                    backgroundColor:
                                      log.status_code === 200
                                        ? 'rgba(16, 185, 129, 0.15)'
                                        : log.status_code === 403
                                        ? 'rgba(245, 158, 11, 0.15)'
                                        : 'rgba(239, 68, 68, 0.15)',
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    color:
                                      log.status_code === 200 ? '#10B981' : log.status_code === 403 ? '#F59E0B' : '#EF4444',
                                    fontSize: 10,
                                    fontFamily: bold,
                                  }}
                                >
                                  {log.status_code}
                                </Text>
                              </View>
                              <Text style={{ color: theme.text, fontSize: 13, fontFamily: bold }}>
                                {log.endpoint}
                              </Text>
                              <Text style={{ color: theme.accent, fontSize: 11, fontFamily: body }}>
                                [{log.tab_mode}]
                              </Text>
                            </View>

                            <Text style={{ color: theme.textTertiary, fontSize: 11 }}>
                              {formatISTDateTime(log.timestamp)}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                            <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                              Model: {log.provider_used} • User: {log.user_id ? '👤 Registered' : `👻 ${log.guest_id || 'Guest'}`}
                            </Text>
                            <Text style={{ color: theme.text, fontSize: 11, fontFamily: bold }}>
                              ⚡ {log.latency_ms}ms • 🔥 {log.total_tokens} toks • 💵 ${log.cost_usd?.toFixed(5) || '0.00000'}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  menuToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeframePill: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
  },
  timeframeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bodyLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: 1,
    padding: 10,
    alignItems: 'stretch',
  },
  sidebarSectionLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 6,
    marginTop: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navText: {
    fontSize: 13,
  },
  systemStatusBox: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mainContent: {
    flex: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 180,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 6,
  },
  chartRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  boxTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  // 3-Column Separated Layout
  threeColumnLayout: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  usersListColumn: {
    borderRightWidth: 1,
    height: '100%',
  },
  sessionsListColumn: {
    borderRightWidth: 1,
    height: '100%',
  },
  chatTranscriptColumn: {
    flex: 1,
    height: '100%',
  },
  columnHeader: {
    padding: 12,
    borderBottomWidth: 1,
  },
  columnHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  collapseIconBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  subtabToggle: {
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    padding: 2,
  },
  subtabBtn: {
    flex: 1,
    paddingVertical: 4,
    alignItems: 'center',
    borderRadius: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  userCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderLeftWidth: 3,
    borderBottomWidth: 1,
  },
  sessionCardItem: {
    padding: 10,
    borderLeftWidth: 3,
    borderBottomWidth: 1,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modeTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  threadHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threadHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  bubbleWrapper: {
    marginVertical: 8,
    width: '100%',
  },
  bubbleCard: {
    maxWidth: '82%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 21,
  },
  stageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  copyBtn: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyIconText: {
    fontSize: 10,
  },
  sourcesCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  emptyInspectorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    marginTop: 40,
  },
  emptyInspectorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyInspectorSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 20,
  },
  logRow: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  loginSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  errorAlert: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  input: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  loginBtn: {
    width: '100%',
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    fontSize: 14,
  },
});
