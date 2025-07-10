import { Telegraf, Context } from "telegraf";
import { fetchProfile, getAdvertisement } from "../utils/api";
import { WEBAPP_URL, INTRO_PICTURE, SUPPORT_USERNAME } from "../config";
import { Markup } from "telegraf";

interface MySession {
  mode?: string;
  images?: string[];
}
interface MyContext extends Context {
  session: MySession;
}

export function startCommand(bot: Telegraf) {
  bot.start(async (ctx: Context) => {
    const tgId = ctx.from?.id;
    if (!tgId) return;
    const arg = (ctx.message && "text" in ctx.message && ctx.message.text.split(" ")[1]) || "";

    // Быстрый вход в загрузку фото
    if (["upload", "media"].includes(arg)) {
      (ctx as MyContext).session = { mode: "upload", images: [] };
      await ctx.reply("📸 Отправьте до 5 изображений для анкеты. После — нажмите ✅ Завершить.");
      return;
    }

    const profile = await fetchProfile(tgId);
    const hasProfile = !!profile;

    // Reply-клавиатура
    const replyKb = Markup.keyboard([
      ["📸 Загрузить фото"],
      ["📞 Поддержка"],
    ]).resize();

    // Инлайн-кнопка для WebApp
    const inlineKb = Markup.inlineKeyboard([
      Markup.button.webApp("🚀 Запустить", WEBAPP_URL),
    ]);

    let caption = "";
    if (hasProfile) {
      caption = `<b>Reflex — анонимный LGB🌈Q чат-тиндер</b>\n\nНажмите «Запустить», чтобы открыть приложение.\n📸 Загрузить фото — управлять фотографиями (1-5)\n📞 Поддержка — вопросы → @${SUPPORT_USERNAME}`;
    } else {
      caption = `<b>Reflex — анонимный LGB🌈Q чат-тиндер</b>\n\nНажмите «Запустить», пройдите короткую регистрацию и начинайте знакомиться!`;
    }

    await ctx.replyWithPhoto(INTRO_PICTURE, { caption, parse_mode: "HTML", ...inlineKb });
    await ctx.reply("Меню", replyKb);

    // Показываем рекламу с задержкой
    setTimeout(async () => {
      const ad = await getAdvertisement(tgId);
      if (ad) {
        const adKb = Markup.inlineKeyboard([
          Markup.button.callback(ad.buttonText || "Перейти", `ad_click:${ad.id}`),
        ]);
        if (ad.imageUrl) {
          await ctx.replyWithPhoto(ad.imageUrl, {
            caption: `🎯 <b>${ad.title || ""}</b>\n\n${ad.description || ""}`,
            parse_mode: "HTML",
            ...adKb,
          });
        } else {
          await ctx.reply(
            `🎯 <b>${ad.title || ""}</b>\n\n${ad.description || ""}`,
            { parse_mode: "HTML", ...adKb }
          );
        }
      }
    }, 2000);
  });
} 