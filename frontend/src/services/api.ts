import { Platform } from 'react-native';
import Constants from 'expo-constants';

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

const getHeaders = () => ({
  'Content-Type': 'application/json',
});

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

export const apiService = {
  // 1. Universal Epic Scholar (POST /chat)
  async universalChat(message: string, provider?: string): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, mode: 'guidance', provider }),
    });
    if (!res.ok) throw new Error('Failed to fetch universal chat response');
    return res.json();
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
    const res = await fetch(`${API_BASE_URL}/chat-character`, {
      method: 'POST',
      headers: getHeaders(),
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
    if (!res.ok) throw new Error('Failed to fetch character response');
    return res.json();
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
    const res = await fetch(`${API_BASE_URL}/chat-roundtable`, {
      method: 'POST',
      headers: getHeaders(),
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
    if (!res.ok) throw new Error('Failed to fetch roundtable response');
    return res.json();
  },

  // 4. Strategy 1: Completeness Evaluator (POST /strategy/completeness)
  async completenessStrategy(message: string, provider?: string): Promise<CompletenessResponse> {
    const res = await fetch(`${API_BASE_URL}/strategy/completeness`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, provider }),
    });
    if (!res.ok) throw new Error('Failed to fetch completeness response');
    return res.json();
  },

  // 5. Strategy 2: Two-Turn Decision Tree (POST /strategy/two-turn)
  async twoTurnStrategy(message: string, turn: number = 1, selected_option?: string, provider?: string): Promise<TwoTurnResponse> {
    const res = await fetch(`${API_BASE_URL}/strategy/two-turn`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, turn, selected_option, provider }),
    });
    if (!res.ok) throw new Error('Failed to fetch two-turn strategy response');
    return res.json();
  },

  // 6. Strategy 3: Progressive Hybrid Search (POST /strategy/progressive)
  async progressiveStrategy(message: string, chat_history: { role: string; content: string }[], provider?: string): Promise<ProgressiveResponse> {
    const res = await fetch(`${API_BASE_URL}/strategy/progressive`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, chat_history, provider }),
    });
    if (!res.ok) throw new Error('Failed to fetch progressive strategy response');
    return res.json();
  },

  // 7. Strategy 4: Autonomous Socratic Interviewer (POST /strategy/socratic-interviewer)
  async socraticStrategy(message: string, chat_history: { role: string; content: string }[], force_resolve?: boolean, provider?: string): Promise<SocraticResponse> {
    const res = await fetch(`${API_BASE_URL}/strategy/socratic-interviewer`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, chat_history, force_resolve, provider }),
    });
    if (!res.ok) throw new Error('Failed to fetch socratic strategy response');
    return res.json();
  },

  // 8. Strategy 5: Full Chat with Continuous Follow-Up Memory (POST /strategy/full-chat)
  async fullChatStrategy(
    message: string,
    chat_history: { role: string; content: string; sources?: SourceCitation[] }[],
    force_resolve?: boolean,
    session_id?: string,
    provider?: string
  ): Promise<FullChatResponse> {
    const res = await fetch(`${API_BASE_URL}/strategy/full-chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, chat_history, force_resolve, session_id, provider }),
    });
    if (!res.ok) throw new Error('Failed to fetch full chat response');
    return res.json();
  },
};
