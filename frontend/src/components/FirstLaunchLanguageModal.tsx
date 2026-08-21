import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { ALL_LANGUAGES, getLanguageByCode } from '../i18n/languages';
import { useTranslation } from 'react-i18next';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const label = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';

// Common top 8 languages for initial compact view
const TOP_LANG_CODES = ['en', 'hi', 'sa', 'ta', 'te', 'bn', 'mr', 'gu'];

export const FirstLaunchLanguageModal: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const {
    isFirstLaunch,
    appLanguage,
    setAppLanguage,
    completeFirstLaunch,
  } = useLanguage();

  // User must explicitly tap to select a language; do not pre-highlight on open
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  // Inline expansion state: shows all 23 language boxes below without any popup
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  if (!isFirstLaunch) return null;

  const appLangMeta = getLanguageByCode(appLanguage);

  const displayedLanguages = showAllLanguages
    ? ALL_LANGUAGES
    : ALL_LANGUAGES.filter((l) => TOP_LANG_CODES.includes(l.code));

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
                      ? 'rgba(217, 119, 6, 0.25)'
                      : 'rgba(217, 119, 6, 0.15)',
                    borderColor: theme.accent,
                  },
                ]}
              >
                <Text style={styles.omText}>🕉️</Text>
              </View>
            </View>

            <Text style={[styles.title, { color: theme.text, fontFamily: serif }]}>
              {t('onboarding.welcome_title', 'Welcome to Epic Counsel')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: body }]}>
              {t('onboarding.welcome_subtitle', 'Timeless wisdom from the Ramayana, Mahabharata & Vedic scriptures')}
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={true}
              style={styles.scrollSection}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {/* Device Auto-Detect Info Pill */}
              <View
                style={[
                  styles.detectedPill,
                  {
                    backgroundColor: theme.surfaceContainerLowest,
                    borderColor: theme.outlineVariant,
                  },
                ]}
              >
                <Text style={{ fontSize: 16, marginRight: 8 }}>🌐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detectedLabel, { color: theme.textTertiary, fontFamily: body }]}>
                    {t('onboarding.detected_os_lang', 'Detected from your device settings')}:
                  </Text>
                  <Text style={[styles.detectedValue, { color: theme.accent, fontFamily: label }]}>
                    {appLangMeta.nativeName} ({appLangMeta.name})
                  </Text>
                </View>
              </View>

              {/* Choose Preferred App Language */}
              <Text style={[styles.sectionTitle, { color: theme.textTertiary, fontFamily: label }]}>
                {t('onboarding.choose_language', 'CHOOSE PREFERRED APP LANGUAGE')}
              </Text>

              {/* Language Boxes Grid */}
              <View style={styles.quickGrid}>
                {displayedLanguages.map((lang) => {
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
                          borderColor: isSelected ? theme.accent : theme.outlineVariant,
                        },
                      ]}
                      onPress={() => handleSelectLanguage(lang.code)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.quickChipNative,
                          {
                            color: isSelected ? '#FFFFFF' : theme.text,
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
                            color: isSelected ? 'rgba(255,255,255,0.85)' : theme.textTertiary,
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

              {/* Inline Expand/Collapse for all 23 Languages */}
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
                <Text style={[styles.moreButtonText, { color: theme.primary, fontFamily: label }]}>
                  {showAllLanguages
                    ? `▲ Show Fewer Languages`
                    : `▼ Show All 23 Indian Languages (${ALL_LANGUAGES.length - TOP_LANG_CODES.length} more)`}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.accent }]}
              onPress={handleEnter}
              activeOpacity={0.8}
            >
              <Text style={[styles.submitText, { fontFamily: label }]}>
                {t('onboarding.get_started', 'Enter the Realm of Wisdom')} ✨
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  safeArea: {
    width: '100%',
    maxWidth: 480,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: '90%',
  },
  headerIconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  omBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  omText: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  scrollSection: {
    maxHeight: 340,
    marginBottom: 16,
  },
  detectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '700',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  quickChip: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 6,
  },
  quickChipNative: {
    fontSize: 15,
    fontWeight: '700',
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
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  moreButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
