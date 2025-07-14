import { Telegraf, Context } from "telegraf";
import { getAdvertisementData, trackAdClick } from "../utils/api.js";

export function handleAdClick(bot: Telegraf) {
    bot.action(/^ad_click:(.+)$/, async (ctx: Context) => {
        const { match } = ctx as Context & { match: RegExpMatchArray };
        const campaignId = match?.[1];
        const userId = ctx.from?.id;


        if (!campaignId || !userId) return;

        await trackAdClick(campaignId, userId);
        const ad = await getAdvertisementData(campaignId);

        if (ad && ad.buttonUrl) {
            await ctx.answerCbQuery("Пожалуйста подождите, получаем ссылку!");
            await ctx.reply(`🔗 Ссылка: ${ad.buttonUrl}`);
        } else {
            await ctx.answerCbQuery("К сожалению, реклама недействительна", {
                show_alert: true
            });
        }
    });
} 