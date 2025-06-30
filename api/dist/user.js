"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("./prisma");
const auth_1 = require("./middleware/auth");
const userRouter = (0, express_1.Router)();
exports.userRouter = userRouter;
const handlerMe = async (req, res) => {
    const userId = req.userId;
    const user = await prisma_1.prisma.user.findUnique({
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
userRouter.get("/me", auth_1.authMiddleware, handlerMe);
// alias at root
userRouter.get("/", auth_1.authMiddleware, handlerMe);
