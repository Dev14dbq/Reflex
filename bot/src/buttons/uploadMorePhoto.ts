import { Telegraf, Context } from "telegraf";
import { fetchProfile } from "../utils/api";
import { Markup } from "telegraf";

interface MySession {
  mode?: string;
  images?: string[];
}
interface MyContext extends Context {
  session: MySession;
}

export function uploadMorePhoto(bot: Telegraf) {
  bot.hears("📸 Загрузить ещё фото", async (ctx: Context) => {
    const tgId = ctx.from?.id;
    if (!tgId) return;
    const profile = await fetchProfile(tgId);
    const currentImages = profile?.images?.length || 0;
    const remaining = 5 - currentImages;
    if (remaining <= 0) {
      await ctx.reply("У вас уже 5 фото — сначала удалите лишние в приложении.");
      return;
    }
    (ctx as MyContext).session = { mode: "upload", images: [] };
    await ctx.reply(
      `📸 Отправьте до ${remaining} изображений. После — нажмите ✅ Завершить.`,
      Markup.removeKeyboard()
    );
  });
} 