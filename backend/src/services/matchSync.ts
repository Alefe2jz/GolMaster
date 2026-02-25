import { prisma } from "../lib/prisma";
import { fetchWc2026Matches, Wc2026Match } from "./wc2026Api";

const FIFA_TO_ISO2: Record<string, string> = {
  ALG: "DZ",
  ARG: "AR",
  AUS: "AU",
  AUT: "AT",
  BEL: "BE",
  BRA: "BR",
  CAN: "CA",
  CIV: "CI",
  COL: "CO",
  CPV: "CV",
  CRO: "HR",
  CUW: "CW",
  ECU: "EC",
  EGY: "EG",
  ESP: "ES",
  FRA: "FR",
  GER: "DE",
  GHA: "GH",
  HAI: "HT",
  IRN: "IR",
  JOR: "JO",
  JPN: "JP",
  KOR: "KR",
  KSA: "SA",
  MAR: "MA",
  MEX: "MX",
  NED: "NL",
  NOR: "NO",
  NZL: "NZ",
  PAN: "PA",
  PAR: "PY",
  POR: "PT",
  QAT: "QA",
  RSA: "ZA",
  SEN: "SN",
  SUI: "CH",
  TUN: "TN",
  URU: "UY",
  USA: "US",
  UZB: "UZ",
};

const toFlagEmoji = (iso2: string) =>
  iso2
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");

const mapFlag = (teamCode?: string | null) => {
  const code = (teamCode || "").toUpperCase();
  if (!code || code.startsWith("PO")) return "";
  if (code === "ENG" || code === "SCO") return toFlagEmoji("GB");

  const iso2 = FIFA_TO_ISO2[code];
  if (!iso2) return "";
  return toFlagEmoji(iso2);
};

const mapStatus = (status?: string | null) => {
  const value = (status || "scheduled").toLowerCase();
  if (["finished", "complete", "full_time", "ft"].includes(value)) {
    return "finished";
  }
  if (["live", "in_progress", "playing"].includes(value)) {
    return "live";
  }
  return "scheduled";
};

const mapStage = (round?: string | null, groupName?: string | null) => {
  const value = (round || "").toLowerCase();
  if (value === "group") {
    return groupName ? `group_${groupName.toLowerCase()}` : "group_stage";
  }
  if (value === "r32") return "round_of_32";
  if (value === "r16") return "round_of_16";
  if (value === "qf") return "quarter_final";
  if (value === "sf") return "semi_final";
  if (value === "3rd") return "third_place";
  if (value === "final") return "final";
  return "group_stage";
};

const toMatchPayload = (item: Wc2026Match) => ({
  homeTeamName: item.home_team || "TBD",
  awayTeamName: item.away_team || "TBD",
  homeTeamFlag: mapFlag(item.home_team_code),
  awayTeamFlag: mapFlag(item.away_team_code),
  matchDate: new Date(item.kickoff_utc),
  stadiumName: item.stadium || "TBD",
  stadiumCity: item.stadium_city || "TBD",
  status: mapStatus(item.status),
  stage: mapStage(item.round, item.group_name),
  homeScore: item.home_score,
  awayScore: item.away_score,
});

export const syncMatchesFromWc2026Api = async () => {
  const apiMatches = await fetchWc2026Matches();
  let newMatches = 0;
  let updatedMatches = 0;

  for (const item of apiMatches) {
    const payload = toMatchPayload(item);
    const existing = await prisma.match.findFirst({
      where: {
        OR: [
          {
            homeTeamName: payload.homeTeamName,
            awayTeamName: payload.awayTeamName,
            matchDate: payload.matchDate,
          },
          {
            matchDate: payload.matchDate,
            stadiumName: payload.stadiumName,
            stage: payload.stage,
          },
        ],
      },
    });

    if (existing) {
      await prisma.match.update({
        where: { id: existing.id },
        data: payload,
      });
      updatedMatches += 1;
      continue;
    }

    await prisma.match.create({ data: payload });
    newMatches += 1;
  }

  return {
    newMatches,
    updatedMatches,
    apiMatches: apiMatches.length,
  };
};
