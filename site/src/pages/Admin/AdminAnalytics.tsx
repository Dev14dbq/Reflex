import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUsers, FiActivity, FiUserCheck } from 'react-icons/fi';
import styles from './AdminPanel.module.scss';
import clsx from 'clsx';

import api from '@api';

interface AnalyticsSummary {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  totalLikes: number;
  totalMatches: number;
  totalMessages: number;
  reportsPending: number;
  reportsTotal: number;
  onlineUsers: number;
  profilesModeration: number;
}

export const AdminAnalytics: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      const response = await api.get(`/admin/analytics?range=${timeRange}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.summary) {
        setSummary(data.summary);
      } else {
        console.error('Analytics data format is incorrect:', data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка аналитики...</div>;
  }

  if (!summary) {
    return <div className={styles.error}>Не удалось загрузить данные аналитики.</div>;
  }

  return (
    <div className={styles.adminPage}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/admin')}>
          <FiArrowLeft size={24} />
        </button>
        <h1>Аналитика</h1>
      </div>

      <div className={styles.timeRangeButtons}>
        <button
          className={clsx(styles.timeButton, timeRange === 'day' && styles.active)}
          onClick={() => setTimeRange('day')}
        >
          День
        </button>
        <button
          className={clsx(styles.timeButton, timeRange === 'week' && styles.active)}
          onClick={() => setTimeRange('week')}
        >
          Неделя
        </button>
        <button
          className={clsx(styles.timeButton, timeRange === 'month' && styles.active)}
          onClick={() => setTimeRange('month')}
        >
          Месяц
        </button>
      </div>

      <div className={styles.analyticsSection}>
        <h2>
          <FiUsers size={20} />
          Пользователи
        </h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>Всего</h3>
            <p>{summary.totalUsers}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Новые</h3>
            <p>{summary.newUsers}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Активные</h3>
            <p>{summary.activeUsers}</p>
          </div>
           <div className={styles.statCard}>
            <h3>Онлайн</h3>
            <p>{summary.onlineUsers}</p>
          </div>
        </div>
      </div>

      <div className={styles.analyticsSection}>
        <h2>
          <FiActivity size={20} />
          Активность
        </h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>Лайки</h3>
            <p>{summary.totalLikes}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Мэтчи</h3>
            <p>{summary.totalMatches}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Сообщения</h3>
            <p>{summary.totalMessages}</p>
          </div>
        </div>
      </div>

      <div className={styles.analyticsSection}>
        <h2>
          <FiUserCheck size={20} />
          Модерация
        </h2>
        <div className={styles.statsGrid}>
           <div className={styles.statCard}>
            <h3>Профили на мод.</h3>
            <p>{summary.profilesModeration}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Жалобы (в ожидании)</h3>
            <p>{summary.reportsPending}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Жалобы (всего)</h3>
            <p>{summary.reportsTotal}</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 