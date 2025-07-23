import { Telegraf, Context, Markup } from "telegraf";

import { WEBAPP_DEV_URL, INTRO_PICTURE, SUPPORT_USERNAME } from "../config.js";
import { fetchProfile } from "../utils/api.js";

export function developerCommand(bot: Telegraf) {
    bot.command("developer", async (ctx: Context) => {
        const tgId = ctx.from?.id;

        const profile = await fetchProfile(tgId);
        const hasProfile = !!profile;

        const replyKb = Markup.keyboard([
            ["📸 Загрузить фото"],
        ]).resize();

        const inlineKb = Markup.inlineKeyboard([
            Markup.button.webApp("🚀 Запустить", WEBAPP_DEV_URL),
        ]);

        const caption = `<b>Reflex — анонимный LGB🌈Q чат-тиндер</b>\n\n${hasProfile
            ? "Нажмите «Запустить», чтобы открыть приложение.\n📸 Загрузить фото — управлять фотографиями (1-5)"
            : "Нажмите «Запустить», пройдите короткую регистрацию и начинайте знакомиться!"
            }\n📞 Поддержка — вопросы → @${SUPPORT_USERNAME}`;

        await ctx.replyWithPhoto(INTRO_PICTURE, {
            caption, parse_mode: "HTML", ...inlineKb
        });

        await ctx.reply("Меню", replyKb);
    });
} 