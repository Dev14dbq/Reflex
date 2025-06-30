// Конфигурация из переменных окружения
export const config = {
  // API URL
  API_URL: import.meta.env.VITE_API_URL || 'https://spectrmod.ru/api',
  
  // WebSocket URL 
  WS_URL: import.meta.env.VITE_WS_URL || 'wss://spectrmod.ru/ws',
  
  // Base domain for external links
  BASE_URL: import.meta.env.VITE_BASE_URL || 'https://spectrmod.ru',
  
  // Bot URL for redirects
  BOT_URL: import.meta.env.VITE_BOT_URL || 'https://t.me/spectrmod_bot?startapp',
  
  // Environment
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
}; 