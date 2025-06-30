import { Router } from "express";
import { prisma } from "./prisma";
import { authMiddleware } from "./middleware/auth";

export const statsRouter = Router();

statsRouter.get("/stats/me", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;

  try {
    // Считаем лайки/дизлайки, отправленные пользователем
    const [likesSent, dislikesSent] = await Promise.all([
      prisma.like.count({ where: { fromUserId: userId, isLike: true } }),
      prisma.like.count({ where: { fromUserId: userId, isLike: false } }),
    ]);

    // Получаем профиль пользователя
    const profile = await prisma.profile.findUnique({ where: { userId } });

    let likesReceived = 0;
    let dislikesReceived = 0;
    let matches = 0;

    if (profile) {
      const profileId = profile.id;

      // Считаем входящие реакции
      [likesReceived, dislikesReceived] = await Promise.all([
        prisma.like.count({ where: { toProfileId: profileId, isLike: true } }),
        prisma.like.count({ where: { toProfileId: profileId, isLike: false } }),
      ]);

      // Матчи — случаи, когда есть запись в таблице Match
      matches = await prisma.match.count({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
      });
    }

    const totalSent = likesSent + dislikesSent;
    const sentLikePercent = totalSent > 0 ? likesSent / totalSent : null;

    const totalReceived = likesReceived + dislikesReceived;
    const likeCoefficient = totalReceived > 0 ? likesReceived / totalReceived : null;

    const rejectedLikes = likesReceived - matches;

    res.json({
      likesSent,
      dislikesSent,
      sentLikePercent,
      likeCoefficient,
      matches,
      rejectedLikes,
    });
  } catch (err) {
    console.error("[API] stats error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Админ-метрика: все пользователи
statsRouter.get("/stats/all-users", async (req, res): Promise<void> => {
  try {
    const raw = await prisma.user.findMany({
      select: { id: true, telegramId: true },
    });

    const users = raw.map((u) => ({
      id: u.id,
      telegramId: u.telegramId.toString(),
    }));

    res.json({ users });
  } catch (err) {
    console.error("[STATS] all-users", err);
    res.status(500).json({ error: "internal" });
  }
});
