import React from 'react'
import ReactDOM from 'react-dom/client'
import "./index.scss";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router/routes";

// Отключаем console.log в production
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
}

// ВРЕМЕННЫЙ DEBUG: Перехватываем все fetch запросы для отладки
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [url, options] = args;
  
  // Проверяем только запросы к нашему API
  if (typeof url === 'string' && url.includes('spectrmod.ru/api')) {
    console.log('🚀 [FETCH DEBUG] Запрос к API:', {
      url,
      method: options?.method || 'GET',
      headers: options?.headers,
      stack: new Error().stack
    });
  }
  
  return originalFetch.apply(this, args);
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>
);
