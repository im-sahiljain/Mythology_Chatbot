import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  apiService,
  SourceCitation,
  FullChatResponse,
} from "../../src/services/api";
import { StreamingText } from "../../src/components/StreamingText";
import { SourceCard } from "../../src/components/SourceCard";
import { useTheme } from "../../src/context/ThemeContext";
import {
  FadeSlide,
  Pressable,
  TypingDots,
} from "../../src/components/AnimatedComponents";
import { VedicDrawer } from "../../src/components/VedicDrawer";
import { VedicTopBar } from "../../src/components/VedicTopBar";
const useObserve = () => ({ markInteractive: () => {} });

const serif =
  Platform.OS === "web"
    ? "'EB Garamond', Georgia, serif"
    : "EBGaramond_700Bold";
const body =
  Platform.OS === "web"
    ? "'Hanken Grotesk', sans-serif"
    : "HankenGrotesk_400Regular";
const bold =
  Platform.OS === "web"
    ? "'Hanken Grotesk', sans-serif"
    : "HankenGrotesk_700Bold";
const label =
  Platform.OS === "web"
    ? "'Hanken Grotesk', sans-serif"
    : "HankenGrotesk_600SemiBold";

import {
  loadAllSessions,
  saveAllSessions,
  getActiveSessionId,
  setActiveSessionId,
  createNewSession,
  subscribeToSessions,
  fetchSessionDetailFromDb,
  ChatMessage,
  ChatSession,
} from "../../src/services/chatStorage";

export const TOPIC_MATRIX = [
  {
    category: "Workplace & Ethics",
    icon: "⚖️",
    description: "Corporate dilemmas, favoritism, and professional Dharma.",
    prompt:
      "I feel conflicted because my company favors the founder’s son over my most hardworking junior. What should I do?",
  },
  {
    category: "Family & Loyalties",
    icon: "🏠",
    description:
      "Parental expectations, sibling rivalry, and personal boundaries.",
    prompt:
      "My parents want me to take over our family business, but my true calling is in social work. How do I navigate this?",
  },
  {
    category: "Leadership & Vision",
    icon: "👑",
    description:
      "Difficult decisions, team morale, and organizational conflict.",
    prompt:
      "I have to lay off 20% of my team to save the company from bankruptcy. How do I balance compassion with survival?",
  },
  {
    category: "Personal Truth & Integrity",
    icon: "🪷",
    description: "Inner struggles, standing up for truth, and moral courage.",
    prompt:
      "I discovered financial irregularities committed by my mentor who helped build my career. Should I report it?",
  },
];

export default function FullChatScreen() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { markInteractive } = useObserve();

  useEffect(() => {
    markInteractive();
  }, [markInteractive]);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [isSessionLoading, setIsSessionLoading] = useState(!!params.id);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentStage, setCurrentStage] = useState<
    "interviewing" | "resolved" | "follow_up" | null
  >(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showMatrix, setShowMatrix] = useState(true);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [inputHeight, setInputHeight] = useState(36);

  const handleInputChange = (text: string) => {
    setInput(text);
    if (!text.trim()) {
      setInputHeight(36);
      setIsInputExpanded(false);
    }
  };

  const handleKeyDown = (e: any) => {
    if (
      Platform.OS === "web" &&
      e.nativeEvent.key === "Enter" &&
      !e.nativeEvent.shiftKey
    ) {
      e.preventDefault();
      if (!loading) {
        handleSend();
      }
    }
  };

  const handleCopyText = async (text: string, id: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedMsgId(id);
      setTimeout(() => {
        setCopiedMsgId(null);
      }, 2000);
    } catch (e) {
      console.warn("Clipboard copy error:", e);
    }
  };

  const formatLocalTime = (timestamp?: string | number) => {
    if (!timestamp)
      return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    const d = new Date(timestamp);
    return isNaN(d.getTime())
      ? ""
      : d.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
  };

  const scrollRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < 600;

  useEffect(() => {
    const syncState = async () => {
      const loaded = loadAllSessions();
      setSessions(loaded);

      if (!params.id) {
        // Navigated directly to /full-chat -> Fresh consultation page without query param!
        setIsSessionLoading(false);
        setCurrentSessionId("");
        setActiveSessionId(null);
        setHistory([]);
        setCurrentStage(null);
        setInput("");
        setShowMatrix(true);
        return;
      }

      const active = loaded.find((s) => s.id === params.id);
      if (active && active.history && active.history.length > 0) {
        setCurrentSessionId(active.id);
        setActiveSessionId(active.id);
        setHistory(active.history);
        setCurrentStage(active.stage || null);
        setShowMatrix(false);
        setIsSessionLoading(false);
      } else {
        setHistory([]);
        setIsSessionLoading(true);
        try {
          const msgs = await fetchSessionDetailFromDb(params.id as string);
          if (msgs && msgs.length > 0) {
            setCurrentSessionId(params.id as string);
            setActiveSessionId(params.id as string);
            setHistory(msgs);
            setShowMatrix(false);
          }
        } finally {
          setIsSessionLoading(false);
        }
      }
    };

    syncState();

    const unsubscribe = subscribeToSessions((allSessions, activeId) => {
      setSessions(allSessions);
      if (!params.id) return;
      const target = allSessions.find((s) => s.id === (params.id || activeId));
      if (target && target.history && target.history.length > 0) {
        setCurrentSessionId(target.id);
        setHistory(target.history);
        setCurrentStage(target.stage || null);
        setShowMatrix(false);
        setIsSessionLoading(false);
      }
    });

    return unsubscribe;
  }, [params.id]);

  const updateSessionState = (
    newHistory: ChatMessage[],
    newStage: "interviewing" | "resolved" | "follow_up" | null,
    overrideSessionId?: string,
  ) => {
    setHistory(newHistory);
    setCurrentStage(newStage);
    if (newHistory.length > 0) setShowMatrix(false);

    const activeId = overrideSessionId || currentSessionId;
    if (!activeId) return;

    setSessions((prev) => {
      const existingIdx = prev.findIndex((s) => s.id === activeId);
      let sessionTitle = "New Consultation";
      const firstUserMsg = newHistory.find((m) => m.role === "user");
      if (firstUserMsg) {
        sessionTitle = firstUserMsg.content.slice(0, 32);
        if (firstUserMsg.content.length > 32) sessionTitle += "...";
      }

      const updated: ChatSession = {
        id: activeId,
        title: sessionTitle,
        mode: "full-chat",
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
    router.push("/(tabs)/full-chat");
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

  const handleSend = async (
    forcedQuery?: string,
    isForceResolve: boolean = false,
  ) => {
    const textToSend = (forcedQuery || input).trim();
    if ((!textToSend && !isForceResolve) || loading) return;

    if (!forcedQuery) {
      setInput("");
      setInputHeight(36);
      setIsInputExpanded(false);
    }
    setShowMatrix(false);

    let activeId = currentSessionId;
    if (!activeId) {
      const newSession = createNewSession(
        textToSend.slice(0, 32) || "New Consultation",
        "full-chat",
      );
      activeId = newSession.id;
      setCurrentSessionId(activeId);
      setActiveSessionId(activeId);
      router.setParams({ id: activeId });
    }

    let updatedHistory = [...history];
    if (textToSend) {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: textToSend,
        timestamp: Date.now(),
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
        textToSend || "Please give me your final grounded counsel.",
        apiHistory,
        isForceResolve,
        activeId,
      );

      const finalHistory: ChatMessage[] = [
        ...updatedHistory,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: res.reply,
          stage: res.stage,
          sources: res.sources || [],
          searched_vector_db: res.searched_vector_db,
          timestamp: Date.now(),
        },
      ];

      updateSessionState(finalHistory, res.stage, activeId);
    } catch (err: any) {
      const isQuotaError =
        err?.quotaExceeded ||
        err?.status === 403 ||
        (err?.message && err.message.toLowerCase().includes("guest limit"));
      const errorContent = isQuotaError
        ? "⚡ **Free Guest Limit Reached (3 Messages)**\n\nYou have used all 3 free guest turns. Please sign in or create a free account to unlock unlimited Vedic consultations!"
        : err?.message ||
          "Unable to connect to Vedic counseling backend. Please verify your connection.";

      const fallback: ChatMessage[] = [
        ...updatedHistory,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: errorContent,
          stage: "resolved",
        },
      ];
      updateSessionState(fallback, "resolved", activeId);
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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Slide-out Navigation Drawer */}
      <VedicDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onSelectAction={(key) => {
          if (key === "contemplation")
            handleSend("Provide a daily Vedic reflection on karma and duty.");
          else if (key === "lineage")
            handleSend("Explain the lineage of Raghu and Kuru epics.");
          else if (key === "dharma")
            handleSend("How do I assess my moral duty in complex times?");
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
        {isSessionLoading ? (
          <View style={styles.sessionLoaderWrapper}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : history.length === 0 ? (
          <>
            {/* Section 1: Hero Header */}
            <View style={styles.heroSection}>
              <Text
                style={[
                  styles.displayTitle,
                  { color: theme.primary, fontFamily: serif },
                ]}
              >
                Epic Scholar Hub
              </Text>
              <Text
                style={[
                  styles.displaySubtitle,
                  { color: theme.secondary, fontFamily: body },
                ]}
              >
                Traverse the dual pillars of ancient wisdom. Delve into profound
                philosophical inquiries across the grand epics.
              </Text>
            </View>

            {/* Section 2: Vedic Filigree Divider */}
            <View style={styles.filigreeWrap}>
              <View
                style={[
                  styles.filigreeLine,
                  { backgroundColor: theme.outlineVariant },
                ]}
              />
              <View
                style={[styles.filigreeIconWrap, { backgroundColor: theme.bg }]}
              >
                <Text
                  style={[styles.filigreeIcon, { color: theme.outlineVariant }]}
                >
                  ✦
                </Text>
              </View>
              <View
                style={[
                  styles.filigreeLine,
                  { backgroundColor: theme.outlineVariant },
                ]}
              />
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
              <View
                style={[
                  styles.cornerBracket,
                  styles.cornerTL,
                  { borderColor: theme.outlineVariant },
                ]}
              />
              <View
                style={[
                  styles.cornerBracket,
                  styles.cornerTR,
                  { borderColor: theme.outlineVariant },
                ]}
              />
              <View
                style={[
                  styles.cornerBracket,
                  styles.cornerBL,
                  { borderColor: theme.outlineVariant },
                ]}
              />
              <View
                style={[
                  styles.cornerBracket,
                  styles.cornerBR,
                  { borderColor: theme.outlineVariant },
                ]}
              />

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
                <Text
                  style={[
                    styles.contrastTitle,
                    { color: theme.primary, fontFamily: serif },
                  ]}
                >
                  Principles vs Strategies
                </Text>
              </View>

              <View
                style={[
                  styles.contrastColumns,
                  isNarrow && { flexDirection: "column" },
                ]}
              >
                {/* Ramayana Column */}
                <View style={styles.epicColumn}>
                  <View style={styles.epicColTitleRow}>
                    <Text style={styles.epicColIcon}>📖</Text>
                    <Text
                      style={[
                        styles.epicColTitle,
                        { color: theme.text, fontFamily: serif },
                      ]}
                    >
                      The Ramayana
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.epicColDesc,
                      { color: theme.textSecondary, fontFamily: body },
                    ]}
                  >
                    Emphasizes absolute adherence to moral law (Dharma)
                    regardless of personal cost. It paints a world of clear
                    ideals, where victory is achieved through unwavering
                    righteousness.
                  </Text>
                  <View style={styles.bulletList}>
                    <Text
                      style={[
                        styles.bulletItem,
                        { color: theme.text, fontFamily: body },
                      ]}
                    >
                      ✓ Idealism and Devotion
                    </Text>
                    <Text
                      style={[
                        styles.bulletItem,
                        { color: theme.text, fontFamily: body },
                      ]}
                    >
                      ✓ Clear moral binaries & vows
                    </Text>
                  </View>
                </View>

                {/* Mahabharata Column */}
                <View
                  style={[
                    styles.epicColumn,
                    isNarrow
                      ? {
                          borderTopWidth: 1,
                          paddingTop: 16,
                          borderLeftWidth: 0,
                        }
                      : {
                          borderLeftWidth: 1,
                          borderTopWidth: 0,
                          paddingLeft: 16,
                        },
                    { borderColor: theme.outlineVariant },
                  ]}
                >
                  <View style={styles.epicColTitleRow}>
                    <Text style={styles.epicColIcon}>📜</Text>
                    <Text
                      style={[
                        styles.epicColTitle,
                        { color: theme.text, fontFamily: serif },
                      ]}
                    >
                      The Mahabharata
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.epicColDesc,
                      { color: theme.textSecondary, fontFamily: body },
                    ]}
                  >
                    Navigates the gray areas of morality, where Dharma is
                    contextual and survival often requires strategic pragmatism,
                    reflecting human complexities.
                  </Text>
                  <View style={styles.bulletList}>
                    <Text
                      style={[
                        styles.bulletItem,
                        { color: theme.text, fontFamily: body },
                      ]}
                    >
                      ✓ Pragmatism & Realpolitik
                    </Text>
                    <Text
                      style={[
                        styles.bulletItem,
                        { color: theme.text, fontFamily: body },
                      ]}
                    >
                      ✓ Nuanced moral ambiguities
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : (
          /* Section 6: Conversational Stream & Source Cards */
          <View style={styles.conversationStream}>
            {history.map((msg, index) => (
              <FadeSlide key={msg.id || index} delay={30} distance={10}>
                {msg.role === "assistant" ? (
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
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            flex: 1,
                          }}
                        >
                          <Text style={styles.scholarBadgeIcon}>🏛️</Text>
                          <Text
                            style={[
                              styles.scholarBadgeLabel,
                              {
                                color: theme.primaryContainer,
                                fontFamily: label,
                              },
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
                                  {
                                    color: theme.onSecondaryContainer,
                                    fontFamily: label,
                                  },
                                ]}
                              >
                                RAG Grounded
                              </Text>
                            </View>
                          )}
                        </View>

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Text
                            style={[
                              styles.bubbleTime,
                              { color: theme.secondary, fontFamily: label },
                            ]}
                          >
                            {formatLocalTime(msg.timestamp)}
                          </Text>
                          <TouchableOpacity
                            style={[
                              styles.copyBtn,
                              copiedMsgId === (msg.id || String(index)) && {
                                backgroundColor: theme.surfaceContainerLow,
                              },
                            ]}
                            onPress={() =>
                              handleCopyText(
                                msg.content,
                                msg.id || String(index),
                              )
                            }
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.copyIconText,
                                {
                                  color:
                                    copiedMsgId === (msg.id || String(index))
                                      ? "#10B981"
                                      : theme.secondary,
                                },
                              ]}
                            >
                              {copiedMsgId === (msg.id || String(index))
                                ? "✓ Copied"
                                : "📋"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <StreamingText
                        text={msg.content}
                        style={[
                          styles.scholarText,
                          { color: theme.text, fontFamily: serif },
                        ]}
                      />

                      {/* Source Citation Cards */}
                      {msg.sources && msg.sources.length > 0 && (
                        <SourceCard sources={msg.sources} />
                      )}

                      {/* Socratic Force Resolve CTA if in Interviewing stage */}
                      {msg.stage === "interviewing" && (() => {
                        const isLatestMessage = index === history.length - 1;
                        const isOlder = !isLatestMessage || loading;

                        return (
                          <TouchableOpacity
                            style={[
                              styles.forceResolveBtn,
                              {
                                backgroundColor: isOlder
                                  ? theme.surfaceContainerLow
                                  : theme.bgSecondary,
                                borderColor: isOlder
                                  ? theme.outlineVariant
                                  : theme.primaryContainer,
                                opacity: isOlder ? 0.45 : 1,
                              },
                            ]}
                            disabled={isOlder}
                            onPress={() => !isOlder && handleSend(undefined, true)}
                            activeOpacity={isOlder ? 1 : 0.7}
                          >
                            <Text
                              style={[
                                styles.forceResolveText,
                                {
                                  color: isOlder
                                    ? theme.textTertiary
                                    : theme.primaryContainer,
                                  fontFamily: label,
                                },
                              ]}
                            >
                              ⚡ Give Me Grounded Counsel Now (Skip Questions)
                            </Text>
                          </TouchableOpacity>
                        );
                      })()}
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
                    <View style={styles.bubbleFooter}>
                      <Text
                        style={[
                          styles.bubbleTime,
                          { color: theme.secondary, fontFamily: label },
                        ]}
                      >
                        {formatLocalTime(msg.timestamp)}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.copyBtn,
                          copiedMsgId === (msg.id || String(index)) && {
                            backgroundColor: theme.surfaceContainerLow,
                          },
                        ]}
                        onPress={() =>
                          handleCopyText(msg.content, msg.id || String(index))
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.copyIconText,
                            {
                              color:
                                copiedMsgId === (msg.id || String(index))
                                  ? "#10B981"
                                  : theme.secondary,
                            },
                          ]}
                        >
                          {copiedMsgId === (msg.id || String(index))
                            ? "✓ Copied"
                            : "📋"}
                        </Text>
                      </TouchableOpacity>
                    </View>
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

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Floating Bottom ChatGPT-style Input Box */}
      <View
        style={[
          styles.floatingInputWrapper,
          Platform.OS === "web"
            ? ({
                background: `linear-gradient(to top, ${theme.bg} 40%, ${theme.bg}BB 65%, ${theme.bg}00 100%)`,
              } as any)
            : { backgroundColor: "transparent" },
        ]}
      >
        <View
          style={[
            styles.chatgptInputCard,
            {
              backgroundColor: theme.surfaceContainerLowest,
              borderColor: theme.outlineVariant,
              shadowColor: theme.shadow,
            },
            isInputExpanded && { minHeight: 200 },
          ]}
        >
          {/* Top-Right Absolute Expand Button */}
          <TouchableOpacity
            style={styles.expandToggleBtn}
            onPress={() => setIsInputExpanded(!isInputExpanded)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={{ fontSize: 13, color: theme.secondary, opacity: 0.8 }}
            >
              {isInputExpanded ? "🗗" : "⛶"}
            </Text>
          </TouchableOpacity>

          {/* Multiline TextInput starting from top-left */}
          <TextInput
            style={[
              styles.chatgptTextInput,
              {
                color: theme.text,
                fontFamily: body,
                height: isInputExpanded
                  ? 180
                  : Math.min(
                      Math.max(34, input.trim() ? inputHeight : 34),
                      160,
                    ),
              },
              Platform.OS === "web" &&
                ({ resize: "none", overflowY: "auto" } as any),
            ]}
            placeholder="What's your dilemma today?"
            placeholderTextColor={theme.textTertiary}
            value={input}
            onChangeText={handleInputChange}
            multiline
            onContentSizeChange={(e) => {
              if (input.trim()) {
                setInputHeight(e.nativeEvent.contentSize.height);
              } else {
                setInputHeight(36);
              }
            }}
            onKeyPress={handleKeyDown}
          />

          {/* Bottom Bar: Aligned tools + Send Button */}
          <View style={styles.chatgptBottomBar}>
            <View style={{ flex: 1 }} />
            <View style={styles.bottomBarRight}>
              <View
                style={[
                  styles.modelBadgePill,
                  { backgroundColor: theme.bgSecondary },
                ]}
              >
                <Text
                  style={[
                    styles.modelBadgeText,
                    { color: theme.secondary, fontFamily: label },
                  ]}
                >
                  🏛️ Scholar
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.chatgptSendBtn,
                  input.trim().length > 0 && !loading
                    ? { backgroundColor: theme.primaryContainer }
                    : {
                        backgroundColor: theme.surfaceContainerLow,
                        opacity: 0.5,
                      },
                ]}
                onPress={() => {
                  if (!loading) handleSend();
                }}
                disabled={loading || !input.trim()}
                activeOpacity={loading ? 1 : 0.8}
              >
                <Text
                  style={[
                    styles.chatgptSendIcon,
                    {
                      color:
                        input.trim().length > 0 && !loading
                          ? theme.onPrimaryContainer
                          : theme.secondary,
                    },
                  ]}
                >
                  ↑
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 48 : 12,
    paddingBottom: 16,
  },
  floatingPillBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  floatingPillGroup: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
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
    alignSelf: "center",
    width: "100%",
  },
  sessionLoaderWrapper: {
    flex: 1,
    width: "100%",
    minHeight: 400,
    justifyContent: "center",
    alignItems: "center",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  displayTitle: {
    fontSize: Platform.OS === "web" ? 36 : 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  displaySubtitle: {
    fontSize: 15,
    textAlign: "center",
    maxWidth: 620,
    lineHeight: 23,
    marginBottom: 20,
  },
  searchBox: {
    width: "100%",
    maxWidth: 720,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
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
    paddingVertical: Platform.OS === "ios" ? 8 : 6,
  },
  seekBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  seekBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  filigreeWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
    width: "100%",
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
    fontWeight: "700",
    marginBottom: 14,
  },
  matrixGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  topicCard: {
    width: Platform.OS === "web" ? "48.5%" : "100%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "rgba(0,0,0,0.03)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },
  topicCardAccent: {
    height: 4,
    width: "100%",
  },
  topicCardInner: {
    padding: 16,
  },
  topicHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  topicIcon: {
    fontSize: 26,
  },
  topicArrow: {
    fontSize: 18,
    fontWeight: "700",
  },
  topicTitle: {
    fontSize: 19,
    fontWeight: "700",
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
    position: "relative",
    marginBottom: 24,
    shadowColor: "rgba(146,113,13,0.08)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 3,
  },
  cornerBracket: {
    position: "absolute",
    width: 14,
    height: 14,
    borderWidth: 1.5,
  },
  cornerTL: { top: 8, left: 8, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 8, right: 8, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 8, left: 8, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 8, right: 8, borderLeftWidth: 0, borderTopWidth: 0 },
  contrastHeader: {
    alignItems: "center",
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
    fontWeight: "700",
  },
  contrastColumns: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    gap: 16,
  },
  epicColumn: {
    flex: 1,
    paddingHorizontal: 6,
  },
  epicColumnRight: {
    borderLeftWidth: Platform.OS === "web" ? 1 : 0,
    borderTopWidth: Platform.OS === "web" ? 0 : 1,
    paddingTop: Platform.OS === "web" ? 0 : 16,
  },
  epicColTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  epicColIcon: {
    fontSize: 18,
  },
  epicColTitle: {
    fontSize: 18,
    fontWeight: "700",
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
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  streamTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  toggleMatrixText: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
  scholarCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    position: "relative",
    shadowColor: "rgba(0,0,0,0.04)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 2,
  },
  scholarAccentStripe: {
    position: "absolute",
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
    flexDirection: "row",
    alignItems: "center",
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
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  forceResolveText: {
    fontSize: 12,
  },
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "85%",
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
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 6,
  },
  bubbleTime: {
    fontSize: 10,
    opacity: 0.8,
  },
  copyBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  copyIconText: {
    fontSize: 11,
  },
  loaderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  loaderText: {
    fontSize: 13,
    fontStyle: "italic",
  },
  floatingInputWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    paddingTop: 24,
    alignItems: "center",
    zIndex: 50,
  },
  chatgptInputCard: {
    width: "100%",
    maxWidth: 760,
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    position: "relative",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  expandToggleBtn: {
    position: "absolute",
    top: 10,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  chatgptTextInput: {
    width: "100%",
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 2,
    paddingLeft: 2,
    paddingRight: 32,
    paddingBottom: 4,
    textAlignVertical: "top",
    ...(Platform.OS === "web" && {
      outlineStyle: "none" as any,
      userSelect: "text" as any,
      WebkitUserSelect: "text" as any,
    }),
  },
  chatgptBottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 4,
  },
  bottomBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modelBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modelBadgeText: {
    fontSize: 11,
  },
  chatgptSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chatgptSendIcon: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  newChatBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
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
});
