import axios, { AxiosError } from "axios";
import { config } from "../config/env";

// Базовый экземпляр
const http = axios.create({
  baseURL: config.API_URL,
  timeout: 7000,
});

// 👉 Интерцептор запросов: добавляем токен
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Обработка ошибок
const errorHandler = (error: AxiosError & { code?: string }) => {
  const status = error.response?.status;
  const code = error.code;

  if (status === 401 || status === 403 || status === 409) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/reset";
    return Promise.reject(error);
  }

  if (code === "ECONNABORTED" || code === "ENOTFOUND" || code === "ECONNREFUSED") {
    error.message = "network"; // специальная метка
  }

  return Promise.reject(error);
};

// Интерцептор ответов
http.interceptors.response.use((r) => r, errorHandler);

export { http };
