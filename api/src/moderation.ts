// src/moderation.ts - API для панели модерации
import { Router, Response, NextFunction } from "express";
import { prisma } from "./prisma.ts";
import { authMiddleware } from "./middleware/auth.ts";
import { sendTG } from "./notify.ts";

const router = Router();

// Хелпер для получения или создания системного аккаунта модерации
async function getModerationSystemUser() {
  let moderationUser = await prisma.user.findFirst({
    where: {
      username: "moderation_system",
      isAdmin: true
    },
    include: {
      profile: true
    }
  });

  if (!moderationUser) {
    // Создаем пользователя
    const newUser = await prisma.user.create({
      data: {
        telegramId: BigInt(0), // Специальный ID для системного аккаунта
        username: "moderation_system",
        firstName: "Модерация",
        hash: "system_moderation_hash",
        isAdmin: true,
        trustScore: 100
      }
    });

    // Создаем профиль с аватаркой
    await prisma.profile.create({
      data: {
        userId: newUser.id,
        preferredName: "Модерация",
        gender: "система",
        birthYear: "2000", // Формальный год рождения
        city: "Система",
        description: "Официальный аккаунт модерации платформы",
        goals: ["общение"],
        images: ["https://spectrmod.ru/api/cdn/image/Mod/Shield.svg"],
        isVerified: true
      }
    });

    // Перезагружаем с профилем
    moderationUser = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: { profile: true }
    });
     } else if (!moderationUser.profile) {
     // Если пользователь есть, но профиля нет - создаем профиль
     await prisma.profile.create({
       data: {
         userId: moderationUser.id,
         preferredName: "Модерация",
         gender: "система",
         birthYear: "2000",
         city: "Система", 
         description: "Официальный аккаунт модерации платформы",
         goals: ["общение"],
         images: ["https://spectrmod.ru/api/cdn/image/Mod/Shield.svg"],
         isVerified: true
       }
     });

     moderationUser.profile = await prisma.profile.findUnique({
       where: { userId: moderationUser.id }
     });
   }

  return moderationUser;
}

// Middleware для проверки прав модератора или админа
const requireModerator = async (req: any, res: Response, next: NextFunction) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { isAdmin: true, isModerator: true }
  });
  
  if (!user?.isAdmin && !user?.isModerator) {
    res.status(403).json({ error: "Доступ запрещен. Нужны права модератора или администратора." });
    return;
  }
  
  next();
};

// ===== РАБОТА С ЖАЛОБАМИ =====

// Получить список жалоб с фильтрами
router.get("/complaints", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority, 
      type,
      assignedTo,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    // Построение условий фильтрации
    const where: any = {};
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (assignedTo) where.assignedTo = assignedTo;

    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          reporter: {
            select: { 
              id: true,
              firstName: true, 
              lastName: true, 
              username: true,
              profile: { 
                select: { preferredName: true } 
              } 
            }
          },
          user: {
            select: { 
              id: true,
              firstName: true, 
              lastName: true, 
              username: true,
              blocked: true,
              profile: { 
                select: { 
                  id: true,
                  preferredName: true, 
                  images: true,
                  isVerified: true,
                  isFlagged: true
                } 
              } 
            }
          }
        }
      }),
      prisma.complaint.count({ where })
    ]);

    res.json({
      complaints,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error("[MODERATION] Error fetching complaints:", error);
    res.status(500).json({ error: "Ошибка получения жалоб" });
  }
});

// Назначить жалобу модератору
router.post("/complaints/:complaintId/assign", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const { complaintId } = req.params;
    const { moderatorId } = req.body;

    // Проверяем, что модератор существует и имеет права
    const moderator = await prisma.user.findUnique({
      where: { id: moderatorId },
      select: { isAdmin: true, isModerator: true, firstName: true, lastName: true }
    });

    if (!moderator || (!moderator.isAdmin && !moderator.isModerator)) {
      res.status(400).json({ error: "Указанный пользователь не является модератором" });
      return;
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: { 
        assignedTo: moderatorId,
        status: "reviewing"
      }
    });

    res.json({ complaint: updatedComplaint });
  } catch (error) {
    console.error("[MODERATION] Error assigning complaint:", error);
    res.status(500).json({ error: "Ошибка назначения жалобы" });
  }
});

// Разрешить жалобу
router.post("/complaints/:complaintId/resolve", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const { complaintId } = req.params;
    const { resolution, action = "none" } = req.body;

    if (!resolution) {
      res.status(400).json({ error: "Необходимо указать решение" });
      return;
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId }
    });

    if (!complaint) {
      res.status(404).json({ error: "Жалоба не найдена" });
      return;
    }

    // Обновляем жалобу
    const updatedComplaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: { 
        status: "resolved",
        resolution,
        resolvedAt: new Date()
      }
    });

    // Выполняем действие в зависимости от решения
    if (action !== "none") {
      await performModerationAction(req.userId, complaint.userId, action, `Решение по жалобе: ${resolution}`);
    }

    // Логируем действие модератора
    await prisma.moderatorAction.create({
      data: {
        moderatorId: req.userId,
        userId: complaint.userId,
        action: `resolve_complaint_${action}`,
        reason: resolution,
        details: { complaintId, action }
      }
    });

    res.json({ complaint: updatedComplaint });
  } catch (error) {
    console.error("[MODERATION] Error resolving complaint:", error);
    res.status(500).json({ error: "Ошибка разрешения жалобы" });
  }
});

// ===== МОДЕРАЦИЯ ПРОФИЛЕЙ =====

// Получить список профилей для модерации
router.get("/profiles", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = "all",
      sortBy = "user",
      sortOrder = "desc"
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    // Построение условий фильтрации
    const where: any = {};
    
    if (status === "unverified") where.isVerified = false;
    if (status === "flagged") where.isFlagged = true;
    if (status === "pending") where.AND = [{ isVerified: false }, { isFlagged: false }];

    // Сортировка по дате создания пользователя
    const orderBy = {
      user: {
        createdAt: sortOrder as 'asc' | 'desc'
      }
    };

    const [profiles, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              blocked: true,
              trustScore: true,
              createdAt: true
            }
          },
          imageData: {
            select: {
              id: true,
              url: true,
              isNsfw: true,
              nsfwScore: true,
              isApproved: true
            }
          }
        }
      }),
      prisma.profile.count({ where })
    ]);

    res.json({
      profiles,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error("[MODERATION] Error fetching profiles:", error);
    res.status(500).json({ error: "Ошибка получения профилей" });
  }
});

// Верифицировать профиль
router.post("/profiles/:profileId/verify", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const { profileId } = req.params;
    const { note } = req.body;

    const profile = await prisma.profile.update({
      where: { id: profileId },
      data: {
        isVerified: true,
        isFlagged: false,
        moderatedAt: new Date(),
        moderatedBy: req.userId,
        moderationNote: note || "Верифицирован модератором"
      },
      include: {
        user: { select: { telegramId: true, firstName: true } }
      }
    });

    // Логируем действие
    await prisma.moderatorAction.create({
      data: {
        moderatorId: req.userId,
        userId: profile.userId,
        action: "verify_profile",
        reason: note || "Верификация профиля",
        details: { profileId }
      }
    });

    // Уведомляем пользователя
    try {
      await sendTG(profile.user.telegramId, `✅ Ваш профиль верифицирован!\n\nТеперь у вас есть галочка верификации, что повышает доверие других пользователей.`);
    } catch (error) {
      console.error("Failed to send verification notification:", error);
    }

    // Исключаем telegramId для избежания ошибки сериализации BigInt
    const { user, ...profileData } = profile;
    const { telegramId, ...userWithoutTelegramId } = user;
    
    res.json({ 
      profile: {
        ...profileData,
        user: userWithoutTelegramId
      }
    });
  } catch (error) {
    console.error("[MODERATION] Error verifying profile:", error);
    res.status(500).json({ error: "Ошибка верификации профиля" });
  }
});

// Отправить сообщение от модерации (также через системный аккаунт)
router.post("/users/:userId/message", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;

    if (!message) {
      res.status(400).json({ error: "Необходимо указать сообщение" });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, firstName: true }
    });

    if (!targetUser) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    // Получаем системный аккаунт модерации
    const moderationUser = await getModerationSystemUser();

    // Находим или создаем чат между системным аккаунтом модерации и пользователем
    let chat = await prisma.chat.findFirst({
      where: {
        OR: [
          { userAId: moderationUser.id, userBId: userId },
          { userAId: userId, userBId: moderationUser.id }
        ]
      }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          userAId: moderationUser.id,
          userBId: userId
        }
      });
    }

    // Создаем системное сообщение от модерации
    const systemMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: moderationUser.id,
        text: message,
        type: "text",
        isSystemMessage: true,
        systemSenderType: "moderator",
        systemSenderName: "Модерация"
      }
    });

    // Уведомляем в Telegram
    try {
      await sendTG(targetUser.telegramId, `⚖️ Модерация\n\n${message}`);
    } catch (error) {
      console.error("Failed to send moderation message:", error);
    }

    // Логируем действие
    await prisma.moderatorAction.create({
      data: {
        moderatorId: req.userId,
        userId,
        action: "message",
        reason: "Отправка сообщения от модерации",
        details: { message: message.substring(0, 100), messageId: systemMessage.id, chatId: chat.id }
      }
    });

    res.json({ success: true, messageId: systemMessage.id, chatId: chat.id });
  } catch (error) {
    console.error("[MODERATION] Error sending moderation message:", error);
    res.status(500).json({ error: "Ошибка отправки сообщения" });
  }
});

// Получить статистику модерации
router.get("/stats", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      totalComplaints,
      pendingComplaints,
      resolvedComplaints,
      totalProfiles,
      verifiedProfiles,
      flaggedProfiles,
      totalImages,
      todayActions,
      profilesForReview,
      flaggedImages
    ] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: "pending" } }),
      prisma.complaint.count({ where: { status: "resolved" } }),
      prisma.profile.count(),
      prisma.profile.count({ where: { isVerified: true } }),
      prisma.profile.count({ where: { isFlagged: true } }),
      prisma.image.count(),
      prisma.moderatorAction.count({ where: { createdAt: { gte: today } } }),
      prisma.profile.count({ where: { isVerified: false, isFlagged: false } }),
      prisma.image.count({ where: { isApproved: false } })
    ]);

    res.json({
      pendingComplaints,
      profilesForReview,
      flaggedImages,
      todayActions,
      complaints: {
        total: totalComplaints,
        pending: pendingComplaints,
        resolved: resolvedComplaints,
        resolutionRate: totalComplaints > 0 ? ((resolvedComplaints / totalComplaints) * 100).toFixed(1) : "0"
      },
      profiles: {
        total: totalProfiles,
        verified: verifiedProfiles,
        flagged: flaggedProfiles,
        verificationRate: totalProfiles > 0 ? ((verifiedProfiles / totalProfiles) * 100).toFixed(1) : "0"
      },
      images: {
        total: totalImages
      }
    });
  } catch (error) {
    console.error("[MODERATION] Error fetching stats:", error);
    res.status(500).json({ error: "Ошибка получения статистики модерации" });
  }
});

// Выполнить действие модерации
async function performModerationAction(moderatorId: string, userId: string, action: string, reason: string) {
  switch (action) {
    case "warn":
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegramId: true }
      });
      if (user) {
        await sendTG(user.telegramId, `⚠️ Предупреждение от модерации\n\n${reason}\n\nСледующее нарушение может привести к блокировке аккаунта.`);
      }
      break;
      
    case "block":
      await prisma.user.update({
        where: { id: userId },
        data: {
          blocked: true,
          blockReason: reason,
          blockedAt: new Date(),
          blockedBy: moderatorId
        }
      });
      break;
      
    case "verify":
      await prisma.profile.updateMany({
        where: { userId },
        data: {
          isVerified: true,
          moderatedAt: new Date(),
          moderatedBy: moderatorId,
          moderationNote: reason
        }
      });
      break;
  }
}

// ===== ДОПОЛНИТЕЛЬНЫЕ ЭНДПОИНТЫ ДЛЯ МОДЕРАТОРСКОЙ ПАНЕЛИ =====

// Получить следующий профиль для модерации (для просмотра как в поиске)
router.get("/profiles/next", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const profile = await prisma.profile.findFirst({
      where: {
        isVerified: false,
        isFlagged: false,
        user: {
          blocked: false
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            blocked: true,
            trustScore: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        user: {
          createdAt: 'asc' // Берем самые старые непроверенные
        }
      }
    });

    if (!profile) {
      res.json({ profile: null });
      return;
    }

    res.json({ profile });
  } catch (error) {
    console.error("[MODERATION] Error fetching next profile:", error);
    res.status(500).json({ error: "Ошибка получения профиля для модерации" });
  }
});

// ===== ПОИСК ПОЛЬЗОВАТЕЛЕЙ =====

// Поиск пользователей для чата (ДОЛЖЕН БЫТЬ ПЕРЕД /users/:userId)
router.get("/users/search", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.json({ users: [] });
      return;
    }

    const searchTerm = q.trim();
    
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { username: { contains: searchTerm, mode: 'insensitive' } }
        ],
        blocked: false // Только не заблокированные
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        trustScore: true,
        profile: {
          select: {
            preferredName: true
          }
        }
      },
      take: 20,
      orderBy: {
        trustScore: 'asc' // Сначала показываем пользователей с низким trustScore
      }
    });

    res.json({ users });
  } catch (error) {
    console.error("[MODERATION] Error searching users:", error);
    res.status(500).json({ error: "Ошибка поиска пользователей" });
  }
});

// Получить информацию о конкретном пользователе
router.get("/users/:userId", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            imageData: {
              select: {
                id: true,
                url: true,
                isNsfw: true,
                nsfwScore: true,
                isApproved: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    // Получаем статистику по пользователю
    const [complaintsAgainst, complaintsBy, moderatorActions] = await Promise.all([
      prisma.complaint.count({ where: { userId } }),
      prisma.complaint.count({ where: { reporterId: userId } }),
      prisma.moderatorAction.count({ where: { userId } })
    ]);

    // Исключаем telegramId для избежания ошибки сериализации BigInt
    const { telegramId, ...userWithoutTelegramId } = user;
    
    res.json({
      user: {
        ...userWithoutTelegramId,
        statistics: {
          complaintsAgainst,
          complaintsBy,
          moderatorActions
        }
      }
    });
  } catch (error) {
    console.error("[MODERATION] Error fetching user:", error);
    res.status(500).json({ error: "Ошибка получения информации о пользователе" });
  }
});

// Заблокировать пользователя
router.post("/users/:userId/ban", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({ error: "Необходимо указать причину блокировки" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, firstName: true, blocked: true }
    });

    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    if (user.blocked) {
      res.status(400).json({ error: "Пользователь уже заблокирован" });
      return;
    }

    // Блокируем пользователя
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
        action: "ban_user",
        reason,
        details: { blockReason: reason }
      }
    });

    // Уведомляем пользователя
    try {
      await sendTG(user.telegramId, `🚫 Ваш аккаунт заблокирован\n\nПричина: ${reason}\n\nЕсли вы считаете это ошибкой, обратитесь в поддержку.`);
    } catch (error) {
      console.error("Failed to send ban notification:", error);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[MODERATION] Error banning user:", error);
    res.status(500).json({ error: "Ошибка блокировки пользователя" });
  }
});

// Разблокировать пользователя
router.post("/users/:userId/unban", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, firstName: true, blocked: true }
    });

    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    if (!user.blocked) {
      res.status(400).json({ error: "Пользователь не заблокирован" });
      return;
    }

    // Разблокируем пользователя
    await prisma.user.update({
      where: { id: userId },
      data: {
        blocked: false,
        blockReason: null,
        blockedAt: null,
        blockedBy: null
      }
    });

    // Логируем действие
    await prisma.moderatorAction.create({
      data: {
        moderatorId: req.userId,
        userId,
        action: "unban_user",
        reason: "Разблокирован модератором",
        details: {}
      }
    });

    // Уведомляем пользователя
    try {
      await sendTG(user.telegramId, `✅ Ваш аккаунт разблокирован\n\nВы снова можете пользоваться приложением.`);
    } catch (error) {
      console.error("Failed to send unban notification:", error);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[MODERATION] Error unbanning user:", error);
    res.status(500).json({ error: "Ошибка разблокировки пользователя" });
  }
});

// ===== ЧАТЫ МОДЕРАТОРОВ =====

// Начать чат с пользователем (создать чат с системным аккаунтом)
router.post("/chats/start", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: "Необходимо указать ID пользователя" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        profile: {
          select: {
            preferredName: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    // Получаем системный аккаунт модерации
    const moderationUser = await getModerationSystemUser();

    // Находим или создаем чат между системным аккаунтом и пользователем
    let chat = await prisma.chat.findFirst({
      where: {
        OR: [
          { userAId: moderationUser.id, userBId: userId },
          { userAId: userId, userBId: moderationUser.id }
        ]
      }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          userAId: moderationUser.id,
          userBId: userId
        }
      });
    }

    res.json({ 
      success: true, 
      chat: {
        id: chat.id,
        userId,
        userName: user.firstName || user.username || 'Пользователь',
        user
      }
    });
  } catch (error) {
    console.error("[MODERATION] Error starting chat:", error);
    res.status(500).json({ error: "Ошибка создания чата" });
  }
});

// Получить список чатов модераторов (чаты с системным аккаунтом модерации)
router.get("/chats", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    // Получаем системный аккаунт модерации
    const moderationUser = await getModerationSystemUser();
    
    // Получаем все чаты где участвует системный аккаунт модерации
    const chats = await prisma.chat.findMany({
      where: {
        OR: [
          { userAId: moderationUser.id },
          { userBId: moderationUser.id }
        ]
      },
      include: {
        userA: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                preferredName: true
              }
            }
          }
        },
        userB: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                preferredName: true
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            text: true,
            createdAt: true,
            isSystemMessage: true,
            systemSenderType: true,
            readAt: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    const chatsWithInfo = chats.map((chat) => {
      // Определяем кто собеседник (не системный аккаунт модерации)
      const otherUser = chat.userAId === moderationUser.id ? chat.userB : chat.userA;
      const lastMessage = chat.messages[0];
      
      return {
        id: chat.id,
        userId: otherUser.id,
        userName: otherUser.firstName || otherUser.username || 'Пользователь',
        user: {
          ...otherUser,
          // Убираем telegramId из ответа чтобы избежать проблем с BigInt
          telegramId: undefined
        },
        lastMessage: lastMessage?.text,
        lastMessageAt: lastMessage?.createdAt?.toISOString(),
        unreadCount: 0 // Для модераторов считаем все прочитанными
      };
    });

    res.json({ chats: chatsWithInfo });
  } catch (error) {
    console.error("[MODERATION] Error fetching chats:", error);
    res.status(500).json({ error: "Ошибка получения чатов модераторов" });
  }
});

// Получить сообщения конкретного чата (с системным аккаунтом модерации)
router.get("/chats/:userId/messages", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Получаем системный аккаунт модерации
    const moderationUser = await getModerationSystemUser();

    // Находим чат между системным аккаунтом модерации и пользователем
    const chat = await prisma.chat.findFirst({
      where: {
        OR: [
          { userAId: moderationUser.id, userBId: userId },
          { userAId: userId, userBId: moderationUser.id }
        ]
      }
    });

    if (!chat) {
      res.json({ messages: [] });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' },
      skip,
      take: Number(limit),
      include: {
        sender: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
            isAdmin: true,
            isModerator: true
          }
        }
      }
    });

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.text || '',
      fromModerator: msg.senderId === moderationUser.id || msg.isSystemMessage,
      createdAt: msg.createdAt.toISOString(),
      isSystemMessage: msg.isSystemMessage,
      systemSenderName: msg.systemSenderName,
      moderatorName: msg.senderId === moderationUser.id ? 
        `${msg.sender.firstName || msg.sender.username || 'Модерация'}` : 
        undefined
    }));

    res.json({ messages: formattedMessages });
  } catch (error) {
    console.error("[MODERATION] Error fetching chat messages:", error);
    res.status(500).json({ error: "Ошибка получения сообщений чата" });
  }
});

// Отправить сообщение в чат (через обычную систему чатов от системного аккаунта)
router.post("/chats/:userId/send", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ error: "Сообщение не может быть пустым" });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, firstName: true }
    });

    if (!targetUser) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }

    // Получаем системный аккаунт модерации
    const moderationUser = await getModerationSystemUser();

    // Находим или создаем чат между системным аккаунтом модерации и пользователем
    let chat = await prisma.chat.findFirst({
      where: {
        OR: [
          { userAId: moderationUser.id, userBId: userId },
          { userAId: userId, userBId: moderationUser.id }
        ]
      }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          userAId: moderationUser.id,
          userBId: userId
        }
      });
    }

    // Создаем системное сообщение от модерации
    const systemMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: moderationUser.id,
        text: message.trim(),
        type: "text",
        isSystemMessage: true,
        systemSenderType: "moderator",
        systemSenderName: "Модерация"
      }
    });

    // Отправляем в Telegram
    try {
      await sendTG(targetUser.telegramId, `⚖️ Сообщение от модерации:\n\n${message.trim()}`);
    } catch (error) {
      console.error("Failed to send moderator chat message:", error);
    }

    // Логируем действие
    await prisma.moderatorAction.create({
      data: {
        moderatorId: req.userId,
        userId,
        action: "chat_message",
        reason: "Отправка сообщения в чат",
        details: { messageId: systemMessage.id, chatId: chat.id }
      }
    });

    res.json({ success: true, messageId: systemMessage.id, chatId: chat.id });
  } catch (error) {
    console.error("[MODERATION] Error sending chat message:", error);
    res.status(500).json({ error: "Ошибка отправки сообщения" });
  }
});

// Обновить действие с жалобой (для кнопок "принять"/"отклонить")
router.post("/complaints/:complaintId/action", authMiddleware, requireModerator, async (req: any, res: Response) => {
  try {
    const { complaintId } = req.params;
    const { action, moderatorNote } = req.body;

    if (!action || !['resolved', 'dismissed'].includes(action)) {
      res.status(400).json({ error: "Недопустимое действие" });
      return;
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        user: { select: { telegramId: true, firstName: true } }
      }
    });

    if (!complaint) {
      res.status(404).json({ error: "Жалоба не найдена" });
      return;
    }

    // Обновляем статус жалобы
    const updatedComplaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: action,
        resolution: moderatorNote || `Жалоба ${action === 'resolved' ? 'принята' : 'отклонена'} модератором`,
        resolvedAt: new Date(),
        resolvedBy: req.userId
      }
    });

    // Логируем действие
    await prisma.moderatorAction.create({
      data: {
        moderatorId: req.userId,
        userId: complaint.userId,
        action: `complaint_${action}`,
        reason: moderatorNote || `Жалоба ${action === 'resolved' ? 'принята' : 'отклонена'}`,
        details: { complaintId, originalReason: complaint.reason }
      }
    });

    res.json({ complaint: updatedComplaint });
  } catch (error) {
    console.error("[MODERATION] Error updating complaint:", error);
    res.status(500).json({ error: "Ошибка обновления жалобы" });
  }
});

export const moderationRouter = router; 