// src/admin.ts - API для админ-панели
import { Router, Response, NextFunction } from "express";
import { prisma } from "./prisma.ts";
import { authMiddleware } from "./middleware/auth.ts";
import { sendTG } from "./notify.ts";

const router = Router();

// Middleware для проверки админских прав
const requireAdmin = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true }
    });
    
    if (!user?.isAdmin) {
      res.status(403).json({ error: "Доступ запрещен. Нужны права администратора." });
      return;
    }
    
    next();
  } catch (error) {
    console.error("[AUTH] Middleware error:", error);
    res.status(500).json({ error: "Ошибка проверки прав доступа" });
  }
};

// ===== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ =====

// Получить список всех пользователей с фильтрами
router.get("/users", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      role, 
      blocked, 
      verified,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { profile: { preferredName: { contains: search, mode: "insensitive" } } }
      ];
    }
    if (role === "admin") where.isAdmin = true;
    if (role === "moderator") where.isModerator = true;
    if (role === "advertiser") where.isAdvertiser = true;
    if (role === "user") where.AND = [{ isAdmin: false }, { isModerator: false }, { isAdvertiser: false }];
    if (blocked === "true") where.blocked = true;
    if (blocked === "false") where.blocked = false;
    if (verified === "true") where.profile = { isVerified: true };
    if (verified === "false") where.profile = { isVerified: false };

    const orderBy: any = { [sortBy as string]: sortOrder };

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        select: {
          id: true,
          telegramId: true,
          firstName: true,
          lastName: true,
          username: true,
          isAdmin: true,
          isModerator: true,
          isAdvertiser: true,
          blocked: true,
          createdAt: true,
          profile: { select: { preferredName: true, isVerified: true } }
        }
      }),
      prisma.user.count({ where })
    ]);

    const safeUsers = users.map(user => ({
      ...user,
      telegramId: user.telegramId.toString()
    }));

    res.json({
      users: safeUsers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error("[ADMIN] Error fetching users:", error);
    res.status(500).json({ error: "Ошибка получения пользователей" });
  }
});

// Получить детальную информацию о пользователе
router.get("/users/:userId", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    const safeUser = { ...user, telegramId: user.telegramId.toString() };
    res.json(safeUser);
  } catch (error) {
    console.error("[ADMIN] Error fetching user details:", error);
    res.status(500).json({ error: "Ошибка получения данных пользователя" });
  }
});

// Удалить пользователя
router.delete("/users/:userId", authMiddleware, requireAdmin, async (req: any, res: Response) => {
    try {
        const { userId } = req.params;
        
        console.log(`[ADMIN] Starting user deletion for user ${userId}`);

        // Получаем профиль пользователя
        const profile = await prisma.profile.findUnique({ 
          where: { userId },
          include: { imageData: true }
        });

        // Получаем чаты пользователя
        const chats = await prisma.chat.findMany({
          where: { OR: [{ userAId: userId }, { userBId: userId }] },
          select: { id: true }
        });
        const chatIds = chats.map(c => c.id);

        // Выполняем удаление в правильном порядке
        await prisma.$transaction(async (tx) => {
          console.log(`[ADMIN] Deleting related data for user ${userId}`);

          // 1. Удаляем сообщения
          if (chatIds.length > 0) {
            await tx.message.deleteMany({ 
              where: { chatId: { in: chatIds } } 
            });
          }

          // 2. Удаляем чаты
          if (chatIds.length > 0) {
            await tx.chat.deleteMany({ 
              where: { id: { in: chatIds } } 
            });
          }

          // 3. Удаляем лайки
          if (profile) {
            await tx.like.deleteMany({
              where: {
                OR: [
                  { fromUserId: userId },
                  { toProfileId: profile.id }
                ]
              }
            });
          }

          // 4. Удаляем матчи
          await tx.match.deleteMany({ 
            where: { 
              OR: [{ user1Id: userId }, { user2Id: userId }] 
            } 
          });

          // 5. Удаляем изображения профиля
          if (profile?.imageData) {
            await tx.image.deleteMany({
              where: { profileId: profile.id }
            });
          }

          // 6. Удаляем trust logs
          await tx.trustLog.deleteMany({ where: { userId } });

          // 7. Удаляем жалобы
          await tx.complaint.deleteMany({
            where: {
              OR: [
                { userId },
                { reporterId: userId }
              ]
            }
          });

          // 8. Удаляем действия модераторов
          await tx.moderatorAction.deleteMany({
            where: {
              OR: [
                { userId },
                { moderatorId: userId }
              ]
            }
          });

          // 9. Удаляем клики по рекламе
          await tx.adUserClick.deleteMany({ where: { userId } });

          // 10. Удаляем рекламные кампании
          await tx.adCampaign.deleteMany({ where: { advertiserId: userId } });

          // 11. Удаляем новости
          await tx.news.deleteMany({ where: { createdBy: userId } });

          // 12. Удаляем сообщения модераторов
          await tx.moderatorMessage.deleteMany({
            where: {
              OR: [
                { userId },
                { moderatorId: userId }
              ]
            }
          });

          // 13. Удаляем настройки
          await tx.settings.deleteMany({ where: { userId } });

          // 14. Удаляем профиль
          if (profile) {
            await tx.profile.delete({ where: { id: profile.id } });
          }

          // 15. Удаляем пользователя
          await tx.user.delete({ where: { id: userId } });
        });

        console.log(`[ADMIN] User deletion completed for user ${userId}`);
        res.json({ success: true, message: "User deleted successfully" });
        
    } catch (error) {
        console.error("[ADMIN] Error deleting user:", error);
        res.status(500).json({ 
          error: "Ошибка удаления пользователя",
          message: error instanceof Error ? error.message : "Unknown error"
        });
    }
});

// ===== УПРАВЛЕНИЕ РОЛЯМИ =====

// Назначить роль пользователю
router.post("/users/:userId/role", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const { role, grant } = req.body;
    
    if (!["admin", "moderator", "advertiser"].includes(role)) {
      res.status(400).json({ error: "Неверная роль" });
      return;
    }

    const updateData: any = {};
    updateData[`is${role.charAt(0).toUpperCase() + role.slice(1)}`] = grant;
    
    if (grant) {
      updateData.roleGrantedBy = req.userId;
      updateData.roleGrantedAt = new Date();
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
        isModerator: true,
        isAdvertiser: true,
        roleGrantedAt: true
      }
    });

    // Логируем действие
    await prisma.moderatorAction.create({
      data: {
        moderatorId: req.userId,
        userId,
        action: grant ? `grant_${role}` : `revoke_${role}`,
        reason: `${grant ? "Назначение" : "Отзыв"} роли ${role}`,
        details: { role, grant }
      }
    });

    res.json({ user: updatedUser });
  } catch (error) {
    console.error("[ADMIN] Error managing user role:", error);
    res.status(500).json({ error: "Ошибка управления ролью" });
  }
});

// ===== БЛОКИРОВКА ПОЛЬЗОВАТЕЛЕЙ =====

// Заблокировать пользователя
router.post("/users/:userId/block", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({ error: "Необходимо указать причину блокировки" });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, isAdmin: true, blocked: true, telegramId: true }
    });

    if (!targetUser) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    if (targetUser.isAdmin) {
      res.status(403).json({ error: "Нельзя блокировать администраторов" });
      return;
    }

    if (targetUser.blocked) {
      res.status(400).json({ error: "Пользователь уже заблокирован" });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        blocked: true,
        blockReason: reason,
        blockedAt: new Date(),
        blockedBy: req.userId
      }
    });

    // Логируем действие
    await prisma.moderatorAction.create({
      data: {
        moderatorId: req.userId,
        userId,
        action: "block",
        reason
      }
    });

    // Уведомляем пользователя в Telegram
    try {
      await sendTG(targetUser.telegramId, `⛔ Ваш аккаунт заблокирован.\n\nПричина: ${reason}\n\nОбратитесь в поддержку @spectrmod для разблокировки.`);
    } catch (error) {
      console.error("Failed to send block notification:", error);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[ADMIN] Error blocking user:", error);
    res.status(500).json({ error: "Ошибка блокировки пользователя" });
  }
});

// Разблокировать пользователя
router.post("/users/:userId/unblock", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        blocked: false,
        blockReason: null,
        blockedAt: null,
        blockedBy: null
      },
      select: {
        telegramId: true
      }
    });

    // Логируем действие
    await prisma.moderatorAction.create({
      data: {
        moderatorId: req.userId,
        userId,
        action: "unblock",
        reason: "Разблокировка администратором"
      }
    });

    // Уведомляем пользователя
    try {
      await sendTG(updatedUser.telegramId, `✅ Ваш аккаунт разблокирован!\n\nВы снова можете пользоваться приложением.`);
    } catch (error) {
      console.error("Failed to send unblock notification:", error);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[ADMIN] Error unblocking user:", error);
    res.status(500).json({ error: "Ошибка разблокировки пользователя" });
  }
});

// ===== СИСТЕМЫ НОВОСТЕЙ =====

// Получить список новостей
router.get("/news", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const [news, total] = await prisma.$transaction([
      prisma.news.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.news.count()
    ]);
    res.json({ news, total });
  } catch (error) {
    console.error('[ADMIN] Error fetching news:', error);
    res.status(500).json({ error: 'Ошибка получения новостей' });
  }
});

// Создать новость
router.post("/news", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: 'Заголовок и содержание обязательны' });
      return;
    }
    const news = await prisma.news.create({ 
      data: { 
        title, 
        content, 
        createdBy: req.userId,
        isPublished: false // Новость создается неопубликованной
      } 
    });
    res.json(news);
  } catch (error) {
    console.error('[ADMIN] Error creating news:', error);
    res.status(500).json({ error: 'Ошибка создания новости' });
  }
});

// Обновить новость
router.put("/news/:id", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: 'Заголовок и содержание обязательны' });
      return;
    }
    const news = await prisma.news.update({ where: { id }, data: { title, content } });
    res.json(news);
  } catch (error) {
    console.error('[ADMIN] Error updating news:', error);
    res.status(500).json({ error: 'Ошибка обновления новости' });
  }
});

// Удалить новость
router.delete("/news/:id", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.news.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('[ADMIN] Error deleting news:', error);
    res.status(500).json({ error: 'Ошибка удаления новости' });
  }
});

// Опубликовать новость и разослать всем пользователям
router.post("/news/:id/publish", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    // Получаем новость
    const news = await prisma.news.findUnique({ where: { id } });
    if (!news) {
      res.status(404).json({ error: 'Новость не найдена' });
      return;
    }
    
    if (news.isPublished) {
      res.status(400).json({ error: 'Новость уже опубликована' });
      return;
    }
    
    // Получаем пользователей для рассылки
    const users = await prisma.user.findMany({
      where: {
        blocked: false,
        profile: { isNot: null },
      },
      include: {
        settings: {
          select: {
            notifyNews: true,
            notifyTechUpdates: true,
          }
        }
      }
    });
    
    // Фильтруем пользователей по настройкам уведомлений
    const usersToNotify = users.filter(user => {
      if (!user.settings) return true; // Если нет настроек - отправляем
      
      if (news.type === 'news' && user.settings.notifyNews) return true;
      if (news.type === 'tech_update' && user.settings.notifyTechUpdates) return true;
      
      return false;
    });
    
    // Обновляем статус новости
    await prisma.news.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        sentCount: usersToNotify.length
      }
    });
    
    // Отправляем уведомления в Telegram
    let successCount = 0;
    let failCount = 0;
    
    const priorityEmoji = {
      urgent: '🚨',
      high: '❗',
      medium: '📢',
      low: '💬'
    };
    
    const emoji = priorityEmoji[news.priority as keyof typeof priorityEmoji] || '📢';
    const message = `${emoji} ${news.title}\n\n${news.content}\n\n📅 ${new Date().toLocaleDateString('ru-RU')}`;
    
    // Отправляем по батчам чтобы не перегрузить Telegram API
    const batchSize = 30;
    for (let i = 0; i < usersToNotify.length; i += batchSize) {
      const batch = usersToNotify.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (user) => {
          try {
            await sendTG(user.telegramId, message);
            successCount++;
          } catch (error) {
            console.error(`Failed to send news to user ${user.id}:`, error);
            failCount++;
          }
        })
      );
      
      // Небольшая задержка между батчами
      if (i + batchSize < usersToNotify.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Логируем действие
    await prisma.moderatorAction.create({
      data: {
        moderatorId: req.userId,
        userId: req.userId, // Сам себе, так как это системное действие
        action: "publish_news",
        reason: `Публикация новости: "${news.title}"`,
        details: {
          newsId: id,
          totalUsers: users.length,
          sentCount: successCount,
          failCount: failCount
        }
      }
    });
    
    res.json({
      success: true,
      stats: {
        totalUsers: users.length,
        eligibleUsers: usersToNotify.length,
        sentCount: successCount,
        failCount: failCount
      }
    });
  } catch (error) {
    console.error('[ADMIN] Error publishing news:', error);
    res.status(500).json({ error: 'Ошибка публикации новости' });
  }
});

// ===== СИСТЕМНЫЕ СООБЩЕНИЯ =====

// Отправить системное сообщение пользователю
router.post("/users/:userId/message", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const { message, senderType = "admin" } = req.body;

    if (!message) {
      res.status(400).json({ error: "Необходимо указать сообщение" });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true }
    });

    if (!targetUser) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    // Уведомляем в Telegram
    const senderName = senderType === "admin" ? "👑 Администрация" : "⚖️ Модерация";
    try {
      await sendTG(targetUser.telegramId, `${senderName}\n\n${message}`);
    } catch (error) {
      console.error("Failed to send Telegram notification:", error);
    }

    // Логируем действие
    await prisma.moderatorAction.create({
      data: {
        moderatorId: req.userId,
        userId,
        action: "message",
        reason: `Отправка системного сообщения от ${senderType}`,
        details: { message: message.substring(0, 100) }
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("[ADMIN] Error sending system message:", error);
    res.status(500).json({ error: "Ошибка отправки сообщения" });
  }
});

// ===== СТАТИСТИКА =====

// Получить общую статистику платформы
router.get("/stats", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const [
      totalUsers,
      totalProfiles,
      blockedUsers,
      verifiedProfiles,
      totalMatches,
      totalMessages,
      pendingComplaints,
      activeNews
    ] = await Promise.all([
      prisma.user.count(),
      prisma.profile.count(),
      prisma.user.count({ where: { blocked: true } }),
      prisma.profile.count({ where: { isVerified: true } }),
      prisma.match.count(),
      prisma.message.count(),
      prisma.complaint.count({ where: { status: "pending" } }),
      prisma.news.count({ where: { isPublished: true } })
    ]);

    const [adminCount, moderatorCount, advertiserCount] = await Promise.all([
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.user.count({ where: { isModerator: true } }),
      prisma.user.count({ where: { isAdvertiser: true } })
    ]);

    res.json({
      users: {
        total: totalUsers,
        blocked: blockedUsers,
        roles: {
          admins: adminCount,
          moderators: moderatorCount,
          advertisers: advertiserCount,
          regular: totalUsers - adminCount - moderatorCount - advertiserCount
        }
      },
      profiles: {
        total: totalProfiles,
        verified: verifiedProfiles,
        verificationRate: totalProfiles > 0 ? (verifiedProfiles / totalProfiles * 100).toFixed(1) : 0
      },
      activity: {
        matches: totalMatches,
        messages: totalMessages
      },
      moderation: {
        pendingComplaints
      },
      content: {
        publishedNews: activeNews
      }
    });
  } catch (error) {
    console.error("[ADMIN] Error fetching stats:", error);
    res.status(500).json({ error: "Ошибка получения статистики" });
  }
});

// ===== АНАЛИТИКА =====

router.get("/analytics", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { range = 'week' } = req.query;

    let since;
    const now = new Date();
    if (range === 'day') since = new Date(now.setDate(now.getDate() - 1));
    else if (range === 'month') since = new Date(now.setMonth(now.getMonth() - 1));
    else since = new Date(now.setDate(now.getDate() - 7));

    const [
      totalUsers,
      newUsers,
      activeChats,
      totalLikes,
      totalMatches,
      totalMessages,
      reportsPending,
      reportsTotal,
      profilesModeration,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.chat.findMany({
        where: { updatedAt: { gte: new Date(new Date().setHours(new Date().getHours() - 24)) } },
        select: { userAId: true, userBId: true },
      }),
      prisma.like.count({ where: { createdAt: { gte: since } } }),
      prisma.match.count({ where: { createdAt: { gte: since } } }),
      prisma.message.count({ where: { createdAt: { gte: since } } }),
      prisma.complaint.count({ where: { status: 'pending' } }),
      prisma.complaint.count({ where: { createdAt: { gte: since } } }),
      prisma.profile.count({ where: { isFlagged: true, moderatedAt: null } }),
    ]);
    
    const activeUserIds = new Set<string>();
    activeChats.forEach(chat => {
        activeUserIds.add(chat.userAId);
        activeUserIds.add(chat.userBId);
    });

    res.json({
      summary: {
        totalUsers,
        newUsers,
        activeUsers: activeUserIds.size,
        totalLikes,
        totalMatches,
        totalMessages,
        reportsPending,
        reportsTotal,
        onlineUsers: 0,
        profilesModeration,
      }
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching analytics:', error);
    res.status(500).json({ error: 'Ошибка получения аналитики' });
  }
});

// ===== УПРАВЛЕНИЕ ЖАЛОБАМИ (МОДЕРАЦИЯ) =====

router.get("/complaints", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    
    const where: any = { status: status as string };
    const skip = (Number(page) - 1) * Number(limit);

    const [complaints, total] = await prisma.$transaction([
      prisma.complaint.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          user: { select: { id: true, username: true, profile: { select: { preferredName: true } } } },
          reporter: { select: { id: true, username: true, profile: { select: { preferredName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.complaint.count({ where }),
    ]);

    const safeComplaints = complaints.map(c => ({
      ...c,
      userId: c.userId.toString(),
      reporterId: c.reporterId.toString(),
      user: { ...c.user, id: c.user.id.toString() },
      reporter: { ...c.reporter, id: c.reporter.id.toString() }
    }));

    res.json({
      complaints: safeComplaints,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching complaints:', error);
    res.status(500).json({ error: 'Ошибка получения жалоб' });
  }
});

router.post("/complaints/:id/action", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { action, moderatorNote } = req.body;

    if (!['resolved', 'dismissed'].includes(action)) {
      res.status(400).json({ error: 'Неверное действие' });
      return;
    }

    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        status: action,
        assignedTo: req.userId,
        resolvedAt: new Date(),
        resolution: moderatorNote || `Жалоба ${action === 'resolved' ? 'принята' : 'отклонена'}`,
      },
    });

    res.json(complaint);
  } catch (error) {
    console.error('[ADMIN] Error processing complaint:', error);
    res.status(500).json({ error: 'Ошибка обработки жалобы' });
  }
});

export const adminRouter = router; 