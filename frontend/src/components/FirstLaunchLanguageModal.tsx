import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ALL_LANGUAGES, getLanguageByCode } from "../i18n/languages";
import { useTranslation } from "react-i18next";

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

// Common top 8 languages for initial compact view
const TOP_LANG_CODES = ["en", "hi", "sa", "ta", "te", "bn", "mr", "gu"];

export const FirstLaunchLanguageModal: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isFirstLaunch, appLanguage, setAppLanguage, completeFirstLaunch } =
    useLanguage();

  // Pre-highlight the default detected language on open
  const [selectedLang, setSelectedLang] = useState<string>(appLanguage);
  // Inline expansion state: shows all 23 language boxes below without any popup
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const appLangMeta = getLanguageByCode(appLanguage);

  const displayedLanguages = showAllLanguages
    ? ALL_LANGUAGES
    : ALL_LANGUAGES.filter((l) => TOP_LANG_CODES.includes(l.code));

  const filteredLanguages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sourceList = query ? ALL_LANGUAGES : displayedLanguages;
    if (!query) return sourceList;
    return sourceList.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.nativeName.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query),
    );
  }, [searchQuery, displayedLanguages]);

  const handleSelectLanguage = (code: string) => {
    setSelectedLang(code);
    setAppLanguage(code);
  };

  const handleEnter = () => {
    if (selectedLang) {
      setAppLanguage(selectedLang);
    }
    completeFirstLaunch();
  };

  if (!isFirstLaunch) return null;

  return (
    <Modal visible={isFirstLaunch} transparent animationType="fade">
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.outlineVariant,
              },
            ]}
          >
            {/* Header / Logo Icon */}
            <View style={styles.headerIconContainer}>
              <View
                style={[
                  styles.omBadge,
                  {
                    backgroundColor: theme.isDark
                      ? "rgba(217, 119, 6, 0.25)"
                      : "rgba(217, 119, 6, 0.15)",
                    borderColor: theme.accent,
                  },
                ]}
              >
                <Text style={styles.omText}>🕉️</Text>
              </View>
            </View>

            <Text
              style={[styles.title, { color: theme.text, fontFamily: serif }]}
            >
              {t("onboarding.welcome_title", "Welcome to Epic Counsel")}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: theme.textSecondary, fontFamily: body },
              ]}
            >
              {t(
                "onboarding.welcome_subtitle",
                "Timeless wisdom from the Ramayana, Mahabharata & Vedic scriptures",
              )}
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={true}
              style={styles.scrollSection}
              contentContainerStyle={{ paddingBottom: 8, paddingHorizontal: 4 }}
              // @ts-ignore
              className="show-scrollbar"
            >
              <View
                style={[
                  styles.searchWrapper,
                  {
                    backgroundColor: theme.surfaceContainerLowest,
                    borderColor: theme.outlineVariant,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.searchInput,
                    {
                      color: theme.text,
                      fontFamily: body,
                    },
                  ]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t(
                    "language_modal.search_placeholder",
                    "Search language or script...",
                  )}
                  placeholderTextColor={theme.isDark ? "#666" : "#999"}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    style={{ padding: 4 }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={theme.textTertiary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Choose Preferred App Language */}
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.textTertiary, fontFamily: label },
                ]}
              >
                {t(
                  "onboarding.choose_language",
                  "CHOOSE PREFERRED APP LANGUAGE",
                )}
              </Text>

              {/* Language Boxes Grid */}
              <View style={styles.quickGrid}>
                {filteredLanguages.map((lang) => {
                  const isSelected = selectedLang === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.quickChip,
                        {
                          backgroundColor: isSelected
                            ? theme.accent
                            : theme.surfaceContainerLowest,
                          borderColor: isSelected
                            ? theme.accent
                            : theme.outlineVariant,
                        },
                      ]}
                      onPress={() => handleSelectLanguage(lang.code)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.quickChipNative,
                          {
                            color: isSelected ? "#FFFFFF" : theme.text,
                            fontFamily: label,
                          },
                        ]}
                      >
                        {lang.nativeName}
                      </Text>
                      <Text
                        style={[
                          styles.quickChipEng,
                          {
                            color: isSelected
                              ? "rgba(255,255,255,0.85)"
                              : theme.textTertiary,
                            fontFamily: body,
                          },
                        ]}
                      >
                        {lang.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {filteredLanguages.length === 0 && (
                <View style={{ alignItems: "center", paddingVertical: 32 }}>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontFamily: body,
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    {t(
                      "onboarding.no_languages_found",
                      'No languages found matching "{{query}}"',
                      { query: searchQuery },
                    )}
                  </Text>
                </View>
              )}

              {/* Inline Expand/Collapse for all 23 Languages */}
              {!searchQuery && (
                <TouchableOpacity
                  style={[
                    styles.moreButton,
                    {
                      backgroundColor: theme.surfaceContainerLowest,
                      borderColor: theme.outlineVariant,
                    },
                  ]}
                  onPress={() => setShowAllLanguages((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.moreButtonText,
                      { color: theme.primary, fontFamily: label },
                    ]}
                  >
                    {showAllLanguages
                      ? `▲ Show Fewer Languages`
                      : `▼ Show All 23 Indian Languages (${ALL_LANGUAGES.length - TOP_LANG_CODES.length} more)`}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Action Button — only shown when a valid language is visible */}
            {filteredLanguages.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: theme.accent, marginTop: 12 },
                ]}
                onPress={handleEnter}
                activeOpacity={0.8}
              >
                <Text style={[styles.submitText, { fontFamily: label }]}>
                  {t("onboarding.get_started", "Enter the Realm of Wisdom")} ✨
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  safeArea: {
    width: "100%",
    maxWidth: 480,
  },
  card: {
    width: "100%",
    height: "95%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: "90%",
    flexDirection: "column",
  },
  headerIconContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  omBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  omText: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  scrollSection: {
    width: "100%",
    flex: 1,
    flexShrink: 1,
    minHeight: 120,
    maxHeight: 320,
    marginBottom: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
        borderWidth: 0,
      } as any,
      default: {},
    }),
  },
  detectedPill: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  detectedLabel: {
    fontSize: 11,
  },
  detectedValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
      default: {},
    }),
  },
  quickGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  quickChip: {
    width: "48%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 6,
  },
  quickChipNative: {
    fontSize: 15,
    fontWeight: "700",
  },
  quickChipEng: {
    fontSize: 11,
    marginTop: 2,
  },
  moreButton: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 6,
  },
  moreButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
