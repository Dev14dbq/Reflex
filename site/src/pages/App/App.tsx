import React, { useEffect, useState } from "react";
import clsx from "clsx";

import { FiRefreshCw, FiMapPin } from "react-icons/fi";
import { useUserStore } from "@stores/user";
import { ErrorCard } from "@components/ui";
import api from "@api";

type StatsResponse = {
    likesSent: number;
    dislikesSent: number;
    sentLikePercent: number | null;
    likeCoefficient: number | null;
    matches: number;
    rejectedLikes: number;
};

type Profile = {
    id: string;
    preferredName: string;
    description: string;
    city: string;
    goals: string[];
    birthYear: string;
    user: { username: string };
    images?: string[];
};

export const App: React.FC<{ className?: string }> = ({ className }) => {
    const { user, isInitialized, isAuthenticated, token } = useUserStore();

    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [, setError] = useState<string | null>(null); // TODO: Сделать отображение ошибки через телеграм сообщение 

    /**
     * Создание запроса на получение статистики и данных при 1 заходе
     */
    useEffect(() => {
        const loadData = async () => {
            if (!isInitialized || !isAuthenticated) {
              return console.log('[App] Авторизация не завершена! Пропускаем загрузку данных');
            }

            try {
                const apiStats = await api.get("/stats/me", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                });

                const apiProfile = await api.get("/profile/me", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                });

                const dataStats = await apiStats.json();
                const dataProfile = await apiProfile.json();

                setStats(dataStats); setProfile(dataProfile.profile);
            } catch (error) {
                console.error(error);
                setError("[API] Не удалось получить данные профиля! Попробуйте зайти позже");
            }
        };

        loadData();
    }, [isInitialized, isAuthenticated, token]);

    const refreshData = async () => {
        setIsRefreshing(true);

        if (isAuthenticated && token) {
            try {
                const res = await api.get("/me", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                });

                const data = await res.json();
                useUserStore.getState().setUser(data.user);

                const statsRes: any = await api.get("/stats/me", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                });

                const statData = await statsRes.json();
                setStats(statData.data);
            } catch (err) {
                console.error("Failed to refresh data", err);
                setError("Ошибка обновления данных");
            }
        }

        setTimeout(() => setIsRefreshing(false), 1000);
    };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-neu-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="neu-text-secondary">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <ErrorCard title="Ошибка" description="Не удалось получить данные — скорее всего, у вас некорректный Telegram hash. Пропишите /reset в боте и попробуйте снова." />
      </div>
    );
  }

  // Подсчитываем проценты для вывода (добавляем fallback 0)
  const sentPercent = stats && stats.sentLikePercent !== null ? Math.round(stats.sentLikePercent * 100) : 0;
  const coeffPercent = stats && stats.likeCoefficient !== null ? Math.round(stats.likeCoefficient * 100) : 0;

  // Утилита для реальных изображений
  const realImages = profile?.images?.filter((img) => img && !img.includes("dicebear.com")) || [];
  const displayImages = realImages.length > 0 ? realImages : [
    `https://api.dicebear.com/7.x/thumbs/svg?seed=${Math.floor(Math.random() * 1000000)}`
  ];
  const [imgIdx, setImgIdx] = useState(0);

  const nextImg = () => setImgIdx((prev) => (prev + 1) % displayImages.length);
  const prevImg = () => setImgIdx((prev) => (prev - 1 + displayImages.length) % displayImages.length);

  return (
    <div className="scrollable-content">
      <div className={clsx("min-h-[calc(100vh-80px)] p-4 neu-animate-slide-up", className)}>
        {/* Header */}
        <div className="mb-8 relative">
          <button
            onClick={refreshData}
            className={clsx(
              "absolute right-0 top-0 neu-btn p-3 rounded-neu-full transition-transform",
              isRefreshing && "animate-spin"
            )}
            disabled={isRefreshing}
          >
            <FiRefreshCw className="text-lg" />
          </button>
          <div className="neu-card text-center mb-6">
            <div className="neu-gradient-primary p-6 rounded-neu-lg mb-4">
              <h1 className="text-3xl font-bold text-white mb-2">Reflex</h1>
              <p className="text-white/80 text-sm">Современная платформа знакомств</p>
            </div>
          </div>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="neu-surface-subtle p-4 rounded-neu-md text-center">
              <div className="text-lg font-semibold neu-text-primary mb-1">Реакции</div>
              <div className="text-sm neu-text-muted">{stats.likesSent}❤️ / {stats.dislikesSent}❌</div>
              <div className="text-xs neu-text-secondary mt-1">{sentPercent}% лайков</div>
            </div>
            <div className="neu-surface-subtle p-4 rounded-neu-md text-center">
              <div className="text-lg font-semibold neu-text-primary mb-1">Отклик</div>
              <div className="text-sm neu-text-muted">{coeffPercent}%</div>
              <div className="text-xs neu-text-secondary mt-1">Матчи: {stats.matches}</div>
            </div>
            <div className="neu-surface-subtle p-4 rounded-neu-md text-center">
              <div className="text-lg font-semibold neu-text-primary mb-1">Отказы</div>
              <div className="text-sm neu-text-muted">{stats.rejectedLikes}</div>
            </div>
          </div>
        )}

        {/* Превью моей анкеты */}
        {profile && (
          <div className="neu-card neu-animate-scale">
            {/* Image */}
            <div className="relative w-full h-72 mb-4 overflow-hidden rounded-neu-lg bg-neu-surface-subtle">
              {displayImages.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt="Фото"
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === imgIdx ? "opacity-100" : "opacity-0"}`}
                  onClick={nextImg}
                />
              ))}
              {displayImages.length > 1 && (
                <>
                  <button className="absolute left-2 top-1/2 -translate-y-1/2 text-white/80" onClick={prevImg}>❮</button>
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80" onClick={nextImg}>❯</button>
                </>
              )}
            </div>

            {/* Info */}
            <div className="px-4 pb-4">
              <div className="flex items-start justify-between mb-2 gap-2">
                <h2 className="text-xl font-semibold neu-text-primary">
                  {profile.preferredName}, {new Date().getFullYear() - parseInt(profile.birthYear,10)}
                </h2>
                <div className="neu-surface-subtle px-2 py-1 rounded-neu-sm flex items-center space-x-1 flex-shrink-0">
                  <FiMapPin className="text-neu-accent-primary text-sm" />
                  <span className="text-xs font-semibold neu-text-primary whitespace-nowrap">{profile.city}</span>
                </div>
              </div>
              <p className="text-sm neu-text-secondary mb-3">{profile.description}</p>

              {/* Goals */}
              {profile.goals?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.goals.map(g => (
                    <span key={g} className="px-3 py-1 rounded-neu-sm neu-surface-subtle text-xs neu-text-secondary">#{g}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="text-center mt-8 py-4">
          <p className="text-xs neu-text-muted">
            Сделано с ❤️ для современных знакомств
          </p>
        </div>
      </div>
    </div>
  );
};
