import { Router, Request, Response } from "express";
import { prisma } from "./prisma";
import { authMiddleware } from "./middleware/auth";

const userRouter = Router();

const handlerMe = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
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
};

userRouter.get("/me", authMiddleware, handlerMe);
// alias at root
userRouter.get("/", authMiddleware, handlerMe);

export { userRouter };
