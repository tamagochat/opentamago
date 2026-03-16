import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";

import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
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
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: "Download File" }} />
      <View className="flex-1 p-4 gap-4">
        <Text className="text-2xl font-bold">Download File</Text>

        {isLoadingChannel && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" />
            <Text className="text-muted-foreground mt-2">
              Looking up channel...
            </Text>
          </View>
        )}

        {!isLoadingChannel && !channel && (
          <Card>
            <CardContent className="p-6 items-center">
              <Text className="text-lg font-semibold">Channel not found</Text>
              <Text className="text-muted-foreground mt-2 text-center">
                The share link may have expired or is invalid.
              </Text>
            </CardContent>
          </Card>
        )}

        {channel && status === "idle" && (
          <>
            <Card>
              <CardContent className="p-4">
                <Text className="font-semibold">
                  {channel.fileName ?? "File available"}
                </Text>
                {channel.fileSize ? (
                  <Text className="text-muted-foreground text-sm">
                    {formatSize(channel.fileSize)}
                  </Text>
                ) : null}
              </CardContent>
            </Card>

            {channel.hasPassword && (
              <View className="gap-1.5">
                <Label>This file is password protected</Label>
                <Input
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  secureTextEntry
                />
              </View>
            )}

            <Button onPress={() => connect(password || undefined)}>
              <Text>Download</Text>
            </Button>
          </>
        )}

        {(status === "connecting" || status === "authenticating") && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" />
            <Text className="text-muted-foreground mt-2">
              {status === "connecting"
                ? "Connecting to peer..."
                : "Authenticating..."}
            </Text>
          </View>
        )}

        {status === "downloading" && (
          <>
            {fileInfo && (
              <Card>
                <CardContent className="p-4">
                  <Text className="font-semibold">{fileInfo.name}</Text>
                  <Text className="text-muted-foreground text-sm">
                    {formatSize(fileInfo.size)}
                  </Text>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 gap-2">
                <Text className="font-semibold">
                  Downloading... {progress}%
                </Text>
                <Progress value={progress} />
              </CardContent>
            </Card>
          </>
        )}

        {status === "complete" && (
          <Card>
            <CardContent className="p-6 items-center gap-2">
              <Text className="text-primary text-4xl">✓</Text>
              <Text className="text-xl font-semibold">Download Complete</Text>
              {fileInfo && (
                <Text className="text-muted-foreground">{fileInfo.name}</Text>
              )}
            </CardContent>
          </Card>
        )}

        {status === "error" && (
          <Card className="border-destructive">
            <CardContent className="p-6 items-center gap-3">
              <Text className="text-destructive text-xl font-semibold">
                Error
              </Text>
              <Text className="text-muted-foreground">{error}</Text>
              <Button onPress={() => connect(password || undefined)}>
                <Text>Retry</Text>
              </Button>
            </CardContent>
          </Card>
        )}
      </View>
    </SafeAreaView>
  );
}
