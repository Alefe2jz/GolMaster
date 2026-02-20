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

  const matchesData = [
    {
      homeTeamName: "Brasil",
      awayTeamName: "Alemanha",
      homeTeamFlag: "🇧🇷",
      awayTeamFlag: "🇩🇪",
      matchDate: new Date("2026-06-20T20:00:00.000Z"),
      stadiumName: "Maracana",
      stadiumCity: "Rio de Janeiro",
      status: "scheduled",
      stage: "group_stage",
      tvChannel: "Globo",
      streamingPlatform: "Globoplay",
    },
    {
      homeTeamName: "Argentina",
      awayTeamName: "Franca",
      homeTeamFlag: "🇦🇷",
      awayTeamFlag: "🇫🇷",
      matchDate: new Date("2026-06-22T18:00:00.000Z"),
      stadiumName: "Monumental",
      stadiumCity: "Buenos Aires",
      status: "scheduled",
      stage: "group_stage",
      tvChannel: "ESPN",
      streamingPlatform: "Star+",
    },
    {
      homeTeamName: "Espanha",
      awayTeamName: "Italia",
      homeTeamFlag: "🇪🇸",
      awayTeamFlag: "🇮🇹",
      matchDate: new Date("2026-06-25T21:00:00.000Z"),
      stadiumName: "Bernabeu",
      stadiumCity: "Madrid",
      status: "live",
      stage: "group_stage",
      homeScore: 1,
      awayScore: 0,
      tvChannel: "TNT",
      streamingPlatform: "Max",
    },
    {
      homeTeamName: "Inglaterra",
      awayTeamName: "Portugal",
      homeTeamFlag: "🏴",
      awayTeamFlag: "🇵🇹",
      matchDate: new Date("2026-06-10T19:00:00.000Z"),
      stadiumName: "Wembley",
      stadiumCity: "London",
      status: "finished",
      stage: "group_stage",
      homeScore: 2,
      awayScore: 2,
      tvChannel: "BBC",
      streamingPlatform: "BBC iPlayer",
    },
  ];

  const createdMatches = [];
  for (const data of matchesData) {
    const match = await prisma.match.create({ data });
    createdMatches.push(match);
  }

  const scheduled = createdMatches.filter((m) => m.status === "scheduled");
  if (scheduled.length > 0) {
    await prisma.prediction.upsert({
      where: { userId_matchId: { userId: user.id, matchId: scheduled[0].id } },
      update: { predictedHomeScore: 2, predictedAwayScore: 1, isCorrect: null },
      create: {
        userId: user.id,
        matchId: scheduled[0].id,
        predictedHomeScore: 2,
        predictedAwayScore: 1,
        isCorrect: null,
      },
    });
  }

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
