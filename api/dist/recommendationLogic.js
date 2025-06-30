"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendationsForUser = getRecommendationsForUser;
const prisma_1 = require("./prisma");
async function getRecommendationsForUser(userId) {
    const disliked = await prisma_1.prisma.like.findMany({
        where: { fromUserId: userId },
        select: { toProfileId: true },
    });
    const blockedIds = disliked.map(d => d.toProfileId);
    return await prisma_1.prisma.profile.findMany({
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
