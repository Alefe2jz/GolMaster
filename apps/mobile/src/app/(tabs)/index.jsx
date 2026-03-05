import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import { Calendar, MapPin, Tv } from "lucide-react-native";
import { api } from "@/services/api";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, auth } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch matches
  const {
    data: matchesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["matches", selectedStage],
    queryFn: async () => {
      const params =
        selectedStage === "all" ? {} : { stage: selectedStage };
      const response = await api.get("/matches", { params });
      return response.data;
    },
  });

  // Get user's predictions for matches
  const { data: predictionsData } = useQuery({
    queryKey: ["user-predictions"],
    queryFn: async () => {
      if (!isAuthenticated) return { predictions: [] };
      const response = await api.get("/predictions");
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const matches = matchesData?.matches || [];
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
  const predictions = predictionsData?.predictions || [];
  const predictionMap = predictions.reduce((acc, pred) => {
    acc[pred.match_id] = pred;
    return acc;
  }, {});
  const toGroupLetter = (stage) => {
    if (!stage || typeof stage !== "string") return null;
    const match = stage.match(/^group_([a-z])$/i);
    if (!match) return null;
    return match[1].toUpperCase();
  };

  const stages = [
    { key: "all", label: "Todos" },
    { key: "group_stage", label: "Grupos" },
    { key: "round_of_16", label: "Oitavas" },
    { key: "quarter_final", label: "Quartas" },
    { key: "semi_final", label: "Semis" },
    { key: "final", label: "Final" },
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return { date: `${day}/${month}`, time: `${hours}:${minutes}` };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "live":
        return "#FF6B6B";
      case "finished":
        return "#51CF66";
      default:
        return "#868E96";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "live":
        return "AO VIVO";
      case "finished":
        return "FINALIZADO";
      default:
        return "AGENDADO";
    }
  };

  const isNoScheduleTeam = (name) => {
    if (!name) return false;
    const normalized = String(name).trim().toLowerCase();
    return normalized === "sem agenda marcada" || normalized === "tbd";
  };

  const buildGroupData = (sourceMatches) => {
    const groupsMap = new Map();

    sourceMatches.forEach((match) => {
      const letter = toGroupLetter(match.stage);
      if (!letter) return;

      const groupKey = `group_${letter}`;
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          key: groupKey,
          letter,
          label: `Grupo ${letter}`,
          matches: [],
          teamsMap: new Map(),
        });
      }

      const group = groupsMap.get(groupKey);
      group.matches.push(match);

      const ensureTeam = (name, flag) => {
        if (!name || isNoScheduleTeam(name)) return null;
        if (!group.teamsMap.has(name)) {
          group.teamsMap.set(name, {
            name,
            flag: flag || "🏳️",
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDiff: 0,
            points: 0,
          });
        }
        return group.teamsMap.get(name);
      };

      const home = ensureTeam(match.home_team_name, match.home_team_flag);
      const away = ensureTeam(match.away_team_name, match.away_team_flag);
      const hasScore =
        match.status === "finished" &&
        typeof match.home_score === "number" &&
        typeof match.away_score === "number" &&
        home &&
        away;

      if (!hasScore) return;

      home.played += 1;
      away.played += 1;

      home.goalsFor += match.home_score;
      home.goalsAgainst += match.away_score;
      away.goalsFor += match.away_score;
      away.goalsAgainst += match.home_score;

      home.goalDiff = home.goalsFor - home.goalsAgainst;
      away.goalDiff = away.goalsFor - away.goalsAgainst;

      if (match.home_score > match.away_score) {
        home.wins += 1;
        home.points += 3;
        away.losses += 1;
      } else if (match.home_score < match.away_score) {
        away.wins += 1;
        away.points += 3;
        home.losses += 1;
      } else {
        home.draws += 1;
        away.draws += 1;
        home.points += 1;
        away.points += 1;
      }
    });

    return Array.from(groupsMap.values())
      .map((group) => {
        const standings = Array.from(group.teamsMap.values())
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
            return a.name.localeCompare(b.name);
          })
          .map((team, index) => ({
            ...team,
            position: index + 1,
          }));

        return {
          key: group.key,
          letter: group.letter,
          label: group.label,
          matches: group.matches,
          standings,
        };
      })
      .sort((a, b) => a.letter.localeCompare(b.letter));
  };

  const groupDataForStandings = buildGroupData(matches);
  const groupDataForDisplay = buildGroupData(filteredMatches);

  const renderMatch = (match) => {
    const { date, time } = formatDate(match.match_date);
    const prediction = predictionMap[match.id];
    const homeNoSchedule = isNoScheduleTeam(match.home_team_name);
    const awayNoSchedule = isNoScheduleTeam(match.away_team_name);

    return (
      <View
        key={match.id}
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
        {/* Match Status */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: getStatusColor(match.status),
              backgroundColor: getStatusColor(match.status) + "20",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
            }}
          >
            {getStatusText(match.status)}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Calendar size={14} color="#6B7280" />
            <Text style={{ marginLeft: 4, fontSize: 12, color: "#6B7280" }}>
              {date} • {time}
            </Text>
          </View>
        </View>

        {/* Teams and Score */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 32, marginBottom: 4 }}>
              {homeNoSchedule ? "⏳" : match.home_team_flag || "🏳️"}
            </Text>
            <Text
              style={{
                fontSize: homeNoSchedule ? 12 : 14,
                fontWeight: "600",
                textAlign: "center",
                color: homeNoSchedule ? "#64748B" : "#111827",
                maxWidth: 120,
              }}
            >
              {homeNoSchedule ? "Sem agenda marcada" : match.home_team_name}
            </Text>
          </View>

          <View style={{ alignItems: "center", minWidth: 60 }}>
            {match.status === "finished" ? (
              <Text
                style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}
              >
                {match.home_score} - {match.away_score}
              </Text>
            ) : match.status === "live" ? (
              <Text
                style={{ fontSize: 20, fontWeight: "bold", color: "#FF6B6B" }}
              >
                {match.home_score} - {match.away_score}
              </Text>
            ) : (
              <Text style={{ fontSize: 16, color: "#6B7280" }}>VS</Text>
            )}
          </View>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 32, marginBottom: 4 }}>
              {awayNoSchedule ? "⏳" : match.away_team_flag || "🏳️"}
            </Text>
            <Text
              style={{
                fontSize: awayNoSchedule ? 12 : 14,
                fontWeight: "600",
                textAlign: "center",
                color: awayNoSchedule ? "#64748B" : "#111827",
                maxWidth: 120,
              }}
            >
              {awayNoSchedule ? "Sem agenda marcada" : match.away_team_name}
            </Text>
          </View>
        </View>

        {/* Match Info */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            paddingTop: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <MapPin size={16} color="#6B7280" />
            <Text style={{ marginLeft: 6, fontSize: 13, color: "#6B7280" }}>
              {match.stadium_name}, {match.stadium_city}
            </Text>
          </View>

          {match.tv_channel && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <Tv size={16} color="#6B7280" />
              <Text style={{ marginLeft: 6, fontSize: 13, color: "#6B7280" }}>
                {match.tv_channel} • {match.streaming_platform}
              </Text>
            </View>
          )}

          {/* User's Prediction */}
          {prediction && (
            <View
              style={{
                marginTop: 8,
                padding: 10,
                backgroundColor:
                  prediction.is_correct === true
                    ? "#DCFCE7"
                    : prediction.is_correct === false
                      ? "#FEE2E2"
                      : "#F3F4F6",
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 13, color: "#374151" }}>
                Seu palpite: {prediction.predicted_home_score} -{" "}
                {prediction.predicted_away_score}
              </Text>
              {prediction.is_correct === true && (
                <Text
                  style={{ fontSize: 12, color: "#16A34A", fontWeight: "600" }}
                >
                  ✅ Parabéns, chute certeiro!
                </Text>
              )}
              {prediction.is_correct === false && (
                <Text
                  style={{ fontSize: 12, color: "#DC2626", fontWeight: "600" }}
                >
                  ❌ Essa foi Quaaaase!
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderGroupStandings = (group) => {
    if (!group.standings.length) return null;

    return (
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 10,
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#F8FAFC",
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
            paddingVertical: 8,
            paddingHorizontal: 10,
          }}
        >
          <Text style={{ width: 24, fontSize: 11, color: "#64748B", fontWeight: "700" }}>#</Text>
          <Text style={{ flex: 1, fontSize: 11, color: "#64748B", fontWeight: "700" }}>Time</Text>
          <Text style={{ width: 22, textAlign: "center", fontSize: 11, color: "#64748B", fontWeight: "700" }}>P</Text>
          <Text style={{ width: 22, textAlign: "center", fontSize: 11, color: "#64748B", fontWeight: "700" }}>J</Text>
          <Text style={{ width: 22, textAlign: "center", fontSize: 11, color: "#64748B", fontWeight: "700" }}>V</Text>
          <Text style={{ width: 22, textAlign: "center", fontSize: 11, color: "#64748B", fontWeight: "700" }}>E</Text>
          <Text style={{ width: 22, textAlign: "center", fontSize: 11, color: "#64748B", fontWeight: "700" }}>D</Text>
          <Text style={{ width: 26, textAlign: "center", fontSize: 11, color: "#64748B", fontWeight: "700" }}>SG</Text>
        </View>

        {group.standings.map((team) => (
          <View
            key={`${group.key}-${team.name}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#F1F5F9",
              backgroundColor: team.position <= 2 ? "#F0FDF4" : "#FFFFFF",
            }}
          >
            <Text style={{ width: 24, fontSize: 12, color: "#334155", fontWeight: "700" }}>
              {team.position}
            </Text>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 16, marginRight: 6 }}>{team.flag || "🏳️"}</Text>
              <Text
                numberOfLines={1}
                style={{ fontSize: 12, color: "#0F172A", fontWeight: "600", maxWidth: 140 }}
              >
                {team.name}
              </Text>
            </View>
            <Text style={{ width: 22, textAlign: "center", fontSize: 12, color: "#166534", fontWeight: "800" }}>
              {team.points}
            </Text>
            <Text style={{ width: 22, textAlign: "center", fontSize: 12, color: "#334155" }}>{team.played}</Text>
            <Text style={{ width: 22, textAlign: "center", fontSize: 12, color: "#334155" }}>{team.wins}</Text>
            <Text style={{ width: 22, textAlign: "center", fontSize: 12, color: "#334155" }}>{team.draws}</Text>
            <Text style={{ width: 22, textAlign: "center", fontSize: 12, color: "#334155" }}>{team.losses}</Text>
            <Text style={{ width: 26, textAlign: "center", fontSize: 12, color: "#334155", fontWeight: "700" }}>
              {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
            </Text>
          </View>
        ))}
      </View>
    );
  };

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
        <View
          style={{
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#1F2937",
                textAlign: "center",
              }}
            >
              ⚽ GolMaster
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#6B7280",
                marginTop: 2,
                textAlign: "center",
              }}
            >
              Copa do Mundo 2026
            </Text>
          </View>

        </View>

        {/* Stage Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 16 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {stages.map((stage) => (
            <TouchableOpacity
              key={stage.key}
              onPress={() => setSelectedStage(stage.key)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor:
                  selectedStage === stage.key ? "#16A34A" : "#F3F4F6",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: selectedStage === stage.key ? "white" : "#6B7280",
                }}
              >
                {stage.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Pesquisar jogo, time, estadio..."
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

      {/* Matches List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#16A34A"
          />
        }
      >
        {!isAuthenticated && (
          <View
            style={{
              margin: 16,
              padding: 16,
              backgroundColor: "#FEF3C7",
              borderRadius: 12,
              borderLeftWidth: 4,
              borderLeftColor: "#F59E0B",
            }}
          >
            <Text style={{ fontSize: 14, color: "#92400E", marginBottom: 8 }}>
              📱 Faça login para fazer palpites e competir com amigos!
            </Text>
            <Text style={{ fontSize: 12, color: "#A16207" }}>
              Entre com sua conta Google e comece a chutar os placares.
            </Text>
          </View>
        )}

        {error && (
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
              Erro ao carregar os jogos. Toque para tentar novamente.
            </Text>
          </View>
        )}

        {filteredMatches.length === 0 && !isLoading && !error ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>⚽</Text>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>
              {searchTerm.trim() ? "Nenhum jogo para essa pesquisa" : "Nenhum jogo encontrado"}
            </Text>
          </View>
        ) : selectedStage === "group_stage" ? (
          groupDataForDisplay.map((group) => (
            <View key={group.key}>
              <View
                style={{
                  marginHorizontal: 16,
                  marginBottom: 8,
                  marginTop: 2,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: "800", color: "#0F172A" }}>
                  {group.label}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>
                  {group.matches.length} jogos
                </Text>
              </View>

              {renderGroupStandings(
                groupDataForStandings.find((item) => item.key === group.key) || group
              )}

              {group.matches.map(renderMatch)}
            </View>
          ))
        ) : (
          filteredMatches.map(renderMatch)
        )}
      </ScrollView>
    </View>
  );
}

