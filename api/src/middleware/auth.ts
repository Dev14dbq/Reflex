import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    (req as any).userId = payload.userId;
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Middleware для проверки блокировки пользователя
export async function checkBanMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as any).userId;
    
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { blocked: true, blockReason: true }
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.blocked) {
      res.status(403).json({ 
        error: "User is banned", 
        blockReason: user.blockReason,
        code: "USER_BANNED"
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Error checking ban status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
