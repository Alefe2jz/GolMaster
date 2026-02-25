import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

type Lang = "pt" | "en";

const TEAM_NAME_PT: Record<string, string> = {
  Mexico: "Mexico",
  "South Africa": "Africa do Sul",
  "Korea Republic": "Coreia do Sul",
  Canada: "Canada",
  Paraguay: "Paraguai",
  Haiti: "Haiti",
  Scotland: "Escocia",
  Brazil: "Brasil",
  Morocco: "Marrocos",
  Qatar: "Catar",
  Switzerland: "Suica",
  "Cote d'Ivoire": "Costa do Marfim",
  "Cote d’Ivoire": "Costa do Marfim",
  Ecuador: "Equador",
  Germany: "Alemanha",
  Curacao: "Curacao",
  Netherlands: "Paises Baixos",
  Japan: "Japao",
  Tunisia: "Tunisia",
  "Saudi Arabia": "Arabia Saudita",
  Uruguay: "Uruguai",
  Spain: "Espanha",
  "Cabo Verde": "Cabo Verde",
  "IR Iran": "Ira",
  "New Zealand": "Nova Zelandia",
  Belgium: "Belgica",
  Egypt: "Egito",
  France: "Franca",
  Senegal: "Senegal",
  Norway: "Noruega",
  Argentina: "Argentina",
  Algeria: "Argelia",
  Austria: "Austria",
  Jordan: "Jordania",
  Colombia: "Colombia",
  Panama: "Panama",
  Croatia: "Croacia",
  Ghana: "Gana",
  England: "Inglaterra",
  Uzbekistan: "Uzbequistao",
  Portugal: "Portugal",
  USA: "EUA",
  "UEFA Winner A": "Vencedor UEFA A",
  "UEFA Winner B": "Vencedor UEFA B",
  "UEFA Winner C": "Vencedor UEFA C",
  "UEFA Winner D": "Vencedor UEFA D",
  "IC Winner 2": "Vencedor Intercontinental 2",
  TBD: "Sem agenda marcada",
};

const STAGE_LABELS: Record<string, { pt: string; en: string }> = {
  group_stage: { pt: "Fase de grupos", en: "Group Stage" },
  group_a: { pt: "Grupo A", en: "Group A" },
  group_b: { pt: "Grupo B", en: "Group B" },
  group_c: { pt: "Grupo C", en: "Group C" },
  group_d: { pt: "Grupo D", en: "Group D" },
  group_e: { pt: "Grupo E", en: "Group E" },
  group_f: { pt: "Grupo F", en: "Group F" },
  group_g: { pt: "Grupo G", en: "Group G" },
  group_h: { pt: "Grupo H", en: "Group H" },
  group_i: { pt: "Grupo I", en: "Group I" },
  group_j: { pt: "Grupo J", en: "Group J" },
  group_k: { pt: "Grupo K", en: "Group K" },
  group_l: { pt: "Grupo L", en: "Group L" },
  round_of_32: { pt: "16 avos de final", en: "Round of 32" },
  round_of_16: { pt: "Oitavas de final", en: "Round of 16" },
  quarter_final: { pt: "Quartas de final", en: "Quarter-final" },
  semi_final: { pt: "Semifinal", en: "Semi-final" },
  third_place: { pt: "Disputa de terceiro lugar", en: "Third-place match" },
  final: { pt: "Final", en: "Final" },
};

const STATUS_LABELS: Record<string, { pt: string; en: string }> = {
  scheduled: { pt: "Agendado", en: "Scheduled" },
  live: { pt: "Ao vivo", en: "Live" },
  finished: { pt: "Encerrado", en: "Finished" },
};

const toParamString = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const normalizeLang = (value?: string | null): Lang => {
  const raw = (value || "").toLowerCase();
  if (raw.startsWith("en")) return "en";
  return "pt";
};

const resolveLang = (req: Request): Lang => {
  const queryLang = toParamString(req.query.lang as string | string[] | undefined);
  if (queryLang) return normalizeLang(queryLang);

  const customHeader = req.header("x-language");
  if (customHeader) return normalizeLang(customHeader);

  const acceptLanguage = req.header("accept-language");
  return normalizeLang(acceptLanguage);
};

const parseStageFilter = (raw?: string | null) => {
  if (!raw) return null;
  const value = raw.toLowerCase().trim();
  const entry = Object.entries(STAGE_LABELS).find(
    ([key, label]) =>
      key === value ||
      label.pt.toLowerCase() === value ||
      label.en.toLowerCase() === value
  );
  return entry ? entry[0] : raw;
};

const parseStatusFilter = (raw?: string | null) => {
  if (!raw) return null;
  const value = raw.toLowerCase().trim();
  const entry = Object.entries(STATUS_LABELS).find(
    ([key, label]) =>
      key === value ||
      label.pt.toLowerCase() === value ||
      label.en.toLowerCase() === value
  );
  return entry ? entry[0] : raw;
};

const localizeTeamName = (name: string, lang: Lang) => {
  if (lang === "en") {
    if (name === "Sem agenda marcada") return "No schedule set";
    if (name === "TBD") return "No schedule set";
    return name;
  }
  return TEAM_NAME_PT[name] || name;
};

const localizeStage = (stage: string, lang: Lang) => STAGE_LABELS[stage]?.[lang] || stage;
const localizeStatus = (status: string, lang: Lang) => STATUS_LABELS[status]?.[lang] || status;

const localizeVenueValue = (value: string, lang: Lang) => {
  if (value === "TBD" || value === "A definir") {
    return lang === "pt" ? "A definir" : "To be defined";
  }
  return value;
};

const toMatchResponse = (match: any, lang: Lang) => ({
  id: match.id,
  home_team_name: localizeTeamName(match.homeTeamName, lang),
  away_team_name: localizeTeamName(match.awayTeamName, lang),
  home_team_flag: match.homeTeamFlag || "",
  away_team_flag: match.awayTeamFlag || "",
  match_date: match.matchDate,
  stadium_name: localizeVenueValue(match.stadiumName, lang),
  stadium_city: localizeVenueValue(match.stadiumCity, lang),
  status: match.status,
  status_label: localizeStatus(match.status, lang),
  stage: match.stage,
  stage_label: localizeStage(match.stage, lang),
  home_score: match.homeScore ?? null,
  away_score: match.awayScore ?? null,
  tv_channel: match.tvChannel ?? null,
  streaming_platform: match.streamingPlatform ?? null,
});

export class MatchesController {
  static async index(req: Request, res: Response) {
    try {
      const lang = resolveLang(req);
      const stageQuery = toParamString(req.query.stage as string | string[] | undefined);
      const statusQuery = toParamString(req.query.status as string | string[] | undefined);
      const where: any = {};
      where.matchDate = {
        gte: new Date("2026-01-01T00:00:00.000Z"),
        lt: new Date("2027-01-01T00:00:00.000Z"),
      };

      const stageFilter = parseStageFilter(stageQuery);
      if (stageFilter && stageFilter.length > 0) {
        where.stage = stageFilter;
      }

      const statusFilter = parseStatusFilter(statusQuery);
      if (statusFilter && statusFilter.length > 0) {
        where.status = statusFilter;
      }

      const matches = await prisma.match.findMany({
        where,
        orderBy: { matchDate: "asc" },
      });

      return res.json({
        lang,
        matches: matches.map((match) => toMatchResponse(match, lang)),
        total: matches.length,
      });
    } catch (error) {
      console.error("GET /api/matches error:", error);
      return res.status(500).json({ error: "Failed to fetch matches" });
    }
  }

  static async show(req: Request, res: Response) {
    try {
      const lang = resolveLang(req);
      const id = toParamString(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Missing match id" });
      }
      const match = await prisma.match.findUnique({ where: { id } });
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }
      return res.json({ lang, match: toMatchResponse(match, lang) });
    } catch (error) {
      console.error("GET /api/matches/:id error:", error);
      return res.status(500).json({ error: "Failed to fetch match" });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const lang = resolveLang(req);
      const {
        home_team_name,
        away_team_name,
        home_team_flag,
        away_team_flag,
        match_date,
        stadium_name,
        stadium_city,
        status,
        stage,
        home_score,
        away_score,
        tv_channel,
        streaming_platform,
      } = req.body || {};

      if (
        !home_team_name ||
        !away_team_name ||
        !home_team_flag ||
        !away_team_flag ||
        !match_date ||
        !stadium_name ||
        !stadium_city
      ) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const created = await prisma.match.create({
        data: {
          homeTeamName: home_team_name,
          awayTeamName: away_team_name,
          homeTeamFlag: home_team_flag,
          awayTeamFlag: away_team_flag,
          matchDate: new Date(match_date),
          stadiumName: stadium_name,
          stadiumCity: stadium_city,
          status: status || "scheduled",
          stage: stage || "group_stage",
          homeScore: home_score ?? null,
          awayScore: away_score ?? null,
          tvChannel: tv_channel ?? null,
          streamingPlatform: streaming_platform ?? null,
        },
      });

      return res.status(201).json({ lang, match: toMatchResponse(created, lang) });
    } catch (error) {
      console.error("POST /api/matches error:", error);
      return res.status(500).json({ error: "Failed to create match" });
    }
  }
}
