import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";

import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { authClient } from "~/utils/auth";

function MobileAuth() {
  const { data: session } = authClient.useSession();

  return (
    <Card>
      <CardContent className="p-4 items-center gap-3">
        <Text className="text-lg font-semibold">
          {session?.user.name
            ? `Hello, ${session.user.name}`
            : "Welcome to Open Tamago"}
        </Text>
        <Text className="text-muted-foreground text-sm text-center">
          {session
            ? "You're signed in and ready to go."
            : "Sign in to sync your data across devices."}
        </Text>
        <Button
          variant={session ? "outline" : "default"}
          className="w-full"
          onPress={() =>
            session
              ? authClient.signOut()
              : authClient.signIn.social({
                  provider: "discord",
                  callbackURL: "/",
                })
          }
        >
          <Text>{session ? "Sign Out" : "Sign In With Discord"}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <CardContent className="p-4 flex-row items-center gap-4">
          <View className="w-12 h-12 rounded-2xl bg-primary/15 items-center justify-center">
            <Text className="text-primary text-xl font-bold">{icon}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold">{title}</Text>
            <Text className="text-muted-foreground text-sm mt-0.5">
              {description}
            </Text>
          </View>
          <Text className="text-muted-foreground text-lg">›</Text>
        </CardContent>
      </Card>
    </Pressable>
  );
}

export default function Home() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4 pb-8"
    >
      <MobileAuth />

      {/* Features */}
      <View>
        <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Features
        </Text>
        <View className="gap-3">
          <FeatureCard
            icon="S"
            title="P2P File Share"
            description="Send files directly between devices with no server in between"
            onPress={() => router.push("/(tabs)/share")}
          />
          <FeatureCard
            icon="D"
            title="Download"
            description="Scan a QR code or enter a share code to receive files"
            onPress={() => router.push("/(tabs)/download")}
          />
          <FeatureCard
            icon="C"
            title="P2P Connect"
            description="Create multi-character chat rooms with friends"
            onPress={() => router.push("/(tabs)/connect")}
          />
        </View>
      </View>
    </ScrollView>
  );
}
