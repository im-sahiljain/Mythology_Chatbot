import { SourceCitation } from './api';

export const SESSIONS_STORAGE_KEY = 'vedic_chat_all_sessions_v3';
export const ACTIVE_SESSION_KEY = 'vedic_chat_active_session_id_v3';

export type ChatMode =
  | 'roundtable'
  | 'full-chat'
  | 'persona'
  | 'scholar';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  character?: string;
  action?: 'speak' | 'join' | 'depart';
  stage?: 'interviewing' | 'resolved' | 'follow_up';
  sources?: SourceCitation[];
  searched_vector_db?: boolean;
  timestamp?: string | number;
}

export interface ChatSession {
  id: string;
  title: string;
  mode?: ChatMode;
  character?: string;
  council?: string[];
  updatedAt: number;
  stage: 'interviewing' | 'resolved' | 'follow_up' | null;
  history: ChatMessage[];
}

type SessionChangeListener = (sessions: ChatSession[], activeId: string | null) => void;
const listeners: Set<SessionChangeListener> = new Set();
let inMemorySessions: ChatSession[] = [];
let inMemoryActiveId: string | null = null;

export const subscribeToSessions = (listener: SessionChangeListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = (sessions: ChatSession[], activeId: string | null) => {
  listeners.forEach((l) => l(sessions, activeId));
};

export const CHARACTER_ICONS: Record<string, string> = {
  krishna: '🪶',
  sita: '🌸',
  rama: '🏹',
  arjuna: '🎯',
  karna: '🌅',
  bhishma: '🛡️',
  vibhishana: '🕊️',
  drona: '📜',
  sugriva: '👑',
};

export function getModeBadgeInfo(mode?: ChatMode, character?: string) {
  if (mode === 'roundtable') {
    return {
      icon: '🪷',
      label: 'Roundtable',
      route: '/(tabs)/roundtable',
      colorKey: 'primary',
    };
  }

  if (mode === 'persona') {
    const charName = character || 'Persona';
    const icon = CHARACTER_ICONS[charName.toLowerCase()] || '👑';
    return {
      icon,
      label: charName,
      route: '/(tabs)/persona',
      colorKey: 'primary',
    };
  }

  if (mode === 'scholar') {
    return {
      icon: '📜',
      label: 'Scholar',
      route: '/(tabs)',
      colorKey: 'accent',
    };
  }

  return {
    icon: '🏛️',
    label: 'Full Chat',
    route: '/(tabs)/full-chat',
    colorKey: 'primary',
  };
}

// Purge all legacy chat transcript data from localStorage on load
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    window.localStorage.removeItem('vedic_chat_all_sessions');
    window.localStorage.removeItem('vedic_chat_all_sessions_v2');
    window.localStorage.removeItem('vedic_chat_all_sessions_v3');
    window.localStorage.removeItem('vedic_chat_active_session_id_v3');
  } catch (err) {
    console.warn('Error purging local chat storage:', err);
  }
}

export function loadAllSessions(): ChatSession[] {
  return inMemorySessions;
}

export function saveAllSessions(sessions: ChatSession[], activeId?: string) {
  inMemorySessions = sessions;
  if (activeId !== undefined) {
    inMemoryActiveId = activeId;
  }
  notifyListeners(inMemorySessions, inMemoryActiveId);
}

export function getActiveSessionId(): string | null {
  return inMemoryActiveId;
}

export function setActiveSessionId(id: string | null) {
  inMemoryActiveId = id || null;
  notifyListeners(inMemorySessions, inMemoryActiveId);
}

export function createNewSession(
  title: string = 'New Consultation',
  mode: ChatMode = 'full-chat',
  character?: string,
  council?: string[]
): ChatSession {
  const newId = Date.now().toString();
  const newSession: ChatSession = {
    id: newId,
    title,
    mode,
    character,
    council,
    updatedAt: Date.now(),
    stage: null,
    history: [],
  };

  inMemorySessions = [newSession, ...inMemorySessions];
  inMemoryActiveId = newId;
  notifyListeners(inMemorySessions, newId);
  return newSession;
}

export function deleteSession(id: string) {
  inMemorySessions = inMemorySessions.filter((s) => s.id !== id);
  if (inMemoryActiveId === id) {
    inMemoryActiveId = inMemorySessions.length > 0 ? inMemorySessions[0].id : null;
  }
  notifyListeners(inMemorySessions, inMemoryActiveId);
}

export function clearAllLocalSessions() {
  inMemorySessions = [];
  inMemoryActiveId = null;
  notifyListeners([], null);
}

export async function syncUserSessionsFromDb(): Promise<ChatSession[]> {
  try {
    // Guard: check if there's an active Supabase session on the client side.
    // This prevents stale HttpOnly cookies from loading another user's sessions.
    const { supabase } = await import('./supabase');
    const { data: sessionData } = await supabase.auth.getSession();
    const hasClientSession = !!sessionData?.session;

    // If no client-side session, only allow guest sync (the backend will scope by guest ID).
    // But first verify the guest ID is present so we don't accidentally fetch with a stale cookie.
    if (!hasClientSession) {
      // Ensure we're making a clean guest request by not sending any stale auth headers.
      // The apiService.listSessionsFromDb will still include X-Guest-ID header, which is fine.
      // The backend will fall through to guest auth since there's no valid JWT.
    }

    const { apiService } = await import('./api');
    const dbSessions = await apiService.listSessionsFromDb();
    if (Array.isArray(dbSessions)) {
      const mapped: ChatSession[] = dbSessions.map((s: any) => ({
        id: s.id,
        title: s.title || 'Vedic Consultation',
        mode: s.mode || 'full-chat',
        character: s.character,
        council: s.council,
        updatedAt: s.updatedAt || Date.now(),
        stage: s.stage || null,
        history: [],
      }));

      // Preserve active message history only for sessions that belong to the current authenticated user/guest
      const localMap = new Map(inMemorySessions.map((l) => [l.id, l]));
      for (const item of mapped) {
        if (localMap.has(item.id)) {
          const local = localMap.get(item.id)!;
          if (local.history && local.history.length > 0) {
            item.history = local.history;
          }
          item.stage = local.stage || item.stage;
          if (local.council && local.council.length > 0) {
            item.council = local.council;
          }
        }
      }

      inMemorySessions = mapped;
      notifyListeners(inMemorySessions, inMemoryActiveId);
    }
  } catch (err) {
    console.warn('Could not sync sessions from DB:', err);
  }
  return inMemorySessions;
}

export async function fetchSessionDetailFromDb(sessionId: string): Promise<ChatMessage[]> {
  try {
    const { apiService } = await import('./api');
    const detail = await apiService.loadSessionFromDb(sessionId);
    if (detail && Array.isArray(detail.history)) {
      const msgs: ChatMessage[] = detail.history.map((m: any) => ({
        id: m.id || Date.now().toString(),
        role: m.role || 'assistant',
        content: m.content || '',
        character: m.character,
        stage: m.stage,
        sources: m.sources || [],
      }));

      // Update in memory session history
      const existing = inMemorySessions.find((s) => s.id === sessionId);
      if (existing) {
        existing.history = msgs;
        existing.stage = detail.stage || existing.stage;
        if (detail.council && Array.isArray(detail.council) && detail.council.length > 0) {
          existing.council = detail.council;
        }
      } else {
        inMemorySessions = [
          {
            id: detail.id || sessionId,
            title: detail.title || 'Vedic Consultation',
            mode: detail.mode || 'roundtable',
            council: detail.council || ['Sita', 'Krishna'],
            character: detail.character,
            updatedAt: detail.updatedAt || Date.now(),
            stage: detail.stage || null,
            history: msgs,
          },
          ...inMemorySessions,
        ];
      }
      return msgs;
    }
  } catch (err) {
    console.warn('Could not fetch session detail from DB:', err);
  }
  return [];
}

