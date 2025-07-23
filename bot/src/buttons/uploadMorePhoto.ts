import { Telegraf, Context } from "telegraf";
import { fetchProfile } from "../utils/api.js";
import { Markup } from "telegraf";
import { MySession } from "../types/session.js";

interface MyContext extends Context {
    session: MySession;
}

export function uploadMorePhoto(bot: Telegraf) {
    bot.hears("📸 Загрузить ещё фото", async (ctx: Context) => {
        const tgId = ctx.from?.id;
        const profile = await fetchProfile(tgId);
        const currentImages = profile?.images?.length || 0;
        const remaining = 5 - currentImages;

        if (remaining <= 0) {
            await ctx.reply("У вас уже 5 фото! Сначала удалите лишние в приложении а затем можете вернуться.");
            return;
        }

        (ctx as MyContext).session = {
            mode: "upload",
            images: [],
            isProcessing: false
        };

        await ctx.reply(`📸 Отправьте до ${remaining} изображений. После — нажмите ✅ Завершить.`,
            Markup.removeKeyboard()
        );
    });
} 