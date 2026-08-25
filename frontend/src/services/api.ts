import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import i18n, { CHAT_LANGUAGE_KEY, APP_LANGUAGE_KEY } from "../i18n";

// Extract host IP dynamically from Expo or fallback to localhost
const getLocalIp = (): string => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    return `http://${hostUri.split(":")[0]}:8000`;
  }
  return "http://192.168.1.10:8000";
};

// API URL priority: 1) .env (if valid for platform) -> 2) Platform default (web: localhost, mobile: Wi-Fi IP)
const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    // If it's a mobile device/emulator but the env URL points to localhost, redirect to local IP
    if (Platform.OS !== "web" && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
      return getLocalIp();
    }
    return envUrl;
  }
  return Platform.OS === "web" ? "http://localhost:8000" : getLocalIp();
};

export const API_BASE_URL = getApiBaseUrl();

console.log(
  `🌐 [API Service] Platform: ${Platform.OS} | Target API URL: ${API_BASE_URL}`,
);

export const getEffectiveLanguage = async (): Promise<string> => {
  try {
    const savedChat = await AsyncStorage.getItem(CHAT_LANGUAGE_KEY);
    if (savedChat && savedChat !== "auto") return savedChat;
    const savedApp = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
    if (savedApp) return savedApp;
  } catch (e) {
    // Ignore storage read errors
  }
  return i18n?.language || "en";
};

// Client-side Guest ID management
let cachedGuestId: string | null = null;
export const getGuestId = (): string => {
  if (cachedGuestId) return cachedGuestId;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      let stored = window.localStorage.getItem("vedic_guest_id");
      if (!stored) {
        stored =
          "guest_" +
          Math.random().toString(36).substring(2, 11) +
          "_" +
          Date.now();
        window.localStorage.setItem("vedic_guest_id", stored);
      }
      cachedGuestId = stored;
      return stored;
    }
  } catch (e) {
    // Ignore localStorage errors on native platforms
  }
  cachedGuestId = "guest_mobile_" + Math.random().toString(36).substring(2, 11);
  return cachedGuestId;
};

// Builds authenticated headers with Supabase JWT and Guest ID
const getHeaders = async (): Promise<Record<string, string>> => {
  const lang = await getEffectiveLanguage();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Guest-ID": getGuestId(),
    "Accept-Language": lang,
  };

  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn("Could not read auth token:", err);
  }

  return headers;
};

// Helper for HTTP requests with cookie credentials and auth headers
const customFetch = async (url: string, options: RequestInit = {}) => {
  const headers = await getHeaders();
  return fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
};

const handleApiResponse = async (res: Response, defaultErrorMsg: string) => {
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const detailMsg =
      errJson.detail?.message ||
      (typeof errJson.detail === "string" ? errJson.detail : null);
    const msg = detailMsg || defaultErrorMsg;
    const err: any = new Error(msg);
    err.status = res.status;
    err.quotaExceeded =
      res.status === 403 || errJson.detail?.quota_exceeded === true;
    throw err;
  }
  return res.json();
};

export interface SourceCitation {
  scenario_title?: string;
  epic?: string;
  character?: string;
  verse_citations?: string[];
  summary_snippet?: string;
}

export interface ChatResponse {
  reply: string;
  mode: string;
  character: string;
  stage?: "interviewing" | "resolved" | "follow_up";
  searched_vector_db?: boolean;
  provider_used: string;
  sources: SourceCitation[];
}

export interface FullChatResponse {
  stage: "interviewing" | "resolved" | "follow_up";
  reply: string;
  character: string;
  sources: SourceCitation[];
  searched_vector_db: boolean;
  provider_used?: string;
}

export interface RoundtableSpeakerReply {
  character: string;
  action: "speak" | "join" | "depart";
  content: string;
  sources?: SourceCitation[];
  stage?: "interviewing" | "resolved" | "follow_up";
}

export interface RoundtableChatResponse {
  replies: RoundtableSpeakerReply[];
  active_council: string[];
  muted_council?: string[];
  stage?: "interviewing" | "resolved" | "follow_up";
  provider_used?: string;
}

// Admin Telemetry Interfaces
export interface AdminOverview {
  total_users: number;
  active_users_today: number;
  total_guests: number;
  total_sessions: number;
  total_messages: number;
  total_api_calls: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_cost_usd: number;
  avg_latency_ms: number;
}

export interface TabUsageStat {
  tab_mode: string;
  request_count: number;
  percentage: number;
  tokens: number;
  cost_usd: number;
  avg_latency_ms: number;
}

export interface ProviderUsageStat {
  provider: string;
  request_count: number;
  tokens: number;
  cost_usd: number;
}

export interface CharacterUsageStat {
  character: string;
  count: number;
}

export interface LatencyBucket {
  range: string;
  count: number;
}

export interface DailyActivityStat {
  date: string;
  requests: number;
  tokens: number;
  cost_usd: number;
}

export interface TelemetryLogEntry {
  id: string;
  endpoint: string;
  tab_mode: string;
  status_code: number;
  latency_ms: number;
  provider_used: string;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
  characters_tagged: string[];
  timestamp: string;
}

export interface CostProviderStat {
  provider: string;
  total_calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

export interface LatencyAnalytics {
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
  sample_size: number;
  status_distribution: Record<string, number>;
}

export interface CharacterStat {
  character: string;
  dialogue_count: number;
  percentage: number;
}

export interface CharacterRecord {
  id: string;
  slug: string;
  name: string;
  epic: string;
  category: string;
  role: string;
  subtitle: string;
  icon: string;
  color?: string | null;
  accent?: string | null;
  quote: string;
  image_url?: string | null;
  cloudinary_public_id?: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TelemetryDashboardResponse {
  overview: AdminOverview;
  tabs: TabUsageStat[];
  providers: ProviderUsageStat[];
  top_characters: CharacterUsageStat[];
  latency_distribution: LatencyBucket[];
  recent_activity: DailyActivityStat[];
  recent_logs: TelemetryLogEntry[];
}

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  last_login_at: string;
  total_sessions: number;
  total_messages: number;
}

export interface TimeSeriesPoint {
  date: string;
  iso_date: string;
  requests: number;
  tokens: number;
  cost_usd: number;
  avg_latency_ms: number;
  active_users: number;
}

export interface TimeSeriesData {
  timeframe_days: number;
  series: TimeSeriesPoint[];
}

export interface ScriptureInsights {
  total_indexed_scenarios: number;
  epics_distribution: { epic: string; count: number; percentage: number }[];
  top_categories: { category: string; count: number }[];
}

export interface RawTelemetryLog {
  id: string;
  timestamp: string;
  endpoint: string;
  tab_mode: string;
  status_code: number;
  latency_ms: number;
  provider_used: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  user_id?: string;
  guest_id?: string;
  characters?: string[];
}

export interface UserChatSessionDetail {
  session_id: string;
  guest_id?: string;
  mode: string;
  title: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  message_count: number;
  messages: {
    id: string;
    role: string;
    character?: string;
    content: string;
    stage?: string;
    sources?: SourceCitation[];
    created_at: string;
  }[];
}

export const apiService = {
  async fetchCharacters(): Promise<CharacterRecord[]> {
    const res = await customFetch(`${API_BASE_URL}/api/characters`);
    if (!res.ok) throw new Error("Failed to fetch characters");
    return res.json();
  },

  // 1. General Guidance RAG Mode (POST /chat)
  async universalChat(
    message: string,
    provider?: string,
    language?: string,
  ): Promise<ChatResponse> {
    const lang = language || (await getEffectiveLanguage());
    const res = await customFetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      body: JSON.stringify({
        message,
        mode: "guidance",
        provider,
        language: lang,
      }),
    });
    return handleApiResponse(res, "Failed to fetch universal chat response");
  },

  // 2. Character Persona Mode (POST /chat-character)
  async characterChat(
    message: string,
    character: string,
    chatHistory?: any[],
    forceResolve: boolean = false,
    sessionId?: string,
    provider?: string,
    language?: string,
  ): Promise<ChatResponse> {
    const lang = language || (await getEffectiveLanguage());
    const res = await customFetch(`${API_BASE_URL}/chat-character`, {
      method: "POST",
      body: JSON.stringify({
        message,
        character,
        chat_history: chatHistory || [],
        force_resolve: forceResolve,
        session_id: sessionId,
        mode: "guidance",
        provider,
        language: lang,
      }),
    });
    return handleApiResponse(res, "Failed to fetch character response");
  },

  async personaChat(
    message: string,
    character: string,
    chatHistory?: any[],
    forceResolve: boolean = false,
    sessionId?: string,
    provider?: string,
    language?: string,
  ): Promise<ChatResponse> {
    return this.characterChat(
      message,
      character,
      chatHistory,
      forceResolve,
      sessionId,
      provider,
      language,
    );
  },

  // 3. User-Controlled Multi-Legend Council (POST /chat-roundtable)
  async roundtableChat(
    message: string,
    councilCharacters: string[],
    mutedCharacters: string[] = [],
    chatHistory?: any[],
    forceResolve?: boolean,
    sessionId?: string,
    provider?: string,
    language?: string,
  ): Promise<RoundtableChatResponse> {
    const lang = language || (await getEffectiveLanguage());
    const res = await customFetch(`${API_BASE_URL}/chat-roundtable`, {
      method: "POST",
      body: JSON.stringify({
        message,
        council_characters: councilCharacters,
        muted_characters: mutedCharacters,
        chat_history: chatHistory || [],
        force_resolve: forceResolve,
        session_id: sessionId,
        provider,
        language: lang,
      }),
    });
    return handleApiResponse(res, "Failed to fetch roundtable response");
  },

  // 4. Full Chat with Continuous Follow-Up Memory (POST /strategy/full-chat)
  async fullChatStrategy(
    message: string,
    chat_history: {
      role: string;
      content: string;
      sources?: SourceCitation[];
    }[],
    force_resolve?: boolean,
    session_id?: string,
    provider?: string,
    language?: string,
  ): Promise<FullChatResponse> {
    const lang = language || (await getEffectiveLanguage());
    const res = await customFetch(`${API_BASE_URL}/strategy/full-chat`, {
      method: "POST",
      body: JSON.stringify({
        message,
        chat_history,
        force_resolve,
        session_id,
        provider,
        language: lang,
      }),
    });
    return handleApiResponse(res, "Failed to fetch full chat response");
  },

  // -------------------------------------------------------------
  // DATABASE SESSION SYNC ENDPOINTS
  // -------------------------------------------------------------
  async listSessionsFromDb(): Promise<any[]> {
    const res = await customFetch(`${API_BASE_URL}/api/sessions`);
    if (!res.ok) return [];
    return res.json();
  },

  async loadSessionFromDb(sessionId: string): Promise<any> {
    const res = await customFetch(`${API_BASE_URL}/api/sessions/${sessionId}`);
    if (!res.ok) throw new Error("Session not found");
    return res.json();
  },

  async saveSessionToDb(session: any): Promise<any> {
    const res = await customFetch(`${API_BASE_URL}/api/sessions`, {
      method: "POST",
      body: JSON.stringify(session),
    });
    if (!res.ok) throw new Error("Failed to save session to database");
    return res.json();
  },

  async deleteSessionFromDb(sessionId: string): Promise<any> {
    const res = await customFetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete session");
    return res.json();
  },

  // -------------------------------------------------------------
  // ADMIN DASHBOARD ENDPOINTS
  // -------------------------------------------------------------
  async fetchAdminOverview(): Promise<AdminOverview> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/overview`);
    if (!res.ok) throw new Error("Admin authorization failed");
    return res.json();
  },

  async fetchAdminTabUsage(): Promise<TabUsageStat[]> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/tab-usage`);
    if (!res.ok) throw new Error("Failed to fetch tab usage");
    return res.json();
  },

  async fetchAdminCostAnalytics(
    days: number = 7,
  ): Promise<{ timeframe_days: number; providers: CostProviderStat[] }> {
    const res = await customFetch(
      `${API_BASE_URL}/api/admin/cost-analytics?days=${days}`,
    );
    if (!res.ok) throw new Error("Failed to fetch cost analytics");
    return res.json();
  },

  async fetchAdminLatencyAnalytics(): Promise<LatencyAnalytics> {
    const res = await customFetch(
      `${API_BASE_URL}/api/admin/latency-analytics`,
    );
    if (!res.ok) throw new Error("Failed to fetch latency stats");
    return res.json();
  },

  async fetchAdminCharacterStats(): Promise<CharacterStat[]> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/character-stats`);
    if (!res.ok) throw new Error("Failed to fetch character stats");
    return res.json();
  },

  async fetchAdminCharacters(): Promise<CharacterRecord[]> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/characters`);
    if (!res.ok) throw new Error("Failed to fetch characters");
    return res.json();
  },

  async createAdminCharacter(
    payload: Omit<
      CharacterRecord,
      | "id"
      | "slug"
      | "image_url"
      | "cloudinary_public_id"
      | "created_at"
      | "updated_at"
    > & { image_url?: string | null },
  ): Promise<CharacterRecord> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/characters`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create character");
    return res.json();
  },

  async bulkImportAdminCharacters(
    characters: Array<
      Omit<
        CharacterRecord,
        | "id"
        | "slug"
        | "image_url"
        | "cloudinary_public_id"
        | "created_at"
        | "updated_at"
      > & { image_url?: string | null }
    >,
    images: Map<number, { file: Blob; name: string }> = new Map(),
  ): Promise<CharacterRecord[]> {
    const headers = await getHeaders();
    delete headers["Content-Type"];
    const form = new FormData();
    form.append("payload", JSON.stringify({ characters }));
    images.forEach((image, index) =>
      form.append("images", image.file, `${index}__${image.name}`),
    );
    const res = await fetch(`${API_BASE_URL}/api/admin/characters/bulk`, {
      method: "POST",
      credentials: "include",
      headers,
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        typeof body.detail === "string" ? body.detail : "Bulk import failed",
      );
    }
    return res.json();
  },

  async updateAdminCharacter(
    id: string,
    updates: Partial<CharacterRecord>,
  ): Promise<CharacterRecord> {
    const res = await customFetch(
      `${API_BASE_URL}/api/admin/characters/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      },
    );
    if (!res.ok) throw new Error("Failed to update character");
    return res.json();
  },

  async uploadAdminCharacterImage(
    id: string,
    file: Blob,
    fileName = "character-image",
  ): Promise<CharacterRecord> {
    const headers = await getHeaders();
    delete headers["Content-Type"];
    const form = new FormData();
    form.append("image", file, fileName);
    const res = await fetch(
      `${API_BASE_URL}/api/admin/characters/${id}/image`,
      {
        method: "POST",
        credentials: "include",
        headers: { ...headers },
        body: form,
      },
    );
    if (!res.ok) throw new Error("Failed to upload character image");
    return res.json();
  },

  async deleteAdminCharacter(id: string): Promise<void> {
    const res = await customFetch(
      `${API_BASE_URL}/api/admin/characters/${id}`,
      { method: "DELETE" },
    );
    if (!res.ok) throw new Error("Failed to delete character");
  },

  async fetchAdminUsers(
    skip: number = 0,
    limit: number = 50,
  ): Promise<AdminUserItem[]> {
    const res = await customFetch(
      `${API_BASE_URL}/api/admin/users?skip=${skip}&limit=${limit}`,
    );
    if (!res.ok) throw new Error("Failed to fetch user list");
    return res.json();
  },

  async fetchAdminUserChats(userId: string): Promise<UserChatSessionDetail[]> {
    const res = await customFetch(
      `${API_BASE_URL}/api/admin/users/${userId}/chats`,
    );
    if (!res.ok) throw new Error("Failed to inspect user chats");
    return res.json();
  },

  async fetchAdminGuestUsage(): Promise<any> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/guest-usage`);
    if (!res.ok) throw new Error("Failed to fetch guest usage");
    return res.json();
  },

  async fetchAdminGuestSessions(
    limit: number = 20,
  ): Promise<UserChatSessionDetail[]> {
    const res = await customFetch(
      `${API_BASE_URL}/api/admin/guest-sessions?limit=${limit}`,
    );
    if (!res.ok) throw new Error("Failed to fetch guest sessions");
    return res.json();
  },

  async fetchAdminTimeSeries(days: number = 7): Promise<TimeSeriesData> {
    const res = await customFetch(
      `${API_BASE_URL}/api/admin/time-series?days=${days}`,
    );
    if (!res.ok) throw new Error("Failed to fetch time series analytics");
    return res.json();
  },

  async fetchAdminScriptureInsights(): Promise<ScriptureInsights> {
    const res = await customFetch(
      `${API_BASE_URL}/api/admin/scripture-insights`,
    );
    if (!res.ok) throw new Error("Failed to fetch scripture insights");
    return res.json();
  },

  async fetchAdminRawLogs(
    skip: number = 0,
    limit: number = 50,
  ): Promise<RawTelemetryLog[]> {
    const res = await customFetch(
      `${API_BASE_URL}/api/admin/raw-logs?skip=${skip}&limit=${limit}`,
    );
    if (!res.ok) throw new Error("Failed to fetch raw telemetry logs");
    return res.json();
  },

  // -------------------------------------------------------------
  // USER PREFERENCES & CLOUD SYNC
  // -------------------------------------------------------------
  async getUserPreferences(): Promise<{
    preferred_app_language?: string;
    preferred_chat_language?: string;
  } | null> {
    try {
      const res = await customFetch(`${API_BASE_URL}/api/auth/preferences`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  async updateUserPreferences(
    preferred_app_language?: string,
    preferred_chat_language?: string,
  ): Promise<any> {
    try {
      const res = await customFetch(`${API_BASE_URL}/api/auth/preferences`, {
        method: "PUT",
        body: JSON.stringify({
          preferred_app_language,
          preferred_chat_language,
        }),
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  // -------------------------------------------------------------
  // DYNAMIC LANGUAGE MANAGEMENT & ADMIN CONTROLS
  // -------------------------------------------------------------
  async fetchPublicLanguages(): Promise<ServerLanguageConfig[]> {
    try {
      const res = await customFetch(`${API_BASE_URL}/api/languages`);
      if (!res.ok) throw new Error("Failed to fetch languages");
      return res.json();
    } catch (e) {
      console.warn("[API] Could not fetch public languages:", e);
      return [];
    }
  },

  async fetchAdminLanguages(): Promise<AdminLanguagesOverview> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/languages`);
    if (!res.ok) throw new Error("Failed to fetch admin languages");
    return res.json();
  },

  async updateAdminLanguage(
    code: string,
    updates: {
      is_app_enabled?: boolean;
      is_chat_enabled?: boolean;
      is_beta?: boolean;
      display_order?: number;
    },
  ): Promise<ServerLanguageConfig> {
    const res = await customFetch(
      `${API_BASE_URL}/api/admin/languages/${code}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      },
    );
    if (!res.ok) throw new Error(`Failed to update language ${code}`);
    return res.json();
  },

  async resetAdminLanguages(): Promise<ServerLanguageConfig[]> {
    const res = await customFetch(
      `${API_BASE_URL}/api/admin/languages/reset-defaults`,
      {
        method: "POST",
      },
    );
    if (!res.ok) throw new Error("Failed to reset languages");
    return res.json();
  },

  async fetchAdminLanguageAnalytics(
    days: number = 30,
  ): Promise<LanguageAnalyticsOverview> {
    const res = await customFetch(
      `${API_BASE_URL}/api/admin/language-analytics?days=${days}`,
    );
    if (!res.ok) throw new Error("Failed to fetch language analytics");
    return res.json();
  },

  async logout(): Promise<void> {
    try {
      await customFetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST" });
    } catch (e) {
      console.warn("Logout API error:", e);
    }
  },
};

export interface ServerLanguageConfig {
  code: string;
  name: string;
  native_name: string;
  region?: string;
  is_app_enabled: boolean;
  is_chat_enabled: boolean;
  is_beta: boolean;
  display_order: number;
  updated_at?: string;
}

export interface AdminLanguagesOverview {
  total_languages: number;
  app_enabled_count: number;
  chat_enabled_count: number;
  beta_count: number;
  languages: ServerLanguageConfig[];
}

export interface LanguagePerformanceStat {
  code: string;
  name: string;
  native_name: string;
  region: string;
  is_app_enabled: boolean;
  is_chat_enabled: boolean;
  is_beta: boolean;
  query_count: number;
  traffic_share_percentage: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  avg_latency_ms: number;
  unique_registered_users: number;
  unique_guests: number;
  success_count: number;
  error_count: number;
  top_personas: { character: string; count: number }[];
}

export interface UserLanguagePreferenceStat {
  code: string;
  label: string;
  count: number;
  percentage: number;
}

export interface LanguageAnalyticsOverview {
  timeframe_days: number;
  total_queries: number;
  total_tokens: number;
  total_cost_usd: number;
  language_performance: LanguagePerformanceStat[];
  user_app_preferences: UserLanguagePreferenceStat[];
  user_chat_preferences: UserLanguagePreferenceStat[];
}
