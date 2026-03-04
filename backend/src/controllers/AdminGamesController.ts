import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const toMatchPayload = (match: any) => ({
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
  home_score: match.homeScore,
  away_score: match.awayScore,
  tv_channel: match.tvChannel,
  streaming_platform: match.streamingPlatform,
});

export class AdminGamesController {
  static async index(_req: Request, res: Response) {
    try {
      const matches = await prisma.match.findMany({
        orderBy: { matchDate: "asc" },
      });
      return res.json({ ok: true, data: matches.map(toMatchPayload) });
    } catch (error) {
      console.error("GET /api/admin/games error:", error);
      return res.status(500).json({ error: "Failed to fetch games" });
    }
  }

  static async updateScore(req: Request, res: Response) {
    try {
      const id = String(req.params.id || "");
      const { home_score, away_score, status } = req.body || {};
      if (home_score === undefined || away_score === undefined) {
        return res.status(400).json({ error: "Missing score fields" });
      }

      const updated = await prisma.match.update({
        where: { id },
        data: {
          homeScore: Number(home_score),
          awayScore: Number(away_score),
          ...(status ? { status: String(status) } : {}),
        },
      });

      return res.json({ ok: true, data: toMatchPayload(updated) });
    } catch (error) {
      console.error("PATCH /api/admin/games/:id/score error:", error);
      return res.status(500).json({ error: "Failed to update game score" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = String(req.params.id || "");
      const body = req.body || {};

      const data: any = {};
      if (body.home_team_name !== undefined) data.homeTeamName = String(body.home_team_name);
      if (body.away_team_name !== undefined) data.awayTeamName = String(body.away_team_name);
      if (body.home_team_flag !== undefined) data.homeTeamFlag = String(body.home_team_flag);
      if (body.away_team_flag !== undefined) data.awayTeamFlag = String(body.away_team_flag);
      if (body.match_date !== undefined) data.matchDate = new Date(body.match_date);
      if (body.stadium_name !== undefined) data.stadiumName = String(body.stadium_name);
      if (body.stadium_city !== undefined) data.stadiumCity = String(body.stadium_city);
      if (body.status !== undefined) data.status = String(body.status);
      if (body.stage !== undefined) data.stage = String(body.stage);
      if (body.home_score !== undefined) data.homeScore = Number(body.home_score);
      if (body.away_score !== undefined) data.awayScore = Number(body.away_score);
      if (body.tv_channel !== undefined) data.tvChannel = body.tv_channel ? String(body.tv_channel) : null;
      if (body.streaming_platform !== undefined) {
        data.streamingPlatform = body.streaming_platform ? String(body.streaming_platform) : null;
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "No updatable fields were provided" });
      }

      const updated = await prisma.match.update({
        where: { id },
        data,
      });

      return res.json({ ok: true, data: toMatchPayload(updated) });
    } catch (error) {
      console.error("PATCH /api/admin/games/:id error:", error);
      return res.status(500).json({ error: "Failed to update game" });
    }
  }
}
