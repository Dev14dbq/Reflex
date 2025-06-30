import { prisma } from "./prisma";

// Причины изменения уровня доверия
export enum TrustChangeReason {
  // Положительные действия
  PROFILE_COMPLETED = "profile_completed",
  PHOTO_ADDED = "photo_added",
  VERIFIED_PHONE = "verified_phone",
  ACTIVE_CHATS = "active_chats",
  POSITIVE_REPORTS = "positive_reports",
  GOOD_BEHAVIOR = "good_behavior",
  
  // Негативные действия
  NSFW_CONTENT = "nsfw_content",
  SPAM_DETECTED = "spam_detected",
  INAPPROPRIATE_MESSAGES = "inappropriate_messages",
  FAKE_PROFILE = "fake_profile",
  USER_REPORTS = "user_reports",
  INACTIVE_LONG = "inactive_long",
  BLOCKED_MANY_USERS = "blocked_many_users",
  MASS_LIKES = "mass_likes", // Лайкает всех подряд
  LOW_RESPONSE_RATE = "low_response_rate",
}

// Веса изменений для каждой причины
const TRUST_CHANGE_WEIGHTS: Record<TrustChangeReason, number> = {
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
export async function changeTrustScore(
  userId: string,
  reason: TrustChangeReason,
  details?: any
): Promise<{ newScore: number; blocked: boolean }> {
  const user = await prisma.user.findUnique({
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
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      trustScore: newScore,
      blocked: newScore < 15,
      blockReason: newScore < 15 ? `Trust score too low: ${reason}` : undefined,
      blockedAt: newScore < 15 ? new Date() : undefined
    }
  });

  // Записываем в лог
  await prisma.trustLog.create({
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
export async function checkProfileCompleteness(userId: string): Promise<void> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { imageData: true }
  });

  if (!profile) return;

  // Проверяем полноту профиля
  const hasDescription = profile.description.length > 50;
  const hasPhotos = profile.images.length >= 2;
  const hasGoals = profile.goals.length >= 2;
  
  if (hasDescription && hasPhotos && hasGoals) {
    await changeTrustScore(userId, TrustChangeReason.PROFILE_COMPLETED);
  }
}

// Проверка на NSFW контент (отключена)
export async function checkNsfwContent(userId: string): Promise<void> {
  // Автобан за NSFW контент отключен
  console.log(`[TRUST] NSFW check skipped for user ${userId} - auto-ban disabled`);
}

// Проверка активности в чатах
export async function checkChatActivity(userId: string): Promise<void> {
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 7); // Последние 7 дней

  const messageCount = await prisma.message.count({
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
export async function checkMassLikes(userId: string): Promise<void> {
  // Автобан за массовые лайки отключен
  console.log(`[TRUST] Mass likes check skipped for user ${userId} - auto-ban disabled`);
}

// Периодическая проверка всех пользователей
export async function performTrustCheck(userId: string): Promise<void> {
  try {
    await checkProfileCompleteness(userId);
    await checkNsfwContent(userId);
    await checkChatActivity(userId);
    await checkMassLikes(userId);
  } catch (error) {
    console.error(`[TRUST] Error checking user ${userId}:`, error);
  }
}

// Получить историю изменений trust score
export async function getTrustHistory(userId: string) {
  return prisma.trustLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
}

// Разблокировать пользователя вручную
export async function unblockUser(userId: string, adminNote?: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      blocked: false,
      blockReason: null,
      blockedAt: null,
      trustScore: 40 // Сбрасываем на дефолтное значение
    }
  });

  await prisma.trustLog.create({
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