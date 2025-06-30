import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import styles from "./Settings.module.scss";
import { FiUser, FiBell, FiTarget, FiSliders, FiShield } from "react-icons/fi";
import { PageTransition } from "../../components/ui/PageTransition";

interface Profile {
  id: string;
  preferredName: string;
  gender: string;
  birthYear: string;
  city: string;
  goals: string[];
  description: string;
  images: string[];
  user?: { 
    username?: string;
    isAdmin?: boolean;
    isModerator?: boolean;
    isAdvertiser?: boolean;
  };
}

export const Settings: React.FC<{ className?: string }> = ({ className }) => {
  const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;

  const token = localStorage.getItem("token");

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'account'>('account');
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch("https://spectrmod.ru/api/profile/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProfile(data.profile);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  useEffect(() => { 
    fetchProfile(); 
  }, []);



  const handleDelete = async () => {
    if (!token) return;
    await fetch('https://spectrmod.ru/api/account/delete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.close) tg.close(); else window.location.href = '/reset';
  };

  if (!tgUser) {
    return <div className={styles.loading}>Не удалось загрузить данные Telegram</div>;
  }

  const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ");

  return (
    <PageTransition className={clsx(styles.SettingsPage, className)}>
      <div className={styles.profileHeader}>
        <img
          className={styles.avatar}
          src={tgUser.photo_url || `/fallback-avatar.png`}
          alt="Аватар"
        />
        <div>
          <h2>{fullName}</h2>
          <p>@{tgUser.username}</p>
          <span>ID: {tgUser.id}</span>
        </div>
      </div>

      <div className={styles.menuGrid}>
        <button className={styles.menuCard} onClick={() => navigate('/my-profile')}>
          <div className={styles.menuIcon}>
            <FiUser size={24} />
          </div>
          <div className={styles.menuContent}>
            <h3>Моя анкета</h3>
            <p>Редактировать профиль и фотографии</p>
          </div>
        </button>
        
        <button className={styles.menuCard} onClick={() => navigate('/settings/notifications')}>
          <div className={styles.menuIcon}>
            <FiBell size={24} />
          </div>
          <div className={styles.menuContent}>
            <h3>Уведомления</h3>
            <p>Настроить оповещения</p>
          </div>
        </button>

        <button className={styles.menuCard} onClick={() => navigate('/settings/recommendations')}>
          <div className={styles.menuIcon}>
            <FiSliders size={24} />
          </div>
          <div className={styles.menuContent}>
            <h3>Рекомендации</h3>
            <p>Настроить поиск анкет</p>
          </div>
        </button>
        
        {profile?.user?.isAdmin && (
          <button className={styles.menuCard} onClick={() => navigate('/admin')}>
            <div className={styles.menuIcon}>
              <FiShield size={24} />
            </div>
            <div className={styles.menuContent}>
              <h3>Админ панель</h3>
              <p>Управление платформой</p>
            </div>
          </button>
        )}
        
        {(profile?.user?.isModerator || profile?.user?.isAdmin) && (
          <button className={styles.menuCard} onClick={() => navigate('/moderation')}>
            <div className={styles.menuIcon}>
              <FiShield size={24} />
            </div>
            <div className={styles.menuContent}>
              <h3>Панель модератора</h3>
              <p>Модерация контента и пользователей</p>
            </div>
          </button>
        )}
        
        {(profile?.user?.isAdvertiser || profile?.user?.isAdmin) && (
          <button className={styles.menuCard} onClick={() => navigate('/advertiser')}>
            <div className={styles.menuIcon}>
              <FiTarget size={24} />
            </div>
            <div className={styles.menuContent}>
              <h3>Панель рекламодателя</h3>
              <p>Управление рекламными кампаниями</p>
            </div>
          </button>
        )}
        
        <button 
          className={clsx(styles.menuCard, activeTab==='account' && styles.active)} 
          onClick={()=>setActiveTab('account')}
        >
          <div className={styles.menuIcon}>
            <FiTarget size={24} />
          </div>
          <div className={styles.menuContent}>
            <h3>Аккаунт</h3>
            <p>Управление аккаунтом и данными</p>
          </div>
        </button>
      </div>

            {activeTab==='account' && (
        <div className={styles.accountSection}>
          <div className={styles.dangerZone}>
            <h3>Опасная зона</h3>
            <p>Удаление аккаунта необратимо. Все ваши данные, сообщения и совпадения будут удалены навсегда.</p>
            <button
              onClick={() => {
                const tg=(window as any).Telegram?.WebApp;
                const confirmed = tg?.showConfirm ? undefined : confirm('Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить.');
                if (tg?.showConfirm) {
                  tg.showConfirm('Удалить аккаунт?', (ok:boolean)=>{ if(ok) handleDelete(); });
                } else if (confirmed) {
                  handleDelete();
                }
              }}
              className={styles.deleteButton}
            >
              Удалить аккаунт навсегда
            </button>
          </div>
        </div>
      )}


    </PageTransition>
  );
};




