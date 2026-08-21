import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, {
  APP_LANGUAGE_KEY,
  CHAT_LANGUAGE_KEY,
  FIRST_LAUNCH_KEY,
  detectDeviceLanguage,
  getSyncInitialLanguage,
  getSyncInitialChatLanguage,
  initI18n,
} from '../i18n';
import { ALL_LANGUAGES, LanguageOption, getLanguageByCode } from '../i18n/languages';
import { apiService, ServerLanguageConfig } from '../services/api';
import { supabase } from '../services/supabase';

interface LanguageContextType {
  appLanguage: string;
  chatLanguage: string; // 'auto' or ISO code
  effectiveChatLanguage: string; // resolved ISO code passed to backend
  appLanguageOption: LanguageOption;
  chatLanguageOption: LanguageOption;
  setAppLanguage: (code: string) => Promise<void>;
  setChatLanguage: (code: string) => Promise<void>;
  isFirstLaunch: boolean;
  completeFirstLaunch: (selectedAppLang?: string, selectedChatLang?: string) => Promise<void>;
  supportedLanguages: LanguageOption[];
  supportedAppLanguages: LanguageOption[];
  supportedChatLanguages: LanguageOption[];
  serverLanguages: ServerLanguageConfig[];
  refreshServerLanguages: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronous initialization ensures zero flash of wrong language on load/refresh
  const [appLanguage, setAppLanguageState] = useState<string>(() => getSyncInitialLanguage());
  const [chatLanguage, setChatLanguageState] = useState<string>(() => getSyncInitialChatLanguage());
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(() => Platform.OS === 'web');
  const [serverLanguages, setServerLanguages] = useState<ServerLanguageConfig[]>([]);

  const fetchServerLanguageConfigs = useCallback(async () => {
    try {
      const list = await apiService.fetchPublicLanguages();
      if (list && list.length > 0) {
        setServerLanguages(list);

        // Check if currently selected appLanguage is disabled on the server
        const currentAppConfig = list.find(l => l.code === appLanguage);
        if (currentAppConfig && !currentAppConfig.is_app_enabled && appLanguage !== 'en') {
          console.warn(`[LanguageContext] Active app language '${appLanguage}' was disabled by admin. Falling back to English.`);
          setAppLanguageState('en');
          await AsyncStorage.setItem(APP_LANGUAGE_KEY, 'en');
          await i18n.changeLanguage('en');
        }

        // Check if currently selected chatLanguage is disabled on the server
        if (chatLanguage !== 'auto') {
          const currentChatConfig = list.find(l => l.code === chatLanguage);
          if (currentChatConfig && !currentChatConfig.is_chat_enabled) {
            console.warn(`[LanguageContext] Active chat language '${chatLanguage}' was disabled by admin. Falling back to 'auto'.`);
            setChatLanguageState('auto');
            await AsyncStorage.setItem(CHAT_LANGUAGE_KEY, 'auto');
          }
        }
      }
    } catch (err) {
      console.warn('[LanguageContext] Could not load server language configs:', err);
    }
  }, [appLanguage, chatLanguage]);

  useEffect(() => {
    async function loadSettings() {
      try {
        await initI18n();

        const [savedAppLang, savedChatLang, hasCompletedSetup] = await Promise.all([
          AsyncStorage.getItem(APP_LANGUAGE_KEY),
          AsyncStorage.getItem(CHAT_LANGUAGE_KEY),
          AsyncStorage.getItem(FIRST_LAUNCH_KEY),
        ]);

        const detected = detectDeviceLanguage();
        let initialAppLang = savedAppLang || appLanguage || detected || 'en';
        let initialChatLang = savedChatLang || chatLanguage || 'auto';

        // Check if user is logged in, and sync preferences from DB
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const dbPrefs = await apiService.getUserPreferences();
          if (dbPrefs?.preferred_app_language && dbPrefs.preferred_app_language !== initialAppLang) {
            initialAppLang = dbPrefs.preferred_app_language;
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(APP_LANGUAGE_KEY, initialAppLang);
            }
            await AsyncStorage.setItem(APP_LANGUAGE_KEY, initialAppLang);
          }
          if (dbPrefs?.preferred_chat_language && dbPrefs.preferred_chat_language !== initialChatLang) {
            initialChatLang = dbPrefs.preferred_chat_language;
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(CHAT_LANGUAGE_KEY, initialChatLang);
            }
            await AsyncStorage.setItem(CHAT_LANGUAGE_KEY, initialChatLang);
          }
        }

        if (initialAppLang !== appLanguage) {
          setAppLanguageState(initialAppLang);
        }
        if (initialChatLang !== chatLanguage) {
          setChatLanguageState(initialChatLang);
        }

        if (i18n.language !== initialAppLang) {
          await i18n.changeLanguage(initialAppLang);
        }

        if (Platform.OS === 'web' && typeof document !== 'undefined') {
          document.documentElement.lang = initialAppLang;
        }

        if (!hasCompletedSetup) {
          setIsFirstLaunch(true);
        }

        // Fetch dynamic admin toggles from server
        await fetchServerLanguageConfigs();
      } catch (e) {
        console.warn('[LanguageContext] Failed to load stored language:', e);
      } finally {
        setIsReady(true);
      }
    }

    loadSettings();

    // Listen for auth state changes (e.g. user signs in)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const dbPrefs = await apiService.getUserPreferences();
          if (dbPrefs?.preferred_app_language) {
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(APP_LANGUAGE_KEY, dbPrefs.preferred_app_language);
            }
            setAppLanguageState(dbPrefs.preferred_app_language);
            await AsyncStorage.setItem(APP_LANGUAGE_KEY, dbPrefs.preferred_app_language);
            await i18n.changeLanguage(dbPrefs.preferred_app_language);
          }
          if (dbPrefs?.preferred_chat_language) {
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(CHAT_LANGUAGE_KEY, dbPrefs.preferred_chat_language);
            }
            setChatLanguageState(dbPrefs.preferred_chat_language);
            await AsyncStorage.setItem(CHAT_LANGUAGE_KEY, dbPrefs.preferred_chat_language);
          }
        } catch (err) {
          console.warn('[LanguageContext] Error syncing db preferences on sign in:', err);
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const setAppLanguage = async (code: string) => {
    try {
      // 1. Instant synchronous updates to eliminate any visual lag/flash
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(APP_LANGUAGE_KEY, code);
      }
      i18n.changeLanguage(code);
      setAppLanguageState(code);

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.documentElement.lang = code;
      }

      // 2. Async persistence in background
      await AsyncStorage.setItem(APP_LANGUAGE_KEY, code);
      apiService.updateUserPreferences(code, undefined).catch(() => {});
    } catch (e) {
      console.error('[LanguageContext] Error saving app language:', e);
    }
  };

  const setChatLanguage = async (code: string) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(CHAT_LANGUAGE_KEY, code);
      }
      setChatLanguageState(code);
      await AsyncStorage.setItem(CHAT_LANGUAGE_KEY, code);
      apiService.updateUserPreferences(undefined, code).catch(() => {});
    } catch (e) {
      console.error('[LanguageContext] Error saving chat language:', e);
    }
  };

  const completeFirstLaunch = async (selectedAppLang?: string, selectedChatLang?: string) => {
    try {
      if (selectedAppLang) {
        await setAppLanguage(selectedAppLang);
      }
      if (selectedChatLang) {
        await setChatLanguage(selectedChatLang);
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(FIRST_LAUNCH_KEY, 'true');
      }
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
      setIsFirstLaunch(false);
    } catch (e) {
      console.error('[LanguageContext] Error completing first launch:', e);
      setIsFirstLaunch(false);
    }
  };

  const effectiveChatLanguage = chatLanguage === 'auto' ? appLanguage : chatLanguage;
  const appLanguageOption = useMemo(() => getLanguageByCode(appLanguage), [appLanguage]);
  const chatLanguageOption = useMemo(() => {
    return chatLanguage === 'auto'
      ? { code: 'auto', name: 'Automatic', nativeName: `Same as App (${appLanguageOption.nativeName})`, isCommon: true }
      : getLanguageByCode(chatLanguage);
  }, [chatLanguage, appLanguageOption]);

  // Dynamically filter lists based on admin server configuration
  const supportedAppLanguages = useMemo(() => {
    if (!serverLanguages || serverLanguages.length === 0) {
      return ALL_LANGUAGES;
    }
    const enabledMap = new Set(serverLanguages.filter(l => l.is_app_enabled).map(l => l.code));
    return ALL_LANGUAGES.filter(l => enabledMap.has(l.code));
  }, [serverLanguages]);

  const supportedChatLanguages = useMemo(() => {
    if (!serverLanguages || serverLanguages.length === 0) {
      return ALL_LANGUAGES;
    }
    const enabledMap = new Set(serverLanguages.filter(l => l.is_chat_enabled).map(l => l.code));
    return ALL_LANGUAGES.filter(l => enabledMap.has(l.code));
  }, [serverLanguages]);

  const value = useMemo<LanguageContextType>(() => ({
    appLanguage,
    chatLanguage,
    effectiveChatLanguage,
    appLanguageOption,
    chatLanguageOption,
    setAppLanguage,
    setChatLanguage,
    isFirstLaunch,
    completeFirstLaunch,
    supportedLanguages: ALL_LANGUAGES,
    supportedAppLanguages,
    supportedChatLanguages,
    serverLanguages,
    refreshServerLanguages: fetchServerLanguageConfigs,
  }), [
    appLanguage,
    chatLanguage,
    effectiveChatLanguage,
    appLanguageOption,
    chatLanguageOption,
    isFirstLaunch,
    supportedAppLanguages,
    supportedChatLanguages,
    serverLanguages,
    fetchServerLanguageConfigs,
  ]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
