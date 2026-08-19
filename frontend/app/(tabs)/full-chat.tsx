import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';

import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiService, SourceCitation, FullChatResponse } from '../../src/services/api';
import { StreamingText } from '../../src/components/StreamingText';
import { SourceCard } from '../../src/components/SourceCard';
import { useTheme } from '../../src/context/ThemeContext';
import { FadeSlide, Pressable, TypingDots } from '../../src/components/AnimatedComponents';
import { VedicDrawer } from '../../src/components/VedicDrawer';
import { VedicTopBar } from '../../src/components/VedicTopBar';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';
const bold = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';
const label = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_600SemiBold';

import {
  loadAllSessions,
  saveAllSessions,
  getActiveSessionId,
  setActiveSessionId,
  createNewSession,
  subscribeToSessions,
  syncUserSessionsFromDb,
  fetchSessionDetailFromDb,
  ChatMessage,
  ChatSession,
} from '../../src/services/chatStorage';


export const TOPIC_MATRIX = [
  {
    id: 'dharma',
    title: 'Dharma & Duty',
    icon: '⚖️',
    description:
      'Explore the unwavering righteousness of Rama versus the complex, contextual duties faced by Arjuna on the battlefield.',
    query: 'Analyze the contrast between Rama’s absolute dharma and Arjuna’s battlefield dilemma.',
  },
  {
    id: 'karma',
    title: 'Karma & Action',
    icon: '🔄',
    description:
      'Analyze the ripples of destiny and choice, from Dasharatha’s ancient boon to the inescapable vows of Bhishma.',
    query: 'How does karma and destiny shape outcomes in Dasharatha’s boons and Bhishma’s vows?',
  },
  {
    id: 'leadership',
    title: 'Leadership & Statecraft',
    icon: '👑',
    description:
      'Contrast the ideal, harmonious governance of Ramarajya with the pragmatic, realpolitik strategies of Krishna.',
    query: 'Compare the ideal governance of Ramarajya with Krishna’s pragmatic statecraft.',
  },
  {
    id: 'grief',
    title: 'Grief & Loss',
    icon: '💧',
    description:
      'Understand the profound human emotional landscape through Sita’s isolation and the devastating aftermath of the Kurukshetra war.',
    query: 'What do the epics teach about handling profound grief, loss, and isolation?',
  },
];

export default function FullChatScreen() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentStage, setCurrentStage] = useState<'interviewing' | 'resolved' | 'follow_up' | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showMatrix, setShowMatrix] = useState(true);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(false);

  const scrollRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < 600;

  useEffect(() => {
    const syncState = async () => {
      let loaded = loadAllSessions();
      if (loaded.length === 0) {
        loaded = await syncUserSessionsFromDb();
      }
      setSessions(loaded);

      if (!params.id) {
        // Navigated directly to /full-chat -> Fresh consultation page without query param!
        setIsSessionLoading(false);
        setCurrentSessionId('');
        setHistory([]);
        setCurrentStage(null);
        setInput('');
        setShowMatrix(true);
        return;
      }

      const active = loaded.find((s) => s.id === params.id);
      if (active && active.history && active.history.length > 0) {
        setIsSessionLoading(false);
        setCurrentSessionId(active.id);
        setActiveSessionId(active.id);
        setHistory(active.history);
        setCurrentStage(active.stage || null);
        setShowMatrix(false);
        return;
      }

      setIsSessionLoading(true);
      setCurrentSessionId(params.id as string);
      setActiveSessionId(params.id as string);
      const fetchedMsgs = await fetchSessionDetailFromDb(params.id as string);
      setIsSessionLoading(false);
      if (fetchedMsgs.length > 0) {
        setHistory(fetchedMsgs);
        setShowMatrix(false);
      } else {
        setHistory([]);
        setShowMatrix(true);
      }
    };


    syncState();

    const unsubscribe = subscribeToSessions((allSessions, activeId) => {
      setSessions(allSessions);
      if (!params.id) return;
      const target = allSessions.find((s) => s.id === params.id);
      if (target && target.history && target.history.length > 0) {
        setCurrentSessionId(target.id);
        setHistory(target.history);
        setCurrentStage(target.stage || null);
        setShowMatrix(false);
      }
    });


    return unsubscribe;
  }, [params.id]);

  const updateSessionState = (
    newHistory: ChatMessage[],
    newStage: 'interviewing' | 'resolved' | 'follow_up' | null,
    overrideSessionId?: string
  ) => {
    setHistory(newHistory);
    setCurrentStage(newStage);
    if (newHistory.length > 0) setShowMatrix(false);

    const activeId = overrideSessionId || currentSessionId;
    if (!activeId) return;

    setSessions((prev) => {
      const existingIdx = prev.findIndex((s) => s.id === activeId);
      let sessionTitle = 'New Consultation';
      const firstUserMsg = newHistory.find((m) => m.role === 'user');
      if (firstUserMsg) {
        sessionTitle = firstUserMsg.content.slice(0, 32);
        if (firstUserMsg.content.length > 32) sessionTitle += '...';
      }

      const updated: ChatSession = {
        id: activeId,
        title: sessionTitle,
        mode: 'full-chat',
        updatedAt: Date.now(),
        stage: newStage,
        history: newHistory,
      };

      let list: ChatSession[];
      if (existingIdx >= 0) {
        list = [...prev];
        list[existingIdx] = updated;
      } else {
        list = [updated, ...prev];
      }
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      saveAllSessions(list, activeId);
      return list;
    });
  };

  const handleStartNewChat = () => {
    router.push('/(tabs)/full-chat');
  };

  const handleSwitchSession = (sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId);
    if (target) {
      setCurrentSessionId(target.id);
      setHistory(target.history);
      setCurrentStage(target.stage);
      setShowMatrix(target.history.length === 0);
      saveAllSessions(sessions, target.id);
      router.setParams({ id: target.id });
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  };

  const handleSend = async (forcedQuery?: string, isForceResolve: boolean = false) => {
    const textToSend = (forcedQuery || input).trim();
    if ((!textToSend && !isForceResolve) || loading) return;

    if (!forcedQuery) setInput('');
    setShowMatrix(false);

    let activeId = currentSessionId;
    if (!activeId) {
      const newSession = createNewSession(textToSend.slice(0, 32) || 'New Consultation', 'full-chat');
      activeId = newSession.id;
      setCurrentSessionId(activeId);
      setActiveSessionId(activeId);
      router.setParams({ id: activeId });
    }

    let updatedHistory = [...history];
    if (textToSend) {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: textToSend,
      };
      updatedHistory.push(userMsg);
    }

    updateSessionState(updatedHistory, currentStage, activeId);
    setLoading(true);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const apiHistory = updatedHistory.map((h) => ({
        role: h.role,
        content: h.content,
        sources: h.sources || [],
      }));

      const res: FullChatResponse = await apiService.fullChatStrategy(
        textToSend || 'Please give me your final grounded counsel.',
        apiHistory,
        isForceResolve,
        activeId
      );

      const asstId = (Date.now() + 1).toString();
      setNewlyAddedId(asstId);

      const finalHistory: ChatMessage[] = [
        ...updatedHistory,
        {
          id: asstId,
          role: 'assistant',
          content: res.reply,
          stage: res.stage,
          sources: res.sources || [],
          searched_vector_db: res.searched_vector_db,
        },
      ];

      updateSessionState(finalHistory, res.stage, activeId);

    } catch (err: any) {
      const isQuotaError = err?.quotaExceeded || err?.status === 403 || (err?.message && err.message.toLowerCase().includes('guest limit'));
      const errorContent = isQuotaError
        ? '⚡ **Free Guest Limit Reached (3 Messages)**\n\nYou have used all 3 free guest turns. Please sign in or create a free account to unlock unlimited Vedic consultations!'
        : (err?.message || 'Unable to connect to Vedic counseling backend. Please verify your connection.');

      const fallback: ChatMessage[] = [
        ...updatedHistory,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: errorContent,
          stage: 'resolved',
        },
      ];
      updateSessionState(fallback, 'resolved', activeId);
    } finally {

      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Slide-out Navigation Drawer */}
      <VedicDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onSelectAction={(key) => {
          if (key === 'contemplation') handleSend('Provide a daily Vedic reflection on karma and duty.');
          else if (key === 'lineage') handleSend('Explain the lineage of Raghu and Kuru epics.');
          else if (key === 'dharma') handleSend('How do I assess my moral duty in complex times?');
        }}
      />

      {/* Unified Floating Top Bar & Mode Picker */}
      <VedicTopBar onOpenDrawer={() => setDrawerVisible(true)} />

      {/* Main Content Area */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Center Circular Loader during session switch */}
        {isSessionLoading ? (
          <View style={styles.centerLoaderContainer}>
            <ActivityIndicator size="large" color={theme.primaryContainer} />
            <Text style={[styles.centerLoaderText, { color: theme.textSecondary, fontFamily: body }]}>
              Loading consultation...
            </Text>
          </View>
        ) : (
          <>
            {/* Hero Section & Core Contrast (Shown only before chat starts) */}
            {history.length === 0 && (
              <>
                {/* Section 1: Hero Header */}
                <View style={styles.heroSection}>
                  <Text style={[styles.displayTitle, { color: theme.primary, fontFamily: serif }]}>
                    Epic Scholar Hub
                  </Text>

              <Text style={[styles.displaySubtitle, { color: theme.secondary, fontFamily: body }]}>
                Traverse the dual pillars of ancient wisdom. Delve into profound philosophical inquiries
                across the grand epics.
              </Text>
            </View>

            {/* Section 2: Vedic Filigree Divider */}
            <View style={styles.filigreeWrap}>
              <View style={[styles.filigreeLine, { backgroundColor: theme.outlineVariant }]} />
              <View style={[styles.filigreeIconWrap, { backgroundColor: theme.bg }]}>
                <Text style={[styles.filigreeIcon, { color: theme.outlineVariant }]}>✦</Text>
              </View>
              <View style={[styles.filigreeLine, { backgroundColor: theme.outlineVariant }]} />
            </View>

            {/* Section 5: Core Contrast Card (Principles vs Strategies) */}
            <View
              style={[
                styles.contrastCard,
                {
                  backgroundColor: theme.surfaceContainerLowest,
                  borderColor: theme.outlineVariant,
                },
              ]}
            >
              {/* Ornamental Gold Manuscript Corner Brackets */}
              <View style={[styles.cornerBracket, styles.cornerTL, { borderColor: theme.outlineVariant }]} />
              <View style={[styles.cornerBracket, styles.cornerTR, { borderColor: theme.outlineVariant }]} />
              <View style={[styles.cornerBracket, styles.cornerBL, { borderColor: theme.outlineVariant }]} />
              <View style={[styles.cornerBracket, styles.cornerBR, { borderColor: theme.outlineVariant }]} />

              <View style={styles.contrastHeader}>
                <View
                  style={[
                    styles.contrastBadge,
                    { backgroundColor: theme.secondaryContainer },
                  ]}
                >
                  <Text
                    style={[
                      styles.contrastBadgeText,
                      { color: theme.onSecondaryContainer, fontFamily: label },
                    ]}
                  >
                    CORE CONTRAST
                  </Text>
                </View>
                <Text style={[styles.contrastTitle, { color: theme.primary, fontFamily: serif }]}>
                  Principles vs Strategies
                </Text>
              </View>

              <View style={[styles.contrastColumns, isNarrow && { flexDirection: 'column' }]}>
                {/* Ramayana Column */}
                <View style={styles.epicColumn}>
                  <View style={styles.epicColTitleRow}>
                    <Text style={styles.epicColIcon}>📖</Text>
                    <Text style={[styles.epicColTitle, { color: theme.text, fontFamily: serif }]}>
                      The Ramayana
                    </Text>
                  </View>
                  <Text style={[styles.epicColDesc, { color: theme.textSecondary, fontFamily: body }]}>
                    Emphasizes absolute adherence to moral law (Dharma) regardless of personal cost.
                    It paints a world of clear ideals, where victory is achieved through unwavering righteousness.
                  </Text>
                  <View style={styles.bulletList}>
                    <Text style={[styles.bulletItem, { color: theme.text, fontFamily: body }]}>
                      ✓ Idealism and Devotion
                    </Text>
                    <Text style={[styles.bulletItem, { color: theme.text, fontFamily: body }]}>
                      ✓ Clear moral binaries & vows
                    </Text>
                  </View>
                </View>

                {/* Mahabharata Column */}
                <View
                  style={[
                    styles.epicColumn,
                    isNarrow
                      ? { borderTopWidth: 1, paddingTop: 16, borderLeftWidth: 0 }
                      : { borderLeftWidth: 1, borderTopWidth: 0, paddingLeft: 16 },
                    { borderColor: theme.outlineVariant },
                  ]}
                >
                  <View style={styles.epicColTitleRow}>
                    <Text style={styles.epicColIcon}>📜</Text>
                    <Text style={[styles.epicColTitle, { color: theme.text, fontFamily: serif }]}>
                      The Mahabharata
                    </Text>
                  </View>
                  <Text style={[styles.epicColDesc, { color: theme.textSecondary, fontFamily: body }]}>
                    Navigates the gray areas of morality, where Dharma is contextual and survival often requires
                    strategic pragmatism, reflecting human complexities.
                  </Text>
                  <View style={styles.bulletList}>
                    <Text style={[styles.bulletItem, { color: theme.text, fontFamily: body }]}>
                      ✓ Pragmatism & Realpolitik
                    </Text>
                    <Text style={[styles.bulletItem, { color: theme.text, fontFamily: body }]}>
                      ✓ Nuanced moral ambiguities
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Section 6: Conversational Stream & Source Cards */}
        {history.length > 0 && (
          <View style={styles.conversationStream}>
            {history.map((msg, index) => (
              <FadeSlide key={msg.id || index} delay={30} distance={10}>
                {msg.role === 'assistant' ? (
                  <View
                    style={[
                      styles.scholarCard,
                      {
                        backgroundColor: theme.surfaceContainerLowest,
                        borderColor: theme.outlineVariant,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.scholarAccentStripe,
                        { backgroundColor: theme.primaryContainer },
                      ]}
                    />
                    <View style={styles.scholarInner}>
                      <View style={styles.scholarBadgeRow}>
                        <Text style={styles.scholarBadgeIcon}>🏛️</Text>
                        <Text
                          style={[
                            styles.scholarBadgeLabel,
                            { color: theme.primaryContainer, fontFamily: label },
                          ]}
                        >
                          UNIVERSAL EPIC SCHOLAR
                        </Text>
                        {msg.searched_vector_db && (
                          <View
                            style={[
                              styles.vectorPill,
                              { backgroundColor: theme.secondaryContainer },
                            ]}
                          >
                            <Text
                              style={[
                                styles.vectorPillText,
                                { color: theme.onSecondaryContainer, fontFamily: label },
                              ]}
                            >
                              RAG Grounded
                            </Text>
                          </View>
                        )}
                      </View>

                      <StreamingText
                        text={msg.content}
                        animate={msg.id === newlyAddedId}
                        style={[
                          styles.scholarText,
                          { color: theme.text, fontFamily: serif },
                        ]}
                      />


                      {/* Source Citation Cards */}
                      {msg.sources && msg.sources.length > 0 && (
                        <SourceCard sources={msg.sources} />
                      )}

                      {/* Socratic Force Resolve CTA: Shown strictly on the latest active interviewing bubble before final counsel */}
                      {msg.role === 'assistant' &&
                        msg.stage === 'interviewing' &&
                        currentStage === 'interviewing' &&
                        index === history.length - 1 &&
                        (!msg.sources || msg.sources.length === 0) &&
                        !msg.content.includes('Final Epic Counsel') && (
                        <TouchableOpacity
                          style={[
                            styles.forceResolveBtn,
                            { backgroundColor: theme.bgSecondary, borderColor: theme.primaryContainer },
                          ]}
                          onPress={() => handleSend(undefined, true)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.forceResolveText,
                              { color: theme.primaryContainer, fontFamily: label },
                            ]}
                          >
                            ⚡ Give Me Grounded Counsel Now (Skip Questions)
                          </Text>
                        </TouchableOpacity>
                      )}

                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.userBubble,
                      {
                        backgroundColor: theme.bgSecondary,
                        borderColor: theme.outlineVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.userMsgText,
                        { color: theme.text, fontFamily: body },
                      ]}
                    >
                      {msg.content}
                    </Text>
                  </View>
                )}
              </FadeSlide>
            ))}

            {loading && (
              <FadeSlide duration={200}>
                <View
                  style={[
                    styles.loaderCard,
                    {
                      backgroundColor: theme.surfaceContainerLowest,
                      borderColor: theme.outlineVariant,
                    },
                  ]}
                >
                  <TypingDots color={theme.primaryContainer} />
                  <Text
                    style={[
                      styles.loaderText,
                      { color: theme.secondary, fontFamily: body },
                    ]}
                  >
                    Synthesizing lessons across Ramayana & Mahabharata...
                  </Text>
                </View>
              </FadeSlide>
            )}
          </View>
        )}
          </>
        )}

        <View style={{ height: 110 }} />

      </ScrollView>

      {/* Floating Bottom Input Pill with Fade */}
      <View
        style={[
          styles.floatingInputWrapper,
          Platform.OS === 'web'
            ? ({
                background: `linear-gradient(to top, ${theme.bg} 40%, ${theme.bg}BB 65%, ${theme.bg}00 100%)`,
              } as any)
            : { backgroundColor: 'transparent' },
        ]}
      >
        <View
          style={[
            styles.floatingInputPill,
            {
              backgroundColor: theme.surfaceContainerLowest,
              borderColor: theme.outlineVariant,
              shadowColor: theme.primaryContainer,
            },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              { color: theme.text, fontFamily: body },
            ]}
            placeholder="Ask anything across Ramayana & Mahabharata..."
            placeholderTextColor={theme.textTertiary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />

          <TouchableOpacity
            style={[
              styles.sendCircleBtn,
              { backgroundColor: theme.primaryContainer },
            ]}
            onPress={() => handleSend()}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={[styles.sendIcon, { color: theme.onPrimaryContainer }]}>
              ➤
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topFloatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 12,
    paddingBottom: 16,
  },
  floatingPillBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  floatingPillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  pillIconTouch: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIconText: {
    fontSize: 18,
  },
  pillDivider: {
    width: 1,
    height: 18,
    opacity: 0.6,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 72,
    paddingHorizontal: 16,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  displayTitle: {
    fontSize: Platform.OS === 'web' ? 36 : 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  displaySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 620,
    lineHeight: 23,
    marginBottom: 20,
  },
  searchBox: {
    width: '100%',
    maxWidth: 720,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
  },
  seekBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  seekBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filigreeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    width: '100%',
  },
  filigreeLine: {
    flex: 1,
    height: 1,
    opacity: 0.6,
  },
  filigreeIconWrap: {
    paddingHorizontal: 12,
  },
  filigreeIcon: {
    fontSize: 14,
  },
  matrixSection: {
    marginBottom: 16,
  },
  matrixSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 14,
  },
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  topicCard: {
    width: Platform.OS === 'web' ? '48.5%' : '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  topicCardAccent: {
    height: 4,
    width: '100%',
  },
  topicCardInner: {
    padding: 16,
  },
  topicHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topicIcon: {
    fontSize: 26,
  },
  topicArrow: {
    fontSize: 18,
    fontWeight: '700',
  },
  topicTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 6,
  },
  topicDesc: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  contrastCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    position: 'relative',
    marginBottom: 24,
    shadowColor: 'rgba(146,113,13,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 3,
  },
  cornerBracket: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderWidth: 1.5,
  },
  cornerTL: { top: 8, left: 8, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 8, right: 8, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 8, left: 8, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 8, right: 8, borderLeftWidth: 0, borderTopWidth: 0 },
  contrastHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  contrastBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    marginBottom: 8,
  },
  contrastBadgeText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  contrastTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  contrastColumns: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
  },
  epicColumn: {
    flex: 1,
    paddingHorizontal: 6,
  },
  epicColumnRight: {
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderTopWidth: Platform.OS === 'web' ? 0 : 1,
    paddingTop: Platform.OS === 'web' ? 0 : 16,
  },
  epicColTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  epicColIcon: {
    fontSize: 18,
  },
  epicColTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  epicColDesc: {
    fontSize: 13.5,
    lineHeight: 21,
    marginBottom: 10,
  },
  bulletList: {
    gap: 4,
  },
  bulletItem: {
    fontSize: 13,
  },
  contrastActionWrap: {
    alignItems: 'center',
    marginTop: 20,
  },
  compareBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  compareBtnText: {
    fontSize: 13,
  },
  conversationStream: {
    marginTop: 10,
    marginBottom: 20,
  },
  streamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  streamTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  toggleMatrixText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  scholarCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 2,
  },
  scholarAccentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  scholarInner: {
    padding: 16,
    paddingLeft: 18,
  },
  scholarBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  scholarBadgeIcon: {
    fontSize: 16,
  },
  scholarBadgeLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  vectorPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  vectorPillText: {
    fontSize: 9,
  },
  scholarText: {
    fontSize: 16,
    lineHeight: 26,
  },
  forceResolveBtn: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forceResolveText: {
    fontSize: 11,
    fontWeight: '600',
  },

  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  userMsgText: {
    fontSize: 15,
    lineHeight: 22,
  },
  loaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  loaderText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  floatingInputWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 24,
    alignItems: 'center',
    zIndex: 50,
  },
  floatingInputPill: {
    width: '100%',
    maxWidth: 760,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  micBtn: {
    padding: 8,
    borderRadius: 14,
  },
  micIcon: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' as any }),
  },
  sendCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sendIcon: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  newChatBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  newChatBtnText: {
    fontSize: 13,
  },
  sessionItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  sessionTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  sessionMeta: {
    fontSize: 11,
  },
  centerLoaderContainer: {
    paddingVertical: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  centerLoaderText: {
    fontSize: 14,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
});

