import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authClient } from "~/utils/auth";

function MobileAuth() {
  const { data: session } = authClient.useSession();

  return (
    <>
      <Text className="text-foreground pb-2 text-center text-xl font-semibold">
        {session?.user.name ? `Hello, ${session.user.name}` : "Not logged in"}
      </Text>
      <Pressable
        onPress={() =>
          session
            ? authClient.signOut()
            : authClient.signIn.social({
                provider: "discord",
                callbackURL: "/",
              })
        }
        className="bg-primary flex items-center rounded-sm p-2"
      >
        <Text>{session ? "Sign Out" : "Sign In With Discord"}</Text>
      </Pressable>
    </>
  );
}

export default function Home() {
  return (
    <SafeAreaView className="bg-background">
      <View className="bg-background h-full w-full p-4">
        <Text className="text-foreground pb-2 text-center text-5xl font-bold">
          Open<Text className="text-primary">Tamago</Text>
        </Text>

        <MobileAuth />

        <View className="mt-8">
          <Text className="text-foreground text-center text-lg">
            Welcome to OpenTamago! Use the tabs below to share files or connect with others.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
