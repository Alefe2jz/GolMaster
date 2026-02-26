import { prisma } from "../lib/prisma";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const randomChunk = (length: number) =>
  Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");

const buildFriendCode = () => `GM-${randomChunk(4)}-${randomChunk(4)}`;

export const generateUniqueFriendCode = async () => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = buildFriendCode();
    const exists = await prisma.user.findUnique({
      where: { friendCode: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
  }

  return `GM-${Date.now().toString(36).toUpperCase()}-${randomChunk(4)}`;
};
