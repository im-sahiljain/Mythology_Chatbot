import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from "react-native";
import { useRouter, usePathname, useGlobalSearchParams } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import {
  loadAllSessions,
  getActiveSessionId,
  setActiveSessionId,
  createNewSession,
  deleteSession,
  subscribeToSessions,
  syncUserSessionsFromDb,
  clearAllLocalSessions,
  getModeBadgeInfo,
  ChatSession,
} from "../services/chatStorage";
import { apiService } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../services/supabase";

const serif =
  Platform.OS === "web"
    ? "'EB Garamond', Georgia, serif"
    : "EBGaramond_700Bold";
const label =
  Platform.OS === "web"
    ? "'Hanken Grotesk', sans-serif"
    : "HankenGrotesk_700Bold";
const body =
  Platform.OS === "web"
    ? "'Hanken Grotesk', sans-serif"
    : "HankenGrotesk_400Regular";

export interface NavTabItem {
  id: string;
  route: string;
  title: string;
  subtitle: string;
  icon: string;
  tag?: string;
}

export const APP_NAVIGATION_TABS: NavTabItem[] = [
  {
    id: "full-chat",
    route: "/(tabs)/full-chat",
    title: "Full Interactive Chat",
    subtitle: "Topic matrix & deep comparison",
    icon: "🏛️",
    tag: "Universal",
  },
  {
    id: "persona",
    route: "/(tabs)/persona",
    title: "Speak with Legends",
    subtitle: "1st-person avatar consultation",
    icon: "👑",
    tag: "Avatar",
  },
  {
    id: "roundtable",
    route: "/(tabs)/roundtable",
    title: "Vedic Roundtable",
    subtitle: "Multi-legend council debate",
    icon: "🪷",
    tag: "Council",
  },
];

interface VedicDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction?: (actionKey: string) => void;
}

const DRAWER_WIDTH = 320;

export const VedicDrawer: React.FC<VedicDrawerProps> = ({
  visible,
  onClose,
  onSelectAction,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams<{ id?: string }>();
  const currentChatId = globalParams?.id || null;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveId] = useState<string | null>(null);
  const [newChatPickerVisible, setNewChatPickerVisible] = useState(false);

  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Load and subscribe to chat sessions whenever drawer opens or changes
  useEffect(() => {
    if (visible) {
      setSessions(loadAllSessions());
      setActiveId(getActiveSessionId());
      syncUserSessionsFromDb();
    }

    const unsubscribe = subscribeToSessions((updated, currentId) => {
      setSessions(updated);
      setActiveId(currentId);
    });

    return unsubscribe;
  }, [visible]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      if (visible) {
        setModalVisible(true);
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(backdropAnim, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -DRAWER_WIDTH,
            duration: 230,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(backdropAnim, {
            toValue: 0,
            duration: 230,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setModalVisible(false);
        });
      }
    }
  }, [visible]);

  const handleNavigate = (route: string) => {
    onClose();
    setActiveSessionId(null);
    try {
      router.push(route as any);
    } catch (err) {
      console.warn("Navigation error:", err);
    }
  };

  const handleSelectSession = (sessionId: string, route?: string) => {
    setActiveSessionId(sessionId);
    onClose();
    const targetRoute = route || "/(tabs)/full-chat";
    router.push({
      pathname: targetRoute as any,
      params: { id: sessionId },
    });
  };

  const handleNewChat = () => {
    setNewChatPickerVisible((prev) => !prev);
  };

  const handleNewChatWithMode = (
    mode: "full-chat" | "persona" | "roundtable",
  ) => {
    setNewChatPickerVisible(false);
    onClose();
    setActiveSessionId(null);
    if (mode === "persona") {
      router.push("/(tabs)/persona");
      return;
    }
    if (mode === "roundtable") {
      router.push("/(tabs)/roundtable");
      return;
    }
    if (mode === "full-chat") {
      router.push("/(tabs)/full-chat");
      return;
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    deleteSession(sessionId);
    setSessions(loadAllSessions());
    setActiveId(getActiveSessionId());
  };

  const handleAction = (key: string) => {
    onClose();
    if (onSelectAction) onSelectAction(key);
  };

  const checkIsActive = (route: string) => {
    if (!pathname) return false;
    // When inside a specific chat session with an ID, top-level counsel mode tabs should not be highlighted
    if (currentChatId) return false;

    if (route === "/(tabs)") {
      return (
        pathname === "/" ||
        pathname === "/(tabs)" ||
        pathname === "/(tabs)/index" ||
        pathname === "/index"
      );
    }
    return pathname.includes(route.replace("/(tabs)", ""));
  };

  const formatSessionTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const drawerInnerContent = (
    <>
      {/* Profile Header */}
      <View
        style={[styles.header, { borderBottomColor: theme.outlineVariant }]}
      >
        <View style={styles.profileRow}>
          <View
            style={[
              styles.avatarBadge,
              { backgroundColor: theme.primaryContainer },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                { color: theme.onPrimaryContainer, fontFamily: serif },
              ]}
            >
              {user
                ? (
                    user.user_metadata?.full_name?.[0] ||
                    user.email?.[0] ||
                    "S"
                  ).toUpperCase()
                : "G"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.seekerTitle,
                { color: theme.primary, fontFamily: serif },
              ]}
              numberOfLines={1}
            >
              {user
                ? user.user_metadata?.full_name || user.email?.split("@")[0]
                : "Guest Seeker"}
            </Text>
            <Text
              style={[
                styles.seekerSubtitle,
                { color: theme.secondary, fontFamily: body },
              ]}
              numberOfLines={1}
            >
              {user ? user.email : "Free Explorer"}
            </Text>
            <View
              style={[
                styles.levelBadge,
                {
                  backgroundColor: user
                    ? "rgba(16, 185, 129, 0.15)"
                    : theme.secondaryContainer,
                },
              ]}
            >
              <Text
                style={[
                  styles.levelText,
                  {
                    color: user ? "#10B981" : theme.onSecondaryContainer,
                    fontFamily: label,
                  },
                ]}
              >
                {user ? "✨ UNLIMITED TURNS" : "⚡ GUEST (3 TURNS)"}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.closeBtn, { borderColor: theme.outlineVariant }]}
          onPress={onClose}
        >
          <Text style={{ fontSize: 16, color: theme.text }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation & Chat History Scroll Area */}
      <ScrollView
        style={styles.menuList}
        contentContainerStyle={styles.menuContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Navigation Modes */}
        <Text
          style={[
            styles.sectionHeader,
            { color: theme.primary, fontFamily: label },
          ]}
        >
          COUNSEL & EXPLORATION MODES
        </Text>

        {APP_NAVIGATION_TABS.map((tab) => {
          const isActive = checkIsActive(tab.route);
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabItem,
                {
                  backgroundColor: isActive
                    ? theme.bgSecondary
                    : theme.surfaceContainerLowest,
                  borderColor: isActive
                    ? theme.primaryContainer
                    : theme.outlineVariant,
                  borderWidth: isActive ? 1.5 : 1,
                },
              ]}
              onPress={() => handleNavigate(tab.route)}
              activeOpacity={0.75}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.tabTitleRow}>
                  <Text
                    style={[
                      styles.tabTitle,
                      {
                        color: isActive ? theme.primary : theme.text,
                        fontFamily: isActive ? label : body,
                      },
                    ]}
                  >
                    {tab.title}
                  </Text>
                  {tab.tag && (
                    <View
                      style={[
                        styles.tagBadge,
                        {
                          backgroundColor: isActive
                            ? theme.primaryContainer
                            : theme.secondaryContainer,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          {
                            color: isActive
                              ? theme.onPrimaryContainer
                              : theme.onSecondaryContainer,
                            fontFamily: label,
                          },
                        ]}
                      >
                        {tab.tag}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.tabSubtitle,
                    { color: theme.secondary, fontFamily: body },
                  ]}
                  numberOfLines={1}
                >
                  {tab.subtitle}
                </Text>
              </View>
              {isActive && (
                <View
                  style={[
                    styles.activeDot,
                    { backgroundColor: theme.primaryContainer },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}

        <View
          style={[styles.divider, { backgroundColor: theme.outlineVariant }]}
        />

        {/* 2. MY CHATS */}
        {(() => {
          const displaySessions = sessions;
          return (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text
                  style={[
                    styles.sectionHeader,
                    { color: theme.primary, fontFamily: label },
                  ]}
                >
                  MY CHATS ({displaySessions.length})
                </Text>
                <TouchableOpacity
                  style={[
                    styles.newChatHeaderBtn,
                    { backgroundColor: theme.primaryContainer },
                  ]}
                  onPress={handleNewChat}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.newChatHeaderBtnText,
                      { color: theme.onPrimaryContainer, fontFamily: label },
                    ]}
                  >
                    + New Chat
                  </Text>
                </TouchableOpacity>
              </View>

              {/* MY CHATS Sessions List */}

              {displaySessions.length > 0 ? (
                displaySessions.map((s) => {
                  const isSelected = !!currentChatId && s.id === currentChatId;
                  const modeInfo = getModeBadgeInfo(s.mode, s.character);
                  return (
                    <View
                      key={s.id}
                      style={[
                        styles.chatSessionItem,
                        {
                          backgroundColor: isSelected
                            ? theme.bgSecondary
                            : "transparent",
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.chatSessionMainTouch}
                        onPress={() =>
                          handleSelectSession(s.id, modeInfo.route)
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chatSessionTitle,
                            {
                              color: isSelected ? theme.primary : theme.text,
                              fontFamily: isSelected ? label : body,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {s.title || "Untitled Consultation"}
                        </Text>

                        <View
                          style={[
                            styles.modeBadgePill,
                            {
                              backgroundColor: isSelected
                                ? theme.primaryContainer
                                : theme.secondaryContainer,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.modeBadgeText,
                              {
                                color: isSelected
                                  ? theme.onPrimaryContainer
                                  : theme.onSecondaryContainer,
                                fontFamily: label,
                              },
                            ]}
                          >
                            {modeInfo.label}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.chatDeleteBtn}
                        onPress={() => handleDeleteSession(s.id)}
                        activeOpacity={0.6}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text
                          style={[
                            styles.chatDeleteIcon,
                            { color: theme.textTertiary },
                          ]}
                        >
                          ✕
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              ) : (
                <TouchableOpacity
                  style={[
                    styles.emptyChatCard,
                    {
                      backgroundColor: theme.surfaceContainerLowest,
                      borderColor: theme.outlineVariant,
                    },
                  ]}
                  onPress={handleNewChat}
                >
                  <Text style={{ fontSize: 20 }}>📜</Text>
                  <Text
                    style={[
                      styles.emptyChatText,
                      { color: theme.secondary, fontFamily: body },
                    ]}
                  >
                    No saved chats yet. Tap to begin your first inquiry!
                  </Text>
                </TouchableOpacity>
              )}
            </>
          );
        })()}

        <View
          style={[styles.divider, { backgroundColor: theme.outlineVariant }]}
        />

        {/* 4. Preferences & System */}
        <Text
          style={[
            styles.sectionHeader,
            { color: theme.textTertiary, fontFamily: label },
          ]}
        >
          PREFERENCES & SYSTEM
        </Text>

        <TouchableOpacity
          style={styles.menuItemSimple}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Text style={styles.itemIcon}>{theme.isDark ? "☀️" : "🌙"}</Text>
          <Text
            style={[
              styles.itemTitleSimple,
              { color: theme.text, fontFamily: body },
            ]}
          >
            {theme.isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
          </Text>
        </TouchableOpacity>

        {user ? (
          <TouchableOpacity
            style={[styles.menuItemSimple, { marginTop: 4 }]}
            onPress={async () => {
              await apiService.logout();
              await supabase.auth.signOut();
              clearAllLocalSessions();
              onClose();
              router.replace("/login");
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>🚪</Text>
            <Text
              style={[
                styles.itemTitleSimple,
                { color: "#EF4444", fontFamily: body },
              ]}
            >
              Sign Out
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.menuItemSimple,
              { backgroundColor: "rgba(217, 119, 6, 0.12)", marginTop: 6 },
            ]}
            onPress={() => {
              onClose();
              router.push("/login");
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.itemIcon}>🔑</Text>
            <Text
              style={[
                styles.itemTitleSimple,
                { color: theme.accent, fontFamily: label },
              ]}
            >
              Sign In with Email
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Drawer Footer */}
      <View style={[styles.footer, { borderTopColor: theme.outlineVariant }]}>
        <Text
          style={[
            styles.footerText,
            { color: theme.textTertiary, fontFamily: serif },
          ]}
        >
          VedicRAG AI • 475+ Curated Scenarios
        </Text>
      </View>
    </>
  );

  const newInquiryModal = (
    <Modal
      visible={newChatPickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setNewChatPickerVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setNewChatPickerVisible(false)}
        />

        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.outlineVariant,
              shadowColor: theme.shadow,
            },
          ]}
        >
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: theme.outlineVariant },
            ]}
          >
            <View>
              <Text
                style={[
                  styles.modalTitle,
                  { color: theme.primary, fontFamily: serif },
                ]}
              >
                Start New Inquiry
              </Text>
              <Text
                style={[
                  styles.modalSubtitle,
                  { color: theme.secondary, fontFamily: body },
                ]}
              >
                Choose how you wish to seek Vedic wisdom
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setNewChatPickerVisible(false)}
              style={[
                styles.modalCloseBtn,
                { borderColor: theme.outlineVariant },
              ]}
            >
              <Text style={{ fontSize: 16, color: theme.text }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Option 1: Full Interactive Chat */}
          <TouchableOpacity
            style={[
              styles.modeOptionCard,
              {
                backgroundColor: theme.surfaceContainerLowest,
                borderColor: theme.outlineVariant,
              },
            ]}
            onPress={() => handleNewChatWithMode("full-chat")}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.modeIconCircle,
                { backgroundColor: theme.primaryContainer },
              ]}
            >
              <Text style={{ fontSize: 22 }}>🏛️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.modeTitleRow}>
                <Text
                  style={[
                    styles.modeTitle,
                    { color: theme.text, fontFamily: label },
                  ]}
                >
                  Full Interactive Chat
                </Text>
                <View
                  style={[
                    styles.modeTag,
                    { backgroundColor: theme.secondaryContainer },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeTagText,
                      { color: theme.onSecondaryContainer, fontFamily: label },
                    ]}
                  >
                    Universal
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.modeDesc,
                  { color: theme.secondary, fontFamily: body },
                ]}
              >
                Multi-turn inquiry with vector scripture citations & deep epic
                comparison
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option 2: Speak with Legends */}
          <TouchableOpacity
            style={[
              styles.modeOptionCard,
              {
                backgroundColor: theme.surfaceContainerLowest,
                borderColor: theme.outlineVariant,
              },
            ]}
            onPress={() => handleNewChatWithMode("persona")}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.modeIconCircle,
                { backgroundColor: theme.secondaryContainer },
              ]}
            >
              <Text style={{ fontSize: 22 }}>👑</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.modeTitleRow}>
                <Text
                  style={[
                    styles.modeTitle,
                    { color: theme.text, fontFamily: label },
                  ]}
                >
                  Speak with Legends
                </Text>
                <View
                  style={[
                    styles.modeTag,
                    { backgroundColor: theme.primaryContainer },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeTagText,
                      { color: theme.onPrimaryContainer, fontFamily: label },
                    ]}
                  >
                    Avatar
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.modeDesc,
                  { color: theme.secondary, fontFamily: body },
                ]}
              >
                1st-person avatar consultation with Krishna, Sita, Arjuna, and
                sages
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option 3: Vedic Roundtable (Council) */}
          <TouchableOpacity
            style={[
              styles.modeOptionCard,
              {
                backgroundColor: theme.surfaceContainerLowest,
                borderColor: theme.outlineVariant,
              },
            ]}
            onPress={() => handleNewChatWithMode("roundtable")}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.modeIconCircle,
                { backgroundColor: theme.primaryContainer },
              ]}
            >
              <Text style={{ fontSize: 22 }}>🪷</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.modeTitleRow}>
                <Text
                  style={[
                    styles.modeTitle,
                    { color: theme.text, fontFamily: label },
                  ]}
                >
                  Vedic Roundtable
                </Text>
                <View
                  style={[
                    styles.modeTag,
                    { backgroundColor: theme.secondaryContainer },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeTagText,
                      { color: theme.onSecondaryContainer, fontFamily: label },
                    ]}
                  >
                    Council
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.modeDesc,
                  { color: theme.secondary, fontFamily: body },
                ]}
              >
                Multi-legend council debate with @mentions, custom invites, and
                mute controls
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Web rendering with hardware-accelerated cubic-bezier transitions
  if (Platform.OS === "web") {
    return (
      <>
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            display: "flex",
            opacity: visible ? 1 : 0,
            visibility: visible ? "visible" : "hidden",
            pointerEvents: visible ? "auto" : "none",
            transition:
              "opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "320px",
              maxWidth: "85vw",
              height: "100%",
              backgroundColor: theme.surface,
              borderRight: `1px solid ${theme.outlineVariant}`,
              display: "flex",
              flexDirection: "column",
              boxShadow: "10px 0 30px rgba(0,0,0,0.22)",
              transform: visible ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.34s cubic-bezier(0.16, 1, 0.3, 1)",
              willChange: "transform",
            }}
          >
            {drawerInnerContent}
          </div>
        </div>
        {newInquiryModal}
      </>
    );
  }

  // Native React Native rendering with Animated.View fallback
  return (
    <>
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.overlay, { opacity: backdropAnim }]}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.drawer,
                  {
                    backgroundColor: theme.surface,
                    borderRightColor: theme.outlineVariant,
                    transform: [{ translateX: slideAnim }],
                  },
                ]}
              >
                {drawerInnerContent}
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
      {newInquiryModal}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flexDirection: "row",
  },
  drawer: {
    width: DRAWER_WIDTH,
    maxWidth: "85%",
    height: "100%",
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    borderBottomWidth: 1,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
  },
  seekerTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  seekerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  levelBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  levelText: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  menuList: {
    flex: 1,
  },
  menuContent: {
    padding: 14,
    paddingBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
  },
  newChatHeaderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  newChatHeaderBtnText: {
    fontSize: 10,
    fontWeight: "700",
  },
  chatSessionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
    marginBottom: 2,
    paddingRight: 6,
  },
  chatSessionMainTouch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 4,
  },
  chatSessionIcon: {
    fontSize: 16,
  },
  chatSessionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  chatSessionTitle: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  modeBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  modeBadgeText: {
    fontSize: 8.5,
    letterSpacing: 0.3,
    fontWeight: "700",
  },
  chatSessionMeta: {
    fontSize: 10.5,
    marginTop: 1,
  },
  chatDeleteBtn: {
    padding: 4,
  },
  chatDeleteIcon: {
    fontSize: 11,
  },
  emptyChatCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  emptyChatText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 7,
  },
  tabIcon: {
    fontSize: 19,
  },
  tabTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabTitle: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  tabSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 8.5,
    letterSpacing: 0.3,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  divider: {
    height: 1,
    marginVertical: 12,
    opacity: 0.6,
  },
  menuItemSimple: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  itemIcon: {
    fontSize: 20,
  },
  itemTitleSimple: {
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    zIndex: 100000,
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modeOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  modeIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  modeTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  modeTagText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  modeDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
});
