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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  AdminLanguagesOverview,
  ServerLanguageConfig,
  LanguageAnalyticsOverview,
  LanguagePerformanceStat,
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

type NavTab = 'overview' | 'users' | 'languages' | 'financials' | 'performance' | 'scripture' | 'logs';

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1200;
  const isTablet = width >= 720;
  const isMobile = width < 720;
  const isWideDesktop = width >= 1200;

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  // Narrow screens use this same navigation as an overlay drawer.
  const sidebarCompact = sidebarCollapsed || (!isWideDesktop && !sidebarDrawerOpen);
  const [timeframeDays, setTimeframeDays] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Column Visibility States for 3-Column Chat Inspector
  const [showUsersColumn, setShowUsersColumn] = useState(true);
  const [showSessionsColumn, setShowSessionsColumn] = useState(true);
  const [mobileInspectorView, setMobileInspectorView] = useState<'users' | 'sessions' | 'transcript'>('users');

  const handleAdminTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (!isDesktop) setSidebarDrawerOpen(false);
    if (isMobile && tab === 'users') setMobileInspectorView('users');
  };
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
  const [adminLanguages, setAdminLanguages] = useState<AdminLanguagesOverview | null>(null);
  const [languageAnalytics, setLanguageAnalytics] = useState<LanguageAnalyticsOverview | null>(null);
  const [languageViewMode, setLanguageViewMode] = useState<'matrix' | 'analytics'>('matrix');
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<'all' | 'app_enabled' | 'chat_enabled' | 'beta'>('all');
  const [updatingLangCode, setUpdatingLangCode] = useState<string | null>(null);
  const [resettingLanguages, setResettingLanguages] = useState(false);

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

  const handleToggleLanguage = async (code: string, updates: { is_app_enabled?: boolean; is_chat_enabled?: boolean; is_beta?: boolean }) => {
    setUpdatingLangCode(code);
    try {
      await apiService.updateAdminLanguage(code, updates);
      const [refreshedLangs, refreshedAnalytics] = await Promise.all([
        apiService.fetchAdminLanguages(),
        apiService.fetchAdminLanguageAnalytics(timeframeDays).catch(() => null),
      ]);
      setAdminLanguages(refreshedLangs);
      if (refreshedAnalytics) setLanguageAnalytics(refreshedAnalytics);
    } catch (err: any) {
      alert(`Could not update language ${code}: ${err.message}`);
    } finally {
      setUpdatingLangCode(null);
    }
  };

  const handleResetLanguages = async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const ok = window.confirm("Reset all languages to default configuration?");
      if (!ok) return;
    }
    setResettingLanguages(true);
    try {
      await apiService.resetAdminLanguages();
      const [refreshedLangs, refreshedAnalytics] = await Promise.all([
        apiService.fetchAdminLanguages(),
        apiService.fetchAdminLanguageAnalytics(timeframeDays).catch(() => null),
      ]);
      setAdminLanguages(refreshedLangs);
      if (refreshedAnalytics) setLanguageAnalytics(refreshedAnalytics);
    } catch (err: any) {
      alert(`Could not reset languages: ${err.message}`);
    } finally {
      setResettingLanguages(false);
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
        languagesRes,
        langAnalyticsRes,
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
        apiService.fetchAdminLanguages().catch(() => null),
        apiService.fetchAdminLanguageAnalytics(days).catch(() => null),
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
      if (languagesRes) {
        setAdminLanguages(languagesRes);
      }
      if (langAnalyticsRes) {
        setLanguageAnalytics(langAnalyticsRes);
      }

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

  const handleAdminLogout = async () => {
    try {
      await supabase.auth.signOut();
      await apiService.logout();
    } catch (e) {
      console.warn('Admin logout error:', e);
    } finally {
      setOverview(null);
      setError('Signed out');
      router.replace('/login');
    }
  };

  const inspectUser = async (user: AdminUserItem) => {
    setSelectedUser(user);
    if (!isTablet) setMobileInspectorView('sessions');
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

  const selectGuest = (guestId: string | null, sessions: UserChatSessionDetail[]) => {
    setSelectedGuestId(guestId);
    if (sessions.length > 0) setActiveSession(sessions[0]);
    if (!isTablet) setMobileInspectorView('sessions');
  };

  useEffect(() => {
    if (activeTab === 'users' && userSubTab === 'guests' && guestChats.length === 0) {
      loadGuestSessions();
    }
  }, [activeTab, userSubTab]);

  // If unauthenticated / error
  if (error && !overview) {
    return (
      <View
        style={[
          styles.loginContainer,
          {
            backgroundColor: theme.bg,
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingBottom: Math.max(insets.bottom, 24) + 12,
          },
        ]}
      >
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
            placeholder="Admin Password"
            placeholderTextColor={theme.textTertiary}
            value={adminPassword}
            onChangeText={setAdminPassword}
            secureTextEntry
          />

          <TouchableOpacity
            onPress={handleAdminLogin}
            disabled={adminLoginLoading}
            style={[styles.loginBtn, { backgroundColor: theme.accent, opacity: adminLoginLoading ? 0.6 : 1 }]}
          >
            {adminLoginLoading ? (
              <ActivityIndicator size="small" color="#09090B" />
            ) : (
              <Text style={[styles.btnText, { color: '#09090B', fontFamily: bold }]}>Sign In as Admin</Text>
            )}
          </TouchableOpacity>

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

  const allServerLangs = adminLanguages?.languages || [];
  const filteredAdminLangs = allServerLangs.filter((l) => {
    const q = languageSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      l.code.toLowerCase().includes(q) ||
      l.name.toLowerCase().includes(q) ||
      l.native_name.toLowerCase().includes(q) ||
      (l.region && l.region.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (languageFilter === 'app_enabled') return l.is_app_enabled;
    if (languageFilter === 'chat_enabled') return l.is_chat_enabled;
    if (languageFilter === 'beta') return l.is_beta;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingBottom: insets.bottom }]}>
      {/* Top Navbar */}
      <View
        style={[
          styles.topBar,
          {
            borderBottomColor: theme.outlineVariant,
            backgroundColor: theme.surface,
            paddingTop: Math.max(insets.top, 12) + (Platform.OS === 'web' ? 4 : 8),
          },
        ]}
      >
          <View style={styles.topBarPrimary}>
          <TouchableOpacity
            accessibilityLabel={sidebarDrawerOpen ? 'Close navigation' : sidebarCompact ? 'Open navigation' : 'Collapse sidebar'}
            onPress={() => isDesktop ? setSidebarCollapsed(!sidebarCollapsed) : setSidebarDrawerOpen(!sidebarDrawerOpen)}
            style={[styles.menuToggleBtn, { borderColor: theme.outlineVariant }]}
          >
            <Ionicons name={sidebarDrawerOpen || !sidebarCompact ? 'close-outline' : 'menu-outline'} size={20} color={theme.text} />
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

        <View style={[styles.topActions, { width: isMobile ? '100%' : undefined }]}>
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
            <Ionicons name="sync-outline" size={16} color={theme.accent} />
            {!isMobile && <Text style={{ color: theme.accent, fontSize: 12, fontFamily: bold }}>Sync</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={[styles.actionBtn, { borderColor: theme.outlineVariant, backgroundColor: theme.surface }]}
          >
            <Ionicons name="open-outline" size={16} color={theme.text} />
            {!isMobile && <Text style={{ color: theme.text, fontSize: 12, fontFamily: bold }}>App</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleAdminLogout}
            style={[styles.actionBtn, { borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
          >
            <Ionicons name="log-out-outline" size={16} color="#EF4444" />
            {!isMobile && <Text style={{ color: '#EF4444', fontSize: 12, fontFamily: bold }}>Logout</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Body: Responsive Layout (Collapsible Sidebar + Main Area) */}
      <View style={styles.bodyLayout}>
        {!isDesktop && sidebarDrawerOpen && (
          <RNPressable
            accessibilityLabel="Close navigation"
            onPress={() => setSidebarDrawerOpen(false)}
            style={styles.sidebarScrim}
          />
        )}
        {/* Left Sidebar (Collapses to icons-only when closed) */}
        <View
          style={[
            styles.sidebar,
            {
              display: !isDesktop && !sidebarDrawerOpen ? 'none' : 'flex',
              backgroundColor: theme.surface,
              borderRightColor: theme.outlineVariant,
              width: !isDesktop ? Math.min(width * 0.82, 300) : sidebarCompact ? 64 : 240,
              ...(!isDesktop ? { position: 'absolute' as const, left: 0, top: 0, bottom: 0, zIndex: 30, shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 20, shadowOffset: { width: 6, height: 0 }, elevation: 12 } : {}),
            },
          ]}
        >
          {!sidebarCompact && (
            <Text style={[styles.sidebarSectionLabel, { color: theme.textTertiary, fontFamily: bold }]}>
              NAVIGATION
            </Text>
          )}

          <TouchableOpacity
            onPress={() => handleAdminTabChange('overview')}
            style={[
              styles.navItem,
              activeTab === 'overview' && { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: theme.accent },
              sidebarCompact && { justifyContent: 'center', paddingHorizontal: 0 },
            ]}
          >
            <Text style={{ fontSize: 18 }}>📊</Text>
            {!sidebarCompact && (
              <Text style={[styles.navText, { color: activeTab === 'overview' ? theme.accent : theme.text, fontFamily: activeTab === 'overview' ? bold : body }]}>
                Overview & KPIs
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleAdminTabChange('users')}
            style={[
              styles.navItem,
              activeTab === 'users' && { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: theme.accent },
              sidebarCompact && { justifyContent: 'center', paddingHorizontal: 0 },
            ]}
          >
            <Text style={{ fontSize: 18 }}>💬</Text>
            {!sidebarCompact && (
              <Text style={[styles.navText, { color: activeTab === 'users' ? theme.accent : theme.text, fontFamily: activeTab === 'users' ? bold : body }]}>
                Chat Inspector
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleAdminTabChange('languages')}
            style={[
              styles.navItem,
              activeTab === 'languages' && { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: theme.accent },
              sidebarCompact && { justifyContent: 'center', paddingHorizontal: 0 },
            ]}
          >
            <Text style={{ fontSize: 18 }}>🌐</Text>
            {!sidebarCompact && (
              <Text style={[styles.navText, { color: activeTab === 'languages' ? theme.accent : theme.text, fontFamily: activeTab === 'languages' ? bold : body }]}>
                Language Control
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleAdminTabChange('financials')}
            style={[
              styles.navItem,
              activeTab === 'financials' && { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: theme.accent },
              sidebarCompact && { justifyContent: 'center', paddingHorizontal: 0 },
            ]}
          >
            <Text style={{ fontSize: 18 }}>💰</Text>
            {!sidebarCompact && (
              <Text style={[styles.navText, { color: activeTab === 'financials' ? theme.accent : theme.text, fontFamily: activeTab === 'financials' ? bold : body }]}>
                Financials & Cost
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleAdminTabChange('performance')}
            style={[
              styles.navItem,
              activeTab === 'performance' && { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: theme.accent },
              sidebarCompact && { justifyContent: 'center', paddingHorizontal: 0 },
            ]}
          >
            <Text style={{ fontSize: 18 }}>⚡</Text>
            {!sidebarCompact && (
              <Text style={[styles.navText, { color: activeTab === 'performance' ? theme.accent : theme.text, fontFamily: activeTab === 'performance' ? bold : body }]}>
                Performance
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleAdminTabChange('scripture')}
            style={[
              styles.navItem,
              activeTab === 'scripture' && { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: theme.accent },
              sidebarCompact && { justifyContent: 'center', paddingHorizontal: 0 },
            ]}
          >
            <Text style={{ fontSize: 18 }}>🪷</Text>
            {!sidebarCompact && (
              <Text style={[styles.navText, { color: activeTab === 'scripture' ? theme.accent : theme.text, fontFamily: activeTab === 'scripture' ? bold : body }]}>
                Scripture & Personas
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleAdminTabChange('logs')}
            style={[
              styles.navItem,
              activeTab === 'logs' && { backgroundColor: 'rgba(217, 119, 6, 0.15)', borderColor: theme.accent },
              sidebarCompact && { justifyContent: 'center', paddingHorizontal: 0 },
            ]}
          >
            <Text style={{ fontSize: 18 }}>📜</Text>
            {!sidebarCompact && (
              <Text style={[styles.navText, { color: activeTab === 'logs' ? theme.accent : theme.text, fontFamily: activeTab === 'logs' ? bold : body }]}>
                Live Raw Logs
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            onPress={handleAdminLogout}
            style={[
              styles.navItem,
              { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.08)', marginBottom: 10 },
              sidebarCompact && { justifyContent: 'center', paddingHorizontal: 0 },
            ]}
          >
            <Text style={{ fontSize: 16 }}>🚪</Text>
            {!sidebarCompact && (
              <Text style={[styles.navText, { color: '#EF4444', fontFamily: bold }]}>
                Sign Out
              </Text>
            )}
          </TouchableOpacity>

          <View style={[styles.systemStatusBox, { backgroundColor: theme.inputBg, borderColor: theme.outlineVariant }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: sidebarCompact ? 'center' : 'flex-start' }}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              {!sidebarCompact && (
                <Text style={{ color: theme.text, fontSize: 11, fontFamily: bold }}>PostgreSQL Connected</Text>
              )}
            </View>
            {!sidebarCompact && (
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
                <View style={[styles.threeColumnLayout, { flexDirection: isTablet ? 'row' : 'column' }]}>
                  {/* COLUMN 1: Seekers / Users List */}
                  {(isMobile ? mobileInspectorView === 'users' : showUsersColumn) && (
                    <View
                      style={[
                        styles.usersListColumn,
                        {
                          backgroundColor: theme.surface,
                          borderRightColor: theme.outlineVariant,
                          width: isTablet ? 250 : '100%',
                          height: isTablet ? '100%' : undefined,
                          flex: isTablet ? undefined : 1,
                        },
                      ]}
                    >
                      {/* Column 1 Header */}
                      <View style={[styles.columnHeader, { borderBottomColor: theme.outlineVariant }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={[styles.columnHeaderTitle, { color: theme.text, fontFamily: serif }]}>
                            Seekers
                          </Text>
                          {!isMobile && <TouchableOpacity
                            onPress={() => setShowUsersColumn(false)}
                            style={[styles.collapseIconBtn, { borderColor: theme.outlineVariant }]}
                          >
                            <Text style={{ color: theme.textTertiary, fontSize: 11 }}>◀ Hide</Text>
                          </TouchableOpacity>}
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
                                selectGuest(null, guestChats);
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
                                      const gSessions = guestChats.filter((sess) => (sess.guest_id || 'anonymous') === g.guest_id);
                                      selectGuest(g.guest_id, gSessions);
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
                  {(isMobile ? mobileInspectorView === 'sessions' : showSessionsColumn) && (
                    <View
                      style={[
                        styles.sessionsListColumn,
                        {
                          backgroundColor: theme.surface,
                          borderRightColor: theme.outlineVariant,
                          width: isTablet ? 270 : '100%',
                          height: isTablet ? '100%' : undefined,
                          flex: isTablet ? undefined : 1,
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
                            onPress={() => isMobile ? setMobileInspectorView('users') : setShowSessionsColumn(false)}
                            style={[styles.collapseIconBtn, { borderColor: theme.outlineVariant }]}
                          >
                            <Text style={{ color: theme.textTertiary, fontSize: 11 }}>{isMobile ? '← Users' : '◀ Hide'}</Text>
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
                                onPress={() => { setActiveSession(sess); if (!isTablet) setMobileInspectorView('transcript'); }}
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
                  {(!isMobile || mobileInspectorView === 'transcript') && <View style={[styles.chatTranscriptColumn, { backgroundColor: theme.bg }]}>
                    {/* Column 3 Header */}
                    <View style={[styles.threadHeader, { backgroundColor: theme.surface, borderBottomColor: theme.outlineVariant }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        {/* Quick restore toggles if columns are hidden */}
                        {!isMobile && !showUsersColumn && (
                          <TouchableOpacity
                            onPress={() => setShowUsersColumn(true)}
                            style={[styles.collapseIconBtn, { borderColor: theme.outlineVariant }]}
                          >
                            <Text style={{ color: theme.text, fontSize: 11 }}>👥 Seekers</Text>
                          </TouchableOpacity>
                        )}
                        {!isMobile && !showSessionsColumn && (
                          <TouchableOpacity
                            onPress={() => setShowSessionsColumn(true)}
                            style={[styles.collapseIconBtn, { borderColor: theme.outlineVariant }]}
                          >
                            <Text style={{ color: theme.text, fontSize: 11 }}>📑 Sessions</Text>
                          </TouchableOpacity>
                        )}

                        {isMobile && (
                          <TouchableOpacity accessibilityLabel="Back to sessions" onPress={() => setMobileInspectorView('sessions')} style={[styles.collapseIconBtn, { borderColor: theme.outlineVariant }]}>
                            <Text style={{ color: theme.text, fontSize: 11 }}>← Sessions</Text>
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
                  </View>}
                </View>
              )}

              {/* ========================================================= */}
              {/* TAB: LANGUAGE CONTROL & DETAILED ANALYTICS SUITE          */}
              {/* ========================================================= */}
              {activeTab === 'languages' && (
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
                  {/* Top Sub-Navigation Mode Switcher */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <View style={[styles.subtabToggle, { backgroundColor: theme.inputBg, borderColor: theme.outlineVariant, width: 340 }]}>
                      <TouchableOpacity
                        onPress={() => setLanguageViewMode('matrix')}
                        style={[styles.subtabBtn, languageViewMode === 'matrix' && { backgroundColor: theme.accent }]}
                      >
                        <Text style={{ color: languageViewMode === 'matrix' ? '#09090B' : theme.textSecondary, fontSize: 12, fontFamily: bold }}>
                          🎛️ Availability Matrix ({adminLanguages?.total_languages || 23})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setLanguageViewMode('analytics')}
                        style={[styles.subtabBtn, languageViewMode === 'analytics' && { backgroundColor: theme.accent }]}
                      >
                        <Text style={{ color: languageViewMode === 'analytics' ? '#09090B' : theme.textSecondary, fontSize: 12, fontFamily: bold }}>
                          📊 Usage & Metrics ({languageAnalytics?.total_queries || 0})
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={handleResetLanguages}
                        disabled={resettingLanguages}
                        style={[styles.actionBtn, { borderColor: theme.outlineVariant, backgroundColor: theme.inputBg }]}
                      >
                        <Text style={{ color: theme.textSecondary, fontSize: 11, fontFamily: bold }}>
                          {resettingLanguages ? 'Resetting...' : '↺ Reset Defaults'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => fetchAllAdminData(timeframeDays)}
                        style={[styles.actionBtn, { borderColor: theme.accent, backgroundColor: theme.surface }]}
                      >
                        <Text style={{ color: theme.accent, fontSize: 11, fontFamily: bold }}>🔄 Refresh</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {languageViewMode === 'matrix' ? (
                    <>
                      {/* Top Stats Cards */}
                      <View style={styles.kpiGrid}>
                        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                          <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: bold }]}>TOTAL SCHEDULED LANGUAGES</Text>
                          <Text style={[styles.kpiValue, { color: theme.text, fontFamily: serif }]}>
                            {adminLanguages?.total_languages || 23}
                          </Text>
                          <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                            🇮🇳 22 Eighth Schedule + English
                          </Text>
                        </View>

                        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                          <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: bold }]}>APP UI TRANSLATION ACTIVE</Text>
                          <Text style={[styles.kpiValue, { color: theme.accent, fontFamily: serif }]}>
                            {adminLanguages?.app_enabled_count ?? 14}
                          </Text>
                          <Text style={{ color: theme.accent, fontSize: 11, marginTop: 4 }}>
                            ⚡ Full UI screens & drawer localized
                          </Text>
                        </View>

                        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                          <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: bold }]}>AI DEITY PERSONA CHAT ACTIVE</Text>
                          <Text style={[styles.kpiValue, { color: '#10B981', fontFamily: serif }]}>
                            {adminLanguages?.chat_enabled_count ?? 23}
                          </Text>
                          <Text style={{ color: '#10B981', fontSize: 11, marginTop: 4 }}>
                            💬 Multilingual RAG & prompt generation
                          </Text>
                        </View>

                        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                          <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: bold }]}>BETA SCRIPT EXPERIMENTS</Text>
                          <Text style={[styles.kpiValue, { color: '#F59E0B', fontFamily: serif }]}>
                            {adminLanguages?.beta_count ?? 9}
                          </Text>
                          <Text style={{ color: '#F59E0B', fontSize: 11, marginTop: 4 }}>
                            🧪 Flagged with Beta tag in picker
                          </Text>
                        </View>
                      </View>

                      {/* Filter & Search Bar Box */}
                      <View style={[styles.cardBox, { backgroundColor: theme.surface, borderColor: theme.outlineVariant, marginBottom: 16 }]}>
                        <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between', alignItems: isTablet ? 'center' : 'stretch', gap: 12, marginBottom: 12 }}>
                          <View>
                            <Text style={[styles.boxTitle, { color: theme.text, fontFamily: serif }]}>
                              🌐 Language Availability Matrix
                            </Text>
                            <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: body }}>
                              Toggle client UI availability and AI prompt translation in real-time without app redeployment.
                            </Text>
                          </View>
                        </View>

                        {/* Filter Pills & Search */}
                        <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 10, alignItems: isTablet ? 'center' : 'stretch' }}>
                          <View style={[styles.searchBox, { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.outlineVariant }]}>
                            <Text style={{ fontSize: 12, marginRight: 6 }}>🔍</Text>
                            <TextInput
                              style={{ flex: 1, color: theme.text, fontSize: 12, fontFamily: body }}
                              placeholder="Search language name, code, script, or region..."
                              placeholderTextColor={theme.textTertiary}
                              value={languageSearchQuery}
                              onChangeText={setLanguageSearchQuery}
                            />
                            {languageSearchQuery.length > 0 && (
                              <TouchableOpacity onPress={() => setLanguageSearchQuery('')}>
                                <Text style={{ color: theme.textTertiary, fontSize: 11 }}>✕</Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          <View style={styles.filterPillsRow}>
                            {(['all', 'app_enabled', 'chat_enabled', 'beta'] as const).map((filterKey) => {
                              const labels: Record<string, string> = {
                                all: `All (${allServerLangs.length})`,
                                app_enabled: 'App UI Active',
                                chat_enabled: 'AI Chat Active',
                                beta: 'Beta Only',
                              };
                              const isSelected = languageFilter === filterKey;
                              return (
                                <TouchableOpacity
                                  key={filterKey}
                                  onPress={() => setLanguageFilter(filterKey)}
                                  style={[
                                    styles.filterPill,
                                    {
                                      backgroundColor: isSelected ? theme.accent : theme.inputBg,
                                      borderColor: isSelected ? theme.accent : theme.outlineVariant,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={{
                                      color: isSelected ? '#09090B' : theme.textSecondary,
                                      fontSize: 11,
                                      fontFamily: isSelected ? bold : body,
                                    }}
                                  >
                                    {labels[filterKey]}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      </View>

                      {/* Languages Grid */}
                      <View style={styles.languageGrid}>
                        {filteredAdminLangs.map((item) => {
                          const isUpdating = updatingLangCode === item.code;

                          return (
                            <View
                              key={item.code}
                              style={[
                                styles.langCard,
                                {
                                  backgroundColor: theme.surface,
                                  borderColor: item.is_app_enabled ? theme.outlineVariant : 'rgba(239, 68, 68, 0.3)',
                                },
                              ]}
                            >
                              {/* Card Header: Code Badge + Names */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                  <View
                                    style={[
                                      styles.langCodeBadge,
                                      {
                                        backgroundColor: item.is_app_enabled
                                          ? (theme.isDark ? 'rgba(217, 119, 6, 0.2)' : '#F5E6D3')
                                          : 'rgba(150, 150, 150, 0.1)',
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={{
                                        color: item.is_app_enabled ? theme.accent : theme.textTertiary,
                                        fontFamily: bold,
                                        fontSize: 12,
                                      }}
                                    >
                                      {item.code.toUpperCase()}
                                    </Text>
                                  </View>

                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <Text style={{ color: theme.text, fontSize: 14, fontFamily: bold }}>
                                        {item.name}
                                      </Text>
                                      <Text style={{ color: theme.accent, fontSize: 13, fontFamily: serif }}>
                                        ({item.native_name})
                                      </Text>
                                      {item.is_beta && (
                                        <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                          <Text style={{ color: '#F59E0B', fontSize: 9, fontFamily: bold }}>BETA</Text>
                                        </View>
                                      )}
                                    </View>
                                    {item.region && (
                                      <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: body, marginTop: 1 }}>
                                        📍 {item.region}
                                      </Text>
                                    )}
                                  </View>
                                </View>

                                {isUpdating && <ActivityIndicator size="small" color={theme.accent} />}
                              </View>

                              {/* Controls / Switches */}
                              <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: theme.outlineVariant, paddingTop: 10 }]}>
                                {/* Toggle 1: App UI */}
                                <TouchableOpacity
                                  onPress={() => handleToggleLanguage(item.code, { is_app_enabled: !item.is_app_enabled })}
                                  disabled={isUpdating}
                                  style={[
                                    styles.toggleBtn,
                                    {
                                      flex: 1,
                                      backgroundColor: item.is_app_enabled ? 'rgba(16, 185, 129, 0.12)' : theme.inputBg,
                                      borderColor: item.is_app_enabled ? '#10B981' : theme.outlineVariant,
                                    },
                                  ]}
                                >
                                  <Text style={{ fontSize: 12 }}>{item.is_app_enabled ? '📱' : '⚪'}</Text>
                                  <View>
                                    <Text
                                      style={{
                                        color: item.is_app_enabled ? '#10B981' : theme.textTertiary,
                                        fontSize: 10,
                                        fontFamily: bold,
                                      }}
                                    >
                                      APP UI
                                    </Text>
                                    <Text style={{ color: item.is_app_enabled ? '#10B981' : theme.textSecondary, fontSize: 9 }}>
                                      {item.is_app_enabled ? 'Enabled' : 'Disabled'}
                                    </Text>
                                  </View>
                                </TouchableOpacity>

                                {/* Toggle 2: AI Chat */}
                                <TouchableOpacity
                                  onPress={() => handleToggleLanguage(item.code, { is_chat_enabled: !item.is_chat_enabled })}
                                  disabled={isUpdating}
                                  style={[
                                    styles.toggleBtn,
                                    {
                                      flex: 1,
                                      backgroundColor: item.is_chat_enabled ? 'rgba(59, 130, 246, 0.12)' : theme.inputBg,
                                      borderColor: item.is_chat_enabled ? '#3B82F6' : theme.outlineVariant,
                                    },
                                  ]}
                                >
                                  <Text style={{ fontSize: 12 }}>{item.is_chat_enabled ? '🤖' : '⚪'}</Text>
                                  <View>
                                    <Text
                                      style={{
                                        color: item.is_chat_enabled ? '#3B82F6' : theme.textTertiary,
                                        fontSize: 10,
                                        fontFamily: bold,
                                      }}
                                    >
                                      AI CHAT
                                    </Text>
                                    <Text style={{ color: item.is_chat_enabled ? '#3B82F6' : theme.textSecondary, fontSize: 9 }}>
                                      {item.is_chat_enabled ? 'Active' : 'Disabled'}
                                    </Text>
                                  </View>
                                </TouchableOpacity>

                                {/* Toggle 3: Beta */}
                                <TouchableOpacity
                                  onPress={() => handleToggleLanguage(item.code, { is_beta: !item.is_beta })}
                                  disabled={isUpdating}
                                  style={[
                                    styles.toggleBtn,
                                    {
                                      backgroundColor: item.is_beta ? 'rgba(245, 158, 11, 0.15)' : theme.inputBg,
                                      borderColor: item.is_beta ? '#F59E0B' : theme.outlineVariant,
                                    },
                                  ]}
                                >
                                  <Text style={{ fontSize: 11 }}>{item.is_beta ? '🧪' : '🏷️'}</Text>
                                  <Text
                                    style={{
                                      color: item.is_beta ? '#F59E0B' : theme.textSecondary,
                                      fontSize: 10,
                                      fontFamily: bold,
                                    }}
                                  >
                                    {item.is_beta ? 'Beta' : 'Stable'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </>
                  ) : (
                    <>
                      {/* ========================================================= */}
                      {/* VIEW 2: PER-LANGUAGE USAGE & PERFORMANCE ANALYTICS         */}
                      {/* ========================================================= */}
                      {/* Analytics KPI Row */}
                      <View style={styles.kpiGrid}>
                        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                          <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: bold }]}>TOTAL TELEMETRY QUERIES</Text>
                          <Text style={[styles.kpiValue, { color: theme.text, fontFamily: serif }]}>
                            {languageAnalytics?.total_queries || 0}
                          </Text>
                          <Text style={{ color: theme.accent, fontSize: 11, marginTop: 4 }}>
                            ⚡ Analyzed over past {timeframeDays} days
                          </Text>
                        </View>

                        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                          <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: bold }]}>TOTAL TOKENS CONSUMED</Text>
                          <Text style={[styles.kpiValue, { color: '#3B82F6', fontFamily: serif }]}>
                            {(languageAnalytics?.total_tokens || 0).toLocaleString()}
                          </Text>
                          <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                            🔥 Prompt + Completion tokens
                          </Text>
                        </View>

                        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                          <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: bold }]}>TOTAL MULTILINGUAL SPEND</Text>
                          <Text style={[styles.kpiValue, { color: '#10B981', fontFamily: serif }]}>
                            ${languageAnalytics?.total_cost_usd?.toFixed(4) || '0.0000'}
                          </Text>
                          <Text style={{ color: '#10B981', fontSize: 11, marginTop: 4 }}>
                            💵 Estimated LLM token cost (USD)
                          </Text>
                        </View>

                        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.outlineVariant }]}>
                          <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: bold }]}>TOP ACTIVE LANGUAGE</Text>
                          <Text style={[styles.kpiValue, { color: '#F59E0B', fontFamily: serif }]}>
                            {languageAnalytics?.language_performance?.[0]?.name || 'Hindi / English'}
                          </Text>
                          <Text style={{ color: '#F59E0B', fontSize: 11, marginTop: 4 }}>
                            {languageAnalytics?.language_performance?.[0] ? `${languageAnalytics.language_performance[0].traffic_share_percentage}% of total queries` : 'Leading regional adoption'}
                          </Text>
                        </View>
                      </View>

                      {/* Charts Grid: Traffic Share & Cost */}
                      <View style={styles.chartRow}>
                        <View style={{ flex: 1, minWidth: 280 }}>
                          <RankedBarChart
                            title="📈 Language Consultation Volume"
                            subtitle={`Query volume share across Indic languages (${timeframeDays}D)`}
                            items={(languageAnalytics?.language_performance || [])
                              .filter(l => l.query_count > 0)
                              .map((l) => ({
                                label: `${l.name} (${l.native_name})`,
                                value: l.query_count,
                                secondaryLabel: `${l.traffic_share_percentage}%`,
                                icon: '🌐',
                              }))}
                            theme={theme}
                            unit="queries"
                          />
                        </View>

                        <View style={{ flex: 1, minWidth: 280 }}>
                          <RankedBarChart
                            title="🪙 LLM Token Spend by Language"
                            subtitle="Total estimated API cost in USD broken down by language"
                            items={(languageAnalytics?.language_performance || [])
                              .filter(l => l.cost_usd > 0)
                              .map((l) => ({
                                label: `${l.name}`,
                                value: l.cost_usd,
                                secondaryLabel: `$${l.cost_usd.toFixed(4)}`,
                                color: '#10B981',
                                icon: '💵',
                              }))}
                            theme={theme}
                            unit="USD"
                          />
                        </View>
                      </View>

                      {/* User Profile Language Preferences Distribution */}
                      <View style={[styles.chartRow, { marginTop: 16 }]}>
                        <View style={{ flex: 1, minWidth: 280 }}>
                          <DistributionChart
                            title="📱 User Selected App Interface Language"
                            subtitle="Primary UI language configured by registered users"
                            items={(languageAnalytics?.user_app_preferences || []).map((p, idx) => ({
                              label: p.label,
                              value: p.count,
                              percentage: p.percentage,
                              color: ['#D97706', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#6366F1'][idx % 6],
                            }))}
                            theme={theme}
                          />
                        </View>

                        <View style={{ flex: 1, minWidth: 280 }}>
                          <DistributionChart
                            title="💬 User Selected AI Persona Chat Language"
                            subtitle="AI deity dialogue language preferred by registered seekers"
                            items={(languageAnalytics?.user_chat_preferences || []).map((p, idx) => ({
                              label: p.label,
                              value: p.count,
                              percentage: p.percentage,
                              color: ['#10B981', '#D97706', '#3B82F6', '#8B5CF6', '#F59E0B', '#14B8A6'][idx % 6],
                            }))}
                            theme={theme}
                          />
                        </View>
                      </View>

                      {/* Granular Language Performance Matrix Table */}
                      <View style={[styles.cardBox, { backgroundColor: theme.surface, borderColor: theme.outlineVariant, marginTop: 16 }]}>
                        <View style={{ marginBottom: 14 }}>
                          <Text style={[styles.boxTitle, { color: theme.text, fontFamily: serif }]}>
                            📋 Detailed Per-Language Performance Matrix
                          </Text>
                          <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: body }}>
                            Complete breakdown of query traffic, latency benchmarks, token density, and Vedic persona affinities.
                          </Text>
                        </View>

                        {(languageAnalytics?.language_performance || []).map((lang) => (
                          <View
                            key={lang.code}
                            style={[
                              styles.logRow,
                              {
                                backgroundColor: theme.inputBg,
                                borderBottomColor: theme.outlineVariant,
                                marginBottom: 10,
                              },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View
                                  style={[
                                    styles.langCodeBadge,
                                    {
                                      backgroundColor: lang.is_app_enabled
                                        ? (theme.isDark ? 'rgba(217, 119, 6, 0.2)' : '#F5E6D3')
                                        : 'rgba(150, 150, 150, 0.1)',
                                    },
                                  ]}
                                >
                                  <Text style={{ color: theme.accent, fontFamily: bold, fontSize: 11 }}>
                                    {lang.code.toUpperCase()}
                                  </Text>
                                </View>

                                <View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ color: theme.text, fontSize: 14, fontFamily: bold }}>
                                      {lang.name}
                                    </Text>
                                    <Text style={{ color: theme.accent, fontSize: 13, fontFamily: serif }}>
                                      ({lang.native_name})
                                    </Text>
                                  </View>
                                  {lang.region && (
                                    <Text style={{ color: theme.textTertiary, fontSize: 10 }}>
                                      📍 {lang.region}
                                    </Text>
                                  )}
                                </View>
                              </View>

                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <View style={{ alignItems: 'flex-end' }}>
                                  <Text style={{ color: theme.text, fontSize: 12, fontFamily: bold }}>
                                    {lang.query_count} queries ({lang.traffic_share_percentage}%)
                                  </Text>
                                  <Text style={{ color: theme.textTertiary, fontSize: 10 }}>
                                    🔥 {lang.total_tokens.toLocaleString()} tokens • 💵 ${lang.cost_usd.toFixed(4)}
                                  </Text>
                                </View>

                                <View
                                  style={[
                                    styles.statusPill,
                                    {
                                      backgroundColor:
                                        lang.avg_latency_ms < 1500
                                          ? 'rgba(16, 185, 129, 0.15)'
                                          : 'rgba(245, 158, 11, 0.15)',
                                    },
                                  ]}
                                >
                                  <Text
                                    style={{
                                      color: lang.avg_latency_ms < 1500 ? '#10B981' : '#F59E0B',
                                      fontSize: 10,
                                      fontFamily: bold,
                                    }}
                                  >
                                    ⚡ {lang.avg_latency_ms}ms avg
                                  </Text>
                                </View>
                              </View>
                            </View>

                            {/* Top Vedic Personas Consulted */}
                            {lang.top_personas && lang.top_personas.length > 0 && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, borderTopWidth: 1, borderTopColor: theme.outlineVariant, paddingTop: 6 }}>
                                <Text style={{ color: theme.textTertiary, fontSize: 10, fontFamily: bold }}>
                                  🪷 Most Consulted Guides:
                                </Text>
                                {lang.top_personas.map((p, pIdx) => (
                                  <View key={pIdx} style={{ backgroundColor: 'rgba(217, 119, 6, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ color: theme.accent, fontSize: 10, fontFamily: bold }}>
                                      {p.character} ({p.count})
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </ScrollView>
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
    flexWrap: 'wrap',
    gap: 12,
    zIndex: 10,
  },
  topBarPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  menuToggleBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  sidebarScrim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: 'rgba(9, 12, 18, 0.58)',
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
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  langCard: {
    flex: 1,
    minWidth: 320,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  langCodeBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});
