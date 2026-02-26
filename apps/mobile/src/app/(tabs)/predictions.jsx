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

const toDateLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export default function PredictionsScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, signIn } = useAuth();
  const queryClient = useQueryClient();

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const {
    data: matchesData,
    isLoading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
  } = useQuery({
    queryKey: ["upcoming-matches"],
    queryFn: async () => {
      const response = await api.get("/matches", {
        params: { status: "scheduled" },
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
      Alert.alert("Sucesso", "Palpite salvo com sucesso!");
    },
    onError: (error) => {
      Alert.alert("Erro", error.message || "Nao foi possivel salvar o palpite.");
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
      Alert.alert("Sucesso", "Palpite cancelado.");
    },
    onError: (error) => {
      Alert.alert("Erro", error.message || "Nao foi possivel cancelar o palpite.");
    },
  });

  const matches = matchesData?.matches || [];
  const predictions = predictionsData?.predictions || [];

  const predictionMap = useMemo(
    () =>
      predictions.reduce((acc, pred) => {
        acc[pred.match_id] = pred;
        return acc;
      }, {}),
    [predictions]
  );

  const selectedPrediction = selectedMatch ? predictionMap[selectedMatch.id] : null;

  const closeModal = () => {
    setModalVisible(false);
    setSelectedMatch(null);
    setHomeScore("");
    setAwayScore("");
  };

  const handleMakePrediction = (match) => {
    if (!isAuthenticated) {
      Alert.alert("Login necessario", "Faca login para continuar.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Fazer login", onPress: signIn },
      ]);
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

    const home = Number(homeScore);
    const away = Number(awayScore);

    if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
      Alert.alert("Erro", "Informe placares validos (0 ou mais).");
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

    Alert.alert("Cancelar palpite", "Deseja remover este palpite?", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Remover",
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
          <Text style={{ fontSize: 24, fontWeight: "bold" }}>Palpites</Text>
        </View>

        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
          <Trophy size={64} color="#9CA3AF" />

          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Faca login para comecar a dar palpites
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
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}>Palpites</Text>
        <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          Escolha um jogo e registre seu palpite
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 20,
        }}
      >
        {matchesLoading ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>Carregando jogos...</Text>
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
            <Text style={{ fontSize: 14, color: "#991B1B" }}>
              Erro ao carregar jogos. Toque para tentar novamente.
            </Text>
            <TouchableOpacity onPress={refetchMatches} style={{ marginTop: 10 }}>
              <Text style={{ color: "#DC2626", fontWeight: "600" }}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : matches.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>Nenhum jogo disponivel</Text>
          </View>
        ) : (
          matches.map((match) => (
            <TouchableOpacity
              key={match.id}
              onPress={() => handleMakePrediction(match)}
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937", flex: 1 }}>
                  {match.home_team_name} vs {match.away_team_name}
                </Text>
                <Text style={{ fontSize: 12, color: "#6B7280", marginLeft: 10 }}>
                  {toDateLabel(match.match_date)}
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
                    Seu palpite: {predictionMap[match.id].predicted_home_score} -{" "}
                    {predictionMap[match.id].predicted_away_score}
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
                  <Text style={{ color: "#92400E", fontSize: 13 }}>Toque para palpitar</Text>
                </View>
              )}
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
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
                Registrar palpite
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedMatch ? (
              <>
                <Text style={{ marginTop: 8, fontSize: 12, color: "#64748B" }}>
                  {toDateLabel(selectedMatch.match_date)}
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
                      <Text style={{ fontSize: 30 }}>{selectedMatch.home_team_flag || "???"}</Text>
                      <Text style={{ marginTop: 4, fontSize: 13, fontWeight: "600", color: "#0F172A", textAlign: "center" }}>
                        {selectedMatch.home_team_name}
                      </Text>
                    </View>
                    <Text style={{ paddingHorizontal: 10, color: "#94A3B8", fontWeight: "700" }}>x</Text>
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <Text style={{ fontSize: 30 }}>{selectedMatch.away_team_flag || "???"}</Text>
                      <Text style={{ marginTop: 4, fontSize: 13, fontWeight: "600", color: "#0F172A", textAlign: "center" }}>
                        {selectedMatch.away_team_name}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ marginBottom: 6, fontSize: 12, color: "#475569", fontWeight: "600" }}>
                      Gols {selectedMatch.home_team_name}
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
                      Gols {selectedMatch.away_team_name}
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
                    disabled={removePredictionMutation.isPending}
                    style={{
                      marginTop: 14,
                      borderWidth: 1,
                      borderColor: "#FCA5A5",
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: "center",
                      backgroundColor: "#FEF2F2",
                      opacity: removePredictionMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    <Text style={{ color: "#B91C1C", fontWeight: "700" }}>
                      {removePredictionMutation.isPending ? "Cancelando..." : "Cancelar palpite"}
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
                    <Text style={{ color: "#334155", fontWeight: "700" }}>Fechar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSavePrediction}
                    disabled={predictionMutation.isPending}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      paddingVertical: 11,
                      alignItems: "center",
                      backgroundColor: "#16A34A",
                      opacity: predictionMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {predictionMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: "#fff", fontWeight: "700" }}>Salvar palpite</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
