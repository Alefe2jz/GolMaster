import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import { api } from "@/services/api";
import { translations } from "./translations";

const DEFAULT_LANGUAGE = "pt";

function interpolate(template, params) {
  if (!params) return template;
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function toLocale(language) {
  return language === "en" ? "en-US" : "pt-BR";
}

export function formatDateTime(value, language) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.toLocaleDateString(toLocale(language))} ${date.toLocaleTimeString(
    toLocale(language),
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  )}`;
}

export function useI18n() {
  const { isAuthenticated } = useAuth();

  const { data: settingsData } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      if (!isAuthenticated) return { settings: { language: DEFAULT_LANGUAGE } };
      const response = await api.get("/user-settings");
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const language = settingsData?.settings?.language === "en" ? "en" : DEFAULT_LANGUAGE;

  useEffect(() => {
    api.defaults.headers.common["x-language"] = language;
  }, [language]);

  const t = useMemo(() => {
    const base = translations[language] || translations[DEFAULT_LANGUAGE];
    return (key, params) => {
      const fallback = translations[DEFAULT_LANGUAGE][key] || key;
      const message = base[key] || fallback;
      return interpolate(message, params);
    };
  }, [language]);

  return { language, t };
}
