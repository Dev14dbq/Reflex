import { Router } from "express";
import { authMiddleware } from "./middleware/auth.ts";
import { prisma } from "./prisma.ts";
// Импортируем TensorFlow и nsfwjs
import tf from './tensorflow-config';
import nsfwjs from 'nsfwjs';
import axios from 'axios';
import sharp from 'sharp';

const nsfwRouter = Router();

// Глобальная переменная для модели
let nsfwModel: any = null;

// Инициализация модели при старте
export const initializeNsfwModel = async () => {
  try {
    console.log('[NSFW] Загрузка модели...');
    // Используем прямую ссылку на GitHub
    const modelUrl = 'https://raw.githubusercontent.com/infinitered/nsfwjs/master/models/mobilenet_v2/model.json';
    nsfwModel = await nsfwjs.load(modelUrl);
    console.log('[NSFW] ✅ Модель загружена успешно');
  } catch (error) {
    console.error('[NSFW] ❌ Ошибка загрузки модели:', error);
    console.log('[NSFW] ⚠️  NSFW проверка будет работать без модели (все изображения будут считаться безопасными)');
    // Не блокируем запуск сервера из-за ошибки загрузки модели
  }
};

// Пороги для классификации
const NSFW_THRESHOLDS = {
  // Если любая из этих категорий выше порога - изображение NSFW
  porn: 0.5,
  hentai: 0.5,
  sexy: 0.7, // Более высокий порог для "sexy" так как может быть неточным
};

// Проверка изображения на NSFW
const checkImageNsfw = async (imageBuffer: Buffer): Promise<{
  isNsfw: boolean;
  score: number;
  predictions: any[];
}> => {
  if (!nsfwModel) {
    console.warn('[NSFW] Модель не загружена, возвращаем безопасный результат');
    return {
      isNsfw: false,
      score: 0,
      predictions: []
    };
  }

  try {
    // Конвертируем изображение в формат для TensorFlow
    const image = await sharp(imageBuffer)
      .resize(224, 224) // Размер для модели
      .toFormat('jpeg')
      .toBuffer();

    // Декодируем изображение для TensorFlow
    const decoded = tf.node.decodeImage(image, 3);

    // Получаем предсказания
    const predictions = await nsfwModel.classify(decoded);

    // Освобождаем память
    decoded.dispose();

    // Определяем является ли изображение NSFW
    let isNsfw = false;
    let maxNsfwScore = 0;

    predictions.forEach((prediction: any) => {
      const className = prediction.className.toLowerCase();
      const probability = prediction.probability;

      // Проверяем пороги для NSFW категорий
      if (className in NSFW_THRESHOLDS) {
        const threshold = NSFW_THRESHOLDS[className as keyof typeof NSFW_THRESHOLDS];
        if (probability >= threshold) {
          isNsfw = true;
          maxNsfwScore = Math.max(maxNsfwScore, probability);
        }
      }
    });

    return {
      isNsfw,
      score: maxNsfwScore,
      predictions
    };
  } catch (error) {
    console.error('[NSFW] Ошибка проверки изображения:', error);
    throw error;
  }
};

// API эндпоинт для проверки изображения по URL
nsfwRouter.post("/nsfw/check-url", authMiddleware, async (req, res): Promise<void> => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      res.status(400).json({ error: "Image URL is required" });
      return;
    }

    // Загружаем изображение
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000 // 30 секунд таймаут
    });

    const imageBuffer = Buffer.from(response.data);

    // Проверяем на NSFW
    const result = await checkImageNsfw(imageBuffer);

    res.json({
      url: imageUrl,
      isNsfw: result.isNsfw,
      nsfwScore: result.score,
      predictions: result.predictions.map(p => ({
        className: p.className,
        probability: p.probability
      }))
    });

  } catch (error: any) {
    console.error("[NSFW] Check URL error:", error);
    res.status(500).json({
      error: "Failed to check image",
      message: error.message
    });
  }
});

// API эндпоинт для загрузки и проверки изображения
nsfwRouter.post("/nsfw/upload-and-check", authMiddleware, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId;

    // Здесь должна быть логика получения файла из request
    // Например через multer или другую библиотеку
    // const imageBuffer = req.file?.buffer;

    res.status(501).json({
      error: "Upload endpoint not implemented yet",
      message: "Use /profile/add-media endpoint with NSFW check integrated"
    });

  } catch (error: any) {
    console.error("[NSFW] Upload error:", error);
    res.status(500).json({
      error: "Failed to upload and check image",
      message: error.message
    });
  }
});

// Массовая проверка существующих изображений
nsfwRouter.post("/nsfw/batch-check", authMiddleware, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId;

    // Получаем профиль пользователя
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const results = [];

    // Временно проверяем изображения из старого массива
    for (let i = 0; i < profile.images.length; i++) {
      const imageUrl = profile.images[i];
      try {
        // Загружаем изображение
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });

        const imageBuffer = Buffer.from(response.data);

        // Проверяем на NSFW
        const nsfwResult = await checkImageNsfw(imageBuffer);

        results.push({
          index: i,
          url: imageUrl,
          isNsfw: nsfwResult.isNsfw,
          score: nsfwResult.score
        });

      } catch (error) {
        console.error(`[NSFW] Ошибка проверки изображения ${i}:`, error);
        results.push({
          index: i,
          url: imageUrl,
          error: 'Failed to check'
        });
      }
    }

    res.json({
      checked: results.length,
      results
    });

  } catch (error: any) {
    console.error("[NSFW] Batch check error:", error);
    res.status(500).json({
      error: "Failed to batch check images",
      message: error.message
    });
  }
});

// Получить статистику NSFW для пользователя
nsfwRouter.get("/nsfw/stats", authMiddleware, async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId;

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        imageData: {
          select: {
            isNsfw: true,
            nsfwScore: true
          }
        }
      }
    });

    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const totalImages = profile.imageData.length;
    const nsfwImages = profile.imageData.filter((img: any) => img.isNsfw).length;
    const safeImages = totalImages - nsfwImages;
    const averageNsfwScore = profile.imageData
      .filter((img: any) => img.isNsfw && img.nsfwScore)
      .reduce((sum: number, img: any) => sum + (img.nsfwScore || 0), 0) / (nsfwImages || 1);

    res.json({
      totalImages,
      nsfwImages,
      safeImages,
      nsfwPercentage: totalImages > 0 ? (nsfwImages / totalImages) * 100 : 0,
      averageNsfwScore: nsfwImages > 0 ? averageNsfwScore : 0
    });

  } catch (error: any) {
    console.error("[NSFW] Stats error:", error);
    res.status(500).json({
      error: "Failed to get NSFW stats",
      message: error.message
    });
  }
});

export { nsfwRouter, checkImageNsfw }; 