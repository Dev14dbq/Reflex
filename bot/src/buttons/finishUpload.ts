import { Telegraf, Markup } from "telegraf";

export function finishUpload(bot: Telegraf) {
    bot.hears("✅ Завершить", async (ctx: any) => {
        const state = ctx.session;

        if (!state || !state.images || state.images.length === 0) {
            return await ctx.reply("Пользовательское меню:", Markup.keyboard([
                ["📸 Загрузить фото"],
                ["📞 Поддержка"]
            ]).resize());
        }

        if (state.isProcessing) {
            await ctx.reply("⏳ Подождите, обрабатывается фото...");
            return;
        }

        ctx.session = undefined;
        await ctx.reply("🎉 Фото сохранены. Можете вернуться в приложение!", Markup.keyboard([
            ["📸 Загрузить фото"],
            ["📞 Поддержка"]
        ]).resize());
    });
} 