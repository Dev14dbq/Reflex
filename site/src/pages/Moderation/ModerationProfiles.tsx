import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiUser, 
  FiCheckCircle, 
  FiX, 
  FiFlag, 
  FiEye, 
  FiCalendar,
  FiMapPin,

} from 'react-icons/fi';
import styles from './ModerationProfiles.module.scss';
import api from '@api';

interface ProfileForModeration {
  id: string;
  preferredName: string;
  gender: string;
  birthYear: number;
  city: string;
  goals: string[];
  description: string;
  isVerified: boolean;
  isFlagged: boolean;
  createdAt: string;
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    blocked: boolean;
    trustScore?: number;
  };
  imageData?: {
    id: string;
    url: string;
    isNsfw: boolean;
    nsfwScore?: number;
    isApproved: boolean;
  }[];
}

export const ModerationProfiles: React.FC = () => {
  const [profiles, setProfiles] = useState<ProfileForModeration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'unverified' | 'flagged' | 'pending'>('pending');
  const [selectedProfile, setSelectedProfile] = useState<ProfileForModeration | null>(null);
  const [moderationNote, setModerationNote] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfiles();
  }, [filter]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/moderation/profiles?status=${filter}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyProfile = async (profileId: string) => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/moderation/profiles/${profileId}/verify`, {
        note: moderationNote || 'Профиль верифицирован модератором'
      },{
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      });

      fetchProfiles();
      setSelectedProfile(null);
      setModerationNote('');
    } catch (error) {
      console.error('Failed to verify profile:', error);
    }
  };

  const handleFlagProfile = async (profileId: string, reason: string) => {
    try {
      const token = localStorage.getItem('token');
      await api.post(`/api/moderation/profiles/${profileId}/flag`, {
        reason, note: moderationNote
      },{
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      });
      
      fetchProfiles();
      setSelectedProfile(null);
      setModerationNote('');
    } catch (error) {
      console.error('Failed to flag profile:', error);
    }
  };

  const getGoalEmoji = (goal: string) => {
    const goalMap: { [key: string]: string } = {
      'секс': '🔥',
      'обмен фото': '📸',
      'отношения на расстоянии': '💕',
      'отношения локально': '❤️',
      'общение': '💬'
    };
    return goalMap[goal.toLowerCase()] || '💫';
  };

  const getGenderColor = (gender: string) => {
    switch (gender.toLowerCase()) {
      case 'мужской': return '#45b7d1';
      case 'женский': return '#ff6b9d';
      default: return '#96ceb4';
    }
  };

  const getTrustScoreColor = (score?: number) => {
    if (!score) return '#747d8c';
    if (score >= 80) return '#2ed573';
    if (score >= 60) return '#feca57';
    return '#ff4757';
  };

  return (
    <div className={styles.profilesPage}>
      <div className={styles.header}>
        <button onClick={() => navigate('/moderation')} className={styles.backButton}>
          <FiArrowLeft size={20} />
        </button>
        <h1>Модерация профилей</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.filterBar}>
          <div className={styles.filters}>
            <button
              className={`${styles.filterButton} ${filter === 'pending' ? styles.active : ''}`}
              onClick={() => setFilter('pending')}
            >
              <FiCalendar size={16} />
              Ожидают проверки
            </button>
            <button
              className={`${styles.filterButton} ${filter === 'unverified' ? styles.active : ''}`}
              onClick={() => setFilter('unverified')}
            >
              <FiX size={16} />
              Не верифицированы
            </button>
            <button
              className={`${styles.filterButton} ${filter === 'flagged' ? styles.active : ''}`}
              onClick={() => setFilter('flagged')}
            >
              <FiFlag size={16} />
              Помечены
            </button>
          </div>
        </div>

        <div className={styles.profilesContainer}>
          <div className={styles.profilesList}>
            {loading ? (
              <div className={styles.loading}>Загрузка профилей...</div>
            ) : profiles.length === 0 ? (
              <div className={styles.empty}>Нет профилей в этой категории</div>
            ) : (
              profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`${styles.profileCard} ${selectedProfile?.id === profile.id ? styles.selected : ''}`}
                  onClick={() => setSelectedProfile(profile)}
                >
                  <div className={styles.profileHeader}>
                    <div className={styles.profileAvatar}>
                      {profile.imageData && profile.imageData.length > 0 ? (
                        <img 
                          src={profile.imageData[0].url} 
                          alt={profile.preferredName}
                          className={styles.avatarImg}
                        />
                      ) : (
                        <FiUser size={24} />
                      )}
                      <div 
                        className={styles.genderBadge}
                        style={{ backgroundColor: getGenderColor(profile.gender) }}
                      >
                        {profile.gender === 'мужской' ? '♂' : profile.gender === 'женский' ? '♀' : '⚧'}
                      </div>
                    </div>
                    
                    <div className={styles.profileInfo}>
                      <h3>{profile.preferredName}</h3>
                      <p className={styles.profileAge}>
                        {new Date().getFullYear() - profile.birthYear} лет
                      </p>
                      <p className={styles.profileLocation}>
                        <FiMapPin size={14} />
                        {profile.city}
                      </p>
                    </div>

                    <div className={styles.profileStatus}>
                      {profile.isVerified && (
                        <span className={`${styles.statusBadge} ${styles.verified}`}>
                          <FiCheckCircle size={14} />
                          Верифицирован
                        </span>
                      )}
                      {profile.isFlagged && (
                        <span className={`${styles.statusBadge} ${styles.flagged}`}>
                          <FiFlag size={14} />
                          Помечен
                        </span>
                      )}
                      {profile.user.blocked && (
                        <span className={`${styles.statusBadge} ${styles.blocked}`}>
                          Заблокирован
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.profileContent}>
                    <div className={styles.goals}>
                      {profile.goals.map((goal, index) => (
                        <span key={index} className={styles.goalTag}>
                          {getGoalEmoji(goal)} {goal}
                        </span>
                      ))}
                    </div>
                    
                    {profile.description && (
                      <p className={styles.description}>
                        {profile.description.length > 100 
                          ? `${profile.description.substring(0, 100)}...` 
                          : profile.description
                        }
                      </p>
                    )}

                    <div className={styles.profileMeta}>
                      <span>Создан: {new Date(profile.createdAt).toLocaleDateString()}</span>
                      {profile.user.trustScore && (
                        <span 
                          className={styles.trustScore}
                          style={{ color: getTrustScoreColor(profile.user.trustScore) }}
                        >
                          Доверие: {profile.user.trustScore}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedProfile && (
            <div className={styles.actionPanel}>
              <h3>Модерация профиля</h3>
              
              <div className={styles.selectedProfileInfo}>
                <h4>{selectedProfile.preferredName}</h4>
                <p><strong>Пользователь:</strong> {selectedProfile.user.username || 'Без username'}</p>
                <p><strong>Telegram ID:</strong> {selectedProfile.user.id}</p>
                <p><strong>Возраст:</strong> {new Date().getFullYear() - selectedProfile.birthYear} лет</p>
                <p><strong>Город:</strong> {selectedProfile.city}</p>
                <p><strong>Цели:</strong> {selectedProfile.goals.join(', ')}</p>
                
                {selectedProfile.imageData && selectedProfile.imageData.length > 0 && (
                  <div className={styles.profileImages}>
                    <strong>Изображения ({selectedProfile.imageData.length}):</strong>
                    <div className={styles.imageGrid}>
                      {selectedProfile.imageData.map((img) => (
                        <div key={img.id} className={styles.imagePreview}>
                          <img src={img.url} alt="Фото профиля" />
                          {img.isNsfw && <span className={styles.nsfwBadge}>NSFW</span>}
                          {!img.isApproved && <span className={styles.unapprovedBadge}>Не одобрено</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.actionForm}>
                <textarea
                  placeholder="Комментарий модератора..."
                  value={moderationNote}
                  onChange={(e) => setModerationNote(e.target.value)}
                  className={styles.noteTextarea}
                  rows={3}
                />

                <div className={styles.actionButtons}>
                  {!selectedProfile.isVerified && (
                    <button
                      className={`${styles.actionButton} ${styles.verifyButton}`}
                      onClick={() => handleVerifyProfile(selectedProfile.id)}
                    >
                      <FiCheckCircle size={16} />
                      Верифицировать
                    </button>
                  )}
                  
                  <button
                    className={`${styles.actionButton} ${styles.flagButton}`}
                    onClick={() => handleFlagProfile(selectedProfile.id, 'Требует внимания')}
                  >
                    <FiFlag size={16} />
                    Пометить
                  </button>
                  
                  <button
                    className={`${styles.actionButton} ${styles.viewButton}`}
                    onClick={() => window.open(`/profile/${selectedProfile.id}`, '_blank')}
                  >
                    <FiEye size={16} />
                    Просмотреть
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