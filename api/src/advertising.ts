// src/advertising.ts - API для рекламной системы
import { Router, Response, NextFunction } from "express";
import { prisma } from "./prisma";
import { authMiddleware } from "./middleware/auth";

const router = Router();

// Middleware для проверки прав рекламодателя или админа
const requireAdvertiser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true, isAdvertiser: true }
    });
    
    if (!user?.isAdmin && !user?.isAdvertiser) {
      res.status(403).json({ error: "Доступ запрещен. Нужны права рекламодателя или администратора." });
      return;
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: "Ошибка проверки прав доступа" });
  }
};

// Middleware для проверки прав администратора
const requireAdmin = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true }
    });

    if (!user?.isAdmin) {
      res.status(403).json({ error: "Доступ запрещен: требуются права администратора" });
      return;
    }

    next();
  } catch (error) {
    console.error("[ADVERTISING] Error checking admin rights:", error);
    res.status(500).json({ error: "Ошибка проверки прав доступа" });
  }
};

// ===== УПРАВЛЕНИЕ КАМПАНИЯМИ =====

// Получить статистику рекламодателя
router.get("/stats", authMiddleware, requireAdvertiser, async (req: any, res: Response) => {
  try {
    const campaigns = await prisma.adCampaign.findMany({
      where: { advertiserId: req.userId },
      include: {
        analytics: true
      }
    });

    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    
    let totalImpressions = 0;
    let totalClicks = 0;

    campaigns.forEach(campaign => {
      campaign.analytics.forEach(analytic => {
        totalImpressions += analytic.impressions;
        totalClicks += analytic.clicks;
      });
    });

    const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

    res.json({
      totalCampaigns,
      activeCampaigns,
      totalImpressions,
      totalClicks,
      ctr
    });
  } catch (error) {
    console.error("[ADVERTISING] Error fetching stats:", error);
    res.status(500).json({ error: "Ошибка получения статистики" });
  }
});

// Получить список кампаний пользователя
router.get("/campaigns", authMiddleware, requireAdvertiser, async (req: any, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = { advertiserId: req.userId };
    if (status) where.status = status;

    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

    const [campaigns, total] = await Promise.all([
      prisma.adCampaign.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          analytics: {
            orderBy: { date: "desc" },
            take: 7
          }
        }
      }),
      prisma.adCampaign.count({ where })
    ]);

    const campaignsWithStats = campaigns.map(campaign => {
      const totalImpressions = campaign.analytics.reduce((sum, stat) => sum + stat.impressions, 0);
      const totalClicks = campaign.analytics.reduce((sum, stat) => sum + stat.clicks, 0);
      
      return {
        ...campaign,
        stats: {
          totalImpressions,
          totalClicks,
          ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00"
        }
      };
    });

    res.json({
      campaigns: campaignsWithStats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error("[ADVERTISING] Error fetching campaigns:", error);
    res.status(500).json({ error: "Ошибка получения кампаний" });
  }
});

// Получить детальную информацию о кампании
router.get("/campaigns/:campaignId", authMiddleware, requireAdvertiser, async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await prisma.adCampaign.findFirst({
      where: { 
        id: campaignId,
        advertiserId: req.userId // Проверяем, что кампания принадлежит пользователю
      },
      include: {
        analytics: {
          orderBy: { date: "desc" },
          take: 30 // Последние 30 дней
        }
      }
    });

    if (!campaign) {
      res.status(404).json({ error: "Кампания не найдена" });
      return;
    }

    // Подсчитываем статистику
    const totalImpressions = campaign.analytics.reduce((sum, stat) => sum + stat.impressions, 0);
    const totalClicks = campaign.analytics.reduce((sum, stat) => sum + stat.clicks, 0);

    res.json({
      ...campaign,
      stats: {
        totalImpressions,
        totalClicks,
        ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00"
      }
    });
  } catch (error) {
    console.error("[ADVERTISING] Error fetching campaign details:", error);
    res.status(500).json({ error: "Ошибка получения данных кампании" });
  }
});

// Создать новую кампанию
router.post("/campaigns", authMiddleware, requireAdvertiser, async (req: any, res: Response) => {
  try {
    // Проверяем, есть ли уже кампания у пользователя
    const existingCampaign = await prisma.adCampaign.findFirst({
      where: { advertiserId: req.userId }
    });

    if (existingCampaign) {
      res.status(400).json({ 
        error: "У вас уже есть рекламная кампания. Можно создать только одну кампанию." 
      });
      return;
    }

    const {
      title,
      adTitle,
      adDescription,
      adImageUrl,
      adButtonText,
      adButtonUrl,
      targetAgeMin,
      targetAgeMax,
      targetGender,
      targetArea,
      startDate,
      endDate
    } = req.body;

    if (!title || !adTitle || !adDescription || !adButtonUrl) {
      res.status(400).json({ 
        error: "Необходимо заполнить все обязательные поля" 
      });
      return;
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : null;

    const campaign = await prisma.adCampaign.create({
      data: {
        advertiserId: req.userId,
        title,
        adTitle,
        adDescription,
        adImageUrl,
        buttonText: adButtonText || "Узнать больше",
        buttonUrl: adButtonUrl,
        targetAgeMin: targetAgeMin ? Number(targetAgeMin) : 13,
        targetAgeMax: targetAgeMax ? Number(targetAgeMax) : 25,
        targetCities: targetArea ? [`${targetArea.lat},${targetArea.lng},${targetArea.radius}`] : [], // Временно храним область как строку в targetCities
        targetGenders: targetGender && targetGender !== 'all' ? [targetGender] : [],
        targetInterests: [], // Пустой массив, так как интересов нет
        weight: 3, // Фиксированный приоритет
        startDate: start,
        endDate: end,
        status: "pending"
      }
    });

    res.json({ campaign });
  } catch (error) {
    console.error("[ADVERTISING] Error creating campaign:", error);
    res.status(500).json({ error: "Ошибка создания кампании" });
  }
});

// Управление статусом кампании
router.post("/campaigns/:campaignId/status", authMiddleware, requireAdvertiser, async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { action } = req.body;

    if (!["start", "pause", "stop"].includes(action)) {
      res.status(400).json({ error: "Недопустимое действие" });
      return;
    }

    const campaign = await prisma.adCampaign.findFirst({
      where: { 
        id: campaignId,
        advertiserId: req.userId 
      }
    });

    if (!campaign) {
      res.status(404).json({ error: "Кампания не найдена" });
      return;
    }

    let newStatus: string;
    
    switch (action) {
      case "start":
        if (campaign.status === "pending") {
          res.status(400).json({ 
            error: "Кампания находится на модерации. Дождитесь одобрения администратором." 
          });
          return;
        }
        newStatus = "active";
        break;
        
      case "pause":
        newStatus = "paused";
        break;
        
      case "stop":
        newStatus = "completed";
        break;
        
      default:
        res.status(400).json({ error: "Неизвестное действие" });
        return;
    }

    const updatedCampaign = await prisma.adCampaign.update({
      where: { id: campaignId },
      data: { status: newStatus }
    });

    res.json({ campaign: updatedCampaign });
  } catch (error) {
    console.error("[ADVERTISING] Error updating campaign status:", error);
    res.status(500).json({ error: "Ошибка изменения статуса кампании" });
  }
});

// ===== АНАЛИТИКА =====

// Получить аналитику кампании
router.get("/campaigns/:campaignId/analytics", authMiddleware, requireAdvertiser, async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { period = "30d" } = req.query;

    const campaign = await prisma.adCampaign.findFirst({
      where: { 
        id: campaignId,
        advertiserId: req.userId 
      }
    });

    if (!campaign) {
      res.status(404).json({ error: "Кампания не найдена" });
      return;
    }

    let daysBack = 30;
    switch (period) {
      case "7d": daysBack = 7; break;
      case "30d": daysBack = 30; break;
      case "90d": daysBack = 90; break;
    }
    
    const startPeriod = new Date();
    startPeriod.setDate(startPeriod.getDate() - daysBack);

    const analytics = await prisma.adAnalytic.findMany({
      where: {
        campaignId,
        date: { gte: startPeriod }
      },
      orderBy: { date: "asc" }
    });

    const dailyStats = analytics.map(stat => ({
      date: stat.date.toISOString().split('T')[0],
      impressions: stat.impressions,
      clicks: stat.clicks,
      uniqueViews: stat.uniqueViews,
      ctr: stat.impressions > 0 ? ((stat.clicks / stat.impressions) * 100).toFixed(2) : "0.00"
    }));

    const totalImpressions = analytics.reduce((sum, stat) => sum + stat.impressions, 0);
    const totalClicks = analytics.reduce((sum, stat) => sum + stat.clicks, 0);
    const totalUniqueViews = analytics.reduce((sum, stat) => sum + stat.uniqueViews, 0);

    res.json({
      dailyStats,
      summary: {
        totalImpressions,
        totalClicks,
        totalUniqueViews,
        averageCtr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00"
      }
    });
  } catch (error) {
    console.error("[ADVERTISING] Error fetching analytics:", error);
    res.status(500).json({ error: "Ошибка получения аналитики" });
  }
});

// Получить общую статистику рекламодателя
router.get("/analytics/overview", authMiddleware, requireAdvertiser, async (req: any, res: Response) => {
  try {
    const campaigns = await prisma.adCampaign.findMany({
      where: { advertiserId: req.userId }
    });

    const totalImpressions = campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0);
    const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);

    res.json({
      overview: {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === "active").length,
        totalImpressions,
        totalClicks,
        averageCtr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00"
      }
    });
  } catch (error) {
    console.error("[ADVERTISING] Error fetching overview analytics:", error);
    res.status(500).json({ error: "Ошибка получения общей аналитики" });
  }
});

// Получить статистику для главной панели
router.get("/stats", authMiddleware, requireAdvertiser, async (req: any, res: Response) => {
  try {
    const campaigns = await prisma.adCampaign.findMany({
      where: { advertiserId: req.userId }
    });

    const totalImpressions = campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0);
    const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);

    res.json({
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === "active").length,
      pendingCampaigns: campaigns.filter(c => c.status === "pending").length,
      totalImpressions,
      totalClicks,
      averageCtr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00"
    });
  } catch (error) {
    console.error("[ADVERTISING] Error fetching stats:", error);
    res.status(500).json({ error: "Ошибка получения статистики" });
  }
});

// ===== ТАРГЕТИНГ И АУДИТОРИЯ =====

// Получить статистику аудитории для таргетинга
router.get("/targeting/audience", authMiddleware, requireAdvertiser, async (req: any, res: Response) => {
  try {
    const { ageMin, ageMax, city, goals, gender } = req.query;

    const where: any = {};
    
    // Возраст считаем как текущий год минус год рождения
    if (ageMin || ageMax) {
      const currentYear = new Date().getFullYear();
      if (ageMin) {
        const maxBirthYear = currentYear - Number(ageMin);
        where.birthYear = { lte: maxBirthYear.toString() };
      }
      if (ageMax) {
        const minBirthYear = currentYear - Number(ageMax);
        where.birthYear = { ...where.birthYear, gte: minBirthYear.toString() };
      }
    }
    
    if (city) {
      where.city = { contains: city as string, mode: "insensitive" };
    }
    
    if (goals) {
      const goalArray = Array.isArray(goals) ? goals : [goals];
      where.goals = { hasSome: goalArray };
    }
    
    if (gender) {
      where.gender = gender;
    }

    const audienceSize = await prisma.profile.count({
      where: {
        ...where,
        user: { blocked: false }
      }
    });

    res.json({ audienceSize });
  } catch (error) {
    console.error("[ADVERTISING] Error fetching audience:", error);
    res.status(500).json({ error: "Ошибка получения данных аудитории" });
  }
});

// ===== СИСТЕМНЫЕ ФУНКЦИИ ДЛЯ ПОКАЗА РЕКЛАМЫ =====

// Получить рекламу для показа (системный API)
router.get("/serve", async (req: any, res: Response) => {
  try {
    const { userId, city, age, gender, interests } = req.query;

    // Получаем ID кампаний, по которым пользователь уже переходил
    let clickedCampaignIds: string[] = [];
    if (userId) {
      const userClicks = await prisma.adUserClick.findMany({
        where: { userId: String(userId) },
        select: { campaignId: true }
      });
      clickedCampaignIds = userClicks.map(click => click.campaignId);
    }

    // Получаем активные кампании, исключая те по которым уже переходил пользователь
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        status: { in: ["active", "approved"] },
        id: { notIn: clickedCampaignIds }, // Исключаем кампании по которым уже переходил
        OR: [
          { startDate: null },
          { startDate: { lte: new Date() } }
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } }
            ]
          }
        ]
      },
      orderBy: { weight: "desc" }
    });

    // Простая фильтрация по таргетингу
    const suitableCampaigns = campaigns.filter(campaign => {
      if (age && campaign.targetAgeMin && Number(age) < campaign.targetAgeMin) return false;
      if (age && campaign.targetAgeMax && Number(age) > campaign.targetAgeMax) return false;
      if (gender && campaign.targetGenders.length > 0 && !campaign.targetGenders.includes(gender as string)) return false;
      if (city && campaign.targetCities.length > 0) {
        const cityMatch = campaign.targetCities.some(targetCity => 
          (city as string).toLowerCase().includes(targetCity.toLowerCase())
        );
        if (!cityMatch) return false;
      }
      return true;
    });

    if (suitableCampaigns.length === 0) {
      res.json({ ad: null });
      return;
    }

    // Выбираем случайную кампанию с учетом весов
    const totalWeight = suitableCampaigns.reduce((sum, campaign) => sum + campaign.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    
    let selectedCampaign = suitableCampaigns[0];
    for (const campaign of suitableCampaigns) {
      randomWeight -= campaign.weight;
      if (randomWeight <= 0) {
        selectedCampaign = campaign;
        break;
      }
    }

    res.json({
      ad: {
        id: selectedCampaign.id,
        title: selectedCampaign.adTitle,
        description: selectedCampaign.adDescription,
        imageUrl: selectedCampaign.adImageUrl,
        buttonText: selectedCampaign.buttonText,
        buttonUrl: selectedCampaign.buttonUrl
      }
    });
  } catch (error) {
    console.error("[ADVERTISING] Error serving ad:", error);
    res.json({ ad: null });
  }
});

// Получить конкретную рекламу по ID
router.get("/campaign/:campaignId/ad", async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign || !["active", "approved"].includes(campaign.status)) {
      res.json({ ad: null });
      return;
    }

    res.json({
      ad: {
        id: campaign.id,
        title: campaign.adTitle,
        description: campaign.adDescription,
        imageUrl: campaign.adImageUrl,
        buttonText: campaign.buttonText,
        buttonUrl: campaign.buttonUrl
      }
    });
  } catch (error) {
    console.error("[ADVERTISING] Error fetching ad by id:", error);
    res.json({ ad: null });
  }
});

// Засчитать показ рекламы
router.post("/track/impression", async (req: any, res: Response) => {
  try {
    const { campaignId, userId } = req.body;
    
    // Здесь нужна логика для предотвращения накрутки, 
    // например, через Redis или кеширование на уровне пользователя
    
    await prisma.adAnalytic.upsert({
      where: { 
        campaignId_date: {
          campaignId,
          date: new Date(new Date().setUTCHours(0,0,0,0))
        }
      },
      update: { impressions: { increment: 1 } },
      create: {
        campaignId,
        date: new Date(new Date().setUTCHours(0,0,0,0)),
        impressions: 1,
        clicks: 0,
        uniqueViews: 0 // Уникальные просмотры требуют более сложной логики
      }
    });

    await prisma.adCampaign.update({
      where: { id: campaignId },
      data: { impressions: { increment: 1 } }
    });

    res.status(204).send();
  } catch (error) {
    console.error("[ADVERTISING] Error tracking impression:", error);
    res.status(500).json({ error: "Ошибка трекинга показа" });
  }
});

// Засчитать клик по рекламе
router.post("/track/click", async (req: any, res: Response) => {
  try {
    const { campaignId, userId } = req.body;

    // Сохраняем клик пользователя (с защитой от дублирования)
    if (userId) {
      // Проверяем, что пользователь существует
      const userExists = await prisma.user.findUnique({
        where: { id: String(userId) },
        select: { id: true }
      });

      if (userExists) {
        await prisma.adUserClick.upsert({
          where: {
            userId_campaignId: {
              userId: String(userId),
              campaignId
            }
          },
          update: {}, // Ничего не обновляем если запись уже есть
          create: {
            userId: String(userId),
            campaignId
          }
        });
      } else {
        console.warn(`[ADVERTISING] Attempted to track click for non-existent user: ${userId}`);
      }
    }

    await prisma.adAnalytic.upsert({
      where: { 
        campaignId_date: {
          campaignId,
          date: new Date(new Date().setUTCHours(0,0,0,0))
        }
      },
      update: { clicks: { increment: 1 } },
      create: {
        campaignId,
        date: new Date(new Date().setUTCHours(0,0,0,0)),
        impressions: 0,
        clicks: 1,
        uniqueViews: 0
      }
    });

    await prisma.adCampaign.update({
      where: { id: campaignId },
      data: { clicks: { increment: 1 } }
    });

    res.status(204).send();
  } catch (error) {
    console.error("[ADVERTISING] Error tracking click:", error);
    res.status(500).json({ error: "Ошибка трекинга клика" });
  }
});

// ===== АДМИНСКИЕ ЭНДПОИНТЫ =====

// Получить все кампании для админа
router.get("/admin/campaigns", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const campaigns = await prisma.adCampaign.findMany({
      include: {
        advertiser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                city: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ campaigns });
  } catch (error) {
    console.error("[ADVERTISING] Error fetching campaigns for admin:", error);
    res.status(500).json({ error: "Ошибка получения кампаний" });
  }
});

// Модерация кампании
router.post("/admin/campaigns/:campaignId/moderate", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { action, comment } = req.body; // action: "approve" | "reject"

    if (!["approve", "reject"].includes(action)) {
      res.status(400).json({ error: "Неверное действие модерации" });
      return;
    }

    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      res.status(404).json({ error: "Кампания не найдена" });
      return;
    }

    if (campaign.status !== "pending") {
      res.status(400).json({ error: "Кампания уже промодерирована" });
      return;
    }

    const newStatus = action === "approve" ? "active" : "rejected";

    const updatedCampaign = await prisma.adCampaign.update({
      where: { id: campaignId },
      data: { 
        status: newStatus,
        // Можно добавить поле moderationComment в схему БД если нужно
      }
    });

    // Отправляем уведомление рекламодателю (опционально)
    const message = action === "approve" 
      ? "Ваша рекламная кампания одобрена и скоро начнет показываться!"
      : `Ваша рекламная кампания отклонена. ${comment ? `Причина: ${comment}` : ""}`;

    // Здесь можно добавить отправку уведомления через WebSocket или email

    res.json({ 
      campaign: updatedCampaign,
      message: `Кампания ${action === "approve" ? "одобрена" : "отклонена"}`
    });
  } catch (error) {
    console.error("[ADVERTISING] Error moderating campaign:", error);
    res.status(500).json({ error: "Ошибка модерации кампании" });
  }
});

export const advertisingRouter = router; 