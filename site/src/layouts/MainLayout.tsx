import axios from "axios";
import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { CityMigration } from "@page/CityMigration/CityMigration";
import { ErrorCard, AdCard, BannedScreen } from "@components/ui";
import { useGlobalWebSocket } from "@hooks/useGlobalWebSocket";
import { useAdvertising } from "@hooks/useAdvertising";
import { BottomLayout } from "./BottomLayout";
import { useUserStore } from "@stores/user";

import { config } from "@env";
import api from '@api';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const { user, token, isAuthenticated, isInitialized, hasProfile, setUser, setToken, setInitialized, setHasProfile, logout } = useUserStore();

  const [loading, setLoading] = useState(!isInitialized);
  const [error, setError] = useState<string | null>(null);
  const [needsCityMigration, setNeedsCityMigration] = useState(false);

  const [authRetryCount, setAuthRetryCount] = useState(0);
  
  // Инициализируем глобальный WebSocket
  useGlobalWebSocket();
  
  // Инициализируем рекламу
  const {
    currentAd,
    showWelcomeAd,
    trackImpression,
    trackClick,
    closeAd
  } = useAdvertising();
  
  // Используем состояние из store
  const noProfile = hasProfile === false;

  // Отладочная информация
  useEffect(() => {
    console.log('[MainLayout] State:', {
      isInitialized,
      hasUser: !!user,
      hasToken: !!token,
      hasProfile,
      loading,
      noProfile,
      pathname: location.pathname
    });
  }, [isInitialized, user, token, hasProfile, loading, noProfile, location.pathname]);

  /**
   * Инициализация Telegram WebApp SDK
   */
  useEffect(() => {
    if ((window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.ready?.();
      (window as any).Telegram.WebApp.expand?.();
    }
  }, []);

  // Основная логика авторизации - выполняется только один раз при загрузке
  useEffect(() => {
    const initializeAuth = async () => {
      if (isInitialized) return;

      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        // Ждем немного чтобы Telegram WebApp успел инициализироваться
        setTimeout(() => {
          authWithTelegram();
        }, 500);
        return;
      }

      try {
        const response = await api.get("/me", {
          headers: {
            Authorization: `Bearer ${storedToken}`
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
          setToken(storedToken);
          
          // Проверяем есть ли профиль
          const profileResponse = await api.get("/profile/me", {
            headers: {
              Authorization: `Bearer ${storedToken}`
            },
          });
          
          console.log('[Init] Проверка профиля:', {
            status: profileResponse.status,
            ok: profileResponse.ok
          });
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('[Init] Профиль получен:', {
              hasProfile: !!profileData.profile,
              city: profileData.profile?.city
            });
            setHasProfile(!!profileData.profile);
          } else if (profileResponse.status === 404) {
            console.log('[Init] ❌ Профиль не найден (404), пользователь должен создать профиль');
            setHasProfile(false);
          } else {
            console.error('[Init] ❌ Ошибка получения профиля:', profileResponse.status);
            const errorText = await profileResponse.text().catch(() => 'Unknown error');
            console.error('[Init] Детали ошибки:', errorText);
            setHasProfile(false);
          }
        } else {
          localStorage.removeItem("token");
          setToken(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        localStorage.removeItem("token");
        setToken(null);
      } finally {
        setInitialized(true);
        setLoading(false);
      }
    };

    initializeAuth();
  }, [isInitialized, setUser, setToken, setInitialized, setHasProfile]);

  // Показываем приветственную рекламу после успешной инициализации
  useEffect(() => {
    if (isInitialized && !loading && user && hasProfile) {
      // Показываем рекламу через 3 секунды после загрузки, но только один раз за сессию
      const timer = setTimeout(() => {
        showWelcomeAd();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isInitialized, user, hasProfile]);

  // Отдельный эффект для редиректов при изменении маршрута
  useEffect(() => {
    if (!isInitialized || loading) return; // Ждем завершения инициализации

    if (noProfile && location.pathname !== "/register") {
      navigate("/register", { replace: true });
    } else if (!noProfile && user && location.pathname === "/register") {
      navigate("/", { replace: true });
    }
  }, [location.pathname, noProfile, isInitialized, loading, navigate, user]);

  /** Проверяем, есть ли профиль, и выполняем соответствующий редирект */
  const verifyProfile = async (token: string, retry = false) => {
    try {
      console.log('[VerifyProfile] 🔍 Проверяем профиль...', { retry });
      const res: any = await api.get(`/profile/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
      });

      if (!res.data?.profile) {
        console.log('[VerifyProfile] ❌ Профиль отсутствует в ответе');
        // treat as no profile
        setHasProfile(false);
        setLoading(false);
        return;
      }

      console.log('[VerifyProfile] ✅ Профиль найден');
      setLoading(false);
      setHasProfile(true);
    } catch (err: any) {
      console.log('[VerifyProfile] ❌ Ошибка:', err.response?.status);
      
      if (err.response?.status === 404) {
        if (!retry) {
          console.log('[VerifyProfile] 🔄 Первая 404, повторяем через 800мс...');
          // первая 404 – подождём и проверим ещё раз
          setTimeout(() => verifyProfile(token, true), 800);
        } else {
          console.log('[VerifyProfile] ❌ Вторая 404, профиля точно нет');
          // вторая 404 — профиля точно нет
          setHasProfile(false);
          setLoading(false);
        }
        return;
      }

      if (err.response?.status === 401 || err.response?.status === 403) {
        console.warn("[VerifyProfile] ❌ Токен недействителен", err);
        logout();
        setInitialized(false); // Сбрасываем флаг для повторной авторизации
        authWithTelegram();
      } else {
        console.error("[VerifyProfile] ❌ Неизвестная ошибка:", err);
        setError("Ошибка авторизации");
        setLoading(false);
      }
    }
  };

  /** Унифицированная обработка ошибок авторизации */


  const authWithTelegram = async (retryCount = 0): Promise<void> => {
    const maxRetries = 3;
    setAuthRetryCount(retryCount);
    console.log(`[Auth] Попытка авторизации ${retryCount + 1}/${maxRetries + 1}`);

    // Ждем немного если это retry, чтобы Telegram WebApp успел инициализироваться
    if (retryCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }

    const tgWebApp = (window as any).Telegram?.WebApp;
    const raw = tgWebApp?.initData;
    
    console.log('[Auth] WebApp состояние:', {
      webAppExists: !!tgWebApp,
      initDataExists: !!raw,
      initDataLength: raw?.length || 0,
      isReady: tgWebApp?.isReady
    });

    if (!raw) {
      if (retryCount < maxRetries) {
        console.log(`[Auth] InitData не найден, повтор через ${(retryCount + 1) * 1000}мс...`);
        return authWithTelegram(retryCount + 1);
      }
      
      console.warn("[Auth] ❌ InitData не найден после всех попыток");
      setError("tg-init-missing");
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      console.log('[Auth] 🚀 Отправляем запрос авторизации...');
      const response = await axios.post(`${config.API_URL}/auth/by-initdata`, 
        { initData: raw },
        { timeout: 10000 } // 10 секунд таймаут
      );

      console.log('[Auth] ✅ Авторизация успешна');
      setToken(response.data.token);
      setUser(response.data.user);
      setError(null);

      console.log('[Auth] 🔍 Проверяем профиль пользователя...');
      // Проверяем есть ли профиль - ИСПРАВЛЕНИЕ: используем новый токен
      verifyProfile(response.data.token);
      
    } catch (err: any) {
      console.error(`[Auth] ❌ Ошибка на попытке ${retryCount + 1}:`, err);
      
      // Если это сетевая ошибка или таймаут - пробуем еще раз
      if ((err.code === 'NETWORK_ERROR' || err.code === 'ECONNABORTED' || !err.response) && retryCount < maxRetries) {
        console.log(`[Auth] 🔄 Сетевая ошибка, повтор через ${(retryCount + 1) * 1000}мс...`);
        return authWithTelegram(retryCount + 1);
      }
      
      // Обрабатываем специфические ошибки
      if (err.response?.status === 409 && err.response?.data?.code === "CLEAR_STORAGE") {
        localStorage.clear();
        sessionStorage.clear();
        setError("Данные очищены. Перезагрузите страницу и попробуйте снова.");
        setTimeout(() => window.location.reload(), 3000);
      } else if (err.response?.status >= 500 && retryCount < maxRetries) {
        console.log(`[Auth] 🔄 Ошибка сервера, повтор через ${(retryCount + 1) * 1000}мс...`);
        return authWithTelegram(retryCount + 1);
      } else if (retryCount >= maxRetries) {
        console.error(`[Auth] ❌ Все попытки исчерпаны`);
        setError("Не удалось подключиться к серверу. Попробуйте перезагрузить страницу.");
      } else {
        setError("Ошибка авторизации");
      }
      
      setLoading(false);
    } finally {
      // ИСПРАВЛЕНИЕ: Всегда устанавливаем isInitialized=true в конце
      console.log('[Auth] 🏁 Авторизация завершена, устанавливаем isInitialized=true');
      setInitialized(true);
    }
  };

  // Кастомный компонент ошибки
  const renderError = () => {
    if (error === "network") {
      return (
        <ErrorCard
          title="Нет подключения"
          description="Проверьте интернет-соединение и попробуйте снова"
          onRetry={() => window.location.reload()}
          retryText="Перезагрузить"
        />
      );
    }
    if (error === "tg-init-missing") {
      return (
        <ErrorCard
          title="Telegram не прислал данные"
          description="Откройте приложение снова через кнопку «Открыть» в Telegram"
          onRetry={() => window.location.href = config.BOT_URL}
          retryText="Запустить"
        />
      );
    }
    return (
      <ErrorCard
        title="Ошибка подключения"
        description={error || "Неизвестная ошибка"}
        onRetry={() => {
          setError(null);
          setInitialized(false);
          authWithTelegram();
        }}
      />
    );
  };

  const routesWithBottom = ["/", "/search", "/settings", "/likes", "/chats"];
  const useBottomLayout = routesWithBottom.includes(location.pathname);

  if (loading || !isInitialized) {
    let loadingMessage = "Авторизация... Подключаемся к серверу";
    if (authRetryCount > 0) {
      loadingMessage = `Подключение... Попытка ${authRetryCount + 1}`;
    }

    return (
      <div className="min-h-screen bg-neu-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-neu-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="neu-text-secondary">
            {loadingMessage}
          </p>
          {authRetryCount > 0 && (
            <p className="neu-text-muted text-xs mt-2">
              Проблемы с подключением, повторяем...
            </p>
          )}
          <p className="neu-text-muted text-xs mt-2">
            isInitialized: {isInitialized ? 'true' : 'false'}, loading: {loading ? 'true' : 'false'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        {renderError()}
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <>{children || <Outlet />}</>;
  }

  // Проверяем статус блокировки пользователя
  if (user.blocked) {
    return (
      <BannedScreen 
        blockReason={user.blockReason} 
        blockedAt={user.blockedAt} 
      />
    );
  }

  if (!hasProfile) {
    return <>{children || <Outlet />}</>;
  }

  if (needsCityMigration) {
    return <CityMigration />;
  }

  return useBottomLayout ? (
    <BottomLayout>
      {children || <Outlet />}
      
      {/* Модальное окно с рекламой */}
      {currentAd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-sm w-full">
            <button
              onClick={closeAd}
              className="absolute -top-2 -right-2 w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center text-lg font-bold z-10 hover:bg-gray-700"
            >
              ×
            </button>
            <AdCard
              ad={currentAd}
              onImpression={trackImpression}
              onClick={trackClick}
            />
          </div>
        </div>
      )}
    </BottomLayout>
  ) : (
    <>
      {children || <Outlet />}
      
      {/* Модальное окно с рекламой */}
      {currentAd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-sm w-full">
            <button
              onClick={closeAd}
              className="absolute -top-2 -right-2 w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center text-lg font-bold z-10 hover:bg-gray-700"
            >
              ×
            </button>
            <AdCard
              ad={currentAd}
              onImpression={trackImpression}
              onClick={trackClick}
            />
          </div>
        </div>
      )}
    </>
  );
};
