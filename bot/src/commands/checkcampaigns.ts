import { Telegraf, Context } from "telegraf";
import { ADMIN_IDS, API_BASE } from "../config";
import axios from "axios";

export function checkCampaignsCommand(bot: Telegraf) {
  bot.command("checkcampaigns", async (ctx: Context) => {
    if (!ctx.from || !ADMIN_IDS.includes(ctx.from.id)) {
      await ctx.reply("Недостаточно прав.");
      return;
    }
    try {
      const url = `${API_BASE}/advertising/admin/campaigns`;
      const { data } = await axios.get(url, { timeout: 10000 });
      const campaigns = data.campaigns || [];
      if (!campaigns.length) {
        await ctx.reply("❌ Нет кампаний в системе");
        return;
      }
      const statusCounts: Record<string, number> = {};
      for (const campaign of campaigns) {
        const status = campaign.status || "unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
      const statusText = Object.entries(statusCounts)
        .map(([status, count]) => `• ${status}: ${count}`)
        .join("\n");
      await ctx.reply(`📊 Статистика кампаний:\n${statusText}\n\nВсего: ${campaigns.length}`);
    } catch (e) {
      await ctx.reply(`❌ Ошибка получения кампаний: ${e}`);
    }
  });
} 