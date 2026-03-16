import { useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";

import { ConnectRoomScreen } from "~/components/connect/connect-room-screen";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { usePeer } from "~/hooks/use-peer";
import { useConnectSession } from "~/hooks/use-connect-session";

export default function ConnectScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    joinSlug?: string;
  }>();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [characterName, setCharacterName] = useState("");
  const [joinSlug, setJoinSlug] = useState("");
  const [password, setPassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<{
    slug: string;
    isHost: boolean;
    characterName: string;
    hostPeerId: string;
    sessionId?: number;
  } | null>(null);

  const navigation = useNavigation();
  const { peer, isReady: peerReady, error: peerError } = usePeer();
  const peerId = peer?.id ?? null;
  const {
    createSession,
    joinSession,
    leaveSession,
    destroySession,
    isCreating,
    isJoining,
  } = useConnectSession();

  useEffect(() => {
    if (params.mode === "join") {
      setMode("join");
    }

    if (typeof params.joinSlug === "string" && params.joinSlug.length > 0) {
      setJoinSlug(params.joinSlug);
    }
  }, [params.joinSlug, params.mode]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: mode === "menu" ? "P2P Connect" : mode === "create" ? "Create Session" : "Join Session",
    });
  }, [mode, navigation]);

  const handleCreate = async () => {
    if (!peerId || !characterName.trim()) return;
    try {
      const session = await createSession({
        hostPeerId: peerId,
        characterName: characterName.trim(),
        password: password || undefined,
      });
      setActiveRoom({
        slug: session.shortSlug,
        isHost: true,
        characterName: characterName.trim(),
        hostPeerId: session.hostPeerId,
        sessionId: session.id,
      });
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const handleJoin = async () => {
    if (!joinSlug.trim() || !peerId) return;
    setJoinError(null);

    try {
      const result = await joinSession({
        slug: joinSlug.trim(),
        peerId,
        characterName: characterName.trim() || "Guest",
        password: joinPassword || undefined,
      });
      setActiveRoom({
        slug: joinSlug.trim(),
        isHost: false,
        characterName: characterName.trim() || "Guest",
        hostPeerId: result.hostPeerId,
        sessionId: result.sessionId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join";
      if (
        message.includes("Invalid password") ||
        message.includes("Password required")
      ) {
        setJoinError("Wrong password. Try again?");
      } else {
        setJoinError(message);
      }
    }
  };

  const handleLeaveRoom = async () => {
    if (!activeRoom || !peerId) {
      setActiveRoom(null);
      return;
    }

    try {
      if (activeRoom.isHost) {
        await destroySession(activeRoom.slug, activeRoom.hostPeerId);
      } else if (activeRoom.sessionId) {
        await leaveSession(activeRoom.sessionId, peerId);
      }
    } catch (error) {
      console.error("Failed to leave room:", error);
    } finally {
      setActiveRoom(null);
      setMode("menu");
      setJoinSlug("");
      setJoinPassword("");
      setPassword("");
      setJoinError(null);
      router.setParams({});
    }
  };

  if (activeRoom) {
    return (
      <ConnectRoomScreen
        slug={activeRoom.slug}
        isHost={activeRoom.isHost}
        characterName={activeRoom.characterName}
        initialHostPeerId={activeRoom.hostPeerId}
        onLeave={handleLeaveRoom}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4 pb-8"
    >
      {!peerReady && !peerError && (
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
            <Text className="text-destructive">Error: {peerError.message}</Text>
          </CardContent>
        </Card>
      )}

      {mode === "menu" && (
        <>
          <Button size="lg" onPress={() => setMode("create")}>
            <Text>Create Session</Text>
          </Button>

          <Button
            variant="outline"
            size="lg"
            onPress={() => setMode("join")}
          >
            <Text>Join Session</Text>
          </Button>
        </>
      )}

      {mode === "create" && (
        <>
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

          <Button variant="ghost" onPress={() => setMode("menu")}>
            <Text>Back</Text>
          </Button>
        </>
      )}

      {mode === "join" && (
        <>
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

          <View className="gap-1.5">
            <Label>Password (if required)</Label>
            <Input
              value={joinPassword}
              onChangeText={setJoinPassword}
              placeholder="Enter room password"
              secureTextEntry
            />
          </View>

          {joinError && (
            <Card className="border-destructive">
              <CardContent className="p-3">
                <Text className="text-destructive">{joinError}</Text>
              </CardContent>
            </Card>
          )}

          <Button
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/qr-scanner",
                params: { target: "connect" },
              })
            }
          >
            <Text>Scan QR Code Instead</Text>
          </Button>

          <Button
            onPress={handleJoin}
            disabled={!joinSlug.trim() || !peerId || isJoining}
          >
            {isJoining ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text>Join Room</Text>
            )}
          </Button>

          <Button variant="ghost" onPress={() => setMode("menu")}>
            <Text>Back</Text>
          </Button>
        </>
      )}
    </ScrollView>
  );
}
