import { FiArrowLeft, FiBell } from "react-icons/fi";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import styles from "./NotificationSettings.module.scss";
import clsx from "clsx";

import { SlidePageTransition } from "@components/ui/PageTransition";
import api from '@api';

interface Settings {
  id: string;
  userId: string;
  notifyMessages: boolean;
  notifyLikes: boolean;
  notifyNews: boolean;
  notifyAds: boolean;
  notifyTech: boolean;
  sameCityOnly: boolean;
}

export const NotificationSettings: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get('/settings', { headers: { Authorization: `Bearer ${token}` } });
      
      const data = await res.json();
      setSettings(data.settings);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (patch: Partial<Settings>) => {
    if (!token) return;
    try {
      const res = await api.put('/settings', patch, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
      
      const data = await res.json();
      setSettings(data.settings);
    } catch (err) {
      console.error("Failed to update settings:", err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SlidePageTransition className={clsx(styles.NotificationSettings, "bg-neu-background")}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button
            onClick={() => navigate(-1)}
            className={styles.backButton}
          >
            <FiArrowLeft size={20} />
          </button>
          <div className={styles.title}>
            <FiBell className="text-neu-primary" size={20} />
            <h1>Уведомления</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Загрузка настроек...</p>
          </div>
        ) : settings ? (
          <div>
            {/* Уведомления */}
            <div className={styles.settingsGroup}>
              <h3>Уведомления</h3>
              <div>
                <ToggleRow
                  label="Сообщения"
                  description="Уведомления о новых сообщениях в чатах"
                  value={settings.notifyMessages}
                  onChange={(value) => updateSettings({ notifyMessages: value })}
                />
                <ToggleRow
                  label="Лайки"
                  description="Уведомления о новых лайках на вашу анкету"
                  value={settings.notifyLikes}
                  onChange={(value) => updateSettings({ notifyLikes: value })}
                />
                <ToggleRow
                  label="Новости"
                  description="Уведомления о новостях и обновлениях приложения"
                  value={settings.notifyNews}
                  onChange={(value) => updateSettings({ notifyNews: value })}
                />
                <ToggleRow
                  label="Реклама"
                  description="Рекламные уведомления и предложения"
                  value={settings.notifyAds}
                  onChange={(value) => updateSettings({ notifyAds: value })}
                />
                <ToggleRow
                  label="Технические"
                  description="Технические уведомления и обслуживание"
                  value={settings.notifyTech}
                  onChange={(value) => updateSettings({ notifyTech: value })}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.errorState}>
            <p>Не удалось загрузить настройки</p>
            <button onClick={fetchSettings}>
              Повторить
            </button>
          </div>
        )}
      </div>
    </SlidePageTransition>
  );
};

const ToggleRow: React.FC<{
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, description, value, onChange }) => {
  return (
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
}; 