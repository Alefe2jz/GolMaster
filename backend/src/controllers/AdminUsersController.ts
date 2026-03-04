import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export class AdminUsersController {
  static async index(_req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isBlocked: true,
          blockedAt: true,
          blockedReason: true,
          friendCode: true,
          createdAt: true,
        },
      });

      return res.json({ ok: true, data: users });
    } catch (error) {
      console.error("GET /api/admin/users error:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  static async block(req: Request, res: Response) {
    try {
      const id = String(req.params.id || "");
      const { blocked, reason } = req.body || {};
      const shouldBlock = blocked === undefined ? true : !!blocked;

      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) {
        return res.status(404).json({ error: "User not found" });
      }

      const updated = await prisma.user.update({
        where: { id },
        data: shouldBlock
          ? {
              isBlocked: true,
              blockedAt: new Date(),
              blockedReason: reason ? String(reason) : null,
            }
          : {
              isBlocked: false,
              blockedAt: null,
              blockedReason: null,
            },
        select: {
          id: true,
          email: true,
          role: true,
          isBlocked: true,
          blockedAt: true,
          blockedReason: true,
        },
      });

      return res.json({ ok: true, data: updated });
    } catch (error) {
      console.error("PATCH /api/admin/users/:id/block error:", error);
      return res.status(500).json({ error: "Failed to update user block status" });
    }
  }

  static async role(req: Request, res: Response) {
    try {
      const id = String(req.params.id || "");
      const roleRaw = String(req.body?.role || "").toUpperCase();
      if (roleRaw !== "ADMIN" && roleRaw !== "USER") {
        return res.status(400).json({ error: "Invalid role. Use ADMIN or USER" });
      }

      const target = await prisma.user.findUnique({ where: { id } });
      if (!target) {
        return res.status(404).json({ error: "User not found" });
      }

      if (req.userId === id && roleRaw !== "ADMIN") {
        return res.status(400).json({ error: "Cannot remove your own admin role" });
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { role: roleRaw },
        select: {
          id: true,
          email: true,
          role: true,
          isBlocked: true,
        },
      });

      return res.json({ ok: true, data: updated });
    } catch (error) {
      console.error("PATCH /api/admin/users/:id/role error:", error);
      return res.status(500).json({ error: "Failed to update user role" });
    }
  }
}
