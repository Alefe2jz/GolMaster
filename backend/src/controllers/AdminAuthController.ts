import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "golmaster-secret";

export class AdminAuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const user = await prisma.user.findUnique({
        where: { email: String(email).toLowerCase() },
      });

      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.isBlocked) {
        return res.status(403).json({ error: "User is blocked" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.role !== "ADMIN") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });

      return res.json({
        ok: true,
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isBlocked: user.isBlocked,
          },
        },
      });
    } catch (error) {
      console.error("POST /api/admin/auth/login error:", error);
      return res.status(500).json({ error: "Failed to login admin" });
    }
  }
}
