import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMap } from 'react-icons/fi';
import MapSelector from '../../components/ui/MapSelector';
import styles from './CreateCampaign.module.scss';

interface CampaignForm {
  title: string;
  adTitle: string;
  adDescription: string;
  adImageUrl: string;
  adButtonText: string;
  adButtonUrl: string;
  targetAgeMin: number;
  targetAgeMax: number;
  targetGender: string;
  targetArea: {
    lat: number;
    lng: number;
    radius: number; // в км
  } | null;
  startDate: string;
  endDate: string;
}

import api from '@api';

export const CreateCampaign: React.FC = () => {
  const navigate = useNavigate();
  
  // Устанавливаем даты по умолчанию
  const today = new Date();
  const endDateDefault = new Date(today);
  endDateDefault.setMonth(endDateDefault.getMonth() + 3);
  
  const [form, setForm] = useState<CampaignForm>({
    title: '',
    adTitle: '',
    adDescription: '',
    adImageUrl: '',
    adButtonText: 'Узнать больше',
    adButtonUrl: '',
    targetAgeMin: 13,
    targetAgeMax: 25,
    targetGender: 'all',
    targetArea: null,
    startDate: today.toISOString().split('T')[0],
    endDate: endDateDefault.toISOString().split('T')[0]
  });
  
  const [loading, setLoading] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/advertising/campaigns', {
        ...form,
        priority: 3 // Фиксированный приоритет
      },{
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        navigate('/advertiser/campaigns');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
      alert('Произошла ошибка при создании кампании');
    } finally {
      setLoading(false);
    }
  };

  const handleAreaSelected = (area: { lat: number; lng: number; radius: number }) => {
    setForm(prev => ({
      ...prev,
      targetArea: area
    }));
  };

  const openMapSelector = () => {
    setShowMapSelector(true);
  };

  const closeMapSelector = () => {
    setShowMapSelector(false);
  };

  const removeArea = () => {
    setForm(prev => ({
      ...prev,
      targetArea: null
    }));
  };

  return (
    <div className={styles.createCampaignPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate('/advertiser')} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <h1>Создать кампанию</h1>
        </div>
      </div>

      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <h2>Основная информация</h2>
            
            <div className={styles.inputGroup}>
              <label>Название кампании</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Например: Промо летней коллекции"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Заголовок объявления</label>
              <input
                type="text"
                value={form.adTitle}
                onChange={(e) => setForm(prev => ({ ...prev, adTitle: e.target.value }))}
                placeholder="Привлекательный заголовок"
                maxLength={100}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Описание объявления</label>
              <textarea
                value={form.adDescription}
                onChange={(e) => setForm(prev => ({ ...prev, adDescription: e.target.value }))}
                placeholder="Подробное описание вашего предложения"
                maxLength={300}
                rows={4}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label>URL изображения</label>
              <input
                type="url"
                value={form.adImageUrl}
                onChange={(e) => setForm(prev => ({ ...prev, adImageUrl: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                required
              />
            </div>

            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label>Текст кнопки</label>
                <input
                  type="text"
                  value={form.adButtonText}
                  onChange={(e) => setForm(prev => ({ ...prev, adButtonText: e.target.value }))}
                  placeholder="Узнать больше"
                  maxLength={20}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label>URL кнопки</label>
                <input
                  type="url"
                  value={form.adButtonUrl}
                  onChange={(e) => setForm(prev => ({ ...prev, adButtonUrl: e.target.value }))}
                  placeholder="https://example.com"
                  required
                />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Таргетинг</h2>
            
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label>Возраст от</label>
                <input
                  type="number"
                  value={form.targetAgeMin}
                  onChange={(e) => setForm(prev => ({ ...prev, targetAgeMin: parseInt(e.target.value) }))}
                  min="13"
                  max="65"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Возраст до</label>
                <input
                  type="number"
                  value={form.targetAgeMax}
                  onChange={(e) => setForm(prev => ({ ...prev, targetAgeMax: parseInt(e.target.value) }))}
                  min="13"
                  max="65"
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Гендер</label>
              <select
                value={form.targetGender}
                onChange={(e) => setForm(prev => ({ ...prev, targetGender: e.target.value }))}
              >
                <option value="all">Все</option>
                <option value="male">Парни</option>
                <option value="female">Девушки</option>
                <option value="non-binary">Небинарные</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label>Территория показа</label>
              <div className={styles.areaContainer}>
                {!form.targetArea ? (
                  <button 
                    type="button" 
                    onClick={openMapSelector} 
                    className={styles.mapButton}
                  >
                    <FiMap size={20} />
                    Выбрать на карте
                  </button>
                ) : (
                  <div className={styles.areaInfo}>
                    <FiMap size={16} />
                    <span>
                      Координаты: {form.targetArea.lat.toFixed(4)}, {form.targetArea.lng.toFixed(4)}<br/>
                      Радиус: {form.targetArea.radius} км
                    </span>
                    <button type="button" onClick={openMapSelector} className={styles.editButton}>
                      Изменить
                    </button>
                    <button type="button" onClick={removeArea} className={styles.removeButton}>
                      ×
                    </button>
                  </div>
                )}
                
                <small className={styles.hint}>
                  Нажмите кнопку выше, чтобы выделить область показа рекламы на интерактивной карте
                </small>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Расписание</h2>
            
            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label>Дата начала</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Дата окончания</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Приоритет</label>
              <div className={styles.priorityInfo}>
                <span className={styles.priorityValue}>3</span>
                <small>Приоритет установлен автоматически</small>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? 'Создание...' : 'Создать кампанию'}
          </button>
        </form>
      </div>

      {/* Компонент выбора области на карте */}
      {showMapSelector && (
        <MapSelector
          onAreaSelected={handleAreaSelected}
          onClose={closeMapSelector}
          initialArea={form.targetArea}
        />
      )}
    </div>
  );
}; 