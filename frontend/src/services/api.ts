import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Extract host IP dynamically from Expo or fallback to localhost
const getLocalIp = (): string => {
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    return `http://${hostUri.split(':')[0]}:8000`;
  }
  return 'http://192.168.1.10:8000';
};

// API URL priority: 1) .env (EXPO_PUBLIC_API_URL) -> 2) Platform default (web: localhost, mobile: Wi-Fi IP)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'web' ? 'http://localhost:8000' : getLocalIp());

console.log(`🌐 [API Service] Platform: ${Platform.OS} | Target API URL: ${API_BASE_URL}`);

// Client-side Guest ID management
let cachedGuestId: string | null = null;
export const getGuestId = (): string => {
  if (cachedGuestId) return cachedGuestId;
  if (typeof window !== 'undefined' && window.localStorage) {
    let stored = window.localStorage.getItem('vedic_guest_id');
    if (!stored) {
      stored = 'guest_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      window.localStorage.setItem('vedic_guest_id', stored);
    }
    cachedGuestId = stored;
    return stored;
  }
  cachedGuestId = 'guest_mobile_' + Math.random().toString(36).substring(2, 11);
  return cachedGuestId;
};

// Builds authenticated headers with Supabase JWT and Guest ID
const getHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Guest-ID': getGuestId(),
  };

  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn('Could not read auth token:', err);
  }

  return headers;
};

// Helper for HTTP requests with cookie credentials and auth headers
const customFetch = async (url: string, options: RequestInit = {}) => {
  const headers = await getHeaders();
  return fetch(url, {
    credentials: 'include',
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
    const detailMsg = errJson.detail?.message || (typeof errJson.detail === 'string' ? errJson.detail : null);
    const msg = detailMsg || defaultErrorMsg;
    const err: any = new Error(msg);
    err.status = res.status;
    err.quotaExceeded = res.status === 403 || errJson.detail?.quota_exceeded === true;
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
  stage?: 'interviewing' | 'resolved' | 'follow_up';
  searched_vector_db?: boolean;
  provider_used: string;
  sources: SourceCitation[];
}

export interface CompletenessResponse {
  status: 'needs_clarification' | 'resolved';
  completeness_score: number;
  reply: string;
  options: string[];
  provider_used?: string;
  sources: SourceCitation[];
}

export interface TwoTurnResponse {
  turn: number;
  reply: string;
  options: string[];
  sources: SourceCitation[];
}

export interface ProgressiveResponse {
  reply: string;
  sources: SourceCitation[];
}

export interface SocraticResponse {
  status: 'interviewing' | 'resolved';
  reply: string;
  character: string;
  provider_used?: string;
  sources: SourceCitation[];
}

export interface FullChatResponse {
  stage: 'interviewing' | 'resolved' | 'follow_up';
  reply: string;
  character: string;
  sources: SourceCitation[];
  searched_vector_db: boolean;
  provider_used?: string;
}

export interface RoundtableSpeakerReply {
  character: string;
  action: 'speak' | 'join' | 'depart';
  content: string;
  sources?: SourceCitation[];
  stage?: 'interviewing' | 'resolved' | 'follow_up';
}

export interface RoundtableChatResponse {
  replies: RoundtableSpeakerReply[];
  active_council: string[];
  muted_council?: string[];
  stage?: 'interviewing' | 'resolved' | 'follow_up';
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

export interface UserChatSessionDetail {
  session_id: string;
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
  // 1. Universal Epic Scholar (POST /chat)
  async universalChat(message: string, provider?: string): Promise<ChatResponse> {
    const res = await customFetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, mode: 'guidance', provider }),
    });
    return handleApiResponse(res, 'Failed to fetch universal chat response');
  },

  // 2. Character Persona Mode (POST /chat-character)
  async characterChat(
    message: string,
    character: string,
    chatHistory?: any[],
    forceResolve: boolean = false,
    sessionId?: string,
    provider?: string
  ): Promise<ChatResponse> {
    const res = await customFetch(`${API_BASE_URL}/chat-character`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        character,
        chat_history: chatHistory || [],
        force_resolve: forceResolve,
        session_id: sessionId,
        mode: 'guidance',
        provider
      }),
    });
    return handleApiResponse(res, 'Failed to fetch character response');
  },

  async personaChat(
    message: string,
    character: string,
    chatHistory?: any[],
    forceResolve: boolean = false,
    sessionId?: string,
    provider?: string
  ): Promise<ChatResponse> {
    return this.characterChat(message, character, chatHistory, forceResolve, sessionId, provider);
  },

  // 3. User-Controlled Multi-Legend Council (POST /chat-roundtable)
  async roundtableChat(
    message: string,
    councilCharacters: string[],
    mutedCharacters: string[] = [],
    chatHistory?: any[],
    forceResolve?: boolean,
    sessionId?: string,
    provider?: string
  ): Promise<RoundtableChatResponse> {
    const res = await customFetch(`${API_BASE_URL}/chat-roundtable`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        council_characters: councilCharacters,
        muted_characters: mutedCharacters,
        chat_history: chatHistory || [],
        force_resolve: forceResolve,
        session_id: sessionId,
        provider,
      }),
    });
    return handleApiResponse(res, 'Failed to fetch roundtable response');
  },

  // 4. Strategy 1: Completeness Evaluator (POST /strategy/completeness)
  async completenessStrategy(message: string, provider?: string): Promise<CompletenessResponse> {
    const res = await customFetch(`${API_BASE_URL}/strategy/completeness`, {
      method: 'POST',
      body: JSON.stringify({ message, provider }),
    });
    return handleApiResponse(res, 'Failed to fetch completeness response');
  },

  // 5. Strategy 2: Two-Turn Decision Tree (POST /strategy/two-turn)
  async twoTurnStrategy(message: string, turn: number = 1, selected_option?: string, provider?: string): Promise<TwoTurnResponse> {
    const res = await customFetch(`${API_BASE_URL}/strategy/two-turn`, {
      method: 'POST',
      body: JSON.stringify({ message, turn, selected_option, provider }),
    });
    return handleApiResponse(res, 'Failed to fetch two-turn response');
  },

  // 6. Strategy 3: Progressive Hybrid Search (POST /strategy/progressive)
  async progressiveStrategy(message: string, chat_history: { role: string; content: string }[], provider?: string): Promise<ProgressiveResponse> {
    const res = await customFetch(`${API_BASE_URL}/strategy/progressive`, {
      method: 'POST',
      body: JSON.stringify({ message, chat_history, provider }),
    });
    return handleApiResponse(res, 'Failed to fetch progressive response');
  },

  // 7. Strategy 4: Autonomous Socratic Interviewer (POST /strategy/socratic)
  async socraticStrategy(message: string, chat_history: { role: string; content: string }[], force_resolve?: boolean, provider?: string): Promise<SocraticResponse> {
    const res = await customFetch(`${API_BASE_URL}/strategy/socratic`, {
      method: 'POST',
      body: JSON.stringify({ message, chat_history, force_resolve, provider }),
    });
    return handleApiResponse(res, 'Failed to fetch socratic response');
  },

  // 8. Strategy 5: Full Chat with Continuous Follow-Up Memory (POST /strategy/full-chat)
  async fullChatStrategy(
    message: string,
    chat_history: { role: string; content: string; sources?: SourceCitation[] }[],
    force_resolve?: boolean,
    session_id?: string,
    provider?: string
  ): Promise<FullChatResponse> {
    const res = await customFetch(`${API_BASE_URL}/strategy/full-chat`, {
      method: 'POST',
      body: JSON.stringify({ message, chat_history, force_resolve, session_id, provider }),
    });
    return handleApiResponse(res, 'Failed to fetch full chat response');
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
    if (!res.ok) throw new Error('Session not found');
    return res.json();
  },

  async saveSessionToDb(session: any): Promise<any> {
    const res = await customFetch(`${API_BASE_URL}/api/sessions`, {
      method: 'POST',
      body: JSON.stringify(session),
    });
    if (!res.ok) throw new Error('Failed to save session to database');
    return res.json();
  },

  async deleteSessionFromDb(sessionId: string): Promise<any> {
    const res = await customFetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete session');
    return res.json();
  },

  // -------------------------------------------------------------
  // ADMIN DASHBOARD ENDPOINTS
  // -------------------------------------------------------------
  async fetchAdminOverview(): Promise<AdminOverview> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/overview`);
    if (!res.ok) throw new Error('Admin authorization failed');
    return res.json();
  },

  async fetchAdminTabUsage(): Promise<TabUsageStat[]> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/tab-usage`);
    if (!res.ok) throw new Error('Failed to fetch tab usage');
    return res.json();
  },

  async fetchAdminCostAnalytics(days: number = 7): Promise<{ timeframe_days: number; providers: CostProviderStat[] }> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/cost-analytics?days=${days}`);
    if (!res.ok) throw new Error('Failed to fetch cost analytics');
    return res.json();
  },

  async fetchAdminLatencyAnalytics(): Promise<LatencyAnalytics> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/latency-analytics`);
    if (!res.ok) throw new Error('Failed to fetch latency stats');
    return res.json();
  },

  async fetchAdminCharacterStats(): Promise<CharacterStat[]> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/character-stats`);
    if (!res.ok) throw new Error('Failed to fetch character stats');
    return res.json();
  },

  async fetchAdminUsers(skip: number = 0, limit: number = 50): Promise<AdminUserItem[]> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/users?skip=${skip}&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch user list');
    return res.json();
  },

  async fetchAdminUserChats(userId: string): Promise<UserChatSessionDetail[]> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/users/${userId}/chats`);
    if (!res.ok) throw new Error('Failed to inspect user chats');
    return res.json();
  },

  async fetchAdminGuestUsage(): Promise<any> {
    const res = await customFetch(`${API_BASE_URL}/api/admin/guest-usage`);
    if (!res.ok) throw new Error('Failed to fetch guest usage');
    return res.json();
  }
};

