import { config } from "dotenv"; config();

export const BOT_TOKEN = process.env.BOT_TOKEN!;
export const API_BASE = process.env.api_url || "https://spectrmod.ru/api";
export const WEBAPP_URL = process.env.site_url || "https://spectrmod.ru/";
export const WEBAPP_DEV_URL = process.env.WEBAPP_DEV_URL || "https://dev.spectrmod.ru/";
export const SUPPORT_USERNAME = "spectrmod";
export const INTRO_PICTURE = "https://s.iimg.su/s/18/3dr82mIVRK6ojKvPQH2OBcYEM4pStJ0zrTo2USQ6.png";