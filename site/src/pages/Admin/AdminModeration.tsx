import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUserCheck, FiUserX } from 'react-icons/fi';
import styles from './AdminPanel.module.scss';

import api from '@api';

interface UserProfile {
  id: string;
  username?: string;
  profile?: {
    preferredName?: string;
  };
}

interface Complaint {
  id: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  createdAt: string;
  user: UserProfile;
  reporter: UserProfile;
}

export const AdminModeration: React.FC = () => {
  const [reports, setReports] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'RESOLVED' | 'REJECTED'>('PENDING');
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/admin/complaints?status=${filter}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setReports(data.complaints);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'RESOLVED' | 'REJECTED') => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/admin/complaints/${id}/action`, {
        action
      },{
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      fetchReports(); // Refresh list
    } catch (error) {
      console.error('Failed to update report status:', error);
    }
  };



  return (
    <div className={styles.adminPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate('/admin')} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <h1>Модерация</h1>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterButton} ${filter === 'PENDING' ? styles.active : ''}`}
            onClick={() => setFilter('PENDING')}
          >
            Ожидают
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'RESOLVED' ? styles.active : ''}`}
            onClick={() => setFilter('RESOLVED')}
          >
            Одобрены
          </button>
          <button
            className={`${styles.filterButton} ${filter === 'REJECTED' ? styles.active : ''}`}
            onClick={() => setFilter('REJECTED')}
          >
            Отклонены
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : reports.length === 0 ? (
          <div className={styles.empty}>Нет жалоб в этой категории.</div>
        ) : (
          <div className={styles.reportList}>
            {reports.map((report) => (
              <div key={report.id} className={styles.reportCard}>
                <div className={styles.reportContent}>
                  <div className={styles.reportUsers}>
                    <div>
                      <strong>На кого жалоба:</strong>
                      <p>{report.user.profile?.preferredName || report.user.username || 'ID: ' + report.user.id}</p>
                    </div>
                    <div>
                      <strong>Кто пожаловался:</strong>
                      <p>{report.reporter.profile?.preferredName || report.reporter.username || 'ID: ' + report.reporter.id}</p>
                    </div>
                  </div>
                  <div className={styles.reportReason}>
                    <strong>Причина:</strong>
                    <p>{report.reason}</p>
                  </div>
                  <div className={styles.reportMeta}>
                    {new Date(report.createdAt).toLocaleString()}
                  </div>
                </div>
                {filter === 'PENDING' && (
                  <div className={styles.reportActions}>
                    <button
                      className={`${styles.actionButton} ${styles.approveButton}`}
                      onClick={() => handleAction(report.id, 'RESOLVED')}
                    >
                      <FiUserCheck size={16} /> Одобрить
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.rejectButton}`}
                      onClick={() => handleAction(report.id, 'REJECTED')}
                    >
                      <FiUserX size={16} /> Отклонить
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 