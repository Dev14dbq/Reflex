import { Telegraf, Context } from "telegraf";
import { uploadPhoto } from "../utils/api";
import { Markup } from "telegraf";
import { Message } from "telegraf/typings/core/types/typegram";

interface MySession {
  mode?: string;
  images?: string[];
}
interface MyContext extends Context {
  session: MySession;
}

export function handlePhotoUpload(bot: Telegraf) {
  bot.on("photo", async (ctx: Context) => {
    const tgId = ctx.from?.id;
    if (!tgId) return;
    const state = (ctx as MyContext).session;
    if (!state || state.mode !== "upload") {
      await ctx.reply("Сначала нажмите «📸 Загрузить фото».");
      return;
    }
    if ((state.images?.length || 0) >= 5) {
      await ctx.reply("🚫 Достигнут лимит 5 фотографий.");
      return;
    }
    const msg = ctx.message as Message.PhotoMessage;
    const photo = msg.photo?.slice(-1)[0];
    if (!photo) return;
    const fileId = photo.file_id;
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${fileId}`;
    const ok = await uploadPhoto(tgId, fileUrl);
    if (ok) {
      if (!state.images) state.images = [];
      state.images.push(fileUrl);
      await ctx.reply(`✅ Загружено ${state.images.length}/5 фото`);
    } else {
      await ctx.reply("❌ Не удалось загрузить фото, попробуйте ещё раз.");
    }
    if (state.images.length >= 5) {
      await ctx.reply("Достигнут лимит. Завершаем загрузку.");
      (ctx as MyContext).session = {};
      await ctx.reply("🎉 Фото сохранены. Можете вернуться в приложение!", Markup.keyboard([["📸 Загрузить фото"], ["📞 Поддержка"]]).resize());
    } else {
      await ctx.reply("Когда будете готовы — нажмите «Завершить».", Markup.keyboard([["✅ Завершить"]]).resize());
    }
  });
} 