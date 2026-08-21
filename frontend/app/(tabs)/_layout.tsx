import React, { useState, useRef } from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet, Platform, PanResponder } from "react-native";
import { useTheme } from "../../src/context/ThemeContext";
import { VedicDrawer } from "../../src/components/VedicDrawer";

const serif =
  Platform.OS === "web"
    ? "'EB Garamond', Georgia, serif"
    : "EBGaramond_700Bold";
const label =
  Platform.OS === "web"
    ? "'Hanken Grotesk', sans-serif"
    : "HankenGrotesk_700Bold";

export default function TabLayout() {
  const { theme } = useTheme();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Capture swipe starting from left edge on mobile
        return !drawerVisible && evt.nativeEvent.pageX < 45;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return (
          !drawerVisible &&
          evt.nativeEvent.pageX < 60 &&
          gestureState.dx > 15 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 35) {
          setDrawerVisible(true);
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <VedicDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />
      <Tabs
        screenOptions={{
          headerShown: false,
          // HIDE the bottom tab bar completely
          tabBarStyle: {
            display: "none",
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Scholar" }} />
        <Tabs.Screen name="roundtable" options={{ title: "Roundtable" }} />
        <Tabs.Screen name="full-chat" options={{ title: "Full Chat" }} />
        <Tabs.Screen name="persona" options={{ title: "Persona" }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  drawerIcon: {
    fontSize: 18,
    fontWeight: "700",
  },
});
