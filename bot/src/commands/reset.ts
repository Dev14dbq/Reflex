import { Telegraf, Context } from "telegraf";
import { WEBAPP_URL } from "../config";
import { Markup } from "telegraf";

export function resetCommand(bot: Telegraf) {
  bot.command("reset", async (ctx: Context) => {
    const kb = Markup.inlineKeyboard([
      Markup.button.webApp("♻️ Сбросить данные", `${WEBAPP_URL}/reset`),
    ]);
    await ctx.reply(
      "Нажмите кнопку ниже, чтобы перезапустить приложение и очистить локальные данные.",
      kb
    );
  });
} 