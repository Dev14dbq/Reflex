import { Router } from "express";
import { prisma } from "./prisma.ts";
import { authMiddleware } from "./middleware/auth.ts";

export const statsRouter = Router();

interface ResponceData {
  /* Количество отправленых лайков и дизлайков */
  likesSent: number,
  dislikesSent: number,

  sentLikePercent: number,
  likeCoefficient: number,
  matches: number,
  rejectedLikes: number
}

/**
 * Получаем статистику о пользователе который отправил запрос. Важно: ТРЕБУЕТСЯ АУТИФИКАЦИЯ ЧЕРЕЗ ТОКЕН!
 * Endpoint: /stats/me
 * Metod: Only get
 * 
 * @param req 
 * @param res 
 * @returns Check interface ResponceData
 */
statsRouter.get("/stats/me", authMiddleware, async (req, res) => {
  const userId = (req as any).userId;

  try {
    /* Получаем из бд колическо лайков и дизлайков от пользователя - Отправитель */
    const [likesSent, dislikesSent] = await Promise.all([
      prisma.like.count({ where: { fromUserId: userId, isLike: true } }),
      prisma.like.count({ where: { fromUserId: userId, isLike: false } }),
    ]);

    /* Запращиваем профиль из бд */
    const profile = await prisma.profile.findUnique({ where: { userId } });

    let likesReceived = 0, dislikesReceived = 0, matches = 0;

    if (profile) {
      /* Получаем из бд количество лайков и дизлайкав с пользователем - Получатель */
      [likesReceived, dislikesReceived] = await Promise.all([
        prisma.like.count({ where: { toProfileId: profile.id, isLike: true } }),
        prisma.like.count({ where: { toProfileId: profile.id, isLike: false } }),
      ]);

      /* Полачаем из бд все метчи пользователя. Метчи - Взаимный лайк друг друга */
      matches = await prisma.match.count({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
      });
    }

    /* Считаем процент лайков от общего количества просмотренных анкет */
    const totalSent = likesSent + dislikesSent;
    const sentLikePercent = totalSent > 0 ? likesSent / totalSent : null;

    /* Считаем процент который отреагировал на его лайки в анкетах */
    const totalReceived = likesReceived + dislikesReceived;
    const likeCoefficient = totalReceived > 0 ? likesReceived / totalReceived : null;

    /* Считаем сколько анкет которые его лайкнули он отклонил */
    const rejectedLikes = likesReceived - matches;

    res.json({
      likesSent,
      dislikesSent,
      sentLikePercent,
      likeCoefficient,
      matches,
      rejectedLikes,
    });
  } catch (error) {
    console.error("[API] stats error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

interface ResponceData {
  /* Количество отправленых лайков и дизлайков */
  likesSent: number,
  dislikesSent: number,

  sentLikePercent: number,
  likeCoefficient: number,
  matches: number,
  rejectedLikes: number
}

/**
 * Получаем список всех пользователей. Важно: ТРЕБУЕТСЯ АУТИФИКАЦИЯ ЧЕРЕЗ ТОКЕН! Доступно: Только администратору
 * Endpoint: /stats/all-users
 * Metod: Only get
 * 
 * @param req 
 * @param res 
 * @returns Check interface ResponceData
 */
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
