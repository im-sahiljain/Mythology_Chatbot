import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "../src/context/ThemeContext";
import { useLanguage } from "../src/context/LanguageContext";
import { ALL_LANGUAGES, LanguageOption } from "../src/i18n/languages";
import { LanguageSelectorModal } from "../src/components/LanguageSelectorModal";

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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const {
    appLanguage,
    chatLanguage,
    setAppLanguage,
    setChatLanguage,
    appLanguageOption,
    chatLanguageOption,
    supportedAppLanguages,
    supportedChatLanguages,
  } = useLanguage();

  // Desktop inline dropdown states
  const [appDropdownOpen, setAppDropdownOpen] = useState(false);
  const [chatDropdownOpen, setChatDropdownOpen] = useState(false);
  const [appSearch, setAppSearch] = useState("");
  const [chatSearch, setChatSearch] = useState("");

  // Mobile modal states
  const [mobileModalMode, setMobileModalMode] = useState<"app" | "chat" | null>(
    null,
  );

  // Filtered lists for desktop dropdowns
  const filteredAppLanguages = useMemo(() => {
    const list = supportedAppLanguages || ALL_LANGUAGES;
    if (!appSearch.trim()) return list;
    const q = appSearch.toLowerCase().trim();
    return list.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.region && l.region.toLowerCase().includes(q)),
    );
  }, [appSearch, supportedAppLanguages]);

  const filteredChatLanguages = useMemo(() => {
    const list = supportedChatLanguages || ALL_LANGUAGES;
    if (!chatSearch.trim()) return list;
    const q = chatSearch.toLowerCase().trim();
    return list.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.region && l.region.toLowerCase().includes(q)),
    );
  }, [chatSearch, supportedChatLanguages]);

  const handleOpenLanguageSelector = (mode: "app" | "chat") => {
    if (isDesktop) {
      if (mode === "app") {
        setAppDropdownOpen((prev) => !prev);
        setChatDropdownOpen(false);
      } else {
        setChatDropdownOpen((prev) => !prev);
        setAppDropdownOpen(false);
      }
    } else {
      setMobileModalMode(mode);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.bgSecondary }]}
    >
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.bgSecondary}
      />

      {/* Top Header */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.outlineVariant,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: theme.surfaceContainerLowest,
                borderColor: theme.outlineVariant,
              },
            ]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleGroup}>
            <Text
              style={[
                styles.headerTitle,
                { color: theme.text, fontFamily: serif },
              ]}
            >
              {t("settingsScreen.title", "Settings")}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.secondary, fontFamily: body },
              ]}
            >
              {t(
                "settingsScreen.subtitle",
                "Configure Vedic languages, appearance, and counsel preferences",
              )}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          isDesktop && styles.desktopContentContainer,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        showsVerticalScrollIndicator={true}
        // @ts-ignore
        className="show-scrollbar"
      >
        {/* ── SECTION 1: LANGUAGE & REGION ────────────────────────── */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.primary, fontFamily: label },
            ]}
          >
            {t("drawer.preferences_system", "PREFERENCES & SYSTEM")}
          </Text>

          {/* 1. App Language Picker */}
          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.outlineVariant,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.settingCardHeader}
              onPress={() => handleOpenLanguageSelector("app")}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: theme.isDark ? "#2D2214" : "#FBF3E8" },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>🌐</Text>
                </View>
                <View style={styles.settingTextGroup}>
                  <Text
                    style={[
                      styles.settingItemTitle,
                      { color: theme.text, fontFamily: label },
                    ]}
                    numberOfLines={1}
                  >
                    {t("drawer.app_language", "App Language")}
                  </Text>
                  {isDesktop && (
                    <Text
                      style={[
                        styles.settingItemDesc,
                        { color: theme.secondary, fontFamily: body },
                      ]}
                      numberOfLines={1}
                    >
                      {t(
                        "settingsScreen.app_language_desc",
                        "Changes menus, buttons, tabs, and navigation",
                      )}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.settingRight}>
                <View
                  style={[
                    styles.valueBadge,
                    {
                      backgroundColor: theme.surfaceContainerLowest,
                      borderColor: theme.outlineVariant,
                      maxWidth: isDesktop ? 220 : 140,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.valueBadgeText,
                      { color: theme.primary, fontFamily: label },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {isDesktop
                      ? `${appLanguageOption.nativeName} (${appLanguageOption.name})`
                      : appLanguageOption.nativeName}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.secondary,
                    marginLeft: 6,
                  }}
                >
                  {isDesktop ? (appDropdownOpen ? "▲" : "▼") : "›"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Desktop Inline Dropdown with Instant Search */}
            {isDesktop && appDropdownOpen && (
              <View
                style={[
                  styles.dropdownContainer,
                  {
                    backgroundColor: theme.surfaceContainerLowest,
                    borderColor: theme.outlineVariant,
                  },
                ]}
              >
                <View
                  style={[
                    styles.dropdownSearchBox,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.outlineVariant,
                    },
                  ]}
                >
                  <Text style={{ marginRight: 8, fontSize: 14 }}>🔍</Text>
                  <TextInput
                    style={[
                      styles.dropdownSearchInput,
                      { color: theme.text, fontFamily: body },
                    ]}
                    placeholder={t(
                      "language_modal.search_placeholder",
                      "Search language or script...",
                    )}
                    placeholderTextColor={theme.textTertiary}
                    value={appSearch}
                    onChangeText={setAppSearch}
                    autoFocus
                  />
                  {appSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setAppSearch("")}>
                      <Text
                        style={{
                          color: theme.textTertiary,
                          paddingHorizontal: 4,
                        }}
                      >
                        ✕
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  style={styles.dropdownScroll}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled
                  // @ts-ignore
                  className="show-scrollbar"
                >
                  <View style={styles.dropdownGrid}>
                    {filteredAppLanguages.map((item) => {
                      const isSelected = appLanguage === item.code;
                      return (
                        <TouchableOpacity
                          key={item.code}
                          style={[
                            styles.dropdownItem,
                            {
                              backgroundColor: isSelected
                                ? theme.isDark
                                  ? "rgba(217, 119, 6, 0.2)"
                                  : "rgba(217, 119, 6, 0.12)"
                                : "transparent",
                              borderColor: isSelected
                                ? theme.accent
                                : "transparent",
                            },
                          ]}
                          onPress={async () => {
                            await setAppLanguage(item.code);
                            setAppDropdownOpen(false);
                          }}
                        >
                          <View style={styles.dropdownItemLeft}>
                            <Text
                              style={[
                                styles.dropdownNativeName,
                                {
                                  color: isSelected
                                    ? theme.primary
                                    : theme.text,
                                  fontFamily: isSelected ? label : body,
                                },
                              ]}
                            >
                              {item.nativeName}
                            </Text>
                            <Text
                              style={[
                                styles.dropdownEnglishName,
                                { color: theme.secondary, fontFamily: body },
                              ]}
                            >
                              {item.name}
                            </Text>
                          </View>
                          {isSelected && (
                            <Text
                              style={{
                                color: theme.primary,
                                fontWeight: "700",
                              }}
                            >
                              ✓
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>

          {/* 2. AI Deity Language Picker */}
          <View
            style={[
              styles.settingCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.outlineVariant,
                marginTop: 10,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.settingCardHeader}
              onPress={() => handleOpenLanguageSelector("chat")}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: theme.isDark ? "#2D2214" : "#FBF3E8" },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>💬</Text>
                </View>
                <View style={styles.settingTextGroup}>
                  <Text
                    style={[
                      styles.settingItemTitle,
                      { color: theme.text, fontFamily: label },
                    ]}
                    numberOfLines={1}
                  >
                    {t("drawer.chat_language", "AI Deity Language")}
                  </Text>
                  {isDesktop && (
                    <Text
                      style={[
                        styles.settingItemDesc,
                        { color: theme.secondary, fontFamily: body },
                      ]}
                      numberOfLines={1}
                    >
                      {t(
                        "settingsScreen.chat_language_desc",
                        "Language & script used by Krishna, Rama, Sita, etc. in replies",
                      )}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.settingRight}>
                <View
                  style={[
                    styles.valueBadge,
                    {
                      backgroundColor: theme.surfaceContainerLowest,
                      borderColor: theme.outlineVariant,
                      maxWidth: isDesktop ? 220 : 140,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.valueBadgeText,
                      { color: theme.primary, fontFamily: label },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {chatLanguageOption.code === "auto"
                      ? t("drawer.auto", "Auto")
                      : isDesktop
                        ? `${chatLanguageOption.nativeName} (${chatLanguageOption.name})`
                        : chatLanguageOption.nativeName}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.secondary,
                    marginLeft: 6,
                  }}
                >
                  {isDesktop ? (chatDropdownOpen ? "▲" : "▼") : "›"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Desktop Inline Dropdown with Instant Search */}
            {isDesktop && chatDropdownOpen && (
              <View
                style={[
                  styles.dropdownContainer,
                  {
                    backgroundColor: theme.surfaceContainerLowest,
                    borderColor: theme.outlineVariant,
                  },
                ]}
              >
                <View
                  style={[
                    styles.dropdownSearchBox,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.outlineVariant,
                    },
                  ]}
                >
                  <Text style={{ marginRight: 8, fontSize: 14 }}>🔍</Text>
                  <TextInput
                    style={[
                      styles.dropdownSearchInput,
                      { color: theme.text, fontFamily: body },
                    ]}
                    placeholder={t(
                      "language_modal.search_placeholder",
                      "Search language or script...",
                    )}
                    placeholderTextColor={theme.textTertiary}
                    value={chatSearch}
                    onChangeText={setChatSearch}
                    autoFocus
                  />
                  {chatSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setChatSearch("")}>
                      <Text
                        style={{
                          color: theme.textTertiary,
                          paddingHorizontal: 4,
                        }}
                      >
                        ✕
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  style={styles.dropdownScroll}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled
                  // @ts-ignore
                  className="show-scrollbar"
                >
                  <View style={styles.dropdownGrid}>
                    {/* Auto option */}
                    {!chatSearch && (
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          {
                            backgroundColor:
                              chatLanguage === "auto"
                                ? theme.isDark
                                  ? "rgba(217, 119, 6, 0.2)"
                                  : "rgba(217, 119, 6, 0.12)"
                                : "transparent",
                            borderColor:
                              chatLanguage === "auto"
                                ? theme.accent
                                : "transparent",
                          },
                        ]}
                        onPress={async () => {
                          await setChatLanguage("auto");
                          setChatDropdownOpen(false);
                        }}
                      >
                        <View style={styles.dropdownItemLeft}>
                          <Text
                            style={[
                              styles.dropdownNativeName,
                              {
                                color:
                                  chatLanguage === "auto"
                                    ? theme.primary
                                    : theme.text,
                                fontFamily:
                                  chatLanguage === "auto" ? label : body,
                              },
                            ]}
                          >
                            ✨{" "}
                            {t(
                              "language_modal.auto_option",
                              "Auto (System Default)",
                            )}
                          </Text>
                          <Text
                            style={[
                              styles.dropdownEnglishName,
                              { color: theme.secondary, fontFamily: body },
                            ]}
                          >
                            Matches current app interface language
                          </Text>
                        </View>
                        {chatLanguage === "auto" && (
                          <Text
                            style={{ color: theme.primary, fontWeight: "700" }}
                          >
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {filteredChatLanguages.map((item) => {
                      const isSelected = chatLanguage === item.code;
                      return (
                        <TouchableOpacity
                          key={item.code}
                          style={[
                            styles.dropdownItem,
                            {
                              backgroundColor: isSelected
                                ? theme.isDark
                                  ? "rgba(217, 119, 6, 0.2)"
                                  : "rgba(217, 119, 6, 0.12)"
                                : "transparent",
                              borderColor: isSelected
                                ? theme.accent
                                : "transparent",
                            },
                          ]}
                          onPress={async () => {
                            await setChatLanguage(item.code);
                            setChatDropdownOpen(false);
                          }}
                        >
                          <View style={styles.dropdownItemLeft}>
                            <Text
                              style={[
                                styles.dropdownNativeName,
                                {
                                  color: isSelected
                                    ? theme.primary
                                    : theme.text,
                                  fontFamily: isSelected ? label : body,
                                },
                              ]}
                            >
                              {item.nativeName}
                            </Text>
                            <Text
                              style={[
                                styles.dropdownEnglishName,
                                { color: theme.secondary, fontFamily: body },
                              ]}
                            >
                              {item.name}
                            </Text>
                          </View>
                          {isSelected && (
                            <Text
                              style={{
                                color: theme.primary,
                                fontWeight: "700",
                              }}
                            >
                              ✓
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* ── SECTION 2: APPEARANCE & THEME ────────────────────────── */}
        <View style={[styles.section, { marginTop: 24, marginBottom: 40 }]}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.primary, fontFamily: label },
            ]}
          >
            {t("settingsScreen.appearance", "APPEARANCE & THEME")}
          </Text>

          <View
            style={[
              styles.themeGrid,
              {
                backgroundColor: theme.surface,
                borderColor: theme.outlineVariant,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.themeCard,
                !theme.isDark && [
                  styles.themeCardActive,
                  {
                    borderColor: theme.primary,
                    backgroundColor: theme.isDark ? "#2D2214" : "#FBF3E8",
                  },
                ],
                {
                  borderColor: !theme.isDark
                    ? theme.primary
                    : theme.outlineVariant,
                },
              ]}
              onPress={() => {
                if (theme.isDark) toggleTheme();
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 24, marginBottom: 8 }}>☀️</Text>
              <Text
                style={[
                  styles.themeCardTitle,
                  { color: theme.text, fontFamily: label },
                ]}
              >
                {t("drawer.theme_light", "Light Theme")}
              </Text>
              <Text
                style={[
                  styles.themeCardDesc,
                  { color: theme.secondary, fontFamily: body },
                ]}
              >
                Warm parchment & saffron tones
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeCard,
                theme.isDark && [
                  styles.themeCardActive,
                  {
                    borderColor: theme.primary,
                    backgroundColor: theme.isDark ? "#2D2214" : "#FBF3E8",
                  },
                ],
                {
                  borderColor: theme.isDark
                    ? theme.primary
                    : theme.outlineVariant,
                },
              ]}
              onPress={() => {
                if (!theme.isDark) toggleTheme();
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 24, marginBottom: 8 }}>🌙</Text>
              <Text
                style={[
                  styles.themeCardTitle,
                  { color: theme.text, fontFamily: label },
                ]}
              >
                {t("drawer.theme_dark", "Dark Theme")}
              </Text>
              <Text
                style={[
                  styles.themeCardDesc,
                  { color: theme.secondary, fontFamily: body },
                ]}
              >
                Deep cosmic charcoal & gold
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Mobile Native-Style Radio Dialog Modal */}
      {mobileModalMode && (
        <LanguageSelectorModal
          visible={!!mobileModalMode}
          mode={mobileModalMode}
          onClose={() => setMobileModalMode(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerContent: {
    maxWidth: 900,
    width: "100%",
    marginHorizontal: "auto",
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    maxWidth: 900,
    width: "100%",
    marginHorizontal: "auto",
  },
  desktopContentContainer: {
    paddingVertical: 24,
  },
  section: {
    width: "100%",
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingTextGroup: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 15,
  },
  settingItemDesc: {
    fontSize: 12.5,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  valueBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  valueBadgeText: {
    fontSize: 12.5,
  },
  dropdownContainer: {
    borderTopWidth: 1,
    padding: 14,
  },
  dropdownSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  dropdownScroll: {
    maxHeight: 280,
  },
  dropdownGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "49%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dropdownItemLeft: {
    flex: 1,
  },
  dropdownNativeName: {
    fontSize: 15,
  },
  dropdownEnglishName: {
    fontSize: 12,
    marginTop: 1,
  },
  themeGrid: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  themeCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    textAlign: "center",
  },
  themeCardActive: {
    elevation: 2,
  },
  themeCardTitle: {
    fontSize: 15,
  },
  themeCardDesc: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
