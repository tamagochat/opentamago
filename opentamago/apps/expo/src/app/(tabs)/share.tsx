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
import * as DocumentPicker from "expo-document-picker";

import { usePeer } from "~/hooks/use-peer";
import { useUploader } from "~/hooks/use-uploader";

export default function ShareScreen() {
  const [file, setFile] = useState<{
    uri: string;
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const { peer, peerId, error: peerError, isLoading: peerLoading } = usePeer("p2p");
  const {
    channelInfo,
    connections,
    createChannel,
    destroyChannel,
    isCreating,
  } = useUploader({
    peer,
    peerId,
    file,
    password: password || undefined,
  });

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setFile({
        uri: asset.uri,
        name: asset.name,
        size: asset.size ?? 0,
        type: asset.mimeType ?? "application/octet-stream",
      });
    }
  };

  const startSharing = async () => {
    setIsSharing(true);
    await createChannel();
  };

  const stopSharing = () => {
    destroyChannel();
    setIsSharing(false);
    setFile(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <SafeAreaView className="bg-background flex-1" edges={["bottom"]}>
      <ScrollView className="flex-1 p-4">
        <Text className="text-foreground text-2xl font-bold mb-4">
          P2P File Share
        </Text>

        {peerLoading && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#c03484" />
            <Text className="text-foreground mt-2">Connecting to peer network...</Text>
          </View>
        )}

        {peerError && (
          <Text className="text-red-500 mb-4">Error: {peerError}</Text>
        )}

        {!isSharing && !channelInfo && (
          <View className="gap-4">
            {/* File picker */}
            <Pressable
              onPress={pickFile}
              className="bg-muted rounded-lg p-6 items-center border-2 border-dashed border-gray-400"
            >
              {file ? (
                <View className="items-center">
                  <Text className="text-foreground text-lg font-semibold">
                    {file.name}
                  </Text>
                  <Text className="text-foreground/60 mt-1">
                    {formatSize(file.size)}
                  </Text>
                  <Text className="text-primary mt-2">Tap to change file</Text>
                </View>
              ) : (
                <View className="items-center">
                  <Text className="text-foreground text-lg">Select a file to share</Text>
                  <Text className="text-foreground/60 mt-1">Tap to browse</Text>
                </View>
              )}
            </Pressable>

            {/* Password input */}
            <View>
              <Text className="text-foreground mb-1">Password (optional)</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-foreground"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password to protect file"
                secureTextEntry
              />
            </View>

            {/* Start sharing button */}
            <Pressable
              onPress={startSharing}
              disabled={!file || !peerId || isCreating}
              className={`rounded-lg p-4 items-center ${
                file && peerId ? "bg-primary" : "bg-gray-400"
              }`}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-lg font-semibold">
                  Start Sharing
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Sharing active */}
        {channelInfo && (
          <View className="gap-4">
            <View className="bg-muted rounded-lg p-4">
              <Text className="text-foreground font-semibold mb-2">
                Share Code
              </Text>
              <Text className="text-primary text-2xl font-mono font-bold text-center py-2">
                {channelInfo.shortSlug}
              </Text>
              <Text className="text-foreground/60 text-center text-sm mt-1">
                or use: {channelInfo.longSlug}
              </Text>
            </View>

            {file && (
              <View className="bg-muted rounded-lg p-4">
                <Text className="text-foreground font-semibold">
                  {file.name}
                </Text>
                <Text className="text-foreground/60">
                  {formatSize(file.size)}
                </Text>
              </View>
            )}

            {/* Connections */}
            <View>
              <Text className="text-foreground font-semibold mb-2">
                Connections ({connections.length})
              </Text>
              {connections.length === 0 ? (
                <Text className="text-foreground/60">
                  Waiting for someone to connect...
                </Text>
              ) : (
                connections.map((conn, i) => (
                  <View
                    key={i}
                    className="bg-muted rounded-lg p-3 mb-2 flex-row justify-between items-center"
                  >
                    <View>
                      <Text className="text-foreground">
                        {conn.browserName ?? conn.osName ?? "Unknown"}
                      </Text>
                      <Text className="text-foreground/60 text-sm">
                        {conn.status}
                      </Text>
                    </View>
                    {conn.status === "uploading" && (
                      <Text className="text-primary font-bold">
                        {conn.progress}%
                      </Text>
                    )}
                    {conn.status === "done" && (
                      <Text className="text-green-500 font-bold">Done</Text>
                    )}
                  </View>
                ))
              )}
            </View>

            {/* Stop sharing */}
            <Pressable
              onPress={stopSharing}
              className="bg-red-500 rounded-lg p-4 items-center"
            >
              <Text className="text-white text-lg font-semibold">
                Stop Sharing
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
