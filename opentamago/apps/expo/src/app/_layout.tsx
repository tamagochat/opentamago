import "../utils/webrtc-polyfill";

import { useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";

import { queryClient } from "~/utils/api";
import { NAV_THEME } from "~/lib/theme";

import "../styles.css";

const LIGHT_THEME = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};

const DARK_THEME = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={isDark ? DARK_THEME : LIGHT_THEME}>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: isDark
                ? NAV_THEME.dark.card
                : NAV_THEME.light.primary,
            },
            headerTintColor: isDark
              ? NAV_THEME.dark.text
              : NAV_THEME.light.card,
            contentStyle: {
              backgroundColor: isDark
                ? NAV_THEME.dark.background
                : NAV_THEME.light.background,
            },
          }}
        />
        <StatusBar style={isDark ? "light" : "dark"} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
