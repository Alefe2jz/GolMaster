import React from "react";
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
  Trash2,
  RefreshCw,
  ChevronRight,
} from "lucide-react-native";
import { api } from "@/services/api";
import { useI18n } from "@/i18n/useI18n";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, signOut, signIn, auth } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const user = auth?.user;

  const { data: settingsData } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      const response = await api.get("/user-settings");
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings) => {
      const response = await api.put("/user-settings", settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      Alert.alert(t("common.success"), t("settings.saveSuccess"));
    },
    onError: (error) => {
      Alert.alert(t("common.error"), error.message);
    },
  });

  const syncFifaMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/sync-fifa");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["user-predictions"] });
      Alert.alert(t("common.success"), t("settings.syncSuccess"));
    },
    onError: () => {
      Alert.alert(t("common.error"), t("settings.syncError"));
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete("/users/me");
      return response.data;
    },
    onSuccess: () => {
      queryClient.clear();
      signOut();
      Alert.alert(t("settings.deletedTitle"), t("settings.deletedMessage"));
    },
    onError: (error) => {
      const message = error?.response?.data?.error || error?.message || t("settings.deleteError");
      Alert.alert(t("common.error"), message);
    },
  });

  const settings = settingsData?.settings;

  const handleLanguageChange = () => {
    Alert.alert(t("settings.languageTitle"), t("settings.languagePrompt"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("language.pt"), onPress: () => updateSettingsMutation.mutate({ language: "pt" }) },
      { text: t("language.en"), onPress: () => updateSettingsMutation.mutate({ language: "en" }) },
    ]);
  };

  const handleNotificationToggle = (enabled) => {
    updateSettingsMutation.mutate({ notifications_enabled: enabled });
  };

  const handleSyncFifa = () => {
    Alert.alert(t("settings.syncTitle"), t("settings.syncPrompt"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("settings.syncAction"), onPress: () => syncFifaMutation.mutate() },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert(t("settings.signOutTitle"), t("settings.signOutPrompt"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("settings.signOut"), style: "destructive", onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t("settings.deleteTitle"), t("settings.deletePrompt"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("settings.deleteAccount"), style: "destructive", onPress: () => deleteAccountMutation.mutate() },
    ]);
  };

  const getLanguageText = (lang) => (lang === "en" ? t("language.en") : t("language.pt"));

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
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{subtitle}</Text> : null}
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
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}>{t("settings.title")}</Text>
        </View>

        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
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
            {t("settings.loginTitle")}
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 8, textAlign: "center", lineHeight: 20 }}>
            {t("settings.loginHint")}
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
            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>{t("common.login")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}>{t("settings.title")}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
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
              {t("settings.profile")}
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
                    <Image source={{ uri: user.image }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                  ) : (
                    <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>
                      {(user.name || user.email || "?").charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: "600", color: "#1F2937" }}>
                    {user.name || t("settings.userFallback")}
                  </Text>
                  <Text style={{ fontSize: 14, color: "#6B7280" }}>{user.email}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

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
            {t("settings.app")}
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
              title={t("settings.language")}
              subtitle={t("settings.languageCurrent", { language: getLanguageText(settings?.language) })}
              onPress={handleLanguageChange}
            />
            <SettingItem
              icon={<Bell size={24} color="#6B7280" />}
              title={t("settings.notifications")}
              subtitle={t("settings.notificationsHint")}
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
            {t("settings.data")}
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
              title={t("settings.syncFifa")}
              subtitle={t("settings.syncFifaHint")}
              onPress={handleSyncFifa}
              rightElement={
                syncFifaMutation.isPending ? (
                  <Text style={{ color: "#6B7280", fontSize: 12 }}>{t("settings.syncing")}</Text>
                ) : (
                  <ChevronRight size={20} color="#9CA3AF" />
                )
              }
            />
          </View>
        </View>

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
            {t("settings.about")}
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
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F2937" }}>GolMaster</Text>
              <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "center", marginTop: 4 }}>
                {t("settings.aboutText")}
              </Text>
            </View>
          </View>
        </View>

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
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#DC2626", marginLeft: 8 }}>
              {t("settings.signOut")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={deleteAccountMutation.isPending}
            style={{
              marginTop: 12,
              backgroundColor: "white",
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "#FECACA",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
              opacity: deleteAccountMutation.isPending ? 0.7 : 1,
            }}
          >
            <Trash2 size={20} color="#B91C1C" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#B91C1C", marginLeft: 8 }}>
              {deleteAccountMutation.isPending ? t("settings.deleting") : t("settings.deleteAccount")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
