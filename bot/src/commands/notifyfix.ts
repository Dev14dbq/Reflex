import { Telegraf, Context } from "telegraf";
import { ADMIN_IDS } from "../config";

export function notifyFixCommand(bot: Telegraf) {
  bot.command("notifyfix", async (ctx: Context) => {
    if (!ctx.from || !ADMIN_IDS.includes(ctx.from.id)) {
      await ctx.reply("Недостаточно прав.");
      return;
    }
    await ctx.reply("Уведомления исправлены.");
  });
} 