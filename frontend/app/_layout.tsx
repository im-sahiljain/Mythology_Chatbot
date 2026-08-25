import { useEffect } from "react";
import { Platform, Alert } from "react-native";
import { Stack, useNavigationContainerRef } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider } from "../src/context/ThemeContext";
import { LanguageProvider } from "../src/context/LanguageContext";
import { CharacterProvider } from "../src/context/CharacterContext";
import { FirstLaunchLanguageModal } from "../src/components/FirstLaunchLanguageModal";
import "../src/i18n";
import {
  useFonts,
  EBGaramond_700Bold,
  EBGaramond_600SemiBold,
} from "@expo-google-fonts/eb-garamond";
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from "@expo-google-fonts/hanken-grotesk";

SplashScreen.preventAutoHideAsync();

if (Platform.OS === "web" && typeof document !== "undefined") {
  const linkId = "google-fonts-stitch";
  if (!document.getElementById(linkId)) {
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,600;0,700;0,800;1,600;1,700&family=Hanken+Grotesk:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap";
    document.head.appendChild(link);
  }

  const scrollbarStyleId = "hide-scrollbar-style";
  if (!document.getElementById(scrollbarStyleId)) {
    const style = document.createElement("style");
    style.id = scrollbarStyleId;
    style.textContent = `
      *::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      * {
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
      }
      .show-scrollbar::-webkit-scrollbar,
      .show-scrollbar *::-webkit-scrollbar {
        display: block !important;
        width: 6px !important;
        height: 6px !important;
      }
      .show-scrollbar::-webkit-scrollbar-track,
      .show-scrollbar *::-webkit-scrollbar-track {
        background: transparent !important;
      }
      .show-scrollbar::-webkit-scrollbar-thumb,
      .show-scrollbar *::-webkit-scrollbar-thumb {
        background-color: rgba(155, 155, 155, 0.45) !important;
        border-radius: 20px !important;
      }
      .show-scrollbar,
      .show-scrollbar * {
        -ms-overflow-style: auto !important;
        scrollbar-width: thin !important;
        scrollbar-color: rgba(155, 155, 155, 0.45) transparent !important;
      }
    `;
    document.head.appendChild(style);
  }
}

function RootLayout() {
  const navigationRef = useNavigationContainerRef();
  const [fontsLoaded, fontError] = useFonts({
    EBGaramond_700Bold,
    EBGaramond_600SemiBold,
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (__DEV__ || Platform.OS === "web") return;

    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            "✨ Update Ready",
            "A new update has been downloaded. Restart the app now to apply changes?",
            [
              { text: "Later", style: "cancel" },
              {
                text: "Restart Now",
                onPress: async () => {
                  try {
                    await Updates.reloadAsync();
                  } catch (e) {
                    // Fallback if reloadAsync fails
                  }
                },
              },
            ],
          );
        }
      } catch {
        // Ignore network / update check failures
      }
    })();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <CharacterProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
              </Stack>
            </CharacterProvider>
            <FirstLaunchLanguageModal />
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default RootLayout;
