import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";

import type { ChatMessageType, SystemMessageType } from "@acme/p2p/messages";

import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { usePeer } from "~/hooks/use-peer";
import { useConnectPeers } from "~/hooks/use-connect-peers";
import { useConnectSession } from "~/hooks/use-connect-session";

type ChatItem = ChatMessageType | SystemMessageType;

export default function ChatRoom() {
  const params = useLocalSearchParams<{
    slug: string;
    isHost: string;
    characterName: string;
  }>();

  const slug = params.slug ?? "";
  const isHost = params.isHost === "true";
  const characterName = params.characterName ?? "Guest";

  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const { peer, peerId } = usePeer("connect");
  const { session, joinSession } = useConnectSession();

  const character = { name: characterName };

  const { peers, messages, typingPeers, sendMessage, sendTyping } =
    useConnectPeers({
      peer,
      peerId,
      isHost,
      character,
      hostPeerId: isHost ? undefined : session?.hostPeerId,
    });

  const hasJoinedRef = useRef(false);
  if (!isHost && peerId && !hasJoinedRef.current) {
    hasJoinedRef.current = true;
    void joinSession({ slug, peerId, characterName });
  }

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
              {item.characterName}{" "}
              {item.event === "joined" ? "joined" : "left"} the room
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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: `Room: ${slug}`,
          headerRight: () => (
            <Badge variant="secondary" className="mr-2">
              <Text>{peers.length + 1} online</Text>
            </Badge>
          ),
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Participants */}
        <View className="px-4 py-2 bg-card border-b border-border flex-row flex-wrap gap-2">
          <Badge>
            <Text>{characterName} (you)</Text>
          </Badge>
          {peers
            .filter((p) => p.character)
            .map((p) => (
              <Badge key={p.peerId} variant="outline">
                <Text>{p.character!.name}</Text>
              </Badge>
            ))}
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => {
            if (item.type === "SystemMessage") return `sys-${item.timestamp}`;
            return item.id;
          }}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 8 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Typing */}
        {typingPeers.size > 0 && (
          <View className="px-4 pb-1">
            <Text className="text-muted-foreground text-sm italic">
              Someone is typing...
            </Text>
          </View>
        )}

        {/* Input bar */}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
