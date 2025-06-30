import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../stores/user";

export const Reset: React.FC = () => {
  const navigate = useNavigate();
  const { clearUser } = useUserStore();

  useEffect(() => {
    // 1. Очищаем local/session storage
    localStorage.clear();
    sessionStorage.clear();

    // 2. Чистим Zustand
    clearUser();

    // 3. Закрываем Telegram WebApp, если возможно
    (window as any).Telegram?.WebApp?.close?.();

    // 4. Фолбэк: через 800мс возвращаемся на корень
    const t = setTimeout(() => {
      navigate("/", { replace: true });
    }, 800);

    return () => clearTimeout(t);
  }, [clearUser, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neu-bg-primary p-6">
      <div className="neu-card p-6 text-center">
        <h2 className="text-lg font-semibold mb-2 neu-text-primary">Выход...</h2>
        <p className="text-sm neu-text-secondary">Очищаем данные и закрываем приложение</p>
      </div>
    </div>
  );
}; 