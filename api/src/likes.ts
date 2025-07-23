// likes.ts
import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma.ts";
import { sendTG } from "./notify.ts";

import {createKey} from "./chat.ts";

export async function likesWebSocket(ws: WebSocket, req: IncomingMessage) {
  let userId: string;
  try {
    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");
    if (!token) {
      ws.close(1008, "No token");
      return;
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    userId = payload.userId as string;
  } catch (err) {
    console.warn("[WS:likes] ❌ Невалидный токен", err);
    ws.close(1008, "Invalid token");
    return;
  }

  const getIncomingLikes = async () => {
    const myProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!myProfile) return [];

    const incomingLikes = await prisma.like.findMany({
      where: { toProfileId: myProfile.id, isLike: true },
      include: { fromUser: { include: { profile: true } } },
    });

    const alreadyResponded = await prisma.like.findMany({
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
      if (ws.readyState === WebSocket.OPEN) {
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

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "recommendation", profile: enriched }));
    }
  };

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      if (!["like", "dislike"].includes(data.type)) return;

      const isLike = data.type === "like";
      const toProfileId = data.profileId as string;

      await prisma.like.create({
        data: { fromUserId: userId, toProfileId, isLike },
      });

      if (isLike) {
        const toProfile = await prisma.profile.findUnique({
          where: { id: toProfileId },
          select: { userId: true, preferredName: true },
        });
        const myProfile = await prisma.profile.findUnique({
          where: { userId },
          select: { id: true, preferredName: true },
        });

        if (toProfile && myProfile) {
          const reverse = await prisma.like.findUnique({
            where: {
              fromUserId_toProfileId: {
                fromUserId: toProfile.userId,
                toProfileId: myProfile.id,
              },
            },
          });

          if (reverse?.isLike) {
            const [user1, user2] = [userId, toProfile.userId].sort();
            await prisma.match.upsert({
              where: { user1Id_user2Id: { user1Id: user1, user2Id: user2 } },
              update: {},
              create: { user1Id: user1, user2Id: user2 },
            });
            
            // Проверяем существование чата перед созданием
            let chat = await prisma.chat.findFirst({
              where: {
                OR: [
                  { userAId: user1, userBId: user2 },
                  { userAId: user2, userBId: user1 }
                ]
              }
            });

            if (!chat) {
              chat = await prisma.chat.create({
                data: { userAId: user1, userBId: user2 },
              });

              createKey(chat);
            }

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: "match",
                chatId: chat.id,
                userId: toProfile.userId,
              }));
            }

            // Notify both users about match
            const notifyBoth = async (uid: string, partnerName: string) => {
              const u = await prisma.user.findUnique({ where: { id: uid } });
              const st = await prisma.settings.findUnique({ where: { userId: uid } });
              if (u && (!st || st.notifyLikes)) {
                sendTG(u.telegramId, `🤝 У вас мэтч с ${partnerName}! Откройте Reflex, чтобы начать чат.`);
              }
            };
            await notifyBoth(userId, toProfile.preferredName);
            await notifyBoth(toProfile.userId, myProfile.preferredName);

          }
          // if not match yet, send like notification
          if (!reverse?.isLike) {
            const recipientUser = await prisma.user.findUnique({ where: { id: toProfile.userId } });
            const recipientSettings = await prisma.settings.findUnique({ where: { userId: toProfile.userId } });
            if (recipientUser && (!recipientSettings || recipientSettings.notifyLikes)) {
              sendTG(recipientUser.telegramId, `💖 ${myProfile.preferredName} лайкнул(а) вашу анкету в Reflex!`);
            }
          }
        }
      }

      await sendNextProfile();
    } catch (err) {
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
