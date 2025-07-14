import { Telegraf, Context } from "telegraf";
import packageJson from "../../package.json" assert { type: "json" };

const packageVersion = packageJson.version;
let buildTime: string | undefined;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    buildTime = (await import('../build-info.js')).buildTime
} catch {
    buildTime = undefined;
}

export function versionCommand(bot: Telegraf) {
    bot.command("version", async (ctx: Context) => {
        if (buildTime) {
            await ctx.reply(`Версия бота: ${packageVersion}-JavaScript-${buildTime}`);
        } else {
            await ctx.reply(`Версия бота: ${packageVersion}-TypeScript-None`);
        }
    });
} 