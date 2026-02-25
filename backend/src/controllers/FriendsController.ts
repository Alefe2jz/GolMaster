import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const toParamString = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const buildStatsMap = async (userIds: string[]) => {
  if (userIds.length === 0) return new Map<string, any>();
  const totals = await prisma.prediction.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _count: { _all: true },
  });
  const corrects = await prisma.prediction.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, isCorrect: true },
    _count: { _all: true },
  });

  const map = new Map<string, any>();
  for (const row of totals) {
    map.set(row.userId, { total: row._count._all, correct: 0 });
  }
  for (const row of corrects) {
    const current = map.get(row.userId) || { total: 0, correct: 0 };
    current.correct = row._count._all;
    map.set(row.userId, current);
  }
  return map;
};

export class FriendsController {
  static async index(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const status =
        typeof req.query.status === "string" ? req.query.status : "accepted";

      const friendships = await prisma.friend.findMany({
        where: {
          status,
          OR: [{ userId }, { friendId: userId }],
        },
        include: {
          user: true,
          friend: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const friendUsers = friendships.map((f) =>
        f.userId === userId ? f.friend : f.user
      );
      const friendIds = friendUsers.map((u) => u.id);
      const statsMap = await buildStatsMap(friendIds);

      const friends = friendships.map((f) => {
        const friendUser = f.userId === userId ? f.friend : f.user;
        const stats = statsMap.get(friendUser.id) || { total: 0, correct: 0 };
        const successRate =
          stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

        return {
          friendship_id: f.id,
          name: friendUser.name,
          email: friendUser.email,
          total_predictions: stats.total,
          correct_predictions: stats.correct,
          success_rate: successRate,
        };
      });

      return res.json({ friends, total: friends.length });
    } catch (error) {
      console.error("GET /api/friends error:", error);
      return res.status(500).json({ error: "Failed to fetch friends" });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const { friend_email } = req.body || {};
      if (!friend_email) {
        return res.status(400).json({ error: "Missing friend_email" });
      }

      const friendUser = await prisma.user.findUnique({
        where: { email: String(friend_email).toLowerCase() },
      });
      if (!friendUser) {
        return res.status(404).json({ error: "User not found" });
      }
      if (friendUser.id === userId) {
        return res.status(400).json({ error: "Cannot add yourself" });
      }

      const existing = await prisma.friend.findFirst({
        where: {
          OR: [
            { userId, friendId: friendUser.id },
            { userId: friendUser.id, friendId: userId },
          ],
        },
      });
      if (existing) {
        return res.status(409).json({ error: "Already friends or pending" });
      }

      const friendship = await prisma.friend.create({
        data: {
          userId,
          friendId: friendUser.id,
          status: "pending",
        },
      });

      return res.status(201).json({
        friendship: {
          id: friendship.id,
          status: friendship.status,
        },
      });
    } catch (error) {
      console.error("POST /api/friends error:", error);
      return res.status(500).json({ error: "Failed to add friend" });
    }
  }

  static async respond(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const id = toParamString(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Missing friendship id" });
      }
      const { action } = req.body || {};

      const friendship = await prisma.friend.findUnique({ where: { id } });
      if (!friendship) {
        return res.status(404).json({ error: "Friendship not found" });
      }

      if (friendship.friendId !== userId && friendship.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (action === "accept") {
        if (friendship.friendId !== userId) {
          return res.status(403).json({ error: "Only recipient can accept" });
        }
        const updated = await prisma.friend.update({
          where: { id },
          data: { status: "accepted" },
        });
        return res.json({ friendship: { id: updated.id, status: updated.status } });
      }

      if (action === "decline") {
        await prisma.friend.delete({ where: { id } });
        return res.json({ ok: true });
      }

      return res.status(400).json({ error: "Invalid action" });
    } catch (error) {
      console.error("PUT /api/friends/:id error:", error);
      return res.status(500).json({ error: "Failed to update friendship" });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const id = toParamString(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Missing friendship id" });
      }
      const friendship = await prisma.friend.findUnique({ where: { id } });
      if (!friendship) {
        return res.status(404).json({ error: "Friendship not found" });
      }
      if (friendship.friendId !== userId && friendship.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await prisma.friend.delete({ where: { id } });
      return res.json({ ok: true });
    } catch (error) {
      console.error("DELETE /api/friends/:id error:", error);
      return res.status(500).json({ error: "Failed to remove friendship" });
    }
  }
}
