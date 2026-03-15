import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { usePeer } from "~/hooks/use-peer";
import { useConnectSession } from "~/hooks/use-connect-session";

export default function ConnectScreen() {
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [characterName, setCharacterName] = useState("");
  const [joinSlug, setJoinSlug] = useState("");
  const [password, setPassword] = useState("");

  const { peer, peerId, error: peerError, isLoading: peerLoading } = usePeer("connect");
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
    <SafeAreaView className="bg-background flex-1" edges={["bottom"]}>
      <ScrollView className="flex-1 p-4">
        <Text className="text-foreground text-2xl font-bold mb-4">
          P2P Connect
        </Text>

        {peerLoading && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#c03484" />
            <Text className="text-foreground mt-2">
              Connecting to peer network...
            </Text>
          </View>
        )}

        {peerError && (
          <Text className="text-red-500 mb-4">Error: {peerError}</Text>
        )}

        {mode === "menu" && (
          <View className="gap-4 mt-4">
            <Pressable
              onPress={() => setMode("create")}
              className="bg-primary rounded-lg p-6 items-center"
            >
              <Text className="text-white text-xl font-semibold">
                Create Session
              </Text>
              <Text className="text-white/70 mt-1">
                Host a new chat room
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode("join")}
              className="bg-muted rounded-lg p-6 items-center border-2 border-primary"
            >
              <Text className="text-foreground text-xl font-semibold">
                Join Session
              </Text>
              <Text className="text-foreground/60 mt-1">
                Enter a code or scan QR
              </Text>
            </Pressable>
          </View>
        )}

        {mode === "create" && (
          <View className="gap-4">
            <Pressable onPress={() => setMode("menu")}>
              <Text className="text-primary">← Back</Text>
            </Pressable>

            <View>
              <Text className="text-foreground mb-1 font-semibold">
                Your Character Name *
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-foreground"
                value={characterName}
                onChangeText={setCharacterName}
                placeholder="Enter your character name"
              />
            </View>

            <View>
              <Text className="text-foreground mb-1">Password (optional)</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-foreground"
                value={password}
                onChangeText={setPassword}
                placeholder="Set a room password"
                secureTextEntry
              />
            </View>

            <Pressable
              onPress={handleCreate}
              disabled={!characterName.trim() || !peerId || isCreating}
              className={`rounded-lg p-4 items-center ${
                characterName.trim() && peerId ? "bg-primary" : "bg-gray-400"
              }`}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-lg font-semibold">
                  Create Room
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {mode === "join" && (
          <View className="gap-4">
            <Pressable onPress={() => setMode("menu")}>
              <Text className="text-primary">← Back</Text>
            </Pressable>

            <View>
              <Text className="text-foreground mb-1 font-semibold">
                Your Character Name
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-foreground"
                value={characterName}
                onChangeText={setCharacterName}
                placeholder="Enter your character name"
              />
            </View>

            <View>
              <Text className="text-foreground mb-1 font-semibold">
                Room Code *
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-foreground"
                value={joinSlug}
                onChangeText={setJoinSlug}
                placeholder="Enter room code"
                autoCapitalize="none"
              />
            </View>

            <Pressable
              onPress={() => router.push("/qr-scanner")}
              className="bg-muted rounded-lg p-3 items-center"
            >
              <Text className="text-foreground">Scan QR Code Instead</Text>
            </Pressable>

            <Pressable
              onPress={handleJoin}
              disabled={!joinSlug.trim()}
              className={`rounded-lg p-4 items-center ${
                joinSlug.trim() ? "bg-primary" : "bg-gray-400"
              }`}
            >
              <Text className="text-white text-lg font-semibold">
                Join Room
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
