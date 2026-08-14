import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { apiService, SourceCitation, FullChatResponse } from '../../src/services/api';
import { StreamingText } from '../../src/components/StreamingText';
import { SourceCard } from '../../src/components/SourceCard';
import { useTheme } from '../../src/context/ThemeContext';
import { FadeSlide, Pressable, TypingDots } from '../../src/components/AnimatedComponents';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';
const bold = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';

const SESSIONS_STORAGE_KEY = 'vedic_chat_all_sessions_v2';
const ACTIVE_SESSION_KEY = 'vedic_chat_active_session_id_v2';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  stage?: 'interviewing' | 'resolved' | 'follow_up';
  sources?: SourceCitation[];
  searched_vector_db?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  stage: 'interviewing' | 'resolved' | 'follow_up' | null;
  history: ChatMessage[];
}

// -------------------------------------------------------------
// Multi-Session Local Storage Helpers (Never deletes past chats)
// -------------------------------------------------------------
function loadAllSessions(): ChatSession[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load sessions from localStorage:', err);
  }
  return [];
}

function saveAllSessions(sessions: ChatSession[], activeId?: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
      if (activeId) {
        window.localStorage.setItem(ACTIVE_SESSION_KEY, activeId);
      }
    }
  } catch (err) {
    console.warn('Failed to save sessions to localStorage:', err);
  }
}

function getActiveSessionId(): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(ACTIVE_SESSION_KEY);
    }
  } catch (err) {
    console.warn('Failed to get active session ID:', err);
  }
  return null;
}

export default function FullChatScreen() {
  const { theme } = useTheme();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentStage, setCurrentStage] = useState<'interviewing' | 'resolved' | 'follow_up' | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize and restore active session or create first one
  useEffect(() => {
    const loadedSessions = loadAllSessions();
    setSessions(loadedSessions);

    const savedActiveId = getActiveSessionId();
    let active = loadedSessions.find((s) => s.id === savedActiveId);

    if (!active && loadedSessions.length > 0) {
      active = loadedSessions[0];
    }

    if (active) {
      setCurrentSessionId(active.id);
      setHistory(active.history);
      setCurrentStage(active.stage);
    } else {
      // Create initial session
      const newId = Date.now().toString();
      const initialSession: ChatSession = {
        id: newId,
        title: 'New Conversation',
        updatedAt: Date.now(),
        stage: null,
        history: [],
      };
      setSessions([initialSession]);
      setCurrentSessionId(newId);
      setHistory([]);
      setCurrentStage(null);
      saveAllSessions([initialSession], newId);
    }
  }, []);

  // Save current active session state whenever history/stage changes
  const updateSessionState = (
    newHistory: ChatMessage[],
    newStage: 'interviewing' | 'resolved' | 'follow_up' | null
  ) => {
    setHistory(newHistory);
    setCurrentStage(newStage);

    setSessions((prevSessions) => {
      const existingIdx = prevSessions.findIndex((s) => s.id === currentSessionId);
      let sessionTitle = 'New Conversation';

      const firstUserMsg = newHistory.find((m) => m.role === 'user');
      if (firstUserMsg) {
        sessionTitle =
          firstUserMsg.content.slice(0, 36) + (firstUserMsg.content.length > 36 ? '...' : '');
      }

      const updatedSession: ChatSession = {
        id: currentSessionId,
        title: sessionTitle,
        updatedAt: Date.now(),
        stage: newStage,
        history: newHistory,
      };

      let updatedList: ChatSession[];
      if (existingIdx >= 0) {
        updatedList = [...prevSessions];
        updatedList[existingIdx] = updatedSession;
      } else {
        updatedList = [updatedSession, ...prevSessions];
      }

      // Sort by latest update
      updatedList.sort((a, b) => b.updatedAt - a.updatedAt);
      saveAllSessions(updatedList, currentSessionId);
      return updatedList;
    });
  };

  // Start a brand new chat session (preserves all previous chats)
  const handleStartNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Conversation',
      updatedAt: Date.now(),
      stage: null,
      history: [],
    };

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setCurrentSessionId(newId);
    setHistory([]);
    setCurrentStage(null);
    setInput('');
    saveAllSessions(updatedSessions, newId);
    setHistoryModalVisible(false);
  };

  // Switch to an existing stored chat session
  const handleSwitchSession = (sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId);
    if (target) {
      setCurrentSessionId(target.id);
      setHistory(target.history);
      setCurrentStage(target.stage);
      saveAllSessions(sessions, target.id);
      setHistoryModalVisible(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMsg,
    };

    const updatedHistory: ChatMessage[] = [...history, newMsg];
    updateSessionState(updatedHistory, currentStage);
    setLoading(true);

    try {
      const apiHistory = updatedHistory.map((h) => ({
        role: h.role,
        content: h.content,
        sources: h.sources || [],
      }));

      const res: FullChatResponse = await apiService.fullChatStrategy(
        userMsg,
        apiHistory,
        false,
        currentSessionId
      );

      const finalHistory: ChatMessage[] = [
        ...updatedHistory,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.reply,
          stage: res.stage,
          sources: res.sources || [],
          searched_vector_db: res.searched_vector_db,
        },
      ];

      updateSessionState(finalHistory, res.stage);
    } catch (err: any) {
      console.error('❌ [Full Chat Frontend] Error:', err);
      const errorHistory: ChatMessage[] = [
        ...updatedHistory,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Unable to connect to the Full Chat engine. Please ensure the backend is running.',
        },
      ];
      updateSessionState(errorHistory, currentStage);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  const handleForceResolve = async () => {
    if (history.length === 0 || loading) return;
    setLoading(true);
    try {
      const apiHistory = history.map((h) => ({
        role: h.role,
        content: h.content,
        sources: h.sources || [],
      }));

      const lastUserMsg =
        history.filter((h) => h.role === 'user').slice(-1)[0]?.content ||
        'Please give epic counsel.';
      const res: FullChatResponse = await apiService.fullChatStrategy(
        lastUserMsg,
        apiHistory,
        true,
        currentSessionId
      );

      const finalHistory: ChatMessage[] = [
        ...history,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.reply,
          stage: 'resolved',
          sources: res.sources || [],
          searched_vector_db: true,
        },
      ];
      updateSessionState(finalHistory, 'resolved');
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentSessionTitle =
    sessions.find((s) => s.id === currentSessionId)?.title || 'Current Conversation';

  return (
    <View style={[st.container, { backgroundColor: theme.bg }]}>
      {/* Top Session Control Bar */}
      <View style={[st.topBar, { backgroundColor: theme.bgSecondary, borderBottomColor: theme.divider }]}>
        <TouchableOpacity
          onPress={() => setHistoryModalVisible(true)}
          style={[st.sessionSelectorBtn, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
        >
          <Text style={{ fontSize: 13, marginRight: 6 }}>🗂️</Text>
          <Text
            style={[st.sessionSelectorText, { color: theme.text, fontFamily: bold }]}
            numberOfLines={1}
          >
            {currentSessionTitle}
          </Text>
          <Text style={[st.sessionCountBadge, { color: theme.textTertiary, fontFamily: body }]}>
            ({sessions.length}) ▾
          </Text>
        </TouchableOpacity>

        {/* New Chat Button */}
        <Pressable onPress={handleStartNewChat}>
          <View style={[st.newChatBtn, { backgroundColor: theme.tealSubtle, borderColor: theme.teal }]}>
            <Text style={[st.newChatText, { color: theme.teal, fontFamily: bold }]}>
              + New Chat
            </Text>
          </View>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={st.list}
        contentContainerStyle={st.listContent}
      >
        {/* Stage Indicator Banner */}
        {currentStage && (
          <FadeSlide duration={300}>
            <View
              style={[
                st.statusBanner,
                {
                  backgroundColor:
                    currentStage === 'follow_up'
                      ? theme.tealSubtle
                      : currentStage === 'resolved'
                      ? theme.greenSubtle
                      : theme.purpleSubtle,
                  borderColor:
                    currentStage === 'follow_up'
                      ? theme.teal
                      : currentStage === 'resolved'
                      ? theme.green
                      : theme.purple,
                },
              ]}
            >
              <Text
                style={[
                  st.statusText,
                  {
                    color:
                      currentStage === 'follow_up'
                        ? theme.teal
                        : currentStage === 'resolved'
                        ? theme.green
                        : theme.purple,
                    fontFamily: bold,
                  },
                ]}
              >
                {currentStage === 'follow_up'
                  ? '💬 CONTINUOUS FOLLOW-UP MODE — ASK ANYTHING ABOUT THIS COUNSEL'
                  : currentStage === 'resolved'
                  ? '✨ FINAL EPIC COUNSEL DELIVERED — YOU CAN NOW ASK FOLLOW-UP QUESTIONS'
                  : '🔍 SOCRATIC DISCOVERY ACTIVE — GATHERING CONTEXT THROUGH DIALOGUE'}
              </Text>
            </View>
          </FadeSlide>
        )}

        {/* Force Resolve CTA during interview stage */}
        {currentStage === 'interviewing' && (
          <FadeSlide duration={300}>
            <Pressable onPress={handleForceResolve} disabled={loading}>
              <View style={[st.forceBtn, { backgroundColor: theme.accentSubtle, borderColor: theme.accent }]}>
                <Text style={[st.forceText, { color: theme.accent, fontFamily: bold }]}>
                  ✦ I've shared enough — Give me epic counsel now
                </Text>
              </View>
            </Pressable>
          </FadeSlide>
        )}

        {/* Empty State */}
        {history.length === 0 && (
          <FadeSlide>
            <View style={[st.empty, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
              <View style={[st.emptyIcon, { backgroundColor: theme.tealSubtle }]}>
                <Text style={{ fontSize: 28 }}>🧠</Text>
              </View>
              <Text style={[st.emptyTitle, { color: theme.text, fontFamily: serif }]}>
                Full Interactive Chat
              </Text>
              <Text style={[st.emptySub, { color: theme.textSecondary, fontFamily: body }]}>
                Share your dilemma naturally. The AI will listen, synthesize scripture wisdom, and continue conversing with full memory—answering any follow-up questions seamlessly.
              </Text>
            </View>
          </FadeSlide>
        )}

        {/* Conversation History */}
        {history.map((msg) => {
          const isResolved = msg.stage === 'resolved' || msg.content.includes('Final Epic Counsel');
          const isFollowUp = msg.stage === 'follow_up';

          return (
            <FadeSlide key={msg.id} delay={20} distance={10}>
              {msg.role === 'user' ? (
                <View style={[st.userBubble, { backgroundColor: theme.accentSubtle, borderColor: theme.surfaceBorder }]}>
                  <Text style={[st.userText, { color: theme.text, fontFamily: body }]}>{msg.content}</Text>
                </View>
              ) : (
                <View
                  style={[
                    st.aiCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isResolved ? theme.green : isFollowUp ? theme.teal : theme.surfaceBorder,
                    },
                    isResolved && { borderWidth: 1.5 },
                  ]}
                >
                  <View style={st.aiHead}>
                    <Text
                      style={[
                        st.aiLabel,
                        {
                          color: isResolved ? theme.green : isFollowUp ? theme.teal : theme.purple,
                          fontFamily: bold,
                        },
                      ]}
                    >
                      {isResolved
                        ? '✦ FINAL EPIC COUNSEL'
                        : isFollowUp
                        ? msg.searched_vector_db
                          ? '🔍 SCRIPTURE FOLLOW-UP (VECTOR MATCH)'
                          : '💬 COUNSELOR REASONING (CONVERSATION MEMORY)'
                        : '❓ SOCRATIC INQUIRY'}
                    </Text>
                  </View>

                  <StreamingText text={msg.content} />

                  {msg.sources && msg.sources.length > 0 && (
                    <SourceCard sources={msg.sources} />
                  )}
                </View>
              )}
            </FadeSlide>
          );
        })}

        {loading && (
          <FadeSlide duration={200}>
            <View style={[st.loader, { backgroundColor: theme.bgTertiary }]}>
              <TypingDots color={theme.teal} />
              <Text style={[st.loaderText, { color: theme.textSecondary, fontFamily: body }]}>
                Contemplating and connecting with ancient wisdom...
              </Text>
            </View>
          </FadeSlide>
        )}
      </ScrollView>

      {/* Pure Text Input Bar */}
      <View style={[st.bar, { backgroundColor: theme.bgSecondary, borderTopColor: theme.divider }]}>
        <TextInput
          style={[st.barInput, { color: theme.text, backgroundColor: theme.inputBg, fontFamily: body }]}
          placeholder={
            currentStage === 'follow_up'
              ? 'Ask anything (e.g., Why Rama? Explain step 2?)...'
              : 'Share your dilemma or reply naturally...'
          }
          placeholderTextColor={theme.textTertiary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable onPress={handleSend} disabled={loading}>
          <View style={[st.sendBtn, { backgroundColor: theme.teal, opacity: loading ? 0.5 : 1 }]}>
            <Text style={[st.sendText, { fontFamily: bold }]}>Send</Text>
          </View>
        </Pressable>
      </View>

      {/* Stored Chat History Modal / Session Switcher */}
      <Modal
        visible={historyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={st.modalOverlay}>
          <TouchableOpacity
            style={st.modalBackdrop}
            activeOpacity={1}
            onPress={() => setHistoryModalVisible(false)}
          />

          <View style={[st.modalBox, { backgroundColor: theme.bgSecondary, borderColor: theme.surfaceBorder }]}>
            <View style={[st.modalHeader, { borderBottomColor: theme.divider }]}>
              <View>
                <Text style={[st.modalTitle, { color: theme.text, fontFamily: bold }]}>
                  All Stored Conversations
                </Text>
                <Text style={[st.modalSub, { color: theme.textSecondary, fontFamily: body }]}>
                  {sessions.length} conversation{sessions.length === 1 ? '' : 's'} saved locally
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setHistoryModalVisible(false)}
                style={[st.closeBtn, { backgroundColor: theme.bgTertiary }]}
              >
                <Text style={[st.closeText, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={st.sessionsList}>
              {sessions.map((sess) => {
                const isActive = sess.id === currentSessionId;
                const dateStr = new Date(sess.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <TouchableOpacity
                    key={sess.id}
                    onPress={() => handleSwitchSession(sess.id)}
                    style={[
                      st.sessionItem,
                      {
                        backgroundColor: isActive ? theme.tealSubtle : theme.surface,
                        borderColor: isActive ? theme.teal : theme.surfaceBorder,
                      },
                    ]}
                  >
                    <View style={st.sessionItemHead}>
                      <Text
                        style={[
                          st.sessionItemTitle,
                          {
                            color: isActive ? theme.teal : theme.text,
                            fontFamily: bold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {sess.title || 'New Conversation'}
                      </Text>
                      {isActive && (
                        <View style={[st.activeBadge, { backgroundColor: theme.teal }]}>
                          <Text style={st.activeBadgeText}>ACTIVE</Text>
                        </View>
                      )}
                    </View>

                    <View style={st.sessionItemMeta}>
                      <Text style={[st.sessionItemDate, { color: theme.textTertiary, fontFamily: body }]}>
                        {dateStr}
                      </Text>
                      <Text style={[st.sessionItemCount, { color: theme.textTertiary, fontFamily: body }]}>
                        {sess.history.length} message{sess.history.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={[st.modalFooter, { borderTopColor: theme.divider }]}>
              <TouchableOpacity
                onPress={handleStartNewChat}
                style={[st.modalNewBtn, { backgroundColor: theme.teal }]}
              >
                <Text style={[st.modalNewBtnText, { fontFamily: bold }]}>
                  + Start New Conversation
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sessionSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: '68%',
  },
  sessionSelectorText: { fontSize: 13, flexShrink: 1 },
  sessionCountBadge: { fontSize: 11, marginLeft: 6 },
  newChatBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  newChatText: { fontSize: 13 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 24 },
  statusBanner: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginBottom: 12, borderWidth: 1 },
  statusText: { fontSize: 10, letterSpacing: 1.1, textAlign: 'center', textTransform: 'uppercase' },
  forceBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 14, alignItems: 'center' },
  forceText: { fontSize: 12, letterSpacing: 0.3 },
  empty: { alignItems: 'center', padding: 28, borderRadius: 16, borderWidth: 1, marginTop: 12 },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, opacity: 0.75, maxWidth: 330 },
  userBubble: { borderRadius: 16, padding: 14, marginBottom: 12, alignSelf: 'flex-end', maxWidth: '84%', borderWidth: 1 },
  userText: { fontSize: 14, lineHeight: 22 },
  aiCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  aiHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  aiLabel: { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase' },
  loader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginBottom: 12 },
  loaderText: { fontSize: 13 },
  bar: { flexDirection: 'row', padding: 12, borderTopWidth: 1, alignItems: 'center' },
  barInput: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginRight: 8 },
  sendBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
  sendText: { color: '#09090B', fontWeight: '700', fontSize: 14 },

  // Sessions Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modalBox: {
    width: Platform.OS === 'web' ? Math.min(Dimensions.get('window').width * 0.9, 520) : '100%',
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17 },
  modalSub: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  closeText: { fontSize: 13, fontWeight: '700' },
  sessionsList: { padding: 16, maxHeight: 380 },
  sessionItem: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  sessionItemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sessionItemTitle: { fontSize: 14, flex: 1, marginRight: 8 },
  activeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  activeBadgeText: { color: '#09090B', fontSize: 9, fontWeight: '800' },
  sessionItemMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  sessionItemDate: { fontSize: 11 },
  sessionItemCount: { fontSize: 11 },
  modalFooter: { padding: 16, borderTopWidth: 1 },
  modalNewBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalNewBtnText: { color: '#09090B', fontSize: 14 },
});
