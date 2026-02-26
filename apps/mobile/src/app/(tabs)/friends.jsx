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
import { Users, UserPlus, Hash, X, Check, Clock } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { api } from "@/services/api";

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, signIn, auth } = useAuth();
  const queryClient = useQueryClient();
  const [friendCode, setFriendCode] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState("friends");

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

  const addFriendMutation = useMutation({
    mutationFn: async (inviteCode) => {
      const response = await api.post("/friends", {
        friend_id: inviteCode,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      setModalVisible(false);
      setFriendCode("");
      Alert.alert("Sucesso", "Convite de amizade enviado!");
    },
    onError: (error) => {
      Alert.alert("Erro", error.message);
    },
  });

  const respondFriendMutation = useMutation({
    mutationFn: async ({ friendshipId, action }) => {
      const response = await api.put(`/friends/${friendshipId}`, { action });
      return response.data;
    },
    onSuccess: (_data, { action }) => {
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
  const myFriendCode = auth?.user?.friendCode || "";

  const handleAddFriend = () => {
    const inviteCode = friendCode.trim().toUpperCase();
    if (!inviteCode) {
      Alert.alert("Erro", "Digite um ID de amigo valido");
      return;
    }

    addFriendMutation.mutate(inviteCode);
  };

  const handleCopyFriendCode = async () => {
    if (!myFriendCode) {
      Alert.alert("Erro", "Seu ID de amigo ainda nao esta disponivel.");
      return;
    }

    await Clipboard.setStringAsync(myFriendCode);
    Alert.alert("Copiado", "Seu ID de amigo foi copiado.");
  };

  const handleFriendAction = (friendshipId, action) => {
    const message =
      action === "accept"
        ? "Tem certeza que deseja aceitar este convite?"
        : "Tem certeza que deseja recusar este convite?";

    Alert.alert("Confirmacao", message, [
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
                  {friend.name || "Usuario"}
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
                onPress={() => handleFriendAction(friend.friendship_id, "decline")}
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
                onPress={() => handleFriendAction(friend.friendship_id, "accept")}
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
            Amigos
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
            Faca login para competir com amigos
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
            Amigos
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 20,
        }}
      >
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
          <Text style={{ fontSize: 12, color: "#166534", marginBottom: 6 }}>
            Seu ID de amigo
          </Text>
          <TouchableOpacity
            onPress={handleCopyFriendCode}
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Hash size={16} color="#166534" />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#14532D" }}>
              {myFriendCode || "--"}
            </Text>
            <Text style={{ fontSize: 12, color: "#166534", marginLeft: "auto" }}>
              Toque para copiar
            </Text>
          </TouchableOpacity>
        </View>

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
                  Voce ainda nao tem amigos
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#9CA3AF",
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  Adicione amigos pelo ID para competir
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
              </>
            )}
          </View>
        ) : (
          friends.map(renderFriend)
        )}
      </ScrollView>

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
              Digite o ID do seu amigo para enviar um convite:
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
              <Hash size={20} color="#6B7280" />
              <TextInput
                value={friendCode}
                onChangeText={setFriendCode}
                placeholder="GM-ABCD-1234"
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
                  {addFriendMutation.isLoading ? "Enviando..." : "Enviar convite"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingAnimatedView>
  );
}
