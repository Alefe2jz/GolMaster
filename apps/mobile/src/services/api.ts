import axios from "axios";
import * as SecureStore from "expo-secure-store";

const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const allowLocalFallback =
  process.env.EXPO_PUBLIC_ALLOW_LOCAL_FALLBACK === "true";
const localFallbackUrl = "http://10.0.2.2:3333/api";

if (!envApiUrl && !allowLocalFallback) {
  throw new Error(
    "EXPO_PUBLIC_API_URL nao configurada. Defina a URL publica da API para testes reais."
  );
}

const baseURL = envApiUrl || localFallbackUrl;

if (!envApiUrl && allowLocalFallback) {
  console.warn(
    `[api] usando fallback local (${localFallbackUrl}). Defina EXPO_PUBLIC_API_URL para testes em aparelho real.`
  );
}

export const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("auth_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
