import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma.ts";
import { validateInitData } from "./validate.ts";

const authRouter = Router();

authRouter.post("/auth/by-initdata", async (req, res): Promise<void> => {
  try {
    const { initData } = req.body;
    const { ok, hash, user } = validateInitData(initData, process.env.BOT_TOKEN!);

    if (!ok || !hash || !user) {
      console.warn("[AUTH] ❌ Invalid initData payload");
      res.status(403).json({ error: "Invalid initData" });
      return;
    }

    const telegramId = BigInt(user.id.toString());

    // 1. Пытаемся найти по hash (норм вход)
    let dbUser = await prisma.user.findUnique({ where: { hash } });

    // 2. Если не нашёлся — ищем по telegramId
    if (!dbUser) {
      const byTelegramId = await prisma.user.findFirst({ where: { telegramId } });

      if (byTelegramId) {
        // Обновляем hash (на новое устройство)
        try {
          dbUser = await prisma.user.update({
            where: { id: byTelegramId.id },
            data: { hash },
          });
        } catch (error: any) {
          // Если hash уже существует при обновлении
          if (error.code === 'P2002' && error.meta?.target?.includes('hash')) {
            console.warn(`[AUTH] Hash collision during update for user ${telegramId}`);
            // Просто используем существующего пользователя без обновления hash
            dbUser = byTelegramId;
          } else {
            throw error;
          }
        }
      }
    }

    // 3. Если всё ещё нет — создаём нового юзера
    if (!dbUser) {
      try {
        dbUser = await prisma.user.create({
          data: {
            telegramId,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name || null,
            language: user.language_code,
            hash,
          },
        });
      } catch (error: any) {
        // Если hash уже существует - попробуем найти пользователя по этому hash
        if (error.code === 'P2002' && error.meta?.target?.includes('hash')) {
          console.warn(`[AUTH] Hash collision detected for user ${telegramId}, trying to find existing user`);
          dbUser = await prisma.user.findUnique({ where: { hash } });
          
          if (!dbUser) {
            // Если даже это не помогло - отправляем ошибку для очистки storage
            console.error("[AUTH] Critical error: hash exists but user not found");
            res.status(409).json({ 
              error: "Authentication conflict", 
              message: "Please clear your browser storage and try again",
              code: "CLEAR_STORAGE"
            });
            return;
          }
        } else {
          // Другие ошибки пробрасываем дальше
          throw error;
        }
      }
    }

    const token = jwt.sign({ userId: dbUser.id }, process.env.JWT_SECRET!, { expiresIn: "30d" });

    res.json({
      user: {
        ...dbUser,
        telegramId: dbUser.telegramId.toString(),
      },
      token,
    });
  } catch (e) {
    console.error("[AUTH ERROR]", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { authRouter };
