import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUserCheck, FiUserX, FiMessageSquare, FiEye, FiUser, FiFlag } from 'react-icons/fi';
import styles from './ModerationComplaints.module.scss';

interface User {
  id: string;
  username?: string;
  profile?: {
    preferredName?: string;
  };
}

interface Complaint {
  id: string;
  type: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
  user: User;
  reporter: User;
}

export const ModerationComplaints: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'resolved' | 'dismissed'>('pending');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [moderatorNote, setModeratorNote] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchComplaints();
  }, [filter]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://spectrmod.ru/api/moderation/complaints?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setComplaints(data.complaints || []);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplaintAction = async (id: string, action: 'resolved' | 'dismissed') => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://spectrmod.ru/api/moderation/complaints/${id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          action, 
          moderatorNote: moderatorNote || `Жалоба ${action === 'resolved' ? 'принята' : 'отклонена'} модератором`
        }),
      });
      fetchComplaints();
      setSelectedComplaint(null);
      setModeratorNote('');
    } catch (error) {
      console.error('Failed to update complaint status:', error);
    }
  };

  const sendWarning = async (userId: string) => {
    if (!moderatorNote.trim()) {
      alert('Пожалуйста, введите текст предупреждения');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await fetch(`https://spectrmod.ru/api/moderation/users/${userId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: moderatorNote }),
      });
      alert('Предупреждение отправлено');
      setModeratorNote('');
    } catch (error) {
      console.error('Failed to send warning:', error);
    }
  };

  const getUserDisplayName = (user: User) => {
    return user.profile?.preferredName || user.username || `ID: ${user.id}`;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#2ed573';
      default: return '#747d8c';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'profile': return <FiUser />;
      case 'message': return <FiMessageSquare />;
      case 'image': return <FiEye />;
      default: return <FiFlag />;
    }
  };

  return (
    <div className={styles.complaintsPage}>
      <div className={styles.header}>
        <button onClick={() => navigate('/moderation')} className={styles.backButton}>
          <FiArrowLeft size={20} />
        </button>
        <h1>Жалобы пользователей</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.filterBar}>
          <div className={styles.filters}>
            <button
              className={`${styles.filterButton} ${filter === 'pending' ? styles.active : ''}`}
              onClick={() => setFilter('pending')}
            >
              На рассмотрении ({complaints.filter(c => c.status === 'pending').length})
            </button>
            <button
              className={`${styles.filterButton} ${filter === 'resolved' ? styles.active : ''}`}
              onClick={() => setFilter('resolved')}
            >
              Принятые
            </button>
            <button
              className={`${styles.filterButton} ${filter === 'dismissed' ? styles.active : ''}`}
              onClick={() => setFilter('dismissed')}
            >
              Отклоненные
            </button>
          </div>
        </div>

        <div className={styles.complaintsContainer}>
          <div className={styles.complaintsList}>
            {loading ? (
              <div className={styles.loading}>Загрузка жалоб...</div>
            ) : complaints.length === 0 ? (
              <div className={styles.empty}>Нет жалоб в этой категории</div>
            ) : (
              complaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className={`${styles.complaintCard} ${selectedComplaint?.id === complaint.id ? styles.selected : ''}`}
                  onClick={() => setSelectedComplaint(complaint)}
                >
                  <div className={styles.complaintHeader}>
                    <div className={styles.typeIcon}>
                      {getTypeIcon(complaint.type)}
                    </div>
                    <div className={styles.complaintMeta}>
                      <span className={styles.type}>{complaint.type}</span>
                      {complaint.priority && (
                        <span 
                          className={styles.priority}
                          style={{ color: getPriorityColor(complaint.priority) }}
                        >
                          {complaint.priority}
                        </span>
                      )}
                    </div>
                    <div className={styles.date}>
                      {new Date(complaint.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className={styles.complaintContent}>
                    <div className={styles.users}>
                      <div className={styles.user}>
                        <strong>Нарушитель:</strong>
                        <span>{getUserDisplayName(complaint.user)}</span>
                        <button 
                          className={styles.viewUserButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/moderation/user/${complaint.user.id}`);
                          }}
                        >
                          <FiEye size={14} />
                        </button>
                      </div>
                      <div className={styles.user}>
                        <strong>Жалующийся:</strong>
                        <span>{getUserDisplayName(complaint.reporter)}</span>
                      </div>
                    </div>
                    <div className={styles.reason}>
                      <strong>Причина:</strong>
                      <p>{complaint.reason}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedComplaint && filter === 'pending' && (
            <div className={styles.actionPanel}>
              <h3>Действия с жалобой</h3>
              
              <div className={styles.selectedComplaintInfo}>
                <h4>Детали жалобы</h4>
                <p><strong>Тип:</strong> {selectedComplaint.type}</p>
                <p><strong>Нарушитель:</strong> {getUserDisplayName(selectedComplaint.user)}</p>
                <p><strong>Причина:</strong> {selectedComplaint.reason}</p>
                <p><strong>Дата:</strong> {new Date(selectedComplaint.createdAt).toLocaleString()}</p>
              </div>

              <div className={styles.actionForm}>
                <textarea
                  placeholder="Комментарий модератора или текст предупреждения..."
                  value={moderatorNote}
                  onChange={(e) => setModeratorNote(e.target.value)}
                  className={styles.noteTextarea}
                  rows={4}
                />

                <div className={styles.actionButtons}>
                  <button
                    className={`${styles.actionButton} ${styles.approveButton}`}
                    onClick={() => handleComplaintAction(selectedComplaint.id, 'resolved')}
                  >
                    <FiUserCheck size={16} />
                    Принять жалобу
                  </button>
                  
                  <button
                    className={`${styles.actionButton} ${styles.rejectButton}`}
                    onClick={() => handleComplaintAction(selectedComplaint.id, 'dismissed')}
                  >
                    <FiUserX size={16} />
                    Отклонить жалобу
                  </button>
                  
                  <button
                    className={`${styles.actionButton} ${styles.warningButton}`}
                    onClick={() => sendWarning(selectedComplaint.user.id)}
                  >
                    <FiMessageSquare size={16} />
                    Отправить предупреждение
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 