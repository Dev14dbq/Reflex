import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiCheck, 
  FiX, 
  FiEye, 
  FiUser, 
  FiCalendar,
  FiTarget,
  FiExternalLink
} from 'react-icons/fi';
import styles from './AdminPanel.module.scss';
import moderationStyles from './AdminAdvertisement.module.scss';

import api from '@api';

interface Campaign {
  id: string;
  title: string;
  adTitle: string;
  adDescription: string;
  adImageUrl: string;
  buttonText: string;
  buttonUrl: string;
  targetAgeMin: number;
  targetAgeMax: number;
  targetGenders: string[];
  targetCities: string[];
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  advertiser: {
    id: string;
    firstName: string;
    lastName: string;
    profile?: {
      city: string;
    };
  };
}

export const AdminAdvertisement: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [moderationComment, setModerationComment] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/advertising/admin/campaigns', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const moderateCampaign = async (campaignId: string, action: 'approve' | 'reject') => {
    if (!moderationComment.trim() && action === 'reject') {
      alert('Укажите причину отклонения');
      return;
    }

    setProcessingId(campaignId);
    try {
      const token = localStorage.getItem('token');
      const response = await api.post(`/advertising/admin/campaigns/${campaignId}/moderate`, {
        action,
        comment: moderationComment.trim() || null
      },{
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchCampaigns();
        setSelectedCampaign(null);
        setModerationComment('');
        alert(action === 'approve' ? 'Кампания одобрена' : 'Кампания отклонена');
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to moderate campaign:', error);
      alert('Произошла ошибка при модерации');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      case 'active': return '#007bff';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'На модерации';
      case 'approved': return 'Одобрено';
      case 'rejected': return 'Отклонено';
      case 'active': return 'Активно';
      case 'paused': return 'Приостановлено';
      case 'completed': return 'Завершено';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseTargetArea = (cities: string[]) => {
    if (cities.length === 0) return 'Не указано';
    
    if (cities.length === 1 && cities[0].includes(',')) {
      const [lat, lng, radius] = cities[0].split(',');
      return `Область: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)} (${radius} км)`;
    }
    
    return cities.join(', ');
  };

  const pendingCampaigns = campaigns.filter(c => c.status === 'pending');

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.adminPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate('/admin')} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <h1>Модерация рекламы</h1>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>На модерации</h3>
            <p style={{ color: '#ffc107' }}>{pendingCampaigns.length}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Всего кампаний</h3>
            <p>{campaigns.length}</p>
          </div>
        </div>

        <div className={moderationStyles.campaignsList}>
          {pendingCampaigns.length === 0 ? (
            <div className={moderationStyles.emptyState}>
              <p>Нет кампаний на модерации</p>
            </div>
          ) : (
            pendingCampaigns.map((campaign) => (
              <div key={campaign.id} className={moderationStyles.campaignCard}>
                <div className={moderationStyles.campaignHeader}>
                  <div className={moderationStyles.campaignInfo}>
                    <h3>{campaign.title}</h3>
                    <div className={moderationStyles.campaignMeta}>
                      <span className={moderationStyles.advertiser}>
                        <FiUser size={14} />
                        {campaign.advertiser.firstName} {campaign.advertiser.lastName}
                      </span>
                      <span className={moderationStyles.date}>
                        <FiCalendar size={14} />
                        {formatDate(campaign.createdAt)}
                      </span>
                    </div>
                  </div>
                  <span 
                    className={moderationStyles.statusBadge}
                    style={{ backgroundColor: getStatusColor(campaign.status) }}
                  >
                    {getStatusText(campaign.status)}
                  </span>
                </div>

                <div className={moderationStyles.campaignContent}>
                  <div className={moderationStyles.adPreview}>
                    {campaign.adImageUrl && (
                      <div className={moderationStyles.adImage}>
                        <img src={campaign.adImageUrl} alt="Изображение рекламы" />
                      </div>
                    )}
                    <div className={moderationStyles.adText}>
                      <h4>{campaign.adTitle}</h4>
                      <p>{campaign.adDescription}</p>
                      <a href={campaign.buttonUrl} target="_blank" rel="noopener noreferrer" className={moderationStyles.adButton}>
                        <FiExternalLink size={14} />
                        {campaign.buttonText}
                      </a>
                    </div>
                  </div>

                  <div className={moderationStyles.targeting}>
                    <h5><FiTarget size={16} /> Таргетинг:</h5>
                    <div className={moderationStyles.targetingInfo}>
                      <span>Возраст: {campaign.targetAgeMin}-{campaign.targetAgeMax} лет</span>
                      <span>Гендер: {campaign.targetGenders.length > 0 ? campaign.targetGenders.join(', ') : 'Все'}</span>
                      <span>Область: {parseTargetArea(campaign.targetCities)}</span>
                    </div>
                  </div>
                </div>

                <div className={moderationStyles.moderationActions}>
                  <button
                    className={moderationStyles.approveButton}
                    onClick={() => moderateCampaign(campaign.id, 'approve')}
                    disabled={processingId === campaign.id}
                  >
                    <FiCheck size={16} />
                    Одобрить
                  </button>
                  <button
                    className={moderationStyles.rejectButton}
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    <FiX size={16} />
                    Отклонить
                  </button>
                </div>
                <div className={moderationStyles.moderationActions}>

                <button
                    className={moderationStyles.viewButton}
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    <FiEye size={16} />
                    Подробнее
                  </button>
                </div>
                </div>
            ))
          )}
        </div>
      </div>

      {selectedCampaign && (
        <div className={moderationStyles.modal}>
          <div className={moderationStyles.modalContent}>
            <div className={moderationStyles.modalHeader}>
              <h2>Модерация кампании</h2>
              <button onClick={() => setSelectedCampaign(null)} className={moderationStyles.closeButton}>
                ×
              </button>
            </div>

            <div className={moderationStyles.modalBody}>
              <div className={moderationStyles.campaignDetails}>
                <h3>{selectedCampaign.title}</h3>
                <p><strong>Рекламодатель:</strong> {selectedCampaign.advertiser.firstName} {selectedCampaign.advertiser.lastName}</p>
                <p><strong>Дата создания:</strong> {formatDate(selectedCampaign.createdAt)}</p>
                
                <div className={moderationStyles.adFullPreview}>
                  {selectedCampaign.adImageUrl && (
                    <img src={selectedCampaign.adImageUrl} alt="Реклама" />
                  )}
                  <h4>{selectedCampaign.adTitle}</h4>
                  <p>{selectedCampaign.adDescription}</p>
                  <a href={selectedCampaign.buttonUrl} target="_blank" rel="noopener noreferrer">
                    {selectedCampaign.buttonText}
                  </a>
                </div>

                <div className={moderationStyles.fullTargeting}>
                  <h4>Параметры таргетинга:</h4>
                  <ul>
                    <li>Возраст: {selectedCampaign.targetAgeMin}-{selectedCampaign.targetAgeMax} лет</li>
                    <li>Гендер: {selectedCampaign.targetGenders.length > 0 ? selectedCampaign.targetGenders.join(', ') : 'Все'}</li>
                    <li>Область показа: {parseTargetArea(selectedCampaign.targetCities)}</li>
                    <li>Период показа: {formatDate(selectedCampaign.startDate)} - {formatDate(selectedCampaign.endDate)}</li>
                  </ul>
                </div>
              </div>

              <div className={moderationStyles.moderationForm}>
                <h4>Решение по модерации:</h4>
                <textarea
                  value={moderationComment}
                  onChange={(e) => setModerationComment(e.target.value)}
                  placeholder="Комментарий (обязательно при отклонении)"
                  className={moderationStyles.commentTextarea}
                />
                
                <div className={moderationStyles.modalActions}>
                  <button
                    className={moderationStyles.approveButton}
                    onClick={() => moderateCampaign(selectedCampaign.id, 'approve')}
                    disabled={processingId === selectedCampaign.id}
                  >
                    <FiCheck size={16} />
                    Одобрить
                  </button>
                  <button
                    className={moderationStyles.rejectButton}
                    onClick={() => moderateCampaign(selectedCampaign.id, 'reject')}
                    disabled={processingId === selectedCampaign.id}
                  >
                    <FiX size={16} />
                    Отклонить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 