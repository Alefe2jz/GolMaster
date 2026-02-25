import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("123456", 8);

  const user = await prisma.user.upsert({
    where: { email: "teste@golmaster.com" },
    update: { name: "Teste", passwordHash },
    create: { name: "Teste", email: "teste@golmaster.com", passwordHash },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "amigo@golmaster.com" },
    update: { name: "Amigo", passwordHash },
    create: { name: "Amigo", email: "amigo@golmaster.com", passwordHash },
  });

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  await prisma.userSettings.upsert({
    where: { userId: user2.id },
    update: {},
    create: { userId: user2.id },
  });

  await prisma.friend.upsert({
    where: {
      userId_friendId: { userId: user.id, friendId: user2.id },
    },
    update: { status: "accepted" },
    create: { userId: user.id, friendId: user2.id, status: "accepted" },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
