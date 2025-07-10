import { Telegraf, Context } from "telegraf";
import { ADMIN_IDS, API_BASE } from "../config";
import axios from "axios";

export function approveAllCommand(bot: Telegraf) {
  bot.command("approveall", async (ctx: Context) => {
    if (!ctx.from || !ADMIN_IDS.includes(ctx.from.id)) {
      await ctx.reply("Недостаточно прав.");
      return;
    }
    try {
      const url = `${API_BASE}/advertising/admin/campaigns`;
      const { data } = await axios.get(url, { timeout: 10000 });
      const campaigns = data.campaigns || [];
      const pending = campaigns.filter((c: any) => c.status === "pending");
      if (!pending.length) {
        await ctx.reply("❌ Нет кампаний на модерации");
        return;
      }
      await ctx.reply(`🔄 Одобряю ${pending.length} кампаний...`);
      let approvedCount = 0;
      for (const campaign of pending) {
        try {
          const moderateUrl = `${API_BASE}/advertising/admin/campaigns/${campaign.id}/moderate`;
          const resp = await axios.post(moderateUrl, {
            action: "approve",
            comment: "Автоодобрение",
          });
          if (resp.status === 200) approvedCount++;
        } catch {}
      }
      await ctx.reply(`✅ Одобрено кампаний: ${approvedCount}`);
    } catch (e) {
      await ctx.reply(`❌ Ошибка одобрения: ${e}`);
    }
  });
} 