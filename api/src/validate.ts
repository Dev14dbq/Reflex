import crypto from "crypto";

export function validateInitData(raw: string, botToken: string): {
  ok: boolean;
  user: any | null;
  hash: string | null;
  reason?: string;
} {
  if (!raw || !botToken) {
    console.warn("[VALIDATION] ❌ Missing raw data or bot token");
    return { ok: false, user: null, hash: null, reason: "Missing initData or token" };
  }

  const params = new URLSearchParams(raw);
  const hash = params.get("hash");

  if (!hash) {
    console.warn("[VALIDATION] ❌ No hash in initData");
    return { ok: false, user: null, hash: null, reason: "No hash in initData" };
  }

  // 1. Собираем строки кроме hash
  const dataCheckArr: string[] = [];
  params.forEach((value, key) => {
    if (key !== "hash") dataCheckArr.push(`${key}=${value}`);
  });

  // 2. Telegram требует сортировку по алфавиту и join с \n
  const checkString = dataCheckArr.sort().join("\n");

  // 3. Генерим подпись на основе BOT_TOKEN
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  // 4. Пробуем распарсить user
  let user: any = null;
  try {
    const userRaw = params.get("user");
    if (userRaw) {
      user = JSON.parse(userRaw);
    }
  } catch (e) {
    console.warn("[VALIDATION] ❌ Failed to parse user JSON", e);
    return { ok: false, user: null, hash, reason: "Invalid user JSON" };
  }

  const isValid = signature === hash;

  return {
    ok: isValid,
    user,
    hash,
    reason: isValid ? undefined : "Hash mismatch",
  };
}
