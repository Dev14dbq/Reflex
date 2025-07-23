import { Telegraf } from "telegraf";
import { startCommand } from "./start.js";
import { versionCommand } from "./version.js";
import { developerCommand } from "./developer.js";

export function registerCommands(bot: Telegraf) {
    startCommand(bot);
    versionCommand(bot);
    developerCommand(bot)
} 