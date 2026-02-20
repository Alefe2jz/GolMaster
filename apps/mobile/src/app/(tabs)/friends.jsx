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
import {
  Users,
  UserPlus,
  Trophy,
  Mail,
  X,
  Check,
  Clock,
} from "lucide-react-native";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { api } from "@/services/api";

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, signIn } = useAuth();
  const queryClient = useQueryClient();
  const [friendEmail, setFriendEmail] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState("friends");

  // Fetch friends
  const { data: friendsData, isLoading } = useQuery({
    queryKey: ["friends", selectedTab],
    queryFn: async () => {
      if (!isAuthenticated) return { friends: [] };
      const status = selectedTab === "friends" ? "accepted" : "pending";
      const response = await api.get("/friends", { params: { status } });
      return response.data;
    },
    enabled: isAuthenticated,
  });

  // Add friend mutation
  const addFriendMutation = useMutation({
    mutationFn: async (email) => {
      const response = await api.post("/friends", {
        friend_email: email,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      setModalVisible(false);
      setFriendEmail("");
      Alert.alert("Sucesso", "Convite de amizade enviado!");
    },
    onError: (error) => {
      Alert.alert("Erro", error.message);
    },
  });

  // Accept/decline friend mutation
  const respondFriendMutation = useMutation({
    mutationFn: async ({ friendshipId, action }) => {
      const response = await api.put(`/friends/${friendshipId}`, { action });
      return response.data;
    },
    onSuccess: (data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      const message =
        action === "accept" ? "Amigo adicionado!" : "Convite recusado";
      Alert.alert("Sucesso", message);
    },
    onError: (error) => {
      Alert.alert("Erro", error.message);
    },
  });

  const friends = friendsData?.friends || [];

  const handleAddFriend = () => {
    if (!friendEmail.trim()) {
      Alert.alert("Erro", "Digite um email válido");
      return;
    }

    addFriendMutation.mutate(friendEmail.trim().toLowerCase());
  };

  const handleFriendAction = (friendshipId, action) => {
    const message =
      action === "accept"
        ? "Tem certeza que deseja aceitar este convite?"
        : "Tem certeza que deseja recusar este convite?";

    Alert.alert("Confirmação", message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: action === "accept" ? "Aceitar" : "Recusar",
        onPress: () => respondFriendMutation.mutate({ friendshipId, action }),
      },
    ]);
  };

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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
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
                <Text
                  style={{ color: "white", fontSize: 16, fontWeight: "bold" }}
                >
                  {(friend.name || friend.email || "?").charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}
                >
                  {friend.name || "Usuário"}
                </Text>
                <Text style={{ fontSize: 13, color: "#6B7280" }}>
                  {friend.email}
                </Text>
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
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: "#1F2937",
                    }}
                  >
                    {friend.total_predictions}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#6B7280" }}>
                    Palpites
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: "#16A34A",
                    }}
                  >
                    {friend.correct_predictions}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#6B7280" }}>
                    Acertos
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: "#2563EB",
                    }}
                  >
                    {friend.success_rate}%
                  </Text>
                  <Text style={{ fontSize: 11, color: "#6B7280" }}>Taxa</Text>
                </View>
              </View>
            )}
          </View>

          {isRequest && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() =>
                  handleFriendAction(friend.friendship_id, "decline")
                }
                style={{
                  backgroundColor: "#FEE2E2",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 6,
                }}
              >
                <X size={16} color="#DC2626" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  handleFriendAction(friend.friendship_id, "accept")
                }
                style={{
                  backgroundColor: "#DCFCE7",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 6,
                }}
              >
                <Check size={16} color="#16A34A" />
              </TouchableOpacity>
            </View>
          )}
        </View>
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
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}>
            👥 Amigos
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
            Faça login para competir com amigos
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
            Entre com sua conta Google e adicione seus amigos para ver quem
            acerta mais palpites
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
    <KeyboardAvoidingAnimatedView
      style={{ flex: 1, backgroundColor: "#F9FAFB" }}
      behavior="padding"
    >
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
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1F2937" }}>
            👥 Amigos
          </Text>

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
            <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
              Adicionar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            marginTop: 16,
            backgroundColor: "#F3F4F6",
            borderRadius: 8,
            padding: 4,
          }}
        >
          <TouchableOpacity
            onPress={() => setSelectedTab("friends")}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: "center",
              backgroundColor:
                selectedTab === "friends" ? "white" : "transparent",
              borderRadius: 6,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: selectedTab === "friends" ? "#1F2937" : "#6B7280",
              }}
            >
              Meus Amigos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedTab("requests")}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: "center",
              backgroundColor:
                selectedTab === "requests" ? "white" : "transparent",
              borderRadius: 6,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: selectedTab === "requests" ? "#1F2937" : "#6B7280",
              }}
            >
              Convites
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Friends List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 20,
        }}
      >
        {friends.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            {selectedTab === "friends" ? (
              <>
                <Users size={48} color="#9CA3AF" />
                <Text
                  style={{
                    fontSize: 16,
                    color: "#6B7280",
                    textAlign: "center",
                    marginTop: 16,
                  }}
                >
                  Você ainda não tem amigos
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#9CA3AF",
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  Adicione amigos pelo email para competir
                </Text>
              </>
            ) : (
              <>
                <Clock size={48} color="#9CA3AF" />
                <Text
                  style={{
                    fontSize: 16,
                    color: "#6B7280",
                    textAlign: "center",
                    marginTop: 16,
                  }}
                >
                  Nenhum convite pendente
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#9CA3AF",
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  Os convites de amizade aparecerão aqui
                </Text>
              </>
            )}
          </View>
        ) : (
          friends.map(renderFriend)
        )}
      </ScrollView>

      {/* Add Friend Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 24,
              width: "90%",
              maxWidth: 400,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "bold", color: "#1F2937" }}
              >
                Adicionar Amigo
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 12 }}>
              Digite o email do seu amigo para enviar um convite de amizade:
            </Text>

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
              <Mail size={20} color="#6B7280" />
              <TextInput
                value={friendEmail}
                onChangeText={setFriendEmail}
                placeholder="email@exemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  flex: 1,
                  marginLeft: 12,
                  fontSize: 16,
                }}
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
                <Text style={{ fontSize: 16, color: "#6B7280" }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAddFriend}
                disabled={addFriendMutation.isLoading}
                style={{
                  flex: 1,
                  backgroundColor: "#16A34A",
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                  opacity: addFriendMutation.isLoading ? 0.7 : 1,
                }}
              >
                <Text
                  style={{ fontSize: 16, color: "white", fontWeight: "600" }}
                >
                  {addFriendMutation.isLoading
                    ? "Enviando..."
                    : "Enviar convite"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingAnimatedView>
  );
}
