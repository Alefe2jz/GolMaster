import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export class UserController {
  static async index(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          friendCode: true,
          image: true,
          createdAt: true,
        },
      });

      return res.json(users);
    } catch (error) {
      console.error("GET /api/users error:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  static async removeMe(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await prisma.$transaction([
        prisma.friend.deleteMany({
          where: {
            OR: [{ userId }, { friendId: userId }],
          },
        }),
        prisma.prediction.deleteMany({ where: { userId } }),
        prisma.userSettings.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } }),
      ]);

      return res.json({ ok: true });
    } catch (error) {
      console.error("DELETE /api/users/me error:", error);
      return res.status(500).json({ error: "Failed to delete account" });
    }
  }
}
