import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { createNewSession, setActiveSessionId } from "../services/chatStorage";
import { useLanguage } from "../context/LanguageContext";
import { LanguageSelectorModal } from "./LanguageSelectorModal";

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

interface VedicTopBarProps {
  onOpenDrawer: () => void;
}

export const VedicTopBar: React.FC<VedicTopBarProps> = ({ onOpenDrawer }) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { effectiveChatLanguage } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  // Compact chrome on narrow/mobile widths so the right pill doesn't clip
  const isCompact = screenWidth < 600;
  const safeTopPadding =
    Math.max(insets.top, Platform.OS === "ios" ? 44 : 12) +
    (Platform.OS === "web" ? 12 : 8);

  const handleStartMode = (
    mode: "full-chat" | "persona" | "roundtable" | "scholar",
  ) => {
    setModalVisible(false);
    if (mode === "scholar") {
      router.push("/(tabs)");
      return;
    }
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

  return (
    <>
      {/* Top Fade & Floating Pill Controls */}
      <View
        style={[
          styles.topFloatingHeader,
          {
            paddingTop: safeTopPadding,
            paddingHorizontal: isCompact ? 10 : 16,
            gap: isCompact ? 8 : 12,
          },
          Platform.OS === "web"
            ? ({
                background: `linear-gradient(to bottom, ${theme.bg} 40%, ${theme.bg}BB 65%, ${theme.bg}00 100%)`,
              } as any)
            : { backgroundColor: "transparent" },
        ]}
      >
        {/* Left Floating Hamburger Button */}
        <TouchableOpacity
          style={[
            styles.floatingPillBtn,
            isCompact && styles.floatingPillBtnCompact,
            {
              backgroundColor: theme.surface,
              borderColor: theme.outlineVariant,
              shadowColor: theme.shadow,
            },
          ]}
          onPress={onOpenDrawer}
          activeOpacity={0.8}
        >
          <Text style={[styles.pillIconText, { color: theme.primary }]}>
            ☰
          </Text>
        </TouchableOpacity>

        {/* Right Floating Pill Group [ 🔑 Login | 🌐 Lang | 📜 New Chat | 🌙 Theme ] */}
        <View
          style={[
            styles.floatingPillGroup,
            isCompact && styles.floatingPillGroupCompact,
            {
              backgroundColor: theme.surface,
              borderColor: theme.outlineVariant,
              shadowColor: theme.shadow,
              maxWidth: isCompact ? screenWidth - 68 : undefined,
            },
          ]}
        >
          {!user && (
            <>
              <TouchableOpacity
                style={[
                  styles.pillIconTouch,
                  isCompact && styles.pillIconTouchCompact,
                ]}
                onPress={() => router.push("/login")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillLoginText,
                    isCompact && styles.pillLoginTextCompact,
                    { color: theme.primary },
                  ]}
                  numberOfLines={1}
                >
                  {isCompact
                    ? `🔑 ${t("common.signIn", "Sign In")}`
                    : `🔑 ${t("drawer.signIn", "Sign In with Email")}`}
                </Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.pillDivider,
                  { backgroundColor: theme.outlineVariant },
                ]}
              />
            </>
          )}

          {/* Quick Language Switcher Pill */}
          <TouchableOpacity
            style={[
              styles.pillIconTouch,
              isCompact && styles.pillIconTouchCompact,
            ]}
            onPress={() => setLanguageModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillIconText,
                {
                  color: theme.primary,
                  fontSize: isCompact ? 12 : 13,
                  fontFamily: label,
                },
              ]}
              numberOfLines={1}
            >
              🌐 {effectiveChatLanguage.toUpperCase()}
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.pillDivider,
              { backgroundColor: theme.outlineVariant },
            ]}
          />

          <TouchableOpacity
            style={[
              styles.pillIconTouch,
              isCompact && styles.pillIconTouchCompact,
            ]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillIconText, { color: theme.primary }]}>
              📜
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.pillDivider,
              { backgroundColor: theme.outlineVariant },
            ]}
          />

          <TouchableOpacity
            style={[
              styles.pillIconTouch,
              isCompact && styles.pillIconTouchCompact,
            ]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillIconText, { color: theme.primary }]}>
              {theme.isDark ? "☀️" : "🌙"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* New Consultation Mode Picker Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
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
                  {t("drawer.startNewInquiry", "Start New Inquiry")}
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: theme.secondary, fontFamily: body },
                  ]}
                >
                  {t("drawer.chooseMode", "Choose how you wish to seek Vedic wisdom")}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.closeBtn, { borderColor: theme.outlineVariant }]}
              >
                <Text style={{ fontSize: 16, color: theme.text }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Mode Option 1: Full Interactive Chat */}
            <TouchableOpacity
              style={[
                styles.modeOptionCard,
                {
                  backgroundColor: theme.surfaceContainerLowest,
                  borderColor: theme.outlineVariant,
                },
              ]}
              onPress={() => handleStartMode("full-chat")}
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
                    {t("drawer.fullChat", "Full Interactive Chat")}
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
                        {
                          color: theme.onSecondaryContainer,
                          fontFamily: label,
                        },
                      ]}
                    >
                      {t("drawer.universal", "Universal")}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.modeDesc,
                    { color: theme.secondary, fontFamily: body },
                  ]}
                >
                  {t("drawer.fullChatDesc", "Topic matrix & deep comparison")}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Mode Option 2: Speak with Legends (Persona) */}
            <TouchableOpacity
              style={[
                styles.modeOptionCard,
                {
                  backgroundColor: theme.surfaceContainerLowest,
                  borderColor: theme.outlineVariant,
                },
              ]}
              onPress={() => handleStartMode("persona")}
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
                    {t("drawer.speakWithLegends", "Speak with Legends")}
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
                      {t("drawer.avatar", "Avatar")}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.modeDesc,
                    { color: theme.secondary, fontFamily: body },
                  ]}
                >
                  {t("drawer.speakWithLegendsDesc", "1st-person avatar consultation")}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Mode Option 3: Vedic Roundtable (Council) */}
            <TouchableOpacity
              style={[
                styles.modeOptionCard,
                {
                  backgroundColor: theme.surfaceContainerLowest,
                  borderColor: theme.outlineVariant,
                },
              ]}
              onPress={() => handleStartMode("roundtable")}
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
                    {t("drawer.vedicRoundtable", "Vedic Roundtable")}
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
                        {
                          color: theme.onSecondaryContainer,
                          fontFamily: label,
                        },
                      ]}
                    >
                      {t("drawer.council", "Council")}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.modeDesc,
                    { color: theme.secondary, fontFamily: body },
                  ]}
                >
                  {t("drawer.vedicRoundtableDesc", "Multi-legend council debate")}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {languageModalVisible && (
        <LanguageSelectorModal
          visible={languageModalVisible}
          mode="chat"
          onClose={() => setLanguageModalVisible(false)}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
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
    flexShrink: 0,
  },
  floatingPillBtnCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    flexShrink: 1,
  },
  floatingPillGroupCompact: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 6,
    gap: 2,
  },
  pillIconTouch: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  pillIconTouchCompact: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  pillIconText: {
    fontSize: 18,
  },
  pillLoginText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: label,
  },
  pillLoginTextCompact: {
    fontSize: 12,
  },
  pillDivider: {
    width: 1,
    height: 18,
    opacity: 0.6,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
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
  closeBtn: {
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
