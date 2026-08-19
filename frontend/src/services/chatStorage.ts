import { SourceCitation } from './api';

export const SESSIONS_STORAGE_KEY = 'vedic_chat_all_sessions_v3';
export const ACTIVE_SESSION_KEY = 'vedic_chat_active_session_id_v3';

export type ChatMode =
  | 'full-chat'
  | 'persona'
  | 'roundtable'
  | 'scholar'
  | 'adaptive'
  | 'two-turn'
  | 'progressive'
  | 'counselor';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  character?: string;
  action?: 'speak' | 'join' | 'depart';
  stage?: 'interviewing' | 'resolved' | 'follow_up';
  sources?: SourceCitation[];
  searched_vector_db?: boolean;
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

  if (mode === 'persona' || character) {
    const charName = character || 'Persona';
    const icon = CHARACTER_ICONS[charName.toLowerCase()] || '👑';
    return {
      icon,
      label: charName,
      route: '/(tabs)/persona',
      colorKey: 'primary',
    };
  }

  switch (mode) {
    case 'scholar':
      return { icon: '📜', label: 'Scholar', route: '/(tabs)', colorKey: 'accent' };
    case 'adaptive':
      return { icon: '⚖️', label: 'Adaptive', route: '/(tabs)/adaptive', colorKey: 'accent' };
    case 'two-turn':
      return { icon: '🔄', label: '2-Turn', route: '/(tabs)/two-turn', colorKey: 'accent' };
    case 'progressive':
      return { icon: '💬', label: 'Dialogue', route: '/(tabs)/progressive', colorKey: 'accent' };
    case 'counselor':
      return { icon: '🧘', label: 'Counselor', route: '/(tabs)/counselor', colorKey: 'accent' };
    case 'full-chat':
    default:
      return { icon: '🏛️', label: 'Scholar Hub', route: '/(tabs)/full-chat', colorKey: 'primary' };
  }
}

export function loadAllSessions(): ChatSession[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const sessionMap = new Map<string, ChatSession>();

      // 1. Read legacy v1 sessions
      const v1 = window.localStorage.getItem('vedic_chat_all_sessions');
      if (v1) {
        try {
          const parsed = JSON.parse(v1);
          if (Array.isArray(parsed)) {
            parsed.forEach((s) => {
              if (s?.id) {
                sessionMap.set(s.id, {
                  ...s,
                  mode: s.mode || 'full-chat',
                });
              }
            });
          }
        } catch {}
      }

      // 2. Read v2 sessions
      const v2 = window.localStorage.getItem('vedic_chat_all_sessions_v2');
      if (v2) {
        try {
          const parsed = JSON.parse(v2);
          if (Array.isArray(parsed)) {
            parsed.forEach((s) => {
              if (s?.id) {
                sessionMap.set(s.id, {
                  ...s,
                  mode: s.mode || 'full-chat',
                });
              }
            });
          }
        } catch {}
      }

      // 3. Read v3 sessions (latest)
      const v3 = window.localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (v3) {
        try {
          const parsed = JSON.parse(v3);
          if (Array.isArray(parsed)) {
            parsed.forEach((s) => {
              if (s?.id) {
                sessionMap.set(s.id, {
                  ...s,
                  mode: s.mode || 'full-chat',
                });
              }
            });
          }
        } catch {}
      }

      const mergedList = Array.from(sessionMap.values());
      mergedList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      const activeId = getActiveSessionId();
      // Prune inactive 0-message empty sessions so they don't clutter storage
      const cleanedList = mergedList.filter(
        (s) => (s.history && s.history.length > 0) || s.id === activeId
      );

      if (cleanedList.length >= 0) {
        window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(cleanedList));
      }

      return cleanedList;
    }
  } catch (err) {
    console.warn('Failed to load sessions:', err);
  }
  return [];
}

export function saveAllSessions(sessions: ChatSession[], activeId?: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
      if (activeId) {
        window.localStorage.setItem(ACTIVE_SESSION_KEY, activeId);
      }
    }
    notifyListeners(sessions, activeId || getActiveSessionId());
  } catch (err) {
    console.warn('Failed to save sessions:', err);
  }
}

export function getActiveSessionId(): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(ACTIVE_SESSION_KEY);
    }
  } catch (err) {
    console.warn('Failed to get active session ID:', err);
  }
  return null;
}

export function setActiveSessionId(id: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ACTIVE_SESSION_KEY, id);
    }
    const sessions = loadAllSessions();
    notifyListeners(sessions, id);
  } catch (err) {
    console.warn('Failed to set active session ID:', err);
  }
}

export function createNewSession(
  title: string = 'New Consultation',
  mode: ChatMode = 'full-chat',
  character?: string,
  council?: string[]
): ChatSession {
  const currentSessions = loadAllSessions();
  const activeId = getActiveSessionId();

  // Re-use an existing 0-message session if one is already active or available
  const existingEmpty = currentSessions.find(
    (s) => s.history.length === 0 && s.mode === mode && s.character === character
  );

  if (existingEmpty) {
    if (council && council.length > 0) existingEmpty.council = council;
    setActiveSessionId(existingEmpty.id);
    return existingEmpty;
  }

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

  // Prune any previous 0-message empty sessions before creating new
  const cleaned = currentSessions.filter(
    (s) => (s.history && s.history.length > 0) || s.id === activeId
  );

  const sessions = [newSession, ...cleaned];
  saveAllSessions(sessions, newId);
  return newSession;
}

export function deleteSession(id: string) {
  const current = loadAllSessions();
  const filtered = current.filter((s) => s.id !== id);
  let activeId = getActiveSessionId();
  if (activeId === id) {
    activeId = filtered.length > 0 ? filtered[0].id : null;
  }
  saveAllSessions(filtered, activeId || undefined);
}
