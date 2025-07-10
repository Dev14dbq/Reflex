// src/chat.ts
import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { prisma } from "./prisma.ts";
import { sendTG } from "./notify.ts";

import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { sha256 } from 'js-sha256';
import jwt from "jsonwebtoken";


interface RpcRequest {
  id?: number;
  action: string;
  params?: any;
}

interface RpcResponse {
  id: number;
  result?: any;
  error?: { code: number; message: string };
}

interface Notification {
  event: string;
  payload: any;
}

// chatId → Set of WebSocket clients subscribed to that chat
const chatSubscriptions = new Map<string, Set<WebSocket>>();

// helper to broadcast a server-push notification to all subs of a chat
function broadcastToChat(chatId: string, notification: Notification) {
  const subs = chatSubscriptions.get(chatId);
  if (!subs) return;
  const msg = JSON.stringify(notification);
  subs.forEach((client) => {
    try { client.send(msg); }
    catch (err) { /* swallow */ }
  });
}

export function chatWebSocket(ws: WebSocket, req: IncomingMessage) {
  // —–– AUTHENTICATION –––—
  let userId: string;
  try {
    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");
    if (!token) throw new Error("No token provided");

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    userId = payload.userId;
    
    // Отправляем событие успешной аутентификации
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: "authenticated", payload: { success: true } }));
    }
  } catch (err) {
    console.error("[WS] Auth failed:", err);
    ws.close(1008, "Unauthorized");
    return;
  }

  // Обработка ping для поддержания соединения
  ws.on("message", async (raw) => {
    // Обработка ping
    if (raw.toString() === JSON.stringify({ action: "ping" })) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: "pong" }));
      }
      return;
    }

    let msg: RpcRequest;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return ws.send(JSON.stringify({ error: { code: 400, message: "Invalid JSON" } }));
    }

    const { id, action, params = {} } = msg;
    if (id === undefined && action !== "ping") {
      return ws.send(JSON.stringify({ error: { code: 400, message: "Missing id" } }));
    }

    const sendResult = (result: any) => {
      const res: RpcResponse = { id: id!, result };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(res));
      }
    };
    const sendError = (code: number, message: string) => {
      const res: RpcResponse = { id: id!, error: { code, message } };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(res));
      }
    };

    try {
      switch (action) {
        // — Subscribe to updates in a chat
        case "subscribe": {
          const { chatId } = params;
          if (!chatSubscriptions.has(chatId)) {
            chatSubscriptions.set(chatId, new Set());
          }
          chatSubscriptions.get(chatId)!.add(ws);
          sendResult({ subscribed: true });
          break;
        }

        // — Unsubscribe
        case "unsubscribe": {
          const { chatId } = params;
          chatSubscriptions.get(chatId)?.delete(ws);
          sendResult({ unsubscribed: true });
          break;
        }

        // — Get your chats
        case "getChats": {
          const { limit = 20, cursor } = params;

          const where = {
            OR: [
              { userAId: userId, isDeletedByA: false },
              { userBId: userId, isDeletedByB: false },
            ],
          };
          
          const chats = await prisma.chat.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: {
              userA: { select: { id: true, profile: { select: { id:true, preferredName: true, images: true } } } },
              userB: { select: { id: true, profile: { select: { id:true, preferredName: true, images: true } } } },
              messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { text: true, type: true, createdAt: true }
              }
            },
          });
          
          if (chats.length === 0 && !cursor) {
            // Нет чатов — просто возвращаем пустой список без создания "чата поддержки".
            sendResult({ items: [], nextCursor: null });
            break;
          }
          
          const hasMore = chats.length > limit;
          const items = chats.slice(0, limit).map(chat => {
            const otherUser = chat.userAId === userId ? chat.userB : chat.userA;
            const lastMessage = chat.messages[0];
            return {
              ...chat,
              lastMessage: lastMessage?.text || null,
              lastMessageTime: lastMessage?.createdAt || chat.createdAt,
              otherUser: {
                userId: otherUser.id,
                profileId: otherUser.profile?.id || null,
                preferredName: otherUser.profile?.preferredName || 'Пользователь',
                avatar: otherUser.profile?.images?.[0] || null
              }
            };
          });
          const nextCursor = hasMore ? items[items.length - 1].id : null;
          
          sendResult({ items, nextCursor });
          break;
        }

        // — Open a single chat metadata
        case "openChat": {
          const { chatId } = params;
          
          const chat = await prisma.chat.findUnique({ 
            where: { id: chatId },
            include: {
              userA: { select: { id: true, profile: { select: { preferredName: true } } } },
              userB: { select: { id: true, profile: { select: { preferredName: true } } } },
            }
          });
          
          if (!chat) {
            return sendError(404, "Chat not found");
          }
          
          sendResult({ chat });
          break;
        }

        // — Delete chat (self or both)
        case "deleteChat": {
          const { chatId, scope = "self" } = params;
          const chat = await prisma.chat.findUnique({ where: { id: chatId } });
          if (!chat) return sendError(404, "Chat not found");

          const dataToUpdate: any = {};
          if (scope === "self") {
            if (chat.userAId === userId) dataToUpdate.isDeletedByA = true;
            else if (chat.userBId === userId) dataToUpdate.isDeletedByB = true;
          } else {
            dataToUpdate.isDeletedByA = true;
            dataToUpdate.isDeletedByB = true;
          }

          await prisma.chat.update({ where: { id: chatId }, data: dataToUpdate });
          sendResult({ success: true });
          broadcastToChat(chatId, { event: "chat_deleted", payload: { chatId, scope } });
          break;
        }

        // — Archive / unarchive chat
        case "archiveChat": {
          const { chatId, archive } = params;
          const chat = await prisma.chat.findUnique({ where: { id: chatId } });
          if (!chat) return sendError(404, "Chat not found");

          const dataToUpdate: any = {};
          if (chat.userAId === userId) dataToUpdate.isArchivedByA = !!archive;
          else if (chat.userBId === userId) dataToUpdate.isArchivedByB = !!archive;

          await prisma.chat.update({ where: { id: chatId }, data: dataToUpdate });
          sendResult({ isArchived: archive });
          broadcastToChat(chatId, {
            event: "chat_archived",
            payload: { chatId, by: userId, archive },
          });
          break;
        }

        // — Get messages in a chat
        case "getMessages": {
          const { chatId, limit = 30, cursor } = params;
          
          const messages = await prisma.message.findMany({
            where: { chatId },
            orderBy: { createdAt: "desc" },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            select:{ id:true, senderId:true, text:true, media:true, type:true, createdAt:true, editedAt:true, readAt:true }
          });
          
          if (messages.length === 0 && !cursor) {
            // Нет сообщений в чате
            sendResult({ items: [], nextCursor: null });
            return;
          }
          
          const hasMore = messages.length > limit;
          const items = messages.slice(0, limit).reverse(); // Реверсируем для правильного порядка
          const nextCursor = hasMore ? messages[limit].id : null;
          
          sendResult({ items, nextCursor });
          break;
        }

        // — Send a message
        case "sendMessage": {
          const { chatId, text, mediaUrl, type } = params;
          
          const message = await prisma.message.create({
            data: {
              chatId,
              senderId: userId,
              text,
              media: mediaUrl,
              type: type || 'text',
            },
          });
          
          // Обновляем время последнего обновления чата
          await prisma.chat.update({
            where: { id: chatId },
            data: { updatedAt: new Date() }
          });
          
          sendResult({ message });
          
          broadcastToChat(chatId, {
            event: "new_message",
            payload: { chatId, message },
          });

          // push Telegram notification to recipient
          const chat = await prisma.chat.findUnique({ where: { id: chatId } });
          if (chat) {
            const recipientId = chat.userAId === userId ? chat.userBId : chat.userAId;
            const recipUser = await prisma.user.findUnique({ where: { id: recipientId } });
            const settings = await prisma.settings.findUnique({ where: { userId: recipientId } });
            if (recipUser && (!settings || settings.notifyMessages)) {
              // TODO: Добавить проверку настроек уведомлений. 
              sendTG(recipUser.telegramId, `💬 У вас есть новое сообщение от *${(
                await prisma.user.findUnique({
                  where: {
                    id:userId
                  },
                  select: {
                    profile: {
                      select: {
                        preferredName:true
                      }
                    }
                  }
                }))?.profile?.preferredName || "Неизвестного пользователя"
              }*!`);
            }
          }
          break;
        }

        // — Edit your message
        case "editMessage": {
          const { messageId, text: newText } = params;
          const existing = await prisma.message.findUnique({ where: { id: messageId } });
          if (!existing) return sendError(404, "Message not found");
          if (existing.senderId !== userId) return sendError(403, "Forbidden");

          const updated = await prisma.message.update({
            where: { id: messageId },
            data: { text: newText, editedAt: new Date() },
          });
          sendResult({ message: updated });
          broadcastToChat(existing.chatId, {
            event: "message_updated",
            payload: { message: updated },
          });
          break;
        }

        // — Delete a message (both/self)
        case "deleteMessage": {
          const { messageId, scope = "both" } = params;
          const existing = await prisma.message.findUnique({ where: { id: messageId } });
          if (!existing) return sendError(404, "Message not found");
          if (existing.senderId !== userId) return sendError(403, "Forbidden");

          if (scope === "both") {
            await prisma.message.delete({ where: { id: messageId } });
          } else {
            // TODO: implement self-delete via a flag in DB
            await prisma.message.update({
              where: { id: messageId },
              data: { isDeletedBySender: true }
            });
          }

          sendResult({ success: true });
          broadcastToChat(existing.chatId, {
            event: "message_deleted",
            payload: { messageId, scope },
          });
          break;
        }

        // — Resume after reconnect (optional)
        case "resume": {
          // TODO: implement replay of missed events based on client cursors
          sendError(501, "Not implemented");
          break;
        }

        // --- Mark messages as read
        case "markRead": {
          const { chatId, messageIds } = params;
          if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return sendError(400, "messageIds required");
          }
 
          await prisma.message.updateMany({
            where: {
              id: { in: messageIds },
              chatId,
              senderId: { not: userId },
              readAt: null,
            },
            data: { readAt: new Date() },
          });

          sendResult({ marked: messageIds.length });
          broadcastToChat(chatId, {
            event: "messages_read",
            payload: { messageIds, by: userId },
          });
          break;
        }

        default:
          sendError(400, "Unknown action");
      }
    } catch (err) {
      console.error("[WS] Handler error:", action, err);
      sendError(500, "Internal server error");
    }
  });

  ws.on("close", () => {
    // clean up any subscriptions this socket had
    chatSubscriptions.forEach((subs) => subs.delete(ws));
  });

  ws.on("error", (err) => {
    console.error("[WS] Chat socket error:", err);
  });
}

export async function createKey(chat: any) {
  try {
    const secret = `${process.env.CHAT_SECRET}-${chat.id}_${chat.userAId}_${chat.userBId}`;
    const seed = new Uint8Array(sha256.array(secret));
    const keyPair = nacl.box.keyPair.fromSecretKey(seed);

    const encryptionKeyA = new Uint8Array(sha256.array(chat.userAId));
    const encryptionKeyB = new Uint8Array(sha256.array(chat.userBId));

    /**
     * Функция для шифрования сообщений. В данном случае мы шифруем приватные ключи для безопастного хранения в дата базе!
     */
    function encryptMessage(message: string, key: Uint8Array) {
      const nonce = new Uint8Array(24);
      const messageBytes = naclUtil.decodeUTF8(message);
      const ciphertext = nacl.secretbox(messageBytes, nonce, key);
      return { nonce, ciphertext };
    }

    const encryptedPrivKeyA = encryptMessage(naclUtil.encodeBase64(keyPair.secretKey), encryptionKeyA);
    const encryptedPrivKeyB = encryptMessage(naclUtil.encodeBase64(keyPair.secretKey), encryptionKeyB);

    return await prisma.chatKey.create({
      data: {
        PubKey: naclUtil.encodeBase64(keyPair.publicKey),
        PrivatKeyUserA: naclUtil.encodeBase64(encryptedPrivKeyA.ciphertext),
        PrivatKeyUserB: naclUtil.encodeBase64(encryptedPrivKeyB.ciphertext),
        encryptionKeyA: naclUtil.encodeBase64(encryptionKeyA),
        encryptionKeyB: naclUtil.encodeBase64(encryptionKeyB),
        nonceA: naclUtil.encodeBase64(encryptedPrivKeyA.nonce),
        nonceB: naclUtil.encodeBase64(encryptedPrivKeyB.nonce),
      }
    });
  } catch (err) {
    console.error("[createKey] Ошибка при создании ключей чата:", err);
    throw err;
  }
}

import { Router } from "express";

const chatRouter = Router();

chatRouter.post("/chat/keys", async (req:any, res): Promise<void> => {
  try {
    const secret = `${process.env.CHAT_SECRET}-${req.body.key.chatID}_${req.body.key.userA}_${req.body.key.userB}`;
    const seed = new Uint8Array(sha256.array(secret));
    const keyPair = nacl.box.keyPair.fromSecretKey(seed);

    const PubKey = naclUtil.encodeBase64(keyPair.publicKey);
    const data = await prisma.chatKey.findUnique({ where: { PubKey } });

    if(!data) {
      res.status(500).json({ error: "Keys not found" });
      return;
    }
    
    function decryptPrivateKey(encryptedPrivKeyBase64: string, nonceBase64: string): string {
      const encryptionKey = new Uint8Array(sha256.array(req.body.userId));
      const ciphertext = naclUtil.decodeBase64(encryptedPrivKeyBase64);
      const nonce = naclUtil.decodeBase64(nonceBase64);
      const decrypted = nacl.secretbox.open(ciphertext, nonce, encryptionKey);
      if (!decrypted) {
        throw new Error("Failed to decrypt private key");
      }
      return naclUtil.encodeUTF8(decrypted);
    }
     
    const PrivateKey = decryptPrivateKey(
      req.body.userClass === 'A' ? data.PrivatKeyUserA : data.PrivatKeyUserB, 
      req.body.userClass === 'A' ? data.nonceA : data.nonceB
    );

    res.json({
      PubKey,
      PrivateKey
    });
  } catch (e) {
    console.error("[AUTH ERROR]", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

chatRouter.post("/chat/keys/create", async (req:any, res): Promise<void> => {
  try {
    const a = await createKey({ id: req.body.key.chatId, userAId: req.body.key.userA, userBId: req.body.key.userB })

    res.status(200).json(a);
  } catch (e) {
    console.error("[AUTH ERROR]", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { chatRouter };