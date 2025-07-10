import { Telegraf, Context } from "telegraf";
import { SUPPORT_USERNAME } from "../config";

export function supportMenu(bot: Telegraf) {
  bot.hears("📞 Поддержка", async (ctx: Context) => {
    await ctx.reply(`📞 Поддержка — вопросы → @${SUPPORT_USERNAME}`);
  });
} 