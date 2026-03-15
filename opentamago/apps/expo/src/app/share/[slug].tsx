import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";

import { useDownloader } from "~/hooks/use-downloader";

export default function DownloadScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [password, setPassword] = useState("");

  const {
    channel,
    isLoadingChannel,
    status,
    progress,
    error,
    fileInfo,
    connect,
  } = useDownloader(slug ?? "");

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <SafeAreaView className="bg-background flex-1">
      <Stack.Screen options={{ title: "Download File" }} />
      <View className="flex-1 p-4">
        <Text className="text-foreground text-2xl font-bold mb-4">
          Download File
        </Text>

        {isLoadingChannel && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#c03484" />
            <Text className="text-foreground mt-2">Looking up channel...</Text>
          </View>
        )}

        {!isLoadingChannel && !channel && (
          <View className="items-center py-8">
            <Text className="text-foreground text-lg">Channel not found</Text>
            <Text className="text-foreground/60 mt-2">
              The share link may have expired or is invalid.
            </Text>
          </View>
        )}

        {channel && status === "idle" && (
          <View className="gap-4">
            <View className="bg-muted rounded-lg p-4">
              <Text className="text-foreground font-semibold">
                {channel.fileName ?? "File available"}
              </Text>
              {channel.fileSize ? (
                <Text className="text-foreground/60">
                  {formatSize(channel.fileSize)}
                </Text>
              ) : null}
            </View>

            {channel.hasPassword && (
              <View>
                <Text className="text-foreground mb-1">
                  This file is password protected
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-foreground"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  secureTextEntry
                />
              </View>
            )}

            <Pressable
              onPress={() => connect(password || undefined)}
              className="bg-primary rounded-lg p-4 items-center"
            >
              <Text className="text-white text-lg font-semibold">
                Download
              </Text>
            </Pressable>
          </View>
        )}

        {status === "connecting" && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#c03484" />
            <Text className="text-foreground mt-2">Connecting to peer...</Text>
          </View>
        )}

        {status === "authenticating" && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#c03484" />
            <Text className="text-foreground mt-2">Authenticating...</Text>
          </View>
        )}

        {status === "downloading" && (
          <View className="gap-4">
            {fileInfo && (
              <View className="bg-muted rounded-lg p-4">
                <Text className="text-foreground font-semibold">
                  {fileInfo.name}
                </Text>
                <Text className="text-foreground/60">
                  {formatSize(fileInfo.size)}
                </Text>
              </View>
            )}

            <View className="bg-muted rounded-lg p-4">
              <Text className="text-foreground font-semibold mb-2">
                Downloading... {progress}%
              </Text>
              <View className="bg-gray-300 rounded-full h-3">
                <View
                  className="bg-primary rounded-full h-3"
                  style={{ width: `${progress}%` }}
                />
              </View>
            </View>
          </View>
        )}

        {status === "complete" && (
          <View className="items-center py-8">
            <Text className="text-green-500 text-4xl mb-4">✓</Text>
            <Text className="text-foreground text-xl font-semibold">
              Download Complete
            </Text>
            {fileInfo && (
              <Text className="text-foreground/60 mt-2">
                {fileInfo.name}
              </Text>
            )}
          </View>
        )}

        {status === "error" && (
          <View className="items-center py-8">
            <Text className="text-red-500 text-xl font-semibold mb-2">
              Error
            </Text>
            <Text className="text-foreground/60">{error}</Text>
            <Pressable
              onPress={() => connect(password || undefined)}
              className="bg-primary rounded-lg px-6 py-3 mt-4"
            >
              <Text className="text-white font-semibold">Retry</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
