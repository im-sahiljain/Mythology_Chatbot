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

export function setActiveSessionId(id: string) {
  inMemoryActiveId = id;
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
