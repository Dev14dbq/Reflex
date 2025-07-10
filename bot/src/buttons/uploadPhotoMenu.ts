import { Telegraf, Context } from "telegraf";
import { fetchProfile } from "../utils/api";
import { Markup } from "telegraf";

export function uploadPhotoMenu(bot: Telegraf) {
  bot.hears("📸 Загрузить фото", async (ctx: Context) => {
    const tgId = ctx.from?.id;
    if (!tgId) return;
    const profile = await fetchProfile(tgId);
    if (!profile || !profile.images) {
      await ctx.reply("Сначала создайте анкету в приложении, затем вернитесь, чтобы загрузить фото.");
      return;
    }
    const images = profile.images;
    try {
      if (images.length > 1) {
        await ctx.replyWithMediaGroup(images.slice(0, 10).map((url: string) => ({ type: "photo", media: url })));
      } else if (images.length === 1) {
        await ctx.replyWithPhoto(images[0]);
      }
    } catch {}
    const remaining = Math.max(0, 5 - images.length);
    const kb = Markup.keyboard([
      ["📸 Загрузить ещё фото"],
      ["🔙 Назад"],
    ]).resize();
    await ctx.reply(`У вас загружено ${images.length}/5 фото. Вы можете загрузить ещё ${remaining}.`, kb);
  });
} 