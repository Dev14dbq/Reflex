"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWebSocketServer = startWebSocketServer;
// search.ts
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("./prisma");
const trust_1 = require("./trust");
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
// Функция для ранжирования профилей с помощью ML модели
async function rankProfiles(profiles, user) {
    return new Promise((resolve, reject) => {
        // Используем Python из venv
        const pythonPath = path_1.default.join(__dirname, "../ml-models/vnev/bin/python3");
        const scriptPath = path_1.default.join(__dirname, "../ml-models/rank_profiles.py");
        const py = (0, child_process_1.spawn)(pythonPath, [scriptPath]);
        const input = JSON.stringify({ profiles, user });
        let result = "";
        let errorOutput = "";
        py.stdout.on("data", (chunk) => (result += chunk));
        py.stderr.on("data", (err) => {
            errorOutput += err.toString();
            console.error("[ML ERROR]", err.toString());
        });
        py.on("close", (code) => {
            if (code !== 0) {
                console.error("[ML] Process exited with code", code);
                console.error("[ML] Error output:", errorOutput);
                // В случае ошибки возвращаем исходный порядок профилей
                resolve(profiles.map(p => ({ id: p.id, score: 0 })));
                return;
            }
            try {
                const data = JSON.parse(result);
                resolve(data); // [{ id, score }]
            }
            catch (e) {
                console.error("[ML] Failed to parse result:", e);
                console.error("[ML] Raw result:", result);
                // В случае ошибки парсинга возвращаем исходный порядок
                resolve(profiles.map(p => ({ id: p.id, score: 0 })));
            }
        });
        py.stdin.write(input);
        py.stdin.end();
    });
}
async function startWebSocketServer(ws, req) {
    let userId;
    try {
        const url = new URL(req.url ?? "", "http://localhost");
        const token = url.searchParams.get("token");
        if (!token) {
            console.warn("[WS] ⛔ No token provided");
            ws.close(1008, "No token provided");
            return;
        }
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        userId = payload.userId;
    }
    catch (err) {
        console.warn("[WS] ❌ Invalid token", err);
        ws.close(1008, "Invalid token");
        return;
    }
    const getRecommendations = async () => {
        // Получаем настройки пользователя
        const userWithSettings = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                settings: true,
            }
        });
        if (!userWithSettings?.profile) {
            return [];
        }
        const userProfile = userWithSettings.profile;
        const settings = userWithSettings.settings;
        const userAge = new Date().getFullYear() - parseInt(userProfile.birthYear);
        // Получаем ID уже лайкнутых профилей
        const likedProfileIds = await prisma_1.prisma.like.findMany({
            where: { fromUserId: userId },
            select: { toProfileId: true },
        });
        const alreadyLikedIds = likedProfileIds.map((l) => l.toProfileId);
        // Базовые условия фильтрации
        const whereConditions = {
            userId: { not: userId },
            id: { notIn: alreadyLikedIds },
        };
        // Фильтрация по возрасту
        if (settings?.similarAge) {
            // Похожий возраст
            const ageRange = userAge <= 22 ? 2 : 5;
            const minYear = new Date().getFullYear() - (userAge + ageRange);
            const maxYear = new Date().getFullYear() - (userAge - ageRange);
            whereConditions.birthYear = {
                gte: minYear.toString(),
                lte: maxYear.toString(),
            };
        }
        else if (settings?.ageRangeMin || settings?.ageRangeMax) {
            // Пользовательский диапазон
            const minYear = settings.ageRangeMax ? new Date().getFullYear() - settings.ageRangeMax : 1950;
            const maxYear = settings.ageRangeMin ? new Date().getFullYear() - settings.ageRangeMin : 2006;
            whereConditions.birthYear = {
                gte: minYear.toString(),
                lte: maxYear.toString(),
            };
        }
        // Фильтрация по городу
        if (settings?.sameCityOnly) {
            whereConditions.city = userProfile.city;
        }
        // Получаем профили с учетом фильтров
        let profiles = await prisma_1.prisma.profile.findMany({
            where: whereConditions,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        trustScore: true,
                        blocked: true
                    }
                },
                imageData: settings?.showNsfw ? true : {
                    where: { isNsfw: false }
                }
            },
        });
        // Фильтруем заблокированных пользователей
        profiles = profiles.filter(p => !p.user.blocked);
        // ML ранжирование профилей
        try {
            // Подготавливаем данные для ML модели
            const profilesForML = profiles.map(p => ({
                id: p.id,
                city: p.city,
                birthYear: p.birthYear,
                goals: p.goals,
                isVerified: p.isVerified || false,
                likesReceived: 0 // Пока не реализовано в базе
            }));
            const userForML = {
                city: userProfile.city,
                birthYear: userProfile.birthYear,
                goals: userProfile.goals,
                trustScore: userWithSettings.trustScore || 40
            };
            const ranked = await rankProfiles(profilesForML, userForML);
            const mlScores = new Map(ranked.map((r) => [r.id, r.score]));
            // Применяем пользовательские настройки как модификаторы к ML скорам
            profiles.sort((a, b) => {
                let scoreA = mlScores.get(a.id) ?? 0;
                let scoreB = mlScores.get(b.id) ?? 0;
                // Применяем пользовательские настройки как модификаторы
                if (settings?.localFirst) {
                    // Увеличиваем скор локальных анкет на 20%
                    if (a.city === userProfile.city)
                        scoreA *= 1.2;
                    if (b.city === userProfile.city)
                        scoreB *= 1.2;
                }
                // Дополнительный бонус за высокий trust score (до 10% от ML скора)
                scoreA += scoreA * ((a.user.trustScore || 40) / 1000);
                scoreB += scoreB * ((b.user.trustScore || 40) / 1000);
                return scoreB - scoreA;
            });
        }
        catch (err) {
            console.error("[ML] Ошибка ранжирования, используем fallback сортировку:", err);
            // Fallback сортировка если ML не сработал
            profiles.sort((a, b) => {
                let scoreA = 0;
                let scoreB = 0;
                // Приоритет по trust score
                scoreA += (a.user.trustScore || 40) / 10;
                scoreB += (b.user.trustScore || 40) / 10;
                // Приоритет локальным анкетам
                if (settings?.localFirst) {
                    if (a.city === userProfile.city)
                        scoreA += 5;
                    if (b.city === userProfile.city)
                        scoreB += 5;
                }
                // Приоритет по полноте профиля
                if (a.description.length > 50)
                    scoreA += 2;
                if (b.description.length > 50)
                    scoreB += 2;
                if (a.images.length >= 3)
                    scoreA += 2;
                if (b.images.length >= 3)
                    scoreB += 2;
                return scoreB - scoreA;
            });
        }
        // Возвращаем только первый профиль
        return profiles.slice(0, 1);
    };
    const sendNextProfile = async () => {
        try {
            const [profile] = await getRecommendations();
            if (!profile) {
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "no-more-profiles" }));
                }
                return;
            }
            // Фильтруем NSFW изображения если нужно
            let displayImages = profile.images;
            // Если у пользователя есть настройка showNsfw и есть данные о NSFW
            const userSettings = await prisma_1.prisma.settings.findUnique({
                where: { userId }
            });
            if (!userSettings?.showNsfw && profile.imageData?.length > 0) {
                // Получаем только безопасные изображения
                const safeImages = profile.imageData
                    .filter((img) => !img.isNsfw)
                    .sort((a, b) => a.order - b.order)
                    .map((img) => img.url);
                if (safeImages.length > 0) {
                    displayImages = safeImages;
                }
            }
            const enriched = {
                id: profile.id,
                preferredName: profile.preferredName,
                description: profile.description,
                city: profile.city,
                goals: profile.goals,
                birthYear: profile.birthYear,
                images: displayImages.length
                    ? displayImages
                    : [`https://api.dicebear.com/7.x/thumbs/svg?seed=${Math.floor(Math.random() * 1000000)}`],
                user: { username: profile.user.username },
                trustScore: profile.user.trustScore || 40,
            };
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "recommendation", profile: enriched }));
            }
        }
        catch (err) {
            console.error("[WS] ❌ Ошибка при отправке анкеты", err);
        }
    };
    ws.on("message", async (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.type === "like" || data.type === "dislike") {
                const existing = await prisma_1.prisma.like.findFirst({
                    where: { fromUserId: userId, toProfileId: data.profileId },
                });
                if (!existing) {
                    await prisma_1.prisma.like.create({
                        data: {
                            fromUserId: userId,
                            toProfileId: data.profileId,
                            isLike: data.type === "like",
                        },
                    });
                    // Проверяем на массовые лайки
                    if (data.type === "like") {
                        await (0, trust_1.checkMassLikes)(userId);
                    }
                }
                await sendNextProfile();
            }
            else {
                console.warn("[WS] ⚠️ Неизвестный тип сообщения:", data.type);
            }
        }
        catch (e) {
            console.warn("[WS] ❌ Failed to process message", e);
        }
    });
    ws.on("error", (error) => {
        console.error("[WS] ❌ WebSocket ошибка:", error);
    });
    ws.on("close", (code, reason) => {
    });
    await sendNextProfile();
}
