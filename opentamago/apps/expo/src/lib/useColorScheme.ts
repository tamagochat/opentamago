import { useColorScheme as useNativeColorScheme } from "react-native";

export function useColorScheme() {
  const colorScheme = useNativeColorScheme();
  return {
    colorScheme: colorScheme ?? "light",
    isDarkColorScheme: colorScheme === "dark",
  };
}
