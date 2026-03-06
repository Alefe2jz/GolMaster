import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import { Trophy, X } from "lucide-react-native";
import { api } from "@/services/api";
import { formatDateTime, useI18n } from "@/i18n/useI18n";

const EMPTY_FLAG = "🏳️";

const isMatchLocked = (match) => {
  if (!match?.match_date) return true;
  const started = new Date(match.match_date).getTime() <= Date.now();
  return started || match.status === "live" || match.status === "finished";
};

export default function PredictionsScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, signIn } = useAuth();
  const { language, t } = useI18n();
  const queryClient = useQueryClient();

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: matchesData,
    isLoading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
  } = useQuery({
    queryKey: ["upcoming-matches", language],
    queryFn: async () => {
      const response = await api.get("/matches", {
        params: { status: "scheduled", lang: language },
      });
      return response.data;
    },
  });

  const { data: predictionsData } = useQuery({
    queryKey: ["user-predictions"],
    queryFn: async () => {
      if (!isAuthenticated) return { predictions: [] };
      const response = await api.get("/predictions");
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const predictionMutation = useMutation({
    mutationFn: async ({ match_id, predicted_home_score, predicted_away_score }) => {
      const response = await api.post("/predictions", {
        match_id,
        predicted_home_score,
        predicted_away_score,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-predictions"] });
      setModalVisible(false);
      setHomeScore("");
      setAwayScore("");
      Alert.alert(t("common.success"), t("pred.saveSuccess"));
    },
    onError: (error) => {
      Alert.alert(t("common.error"), error.message || t("pred.saveError"));
    },
  });

  const removePredictionMutation = useMutation({
    mutationFn: async (matchId) => {
      const response = await api.delete(`/predictions/${matchId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-predictions"] });
      setModalVisible(false);
      setHomeScore("");
      setAwayScore("");
      Alert.alert(t("common.success"), t("pred.removeSuccess"));
    },
    onError: (error) => {
      Alert.alert(t("common.error"), error.message || t("pred.removeError"));
    },
  });

  const matches = matchesData?.matches || [];
  const predictions = predictionsData?.predictions || [];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredMatches = matches.filter((match) => {
    if (!normalizedSearch) return true;
    const haystack = [
      match.home_team_name,
      match.away_team_name,
      match.stadium_name,
      match.stadium_city,
      match.stage_label,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  const predictionMap = useMemo(
    () =>
      predictions.reduce((acc, pred) => {
        acc[pred.match_id] = pred;
        return acc;
      }, {}),
    [predictions]
  );

  const selectedPrediction = selectedMatch ? predictionMap[selectedMatch.id] : null;
  const selectedMatchLocked = selectedMatch ? isMatchLocked(selectedMatch) : false;

  const closeModal = () => {
    setModalVisible(false);
    setSelectedMatch(null);
    setHomeScore("");
    setAwayScore("");
  };

  const handleMakePrediction = (match) => {
    if (!isAuthenticated) {
      Alert.alert(t("pred.loginNeededTitle"), t("pred.loginNeededMessage"), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.login"), onPress: signIn },
      ]);
      return;
    }

    if (isMatchLocked(match)) {
      Alert.alert(t("pred.lockedTitle"), t("pred.lockedMessage"));
      return;
    }

    setSelectedMatch(match);
    const existing = predictionMap[match.id];
    if (existing) {
      setHomeScore(String(existing.predicted_home_score));
      setAwayScore(String(existing.predicted_away_score));
    } else {
      setHomeScore("");
      setAwayScore("");
    }
    setModalVisible(true);
  };

  const handleSavePrediction = () => {
    if (!selectedMatch) return;
    if (isMatchLocked(selectedMatch)) {
      Alert.alert(t("pred.lockedTitle"), t("pred.lockedMessage"));
      return;
    }

    const home = Number(homeScore);
    const away = Number(awayScore);
    if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
      Alert.alert(t("common.error"), t("pred.invalidScore"));
      return;
    }

    predictionMutation.mutate({
      match_id: selectedMatch.id,
      predicted_home_score: home,
      predicted_away_score: away,
    });
  };

  const handleRemovePrediction = () => {
    if (!selectedMatch) return;
    if (isMatchLocked(selectedMatch)) {
      Alert.alert(t("pred.lockedTitle"), t("pred.lockedMessage"));
      return;
    }

    Alert.alert(t("pred.removeAskTitle"), t("pred.removeAskMessage"), [
      { text: t("pred.back"), style: "cancel" },
      {
        text: t("pred.removeAction"),
        style: "destructive",
        onPress: () => removePredictionMutation.mutate(selectedMatch.id),
      },
    ]);
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
          <Text style={{ fontSize: 24, fontWeight: "bold" }}>{t("pred.title")}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
          <Trophy size={64} color="#9CA3AF" />
          <Text style={{ fontSize: 20, fontWeight: "600", marginTop: 16, textAlign: "center" }}>
            {t("pred.loginTitle")}
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
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}>{t("pred.title")}</Text>
        <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>{t("pred.subtitle")}</Text>
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder={t("common.searchMatches")}
          placeholderTextColor="#94A3B8"
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: "#D1D5DB",
            borderRadius: 10,
            backgroundColor: "#F9FAFB",
            color: "#111827",
            fontSize: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 20 }}>
        {matchesLoading ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>{t("pred.loadingMatches")}</Text>
          </View>
        ) : matchesError ? (
          <View
            style={{
              margin: 16,
              padding: 16,
              backgroundColor: "#FEE2E2",
              borderRadius: 12,
              borderLeftWidth: 4,
              borderLeftColor: "#DC2626",
            }}
          >
            <Text style={{ fontSize: 14, color: "#991B1B" }}>{t("pred.loadError")}</Text>
            <TouchableOpacity onPress={refetchMatches} style={{ marginTop: 10 }}>
              <Text style={{ color: "#DC2626", fontWeight: "600" }}>{t("common.tryAgain")}</Text>
            </TouchableOpacity>
          </View>
        ) : filteredMatches.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>
              {searchTerm.trim() ? t("pred.noMatchesSearch") : t("pred.noMatches")}
            </Text>
          </View>
        ) : (
          filteredMatches.map((match) => (
            <TouchableOpacity
              key={match.id}
              onPress={() => handleMakePrediction(match)}
              disabled={isMatchLocked(match)}
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
                opacity: isMatchLocked(match) ? 0.75 : 1,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937", flex: 1 }}>
                  {match.home_team_name} vs {match.away_team_name}
                </Text>
                <Text style={{ fontSize: 12, color: "#6B7280", marginLeft: 10 }}>
                  {formatDateTime(match.match_date, language)}
                </Text>
              </View>

              {predictionMap[match.id] ? (
                <View
                  style={{
                    marginTop: 10,
                    backgroundColor: "#DCFCE7",
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ color: "#166534", fontSize: 13 }}>
                    {t("pred.cardPrediction", {
                      home: predictionMap[match.id].predicted_home_score,
                      away: predictionMap[match.id].predicted_away_score,
                    })}
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    marginTop: 10,
                    backgroundColor: "#FEF3C7",
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ color: "#92400E", fontSize: 13 }}>{t("pred.touchToPredict")}</Text>
                </View>
              )}

              {isMatchLocked(match) ? (
                <View
                  style={{
                    marginTop: 8,
                    alignSelf: "flex-start",
                    backgroundColor: "#E2E8F0",
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: "#334155", fontSize: 11, fontWeight: "700" }}>{t("pred.lockedTitle")}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.55)",
            justifyContent: "center",
            paddingHorizontal: 18,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 18,
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>{t("pred.modalTitle")}</Text>
              <TouchableOpacity onPress={closeModal}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedMatch ? (
              <>
                <Text style={{ marginTop: 8, fontSize: 12, color: "#64748B" }}>
                  {formatDateTime(selectedMatch.match_date, language)}
                </Text>

                <View
                  style={{
                    marginTop: 14,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    borderRadius: 12,
                    padding: 12,
                    backgroundColor: "#F8FAFC",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <Text style={{ fontSize: 30 }}>{selectedMatch.home_team_flag || EMPTY_FLAG}</Text>
                      <Text style={{ marginTop: 4, fontSize: 13, fontWeight: "600", color: "#0F172A", textAlign: "center" }}>
                        {selectedMatch.home_team_name}
                      </Text>
                    </View>
                    <Text style={{ paddingHorizontal: 10, color: "#94A3B8", fontWeight: "700" }}>x</Text>
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <Text style={{ fontSize: 30 }}>{selectedMatch.away_team_flag || EMPTY_FLAG}</Text>
                      <Text style={{ marginTop: 4, fontSize: 13, fontWeight: "600", color: "#0F172A", textAlign: "center" }}>
                        {selectedMatch.away_team_name}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ marginBottom: 6, fontSize: 12, color: "#475569", fontWeight: "600" }}>
                      {t("pred.goalsFor", { team: selectedMatch.home_team_name })}
                    </Text>
                    <TextInput
                      value={homeScore}
                      onChangeText={setHomeScore}
                      keyboardType="number-pad"
                      placeholder="0"
                      maxLength={2}
                      style={{
                        borderWidth: 1,
                        borderColor: "#CBD5E1",
                        borderRadius: 10,
                        backgroundColor: "#FFFFFF",
                        paddingVertical: 10,
                        textAlign: "center",
                        fontSize: 20,
                        fontWeight: "700",
                        color: "#0F172A",
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ marginBottom: 6, fontSize: 12, color: "#475569", fontWeight: "600" }}>
                      {t("pred.goalsFor", { team: selectedMatch.away_team_name })}
                    </Text>
                    <TextInput
                      value={awayScore}
                      onChangeText={setAwayScore}
                      keyboardType="number-pad"
                      placeholder="0"
                      maxLength={2}
                      style={{
                        borderWidth: 1,
                        borderColor: "#CBD5E1",
                        borderRadius: 10,
                        backgroundColor: "#FFFFFF",
                        paddingVertical: 10,
                        textAlign: "center",
                        fontSize: 20,
                        fontWeight: "700",
                        color: "#0F172A",
                      }}
                    />
                  </View>
                </View>

                {selectedPrediction ? (
                  <TouchableOpacity
                    onPress={handleRemovePrediction}
                    disabled={removePredictionMutation.isPending || selectedMatchLocked}
                    style={{
                      marginTop: 14,
                      borderWidth: 1,
                      borderColor: "#FCA5A5",
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: "center",
                      backgroundColor: "#FEF2F2",
                      opacity: removePredictionMutation.isPending || selectedMatchLocked ? 0.7 : 1,
                    }}
                  >
                    <Text style={{ color: "#B91C1C", fontWeight: "700" }}>
                      {removePredictionMutation.isPending ? t("pred.removePending") : t("pred.removeButton")}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={closeModal}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      paddingVertical: 11,
                      alignItems: "center",
                      backgroundColor: "#E2E8F0",
                    }}
                  >
                    <Text style={{ color: "#334155", fontWeight: "700" }}>{t("common.close")}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSavePrediction}
                    disabled={predictionMutation.isPending || selectedMatchLocked}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      paddingVertical: 11,
                      alignItems: "center",
                      backgroundColor: "#16A34A",
                      opacity: predictionMutation.isPending || selectedMatchLocked ? 0.7 : 1,
                    }}
                  >
                    {predictionMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: "#fff", fontWeight: "700" }}>{t("pred.saveButton")}</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {selectedMatchLocked ? (
                  <Text style={{ marginTop: 10, fontSize: 12, color: "#B45309", textAlign: "center" }}>
                    {t("pred.lockedHint")}
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
