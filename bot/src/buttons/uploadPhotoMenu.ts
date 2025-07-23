import { Telegraf, Context } from "telegraf";
import { fetchProfile } from "../utils/api.js";
import { Markup } from "telegraf";

export function uploadPhotoMenu(bot: Telegraf) {
    bot.hears("📸 Загрузить фото", async (ctx: Context) => {
        const tgId = ctx.from?.id;
        const profile = await fetchProfile(tgId);

        if (!profile || !profile.images) {
            await ctx.reply("Сначала создайте анкету в приложении, затем вернитесь, чтобы загрузить фото.");
            return;
        }

        const images = profile.images;

        try {
            if (images.length > 1) {
                await ctx.replyWithMediaGroup(images.slice(0, 10).map((url: string) => ({
                    type: "photo",
                    media: url
                })));
            } else if (images.length === 1) {
                await ctx.replyWithPhoto(images[0]);
            }
        } catch (error) {
            console.error(error)
        }

        const remaining = Math.max(0, 5 - images.length);

        await ctx.reply(`У вас загружено ${images.length} из 5 фото. Вы можете загрузить ещё ${remaining}!`, Markup.keyboard([
            ["📸 Загрузить ещё фото"],
            ["🔙 Назад"],
        ]).resize());
    });
} 