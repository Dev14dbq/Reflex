import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiEye, FiMousePointer, FiTrendingUp, FiCalendar } from 'react-icons/fi';
import styles from './CampaignAnalytics.module.scss';

interface DailyStat {
  date: string;
  impressions: number;
  clicks: number;
  uniqueViews: number;
  ctr: string;
}

interface CampaignAnalytics {
  dailyStats: DailyStat[];
  summary: {
    totalImpressions: number;
    totalClicks: number;
    totalUniqueViews: number;
    averageCtr: string;
  };
}

interface Campaign {
  id: string;
  title: string;
  adTitle: string;
  status: string;
  createdAt: string;
}

export const CampaignAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    if (campaignId) {
      fetchCampaignDetails();
      fetchAnalytics();
    }
  }, [campaignId, period]);

  const fetchCampaignDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://spectrmod.ru/api/advertising/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCampaign(data);
      }
    } catch (error) {
      console.error('Failed to fetch campaign details:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://spectrmod.ru/api/advertising/campaigns/${campaignId}/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMaxValue = () => {
    if (!analytics?.dailyStats) return 0;
    return Math.max(...analytics.dailyStats.map(stat => Math.max(stat.impressions, stat.clicks * 10)));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className={styles.analyticsPage}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (!campaign || !analytics) {
    return (
      <div className={styles.analyticsPage}>
        <div className={styles.error}>Кампания не найдена</div>
      </div>
    );
  }

  const maxValue = getMaxValue();

  return (
    <div className={styles.analyticsPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate('/advertiser/campaigns')} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <div className={styles.campaignInfo}>
            <h1>{campaign.title}</h1>
            <p>{campaign.adTitle}</p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.controls}>
          <div className={styles.periodSelector}>
            <FiCalendar size={16} />
            <select 
              value={period} 
              onChange={(e) => setPeriod(e.target.value)}
              className={styles.periodSelect}
            >
              <option value="7d">7 дней</option>
              <option value="30d">30 дней</option>
              <option value="90d">90 дней</option>
            </select>
          </div>
        </div>

        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <div className={styles.cardIcon}>
              <FiEye size={24} />
            </div>
            <div className={styles.cardContent}>
              <h3>Показы</h3>
              <div className={styles.cardValue}>
                {analytics.summary.totalImpressions.toLocaleString()}
              </div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.cardIcon}>
              <FiMousePointer size={24} />
            </div>
            <div className={styles.cardContent}>
              <h3>Клики</h3>
              <div className={styles.cardValue}>
                {analytics.summary.totalClicks.toLocaleString()}
              </div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.cardIcon}>
              <FiTrendingUp size={24} />
            </div>
            <div className={styles.cardContent}>
              <h3>CTR</h3>
              <div className={styles.cardValue}>
                {analytics.summary.averageCtr}%
              </div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.cardIcon}>
              <FiEye size={24} />
            </div>
            <div className={styles.cardContent}>
              <h3>Уникальные просмотры</h3>
              <div className={styles.cardValue}>
                {analytics.summary.totalUniqueViews.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.chartSection}>
          <h2>Динамика показов и кликов</h2>
          <div className={styles.chart}>
            <div className={styles.chartGrid}>
              {analytics.dailyStats.map((stat) => (
                <div key={stat.date} className={styles.chartBar}>
                  <div className={styles.barGroup}>
                    <div 
                      className={styles.impressionsBar}
                      style={{ 
                        height: `${(stat.impressions / maxValue) * 100}%`,
                        minHeight: stat.impressions > 0 ? '4px' : '0'
                      }}
                      title={`Показы: ${stat.impressions}`}
                    />
                    <div 
                      className={styles.clicksBar}
                      style={{ 
                        height: `${((stat.clicks * 10) / maxValue) * 100}%`,
                        minHeight: stat.clicks > 0 ? '4px' : '0'
                      }}
                      title={`Клики: ${stat.clicks}`}
                    />
                  </div>
                  <div className={styles.barLabel}>
                    {formatDate(stat.date)}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ backgroundColor: '#4CAF50' }} />
                <span>Показы</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ backgroundColor: '#2196F3' }} />
                <span>Клики (×10)</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.detailsSection}>
          <h2>Детальная статистика</h2>
          <div className={styles.statsTable}>
            <div className={styles.tableHeader}>
              <div>Дата</div>
              <div>Показы</div>
              <div>Клики</div>
              <div>CTR</div>
              <div>Уникальные</div>
            </div>
            {analytics.dailyStats.map(stat => (
              <div key={stat.date} className={styles.tableRow}>
                <div>{new Date(stat.date).toLocaleDateString('ru-RU')}</div>
                <div>{stat.impressions.toLocaleString()}</div>
                <div>{stat.clicks.toLocaleString()}</div>
                <div className={styles.ctrCell}>{stat.ctr}%</div>
                <div>{stat.uniqueViews.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 