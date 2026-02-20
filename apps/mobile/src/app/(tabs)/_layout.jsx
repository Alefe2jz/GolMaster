import { Tabs } from "expo-router";
import { Trophy, Users, Settings, Home } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import { api } from "@/services/api";

export default function TabLayout() {
  const { isAuthenticated } = useAuth();
  const { data: settingsData } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      if (!isAuthenticated) return { settings: { language: "pt" } };
      const response = await api.get("/user-settings");
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const language = settingsData?.settings?.language || "pt";
  const labels =
    language === "en"
      ? {
          games: "Games",
          predictions: "Predictions",
          friends: "Friends",
          settings: "Settings",
        }
      : {
          games: "Jogos",
          predictions: "Palpites",
          friends: "Amigos",
          settings: "Configuracoes",
        };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderColor: "#E5E7EB",
          paddingTop: 4,
        },
        tabBarActiveTintColor: "#16A34A", // Green
        tabBarInactiveTintColor: "#6B7280",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: labels.games,
          tabBarIcon: ({ color, size }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="predictions"
        options={{
          title: labels.predictions,
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: labels.friends,
          tabBarIcon: ({ color, size }) => <Users color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: labels.settings,
          tabBarIcon: ({ color, size }) => <Settings color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
