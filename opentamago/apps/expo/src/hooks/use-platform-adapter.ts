import { Dimensions, PixelRatio, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import type { PlatformAdapter } from "@acme/p2p/platform-adapter";
import { getOrCreateDeviceId } from "@acme/p2p/platform-adapter";

const storage = {
  get(key: string): string | null {
    return SecureStore.getItem(key);
  },
  set(key: string, value: string): void {
    SecureStore.setItem(key, value);
  },
};

export function useExpoPlatformAdapter(): PlatformAdapter {
  return {
    getDeviceId: () => getOrCreateDeviceId(storage),
    getDeviceName: () => `${Platform.OS} Device`,
    getPlatform: () => (Platform.OS === "ios" ? "iOS" : "Android"),
    getOS: () => `${Platform.OS} ${Platform.Version}`,
    getAppVersion: () => "0.1.0",
    getScreenInfo: () => {
      const { width, height } = Dimensions.get("window");
      return { width, height, scale: PixelRatio.get() };
    },
  };
}
