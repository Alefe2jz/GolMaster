import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const buildStats = async (userId: string) => {
  const totalMatches = await prisma.match.count();
  const scheduled = await prisma.match.count({ where: { status: "scheduled" } });
  const live = await prisma.match.count({ where: { status: "live" } });
  const finished = await prisma.match.count({ where: { status: "finished" } });

  const totalPredictions = await prisma.prediction.count({
    where: { userId },
  });
  const correctPredictions = await prisma.prediction.count({
    where: { userId, isCorrect: true },
  });
  const incorrectPredictions = await prisma.prediction.count({
    where: { userId, isCorrect: false },
  });
  const pendingPredictions = await prisma.prediction.count({
    where: { userId, isCorrect: null },
  });

  return {
    matches: {
      total_matches: totalMatches,
      scheduled_matches: scheduled,
      live_matches: live,
      finished_matches: finished,
    },
    predictions: {
      total_predictions: totalPredictions,
      correct_predictions: correctPredictions,
      incorrect_predictions: incorrectPredictions,
      pending_predictions: pendingPredictions,
    },
  };
};

export class SyncController {
  static async sync(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const stats = await buildStats(userId);
      return res.json({
        ok: true,
        matches_updated: 0,
        new_matches: 0,
        ...stats,
      });
    } catch (error) {
      console.error("POST /api/sync-fifa error:", error);
      return res.status(500).json({ error: "Failed to sync FIFA data" });
    }
  }

  static async stats(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const stats = await buildStats(userId);
      return res.json(stats);
    } catch (error) {
      console.error("GET /api/sync-fifa error:", error);
      return res.status(500).json({ error: "Failed to fetch stats" });
    }
  }
}
