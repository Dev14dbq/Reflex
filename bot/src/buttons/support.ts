import { Telegraf, Context } from "telegraf";
import { SUPPORT_USERNAME } from "../config.js";

export function supportMenu(bot: Telegraf) {
    bot.hears("📞 Поддержка", async (ctx: Context) => {
        await ctx.reply(`📞 Поддержка → @${SUPPORT_USERNAME}`);
    });
} 