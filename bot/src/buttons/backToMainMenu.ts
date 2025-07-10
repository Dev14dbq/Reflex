import { Telegraf, Context } from "telegraf";
import { fetchProfile } from "../utils/api";
import { Markup } from "telegraf";

export function backToMainMenu(bot: Telegraf) {
  bot.hears("🔙 Назад", async (ctx: Context) => {
    const tgId = ctx.from?.id;
    if (!tgId) return;
    const profile = await fetchProfile(tgId);
    const replyKb = Markup.keyboard([
      ["📸 Загрузить фото"],
      ["📞 Поддержка"],
    ]).resize();
    await ctx.reply("Меню", replyKb);
  });
} 