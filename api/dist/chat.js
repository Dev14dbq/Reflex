"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatWebSocket = chatWebSocket;
// src/chat.ts
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("./prisma");
const notify_1 = require("./notify");
// chatId → Set of WebSocket clients subscribed to that chat
const chatSubscriptions = new Map();
// helper to broadcast a server-push notification to all subs of a chat
function broadcastToChat(chatId, notification) {
    const subs = chatSubscriptions.get(chatId);
    if (!subs)
        return;
    const msg = JSON.stringify(notification);
    subs.forEach((client) => {
        try {
            client.send(msg);
        }
        catch (err) { /* swallow */ }
    });
}
function chatWebSocket(ws, req) {
    // —–– AUTHENTICATION –––—
    let userId;
    try {
        const url = new URL(req.url ?? "", "http://localhost");
        const token = url.searchParams.get("token");
        if (!token)
            throw new Error("No token provided");
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        userId = payload.userId;
        // Отправляем событие успешной аутентификации
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: "authenticated", payload: { success: true } }));
        }
    }
    catch (err) {
        console.error("[WS] Auth failed:", err);
        ws.close(1008, "Unauthorized");
        return;
    }
    // Обработка ping для поддержания соединения
    ws.on("message", async (raw) => {
        // Обработка ping
        if (raw.toString() === JSON.stringify({ action: "ping" })) {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(JSON.stringify({ event: "pong" }));
            }
            return;
        }
        let msg;
        try {
            msg = JSON.parse(raw.toString());
        }
        catch {
            return ws.send(JSON.stringify({ error: { code: 400, message: "Invalid JSON" } }));
        }
        const { id, action, params = {} } = msg;
        if (id === undefined && action !== "ping") {
            return ws.send(JSON.stringify({ error: { code: 400, message: "Missing id" } }));
        }
        const sendResult = (result) => {
            const res = { id: id, result };
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(JSON.stringify(res));
            }
        };
        const sendError = (code, message) => {
            const res = { id: id, error: { code, message } };
            if (ws.readyState === ws_1.WebSocket.OPEN) {
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
                    chatSubscriptions.get(chatId).add(ws);
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
                    const chats = await prisma_1.prisma.chat.findMany({
                        where,
                        orderBy: { updatedAt: "desc" },
                        take: limit + 1,
                        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                        include: {
                            userA: { select: { id: true, profile: { select: { id: true, preferredName: true, images: true } } } },
                            userB: { select: { id: true, profile: { select: { id: true, preferredName: true, images: true } } } },
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
                    const chat = await prisma_1.prisma.chat.findUnique({
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
                    const chat = await prisma_1.prisma.chat.findUnique({ where: { id: chatId } });
                    if (!chat)
                        return sendError(404, "Chat not found");
                    const dataToUpdate = {};
                    if (scope === "self") {
                        if (chat.userAId === userId)
                            dataToUpdate.isDeletedByA = true;
                        else if (chat.userBId === userId)
                            dataToUpdate.isDeletedByB = true;
                    }
                    else {
                        dataToUpdate.isDeletedByA = true;
                        dataToUpdate.isDeletedByB = true;
                    }
                    await prisma_1.prisma.chat.update({ where: { id: chatId }, data: dataToUpdate });
                    sendResult({ success: true });
                    broadcastToChat(chatId, { event: "chat_deleted", payload: { chatId, scope } });
                    break;
                }
                // — Archive / unarchive chat
                case "archiveChat": {
                    const { chatId, archive } = params;
                    const chat = await prisma_1.prisma.chat.findUnique({ where: { id: chatId } });
                    if (!chat)
                        return sendError(404, "Chat not found");
                    const dataToUpdate = {};
                    if (chat.userAId === userId)
                        dataToUpdate.isArchivedByA = !!archive;
                    else if (chat.userBId === userId)
                        dataToUpdate.isArchivedByB = !!archive;
                    await prisma_1.prisma.chat.update({ where: { id: chatId }, data: dataToUpdate });
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
                    const messages = await prisma_1.prisma.message.findMany({
                        where: { chatId },
                        orderBy: { createdAt: "desc" },
                        take: limit + 1,
                        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                        select: { id: true, senderId: true, text: true, media: true, type: true, createdAt: true, editedAt: true, readAt: true }
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
                    const message = await prisma_1.prisma.message.create({
                        data: {
                            chatId,
                            senderId: userId,
                            text,
                            media: mediaUrl,
                            type: type || 'text',
                        },
                    });
                    // Обновляем время последнего обновления чата
                    await prisma_1.prisma.chat.update({
                        where: { id: chatId },
                        data: { updatedAt: new Date() }
                    });
                    sendResult({ message });
                    broadcastToChat(chatId, {
                        event: "new_message",
                        payload: { chatId, message },
                    });
                    // push Telegram notification to recipient
                    const chat = await prisma_1.prisma.chat.findUnique({ where: { id: chatId } });
                    if (chat) {
                        const recipientId = chat.userAId === userId ? chat.userBId : chat.userAId;
                        const recipUser = await prisma_1.prisma.user.findUnique({ where: { id: recipientId } });
                        const settings = await prisma_1.prisma.settings.findUnique({ where: { userId: recipientId } });
                        if (recipUser && (!settings || settings.notifyMessages)) {
                            const snippet = text ? text.slice(0, 30) : (mediaUrl ? "[медиа]" : "сообщение");
                            (0, notify_1.sendTG)(recipUser.telegramId, `💬 Новое сообщение от ${(await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { profile: { select: { preferredName: true } } } }))?.profile?.preferredName || "пользователя"}: ${snippet}`);
                        }
                    }
                    break;
                }
                // — Edit your message
                case "editMessage": {
                    const { messageId, text: newText } = params;
                    const existing = await prisma_1.prisma.message.findUnique({ where: { id: messageId } });
                    if (!existing)
                        return sendError(404, "Message not found");
                    if (existing.senderId !== userId)
                        return sendError(403, "Forbidden");
                    const updated = await prisma_1.prisma.message.update({
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
                    const existing = await prisma_1.prisma.message.findUnique({ where: { id: messageId } });
                    if (!existing)
                        return sendError(404, "Message not found");
                    if (existing.senderId !== userId)
                        return sendError(403, "Forbidden");
                    if (scope === "both") {
                        await prisma_1.prisma.message.delete({ where: { id: messageId } });
                    }
                    else {
                        // TODO: implement self-delete via a flag in DB
                        await prisma_1.prisma.message.update({
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
                    await prisma_1.prisma.message.updateMany({
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
        }
        catch (err) {
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
