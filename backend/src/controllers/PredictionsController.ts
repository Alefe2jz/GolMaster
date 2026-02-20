import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const toPredictionResponse = (prediction: any) => ({
  id: prediction.id,
  match_id: prediction.matchId,
  predicted_home_score: prediction.predictedHomeScore,
  predicted_away_score: prediction.predictedAwayScore,
  is_correct: prediction.isCorrect,
});

export class PredictionsController {
  static async index(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const predictions = await prisma.prediction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        predictions: predictions.map(toPredictionResponse),
        total: predictions.length,
      });
    } catch (error) {
      console.error("GET /api/predictions error:", error);
      return res.status(500).json({ error: "Failed to fetch predictions" });
    }
  }

  static async upsert(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const { match_id, predicted_home_score, predicted_away_score } =
        req.body || {};

      if (
        !match_id ||
        predicted_home_score === undefined ||
        predicted_away_score === undefined
      ) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const match = await prisma.match.findUnique({ where: { id: match_id } });
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }

      if (match.status === "finished" || match.status === "live") {
        return res.status(400).json({
          error: "Cannot predict on finished or live matches",
        });
      }

      const prediction = await prisma.prediction.upsert({
        where: {
          userId_matchId: { userId, matchId: match_id },
        },
        create: {
          userId,
          matchId: match_id,
          predictedHomeScore: Number(predicted_home_score),
          predictedAwayScore: Number(predicted_away_score),
          isCorrect: null,
        },
        update: {
          predictedHomeScore: Number(predicted_home_score),
          predictedAwayScore: Number(predicted_away_score),
          isCorrect: null,
        },
      });

      return res.status(201).json({ prediction: toPredictionResponse(prediction) });
    } catch (error) {
      console.error("POST /api/predictions error:", error);
      return res.status(500).json({ error: "Failed to save prediction" });
    }
  }
}
