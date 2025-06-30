"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("./prisma");
const auth_1 = require("./middleware/auth");
exports.statsRouter = (0, express_1.Router)();
exports.statsRouter.get("/stats/me", auth_1.authMiddleware, async (req, res) => {
    const userId = req.userId;
    try {
        // Считаем лайки/дизлайки, отправленные пользователем
        const [likesSent, dislikesSent] = await Promise.all([
            prisma_1.prisma.like.count({ where: { fromUserId: userId, isLike: true } }),
            prisma_1.prisma.like.count({ where: { fromUserId: userId, isLike: false } }),
        ]);
        // Получаем профиль пользователя
        const profile = await prisma_1.prisma.profile.findUnique({ where: { userId } });
        let likesReceived = 0;
        let dislikesReceived = 0;
        let matches = 0;
        if (profile) {
            const profileId = profile.id;
            // Считаем входящие реакции
            [likesReceived, dislikesReceived] = await Promise.all([
                prisma_1.prisma.like.count({ where: { toProfileId: profileId, isLike: true } }),
                prisma_1.prisma.like.count({ where: { toProfileId: profileId, isLike: false } }),
            ]);
            // Матчи — случаи, когда есть запись в таблице Match
            matches = await prisma_1.prisma.match.count({
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
    }
    catch (err) {
        console.error("[API] stats error", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Админ-метрика: все пользователи
exports.statsRouter.get("/stats/all-users", async (req, res) => {
    try {
        const raw = await prisma_1.prisma.user.findMany({
            select: { id: true, telegramId: true },
        });
        const users = raw.map((u) => ({
            id: u.id,
            telegramId: u.telegramId.toString(),
        }));
        res.json({ users });
    }
    catch (err) {
        console.error("[STATS] all-users", err);
        res.status(500).json({ error: "internal" });
    }
});
