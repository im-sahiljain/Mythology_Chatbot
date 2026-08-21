import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_LANGUAGES } from './languages';

import en from './locales/en.json';
import hi from './locales/hi.json';
import sa from './locales/sa.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import bn from './locales/bn.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import pa from './locales/pa.json';
import or_locale from './locales/or.json';
import as_locale from './locales/as.json';
import ur from './locales/ur.json';
import mai from './locales/mai.json';
import ks from './locales/ks.json';
import ne from './locales/ne.json';
import sd from './locales/sd.json';
import kok from './locales/kok.json';
import doi from './locales/doi.json';
import mni from './locales/mni.json';
import brx from './locales/brx.json';
import sat from './locales/sat.json';

export const APP_LANGUAGE_KEY = 'vedic_user_app_language';
export const CHAT_LANGUAGE_KEY = 'vedic_user_chat_language';
export const FIRST_LAUNCH_KEY = 'vedic_has_completed_language_setup';

export const resources = {
  en: { translation: en },
  hi: { translation: hi },
  sa: { translation: sa },
  ta: { translation: ta },
  te: { translation: te },
  bn: { translation: bn },
  mr: { translation: mr },
  gu: { translation: gu },
  kn: { translation: kn },
  ml: { translation: ml },
  pa: { translation: pa },
  or: { translation: or_locale },
  as: { translation: as_locale },
  ur: { translation: ur },
  mai: { translation: mai },
  ks: { translation: ks },
  ne: { translation: ne },
  sd: { translation: sd },
  kok: { translation: kok },
  doi: { translation: doi },
  mni: { translation: mni },
  brx: { translation: brx },
  sat: { translation: sat },
};

export const detectDeviceLanguage = (): string => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0 && locales[0]?.languageCode) {
      const code = locales[0].languageCode.toLowerCase();
      // Check if code matches any supported language
      if (ALL_LANGUAGES.some((l) => l.code === code)) {
        return code;
      }
    }
  } catch (err) {
    console.warn('[i18n] Error reading device locale:', err);
  }
  return 'en';
};

/**
 * Synchronously retrieves stored app language from localStorage (on web)
 * or device detection without waiting for async promises.
 * This guarantees zero flash of default language on page refresh.
 */
export const getSyncInitialLanguage = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(APP_LANGUAGE_KEY);
      if (saved && (resources[saved as keyof typeof resources] || ALL_LANGUAGES.some((l) => l.code === saved))) {
        return saved;
      }
    } catch (_) {}
  }
  return detectDeviceLanguage() || 'en';
};

/**
 * Synchronously retrieves stored chat language from localStorage (on web).
 */
export const getSyncInitialChatLanguage = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(CHAT_LANGUAGE_KEY);
      if (saved) return saved;
    } catch (_) {}
  }
  return 'auto';
};

// ─── Instant Synchronous Initialization ─────────────────────────
const initialSyncLng = getSyncInitialLanguage();

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources,
    lng: initialSyncLng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },
  });

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.lang = initialSyncLng;
  }
}

/**
 * Background / Async hydration for native AsyncStorage and cloud sync
 */
export const initI18n = async () => {
  let initialLanguage = getSyncInitialLanguage();

  try {
    const saved = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
    if (saved && (resources[saved as keyof typeof resources] || ALL_LANGUAGES.some((l) => l.code === saved))) {
      initialLanguage = saved;
    }
  } catch (err) {
    console.warn('[i18n] Error reading AsyncStorage language:', err);
  }

  if (i18n.language !== initialLanguage) {
    await i18n.changeLanguage(initialLanguage);
  }

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.lang = initialLanguage;
  }

  return initialLanguage;
};

export default i18n;
