import { Telegraf, Context, Markup } from "telegraf";

export function backToMainMenu(bot: Telegraf) {
    bot.hears("🔙 Назад", async (ctx: Context) => {
        const replyKb = Markup.keyboard([
            ["📸 Загрузить фото"],
            ["📞 Поддержка"],
        ]).resize();

        await ctx.reply("Пользовательское меню:", replyKb);
    });
} 