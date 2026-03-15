import "react-native-get-random-values";

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic require for optional native module
  const { registerGlobals } = require("react-native-webrtc") as {
    registerGlobals: () => void;
  };
  registerGlobals();
} catch {
  // WebRTC native module not available (e.g. running in Expo Go)
}
