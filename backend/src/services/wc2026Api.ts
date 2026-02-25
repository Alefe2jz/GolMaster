export type Wc2026Match = {
  id: number;
  round: string | null;
  group_name: string | null;
  home_team: string | null;
  home_team_code: string | null;
  away_team: string | null;
  away_team_code: string | null;
  stadium: string | null;
  stadium_city: string | null;
  kickoff_utc: string;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
};

const normalizeBaseUrl = (rawBaseUrl?: string) => {
  if (!rawBaseUrl || rawBaseUrl.trim().length === 0) {
    return "https://api.wc2026api.com";
  }

  const base = rawBaseUrl.trim().replace(/\/+$/, "");
  if (base.includes("://www.wc2026api.com")) {
    return base.replace("://www.wc2026api.com", "://api.wc2026api.com");
  }

  return base;
};

const getConfig = () => {
  const apiKey = process.env.WC2026_API_KEY;
  if (!apiKey) {
    throw new Error("WC2026_API_KEY is not configured");
  }

  return {
    baseUrl: normalizeBaseUrl(process.env.WC2026_API_BASE_URL),
    apiKey,
  };
};

export const fetchWc2026Matches = async () => {
  const { baseUrl, apiKey } = getConfig();
  const response = await fetch(`${baseUrl}/matches`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`WC2026 API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("WC2026 API returned an invalid matches payload");
  }

  return data as Wc2026Match[];
};
