import { prisma } from "./prisma";

export async function getRecommendationsForUser(userId: string) {
  const disliked = await prisma.like.findMany({
    where: { fromUserId: userId },
    select: { toProfileId: true },
  });

  const blockedIds = disliked.map(d => d.toProfileId);

  return await prisma.profile.findMany({
    where: {
      userId: { not: userId },
      id: { notIn: blockedIds },
    },
    take: 1,
    select: {
      id: true,
      preferredName: true,
      description: true,
      city: true,
      goals: true,
      birthYear: true,
      user: { select: { username: true } }
    }
  });
}
