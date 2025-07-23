import { Telegraf, Context } from "telegraf";
import { uploadPhoto, fetchProfile } from "../utils/api.js";
import { Markup } from "telegraf";
import { Message } from "telegraf/typings/core/types/typegram";
import { MySession } from "../types/session.js";

interface MyContext extends Context {
    session: MySession;
}

export function handlePhotoUpload(bot: Telegraf) {
    bot.on("photo", async (ctx: Context) => {
        const tgId = ctx.from?.id;
        const state = (ctx as MyContext).session;

        if (!state || state.mode !== "upload") {
            await ctx.reply("Чтобы начать загружать фото, сначала нажмите «📸 Загрузить фото».");
            return;
        }

        if (state.isProcessing) {
            let attempts = 0;
            /**
             * Ожидаем возможности обработать фото. Ограничение: 10 минут (120 циклов по 500мс)
             */
            while (state.isProcessing && attempts < 120) {
                await new Promise(res => setTimeout(res, 500));
                attempts++;
            }
        }

        if ((state.images?.length || 0) >= 4) {
            await ctx.reply("Достигнут лимит в 5 фотографий! Вы не можете загрузить больше фото.",
                Markup.keyboard([
                    ["✅ Завершить"]
                ]).resize()
            );
            return;
        }

        const msg = ctx.message as Message.PhotoMessage;
        const photo = msg.photo?.slice(-1)[0];

        if (!photo) return;

        const fileId = photo.file_id;
        if (!state.images) state.images = [];
        state.isProcessing = true;

        if (!state.remaining) {
            const profile = await fetchProfile(tgId);
            const currentImages = profile?.images?.length || 0;
            state.remaining = 5 - currentImages;
        }

        try {
            if (state.images.length < 5) {
                const { ok, fileUrl } = await uploadPhoto(tgId, fileId);

                if (ok) {
                    state.images.push(fileUrl);

                    await ctx.reply(`✅ Успешно загружено ${state.images.length} из ${state.remaining} фото`);

                    if (state.images.length >= state.remaining) {
                        await ctx.reply('Достигнут лимит в 5 фотографий! Вы не можете загрузить больше фото.',
                            Markup.keyboard([
                                ["✅ Завершить"]
                            ]).resize()
                        );
                    } else {
                        if (!state.sendFinaly) await ctx.reply("Когда будете готовы — нажмите «Завершить».",
                            Markup.keyboard([
                                ["✅ Завершить"]
                            ]).resize()
                        );

                        state.sendFinaly = true;
                    }
                } else {
                    await ctx.reply("Возникла какая-то проблемка при загрузке фотографии! Попробуйте чуть позже.");
                }
            }
        } finally {
            state.isProcessing = false;
        }
    });
} 