import { Router, Request, Response } from "express";
import { prisma } from "./prisma.ts";
import { authMiddleware } from "./middleware/auth.ts";

const userRouter = Router();

interface ResponceData {
  user: {
    /** --- Публичная информация --- */
    "id": string,
    "telegramId": string,
    "username": string,
    "firstName": string | null,
    "lastName": string | null,
    "language": string,
    "createdAt": "2025-07-05T08:40:17.974Z",

    /** --- Техническая информация --- */
    "hash": string,
    "trustScore": number,

    /** --- Информация о блокировке --- */
    "blocked": boolean,
    "blockReason": boolean,
    "blockedAt": boolean,
    "blockedBy": boolean,

    /** --- Информация о превилегиях --- */
    "isAdmin": boolean,
    "isModerator": boolean,
    "isAdvertiser": boolean,
    "roleGrantedBy": string | null,
    "roleGrantedAt": string | null
  };
}

/**
 * Получаем информацию о пользователе который отправил запрос. Важно: ТРЕБУЕТСЯ АУТИФИКАЦИЯ ЧЕРЕЗ ТОКЕН!
 * Endpoint: /me or /
 * Metod: Only get
 * 
 * @param req 
 * @param res 
 * @returns Check interface ResponceData
 */
const handlerMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      user: {
        ...user,
        telegramId: user.telegramId.toString(),
      },
    });
  } catch (error) {
    console.error("[API] User error", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

userRouter.get("/me", authMiddleware, handlerMe);
userRouter.get("/", authMiddleware, handlerMe);

export default userRouter;
