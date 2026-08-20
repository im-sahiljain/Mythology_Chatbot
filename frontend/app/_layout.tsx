import { Platform } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "../src/context/ThemeContext";
import { useFonts, EBGaramond_700Bold, EBGaramond_600SemiBold } from '@expo-google-fonts/eb-garamond';
import { HankenGrotesk_400Regular, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const linkId = 'google-fonts-stitch';
  if (!document.getElementById(linkId)) {
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,600;0,700;0,800;1,600;1,700&family=Hanken+Grotesk:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap';
    document.head.appendChild(link);
  }

  const scrollbarStyleId = 'hide-scrollbar-style';
  if (!document.getElementById(scrollbarStyleId)) {
    const style = document.createElement('style');
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
    `;
    document.head.appendChild(style);
  }
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    EBGaramond_700Bold,
    EBGaramond_600SemiBold,
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}