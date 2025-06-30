import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiMessageSquare, FiAlertCircle, FiBarChart2, FiArrowLeft, FiTarget } from 'react-icons/fi';
import styles from './AdminPanel.module.scss';

interface AdminAnalyticsSummary {
  totalUsers: number;
  activeUsers: number;
  reportsTotal: number;
  profilesModeration: number;
}

export const AdminPanel: React.FC = () => {
  const [stats, setStats] = useState<AdminAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://spectrmod.ru/api/admin/analytics', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setStats(data.summary);
      } catch (error) {
        console.error('Failed to fetch admin analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const menuItems = [
    {
      icon: <FiUsers size={24} />,
      title: 'Пользователи',
      description: 'Управление пользователями',
      path: '/admin/users'
    },
    {
      icon: <FiMessageSquare size={24} />,
      title: 'Новости',
      description: 'Управление новостями',
      path: '/admin/news'
    },
    {
      icon: <FiAlertCircle size={24} />,
      title: 'Модерация',
      description: 'Жалобы и проверка контента',
      path: '/admin/moderation'
    },
    {
      icon: <FiTarget size={24} />,
      title: 'Реклама',
      description: 'Модерация рекламных кампаний',
      path: '/admin/advertisement'
    },
    {
      icon: <FiBarChart2 size={24} />,
      title: 'Статистика',
      description: 'Аналитика платформы',
      path: '/admin/analytics'
    }
  ];

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.adminPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate('/settings')} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <h1>Панель администратора</h1>
        </div>
      </div>
      <div className={styles.content}>
        {stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>Всего пользователей</h3>
              <p>{stats.totalUsers}</p>
            </div>
            <div className={styles.statCard}>
              <h3>Активных за 24ч</h3>
              <p>{stats.activeUsers}</p>
            </div>
            <div className={styles.statCard}>
              <h3>Жалоб (неделя)</h3>
              <p>{stats.reportsTotal}</p>
            </div>
            <div className={styles.statCard}>
              <h3>На модерации</h3>
              <p>{stats.profilesModeration}</p>
            </div>
          </div>
        )}

        <div className={styles.menuGrid}>
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={styles.menuCard}
              onClick={() => navigate(item.path)}
            >
              <div className={styles.menuIcon}>{item.icon}</div>
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