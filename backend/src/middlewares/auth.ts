import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "golmaster-secret";

interface TokenPayload {
  sub: string;
}

export function auth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token missing" });
  }

  const [, token] = authHeader.split(" ");

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    const userId = decoded.sub;
    req.userId = userId;
    return prisma.user
      .findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, isBlocked: true },
      })
      .then((user) => {
        if (!user) {
          return res.status(401).json({ error: "Invalid token" });
        }
        if (user.isBlocked) {
          return res.status(403).json({ error: "User is blocked" });
        }
        req.userEmail = user.email;
        req.userRole = user.role;
        return next();
      })
      .catch(() => res.status(401).json({ error: "Invalid token" }));
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
