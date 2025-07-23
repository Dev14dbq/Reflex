import { Telegraf, Markup } from "telegraf";
import axios from "axios";

import { getAdvertisement } from "./api.js";
import { API_BASE, BOT_TOKEN } from "../config.js";

export async function dailyAdBroadcast(bot: Telegraf) {
    while (true) {
        const DateNow = new Date();
        let target = new Date(DateNow);
        target.setHours(12, 0, 0, 0); // 15 часов по мск

        if (DateNow >= target) {
            target.setDate(target.getDate() + 1);
        }

        const waitMs = target.getTime() - DateNow.getTime();
        console.log("[ADS] Следующая рассылка в:", target);
        await new Promise((r) => setTimeout(r, waitMs));

        try {
            console.log('[ADS] Рассылка запущенна!');

            const url = `${API_BASE}/stats/all-users`;
            const { data } = await axios.get(url, {
                timeout: 30000,
                headers: {
                    Authorization: "Bearer " + BOT_TOKEN
                }
            });

            const users = data.users || [];
            let SuccessSendAds = 0;

            for (let i = 0; i < users.length; i++) {
                try {
                    const tgId = Number(users[i].telegramId);
                    const ad = await getAdvertisement(tgId);

                    if (ad) {
                        const adKb = Markup.inlineKeyboard([
                            Markup.button.callback(ad.buttonText || "Перейти", `ad_click:${ad.id}`),
                        ]);

                        if (ad.imageUrl) {
                            await bot.telegram.sendPhoto(tgId, ad.imageUrl, {
                                caption: `<b>${ad.title || ""}</b>\n\n${ad.description || ""}`,
                                parse_mode: "HTML",
                                ...adKb,
                            });
                        } else {
                            await bot.telegram.sendMessage(tgId,
                                `<b>${ad.title || ""}</b>\n\n${ad.description || ""}`,
                                {
                                    parse_mode: "HTML",
                                    ...adKb
                                }
                            );
                        }

                        SuccessSendAds++;
                    }

                    await new Promise((r) => setTimeout(r, 300));
                } catch (error) {
                    console.error('[ADS] Ошибка при отправке ежедневной рекламы:', error)
                }
            }

            console.log(`[ADS] Ежедневная рассылка завершена!`);
            console.log(`[ADS] Успешное количество отправленой рекламы: ${SuccessSendAds}`);
        } catch (e) {
            console.log("Ошибка ежедневной рассылки:", e);
        }

        await new Promise((r) => setTimeout(r, 86400000));
    }
} 