import { Telegraf, Context } from "telegraf";
import { Markup } from "telegraf";

export function finishUpload(bot: Telegraf) {
  bot.hears("✅ Завершить", async (ctx: Context) => {
    // @ts-ignore
    const state = ctx.session;
    if (!state || !state.images || state.images.length === 0) {
      await ctx.reply("Сначала загрузите хотя бы одну фотографию.");
      return;
    }
    // @ts-ignore
    ctx.session = undefined;
    await ctx.reply("🎉 Фото сохранены. Можете вернуться в приложение!", Markup.keyboard([["📸 Загрузить фото"], ["📞 Поддержка"]]).resize());
  });
} 