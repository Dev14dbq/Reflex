import { Router } from "express";
import { prisma } from "./prisma";
import { authMiddleware } from "./middleware/auth";

const settingsRouter = Router();

// GET /settings - получить настройки пользователя
settingsRouter.get("/settings", authMiddleware, async (req, res): Promise<void> => {
  const userId = (req as any).userId;

  try {
    let settings = await prisma.settings.findUnique({
      where: { userId },
    });

    // Если настроек нет - создаем с дефолтными значениями
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          userId,
          notifyMessages: true,
          notifyLikes: true,
          notifyNews: true,
          notifyAds: true,
          notifyTech: false,
          sameCityOnly: false,
        },
      });
    }

    res.json({ settings });
  } catch (err) {
    console.error("[API] settings get error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /settings - обновить настройки пользователя
settingsRouter.put("/settings", authMiddleware, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const {
    notifyMessages,
    notifyLikes,
    notifyNews,
    notifyAds,
    notifyTech,
    sameCityOnly,
  } = req.body;

  try {
    // Проверяем, что все переданные значения - boolean или undefined
    const booleanFields = {
      notifyMessages,
      notifyLikes,
      notifyNews,
      notifyAds,
      notifyTech,
      sameCityOnly,
    };

    for (const [key, value] of Object.entries(booleanFields)) {
      if (value !== undefined && typeof value !== "boolean") {
        res.status(400).json({ error: `${key} must be a boolean value` });
        return;
      }
    }

    // Подготавливаем данные для обновления (только переданные поля)
    const updateData: any = {};
    if (notifyMessages !== undefined) updateData.notifyMessages = notifyMessages;
    if (notifyLikes !== undefined) updateData.notifyLikes = notifyLikes;
    if (notifyNews !== undefined) updateData.notifyNews = notifyNews;
    if (notifyAds !== undefined) updateData.notifyAds = notifyAds;
    if (notifyTech !== undefined) updateData.notifyTech = notifyTech;
    if (sameCityOnly !== undefined) updateData.sameCityOnly = sameCityOnly;

    // Создаем или обновляем настройки
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        notifyMessages: notifyMessages ?? true,
        notifyLikes: notifyLikes ?? true,
        notifyNews: notifyNews ?? true,
        notifyAds: notifyAds ?? true,
        notifyTech: notifyTech ?? false,
        sameCityOnly: sameCityOnly ?? false,
      },
    });

    res.json({ settings });
  } catch (err) {
    console.error("[API] settings update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /settings/notifications - обновить только настройки уведомлений
settingsRouter.patch("/settings/notifications", authMiddleware, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const {
    notifyMessages,
    notifyLikes,
    notifyNews,
    notifyAds,
    notifyTech,
  } = req.body;

  try {
    // Подготавливаем данные только для уведомлений
    const updateData: any = {};
    if (notifyMessages !== undefined) {
      if (typeof notifyMessages !== "boolean") {
        res.status(400).json({ error: "notifyMessages must be a boolean" });
        return;
      }
      updateData.notifyMessages = notifyMessages;
    }
    if (notifyLikes !== undefined) {
      if (typeof notifyLikes !== "boolean") {
        res.status(400).json({ error: "notifyLikes must be a boolean" });
        return;
      }
      updateData.notifyLikes = notifyLikes;
    }
    if (notifyNews !== undefined) {
      if (typeof notifyNews !== "boolean") {
        res.status(400).json({ error: "notifyNews must be a boolean" });
        return;
      }
      updateData.notifyNews = notifyNews;
    }
    if (notifyAds !== undefined) {
      if (typeof notifyAds !== "boolean") {
        res.status(400).json({ error: "notifyAds must be a boolean" });
        return;
      }
      updateData.notifyAds = notifyAds;
    }
    if (notifyTech !== undefined) {
      if (typeof notifyTech !== "boolean") {
        res.status(400).json({ error: "notifyTech must be a boolean" });
        return;
      }
      updateData.notifyTech = notifyTech;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No notification settings provided" });
      return;
    }

    // Создаем или обновляем настройки
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        notifyMessages: notifyMessages ?? true,
        notifyLikes: notifyLikes ?? true,
        notifyNews: notifyNews ?? true,
        notifyAds: notifyAds ?? true,
        notifyTech: notifyTech ?? false,
        sameCityOnly: false, // дефолтное значение для других настроек
      },
    });

    res.json({ settings });
  } catch (err) {
    console.error("[API] notifications update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /settings/recommendations - обновить настройки рекомендаций
settingsRouter.patch("/settings/recommendations", authMiddleware, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const { sameCityOnly } = req.body;

  try {
    if (sameCityOnly !== undefined && typeof sameCityOnly !== "boolean") {
      res.status(400).json({ error: "sameCityOnly must be a boolean" });
      return;
    }

    const updateData: any = {};
    if (sameCityOnly !== undefined) updateData.sameCityOnly = sameCityOnly;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No recommendation settings provided" });
      return;
    }

    // Создаем или обновляем настройки
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        sameCityOnly: sameCityOnly ?? false,
        // дефолтные значения для уведомлений
        notifyMessages: true,
        notifyLikes: true,
        notifyNews: true,
        notifyAds: true,
        notifyTech: false,
      },
    });

    res.json({ settings });
  } catch (err) {
    console.error("[API] recommendations update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Получить настройки рекомендаций
settingsRouter.get("/settings/recommendations", authMiddleware, async (req, res): Promise<void> => {
  const userId = (req as any).userId;

  try {
    let settings = await prisma.settings.findUnique({ 
      where: { userId },
      select: {
        similarAge: true,
        localFirst: true,
        showNsfw: true,
        sameCityOnly: true,
        ageRangeMin: true,
        ageRangeMax: true,
        maxDistance: true,
      }
    });

    if (!settings) {
      // Создаем с дефолтными значениями
      settings = await prisma.settings.create({
        data: { userId },
        select: {
          similarAge: true,
          localFirst: true,
          showNsfw: true,
          sameCityOnly: true,
          ageRangeMin: true,
          ageRangeMax: true,
          maxDistance: true,
        }
      });
    }

    res.json({ settings });
  } catch (err) {
    console.error("[API] recommendations settings GET error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Обновить настройки рекомендаций
settingsRouter.put("/settings/recommendations", authMiddleware, async (req, res): Promise<void> => {
  const userId = (req as any).userId;
  const {
    similarAge,
    localFirst,
    showNsfw,
    sameCityOnly,
    ageRangeMin,
    ageRangeMax,
    maxDistance
  } = req.body;

  try {
    const updated = await prisma.settings.upsert({
      where: { userId },
      update: {
        similarAge,
        localFirst,
        showNsfw,
        sameCityOnly,
        ageRangeMin,
        ageRangeMax,
        maxDistance,
      },
      create: {
        userId,
        similarAge: similarAge ?? true,
        localFirst: localFirst ?? true,
        showNsfw: showNsfw ?? false,
        sameCityOnly: sameCityOnly ?? false,
        ageRangeMin,
        ageRangeMax,
        maxDistance,
      },
    });

    res.json({ settings: updated });
  } catch (err) {
    console.error("[API] recommendations settings PUT error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { settingsRouter }; 