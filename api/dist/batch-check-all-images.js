"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./prisma");
const nsfw_1 = require("./nsfw");
const axios_1 = __importDefault(require("axios"));
async function batchCheckAllImages() {
    console.log("🚀 Начинаем массовую проверку всех изображений...\n");
    // Инициализируем NSFW модель
    await (0, nsfw_1.initializeNsfwModel)();
    try {
        // Получаем все профили с изображениями
        const profiles = await prisma_1.prisma.profile.findMany({
            where: {
                images: {
                    isEmpty: false
                }
            },
            select: {
                id: true,
                preferredName: true,
                images: true,
                imageData: true
            }
        });
        console.log(`📊 Найдено профилей с изображениями: ${profiles.length}\n`);
        let totalImages = 0;
        let checkedImages = 0;
        let nsfwFound = 0;
        let errors = 0;
        // Проходим по каждому профилю
        for (const profile of profiles) {
            console.log(`\n👤 Проверяем профиль: ${profile.preferredName} (${profile.id})`);
            console.log(`   Изображений в массиве: ${profile.images.length}`);
            console.log(`   Записей в таблице Image: ${profile.imageData.length}`);
            // Проверяем каждое изображение из старого массива
            for (let i = 0; i < profile.images.length; i++) {
                const imageUrl = profile.images[i];
                totalImages++;
                // Проверяем, есть ли уже запись в таблице Image для этого URL
                const existingRecord = profile.imageData.find(img => img.url === imageUrl);
                if (existingRecord) {
                    console.log(`   ✅ Изображение уже проверено: ${imageUrl}`);
                    if (existingRecord.isNsfw)
                        nsfwFound++;
                    continue;
                }
                try {
                    console.log(`   🔍 Проверяем: ${imageUrl}`);
                    // Загружаем изображение
                    const response = await axios_1.default.get(imageUrl, {
                        responseType: 'arraybuffer',
                        timeout: 30000
                    });
                    const imageBuffer = Buffer.from(response.data);
                    // Проверяем на NSFW
                    const nsfwResult = await (0, nsfw_1.checkImageNsfw)(imageBuffer);
                    // Создаем запись в таблице Image
                    const newImage = await prisma_1.prisma.image.create({
                        data: {
                            profileId: profile.id,
                            url: imageUrl,
                            order: i,
                            isNsfw: nsfwResult.isNsfw,
                            nsfwScore: nsfwResult.score,
                            nsfwCategories: nsfwResult.predictions,
                            format: imageUrl.split('.').pop()?.toLowerCase() || 'jpg'
                        }
                    });
                    checkedImages++;
                    if (nsfwResult.isNsfw) {
                        nsfwFound++;
                        console.log(`   ⚠️  NSFW обнаружено! Score: ${nsfwResult.score}`);
                    }
                    else {
                        console.log(`   ✅ Безопасное изображение`);
                    }
                    // Небольшая задержка чтобы не перегружать сервер
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (error) {
                    errors++;
                    console.error(`   ❌ Ошибка проверки изображения:`, error instanceof Error ? error.message : error);
                }
            }
        }
        console.log("\n\n📊 === ИТОГОВАЯ СТАТИСТИКА ===");
        console.log(`Всего изображений: ${totalImages}`);
        console.log(`Проверено новых: ${checkedImages}`);
        console.log(`Найдено NSFW: ${nsfwFound}`);
        console.log(`Ошибок: ${errors}`);
        console.log(`Процент NSFW: ${totalImages > 0 ? ((nsfwFound / totalImages) * 100).toFixed(2) : 0}%`);
        // Дополнительная статистика по категориям
        const nsfwImages = await prisma_1.prisma.image.findMany({
            where: { isNsfw: true },
            select: {
                nsfwScore: true,
                nsfwCategories: true
            }
        });
        if (nsfwImages.length > 0) {
            console.log("\n📈 === СТАТИСТИКА ПО NSFW ===");
            const avgScore = nsfwImages.reduce((sum, img) => sum + (img.nsfwScore || 0), 0) / nsfwImages.length;
            console.log(`Средний NSFW score: ${avgScore.toFixed(3)}`);
            // Подсчет по категориям
            const categoryCount = {};
            nsfwImages.forEach(img => {
                if (img.nsfwCategories && Array.isArray(img.nsfwCategories)) {
                    img.nsfwCategories.forEach((pred) => {
                        const category = pred.className?.toLowerCase();
                        if (category && ['porn', 'hentai', 'sexy'].includes(category)) {
                            categoryCount[category] = (categoryCount[category] || 0) + 1;
                        }
                    });
                }
            });
            console.log("Категории NSFW:");
            Object.entries(categoryCount).forEach(([category, count]) => {
                console.log(`  - ${category}: ${count} изображений`);
            });
        }
    }
    catch (error) {
        console.error("❌ Критическая ошибка:", error);
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
// Запускаем скрипт
batchCheckAllImages()
    .then(() => {
    console.log("\n✅ Проверка завершена!");
    process.exit(0);
})
    .catch((error) => {
    console.error("❌ Ошибка выполнения:", error);
    process.exit(1);
});
