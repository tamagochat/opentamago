import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { authClient } from "~/utils/auth";

function MobileAuth() {
  const { data: session } = authClient.useSession();

  return (
    <Card className="mt-4">
      <CardContent className="p-4 items-center gap-3">
        <Text className="text-lg font-semibold">
          {session?.user.name
            ? `Hello, ${session.user.name}`
            : "Not logged in"}
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

export default function Home() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 p-6">
        <View className="items-center gap-1">
          <Text className="text-4xl font-bold text-foreground">
            Open
            <Text className="text-primary">Tamago</Text>
          </Text>
          <Text className="text-muted-foreground text-sm">
            AI Character Interaction
          </Text>
        </View>

        <MobileAuth />

        <Separator className="my-6" />

        <View className="gap-4">
          <Card>
            <CardContent className="p-4 flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                <Text className="text-primary font-bold">S</Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold">P2P Share</Text>
                <Text className="text-muted-foreground text-sm">
                  Share files directly between devices
                </Text>
              </View>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                <Text className="text-primary font-bold">C</Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold">P2P Connect</Text>
                <Text className="text-muted-foreground text-sm">
                  Multi-character chat rooms
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>
      </View>
    </SafeAreaView>
  );
}
