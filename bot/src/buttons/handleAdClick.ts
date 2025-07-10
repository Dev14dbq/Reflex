import { Telegraf, Context } from "telegraf";
import { getAdvertisement, trackAdClick } from "../utils/api";

export function handleAdClick(bot: Telegraf) {
  bot.action(/^ad_click:(.+)$/, async (ctx: Context) => {
    const { match } = ctx as Context & { match: RegExpMatchArray };
    const campaignId = match?.[1];
    const userId = ctx.from?.id;
    if (!campaignId || !userId) return;
    await trackAdClick(campaignId, userId);
    const ad = await getAdvertisement(userId);
    if (ad && ad.buttonUrl) {
      await ctx.answerCbQuery("Переходим по ссылке...");
      await ctx.reply(`🔗 Ссылка: ${ad.buttonUrl}`);
    } else {
      await ctx.answerCbQuery("Реклама больше не активна", { show_alert: true });
    }
  });
} 