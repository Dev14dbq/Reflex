"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// index.tsx
const express_1 = __importDefault(require("express"));
const express_ws_1 = __importDefault(require("express-ws"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = require("./auth");
const user_1 = require("./user");
const profile_1 = require("./profile");
const stats_1 = require("./stats");
const settings_1 = require("./settings");
const location_1 = require("./location");
const nsfw_1 = require("./nsfw");
const admin_1 = require("./admin");
const moderation_1 = require("./moderation");
const advertising_1 = require("./advertising");
const analytics_1 = require("./analytics");
const search_1 = require("./search");
const likes_1 = require("./likes");
const chat_1 = require("./chat");
dotenv_1.default.config();
const app = (0, express_1.default)();
const { app: wsApp } = (0, express_ws_1.default)(app);
wsApp.use((0, cors_1.default)());
wsApp.use(express_1.default.json());
// Раздача статических файлов CDN
wsApp.use('/api/cdn/image', express_1.default.static('/var/www/spectrmod/cdn/image'));
wsApp.use(auth_1.authRouter);
wsApp.use(user_1.userRouter);
wsApp.use(profile_1.profileRouter);
wsApp.use(stats_1.statsRouter);
wsApp.use(settings_1.settingsRouter);
wsApp.use(location_1.locationRouter);
wsApp.use(nsfw_1.nsfwRouter);
wsApp.use("/admin", admin_1.adminRouter);
wsApp.use("/moderation", moderation_1.moderationRouter);
wsApp.use("/advertising", advertising_1.advertisingRouter);
wsApp.use("/analytics", analytics_1.analyticsRouter);
// 🔍 Search WS
wsApp.ws("/ws/search", (ws, req) => {
    (0, search_1.startWebSocketServer)(ws, req);
});
// 💘 Likes WS
wsApp.ws("/ws/likes", (ws, req) => {
    (0, likes_1.likesWebSocket)(ws, req);
});
wsApp.ws("/ws/chat", (ws, req) => {
    (0, chat_1.chatWebSocket)(ws, req);
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
    // Инициализируем NSFW модель
    await (0, nsfw_1.initializeNsfwModel)();
});
