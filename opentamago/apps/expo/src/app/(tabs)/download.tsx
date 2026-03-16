import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";

import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
import { useDownloader } from "~/hooks/use-downloader";

function extractSlug(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("/")) {
    return trimmed.split("/").pop() ?? trimmed;
  }
  return trimmed;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ─── View 1: Scan QR + Enter Code ─────────────────────────

function EntryView({
  onScan,
  onSubmit,
}: {
  onScan: () => void;
  onSubmit: (slug: string) => void;
}) {
  const [urlInput, setUrlInput] = useState("");

  return (
    <>
      <Button size="lg" onPress={onScan}>
        <Text>Scan QR Code</Text>
      </Button>

      <View className="flex-row items-center gap-3">
        <Separator className="flex-1" />
        <Text className="text-muted-foreground text-sm">or</Text>
        <Separator className="flex-1" />
      </View>

      <View className="gap-1.5">
        <Label>Share URL or Code</Label>
        <Input
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="Paste URL or enter share code"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Button
        onPress={() => onSubmit(extractSlug(urlInput))}
        disabled={!urlInput.trim()}
      >
        <Text>Download</Text>
      </Button>
    </>
  );
}

// ─── View 2: Password + Connecting ─────────────────────────

function PasswordView({
  channel,
  isLoadingChannel,
  status,
  error,
  progress,
  fileInfo,
  password,
  onPasswordChange,
  onConnect,
  onRetryPassword,
  onBack,
}: {
  channel: { fileName?: string; fileSize?: number; hasPassword?: boolean } | undefined;
  isLoadingChannel: boolean;
  status: string;
  error: string | null;
  progress: number;
  fileInfo: { name: string; size: number } | null;
  password: string;
  onPasswordChange: (p: string) => void;
  onConnect: () => void;
  onRetryPassword: () => void;
  onBack: () => void;
}) {
  return (
    <>
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
            <Button className="mt-4" onPress={onBack}>
              <Text>Try Again</Text>
            </Button>
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
                onChangeText={onPasswordChange}
                placeholder="Enter password"
                secureTextEntry
              />
            </View>
          )}

          <Button onPress={onConnect}>
            <Text>Download</Text>
          </Button>

          <Button variant="ghost" onPress={onBack}>
            <Text>Back</Text>
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

      {status === "invalid-password" && (
        <>
          <Card className="border-destructive">
            <CardContent className="p-4 gap-3">
              <Text className="text-destructive font-semibold">
                Wrong password. Try again?
              </Text>
              <View className="gap-1.5">
                <Input
                  value={password}
                  onChangeText={onPasswordChange}
                  placeholder="Enter password"
                  secureTextEntry
                  autoFocus
                />
              </View>
              <Button
                onPress={onRetryPassword}
                disabled={!password}
              >
                <Text>Retry</Text>
              </Button>
            </CardContent>
          </Card>

          <Button variant="ghost" onPress={onBack}>
            <Text>Back</Text>
          </Button>
        </>
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

      {status === "error" && (
        <Card className="border-destructive">
          <CardContent className="p-6 items-center gap-3">
            <Text className="text-destructive text-xl font-semibold">
              Error
            </Text>
            <Text className="text-muted-foreground">{error}</Text>
            <View className="flex-row gap-2 mt-2">
              <Button variant="outline" onPress={onConnect}>
                <Text>Retry</Text>
              </Button>
              <Button onPress={onBack}>
                <Text>Start Over</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ─── View 3: Complete ──────────────────────────────────────

function CompleteView({
  fileInfo,
  isCharx,
  onOpenCharx,
  onReset,
}: {
  fileInfo: { name: string } | null;
  isCharx: boolean;
  onOpenCharx: () => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-6 items-center gap-2">
        <Text className="text-primary text-4xl">✓</Text>
        <Text className="text-xl font-semibold">Download Complete</Text>
        {fileInfo && (
          <Text className="text-muted-foreground">{fileInfo.name}</Text>
        )}
        <View className="gap-2 mt-4 w-full">
          {isCharx && (
            <Button onPress={onOpenCharx}>
              <Text>Open .charx</Text>
            </Button>
          )}
          <Button variant={isCharx ? "outline" : "default"} onPress={onReset}>
            <Text>Download Another</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

// ─── Main ──────────────────────────────────────────────────

export default function DownloadTab() {
  const [scanning, setScanning] = useState(false);
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");

  const [permission, requestPermission] = useCameraPermissions();

  const {
    channel,
    isLoadingChannel,
    status,
    progress,
    error,
    fileInfo,
    connect,
    retryPassword,
    downloadedFileUri,
  } = useDownloader(slug);

  const isCharx = fileInfo
    ? fileInfo.name.toLowerCase().endsWith(".charx")
    : false;

  const openCharxViewer = () => {
    if (!downloadedFileUri || !fileInfo) return;
    router.push({
      pathname: "/charx-viewer",
      params: {
        fileUri: downloadedFileUri,
        fileName: fileInfo.name,
      },
    });
  };

  const reset = () => {
    setSlug("");
    setPassword("");
  };

  // Determine which view to show
  const view =
    status === "complete"
      ? "complete"
      : slug !== ""
        ? "password"
        : "entry";

  // ─── QR Scanner fullscreen ────────────────────────────────
  if (scanning) {
    if (!permission) return <View className="flex-1 bg-black" />;

    if (!permission.granted) {
      return (
        <View className="flex-1 bg-black justify-center items-center px-8">
          <Text className="text-white text-center mb-4">
            Camera permission is required to scan QR codes.
          </Text>
          <Button onPress={requestPermission}>
            <Text>Grant Permission</Text>
          </Button>
          <Button
            variant="ghost"
            className="mt-2"
            onPress={() => setScanning(false)}
          >
            <Text className="text-white">Cancel</Text>
          </Button>
        </View>
      );
    }

    return (
      <View style={StyleSheet.absoluteFill} className="bg-black">
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => {
            setScanning(false);
            setSlug(extractSlug(data));
            setPassword("");
          }}
        />
        <View className="absolute top-16 left-0 right-0 items-center">
          <View className="bg-black/60 rounded-lg px-4 py-2">
            <Text className="text-white text-center font-semibold">
              Scan a share QR code
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setScanning(false)}
          className="absolute top-16 left-4 bg-black/60 rounded-lg px-4 py-2"
        >
          <Text className="text-white font-semibold">Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // ─── Main views ───────────────────────────────────────────
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4 pb-8"
    >
      {view === "entry" && (
        <EntryView
          onScan={() => setScanning(true)}
          onSubmit={(s) => {
            setSlug(s);
            setPassword("");
          }}
        />
      )}

      {view === "password" && (
        <PasswordView
          channel={channel}
          isLoadingChannel={isLoadingChannel}
          status={status}
          error={error}
          progress={progress}
          fileInfo={fileInfo}
          password={password}
          onPasswordChange={setPassword}
          onConnect={() => connect(password || undefined)}
          onRetryPassword={() => retryPassword(password)}
          onBack={reset}
        />
      )}

      {view === "complete" && (
        <CompleteView
          fileInfo={fileInfo}
          isCharx={isCharx}
          onOpenCharx={openCharxViewer}
          onReset={reset}
        />
      )}
    </ScrollView>
  );
}
