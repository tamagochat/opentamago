import { Text as RNText, useColorScheme } from "react-native";
import { Tabs } from "expo-router";

import { NAV_THEME } from "~/lib/theme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? NAV_THEME.dark : NAV_THEME.light;

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? theme.colors.card : theme.colors.primary,
        },
        headerTintColor: isDark ? theme.colors.text : "#fff",
        headerTitleStyle: { fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: isDark ? theme.colors.card : theme.colors.background,
          borderTopColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: isDark ? "#b99683" : "#997866",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Open Tamago",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <RNText style={{ fontSize: size - 4 }}>🏠</RNText>
          ),
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          title: "P2P Share",
          tabBarLabel: "Share",
          tabBarIcon: ({ color, size }) => (
            <RNText style={{ fontSize: size - 4 }}>📤</RNText>
          ),
        }}
      />
      <Tabs.Screen
        name="download"
        options={{
          title: "Download",
          tabBarLabel: "Download",
          tabBarIcon: ({ color, size }) => (
            <RNText style={{ fontSize: size - 4 }}>📲</RNText>
          ),
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: "P2P Connect",
          tabBarLabel: "Connect",
          tabBarIcon: ({ color, size }) => (
            <RNText style={{ fontSize: size - 4 }}>💬</RNText>
          ),
        }}
      />
    </Tabs>
  );
}
