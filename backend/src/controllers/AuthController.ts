import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { generateUniqueFriendCode } from "../utils/friendCode";

const JWT_SECRET = process.env.JWT_SECRET || "golmaster-secret";
const googleClient = new OAuth2Client();

export class AuthController {
  static async register(req: Request, res: Response) {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(409).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 8);
    const friendCode = await generateUniqueFriendCode();

    const user = await prisma.user.create({
      data: {
        name,
        email: String(email).toLowerCase(),
        passwordHash,
        friendCode,
      },
    });



    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        friendCode: user.friendCode,
        image: user.image ?? null,
      },
    });
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
    });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: "Use Google login" });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { sub: user.id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        friendCode: user.friendCode,
        image: user.image ?? null,
      },
    });
  }

  static async googleLogin(req: Request, res: Response) {
    try {
      const { id_token } = req.body || {};
      if (!id_token) {
        return res.status(400).json({ error: "Missing id_token" });
      }

      const audiences = [
        process.env.GOOGLE_CLIENT_ID_WEB,
        process.env.GOOGLE_CLIENT_ID_ANDROID,
      ].filter(Boolean) as string[];

      if (audiences.length === 0) {
        return res.status(500).json({ error: "Google client ids not set" });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: id_token,
        audience: audiences,
      });

      const payload = ticket.getPayload();
      const email = payload?.email;
      if (!email) {
        return res.status(401).json({ error: "Invalid Google token" });
      }

      const name = payload?.name || email.split("@")[0];
      const image = payload?.picture || null;

      const friendCode = await generateUniqueFriendCode();
      const user = await prisma.user.upsert({
        where: { email },
        update: { name, image },
        create: { name, email, image, passwordHash: null, friendCode },
      });

      const userWithFriendCode = user.friendCode
        ? user
        : await prisma.user.update({
            where: { id: user.id },
            data: { friendCode: await generateUniqueFriendCode() },
          });

      const token = jwt.sign({ sub: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      return res.json({
        token,
        user: {
          id: userWithFriendCode.id,
          name: userWithFriendCode.name,
          email: userWithFriendCode.email,
          friendCode: userWithFriendCode.friendCode,
          image: userWithFriendCode.image ?? null,
        },
      });
    } catch (error) {
      console.error("Google login error:", error);
      return res.status(401).json({ error: "Invalid Google token" });
    }
  }
}
