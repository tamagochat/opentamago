import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";

import type { ChatMessageType, SystemMessageType } from "@acme/p2p/messages";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Text } from "~/components/ui/text";
import { useConnectPeers } from "~/hooks/use-connect-peers";
import { useConnectSession } from "~/hooks/use-connect-session";
import { usePeer } from "~/hooks/use-peer";

type ChatItem = ChatMessageType | SystemMessageType;

interface ConnectRoomScreenProps {
  slug: string;
  isHost: boolean;
  characterName: string;
  initialHostPeerId?: string | null;
  onLeave?: () => void | Promise<void>;
}

export function ConnectRoomScreen({
  slug,
  isHost,
  characterName,
  initialHostPeerId,
  onLeave,
}: ConnectRoomScreenProps) {
  const [inputText, setInputText] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [resolvedHostPeerId, setResolvedHostPeerId] = useState<string | null>(
    initialHostPeerId ?? null
  );
  const flatListRef = useRef<FlatList>(null);
  const hasJoinedRef = useRef(false);

  const { peer } = usePeer();
  const peerId = peer?.id ?? null;
  const { joinSession, isJoining } = useConnectSession();

  useEffect(() => {
    setResolvedHostPeerId(initialHostPeerId ?? null);
  }, [initialHostPeerId]);

  useEffect(() => {
    if (isHost || !peerId || resolvedHostPeerId || hasJoinedRef.current) {
      return;
    }

    hasJoinedRef.current = true;
    setJoinError(null);

    void joinSession({
      slug,
      peerId,
      characterName,
    })
      .then((result) => {
        setResolvedHostPeerId(result.hostPeerId);
      })
      .catch((error: unknown) => {
        hasJoinedRef.current = false;
        setJoinError(
          error instanceof Error ? error.message : "Failed to join room"
        );
      });
  }, [characterName, isHost, joinSession, peerId, resolvedHostPeerId, slug]);

  const character = { name: characterName };

  const { peers, messages, typingPeers, sendMessage, sendTyping } =
    useConnectPeers({
      peer,
      peerId,
      isHost,
      character,
      hostPeerId: isHost ? undefined : (resolvedHostPeerId ?? undefined),
    });

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText("");
    sendTyping(false);
  }, [inputText, sendMessage, sendTyping]);

  const renderItem = useCallback(
    ({ item }: { item: ChatItem }) => {
      if (item.type === "SystemMessage") {
        return (
          <View className="items-center py-2">
            <Text className="text-muted-foreground text-sm italic">
              {item.characterName} {item.event === "joined" ? "joined" : "left"}{" "}
              the room
            </Text>
          </View>
        );
      }

      const isOwnMessage = item.senderId === peerId;

      return (
        <View
          className={`mb-2 max-w-[80%] ${
            isOwnMessage ? "self-end" : "self-start"
          }`}
        >
          <Text className="text-muted-foreground text-xs mb-1">
            {item.characterName}
            {!item.isHuman ? " (AI)" : ""}
          </Text>
          <View
            className={`rounded-2xl px-4 py-2 ${
              isOwnMessage ? "bg-primary" : "bg-card border border-border"
            }`}
          >
            <Text
              className={
                isOwnMessage ? "text-primary-foreground" : "text-card-foreground"
              }
            >
              {item.content}
            </Text>
          </View>
        </View>
      );
    },
    [peerId]
  );

  const isResolvingJoin = !isHost && !resolvedHostPeerId;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <View className="px-4 py-3 bg-card border-b border-border flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="font-semibold">Room {slug}</Text>
          <Text className="text-muted-foreground text-sm">
            {peers.length + 1} online
          </Text>
        </View>
        <Badge variant="secondary">
          <Text>{isHost ? "Host" : "Guest"}</Text>
        </Badge>
        {onLeave ? (
          <Button variant="outline" size="sm" onPress={() => void onLeave()}>
            <Text>Leave</Text>
          </Button>
        ) : null}
      </View>

      <View className="px-4 py-2 bg-card border-b border-border flex-row flex-wrap gap-2">
        <Badge>
          <Text>{characterName} (you)</Text>
        </Badge>
        {peers
          .filter((participant) => participant.character)
          .map((participant) => (
            <Badge key={participant.peerId} variant="outline">
              <Text>{participant.character?.name ?? "Unknown"}</Text>
            </Badge>
          ))}
      </View>

      {joinError ? (
        <View className="px-4 py-4">
          <Text className="text-destructive">{joinError}</Text>
        </View>
      ) : null}

      {isResolvingJoin ? (
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" />
          <Text className="text-muted-foreground mt-3">
            {isJoining ? "Joining room..." : "Resolving room..."}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            className="flex-1 px-4"
            contentContainerStyle={{ paddingVertical: 8 }}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />

          {typingPeers.size > 0 ? (
            <View className="px-4 pb-1">
              <Text className="text-muted-foreground text-sm italic">
                Someone is typing...
              </Text>
            </View>
          ) : null}

          <View className="flex-row items-center px-4 py-2 border-t border-border bg-card gap-2">
            <Input
              className="flex-1"
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                sendTyping(text.length > 0);
              }}
              placeholder="Type a message..."
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <Button
              size="icon"
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Text className="text-primary-foreground font-bold">→</Text>
            </Button>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
