import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUsers, FiSearch, FiFilter } from 'react-icons/fi';
import styles from './AudienceAnalyzer.module.scss';

interface AudienceFilter {
  ageMin: number;
  ageMax: number;
  city: string;
  gender: string;
  goals: string[];
}

export const AudienceAnalyzer: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [audienceSize, setAudienceSize] = useState<number | null>(null);
  
  const [filters, setFilters] = useState<AudienceFilter>({
    ageMin: 18,
    ageMax: 35,
    city: '',
    gender: '',
    goals: []
  });

  const goals = [
    { id: 'sex', label: 'Секс 🔥' },
    { id: 'photos', label: 'Обмен фото 📸' },
    { id: 'ldr', label: 'Отношения на расстоянии 💕' },
    { id: 'local', label: 'Отношения локально ❤️' },
    { id: 'chat', label: 'Общение 💬' }
  ];

  const analyzeAudience = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.ageMin) params.append('ageMin', filters.ageMin.toString());
      if (filters.ageMax) params.append('ageMax', filters.ageMax.toString());
      if (filters.city) params.append('city', filters.city);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.goals.length > 0) {
        filters.goals.forEach(goal => params.append('goals', goal));
      }

      const response = await fetch(`https://spectrmod.ru/api/advertising/targeting/audience?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      setAudienceSize(data.audienceSize);
    } catch (error) {
      console.error('Failed to analyze audience:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof AudienceFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      ageMin: 18,
      ageMax: 35,
      city: '',
      gender: '',
      goals: []
    });
    setAudienceSize(null);
  };

  return (
    <div className={styles.audiencePage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate('/advertiser')} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <h1>Анализатор аудитории</h1>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.description}>
          <p>Анализируйте потенциальную аудиторию для ваших рекламных кампаний. 
          Настройте фильтры и узнайте количество пользователей, соответствующих вашим критериям.</p>
        </div>

        <div className={styles.filtersSection}>
          <h2><FiFilter size={20} /> Фильтры аудитории</h2>
          
          <div className={styles.filtersGrid}>
            <div className={styles.filterGroup}>
              <h3>Возраст</h3>
              <div className={styles.ageInputs}>
                <input
                  type="number"
                  min="18"
                  max="65"
                  value={filters.ageMin}
                  onChange={(e) => handleFilterChange('ageMin', Number(e.target.value))}
                  placeholder="От"
                />
                <span>—</span>
                <input
                  type="number"
                  min="18"
                  max="65"
                  value={filters.ageMax}
                  onChange={(e) => handleFilterChange('ageMax', Number(e.target.value))}
                  placeholder="До"
                />
              </div>
            </div>

            <div className={styles.filterGroup}>
              <h3>Город</h3>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                placeholder="Например: Москва"
              />
            </div>

            <div className={styles.filterGroup}>
              <h3>Пол</h3>
              <select
                value={filters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
              >
                <option value="">Любой</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <h3>Интересы</h3>
              <div className={styles.goalsGrid}>
                {goals.map(goal => (
                  <label key={goal.id} className={styles.goalCheckbox}>
                    <input
                      type="checkbox"
                      checked={filters.goals.includes(goal.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange('goals', [...filters.goals, goal.id]);
                        } else {
                          handleFilterChange('goals', filters.goals.filter(g => g !== goal.id));
                        }
                      }}
                    />
                    {goal.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.filterActions}>
            <button onClick={resetFilters} className={styles.resetButton}>
              Сбросить фильтры
            </button>
            <button 
              onClick={analyzeAudience} 
              disabled={loading}
              className={styles.analyzeButton}
            >
              <FiSearch size={16} />
              {loading ? 'Анализируем...' : 'Анализировать аудиторию'}
            </button>
          </div>
        </div>

        {audienceSize !== null && (
          <div className={styles.resultSection}>
            <div className={styles.resultCard}>
              <div className={styles.resultIcon}>
                <FiUsers size={32} />
              </div>
              <div className={styles.resultContent}>
                <h2>Размер аудитории</h2>
                <div className={styles.audienceNumber}>
                  {audienceSize.toLocaleString()}
                </div>
                <p>пользователей соответствуют вашим критериям</p>
              </div>
            </div>

            <div className={styles.insights}>
              <h3>Рекомендации</h3>
              <ul>
                {audienceSize < 1000 && (
                  <li>Аудитория слишком мала. Попробуйте расширить возрастные рамки или убрать некоторые фильтры.</li>
                )}
                {audienceSize > 100000 && (
                  <li>Очень большая аудитория. Рассмотрите возможность более точного таргетинга для лучших результатов.</li>
                )}
                {audienceSize >= 1000 && audienceSize <= 100000 && (
                  <li>Отличный размер аудитории для запуска рекламной кампании!</li>
                )}
                <li>Для лучших результатов рекомендуется тестировать разные варианты объявлений.</li>
                <li>Начните с небольшого бюджета и постепенно увеличивайте его при получении хороших результатов.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 