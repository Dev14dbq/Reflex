import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiUsers, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiImage, 
  FiTrendingUp, 

  FiCalendar,
  FiActivity
} from 'react-icons/fi';
import styles from './ModerationStats.module.scss';
import api from '@api';

interface ModerationStatsData {
  complaints: {
    total: number;
    pending: number;
    resolved: number;
    resolutionRate: string;
  };
  profiles: {
    total: number;
    verified: number;
    flagged: number;
    verificationRate: string;
  };
  images: {
    total: number;
  };
  todayActions?: number;
  weeklyActions?: number[];
}

interface StatCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const ModerationStats: React.FC = () => {
  const [stats, setStats] = useState<ModerationStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/moderation/stats?range=${dateRange}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch moderation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatCards = (): StatCard[] => {
    if (!stats) return [];

    return [
      {
        title: 'Всего жалоб',
        value: stats.complaints.total,
        subtitle: 'Получено жалоб',
        icon: FiAlertTriangle,
        color: '#ff6b6b'
      },
      {
        title: 'На рассмотрении',
        value: stats.complaints.pending,
        subtitle: 'Ожидают решения',
        icon: FiCalendar,
        color: '#ffa502'
      },
      {
        title: 'Разрешено',
        value: stats.complaints.resolved,
        subtitle: `${stats.complaints.resolutionRate}% от общего`,
        icon: FiCheckCircle,
        color: '#2ed573'
      },
      {
        title: 'Всего профилей',
        value: stats.profiles.total,
        subtitle: 'Зарегистрировано',
        icon: FiUsers,
        color: '#4ecdc4'
      },
      {
        title: 'Верифицировано',
        value: stats.profiles.verified,
        subtitle: `${stats.profiles.verificationRate}% от общего`,
        icon: FiCheckCircle,
        color: '#45b7d1'
      },
      {
        title: 'Помечено',
        value: stats.profiles.flagged,
        subtitle: 'Требуют внимания',
        icon: FiAlertTriangle,
        color: '#ff4757'
      },
      {
        title: 'Всего изображений',
        value: stats.images.total,
        subtitle: 'Загружено',
        icon: FiImage,
        color: '#96ceb4'
      },
      {
        title: 'Действий сегодня',
        value: stats.todayActions || 0,
        subtitle: 'Модераторских действий',
        icon: FiActivity,
        color: '#feca57'
      }
    ];
  };

  const getEfficiencyMetrics = () => {
    if (!stats) return [];

    const resolutionRate = parseFloat(stats.complaints.resolutionRate);
    const verificationRate = parseFloat(stats.profiles.verificationRate);
    
    return [
      {
        title: 'Эффективность решения жалоб',
        value: `${resolutionRate}%`,
        status: resolutionRate >= 80 ? 'excellent' : resolutionRate >= 60 ? 'good' : 'needs-improvement'
      },
      {
        title: 'Покрытие верификации',
        value: `${verificationRate}%`,
        status: verificationRate >= 70 ? 'excellent' : verificationRate >= 50 ? 'good' : 'needs-improvement'
      },
      {
        title: 'Среднее время реакции',
        value: '2.4 часа',
        status: 'good'
      }
    ];
  };

  if (loading) {
    return (
      <div className={styles.statsPage}>
        <div className={styles.loading}>Загрузка статистики...</div>
      </div>
    );
  }

  return (
    <div className={styles.statsPage}>
      <div className={styles.header}>
        <button onClick={() => navigate('/moderation')} className={styles.backButton}>
          <FiArrowLeft size={20} />
        </button>
        <h1>Статистика модерации</h1>
        <div className={styles.dateRangeSelector}>
          <button
            className={`${styles.rangeButton} ${dateRange === 'today' ? styles.active : ''}`}
            onClick={() => setDateRange('today')}
          >
            Сегодня
          </button>
          <button
            className={`${styles.rangeButton} ${dateRange === 'week' ? styles.active : ''}`}
            onClick={() => setDateRange('week')}
          >
            Неделя
          </button>
          <button
            className={`${styles.rangeButton} ${dateRange === 'month' ? styles.active : ''}`}
            onClick={() => setDateRange('month')}
          >
            Месяц
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.statsGrid}>
          {getStatCards().map((card, index) => (
            <div key={index} className={styles.statCard} style={{ borderLeftColor: card.color }}>
              <div className={styles.statIcon} style={{ color: card.color }}>
                <card.icon size={24} />
              </div>
              <div className={styles.statContent}>
                <h3>{card.title}</h3>
                <div className={styles.statValue}>{card.value}</div>
                {card.subtitle && <p>{card.subtitle}</p>}
                {card.trend && (
                  <div className={`${styles.trend} ${card.trend.isPositive ? styles.positive : styles.negative}`}>
                    <FiTrendingUp size={14} />
                    {card.trend.value}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.efficiencySection}>
          <h2>Показатели эффективности</h2>
          <div className={styles.efficiencyGrid}>
            {getEfficiencyMetrics().map((metric, index) => (
              <div key={index} className={styles.efficiencyCard}>
                <div className={styles.efficiencyHeader}>
                  <span className={styles.efficiencyTitle}>{metric.title}</span>
                  <span className={`${styles.efficiencyStatus} ${styles[metric.status]}`}>
                    {metric.status === 'excellent' && '🔥'}
                    {metric.status === 'good' && '✅'}
                    {metric.status === 'needs-improvement' && '⚠️'}
                  </span>
                </div>
                <div className={styles.efficiencyValue}>{metric.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.actionButtons}>
          <button 
            onClick={() => navigate('/moderation/complaints')}
            className={styles.actionButton}
          >
            <FiAlertTriangle size={16} />
            Перейти к жалобам
          </button>
          <button 
            onClick={() => navigate('/moderation/profiles')}
            className={styles.actionButton}
          >
            <FiUsers size={16} />
            Модерация профилей
          </button>
          <button 
            onClick={() => navigate('/moderation/history')}
            className={styles.actionButton}
          >
            <FiActivity size={16} />
            История действий
          </button>
        </div>
      </div>
    </div>
  );
}; 