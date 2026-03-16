import "react-native-get-random-values";

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic require for optional native module
  const { registerGlobals } = require("react-native-webrtc") as {
    registerGlobals: () => void;
  };
  registerGlobals();
  console.log("[WebRTC] Polyfill registered successfully");
} catch (e) {
  // WebRTC native module not available — needs a dev client build (not Expo Go)
  console.warn("[WebRTC] Native module not available. Run `npx expo run:ios` to build with WebRTC support.", e);
}
