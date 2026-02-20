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
import { Trophy, Target, Calendar, X, Check } from "lucide-react-native";
import { api } from "@/services/api";

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
    mutationFn: async ({
      match_id,
      predicted_home_score,
      predicted_away_score,
    }) => {
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
      Alert.alert("Erro", error.message);
    },
  });

  const matches = matchesData?.matches || [];
  const predictions = predictionsData?.predictions || [];

  const predictionMap = predictions.reduce((acc, pred) => {
    acc[pred.match_id] = pred;
    return acc;
  }, {});

  const handleMakePrediction = (match) => {
    if (!isAuthenticated) {
      Alert.alert("Login necessário", "Faça login para continuar.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Fazer login", onPress: signIn },
      ]);
      return;
    }

    setSelectedMatch(match);

    const existing = predictionMap[match.id];
    if (existing) {
      setHomeScore(existing.predicted_home_score.toString());
      setAwayScore(existing.predicted_away_score.toString());
    } else {
      setHomeScore("");
      setAwayScore("");
    }

    setModalVisible(true);
  };

  const handleSavePrediction = () => {
    if (!homeScore || !awayScore) {
      Alert.alert("Erro", "Preencha ambos os placares");
      return;
    }

    predictionMutation.mutate({
      match_id: selectedMatch.id,
      predicted_home_score: parseInt(homeScore),
      predicted_away_score: parseInt(awayScore),
    });
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
          <Text style={{ fontSize: 24, fontWeight: "bold" }}>
            🎯 Palpites
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
          <Trophy size={64} color="#9CA3AF" />

          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Faça login para começar a dar palpites
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: "#6B7280",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Entre com sua conta para participar
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
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}>
          🎯 Palpites
        </Text>
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
            <Text style={{ fontSize: 16, color: "#6B7280" }}>
              Carregando jogos...
            </Text>
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
            <TouchableOpacity
              onPress={refetchMatches}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: "#DC2626", fontWeight: "600" }}>
                Tentar novamente
              </Text>
            </TouchableOpacity>
          </View>
        ) : matches.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>⚽</Text>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>
              Nenhum jogo disponível
            </Text>
            <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>
              Volte mais tarde para palpitar
            </Text>
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
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>
                  {match.home_team_name} vs {match.away_team_name}
                </Text>
                <Text style={{ fontSize: 12, color: "#6B7280" }}>
                  {match.match_date ? new Date(match.match_date).toLocaleDateString() : ""}
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
                    Palpite: {predictionMap[match.id].predicted_home_score} -{" "}
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
                  <Text style={{ color: "#92400E", fontSize: 13 }}>
                    Toque para palpitar
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: "white", padding: 24 }}>
            <TextInput
              placeholder="Gols casa"
              value={homeScore}
              onChangeText={setHomeScore}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="Gols fora"
              value={awayScore}
              onChangeText={setAwayScore}
              keyboardType="numeric"
            />

            <TouchableOpacity onPress={handleSavePrediction}>
              <Text>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
