import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const SETTINGS_ID = "global";

const toPayload = (settings: any) => ({
  maintenance_mode: settings.maintenanceMode,
  maintenance_message: settings.maintenanceMessage,
  allow_registrations: settings.allowRegistrations,
  allow_google_auth: settings.allowGoogleAuth,
  updated_by_id: settings.updatedById,
  updated_at: settings.updatedAt,
});

const getOrCreateSettings = async (updatedById?: string) => {
  let settings = await prisma.adminSetting.findUnique({
    where: { id: SETTINGS_ID },
  });
  if (!settings) {
    settings = await prisma.adminSetting.create({
      data: {
        id: SETTINGS_ID,
        updatedById: updatedById || null,
      },
    });
  }
  return settings;
};

export class AdminSettingsController {
  static async show(_req: Request, res: Response) {
    try {
      const settings = await getOrCreateSettings();
      return res.json({ ok: true, data: toPayload(settings) });
    } catch (error) {
      console.error("GET /api/admin/settings error:", error);
      return res.status(500).json({ error: "Failed to fetch admin settings" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      await getOrCreateSettings(req.userId);
      const body = req.body || {};
      const data: any = { updatedById: req.userId };

      if (body.maintenance_mode !== undefined) {
        data.maintenanceMode = !!body.maintenance_mode;
      }
      if (body.maintenance_message !== undefined) {
        data.maintenanceMessage = body.maintenance_message
          ? String(body.maintenance_message)
          : null;
      }
      if (body.allow_registrations !== undefined) {
        data.allowRegistrations = !!body.allow_registrations;
      }
      if (body.allow_google_auth !== undefined) {
        data.allowGoogleAuth = !!body.allow_google_auth;
      }

      const settings = await prisma.adminSetting.update({
        where: { id: SETTINGS_ID },
        data,
      });

      return res.json({ ok: true, data: toPayload(settings) });
    } catch (error) {
      console.error("PUT /api/admin/settings error:", error);
      return res.status(500).json({ error: "Failed to update admin settings" });
    }
  }
}
