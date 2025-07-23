import { FiUser, FiBell, FiTarget, FiSliders, FiShield } from "react-icons/fi";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";

import { PageTransition } from "@components/ui/PageTransition";
import api from "@api";

import styles from "./scss/Settings.module.scss";

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

const button = [
    {
        title: 'Моя анкета',
        description: 'Редактировать профиль и фотографии',
        link: '/my-profile',
        icon: (<FiUser size={24} />),
        perm: null
    },
    {
        title: 'Уведомления',
        description: 'Настроить оповещения от бота',
        link: '/settings/notifications',
        icon: (<FiBell size={24} />),
        perm: null
    },
    {
        title: 'Рекоментации',
        description: 'Настроить поиск анкет',
        link: '/settings/recommendations',
        icon: (<FiSliders size={24} />),
        perm: null
    },
    {
        title: 'Панель администратора',
        description: 'Управление платформой',
        link: '/admin',
        icon: (<FiShield size={24} />),
        perm: ['isAdmin']
    },
    {
        title: 'Панель модератора',
        description: 'Модерация контента и пользователей',
        link: '/moderation',
        icon: (<FiShield size={24} />),
        perm: ['isAdmin', 'isModerator']
    },
    {
        title: 'Панель рекламодателя',
        description: 'Управление рекламными кампаниями',
        link: '/advertiser',
        icon: (<FiTarget size={24} />),
        perm: ['isAdmin', 'isAdvertiser']
    }
];

const Settings: React.FC<{ className?: string }> = ({ className }) => {
    const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    const token = localStorage.getItem("token");

    const navigate = useNavigate();
    const [profile, setProfile] = useState<Profile | null>(null);

    const fetchProfile = async () => {
        try {
            if (!token) return;

            const res = await api.get("/profile/me", {
                headers: {
                    Authorization: `Bearer ${token}`
                },
            });

            const data = await res.json();
            setProfile(data.profile);
        } catch (error) {
            console.error('[API] Failed to fetch profile:', error);
        }
    };

    useEffect(() => { 
        fetchProfile(); 
    }, []);

    const handleDelete = async () => {
        try {
            if (!token) return;
            await api.post('/account/delete', null, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
            });
    
            const tg = (window as any).Telegram?.WebApp;
            if (tg?.close) tg.close(); else window.location.href = '/reset'; 
        } catch (error) {
            console.error('[API] Failed to fetch profile:', error);
        }
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
                    src={tgUser.photo_url}
                    alt="Аватар пользователя"
                />

                <div>
                    <h2>{fullName}</h2>
                    <p>@{tgUser.username}</p>
                    <span>ID: {tgUser.id}</span>
                </div>
            </div>

            <div className={styles.menuGrid}>{
                button.filter(item => {
                    if (!item.perm) return true;
                    if (!profile?.user) return false;

                    return item.perm.some((perm: string) => profile.user && (profile.user as any)[perm]);
                }).map(item => (
                    <button key={item.title} className={styles.menuCard} onClick={() => { if (item.link) navigate(item.link) }}>
                        <div className={styles.menuIcon}>
                            {item.icon}
                        </div>
                
                        <div className={styles.menuContent}>
                            <h3>{item.title}</h3>
                            <p>{item.description}</p>
                        </div>
                    </button>
                ))
            }
            
                <button className={clsx(styles.menuCard, styles.active)}>
                    <div className={styles.menuIcon}>
                        <FiTarget size={24} />
                    </div>
              
                    <div className={styles.menuContent}>
                        <h3>Аккаунт</h3>
                        <p>Управление аккаунтом и данными</p>
                    </div>
                </button>
            </div>

            <div className={styles.accountSection}>
                <div className={styles.dangerZone}>
                    <h3>Опасная зона</h3>
                    <p>Удаление аккаунта необратимо. Все ваши данные, сообщения и совпадения будут удалены навсегда!</p>
                    <button className={styles.deleteButton}
                        onClick={() => {
                            const tg=(window as any).Telegram?.WebApp;
                            const confirmed = tg?.showConfirm
                                ? undefined
                                : confirm('Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить.');
                
                            if (tg?.showConfirm) {
                                tg.showConfirm('Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить.', (ok: boolean) => {
                                    if(ok) handleDelete();
                                });
                            } else if (confirmed) {
                                handleDelete();
                            }
                        }}
                    >Удалить аккаунт навсегда</button>
                </div>
            </div>
        </PageTransition>
    );
};

export default Settings