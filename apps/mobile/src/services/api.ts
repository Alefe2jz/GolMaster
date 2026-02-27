import axios from "axios";
import * as SecureStore from "expo-secure-store";

const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const allowLocalFallback =
  process.env.EXPO_PUBLIC_ALLOW_LOCAL_FALLBACK === "true";
const localFallbackUrl = "http://10.0.2.2:3333/api";

const baseURL = envApiUrl || (allowLocalFallback ? localFallbackUrl : "");

if (!envApiUrl) {
  if (allowLocalFallback) {
    console.warn(
      `[api] EXPO_PUBLIC_API_URL nao configurada. Usando fallback local (${localFallbackUrl}).`
    );
  } else {
    console.error(
      "[api] EXPO_PUBLIC_API_URL nao configurada e fallback local desativado."
    );
  }
}

export const api = axios.create({
  baseURL: baseURL || undefined,
  timeout: 25000,
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    if (!config) {
      return Promise.reject(error);
    }

    const method = String(config.method || "get").toUpperCase();
    const status = error?.response?.status;
    const isTimeout = error?.code === "ECONNABORTED";
    const isNetworkError = error?.message === "Network Error";
    const isTransientStatus = !status || status >= 500;

    const canRetry = method === "GET" && (isTimeout || isNetworkError || isTransientStatus);
    if (!canRetry) {
      return Promise.reject(error);
    }

    const retryableConfig = config as any;
    retryableConfig.__retryCount = retryableConfig.__retryCount || 0;
    if (retryableConfig.__retryCount >= 2) {
      return Promise.reject(error);
    }

    retryableConfig.__retryCount += 1;
    const waitTime = 500 * retryableConfig.__retryCount;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    return api(config);
  }
);
