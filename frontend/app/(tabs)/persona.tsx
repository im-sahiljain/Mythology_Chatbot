import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Pressable as RNPressable,
  ActivityIndicator,
} from 'react-native';

import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiService, SourceCitation } from '../../src/services/api';
import { StreamingText } from '../../src/components/StreamingText';
import { SourceCard } from '../../src/components/SourceCard';
import { useTheme } from '../../src/context/ThemeContext';
import { FadeSlide, TypingDots } from '../../src/components/AnimatedComponents';
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


export interface GuideCard {
  name: string;
  epic: 'Ramayana' | 'Mahabharata';
  role: string;
  subtitle: string;
  imageUrl: string;
  quote: string;
  icon: string;
}

export const GUIDE_CHARACTERS: GuideCard[] = [
  {
    name: 'Krishna',
    epic: 'Mahabharata',
    role: 'Divine Strategist',
    subtitle: 'Karma & Svadharma',
    icon: '🪶',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCvy6FRDn2yeF0ZDAQ68lRMvO-idwqZ8BX_rPH9sULF1u4k8rHqyhhCbIQ4g1W-0dqCJg_p6OC5YIq2SBGlvh2yugr56Bm05mx-2b6wWnu5SeO-Hj_ksa9mz36vxX5K_TMEn4DAMT-o0ToGqDPI7rA4hG6ugmN8JMBmhyx-k3SSZpnwHN6Cmj2xXQFpeJ2zljs5B0oWLSBabHJASbFmXZJAJMRNPeOiwKPc0WClp1YoQWStEmp60skyLQ',
    quote:
      '"You have a right to perform your prescribed duty, but you are not entitled to the fruits of action."',
  },
  {
    name: 'Sita',
    epic: 'Ramayana',
    role: 'Moral Dignity & Dharma',
    subtitle: 'Princess of Mithila',
    icon: '🌸',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDFb6Kk0BzbFNK6vaa61WLC1GhK3P5GfbepMaVR_URnbMpLSeS-BKvJj40LOPlR26D8vIJ79Xdi_MLRNWvjhKMsGh9D_lHrELz_ASLV8PWcF_pEpeb-wbeyi0R_x1Ym6iXCmXdRfXUKCXbk7dssz2IgdKEddNkhTz16p5z8C63i8XRTqSAHsTiZmGRSY9-pAf-uV4w5ip3ggTmSOMYUYIK_tcUK-aOeG-QS1TJQSvgsjRBtj2cqo-pPCQ',
    quote:
      '"In the Ashoka Grove, I faced not just the demon king, but the shadows of despair. Yet, my dharma remained unyielding."',
  },
  {
    name: 'Arjuna',
    epic: 'Mahabharata',
    role: 'Moral Hesitation & Duty',
    subtitle: 'Reluctant Warrior',
    icon: '🎯',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCCYNFMPeTrtde-wofx2qUFcXrKxUqP7HcWeIyw-GFns3mMemw6zMQtlv6e7aDmH5fw0pEAH1t1GqwC0_2fwqwOmz4N8IRoAgFvbH-Wsrv9B2Hp_LpuHTx45049JhRrfQrvfhbCu5nxs5tLqw1c4ZFHhLpacTvROsWfsCkRp36uXpkGcQWO05Sx3bXf8VLopyQvR1clu_o0jH_pG-lb2L7mBPQUuhySJu3iXo3lDRBg2DW4aSsYA611uw',
    quote:
      '"My limbs fail and my mouth becomes dry. How can any good come from killing my own kinsmen?"',
  },
  {
    name: 'Karna',
    epic: 'Mahabharata',
    role: 'Unwavering Loyalty',
    subtitle: 'Tragic Hero',
    icon: '🌅',
    imageUrl:
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
    quote:
      '"Duryodhana gave me honor when the world gave me shame. I shall not abandon my friend in war."',
  },
  {
    name: 'Vibhishana',
    epic: 'Ramayana',
    role: 'Righteous Whistleblowing',
    subtitle: 'Truth over Kinship',
    icon: '🛡️',
    imageUrl:
      'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
    quote:
      '"When a king abandons dharma, true loyalty demands speaking the truth, even if cast out as a traitor."',
  },
  {
    name: 'Drona',
    epic: 'Mahabharata',
    role: 'Master Preceptor',
    subtitle: 'Archery Guru',
    icon: '🏹',
    imageUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    quote:
      '"A teacher judges not by birth, but by unyielding focus and reverence for the sacred bow."',
  },
  {
    name: 'Sugriva',
    epic: 'Ramayana',
    role: 'Alliance King',
    subtitle: 'Vanara Sovereign',
    icon: '👑',
    imageUrl:
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    quote:
      '"In Rama I found a friend who honored his pledge; in return, the entire Vanara realm marches for Sita."',
  },
];

interface ChatMsg {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  stage?: 'interviewing' | 'resolved' | 'follow_up';
  sources?: SourceCitation[];
}

export default function PersonaScreen() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const [selectedGuide, setSelectedGuide] = useState<GuideCard>(GUIDE_CHARACTERS[0]);
  const [sessionId, setSessionId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [hasStartedConsultation, setHasStartedConsultation] = useState(false);
  const [currentStage, setCurrentStage] = useState<'interviewing' | 'resolved' | 'follow_up'>('interviewing');
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(false);

  const [history, setHistory] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content: GUIDE_CHARACTERS[0].quote,
      stage: 'interviewing',
    },
  ]);

  const scrollRef = useRef<ScrollView>(null);
  const carouselScrollRef = useRef<ScrollView>(null);
  const [activeGuideIndex, setActiveGuideIndex] = useState(0);

  const scrollToIndex = (index: number) => {
    const targetIdx = Math.max(0, Math.min(index, GUIDE_CHARACTERS.length - 1));
    setActiveGuideIndex(targetIdx);
    if (targetIdx === 0) {
      carouselScrollRef.current?.scrollTo({ x: 0, animated: true });
    } else if (targetIdx === GUIDE_CHARACTERS.length - 1) {
      carouselScrollRef.current?.scrollTo({ x: 9999, animated: true });
    } else {
      carouselScrollRef.current?.scrollTo({
        x: targetIdx * 286,
        animated: true,
      });
    }
  };

  useEffect(() => {
    const syncSession = async () => {
      if (!params.id) {
        setIsSessionLoading(false);
        setSessionId('');
        setHasStartedConsultation(false);
        setCurrentStage('interviewing');
        setHistory([]);
        return;
      }

      let all = loadAllSessions();
      if (all.length === 0) {
        all = await syncUserSessionsFromDb();
      }
      const active = all.find((s) => s.id === params.id);

      if (active && active.history && active.history.length > 0) {
        setIsSessionLoading(false);
        setSessionId(active.id);
        if (active.stage) setCurrentStage(active.stage as any);
        const matchedGuide = GUIDE_CHARACTERS.find(
          (g) => g.name.toLowerCase() === active.character?.toLowerCase()
        );
        if (matchedGuide) setSelectedGuide(matchedGuide);

        setHistory(
          active.history.map((h) => ({
            id: h.id,
            role: h.role,
            content: h.content,
            stage: (h as any).stage || active.stage || 'resolved',
            sources: h.sources,
          }))
        );
        setHasStartedConsultation(true);
        return;
      }

      setIsSessionLoading(true);
      setSessionId(params.id as string);
      setActiveSessionId(params.id as string);
      const fetchedMsgs = await fetchSessionDetailFromDb(params.id as string);
      setIsSessionLoading(false);

      if (fetchedMsgs.length > 0) {
        const targetChar = active?.character || fetchedMsgs[0]?.character;
        if (targetChar) {
          const matchedGuide = GUIDE_CHARACTERS.find(
            (g) => g.name.toLowerCase() === targetChar.toLowerCase()
          );
          if (matchedGuide) setSelectedGuide(matchedGuide);
        }

        setHistory(
          fetchedMsgs.map((h) => ({
            id: h.id,
            role: h.role,
            content: h.content,
            stage: h.stage || 'resolved',
            sources: h.sources,
          }))
        );
        setHasStartedConsultation(true);
      } else {
        setHasStartedConsultation(false);
        setCurrentStage('interviewing');
        setHistory([]);
      }
    };


    syncSession();
    const unsubscribe = subscribeToSessions((all, activeId) => {
      if (!params.id) return;
      const active = all.find((s) => s.id === params.id && s.mode === 'persona');
      if (active && active.character && active.history && active.history.length > 0) {
        setSessionId(active.id);
        if (active.stage) {
          setCurrentStage(active.stage as any);
        }
        const matchedGuide = GUIDE_CHARACTERS.find(
          (g) => g.name.toLowerCase() === active.character?.toLowerCase()
        );
        if (matchedGuide) setSelectedGuide(matchedGuide);

        setHistory(
          active.history.map((h) => ({
            role: h.role,
            content: h.content,
            stage: (h as any).stage || active.stage || 'resolved',
            sources: h.sources,
          }))
        );
        setHasStartedConsultation(true);
      }
    });

    return unsubscribe;
  }, [params.id]);

  const savePersonaSession = (
    msgs: ChatMsg[],
    stage: 'interviewing' | 'resolved' | 'follow_up' = 'interviewing',
    overrideId?: string,
    overrideChar?: string
  ) => {
    let currentId = overrideId || sessionId;
    if (!currentId) {
      currentId = Date.now().toString();
      setSessionId(currentId);
    }
    const charName = overrideChar || selectedGuide.name;

    const firstUserMsg = msgs.find((m) => m.role === 'user');
    let title = `${charName} Counsel`;
    if (firstUserMsg) {
      title = `${charName}: ${firstUserMsg.content.slice(0, 24)}...`;
    }

    const chatMessages: ChatMessage[] = msgs.map((m, idx) => ({
      id: `${currentId}-${idx}`,
      role: m.role,
      content: m.content,
      stage: m.stage || stage,
      sources: m.sources,
    }));

    const session: ChatSession = {
      id: currentId,
      title,
      mode: 'persona',
      character: charName,
      updatedAt: Date.now(),
      stage: stage,
      history: chatMessages,
    };

    const all = loadAllSessions();
    const idx = all.findIndex((s) => s.id === currentId);
    let list: ChatSession[];
    if (idx >= 0) {
      list = [...all];
      list[idx] = session;
    } else {
      list = [session, ...all];
    }
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    saveAllSessions(list, currentId);
  };

  const handleSelectGuideAndStart = (guide: GuideCard) => {
    setSelectedGuide(guide);
    const newSession = createNewSession(`${guide.name} Counsel`, 'persona', guide.name);
    setSessionId(newSession.id);
    setActiveSessionId(newSession.id);
    setCurrentStage('interviewing');
    setHasStartedConsultation(true);
    const initialMsgs: ChatMsg[] = [
      {
        role: 'assistant',
        content: guide.quote,
        stage: 'interviewing',
      },
    ];
    setHistory(initialMsgs);
    router.setParams({ id: newSession.id });
    savePersonaSession(initialMsgs, 'interviewing', newSession.id, guide.name);
  };

  const sendQuery = async (queryText?: string, isForceResolve: boolean = false) => {
    const textToSend = (queryText || input).trim();
    if ((!textToSend && !isForceResolve) || loading) return;

    if (!queryText) setInput('');
    setHasStartedConsultation(true);

    let nextHistory = [...history];
    if (textToSend) {
      nextHistory.push({ role: 'user', content: textToSend });
    }
    setHistory(nextHistory);
    setLoading(true);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const apiHistory = nextHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiService.characterChat(
        textToSend || 'Please deliver your final grounded counsel from your life lessons.',
        selectedGuide.name,
        apiHistory,
        isForceResolve,
        sessionId
      );

      const respStage = res.stage || 'resolved';
      setCurrentStage(respStage as any);

      const asstId = (Date.now() + 1).toString();
      setNewlyAddedId(asstId);


      const finalHistory: ChatMsg[] = [
        ...nextHistory,
        {
          id: asstId,
          role: 'assistant',
          content: res.reply,
          stage: respStage,
          sources: res.sources || [],
        },
      ];
      setHistory(finalHistory);
      savePersonaSession(finalHistory, respStage);

    } catch {
      const fallbackHistory: ChatMsg[] = [
        ...nextHistory,
        {
          role: 'assistant',
          content: `Even in turbulent times, seek stillness. I am reflecting upon your query on ${textToSend}.`,
          stage: 'resolved',
        },
      ];
      setHistory(fallbackHistory);
      savePersonaSession(fallbackHistory, 'resolved');
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
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
        onSelectAction={(action) => {
          if (action === 'dharma') sendQuery('How do I assess my moral duty in this conflict?');
          else if (action === 'contemplation') sendQuery('Give me a morning Vedic reflection for clarity.');
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
            {/* Section 1: Hero Character Deck (Shown only before consultation starts) */}
            {!hasStartedConsultation && (
              <>
                <View style={styles.heroSection}>
                  <View style={styles.heroHeader}>
                    <Text style={[styles.heroTitle, { color: theme.primaryContainer, fontFamily: serif }]}>
                      Select Your Guide
                    </Text>

                <Text style={[styles.heroSubtitle, { color: theme.secondary, fontFamily: body }]}>
                  Consult the ancients for modern wisdom
                </Text>
              </View>

              {/* Horizontal Character Carousel with Navigation Controls */}
              <View style={styles.carouselWrapper}>
                <TouchableOpacity
                  style={[
                    styles.carouselArrowBtn,
                    styles.carouselArrowLeft,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.outlineVariant,
                      shadowColor: theme.shadow,
                      opacity: activeGuideIndex === 0 ? 0.3 : 1,
                    },
                  ]}
                  onPress={() => scrollToIndex(activeGuideIndex - 1)}
                  disabled={activeGuideIndex === 0}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.arrowIconText, { color: theme.primary }]}>‹</Text>
                </TouchableOpacity>

                <ScrollView
                  ref={carouselScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContainer}
                  decelerationRate="fast"
                  snapToInterval={286}
                  snapToAlignment="center"
                  onScroll={(e) => {
                    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
                    const maxScroll = Math.max(1, contentSize.width - layoutMeasurement.width);
                    const scrollRatio = Math.min(1, Math.max(0, contentOffset.x / maxScroll));
                    const idx = Math.min(GUIDE_CHARACTERS.length - 1, Math.round(scrollRatio * (GUIDE_CHARACTERS.length - 1)));
                    if (idx !== activeGuideIndex) {
                      setActiveGuideIndex(idx);
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  {GUIDE_CHARACTERS.map((char) => {
                    return (
                      <View
                        key={char.name}
                        style={[
                          styles.characterCard,
                          {
                            backgroundColor: theme.surfaceContainerLowest,
                            borderColor: theme.isDark
                              ? 'rgba(234, 194, 92, 0.35)'
                              : '#C4B499',
                            borderWidth: 1.5,
                            shadowColor: theme.shadow,
                            shadowOpacity: 0.08,
                            shadowRadius: 8,
                            elevation: 2,
                          },
                        ]}
                      >
                        {/* Portrait Image with Gradient & Badge */}
                        <View style={styles.imageWrapper}>
                          <Image
                            source={{ uri: char.imageUrl }}
                            style={styles.portraitImage}
                            resizeMode="cover"
                          />
                          <View style={styles.imageDarkOverlay} />
                          <View style={styles.epicPill}>
                            <Text style={[styles.epicPillText, { fontFamily: label }]}>
                              {char.icon} {char.epic}
                            </Text>
                          </View>
                        </View>

                        {/* Card Body */}
                        <View style={[styles.cardBody, { borderTopColor: theme.outlineVariant }]}>
                          <Text
                            style={[
                              styles.charName,
                              {
                                color: theme.primary,
                                fontFamily: serif,
                              },
                            ]}
                          >
                            {char.name}
                          </Text>
                          <Text style={[styles.charRole, { color: theme.secondary, fontFamily: body }]}>
                            {char.role}
                          </Text>
                          <Text
                            style={[
                              styles.charSubtitle,
                              { color: theme.textTertiary, fontFamily: body },
                            ]}
                          >
                            {char.subtitle}
                          </Text>

                          <View style={styles.cardActionWrap}>
                            <RNPressable
                              style={({ hovered }: any) => [
                                styles.primaryBtn,
                                {
                                  backgroundColor: hovered
                                    ? theme.primaryContainer
                                    : theme.surface,
                                  borderColor: theme.primaryContainer,
                                  borderWidth: 1.5,
                                },
                              ]}
                              onPress={() => handleSelectGuideAndStart(char)}
                            >
                              {({ hovered }: any) => (
                                <Text
                                  style={[
                                    styles.primaryBtnText,
                                    {
                                      color: hovered
                                        ? theme.onPrimaryContainer
                                        : theme.primaryContainer,
                                      fontFamily: label,
                                    },
                                  ]}
                                >
                                  Select Guide
                                </Text>
                              )}
                            </RNPressable>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity
                  style={[
                    styles.carouselArrowBtn,
                    styles.carouselArrowRight,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.outlineVariant,
                      shadowColor: theme.shadow,
                      opacity: activeGuideIndex === GUIDE_CHARACTERS.length - 1 ? 0.3 : 1,
                    },
                  ]}
                  onPress={() => scrollToIndex(activeGuideIndex + 1)}
                  disabled={activeGuideIndex === GUIDE_CHARACTERS.length - 1}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.arrowIconText, { color: theme.primary }]}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Pagination Dots Indicator for all 7 Guides */}
              <View style={styles.dotsRow}>
                {GUIDE_CHARACTERS.map((char, idx) => (
                  <TouchableOpacity
                    key={char.name}
                    onPress={() => {
                      scrollToIndex(idx);
                      setSelectedGuide(char);
                    }}
                    style={[
                      styles.guideDot,
                      {
                        backgroundColor: idx === activeGuideIndex ? theme.primaryContainer : theme.outlineVariant,
                        width: idx === activeGuideIndex ? 22 : 7,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          </>
        )}

        {/* Section 2: Live Consultation Stream */}
        {hasStartedConsultation && (
          <View style={styles.dialogueSection}>
            <View style={styles.dialogueHeader}>
              <Text
                style={[
                  styles.dialogueTitle,
                  { color: theme.primary, fontFamily: serif },
                ]}
              >
                Dialogue with {selectedGuide.name}
              </Text>
            </View>

            {history.map((msg, index) => (
              <FadeSlide key={index} delay={30} distance={10}>
                {msg.role === 'assistant' ? (
                  <View
                    style={[
                      styles.aiMessageCard,
                      {
                        backgroundColor: theme.surfaceContainerLowest,
                        borderColor: theme.outlineVariant,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.aiAccentStripe,
                        { backgroundColor: theme.primaryContainer },
                      ]}
                    />
                    <View style={styles.aiContentInner}>
                      <View style={styles.aiHeaderRow}>
                        <Text style={styles.aiAvatarIcon}>{selectedGuide.icon}</Text>
                        <Text
                          style={[
                            styles.aiSenderName,
                            { color: theme.primaryContainer, fontFamily: label },
                          ]}
                        >
                          {selectedGuide.name.toUpperCase()}
                        </Text>
                      </View>
                      <StreamingText
                        text={msg.content}
                        animate={msg.id === newlyAddedId}
                        style={[
                          styles.aiText,
                          { color: theme.text, fontFamily: serif },
                        ]}
                      />

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
                          onPress={() => sendQuery(undefined, true)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.forceResolveBtnText,
                              { color: theme.primaryContainer, fontFamily: label },
                            ]}
                          >
                            ⚡ Give Me Grounded Counsel Now (Skip Questions)
                          </Text>
                        </TouchableOpacity>
                      )}


                      {msg.sources && msg.sources.length > 0 && (
                        <SourceCard sources={msg.sources} />
                      )}
                    </View>
                  </View>

                ) : (
                  <View
                    style={[
                      styles.userMessageBubble,
                      {
                        backgroundColor: theme.bgSecondary,
                        borderColor: theme.outlineVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.userText,
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
                    styles.loadingIndicator,
                    {
                      backgroundColor: theme.surfaceContainerLowest,
                      borderColor: theme.outlineVariant,
                    },
                  ]}
                >
                  <TypingDots color={theme.primaryContainer} />
                  <Text
                    style={[
                      styles.loadingText,
                      { color: theme.secondary, fontFamily: body },
                    ]}
                  >
                    {selectedGuide.name} is contemplating scripture...
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
            placeholder={`Seek guidance from ${selectedGuide.name}...`}
            placeholderTextColor={theme.textTertiary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendQuery()}
            returnKeyType="send"
          />

          <TouchableOpacity
            style={[
              styles.sendCircleBtn,
              { backgroundColor: theme.primaryContainer },
            ]}
            onPress={() => sendQuery()}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.sendIcon,
                { color: theme.onPrimaryContainer },
              ]}
            >
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
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  heroSection: {
    marginBottom: 20,
  },
  heroHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  carouselContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 16,
  },
  characterCard: {
    width: Platform.OS === 'web' ? 270 : 255,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 8,
  },
  imageWrapper: {
    height: 180,
    width: '100%',
    position: 'relative',
    backgroundColor: '#1E1E24',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  imageDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  activeBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  activeBadgeText: {
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  epicPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  epicPillText: {
    color: '#FFF',
    fontSize: 10,
  },
  cardBody: {
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  charName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  charRole: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  charSubtitle: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  cardActionWrap: {
    width: '100%',
    marginTop: 14,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(146,113,13,0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  carouselWrapper: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },
  carouselArrowBtn: {
    position: 'absolute',
    top: '36%',
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  carouselArrowLeft: {
    left: Platform.OS === 'web' ? -16 : 4,
  },
  carouselArrowRight: {
    right: Platform.OS === 'web' ? -16 : 4,
  },
  arrowIconText: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  guideDot: {
    height: 7,
    borderRadius: 3.5,
  },
  dialogueSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  dialogueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dialogueTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  stageBadgeText: {
    fontSize: 10,
    letterSpacing: 0.3,
    fontWeight: '700',
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
  forceResolveBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },

  resetText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  aiMessageCard: {
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
  aiAccentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  aiContentInner: {
    padding: 16,
    paddingLeft: 18,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiAvatarIcon: {
    fontSize: 16,
  },
  aiSenderName: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  aiText: {
    fontSize: 16,
    lineHeight: 26,
  },
  userMessageBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  loadingText: {
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
    maxWidth: 700,
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



