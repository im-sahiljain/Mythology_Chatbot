import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
  TouchableOpacity,
  Pressable as RNPressable,
  useWindowDimensions,
  ActivityIndicator,
  Keyboard,
  Animated as RNAnimated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Carousel, type CarouselRef } from "react-native-reanimated-carousel";
import { apiService, SourceCitation } from "../../src/services/api";
import { StreamingText } from "../../src/components/StreamingText";
import { SourceCard } from "../../src/components/SourceCard";
import { useTheme } from "../../src/context/ThemeContext";
import { FadeSlide, TypingDots } from "../../src/components/AnimatedComponents";
import { VedicDrawer } from "../../src/components/VedicDrawer";
import { VedicTopBar } from "../../src/components/VedicTopBar";
import { getLocalizedCharacter } from "../../src/i18n/characterTranslations";
import { useCharacters } from "../../src/context/CharacterContext";
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

import {
  GUIDE_CHARACTERS,
  GuideCard,
  CATEGORIES,
  CategoryDef,
} from "../../src/data/characters";

export { GuideCard, GUIDE_CHARACTERS };

// ─── Chat Types ────────────────────────────────────────────────

interface ChatMsg {
  id?: string;
  role: "user" | "assistant";
  content: string;
  stage?: "interviewing" | "resolved" | "follow_up";
  sources?: SourceCitation[];
  timestamp?: string | number;
}

// ─── Main Screen ───────────────────────────────────────────────

export default function PersonaScreen() {
  const insets = useSafeAreaInsets();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { markInteractive } = useObserve();
  const { t, i18n } = useTranslation();
  const { characters: ALL_CHARACTERS, loading: charactersLoading } =
    useCharacters();

  const safeTopPadding =
    Math.max(insets.top, Platform.OS === "ios" ? 44 : 16) + 68;
  const safeBottomPadding =
    Math.max(insets.bottom, 12) + (Platform.OS === "web" ? 8 : 4);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardAnim = useRef(new RNAnimated.Value(0)).current;

  const animatedBottom = keyboardAnim.interpolate({
    inputRange: [0, 50, 600],
    outputRange: [0, 64, 614],
  });

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const vv = window.visualViewport;
      if (vv) {
        const update = () => {
          const occluded = Math.max(
            0,
            window.innerHeight - vv.height - vv.offsetTop,
          );
          setKeyboardHeight(occluded);
          RNAnimated.timing(keyboardAnim, {
            toValue: occluded,
            duration: 150,
            useNativeDriver: false,
          }).start();
        };

        vv.addEventListener("resize", update);
        vv.addEventListener("scroll", update);
        update();
        return () => {
          vv.removeEventListener("resize", update);
          vv.removeEventListener("scroll", update);
        };
      }
    }

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const targetHeight = e.endCoordinates.height;
      setKeyboardHeight(targetHeight);
      RNAnimated.timing(keyboardAnim, {
        toValue: targetHeight,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      setKeyboardHeight(0);
      RNAnimated.timing(keyboardAnim, {
        toValue: 0,
        duration: e?.duration || 200,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    markInteractive();
  }, [markInteractive]);

  const [selectedGuide, setSelectedGuide] = useState<GuideCard | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [isSessionLoading, setIsSessionLoading] = useState(!!params.id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [hasStartedConsultation, setHasStartedConsultation] = useState(false);
  const [currentStage, setCurrentStage] = useState<
    "interviewing" | "resolved" | "follow_up"
  >("interviewing");
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showMentionDropup, setShowMentionDropup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [inputHeight, setInputHeight] = useState(36);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  useEffect(() => {
    if (!selectedGuide && ALL_CHARACTERS.length > 0) {
      setSelectedGuide(ALL_CHARACTERS[0]);
    }
  }, [ALL_CHARACTERS, selectedGuide]);

  const filteredMentionCharacters = ALL_CHARACTERS.filter(
    (c) =>
      c.name.toLowerCase().includes(mentionQuery) ||
      c.role.toLowerCase().includes(mentionQuery),
  );

  const getEpicName = (epicStr?: string) => {
    if (!epicStr) return t("scripture.allEpics", "Epic");
    const lower = epicStr.toLowerCase();
    if (lower.includes("mahabharata"))
      return t("epics.mahabharata", "Mahabharata");
    if (lower.includes("ramayana")) return t("epics.ramayana", "Ramayana");
    return epicStr;
  };

  const getCategoryLabel = (labelKey: string) => {
    const key = labelKey.toLowerCase();
    switch (key) {
      case "all":
        return t("categories.all", "All");
      case "ramayana":
        return t("categories.ramayana", "Ramayana");
      case "mahabharata":
        return t("categories.mahabharata", "Mahabharata");
      case "heroes":
        return t("categories.heroes", "Heroes");
      case "queens":
        return t("categories.queens", "Queens");
      case "sages":
        return t("categories.sages", "Sages");
      case "warriors":
        return t("categories.warriors", "Warriors");
      default:
        return labelKey;
    }
  };

  const handleKeyDown = (e: any) => {
    if (Platform.OS === "web") {
      if (showMentionDropup && filteredMentionCharacters.length > 0) {
        if (e.nativeEvent.key === "ArrowDown") {
          e.preventDefault();
          setMentionSelectedIndex(
            (prev) => (prev + 1) % filteredMentionCharacters.length,
          );
          return;
        }
        if (e.nativeEvent.key === "ArrowUp") {
          e.preventDefault();
          setMentionSelectedIndex(
            (prev) =>
              (prev - 1 + filteredMentionCharacters.length) %
              filteredMentionCharacters.length,
          );
          return;
        }
        if (e.nativeEvent.key === "Enter" || e.nativeEvent.key === "Tab") {
          e.preventDefault();
          const targetChar =
            filteredMentionCharacters[mentionSelectedIndex] ||
            filteredMentionCharacters[0];
          if (targetChar) {
            handleSelectMentionCharacter(targetChar);
          }
          return;
        }
        if (e.nativeEvent.key === "Escape") {
          e.preventDefault();
          setShowMentionDropup(false);
          return;
        }
      }

      if (e.nativeEvent.key === "Enter" && !e.nativeEvent.shiftKey) {
        e.preventDefault();
        if (!loading) {
          sendQuery();
        }
      }
    }
  };

  const handleCopyText = async (text: string, id: string) => {
    try {
      await Clipboard.setStringAsync(text);
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
  const inputRef = useRef<TextInput>(null);
  const consultationInputRef = useRef<TextInput>(null);
  const heroMentionScrollRef = useRef<ScrollView>(null);
  const consultationMentionScrollRef = useRef<ScrollView>(null);

  // Auto-scroll mention list when navigating with arrow keys
  useEffect(() => {
    if (showMentionDropup) {
      const ITEM_HEIGHT = 56;
      const targetY = Math.max(0, (mentionSelectedIndex - 2) * ITEM_HEIGHT);
      heroMentionScrollRef.current?.scrollTo({ y: targetY, animated: true });
      consultationMentionScrollRef.current?.scrollTo({
        y: targetY,
        animated: true,
      });
    }
  }, [mentionSelectedIndex, showMentionDropup]);

  // Responsive dimensions
  const isMobile = screenWidth < 768;
  const containerWidth = isMobile ? screenWidth : Math.min(screenWidth, 900);
  const CARD_WIDTH = isMobile ? Math.round(screenWidth * 0.62) : 280;
  const CARD_HEIGHT = isMobile
    ? Math.min(340, Math.round(screenHeight * 0.4))
    : 360;

  const carouselRef = useRef<CarouselRef>(null);

  // Filter characters by active category
  const filteredCharacters = ALL_CHARACTERS.filter(
    CATEGORIES[activeCategory].filter,
  );

  // Animated values for the about section
  const aboutOpacity = useSharedValue(1);
  const aboutTranslateY = useSharedValue(0);

  const aboutAnimatedStyle = useAnimatedStyle(() => ({
    opacity: aboutOpacity.value,
    transform: [{ translateY: aboutTranslateY.value }],
  }));

  const handleSnapToItem = useCallback(
    (index: number) => {
      const validIndex = Math.max(
        0,
        Math.min(index, filteredCharacters.length - 1),
      );
      setActiveIndex(validIndex);
      if (filteredCharacters[validIndex]) {
        aboutOpacity.value = withTiming(0, { duration: 100 }, () => {
          aboutOpacity.value = withTiming(1, { duration: 180 });
        });
        aboutTranslateY.value = withTiming(-4, { duration: 100 }, () => {
          aboutTranslateY.value = withSpring(0, {
            damping: 14,
            stiffness: 120,
          });
        });
        setSelectedGuide(filteredCharacters[validIndex]);
      }
    },
    [filteredCharacters, aboutOpacity, aboutTranslateY],
  );

  // Handle typing inside input box
  const handleInputChange = (text: string) => {
    setInput(text);
    if (!text.trim()) {
      setInputHeight(36);
      setIsInputExpanded(false);
    }
  };

  // Select 1 character from @ mention dropup and start consultation immediately
  const handleSelectMentionCharacter = (character: GuideCard) => {
    // Extract any existing query text user had typed
    let queryText = "";
    const lastAtIndex = input.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      queryText = input.slice(0, lastAtIndex).trim();
    } else {
      queryText = input.trim();
    }

    setInput("");
    setShowMentionDropup(false);
    setMentionQuery("");
    setMentionSelectedIndex(0);

    // Start consultation immediately with selected character
    handleSelectGuideAndStart(character, queryText);
  };

  const toggleMentionDropup = () => {
    if (showMentionDropup) {
      setShowMentionDropup(false);
      setMentionQuery("");
    } else {
      setShowMentionDropup(true);
      setMentionQuery("");
      if (!input.includes("@")) {
        setInput((prev) => (prev ? `${prev} @` : "@"));
      }
      setTimeout(() => {
        inputRef.current?.focus();
        consultationInputRef.current?.focus();
      }, 50);
    }
  };

  // Reset carousel when category changes
  useEffect(() => {
    setActiveIndex(0);
    if (filteredCharacters.length > 0) {
      setSelectedGuide(filteredCharacters[0]);
    }
    carouselRef.current?.scrollTo({ index: 0, animated: false });
  }, [activeCategory]);

  // ─── Session Restore Logic (identical to original) ──────────

  useEffect(() => {
    const syncSession = async () => {
      if (!params.id) {
        setIsSessionLoading(false);
        setSessionId("");
        setActiveSessionId(null);
        setHasStartedConsultation(false);
        setCurrentStage("interviewing");
        setHistory([]);
        return;
      }

      setSessionId(params.id as string);
      const all = loadAllSessions();
      const active = all.find(
        (s) => s.id === params.id && s.mode === "persona",
      );

      if (
        active &&
        active.character &&
        active.history &&
        active.history.length > 0
      ) {
        if (active.stage) setCurrentStage(active.stage as any);
        const matchedGuide = ALL_CHARACTERS.find(
          (g) => g.name.toLowerCase() === active.character?.toLowerCase(),
        );
        if (matchedGuide) setSelectedGuide(matchedGuide);
        setHistory(
          active.history.map((h) => ({
            role: h.role,
            content: h.content,
            stage: (h as any).stage || active.stage || "resolved",
            sources: h.sources,
          })),
        );
        setHasStartedConsultation(true);
        setIsSessionLoading(false);
      } else {
        setHistory([]);
        setIsSessionLoading(true);
        try {
          const msgs = await fetchSessionDetailFromDb(params.id as string);
          if (msgs && msgs.length > 0) {
            const foundSession = all.find((s) => s.id === params.id);
            const charName =
              foundSession?.character ||
              (msgs[1] as any)?.character ||
              "Krishna";
            const matchedGuide = ALL_CHARACTERS.find(
              (g) => g.name.toLowerCase() === charName.toLowerCase(),
            );
            if (matchedGuide) setSelectedGuide(matchedGuide);
            setHistory(
              msgs.map((h) => ({
                role: h.role,
                content: h.content,
                stage: (h as any).stage || "resolved",
                sources: h.sources,
              })),
            );
            setHasStartedConsultation(true);
          }
        } finally {
          setIsSessionLoading(false);
        }
      }
    };

    syncSession();
    const unsubscribe = subscribeToSessions((all, activeId) => {
      if (!params.id) return;
      const active = all.find(
        (s) => s.id === params.id && s.mode === "persona",
      );
      if (
        active &&
        active.character &&
        active.history &&
        active.history.length > 0
      ) {
        setSessionId(active.id);
        if (active.stage) setCurrentStage(active.stage as any);
        const matchedGuide = ALL_CHARACTERS.find(
          (g) => g.name.toLowerCase() === active.character?.toLowerCase(),
        );
        if (matchedGuide) setSelectedGuide(matchedGuide);
        setHistory(
          active.history.map((h) => ({
            role: h.role,
            content: h.content,
            stage: (h as any).stage || active.stage || "resolved",
            sources: h.sources,
          })),
        );
        setHasStartedConsultation(true);
        setIsSessionLoading(false);
      }
    });

    return unsubscribe;
  }, [params.id]);

  // ─── Session Save ───────────────────────────────────────────

  const savePersonaSession = (
    msgs: ChatMsg[],
    stage: "interviewing" | "resolved" | "follow_up" = "interviewing",
    overrideId?: string,
    overrideChar?: string,
  ) => {
    let currentId = overrideId || sessionId;
    if (!currentId) {
      currentId = Date.now().toString();
      setSessionId(currentId);
    }
    const charName = overrideChar || selectedGuide!.name;
    const firstUserMsg = msgs.find((m) => m.role === "user");
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
      mode: "persona",
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

  // ─── Start Consultation ─────────────────────────────────────

  const handleSelectGuideAndStart = (guide: GuideCard, queryText?: string) => {
    setSelectedGuide(guide);
    const newSession = createNewSession(
      `${guide.name} Counsel`,
      "persona",
      guide.name,
    );
    setSessionId(newSession.id);
    setActiveSessionId(newSession.id);
    setCurrentStage("interviewing");
    setHasStartedConsultation(true);
    const initialMsgs: ChatMsg[] = [
      { role: "assistant", content: guide.quote, stage: "interviewing" },
    ];
    setHistory(initialMsgs);
    router.setParams({ id: newSession.id });
    savePersonaSession(initialMsgs, "interviewing", newSession.id, guide.name);

    if (queryText && queryText.trim()) {
      setTimeout(() => {
        sendQuery(
          queryText.trim(),
          false,
          initialMsgs,
          newSession.id,
          guide.name,
        );
      }, 60);
    }
  };

  // ─── Send Query ─────────────────────────────────────────────

  const sendQuery = async (
    queryText?: string,
    isForceResolve: boolean = false,
    customHistory?: ChatMsg[],
    customSessionId?: string,
    customGuideName?: string,
  ) => {
    const textToSend = (queryText || input).trim();
    if ((!textToSend && !isForceResolve) || loading) return;

    if (!queryText) {
      setInput("");
      setInputHeight(36);
      setIsInputExpanded(false);
    }
    setHasStartedConsultation(true);

    const baseHistory = customHistory || history;
    const activeCharName = customGuideName || selectedGuide!.name;
    const activeSession = customSessionId || sessionId;

    let nextHistory = [...baseHistory];
    if (textToSend) {
      nextHistory.push({
        id: Date.now().toString(),
        role: "user",
        content: textToSend,
        timestamp: Date.now(),
      });
    }
    setHistory(nextHistory);
    setLoading(true);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Prior turns for API history (excluding current user message which is sent as message)
      const apiHistory = baseHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await apiService.characterChat(
        textToSend ||
          "Please deliver your final grounded counsel from your life lessons.",
        activeCharName,
        apiHistory,
        isForceResolve,
        activeSession,
      );

      const respStage = res.stage || "resolved";
      setCurrentStage(respStage);

      const finalHistory: ChatMsg[] = [
        ...nextHistory,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: res.reply,
          stage: respStage,
          sources: res.sources || [],
          timestamp: Date.now(),
        },
      ];
      setHistory(finalHistory);
      savePersonaSession(
        finalHistory,
        respStage,
        activeSession,
        activeCharName,
      );
    } catch (err) {
      console.error("Character chat error:", err);
      const fallbackHistory: ChatMsg[] = [
        ...nextHistory,
        {
          role: "assistant",
          content: `Even in turbulent times, seek stillness. I am reflecting upon your query on ${textToSend}.`,
          stage: "resolved",
        },
      ];
      setHistory(fallbackHistory);
      savePersonaSession(
        fallbackHistory,
        "resolved",
        activeSession,
        activeCharName,
      );
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  // ─── JSX ────────────────────────────────────────────────────

  if (charactersLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.sessionLoaderWrapper,
          { backgroundColor: theme.bg },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primaryContainer} />
      </View>
    );
  }

  if (!selectedGuide || !ALL_CHARACTERS.length) {
    return (
      <View
        style={[
          styles.container,
          styles.sessionLoaderWrapper,
          { backgroundColor: theme.bg },
        ]}
      >
        <Text style={{ color: theme.textSecondary, fontFamily: body }}>
          No characters are available.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <VedicDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onSelectAction={(action) => {
          if (action === "dharma")
            sendQuery("How do I assess my moral duty in this conflict?");
          else if (action === "contemplation")
            sendQuery("Give me a morning Vedic reflection for clarity.");
        }}
      />

      <VedicTopBar onOpenDrawer={() => setDrawerVisible(true)} />

      {/* ═══ Section 1: Hero Character Selection Deck (Fixed, Non-Scrolling) ═══ */}
      {isSessionLoading ? (
        <View style={styles.sessionLoaderWrapper}>
          <ActivityIndicator size="large" color={theme.primaryContainer} />
        </View>
      ) : !hasStartedConsultation ? (
        <View
          style={[
            styles.heroFullContainer,
            { paddingTop: safeTopPadding + 24 },
          ]}
        >
          {/* Top Header & About Box */}
          <View style={styles.heroTopContent}>
            <View style={styles.heroHeader}>
              <Text
                style={[
                  styles.heroTitle,
                  { color: theme.primaryContainer, fontFamily: serif },
                ]}
              >
                {t("personaScreen.title", "Speak with Legends")}
              </Text>
              <Text
                style={[
                  styles.heroSubtitle,
                  { color: theme.secondary, fontFamily: body },
                ]}
              >
                {t(
                  "personaScreen.subtitle",
                  "Seek timeless wisdom from epic heroes, queens & sages",
                )}
              </Text>
            </View>

            {/* About Character Section (Animated on Swipe) */}
            {(() => {
              const localizedGuide = getLocalizedCharacter(
                selectedGuide,
                i18n.language,
              );
              return (
                <Animated.View
                  style={[
                    styles.aboutSection,
                    {
                      backgroundColor: theme.surfaceContainerLowest,
                      borderColor: theme.outlineVariant,
                    },
                    aboutAnimatedStyle,
                  ]}
                >
                  <View style={styles.aboutTopRow}>
                    <Text style={[styles.aboutIcon]}>{selectedGuide.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.aboutName,
                          { color: theme.primary, fontFamily: serif },
                        ]}
                      >
                        {localizedGuide.name}
                      </Text>
                      <Text
                        style={[
                          styles.aboutRole,
                          { color: theme.secondary, fontFamily: label },
                        ]}
                      >
                        {localizedGuide.role}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.epicTag,
                        {
                          backgroundColor: theme.isDark
                            ? "rgba(234,194,92,0.15)"
                            : "rgba(146,113,13,0.1)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.epicTagText,
                          { color: theme.primaryContainer, fontFamily: label },
                        ]}
                      >
                        {getEpicName(selectedGuide.epic)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.aboutQuote,
                      { color: theme.textSecondary, fontFamily: body },
                    ]}
                    numberOfLines={2}
                  >
                    {localizedGuide.quote}
                  </Text>
                </Animated.View>
              );
            })()}
          </View>

          {/* ═══ Center 3D Floating Carousel: Parallax Centered Active Card ═══ */}
          <View style={[styles.carouselSection, { height: CARD_HEIGHT + 30 }]}>
            {/* Desktop Navigation Chevrons */}
            {!isMobile && filteredCharacters.length > 1 && (
              <>
                <TouchableOpacity
                  style={[
                    styles.desktopChevron,
                    styles.desktopChevronLeft,
                    {
                      backgroundColor: theme.surfaceContainerLowest,
                      borderColor: theme.outlineVariant,
                      shadowColor: theme.shadow,
                    },
                  ]}
                  onPress={() => carouselRef.current?.prev()}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.desktopChevronText,
                      { color: theme.primary },
                    ]}
                  >
                    ‹
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.desktopChevron,
                    styles.desktopChevronRight,
                    {
                      backgroundColor: theme.surfaceContainerLowest,
                      borderColor: theme.outlineVariant,
                      shadowColor: theme.shadow,
                    },
                  ]}
                  onPress={() => carouselRef.current?.next()}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.desktopChevronText,
                      { color: theme.primary },
                    ]}
                  >
                    ›
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <Carousel
              ref={carouselRef}
              loop={filteredCharacters.length > 3}
              itemSize={CARD_WIDTH}
              style={{
                width: containerWidth,
                height: CARD_HEIGHT + 30,
                justifyContent: "center",
                alignItems: "center",
                overflow: "visible",
              }}
              contentContainerStyle={{
                width: CARD_WIDTH,
                overflow: "visible",
              }}
              data={filteredCharacters}
              renderItem={({ item, index, relativeProgress }) => (
                <FloatingCard
                  item={item}
                  index={index}
                  relativeProgress={relativeProgress}
                  cardWidth={CARD_WIDTH}
                  cardHeight={CARD_HEIGHT}
                  theme={theme}
                  onSelect={handleSelectGuideAndStart}
                />
              )}
              layout={{
                type: "parallax",
                scale: 1,
                adjacentScale: isMobile ? 0.74 : 0.78,
                offset: isMobile ? 32 : 45,
              }}
              animation={{ type: "timing", duration: 350 }}
              onSnapToItem={handleSnapToItem}
            />
          </View>

          {/* Bottom Fixed Area: Category Filter Pills (Per Figma) */}
          <View
            style={[
              styles.heroBottomControls,
              { paddingBottom: safeBottomPadding },
            ]}
          >
            {/* Category Filter Pills (Horizontal Scroll at bottom) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPillRow}
            >
              {CATEGORIES.map((cat, idx) => {
                const isActive = idx === activeCategory;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    onPress={() => setActiveCategory(idx)}
                    activeOpacity={0.7}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: isActive
                          ? theme.primaryContainer
                          : theme.surfaceContainerHigh,
                        borderColor: isActive
                          ? theme.primaryContainer
                          : theme.outlineVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        {
                          color: isActive
                            ? theme.onPrimaryContainer
                            : theme.textSecondary,
                          fontFamily: label,
                        },
                      ]}
                    >
                      {cat.icon} {getCategoryLabel(cat.label)}
                      {idx === 0 ? ` (${ALL_CHARACTERS.length})` : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      ) : (
        /* ═══ Section 2: Live Consultation Stream ═══ */
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.scrollArea}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: safeTopPadding },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.dialogueSection}>
              <View style={styles.dialogueHeader}>
                <Text
                  style={[
                    styles.dialogueTitle,
                    { color: theme.primary, fontFamily: serif },
                  ]}
                >
                  {t("personaScreen.dialogueWith", {
                    name: getLocalizedCharacter(selectedGuide, i18n.language)
                      .name,
                    defaultValue: `Dialogue with ${getLocalizedCharacter(selectedGuide, i18n.language).name}`,
                  })}
                </Text>
              </View>

              {history.map((msg, index) => (
                <FadeSlide key={index} delay={30} distance={10}>
                  {msg.role === "assistant" ? (
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
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                              flex: 1,
                            }}
                          >
                            <Text style={styles.aiAvatarIcon}>
                              {selectedGuide.icon}
                            </Text>
                            <Text
                              style={[
                                styles.aiSenderName,
                                {
                                  color: theme.primaryContainer,
                                  fontFamily: label,
                                },
                              ]}
                            >
                              {selectedGuide.name.toUpperCase()}
                            </Text>
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
                            styles.aiText,
                            { color: theme.text, fontFamily: serif },
                          ]}
                        />
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
                              ? t("common.copied", "✓ Copied")
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
                      {t(
                        "personaScreen.thinking",
                        "Contemplating your dilemma...",
                      )}
                    </Text>
                  </View>
                </FadeSlide>
              )}
            </View>

            <View style={{ height: 130 + insets.bottom }} />
          </ScrollView>

          {/* Floating Bottom Input Pill for Consultation */}
          <RNAnimated.View
            style={[
              styles.floatingInputWrapper,
              {
                paddingBottom:
                  keyboardHeight > 0
                    ? Platform.OS === "ios"
                      ? 8
                      : 4
                    : safeBottomPadding,
                bottom: animatedBottom,
              },
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

              {/* Multiline TextInput */}
              <TextInput
                ref={consultationInputRef}
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
                placeholder={t("personaScreen.placeholder", {
                  name: getLocalizedCharacter(selectedGuide, i18n.language)
                    .name,
                  defaultValue: `Seek guidance from ${getLocalizedCharacter(selectedGuide, i18n.language).name}...`,
                })}
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

              {/* Bottom Bar: @ mention trigger, Guide Name Pill + Send Button */}
              <View style={styles.chatgptBottomBar}>
                <View style={styles.bottomBarLeft}>


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
                      {selectedGuide.icon}{" "}
                      {getLocalizedCharacter(selectedGuide, i18n.language).name}
                    </Text>
                  </View>
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
                    if (!loading) sendQuery();
                  }}
                  disabled={loading || !input.trim()}
                  activeOpacity={loading ? 1 : 0.8}
                >
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={
                      input.trim().length > 0 && !loading
                        ? theme.onPrimaryContainer
                        : theme.secondary
                    }
                    style={styles.chatgptSendIcon}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </RNAnimated.View>
        </>
      )}
    </View>
  );
}

// ═══ Floating Card Component (with Reanimated Parallax Elevation) ═══

interface FloatingCardProps {
  item: GuideCard;
  index: number;
  relativeProgress: SharedValue<number>;
  cardWidth: number;
  cardHeight: number;
  theme: any;
  onSelect: (guide: GuideCard) => void;
}

function FloatingCard({
  item,
  index,
  relativeProgress,
  cardWidth,
  cardHeight,
  theme,
  onSelect,
}: FloatingCardProps) {
  const { t, i18n } = useTranslation();
  const locItem = getLocalizedCharacter(item, i18n.language);
  const animatedCardStyle = useAnimatedStyle(() => {
    // translateY: 0 at center (relativeProgress = 0), and 34px lower at sides (-1 and 1)
    const translateY = interpolate(
      relativeProgress.value,
      [-1, 0, 1],
      [34, 0, 34],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      relativeProgress.value,
      [-1, -0.4, 0, 0.4, 1],
      [0.45, 0.7, 1.0, 0.7, 0.45],
      Extrapolation.CLAMP,
    );

    const rotateZ = interpolate(
      relativeProgress.value,
      [-1, 0, 1],
      [-2.5, 0, 2.5],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ translateY }, { rotateZ: `${rotateZ}deg` }],
      opacity,
    };
  }, [relativeProgress]);

  const glowStyle = useAnimatedStyle(() => {
    const glowOpacity = interpolate(
      relativeProgress.value,
      [-0.4, 0, 0.4],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity: glowOpacity,
    };
  }, [relativeProgress]);

  return (
    <Animated.View
      style={[
        {
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
        },
        animatedCardStyle,
      ]}
    >
      <View
        style={[
          styles.floatingCard,
          {
            width: "100%",
            height: "100%",
            backgroundColor: theme.surfaceContainerLowest,
            borderColor: theme.isDark ? "rgba(234,194,92,0.3)" : "#C4B499",
            shadowColor: theme.shadow,
          },
        ]}
      >
        {/* Glow halo on center item */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: 22,
              borderWidth: 2,
              borderColor: theme.primary,
              shadowColor: theme.primary,
              shadowRadius: 18,
              shadowOpacity: 0.35,
            },
            glowStyle,
          ]}
        />

        {/* Portrait Image */}
        <View style={styles.cardImageWrapper}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cardPortrait}
            resizeMode="cover"
          />
          <View style={styles.cardImageOverlay} />
          <View style={styles.cardEpicPill}>
            <Text style={[styles.cardEpicPillText, { fontFamily: label }]}>
              {item.icon}{" "}
              {item.epic?.toLowerCase().includes("mahabharata")
                ? t("epics.mahabharata", "Mahabharata")
                : item.epic?.toLowerCase().includes("ramayana")
                  ? t("epics.ramayana", "Ramayana")
                  : item.epic}
            </Text>
          </View>
        </View>

        {/* Card Body */}
        <View
          style={[
            styles.cardBodyContent,
            { borderTopColor: theme.outlineVariant },
          ]}
        >
          <Text
            style={[
              styles.cardCharName,
              { color: theme.primary, fontFamily: serif },
            ]}
            numberOfLines={1}
          >
            {locItem.name}
          </Text>
          <Text
            style={[
              styles.cardCharRole,
              { color: theme.secondary, fontFamily: body },
            ]}
            numberOfLines={1}
          >
            {locItem.role}
          </Text>
          <Text
            style={[
              styles.cardCharSubtitle,
              { color: theme.textTertiary, fontFamily: body },
            ]}
            numberOfLines={1}
          >
            {locItem.subtitle}
          </Text>

          {/* Consultation Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onSelect(item)}
            style={[
              styles.cardSelectBtn,
              {
                backgroundColor: theme.isDark
                  ? "rgba(234,194,92,0.18)"
                  : "rgba(146,113,13,0.12)",
                borderColor: theme.primaryContainer,
              },
            ]}
          >
            <Text
              style={[
                styles.cardSelectBtnText,
                {
                  color: theme.primaryContainer,
                  fontFamily: label,
                },
              ]}
            >
              {t("personaScreen.consultBtn", {
                name: locItem.name,
                defaultValue: `Consult ${locItem.name} →`,
              })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// ═══ Styles ════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroFullContainer: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 70 : 66,
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    overflow: "hidden",
  },
  sessionLoaderWrapper: {
    flex: 1,
    width: "100%",
    minHeight: 400,
    justifyContent: "center",
    alignItems: "center",
  },
  heroTopContent: {
    paddingHorizontal: 16,
    width: "100%",
  },
  heroBottomControls: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
    width: "100%",
    alignItems: "center",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 72,
    paddingHorizontal: 16,
    maxWidth: 900,
    alignSelf: "center",
    width: "100%",
  },

  // ── Hero Section ──
  heroHeader: {
    alignItems: "center",
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    marginTop: 2,
    textAlign: "center",
  },

  // ── Category Pills ──
  categoryPillRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  categoryPill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
  },

  // ── About Section ──
  aboutSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 4,
  },
  aboutTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  aboutIcon: {
    fontSize: 24,
  },
  aboutName: {
    fontSize: 20,
    fontWeight: "700",
  },
  aboutRole: {
    fontSize: 11,
    marginTop: 1,
  },
  aboutQuote: {
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: "italic",
  },
  epicTag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  epicTagText: {
    fontSize: 10,
    fontWeight: "600",
  },

  // ── Carousel ──
  carouselSection: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  desktopChevron: {
    position: "absolute",
    top: "40%",
    zIndex: 40,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  desktopChevronLeft: {
    left: Platform.OS === "web" ? 16 : 4,
  },
  desktopChevronRight: {
    right: Platform.OS === "web" ? 16 : 4,
  },
  desktopChevronText: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 26,
  },

  // ── Floating Card ──
  floatingCard: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 2,
    zIndex: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 0,
    pointerEvents: "none",
  },
  cardImageWrapper: {
    height: "52%",
    width: "100%",
    position: "relative",
    backgroundColor: "#1E1E24",
  },
  cardPortrait: {
    width: "100%",
    height: "100%",
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  cardEpicPill: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  cardEpicPillText: {
    color: "#FFF",
    fontSize: 10,
  },
  cardBodyContent: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
  },
  cardCharName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardCharRole: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  cardCharSubtitle: {
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },
  cardSelectBtn: {
    width: "100%",
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  cardSelectBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Dots ──
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 8,
    flexWrap: "wrap",
    paddingHorizontal: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  // ── Dialogue Section ──
  dialogueSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  dialogueHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dialogueTitle: {
    fontSize: 19,
    fontWeight: "700",
  },
  aiMessageCard: {
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
  aiAccentStripe: {
    position: "absolute",
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
    flexDirection: "row",
    alignItems: "center",
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
    alignSelf: "flex-end",
    maxWidth: "85%",
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
  loadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 13,
    fontStyle: "italic",
  },

  // ── Floating Input ──
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
  bottomBarLeft: {
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

  // ── Mention Dropup ──
  mentionDropupCard: {
    position: "absolute",
    bottom: 64,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    zIndex: 100,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    maxWidth: 700,
    alignSelf: "center",
    width: "100%",
  },
  dropupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  dropupHeaderTitle: {
    fontSize: 11,
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  dropupRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
    borderBottomWidth: 0.5,
  },
  dropupName: {
    fontSize: 15,
    fontWeight: "700",
  },
  dropupEpicPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  dropupEpicText: {
    fontSize: 9,
    fontWeight: "600",
  },
  dropupRole: {
    fontSize: 11,
    marginTop: 1,
  },
  atMentionTriggerBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  atMentionTriggerText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
  },
});
