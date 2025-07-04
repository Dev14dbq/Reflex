import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiUserX, 
  FiMessageSquare, 
  FiCheckCircle,
  FiMapPin,
  FiUser,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import styles from './ModerationProfilesView.module.scss';

import api from '@api';

interface ProfileForModeration {
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
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    blocked: boolean;
    trustScore?: number;
    telegramId: string;
  };
}

export const ModerationProfilesView: React.FC = () => {
  const [profile, setProfile] = useState<ProfileForModeration | null>(null);
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
    fetchNextProfile();
  }, []);

  const fetchNextProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/moderation/profiles/next', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.profile) {
        setProfile(data.profile);
        setImageIndex(0);
        showNavControlsWithTimer();
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async () => {
    if (!profile || !banReason.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await api.post(`/moderation/users/${profile.user.id}/ban`, {
        reason: banReason
      },{
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      });
      
      setShowBanModal(false);
      setBanReason('');
      fetchNextProfile();
    } catch (error) {
      console.error('Failed to ban user:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!profile || !messageText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await api.post(`/moderation/users/${profile.user.id}/message`, {
        message: messageText
      },{
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      });
      
      setShowMessageModal(false);
      setMessageText('');
      // Не переходим к следующему профилю после отправки сообщения
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleApprove = async () => {
    if (!profile) return;

    try {
      const token = localStorage.getItem('token');
      await api.post(`/moderation/profiles/${profile.id}/verify`, {
        note: 'Профиль одобрен модератором'
      },{
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      });
      
      fetchNextProfile();
    } catch (error) {
      console.error('Failed to approve profile:', error);
    }
  };

  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    if (!profile?.images || profile.images.length <= 1) return;
    
    if (direction === 'prev') {
      setImageIndex((prev) => (prev - 1 + profile.images!.length) % profile.images!.length);
    } else {
      setImageIndex((prev) => (prev + 1) % profile.images!.length);
    }
    
    showNavControlsWithTimer();
  }, [profile, showNavControlsWithTimer]);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!profile?.images || profile.images.length <= 1) return;
    
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
            <button onClick={() => navigate('/moderation')} className={styles.backButton}>
              <FiArrowLeft size={20} />
            </button>
            <h1>Модерация профилей</h1>
          </div>
        </div>
        <div className={styles.loading}>Загрузка профиля...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.moderationPage}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <button onClick={() => navigate('/moderation')} className={styles.backButton}>
              <FiArrowLeft size={20} />
            </button>
            <h1>Модерация профилей</h1>
          </div>
        </div>
        <div className={styles.noProfiles}>
          <h2>Нет профилей для модерации</h2>
          <p>Все профили уже промодерированы</p>
          <button onClick={() => navigate('/moderation')} className={styles.backToPanel}>
            Вернуться к панели
          </button>
        </div>
      </div>
    );
  }

  const realImages = profile.images?.filter(img => img && !img.includes('dicebear.com')) || [];
  const currentImage = realImages[imageIndex] || null;

  return (
    <div className={styles.moderationPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate('/moderation')} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <h1>Модерация профилей</h1>
        </div>
      </div>

      <div className={styles.profileContainer}>
        <div className={styles.profileCard}>
          {/* Изображение профиля */}
          <div className={styles.imageContainer}>
            {currentImage ? (
              <>
                <img 
                  src={currentImage} 
                  alt={profile.preferredName}
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

          {/* Информация о профиле */}
          <div className={styles.profileInfo}>
            <div className={styles.profileHeader}>
              <h2>{profile.preferredName}, {new Date().getFullYear() - profile.birthYear}</h2>
              <div className={styles.profileMeta}>
                <span className={styles.location}>
                  <FiMapPin size={14} />
                  {profile.city}
                </span>
                {profile.user.trustScore && (
                  <span 
                    className={styles.trustScore}
                    style={{ color: getTrustScoreColor(profile.user.trustScore) }}
                  >
                    Доверие: {profile.user.trustScore}%
                  </span>
                )}
              </div>
            </div>

            <div className={styles.goals}>
              {profile.goals.map((goal, index) => (
                <span key={index} className={styles.goalTag}>
                  {getGoalEmoji(goal)} {goal}
                </span>
              ))}
            </div>

            {profile.description && (
              <div className={styles.description}>
                <p>{profile.description}</p>
              </div>
            )}

            <div className={styles.userInfo}>
              <p><strong>Пользователь:</strong> {profile.user.username || 'Без username'}</p>
              <p><strong>Telegram ID:</strong> {profile.user.telegramId}</p>
              <p><strong>Создан:</strong> {new Date(profile.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className={styles.actionButtons}>
            <button 
              className={`${styles.actionButton} ${styles.banButton}`}
              onClick={() => setShowBanModal(true)}
            >
              <FiUserX size={20} />
              Бан
            </button>
            
            <button 
              className={`${styles.actionButton} ${styles.messageButton}`}
              onClick={() => setShowMessageModal(true)}
            >
              <FiMessageSquare size={20} />
              Написать
            </button>
            
            <button 
              className={`${styles.actionButton} ${styles.approveButton}`}
              onClick={handleApprove}
            >
              <FiCheckCircle size={20} />
              Приемлемо
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно бана */}
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