import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import { Users, UserPlus, Hash, X, Check, Clock, UserMinus, Eye, Target } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { api } from "@/services/api";
import { formatDateTime, useI18n } from "@/i18n/useI18n";

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, signIn, auth } = useAuth();
  const { language, t } = useI18n();
  const queryClient = useQueryClient();
  const [friendCode, setFriendCode] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState("friends");
  const [friendPredictionsModalVisible, setFriendPredictionsModalVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendPredictionSearch, setFriendPredictionSearch] = useState("");

  const { data: friendsData } = useQuery({
    queryKey: ["friends", selectedTab],
    queryFn: async () => {
      if (!isAuthenticated) return { friends: [] };
      const status = selectedTab === "friends" ? "accepted" : "pending";
      const response = await api.get("/friends", { params: { status } });
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const {
    data: friendPredictionsData,
    isLoading: friendPredictionsLoading,
    error: friendPredictionsError,
    refetch: refetchFriendPredictions,
  } = useQuery({
    queryKey: ["friend-predictions", selectedFriend?.friendship_id],
    queryFn: async () => {
      if (!selectedFriend?.friendship_id) return { predictions: [], friend: null };
      const response = await api.get(`/friends/${selectedFriend.friendship_id}/predictions`);
      return response.data;
    },
    enabled: isAuthenticated && !!selectedFriend?.friendship_id && friendPredictionsModalVisible,
  });

  const addFriendMutation = useMutation({
    mutationFn: async (inviteCode) => {
      const response = await api.post("/friends", { friend_id: inviteCode });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      setModalVisible(false);
      setFriendCode("");
      Alert.alert(t("common.success"), t("friends.addSuccess"));
    },
    onError: (error) => {
      Alert.alert(t("common.error"), error.message);
    },
  });

  const respondFriendMutation = useMutation({
    mutationFn: async ({ friendshipId, action }) => {
      const response = await api.put(`/friends/${friendshipId}`, { action });
      return response.data;
    },
    onSuccess: (_data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      Alert.alert(
        t("common.success"),
        action === "accept" ? t("friends.friendAdded") : t("friends.inviteDeclined")
      );
    },
    onError: (error) => {
      Alert.alert(t("common.error"), error.message);
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: async (friendshipId) => {
      const response = await api.delete(`/friends/${friendshipId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      Alert.alert(t("common.success"), t("friends.friendRemoved"));
    },
    onError: (error) => {
      const message = error?.response?.data?.error || error?.message || "Request failed.";
      Alert.alert(t("common.error"), message);
    },
  });

  const friends = friendsData?.friends || [];
  const myFriendCode = auth?.user?.friendCode || "";

  const handleAddFriend = () => {
    const inviteCode = friendCode.trim().toUpperCase();
    if (!inviteCode) {
      Alert.alert(t("common.error"), t("friends.invalidCode"));
      return;
    }
    addFriendMutation.mutate(inviteCode);
  };

  const handleCopyFriendCode = async () => {
    if (!myFriendCode) {
      Alert.alert(t("common.error"), t("friends.codeUnavailable"));
      return;
    }
    await Clipboard.setStringAsync(myFriendCode);
    Alert.alert(t("friends.copiedTitle"), t("friends.copiedMessage"));
  };

  const handleFriendAction = (friendshipId, action) => {
    const message = action === "accept" ? t("friends.confirmAccept") : t("friends.confirmDecline");
    Alert.alert(t("friends.confirmTitle"), message, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: action === "accept" ? t("friends.accept") : t("friends.decline"),
        onPress: () => respondFriendMutation.mutate({ friendshipId, action }),
      },
    ]);
  };

  const handleRemoveFriend = (friendshipId, friendName) => {
    Alert.alert(
      t("friends.removeAskTitle"),
      t("friends.removeAskMessage", { name: friendName || t("friends.friendFallbackName") }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("friends.removeAction"),
          style: "destructive",
          onPress: () => removeFriendMutation.mutate(friendshipId),
        },
      ]
    );
  };

  const openFriendPredictions = (friend) => {
    setSelectedFriend(friend);
    setFriendPredictionSearch("");
    setFriendPredictionsModalVisible(true);
  };

  const closeFriendPredictions = () => {
    setFriendPredictionsModalVisible(false);
    setSelectedFriend(null);
    setFriendPredictionSearch("");
  };

  const friendPredictions = friendPredictionsData?.predictions || [];
  const normalizedFriendSearch = friendPredictionSearch.trim().toLowerCase();
  const filteredFriendPredictions = friendPredictions.filter((prediction) => {
    if (!normalizedFriendSearch) return true;
    const match = prediction.match || {};
    const haystack = [
      match.home_team_name,
      match.away_team_name,
      match.stage,
      match.stadium_name,
      match.stadium_city,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedFriendSearch);
  });

  const renderFriend = (friend) => {
    const isRequest = selectedTab === "requests";
    return (
      <View
        key={friend.friendship_id}
        style={{
          backgroundColor: "white",
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 12,
          padding: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#16A34A",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>
                  {(friend.name || friend.email || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
                  {friend.name || t("friends.userFallback")}
                </Text>
                <Text style={{ fontSize: 13, color: "#6B7280" }}>{friend.email}</Text>
              </View>
            </View>

            {!isRequest && (
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "#F3F4F6",
                  borderRadius: 8,
                  padding: 8,
                  gap: 16,
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1F2937" }}>{friend.total_predictions}</Text>
                  <Text style={{ fontSize: 11, color: "#6B7280" }}>{t("friends.statsPredictions")}</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: "#16A34A" }}>{friend.correct_predictions}</Text>
                  <Text style={{ fontSize: 11, color: "#6B7280" }}>{t("friends.statsHits")}</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: "#2563EB" }}>{friend.success_rate}%</Text>
                  <Text style={{ fontSize: 11, color: "#6B7280" }}>{t("friends.statsRate")}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {isRequest ? (
              <>
                <TouchableOpacity
                  onPress={() => handleFriendAction(friend.friendship_id, "decline")}
                  style={{ backgroundColor: "#FEE2E2", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
                >
                  <X size={16} color="#DC2626" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleFriendAction(friend.friendship_id, "accept")}
                  style={{ backgroundColor: "#DCFCE7", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
                >
                  <Check size={16} color="#16A34A" />
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>

        {!isRequest ? (
          <>
            <TouchableOpacity
              onPress={() => openFriendPredictions(friend)}
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: "#BFDBFE",
                backgroundColor: "#EFF6FF",
                borderRadius: 8,
                paddingVertical: 9,
                paddingHorizontal: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Eye size={16} color="#1D4ED8" />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#1D4ED8" }}>{t("friends.viewPredictions")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleRemoveFriend(friend.friendship_id, friend.name)}
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: "#FECACA",
                backgroundColor: "#FEF2F2",
                borderRadius: 8,
                paddingVertical: 9,
                paddingHorizontal: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <UserMinus size={16} color="#B91C1C" />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#B91C1C" }}>{t("friends.removeFriend")}</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    );
  };

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
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}>{t("friends.title")}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <Users size={64} color="#9CA3AF" />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              color: "#1F2937",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            {t("friends.loginTitle")}
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
    <KeyboardAvoidingAnimatedView style={{ flex: 1, backgroundColor: "#F9FAFB" }} behavior="padding">
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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}>{t("friends.title")}</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={{
              backgroundColor: "#16A34A",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <UserPlus size={16} color="white" />
            <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>{t("friends.add")}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", marginTop: 16, backgroundColor: "#F3F4F6", borderRadius: 8, padding: 4 }}>
          <TouchableOpacity
            onPress={() => setSelectedTab("friends")}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: "center",
              backgroundColor: selectedTab === "friends" ? "white" : "transparent",
              borderRadius: 6,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: selectedTab === "friends" ? "#1F2937" : "#6B7280" }}>
              {t("friends.tabFriends")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedTab("requests")}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: "center",
              backgroundColor: selectedTab === "requests" ? "white" : "transparent",
              borderRadius: 6,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: selectedTab === "requests" ? "#1F2937" : "#6B7280" }}>
              {t("friends.tabRequests")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 20 }}>
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            padding: 12,
            backgroundColor: "#ECFDF5",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#BBF7D0",
          }}
        >
          <Text style={{ fontSize: 12, color: "#166534", marginBottom: 6 }}>{t("friends.myCode")}</Text>
          <TouchableOpacity onPress={handleCopyFriendCode} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Hash size={16} color="#166534" />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#14532D" }}>{myFriendCode || "--"}</Text>
            <Text style={{ fontSize: 12, color: "#166534", marginLeft: "auto" }}>{t("friends.tapToCopy")}</Text>
          </TouchableOpacity>
        </View>

        {friends.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            {selectedTab === "friends" ? (
              <>
                <Users size={48} color="#9CA3AF" />
                <Text style={{ fontSize: 16, color: "#6B7280", textAlign: "center", marginTop: 16 }}>
                  {t("friends.noFriends")}
                </Text>
                <Text style={{ fontSize: 14, color: "#9CA3AF", textAlign: "center", marginTop: 4 }}>
                  {t("friends.noFriendsHint")}
                </Text>
              </>
            ) : (
              <>
                <Clock size={48} color="#9CA3AF" />
                <Text style={{ fontSize: 16, color: "#6B7280", textAlign: "center", marginTop: 16 }}>
                  {t("friends.noRequests")}
                </Text>
              </>
            )}
          </View>
        ) : (
          friends.map(renderFriend)
        )}
      </ScrollView>

      <Modal visible={friendPredictionsModalVisible} animationType="slide" transparent onRequestClose={closeFriendPredictions}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, width: "94%", maxWidth: 500, maxHeight: "86%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>{t("friends.friendPredTitle")}</Text>
                <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                  {friendPredictionsData?.friend?.name || selectedFriend?.name || t("friends.friendFallbackName")}
                </Text>
              </View>
              <TouchableOpacity onPress={closeFriendPredictions}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={friendPredictionSearch}
              onChangeText={setFriendPredictionSearch}
              placeholder={t("friends.friendPredSearch")}
              placeholderTextColor="#94A3B8"
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: "#D1D5DB",
                borderRadius: 10,
                backgroundColor: "#F8FAFC",
                color: "#111827",
                fontSize: 14,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            />

            <View
              style={{
                marginTop: 10,
                backgroundColor: "#EEF2FF",
                borderRadius: 10,
                padding: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Target size={16} color="#3730A3" />
                <Text style={{ color: "#3730A3", fontSize: 13, fontWeight: "600" }}>{t("friends.totalPredictions")}</Text>
              </View>
              <Text style={{ color: "#312E81", fontSize: 14, fontWeight: "800" }}>{friendPredictionsData?.total ?? 0}</Text>
            </View>

            <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ paddingBottom: 6 }}>
              {friendPredictionsLoading ? (
                <View style={{ paddingVertical: 30, alignItems: "center" }}>
                  <Text style={{ color: "#6B7280" }}>{t("friends.loadingPredictions")}</Text>
                </View>
              ) : friendPredictionsError ? (
                <View
                  style={{
                    padding: 12,
                    backgroundColor: "#FEE2E2",
                    borderRadius: 10,
                    borderLeftWidth: 4,
                    borderLeftColor: "#DC2626",
                  }}
                >
                  <Text style={{ fontSize: 13, color: "#991B1B" }}>{t("friends.predLoadError")}</Text>
                  <TouchableOpacity onPress={refetchFriendPredictions} style={{ marginTop: 8 }}>
                    <Text style={{ color: "#B91C1C", fontWeight: "700" }}>{t("common.tryAgain")}</Text>
                  </TouchableOpacity>
                </View>
              ) : filteredFriendPredictions.length === 0 ? (
                <View style={{ paddingVertical: 28, alignItems: "center" }}>
                  <Text style={{ color: "#6B7280" }}>
                    {friendPredictionSearch.trim() ? t("friends.noPredictionsSearch") : t("friends.noPredictions")}
                  </Text>
                </View>
              ) : (
                filteredFriendPredictions.map((prediction) => {
                  const match = prediction.match || {};
                  const status = match.status || "scheduled";
                  const hitLabel =
                    prediction.is_correct === true
                      ? { text: t("friends.hit"), bg: "#DCFCE7", color: "#166534" }
                      : prediction.is_correct === false
                      ? { text: t("friends.miss"), bg: "#FEE2E2", color: "#B91C1C" }
                      : { text: t("friends.open"), bg: "#E2E8F0", color: "#334155" };

                  return (
                    <View
                      key={prediction.id}
                      style={{
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        backgroundColor: "#FFFFFF",
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#0F172A", flex: 1, paddingRight: 8 }}>
                          {match.home_team_name} vs {match.away_team_name}
                        </Text>
                        <View style={{ backgroundColor: hitLabel.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 11, color: hitLabel.color, fontWeight: "700" }}>{hitLabel.text}</Text>
                        </View>
                      </View>

                      <Text style={{ marginTop: 6, fontSize: 12, color: "#64748B" }}>
                        {formatDateTime(match.match_date, language)}
                      </Text>

                      <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 12, color: "#334155" }}>
                          {t("friends.predLabel", {
                            home: prediction.predicted_home_score,
                            away: prediction.predicted_away_score,
                          })}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#64748B", textTransform: "capitalize" }}>{status}</Text>
                      </View>

                      {status === "finished" ? (
                        <Text style={{ marginTop: 4, fontSize: 12, color: "#0F172A", fontWeight: "600" }}>
                          {t("friends.resultLabel", { home: match.home_score, away: match.away_score })}
                        </Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ backgroundColor: "white", borderRadius: 16, padding: 24, width: "90%", maxWidth: 400 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1F2937" }}>{t("friends.addFriendTitle")}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 12 }}>{t("friends.addFriendHint")}</Text>

            <View
              style={{
                borderWidth: 2,
                borderColor: "#E5E7EB",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginBottom: 24,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Hash size={20} color="#6B7280" />
              <TextInput
                value={friendCode}
                onChangeText={setFriendCode}
                placeholder="GM-ABCD-1234"
                autoCapitalize="none"
                style={{ flex: 1, marginLeft: 12, fontSize: 16 }}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  flex: 1,
                  backgroundColor: "#F3F4F6",
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 16, color: "#6B7280" }}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddFriend}
                disabled={addFriendMutation.isPending}
                style={{
                  flex: 1,
                  backgroundColor: "#16A34A",
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                  opacity: addFriendMutation.isPending ? 0.7 : 1,
                }}
              >
                <Text style={{ fontSize: 16, color: "white", fontWeight: "600" }}>
                  {addFriendMutation.isPending ? t("friends.sending") : t("friends.sendInvite")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingAnimatedView>
  );
}
