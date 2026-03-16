import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, Stack, useLocalSearchParams } from "expo-router";

export default function QRScanner() {
  const params = useLocalSearchParams<{
    target?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Scan QR Code" }} />
        <Text style={styles.text}>Camera permission is required to scan QR codes.</Text>
        <Pressable onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Scan QR Code" }} />
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                // Extract slug from URL or use raw data
                const slug = data.includes("/")
                  ? data.split("/").pop() ?? data
                  : data;
                if (params.target === "connect") {
                  router.replace({
                    pathname: "/connect",
                    params: {
                      mode: "join",
                      joinSlug: slug,
                    },
                  });
                  return;
                }

                router.back();
                router.push({ pathname: "/share/[slug]", params: { slug } });
              }
        }
      />
      {scanned && (
        <Pressable onPress={() => setScanned(false)} style={styles.scanAgain}>
          <Text style={styles.buttonText}>Tap to Scan Again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  text: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  button: {
    backgroundColor: "#c03484",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  scanAgain: {
    position: "absolute",
    bottom: 64,
    backgroundColor: "#c03484",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
});
