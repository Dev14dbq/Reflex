"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./prisma");
const nsfw_1 = require("./nsfw");
const axios_1 = __importDefault(require("axios"));
// Количество параллельных проверок
const PARALLEL_LIMIT = 5;
async function processImageBatch(images) {
    let checked = 0;
    let nsfw = 0;
    let errors = 0;
    const promises = images.map(async ({ url, profileId, order }) => {
        try {
            // Загружаем изображение
            const response = await axios_1.default.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            const imageBuffer = Buffer.from(response.data);
            // Проверяем на NSFW
            const nsfwResult = await (0, nsfw_1.checkImageNsfw)(imageBuffer);
            // Создаем запись в таблице Image
            await prisma_1.prisma.image.create({
                data: {
                    profileId,
                    url,
                    order,
                    isNsfw: nsfwResult.isNsfw,
                    nsfwScore: nsfwResult.score,
                    nsfwCategories: nsfwResult.predictions,
                    format: url.split('.').pop()?.toLowerCase() || 'jpg'
                }
            });
            checked++;
            if (nsfwResult.isNsfw) {
                nsfw++;
                console.log(`⚠️  NSFW: ${url} (score: ${nsfwResult.score})`);
            }
            else {
                console.log(`✅ Safe: ${url}`);
            }
        }
        catch (error) {
            errors++;
            console.error(`❌ Error: ${url} -`, error instanceof Error ? error.message : error);
        }
    });
    await Promise.all(promises);
    return { checked, nsfw, errors };
}
async function batchCheckParallel() {
    console.log("🚀 Запуск параллельной проверки NSFW...\n");
    console.log(`⚡ Параллельных потоков: ${PARALLEL_LIMIT}\n`);
    // Инициализируем NSFW модель
    await (0, nsfw_1.initializeNsfwModel)();
    try {
        // Получаем все изображения, которые еще не проверены
        const profiles = await prisma_1.prisma.profile.findMany({
            where: {
                images: {
                    isEmpty: false
                }
            },
            include: {
                imageData: {
                    select: { url: true }
                }
            }
        });
        // Собираем все изображения для проверки
        const imagesToCheck = [];
        for (const profile of profiles) {
            // Получаем URL изображений, которые уже есть в таблице Image
            const checkedUrls = new Set(profile.imageData.map(img => img.url));
            // Добавляем только те, которых еще нет
            profile.images.forEach((url, index) => {
                if (!checkedUrls.has(url)) {
                    imagesToCheck.push({
                        url,
                        profileId: profile.id,
                        order: index
                    });
                }
            });
        }
        console.log(`📊 Найдено изображений для проверки: ${imagesToCheck.length}\n`);
        if (imagesToCheck.length === 0) {
            console.log("✅ Все изображения уже проверены!");
            return;
        }
        let totalChecked = 0;
        let totalNsfw = 0;
        let totalErrors = 0;
        // Обрабатываем изображения батчами
        for (let i = 0; i < imagesToCheck.length; i += PARALLEL_LIMIT) {
            const batch = imagesToCheck.slice(i, i + PARALLEL_LIMIT);
            console.log(`\n📦 Обработка батча ${Math.floor(i / PARALLEL_LIMIT) + 1}/${Math.ceil(imagesToCheck.length / PARALLEL_LIMIT)}`);
            const results = await processImageBatch(batch);
            totalChecked += results.checked;
            totalNsfw += results.nsfw;
            totalErrors += results.errors;
            // Прогресс
            const progress = ((i + batch.length) / imagesToCheck.length * 100).toFixed(1);
            console.log(`📈 Прогресс: ${progress}%`);
        }
        // Итоговая статистика
        console.log("\n\n📊 === ИТОГОВАЯ СТАТИСТИКА ===");
        console.log(`Проверено изображений: ${totalChecked}`);
        console.log(`Найдено NSFW: ${totalNsfw}`);
        console.log(`Ошибок: ${totalErrors}`);
        console.log(`Процент NSFW: ${totalChecked > 0 ? ((totalNsfw / totalChecked) * 100).toFixed(2) : 0}%`);
        // Общая статистика по БД
        const stats = await prisma_1.prisma.image.aggregate({
            _count: { _all: true },
            where: { isNsfw: true }
        });
        console.log(`\nВсего NSFW в БД: ${stats._count._all}`);
    }
    catch (error) {
        console.error("❌ Критическая ошибка:", error);
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
// Запускаем скрипт
batchCheckParallel()
    .then(() => {
    console.log("\n✅ Проверка завершена!");
    process.exit(0);
})
    .catch((error) => {
    console.error("❌ Ошибка выполнения:", error);
    process.exit(1);
});
