import { Telegraf, Context } from "telegraf";
import { ADMIN_IDS } from "../config";
import { getAdvertisement } from "../utils/api";
import { Markup } from "telegraf";

export function testAdsCommand(bot: Telegraf) {
  bot.command("testads", async (ctx: Context) => {
    if (!ctx.from || !ADMIN_IDS.includes(ctx.from.id)) {
      await ctx.reply("Недостаточно прав.");
      return;
    }
    const ad = await getAdvertisement(ctx.from.id);
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
          `🎯 <b>${ad.title || ""}</b>\n\n${ad.description || ""}`,
          { parse_mode: "HTML", ...adKb }
        );
      }
      await ctx.reply("✅ Тестовая реклама отправлена");
    } else {
      await ctx.reply("❌ Нет доступной рекламы");
    }
  });
} 