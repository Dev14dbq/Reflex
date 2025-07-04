// src/analytics.ts - API для расширенной аналитики и отчетности
import { Router, Response } from "express";
import { prisma } from "./prisma.ts";
import { authMiddleware } from "./middleware/auth.ts";

const router = Router();

// Middleware для проверки прав админа
const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true }
    });
    
    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Доступ запрещен. Нужны права администратора." });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: "Ошибка проверки прав доступа" });
  }
};

// ===== ОБЩАЯ АНАЛИТИКА ПЛАТФОРМЫ =====

// Получить общий дашборд статистики
router.get("/dashboard", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { period = "30d" } = req.query;
    
    let daysBack = 30;
    switch (period) {
      case "7d": daysBack = 7; break;
      case "30d": daysBack = 30; break;
      case "90d": daysBack = 90; break;
      case "1y": daysBack = 365; break;
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const [
      totalUsers,
      newUsers,
      blockedUsers,
      verifiedProfiles,
      totalLikes,
      totalMatches,
      totalMessages,
      totalComplaints,
      pendingComplaints
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      prisma.user.count({ where: { blocked: true } }),
      prisma.profile.count({ where: { isVerified: true } }),
      prisma.like.count({ where: { createdAt: { gte: startDate } } }),
      prisma.match.count({ where: { createdAt: { gte: startDate } } }),
      prisma.message.count({ where: { createdAt: { gte: startDate } } }),
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: "pending" } })
    ]);

    res.json({
      overview: {
        users: {
          total: totalUsers,
          new: newUsers,
          blocked: blockedUsers,
          verified: verifiedProfiles,
          growthRate: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(1) : "0.0"
        },
        activity: {
          likes: totalLikes,
          matches: totalMatches,
          messages: totalMessages
        },
        moderation: {
          complaints: totalComplaints,
          pending: pendingComplaints
        }
      },
      period: `${daysBack} дней`
    });
  } catch (error) {
    console.error("[ANALYTICS] Error fetching dashboard:", error);
    res.status(500).json({ error: "Ошибка получения статистики дашборда" });
  }
});

// ===== ДЕТАЛЬНАЯ АНАЛИТИКА ПОЛЬЗОВАТЕЛЕЙ =====

// Анализ активности пользователей
router.get("/users/activity", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { period = "30d" } = req.query;
    
    let daysBack = 30;
    switch (period) {
      case "7d": daysBack = 7; break;
      case "30d": daysBack = 30; break;
      case "90d": daysBack = 90; break;
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Активность по типам действий
    const [likesActivity, messagesActivity, profileViews] = await Promise.all([
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          COUNT(DISTINCT from_user_id) as unique_users
        FROM "Like"
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          COUNT(DISTINCT sender_id) as unique_users
        FROM "Message"
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      // Примерная статистика просмотров профилей (можно добавить отдельную таблицу)
      prisma.like.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: startDate } },
        _count: { _all: true }
      })
    ]);

    // Топ самых активных пользователей
    const topActiveUsers = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.username,
        p.preferred_name,
        (
          SELECT COUNT(*) FROM "Like" WHERE from_user_id = u.id AND created_at >= ${startDate}
        ) as likes_sent,
        (
          SELECT COUNT(*) FROM "Message" WHERE sender_id = u.id AND created_at >= ${startDate}
        ) as messages_sent
      FROM "User" u
      LEFT JOIN "Profile" p ON u.id = p.user_id
      WHERE u.blocked = false
      ORDER BY (
        (SELECT COUNT(*) FROM "Like" WHERE from_user_id = u.id AND created_at >= ${startDate}) +
        (SELECT COUNT(*) FROM "Message" WHERE sender_id = u.id AND created_at >= ${startDate})
      ) DESC
      LIMIT 10
    `;

    res.json({
      activity: {
        likes: likesActivity,
        messages: messagesActivity,
        profileViews: profileViews.slice(0, 10) // Ограничиваем для примера
      },
      topUsers: topActiveUsers,
      period: `${daysBack} дней`
    });
  } catch (error) {
    console.error("[ANALYTICS] Error fetching user activity:", error);
    res.status(500).json({ error: "Ошибка получения аналитики активности" });
  }
});

// ===== ГЕОГРАФИЧЕСКАЯ И ДЕМОГРАФИЧЕСКАЯ АНАЛИТИКА =====

// Статистика по регионам и городам
router.get("/geography", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const cityStats = await prisma.profile.groupBy({
      by: ['city'],
      where: {
        user: { blocked: false }
      },
      _count: true
    });

    const genderStats = await prisma.profile.groupBy({
      by: ['gender'],
      where: {
        user: { blocked: false }
      },
      _count: true
    });

    res.json({
      cities: cityStats.map(stat => ({
        city: stat.city,
        users: stat._count
      })),
      gender: genderStats.map(stat => ({
        gender: stat.gender,
        count: stat._count
      }))
    });
  } catch (error) {
    console.error("[ANALYTICS] Error fetching geography analytics:", error);
    res.status(500).json({ error: "Ошибка получения географической аналитики" });
  }
});

// ===== АНАЛИТИКА СОВПАДЕНИЙ И ВЗАИМОДЕЙСТВИЙ =====

// Статистика лайков и совпадений
router.get("/interactions", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { period = "30d" } = req.query;
    
    let daysBack = 30;
    switch (period) {
      case "7d": daysBack = 7; break;
      case "30d": daysBack = 30; break;
      case "90d": daysBack = 90; break;
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const [
      totalLikes,
      totalMatches,
      mutualLikes
    ] = await Promise.all([
      prisma.like.count({ where: { createdAt: { gte: startDate } } }),
      prisma.match.count({ where: { createdAt: { gte: startDate } } }),
      prisma.like.count({ 
        where: { 
          isLike: true,
          createdAt: { gte: startDate }
        } 
      })
    ]);

    res.json({
      overview: {
        totalLikes,
        totalMatches,
        mutualLikes,
        matchRate: totalLikes > 0 ? ((totalMatches / totalLikes) * 100).toFixed(2) : "0.00",
        likeSuccessRate: totalLikes > 0 ? ((mutualLikes / totalLikes) * 100).toFixed(2) : "0.00"
      },
      period: `${daysBack} дней`
    });
  } catch (error) {
    console.error("[ANALYTICS] Error fetching interaction analytics:", error);
    res.status(500).json({ error: "Ошибка получения аналитики взаимодействий" });
  }
});

// ===== АНАЛИТИКА МОДЕРАЦИИ =====

// Подробная статистика модерации
router.get("/moderation", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { period = "30d" } = req.query;
    
    let daysBack = 30;
    switch (period) {
      case "7d": daysBack = 7; break;
      case "30d": daysBack = 30; break;
      case "90d": daysBack = 90; break;
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const complaintStats = await prisma.complaint.groupBy({
      by: ['type', 'status'],
      where: { createdAt: { gte: startDate } },
      _count: { _all: true }
    });

    res.json({
      complaints: {
        byType: complaintStats
      },
      period: `${daysBack} дней`
    });
  } catch (error) {
    console.error("[ANALYTICS] Error fetching moderation analytics:", error);
    res.status(500).json({ error: "Ошибка получения аналитики модерации" });
  }
});

// ===== АНАЛИТИКА КОНТЕНТА =====

// Статистика изображений и контента
router.get("/content", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const [
      totalImages,
      nsfwImages,
      approvedImages
    ] = await Promise.all([
      prisma.image.count(),
      prisma.image.count({ where: { isNsfw: true } }),
      prisma.image.count({ where: { isApproved: true } })
    ]);

    res.json({
      images: {
        total: totalImages,
        nsfw: nsfwImages,
        approved: approvedImages,
        nsfwRate: totalImages > 0 ? ((nsfwImages / totalImages) * 100).toFixed(2) : "0.00",
        approvalRate: totalImages > 0 ? ((approvedImages / totalImages) * 100).toFixed(2) : "0.00"
      }
    });
  } catch (error) {
    console.error("[ANALYTICS] Error fetching content analytics:", error);
    res.status(500).json({ error: "Ошибка получения аналитики контента" });
  }
});

// ===== ЭКСПОРТ ДАННЫХ =====

// Экспорт статистики в CSV
router.get("/export/:type", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    const { type } = req.params;
    const { period = "30d" } = req.query;
    
    let daysBack = 30;
    switch (period) {
      case "7d": daysBack = 7; break;
      case "30d": daysBack = 30; break;
      case "90d": daysBack = 90; break;
      case "1y": daysBack = 365; break;
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    let data: any[] = [];
    let filename = "";

    switch (type) {
      case "users":
        data = await prisma.user.findMany({
          where: { createdAt: { gte: startDate } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            createdAt: true,
            blocked: true,
            profile: {
              select: {
                preferredName: true,
                city: true,
                gender: true,
                isVerified: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        filename = `users_${period}.csv`;
        break;

      case "geography":
        data = await (prisma.profile.groupBy as any)({
          by: ['city', 'gender'],
          where: {
            user: { blocked: false }
          },
          _count: true
        });
        filename = `geography_${period}.csv`;
        break;

      default:
        res.status(400).json({ error: "Неподдерживаемый тип экспорта" });
        return;
    }

    if (data.length === 0) {
      res.status(404).json({ error: "Данные для экспорта не найдены" });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csvContent);
  } catch (error) {
    console.error("[ANALYTICS] Error exporting data:", error);
    res.status(500).json({ error: "Ошибка экспорта данных" });
  }
});

// ===== СИСТЕМНЫЕ МЕТРИКИ =====

// Получить системные метрики производительности
router.get("/system", authMiddleware, requireAdmin, async (req: any, res: Response) => {
  try {
    // Размеры таблиц базы данных
    const tableStats = await prisma.$queryRaw`
      SELECT 
        table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_tables pt
      JOIN pg_stat_user_tables psut ON pt.tablename = psut.relname
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `;

    // Статистика активных соединений
    const connectionStats = await prisma.$queryRaw`
      SELECT 
        state,
        COUNT(*) as count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state
    `;

    res.json({
      database: {
        tables: tableStats,
        connections: connectionStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[ANALYTICS] Error fetching system metrics:", error);
    res.status(500).json({ error: "Ошибка получения системных метрик" });
  }
});

export const analyticsRouter = router; 