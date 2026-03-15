import { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { usePeer } from "~/hooks/use-peer";
import { useConnectSession } from "~/hooks/use-connect-session";

export default function ConnectScreen() {
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [characterName, setCharacterName] = useState("");
  const [joinSlug, setJoinSlug] = useState("");
  const [password, setPassword] = useState("");

  const { peerId, error: peerError, isLoading: peerLoading } = usePeer("connect");
  const { createSession, isCreating } = useConnectSession();

  const handleCreate = async () => {
    if (!peerId || !characterName.trim()) return;
    try {
      const session = await createSession({
        hostPeerId: peerId,
        characterName: characterName.trim(),
        password: password || undefined,
      });
      router.push({
        pathname: "/connect/[slug]",
        params: {
          slug: session.shortSlug,
          isHost: "true",
          characterName: characterName.trim(),
        },
      });
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const handleJoin = () => {
    if (!joinSlug.trim()) return;
    router.push({
      pathname: "/connect/[slug]",
      params: {
        slug: joinSlug.trim(),
        isHost: "false",
        characterName: characterName.trim() || "Guest",
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView className="flex-1 p-4" contentContainerClassName="gap-4">
        <Text className="text-2xl font-bold">P2P Connect</Text>

        {peerLoading && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" />
            <Text className="text-muted-foreground mt-2">
              Connecting to peer network...
            </Text>
          </View>
        )}

        {peerError && (
          <Card className="border-destructive">
            <CardContent className="p-4">
              <Text className="text-destructive">Error: {peerError}</Text>
            </CardContent>
          </Card>
        )}

        {mode === "menu" && (
          <>
            <Button className="h-auto py-6" onPress={() => setMode("create")}>
              <View className="items-center">
                <Text className="text-xl font-semibold">Create Session</Text>
                <Text className="text-primary-foreground/70 mt-1 text-sm">
                  Host a new chat room
                </Text>
              </View>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6"
              onPress={() => setMode("join")}
            >
              <View className="items-center">
                <Text className="text-xl font-semibold">Join Session</Text>
                <Text className="text-muted-foreground mt-1 text-sm">
                  Enter a code or scan QR
                </Text>
              </View>
            </Button>
          </>
        )}

        {mode === "create" && (
          <>
            <Button variant="ghost" onPress={() => setMode("menu")} size="sm">
              <Text className="text-primary">Back</Text>
            </Button>

            <View className="gap-1.5">
              <Label>Your Character Name *</Label>
              <Input
                value={characterName}
                onChangeText={setCharacterName}
                placeholder="Enter your character name"
              />
            </View>

            <View className="gap-1.5">
              <Label>Password (optional)</Label>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="Set a room password"
                secureTextEntry
              />
            </View>

            <Button
              onPress={handleCreate}
              disabled={!characterName.trim() || !peerId || isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text>Create Room</Text>
              )}
            </Button>
          </>
        )}

        {mode === "join" && (
          <>
            <Button variant="ghost" onPress={() => setMode("menu")} size="sm">
              <Text className="text-primary">Back</Text>
            </Button>

            <View className="gap-1.5">
              <Label>Your Character Name</Label>
              <Input
                value={characterName}
                onChangeText={setCharacterName}
                placeholder="Enter your character name"
              />
            </View>

            <View className="gap-1.5">
              <Label>Room Code *</Label>
              <Input
                value={joinSlug}
                onChangeText={setJoinSlug}
                placeholder="Enter room code"
                autoCapitalize="none"
              />
            </View>

            <Button
              variant="secondary"
              onPress={() => router.push("/qr-scanner")}
            >
              <Text>Scan QR Code Instead</Text>
            </Button>

            <Button onPress={handleJoin} disabled={!joinSlug.trim()}>
              <Text>Join Room</Text>
            </Button>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
