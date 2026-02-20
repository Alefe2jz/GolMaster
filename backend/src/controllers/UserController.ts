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
}
