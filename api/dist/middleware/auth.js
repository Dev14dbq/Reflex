"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.checkBanMiddleware = checkBanMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const token = authHeader.split(" ")[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.userId = payload.userId;
        next();
    }
    catch (e) {
        res.status(401).json({ error: "Invalid token" });
    }
}
// Middleware для проверки блокировки пользователя
async function checkBanMiddleware(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({
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
    }
    catch (error) {
        console.error("Error checking ban status:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
