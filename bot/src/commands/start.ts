import { Telegraf, Context, Markup } from "telegraf";

import { WEBAPP_URL, INTRO_PICTURE, SUPPORT_USERNAME } from "../config.js";
import { fetchProfile, getAdvertisement } from "../utils/api.js";

export function startCommand(bot: Telegraf) {
    bot.start(async (ctx: Context) => {
        const tgId = ctx.from?.id;

        const profile = await fetchProfile(tgId);
        const hasProfile = !!profile;

        const replyKb = Markup.keyboard([
            ["📸 Загрузить фото"],
        ]).resize();

        const inlineKb = Markup.inlineKeyboard([
            Markup.button.webApp("🚀 Запустить", WEBAPP_URL),
        ]);

        const caption = `<b>Reflex — анонимный LGB🌈Q чат-тиндер</b>\n\n${hasProfile
            ? "Нажмите «Запустить», чтобы открыть приложение.\n📸 Загрузить фото — управлять фотографиями (1-5)"
            : "Нажмите «Запустить», пройдите короткую регистрацию и начинайте знакомиться!"
            }\n📞 Поддержка — вопросы → @${SUPPORT_USERNAME}`;

        await ctx.replyWithPhoto(INTRO_PICTURE, { caption, parse_mode: "HTML", ...inlineKb });
        await ctx.reply("Меню", replyKb);

        setTimeout(async () => {
            const ad = await getAdvertisement(tgId);
            if (ad) {
                const adKb = Markup.inlineKeyboard([
                    Markup.button.callback(ad.buttonText || "Перейти", `ad_click:${ad.id}`),
                ]);

                if (ad.imageUrl) {
                    await ctx.replyWithPhoto(ad.imageUrl, {
                        caption: `🎯 <b>${ad.title || ""}</b>\n\n${ad.description || ""}`,
                        parse_mode: "HTML",
                        ...adKb,
                    });
                } else {
                    await ctx.reply(
                        `🎯 <b>${ad.title || ""}</b>\n\n${ad.description || ""}`, {
                        parse_mode: "HTML",
                        ...adKb
                    }
                    );
                }

                console.log('[ADS] Отладка для рекламы! Причина: Использование команды /start. Данные рекламы:', ad)
            }
        }, 500);
    });
} 