import { Telegraf } from "telegraf";
import { API_BASE } from "../config";
import { getAdvertisement } from "./api";
import axios from "axios";
import { Markup } from "telegraf";

export async function dailyAdBroadcast(bot: Telegraf) {
  async function run() {
    while (true) {
      const now = new Date();
      let target = new Date(now);
      target.setHours(15, 0, 0, 0);
      if (now >= target) {
        target.setDate(target.getDate() + 1);
      }
      const waitMs = target.getTime() - now.getTime();
      console.log("Следующая рассылка рекламы:", target);
      await new Promise((r) => setTimeout(r, waitMs));
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
                await bot.telegram.sendPhoto(tgId, ad.imageUrl, {
                  caption: `🎯 <b>${ad.title || ""}</b>\n\n${ad.description || ""}`,
                  parse_mode: "HTML",
                  ...adKb,
                });
              } else {
                await bot.telegram.sendMessage(
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
        console.log(`Ежедневная рассылка завершена. Отправлено: ${sentCount} реклам`);
      } catch (e) {
        console.log("Ошибка ежедневной рассылки:", e);
      }
      await new Promise((r) => setTimeout(r, 86400000));
    }
  }
  run();
} 