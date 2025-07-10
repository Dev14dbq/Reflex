import dotenv from "dotenv";
dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN!;
export const API_BASE = process.env.api_url || "https://spectrmod.ru/api";
export const WEBAPP_URL = "https://reflex-site.kamish.pro/";
export const SUPPORT_USERNAME = "spectrmod";
export const INTRO_PICTURE = "https://s.iimg.su/s/18/3dr82mIVRK6ojKvPQH2OBcYEM4pStJ0zrTo2USQ6.png";
export const ADMIN_IDS = [8072408248, 7001269338, 8186814795];

export const PROFILE_BY_TG_URL = `${API_BASE}/profile/by-telegram/{telegram_id}`;
export const UPLOAD_URL = `${API_BASE}/profile/add-media`;
export const AD_SERVE_URL = `${API_BASE}/advertising/serve`;
export const AD_IMPRESSION_URL = `${API_BASE}/advertising/track/impression`;
export const AD_CLICK_URL = `${API_BASE}/advertising/track/click`; 