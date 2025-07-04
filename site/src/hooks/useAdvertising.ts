import { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '@stores/user';
import { config } from '@env';
import api from '@api';

interface AdData {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  buttonText: string;
  buttonUrl: string;
}

export const useAdvertising = () => {
  const { isInitialized, isAuthenticated, token } = useUserStore();
  const [currentAd, setCurrentAd] = useState<AdData | null>(null);
  const [sessionWelcomeShown, setSessionWelcomeShown] = useState(false);
  
  // Получаем счетчик действий из localStorage
  const getActionCount = () => {
    const stored = localStorage.getItem('adActionCount');
    return stored ? parseInt(stored, 10) : 0;
  };
  
  const [actionCount, setActionCount] = useState(getActionCount());
  
  // Сохраняем счетчик в localStorage
  const saveActionCount = (count: number) => {
    localStorage.setItem('adActionCount', count.toString());
    setActionCount(count);
  };
  
  // Проверяем и сбрасываем счетчик если прошел день
  const checkAndResetActionCount = () => {
    const lastReset = localStorage.getItem('adActionCountLastReset');
    const today = new Date().toDateString();
    
    if (lastReset !== today) {
      localStorage.setItem('adActionCountLastReset', today);
      saveActionCount(0);
    }
  };
  
  // Сбрасываем счетчик при инициализации если прошел день
  useEffect(() => {
    checkAndResetActionCount();
  }, []);
  
  // Проверяем в localStorage, показывали ли уже приветственную рекламу
  const getWelcomeAdShown = () => {
    const lastShown = localStorage.getItem('welcomeAdLastShown');
    if (!lastShown) return false;
    
    const lastShownDate = new Date(lastShown);
    const today = new Date();
    
    // Проверяем, что прошло больше 12 часов с последнего показа
    const hoursSinceLastShown = (today.getTime() - lastShownDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastShown < 12;
  };
  
  const setWelcomeAdShown = () => {
    localStorage.setItem('welcomeAdLastShown', new Date().toISOString());
  };

  // Получить рекламу с сервера
  const fetchAd = useCallback(async (): Promise<AdData | null> => {
    try {
      // ИСПРАВЛЕНИЕ: Более строгая проверка - должна быть авторизация
      if (!isInitialized || !isAuthenticated) {
        console.log('[Advertising] Авторизация не завершена, пропускаем запрос рекламы');
        return null;
      }

      // Получаем информацию о пользователе для передачи userId
      const userResponse = await api.get('/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userResponse.ok) return null;
      
      const userData = await userResponse.json();
      const userId = userData.user?.id;

      const response = await api.get(`/advertising/serve?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.ad || null;
      }
    } catch (error) {
      console.error('Ошибка получения рекламы:', error);
    }
    return null;
  }, [isInitialized, isAuthenticated, token]);

  /**
   * Показ реклаы при 1 заходе
   */
  const showWelcomeAd = useCallback(async () => {
    // ИСПРАВЛЕНИЕ: Более строгая проверка
    if (!isInitialized || !isAuthenticated) {
      console.log('[Advertising] Авторизация не завершена, пропускаем приветственную рекламу');
      return;
    }
    
    // Проверяем флаг сессии и localStorage
    if (sessionWelcomeShown || getWelcomeAdShown()) return;
    
    const ad = await fetchAd();
    if (ad) {
      setCurrentAd(ad);
      setWelcomeAdShown();
      setSessionWelcomeShown(true);
    }
  }, [sessionWelcomeShown, fetchAd, isInitialized, isAuthenticated]);

  // Увеличить счетчик действий и показать рекламу если нужно
  const incrementActionCount = useCallback(async () => {
    const newCount = actionCount + 1;
    saveActionCount(newCount);

    // Показываем рекламу каждые 5 действий
    if (newCount % 5 === 0) {
      const ad = await fetchAd();
      if (ad) {
        setCurrentAd(ad);
      }
    }
  }, [actionCount, fetchAd]);

  // Трекинг показа рекламы
  const trackImpression = useCallback(async (adId: string) => {
    try {
      // ИСПРАВЛЕНИЕ: Более строгая проверка
      if (!isInitialized || !isAuthenticated) {
        console.log('[Advertising] Авторизация не завершена, пропускаем трекинг показа');
        return;
      }

      /**
       * Получаем данные юзера
       */
      const userResponse = await api.get('/me', {
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });
      
      if (!userResponse.ok) return;
      const userData = await userResponse.json();
      
      const userId = userData.user?.id;

      await api.post('/advertising/track/impression', {
        body: {
          campaignId: adId,
          userId: userId
        }
      },{
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
    } catch (error) {
      console.error('Ошибка трекинга показа:', error);
    }
  }, [isInitialized, isAuthenticated, token]);

  // Трекинг клика по рекламе
  const trackClick = useCallback(async (adId: string, url: string) => {
    try {
      // ИСПРАВЛЕНИЕ: Более строгая проверка
      if (!isInitialized || !isAuthenticated) {
        console.log('[Advertising] Авторизация не завершена, открываем ссылку без трекинга');
        window.open(url, '_blank');
        return;
      }

      // Получаем userId
      const userResponse = await api.get('/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!userResponse.ok) {
        window.open(url, '_blank');
        return;
      }
      
      const userData = await userResponse.json();
      const userId = userData.user?.id;

      await fetch(`${config.API_URL}/advertising/track/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          campaignId: adId,
          userId: userId
        })
      });

      // Открываем ссылку в новой вкладке
      window.open(url, '_blank');
    } catch (error) {
      console.error('Ошибка трекинга клика:', error);
      // Всё равно открываем ссылку
      window.open(url, '_blank');
    }
  }, [isInitialized, isAuthenticated, token]);

  // Закрыть текущую рекламу
  const closeAd = useCallback(() => {
    setCurrentAd(null);
  }, []);

  return {
    currentAd,
    showWelcomeAd,
    incrementActionCount,
    trackImpression,
    trackClick,
    closeAd
  };
}; 