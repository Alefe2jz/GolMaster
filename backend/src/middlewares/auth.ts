import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

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

    req.userId = decoded.sub;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
