import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
 
  FiMessageSquare, 
  FiUsers, 
  FiImage, 
  FiBarChart, 
  FiFileText, 
  FiAlertTriangle,

  FiArrowLeft
} from 'react-icons/fi';
import styles from './ModerationPanel.module.scss';

interface ModerationStats {
  pendingComplaints: number;
  profilesForReview: number;
  flaggedImages: number;
  todayActions: number;
}

export const ModerationPanel: React.FC = () => {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://spectrmod.ru/api/moderation/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch moderation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      title: 'Жалобы',
      description: 'Обработка жалоб пользователей',
      icon: FiAlertTriangle,
      path: '/moderation/complaints',
      badge: stats?.pendingComplaints || 0,
      color: '#ff6b6b'
    },
    {
      title: 'Профили',
      description: 'Модерация профилей пользователей',
      icon: FiUsers,
      path: '/moderation/profiles/view',
      badge: stats?.profilesForReview || 0,
      color: '#4ecdc4'
    },
    {
      title: 'Изображения',
      description: 'Проверка загруженных изображений',
      icon: FiImage,
      path: '/moderation/images',
      badge: stats?.flaggedImages || 0,
      color: '#45b7d1'
    },
    {
      title: 'Статистика',
      description: 'Статистика модерации',
      icon: FiBarChart,
      path: '/moderation/stats',
      color: '#96ceb4'
    },
    {
      title: 'Чаты модераторов',
      description: 'Переписка от лица модератора',
      icon: FiMessageSquare,
      path: '/moderation/chats',
      color: '#feca57'
    },
    {
      title: 'История действий',
      description: 'Журнал модераторских действий',
      icon: FiFileText,
      path: '/moderation/history',
      color: '#ff9ff3'
    }
  ];

  if (loading) {
    return (
      <div className={styles.moderationPage}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={styles.moderationPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate('/')} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <h1>Панель модератора</h1>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>Ожидают обработки</h3>
            <div className={styles.statValue}>{stats?.pendingComplaints || 0}</div>
            <p>жалоб</p>
          </div>
          <div className={styles.statCard}>
            <h3>На модерации</h3>
            <div className={styles.statValue}>{stats?.profilesForReview || 0}</div>
            <p>профилей</p>
          </div>
          <div className={styles.statCard}>
            <h3>Помечено</h3>
            <div className={styles.statValue}>{stats?.flaggedImages || 0}</div>
            <p>изображений</p>
          </div>
          <div className={styles.statCard}>
            <h3>Сегодня</h3>
            <div className={styles.statValue}>{stats?.todayActions || 0}</div>
            <p>действий</p>
          </div>
        </div>

        <div className={styles.menuGrid}>
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={styles.menuCard}
              onClick={() => navigate(item.path)}
            >
              <div className={styles.menuIcon}>
                <item.icon size={24} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={styles.badge}>{item.badge}</span>
                )}
              </div>
              <div className={styles.menuContent}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}; 