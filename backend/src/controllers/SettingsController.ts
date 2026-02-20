import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const toSettingsResponse = (settings: any) => ({
  settings: {
    language: settings.language,
    timezone: settings.timezone,
    notifications_enabled: settings.notificationsEnabled,
  },
});

export class SettingsController {
  static async show(req: Request, res: Response) {
    try {
      const userId = req.userId;
      let settings = await prisma.userSettings.findUnique({
        where: { userId },
      });

      if (!settings) {
        settings = await prisma.userSettings.create({
          data: { userId },
        });
      }

      return res.json(toSettingsResponse(settings));
    } catch (error) {
      console.error("GET /api/user-settings error:", error);
      return res.status(500).json({ error: "Failed to fetch settings" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const { language, timezone, notifications_enabled } = req.body || {};

      const settings = await prisma.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          language: language || "pt",
          timezone: timezone || "America/Sao_Paulo",
          notificationsEnabled:
            notifications_enabled === undefined ? true : !!notifications_enabled,
        },
        update: {
          ...(language ? { language } : {}),
          ...(timezone ? { timezone } : {}),
          ...(notifications_enabled !== undefined
            ? { notificationsEnabled: !!notifications_enabled }
            : {}),
        },
      });

      return res.json(toSettingsResponse(settings));
    } catch (error) {
      console.error("PUT /api/user-settings error:", error);
      return res.status(500).json({ error: "Failed to update settings" });
    }
  }
}
