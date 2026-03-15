import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#c03484" },
        headerTintColor: "#fff",
        tabBarActiveTintColor: "#c03484",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          title: "Share",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📤</Text>,
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: "Connect",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💬</Text>,
        }}
      />
    </Tabs>
  );
}
