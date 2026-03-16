import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";

import { ConnectRoomScreen } from "~/components/connect/connect-room-screen";

export default function ChatRoomRoute() {
  const params = useLocalSearchParams<{
    slug?: string;
    isHost?: string;
    characterName?: string;
    hostPeerId?: string;
  }>();

  const slug = params.slug ?? "";
  const isHost = params.isHost === "true";
  const characterName = params.characterName ?? "Guest";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: `Room: ${slug}`,
        }}
      />
      <ConnectRoomScreen
        slug={slug}
        isHost={isHost}
        characterName={characterName}
        initialHostPeerId={params.hostPeerId ?? null}
      />
    </SafeAreaView>
  );
}
