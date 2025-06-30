"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.likesWebSocket = likesWebSocket;
// likes.ts
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("./prisma");
const notify_1 = require("./notify");
async function likesWebSocket(ws, req) {
    let userId;
    try {
        const url = new URL(req.url ?? "", "http://localhost");
        const token = url.searchParams.get("token");
        if (!token) {
            ws.close(1008, "No token");
            return;
        }
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        userId = payload.userId;
    }
    catch (err) {
        console.warn("[WS:likes] ❌ Невалидный токен", err);
        ws.close(1008, "Invalid token");
        return;
    }
    const getIncomingLikes = async () => {
        const myProfile = await prisma_1.prisma.profile.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!myProfile)
            return [];
        const incomingLikes = await prisma_1.prisma.like.findMany({
            where: { toProfileId: myProfile.id, isLike: true },
            include: { fromUser: { include: { profile: true } } },
        });
        const alreadyResponded = await prisma_1.prisma.like.findMany({
            where: { fromUserId: userId },
            select: { toProfileId: true },
        });
        const alreadyLikedIds = new Set(alreadyResponded.map((l) => l.toProfileId));
        return incomingLikes
            .map((like) => like.fromUser.profile)
            .filter((p) => p && !alreadyLikedIds.has(p.id));
    };
    const sendNextProfile = async () => {
        const [profile] = await getIncomingLikes();
        if (!profile) {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "no-more-profiles" }));
            }
            return;
        }
        const enriched = {
            id: profile.id,
            preferredName: profile.preferredName,
            description: profile.description,
            city: profile.city,
            goals: profile.goals,
            birthYear: profile.birthYear,
            images: profile.images.length
                ? profile.images
                : [`https://api.dicebear.com/7.x/thumbs/svg?seed=${Math.floor(Math.random() * 1000000)}`],
            user: { id: profile.userId },
        };
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "recommendation", profile: enriched }));
        }
    };
    ws.on("message", async (msg) => {
        try {
            const data = JSON.parse(msg.toString());
            if (!["like", "dislike"].includes(data.type))
                return;
            const isLike = data.type === "like";
            const toProfileId = data.profileId;
            await prisma_1.prisma.like.create({
                data: { fromUserId: userId, toProfileId, isLike },
            });
            if (isLike) {
                const toProfile = await prisma_1.prisma.profile.findUnique({
                    where: { id: toProfileId },
                    select: { userId: true, preferredName: true },
                });
                const myProfile = await prisma_1.prisma.profile.findUnique({
                    where: { userId },
                    select: { id: true, preferredName: true },
                });
                if (toProfile && myProfile) {
                    const reverse = await prisma_1.prisma.like.findUnique({
                        where: {
                            fromUserId_toProfileId: {
                                fromUserId: toProfile.userId,
                                toProfileId: myProfile.id,
                            },
                        },
                    });
                    if (reverse?.isLike) {
                        const [user1, user2] = [userId, toProfile.userId].sort();
                        await prisma_1.prisma.match.upsert({
                            where: { user1Id_user2Id: { user1Id: user1, user2Id: user2 } },
                            update: {},
                            create: { user1Id: user1, user2Id: user2 },
                        });
                        // Проверяем существование чата перед созданием
                        let chat = await prisma_1.prisma.chat.findFirst({
                            where: {
                                OR: [
                                    { userAId: user1, userBId: user2 },
                                    { userAId: user2, userBId: user1 }
                                ]
                            }
                        });
                        if (!chat) {
                            chat = await prisma_1.prisma.chat.create({
                                data: { userAId: user1, userBId: user2 },
                            });
                        }
                        if (ws.readyState === ws_1.WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: "match",
                                chatId: chat.id,
                                userId: toProfile.userId,
                            }));
                        }
                        // Notify both users about match
                        const notifyBoth = async (uid, partnerName) => {
                            const u = await prisma_1.prisma.user.findUnique({ where: { id: uid } });
                            const st = await prisma_1.prisma.settings.findUnique({ where: { userId: uid } });
                            if (u && (!st || st.notifyLikes)) {
                                (0, notify_1.sendTG)(u.telegramId, `🤝 У вас мэтч с ${partnerName}! Откройте Reflex, чтобы начать чат.`);
                            }
                        };
                        await notifyBoth(userId, toProfile.preferredName);
                        await notifyBoth(toProfile.userId, myProfile.preferredName);
                    }
                    // if not match yet, send like notification
                    if (!reverse?.isLike) {
                        const recipientUser = await prisma_1.prisma.user.findUnique({ where: { id: toProfile.userId } });
                        const recipientSettings = await prisma_1.prisma.settings.findUnique({ where: { userId: toProfile.userId } });
                        if (recipientUser && (!recipientSettings || recipientSettings.notifyLikes)) {
                            (0, notify_1.sendTG)(recipientUser.telegramId, `💖 ${myProfile.preferredName} лайкнул(а) вашу анкету в Reflex!`);
                        }
                    }
                }
            }
            await sendNextProfile();
        }
        catch (err) {
            console.error("[WS:likes] ❌ Ошибка обработки", err);
        }
    });
    ws.on("error", (err) => {
        console.error("[WS:likes] ❌ Ошибка WS:", err);
    });
    ws.on("close", (code, reason) => {
    });
    await sendNextProfile();
}
