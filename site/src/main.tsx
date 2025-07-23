import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "@routes";

import "./index.scss";

/**
 * Отключение console уведомлений в публичной версии бота
 * 
 * Что-бы включить нужно в .env файл добавить PROD=true
 */
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
  console.error = () => {};
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>
);
