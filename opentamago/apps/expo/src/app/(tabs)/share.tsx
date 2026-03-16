import { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";

import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
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

  const { peer, isReady: peerReady, error: peerError } = usePeer();
  const peerId = peer?.id ?? null;
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

        {!isSharing && !channelInfo && (
          <>
            {/* File picker */}
            <Button
              variant="outline"
              size="lg"
              onPress={pickFile}
            >
              <Text>{file ? file.name : "Select a file to share"}</Text>
            </Button>
            {file && (
              <Text className="text-muted-foreground text-sm text-center">
                {formatSize(file.size)} — Tap above to change
              </Text>
            )}

            {/* Password */}
            <View className="gap-1.5">
              <Label>Password (optional)</Label>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password to protect file"
                secureTextEntry
              />
            </View>

            {/* Start */}
            <Button
              onPress={startSharing}
              disabled={!file || !peerId || isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text>Start Sharing</Text>
              )}
            </Button>
          </>
        )}

        {/* Active sharing */}
        {channelInfo && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Share Code</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-primary text-3xl font-mono font-bold text-center py-2">
                  {channelInfo.shortSlug}
                </Text>
                <Text className="text-muted-foreground text-center text-sm">
                  or: {channelInfo.longSlug}
                </Text>
              </CardContent>
            </Card>

            {file && (
              <Card>
                <CardContent className="p-4 flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold" numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text className="text-muted-foreground text-sm">
                      {formatSize(file.size)}
                    </Text>
                  </View>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Connections */}
            <View>
              <Text className="font-semibold mb-2">
                Connections ({connections.length})
              </Text>
              {connections.length === 0 ? (
                <Text className="text-muted-foreground">
                  Waiting for someone to connect...
                </Text>
              ) : (
                connections.map((conn, i) => (
                  <Card key={i} className="mb-2">
                    <CardContent className="p-3 flex-row justify-between items-center">
                      <View>
                        <Text>
                          {conn.browserName ?? conn.osName ?? "Unknown"}
                        </Text>
                        <Badge
                          variant={
                            conn.status === "done"
                              ? "default"
                              : conn.status === "uploading"
                              ? "secondary"
                              : "outline"
                          }
                          className="mt-1 self-start"
                        >
                          <Text>{conn.status}</Text>
                        </Badge>
                      </View>
                      {conn.status === "uploading" && (
                        <View className="w-20">
                          <Progress value={conn.progress} />
                          <Text className="text-xs text-center mt-1 text-muted-foreground">
                            {conn.progress}%
                          </Text>
                        </View>
                      )}
                      {conn.status === "done" && (
                        <Badge>
                          <Text>Done</Text>
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </View>

            <Button variant="destructive" onPress={stopSharing}>
              <Text>Stop Sharing</Text>
            </Button>
          </>
        )}
    </ScrollView>
  );
}
