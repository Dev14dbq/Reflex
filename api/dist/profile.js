"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("./prisma");
const auth_1 = require("./middleware/auth");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const nsfw_1 = require("./nsfw");
const trust_1 = require("./trust");
const profileRouter = (0, express_1.Router)();
exports.profileRouter = profileRouter;
// ✅ Абсолютный путь до корня CDN-каталога
const CDN_ROOT_PATH = "/var/www/spectrmod/cdn/image";
profileRouter.get("/profile/me", auth_1.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const profile = await prisma_1.prisma.profile.findUnique({
        where: { userId },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    isAdmin: true,
                    isModerator: true,
                    isAdvertiser: true
                }
            }
        }
    });
    if (!profile) {
        res.status(404).json({ error: "Profile not found" });
        return;
    }
    res.json({ profile });
});
profileRouter.post("/profile/create", auth_1.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const { preferredName, gender, birthYear, city, goals, description, images } = req.body;
    const existing = await prisma_1.prisma.profile.findUnique({ where: { userId } });
    if (existing) {
        res.status(400).json({ error: "Profile already exists" });
        return;
    }
    if (!preferredName || !gender || !birthYear || !city ||
        !goals || !Array.isArray(goals) || goals.length === 0 ||
        !description || description.length < 10) {
        res.status(400).json({ error: "Invalid profile data" });
        return;
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    const fallbackImage = user?.username
        ? `https://api.dicebear.com/7.x/thumbs/svg?seed=${Math.floor(Math.random() * 1000000)}`
        : undefined;
    const profile = await prisma_1.prisma.profile.create({
        data: {
            userId,
            preferredName,
            gender,
            birthYear,
            city,
            goals,
            description,
            images: images?.length > 0 ? images : (fallbackImage ? [fallbackImage] : []),
        },
    });
    // Проверяем полноту профиля и обновляем trust score
    await (0, trust_1.checkProfileCompleteness)(userId);
    res.json({ profile });
});
profileRouter.get("/profile/:profileId", async (req, res) => {
    const { profileId } = req.params;
    if (!profileId) {
        res.status(400).json({ error: "profileId is required" });
        return;
    }
    try {
        const profile = await prisma_1.prisma.profile.findUnique({
            where: { id: profileId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });
        if (!profile) {
            res.status(404).json({ error: "Profile not found" });
            return;
        }
        res.json({ profile });
    }
    catch (err) {
        console.error("[API] Ошибка получения профиля:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
profileRouter.get("/profile/by-telegram/:telegramId", async (req, res) => {
    const { telegramId } = req.params;
    if (!telegramId) {
        res.status(400).json({ error: "telegramId is required" });
        return;
    }
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { telegramId: BigInt(telegramId) },
            include: { profile: true },
        });
        res.json({
            exists: !!user?.profile,
            profile: user?.profile
                ? { id: user.profile.id, images: user.profile.images }
                : null,
        });
    }
    catch (err) {
        console.error("[API] by-telegram error", err);
        res.status(500).json({ error: "internal" });
    }
});
profileRouter.post("/profile/add-media", async (req, res) => {
    const { telegramId, imageUrl, skipNsfwCheck = false } = req.body;
    if (!telegramId || !imageUrl) {
        res.status(400).json({ error: "telegramId and imageUrl are required" });
        return;
    }
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { telegramId: BigInt(telegramId) },
            include: {
                profile: {
                    include: {
                        imageData: true
                    }
                }
            },
        });
        if (!user?.profile) {
            res.status(404).json({ error: "Profile not found" });
            return;
        }
        // Проверяем количество изображений (берем из старого массива, так как он синхронизирован)
        const totalImages = user.profile.images.length;
        if (totalImages >= 5) {
            res.status(400).json({ error: "Maximum 5 images allowed" });
            return;
        }
        // Загружаем изображение для проверки и сохранения
        const response = await axios_1.default.get(imageUrl, {
            responseType: "arraybuffer",
            timeout: 30000
        });
        const imageBuffer = Buffer.from(response.data);
        // NSFW проверка (если не отключена)
        let isNsfw = false;
        let nsfwScore = null;
        let nsfwCategories = undefined;
        if (!skipNsfwCheck) {
            try {
                const nsfwResult = await (0, nsfw_1.checkImageNsfw)(imageBuffer);
                isNsfw = nsfwResult.isNsfw;
                nsfwScore = nsfwResult.score;
                nsfwCategories = nsfwResult.predictions;
                console.log(`[NSFW] Image check result:`, {
                    isNsfw,
                    score: nsfwScore,
                    url: imageUrl
                });
            }
            catch (nsfwError) {
                console.error("[NSFW] Failed to check image:", nsfwError);
                // Продолжаем без NSFW проверки
            }
        }
        const parsed = path_1.default.parse(new URL(imageUrl).pathname);
        const ext = parsed.ext || ".jpg";
        const filename = `${(0, uuid_1.v4)()}${ext}`;
        // 📂 Абсолютный путь к папке для пользователя
        const dir = path_1.default.join(CDN_ROOT_PATH, telegramId.toString());
        await promises_1.default.mkdir(dir, { recursive: true });
        // 📄 Полный путь к файлу
        const filepath = path_1.default.join(dir, filename);
        await promises_1.default.writeFile(filepath, imageBuffer);
        const publicUrl = `https://spectrmod.ru/api/cdn/image/${telegramId}/${filename}`;
        // Создаем запись в модели Image
        const newOrder = user.profile.images.length;
        const newImage = await prisma_1.prisma.image.create({
            data: {
                profileId: user.profile.id,
                url: publicUrl,
                order: newOrder,
                isNsfw,
                nsfwScore,
                nsfwCategories,
                format: ext.replace('.', '').toLowerCase()
            }
        });
        // Также добавляем в старый массив для обратной совместимости
        const updated = await prisma_1.prisma.profile.update({
            where: { id: user.profile.id },
            data: {
                images: { push: publicUrl },
            },
            include: {
                imageData: {
                    orderBy: { order: 'asc' }
                }
            }
        });
        // Обновляем trust score
        if (isNsfw) {
            await (0, trust_1.changeTrustScore)(user.id, trust_1.TrustChangeReason.NSFW_CONTENT, {
                imageUrl: publicUrl,
                nsfwScore
            });
        }
        else {
            // Добавление фото повышает trust score
            await (0, trust_1.changeTrustScore)(user.id, trust_1.TrustChangeReason.PHOTO_ADDED);
        }
        res.json({
            profile: updated,
            nsfwDetection: {
                checked: !skipNsfwCheck,
                isNsfw,
                score: nsfwScore
            },
            newImageRecord: {
                id: newImage.id,
                url: newImage.url,
                isNsfw: newImage.isNsfw,
                nsfwScore: newImage.nsfwScore
            }
        });
    }
    catch (err) {
        console.error("[API] add-media error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
profileRouter.post("/profile/update", auth_1.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const { preferredName, gender, birthYear, city, goals, description, images, // полный упорядоченный массив url или undefined, чтобы не изменять
     } = req.body;
    try {
        const existing = await prisma_1.prisma.profile.findUnique({ where: { userId } });
        if (!existing) {
            res.status(404).json({ error: "Profile not found" });
            return;
        }
        const dataToUpdate = {};
        if (preferredName !== undefined)
            dataToUpdate.preferredName = preferredName;
        if (gender !== undefined)
            dataToUpdate.gender = gender;
        if (birthYear !== undefined)
            dataToUpdate.birthYear = birthYear;
        if (city !== undefined)
            dataToUpdate.city = city;
        if (description !== undefined)
            dataToUpdate.description = description;
        if (goals !== undefined) {
            if (!Array.isArray(goals) || goals.length === 0) {
                res.status(400).json({ error: "Goals must be a non-empty array" });
                return;
            }
            dataToUpdate.goals = goals;
        }
        if (images !== undefined) {
            if (!Array.isArray(images)) {
                res.status(400).json({ error: "Images must be an array" });
                return;
            }
            let finalImages = images.filter((url) => typeof url === "string" && url.trim() !== "");
            // Если после удаления не осталось изображений – применяем fallback
            if (finalImages.length === 0) {
                const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
                // 1. Пытаемся взять аву из Telegram (photo_url хранится в tgUser? нет – генерируем dicebear)
                //    Реальный URL Telegram-авы получить без Bot API сложно, поэтому fallback → dicebear.
                const fallback = user?.username
                    ? `https://api.dicebear.com/7.x/thumbs/svg?seed=${Math.floor(Math.random() * 1000000)}`
                    : undefined;
                if (fallback)
                    finalImages = [fallback];
            }
            dataToUpdate.images = finalImages;
        }
        const updated = await prisma_1.prisma.profile.update({ where: { id: existing.id }, data: dataToUpdate });
        res.json({ profile: updated });
    }
    catch (err) {
        console.error("[API] update profile error", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Проверка, нужна ли миграция города для пользователя
profileRouter.get("/profile/check-city-migration", auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const profile = await prisma_1.prisma.profile.findUnique({
            where: { userId },
            select: { city: true }
        });
        if (!profile) {
            res.status(404).json({ error: "Profile not found" });
            return;
        }
        // Проверяем, валиден ли текущий город
        // Считаем город невалидным если:
        // 1. Слишком короткий (менее 2 символов)
        // 2. Содержит подозрительные слова
        // 3. Не содержит запятую (нет региона)
        const city = profile.city || '';
        const suspiciousWords = ['мой', 'наш', 'тест', 'test', 'дом'];
        // Список популярных городов, которые не требуют региона
        const popularCities = [
            'минск', 'киев', 'алматы', 'ташкент', 'баку', 'ереван', 'тбилиси',
            'москва', 'спб', 'варшава', 'прага', 'рига', 'таллинн', 'вильнюс',
            'одесса', 'харьков', 'днепр', 'львов', 'донецк', 'запорожье',
            'астана', 'шымкент', 'актобе', 'караганда', 'павлодар', 'усть-каменогорск'
        ];
        const cityLower = city.toLowerCase();
        const isPopularCity = popularCities.some(popular => cityLower.includes(popular));
        const needsMigration = city.length < 2 ||
            city.length > 100 ||
            suspiciousWords.some(word => cityLower.includes(word)) ||
            (!city.includes(',') && city.length < 4 && !isPopularCity) || // Очень короткие названия без региона (но популярные города разрешены)
            /^\d+$/.test(city) || // Только цифры
            (cityLower === city && city.length < 4); // Только строчные и очень короткие
        res.json({
            needsMigration,
            currentCity: city
        });
    }
    catch (error) {
        console.error("[PROFILE] City migration check error:", error);
        res.status(500).json({
            error: "Failed to check city migration",
            message: error.message
        });
    }
});
// Миграция города пользователя
profileRouter.post("/profile/migrate-city", auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { newCity } = req.body;
        if (!newCity || typeof newCity !== 'string') {
            res.status(400).json({ error: "New city is required" });
            return;
        }
        const trimmedCity = newCity.trim();
        if (trimmedCity.length < 2 || trimmedCity.length > 100) {
            res.status(400).json({ error: "City name must be between 2 and 100 characters" });
            return;
        }
        // Обновляем город в профиле
        const updatedProfile = await prisma_1.prisma.profile.update({
            where: { userId },
            data: {
                city: trimmedCity
            },
            select: {
                id: true,
                city: true,
                preferredName: true
            }
        });
        console.log(`[PROFILE] City migrated for user ${userId}: "${trimmedCity}"`);
        res.json({
            success: true,
            profile: updatedProfile,
            message: "City updated successfully"
        });
    }
    catch (error) {
        console.error("[PROFILE] City migration error:", error);
        res.status(500).json({
            error: "Failed to migrate city",
            message: error.message
        });
    }
});
// Получить статистику миграции (для админов)
profileRouter.get("/profile/migration-stats", auth_1.authMiddleware, async (req, res) => {
    try {
        // Простая проверка - если это не админский запрос, возвращаем ошибку
        // В реальном проекте здесь должна быть проверка роли админа
        const allProfiles = await prisma_1.prisma.profile.findMany({
            select: { city: true }
        });
        const suspiciousWords = ['мой', 'наш', 'тест', 'test', 'дом'];
        // Список популярных городов, которые не требуют региона
        const popularCities = [
            'минск', 'киев', 'алматы', 'ташкент', 'баку', 'ереван', 'тбилиси',
            'москва', 'спб', 'варшава', 'прага', 'рига', 'таллинн', 'вильнюс',
            'одесса', 'харьков', 'днепр', 'львов', 'донецк', 'запорожье',
            'астана', 'шымкент', 'актобе', 'караганда', 'павлодар', 'усть-каменогорск'
        ];
        let needMigration = 0;
        let validCities = 0;
        const invalidCities = [];
        allProfiles.forEach(profile => {
            const city = profile.city || '';
            const cityLower = city.toLowerCase();
            const isPopularCity = popularCities.some(popular => cityLower.includes(popular));
            const isInvalid = city.length < 2 ||
                city.length > 100 ||
                suspiciousWords.some(word => cityLower.includes(word)) ||
                (!city.includes(',') && city.length < 4 && !isPopularCity) ||
                /^\d+$/.test(city) ||
                (cityLower === city && city.length < 4);
            if (isInvalid) {
                needMigration++;
                if (invalidCities.length < 20) { // Показываем только первые 20 примеров
                    invalidCities.push(city);
                }
            }
            else {
                validCities++;
            }
        });
        res.json({
            total: allProfiles.length,
            needMigration,
            validCities,
            migrationPercentage: Math.round((needMigration / allProfiles.length) * 100),
            exampleInvalidCities: invalidCities
        });
    }
    catch (error) {
        console.error("[PROFILE] Migration stats error:", error);
        res.status(500).json({
            error: "Failed to get migration stats",
            message: error.message
        });
    }
});
// Создать жалобу на пользователя
profileRouter.post("/complaints", auth_1.authMiddleware, async (req, res) => {
    try {
        const reporterId = req.userId;
        const { userId, reason, details, type = 'other' } = req.body;
        if (!userId || !reason) {
            res.status(400).json({ error: "userId and reason are required" });
            return;
        }
        // Проверяем, что пользователь не жалуется сам на себя
        if (reporterId === userId) {
            res.status(400).json({ error: "Cannot report yourself" });
            return;
        }
        // Проверяем, что пользователь существует
        const targetUser = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, firstName: true }
        });
        if (!targetUser) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        // Проверяем, не подавал ли пользователь уже жалобу на этого пользователя недавно
        const recentComplaint = await prisma_1.prisma.complaint.findFirst({
            where: {
                reporterId,
                userId,
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // За последние 24 часа
                }
            }
        });
        if (recentComplaint) {
            res.status(429).json({ error: "You can only report the same user once per day" });
            return;
        }
        // Создаем жалобу
        const complaint = await prisma_1.prisma.complaint.create({
            data: {
                reporterId,
                userId,
                reason,
                description: details || "",
                type,
                status: 'pending',
                priority: 'medium'
            }
        });
        console.log(`[COMPLAINTS] New complaint created: ${complaint.id} by ${reporterId} against ${userId}`);
        res.json({
            success: true,
            complaintId: complaint.id,
            message: "Complaint submitted successfully"
        });
    }
    catch (error) {
        console.error("[COMPLAINTS] Error creating complaint:", error);
        res.status(500).json({
            error: "Failed to submit complaint",
            message: error.message
        });
    }
});
// --- Account delete route ---
profileRouter.post('/account/delete', auth_1.authMiddleware, async (req, res) => {
    const userId = req.userId;
    try {
        console.log(`[PROFILE] Starting account deletion for user ${userId}`);
        // Получаем профиль пользователя
        const profile = await prisma_1.prisma.profile.findUnique({
            where: { userId },
            include: { imageData: true }
        });
        // Получаем чаты пользователя
        const chats = await prisma_1.prisma.chat.findMany({
            where: { OR: [{ userAId: userId }, { userBId: userId }] },
            select: { id: true }
        });
        const chatIds = chats.map(c => c.id);
        // Выполняем удаление в правильном порядке
        await prisma_1.prisma.$transaction(async (tx) => {
            console.log(`[PROFILE] Deleting related data for user ${userId}`);
            // 1. Удаляем сообщения
            if (chatIds.length > 0) {
                await tx.message.deleteMany({
                    where: { chatId: { in: chatIds } }
                });
                console.log(`[PROFILE] Deleted messages from ${chatIds.length} chats`);
            }
            // 2. Удаляем чаты
            if (chatIds.length > 0) {
                await tx.chat.deleteMany({
                    where: { id: { in: chatIds } }
                });
                console.log(`[PROFILE] Deleted ${chatIds.length} chats`);
            }
            // 3. Удаляем лайки
            if (profile) {
                await tx.like.deleteMany({
                    where: {
                        OR: [
                            { fromUserId: userId },
                            { toProfileId: profile.id }
                        ]
                    }
                });
                console.log(`[PROFILE] Deleted likes for user ${userId}`);
            }
            // 4. Удаляем матчи
            await tx.match.deleteMany({
                where: {
                    OR: [{ user1Id: userId }, { user2Id: userId }]
                }
            });
            console.log(`[PROFILE] Deleted matches for user ${userId}`);
            // 5. Удаляем изображения профиля
            if (profile?.imageData) {
                await tx.image.deleteMany({
                    where: { profileId: profile.id }
                });
                console.log(`[PROFILE] Deleted ${profile.imageData.length} images`);
            }
            // 6. Удаляем trust logs
            await tx.trustLog.deleteMany({ where: { userId } });
            // 7. Удаляем жалобы
            await tx.complaint.deleteMany({
                where: {
                    OR: [
                        { userId },
                        { reporterId: userId }
                    ]
                }
            });
            // 8. Удаляем действия модераторов
            await tx.moderatorAction.deleteMany({
                where: {
                    OR: [
                        { userId },
                        { moderatorId: userId }
                    ]
                }
            });
            // 9. Удаляем клики по рекламе
            await tx.adUserClick.deleteMany({ where: { userId } });
            // 10. Удаляем настройки
            await tx.settings.deleteMany({ where: { userId } });
            console.log(`[PROFILE] Deleted settings for user ${userId}`);
            // 11. Удаляем профиль
            if (profile) {
                await tx.profile.delete({ where: { id: profile.id } });
                console.log(`[PROFILE] Deleted profile for user ${userId}`);
            }
            // 12. Удаляем пользователя
            await tx.user.delete({ where: { id: userId } });
            console.log(`[PROFILE] Deleted user ${userId}`);
        });
        console.log(`[PROFILE] Account deletion completed for user ${userId}`);
        res.json({ success: true, message: "Account deleted successfully" });
    }
    catch (err) {
        console.error(`[PROFILE] Account deletion error for user ${userId}:`, err);
        res.status(500).json({
            error: 'Failed to delete account',
            message: err instanceof Error ? err.message : 'Unknown error'
        });
    }
});
