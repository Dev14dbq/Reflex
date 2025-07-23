// index.tsx
import express from "express";
import expressWs from "express-ws";
import dotenv from "dotenv";
import cors from "cors";

// Отключаем логи TensorFlow.js
import './tensorflow-config';

import { authRouter } from "./auth.ts";
import userRouter from "./user.ts";
import { profileRouter } from "./profile.ts";
import { statsRouter } from "./stats.ts";
import { settingsRouter } from "./settings.ts";
import { locationRouter } from "./location.ts";
import { nsfwRouter, initializeNsfwModel } from "./nsfw.ts";
import { adminRouter } from "./admin.ts";
import { moderationRouter } from "./moderation.ts";
import { advertisingRouter } from "./advertising.ts";
import { analyticsRouter } from "./analytics.ts";
import { chatRouter } from "./chat.ts";

import { startWebSocketServer as startSearchWebSocket } from "./search.ts";
import { likesWebSocket } from "./likes.ts";
import { chatWebSocket } from "./chat.ts";

dotenv.config();

const app = express();
const { app: wsApp } = expressWs(app);

wsApp.use(cors());
wsApp.use(express.json());

// Раздача статических файлов CDN
wsApp.use('/api/cdn/image', express.static('/var/www/spectrmod/cdn/image'));

wsApp.use(authRouter);
wsApp.use(userRouter);
wsApp.use(profileRouter);
wsApp.use(statsRouter);
wsApp.use(settingsRouter);
wsApp.use(locationRouter);
wsApp.use(nsfwRouter);
wsApp.use(chatRouter);
wsApp.use("/admin", adminRouter);
wsApp.use("/moderation", moderationRouter);
wsApp.use("/advertising", advertisingRouter);
wsApp.use("/analytics", analyticsRouter);

// 🔍 Search WS
wsApp.ws("/ws/search", (ws, req) => {
  startSearchWebSocket(ws, req);
});

// 💘 Likes WS
wsApp.ws("/ws/likes", (ws, req) => {
  likesWebSocket(ws, req);
});

wsApp.ws("/ws/chat", (ws, req) => {
  chatWebSocket(ws, req);
});

const PORT = process.env.PORT || 3001;

// Убираем избыточное логирование в production
if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  console.log = () => { };
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  console.debug = () => { };
}

wsApp.listen(PORT, async () => {
  console.log(`[SERVER] 🟢 Сервер на порту ${PORT}`);
  console.log(`[WS] 🔍 Search WS: ws://localhost:${PORT}/ws/search`);
  console.log(`[WS] 💘 Likes  WS: ws://localhost:${PORT}/ws/likes`);
  console.log(`[WS] 💬 Chat   WS: ws://localhost:${PORT}/ws/chat`);

  // Инициализируем NSFW модель
  await initializeNsfwModel();
});
