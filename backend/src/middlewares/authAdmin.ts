import { Request, Response, NextFunction } from "express";
import { auth } from "./auth";

export function authAdmin(req: Request, res: Response, next: NextFunction) {
  return auth(req, res, () => {
    if (req.userRole !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }
    return next();
  });
}
