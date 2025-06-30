"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustChangeReason = void 0;
exports.changeTrustScore = changeTrustScore;
exports.checkProfileCompleteness = checkProfileCompleteness;
exports.checkNsfwContent = checkNsfwContent;
exports.checkChatActivity = checkChatActivity;
exports.checkMassLikes = checkMassLikes;
exports.performTrustCheck = performTrustCheck;
exports.getTrustHistory = getTrustHistory;
exports.unblockUser = unblockUser;
const prisma_1 = require("./prisma");
// Причины изменения уровня доверия
var TrustChangeReason;
(function (TrustChangeReason) {
    // Положительные действия
    TrustChangeReason["PROFILE_COMPLETED"] = "profile_completed";
    TrustChangeReason["PHOTO_ADDED"] = "photo_added";
    TrustChangeReason["VERIFIED_PHONE"] = "verified_phone";
    TrustChangeReason["ACTIVE_CHATS"] = "active_chats";
    TrustChangeReason["POSITIVE_REPORTS"] = "positive_reports";
    TrustChangeReason["GOOD_BEHAVIOR"] = "good_behavior";
    // Негативные действия
    TrustChangeReason["NSFW_CONTENT"] = "nsfw_content";
    TrustChangeReason["SPAM_DETECTED"] = "spam_detected";
    TrustChangeReason["INAPPROPRIATE_MESSAGES"] = "inappropriate_messages";
    TrustChangeReason["FAKE_PROFILE"] = "fake_profile";
    TrustChangeReason["USER_REPORTS"] = "user_reports";
    TrustChangeReason["INACTIVE_LONG"] = "inactive_long";
    TrustChangeReason["BLOCKED_MANY_USERS"] = "blocked_many_users";
    TrustChangeReason["MASS_LIKES"] = "mass_likes";
    TrustChangeReason["LOW_RESPONSE_RATE"] = "low_response_rate";
})(TrustChangeReason || (exports.TrustChangeReason = TrustChangeReason = {}));
// Веса изменений для каждой причины
const TRUST_CHANGE_WEIGHTS = {
    // Положительные
    [TrustChangeReason.PROFILE_COMPLETED]: +10,
    [TrustChangeReason.PHOTO_ADDED]: +5,
    [TrustChangeReason.VERIFIED_PHONE]: +15,
    [TrustChangeReason.ACTIVE_CHATS]: +3,
    [TrustChangeReason.POSITIVE_REPORTS]: +5,
    [TrustChangeReason.GOOD_BEHAVIOR]: +2,
    // Негативные
    [TrustChangeReason.NSFW_CONTENT]: -20,
    [TrustChangeReason.SPAM_DETECTED]: -30,
    [TrustChangeReason.INAPPROPRIATE_MESSAGES]: -15,
    [TrustChangeReason.FAKE_PROFILE]: -50,
    [TrustChangeReason.USER_REPORTS]: -10,
    [TrustChangeReason.INACTIVE_LONG]: -5,
    [TrustChangeReason.BLOCKED_MANY_USERS]: -10,
    [TrustChangeReason.MASS_LIKES]: -15,
    [TrustChangeReason.LOW_RESPONSE_RATE]: -5,
};
// Функция изменения уровня доверия
async function changeTrustScore(userId, reason, details) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { trustScore: true, blocked: true }
    });
    if (!user || user.blocked) {
        return { newScore: user?.trustScore || 0, blocked: true };
    }
    const changeAmount = TRUST_CHANGE_WEIGHTS[reason];
    const oldScore = user.trustScore;
    let newScore = oldScore + changeAmount;
    // Ограничиваем диапазон 10-100
    newScore = Math.max(10, Math.min(100, newScore));
    // Обновляем score
    const updatedUser = await prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            trustScore: newScore,
            blocked: newScore < 15,
            blockReason: newScore < 15 ? `Trust score too low: ${reason}` : undefined,
            blockedAt: newScore < 15 ? new Date() : undefined
        }
    });
    // Записываем в лог
    await prisma_1.prisma.trustLog.create({
        data: {
            userId,
            oldScore,
            newScore,
            reason,
            details
        }
    });
    console.log(`[TRUST] User ${userId}: ${oldScore} → ${newScore} (${reason})`);
    return {
        newScore,
        blocked: updatedUser.blocked
    };
}
// Проверка профиля на полноту
async function checkProfileCompleteness(userId) {
    const profile = await prisma_1.prisma.profile.findUnique({
        where: { userId },
        include: { imageData: true }
    });
    if (!profile)
        return;
    // Проверяем полноту профиля
    const hasDescription = profile.description.length > 50;
    const hasPhotos = profile.images.length >= 2;
    const hasGoals = profile.goals.length >= 2;
    if (hasDescription && hasPhotos && hasGoals) {
        await changeTrustScore(userId, TrustChangeReason.PROFILE_COMPLETED);
    }
}
// Проверка на NSFW контент (отключена)
async function checkNsfwContent(userId) {
    // Автобан за NSFW контент отключен
    console.log(`[TRUST] NSFW check skipped for user ${userId} - auto-ban disabled`);
}
// Проверка активности в чатах
async function checkChatActivity(userId) {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7); // Последние 7 дней
    const messageCount = await prisma_1.prisma.message.count({
        where: {
            senderId: userId,
            createdAt: { gte: recentDate }
        }
    });
    if (messageCount > 20) {
        await changeTrustScore(userId, TrustChangeReason.ACTIVE_CHATS, {
            messageCount
        });
    }
}
// Проверка на массовые лайки (отключена)
async function checkMassLikes(userId) {
    // Автобан за массовые лайки отключен
    console.log(`[TRUST] Mass likes check skipped for user ${userId} - auto-ban disabled`);
}
// Периодическая проверка всех пользователей
async function performTrustCheck(userId) {
    try {
        await checkProfileCompleteness(userId);
        await checkNsfwContent(userId);
        await checkChatActivity(userId);
        await checkMassLikes(userId);
    }
    catch (error) {
        console.error(`[TRUST] Error checking user ${userId}:`, error);
    }
}
// Получить историю изменений trust score
async function getTrustHistory(userId) {
    return prisma_1.prisma.trustLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
    });
}
// Разблокировать пользователя вручную
async function unblockUser(userId, adminNote) {
    const user = await prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            blocked: false,
            blockReason: null,
            blockedAt: null,
            trustScore: 40 // Сбрасываем на дефолтное значение
        }
    });
    await prisma_1.prisma.trustLog.create({
        data: {
            userId,
            oldScore: user.trustScore,
            newScore: 40,
            reason: 'manual_unblock',
            details: { adminNote }
        }
    });
    return user;
}
