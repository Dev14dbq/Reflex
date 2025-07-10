import { Telegraf, session } from "telegraf";
import { config } from "dotenv"; config();
import { registerCommands } from "./commands/index";
import { registerButtons } from "./buttons/index";
import { dailyAdBroadcast } from "./utils/dailyAdBroadcast";

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

registerCommands(bot);
registerButtons(bot);

dailyAdBroadcast(bot);

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM")); 