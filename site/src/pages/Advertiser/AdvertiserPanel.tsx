import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiPlus, 
  FiList, 
  
} from 'react-icons/fi';
import styles from './AdvertiserPanel.module.scss';
import api from '@api';

interface Stats {
  totalCampaigns: number;
  activeCampaigns: number;
  pendingCampaigns?: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: string;
}

export const AdvertiserPanel: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalImpressions: 0,
    totalClicks: 0,
    averageCtr: '0.00'
  });
  const [loading, setLoading] = useState(true);
  const [canCreateCampaign, setCanCreateCampaign] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/advertising/stats', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      setStats(data);
      // Проверяем, есть ли уже кампания
      setCanCreateCampaign(data.totalCampaigns === 0);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = () => {
    if (!canCreateCampaign) {
      alert('Вы можете создать только одну рекламную кампанию');
      return;
    }
    navigate('/advertiser/create-campaign');
  };

  if (loading) {
    return (
      <div className={styles.advertiserPage}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={styles.advertiserPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate('/settings')} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <h1>Панель рекламодателя</h1>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>Всего кампаний</h3>
            <p>{stats.totalCampaigns}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Активных</h3>
            <p>{stats.activeCampaigns}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Показы</h3>
            <p>{stats.totalImpressions.toLocaleString()}</p>
          </div>
          <div className={styles.statCard}>
            <h3>CTR</h3>
            <p>{stats.averageCtr}%</p>
          </div>
        </div>

        <div className={styles.menuGrid}>
          <button 
            className={styles.menuCard}
            onClick={handleCreateCampaign}
            disabled={!canCreateCampaign}
            style={{ opacity: canCreateCampaign ? 1 : 0.5 }}
          >
            <div className={styles.menuIcon}>
              <FiPlus size={24} />
            </div>
            <div className={styles.menuContent}>
              <h3>Создать кампанию</h3>
              <p>{canCreateCampaign ? 'Создать новую рекламную кампанию' : 'У вас уже есть кампания'}</p>
            </div>
          </button>

          <button className={styles.menuCard} onClick={() => navigate('/advertiser/campaigns')}>
            <div className={styles.menuIcon}>
              <FiList size={24} />
            </div>
            <div className={styles.menuContent}>
              <h3>Моя кампания</h3>
              <p>Управление существующей кампанией</p>
            </div>
          </button>


        </div>
      </div>
    </div>
  );
}; 