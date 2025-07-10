const BOT_TOKEN = process.env.BOT_TOKEN;
const API_ROOT = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendTG(tgId: bigint | number | string, text: string) {
  if (!BOT_TOKEN) return;
  const url = `${API_ROOT}/sendMessage`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: tgId.toString(),
        text,
        parse_mode: "Markdown"
      }),
    });
  } catch (err) {
    console.error("[NOTIFY] telegram send fail", err);
  }
} 