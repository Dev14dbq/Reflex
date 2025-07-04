import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSwipeable } from "react-swipeable";

import { config } from '@env';
import api from "@api";
import { 
  FiMapPin, 
  FiHeart, 
  FiX, 
  FiFlag, 
  FiLink, 
  FiUser,
  FiAlertCircle,

} from "react-icons/fi";
import { LoadingCard, ErrorCard } from "@components/ui";
import { useAdvertising } from "@hooks/useAdvertising";

type Profile = {
  id: string;
  userId: string;
  preferredName: string;
  description: string;
  city: string;
  goals: string[];
  birthYear: string;
  user: { username: string };
  images?: string[];
};

const COMPLAINT_REASONS = [
  "Спам",
  "Нецензурная лексика", 
  "Неподходящие фото",
  "Другая причина"
];

export const Search: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [idx, setIdx] = useState(0);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintReason, setComplaintReason] = useState("");
  const [otherReason, setOtherReason] = useState("");

  // Navigation controls state
  const [showNavControls, setShowNavControls] = useState(true);
  const navControlsTimeoutRef = useRef<NodeJS.Timeout>();
  const [isConnecting, setIsConnecting] = useState(true);

  // Swipe states
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'like' | 'dislike' | null>(null);

  const token = localStorage.getItem("token");
  const wsRef = useRef<WebSocket>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  
  // Инициализируем рекламу
  const { incrementActionCount } = useAdvertising();

  /** Расширенная обработка ошибок: none ‑ нет ошибки, connection ‑ проблемы сети, no-profiles ‑ закончились анкеты, technical ‑ сбой сервера */
  const [errorType, setErrorType] = useState<'none' | 'connection' | 'no-profiles' | 'technical'>('none');
  const errorTypeRef = useRef<'none' | 'connection' | 'no-profiles' | 'technical'>('none');
  useEffect(() => { errorTypeRef.current = errorType; }, [errorType]);

  // Функция для получения правильного сообщения об ошибке — объявляем ДО её первого использования
  const getErrorMessage = () => {
    switch (errorType) {
      case 'connection':
        return {
          title: 'Проблемы с подключением',
          description: 'Проверьте интернет-соединение и попробуйте снова',
          retryText: 'Переподключиться',
        } as const;
      case 'no-profiles':
        return {
          title: 'Нет новых анкет',
          description: 'Вы просмотрели все доступные анкеты. Загляните позже!',
          retryText: 'Проверить снова',
        } as const;
      case 'technical':
        return {
          title: 'Техническая ошибка',
          description: 'Что-то пошло не так на нашей стороне. Пожалуйста опробуйте позже!',
          retryText: 'Повторить',
        } as const;
      default:
        return {
          title: 'Загрузка...',
          description: 'Ищем интересных людей для вас',
          retryText: 'Обновить',
        } as const;
    }
  };

  // Функция для управления навигационными кнопками
  const showNavControlsWithTimer = useCallback(() => {
    setShowNavControls(true);
    
    // Очищаем предыдущий таймер
    if (navControlsTimeoutRef.current) {
      clearTimeout(navControlsTimeoutRef.current);
    }
    
    // Устанавливаем новый таймер на 5 секунд
    navControlsTimeoutRef.current = setTimeout(() => {
      setShowNavControls(false);
    }, 5000);
  }, []);

  // Функции навигации по изображениям (все хуки должны быть в начале)
  const navigateImage = useCallback((direction: 'prev' | 'next', imagesLength: number) => {
    if (imagesLength <= 1) return;
    
    if (direction === 'prev') {
      setIdx((prev) => (prev - 1 + imagesLength) % imagesLength);
    } else {
      setIdx((prev) => (prev + 1) % imagesLength);
    }
    
    // Увеличиваем счетчик действий при навигации по фото
    incrementActionCount();
    
    showNavControlsWithTimer();
  }, [idx, showNavControlsWithTimer, incrementActionCount]);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>, imagesLength: number) => {
    if (imagesLength <= 1) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const imageWidth = rect.width;
    
    // Определяем левую или правую половину
    if (clickX < imageWidth / 2) {
      // Левая половина - предыдущее изображение
      navigateImage('prev', imagesLength);
    } else {
      // Правая половина - следующее изображение  
      navigateImage('next', imagesLength);
    }
  }, [navigateImage]);

  const connectWebSocket = useCallback(() => {
    // Проверяем token перед созданием сокета
    if (!token) {
      setErrorType('technical');
      setIsConnecting(false);
      return;
    }

    // Отложенное создание сокета на 500мс для стабильности
    const timeoutId = setTimeout(() => {
    
    const ws = new WebSocket(`${config.WS_URL}/search?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnecting(false);
        setErrorType('none');
        reconnectAttemptsRef.current = 0; // Сбрасываем счетчик попыток
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
        if (data.type === "recommendation" && data.profile) {
          const newProfile = data.profile;
        setProfile(newProfile);
        // Reset image index, ensuring it's within bounds

          setIdx(0); // Всегда начинаем с первого изображения
        setSwipeX(0);
        setSwipeDirection(null);
          // Показываем навигационные кнопки при загрузке новой анкеты
          showNavControlsWithTimer();
        } else if (data.type === "no-more-profiles") {
          setProfile(null);
          setErrorType('no-profiles');
        } else if (data.type === "error") {
          setProfile(null);
          setErrorType('technical');
        } else {
          setProfile(null);
          setErrorType('technical');
      }
    };
    
            ws.onerror = () => {
        setProfile(null);
        setIsConnecting(false);
        if (errorTypeRef.current !== 'no-profiles') {
          setErrorType('connection');
        }
      };
    
      ws.onclose = (e) => {
        setProfile(null);
        setIsConnecting(false);
        
        // Определяем критические ошибки, которые не требуют реконнекта
        const criticalErrors = [1006, 1002, 1003]; // Invalid frame header, protocol error, unsupported data
        const isCriticalError = criticalErrors.includes(e.code);
        
        if (isCriticalError) {
          return; // НЕ пытаемся переподключаться при критических ошибках
        }
        
        // Автоматический реконнект с увеличивающейся задержкой только для некритических ошибок
        if (reconnectAttemptsRef.current < 3) { // Уменьшил до 3 попыток
          const delay = Math.min(2000 * Math.pow(2, reconnectAttemptsRef.current), 15000); // Увеличил задержку
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            setIsConnecting(true);
            connectWebSocket();
          }, delay);
        } else {
          if (errorTypeRef.current !== 'no-profiles') {
            setErrorType('connection');
          }
        }
      };
    }, 500);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [token]);

  useEffect(() => {
    const cleanup = connectWebSocket();
    
    return () => {
      cleanup?.();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (navControlsTimeoutRef.current) {
        clearTimeout(navControlsTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const sendReaction = (type: "like" | "dislike") => {
    if (!profile || !wsRef.current) {
      return;
    }
    
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      wsRef.current.send(JSON.stringify({ type, profileId: profile.id }));
      
      // Увеличиваем счетчик действий для показа рекламы
      incrementActionCount();
    } catch (error) {
    }
    
    // Animate out
    setSwipeDirection(type);
    setTimeout(() => {
      // НЕ сбрасываем профиль сразу - ждем новую анкету от сервера
      setSwipeX(0);
      setSwipeDirection(null);
    }, 300);
  };

  const handlers = useSwipeable({
    onSwiping: ({ deltaX, deltaY }) => {
      // Only handle horizontal swipes for reactions
      if (Math.abs(deltaY) < Math.abs(deltaX)) {
        setIsSwiping(true);
        setSwipeX(deltaX);
      }
    },
    onSwiped: ({ velocity, deltaX, deltaY }) => {
      // Prioritize vertical swipes for image navigation if we have multiple images
      if (hasRealImages && images.length > 1 && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
        if (deltaY < 0) {
          // Swipe up - next image
          setIdx((prev) => (prev + 1) % images.length);
        } else {
          // Swipe down - previous image  
          setIdx((prev) => (prev - 1 + images.length) % images.length);
        }
      } else if (Math.abs(swipeX) > 100 || velocity > 0.5) {
        // Horizontal swipe for reactions
        const type = swipeX > 0 ? "like" : "dislike";
        sendReaction(type);
      } else {
        setSwipeX(0);
      }
      setIsSwiping(false);
    },
    trackMouse: true
  });

  const copyLink = () => {
    if (!profile) return;
    const url = `${window.location.origin}/profile/${profile.id}`;
    navigator.clipboard.writeText(url);
    // Show success feedback
    const button = document.activeElement as HTMLElement;
    if (button) {
      button.style.transform = 'scale(0.95)';
      setTimeout(() => {
        button.style.transform = 'scale(1)';
      }, 150);
    }
  };

  const openComplaint = () => setComplaintOpen(true);
  
  const submitComplaint = async () => {
    const reason = complaintReason === "Другое..." ? otherReason : complaintReason;
    
    console.log('[SEARCH] Profile data:', profile);
    console.log('[SEARCH] Submitting complaint:', { userId: profile?.id, reason, type: 'search' });
    
    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/complaints', {
        userId: profile?.userId,
        reason: complaintReason,
        type: 'search'
      },{
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Жалоба отправлена. Модераторы рассмотрят её в ближайшее время.');
      } else {
        throw new Error(data.error || 'Failed to submit complaint');
      }
    } catch (error) {
      console.error(profile);
      alert('Ошибка при отправке жалобы. Попробуйте ещё раз.');
    }
    
    setComplaintOpen(false);
    setComplaintReason("");
    setOtherReason("");
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-6">
        <LoadingCard 
          title="Подключение..." 
          description="Ищем интересных людей для вас"
        />
      </div>
    );
  }

  if (!profile && errorType !== 'none') {
    const { title, description, retryText } = getErrorMessage();
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-6">
        <ErrorCard
          title={title}
          description={description}
          onRetry={() => {
            setErrorType('none');
            setIsConnecting(true);
            connectWebSocket();
          }}
          retryText={retryText}
        />
      </div>
    );
  }

  // Профиль ещё не получен, но ошибок тоже нет — показываем лоадер
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-6">
        <LoadingCard
          title="Загрузка анкет..."
          description="Ищем подходящих людей"
        />
      </div>
    );
  }

  // Обработка изображений с более надежной фильтрацией
  const images = profile?.images?.filter((img: string) => {
    return img && 
           img.trim() !== '' && 
           !img.includes('dicebear.com') && 
           !img.includes('placeholder') &&
           (img.startsWith('http') || img.startsWith('/'));
  }) || [];

  // Если нет реальных изображений, используем placeholder
  const hasRealImages = images.length > 0;
  const displayImages = hasRealImages 
    ? images 
    : [`https://api.dicebear.com/7.x/thumbs/svg?seed=${Math.floor(Math.random() * 1000000)}`];

  console.log("[UI] 🖼️ Изображения для отображения:", displayImages);
  console.log("[UI] 📍 Текущий индекс изображения:", idx);
  console.log("[UI] 🎯 hasRealImages:", hasRealImages);


  
  const age = new Date().getFullYear() - parseInt(profile.birthYear, 10);

  // Swipe feedback colors
  const getPageBackground = () => {
    if (!isSwiping && !swipeDirection) return '';
    
    const intensity = Math.min(Math.abs(swipeX) / 200, 0.15);
    const direction = swipeDirection || (swipeX > 0 ? 'like' : 'dislike');
    
    return direction === 'like' 
      ? `rgba(72, 187, 120, ${intensity})`
      : `rgba(245, 101, 101, ${intensity})`;
  };



  const getTransform = () => {
    if (swipeDirection) {
      return swipeDirection === 'like' 
        ? 'translateX(120%) rotate(20deg) scale(0.9)'
        : 'translateX(-120%) rotate(-20deg) scale(0.9)';
    }
    const rotation = Math.max(-15, Math.min(15, swipeX / 15));
    const scale = 1 - Math.abs(swipeX) / 1000;
    return `translateX(${swipeX}px) rotate(${rotation}deg) scale(${Math.max(0.85, scale)})`;
  };

      return (
      <div 
        className="overflow-y-auto bg-neu-bg-primary transition-all duration-200"
        style={{
          backgroundColor: getPageBackground() || undefined
        }}
      >
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col px-3 sm:px-4">
          {/* Profile Card */}
          <div className="relative flex-1 flex flex-col py-3 sm:py-4">
            <div
              className="neu-card overflow-hidden relative flex-1 flex flex-col"
              {...handlers}
              style={{
                transform: getTransform(),
                transition: isSwiping ? "none" : swipeDirection ? "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* Image Slider */}
              <div className="relative flex-1 overflow-hidden rounded-neu-lg mb-3 sm:mb-4 min-h-[400px] bg-neu-surface-subtle">
                {displayImages.length > 0 ? (
                  <>
                    {displayImages.map((img, i) => (
                      <div
                        key={i}
                        className={`absolute inset-0 transition-all duration-500 ${
                          i === idx ? "opacity-100 z-10" : "opacity-0 z-0"
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Фотография ${profile.preferredName}`}
                          className={`w-full h-full cursor-pointer ${
                            hasRealImages ? 'object-cover' : 'object-contain bg-gradient-to-br from-neu-accent-primary/20 to-neu-accent-secondary/20'
                        }`}
                          onClick={(e) => handleImageClick(e, displayImages.length)}
                          onMouseMove={showNavControlsWithTimer}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          }}
                      />
                    
                        {/* Hover zones для левой и правой половинки (только при множественных изображениях) */}
                        {displayImages.length > 1 && (
                      <>
                            <div 
                              className="absolute left-0 top-0 w-1/2 h-full cursor-w-resize opacity-0 hover:bg-gradient-to-r hover:from-black/10 hover:to-transparent transition-all duration-200 z-15"
                          onClick={(e) => {
                            e.stopPropagation();
                                navigateImage('prev', displayImages.length);
                          }}
                              onMouseEnter={showNavControlsWithTimer}
                              title="Предыдущее фото"
                            />
                            <div 
                              className="absolute right-0 top-0 w-1/2 h-full cursor-e-resize opacity-0 hover:bg-gradient-to-l hover:from-black/10 hover:to-transparent transition-all duration-200 z-15"
                          onClick={(e) => {
                            e.stopPropagation();
                                navigateImage('next', displayImages.length);
                          }}
                              onMouseEnter={showNavControlsWithTimer}
                              title="Следующее фото"
                            />
                      </>
                    )}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neu-accent-primary/20 to-neu-accent-secondary/20">
                    <div className="text-center">
                      <FiUser className="text-6xl text-neu-accent-primary/60 mx-auto mb-4" />
                      <p className="text-neu-text-secondary text-sm">Нет фотографий</p>
                    </div>
                  </div>
                )}
                
                {/* Navigation arrows with auto-hide */}
                {displayImages.length > 1 && (
                  <>
                    <button
                      className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-300 z-20 ${
                        showNavControls ? 'opacity-70 hover:opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateImage('prev', displayImages.length);
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-300 z-20 ${
                        showNavControls ? 'opacity-70 hover:opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateImage('next', displayImages.length);
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
                
                {/* Enhanced image indicators */}
                {displayImages.length > 1 && (
                  <div className="absolute top-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
                    {displayImages.map((_, i) => (
                      <button
                        key={i}
                        className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                          i === idx 
                            ? "bg-white shadow-lg w-6" 
                            : "bg-white/40 w-2 hover:bg-white/60"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIdx(i);
                        }}
                      />
                    ))}
                  </div>
                )}
                
                {/* Photo counter */}
                {displayImages.length > 1 && (
                  <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                    {idx + 1}/{displayImages.length}
                  </div>
                )}

              {/* Swipe indicators */}
              <div className="absolute inset-0 flex items-center justify-between px-4 sm:px-8 pointer-events-none">
                <div className={`transform transition-all duration-200 ${
                  swipeX > 50 ? 'scale-110 opacity-100' : 'scale-90 opacity-0'
                }`}>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-neu-success flex items-center justify-center">
                    <FiHeart className="text-white text-lg sm:text-2xl" />
                  </div>
                </div>
                <div className={`transform transition-all duration-200 ${
                  swipeX < -50 ? 'scale-110 opacity-100' : 'scale-90 opacity-0'
                }`}>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-neu-danger flex items-center justify-center">
                    <FiX className="text-white text-lg sm:text-2xl" />
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="p-3 sm:p-4">
              <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                <h2 className="text-xl sm:text-2xl font-bold neu-text-primary leading-tight">
                  {profile.preferredName}, {age}
                </h2>
                <div className="neu-surface-subtle p-1.5 sm:p-2 rounded-neu-sm flex items-center space-x-1 sm:space-x-2 flex-shrink-0 max-w-[45%]">
                  <FiMapPin className="text-neu-accent-primary text-sm sm:text-base flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold neu-text-primary truncate">
                    {profile.city}
                  </span>
                </div>
              </div>
              
              {/* Description */}
              <p className="neu-text-secondary leading-relaxed mb-4 sm:mb-6 text-sm sm:text-base">
                {profile.description}
              </p>
              
              {/* Goals */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                {profile.goals.map((goal) => (
                  <span
                    key={goal}
                    className="px-2 sm:px-3 py-1 neu-surface-subtle rounded-neu-sm text-xs sm:text-sm neu-text-secondary"
                  >
                    #{goal}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 sm:space-x-6">
                <button
                  onClick={() => sendReaction("dislike")}
                  className="neu-btn p-3 sm:p-4 rounded-neu-full bg-neu-danger/10 hover:bg-neu-danger/20 transition-colors duration-200 touch-manipulation"
                  title="Дизлайк"
                >
                  <FiX className="text-neu-danger text-lg sm:text-xl" />
                </button>
                <button
                  onClick={openComplaint}
                  className="neu-btn p-3 sm:p-4 rounded-neu-full hover:bg-neu-danger/10 transition-colors duration-200 touch-manipulation"
                  title="Пожаловаться"
                >
                  <FiFlag className="text-neu-danger text-lg sm:text-xl" />
                </button>
                <button
                  onClick={copyLink}
                  className="neu-btn p-3 sm:p-4 rounded-neu-full hover:bg-neu-accent-primary/10 transition-colors duration-200 touch-manipulation"
                  title="Скопировать ссылку"
                >
                  <FiLink className="text-neu-accent-primary text-lg sm:text-xl" />
                </button>
                <button
                  onClick={() => sendReaction("like")}
                  className="neu-btn p-3 sm:p-4 rounded-neu-full bg-neu-success/10 hover:bg-neu-success/20 transition-colors duration-200 touch-manipulation"
                  title="Лайк"
                >
                  <FiHeart className="text-neu-success text-lg sm:text-xl" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complaint Modal */}
      {complaintOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="neu-card max-w-sm w-full neu-animate-scale max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-neu-sm bg-neu-danger/20 flex-shrink-0">
                <FiAlertCircle className="text-neu-danger text-lg sm:text-xl" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold neu-text-primary">Пожаловаться</h3>
            </div>
            
            <div className="space-y-2 sm:space-y-3 mb-6">
              {COMPLAINT_REASONS.map((reason) => (
                <button
                  key={reason}
                  className={`w-full p-3 sm:p-4 rounded-neu-lg text-left transition-all duration-200 touch-manipulation ${
                    complaintReason === reason
                      ? "neu-surface-pressed bg-neu-danger/10"
                      : "neu-surface-hover"
                  }`}
                  onClick={() => setComplaintReason(reason)}
                >
                  <span className="neu-text-primary text-sm sm:text-base">{reason}</span>
                </button>
              ))}
            </div>

            {complaintReason === "Другое..." && (
              <div className="mb-4">
                <textarea
                  className="neu-input w-full min-h-[80px] sm:min-h-[100px] resize-none text-sm sm:text-base"
                  placeholder="Опишите проблему..."
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => {
                  setComplaintOpen(false);
                  setComplaintReason("");
                  setOtherReason("");
                }}
                className="neu-btn flex-1 py-3 sm:py-2 rounded-neu-md text-sm sm:text-base touch-manipulation"
              >
                Отмена
              </button>
              <button
                onClick={submitComplaint}
                disabled={!complaintReason || (complaintReason === "Другое..." && !otherReason.trim())}
                className="neu-btn-danger flex-1 py-3 sm:py-2 rounded-neu-md disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base touch-manipulation"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
