import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALL_LANGUAGES, LanguageOption } from '../i18n/languages';
import { useTranslation } from 'react-i18next';

const serif = Platform.OS === 'web' ? "'EB Garamond', Georgia, serif" : 'EBGaramond_700Bold';
const label = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_700Bold';
const body = Platform.OS === 'web' ? "'Hanken Grotesk', sans-serif" : 'HankenGrotesk_400Regular';

interface LanguageSelectorModalProps {
  visible: boolean;
  mode: 'app' | 'chat';
  onClose: () => void;
  onSelect?: (code: string) => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  visible,
  mode,
  onClose,
  onSelect,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const {
    appLanguage,
    chatLanguage,
    setAppLanguage,
    setChatLanguage,
    supportedAppLanguages,
    supportedChatLanguages,
  } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedCode, setTempSelectedCode] = useState<string>('');

  const currentSavedCode = mode === 'app' ? appLanguage : chatLanguage;

  useEffect(() => {
    if (visible) {
      setTempSelectedCode(currentSavedCode);
      setSearchQuery('');
    }
  }, [visible, currentSavedCode]);

  const sourceLanguages =
    mode === 'app'
      ? supportedAppLanguages || ALL_LANGUAGES
      : supportedChatLanguages || ALL_LANGUAGES;

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) {
      return sourceLanguages;
    }
    const q = searchQuery.toLowerCase().trim();
    return sourceLanguages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.region && l.region.toLowerCase().includes(q))
    );
  }, [searchQuery, sourceLanguages]);

  const handleConfirm = async () => {
    onClose();
    if (onSelect) {
      onSelect(tempSelectedCode);
    }
    if (mode === 'app') {
      await setAppLanguage(tempSelectedCode);
    } else {
      await setChatLanguage(tempSelectedCode);
    }
  };

  const title =
    mode === 'app'
      ? t('language_modal.title_app', 'App language')
      : t('language_modal.title_chat', 'AI Deity language');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.modalOverlay,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.dialogCard,
            {
              backgroundColor: theme.isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: theme.outlineVariant,
              shadowColor: '#000000',
            },
          ]}
        >
          {/* Dialog Title */}
          <View style={styles.dialogHeader}>
            <Text
              style={[
                styles.dialogTitle,
                { color: theme.text, fontFamily: serif },
              ]}
            >
              {title}
            </Text>
          </View>

          {/* Quick Search */}
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: theme.isDark ? '#2A2A2A' : '#F4F4F5',
                borderColor: theme.outlineVariant,
              },
            ]}
          >
            <Text style={{ marginRight: 6, fontSize: 14, color: theme.textSecondary }}>🔍</Text>
            <TextInput
              style={[
                styles.searchInput,
                { color: theme.text, fontFamily: body },
              ]}
              placeholder={t('language_modal.search_placeholder', 'Search language...')}
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={{ color: theme.textTertiary, paddingHorizontal: 4 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Radio List */}
          <ScrollView
            style={styles.radioListScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* System Default / Auto option for Chat Mode */}
            {mode === 'chat' && !searchQuery && (
              <TouchableOpacity
                style={styles.radioRow}
                onPress={() => setTempSelectedCode('auto')}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radioOuter,
                    {
                      borderColor:
                        tempSelectedCode === 'auto'
                          ? theme.primary
                          : theme.outlineVariant,
                    },
                  ]}
                >
                  {tempSelectedCode === 'auto' && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: theme.primary },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.radioTextContainer}>
                  <Text
                    style={[
                      styles.radioLabel,
                      {
                        color: theme.text,
                        fontFamily: tempSelectedCode === 'auto' ? label : body,
                      },
                    ]}
                  >
                    {t('language_modal.auto_option', 'System default (App language)')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Language Options with Radio Buttons */}
            {filteredLanguages.map((item) => {
              const isSelected = tempSelectedCode === item.code;

              return (
                <TouchableOpacity
                  key={item.code}
                  style={styles.radioRow}
                  onPress={() => setTempSelectedCode(item.code)}
                  activeOpacity={0.7}
                >
                  {/* Radio Circle */}
                  <View
                    style={[
                      styles.radioOuter,
                      {
                        borderColor: isSelected
                          ? theme.primary
                          : (theme.isDark ? '#666666' : '#9E9E9E'),
                      },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[
                          styles.radioInner,
                          { backgroundColor: theme.primary },
                        ]}
                      />
                    )}
                  </View>

                  {/* Radio Text Info */}
                  <View style={styles.radioTextContainer}>
                    <Text
                      style={[
                        styles.radioLabel,
                        {
                          color: theme.text,
                          fontFamily: isSelected ? label : body,
                        },
                      ]}
                    >
                      {item.nativeName}
                    </Text>
                    {item.name !== item.nativeName && (
                      <Text
                        style={[
                          styles.radioSubLabel,
                          { color: theme.secondary, fontFamily: body },
                        ]}
                      >
                        {item.name}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Dialog Action Buttons (OK / Cancel) */}
          <View
            style={[
              styles.dialogActions,
              { borderTopColor: theme.outlineVariant },
            ]}
          >
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.cancelBtnText,
                  { color: theme.secondary, fontFamily: label },
                ]}
              >
                {t('common.cancel', 'Cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.confirmBtn,
                { backgroundColor: theme.primaryContainer },
              ]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.confirmBtnText,
                  { color: theme.onPrimaryContainer, fontFamily: label },
                ]}
              >
                {t('common.confirm', 'OK')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '82%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  dialogHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  radioListScroll: {
    paddingHorizontal: 16,
    maxHeight: 340,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radioLabel: {
    fontSize: 16,
  },
  radioSubLabel: {
    fontSize: 13,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  actionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
  },
  confirmBtn: {
    elevation: 1,
  },
  cancelBtnText: {
    fontSize: 14,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
