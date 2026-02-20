import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import {
  Settings as SettingsIcon,
  Globe,
  Bell,
  LogOut,
  RefreshCw,
  ChevronRight,
} from "lucide-react-native";
import { api } from "@/services/api";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, signOut, signIn, auth } = useAuth();
  const queryClient = useQueryClient();

  // Get user from auth
  const user = auth?.user;

  // Fetch user settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      const response = await api.get("/user-settings");
      return response.data;
    },
    enabled: isAuthenticated,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings) => {
      const response = await api.put("/user-settings", settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      Alert.alert("Sucesso", "Configurações salvas!");
    },
    onError: (error) => {
      Alert.alert("Erro", error.message);
    },
  });

  // Sync FIFA data mutation
  const syncFifaMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/sync-fifa");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["user-predictions"] });
      Alert.alert("Sucesso", "Dados da FIFA sincronizados!");
    },
    onError: (error) => {
      Alert.alert("Erro", "Erro ao sincronizar dados da FIFA");
    },
  });

  const settings = settingsData?.settings;

  const handleLanguageChange = () => {
    Alert.alert("Idioma", "Escolha seu idioma preferido:", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Português",
        onPress: () => updateSettingsMutation.mutate({ language: "pt" }),
      },
      {
        text: "English",
        onPress: () => updateSettingsMutation.mutate({ language: "en" }),
      },
    ]);
  };

  const handleNotificationToggle = (enabled) => {
    updateSettingsMutation.mutate({ notifications_enabled: enabled });
  };

  const handleSyncFifa = () => {
    Alert.alert(
      "Sincronizar dados",
      "Deseja sincronizar os dados dos jogos com a FIFA?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sincronizar",
          onPress: () => syncFifaMutation.mutate(),
        },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert("Sair", "Tem certeza que deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  const getLanguageText = (lang) => {
    switch (lang) {
      case "en":
        return "English";
      case "pt":
        return "Português";
      default:
        return "Português";
    }
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightElement }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "white",
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "#F3F4F6",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        {icon}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>

      {rightElement || <ChevronRight size={20} color="#9CA3AF" />}
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <StatusBar style="dark" />

        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 16,
            paddingBottom: 16,
            backgroundColor: "white",
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}>
            ⚙️ Configurações
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
          <SettingsIcon size={64} color="#9CA3AF" />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              color: "#1F2937",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Faça login para acessar configurações
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#6B7280",
              marginTop: 8,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Entre com sua conta Google para personalizar suas configurações
          </Text>

          <TouchableOpacity
            onPress={signIn}
            style={{
              backgroundColor: "#16A34A",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 24,
            }}
          >
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
              Fazer login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: "white",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}>
          ⚙️ Configurações
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* User Profile Section */}
        {user && (
          <View style={{ marginTop: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#6B7280",
                marginHorizontal: 16,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              Perfil
            </Text>

            <View
              style={{
                backgroundColor: "white",
                marginHorizontal: 16,
                borderRadius: 12,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#16A34A",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  {user.image ? (
                    <Image
                      source={{ uri: user.image }}
                      style={{ width: 48, height: 48, borderRadius: 24 }}
                    />
                  ) : (
                    <Text
                      style={{
                        color: "white",
                        fontSize: 18,
                        fontWeight: "bold",
                      }}
                    >
                      {(user.name || user.email || "?").charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: "#1F2937",
                    }}
                  >
                    {user.name || "Usuário"}
                  </Text>
                  <Text style={{ fontSize: 14, color: "#6B7280" }}>
                    {user.email}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* App Settings */}
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#6B7280",
              marginHorizontal: 16,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Aplicativo
          </Text>

          <View
            style={{
              backgroundColor: "white",
              marginHorizontal: 16,
              borderRadius: 12,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <SettingItem
              icon={<Globe size={24} color="#6B7280" />}
              title="Idioma"
              subtitle={`Atual: ${getLanguageText(settings?.language)}`}
              onPress={handleLanguageChange}
            />

            <SettingItem
              icon={<Bell size={24} color="#6B7280" />}
              title="Notificações"
              subtitle="Receber notificações sobre jogos"
              rightElement={
                <Switch
                  value={settings?.notifications_enabled ?? true}
                  onValueChange={handleNotificationToggle}
                  trackColor={{ false: "#D1D5DB", true: "#16A34A" }}
                  thumbColor="white"
                />
              }
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#6B7280",
              marginHorizontal: 16,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Dados
          </Text>

          <View
            style={{
              backgroundColor: "white",
              marginHorizontal: 16,
              borderRadius: 12,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <SettingItem
              icon={<RefreshCw size={24} color="#6B7280" />}
              title="Sincronizar FIFA"
              subtitle="Atualizar jogos e placares"
              onPress={handleSyncFifa}
              rightElement={
                syncFifaMutation.isLoading ? (
                  <Text style={{ color: "#6B7280", fontSize: 12 }}>
                    Sincronizando...
                  </Text>
                ) : (
                  <ChevronRight size={20} color="#9CA3AF" />
                )
              }
            />
          </View>
        </View>

        {/* About */}
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#6B7280",
              marginHorizontal: 16,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Sobre
          </Text>

          <View
            style={{
              backgroundColor: "white",
              marginHorizontal: 16,
              borderRadius: 12,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>⚽</Text>
              <Text
                style={{ fontSize: 18, fontWeight: "bold", color: "#1F2937" }}
              >
                GolMaster
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6B7280",
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                Seu app para acompanhar a Copa do Mundo 2026{"\n"}
                Faça palpites, compita com amigos e divirta-se!
              </Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <View style={{ marginTop: 24, marginHorizontal: 16 }}>
          <TouchableOpacity
            onPress={handleSignOut}
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "#FEE2E2",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <LogOut size={20} color="#DC2626" />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#DC2626",
                marginLeft: 8,
              }}
            >
              Sair da conta
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
