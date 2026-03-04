import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export class AdminNotificationsController {
  static async create(req: Request, res: Response) {
    try {
      const { title, message, type, is_active } = req.body || {};
      if (!title || !message) {
        return res.status(400).json({ error: "Missing title or message" });
      }

      const notification = await prisma.adminNotification.create({
        data: {
          title: String(title),
          message: String(message),
          type: type ? String(type) : "info",
          isActive: is_active === undefined ? true : !!is_active,
          createdById: req.userId,
        },
      });

      return res.status(201).json({
        ok: true,
        data: {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          is_active: notification.isActive,
          created_at: notification.createdAt,
          updated_at: notification.updatedAt,
        },
      });
    } catch (error) {
      console.error("POST /api/admin/notifications error:", error);
      return res.status(500).json({ error: "Failed to create notification" });
    }
  }

  static async index(_req: Request, res: Response) {
    try {
      const notifications = await prisma.adminNotification.findMany({
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        ok: true,
        data: notifications.map((item) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          type: item.type,
          is_active: item.isActive,
          created_by_id: item.createdById,
          created_at: item.createdAt,
          updated_at: item.updatedAt,
        })),
      });
    } catch (error) {
      console.error("GET /api/admin/notifications error:", error);
      return res.status(500).json({ error: "Failed to fetch notifications" });
    }
  }
}
