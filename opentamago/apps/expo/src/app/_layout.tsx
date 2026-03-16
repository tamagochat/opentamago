import { useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@react-navigation/native";

import { queryClient } from "~/utils/api";
import { NAV_THEME } from "~/lib/theme";

import "../styles.css";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? NAV_THEME.dark : NAV_THEME.light;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={theme}>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: isDark
                ? theme.colors.card
                : theme.colors.primary,
            },
            headerTintColor: isDark
              ? theme.colors.text
              : "#fff",
            contentStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="charx-viewer" options={{ headerBackTitle: "Back" }} />
        </Stack>
        <StatusBar style={isDark ? "light" : "dark"} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
