import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiUserX, 
  FiMessageSquare, 
  FiCheckCircle,
  FiMapPin,
  FiUser,
  FiChevronLeft,
  FiChevronRight,

} from 'react-icons/fi';
import styles from './ModerationUserView.module.scss';

interface UserForModeration {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  blocked: boolean;
  trustScore?: number;
  telegramId: string;
  profile?: {
    id: string;
    preferredName: string;
    gender: string;
    birthYear: number;
    city: string;
    goals: string[];
    description: string;
    isVerified: boolean;
    isFlagged: boolean;
    createdAt: string;
    images?: string[];
  };
}

export const ModerationUserView: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserForModeration | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [banReason, setBanReason] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const navigate = useNavigate();

  // Navigation controls state
  const [showNavControls, setShowNavControls] = useState(true);
  const navControlsTimeoutRef = useRef<NodeJS.Timeout>();

  const showNavControlsWithTimer = useCallback(() => {
    setShowNavControls(true);
    
    if (navControlsTimeoutRef.current) {
      clearTimeout(navControlsTimeoutRef.current);
    }
    
    navControlsTimeoutRef.current = setTimeout(() => {
      setShowNavControls(false);
    }, 5000);
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://spectrmod.ru/api/moderation/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
        setImageIndex(0);
        showNavControlsWithTimer();
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async () => {
    if (!user || !banReason.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`https://spectrmod.ru/api/moderation/users/${user.id}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: banReason }),
      });
      
      setShowBanModal(false);
      setBanReason('');
      // Обновляем информацию о пользователе
      fetchUser();
    } catch (error) {
      console.error('Failed to ban user:', error);
    }
  };

  const handleUnban = async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`https://spectrmod.ru/api/moderation/users/${user.id}/unban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Обновляем информацию о пользователе
      fetchUser();
    } catch (error) {
      console.error('Failed to unban user:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !messageText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`https://spectrmod.ru/api/moderation/users/${user.id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: messageText }),
      });
      
      setShowMessageModal(false);
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleVerifyProfile = async () => {
    if (!user?.profile) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`https://spectrmod.ru/api/moderation/profiles/${user.profile.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: 'Профиль одобрен модератором' }),
      });
      
      fetchUser();
    } catch (error) {
      console.error('Failed to verify profile:', error);
    }
  };

  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    if (!user?.profile?.images || user.profile.images.length <= 1) return;
    
    if (direction === 'prev') {
      setImageIndex((prev) => (prev - 1 + user.profile!.images!.length) % user.profile!.images!.length);
    } else {
      setImageIndex((prev) => (prev + 1) % user.profile!.images!.length);
    }
    
    showNavControlsWithTimer();
  }, [user, showNavControlsWithTimer]);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!user?.profile?.images || user.profile.images.length <= 1) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const imageWidth = rect.width;
    
    if (clickX < imageWidth / 2) {
      navigateImage('prev');
    } else {
      navigateImage('next');
    }
  }, [navigateImage]);

  const getGoalEmoji = (goal: string) => {
    const goalMap: { [key: string]: string } = {
      'секс': '🔥',
      'обмен фото': '📸',
      'отношения на расстоянии': '💕',
      'отношения локально': '❤️',
      'общение': '💬'
    };
    return goalMap[goal.toLowerCase()] || '💫';
  };

  const getTrustScoreColor = (score?: number) => {
    if (!score) return 'var(--neu-text-secondary)';
    if (score >= 80) return '#2ed573';
    if (score >= 60) return '#feca57';
    return '#ff4757';
  };

  if (loading) {
    return (
      <div className={styles.moderationPage}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <button onClick={() => navigate(-1)} className={styles.backButton}>
              <FiArrowLeft size={20} />
            </button>
            <h1>Просмотр пользователя</h1>
          </div>
        </div>
        <div className={styles.loading}>Загрузка пользователя...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.moderationPage}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <button onClick={() => navigate(-1)} className={styles.backButton}>
              <FiArrowLeft size={20} />
            </button>
            <h1>Просмотр пользователя</h1>
          </div>
        </div>
        <div className={styles.noUser}>
          <h2>Пользователь не найден</h2>
          <button onClick={() => navigate(-1)} className={styles.backToPanel}>
            Назад
          </button>
        </div>
      </div>
    );
  }

  const realImages = user.profile?.images?.filter(img => img && !img.includes('dicebear.com')) || [];
  const currentImage = realImages[imageIndex] || null;

  return (
    <div className={styles.moderationPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <h1>Просмотр пользователя</h1>
        </div>
      </div>

      <div className={styles.userContainer}>
        <div className={styles.userCard}>
          {/* Изображение профиля */}
          {user.profile && (
            <div className={styles.imageContainer}>
              {currentImage ? (
                <>
                  <img 
                    src={currentImage} 
                    alt={user.profile.preferredName}
                    onClick={handleImageClick}
                    className={styles.profileImage}
                  />
                  
                  {/* Навигация по изображениям */}
                  {realImages.length > 1 && showNavControls && (
                    <>
                      <button 
                        className={`${styles.navButton} ${styles.prevButton}`}
                        onClick={() => navigateImage('prev')}
                      >
                        <FiChevronLeft size={24} />
                      </button>
                      <button 
                        className={`${styles.navButton} ${styles.nextButton}`}
                        onClick={() => navigateImage('next')}
                      >
                        <FiChevronRight size={24} />
                      </button>
                    </>
                  )}

                  {/* Индикаторы изображений */}
                  {realImages.length > 1 && (
                    <div className={styles.imageIndicators}>
                      {realImages.map((_, index) => (
                        <div
                          key={index}
                          className={`${styles.indicator} ${index === imageIndex ? styles.active : ''}`}
                          onClick={() => setImageIndex(index)}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.noImage}>
                  <FiUser size={64} />
                  <p>Нет фото</p>
                </div>
              )}
            </div>
          )}

          {/* Информация о пользователе */}
          <div className={styles.userInfo}>
            <div className={styles.userHeader}>
              <h2>
                {user.profile?.preferredName || user.firstName || user.username || 'Без имени'}
                {user.profile && `, ${new Date().getFullYear() - user.profile.birthYear}`}
                {user.blocked && <span className={styles.blockedBadge}>ЗАБЛОКИРОВАН</span>}
              </h2>
              <div className={styles.userMeta}>
                {user.profile?.city && (
                  <span className={styles.location}>
                    <FiMapPin size={14} />
                    {user.profile.city}
                  </span>
                )}
                {user.trustScore && (
                  <span 
                    className={styles.trustScore}
                    style={{ color: getTrustScoreColor(user.trustScore) }}
                  >
                    Доверие: {user.trustScore}%
                  </span>
                )}
              </div>
            </div>

            {user.profile?.goals && (
              <div className={styles.goals}>
                {user.profile.goals.map((goal, index) => (
                  <span key={index} className={styles.goalTag}>
                    {getGoalEmoji(goal)} {goal}
                  </span>
                ))}
              </div>
            )}

            {user.profile?.description && (
              <div className={styles.description}>
                <p>{user.profile.description}</p>
              </div>
            )}

            <div className={styles.technicalInfo}>
              <p><strong>ID пользователя:</strong> {user.id}</p>
              <p><strong>Username:</strong> {user.username || 'Нет'}</p>
              <p><strong>Telegram ID:</strong> {user.telegramId}</p>
              {user.profile && (
                <>
                  <p><strong>Профиль создан:</strong> {new Date(user.profile.createdAt).toLocaleDateString()}</p>
                  <p><strong>Верифицирован:</strong> {user.profile.isVerified ? 'Да' : 'Нет'}</p>
                  <p><strong>Помечен:</strong> {user.profile.isFlagged ? 'Да' : 'Нет'}</p>
                </>
              )}
            </div>
          </div>

          {/* Кнопки действий */}
          <div className={styles.actionButtons}>
            {user.blocked ? (
              <button 
                className={`${styles.actionButton} ${styles.unbanButton}`}
                onClick={handleUnban}
              >
                <FiCheckCircle size={20} />
                Разблокировать
              </button>
            ) : (
              <button 
                className={`${styles.actionButton} ${styles.banButton}`}
                onClick={() => setShowBanModal(true)}
              >
                <FiUserX size={20} />
                Заблокировать
              </button>
            )}
            
            <button 
              className={`${styles.actionButton} ${styles.messageButton}`}
              onClick={() => setShowMessageModal(true)}
            >
              <FiMessageSquare size={20} />
              Написать
            </button>
            
            {user.profile && !user.profile.isVerified && (
              <button 
                className={`${styles.actionButton} ${styles.approveButton}`}
                onClick={handleVerifyProfile}
              >
                <FiCheckCircle size={20} />
                Верифицировать
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно блокировки */}
      {showBanModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Заблокировать пользователя</h3>
            <textarea
              placeholder="Укажите причину блокировки..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className={styles.modalTextarea}
              rows={4}
            />
            <div className={styles.modalButtons}>
              <button 
                onClick={() => setShowBanModal(false)}
                className={styles.cancelButton}
              >
                Отмена
              </button>
              <button 
                onClick={handleBan}
                className={styles.confirmButton}
                disabled={!banReason.trim()}
              >
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно сообщения */}
      {showMessageModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Отправить сообщение</h3>
            <textarea
              placeholder="Введите сообщение от лица модератора..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className={styles.modalTextarea}
              rows={4}
            />
            <div className={styles.modalButtons}>
              <button 
                onClick={() => setShowMessageModal(false)}
                className={styles.cancelButton}
              >
                Отмена
              </button>
              <button 
                onClick={handleSendMessage}
                className={styles.confirmButton}
                disabled={!messageText.trim()}
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