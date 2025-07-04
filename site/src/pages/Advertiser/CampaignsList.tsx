import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiPlay, 
  FiPause, 
  FiSquare, 
 
  FiBarChart2,
  FiEye,
  FiMousePointer
} from 'react-icons/fi';
import styles from './CampaignsList.module.scss';

import api from '@api';

interface Campaign {
  id: string;
  title: string;
  adTitle: string;
  adDescription: string;
  status: 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'rejected';
  impressions: number;
  clicks: number;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
  stats: {
    totalImpressions: number;
    totalClicks: number;
    ctr: string;
  };
}

export const CampaignsList: React.FC = () => {
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaign();
  }, []);

  const fetchCampaign = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/advertising/campaigns`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      // Берем первую кампанию (у нас только одна)
      setCampaign(data.campaigns?.[0] || null);
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (action: 'start' | 'pause' | 'stop') => {
    if (!campaign) return;

    try {
      const token = localStorage.getItem('token');
      const response = await api.post(`/api/advertising/campaigns/${campaign.id}/status`, {
        action
      },{
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchCampaign(); // Обновляем кампанию
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to update campaign status:', error);
      alert('Произошла ошибка при изменении статуса');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'paused': return '#FF9800';
      case 'completed': return '#757575';
      case 'rejected': return '#F44336';
      case 'pending': return '#2196F3';
      case 'draft': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активная';
      case 'paused': return 'На паузе';
      case 'completed': return 'Завершена';
      case 'rejected': return 'Отклонена';
      case 'pending': return 'На модерации';
      case 'draft': return 'Черновик';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className={styles.campaignsPage}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={styles.campaignsPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate('/advertiser')} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <h1>Моя кампания</h1>
        </div>
      </div>

      <div className={styles.content}>
        {!campaign ? (
          <div className={styles.empty}>
            <h2>У вас пока нет кампании</h2>
            <p>Создайте свою первую рекламную кампанию, чтобы начать продвижение</p>
            <button 
              onClick={() => navigate('/advertiser/create-campaign')}
              className={styles.createButton}
            >
              Создать кампанию
            </button>
          </div>
        ) : (
          <div className={styles.campaignCard}>
            <div className={styles.campaignHeader}>
              <div className={styles.campaignInfo}>
                <h2>{campaign.title}</h2>
                <h3>{campaign.adTitle}</h3>
                <p>{campaign.adDescription}</p>
                <div 
                  className={styles.status}
                  style={{ backgroundColor: getStatusColor(campaign.status) }}
                >
                  {getStatusText(campaign.status)}
                </div>
              </div>
            </div>

            <div className={styles.campaignStats}>
              <div className={styles.statItem}>
                <FiEye />
                <div>
                  <span className={styles.statValue}>{campaign.stats.totalImpressions.toLocaleString()}</span>
                  <span className={styles.statLabel}>Показы</span>
                </div>
              </div>
              <div className={styles.statItem}>
                <FiMousePointer />
                <div>
                  <span className={styles.statValue}>{campaign.stats.totalClicks.toLocaleString()}</span>
                  <span className={styles.statLabel}>Клики</span>
                </div>
              </div>
              <div className={styles.statItem}>
                <FiBarChart2 />
                <div>
                  <span className={styles.statValue}>{campaign.stats.ctr}%</span>
                  <span className={styles.statLabel}>CTR</span>
                </div>
              </div>
            </div>

            <div className={styles.campaignActions}>
              {campaign.status === 'draft' && (
                <button
                  onClick={() => handleStatusChange('start')}
                  className={styles.actionButton}
                  title="Запустить"
                >
                  <FiPlay size={16} />
                  Запустить
                </button>
              )}
              
              {campaign.status === 'active' && (
                <>
                  <button
                    onClick={() => handleStatusChange('pause')}
                    className={styles.actionButton}
                    title="Приостановить"
                  >
                    <FiPause size={16} />
                    Пауза
                  </button>
                  <button
                    onClick={() => handleStatusChange('stop')}
                    className={styles.actionButton}
                    title="Остановить"
                  >
                    <FiSquare size={16} />
                    Стоп
                  </button>
                </>
              )}
              
              {campaign.status === 'paused' && (
                <>
                  <button
                    onClick={() => handleStatusChange('start')}
                    className={styles.actionButton}
                    title="Возобновить"
                  >
                    <FiPlay size={16} />
                    Возобновить
                  </button>
                  <button
                    onClick={() => handleStatusChange('stop')}
                    className={styles.actionButton}
                    title="Остановить"
                  >
                    <FiSquare size={16} />
                    Стоп
                  </button>
                </>
              )}

              <button
                onClick={() => navigate(`/advertiser/campaigns/${campaign.id}/analytics`)}
                className={styles.analyticsButton}
              >
                <FiBarChart2 size={16} />
                Аналитика
              </button>
            </div>

            <div className={styles.campaignDates}>
              <div className={styles.dateInfo}>
                <span className={styles.dateLabel}>Создана:</span>
                <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
              </div>
              {campaign.startDate && (
                <div className={styles.dateInfo}>
                  <span className={styles.dateLabel}>Начало:</span>
                  <span>{new Date(campaign.startDate).toLocaleDateString()}</span>
                </div>
              )}
              {campaign.endDate && (
                <div className={styles.dateInfo}>
                  <span className={styles.dateLabel}>Окончание:</span>
                  <span>{new Date(campaign.endDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 