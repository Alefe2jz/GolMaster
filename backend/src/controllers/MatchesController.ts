import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const toParamString = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const toMatchResponse = (match: any) => ({
  id: match.id,
  home_team_name: match.homeTeamName,
  away_team_name: match.awayTeamName,
  home_team_flag: match.homeTeamFlag,
  away_team_flag: match.awayTeamFlag,
  match_date: match.matchDate,
  stadium_name: match.stadiumName,
  stadium_city: match.stadiumCity,
  status: match.status,
  stage: match.stage,
  home_score: match.homeScore ?? null,
  away_score: match.awayScore ?? null,
  tv_channel: match.tvChannel ?? null,
  streaming_platform: match.streamingPlatform ?? null,
});

export class MatchesController {
  static async index(req: Request, res: Response) {
    try {
      const { stage, status } = req.query;
      const where: any = {};
      if (typeof stage === "string" && stage.length > 0) {
        where.stage = stage;
      }
      if (typeof status === "string" && status.length > 0) {
        where.status = status;
      }

      const matches = await prisma.match.findMany({
        where,
        orderBy: { matchDate: "asc" },
      });

      return res.json({
        matches: matches.map(toMatchResponse),
        total: matches.length,
      });
    } catch (error) {
      console.error("GET /api/matches error:", error);
      return res.status(500).json({ error: "Failed to fetch matches" });
    }
  }

  static async show(req: Request, res: Response) {
    try {
      const id = toParamString(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Missing match id" });
      }
      const match = await prisma.match.findUnique({ where: { id } });
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }
      return res.json({ match: toMatchResponse(match) });
    } catch (error) {
      console.error("GET /api/matches/:id error:", error);
      return res.status(500).json({ error: "Failed to fetch match" });
    }
  }

  static async create(req: Request, res: Response) {
    try {
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

      return res.status(201).json({ match: toMatchResponse(created) });
    } catch (error) {
      console.error("POST /api/matches error:", error);
      return res.status(500).json({ error: "Failed to create match" });
    }
  }
}
