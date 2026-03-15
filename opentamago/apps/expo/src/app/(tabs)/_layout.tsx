import { useColorScheme } from "react-native";
import { Tabs } from "expo-router";

import { NAV_THEME } from "~/lib/theme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? NAV_THEME.dark : NAV_THEME.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? theme.card : theme.background,
          borderTopColor: theme.border,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: isDark ? "#b99683" : "#997866",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <TabIcon label="H" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          title: "Share",
          tabBarIcon: ({ color }) => (
            <TabIcon label="S" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: "Connect",
          tabBarIcon: ({ color }) => (
            <TabIcon label="C" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ label, color }: { label: string; color: string }) {
  return (
    <_RNText style={{ color, fontSize: 18, fontWeight: "700" }}>
      {label}
    </_RNText>
  );
}

import { Text as _RNText } from "react-native";
