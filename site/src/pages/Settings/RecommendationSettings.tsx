import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { FiArrowLeft, FiStar } from 'react-icons/fi';
import { SlidePageTransition } from '../../components/ui/PageTransition';
import { http } from '../../services/http';
import styles from './RecommendationSettings.module.scss';
import { Slider } from '@mui/material'; // если хочешь оставить MUI-слайдер

interface RecommendationSettingsData {
  similarAge: boolean;
  localFirst: boolean;
  showNsfw: boolean;
  sameCityOnly: boolean;
  ageRangeMin: number;
  ageRangeMax: number;
  maxDistance: number;
}

export const RecommendationSettings: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<RecommendationSettingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await http.get<{ settings: RecommendationSettingsData }>('/settings/recommendations');
      setSettings(res.data.settings);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  };

  const scheduleSave = (newSettings: RecommendationSettingsData) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    setSaveTimeout(
      setTimeout(() => {
        http.put('/settings/recommendations', newSettings).catch((e) => {
          console.error(e);
          setError('Не удалось сохранить настройки');
        });
      }, 1000)
    );
  };

  const handleToggle = (field: keyof RecommendationSettingsData, value: boolean) => {
    if (!settings) return;
    const next = { ...settings, [field]: value };
    setSettings(next);
    scheduleSave(next);
  };

  const handleAgeRange = (value: number[]) => {
    if (!settings) return;
    const next = { ...settings, ageRangeMin: value[0], ageRangeMax: value[1] };
    setSettings(next);
    scheduleSave(next);
  };

  const handleDistanceRange = (value: number) => {
    if (!settings) return;
    const next = { ...settings, maxDistance: value };
    setSettings(next);
    scheduleSave(next);
  };

  // для текста диапазона похожего возраста
  const getSimilarAgeRange = () => {
    if (!settings) return '';
    const age = new Date().getFullYear() - Number(window.localStorage.getItem('birthYear') || 25);
    return age <= 22 ? `${age - 2}–${age + 2}` : `${age - 5}–${age + 5}`;
  };

  return (
    <SlidePageTransition className={clsx(styles.RecommendationSettings, 'bg-neu-background')}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <div className={styles.title}>
            <FiStar className="text-neu-primary" size={20} />
            <h1>Рекомендации</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Загрузка настроек...</p>
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorState}>
            <p>{error}</p>
            <button onClick={fetchSettings}>Повторить</button>
          </div>
        )}

        {!loading && settings && (
          <>
            {/* Возраст */}
            <div className={styles.settingsGroup}>
              <h3>Возрастные предпочтения</h3>
              <ToggleRow
                label="Показывать анкеты похожего возраста"
                description={`Диапазон ${getSimilarAgeRange()} лет`}
                value={settings.similarAge}
                onChange={(v) => handleToggle('similarAge', v)}
              />

              {!settings.similarAge && (
                <div className={styles.sliderRow}>
                  <label className={styles.sliderLabel}>
                    Возраст: {settings.ageRangeMin}–{settings.ageRangeMax}
                  </label>
                  <Slider
                    value={[settings.ageRangeMin, settings.ageRangeMax]}
                    onChange={(_, v) => handleAgeRange(v as number[])}
                    valueLabelDisplay="auto"
                    min={13}
                    max={35}
                  />
                </div>
              )}
            </div>

            {/* География */}
            <div className={styles.settingsGroup}>
              <h3>География поиска</h3>
              <ToggleRow
                label="Приоритет местным анкетам"
                description="Сначала показываем анкеты из вашего города"
                value={settings.localFirst}
                onChange={(v) => handleToggle('localFirst', v)}
              />

              <ToggleRow
                label="Только мой город"
                description="Показывать анкеты только из вашего города"
                value={settings.sameCityOnly}
                onChange={(v) => handleToggle('sameCityOnly', v)}
              />

              {!settings.sameCityOnly && (
                <div className={styles.sliderRow}>
                  <label className={styles.sliderLabel}>
                    Расстояние: {settings.maxDistance} км
                  </label>
                  <Slider
                    value={settings.maxDistance}
                    onChange={(_, v) => handleDistanceRange(v as number)}
                    valueLabelDisplay="auto"
                    min={10}
                    max={500}
                    step={10}
                  />
                </div>
              )}
            </div>

            {/* Контент */}
            <div className={styles.settingsGroup}>
              <h3>Контент</h3>
              <ToggleRow
                label="Показывать NSFW"
                description="Только 18+"
                value={settings.showNsfw}
                onChange={(v) => handleToggle('showNsfw', v)}
              />
            </div>
          </>
        )}
      </div>
    </SlidePageTransition>
  );
};

const ToggleRow: React.FC<{
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, value, onChange }) => (
  <div className={styles.toggleRow}>
    <div className={styles.toggleContent}>
      <h4>{label}</h4>
      <p>{description}</p>
    </div>
    <div className={styles.toggleSwitch}>
      <button
        onClick={() => onChange(!value)}
        className={clsx(value ? styles.enabled : styles.disabled)}
      >
        <span className={clsx(styles.thumb, value ? styles.enabled : styles.disabled)} />
      </button>
    </div>
  </div>
);
