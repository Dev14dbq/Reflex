import { Telegraf, Context } from "telegraf";
import { ADMIN_IDS, API_BASE } from "../config";
import { getAdvertisement } from "../utils/api";
import axios from "axios";
import { Markup } from "telegraf";

export function broadcastAdsCommand(bot: Telegraf) {
  bot.command("broadcastads", async (ctx: Context) => {
    if (!ctx.from || !ADMIN_IDS.includes(ctx.from.id)) {
      await ctx.reply("Недостаточно прав.");
      return;
    }
    await ctx.reply("🚀 Начинаю рассылку рекламы...");
    try {
      const url = `${API_BASE}/stats/all-users`;
      const { data } = await axios.get(url, { timeout: 30000 });
      const users = data.users || [];
      let sentCount = 0;
      for (const user of users) {
        try {
          const tgId = Number(user.telegramId);
          const ad = await getAdvertisement(tgId);
          if (ad) {
            const adKb = Markup.inlineKeyboard([
              Markup.button.callback(ad.buttonText || "Перейти", `ad_click:${ad.id}`),
            ]);
            if (ad.imageUrl) {
              await ctx.telegram.sendPhoto(tgId, ad.imageUrl, {
                caption: `🎯 <b>${ad.title || ""}</b>\n\n${ad.description || ""}`,
                parse_mode: "HTML",
                ...adKb,
              });
            } else {
              await ctx.telegram.sendMessage(
                tgId,
                `🎯 <b>${ad.title || ""}</b>\n\n${ad.description || ""}`,
                { parse_mode: "HTML", ...adKb }
              );
            }
            sentCount++;
          }
          await new Promise((r) => setTimeout(r, 100));
        } catch {}
      }
      await ctx.reply(`✅ Рассылка завершена. Отправлено: ${sentCount} реклам`);
    } catch (e) {
      await ctx.reply(`❌ Ошибка рассылки: ${e}`);
    }
  });
} 