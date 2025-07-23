import { Telegraf, session } from "telegraf";
import { config } from "dotenv"; config();
import { registerCommands } from "./commands/index.js";
import { registerButtons } from "./buttons/index.js";
import { dailyAdBroadcast } from "./utils/dailyAdBroadcast.js";

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

registerCommands(bot);
registerButtons(bot);
dailyAdBroadcast(bot);

bot.launch();
console.log('[BOT] Успешно подключился к телеграм!');

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM")); 