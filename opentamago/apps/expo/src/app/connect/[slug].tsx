import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";

import type { ChatMessageType, SystemMessageType } from "@acme/p2p/messages";

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

  // Join session if guest
  const hasJoinedRef = useRef(false);
  if (!isHost && peerId && !hasJoinedRef.current) {
    hasJoinedRef.current = true;
    void joinSession({
      slug,
      peerId,
      characterName,
    });
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
            <Text className="text-foreground/50 text-sm italic">
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
          <Text className="text-foreground/60 text-xs mb-1">
            {item.characterName}
            {!item.isHuman ? " (AI)" : ""}
          </Text>
          <View
            className={`rounded-2xl px-4 py-2 ${
              isOwnMessage ? "bg-primary" : "bg-muted"
            }`}
          >
            <Text
              className={isOwnMessage ? "text-white" : "text-foreground"}
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
    <SafeAreaView className="bg-background flex-1" edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: `Room: ${slug}`,
          headerRight: () => (
            <Text className="text-white mr-4">
              {peers.length + 1} online
            </Text>
          ),
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Participants bar */}
        <View className="px-4 py-2 bg-muted flex-row flex-wrap gap-2">
          <View className="bg-primary/20 rounded-full px-3 py-1">
            <Text className="text-primary text-sm">{characterName} (you)</Text>
          </View>
          {peers
            .filter((p) => p.character)
            .map((p) => (
              <View
                key={p.peerId}
                className="bg-muted rounded-full px-3 py-1 border border-gray-300"
              >
                <Text className="text-foreground text-sm">
                  {p.character!.name}
                </Text>
              </View>
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

        {/* Typing indicators */}
        {typingPeers.size > 0 && (
          <View className="px-4 pb-1">
            <Text className="text-foreground/50 text-sm italic">
              Someone is typing...
            </Text>
          </View>
        )}

        {/* Input */}
        <View className="flex-row items-center px-4 py-2 border-t border-gray-200 bg-background">
          <TextInput
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-foreground mr-2"
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              sendTyping(text.length > 0);
            }}
            placeholder="Type a message..."
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim()}
            className={`rounded-full w-10 h-10 items-center justify-center ${
              inputText.trim() ? "bg-primary" : "bg-gray-400"
            }`}
          >
            <Text className="text-white font-bold">→</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
