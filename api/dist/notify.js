"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTG = sendTG;
const BOT_TOKEN = process.env.BOT_TOKEN;
const API_ROOT = `https://api.telegram.org/bot${BOT_TOKEN}`;
async function sendTG(tgId, text) {
    if (!BOT_TOKEN)
        return;
    const url = `${API_ROOT}/sendMessage`;
    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: tgId.toString(), text }),
        });
    }
    catch (err) {
        console.error("[NOTIFY] telegram send fail", err);
    }
}
